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
    maxProducts: -1,
    maxAgents: 6,
    maxRunsPerWeek: -1,
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

export const TIER_ORDER: PlanTier[] = ["free", "starter", "pro", "agency"];

export const AGENCY_INCLUDED_STORES = 5;
export const AGENCY_EXTRA_STORE_PRICE = 29;
export const AGENCY_USAGE_CAP = 290;

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}

/** Returns Monday 00:00 UTC of the current week */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff),
  );
}

export class PlanLimitError extends Error {
  public upgradeUrl = "/app/upgrade";
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}
