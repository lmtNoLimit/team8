import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { getAgent } from "../agents/agent-registry.server";
import { isAgentEnabled } from "../services/agent-settings.server";
import { FindingsSection } from "../components/findings-section";

interface TrendRow {
  trend: string;
  growth: string;
  category: string;
  matchingProducts: string[];
  type: string;
}

function buildTrendRows(
  findings: { type: string; metadata: unknown }[],
): TrendRow[] {
  const seen = new Set<string>();
  const rows: TrendRow[] = [];

  for (const f of findings) {
    if (!f.metadata || typeof f.metadata !== "object") continue;
    const meta = f.metadata as Record<string, unknown>;
    const trend = (meta.trend as string) || "";
    if (!trend || seen.has(trend)) continue;
    seen.add(trend);

    rows.push({
      trend,
      growth: (meta.growth as string) || "N/A",
      category: (meta.category as string) || "keyword",
      matchingProducts: Array.isArray(meta.matchingProducts)
        ? (meta.matchingProducts as string[])
        : [],
      type: f.type,
    });
  }

  return rows;
}

const CATEGORY_TONES: Record<string, string> = {
  keyword: "info",
  seasonal: "warning",
  emerging: "success",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const agent = getAgent("trend");
  if (!agent) {
    throw data({ error: "Trend agent not found" }, { status: 404 });
  }

  const enabled = await isAgentEnabled(session.shop, "trend");
  if (!enabled) {
    throw data(
      { error: "Trend agent is disabled for this shop" },
      { status: 403 },
    );
  }

  const findings = await getFindings(session.shop, { agentId: "trend" });

  return {
    agent: {
      agentId: agent.agentId,
      displayName: agent.displayName,
      description: agent.description,
    },
    findings,
  };
};

export default function TrendRadarPage() {
  const { agent, findings } = useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const isRunning = runFetcher.state !== "idle";

  const actionNeeded = findings.filter(
    (f) => f.type === "action_needed" && f.status === "pending",
  );
  const done = findings.filter((f) => f.type === "done");
  const insights = findings.filter(
    (f) => f.type === "insight" && f.status === "pending",
  );

  const trendRows = buildTrendRows(findings);

  return (
    <s-page heading="Trend Radar">
      <s-link slot="breadcrumb-actions" href="/app/agents">
        My Team
      </s-link>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runFetcher.submit(
            {},
            { method: "POST", action: `/app/api/agents/${agent.agentId}/run` },
          )
        }
        {...(isRunning ? { loading: true } : {})}
      >
        Run Now
      </s-button>

      <s-banner tone="info">{agent.description}</s-banner>

      {/* Summary cards */}
      <s-section>
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>Trending</strong>
              </s-text>
              <s-badge tone="info">{trendRows.length}</s-badge>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>Opportunities</strong>
              </s-text>
              <s-badge tone="warning">{actionNeeded.length}</s-badge>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>Optimized</strong>
              </s-text>
              <s-badge tone="success">{done.length}</s-badge>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Trending Now table */}
      {trendRows.length > 0 && (
        <s-section heading="Trending Now">
          <s-stack direction="block" gap="small">
            {trendRows.map((row) => (
              <s-box
                key={row.trend}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-text>
                    <strong>{row.trend}</strong>
                  </s-text>
                  <s-badge tone="success">{row.growth}</s-badge>
                  <s-badge
                    tone={
                      (CATEGORY_TONES[row.category] as
                        | "info"
                        | "warning"
                        | "success") || "info"
                    }
                  >
                    {row.category}
                  </s-badge>
                  <s-text>
                    {row.matchingProducts.length > 0
                      ? `${row.matchingProducts.length} product${row.matchingProducts.length > 1 ? "s" : ""}`
                      : "No matches"}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}

      {/* Finding sections */}
      <FindingsSection
        heading="Opportunities"
        findings={actionNeeded}
        emptyMessage="No optimization opportunities right now."
      />

      <FindingsSection
        heading="Already Optimized"
        findings={done}
        emptyMessage="No trends optimized yet."
      />

      <FindingsSection
        heading="Insights"
        findings={insights}
        emptyMessage="No trend insights yet."
      />

      {/* Sidebar */}
      <s-section slot="aside" heading="Agent Info">
        <s-stack direction="block" gap="small">
          <s-paragraph>
            <s-text>
              <strong>ID:</strong>
            </s-text>{" "}
            {agent.agentId}
          </s-paragraph>
          <s-paragraph>
            <s-text>
              <strong>Total Findings:</strong>
            </s-text>{" "}
            {findings.length}
          </s-paragraph>
          {findings.length > 0 && (
            <s-paragraph>
              <s-text>
                <strong>Last Updated:</strong>
              </s-text>{" "}
              {new Date(
                findings[0].updatedAt,
              ).toLocaleString()}
            </s-paragraph>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
