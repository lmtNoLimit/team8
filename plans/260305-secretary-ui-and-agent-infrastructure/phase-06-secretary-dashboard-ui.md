---
phase: 6
title: "Secretary Dashboard UI"
status: pending
owner: Dev F / Lead
effort: 2h
---

# Phase 6: Secretary Dashboard UI

## Context Links
- [PRD Section 6](../../docs/plans/2026-03-05-agentic-super-app-prd.md) -- MVP scope, daily rhythm
- [Researcher Report](../reports/researcher-multi-agent-architecture.md) -- Section 8
- Current dashboard: `app/routes/app._index.tsx` (template placeholder)
- Polaris web components: `<s-page>`, `<s-section>`, `<s-box>`, `<s-stack>`, `<s-badge>`, `<s-banner>`, `<s-button>`

## Overview

Replace the template `app._index.tsx` with the Secretary Morning Briefing Dashboard. This is the main screen merchants see when they open the app -- a daily report grouped into 3 sections: Handled Overnight, Needs Your Decision, and Insights.

## Key Insights

- **No `<s-tabs>` or `<s-data-table>` in Polaris web components for App Home** -- use `<s-section>` blocks to create visual grouping instead of tabs
- `<s-page>` with `heading` attribute is the outer container
- `<s-badge tone="critical|warning|info|success">` for priority/status indicators
- `<s-banner tone="...">` for section summaries or empty states
- `<s-box>` for card-like containers (finding cards)
- `<s-stack direction="inline|block" gap="base">` for layout
- `useFetcher()` from react-router for triggering agent runs without navigation
- `useLoaderData()` for initial finding data from the loader

## Requirements

**Functional:**
- Display findings grouped by type: "Handled Overnight" (done), "Needs Your Decision" (action_needed), "Insights" (insight)
- Each finding shows: agent badge, priority indicator, title, description, action button (if applicable)
- "Run All Agents" primary action button in page header
- Individual agent "Run" buttons per agent section (or per finding card)
- "Dismiss" button on action_needed findings
- Summary stats banner: total findings count by type
- Loading states while agents execute
- Empty state when no findings exist

**Non-functional:**
- All Polaris web components (no custom CSS)
- Responsive layout (Polaris handles this)
- Under 200 lines per file -- extract components if needed

## Architecture

```
app._index.tsx (route)
  |-- loader: fetches findings + agent list
  |-- component: renders briefing
  |
  +-- BriefingHeader (summary stats + Run All button)
  |
  +-- FindingsSection (one per type)
  |     +-- FindingCard (per finding)
  |           +-- PriorityBadge
  |           +-- AgentBadge
  |           +-- ActionButtons (dismiss/apply)
  |
  +-- AgentStatusBar (list of agents with run buttons)
```

## Related Code Files

**Modify:**
- `app/routes/app._index.tsx` -- complete rewrite

**Create (extract components if >200 lines):**
- `app/components/finding-card.tsx` -- individual finding display
- `app/components/findings-section.tsx` -- grouped section with heading
- `app/components/agent-status-bar.tsx` -- agent list with run buttons

**Read (dependencies):**
- `app/services/finding-storage.server.ts` -- `getFindings()`
- `app/agents/agent-registry.server.ts` -- `listAgents()`

## Implementation Steps

### Step 1: Route Loader (`app/routes/app._index.tsx`)

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { listAgents } from "../agents/agent-registry.server";
import { FindingCard } from "../components/finding-card";
import { FindingsSection } from "../components/findings-section";
import { AgentStatusBar } from "../components/agent-status-bar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const [findings, agents] = await Promise.all([
    getFindings(session.shop),
    Promise.resolve(listAgents()),
  ]);

  // Group by type
  const grouped = {
    done: findings.filter((f) => f.type === "done"),
    action_needed: findings.filter((f) => f.type === "action_needed"),
    insight: findings.filter((f) => f.type === "insight"),
  };

  return { grouped, agents, shop: session.shop };
};
```

### Step 2: Main Dashboard Component

```tsx
export default function SecretaryDashboard() {
  const { grouped, agents } = useLoaderData<typeof loader>();
  const runAllFetcher = useFetcher();
  const isRunningAll =
    runAllFetcher.state !== "idle" && runAllFetcher.formAction === "/app/api/agents/run-all";

  const totalFindings =
    grouped.done.length + grouped.action_needed.length + grouped.insight.length;

  return (
    <s-page heading="Good morning! Your briefing is ready.">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runAllFetcher.submit({}, { method: "POST", action: "/app/api/agents/run-all" })
        }
        {...(isRunningAll ? { loading: true } : {})}
      >
        Run All Agents
      </s-button>

      {/* Summary Banner */}
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

      {/* Section: Needs Your Decision */}
      <FindingsSection
        heading="Needs Your Decision"
        tone="warning"
        findings={grouped.action_needed}
        emptyMessage="Nothing needs your attention right now."
      />

      {/* Section: Handled Overnight */}
      <FindingsSection
        heading="Handled Overnight"
        tone="success"
        findings={grouped.done}
        emptyMessage="No automated actions taken yet."
      />

      {/* Section: Insights */}
      <FindingsSection
        heading="Insights"
        tone="info"
        findings={grouped.insight}
        emptyMessage="No insights discovered yet."
      />

      {/* Sidebar: Agent Status */}
      <s-section slot="aside" heading="Your Agent Team">
        <AgentStatusBar agents={agents} />
      </s-section>
    </s-page>
  );
}
```

### Step 3: FindingsSection Component (`app/components/findings-section.tsx`)

```tsx
import { FindingCard } from "./finding-card";

