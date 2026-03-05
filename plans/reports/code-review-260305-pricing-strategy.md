# Code Review: Pricing Strategy Implementation

**Reviewer:** code-reviewer
**Date:** 2026-03-05
**Scope:** All 5 phases of pricing strategy (billing, gating, conversion UX, agency)
**Files reviewed:** 18 source files, 1 schema, 5 plan phases

---

## Overall Assessment

Implementation is **solid and well-structured**. Red team fixes RT-1 through RT-12 are mostly addressed correctly. The code follows project conventions (Polaris web components, server-only files, flat-route structure). Type checking passes. However, several security, data integrity, and completeness issues remain.

**Verdict: CONDITIONAL PASS** -- fix Critical and High items before shipping to production.

---

## Red Team Fix Verification

| RT# | Finding | Status | Notes |
|-----|---------|--------|-------|
| RT-1 | Callback tier from DB not URL | PASS | Subscribe stores tier+subscriptionId in DB; callback reads from `getShopPlan` |
| RT-2 | Increment-before-execute with rollback | PASS | Both run routes increment before execute, decrement on catch |
| RT-3 | Default-enabled agents respect free tier | PARTIAL | `enforcePlanLimits` on first `getShopPlan` creation, BUT see Critical #1 |
| RT-4 | Product count limit enforced | PASS | `isWithinProductLimit` in `canRunAgents` |
| RT-5 | Trial expiry doesn't block paying customers | PASS | Only blocks when `subscriptionStatus !== "active"` |
| RT-6 | Cancel/downgrade route exists | PASS | `_action: "cancel"` handler in subscribe route |
| RT-7 | Existing subscription check before creating new | PASS | Cancels existing active subscription first |
| RT-8 | API version aligned | PASS | Both `shopify.server.ts` and `shopify.app.toml` use `April26` |
| RT-9 | Uninstall cleans billing records | PASS | `cleanupBillingRecords` in uninstall webhook |
| RT-11 | Webhook strict subscription ID match | PASS | `plan.shopifySubscriptionId === subscriptionGid` |
| RT-12 | null not undefined in downgradeToFree | PASS | All fields explicitly set to `null` |

---

## Critical Issues

### C-1: RT-3 Race Condition -- `getEnabledAgentIds` defaults all agents to enabled before `enforcePlanLimits` runs

**File:** `/Users/lmtnolimit/projects/team8/app/services/agent-settings.server.ts` lines 79-89
**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts` lines 12-21

`getEnabledAgentIds` returns agents as enabled when no `AgentSetting` record exists (`settingsMap.get(id) ?? true`). On a brand new shop with no `AgentSetting` records yet, `getShopPlan` creates the plan, then calls `enforcePlanLimits("free")`, which queries `agentSetting.findMany({ where: { shop, enabled: true } })`. Since no records exist yet, `enabledSettings` is empty, so `enforcePlanLimits` does nothing -- no agents get disabled.

Meanwhile `getEnabledAgentIds` still returns all 6 agents as enabled (via the `?? true` fallback). This means a free-tier user can run all 6 agents until some agent settings are manually created.

**Impact:** Free tier users bypass the 2-agent limit.

**Fix:** `enforcePlanLimits` must seed `AgentSetting` records for all agents before slicing. OR `getEnabledAgentIds` should check plan limits as a fallback:

```typescript
// In enforcePlanLimits, seed settings first:
const agents = listAgents();
for (const agent of agents) {
  await prisma.agentSetting.upsert({
    where: { shop_agentId: { shop, agentId: agent.agentId } },
    update: {},
    create: { shop, agentId: agent.agentId, enabled: true },
  });
}
// Then slice...
```

**Note:** The `run-all.tsx` route has a secondary guard (`cappedIds = enabledIds.slice(0, limits.maxAgents)`) that partially mitigates this for `run-all`, but single-agent runs via `$agentId.run.tsx` have NO such cap. A free-tier user can run any individual agent even if they should only have 2 enabled.

### C-2: Callback uses `charge_id` (Shopify charge ID) but stores/queries `shopifySubscriptionId` (GID format)

**File:** `/Users/lmtnolimit/projects/team8/app/routes/app.api.billing.callback.tsx` lines 11, 22, 27

Shopify redirects back with `charge_id` as a numeric charge ID parameter, but `getSubscriptionStatus` queries the GraphQL API using `node(id: $id)` which expects a GID like `gid://shopify/AppSubscription/12345`. The subscribe route stores the GID from `createSubscription` in `shopifySubscriptionId`.

