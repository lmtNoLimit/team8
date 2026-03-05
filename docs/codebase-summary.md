# Codebase Summary - AI Store Secretary

Generated from repomix analysis on 2026-03-05.

## Project Overview

**AI Store Secretary** is a Shopify embedded app that orchestrates multiple AI agents to monitor and optimize merchant stores. Built with React Router v7, Prisma/MongoDB, and Shopify App Bridge v4 with Polaris web components.

**Tech Stack:**
- Frontend: React Router v7 + Polaris web components (s-* custom elements)
- Backend: Node.js + Express (Shopify CLI)
- Database: MongoDB (via Prisma ORM)
- AI: Claude API (claude-sonnet-4-6)
- Billing: Shopify App Subscriptions API

## Core Features

### 1. Agent System
- **6 AI Agents**: AEO, Content, Inventory, Review, Schema, Storefront agents
- Each agent implements `Agent` interface (app/lib/agent-interface.ts)
- Agents run with 30-second timeout protection
- Support for 3 trust levels: Advisor (read-only), Assistant (apply/dismiss), Autopilot (auto-execute)
- Findings stored with deduplication via unique `(shop, agentId, deduplicationKey)` constraint

### 2. Billing & Plan Tiers
- **4 Plan Tiers**: Free ($0), Starter ($29), Pro ($99), Agency ($249)
- Feature gates on:
  - Agent count (2/4/6/6)
  - Weekly run frequency (2/7/unlimited/unlimited)
  - Product catalog size (25/100/unlimited/unlimited)
  - Trust levels (advisor only / +assistant / +autopilot / +autopilot)
  - Store management (1/1/1/5+ with usage-based overage)
- Trial support: 14-day trials on paid tiers
- Subscription lifecycle: pending → active → frozen → cancelled

### 3. Storage & Retrieval
- **MongoDB Models**:
  - `Session` — Shopify OAuth sessions
  - `AgentFinding` — Agent discoveries with status tracking
  - `Review` — Product review data
  - `AgentSetting` — Per-agent trust levels and enable/disable
  - `StoreProfile` — Merchant store metadata
  - `ActivityLog` — Audit trail (agent runs, findings applied/dismissed)
  - `ShopPlan` — Current subscription tier and status
  - `ProductCount` — Cached product inventory (24-hour TTL)
  - `RunFrequencyLog` — Weekly run tracking per shop
  - `StoreAssignment` — Multi-store relationships (Agency tier)

### 4. Daily Briefing Dashboard
- Real-time findings display with priority badges
- Per-agent activity tabs
- Trust level indicators
- Agent enable/disable toggles (with plan enforcement)

## Architecture Layers

### Request Flow
```
User → Shopify App Bridge → React Router →
Authenticated Route → Service Layer → Prisma → MongoDB
```

### Key Services

**Agent Execution** (app/services/agent-executor.server.ts)
- Runs agents in parallel with 30-second timeout
- Catches errors without blocking other agents
- Increments weekly run counter via billing service

**Billing Service** (app/services/billing.server.ts)
- Core access point for plan queries and enforcement
- Functions:
  - `getShopPlan(shop)` — Initialize or fetch ShopPlan
  - `canRunAgents(shop)` — Run gate checks (subscription status, trial, product limit, weekly limit)
  - `enforcePlanLimits(shop, newTier)` — On downgrade: disable excess agents, downgrade trust levels
  - `getUsageSummary(shop)` — For UI consumption (runs used, product count, limits)
  - Multi-store management: `getManagedStores()`, `addManagedStore()`

**Billing Mutations** (app/services/billing-mutations.server.ts)
- GraphQL wrapper for Shopify Admin API subscriptions
- Functions:
  - `createSubscription()` — Initiate checkout with optional trial and usage-based pricing
  - `getSubscriptionStatus()` — Poll Shopify subscription state
  - `cancelSubscription()` — Downgrade to free
  - `createUsageRecord()` — Record extra store usage (Agency tier)

**Finding Storage** (app/services/finding-storage.server.ts)
- Upsert findings with deduplication
- Update finding status (pending → applied/dismissed)

**Activity Logging** (app/services/activity-log.server.ts)
- Audit trail: agent runs, finding actions, auto-executions

**Agent Settings** (app/services/agent-settings.server.ts)
- Per-agent trust level and enable/disable
- Plan-gated: free tier can only use "advisor"

### Configuration Layer

**Plan Config** (app/lib/plan-config.ts)
- `PLAN_LIMITS` record with tier-specific limits
- `TIER_ORDER` for progression UI
- `AGENCY_INCLUDED_STORES = 5` base store count
- `AGENCY_EXTRA_STORE_PRICE = $29/month`
- `AGENCY_USAGE_CAP = $290/month` capped overage total
- Helper: `getCurrentWeekStart()` for UTC Monday-based weeks

**AI Wrapper** (app/lib/ai.server.ts)
- `askClaude(prompt)` — Streaming responses
- `askClaudeJSON<T>(prompt)` — Structured JSON parsing

## Routing Structure

Routes discovered via `@react-router/fs-routes` (flatRoutes plugin):

**Main App Routes:**
- `/app` — Daily Briefing dashboard (app._index.tsx)
- `/app/agents` — My Team page with activity tabs (app.agents._index.tsx)
- `/app/agents/{agentId}` — Individual agent detail with breadcrumb (app.agents.$agentId.tsx)
- `/app/settings` — Store profile + trust level configuration (app.settings.tsx)
- `/app/upgrade` — Plan comparison table + current usage widget (app.upgrade.tsx)

