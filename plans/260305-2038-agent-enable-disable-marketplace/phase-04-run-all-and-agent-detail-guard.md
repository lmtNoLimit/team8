# Phase 4: Guards — Agent Detail + Run Endpoints

## Priority: Medium
## Status: pending

## Overview
Prevent accessing or running disabled agents via direct URL/API calls.

## Related Code Files
- Modify: `app/routes/app.agents.$agentId.tsx` — guard disabled agents
- Modify: `app/routes/app.api.agents.$agentId.run.tsx` — guard disabled agents

## Implementation Steps

### 1. Agent detail page guard
In `app.agents.$agentId.tsx` loader, after existing agent registry check:
```typescript
import { isAgentEnabled } from "../services/agent-settings.server";

// After existing getAgent() check:
const enabled = await isAgentEnabled(session.shop, agentId);
if (!enabled) {
  throw data(
    { error: `Agent "${agentId}" is disabled for this shop` },
    { status: 404 },
  );
}
```

### 2. Individual agent run endpoint guard
In `app.api.agents.$agentId.run.tsx` action, after existing getAgent() check:
```typescript
import { isAgentEnabled } from "../services/agent-settings.server";

// After existing getAgent() check:
const enabled = await isAgentEnabled(session.shop, agentId);
if (!enabled) {
  return data({ error: "Agent not enabled" }, { status: 403 });
}
```

## Todo List
- [ ] Add enabled guard to agent detail page loader
- [ ] Add enabled guard to individual agent run endpoint
- [ ] Test: disabled agent returns 404 on detail page
- [ ] Test: disabled agent returns 403 on individual run

## Success Criteria
- Navigating to disabled agent URL shows 404
- Running disabled agent via API returns 403
- All guards scoped to `session.shop`
- No breaking changes to enabled agents
