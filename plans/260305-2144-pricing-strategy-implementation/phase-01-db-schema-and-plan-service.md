# Phase 1: DB Schema and Plan Service

## Context Links

- [Plan Overview](plan.md)
- Existing schema: `prisma/schema.prisma`
- Existing billing service: None (greenfield)
- Agent settings service: `app/services/agent-settings.server.ts`
- Run-all route: `app/routes/app.api.agents.run-all.tsx`
- Single agent route: `app/routes/app.api.agents.$agentId.run.tsx`

## Overview

- **Priority:** P1 (all other phases depend on this)
- **Status:** completed
- **Effort:** 5h
- **Description:** Add 3 Prisma models (ShopPlan, ProductCount, RunFrequencyLog), create billing service with plan-aware helpers, enforce run frequency limits and product limits at the service layer.

## Key Insights

- Free tier has NO Shopify subscription object; tracked purely in app DB via ShopPlan
- `billing.check()` (not `billing.require()`) allows graceful free-tier handling
- MongoDB uses `prisma db push` -- no migration files needed
- Run frequency tracked per-week with Monday-based week start for consistency
- Product count synced from Shopify API and cached locally; synced on first access + daily refresh
- All new shops default to `free` tier automatically

## Requirements

### Functional
1. ShopPlan stores current tier, subscription ID, status, trial dates per shop
2. ProductCount caches Shopify product count per shop, refreshed daily
3. RunFrequencyLog tracks weekly run counts per shop (upsert pattern)
4. `getShopPlan()` returns plan or auto-creates `free` record
5. `canRunAgents()` returns boolean + reason string for UI messaging
6. `getPlanLimits()` returns static limits config for a tier
7. Run-all and single-agent routes reject requests when run limit exceeded
8. `getUsageSummary()` returns current usage vs limits for dashboard widget

### Non-Functional
- All DB queries use indexed fields (shop, weekStart)
- Product count sync timeout: 10s max
- Billing service must be importable from any route (no circular deps)

## Architecture

```
Request Flow:
  Route (run-all / run-agent)
    -> canRunAgents(shop)
       -> getShopPlan(shop)        // ShopPlan collection
       -> getPlanLimits(tier)      // Static config
       -> getRunsThisWeek(shop)    // RunFrequencyLog collection
    -> if allowed: incrementRunCount(shop) + executeAllAgents()
    -> if blocked: return 403 with { reason, upgradeUrl }

Data Flow:
  ShopPlan ----> getPlanLimits(tier) ----> { maxProducts, maxAgents, maxRunsPerWeek, allowedTrustLevels }
  RunFrequencyLog ----> getRunsThisWeek() ----> Int
  ProductCount ----> isWithinProductLimit() ----> Boolean
```

## Related Code Files

### Files to Create
- `app/services/billing.server.ts` — core plan service (~180 lines)
- `app/lib/plan-config.ts` — tier limits constants (~40 lines)

### Files to Modify
- `prisma/schema.prisma` — add 3 models
- `app/routes/app.api.agents.run-all.tsx` — add plan + frequency gate
- `app/routes/app.api.agents.$agentId.run.tsx` — add plan + frequency gate
- `app/services/agent-settings.server.ts` — no changes yet (Phase 3)

## Implementation Steps

### Step 1: Add Prisma Models

Add to `prisma/schema.prisma` after the ActivityLog model:

```prisma
model ShopPlan {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  shop                  String   @unique
  tier                  String   @default("free") // "free" | "starter" | "pro" | "agency"
  shopifySubscriptionId String?
  subscriptionStatus    String   @default("active") // "active" | "pending" | "frozen" | "cancelled"
  trialEndsAt           DateTime?
  currentPeriodEnd      DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model ProductCount {
  id       String   @id @default(auto()) @map("_id") @db.ObjectId
  shop     String   @unique
  count    Int      @default(0)
  syncedAt DateTime @default(now())
}

model RunFrequencyLog {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  shop      String
  weekStart DateTime
  runCount  Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([shop, weekStart])
  @@index([shop])
}
```

Then run `npx prisma db push` to sync.

### Step 2: Create Plan Config

