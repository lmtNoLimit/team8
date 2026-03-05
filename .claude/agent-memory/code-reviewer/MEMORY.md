# Code Reviewer Memory

## Project: AI Store Secretary (team8)

### Architecture
- Shopify embedded app: React Router v7 + Prisma/MongoDB + App Bridge v4 + Polaris web components
- Flat file-system routes via `@react-router/fs-routes`
- Server-only files use `.server.ts` suffix
- Agent system: 6 agents (aeo, content, schema, inventory, storefront, review)
- Agent interface is LOCKED (`app/lib/agent-interface.ts`)

### Key Patterns
- `authenticate.admin(request)` required in every protected route
- Polaris: `s-*` web components only, never raw HTML or `@shopify/polaris` React imports
- GraphQL: `admin.graphql()` from authenticated session
- Forms: `useFetcher()` with hidden `_action` field for multiple actions per route
- Badge tones: info | critical | warning | neutral | success | caution

### Billing System (added 2026-03-05)
- 4 tiers: free/starter/pro/agency
- `ShopPlan` model stores tier + subscription state
- `billing.server.ts` is the core service (needs modularization -- 317 lines)
- `billing-mutations.server.ts` handles GraphQL mutations
- RT-2 pattern: increment run count before execute, decrement on failure
- RT-1 pattern: store tier in DB during subscribe, read from DB in callback

### Known Issues to Watch For
- `getEnabledAgentIds` defaults unregistered agents to enabled (`?? true`)
- Shopify callback returns `charge_id` (numeric) vs GID format mismatch
- `syncProductCount` must be called explicitly (no auto-refresh)
- "pending" subscription status passes through `canRunAgents` gate

### Build Commands
- `npm run typecheck` -- react-router typegen + tsc --noEmit
- `npm run lint` -- ESLint with cache
- 12 pre-existing lint errors (unused vars in agent stubs)
