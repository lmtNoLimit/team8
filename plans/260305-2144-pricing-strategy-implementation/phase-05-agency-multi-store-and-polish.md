# Phase 5: Agency Multi-Store and Polish

## Context Links

- [Plan Overview](plan.md)
- [Phase 1: DB Schema + Plan Service](phase-01-db-schema-and-plan-service.md)
- [Phase 2: Shopify Billing Integration](phase-02-shopify-billing-integration.md)
- [Phase 3: Agent Trust Level Gating](phase-03-agent-trust-level-gating.md)
- [Phase 4: Pricing Page + Conversion UX](phase-04-pricing-page-and-conversion-ux.md)
- Settings page: `app/routes/app.settings.tsx`
- Billing service: `app/services/billing.server.ts`
- Billing mutations: `app/services/billing-mutations.server.ts`
- Plan config: `app/lib/plan-config.ts`

## Overview

- **Priority:** P3
- **Status:** completed
- **Effort:** 4h
- **Depends on:** Phases 1-4
- **Description:** Add multi-store management for Agency tier ($249 base + $29/store over 5), polish billing edge cases, add graceful degradation messaging, and plan (not implement) A/B testing framework.

## Key Insights

- Agency tier: 5 stores included, additional stores at $29/each via usage-based billing
- Shopify supports `appUsageRecordCreate` for metered billing within same subscription
- Usage cap (`cappedAmount`) set at creation time; agency extra stores capped at reasonable max (e.g., $290 = 10 extra stores)
- StoreAssignment model tracks which shops belong to an agency account
- Multi-store = single Shopify subscription on the "primary" shop, covering all managed shops
- For MVP: agency management is self-service via settings page "My Stores" section
- A/B testing: plan the data model and structure, defer implementation to post-launch

## RT-10: Agency Multi-Store Scope Clarification

**Red team finding:** The multi-store feature has no cross-store auth, no functional backend for managed stores. The app only works on the installed store.

**Resolution:** For MVP, "5 stores" means **billing consolidation** — the agency installs the app separately on each store but manages billing from one primary account. The StoreAssignment model tracks which stores are part of the billing group. Agents run independently per installed store. Cross-store dashboards and unified management are post-launch features.

**Pricing page must clearly state:** "Install on up to 5 stores under one billing account. Each store runs independently."

**Ownership validation:** Require managed shop to also have the app installed. Match by shop domain against Session records in the DB.

## Requirements

### Functional
1. StoreAssignment Prisma model linking agency primary shop to managed shops
2. "My Stores" section in settings (Agency tier only) -- list managed stores, add/remove
3. Usage-based billing line item for additional stores beyond 5
4. `appUsageRecordCreate` mutation when store count exceeds included 5
5. Graceful degradation: clear messaging when features unavailable (not cryptic errors)
6. Cancel flow improvements: confirmation dialog, immediate vs end-of-period option info

### Non-Functional
- StoreAssignment has index on `primaryShop` for fast lookup
- Adding a store validates the shop domain format
- Usage billing record created atomically with store addition (or rolled back)

## Architecture

```
Agency Multi-Store Model:

  StoreAssignment {
    primaryShop: "agency-owner.myshopify.com"
    managedShop: "client-store-1.myshopify.com"
    addedAt: DateTime
  }

  Agency billing:
    Base: $249/mo recurring (appSubscriptionCreate)
    Overage: $29/store usage charge (appUsageRecordCreate per additional store)
    Cap: $290 (10 extra stores max)

Store Management Flow:
  Agency owner adds store URL in "My Stores"
    -> POST /app/settings { _action: "add_store", shopDomain }
    -> Validate domain format
    -> Count existing managed stores
    -> If over 5: create usage record ($29)
    -> Insert StoreAssignment
    -> Return success

Usage Tracking:
  StoreAssignment count per primaryShop
    -> 5 or fewer: included in base price
    -> 6+: each additional store incurs $29 usage charge
    -> Usage charge created via appUsageRecordCreate on add
```

## Related Code Files

### Files to Create
- `app/components/store-management.tsx` — store list + add/remove UI (~90 lines)

### Files to Modify
- `prisma/schema.prisma` — add StoreAssignment model
- `app/services/billing.server.ts` — add multi-store helpers
- `app/services/billing-mutations.server.ts` — add usage record mutation
- `app/routes/app.settings.tsx` — add "My Stores" section (agency tier only)
- `app/routes/app.upgrade.tsx` — polish cancel flow, add period-end info
- `app/lib/plan-config.ts` — add AGENCY_INCLUDED_STORES, AGENCY_EXTRA_STORE_PRICE constants

## Implementation Steps

### Step 1: Add StoreAssignment Model

Add to `prisma/schema.prisma`:

```prisma
model StoreAssignment {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  primaryShop String
  managedShop String
  addedAt     DateTime @default(now())

  @@unique([primaryShop, managedShop])
  @@index([primaryShop])
}
```

Run `npx prisma db push`.

### Step 2: Add Agency Constants

Add to `app/lib/plan-config.ts`:

```typescript
export const AGENCY_INCLUDED_STORES = 5;
export const AGENCY_EXTRA_STORE_PRICE = 29;
export const AGENCY_USAGE_CAP = 290; // 10 extra stores max
```

### Step 3: Add Multi-Store Helpers to Billing Service

Add to `app/services/billing.server.ts`:

```typescript
import { AGENCY_INCLUDED_STORES } from "../lib/plan-config";

export async function getManagedStores(primaryShop: string) {
  return prisma.storeAssignment.findMany({
    where: { primaryShop },
    orderBy: { addedAt: "asc" },
  });
}

export async function getManagedStoreCount(primaryShop: string): Promise<number> {
  return prisma.storeAssignment.count({
    where: { primaryShop },
  });
}

export async function addManagedStore(primaryShop: string, managedShop: string) {
  // Validate: primary shop must be on agency tier
  const plan = await getShopPlan(primaryShop);
  if (plan.tier !== "agency") {
    throw new PlanLimitError("Multi-store management requires the Agency plan.");
  }

  // Check for duplicate
  const existing = await prisma.storeAssignment.findUnique({
    where: { primaryShop_managedShop: { primaryShop, managedShop } },
  });
  if (existing) {
    throw new Error("Store already managed.");
  }

  // Create assignment
  return prisma.storeAssignment.create({
    data: { primaryShop, managedShop },
  });
}

export async function removeManagedStore(primaryShop: string, managedShop: string) {
  return prisma.storeAssignment.delete({
    where: { primaryShop_managedShop: { primaryShop, managedShop } },
  });
}

export function isOverIncludedStores(storeCount: number): boolean {
  return storeCount > AGENCY_INCLUDED_STORES;
}
```

### Step 4: Add Usage Record Mutation

Add to `app/services/billing-mutations.server.ts`:

```typescript
export async function createUsageRecord(
  admin: AdminClient,
  subscriptionLineItemId: string,
  amount: number,
  description: string,
) {
  const response = await admin.graphql(
    `mutation usageRecordCreate($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
      appUsageRecordCreate(
        subscriptionLineItemId: $subscriptionLineItemId
        price: $price
        description: $description
      ) {
        appUsageRecord { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        subscriptionLineItemId,
        price: { amount, currencyCode: "USD" },
        description,
      },
    },
  );

  const json = await response.json();
  const result = json.data?.appUsageRecordCreate;
  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }
  return result?.appUsageRecord;
}
```

**Note:** Usage-based billing requires the subscription to have a usage line item. The `appSubscriptionCreate` for agency tier (Phase 2) must include both a recurring line item ($249) and a usage-based line item (capped at $290). The implementer should update the agency subscription creation in Phase 2's billing-mutations to include both line items.

### Step 5: Create Store Management Component

Create `app/components/store-management.tsx`:

```tsx
import { useFetcher } from "react-router";
import { AGENCY_INCLUDED_STORES } from "../lib/plan-config";

interface Store {
  id: string;
  managedShop: string;
  addedAt: string;
}

interface StoreManagementProps {
  stores: Store[];
  maxIncluded: number;
}

export function StoreManagement({ stores, maxIncluded }: StoreManagementProps) {
  const addFetcher = useFetcher();
  const removeFetcher = useFetcher();
  const isAdding = addFetcher.state !== "idle";

  const overIncluded = stores.length > maxIncluded;
  const extraCount = Math.max(0, stores.length - maxIncluded);

  return (
    <s-stack direction="block" gap="base">
      <s-stack direction="inline" gap="small">
        <s-text><strong>{stores.length} stores</strong></s-text>
        <s-badge tone={overIncluded ? "warning" : "info"}>
          {extraCount > 0 ? `${extraCount} extra ($${extraCount * 29}/mo)` : `${maxIncluded - stores.length} slots remaining`}
        </s-badge>
      </s-stack>

      {stores.map((store) => (
        <s-box key={store.id} padding="small" borderWidth="base" borderRadius="base">
          <s-stack direction="inline" gap="small">
            <s-text>{store.managedShop}</s-text>
            <s-button
              variant="secondary"
              onClick={() => {
                const fd = new FormData();
                fd.set("_action", "remove_store");
                fd.set("managedShop", store.managedShop);
                removeFetcher.submit(fd, { method: "post" });
              }}
            >
              Remove
            </s-button>
          </s-stack>
        </s-box>
      ))}

      <addFetcher.Form method="post">
        <input type="hidden" name="_action" value="add_store" />
        <s-stack direction="inline" gap="small">
          <s-text-field
            label="Add Store"
            name="managedShop"
            placeholder="store-name.myshopify.com"
          />
          <s-button
            variant="primary"
            type="submit"
            {...(isAdding ? { loading: true } : {})}
          >
            Add Store
          </s-button>
        </s-stack>
      </addFetcher.Form>
    </s-stack>
  );
}
```

### Step 6: Add Store Management to Settings Page

In `app/routes/app.settings.tsx`, conditionally render "My Stores" section when on agency tier:

```tsx
// In loader: add managed stores query
const managedStores = plan.tier === "agency"
  ? await getManagedStores(session.shop)
  : [];

