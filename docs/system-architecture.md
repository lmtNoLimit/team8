# System Architecture - AI Store Secretary

## High-Level Overview

AI Store Secretary orchestrates a team of AI agents that monitor and optimize Shopify stores. The system is built as a Shopify embedded app with a clear separation between agent execution, billing/entitlement, and UI presentation.

```
┌─────────────────────────────────────────────────────────────┐
│                    Shopify Merchant Store                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         Shopify Admin UI (embedded app frame)               │
│  ┌─────────────────────────────────────────────────────────┐
│  │    React Router App (Daily Briefing Dashboard)          │
│  │  - Findings display                                     │
│  │  - Agent control panel                                  │
│  │  - Settings & upgrade flows                            │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │  Backend Server │
                  └─────────────────┘
                    /       |       \
    ┌──────────────────┬────────────┬──────────────────┐
    ↓                  ↓            ↓                  ↓
┌────────────┐   ┌──────────┐ ┌────────────┐   ┌──────────┐
│   Agents   │   │ Billing  │ │  Findings  │   │Shopify   │
│(Claude API)│   │  Gates   │ │  Storage   │   │Admin API │
└────────────┘   └──────────┘ └────────────┘   └──────────┘
    ↓                  ↓            ↓                  ↓
            ┌──────────────────────────────────┐
            │    MongoDB Database              │
            │  (Findings, Plans, Settings)     │
            └──────────────────────────────────┘
```

## Core Subsystems

### 1. Agent Execution System

**Location:** `app/agents/`, `app/services/agent-executor.server.ts`

**Flow:**
1. User clicks "Run All" or scheduler triggers agent run
2. `AgentExecutor.execute()` called with enabled agents
3. Each agent runs in parallel with 30-second timeout:
   - Agent queries store data via GraphQL
   - Agent calls Claude API for analysis
   - Agent returns `AgentFindingInput[]`
4. Findings upserted to database
5. Activity logged
6. Weekly run counter incremented

**Constraints:**
- Plan limit enforcement via `canRunAgents()` gate
- Product count check before run (cached 24-hour TTL)
- Subscription status check (frozen/cancelled blocks execution)
- Trial expiry check (only blocks non-paying tiers)
- Weekly run frequency limit enforcement

**6 Agent Registry:**
1. **AEO Agent** — Conversion rate optimization via A/B tests
2. **Content Agent** — Product description quality analysis
3. **Inventory Agent** — Stock level optimization
4. **Review Agent** — Customer feedback sentiment analysis
5. **Schema Agent** — Structured data markup audits
6. **Storefront Agent** — UX/performance audits

### 2. Billing & Entitlement System

**Location:** `app/services/billing.server.ts`, `app/services/billing-mutations.server.ts`, `app/lib/plan-config.ts`

**Plan Tiers:**

| Tier | Price | Agents | Weekly Runs | Products | Trust Levels | Stores |
|------|-------|--------|------------|----------|--------------|--------|
| Free | $0 | 2 | 2 | 25 | Advisor | 1 |
| Starter | $29 | 4 | 7 | 100 | Advisor + Assistant | 1 |
| Pro | $99 | 6 | Unlimited | Unlimited | All | 1 |
| Agency | $249 | 6 | Unlimited | Unlimited | All | 5+ |

**Feature Gates:**

```
1. Agent Count Limit
   - Free: first 2 agents
   - Starter: first 4 agents
   - Pro/Agency: all 6 agents

2. Weekly Run Frequency
   - Free: 2 runs/week
   - Starter: 7 runs/week
   - Pro/Agency: unlimited

3. Product Catalog Size
   - Free: 25 products max
   - Starter: 100 products max
   - Pro/Agency: unlimited

4. Trust Level Availability
   - Free: Advisor only (read-only)
   - Starter: Advisor + Assistant
   - Pro/Agency: Advisor + Assistant + Autopilot

5. Store Management (Agency)
   - Free/Starter/Pro: 1 store
   - Agency: 5 included + usage-based overage
     - Extra stores at $29/month each
     - Capped at $290/month total
```

**Enforcement Points:**

1. **On app install** → Create free tier ShopPlan, disable agents beyond limit
2. **On subscription change** → Update tier, call `enforcePlanLimits()`
3. **Before agent run** → `canRunAgents()` gate check
4. **Before setting trust level** → Validate against plan's `allowedTrustLevels`
5. **On downgrade** → Disable excess agents, downgrade trust levels to allowed

### 3. Finding Storage & Status Management

**Location:** `app/services/finding-storage.server.ts`

**Lifecycle:**
1. Agent produces finding → upserted with `deduplicationKey`
2. Finding displayed in UI with trust-level-based actions
3. User applies/dismisses → status updated
4. Activity logged
5. Finding persists (even if dismissed) for historical audit

**Status Tracking:**
- `pending` — New, awaiting user action
- `applied` — User accepted (or autopilot executed)
- `dismissed` — User rejected

**Deduplication:**
- Unique constraint: `(shop, agentId, deduplicationKey)`
- Same finding from same agent is upserted (no duplicates)
- Allows agents to re-discover same issues across runs

