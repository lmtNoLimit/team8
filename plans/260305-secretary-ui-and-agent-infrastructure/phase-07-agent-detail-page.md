---
phase: 7
title: "Agent Detail Page"
status: pending
owner: Lead
effort: 30min
---

# Phase 7: Agent Detail Page

## Context Links
- [API Routes](./phase-04-api-routes-for-agent-execution.md)
- [Dashboard UI](./phase-06-secretary-dashboard-ui.md)

## Overview

Create `app.agents.$agentId.tsx` -- a detail page showing all findings for a specific agent, plus agent metadata and a run button. Accessible from the dashboard by clicking an agent name or via `/app/agents/:agentId`.

## Requirements

**Functional:**
- Display agent name, description, and "Run Now" button
- List all findings for this agent, sorted by priority then date
- Show finding type badge (done/action_needed/insight) and priority badge
- Dismiss/apply buttons on action_needed findings
- Back link to dashboard

**Non-functional:**
- Reuses `FindingCard` component from Phase 6
- Under 100 lines

## Related Code Files

**Create:**
- `app/routes/app.agents.$agentId.tsx`

**Read (dependencies):**
- `app/agents/agent-registry.server.ts` -- `getAgent()`
- `app/services/finding-storage.server.ts` -- `getFindings()`
- `app/components/finding-card.tsx` -- reused component

## Implementation Steps

### Step 1: Create `app/routes/app.agents.$agentId.tsx`

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, data } from "react-router";
import { authenticate } from "../shopify.server";
import { getFindings } from "../services/finding-storage.server";
import { getAgent } from "../agents/agent-registry.server";
import { FindingCard } from "../components/finding-card";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { agentId } = params;

  if (!agentId) {
    throw data({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = getAgent(agentId);
  if (!agent) {
    throw data({ error: `Agent "${agentId}" not found` }, { status: 404 });
  }

  const findings = await getFindings(session.shop, { agentId });

  return {
    agent: {
      agentId: agent.agentId,
      displayName: agent.displayName,
      description: agent.description,
    },
    findings,
  };
};

export default function AgentDetailPage() {
  const { agent, findings } = useLoaderData<typeof loader>();
  const runFetcher = useFetcher();
  const isRunning = runFetcher.state !== "idle";

  const actionNeeded = findings.filter((f) => f.type === "action_needed");
  const done = findings.filter((f) => f.type === "done");
  const insights = findings.filter((f) => f.type === "insight");

  return (
    <s-page heading={agent.displayName}>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          runFetcher.submit(
            {},
            { method: "POST", action: `/app/api/agents/${agent.agentId}/run` }
          )
        }
        {...(isRunning ? { loading: true } : {})}
      >
        Run Now
      </s-button>

      <s-banner tone="info">{agent.description}</s-banner>

      {findings.length === 0 ? (
        <s-section heading="No Findings">
          <s-paragraph>
            This agent hasn't produced any findings yet. Click "Run Now" to start.
          </s-paragraph>
        </s-section>
      ) : (
        <>
          {actionNeeded.length > 0 && (
            <s-section heading={`Needs Decision (${actionNeeded.length})`}>
              <s-stack direction="block" gap="base">
                {actionNeeded.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
          {done.length > 0 && (
            <s-section heading={`Handled (${done.length})`}>
              <s-stack direction="block" gap="base">
                {done.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
          {insights.length > 0 && (
            <s-section heading={`Insights (${insights.length})`}>
              <s-stack direction="block" gap="base">
                {insights.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </s-stack>
            </s-section>
          )}
        </>
      )}

      <s-section slot="aside" heading="Agent Info">
        <s-paragraph>
          <s-text fontWeight="bold">ID:</s-text> {agent.agentId}
        </s-paragraph>
        <s-paragraph>
          <s-text fontWeight="bold">Total Findings:</s-text> {findings.length}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
```

## Todo List

- [ ] Create `app/routes/app.agents.$agentId.tsx`
- [ ] Run `npm run typecheck`
- [ ] Test navigation from dashboard to agent detail
- [ ] Test "Run Now" button

## Success Criteria

- `/app/agents/aeo` shows AEO agent findings
- `/app/agents/nonexistent` returns 404
- "Run Now" triggers agent and refreshes findings list
- FindingCard component renders consistently with dashboard

## Next Steps

Phase 8: Update navigation to link to agent pages.