interface FindingsSectionProps {
  heading: string;
  tone: "info" | "warning" | "success" | "critical";
  findings: Array<{
    id: string;
    agentId: string;
    type: string;
    priority: number;
    title: string;
    description: string;
    action?: string | null;
    status: string;
  }>;
  emptyMessage: string;
}

export function FindingsSection({
  heading,
  tone,
  findings,
  emptyMessage,
}: FindingsSectionProps) {
  return (
    <s-section heading={`${heading} (${findings.length})`}>
      {findings.length === 0 ? (
        <s-paragraph>{emptyMessage}</s-paragraph>
      ) : (
        <s-stack direction="block" gap="base">
          {findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </s-stack>
      )}
    </s-section>
  );
}
```

### Step 4: FindingCard Component (`app/components/finding-card.tsx`)

```tsx
import { useFetcher } from "react-router";

const PRIORITY_TONES: Record<number, string> = {
  1: "critical",
  2: "warning",
  3: "warning",
  4: "info",
  5: "info",
};

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

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="tight">
        {/* Header row: agent badge + priority badge */}
        <s-stack direction="inline" gap="tight">
          <s-badge>{AGENT_LABELS[finding.agentId] ?? finding.agentId}</s-badge>
          <s-badge tone={PRIORITY_TONES[finding.priority] ?? "info"}>
            {PRIORITY_LABELS[finding.priority] ?? "P" + finding.priority}
          </s-badge>
        </s-stack>

        {/* Title */}
        <s-text fontWeight="bold">{finding.title}</s-text>

        {/* Description */}
        <s-paragraph>{finding.description}</s-paragraph>

        {/* Actions (only for action_needed findings) */}
        {finding.type === "action_needed" && finding.status === "pending" && (
          <s-stack direction="inline" gap="tight">
            {finding.action && (
              <s-button variant="primary" size="slim">
                Apply Fix
              </s-button>
            )}
            <s-button
              variant="tertiary"
              size="slim"
              onClick={() =>
                dismissFetcher.submit(
                  { status: "dismissed" },
                  {
                    method: "POST",
                    action: `/app/api/agents/findings/${finding.id}/status`,
                  }
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
```

### Step 5: AgentStatusBar Component (`app/components/agent-status-bar.tsx`)

```tsx
import { useFetcher } from "react-router";

interface AgentStatusBarProps {
  agents: Array<{
    agentId: string;
    displayName: string;
    description: string;
  }>;
}

export function AgentStatusBar({ agents }: AgentStatusBarProps) {
  return (
    <s-stack direction="block" gap="base">
      {agents.map((agent) => (
        <AgentRow key={agent.agentId} agent={agent} />
      ))}
    </s-stack>
  );
}

function AgentRow({
  agent,
}: {
  agent: { agentId: string; displayName: string; description: string };
}) {
  const fetcher = useFetcher();
  const isRunning = fetcher.state !== "idle";

  return (
    <s-box padding="tight" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="tight">
        <s-text fontWeight="bold">{agent.displayName}</s-text>
        <s-paragraph>{agent.description}</s-paragraph>
        <s-button
          variant="secondary"
          size="slim"
          onClick={() =>
            fetcher.submit(
              {},
              { method: "POST", action: `/app/api/agents/${agent.agentId}/run` }
            )
          }
          {...(isRunning ? { loading: true } : {})}
        >
          Run
        </s-button>
      </s-stack>
    </s-box>
  );
}
```

## Todo List

- [ ] Replace `app/routes/app._index.tsx` with Secretary Dashboard
- [ ] Create `app/components/finding-card.tsx`
- [ ] Create `app/components/findings-section.tsx`
- [ ] Create `app/components/agent-status-bar.tsx`
- [ ] Verify loader returns grouped findings correctly
- [ ] Test "Run All Agents" button triggers POST and revalidates
- [ ] Test "Dismiss" button on finding cards
- [ ] Test individual agent "Run" buttons in sidebar
- [ ] Test empty state (no findings)
- [ ] Run `npm run typecheck`

## Success Criteria

- Dashboard loads and shows findings grouped into 3 sections
- "Run All Agents" button triggers all agents and refreshes the page
- Individual "Run" buttons per agent work in sidebar
- "Dismiss" button moves finding out of "action_needed"
- Empty state displays when no findings exist
- All Polaris web components render correctly in Shopify Admin
- Page loads under 2 seconds

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Polaris web component props differ from docs | Test each component in dev; Polaris types package (`@shopify/polaris-types`) provides autocomplete |
| `useFetcher` revalidation doesn't refresh findings | React Router auto-revalidates loaders after action; if not, call `navigate(".", { replace: true })` |
| Page too long with many findings | Sort by priority, limit to 10 per section in MVP; add pagination in V2 |
| `<s-badge>` doesn't support `tone` attribute | Verify against Polaris web component docs; fallback to text styling |

## Security Considerations

- Loader authenticates via `authenticate.admin(request)` -- no unauthenticated access
- Findings are filtered by `session.shop` -- no cross-shop data leakage

## Next Steps

Phase 7 (Agent Detail Page) and Phase 8 (Navigation Update) can proceed in parallel.
