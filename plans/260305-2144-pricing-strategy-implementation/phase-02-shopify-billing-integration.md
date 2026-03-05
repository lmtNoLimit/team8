# Phase 2: Shopify Billing Integration

## Context Links

- [Plan Overview](plan.md)
- [Phase 1: DB Schema + Plan Service](phase-01-db-schema-and-plan-service.md)
- Shopify config: `shopify.app.toml`
- Shopify server: `app/shopify.server.ts`
- Webhook handler pattern: `app/routes/webhooks.app.uninstalled.tsx`
- Billing service (Phase 1): `app/services/billing.server.ts`

## Overview

- **Priority:** P1
- **Status:** completed
- **Effort:** 6h
- **Depends on:** Phase 1
- **Description:** Integrate Shopify Billing API via direct GraphQL mutations. Create subscription management routes (subscribe, callback, webhook). Handle full subscription lifecycle: creation, approval, activation, freezing, cancellation.

## Key Insights

- `appSubscriptionCreate` GraphQL mutation creates recurring charge; returns `confirmationUrl` for merchant redirect
- After merchant approves, Shopify redirects to our `returnUrl` with `charge_id` query param
- `APP_SUBSCRIPTIONS_UPDATE` webhook fires on all status changes (active, frozen, cancelled, expired)
- Free tier = no Shopify subscription; only DB record. Never call billing API for free.
- Dev stores use `test: true` flag; determined by `process.env.NODE_ENV !== "production"` or explicit env var
- No billing config in `shopify.server.ts` needed; we handle billing manually via `admin.graphql()`
- Revenue share: Shopify takes 15% (first $1M lifetime exempted). Not relevant to implementation, just margin math.
- Need `read_products` scope for product count sync (Phase 1 dependency, but scope change happens here)

## Requirements

### Functional
1. Add `read_products` to scopes in `shopify.app.toml`
2. Add `APP_SUBSCRIPTIONS_UPDATE` webhook subscription to `shopify.app.toml`
3. Create GraphQL mutation helpers for `appSubscriptionCreate` and `appSubscriptionLineItemUpdate`
4. POST `/app/api/billing/subscribe` -- action creates subscription, returns confirmationUrl
5. GET `/app/api/billing/callback` -- loader activated after merchant approves; confirms + updates ShopPlan
6. Webhook handler for `app/subscriptions_update` -- updates ShopPlan on status changes
7. Support `test: true` for dev store testing
8. 7-day trial via `trialDays` param when applicable

### Non-Functional
- All billing mutations authenticated via `authenticate.admin(request)`
- Webhook handler authenticated via `authenticate.webhook(request)`
- Idempotent subscription creation (check existing active sub before creating new)
- Graceful handling of Shopify API errors with user-friendly messages

## Architecture

```
Subscription Creation Flow:
  User clicks "Upgrade" on pricing page
    -> POST /app/api/billing/subscribe { tier: "starter", trial: true }
       -> authenticate.admin(request)
       -> Check: does shop already have active subscription? If so, update instead.
       -> admin.graphql(appSubscriptionCreate { ... })
       -> Return { confirmationUrl }
    -> Frontend redirects merchant to confirmationUrl (Shopify approval page)
    -> Merchant approves
    -> Shopify redirects to /app/api/billing/callback?charge_id=xxx
       -> Verify charge via admin.graphql(node query)
       -> updateShopPlan(shop, { tier, subscriptionId, status: "active" })
       -> Redirect to /app/upgrade?success=true

Webhook Status Update Flow:
  Shopify fires APP_SUBSCRIPTIONS_UPDATE
    -> POST /webhooks/app/subscriptions_update
       -> authenticate.webhook(request)
       -> Parse payload: { app_subscription: { admin_graphql_api_id, status } }
       -> Map status to our subscriptionStatus
       -> updateShopPlan(shop, { subscriptionStatus })
       -> If cancelled/expired: downgrade tier to "free"
```

## Related Code Files

### Files to Create
- `app/services/billing-mutations.server.ts` — GraphQL helpers (~100 lines)
- `app/routes/app.api.billing.subscribe.tsx` — subscription creation action (~80 lines)
- `app/routes/app.api.billing.callback.tsx` — post-approval callback loader (~60 lines)
- `app/routes/webhooks.app.subscriptions_update.tsx` — webhook handler (~50 lines)