### 4. Activity Logging

**Location:** `app/services/activity-log.server.ts`

**Logged Events:**
- `agent_run` — Agent executed
- `agent_auto_executed` — Autopilot trust level triggered action
- `finding_applied` — User or autopilot applied finding
- `finding_dismissed` — User dismissed finding

**Use Cases:**
- Audit trail for compliance
- Historical context in UI
- Debug agent behavior

### 5. Shopify Billing Integration

**Location:** `app/services/billing-mutations.server.ts`

**Flow:**
1. User selects plan on `/app/upgrade`
2. `POST /app/api/billing/subscribe` → `createSubscription()`
3. Creates Shopify AppSubscription with:
   - Recurring line item (base price)
   - Usage-based line item (Agency overage, optional)
   - Optional trial days
4. Returns confirmation URL
5. User approves in Shopify → webhook sent
6. `POST /webhooks/app/subscriptions_update`:
   - Parse subscription state
   - Update ShopPlan tier
   - Call `enforcePlanLimits()` if downgrade
7. App enforces new limits immediately

**Webhook Handling:**
```javascript
webhook: app_subscriptions/update
→ extract subscription ID and status
→ update ShopPlan record
→ if tier changed: enforce limits
→ return 200 OK
```

### 6. Multi-Store Management (Agency)

**Location:** `app/services/billing.server.ts` (agency functions)

**Use Case:** Agency tier allows managing multiple stores from primary shop

**Flow:**
1. Agency customer authenticates primary shop
2. Adds secondary shops via `addManagedStore(primaryShop, managedShop)`
3. `StoreAssignment` record created
4. Each managed shop gets assigned agents from primary shop's configuration
5. Usage tracked separately per shop
6. Extra stores (beyond 5) incur $29/month overage

**Constraints:**
- Only Agency tier can add managed stores
- Max 5 included; others charge usage-based
- Cap overage at $290/month

## Data Model

### Core Entities

**ShopPlan** — Subscription state per shop
```
shop: string (unique)
tier: "free" | "starter" | "pro" | "agency"
shopifySubscriptionId: string? (null for free tier)
subscriptionStatus: "active" | "pending" | "frozen" | "cancelled"
trialEndsAt: DateTime?
currentPeriodEnd: DateTime?
```

**AgentFinding** — Discovery from agent run
```
shop: string
agentId: string
type: "done" | "action_needed" | "insight"
priority: 1-5
title: string
description: string
action: string?
status: "pending" | "applied" | "dismissed"
deduplicationKey: string? (unique per agent/shop)
createdAt: DateTime
updatedAt: DateTime
```

**AgentSetting** — Per-agent configuration
```
shop: string
agentId: string
trustLevel: "advisor" | "assistant" | "autopilot"
enabled: boolean (false = disabled by plan limit)
createdAt: DateTime
```

**ProductCount** — Cached product inventory
```
shop: string (unique)
count: int
syncedAt: DateTime (24-hour TTL)
```

**RunFrequencyLog** — Weekly run tracking
```
shop: string
weekStart: DateTime (Monday 00:00 UTC)
runCount: int (incremented per agent run)
```

**StoreAssignment** — Multi-store relationships
```
primaryShop: string
managedShop: string
addedAt: DateTime
```

**ActivityLog** — Audit trail
```
shop: string
type: "agent_run" | "finding_applied" | "finding_dismissed" | "agent_auto_executed"
agentId: string?
message: string
metadata: JSON?
createdAt: DateTime
```

**Session** — Shopify OAuth sessions
**Review** — Product review data
**StoreProfile** — Merchant metadata

## Request Flow Examples

### Example 1: User Runs All Agents

```
User clicks "Run All" on Daily Briefing
                ↓
POST /app/api/agents/run-all (authenticated)
                ↓
authenticate.admin(request) → session
                ↓
canRunAgents(shop) → check plan limits
                ↓
  ├─ subscription status? (not frozen/cancelled)
  ├─ trial expired? (only for non-paying)
  ├─ product count within limit?
  └─ weekly runs within limit?
                ↓
AgentExecutor.execute(enabledAgents) → parallel
                ↓
  ├─ AEO agent → Claude API → findings
  ├─ Content agent → Claude API → findings
  ├─ Inventory agent → Claude API → findings
  ├─ Review agent → Claude API → findings
  ├─ Schema agent → Claude API → findings
  └─ Storefront agent → Claude API → findings
                ↓
Upsert findings → MongoDB
                ↓
incrementRunCount(shop) → RunFrequencyLog
                ↓
logActivity(shop, "agent_run", findings) → ActivityLog
                ↓
Return 200 + findings to UI
                ↓
UI displays findings with trust-level buttons
```

### Example 2: User Upgrades to Pro

