import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useRevalidator } from "react-router";
import { useCallback, useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getFindings } from "../services/finding-storage.server";
import { listAgents } from "../agents/agent-registry.server";
import { getAgentSettings, getEnabledAgentIds } from "../services/agent-settings.server";
import { getStoreProfile } from "../services/store-profile.server";
import { generateBriefing } from "../services/briefing.server";
import { FindingsSection } from "../components/findings-section";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [pendingFindings, handledToday, agents, agentSettings, storeProfile, enabledIds] =
    await Promise.all([
      getFindings(shop, { status: "pending" }),
      getFindings(shop, { status: "applied" }),
      Promise.resolve(listAgents()),
      getAgentSettings(shop),
      getStoreProfile(shop),
      getEnabledAgentIds(shop),
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
  };
};

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

  // Build a lookup for guidance text based on finding type + trust level
  const findingLookup = new Map(
    [...actionNeeded, ...insights, ...handledOvernight].map((f) => [f.id, f]),
  );

  const scrollToFinding = useCallback((findingId: string) => {
    const el = document.getElementById(`finding-${findingId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.outline = "2px solid var(--p-color-border-interactive)";
    el.style.outlineOffset = "2px";
    setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }, 3000);

    const finding = findingLookup.get(findingId);
    const trust = finding ? trustMap[finding.agentId] : undefined;
    if (trust === "assistant" && finding?.type === "action_needed") {
      shopify.toast.show("Review the details, then tap Apply Fix or Dismiss");
    } else if (trust === "advisor") {
      shopify.toast.show("This is an advisory finding — review and decide your next step");
    } else {
      shopify.toast.show("Here's the finding your secretary flagged");
    }
  }, [actionNeeded, insights, handledOvernight, trustMap]);

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
                {briefing.topPriorities.map((p, i) => (
                  <s-box
                    key={p.findingId || i}
                    padding="base"
                    borderWidth="base"
                    borderRadius="base"
                    ref={(el: HTMLElement | null) => {
                      if (!el) return;
                      el.style.cursor = "pointer";
                      el.onclick = () => scrollToFinding(p.findingId);
                    }}
                  >
                    <s-stack direction="inline" gap="base">
                      <s-badge tone={i === 0 ? "critical" : i === 1 ? "warning" : "info"}>
                        {i + 1}
                      </s-badge>
                      <s-text>{p.text}</s-text>
                      <s-text>→</s-text>
                    </s-stack>
                  </s-box>
                ))}
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

      {/* Needs Your Decision */}
      <FindingsSection
        heading="Needs Your Decision"
        findings={actionNeeded}
        emptyMessage="All clear — nothing needs your attention right now."
        trustMap={trustMap}
      />

      {/* Handled Overnight */}
      <FindingsSection
        heading="Handled Overnight"
        findings={handledOvernight}
        emptyMessage="No automated actions taken yet."
        trustMap={trustMap}
      />

      {/* If You Have Time */}
      <FindingsSection
        heading="If You Have Time"
        findings={insights}
        emptyMessage="No extra opportunities right now."
        trustMap={trustMap}
      />

      {/* Sidebar */}
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
