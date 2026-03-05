# Phase 2: Settings UI — Add Enable/Disable Toggle

## Priority: High
## Status: pending

## Overview
Add enable/disable toggle to existing settings page, alongside trust level controls. Each agent card should have a toggle to enable/disable.

## What Already Exists
- `app.settings.tsx` with `AgentTrustControl` component per agent
- Loader returns `agentSettings` array (includes `enabled` field already)
- Action handles `update_trust_level` — need to add `toggle_enabled` action
- `s-choice-list` for trust levels per agent

## What's Missing
- Enable/disable toggle in `AgentTrustControl` component
- `toggle_enabled` action handler in route action
- Visual feedback: disabled agents should look muted/grayed

## Related Code Files
- Modify: `app/routes/app.settings.tsx`

## Implementation Steps

### 1. Add `toggle_enabled` action handler
In the route `action` function, add:
```typescript
if (actionType === "toggle_enabled") {
  const agentId = formData.get("agentId") as string;
  const enabled = formData.get("enabled") === "true";
  await toggleAgentEnabled(session.shop, agentId, enabled);
  return data({ success: true, action: "toggle_enabled", agentId });
}
```
Import `toggleAgentEnabled` from agent-settings service.

### 2. Add toggle to AgentTrustControl
Add a checkbox/toggle at the top of each agent card:
```tsx
<s-checkbox
  label="Enabled"
  checked={agent.enabled}
  onChange={(e) => {
    const formData = new FormData();
    formData.set("_action", "toggle_enabled");
    formData.set("agentId", agent.agentId);
    formData.set("enabled", String(!agent.enabled));
    fetcher.submit(formData, { method: "post" });
  }}
/>
```

### 3. Visual feedback for disabled agents
When `agent.enabled === false`:
- Trust level controls should be visually muted or disabled
- Show "Disabled" badge
- Agent card uses subdued styling

### 4. Update AgentTrustControl props
Add `enabled` to the agent prop type (already in `getAgentSettings` return).

## Todo List
- [ ] Import `toggleAgentEnabled` in app.settings.tsx
- [ ] Add `toggle_enabled` action handler
- [ ] Add enable/disable toggle to AgentTrustControl component
- [ ] Disable trust level controls when agent is disabled
- [ ] Add visual feedback (badge, muted styling)
- [ ] Test: toggle off, verify DB updated
- [ ] Test: disabled agent shows muted state

## Success Criteria
- Each agent card has enable/disable toggle
- Toggle updates DB immediately via fetcher
- Disabled agents show muted trust level controls
- Trust level can still be changed when disabled (but agent won't run)
