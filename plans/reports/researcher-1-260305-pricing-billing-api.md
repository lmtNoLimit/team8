# Shopify Billing API Research Report
**Researcher:** researcher-1 | **Date:** 2026-03-05 | **Project:** AI Store Secretary (Storekeeper) - 4-Tier Pricing Model

## Executive Summary

Shopify's GraphQL Admin API provides a robust billing system capable of implementing the proposed 4-tier pricing model (Free/$0, Starter/$29, Pro/$99, Agency/$249+). The system supports recurring charges (30-day and annual), usage-based charges, trial periods, plan upgrades/downgrades with automatic proration, and billing webhooks. Key considerations: (1) Free tier requires custom database tracking—no subscription object created; (2) Shopify takes 15% revenue share (changed Jan 2025 from annual reset); (3) Per-store pricing in Agency tier uses usage-based charges; (4) Plan changes trigger automatic merchant approval flow.

## 1. Shopify App Subscriptions API Architecture

### 1.1 Core Billing Mutation

**GraphQL Mutation:** `appSubscriptionCreate`

**Required Parameters:**
- `name` (String!): Subscription plan name
- `lineItems` (AppSubscriptionLineItemInput!): Pricing structure array
- `returnUrl` (URL!): Redirect after merchant approval

**Optional Parameters:**
- `trialDays` (Int): Days before first charge (max 1000 days)
- `replacementBehavior` (AppSubscriptionReplacementBehavior): Handles existing subscriptions
  - `STANDARD` (default): Cancel old, activate new after approval
  - `ACCRUED_DEFERRED`: Defer new plan until current cycle ends
  - `ACCRUED_IMMEDIATELY`: Charge difference immediately (for upgrades)
- `test` (Boolean): Test mode for development stores

**Response:**
- `appSubscription`: Created subscription object
- `confirmationUrl`: Merchant approval page (required step before billing)
- `userErrors`: Validation errors array

### 1.2 Subscription Line Items (Pricing Plans)

Multiple pricing models per subscription:

**Time-Based (Recurring):**
```graphql
lineItems: [{
  plan: {
    appRecurringPricingDetails: {
      price: { amount: "29.00", currencyCode: "USD" }
      interval: EVERY_30_DAYS | ANNUAL
    }
  }
}]
```

**Usage-Based:**
```graphql
lineItems: [{
  plan: {
    appUsagePricingDetails: {
      cappedAmount: { amount: "100.00", currencyCode: "USD" }
    }
  }
}]
```

**Combined (Recurring + Usage):**
```graphql
lineItems: [{
  plan: {
    appRecurringPricingDetails: { ... },
    appUsagePricingDetails: { ... }
  }
}]
```

### 1.3 Line Item Updates

**Mutation:** `appSubscriptionLineItemUpdate`
- Updates usage cap mid-subscription (requires merchant re-approval)
- Use case: Agency tier store count increase → higher usage cap
- Returns confirmation URL for merchant approval

## 2. Implementation Strategy for 4-Tier Model

### 2.1 Tier Structure

| Tier | Price (Monthly) | Price (Annual) | Billing | Usage | Notes |
|------|---|---|---|---|---|
| Free | $0 | N/A | None | Unlimited | No subscription object; DB tracking only |
| Starter | $29 | $24/mo ($288/yr) | Fixed/30-day | Limited | Single plan entry point |
| Pro | $99 | $79/mo ($948/yr) | Fixed/30-day | Extended | Feature upsell |
| Agency | $249 | $199/mo ($2,388/yr) | Fixed + Usage | Full | Base + $29/store usage-based |

### 2.2 Free Tier Implementation (Critical Difference)

Shopify's billing API doesn't support $0 subscriptions. Best practice:

1. **No subscription object created** for free tier
2. **Custom database tracking:**
   - Store merchant subscription tier in app's database
   - Default to "free" tier on app install
   - Use `billing.check()` (not `billing.require()`) to validate plan status