```
User selects Pro plan on /app/upgrade
                ↓
POST /app/api/billing/subscribe { tier: "pro" }
                ↓
createSubscription(admin, { planName: "Pro", price: 99, returnUrl: "..." })
                ↓
Shopify AppSubscription GraphQL mutation
                ↓
Returns confirmationUrl → browser redirects
                ↓
User approves in Shopify → payment processed
                ↓
Shopify sends POST /webhooks/app/subscriptions_update
                ↓
Parse webhook payload → extract subscription ID & status
                ↓
updateShopPlan(shop, { tier: "pro", subscriptionStatus: "active" })
                ↓
enforcePlanLimits(shop, "pro")
  ├─ Re-enable agents 3-6 (if disabled)
  ├─ Upgrade trust levels to allowed (add assistant + autopilot options)
  └─ Clear run frequency cap (unlimited for pro)
                ↓
Return 200 OK to Shopify
                ↓
Next agent run uses new limits
```

### Example 3: User Downgrades to Free

```
User clicks "Downgrade to Free" on settings
                ↓
POST /app/api/billing/subscribe { _action: "cancel" }
                ↓
cancelSubscription(admin, subscriptionId)
                ↓
Shopify cancels subscription
                ↓
Shopify sends POST /webhooks/app/subscriptions_update
                ↓
Parse webhook payload → status = "cancelled"
                ↓
downgradeToFree(shop)
                ↓
updateShopPlan(shop, {
  tier: "free",
  shopifySubscriptionId: null,
  trialEndsAt: null,
  currentPeriodEnd: null
})
                ↓
enforcePlanLimits(shop, "free")
  ├─ Disable agents 3+ (keep first 2)
  ├─ Downgrade all trust levels to "advisor"
  └─ Reset run frequency cap to 2/week
                ↓
Return 200 OK
                ↓
Next agent run enforces 2/week limit + advisor-only mode
```

## Trust Level Behaviors

### Advisor (Free/Starter baseline)
- Finding displayed read-only
- No action buttons
- User can dismiss/apply via right-click context menu (future)
- No automation

### Assistant (Starter+)
- Finding displayed with "Apply" and "Dismiss" buttons
- User manually approves before action
- Action executed on confirmation (e.g., add product tag)
- Activity logged

### Autopilot (Pro/Agency)
- Finding displayed with checkmark (auto-executed)
- No user interaction required
- Action automatically executed within 5 seconds of finding creation
- Finding appears in "Handled" section
- Activity logged as `agent_auto_executed`

## Security & Compliance

**Authentication:**
- Shopify OAuth via `@shopify/shopify-app-react-router`
- Session stored in MongoDB
- Every protected route checks `authenticate.admin(request)`

**Data Isolation:**
- All queries filtered by `shop` field
- No cross-shop data visibility

**Billing Compliance:**
- Subscription state verified before action
- Trial expiry enforced
- Usage capped and invoiced accurately

**CSP Headers:**
- Injected via `addDocumentResponseHeaders()` in entry.server.tsx
- Restricts frame embedding and API calls

## Performance Optimization

**Agent Execution:**
- Parallel execution (6 agents simultaneously)
- 30-second timeout per agent
- Fail-safe: one agent error doesn't block others

**Database Queries:**
- Indexes on frequently queried fields:
  - `AgentFinding`: (shop, agentId), (shop, type, status), createdAt
  - `ActivityLog`: (shop, createdAt), (shop, agentId)
  - `RunFrequencyLog`: (shop)
- Caching: ProductCount cached 24 hours

**UI Rendering:**
- Findings paginated (20 per page, future)
- Activity logs paginated (50 per page)
- Lazy loading agent details on demand

## Extensibility

**To add a new agent:**
1. Create `app/agents/{name}-agent/{name}-agent.server.ts`
2. Implement `Agent` interface (return `AgentFindingInput[]`)
3. Import and register in `app/agents/agent-registry.server.ts`
4. Add UI label in components using `AGENT_LABELS`
5. Agents automatically included in "Run All"

**To add a new finding type:**
1. Update `AgentFinding.type` enum in schema
2. Update UI components for new type display
3. Update activity log labels

**To add a new trust level:**
1. Update `TrustLevel` type in `plan-config.ts`
2. Add to `TRUST_ORDER` in `billing.server.ts`
3. Update UI components to display new level
4. Update plan limits to allow/disallow

**To add a new plan tier:**
1. Add to `PlanTier` type in `plan-config.ts`
2. Add entry to `PLAN_LIMITS` record
3. Update `TIER_ORDER` for progression
4. Add pricing to `createSubscription()` call
5. Update UI plan comparison table

## Deployment & Configuration

**Environment Variables:**
- `DATABASE_URL` — MongoDB connection string
- `ANTHROPIC_API_KEY` — Claude API key
- `NODE_ENV` — production vs development (affects Shopify billing mode)

**Shopify App Config:**
- `shopify.app.toml` — App identity, scopes, webhooks, API version
- `shopify.web.toml` — Dev server commands

**Database:**
- MongoDB Atlas (cloud-hosted)
- No migrations; use `prisma db push`

**Deployment:**
- Shopify CLI tunnel for local dev
- Production: Heroku, Vercel, or custom hosting
- All requests must go through Shopify OAuth middleware
