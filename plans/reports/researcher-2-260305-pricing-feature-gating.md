# Feature Gating Architecture Research — Pricing Tier Enforcement
**Researcher:** researcher-2 | **Date:** 2026-03-05 | **Status:** Complete

---

## Executive Summary

Implemented feature gating enforces pricing tier limits across 4 dimensions: **product count**, **agent availability**, **run frequency**, **trust level access**. Architecture uses layered enforcement (DB schema + middleware + service layer) with graceful degradation UX. Multi-store (Agency tier) uses single shared DB with tenant_id field (MongoDB all-in-one model). Total implementation scope: 3-5 new DB models, 4-6 service layer functions, 2-3 middleware checks, UI updates in settings & run pages.

---

## Tier Limits (from PRD)

| Dimension | Free | Starter | Pro | Agency |
|-----------|------|---------|-----|--------|
| **Products** | 25 | 100 | Unlimited | Unlimited |
| **Agents** | 2 (user picks) | 4 | 6 (all) | 6 (all) |
| **Runs/Week** | 2 | Daily (14+) | Unlimited | Unlimited |
| **Trust Levels** | Advisor only | Advisor+Assistant | All (incl. Autopilot) | All |
| **Stores** | 1 | 1 | 1 | 5 base (+$29/ea) |

---

## 1. Database Schema Design

### Current State
- **AgentSetting:** shop, agentId, trustLevel, enabled (controls per-agent config)
- **Session:** Shopify session storage (no pricing/plan data)
- **AgentFinding, Review, StoreProfile, ActivityLog:** Existing domain models

### New Models Needed

#### 1.1 ShopPlan (Subscription & Entitlements)
```prisma
model ShopPlan {
  id                 String   @id @default(auto()) @map("_id") @db.ObjectId
  shop               String   @unique
  planTier           String   // "free", "starter", "pro", "agency"

  // Billing metadata
  shopifyPlanId      String?  // from AppSubscription.id (if recurring)
  shopifyChargeId    String?  // from AppSubscription or charge
  status             String   @default("pending") // "pending", "active", "cancelled"

  // Entitlements (cached from tier)
  maxProducts        Int      // 25, 100, null (unlimited)
  maxAgents          Int      // 2, 4, 6, 6
  maxRunsPerWeek     Int?     // 2, 14+, null (unlimited)
  allowedTrustLevels String[] // ["advisor"], ["advisor","assistant"], ["advisor","assistant","autopilot"]
  maxStores          Int      // 1 for free/starter/pro, 5+ for agency

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  cancelledAt        DateTime?

  @@index([shop])
  @@index([planTier])
}
```

#### 1.2 ProductCount (Cached Product Inventory)
MongoDB doesn't have triggers; cache product count locally with TTL.
```prisma
model ProductCount {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  shop          String   @unique
  count         Int

  lastSyncedAt  DateTime
  syncError     String?  // if sync failed

  @@index([shop])
}
```

#### 1.3 RunFrequencyLog (Track Agent Runs)
Rate-limit enforcement for "runs per week".
```prisma
model RunFrequencyLog {
  id       String   @id @default(auto()) @map("_id") @db.ObjectId
  shop     String
  runDate  DateTime // truncated to day-of-week boundary

  @@unique([shop, runDate])
  @@index([shop, runDate])
}
```

#### 1.4 AgentEntitlementOverride (Optional: Override per-agent access)
Advanced feature for future (Pro+ merchants wanting to customize agent availability).
```prisma
model AgentEntitlementOverride {
  id       String   @id @default(auto()) @map("_id") @db.ObjectId
  shop     String
  agentId  String

  // Override entitlement (e.g., deny "inventory-agent" for Free tier even if plan allows)
  allowedTrustLevels String[] // [] = disabled, ["advisor"] = downgrade, null = plan default

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([shop, agentId])
}
```

#### 1.5 StoreAssignment (Multi-Store / Agency Only)
For Agency tier merchants managing 5+ stores.
```prisma
model StoreAssignment {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId

  // Which merchant account owns which stores
  ownerShop     String   // the "primary" agency store that paid
  assignedShop  String   // a secondary store (tenant_id in multi-tenant sense)

  // Metadata
  storeName     String?
  createdAt     DateTime @default(now())

  @@unique([ownerShop, assignedShop])
  @@index([ownerShop])
  @@index([assignedShop])
}
```

