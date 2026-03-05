# Phase 3: Filter Dashboard + Agents List + Run-All

## Priority: High
## Status: pending

## Overview
Filter findings, agent lists, and run-all execution by enabled agents. Three routes need changes.

## Current State
- `app._index.tsx` (dashboard): loads ALL findings, shows count of ALL agents
- `app.agents._index.tsx` (team page): loads ALL agents via `listAgents()`
- `app.api.agents.run-all.tsx`: runs ALL agents via `getAllAgents()`

## Related Code Files
- Modify: `app/routes/app._index.tsx`
- Modify: `app/routes/app.agents._index.tsx`
- Modify: `app/routes/app.api.agents.run-all.tsx`

## Implementation Steps

### 1. Dashboard — filter findings by enabled agents
In `app._index.tsx` loader:
```typescript
import { getEnabledAgentIds } from "../services/agent-settings.server";

// In loader:
const [findings, enabledIds] = await Promise.all([
  getFindings(session.shop),
  getEnabledAgentIds(session.shop),
]);

// Filter findings to enabled agents only
const enabledFindings = findings.filter(f => enabledIds.includes(f.agentId));
// Use enabledFindings for grouping instead of findings
```
Also update `agentCount` to use `enabledIds.length`.

### 2. Agents list — show enabled/disabled state
In `app.agents._index.tsx` loader:
```typescript
import { getAgentSettings } from "../services/agent-settings.server";

// Replace listAgents() with getAgentSettings() to get enabled state
const [agentSettings, findings, activityLog] = await Promise.all([
  getAgentSettings(session.shop),
  getFindings(session.shop),
  getActivityLog(session.shop, { limit: 50 }),
]);
```

In `AgentCard` component:
- Add `enabled` prop
- Show "Disabled" badge when `enabled === false`
- Disable "Run" button when agent is disabled
- Optionally: sort enabled agents first

### 3. Run-All — only run enabled agents
In `app.api.agents.run-all.tsx`:
```typescript
import { getEnabledAgentIds } from "../services/agent-settings.server";

const enabledIds = await getEnabledAgentIds(session.shop);
const agents = getAllAgents().filter(a => enabledIds.includes(a.agentId));
const results = await executeAllAgents(agents, session.shop, admin);
```

## Todo List
- [ ] Update app._index.tsx loader: filter findings by enabled agents
- [ ] Update app._index.tsx: show enabled agent count
- [ ] Update app.agents._index.tsx loader: use getAgentSettings for enabled state
- [ ] Update AgentCard: show enabled/disabled state, disable Run button
- [ ] Update run-all.tsx: filter by enabled agents
- [ ] Test: disable agent, verify findings hidden from dashboard
- [ ] Test: disable agent, verify "Run All" skips it
- [ ] Test: disable agent, verify team page shows disabled state

## Success Criteria
- Dashboard only shows findings from enabled agents
- "Run All Agents" only executes enabled agents
- Team page shows disabled agents with visual indicator
- Disabled agents can't be run from team page