3. **Transition handling:**
   - When merchant upgrades from free → paid: Create new subscription via `appSubscriptionCreate`
   - Shopify auto-approves subsequent plan changes (no new confirmation needed)

### 2.3 Annual vs. Monthly Billing

Implement as separate subscriptions:

**Option A (Recommended): Single subscription with discount**
```graphql
lineItems: [{
  plan: {
    appRecurringPricingDetails: {
      price: { amount: "29.00", currencyCode: "USD" },
      interval: EVERY_30_DAYS
    }
  },
  discount: {
    value: { percentage: 17.24 } // 5 months free at monthly rate
    durationLimitType: FOREVER // Annual discount
  }
}]
```
vs.
```graphql
lineItems: [{
  plan: {
    appRecurringPricingDetails: {
      price: { amount: "288.00", currencyCode: "USD" },
      interval: ANNUAL
    }
  }
}]
```

**Option B: Merchant chooses billing interval at upgrade**
- Prompt UI: "Pay monthly ($29) or annual ($288, save $60)"
- Create separate confirmation URLs for each option
- Merchant selects, then approves via Shopify's flow

### 2.4 Agency Tier Per-Store Pricing

**Base Subscription:** $249/month recurring
```graphql
{
  plan: {
    appRecurringPricingDetails: {
      price: { amount: "249.00", currencyCode: "USD" },
      interval: EVERY_30_DAYS
    }
  }
}
```

**Per-Store Usage:** $29 per additional store
```graphql
{
  plan: {
    appUsagePricingDetails: {
      cappedAmount: { amount: "X.00", currencyCode: "USD" }
    }
  }
}
```

**Implementation Flow:**
1. User upgrades to Agency tier: Create subscription with recurring $249 + usage cap $29
2. User connects additional stores:
   - Calculate: `storeCount × $29`
   - Call `appSubscriptionLineItemUpdate` to increase usage cap
   - Shopify sends merchant approval page
3. Month-end: Shopify bills recurring $249 + actual usage (up to capped amount)

## 3. Plan Upgrade/Downgrade & Proration

### 3.1 Automatic Proration Rules

**Upgrade (e.g., Starter $29 → Pro $99 on day 15 of 30):**
- Calculate: Days remaining = 15, Price increase = $70
- Prorated charge = $70 × (15 ÷ 30) = $35
- **Timing:** Immediate with `replacementBehavior: ACCRUED_IMMEDIATELY`

**Downgrade (e.g., Pro $99 → Starter $29 on day 15):**
- Calculate: Days remaining = 15, Savings = $70
- Prorated credit = $70 × (15 ÷ 30) = $35
- **Timing:** Applied to next invoice as credit (Shopify handles automatically)

**Deferred Changes** (no immediate charge):
- Annual → Annual downgrade: Deferred until next cycle
- Annual → Monthly: Deferred until annual cycle ends
- Different discount configurations: Deferred until cycle ends

### 3.2 Plan Change Flow

```
Merchant clicks "Upgrade"
  ↓
App calls appSubscriptionCreate with new plan + existing subscription ID
  ↓
Shopify cancels old subscription
  ↓
Shopify sends merchant to approval page
  ↓
Merchant approves
  ↓
New subscription becomes ACTIVE
  ↓
Proration applied to current or next invoice
```

**Key Insight:** Don't manually issue credits after downgrade. Shopify handles it automatically. Check Partner Dashboard payouts to verify prorated credits issued.

## 4. Billing Webhooks & Status Management

### 4.1 Essential Webhooks

**Topic:** `app_subscriptions/update`
- Fired when: subscription created, updated, cancelled, frozen, declined
- Payload includes: subscription ID, billing cycle dates, status, charges
- **Configure in `shopify.app.toml`:**
```toml
[[webhooks.subscriptions]]
topics = ["app_subscriptions/update"]
uri = "https://example.com/webhooks/app-subscriptions"
```