### Schema Change Rationale
- **ShopPlan:** Centralized entitlements tied to Shopify billing; cached at row level for O(1) enforcement
- **ProductCount:** Local cache avoids hitting Shopify API on every run check
- **RunFrequencyLog:** Lightweight rate-limit tracking; delete stale entries weekly
- **AgentEntitlementOverride:** Future-proofing; starts empty; enables fine-grained control
- **StoreAssignment:** Agency multi-store support; enforces 1-way mapping (one primary owner, many assigned)

---

## 2. Where to Enforce Limits

### Enforcement Layers (from most to least critical)

#### Layer 1: Middleware / Route Protection (Before Business Logic)
**When:** Every authenticated request to protected routes
**Where:** Loader function in `app.tsx` or per-route loaders
**What:** Check ShopPlan.status === "active" (subscription valid?)

```typescript
// Example middleware check in app loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const plan = await getPlan(session.shop);

  if (!plan || plan.status !== "active") {
    return redirect("/app/upgrade"); // graceful degradation
  }

  return { plan, shop: session.shop };
};
```

#### Layer 2: Service Layer (Per Feature)
**When:** Specific feature (agent toggle, run execution, trust level assignment)
**Where:** Dedicated service functions that check limits before mutation
**What:** Enforce product count, agent count, trust level, run frequency

```typescript
// Pseudo-code: service layer enforcement
async function canEnableAgent(shop, agentId, newTrustLevel): Promise<{allowed: boolean, reason?: string}> {
  const plan = await getPlan(shop);
  const enabledCount = await getEnabledAgentCount(shop);

  if (enabledCount >= plan.maxAgents && !isAlreadyEnabled(agentId)) {
    return { allowed: false, reason: "Agent limit reached" };
  }

  if (!plan.allowedTrustLevels.includes(newTrustLevel)) {
    return { allowed: false, reason: `${newTrustLevel} not available on ${plan.planTier}` };
  }

  return { allowed: true };
}
```

#### Layer 3: Data Validation (At Write Time)
**When:** Upsert/create operations on AgentSetting, RunFrequencyLog
**Where:** Prisma hooks or service-layer validation before `.create()/.update()`
**What:** Final check before commit (defense-in-depth)

#### Layer 4: UI Layer (Client-Side Hints)
**When:** Disabling buttons, hiding options, showing upgrade prompts
**Where:** React components reading `plan` from loader data
**What:** Gray out disabled agents, show "upgrade required" badges

---

## 3. Product Count Enforcement

### Challenge
Shopify Admin API caps product count at 10,000. Cache locally; sync on schedule or on-demand.

### Implementation Strategy

#### Step 1: Initial Sync (On First Run or Daily)
```typescript
export async function syncProductCount(shop: string, admin: AdminClient) {
  try {
    // Use GraphQL products query with cursor pagination
    const count = await admin.graphql(`
      query {
        products(first: 1) {
          pageInfo { hasNextPage }
          edges { cursor }
        }
      }
    `);

    // Use relay-style cursor to fetch all products efficiently
    // OR count via bulk operation (slower but more accurate for huge catalogs)

    await prisma.productCount.upsert({
      where: { shop },
      update: { count, lastSyncedAt: new Date() },
      create: { shop, count, lastSyncedAt: new Date() },
    });
  } catch (error) {
    await prisma.productCount.upsert({
      where: { shop },
      update: { syncError: error.message },
      create: { shop, count: 0, syncError: error.message },
    });
  }
}
```

#### Step 2: Lazy Sync on Agent Run
```typescript
export async function canRunAgents(shop: string): Promise<{allowed: boolean, reason?: string}> {
  const plan = await getPlan(shop);
  if (!plan.maxProducts) return { allowed: true }; // unlimited (Pro/Agency)

  let productCount = await prisma.productCount.findUnique({ where: { shop } });

  // Stale or missing? Sync now (non-blocking; log error but don't fail)
  if (!productCount || isStale(productCount.lastSyncedAt, 24 * 60 * 60 * 1000)) {
    syncProductCount(shop, admin).catch(err => console.error("ProductCount sync failed:", err));
  }

  const count = productCount?.count ?? 0;
  if (count > plan.maxProducts) {
    return { allowed: false, reason: `Product limit (${plan.maxProducts}) exceeded` };
  }

  return { allowed: true };
}
```