### Files to Modify
- `shopify.app.toml` — add `read_products` scope + subscriptions webhook
- `app/services/billing.server.ts` — add `cancelSubscription()`, `getActiveSubscription()` helpers

## Implementation Steps

### Step 1: Update shopify.app.toml

```toml
[access_scopes]
scopes = "write_products,read_products"

# Add new webhook subscription:
  [[webhooks.subscriptions]]
  topics = [ "app_subscriptions/update" ]
  uri = "/webhooks/app/subscriptions_update"
```

After updating scopes, the app will re-request OAuth on next store load.

### Step 2: Create Billing Mutations Service

Create `app/services/billing-mutations.server.ts`:

```typescript
import type { AdminClient } from "../lib/agent-interface";

const IS_TEST = process.env.NODE_ENV !== "production";

interface CreateSubscriptionInput {
  name: string;
  lineItems: Array<{
    plan: {
      appRecurringPricingDetails: {
        price: { amount: number; currencyCode: string };
        interval: "EVERY_30_DAYS";
      };
    };
  }>;
  returnUrl: string;
  trialDays?: number;
  test?: boolean;
}

export async function createSubscription(
  admin: AdminClient,
  input: {
    planName: string;
    price: number;
    returnUrl: string;
    trialDays?: number;
  },
) {
  const response = await admin.graphql(
    `mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        trialDays: $trialDays
        test: $test
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: input.planName,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: input.price, currencyCode: "USD" },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
        returnUrl: input.returnUrl,
        trialDays: input.trialDays ?? 0,
        test: IS_TEST,
      },
    },
  );

  const json = await response.json();
  const result = json.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }

  return {
    subscriptionId: result?.appSubscription?.id as string,
    confirmationUrl: result?.confirmationUrl as string,
  };
}

