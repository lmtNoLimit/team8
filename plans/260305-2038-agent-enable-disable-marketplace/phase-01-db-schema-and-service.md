# Phase 1: Service Layer — Enable/Disable Functions

## Priority: High
## Status: pending

## Overview
Extend `agent-settings.server.ts` with enable/disable CRUD. DB schema already has `AgentSetting.enabled` field — just need service functions.

## What Already Exists
- `AgentSetting` model in Prisma with `enabled: Boolean @default(true)`
- `getAgentSettings(shop)` — returns all agents merged with registry, includes `enabled` field
- `updateAgentTrustLevel(shop, agentId, trustLevel)` — upserts trust level
- `getAgentTrustLevel(shop, agentId)` — gets single trust level

## What's Missing
- `toggleAgentEnabled(shop, agentId, enabled)` — upsert enabled state
- `getEnabledAgentIds(shop)` — returns string[] of enabled agentIds (for filtering)
- `isAgentEnabled(shop, agentId)` — check single agent (for guards)

## Related Code Files
- Modify: `app/services/agent-settings.server.ts`

## Implementation Steps

### 1. Add `toggleAgentEnabled` function
```typescript
export async function toggleAgentEnabled(
  shop: string,
  agentId: string,
  enabled: boolean,
) {
  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { enabled },
    create: { shop, agentId, enabled },
  });
}
```

### 2. Add `getEnabledAgentIds` function
```typescript
export async function getEnabledAgentIds(shop: string): Promise<string[]> {
  const agents = listAgents();
  const settings = await prisma.agentSetting.findMany({
    where: { shop },
    select: { agentId: true, enabled: true },
  });
  const settingsMap = new Map(settings.map((s) => [s.agentId, s.enabled]));
  // Agents without settings default to enabled
  return agents
    .map((a) => a.agentId)
    .filter((id) => settingsMap.get(id) ?? true);
}
```

### 3. Add `isAgentEnabled` function
```typescript
export async function isAgentEnabled(
  shop: string,
  agentId: string,
): Promise<boolean> {
  const setting = await prisma.agentSetting.findUnique({
    where: { shop_agentId: { shop, agentId } },
  });
  return setting?.enabled ?? true;
}
```

## Todo List
- [ ] Add `toggleAgentEnabled` to agent-settings.server.ts
- [ ] Add `getEnabledAgentIds` to agent-settings.server.ts
- [ ] Add `isAgentEnabled` to agent-settings.server.ts
- [ ] Verify TypeScript compiles: `npm run typecheck`

## Success Criteria
- Three new exported functions in agent-settings.server.ts
- All return correct defaults for shops with no settings records
- TypeScript compiles without errors