When callback fires, it does:
- `chargeId = url.searchParams.get("charge_id")` -- this is the numeric charge ID from Shopify
- `getSubscriptionStatus(admin, chargeId)` -- queries GraphQL with a numeric ID, not a GID
- `shopifySubscriptionId: chargeId` -- overwrites the GID with the numeric charge ID

This means:
1. The GraphQL query may fail (expecting GID format)
2. Even if Shopify resolves it, the stored `shopifySubscriptionId` becomes mismatched with what the webhook sends (webhook sends GID)
3. RT-11 strict matching then fails because the stored ID was overwritten with the charge_id format

**Fix:** Callback should use the `shopifySubscriptionId` already stored in DB (from subscribe step) instead of `charge_id` for the GraphQL query. Or construct the GID: `gid://shopify/AppSubscription/${chargeId}`.

```typescript
const plan = await getShopPlan(session.shop);
const subscriptionGid = plan.shopifySubscriptionId;
if (!subscriptionGid) return redirect("/app/upgrade?error=missing_subscription");

const sub = await getSubscriptionStatus(admin, subscriptionGid);
// keep shopifySubscriptionId as-is (already the GID)
```

---

## High Priority Issues

### H-1: `addManagedStore` does not enforce `maxStores` limit

**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts` lines 271-292

The function checks `plan.tier !== "agency"` but never checks whether the store count exceeds `maxStores` (5). An agency user can add unlimited stores -- there is no count cap. The `isOverIncludedStores` helper exists but is never called during `addManagedStore`.

**Fix:**
```typescript
const currentCount = await getManagedStoreCount(primaryShop);
// Allow adding beyond maxStores (usage billing handles it),
// but if you want a hard cap, add it here
```

While the usage-based billing design may intentionally allow unlimited stores (billing extra), the `PLAN_LIMITS.agency.maxStores` is set to 5, suggesting a hard cap was intended. Clarify intent and either enforce the cap or document that stores beyond 5 are billed via usage records.

### H-2: No usage charge creation when adding stores beyond the included 5

**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts`, `/Users/lmtnolimit/projects/team8/app/routes/app.settings.tsx`

The `createUsageRecord` function exists in `billing-mutations.server.ts` but is never called anywhere. When an agency user adds a 6th store, no usage charge is created. The UI in `store-management.tsx` displays the cost label (`$29/mo extra`) but it is purely cosmetic.

**Impact:** Agency stores beyond the included 5 are free -- revenue leakage.

### H-3: `billing.server.ts` exceeds 200-line modularization threshold (317 lines)

Per project rules, files over 200 lines should be modularized. This file handles ShopPlan CRUD, run frequency, product counts, run gating, usage summary, trial logic, plan enforcement, multi-store management, and cleanup -- too many concerns in one file.

**Suggested split:**
- `billing-plan.server.ts` -- ShopPlan CRUD, downgradeToFree
- `billing-run-gate.server.ts` -- canRunAgents, run frequency, product count
- `billing-agency.server.ts` -- multi-store management
- `billing-enforcement.server.ts` -- enforcePlanLimits, cleanup

### H-4: `syncProductCount` is never called in any loader or route

