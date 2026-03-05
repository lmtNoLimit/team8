import { useFetcher } from "react-router";

const PRIORITY_TONES = {
  1: "critical",
  2: "warning",
  3: "warning",
  4: "info",
  5: "info",
} as const;

const PRIORITY_LABELS: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Info",
};

const AGENT_LABELS: Record<string, string> = {
  aeo: "AEO",
  content: "Content",
  schema: "Schema",
  inventory: "Inventory",
  storefront: "Storefront",
  review: "Review",
};

interface FindingCardProps {
  finding: {
    id: string;
    agentId: string;
    type: string;
    priority: number;
    title: string;
    description: string;
    action?: string | null;
    status: string;
  };
}

export function FindingCard({ finding }: FindingCardProps) {
  const dismissFetcher = useFetcher();
  const isDismissing = dismissFetcher.state !== "idle";

  const tone =
    PRIORITY_TONES[finding.priority as keyof typeof PRIORITY_TONES] ?? "info";

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-badge>
            {AGENT_LABELS[finding.agentId] ?? finding.agentId}
          </s-badge>
          <s-badge tone={tone}>
            {PRIORITY_LABELS[finding.priority] ?? "P" + finding.priority}
          </s-badge>
        </s-stack>

        <s-text>
          <strong>{finding.title}</strong>
        </s-text>
        <s-paragraph>{finding.description}</s-paragraph>

        {finding.type === "action_needed" && finding.status === "pending" && (
          <s-stack direction="inline" gap="small">
            {finding.action && (
              <s-button variant="primary">Apply Fix</s-button>
            )}
            <s-button
              variant="tertiary"
              onClick={() =>
                dismissFetcher.submit(
                  { status: "dismissed" },
                  {
                    method: "POST",
                    action: `/app/api/agents/findings/${finding.id}/status`,
                  },
                )
              }
              {...(isDismissing ? { loading: true } : {})}
            >
              Dismiss
            </s-button>
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
}
