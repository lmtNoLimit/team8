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

const RECOMMENDED_TIER: PlanTier = "pro";

function formatLimit(value: number, suffix: string): string {
  return value === -1 ? `Unlimited ${suffix}` : `${value} ${suffix}`;
}

function getPlanFeatures(tier: PlanTier): string[] {
  const limits = PLAN_LIMITS[tier];
  const features = [
    formatLimit(limits.maxProducts, "products"),
    `${limits.maxAgents} agents`,
    formatLimit(limits.maxRunsPerWeek, "runs/week"),
    `Trust: ${limits.allowedTrustLevels.join(", ")}`,
  ];
  if (limits.maxStores > 1) {
    features.push(`Up to ${limits.maxStores} stores`);
  }
  return features;
}

export function PlanComparisonTable({
  currentTier,
  onSelectPlan,
  isSubmitting,
}: PlanComparisonTableProps) {
  const currentIndex = TIER_ORDER.indexOf(currentTier as PlanTier);

  return (
    <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
      {TIER_ORDER.map((tier) => {
        const limits = PLAN_LIMITS[tier];
        const meta = TIER_META[tier];
        const isCurrent = tier === currentTier;
        const isRecommended = tier === RECOMMENDED_TIER;
        const tierIndex = TIER_ORDER.indexOf(tier);
        const isDowngrade = tierIndex < currentIndex;
        const features = getPlanFeatures(tier);

        return (
          <s-grid-item key={tier} gridColumn="span 3" gridRow="span 1">
            <s-box padding="base" borderWidth="base" borderRadius="base" background="base">
              <s-stack direction="block" gap="base">
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="small">
                    <s-text>
                      <strong>{meta.name}</strong>
                    </s-text>
                    {isRecommended && <s-badge tone="info">Popular</s-badge>}
                  </s-stack>
                  <s-text>{meta.tagline}</s-text>
                </s-stack>

                <s-text>
                  <strong>
                    {limits.price === 0 ? "Free" : `$${limits.price}/mo`}
                  </strong>
                </s-text>

                <s-divider />

                <s-stack direction="block" gap="small">
                  {features.map((feature) => (
                    <s-text key={feature}>{feature}</s-text>
                  ))}
                </s-stack>

                {isCurrent ? (
                  <s-badge tone="success">Current plan</s-badge>
                ) : (
                  <s-button
                    variant={isRecommended ? "primary" : "secondary"}
                    onClick={() => onSelectPlan(tier)}
                    {...(isSubmitting ? { loading: true } : {})}
                  >
                    {isDowngrade ? "Downgrade" : "Upgrade"}
                  </s-button>
                )}
              </s-stack>
            </s-box>
          </s-grid-item>
        );
      })}
    </s-grid>
  );
}