**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts` lines 94-108

`syncProductCount` fetches the real product count from Shopify's GraphQL API, but no route or loader calls it. `getProductCount` returns the cached value, which starts at 0 for new shops and never updates. This means `isWithinProductLimit` always returns `true` (0 <= 25).

The plan mentions "RT-4: Add syncProductCount() to dashboard loader" but the dashboard loader (`app._index.tsx`) does not call it.

**Fix:** Add `syncProductCount(session.shop, admin)` to the dashboard loader or a periodic sync mechanism.

### H-5: `agents._index.tsx` file is 282 lines -- extract `AgentCard` component

The `AgentCard` function (lines 210-281) should be extracted to `app/components/agent-card.tsx` per the 200-line modularization rule.

---

## Medium Priority Issues

### M-1: Subscribe route sets tier to `pending` in DB before user approves

**File:** `/Users/lmtnolimit/projects/team8/app/routes/app.api.billing.subscribe.tsx` lines 88-93

When user clicks upgrade, the route immediately updates the DB with:
```typescript
await updateShopPlan(session.shop, {
  tier: tier as PlanTier,        // e.g., "pro"
  subscriptionStatus: "pending",
});
```

If the user navigates away without approving on Shopify's billing page, the DB shows them on "pro" tier with "pending" status. `canRunAgents` only blocks "frozen" or "cancelled" status -- "pending" passes through, giving the user pro-tier limits without paying.

**Fix:** Keep tier as current tier until callback confirms. Store intended tier in a separate field or in metadata:

```typescript
await updateShopPlan(session.shop, {
  subscriptionStatus: "pending",
  // Don't change tier yet -- callback will set it
});
```

Or add "pending" to the blocked statuses in `canRunAgents`.

### M-2: Webhook handler uses `Record<string, unknown>` type cast

**File:** `/Users/lmtnolimit/projects/team8/app/routes/webhooks.app.subscriptions_update.tsx` line 36

```typescript
await updateShopPlan(shop, updateData as Parameters<typeof updateShopPlan>[1]);
```

This bypasses type safety. Build `updateData` as the proper type from the start instead of casting.

### M-3: `app/settings.tsx` file is 267 lines -- should be modularized

The settings page combines store profile form, agent configuration, multi-store management, notifications, and API config sections. Extract the store profile form into its own component.

### M-4: Plan phase TODO items not marked complete

Phase 2 through Phase 5 todos are all marked `[ ]` (incomplete) despite the implementation being present and typecheck passing. This creates confusion about project status.

### M-5: Product count cache returns stale 0 on cache miss

**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts` lines 83-92

When TTL has expired, `getProductCount` returns `cached?.count ?? 0` instead of triggering a refresh. This means after 24 hours, the check still uses the old value. Combined with H-4 (sync never called), product limits are effectively unenforced.

### M-6: `cleanupBillingRecords` does not clean StoreAssignment for managed shops

**File:** `/Users/lmtnolimit/projects/team8/app/services/billing.server.ts` lines 309-316

When an agency primary store uninstalls, `StoreAssignment` records where `primaryShop === shop` are deleted. But if a *managed* store uninstalls, its `StoreAssignment` records (where `managedShop === shop`) are not cleaned up. The agency owner would still see the uninstalled store in their list.

**Fix:** Add `prisma.storeAssignment.deleteMany({ where: { managedShop: shop } })` to `cleanupBillingRecords`.

---

## Low Priority Issues

### L-1: Pre-existing lint errors (12 unused variable warnings)

All in agent stub files (`_shop`, `_admin` parameters). Not introduced by pricing work but should be tracked.

### L-2: `window.top!` non-null assertion in upgrade page

**File:** `/Users/lmtnolimit/projects/team8/app/routes/app.upgrade.tsx` line 38

`window.top!.location.href` uses a non-null assertion. In edge cases where the app is not embedded, `window.top` could be the same as `window`. While functionally fine, prefer `(window.top ?? window).location.href`.

### L-3: `PlanComparisonTable` does not show downgrade confirmation

When clicking "Downgrade" on the free plan, no confirmation dialog appears. User could accidentally downgrade and lose agent configurations.

