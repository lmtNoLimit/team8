import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { getAgentTrustLevel } from "../services/agent-settings.server";
import { getAgent } from "../agents/agent-registry.server";
import { executeAgent } from "../services/agent-executor.server";
import { FindingsSection } from "../components/findings-section";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const findings = await getFindings(session.shop, { agentId: "storefront" });

  const scoreFinding = findings.find(
    (f) => f.deduplicationKey === "storefront:health-score",
  );
  const meta = scoreFinding?.metadata as Record<string, unknown> | null;
  const score = (meta?.score as number) ?? null;
  const imageIssues = (meta?.imageIssues as number) ?? 0;
  const contentIssues = (meta?.contentIssues as number) ?? 0;
  const totalProducts = (meta?.totalProducts as number) ?? 0;

  const trustLevel = await getAgentTrustLevel(session.shop, "storefront");

  return { findings, score, imageIssues, contentIssues, totalProducts, trustLevel };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  const agent = getAgent("storefront");
  if (!agent) {
    return data({ success: false, error: "Storefront agent not found" }, { status: 404 });
  }

  try {
    const findings = await executeAgent(agent, session.shop, admin);
    return data({ success: true, findingsCount: findings.length });
  } catch (error) {
    return data(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
};

function scoreTone(
  score: number | null,
): "success" | "warning" | "critical" | "neutral" {
  if (score === null) return "neutral";
  if (score > 80) return "success";
  if (score >= 50) return "warning";
  return "critical";
}

export default function StorefrontPage() {
  const { findings, score, imageIssues, contentIssues, totalProducts, trustLevel } =
    useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const isRunning = runFetcher.state !== "idle";
  const runResult = runFetcher.data as
    | { success: boolean; findingsCount?: number; error?: string }
    | undefined;

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const insights = findings.filter((f) => f.type === "insight");
  const done = findings.filter((f) => f.type === "done");

  return (
    <s-page heading="Store Health">
      <s-link slot="breadcrumb-actions" href="/app/agents">
        My Team
      </s-link>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runFetcher.submit(
            {},
            { method: "POST" },
          )
        }
        {...(isRunning ? { loading: true } : {})}
      >
        {isRunning ? "Running..." : "Run Audit"}
      </s-button>

      {runResult && !isRunning && (
        <s-banner tone={runResult.success ? "success" : "critical"}>
          {runResult.success
            ? `Audit complete! Found ${runResult.findingsCount ?? 0} items.`
            : `Audit failed: ${runResult.error ?? "Unknown error"}`}
        </s-banner>
      )}

      {score !== null ? (
        <s-section heading="Health Score">
          <s-stack direction="inline" gap="base">
            <s-badge tone={scoreTone(score)}>Score: {score}/100</s-badge>
            <s-badge tone={imageIssues > 0 ? "warning" : "success"}>
              {imageIssues} Image Issues
            </s-badge>
            <s-badge tone={contentIssues > 0 ? "warning" : "success"}>
              {contentIssues} Content Issues
            </s-badge>
            <s-badge tone="info">{totalProducts} Products Audited</s-badge>
          </s-stack>
        </s-section>
      ) : (
        <s-banner tone="info">
          No audit data yet. Click &ldquo;Run Audit&rdquo; to scan your storefront.
        </s-banner>
      )}

      <FindingsSection
        heading="Action Needed"
        findings={actionNeeded}
        emptyMessage="No issues found. Your storefront looks good!"
        trustLevel={trustLevel}
      />

      <FindingsSection
        heading="Insights"
        findings={insights}
        emptyMessage="No insights yet. Run an audit to get CRO recommendations."
        trustLevel={trustLevel}
      />

      <FindingsSection
        heading="Completed"
        findings={done}
        emptyMessage="No completed checks yet."
        trustLevel={trustLevel}
      />
    </s-page>
  );
}