**API Routes:**
- `POST /app/api/agents/{agentId}/run` — Execute single agent
- `POST /app/api/agents/run-all` — Execute all enabled agents in parallel
- `POST /app/api/agents/findings` — Upsert finding
- `PATCH /app/api/agents/findings/{id}/status` — Mark finding applied/dismissed
- `POST /app/api/reviews/seed` — Seed review data for testing
- `POST /app/api/billing/subscribe` — Initiate subscription checkout
- `GET /app/api/billing/callback` — Webhook callback handler

**Webhook Routes:**
- `POST /webhooks/app/subscriptions_update` — Shopify subscription state change
- `POST /webhooks/app/uninstalled` — Cleanup on app uninstall
- `POST /webhooks/app/scopes_update` — Handle permission changes

**Auth Routes:**
- `/auth/login` — Manual shop login form
- `/auth/{*}` — OAuth callback catch-all

## UI Components

All use Polaris web components (s-* custom elements):

**Finding Display:**
- `finding-card.tsx` — Individual finding with trust-level-based actions
- `findings-section.tsx` — Grouped findings by priority/status

**Billing/Plan:**
- `plan-comparison-table.tsx` — Feature matrix with select buttons
- `plan-usage-widget.tsx` — Current usage vs plan limits (runs, products, agents)
- `upgrade-banner.tsx` — CTAs for upgrade/downgrade scenarios

**Settings:**
- `agent-trust-control.tsx` — Per-agent trust level dropdown (plan-gated)
- `store-management.tsx` — Agency tier multi-store UI
- `agent-status-bar.tsx` — Enable/disable toggles per agent (plan-gated)

## File Organization

```
app/
├── agents/               # Agent implementations + registry
├── components/           # Reusable UI components
├── lib/                  # Utilities (plan config, AI wrapper, agent interface)
├── routes/               # Route handlers (pages + APIs)
├── services/             # Business logic (billing, findings, logging)
├── db.server.ts          # Prisma client instance
├── shopify.server.ts     # Shopify app configuration
├── root.tsx              # Root layout
└── routes.ts             # Route discovery config

docs/                      # Documentation (this codebase summary, guides, etc.)
plans/                     # Implementation plans and research reports
prisma/
└── schema.prisma         # Database schema
```

## Key Patterns & Constraints

### Plan Limit Enforcement
1. **On first install**: Free tier created; agents disabled beyond max (free=2)
2. **On downgrade**: `enforcePlanLimits()` called to disable agents and downgrade trust levels
3. **On agent run**: `canRunAgents()` gate checked before executor
4. **On finding action**: No gate (already-created findings can be applied/dismissed regardless of tier)

### Trust Level Progression
- **Free**: Advisor only (read-only findings)
- **Starter**: Advisor + Assistant (can apply/dismiss)
- **Pro/Agency**: All levels including Autopilot (auto-execute)

### Multi-Store (Agency Tier)
- Primary shop stores additional shop IDs in `StoreAssignment`
- Usage-based billing via `createUsageRecord()` for stores beyond 5
- Extra stores capped at $290/month total

### Subscription Lifecycle
1. User selects plan on `/app/upgrade`
2. `POST /app/api/billing/subscribe` creates subscription via `createSubscription()`
3. Shopify returns confirmation URL; browser redirects (parent window)
4. User approves billing → Shopify calls webhook `/webhooks/app/subscriptions_update`
5. Webhook handler updates `ShopPlan` tier and calls `enforcePlanLimits()`
6. App enforces new limits on next agent run or finding action

## Dependencies & Integrations

**Shopify Admin API:**
- `admin.graphql()` — Subscription mutations, product count queries

**Claude API:**
- `@anthropic-ai/sdk` — Text completion and JSON parsing
- Uses `claude-sonnet-4-6` model

**Prisma/MongoDB:**
- Connection via `DATABASE_URL` env variable
- Auto-migrations disabled; uses `prisma db push`

**Shopify App Bridge:**
- CSP headers injected via `addDocumentResponseHeaders()`
- Types from `@shopify/polaris-types`

## Development Commands

```bash
npm run dev              # Shopify CLI tunnel + HMR dev server
npm run build            # Production build
npm run start            # Serve production build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run setup            # prisma generate && prisma db push
npm run graphql-codegen  # Codegen types from Admin API schema
npx prisma studio       # Visual database browser
```

## Configuration Files

| File | Purpose |
|------|---------|
| `shopify.app.toml` | App identity, scopes, webhooks, API version |
| `shopify.web.toml` | Dev commands |
| `.graphqlrc.ts` | GraphQL codegen config |
| `vite.config.ts` | HMR setup |
| `.env` | `DATABASE_URL`, `ANTHROPIC_API_KEY` |
| `prisma/schema.prisma` | Database schema |

## Scopes & Permissions

- `write_products` — Update product tags, inventory
- `read_products` — Query product catalog
- `write_orders` — Potential future order updates
- `write_customers` — Potential future customer tagging

API version: **April26** (2024-04)

## Notes

- **MongoDB**: No migrations; changes use `prisma db push`
- **Webhooks**: Declared in `shopify.app.toml`, not registered in code
- **Server-only files**: Use `.server.ts` suffix to prevent client bundling
- **ESLint**: Configured to allow `variant` prop on unknown elements (Polaris web components)
- **`shopify` global**: Available from App Bridge; readonly in ESLint
