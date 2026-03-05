import prisma from "../db.server";
import {
  type PlanTier,
  getPlanLimits,
  getCurrentWeekStart,
} from "../lib/plan-config";
import type { AdminClient } from "../lib/agent-interface";

// --- ShopPlan ---

export async function getShopPlan(shop: string) {
  // Use upsert to avoid race condition when multiple concurrent calls
  // both find no record and try to create (unique constraint violation)
  const plan = await prisma.shopPlan.upsert({
    where: { shop },
    update: {},
    create: { shop, tier: "free", subscriptionStatus: "active" },
  });

  // RT-3: enforce limits on first creation so default-enabled agents respect free tier
  // Only run if this is a newly created free plan (no subscription, default state)
  if (
    plan.tier === "free" &&
    !plan.shopifySubscriptionId &&
    plan.subscriptionStatus === "active"
  ) {
    await enforcePlanLimits(shop, "free");
  }

  return plan;
}

export async function updateShopPlan(
  shop: string,
  data: {
    tier?: PlanTier;
    shopifySubscriptionId?: string | null;
    subscriptionStatus?: string;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
  },
) {
  return prisma.shopPlan.upsert({
    where: { shop },
    update: data,
    create: { shop, ...data },
  });
}

export async function downgradeToFree(shop: string) {
  // RT-12: use null not undefined for Prisma
  return updateShopPlan(shop, {
    tier: "free",
    shopifySubscriptionId: null,
    subscriptionStatus: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
  });
}

// --- Run Frequency ---

export async function getRunsThisWeek(shop: string): Promise<number> {
  const weekStart = getCurrentWeekStart();
  const log = await prisma.runFrequencyLog.findUnique({
    where: { shop_weekStart: { shop, weekStart } },
  });
  return log?.runCount ?? 0;
}

export async function incrementRunCount(shop: string): Promise<void> {
  const weekStart = getCurrentWeekStart();
  await prisma.runFrequencyLog.upsert({
    where: { shop_weekStart: { shop, weekStart } },
    update: { runCount: { increment: 1 } },
    create: { shop, weekStart, runCount: 1 },
  });
}

export async function decrementRunCount(shop: string): Promise<void> {
  const weekStart = getCurrentWeekStart();
  await prisma.runFrequencyLog.updateMany({
    where: { shop, weekStart, runCount: { gt: 0 } },
    data: { runCount: { decrement: 1 } },
  });
}

// --- Product Count ---

const PRODUCT_COUNT_TTL_MS = 24 * 60 * 60 * 1000;

export async function getProductCount(shop: string): Promise<number> {
  const cached = await prisma.productCount.findUnique({ where: { shop } });
  if (
    cached &&
    Date.now() - cached.syncedAt.getTime() < PRODUCT_COUNT_TTL_MS
  ) {
    return cached.count;
  }
  return cached?.count ?? 0;
}

export async function syncProductCount(
  shop: string,
  admin: AdminClient,
): Promise<number> {
  const response = await admin.graphql(`{ productsCount { count } }`);
  const json = await response.json();
  const count = json.data?.productsCount?.count ?? 0;

  await prisma.productCount.upsert({
    where: { shop },
    update: { count, syncedAt: new Date() },
    create: { shop, count, syncedAt: new Date() },
  });
  return count;
}

export async function isWithinProductLimit(shop: string): Promise<boolean> {
  const plan = await getShopPlan(shop);
  const limits = getPlanLimits(plan.tier as PlanTier);
  if (limits.maxProducts === -1) return true;
  const count = await getProductCount(shop);
  return count <= limits.maxProducts;
}

// --- Run Gate ---

export interface RunGateResult {
  allowed: boolean;
  reason?: string;
  runsUsed?: number;
  runsLimit?: number;
  tier?: string;
}