### L-4: Unused `currentTier` prop in `AgentTrustControl`

**File:** `/Users/lmtnolimit/projects/team8/app/components/agent-trust-control.tsx` line 39

The `currentTier` prop is destructured in the parent but not used in the component body.

### L-5: `StoreManagement` has no max store count validation on the client

The `addManagedStore` function enforces agency-only on the server, but the client allows submitting the form regardless. Consider disabling the add button when at the hard cap (if one is intended).

---

## Positive Observations

1. **RT-2 implementation is clean** -- increment-before-execute with decrement-on-failure is the correct pattern for preventing TOCTOU races on run counts
2. **RT-1 design is correct** -- storing intended tier in DB during subscribe and reading from DB in callback prevents URL parameter forgery
3. **RT-11 strict matching** -- the webhook handler correctly requires exact subscription ID match
4. **RT-12 fix** -- `null` values are properly used throughout `downgradeToFree`
5. **Type safety** -- typecheck passes cleanly; `PlanTier` type is used consistently
6. **API version alignment** -- both `shopify.server.ts` and `shopify.app.toml` use `April26`
7. **Scope update** -- `read_products` scope added to `shopify.app.toml`
8. **Webhook registration** -- `app_subscriptions/update` webhook properly declared in toml
9. **Component extraction** -- `PlanComparisonTable`, `PlanUsageWidget`, `AgentTrustControl`, `StoreManagement`, `UpgradeBanner` are all well-isolated components
10. **Plan enforcement on downgrade** -- `enforcePlanLimits` correctly disables excess agents and downgrades trust levels

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix C-2: Callback charge_id vs GID mismatch -- this will break the entire subscription flow in production
2. **[CRITICAL]** Fix C-1: Seed `AgentSetting` records in `enforcePlanLimits` so free-tier agent cap is enforced on first visit
3. **[HIGH]** Fix M-1: Don't set tier to paid plan until callback confirms payment
4. **[HIGH]** Fix H-4: Call `syncProductCount` in dashboard loader so product limits are actually enforced
5. **[HIGH]** Address H-2: Wire up `createUsageRecord` for agency stores beyond the included 5
6. **[HIGH]** Modularize H-3: Split `billing.server.ts` into focused modules
7. **[MEDIUM]** Fix M-6: Clean up `StoreAssignment` records for managed shops on uninstall
8. **[MEDIUM]** Mark plan phase TODOs as complete (M-4)
9. **[LOW]** Extract `AgentCard` component from agents list page

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | PASS (typecheck clean) |
| Lint Issues | 12 (all pre-existing, none from pricing work) |
| Files Over 200 Lines | 3 (`billing.server.ts` 317, `app.settings.tsx` 267, `app.agents._index.tsx` 282) |
| New Models Added | 4 (ShopPlan, ProductCount, RunFrequencyLog, StoreAssignment) |
| New Routes Added | 3 (billing subscribe, callback, subscriptions_update webhook) |
| New Components | 5 (plan-comparison-table, plan-usage-widget, agent-trust-control, store-management, upgrade-banner) |
| Red Team Fixes Verified | 10/11 pass, 1 partial (RT-3) |

---

## Unresolved Questions

1. **Is the agency store limit a hard cap or soft cap?** `PLAN_LIMITS.agency.maxStores = 5` suggests a cap, but usage billing design suggests stores beyond 5 are allowed at extra cost. The `addManagedStore` function enforces neither. Needs product decision.
2. **Where should `syncProductCount` be called?** Dashboard loader has the `admin` context but runs on every page load. Consider a separate API route or cron job.
3. **Should "pending" subscription status be treated as blocked?** Current logic allows full access on pending status. If a user clicks upgrade then abandons, they get paid-tier access until the subscription times out or the webhook fires.
4. **Is there an upgrade-modal component?** Phase 4 TODO mentions `upgrade-modal.tsx` but it was not created. The `UpgradeBanner` component serves a similar purpose -- is the modal still planned?
