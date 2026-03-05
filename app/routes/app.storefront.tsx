import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
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

  return { findings, score, imageIssues, contentIssues, totalProducts };
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
  const { findings, score, imageIssues, contentIssues, totalProducts } =
    useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const isRunning = runFetcher.state !== "idle";

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
            { method: "POST", action: "/app/api/agents/storefront/run" },
          )
        }
        {...(isRunning ? { loading: true } : {})}
      >
        Run Audit
      </s-button>

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
      />

      <FindingsSection
        heading="Insights"
        findings={insights}
        emptyMessage="No insights yet. Run an audit to get CRO recommendations."
      />

      <FindingsSection
        heading="Completed"
        findings={done}
        emptyMessage="No completed checks yet."
      />
    </s-page>
  );
}