#### Step 3: Sync Frequency
- **Daily batch job:** Run via BullMQ (post-MVP) at 2am UTC for all active shops
- **On-demand:** Explicitly re-sync via settings UI ("Check product count")
- **TTL:** Treat cached count as valid for 24h

---

## 4. Agent Count & Trust Level Gating

### Agent Availability by Tier
Free and Starter tiers have reduced agent availability. Enforce at two points:

#### 4.1 Agent Enable/Disable (AgentSetting.enabled)
Existing `toggleAgentEnabled()` must check limit:

```typescript
export async function toggleAgentEnabled(
  shop: string,
  agentId: string,
  enabled: boolean,
): Promise<{success: boolean, error?: string}> {
  const plan = await getPlan(shop);

  if (enabled) {
    const currentEnabledCount = await prisma.agentSetting.count({
      where: { shop, enabled: true },
    });

    if (currentEnabledCount >= plan.maxAgents) {
      return { success: false, error: `Max ${plan.maxAgents} agents for ${plan.planTier} tier` };
    }
  }

  // Only check allowed trust levels on enable
  if (enabled) {
    const agent = await prisma.agentSetting.findUnique({
      where: { shop_agentId: { shop, agentId } },
    });

    if (agent && !plan.allowedTrustLevels.includes(agent.trustLevel)) {
      // Downgrade trust level to highest allowed
      agent.trustLevel = plan.allowedTrustLevels[plan.allowedTrustLevels.length - 1];
    }
  }

  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { enabled },
    create: { shop, agentId, enabled, trustLevel: "advisor" },
  });
}
```

#### 4.2 Trust Level Assignment (AgentSetting.trustLevel)
Existing `updateAgentTrustLevel()` must check plan:

```typescript
export async function updateAgentTrustLevel(
  shop: string,
  agentId: string,
  trustLevel: TrustLevel,
): Promise<{success: boolean, error?: string}> {
  const plan = await getPlan(shop);

  if (!plan.allowedTrustLevels.includes(trustLevel)) {
    return {
      success: false,
      error: `${trustLevel} not available on ${plan.planTier}. Available: ${plan.allowedTrustLevels.join(", ")}`
    };
  }

  return prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId } },
    update: { trustLevel },
    create: { shop, agentId, trustLevel },
  });
}
```

---

## 5. Run Frequency Limiting (Runs/Week)

### Challenge
Free tier: 2 runs/week. Starter: daily (14+). Pro/Agency: unlimited.

### Implementation Strategy

#### Step 1: Define Week Boundaries
Weekly boundary = Monday 00:00 UTC. Rotate logs weekly (delete rows older than 7 days).

#### Step 2: Check Before Execute (in run-all route)
```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);

  // 1. Check plan status
  const plan = await getPlan(session.shop);
  if (!plan || plan.status !== "active") {
    return data({ success: false, error: "Subscription required" }, { status: 403 });
  }

  // 2. Check run frequency if capped
  if (plan.maxRunsPerWeek) {
    const runCount = await getRunsThisWeek(session.shop);
    if (runCount >= plan.maxRunsPerWeek) {
      return data(
        { success: false, error: `Run limit (${plan.maxRunsPerWeek}/week) reached` },
        { status: 429 } // rate limit status
      );
    }
  }

  // 3. Check product count
  const productCheck = await canRunAgents(session.shop);
  if (!productCheck.allowed) {
    return data({ success: false, error: productCheck.reason }, { status: 403 });
  }

  // 4. Execute agents
  const enabledIds = await getEnabledAgentIds(session.shop);
  const agents = getAllAgents().filter((a) => enabledIds.includes(a.agentId));
  const results = await executeAllAgents(agents, session.shop, admin);

  // 5. Log this run
  await prisma.runFrequencyLog.create({
    data: { shop: session.shop, runDate: getWeekStartDate() },
  });

  return data({ success: true, results });
};

function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
}

async function getRunsThisWeek(shop: string): Promise<number> {
  const weekStart = getWeekStartDate();
  return prisma.runFrequencyLog.count({
    where: {
      shop,
      runDate: { gte: weekStart },
    },
  });
}
```