Create `app/lib/plan-config.ts`:

```typescript
export type PlanTier = "free" | "starter" | "pro" | "agency";
export type TrustLevel = "advisor" | "assistant" | "autopilot";

export interface PlanLimits {
  maxProducts: number;
  maxAgents: number;
  maxRunsPerWeek: number;
  allowedTrustLevels: TrustLevel[];
  maxStores: number;
  price: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxProducts: 25,
    maxAgents: 2,
    maxRunsPerWeek: 2,
    allowedTrustLevels: ["advisor"],
    maxStores: 1,
    price: 0,
  },
  starter: {
    maxProducts: 100,
    maxAgents: 4,
    maxRunsPerWeek: 7,
    allowedTrustLevels: ["advisor", "assistant"],
    maxStores: 1,
    price: 29,
  },
  pro: {
    maxProducts: -1, // unlimited
    maxAgents: 6,
    maxRunsPerWeek: -1, // unlimited
    allowedTrustLevels: ["advisor", "assistant", "autopilot"],
    maxStores: 1,
    price: 99,
  },
  agency: {
    maxProducts: -1,
    maxAgents: 6,
    maxRunsPerWeek: -1,
    allowedTrustLevels: ["advisor", "assistant", "autopilot"],
    maxStores: 5,
    price: 249,
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}

/** Returns Monday 00:00 UTC of the current week */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - diff,
  ));
  return monday;
}
```

### Step 3: Create Billing Service

Create `app/services/billing.server.ts`:

```typescript
import prisma from "../db.server";
import {
  type PlanTier,
  type PlanLimits,
  getPlanLimits,
  getCurrentWeekStart,
} from "../lib/plan-config";

// --- ShopPlan ---

export async function getShopPlan(shop: string) {
  let plan = await prisma.shopPlan.findUnique({ where: { shop } });
  if (!plan) {
    plan = await prisma.shopPlan.create({
      data: { shop, tier: "free", subscriptionStatus: "active" },
    });
  }
  return plan;
}

export async function updateShopPlan(
  shop: string,
  data: {
    tier?: PlanTier;
    shopifySubscriptionId?: string;
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

// --- Product Count ---

const PRODUCT_COUNT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function getProductCount(shop: string): Promise<number> {
  const cached = await prisma.productCount.findUnique({ where: { shop } });
  if (cached && Date.now() - cached.syncedAt.getTime() < PRODUCT_COUNT_TTL_MS) {
    return cached.count;
  }
  return cached?.count ?? 0; // Return stale if exists; sync happens separately
}

export async function syncProductCount(
  shop: string,
  admin: { graphql: Function },
): Promise<number> {
  const response = await admin.graphql(
    `{ productsCount { count } }`,
  );
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

// --- Run Gate (main entry point for routes) ---

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

  // Check subscription status
  if (plan.subscriptionStatus === "frozen" || plan.subscriptionStatus === "cancelled") {
    return { allowed: false, reason: "Subscription inactive", tier: plan.tier };
  }

  // RT-5: Check trial expiry (only if NOT actively paying)
  if (
    plan.trialEndsAt &&
    new Date() > plan.trialEndsAt &&
    plan.tier !== "free" &&
    plan.subscriptionStatus !== "active"
  ) {
    return { allowed: false, reason: "Trial expired", tier: plan.tier };
  }

  // Check run limit
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
    return { allowed: true, runsUsed, runsLimit: limits.maxRunsPerWeek, tier: plan.tier };
  }

  return { allowed: true, tier: plan.tier };
}

// --- Usage Summary (for dashboard) ---

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
```

### Step 4: Gate the Run-All Route

Update `app/routes/app.api.agents.run-all.tsx`:

```typescript
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllAgents } from "../agents/agent-registry.server";
import { getEnabledAgentIds } from "../services/agent-settings.server";
import { executeAllAgents } from "../services/agent-executor.server";
import { canRunAgents, incrementRunCount } from "../services/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // Plan gate
  const gate = await canRunAgents(session.shop);
  if (!gate.allowed) {
    return data(
      { success: false, error: gate.reason, upgradeUrl: "/app/upgrade" },
      { status: 403 },
    );
  }

  const enabledIds = await getEnabledAgentIds(session.shop);
  const agents = getAllAgents().filter((a) => enabledIds.includes(a.agentId));

  const results = await executeAllAgents(agents, session.shop, admin);

  // Increment after successful execution
  await incrementRunCount(session.shop);

  return data({ success: true, results, usage: { runsUsed: gate.runsUsed, runsLimit: gate.runsLimit } });
};
```

### Step 5: Gate the Single Agent Route

Update `app/routes/app.api.agents.$agentId.run.tsx` -- add same `canRunAgents` + `incrementRunCount` pattern as Step 4.

### Step 6: Push Schema and Test

```bash
npx prisma db push
npm run typecheck
```

## Red Team Fixes Applied

### RT-2: TOCTOU Race — Increment-Before-Execute
Change run gate pattern: atomically increment run count FIRST, then execute agents. If execution fails, decrement. This eliminates the race window where concurrent requests pass the check before either increments.

### RT-3: Default-Enabled Agents Bypass Free Tier Limit
- `getShopPlan()`: After auto-creating a free-tier record, call `enforcePlanLimits(shop, "free")` immediately
- Run routes: After getting `enabledIds`, compare `enabledIds.length` against `planLimits.maxAgents` and reject or slice to limit
- Add agent count check to `canRunAgents()` (requires passing enabledAgentCount or querying it internally)

### RT-4: Product Count Limit Never Enforced
- Add `isWithinProductLimit()` check to `canRunAgents()` (accept optional `admin` param for sync, or check cached count)
- Add `syncProductCount()` call to dashboard loader (first access trigger)
- Return product limit status in `RunGateResult`

## Todo List

- [x] Add ShopPlan, ProductCount, RunFrequencyLog models to schema.prisma
- [x] Run `npx prisma db push`
- [x] Create `app/lib/plan-config.ts` with tier limits constants
- [x] Create `app/services/billing.server.ts` with all functions
- [x] **RT-2:** Implement increment-before-execute pattern in run gate (atomic increment, execute, decrement on failure)
- [x] **RT-3:** Call `enforcePlanLimits()` in `getShopPlan()` on first-time free plan creation
- [x] **RT-3:** Add agent count enforcement to run routes (slice enabledIds to maxAgents)
- [x] **RT-4:** Add `isWithinProductLimit()` to `canRunAgents()` or run routes
- [x] **RT-4:** Add `syncProductCount()` to dashboard loader
- [x] Gate `app/routes/app.api.agents.run-all.tsx` with canRunAgents
- [x] Gate `app/routes/app.api.agents.$agentId.run.tsx` with canRunAgents
- [x] Run `npm run typecheck` -- verify no type errors
- [x] Manual test: confirm free tier shops can only run 2x/week
- [x] Manual test: confirm run-all returns 403 with upgradeUrl after limit
- [x] Manual test: confirm concurrent requests don't bypass run limit

## Success Criteria

- All 3 models exist in MongoDB after `prisma db push`
- New shops auto-created as `free` tier on first plan check
- Run-all returns 403 JSON with reason after 2 runs/week on free tier
- Single-agent run also gated
- `getUsageSummary()` returns correct data for dashboard widget
- No TypeScript errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Product count API unavailable | Low | Return cached/stale count, don't block runs |
| Week boundary edge case (timezone) | Low | Use UTC Monday consistently |
| Existing shops have no ShopPlan | Medium | Auto-create on first `getShopPlan()` call |
| Run count race condition | Low | `upsert` with atomic `increment` prevents double-counting |

## Security Considerations

- All routes authenticate via `authenticate.admin(request)` before plan checks
- Plan tier stored server-side only; cannot be tampered by client
- Subscription status verified from DB (synced via webhook, not client-provided)
- No billing secrets exposed to frontend

## Next Steps

- Phase 2 depends on this: Shopify Billing API creates/updates ShopPlan records
- Phase 3 depends on this: trust level gating reads `getPlanLimits()` for allowed levels
- Phase 4 depends on this: dashboard usage widget calls `getUsageSummary()`