export async function getSubscriptionStatus(
  admin: AdminClient,
  subscriptionId: string,
) {
  const response = await admin.graphql(
    `query getSubscription($id: ID!) {
      node(id: $id) {
        ... on AppSubscription {
          id
          status
          name
          createdAt
          currentPeriodEnd
          trialDays
        }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const json = await response.json();
  return json.data?.node;
}

export async function cancelSubscription(
  admin: AdminClient,
  subscriptionId: string,
) {
  const response = await admin.graphql(
    `mutation cancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const json = await response.json();
  return json.data?.appSubscriptionCancel;
}
```

### Step 3: Create Subscribe Route

Create `app/routes/app.api.billing.subscribe.tsx`:

```typescript
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import { createSubscription } from "../services/billing-mutations.server";
import { getShopPlan, updateShopPlan } from "../services/billing.server";
import { PLAN_LIMITS, type PlanTier } from "../lib/plan-config";

const PLAN_NAMES: Record<string, string> = {
  starter: "AI Secretary Starter",
  pro: "AI Secretary Pro",
  agency: "AI Secretary Agency",
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const tier = formData.get("tier") as string;
  const withTrial = formData.get("trial") === "true";

  // Validate tier
  if (!tier || !PLAN_NAMES[tier]) {
    return data({ error: "Invalid plan tier" }, { status: 400 });
  }

  // Check: don't allow subscribing to free (that's a cancel)
  if (tier === "free") {
    return data({ error: "Use cancel to downgrade to free" }, { status: 400 });
  }

  // RT-7: Check for existing active subscription
  const existingPlan = await getShopPlan(session.shop);
  if (existingPlan.shopifySubscriptionId && existingPlan.subscriptionStatus === "active") {
    // Cancel existing subscription before creating new one
    // (or use replacementBehavior: STANDARD in createSubscription)
  }

  const limits = PLAN_LIMITS[tier as PlanTier];
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  const returnUrl = `${appUrl}/app/api/billing/callback?shop=${session.shop}`;

  try {
    const { subscriptionId, confirmationUrl } = await createSubscription(
      admin,
      {
        planName: PLAN_NAMES[tier],
        price: limits.price,
        returnUrl,
        trialDays: withTrial ? 7 : undefined,
      },
    );

    // RT-1: Store pending subscription WITH intended tier (callback reads from DB, not URL)
    await updateShopPlan(session.shop, {
      tier: tier as PlanTier,
      shopifySubscriptionId: subscriptionId,
      subscriptionStatus: "pending",
    });

    return data({ confirmationUrl });
  } catch (error) {
    return data(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
};
```

### Step 4: Create Callback Route

Create `app/routes/app.api.billing.callback.tsx`:

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { updateShopPlan } from "../services/billing.server";
import { getSubscriptionStatus } from "../services/billing-mutations.server";
import type { PlanTier } from "../lib/plan-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const chargeId = url.searchParams.get("charge_id");

  if (!chargeId) {
    return redirect("/app/upgrade?error=missing_params");
  }

  try {
    // RT-1: Read intended tier from DB (stored during subscribe), NOT from URL param
    const plan = await getShopPlan(session.shop);
    const tier = plan.tier; // Was set to pending tier during subscribe action

    // Verify the subscription is active
    const sub = await getSubscriptionStatus(admin, chargeId);

    if (sub?.status === "ACTIVE") {
      await updateShopPlan(session.shop, {
        tier: tier as PlanTier,
        shopifySubscriptionId: chargeId,
        subscriptionStatus: "active",
        // RT-5: Clear trialEndsAt on paid conversion to prevent blocking paying customers
        trialEndsAt: null,
        currentPeriodEnd: sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd)
          : null,
      });
      return redirect("/app/upgrade?success=true");
    }

    return redirect("/app/upgrade?error=not_approved");
  } catch {
    return redirect("/app/upgrade?error=verification_failed");
  }
};
```

### Step 5: Create Webhook Handler

Create `app/routes/webhooks.app.subscriptions_update.tsx`:

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { updateShopPlan, getShopPlan } from "../services/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  const subscription = payload.app_subscription;
  if (!subscription) return new Response();

  const status = subscription.status?.toLowerCase();
  const subscriptionGid = subscription.admin_graphql_api_id;

  console.log(`[Billing Webhook] ${shop}: subscription ${status}`);

  const plan = await getShopPlan(shop);

  // RT-11: Strict match only — no null fallback to prevent stale webhook processing
  if (plan.shopifySubscriptionId === subscriptionGid) {
    const updateData: Record<string, any> = {
      subscriptionStatus: status,
      shopifySubscriptionId: subscriptionGid,
    };

    // If cancelled/expired, downgrade to free
    if (status === "cancelled" || status === "expired") {
      updateData.tier = "free";
      updateData.shopifySubscriptionId = null;
      updateData.trialEndsAt = null;
      updateData.currentPeriodEnd = null;
    }

    await updateShopPlan(shop, updateData);
  }

  return new Response();
};
```

### Step 6: Add Cancel Helper to Billing Service

Add to `app/services/billing.server.ts`:

```typescript
export async function downgradeToFree(shop: string) {
  return updateShopPlan(shop, {
    tier: "free",
    shopifySubscriptionId: null, // RT-12: Must use null, not undefined (Prisma ignores undefined)
    subscriptionStatus: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
  });
}
```

### Step 7: Test Flow

1. `npm run dev` — starts with Shopify CLI tunnel
2. Install app on dev store (will re-request OAuth for new `read_products` scope)
3. Create a subscription via POST to `/app/api/billing/subscribe`
4. Verify redirect to Shopify approval page
5. Approve, verify callback updates ShopPlan
6. Verify webhook fires on status changes

## Red Team Fixes Applied

### RT-1: Callback Tier Forgery — Derive Tier From DB
Store the intended `tier` in ShopPlan during subscribe action (alongside `shopifySubscriptionId`). In the callback, read tier from DB (not URL param). Add a `pendingTier` field to ShopPlan or reuse the `tier` field since we already set status to "pending". Cross-reference subscription `name` against `PLAN_NAMES` as secondary validation.

### RT-5: Trial Expiry — Clear trialEndsAt on Paid Conversion
In the callback route, when subscription status is ACTIVE: set `trialEndsAt: null` to prevent the trial check from blocking paying customers.

### RT-6: Downgrade Cancel Route — Add Cancel Handler
Add `_action` parsing to subscribe route. When `_action === "cancel"`: call `cancelSubscription()` + `downgradeToFree()`. Or create a dedicated `/app/api/billing/cancel` route.

### RT-7: Existing Subscription Check — Cancel Before Creating New
Before calling `createSubscription`, check `getShopPlan(shop)` for existing `shopifySubscriptionId`. If exists, use Shopify's `replacementBehavior` param or cancel old subscription first.

### RT-8: API Version Mismatch
Add explicit step: update `shopify.server.ts` to use `ApiVersion.April26` (matching toml). Verify all GraphQL queries against 2026-04 schema.

### RT-9: App Uninstall Cleanup
Update `webhooks.app.uninstalled.tsx` to also reset ShopPlan (tier=free, clear subscription ID) and delete ProductCount + RunFrequencyLog records.

### RT-11: Webhook Handler — Remove OR Fallback
Change `if (plan.shopifySubscriptionId === subscriptionGid || !plan.shopifySubscriptionId)` to strict match only: `if (plan.shopifySubscriptionId === subscriptionGid)`.

### RT-12: Prisma undefined vs null
Change `downgradeToFree` from `shopifySubscriptionId: undefined` to `shopifySubscriptionId: null`.

## Todo List

- [x] **RT-8:** Update `shopify.server.ts` API version to match `shopify.app.toml` (April26)
- [x] Update `shopify.app.toml` with `read_products` scope
- [x] Add `app_subscriptions/update` webhook to `shopify.app.toml`
- [x] Create `app/services/billing-mutations.server.ts`
- [x] **RT-7:** Add existing subscription check to subscribe route (cancel old or use replacementBehavior)
- [x] **RT-1:** Store intended tier in DB during subscribe, read from DB in callback (not URL)
- [x] **RT-5:** Clear `trialEndsAt: null` in callback when subscription becomes ACTIVE
- [x] **RT-6:** Add `_action: "cancel"` handler to subscribe route (calls cancelSubscription + downgradeToFree)
- [x] Create `app/routes/app.api.billing.subscribe.tsx`
- [x] Create `app/routes/app.api.billing.callback.tsx`
- [x] **RT-11:** Fix webhook handler to strict subscription ID match only (no null fallback)
- [x] Create `app/routes/webhooks.app.subscriptions_update.tsx`
- [x] **RT-12:** Fix `downgradeToFree()` — use `null` not `undefined`
- [x] **RT-9:** Update `webhooks.app.uninstalled.tsx` to reset ShopPlan + cleanup billing records
- [x] Run `npm run typecheck`
- [x] Test subscription flow on dev store
- [x] Test webhook handling
- [x] Test cancel/downgrade flow
- [x] Test reinstall after uninstall (verify clean state)

## Success Criteria

- Dev store can subscribe to Starter/Pro/Agency tiers
- ShopPlan record updates correctly after subscription approval
- Webhook handler processes status changes (freeze/cancel)
- Cancelled subscription auto-downgrades to free tier
- `test: true` flag used for all dev store subscriptions
- No TypeScript errors
- `read_products` scope working (can count products)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| OAuth re-authorization on scope change | Medium | Expected behavior; happens once. Test on dev store first. |
| Webhook delivery delay | Low | DB record stays "pending" until webhook; callback also updates status |
| Duplicate webhooks | Low | Idempotent update (same status written twice is fine) |
| charge_id mismatch on callback | Low | Verify via GraphQL node query before updating plan |
| Shopify API rate limiting | Low | Single mutation per subscribe action; no bulk operations |

## Security Considerations

- Subscription creation requires authenticated admin session
- Webhook verified via `authenticate.webhook()` (HMAC signature check)
- Callback verifies subscription status via GraphQL before updating plan
- `charge_id` validated against Shopify API, never trusted from URL alone
- Test mode flag prevents real charges in development
- Shop param in callback URL verified against session (prevent cross-shop attacks)

## Next Steps

- Phase 3 will use `getShopPlan()` to enforce trust level restrictions
- Phase 4 will use the subscribe route from frontend pricing page
- Phase 5 will extend with usage-based billing for agency multi-store
