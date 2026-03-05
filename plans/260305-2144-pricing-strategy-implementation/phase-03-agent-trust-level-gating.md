# Phase 3: Agent Trust Level Gating

## Context Links

- [Plan Overview](plan.md)
- [Phase 1: DB Schema + Plan Service](phase-01-db-schema-and-plan-service.md)
- [Phase 2: Shopify Billing Integration](phase-02-shopify-billing-integration.md)
- Agent settings service: `app/services/agent-settings.server.ts`
- Agent registry: `app/agents/agent-registry.server.ts`
- Settings page: `app/routes/app.settings.tsx`
- Agents list page: `app/routes/app.agents._index.tsx`
- Agent detail page: `app/routes/app.agents.$agentId.tsx`
- Plan config: `app/lib/plan-config.ts` (created in Phase 1)
- Billing service: `app/services/billing.server.ts` (created in Phase 1)

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 5h
- **Depends on:** Phase 1 (plan service), Phase 2 (billing webhook for downgrades)
- **Description:** Enforce plan-based restrictions on agent count, trust levels, and agent selection. Show locked states in UI. Auto-downgrade trust levels on plan downgrade.

## Key Insights

- Free: 2 agents (user picks which), Advisor only
- Starter: 4 agents, Advisor + Assistant
- Pro/Agency: All 6 agents, all trust levels
- Enforcement must happen server-side (service layer) AND reflected in UI (disabled controls)
- On plan downgrade: excess agents auto-disabled, trust levels auto-downgraded to plan max
- Current `toggleAgentEnabled` and `updateAgentTrustLevel` have no plan checks -- need to add guards
- Settings page (`app.settings.tsx`) is 257 lines -- close to 200 limit. Extract AgentTrustControl into component file.

## Requirements

### Functional
1. `toggleAgentEnabled` rejects enabling if enabled count >= plan's `maxAgents`
2. `updateAgentTrustLevel` rejects levels not in plan's `allowedTrustLevels`
3. `getAgentSettings()` enriched with plan restriction info for UI rendering
4. On plan downgrade (webhook-triggered), auto-disable excess agents + downgrade trust levels
5. Settings page: disabled trust level radio buttons with "Upgrade to unlock" tooltip
6. Agents list page: locked badge on agents that can't be enabled
7. Run routes: only execute agents within plan's agent limit (already gated in Phase 1, but double-check)

### Non-Functional
- Plan check adds 1 DB query (ShopPlan) per settings mutation; acceptable latency
- Auto-downgrade is eventually consistent (webhook-driven, not synchronous)
- UI restrictions are cosmetic hints; server enforces real limits

## Architecture

```
Service Layer Enforcement:

  toggleAgentEnabled(shop, agentId, true)
    -> getShopPlan(shop) -> tier
    -> getPlanLimits(tier) -> maxAgents
    -> count currently enabled agents
    -> if count >= maxAgents: throw PlanLimitError
    -> else: upsert as before

  updateAgentTrustLevel(shop, agentId, "autopilot")
    -> getShopPlan(shop) -> tier
    -> getPlanLimits(tier) -> allowedTrustLevels
    -> if "autopilot" not in allowedTrustLevels: throw PlanLimitError
    -> else: upsert as before

Auto-Downgrade Flow (on subscription cancel/freeze):
  webhooks.app.subscriptions_update
    -> updateShopPlan(shop, { tier: "free" })
    -> enforcePlanLimits(shop, "free")
       -> disable agents exceeding maxAgents (keep first N enabled by creation order)
       -> downgrade trust levels exceeding allowedTrustLevels to max allowed

UI Restriction Flow:
  Settings page loader:
    -> getAgentSettings(shop)
    -> getShopPlan(shop) -> tier -> limits
    -> Return { agents, planLimits, currentTier }
    -> Render: disabled controls for locked features + "Upgrade" link
```

## Related Code Files

### Files to Create
- `app/components/agent-trust-control.tsx` — extracted from settings page (~90 lines)

### Files to Modify
- `app/services/agent-settings.server.ts` — add plan-aware guards to toggle + trust level
- `app/services/billing.server.ts` — add `enforcePlanLimits()` function
- `app/routes/app.settings.tsx` — pass plan info to UI, show restrictions, extract component
- `app/routes/app.agents._index.tsx` — show locked badges, disable run for locked agents
- `app/routes/webhooks.app.subscriptions_update.tsx` — call enforcePlanLimits on downgrade

### Files NOT Modified
- `app/agents/agent-registry.server.ts` — read-only, no changes needed

**Note (RT-3):** Phase 1 run routes must also enforce agent count at execution time (slice enabledIds to maxAgents). This is tracked in Phase 1's red team fixes.

## Implementation Steps

### Step 1: Create PlanLimitError Class

Add to `app/lib/plan-config.ts`:

```typescript
export class PlanLimitError extends Error {
  public upgradeUrl = "/app/upgrade";
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}
```

### Step 2: Add Plan Guards to Agent Settings Service