export async function canRunAgents(shop: string): Promise<RunGateResult> {
  const plan = await getShopPlan(shop);
  const limits = getPlanLimits(plan.tier as PlanTier);

  if (
    plan.subscriptionStatus === "frozen" ||
    plan.subscriptionStatus === "cancelled"
  ) {
    return { allowed: false, reason: "Subscription inactive", tier: plan.tier };
  }

  // M-1: pending subscription = waiting for approval, use current tier limits
  // (tier field is NOT updated during subscribe, so this is already correct)

  // RT-5: only block on trial expiry if NOT actively paying
  if (
    plan.trialEndsAt &&
    new Date() > plan.trialEndsAt &&
    plan.tier !== "free" &&
    plan.subscriptionStatus !== "active"
  ) {
    return { allowed: false, reason: "Trial expired", tier: plan.tier };
  }

  // RT-4: product limit check
  const withinProductLimit = await isWithinProductLimit(shop);
  if (!withinProductLimit) {
    return {
      allowed: false,
      reason:
        "Your store has more products than your plan supports. Upgrade for higher limits.",
      tier: plan.tier,
    };
  }

  // Run frequency check
  if (limits.maxRunsPerWeek !== -1) {
    const runsUsed = await getRunsThisWeek(shop);
    if (runsUsed >= limits.maxRunsPerWeek) {
      return {
        allowed: false,
        reason: `Weekly run limit reached (${runsUsed}/${limits.maxRunsPerWeek})`,
        runsUsed,
        runsLimit: limits.maxRunsPerWeek,
        tier: plan.tier,
      };
    }
    return {
      allowed: true,
      runsUsed,
      runsLimit: limits.maxRunsPerWeek,
      tier: plan.tier,
    };
  }

  return { allowed: true, tier: plan.tier };
}

// --- Usage Summary ---

export async function getUsageSummary(shop: string) {
  const plan = await getShopPlan(shop);
  const limits = getPlanLimits(plan.tier as PlanTier);
  const runsUsed = await getRunsThisWeek(shop);
  const productCount = await getProductCount(shop);

  return {
    tier: plan.tier,
    limits,
    runsUsed,
    productCount,
    trialEndsAt: plan.trialEndsAt,
    subscriptionStatus: plan.subscriptionStatus,
  };
}

// --- Trial ---

export async function shouldOfferTrial(shop: string): Promise<boolean> {
  const plan = await getShopPlan(shop);
  if (plan.tier !== "free") return false;
  if (plan.trialEndsAt) return false;

  const findingsCount = await prisma.agentFinding.count({ where: { shop } });
  return findingsCount >= 20;
}

// --- Enforce Plan Limits (on downgrade) ---

export async function enforcePlanLimits(
  shop: string,
  newTier: PlanTier,
): Promise<void> {
  const limits = getPlanLimits(newTier);

  // Disable excess agents (keep first N by creation order)
  const enabledSettings = await prisma.agentSetting.findMany({
    where: { shop, enabled: true },
    orderBy: { createdAt: "asc" },
  });

  if (enabledSettings.length > limits.maxAgents) {
    const toDisable = enabledSettings.slice(limits.maxAgents);
    await Promise.all(
      toDisable.map((s) =>
        prisma.agentSetting.update({
          where: { id: s.id },
          data: { enabled: false },
        }),
      ),
    );
  }

  // Downgrade trust levels beyond allowed
  const maxAllowed =
    limits.allowedTrustLevels[limits.allowedTrustLevels.length - 1];
  const TRUST_ORDER = ["advisor", "assistant", "autopilot"];
  const maxIndex = TRUST_ORDER.indexOf(maxAllowed);

  const allSettings = await prisma.agentSetting.findMany({ where: { shop } });
  for (const setting of allSettings) {
    const settingIndex = TRUST_ORDER.indexOf(setting.trustLevel);
    if (settingIndex > maxIndex) {
      await prisma.agentSetting.update({
        where: { id: setting.id },
        data: { trustLevel: maxAllowed },
      });
    }
  }
}

// Multi-store (Agency) functions: see billing-stores.server.ts
// Cleanup functions: see billing-stores.server.ts
