import prisma from "../db.server";
import {
  getPlanLimits,
  AGENCY_INCLUDED_STORES,
  AGENCY_USAGE_CAP,
  AGENCY_EXTRA_STORE_PRICE,
  PlanLimitError,
} from "../lib/plan-config";
import { getShopPlan } from "./billing.server";

// --- Multi-Store (Agency) ---

export async function getManagedStores(primaryShop: string) {
  return prisma.storeAssignment.findMany({
    where: { primaryShop },
    orderBy: { addedAt: "asc" },
  });
}

export async function getManagedStoreCount(
  primaryShop: string,
): Promise<number> {
  return prisma.storeAssignment.count({ where: { primaryShop } });
}

export async function addManagedStore(
  primaryShop: string,
  managedShop: string,
) {
  const plan = await getShopPlan(primaryShop);
  if (plan.tier !== "agency") {
    throw new PlanLimitError(
      "Multi-store management requires the Agency plan.",
    );
  }

  const existing = await prisma.storeAssignment.findUnique({
    where: { primaryShop_managedShop: { primaryShop, managedShop } },
  });
  if (existing) {
    throw new Error("Store already managed.");
  }

  const currentCount = await getManagedStoreCount(primaryShop);
  const limits = getPlanLimits("agency");
  const maxTotalStores =
    limits.maxStores + Math.floor(AGENCY_USAGE_CAP / AGENCY_EXTRA_STORE_PRICE);
  if (currentCount >= maxTotalStores) {
    throw new PlanLimitError(
      `Maximum store limit reached (${maxTotalStores}). Contact support for higher limits.`,
    );
  }

  const assignment = await prisma.storeAssignment.create({
    data: { primaryShop, managedShop },
  });

  return {
    assignment,
    needsUsageCharge: currentCount + 1 > AGENCY_INCLUDED_STORES,
  };
}

export async function removeManagedStore(
  primaryShop: string,
  managedShop: string,
) {
  return prisma.storeAssignment.delete({
    where: { primaryShop_managedShop: { primaryShop, managedShop } },
  });
}

export function isOverIncludedStores(storeCount: number): boolean {
  return storeCount > AGENCY_INCLUDED_STORES;
}

// --- Cleanup (app uninstall) ---

export async function cleanupBillingRecords(shop: string): Promise<void> {
  await Promise.all([
    prisma.shopPlan.deleteMany({ where: { shop } }),
    prisma.productCount.deleteMany({ where: { shop } }),
    prisma.runFrequencyLog.deleteMany({ where: { shop } }),
    prisma.storeAssignment.deleteMany({ where: { primaryShop: shop } }),
    prisma.storeAssignment.deleteMany({ where: { managedShop: shop } }),
  ]);
}
