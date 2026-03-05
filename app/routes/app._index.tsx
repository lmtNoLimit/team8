import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getFindings } from "../services/finding-storage.server";
import { listAgents } from "../agents/agent-registry.server";
import { getAgentSettings, getEnabledAgentIds } from "../services/agent-settings.server";
import { getStoreProfile } from "../services/store-profile.server";
import { generateBriefing } from "../services/briefing.server";
import {
  getUsageSummary,
  shouldOfferTrial,
  syncProductCount,
} from "../services/billing.server";
import { FindingsSection } from "../components/findings-section";
import { FindingCard } from "../components/finding-card";
import { PlanUsageWidget } from "../components/plan-usage-widget";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  // H-4: sync product count on dashboard load (daily refresh)
  syncProductCount(shop, admin).catch(() => {});

  const [pendingFindings, handledToday, agents, agentSettings, storeProfile, enabledIds, usage, showTrialOffer] =
    await Promise.all([
      getFindings(shop, { status: "pending" }),
      getFindings(shop, { status: "applied" }),
      Promise.resolve(listAgents()),
      getAgentSettings(shop),
      getStoreProfile(shop),
      getEnabledAgentIds(shop),
      getUsageSummary(shop),
      shouldOfferTrial(shop),
    ]);

  const trustMap = Object.fromEntries(
    agentSettings.map((s) => [s.agentId, s.trustLevel]),
  );

  // Filter to only enabled agents
  const enabledPending = pendingFindings.filter((f) => enabledIds.includes(f.agentId));
  const enabledHandled = handledToday.filter((f) => enabledIds.includes(f.agentId));

  // Group pending findings by section
  const actionNeeded = enabledPending.filter((f) => f.type === "action_needed");
  const insights = enabledPending.filter((f) => f.type === "insight");
  const handledOvernight = enabledPending.filter((f) => f.type === "done");

  // Generate AI briefing
  const name = storeProfile?.storeName || undefined;
  const rawBriefing = await generateBriefing(enabledPending, name);

  // Validate findingIds — AI may return IDs that don't match actual findings
  const validFindingIds = new Set(enabledPending.map((f) => f.id));
  const briefing = {
    ...rawBriefing,
    topPriorities: rawBriefing.topPriorities.filter(
      (p) => p.findingId && validFindingIds.has(p.findingId),
    ),
  };

  // Progress: actionable items only (action_needed + insight)
  const actionableTotal = actionNeeded.length + insights.length + enabledHandled.length;
  const handledCount = enabledHandled.length;

  // Date for eyebrow
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return {
    briefing,
    actionNeeded,
    handledOvernight,
    insights,
    trustMap,
    agentCount: enabledIds.length,
    progress: { handled: handledCount, total: actionableTotal },
    lastChecked: [...enabledPending, ...enabledHandled]
      .map((f) => f.updatedAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]?.toISOString() ?? null,
    today,
    usage,
    showTrialOffer,
    totalFindings: enabledPending.length,
  };
};

interface PriorityFinding {
  id: string;
  agentId: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  action?: string | null;
  status: string;
  metadata?: unknown;
}

function PriorityItem({
  text,
  index,
  finding,
  trustLevel,
  isExpanded,
  onToggle,
}: {
  text: string;
  index: number;
  finding: PriorityFinding | undefined;
  trustLevel: "advisor" | "assistant" | "autopilot";
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-button variant="tertiary" onClick={onToggle}>
          <s-stack direction="inline" gap="base">
            <s-badge tone={index === 0 ? "critical" : index === 1 ? "warning" : "info"}>
              {index + 1}
            </s-badge>
            <s-text>{text}</s-text>
            <s-text>{isExpanded ? "▾" : "▸"}</s-text>
          </s-stack>
        </s-button>
        {isExpanded && finding && (
          <FindingCard finding={finding} trustLevel={trustLevel} />
        )}
      </s-stack>
    </s-box>
  );
}

