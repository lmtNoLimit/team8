interface UsageData {
  tier: string;
  runsUsed: number;
  limits: { maxRunsPerWeek: number; maxProducts: number; maxAgents: number };
  productCount: number;
}

interface PlanUsageWidgetProps {
  usage: UsageData;
  enabledAgentCount: number;
}

export function PlanUsageWidget({
  usage,
  enabledAgentCount,
}: PlanUsageWidgetProps) {
  const { tier, runsUsed, limits, productCount } = usage;
  const runsLabel =
    limits.maxRunsPerWeek === -1
      ? "Unlimited"
      : `${runsUsed}/${limits.maxRunsPerWeek}`;
  const productsLabel =
    limits.maxProducts === -1
      ? "Unlimited"
      : `${productCount}/${limits.maxProducts}`;
  const agentsLabel = `${enabledAgentCount}/${limits.maxAgents}`;

  type BadgeTone = "info" | "warning" | "critical";
  const runsPercent =
    limits.maxRunsPerWeek === -1
      ? 0
      : (runsUsed / limits.maxRunsPerWeek) * 100;
  const runsTone: BadgeTone =
    runsPercent >= 100 ? "critical" : runsPercent >= 75 ? "warning" : "info";

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-text>
            <strong>Plan:</strong>
          </s-text>
          <s-badge tone="info">
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Runs:</s-text>
          <s-badge tone={runsTone}>{runsLabel}</s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Products:</s-text>
          <s-badge>{productsLabel}</s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Agents:</s-text>
          <s-badge>{agentsLabel}</s-badge>
        </s-stack>
        {tier === "free" && (
          <s-button variant="primary" href="/app/upgrade">
            Upgrade
          </s-button>
        )}
      </s-stack>
    </s-box>
  );
}
