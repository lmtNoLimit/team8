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
  trustLevel?: "advisor" | "assistant" | "autopilot";
}

export function FindingCard({ finding, trustLevel = "assistant" }: FindingCardProps) {
  const dismissFetcher = useFetcher();
  const applyFetcher = useFetcher();
  const isDismissing = dismissFetcher.state !== "idle";
  const isApplying = applyFetcher.state !== "idle";

  const applyResult = applyFetcher.data as
    | { success: boolean; message: string; error?: string }
    | undefined;

  const tone =
    PRIORITY_TONES[finding.priority as keyof typeof PRIORITY_TONES] ?? "info";

  let actionData: Record<string, unknown> | null = null;
  try {
    actionData = finding.action ? JSON.parse(finding.action) : null;
  } catch {
    // malformed action JSON — treat as no action
  }
  const adminUrl = (actionData?.adminUrl as string) ?? null;
  const isAutoFixable = actionData && actionData.fixType !== "manual_upload_image";
  const showActions =
    trustLevel !== "advisor" &&
    finding.type === "action_needed" &&
    finding.status === "pending";

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
        {finding.description.includes("\n\nRecommendation:") ? (
          <>
            <s-paragraph>
              {finding.description.split("\n\nRecommendation:")[0]}
            </s-paragraph>
            <s-box padding="small" borderWidth="base" borderRadius="base">
              <s-text>
                <strong>Recommendation:</strong>{" "}
                {finding.description.split("\n\nRecommendation:")[1].trim()}
              </s-text>
            </s-box>
          </>
        ) : (
          <s-paragraph>{finding.description}</s-paragraph>
        )}

        {applyResult && (
          <s-banner tone={applyResult.success ? "success" : "critical"}>
            {applyResult.success ? applyResult.message : applyResult.error ?? applyResult.message}
          </s-banner>
        )}

        {showActions && (
          <s-stack direction="inline" gap="small">
            {isAutoFixable && (
              <s-button
                variant="primary"
                onClick={() =>
                  applyFetcher.submit(
                    {},
                    {
                      method: "POST",
                      action: `/app/api/agents/findings/${finding.id}/apply`,
                    },
                  )
                }
                {...(isApplying ? { loading: true } : {})}
              >
                Apply Fix
              </s-button>
            )}
            {adminUrl && <s-link href={adminUrl}>Edit in Admin</s-link>}
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

        {trustLevel === "advisor" && adminUrl && finding.type === "action_needed" && finding.status === "pending" && (
          <s-link href={adminUrl}>View in Admin</s-link>
        )}
      </s-stack>
    </s-box>
  );
}