#### Step 3: Cleanup Job
Weekly cron (or monthly batch) to delete logs older than 8 days:
```typescript
export async function cleanupRunLogs() {
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await prisma.runFrequencyLog.deleteMany({
    where: { runDate: { lt: eightDaysAgo } },
  });
}
```

---

## 6. Trust Level Gating by Plan

Trust level access is **per-plan** and **per-agent**. Enforce in 2 places:

| Plan | Allowed Levels | Notes |
|------|---|---|
| Free | `["advisor"]` | Recommendations only, no actions |
| Starter | `["advisor", "assistant"]` | Can one-click apply recommendations |
| Pro | `["advisor", "assistant", "autopilot"]` | Can auto-execute overnight |
| Agency | `["advisor", "assistant", "autopilot"]` | Same as Pro |

### Enforcement Points

**1. On Trust Level Update (app.settings route)**
Already covered in section 4.2 — check `plan.allowedTrustLevels` before upsert.

**2. On Agent Enable (if downgrading needed)**
Already covered in section 4.1 — downgrade trust level if current setting exceeds plan.

**3. On Agent Execution (if downgrading mid-flight)**
Defensive check: even if agent is set to "autopilot", check at runtime:
```typescript
export async function executeAgent(agent, shop, admin) {
  const plan = await getPlan(shop);
  const setting = await prisma.agentSetting.findUnique({
    where: { shop_agentId: { shop, agentId: agent.agentId } },
  });

  const trustLevel = setting?.trustLevel ?? "advisor";
  const effectiveTrustLevel = plan.allowedTrustLevels.includes(trustLevel)
    ? trustLevel
    : plan.allowedTrustLevels[plan.allowedTrustLevels.length - 1];

  // Pass effective trust level to agent (for autonomy decisions)
  const findings = await agent.run(shop, admin, effectiveTrustLevel);
  // ...
}
```

---

## 7. Agency Multi-Store (5+ Stores)

### Architecture Decision: Single Shared Schema
Use **StoreAssignment** table (section 1.4) rather than separate databases or schemas.

#### Pattern
```
Agency Shop #1 (primary) — owns database row shop="store1.myshopify.com"
  ↓ purchases 5 store subscriptions
  ├─ Store A (assigned) — shop="storeA.myshopify.com"
  ├─ Store B (assigned) — shop="storeB.myshopify.com"
  ├─ Store C (assigned) — shop="storeC.myshopify.com"
  ├─ Store D (assigned) — shop="storeD.myshopify.com"
  └─ Store E (assigned) — shop="storeE.myshopify.com"

All share ShopPlan.maxStores=5, but each gets own AgentSetting, ProductCount, RunFrequencyLog rows (keyed by shop).
```

#### Queries to Support Multi-Store
```typescript
// For UI: show all my stores and their status
export async function getMyStores(ownerShop: string) {
  const myPlan = await getPlan(ownerShop);

  // Fetch assignments
  const assignments = await prisma.storeAssignment.findMany({
    where: { ownerShop },
  });

  // Build result
  return [
    { shop: ownerShop, storeName: "Primary Store", isPrimary: true, ...myPlan },
    ...assignments.map(a => ({ shop: a.assignedShop, ...a })),
  ];
}

// For authentication: if user logs in to assigned store, verify they own primary
export async function getOwnerShop(shop: string): Promise<string | null> {
  const direct = await getPlan(shop); // is this shop a primary?
  if (direct) return shop;

  const assignment = await prisma.storeAssignment.findUnique({
    where: { assignedShop: shop },
    select: { ownerShop: true },
  });
  return assignment?.ownerShop ?? null;
}
```

#### Cost Model for Agency
- Base: $199/mo for 5 stores
- Each additional store: +$29/mo
- Query: `ShopPlan.maxStores` to know how many stores on contract

---

## 8. Graceful Degradation UX