// In component: render section
{currentTier === "agency" && (
  <s-section heading="My Stores">
    <StoreManagement
      stores={managedStores}
      maxIncluded={AGENCY_INCLUDED_STORES}
    />
  </s-section>
)}
```

Add action handlers for `add_store` and `remove_store` in the settings action function.

### Step 7: Polish Graceful Degradation Messages

Review all error responses across billing flows and ensure human-readable messages:

| Scenario | Message |
|----------|---------|
| Run limit hit | "You've used all 2 weekly runs on the Free plan. Upgrade to Starter for daily runs." |
| Agent limit hit | "Your Free plan allows 2 agents. Upgrade to enable more agents." |
| Trust level locked | "Autopilot mode requires the Pro plan. Upgrade to unlock automated actions." |
| Product limit exceeded | "Your store has more products than the Free plan supports. Upgrade for higher limits." |
| Subscription frozen | "Your subscription is paused. Please update your payment method in Shopify." |
| Trial expired | "Your 7-day trial has ended. Subscribe to continue using Pro features." |

### Step 8: A/B Testing Framework (Plan Only -- Do Not Implement)

Document the structure for future implementation:

```
Future A/B Testing Structure:
- Model: ABExperiment { id, name, variants: Json, startDate, endDate }
- Model: ABAssignment { id, shop, experimentId, variant, assignedAt }
- Service: ab-testing.server.ts { getVariant(shop, experimentName), trackConversion(shop, event) }
- Integration points: pricing page (layout variants), trial trigger (timing variants)
- Analytics: track conversion events (upgrade, trial_start, trial_convert) per variant
```

No code written for this -- just documented for future reference.

## Todo List

- [x] Add StoreAssignment model to `prisma/schema.prisma`
- [x] Run `npx prisma db push`
- [x] Add agency constants to `app/lib/plan-config.ts`
- [x] Add multi-store helpers to `app/services/billing.server.ts`
- [x] Add `createUsageRecord` to `app/services/billing-mutations.server.ts`
- [x] Create `app/components/store-management.tsx`
- [x] Add "My Stores" section to settings page (agency tier only)
- [x] Add `add_store` and `remove_store` action handlers to settings
- [x] Review and improve all error messages across billing flows
- [x] Document A/B testing framework structure (plan only)
- [x] Update Phase 2 billing-mutations to support agency usage-based line item
- [x] Run `npm run typecheck`
- [x] Test: agency tier can add/remove stores
- [x] Test: usage charge created when exceeding 5 stores
- [x] Test: non-agency tiers don't see "My Stores" section

## Success Criteria

- StoreAssignment model created and accessible
- Agency tier settings page shows "My Stores" section
- Can add/remove managed stores with validation
- Stores beyond 5 incur usage charge (or logged for manual billing)
- Non-agency tiers don't see multi-store section
- All error messages are human-readable with upgrade CTAs
- A/B testing structure documented (not implemented)
- No TypeScript errors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Usage-based line item ID not stored | High | Must store usage line item ID from subscription creation; update Phase 2 create flow |
| Managed store validation (invalid domains) | Low | Validate `*.myshopify.com` format before inserting |
| Agency owner uninstalls app | Medium | Cascade: delete StoreAssignments on app/uninstalled webhook |
| Usage cap exceeded | Low | Shopify enforces cap; createUsageRecord fails gracefully |
| Cross-shop auth for managed stores | High | Out of scope: Agency owner sees stats only for their own installed shop. Cross-shop features require separate app installs per managed shop. |

## Security Considerations

- Store management actions require authenticated admin session
- Only agency-tier shops can access store management actions
- managedShop domain validated before insertion
- Usage billing amounts set server-side from constants, not client input
- StoreAssignment deletion is soft (logged) for audit trail
- No cross-shop data access; each shop's data isolated

## Next Steps

- Post-launch: Implement A/B testing framework from documented structure
- Post-launch: Annual billing variants (17.24% discount)
- Post-launch: Email notifications for trial expiry, payment failures
- Post-launch: Admin dashboard for agency owners to view cross-store metrics
- Consider: Partner API integration for agency referral tracking