export default function TodayDashboard() {
  const {
    briefing,
    actionNeeded,
    handledOvernight,
    insights,
    trustMap,
    agentCount,
    progress,
    lastChecked,
    today,
    usage,
    showTrialOffer,
    totalFindings,
  } = useLoaderData<typeof loader>();
  const runAllFetcher = useFetcher();
  const revalidator = useRevalidator();
  const isRunningAll = runAllFetcher.state !== "idle";

  // Format timestamp on client only to avoid hydration mismatch
  const [lastCheckedStr, setLastCheckedStr] = useState<string | null>(null);
  useEffect(() => {
    if (lastChecked) {
      setLastCheckedStr(new Date(lastChecked).toLocaleString());
    }
  }, [lastChecked]);

  useEffect(() => {
    if (runAllFetcher.state === "idle" && runAllFetcher.data) {
      revalidator.revalidate();
      shopify.toast.show("All agents finished running");
    }
  }, [runAllFetcher.state, runAllFetcher.data]);

  // Track which priority is expanded (by findingId)
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);

  // Build a lookup to resolve priority findingIds to full finding objects
  const allFindings = [...actionNeeded, ...insights, ...handledOvernight];
  const findingMap = new Map(allFindings.map((f) => [f.id, f]));

  // IDs shown inline via expanded priorities — exclude from sections below
  const priorityFindingIds = new Set(
    briefing.topPriorities.map((p) => p.findingId),
  );

  const runResult = runAllFetcher.data as {
    success?: boolean;
    error?: string;
    upgradeUrl?: string;
  } | null;

  return (
    <s-page heading="Today">
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
        {isRunningAll ? "Checking..." : "Check Now"}
      </s-button>

      {showTrialOffer && (
        <s-banner tone="success">
          Your agents have found {totalFindings} items! Start a free 7-day Pro
          trial to unlock all features.{" "}
          <s-link href="/app/upgrade?trial=true">Start Trial</s-link>
        </s-banner>
      )}

      {runResult && !runResult.success && (
        <s-banner tone="warning">
          {runResult.error}{" "}
          <s-link href={runResult.upgradeUrl || "/app/upgrade"}>
            View upgrade options
          </s-link>
        </s-banner>
      )}

      {/* Briefing Card */}
      <s-section>
        <s-box padding="large" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            {/* Eyebrow */}
            <s-text>{today} · Morning Briefing</s-text>

            {/* Greeting headline */}
            <s-text><strong>{briefing.greeting}</strong></s-text>

            {/* Last checked */}
            {lastCheckedStr && (
              <s-text>Last checked {lastCheckedStr}</s-text>
            )}

            {/* Top Priorities */}
            {briefing.topPriorities.length > 0 && (
              <s-stack direction="block" gap="base">
                <s-text><strong>Top Priorities</strong></s-text>
                {briefing.topPriorities.map((p, i) => {
                  const finding = findingMap.get(p.findingId);
                  return (
                    <PriorityItem
                      key={p.findingId || i}
                      text={p.text}
                      index={i}
                      finding={finding as PriorityFinding | undefined}
                      trustLevel={
                        (finding ? trustMap[finding.agentId] : "advisor") as
                          "advisor" | "assistant" | "autopilot"
                      }
                      isExpanded={expandedPriority === p.findingId}
                      onToggle={() =>
                        setExpandedPriority(
                          expandedPriority === p.findingId ? null : p.findingId,
                        )
                      }
                    />
                  );
                })}
              </s-stack>
            )}

            {/* Auto-handled + Insight banners */}
            {briefing.autoHandledSummary && (
              <s-banner tone="success">{briefing.autoHandledSummary}</s-banner>
            )}

            {briefing.insightHighlight && (
              <s-banner tone="info">{briefing.insightHighlight}</s-banner>
            )}
          </s-stack>
        </s-box>
      </s-section>

      {/* Needs Your Decision — exclude findings already shown in Top Priorities */}
      <FindingsSection
        heading="Needs Your Decision"
        findings={actionNeeded.filter((f) => !priorityFindingIds.has(f.id))}
        emptyMessage="All clear — nothing needs your attention right now."
        trustMap={trustMap}
      />

      {/* Handled Overnight */}
      <FindingsSection
        heading="Handled Overnight"
        findings={handledOvernight.filter((f) => !priorityFindingIds.has(f.id))}
        emptyMessage="No automated actions taken yet."
        trustMap={trustMap}
      />

      {/* If You Have Time */}
      <FindingsSection
        heading="If You Have Time"
        findings={insights.filter((f) => !priorityFindingIds.has(f.id))}
        emptyMessage="No extra opportunities right now."
        trustMap={trustMap}
      />

      {/* Sidebar */}
      <s-section slot="aside" heading="Plan & Usage">
        <PlanUsageWidget usage={usage} enabledAgentCount={agentCount} />
      </s-section>

      <s-section slot="aside" heading="Progress">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>
                <strong>
                  {progress.handled}/{progress.total} items handled
                </strong>
              </s-text>
              <s-paragraph>
                {progress.total === 0
                  ? "Hit Check Now to get started."
                  : progress.handled === progress.total
                    ? "You're all caught up!"
                    : `${progress.total - progress.handled} items remaining.`}
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text><strong>My Team</strong></s-text>
              <s-paragraph>{agentCount} agents monitoring your store.</s-paragraph>
              <s-link href="/app/agents">View My Team</s-link>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
