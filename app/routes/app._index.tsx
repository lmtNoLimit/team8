import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getFindings } from "../services/finding-storage.server";
import { listAgents } from "../agents/agent-registry.server";
import { FindingsSection } from "../components/findings-section";
import { AgentStatusBar } from "../components/agent-status-bar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const [findings, agents] = await Promise.all([
    getFindings(session.shop),
    Promise.resolve(listAgents()),
  ]);

  const grouped = {
    done: findings.filter((f) => f.type === "done"),
    action_needed: findings.filter((f) => f.type === "action_needed"),
    insight: findings.filter((f) => f.type === "insight"),
  };

  return { grouped, agents };
};

export default function SecretaryDashboard() {
  const { grouped, agents } = useLoaderData<typeof loader>();
  const runAllFetcher = useFetcher();
  const isRunningAll = runAllFetcher.state !== "idle";

  const totalFindings =
    grouped.done.length + grouped.action_needed.length + grouped.insight.length;

  return (
    <s-page heading="Good morning! Your briefing is ready.">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runAllFetcher.submit(
            {},
            { method: "POST", action: "/app/api/agents/run-all" },
          )
        }
        {...(isRunningAll ? { loading: true } : {})}
      >
        Run All Agents
      </s-button>

      {totalFindings > 0 ? (
        <s-banner tone="info">
          Your team found {totalFindings} items:{" "}
          {grouped.action_needed.length} need your decision,{" "}
          {grouped.done.length} handled overnight,{" "}
          {grouped.insight.length} insights.
        </s-banner>
      ) : (
        <s-banner tone="success">
          No findings yet. Click "Run All Agents" to start your briefing.
        </s-banner>
      )}

      <FindingsSection
        heading="Needs Your Decision"
        findings={grouped.action_needed}
        emptyMessage="Nothing needs your attention right now."
      />

      <FindingsSection
        heading="Handled Overnight"
        findings={grouped.done}
        emptyMessage="No automated actions taken yet."
      />

      <FindingsSection
        heading="Insights"
        findings={grouped.insight}
        emptyMessage="No insights discovered yet."
      />

      <s-section slot="aside" heading="Your Agent Team">
        <AgentStatusBar agents={agents} />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