Update `app/services/agent-settings.server.ts`:

```typescript
import { getShopPlan } from "./billing.server";
import { getPlanLimits, PlanLimitError, type PlanTier } from "../lib/plan-config";

export async function toggleAgentEnabled(
  shop: string,
  agentId: string,
  enabled: boolean,
) {
  // Only check limits when enabling
  if (enabled) {
    const plan = await getShopPlan(shop);
    const limits = getPlanLimits(plan.tier as PlanTier);
    const currentlyEnabled = await getEnabledAgentIds(shop);
    // Don't count this agent if it's already in the list
    const otherEnabled = currentlyEnabled.filter((id) => id !== agentId);
    if (otherEnabled.length >= limits.maxAgents) {
      throw new PlanLimitError(
        `Your ${plan.tier} plan allows ${limits.maxAgents} agents. Upgrade to enable more.`,
      );
    }
  }

  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { enabled },
    create: { shop, agentId, enabled },
  });
}

export async function updateAgentTrustLevel(
  shop: string,
  agentId: string,
  trustLevel: TrustLevel,
) {
  const plan = await getShopPlan(shop);
  const limits = getPlanLimits(plan.tier as PlanTier);
  if (!limits.allowedTrustLevels.includes(trustLevel)) {
    throw new PlanLimitError(
      `${trustLevel} mode requires ${trustLevel === "autopilot" ? "Pro" : "Starter"} plan or higher.`,
    );
  }

  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { trustLevel },
    create: { shop, agentId, trustLevel },
  });
}
```

### Step 3: Add enforcePlanLimits to Billing Service

Add to `app/services/billing.server.ts`:

```typescript
import { getEnabledAgentIds } from "./agent-settings.server";

/**
 * Called after plan downgrade. Disables excess agents and
 * downgrades trust levels beyond what the new plan allows.
 */
export async function enforcePlanLimits(
  shop: string,
  newTier: PlanTier,
): Promise<void> {
  const limits = getPlanLimits(newTier);
  const enabledIds = await getEnabledAgentIds(shop);

  // Disable excess agents (keep first N by DB order)
  if (enabledIds.length > limits.maxAgents) {
    const toDisable = enabledIds.slice(limits.maxAgents);
    await Promise.all(
      toDisable.map((agentId) =>
        prisma.agentSetting.updateMany({
          where: { shop, agentId },
          data: { enabled: false },
        }),
      ),
    );
  }

  // Downgrade trust levels beyond allowed
  const maxAllowed = limits.allowedTrustLevels[limits.allowedTrustLevels.length - 1];
  const TRUST_ORDER = ["advisor", "assistant", "autopilot"];
  const maxIndex = TRUST_ORDER.indexOf(maxAllowed);

  const allSettings = await prisma.agentSetting.findMany({
    where: { shop },
  });

  for (const setting of allSettings) {
    const settingIndex = TRUST_ORDER.indexOf(setting.trustLevel);
    if (settingIndex > maxIndex) {
      await prisma.agentSetting.update({
        where: { id: setting.id },
        data: { trustLevel: maxAllowed },
      });
    }
  }
}
```

### Step 4: Call enforcePlanLimits from Webhook

Update `app/routes/webhooks.app.subscriptions_update.tsx` -- after setting tier to "free" on cancel:

```typescript
import { enforcePlanLimits } from "../services/billing.server";

// Inside the handler, after updateShopPlan for cancel/expired:
if (status === "cancelled" || status === "expired") {
  // ... existing updateShopPlan call ...
  await enforcePlanLimits(shop, "free");
}
```

### Step 5: Update Settings Page Actions

Update the action handlers in `app/routes/app.settings.tsx` to catch PlanLimitError:

```typescript
import { PlanLimitError } from "../lib/plan-config";

// In the toggle_enabled action handler:
if (actionType === "toggle_enabled") {
  const agentId = formData.get("agentId") as string;
  if (!agentId || !getAgent(agentId)) {
    return data({ success: false, error: "Invalid agentId" }, { status: 400 });
  }
  const enabled = formData.get("enabled") === "true";
  try {
    await toggleAgentEnabled(session.shop, agentId, enabled);
    return data({ success: true, action: "toggle_enabled", agentId });
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return data({ success: false, error: error.message, upgrade: true }, { status: 403 });
    }
    throw error;
  }
}

// Same pattern for update_trust_level handler
```

### Step 6: Update Settings Page Loader

Add plan info to loader:

```typescript
import { getShopPlan } from "../services/billing.server";
import { getPlanLimits, type PlanTier } from "../lib/plan-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [profile, agentSettings, plan] = await Promise.all([
    getStoreProfile(session.shop),
    getAgentSettings(session.shop),
    getShopPlan(session.shop),
  ]);
  const planLimits = getPlanLimits(plan.tier as PlanTier);
  const enabledCount = agentSettings.filter((a) => a.enabled).length;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return {
    profile,
    agentSettings,
    hasAnthropicKey,
    currentTier: plan.tier,
    planLimits,
    enabledCount,
  };
};
```

