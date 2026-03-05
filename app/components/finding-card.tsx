import { useFetcher, useRevalidator } from "react-router";
import { useEffect, useState } from "react";

const PRIORITY_TONES = {
  1: "critical",
  2: "critical",
  3: "warning",
  4: "info",
  5: "info",
} as const;

const PRIORITY_LABELS: Record<number, string> = {
  1: "Fix today",
  2: "Fix today",
  3: "This week",
  4: "When you have time",
  5: "When you have time",
};

const AGENT_LABELS: Record<string, string> = {
  inventory: "Inventory",
  storefront: "Storefront",
  review: "Review",
  trend: "Trend",
};

/** Parse the action JSON and return human-readable guidance + optional admin link. */
function parseActionGuidance(
  actionStr: string | null | undefined,
  agentId: string,
  metadata?: Record<string, unknown> | null,
): { guidance: string; adminPath: string | null } | null {
  if (!actionStr) return null;

  try {
    const action = JSON.parse(actionStr) as Record<string, unknown>;
    const type = (action.type ?? action.fixType) as string;

    switch (type) {
      case "reorderAlert":
        return {
          guidance: `Reorder "${action.productTitle}" — only ${action.daysLeft} days of stock left.`,
          adminPath: "/products?inventory_quantity_max=20",
        };
      case "applyMetadata":
        return {
          guidance: `Update metadata on ${action.productCount} products to improve AI engine discoverability.`,
          adminPath: "/products",
        };
      case "addSchema":
        return {
          guidance: `Add ${action.schemaType} structured data to your ${action.page}.`,
          adminPath: "/themes",
        };
      case "expandDescriptions":
        return {
          guidance: `Expand descriptions on ${action.productCount} products to improve conversion and SEO.`,
          adminPath: "/products",
        };
      case "optimizePage":
        return {
          guidance: `Improve the product page for "${action.handle}" — update hero image and add a FAQ section.`,
          adminPath: action.handle ? `/products/${action.handle}` : "/products",
        };
      case "generate_alt_text":
        return {
          guidance: `Auto-generate descriptive alt text with AI for images missing alt text on "${action.productTitle}".`,
          adminPath: action.adminUrl as string | null,
        };
      case "improve_description":
        return {
          guidance: `Generate a rich, SEO-optimized product description with AI for "${action.productTitle}".`,
          adminPath: action.adminUrl as string | null,
        };
      case "manual_upload_image":
        return {
          guidance: `Upload a high-quality hero image (recommended: 1024x1024px, white background) in Shopify Admin.`,
          adminPath: action.adminUrl as string | null,
        };
      default:
        break;
    }
  } catch {
    // action is a plain-text instruction, not JSON
    return { guidance: actionStr, adminPath: null };
  }

  // Fallback for review agent and others that store info in metadata
  if (agentId === "review" && metadata?.productId) {
    return {
      guidance: "Check the reviews for this product and address recurring complaints.",
      adminPath: "/products",
    };
  }

  return null;
}

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
    metadata?: unknown;
  };
  trustLevel?: "advisor" | "assistant" | "autopilot";
}