### When Limit Hit: Messaging Strategy

#### Product Count Exceeded
```
Status: ⚠️ Product Limit Reached
You have 156 products but your plan includes 100.
Agents are disabled to protect data.

Options:
[Upgrade to Pro] [Review Products] [Dismiss]
```

#### Agent Count Exceeded
```
Agent: Inventory Manager (4/4 agents active)
This agent is disabled because you've reached your limit.

[Upgrade to Pro] [Disable Another Agent] [Upgrade]
```

#### Trust Level Restricted
```
Trust Level: Autopilot
Autopilot requires Pro plan. Your Starter plan allows: Advisor, Assistant.
Current setting: Downgraded to Assistant.

[Learn More] [Upgrade]
```

#### Run Frequency Exceeded
```
Briefing Run Failed
2/2 weekly runs used. Next run available: Monday at 00:00 UTC.

[Upgrade to Daily] [View Findings] [Schedule for Later]
```

### UI Implementation
```tsx
// In app.settings
export function AgentTrustControl({ agent, plan }) {
  const isAllowed = plan.allowedTrustLevels.includes(agent.trustLevel);

  return (
    <s-box>
      {!isAllowed && (
        <s-banner tone="warning">
          {agent.trustLevel} requires {getPlanForTrustLevel(agent.trustLevel)} plan.
          <s-link href="/app/upgrade">Upgrade now</s-link>
        </s-banner>
      )}
      {/* ... rest of control ... */}
    </s-box>
  );
}
```

---

## 9. Code Integration Points

### Files to Modify
1. **prisma/schema.prisma** — Add ShopPlan, ProductCount, RunFrequencyLog, AgentEntitlementOverride, StoreAssignment
2. **app/services/agent-settings.server.ts** — Add plan checks to toggleAgentEnabled, updateAgentTrustLevel
3. **app/services/billing.server.ts** (new) — getPlan, syncProductCount, getRunsThisWeek
4. **app/routes/app.api.agents.run-all.tsx** — Add plan/frequency/product checks before executeAllAgents
5. **app/routes/app.settings.tsx** — Display plan tier, upgrade prompts, disabled agent explanations
6. **app/routes/app._index.tsx** — Show upgrade banner if on Free or over limits
7. **app/routes/app/upgrade.tsx** (new) — Pricing page / upgrade flow (integration with Shopify Billing API)
8. **app/middleware/auth.server.ts** (optional) — Middleware check for plan status in app loader

### New Service Functions (app/services/billing.server.ts)
```typescript
export async function getPlan(shop: string): Promise<ShopPlan | null>
export async function syncProductCount(shop: string, admin: AdminClient): Promise<void>
export async function getRunsThisWeek(shop: string): Promise<number>
export async function canRunAgents(shop: string): Promise<{allowed: boolean, reason?: string}>
export async function getMyStores(ownerShop: string): Promise<StoreInfo[]>
export async function getOwnerShop(shop: string): Promise<string | null>
```

---

## 10. Recommendations

### Phase 1: MVP (Weeks 1-2)
- [ ] Add ShopPlan, ProductCount, RunFrequencyLog models
- [ ] Implement getPlan, canRunAgents helpers
- [ ] Add plan check to run-all route (block if no plan or over limits)
- [ ] Add product count cache sync (daily cron)
- [ ] Hardcode all Free signups to Free tier; manual DB entry for test Starter/Pro
- [ ] Show upgrade banner in settings if plan != Pro
- **Result:** Run frequency & product limit enforced; manual subscription management

### Phase 2: Billing Integration (Weeks 3-4)
- [ ] Integrate Shopify Billing API (appSubscriptionCreate mutation)
- [ ] Auto-create ShopPlan row on subscription approval
- [ ] Add pricing page with Shopify hosted checkout
- [ ] Handle subscription webhooks (charge, cancellation)
- **Result:** Self-service subscription upgrades via Shopify

### Phase 3: Agent Limits & Multi-Store (Weeks 5-6)
- [ ] Enforce agent count limit in toggleAgentEnabled
- [ ] Enforce trust level limit in updateAgentTrustLevel
- [ ] Add AgentEntitlementOverride model (optional; store for future)
- [ ] Implement StoreAssignment for Agency tier
- [ ] Build "My Stores" dashboard in settings
- **Result:** Agent/trust level/multi-store enforcement complete

