import type { LoaderFunctionArgs } from "react-router";
import {
  useLoaderData,
  useFetcher,
  useNavigate,
  useSearchParams,
} from "react-router";
import { authenticate } from "../shopify.server";
import { getAgentSettings } from "../services/agent-settings.server";
import { getFindings } from "../services/finding-storage.server";
import { getActivityLog } from "../services/activity-log.server";
import { getShopPlan } from "../services/billing.server";
import { getPlanLimits, type PlanTier } from "../lib/plan-config";

const AGENT_LABELS: Record<string, string> = {
  aeo: "AEO",
  content: "Content",
  schema: "Schema",
  inventory: "Inventory",
  storefront: "Storefront",
  review: "Review",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [agentSettingsList, findings, activityLog, plan] = await Promise.all([
    getAgentSettings(session.shop),
    getFindings(session.shop),
    getActivityLog(session.shop, { limit: 50 }),
    getShopPlan(session.shop),
  ]);
  const planLimits = getPlanLimits(plan.tier as PlanTier);

  const findingsByAgent = new Map<
    string,
    { total: number; actionNeeded: number; lastRun?: string }
  >();
  for (const f of findings) {
    const existing = findingsByAgent.get(f.agentId) || {
      total: 0,
      actionNeeded: 0,
    };
    existing.total++;
    if (f.type === "action_needed" && f.status === "pending")
      existing.actionNeeded++;
    const updated = f.updatedAt?.toString();
    if (!existing.lastRun || (updated && updated > existing.lastRun)) {
      existing.lastRun = updated;
    }
    findingsByAgent.set(f.agentId, existing);
  }

  const agentsWithStats = agentSettingsList.map((a) => {
    const stats = findingsByAgent.get(a.agentId);
    return {
      ...a,
      totalFindings: stats?.total ?? 0,
      actionNeeded: stats?.actionNeeded ?? 0,
      lastRun: stats?.lastRun ?? null,
    };
  });

  return {
    agents: agentsWithStats,
    activityLog,
    currentTier: plan.tier,
    planLimits,
  };
};

export default function AgentsListPage() {
  const { agents, activityLog, planLimits } =
    useLoaderData<typeof loader>();
  const runAllFetcher = useFetcher();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isRunningAll = runAllFetcher.state !== "idle";
  const activeTab = searchParams.get("tab") ?? "agents";

  const runResult = runAllFetcher.data as {
    success?: boolean;
    error?: string;
    upgradeUrl?: string;
  } | null;

  const enabledCount = agents.filter((a) => a.enabled).length;

  return (
    <s-page heading="My Team">
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

      {runResult && !runResult.success && (
        <s-banner tone="warning">
          {runResult.error}{" "}
          <s-link href={runResult.upgradeUrl || "/app/upgrade"}>
            View upgrade options
          </s-link>
        </s-banner>
      )}

      <s-banner tone="info">
        Your AI Secretary manages {agents.length} specialist agents. Each agent
        monitors a specific area of your store and reports findings to your
        daily briefing.
        {enabledCount > planLimits.maxAgents && (
          <> Some agents exceed your plan limit.</>
        )}
      </s-banner>

      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="small">
            <s-button
              variant={activeTab === "agents" ? "primary" : "secondary"}
              onClick={() => setSearchParams({})}
            >
              Agents ({agents.length})
            </s-button>
            <s-button
              variant={activeTab === "activity" ? "primary" : "secondary"}
              onClick={() => setSearchParams({ tab: "activity" })}
            >
              Activity ({activityLog.length})
            </s-button>
          </s-stack>

          {activeTab === "agents" ? (
            <s-stack direction="block" gap="base">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.agentId}
                  agent={agent}
                  onNavigate={() => navigate(`/app/agents/${agent.agentId}`)}
                  planLimited={
                    !agent.enabled &&
                    enabledCount >= planLimits.maxAgents
                  }
                />
              ))}
            </s-stack>
          ) : (
            <s-stack direction="block" gap="small">
              {activityLog.length === 0 ? (
                <s-paragraph>
                  No activity yet. Run your agents to see activity here.
                </s-paragraph>
              ) : (
                activityLog.map((entry) => (
                  <s-box
                    key={entry.id}
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                  >
                    <s-stack direction="block" gap="small">
                      <s-stack direction="inline" gap="small">
                        {entry.agentId && (
                          <s-badge>
                            {AGENT_LABELS[entry.agentId] ?? entry.agentId}
                          </s-badge>
                        )}
                        <s-badge
                          tone={
                            entry.type === "agent_run"
                              ? "info"
                              : entry.type === "finding_applied"
                                ? "success"
                                : entry.type === "finding_dismissed"
                                  ? "neutral"
                                  : "warning"
                          }
                        >
                          {entry.type === "agent_run"
                            ? "Run"
                            : entry.type === "finding_applied"
                              ? "Applied"
                              : entry.type === "finding_dismissed"
                                ? "Dismissed"
                                : "Auto"}
                        </s-badge>
                      </s-stack>
                      <s-paragraph>{entry.message}</s-paragraph>
                      <s-paragraph>
                        {new Date(entry.createdAt).toLocaleString()}
                      </s-paragraph>
                    </s-stack>
                  </s-box>
                ))
              )}
            </s-stack>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}

function AgentCard({
  agent,
  onNavigate,
  planLimited,
}: {
  agent: {
    agentId: string;
    displayName: string;
    description: string;
    enabled: boolean;
    totalFindings: number;
    actionNeeded: number;
    lastRun: string | null;
  };
  onNavigate: () => void;
  planLimited: boolean;
}) {
  const fetcher = useFetcher();
  const isRunning = fetcher.state !== "idle";

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-text>
            <strong>{agent.displayName}</strong>
          </s-text>
          {!agent.enabled && <s-badge tone="critical">Disabled</s-badge>}
          {planLimited && <s-badge tone="warning">Plan Limit</s-badge>}
        </s-stack>
        <s-paragraph>{agent.description}</s-paragraph>
        <s-stack direction="inline" gap="small">
          <s-badge>{agent.totalFindings} findings</s-badge>
          {agent.actionNeeded > 0 && (
            <s-badge tone="warning">
              {agent.actionNeeded} need attention
            </s-badge>
          )}
          {agent.lastRun && (
            <s-paragraph>
              Last run: {new Date(agent.lastRun).toLocaleString()}
            </s-paragraph>
          )}
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-button
            variant="secondary"
            onClick={() =>
              fetcher.submit(
                {},
                {
                  method: "POST",
                  action: `/app/api/agents/${agent.agentId}/run`,
                },
              )
            }
            {...(isRunning ? { loading: true } : {})}
            {...(!agent.enabled ? { disabled: true } : {})}
          >
            Run
          </s-button>
          <s-button
            onClick={onNavigate}
            {...(!agent.enabled ? { disabled: true } : {})}
          >
            View Details
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