export function FindingCard({ finding, trustLevel = "assistant" }: FindingCardProps) {
  const applyFetcher = useFetcher();
  const dismissFetcher = useFetcher();
  const revalidator = useRevalidator();
  const isApplying = applyFetcher.state !== "idle";
  const isDismissing = dismissFetcher.state !== "idle";
  const [showConfirm, setShowConfirm] = useState(false);

  const applyResult = applyFetcher.data as
    | { success?: boolean; message?: string; error?: string }
    | undefined;

  useEffect(() => {
    if (applyFetcher.state === "idle" && applyFetcher.data) {
      revalidator.revalidate();
      setShowConfirm(false);
      if (applyResult?.success) {
        shopify.toast.show(applyResult.message ?? `Done — "${finding.title}" fixed`);
      } else if (applyResult?.error) {
        shopify.toast.show(applyResult.error, { isError: true });
      }
    }
  }, [applyFetcher.state, applyFetcher.data]);

  useEffect(() => {
    if (dismissFetcher.state === "idle" && dismissFetcher.data) {
      revalidator.revalidate();
      shopify.toast.show("Finding dismissed");
    }
  }, [dismissFetcher.state, dismissFetcher.data]);

  const tone =
    PRIORITY_TONES[finding.priority as keyof typeof PRIORITY_TONES] ?? "info";
  const meta = finding.metadata as Record<string, unknown> | null | undefined;
  const estimatedRevenue = typeof meta?.estimatedRevenue === "number"
    ? meta.estimatedRevenue
    : null;

  const statusAction = `/app/api/agents/findings/${finding.id}/status`;
  const isActionNeeded = finding.type === "action_needed" && finding.status === "pending";
  const isInsight = finding.type === "insight" && finding.status === "pending";
  const showApplyDismiss = trustLevel === "assistant" && isActionNeeded;
  const showInsightDismiss = isInsight;

  const actionGuidance = parseActionGuidance(finding.action, finding.agentId, meta);

  let actionData: Record<string, unknown> | null = null;
  try {
    actionData = finding.action ? JSON.parse(finding.action) : null;
  } catch {
    // malformed action JSON — treat as no action
  }
  const adminUrl = (actionData?.adminUrl as string) ?? null;
  const isAutoFixable = actionData && actionData.fixType && actionData.fixType !== "manual_upload_image";

  return (
    <s-box id={`finding-${finding.id}`} padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        {/* Badges row */}
        <s-stack direction="inline" gap="small">
          <s-badge>
            {AGENT_LABELS[finding.agentId] ?? finding.agentId}
          </s-badge>
          <s-badge tone={tone}>
            {PRIORITY_LABELS[finding.priority] ?? "When you have time"}
          </s-badge>
          {estimatedRevenue !== null && (
            <s-badge tone="success">~${estimatedRevenue}/mo</s-badge>
          )}
        </s-stack>

        {/* Title + description */}
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

        {/* Suggested next step — shown for all trust levels */}
        {actionGuidance && (
          <s-box padding="small" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text><strong>Suggested next step</strong></s-text>
              <s-paragraph>{actionGuidance.guidance}</s-paragraph>
              {actionGuidance.adminPath && (
                <s-link href={actionGuidance.adminPath.startsWith("shopify:") ? actionGuidance.adminPath : `shopify://admin${actionGuidance.adminPath}`} target="_blank">
                  Open in Shopify Admin →
                </s-link>
              )}
            </s-stack>
          </s-box>
        )}

        {/* Apply result banner */}
        {applyResult && applyFetcher.state === "idle" && (
          <s-banner tone={applyResult.success ? "success" : "critical"}>
            {applyResult.success ? applyResult.message : applyResult.error ?? applyResult.message}
          </s-banner>
        )}

        {/* Advisor: manual instructions (no action buttons) */}
        {trustLevel === "advisor" && isActionNeeded && (
          <s-banner tone="info">
            This agent is in Advisor mode — review the suggestion above and take action manually in Shopify Admin.
          </s-banner>
        )}

        {/* Assistant: Apply Fix with confirmation + Dismiss */}
        {showApplyDismiss && !showConfirm && (
          <s-stack direction="inline" gap="small">
            {finding.action && (
              <s-button
                variant="primary"
                onClick={() => isAutoFixable ? setShowConfirm(true) : setShowConfirm(true)}
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
                  { method: "POST", action: statusAction },
                )
              }
              {...(isDismissing ? { loading: true } : {})}
            >
              Dismiss
            </s-button>
          </s-stack>
        )}

        {/* Confirmation step before applying */}
        {showApplyDismiss && showConfirm && (
          <s-box padding="small" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text><strong>Confirm action</strong></s-text>
              <s-paragraph>
                {actionGuidance?.guidance ?? "Apply the suggested fix for this finding."}
              </s-paragraph>
              <s-stack direction="inline" gap="small">
                <s-button
                  variant="primary"
                  onClick={() =>
                    isAutoFixable
                      ? applyFetcher.submit(
                          {},
                          {
                            method: "POST",
                            action: `/app/api/agents/findings/${finding.id}/apply`,
                          },
                        )
                      : applyFetcher.submit(
                          { status: "applied" },
                          { method: "POST", action: statusAction },
                        )
                  }
                  {...(isApplying ? { loading: true } : {})}
                >
                  {isApplying ? "Applying..." : "Yes, apply"}
                </s-button>
                <s-button
                  variant="tertiary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </s-button>
              </s-stack>
            </s-stack>
          </s-box>
        )}

        {/* Insights: Got it / Dismiss */}
        {showInsightDismiss && (
          <s-button
            onClick={() =>
              dismissFetcher.submit(
                { status: "dismissed" },
                { method: "POST", action: statusAction },
              )
            }
            {...(isDismissing ? { loading: true } : {})}
          >
            Got it
          </s-button>
        )}
      </s-stack>
    </s-box>
  );
}