### Phase 4: Polish & Graceful Degradation (Week 7+)
- [ ] Implement UI messaging (upgrade prompts, disabled badges)
- [ ] Add cleanup job for old RunFrequencyLog rows
- [ ] A/B test messaging (hard block vs soft warning)
- **Result:** Merchant-friendly UX when limits hit

### Phase 5: Rate Limiting at API Level (Post-MVP)
- Optional: Add Redis-backed rate limiter for /api/agents.run-all route
- Use shop + API key as rate limit key
- Integrate with plan tier (Free = 2 req/week, Starter = 2 req/day, etc.)

---

## 11. Implementation Checklist

### Database
- [ ] ShopPlan schema
- [ ] ProductCount schema
- [ ] RunFrequencyLog schema
- [ ] AgentEntitlementOverride schema
- [ ] StoreAssignment schema
- [ ] Add migration/db push commands

### Services (app/services/billing.server.ts)
- [ ] getPlan(shop)
- [ ] syncProductCount(shop, admin)
- [ ] getRunsThisWeek(shop)
- [ ] canRunAgents(shop)
- [ ] getMyStores(ownerShop)
- [ ] getOwnerShop(shop)

### Route Updates
- [ ] app.tsx loader: check plan.status active
- [ ] app.api.agents.run-all: add all enforcement checks
- [ ] app.settings.tsx: show plan tier, upgrade prompts
- [ ] app._index.tsx: upgrade banner if Free

### New Routes
- [ ] /app/upgrade — pricing page
- [ ] /api/billing/confirm — Shopify billing callback

### UI Components
- [ ] Plan badge (Free/Starter/Pro/Agency)
- [ ] Upgrade prompt (modal/banner)
- [ ] Disabled agent explanation
- [ ] Run frequency countdown

---

## 12. Validation & Testing

### Unit Tests
- getPlan() returns correct tier with all fields
- canRunAgents() correctly counts products
- getRunsThisWeek() respects week boundaries
- toggleAgentEnabled() blocks when limit hit
- updateAgentTrustLevel() blocks disallowed levels

### Integration Tests
- Full flow: Free signup → hit product limit → upgrade → re-enable
- Run frequency: run 2x week on Free, verify 3rd run blocked
- Trust level: set to Autopilot on Starter, verify downgrade to Assistant
- Multi-store: assign 5 stores to Agency, all inherit plan limits

### Manual QA
- Verify ProductCount sync via Shopify Admin API
- Test RunFrequencyLog cleanup (weekly deletion)
- Verify Shopify Billing API integration (if implemented)
- Test upgrade UX (pricing page → Shopify checkout → plan activation)

---

## Unresolved Questions

1. **Product count API accuracy:** Does Shopify's product count endpoint match actual product query results? Should we fall back to bulk operation count if discrepancy detected?
2. **Run frequency edge case:** If merchant runs agents at 11:50 PM Sunday, then runs again at 12:10 AM Monday, does that count as 2 runs in same week? (Yes, per our algorithm; acceptable?)
3. **Agency pricing details:** Are the "+$29 per extra store" charges meant to be on top of base $199, or is that the per-store model? Assumption: base $199 includes 5 stores, each additional is +$29/mo.
4. **Trust level downgrade:** If merchant upgrades from Free to Pro, then downgrades back to Free, should we auto-downgrade agents from Assistant/Autopilot? (Recommendation: yes, in UI with warning.)
5. **Graceful degradation threshold:** Block agents from running entirely if limit hit, or soft-warn and continue? (Recommendation: block Pro features, allow Advisor-only findings.)

---

## References & Sources
- Shopify Billing API: https://shopify.dev/docs/apps/launch/billing
- Multi-tenant DB patterns: https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/
- Rate limiting strategies: https://tyk.io/learning-center/api-rate-limiting-explained-from-basics-to-best-practices/
- Product pagination: https://shopify.dev/docs/api/admin-rest/usage/pagination
- Feature gating: https://www.withorb.com/blog/feature-gating
