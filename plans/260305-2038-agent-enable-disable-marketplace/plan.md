---
status: completed
created: 2026-03-05
updated: 2026-03-05
name: agent-enable-disable-marketplace
---

# Agent Enable/Disable + Marketplace Foundation

## Summary
Add per-shop agent enable/disable to reduce noise. `AgentSetting` model and settings page already exist with trust levels — extend them with enable/disable toggle + enforce across app.

## Current State (post-codebase review)
- `AgentSetting` model: EXISTS with `enabled` Boolean field (default true)
- `agent-settings.server.ts`: EXISTS but only has trust level CRUD — **missing** enable/disable functions
- `app.settings.tsx`: EXISTS with trust level controls — **missing** enable/disable toggle
- `app.agents._index.tsx`: NEW page (not in original plan) lists all agents with stats
- Nav: simplified to "My Team" + "Settings" (no per-agent nav links)
- `app._index.tsx`: dashboard shows all findings unfiltered
- `run-all.tsx`: runs ALL agents regardless of enabled state
- `app.agents.$agentId.tsx`: no guard for disabled agents
- `app.api.agents.$agentId.run.tsx`: no guard for disabled agents

## Phases (Revised)

| # | Phase | Status | Est. | Notes |
|---|-------|--------|------|-------|
| 1 | Service Layer: enable/disable functions | completed | 2h | Extend existing `agent-settings.server.ts` |
| 2 | Settings UI: add enable/disable toggle | completed | 2h | Extend existing `app.settings.tsx` |
| 3 | Filter: dashboard + agents list + run-all | completed | 3h | Filter findings + agents by enabled |
| 4 | Guards: agent detail + run endpoints | completed | 1h | 403 for disabled agents |

Total: ~1 day (reduced from 2 — DB schema already done)

## Key Decisions
- Reuse existing `AgentSetting` model (already has `enabled` field)
- Extend `agent-settings.server.ts` (don't create new service file)
- Add toggle to existing settings page (alongside trust levels)
- No per-agent nav links needed (current "My Team" hub pattern is better)
- Default: all agents enabled (backward compatible, existing `@default(true)`)

## Files to Modify
- `app/services/agent-settings.server.ts` — add enable/disable CRUD
- `app/routes/app.settings.tsx` — add enable/disable toggle per agent
- `app/routes/app._index.tsx` — filter findings by enabled agents
- `app/routes/app.agents._index.tsx` — show enabled/disabled state, filter
- `app/routes/app.api.agents.run-all.tsx` — only run enabled agents
- `app/routes/app.agents.$agentId.tsx` — guard: 404 if disabled
- `app/routes/app.api.agents.$agentId.run.tsx` — guard: 403 if disabled

## Files NOT Needed (removed from plan)
- ~~`prisma/schema.prisma`~~ — `AgentSetting.enabled` already exists
- ~~`app/services/shop-agent-config.server.ts`~~ — use existing `agent-settings.server.ts`
- ~~`app/routes/app.settings.tsx`~~ — already exists
- ~~`app/routes/app.tsx`~~ — nav already simplified, no change needed
- ~~`app/components/agent-status-bar.tsx`~~ — no longer used in dashboard