**Common Status Values:**
- `ACTIVE`: Billing in effect
- `PENDING`: Awaiting merchant approval (show UI message)
- `DECLINED`: Merchant rejected charges (offer retry or downgrade)
- `FROZEN`: Billing paused (e.g., payment failure)
- `CANCELLED`: Merchant unsubscribed (fallback to free tier)

### 4.2 Webhook Implementation Pattern

```typescript
// Handler receives subscription data
export async function handleAppSubscriptionUpdate(subscription) {
  const { id, status, currentPeriodEnd, lineItems } = subscription;

  // Update merchant record in database
  await db.merchant.update({
    shopId: extractShopIdFromSubscriptionId(id),
    currentSubscriptionStatus: status,
    nextBillingDate: currentPeriodEnd,
    features: deriveFeatureAccessFromLineItems(lineItems)
  });

  // Handle status changes
  switch (status) {
    case 'PENDING':
      // Show "awaiting approval" UI
      break;
    case 'DECLINED':
      // Downgrade to free tier or show retry dialog
      break;
    case 'FROZEN':
      // Disable features temporarily
      break;
    case 'CANCELLED':
      // Restore free tier, clear premium data if needed
      break;
  }
}
```

## 5. Revenue Share & Payout Structure (Updated 2025)

### 5.1 Shopify Commission Changes

**Effective January 1, 2025:**
- Standard rate: **15%** commission on gross revenue (changed from 20%)
- Lifetime exemption: First **$1M USD lifetime revenue** (not annual)
- High-revenue cap: Companies >$20M annual or >$100M gross not eligible for exemption

**Example Net Margins (assuming $0 to $1M cumulative):**
- Starter tier ($29): Developer receives $24.65 (85%)
- Pro tier ($99): Developer receives $84.15 (85%)
- Agency base ($249): Developer receives $211.65 (85%)
- Per-store usage ($29): Developer receives $24.65 (85%)

**Post-$1M Threshold:** 15% applies to all revenue → Net margin drops to 85% overall

### 5.2 Payout Timing

- Charges collected by Shopify
- Payouts via PayPal (Shopify handles)
- Payout cycle: Typically 2-4 weeks after billing
- Check Partner Dashboard earnings reports for per-store breakdown

## 6. Trial Periods & Onboarding

### 6.1 Trial Implementation

**Feature:** `trialDays` parameter in `appSubscriptionCreate`
- Range: 1 to 1,000 days
- Behavior: Subscription created, but billing deferred until trial ends
- Best for: 7-14 day free trial before first charge
- Limitation: Can't add trial to existing subscriptions (would require cancel + recreate)

**Example (14-day Starter trial):**
```graphql
mutation {
  appSubscriptionCreate(input: {
    name: "Starter Plan"
    returnUrl: "https://example.com/pricing/confirmation"
    trialDays: 14
    lineItems: [{
      plan: {
        appRecurringPricingDetails: {
          price: { amount: "29.00", currencyCode: "USD" }
          interval: EVERY_30_DAYS
        }
      }
    }]
  }) {
    confirmationUrl
    appSubscription {
      id
    }
  }
}
```

### 6.2 Trial Extension

**Mutation:** `appSubscriptionTrialExtend`
- Extend active trial by 1-1,000 days
- Use case: Re-engage churning users mid-trial
- Requires subscription ID, doesn't need merchant re-approval

## 7. API Scopes Required

**Minimal required scope:**
- `billing` — Create, update, cancel subscriptions and record usage charges

**Recommended additional scopes for feature gating:**
- `read_products` — Fetch SKU list for plan mapping
- `read_subscriptions` — Query subscription history

## 8. Critical Implementation Checklist