### Step 7: Extract AgentTrustControl Component

Extract `AgentTrustControl` from `app/routes/app.settings.tsx` into `app/components/agent-trust-control.tsx`. Add plan restriction props:

```typescript
// app/components/agent-trust-control.tsx
interface AgentTrustControlProps {
  agent: { agentId: string; displayName: string; description: string; trustLevel: TrustLevel; enabled: boolean };
  allowedTrustLevels: TrustLevel[];
  canEnable: boolean; // false when agent limit reached and this agent is disabled
  currentTier: string;
}
```

In the component:
- Disable the checkbox when `!canEnable && !agent.enabled`
- Show "(Upgrade)" suffix next to trust levels not in `allowedTrustLevels`
- Disable s-choice for locked trust levels
- Add "Upgrade to unlock" link when hitting limits

### Step 8: Update Agents List Page

Add plan info to `app/routes/app.agents._index.tsx` loader:

```typescript
const plan = await getShopPlan(session.shop);
const planLimits = getPlanLimits(plan.tier as PlanTier);
return { agents: agentsWithStats, activityLog, currentTier: plan.tier, planLimits };
```

In the AgentCard component:
- Show `<s-badge tone="warning">Plan Limit</s-badge>` next to agents that are disabled due to plan limit
- Disable "Run" button for agents not in the plan's allowed count

## Todo List

- [x] Add `PlanLimitError` class to `app/lib/plan-config.ts`
- [x] Update `toggleAgentEnabled()` with plan limit check
- [x] Update `updateAgentTrustLevel()` with trust level check
- [x] Add `enforcePlanLimits()` to `app/services/billing.server.ts`
- [x] Update webhook handler to call `enforcePlanLimits` on downgrade
- [x] Update settings page action handlers to catch `PlanLimitError`
- [x] Update settings page loader to include plan info
- [x] Extract `AgentTrustControl` component with plan restriction props
- [x] Update agents list page to show locked badges
- [x] Run `npm run typecheck`
- [x] Test: free tier can only enable 2 agents
- [x] Test: free tier rejects Assistant/Autopilot trust levels
- [x] Test: downgrade from Pro to Free auto-disables excess agents

## Success Criteria

- Free tier: can enable max 2 agents, only Advisor level
- Starter tier: can enable max 4 agents, Advisor + Assistant
- Pro/Agency: all agents, all levels
- Attempting to exceed limits returns 403 with `PlanLimitError` message
- Settings page visually shows locked/disabled states
- Agents list page shows locked badges
- Plan downgrade auto-enforces new limits within webhook handler
- No TypeScript errors
- Settings page stays under 200 lines after extraction

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular import (billing <-> agent-settings) | High | billing.server imports agent-settings functions; agent-settings imports billing types only via plan-config.ts |
| Race condition: user toggles while downgrade webhook fires | Low | Both paths converge on correct state (server enforces limits) |
| User confusion on auto-downgrade | Medium | Log activity ("Plan downgraded, 2 agents disabled") + show banner on next load |
| Settings page component extraction breaks forms | Low | useFetcher forms work identically in extracted components |

### Circular Import Prevention

The dependency chain is one-directional:
```
plan-config.ts (types + constants, no DB imports)
  <- billing.server.ts (imports plan-config, imports db.server, imports agent-settings)
  <- agent-settings.server.ts (imports plan-config, imports billing.server for getShopPlan only)
```

Wait -- this IS circular. Fix: have agent-settings.server.ts import `getShopPlan` from billing.server.ts, and billing.server.ts import from agent-settings.server.ts. Both import each other.

**Resolution:** Move `getShopPlan` and `getPlanLimits` calls into a thin wrapper that agent-settings calls, or have agent-settings accept plan as a parameter. Better approach: **pass plan limits as a parameter to the guard functions** rather than importing billing.server.ts:

```typescript
// agent-settings.server.ts -- no billing import needed
export async function toggleAgentEnabled(
  shop: string,
  agentId: string,
  enabled: boolean,
  planLimits?: PlanLimits, // optional, caller provides
) {
```

Then in the route action, the caller fetches plan and passes limits. This breaks the cycle.

**Even simpler:** `enforcePlanLimits` in billing.server.ts uses prisma directly (not importing getEnabledAgentIds), just querying `agentSetting.findMany({ where: { shop, enabled: true } })`. This removes the billing -> agent-settings import entirely.

## Security Considerations

- All plan checks happen server-side; UI hints are cosmetic only
- Plan tier loaded from DB, not from client request
- `PlanLimitError` returns 403 (not 500) to differentiate from server errors
- Webhook handler authenticated via HMAC -- cannot be spoofed to trigger downgrades
- Auto-downgrade preserves user data (disabled, not deleted)

## Next Steps

- Phase 4 uses restriction info from this phase to render upgrade prompts
- Phase 5 extends gating with store assignment limits for agency tier
