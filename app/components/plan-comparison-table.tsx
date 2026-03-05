import { PLAN_LIMITS, TIER_ORDER, type PlanTier } from "../lib/plan-config";

interface PlanComparisonTableProps {
  currentTier: string;
  onSelectPlan: (tier: PlanTier) => void;
  isSubmitting: boolean;
}

const TIER_META: Record<PlanTier, { name: string; tagline: string }> = {
  free: { name: "Free", tagline: "Get started" },
  starter: { name: "Starter", tagline: "Growing stores" },
  pro: { name: "Pro", tagline: "Serious sellers" },
  agency: { name: "Agency", tagline: "Multi-store pros" },
};

export function PlanComparisonTable({
  currentTier,
  onSelectPlan,
  isSubmitting,
}: PlanComparisonTableProps) {
  const currentIndex = TIER_ORDER.indexOf(currentTier as PlanTier);

  return (
    <s-stack direction="inline" gap="base">
      {TIER_ORDER.map((tier) => {
        const limits = PLAN_LIMITS[tier];
        const meta = TIER_META[tier];
        const isCurrent = tier === currentTier;
        const tierIndex = TIER_ORDER.indexOf(tier);
        const isDowngrade = tierIndex < currentIndex;

        return (
          <s-box key={tier} padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>{meta.name}</strong>
              </s-text>
              <s-text>{meta.tagline}</s-text>
              <s-text>
                <strong>
                  {limits.price === 0 ? "Free" : `$${limits.price}/mo`}
                </strong>
              </s-text>
              <s-paragraph>
                {limits.maxProducts === -1
                  ? "Unlimited"
                  : limits.maxProducts}{" "}
                products
              </s-paragraph>
              <s-paragraph>{limits.maxAgents} agents</s-paragraph>
              <s-paragraph>
                {limits.maxRunsPerWeek === -1
                  ? "Unlimited"
                  : limits.maxRunsPerWeek}{" "}
                runs/week
              </s-paragraph>
              <s-paragraph>
                Trust: {limits.allowedTrustLevels.join(", ")}
              </s-paragraph>
              {limits.maxStores > 1 && (
                <s-paragraph>Up to {limits.maxStores} stores</s-paragraph>
              )}
              {isCurrent ? (
                <s-badge tone="info">Current Plan</s-badge>
              ) : (
                <s-button
                  variant={isDowngrade ? "secondary" : "primary"}
                  onClick={() => onSelectPlan(tier)}
                  {...(isSubmitting ? { loading: true } : {})}
                >
                  {isDowngrade ? "Downgrade" : "Upgrade"}
                </s-button>
              )}
            </s-stack>
          </s-box>
        );
      })}
    </s-stack>
  );
}