- [ ] Add `billing` scope to `shopify.app.toml`
- [ ] Configure `app_subscriptions/update` webhook endpoint
- [ ] Database schema: `merchants` table with `subscriptionTier`, `subscriptionId`, `subscriptionStatus`, `trialEndsAt`
- [ ] Free tier logic: `billing.check()` instead of `billing.require()` for apps with freemium
- [ ] Plan selector UI: Show monthly vs. annual pricing with clear savings messaging
- [ ] Upgrade/downgrade routes: Accept plan ID, create new subscription via GraphQL, handle confirmation URL
- [ ] Error handling: Capture `userErrors` from mutations, retry failed API calls with exponential backoff
- [ ] Test mode: Use `test: true` flag in `appSubscriptionCreate` for dev stores (no real charges)
- [ ] Webhook signature verification: Validate `X-Shopify-Webhook-Id` header before processing
- [ ] Stripe/payment fallback: Consider secondary payment processor for non-Shopify app distribution

## 9. Key Findings & Recommendations

### 9.1 Best Practices Identified

1. **Freemium Model:** Implement free tier via DB tracking + `billing.check()`, not as $0 subscription
2. **Annual Discounts:** Use discount field with `FOREVER` duration; cleaner than separate subscriptions
3. **Upgrade UX:** Offer both monthly/annual at upgrade time; let merchant choose (easier than manual payment flow)
4. **Agency Tier:** Combine recurring $249 + usage-based $29 per store in single subscription for simplicity
5. **Proration:** Trust Shopify's automatic proration; avoid manual credit logic (risk of double-crediting)
6. **Trial Strategy:** Offer 7-14 day trial on Starter/Pro; skip for Agency (B2B buyers expect direct payment)

### 9.2 Architectural Recommendations

**Subscription Tracking:**
```typescript
interface MerchantSubscription {
  shopId: string;
  subscriptionId?: string; // null if free tier
  subscriptionStatus: 'PENDING' | 'ACTIVE' | 'DECLINING' | 'FROZEN' | 'CANCELLED';
  currentTier: 'FREE' | 'STARTER' | 'PRO' | 'AGENCY';
  connectedStores: number; // For Agency tier usage calculation
  billingCycle: { startDate: Date; endDate: Date };
  createdAt: Date;
  updatedAt: Date;
}
```

**Feature Gate Logic:**
```typescript
const tierFeatures = {
  FREE: ['dashboard', 'basic_analytics'],
  STARTER: ['dashboard', 'analytics', 'email_campaigns', 'max_3_agents'],
  PRO: ['dashboard', 'analytics', 'email', 'unlimited_agents', 'api_access'],
  AGENCY: ['*', 'multi_store', 'dedicated_support', 'custom_agents']
};

// In route loaders: await verifyAccess(shop, requiredFeature)
```

### 9.3 Unresolved Questions

1. **Free vs. Paid Transition UX:** Should free users see a hard paywall or a soft upgrade prompt? Need to define conversion funnel.
2. **Trial-to-Paid Conversion:** What happens if merchant declines subscription after trial? Auto-downgrade to free or force uninstall?
3. **Multi-Store Billing Complexity:** For agencies, should platform bill per store or have lead merchant as billing contact? Affects usage tracking.
4. **Tax Calculation:** Shopify doesn't calculate sales tax in app charges. Need external tax service (e.g., TaxJar) or accept flat rate?
5. **Cancellation Flow:** Should app auto-disable features immediately on cancellation webhook, or allow grace period?

---

## Sources
- [Shopify App Subscriptions API - appSubscriptionCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptioncreate)
- [About Subscription Billing](https://shopify.dev/docs/apps/launch/billing/subscription-billing)
- [Create Time-Based Subscriptions](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-time-based-subscriptions)
- [Create Usage-Based Subscriptions](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)
- [AppSubscriptionLineItemUpdate Mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appsubscriptionlineitemupdate)
- [Revenue Share for Shopify App Store Developers](https://shopify.dev/docs/apps/launch/distribution/revenue-share)
- [Offer Free Trials](https://shopify.dev/docs/apps/launch/billing/offer-free-trials)
- [GitHub: Handling Free Tiers with Billing API](https://github.com/Shopify/shopify-app-template-remix/issues/431)
