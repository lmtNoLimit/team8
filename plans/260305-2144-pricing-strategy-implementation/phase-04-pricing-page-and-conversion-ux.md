# Phase 4: Pricing Page and Conversion UX

## Context Links

- [Plan Overview](plan.md)
- [Phase 1: DB Schema + Plan Service](phase-01-db-schema-and-plan-service.md)
- [Phase 2: Shopify Billing Integration](phase-02-shopify-billing-integration.md)
- [Phase 3: Agent Trust Level Gating](phase-03-agent-trust-level-gating.md)
- Dashboard: `app/routes/app._index.tsx`
- App layout: `app/routes/app.tsx`
- Settings page: `app/routes/app.settings.tsx`
- Subscribe route: `app/routes/app.api.billing.subscribe.tsx` (Phase 2)
- Billing service: `app/services/billing.server.ts` (Phase 1)

## Overview

- **Priority:** P2
- **Status:** completed
- **Effort:** 8h
- **Depends on:** Phases 1-3 (billing service, subscription creation, feature gating)
- **Description:** Build pricing/upgrade page, contextual upsell modals, dashboard usage widget, and 7-day trial trigger. This is the conversion UX layer that drives free-to-paid upgrades.

## Key Insights

- Never paywall Day 1. Let merchants see 20+ findings before first upgrade prompt.
- Hybrid model: freemium (no CC) + contextual trial after "wow moment"
- Target 9% free-to-paid conversion rate
- Trigger points: feature lock (trust level), run limit hit, product limit hit
- Usage widget: always-visible in dashboard sidebar showing consumption vs limits
- Polaris web components only. No `<s-tabs>` in app home context. Use `<s-section>` blocks.
- `<s-badge>`, `<s-banner>`, `<s-button>` for CTAs
- Pricing page must work as both standalone `/app/upgrade` and as target for redirect after limit hit

## Requirements

### Functional
1. `/app/upgrade` route: plan comparison table with current plan highlighted
2. Upgrade button triggers POST to `/app/api/billing/subscribe`, then redirects to confirmationUrl
3. Downgrade button (from paid to free) triggers subscription cancel + confirms
4. Success/error banners on return from Shopify billing flow (via URL params)
5. Contextual upgrade modal: shown when user hits a plan limit (run limit, trust level, agent count)
6. Usage widget in dashboard sidebar: shows runs used/limit, products, agents enabled/limit
7. 7-day trial offer: shown after merchant accumulates 20+ findings, not before
8. "Upgrade" nav link in `<s-app-nav>`
9. Current plan + billing info section in settings page

### Non-Functional
- Pricing page renders in <500ms (static tier data + 1 DB query for current plan)
- Modal doesn't block navigation; dismissible
- Usage widget data loaded in dashboard loader (no separate API call)
- Responsive within Shopify admin iframe constraints

## Architecture

```
Pricing Page Data Flow:
  GET /app/upgrade
    -> loader: getShopPlan(shop) + getUsageSummary(shop)
    -> Render: PlanComparisonTable + currentPlan badge + success/error banners

Upgrade Flow:
  User clicks "Upgrade to Starter"
    -> fetcher.submit({ tier: "starter" }, { action: "/app/api/billing/subscribe" })
    -> Response: { confirmationUrl }
    -> window.top.location.href = confirmationUrl  (redirect in parent frame)
    -> Shopify billing approval
    -> Redirect to /app/api/billing/callback
    -> Redirect to /app/upgrade?success=true

Contextual Upsell Flow:
  User hits limit (e.g., tries to run agents, gets 403)
    -> Response includes { error, upgradeUrl: "/app/upgrade" }
    -> Frontend shows UpgradeModal with reason + CTA
    -> User clicks "View Plans" -> navigates to /app/upgrade

Usage Widget:
  Dashboard loader:
    -> getUsageSummary(shop)
    -> Return { usage: { tier, runsUsed, runsLimit, productCount, ... } }
  Sidebar renders PlanUsageWidget
```

## Related Code Files

### Files to Create
- `app/routes/app.upgrade.tsx` — pricing page (~180 lines)
- `app/components/plan-usage-widget.tsx` — sidebar usage widget (~80 lines)
- `app/components/upgrade-modal.tsx` — contextual upsell modal (~70 lines)
- `app/components/plan-comparison-table.tsx` — reusable plan grid (~100 lines)

### Files to Modify
- `app/routes/app._index.tsx` — add usage widget to sidebar, add trial banner
- `app/routes/app.tsx` — add "Upgrade" link to `<s-app-nav>`
- `app/routes/app.settings.tsx` — add "Current Plan" section
- `app/routes/app.agents._index.tsx` — show upgrade modal on run-limit 403

## Implementation Steps

### Step 1: Add Upgrade Nav Link

Update `app/routes/app.tsx`:

```tsx
<s-app-nav>
  <s-link href="/app/agents">My Team</s-link>
  <s-link href="/app/upgrade">Upgrade</s-link>
  <s-link href="/app/settings">Settings</s-link>
</s-app-nav>
```

### Step 2: Create Plan Comparison Table Component

Create `app/components/plan-comparison-table.tsx`:

```tsx
import { PLAN_LIMITS, type PlanTier } from "../lib/plan-config";

interface PlanComparisonTableProps {
  currentTier: string;
  onSelectPlan: (tier: PlanTier) => void;
  isSubmitting: boolean;
}

const TIERS: { tier: PlanTier; name: string; tagline: string }[] = [
  { tier: "free", name: "Free", tagline: "Get started" },
  { tier: "starter", name: "Starter", tagline: "Growing stores" },
  { tier: "pro", name: "Pro", tagline: "Serious sellers" },
  { tier: "agency", name: "Agency", tagline: "Multi-store pros" },
];

export function PlanComparisonTable({ currentTier, onSelectPlan, isSubmitting }: PlanComparisonTableProps) {
  return (
    <s-stack direction="inline" gap="base">
      {TIERS.map(({ tier, name, tagline }) => {
        const limits = PLAN_LIMITS[tier];
        const isCurrent = tier === currentTier;
        const isDowngrade = /* compare tier index */ false;

        return (
          <s-box key={tier} padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text><strong>{name}</strong></s-text>
              <s-text>{tagline}</s-text>
              <s-text><strong>${limits.price}/mo</strong></s-text>
              <s-paragraph>{limits.maxProducts === -1 ? "Unlimited" : limits.maxProducts} products</s-paragraph>
              <s-paragraph>{limits.maxAgents} agents</s-paragraph>
              <s-paragraph>{limits.maxRunsPerWeek === -1 ? "Unlimited" : limits.maxRunsPerWeek} runs/week</s-paragraph>
              <s-paragraph>Trust: {limits.allowedTrustLevels.join(", ")}</s-paragraph>
              {isCurrent ? (
                <s-badge tone="info">Current Plan</s-badge>
              ) : (
                <s-button
                  variant="primary"
                  onClick={() => onSelectPlan(tier)}
                  {...(isSubmitting ? { loading: true } : {})}
                >
                  {tier === "free" ? "Downgrade" : "Upgrade"}
                </s-button>
              )}
            </s-stack>
          </s-box>
        );
      })}
    </s-stack>
  );
}
```

**Note:** This is a conceptual skeleton. The implementer should finalize layout, highlight current plan with visual distinction, and handle the tier index comparison for upgrade/downgrade labels.

### Step 3: Create Pricing Page Route

Create `app/routes/app.upgrade.tsx`:

```tsx
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { getShopPlan, getUsageSummary } from "../services/billing.server";
import { PlanComparisonTable } from "../components/plan-comparison-table";
import type { PlanTier } from "../lib/plan-config";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [plan, usage] = await Promise.all([
    getShopPlan(session.shop),
    getUsageSummary(session.shop),
  ]);
  return { currentTier: plan.tier, usage };
};

export default function UpgradePage() {
  const { currentTier, usage } = useLoaderData<typeof loader>();
  const subscribeFetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");
  const isSubmitting = subscribeFetcher.state !== "idle";

  // Handle redirect to Shopify billing
  const fetcherData = subscribeFetcher.data as { confirmationUrl?: string; error?: string } | null;
  if (fetcherData?.confirmationUrl) {
    // Must redirect in parent frame for Shopify billing
    window.top!.location.href = fetcherData.confirmationUrl;
  }

  function handleSelectPlan(tier: PlanTier) {
    if (tier === "free") {
      // Downgrade: POST to cancel route
      subscribeFetcher.submit(
        { _action: "cancel" },
        { method: "POST", action: "/app/api/billing/subscribe" },
      );
    } else {
      subscribeFetcher.submit(
        { tier, trial: "false" },
        { method: "POST", action: "/app/api/billing/subscribe" },
      );
    }
  }

  return (
    <s-page heading="Choose Your Plan">
      {success && (
        <s-banner tone="success">
          Plan updated successfully! Your new features are now active.
        </s-banner>
      )}
      {error && (
        <s-banner tone="critical">
          Something went wrong: {error}. Please try again.
        </s-banner>
      )}
      {fetcherData?.error && (
        <s-banner tone="critical">{fetcherData.error}</s-banner>
      )}

      <PlanComparisonTable
        currentTier={currentTier}
        onSelectPlan={handleSelectPlan}
        isSubmitting={isSubmitting}
      />

      <s-section heading="Current Usage">
        {/* Summary of current consumption */}
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>Runs this week</strong></s-text>
            <s-paragraph>
              {usage.runsUsed} / {usage.limits.maxRunsPerWeek === -1 ? "Unlimited" : usage.limits.maxRunsPerWeek}
            </s-paragraph>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text><strong>Products</strong></s-text>
            <s-paragraph>
              {usage.productCount} / {usage.limits.maxProducts === -1 ? "Unlimited" : usage.limits.maxProducts}
            </s-paragraph>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
```

### Step 4: Create Usage Widget Component

Create `app/components/plan-usage-widget.tsx`:

```tsx
interface UsageData {
  tier: string;
  runsUsed: number;
  limits: { maxRunsPerWeek: number; maxProducts: number; maxAgents: number };
  productCount: number;
}

interface PlanUsageWidgetProps {
  usage: UsageData;
  enabledAgentCount: number;
}

export function PlanUsageWidget({ usage, enabledAgentCount }: PlanUsageWidgetProps) {
  const { tier, runsUsed, limits, productCount } = usage;
  const runsLabel = limits.maxRunsPerWeek === -1 ? "Unlimited" : `${runsUsed}/${limits.maxRunsPerWeek}`;
  const productsLabel = limits.maxProducts === -1 ? "Unlimited" : `${productCount}/${limits.maxProducts}`;
  const agentsLabel = `${enabledAgentCount}/${limits.maxAgents}`;

  // Determine tone based on usage percentage
  const runsPercent = limits.maxRunsPerWeek === -1 ? 0 : (runsUsed / limits.maxRunsPerWeek) * 100;
  const runsTone = runsPercent >= 100 ? "critical" : runsPercent >= 75 ? "warning" : "info";

  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small">
        <s-stack direction="inline" gap="small">
          <s-text><strong>Plan:</strong></s-text>
          <s-badge tone="info">{tier.charAt(0).toUpperCase() + tier.slice(1)}</s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Runs:</s-text>
          <s-badge tone={runsTone}>{runsLabel}</s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Products:</s-text>
          <s-badge>{productsLabel}</s-badge>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-text>Agents:</s-text>
          <s-badge>{agentsLabel}</s-badge>
        </s-stack>
        {tier === "free" && (
          <s-button variant="primary" href="/app/upgrade">
            Upgrade
          </s-button>
        )}
      </s-stack>
    </s-box>
  );
}
```

### Step 5: Create Upgrade Modal Component

Create `app/components/upgrade-modal.tsx`:

```tsx
import { useNavigate } from "react-router";

interface UpgradeModalProps {
  reason: string;
  onDismiss: () => void;
}

export function UpgradeModal({ reason, onDismiss }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <s-box padding="large" borderWidth="base" borderRadius="large">
      <s-stack direction="block" gap="base">
        <s-text><strong>Upgrade Required</strong></s-text>
        <s-paragraph>{reason}</s-paragraph>
        <s-stack direction="inline" gap="small">
          <s-button variant="primary" onClick={() => navigate("/app/upgrade")}>
            View Plans
          </s-button>
          <s-button onClick={onDismiss}>
            Maybe Later
          </s-button>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
```

**Note:** Polaris App Home does not have a native modal component. This renders as an inline box. The implementer may wrap in a banner or overlay pattern depending on what's available. A `<s-banner>` with dismissible behavior may be more practical.

### Step 6: Update Dashboard with Usage Widget

Update `app/routes/app._index.tsx` loader:

```typescript
import { getUsageSummary } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [findings, enabledIds, usage] = await Promise.all([
    getFindings(session.shop),
    getEnabledAgentIds(session.shop),
    getUsageSummary(session.shop),
  ]);
  // ... existing grouping logic ...
  return { grouped, agentCount: enabledIds.length, usage };
};
```

Add to the sidebar `slot="aside"`:

```tsx
import { PlanUsageWidget } from "../components/plan-usage-widget";

// In the JSX, replace or augment "My Team" aside section:
<s-section slot="aside" heading="Plan & Usage">
  <PlanUsageWidget usage={usage} enabledAgentCount={agentCount} />
</s-section>
```

### Step 7: Handle Run-Limit 403 in Dashboard

When "Run All Agents" returns 403, show the upgrade reason inline:

```tsx
// In SecretaryDashboard component:
const runResult = runAllFetcher.data as { success?: boolean; error?: string; upgradeUrl?: string } | null;

{runResult && !runResult.success && (
  <s-banner tone="warning">
    {runResult.error}{" "}
    <s-link href={runResult.upgradeUrl || "/app/upgrade"}>View upgrade options</s-link>
  </s-banner>
)}
```

### Step 8: Trial Trigger Logic

Add to `app/services/billing.server.ts`:

```typescript
/**
 * Check if shop qualifies for trial prompt.
 * Criteria: free tier, 20+ findings, never had a trial before.
 */
export async function shouldOfferTrial(shop: string): Promise<boolean> {
  const plan = await getShopPlan(shop);
  if (plan.tier !== "free") return false;
  if (plan.trialEndsAt) return false; // Already had/has trial

  const findingsCount = await prisma.agentFinding.count({
    where: { shop },
  });
  return findingsCount >= 20;
}
```

Dashboard loader adds `showTrialOffer` boolean, and renders a banner:

```tsx
{showTrialOffer && (
  <s-banner tone="success">
    Your agents have found {totalFindings} items! Start a free 7-day Pro trial to unlock all features.{" "}
    <s-link href="/app/upgrade?trial=true">Start Trial</s-link>
  </s-banner>
)}
```

### Step 9: Update Settings Page with Plan Info

Add a "Current Plan" section at the top of settings:

```tsx
<s-section heading="Current Plan">
  <s-stack direction="inline" gap="small">
    <s-badge tone="info">{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</s-badge>
    <s-button href="/app/upgrade">Manage Plan</s-button>
  </s-stack>
</s-section>
```

## Todo List

- [x] Add "Upgrade" link to `<s-app-nav>` in `app/routes/app.tsx`
- [x] Create `app/components/plan-comparison-table.tsx`
- [x] Create `app/routes/app.upgrade.tsx` with loader + component
- [x] Create `app/components/plan-usage-widget.tsx`
- [x] Create `app/components/upgrade-modal.tsx`
- [x] Update dashboard loader to include `getUsageSummary()`
- [x] Add `PlanUsageWidget` to dashboard sidebar
- [x] Add 403 handling for run-limit in dashboard
- [x] Add `shouldOfferTrial()` to billing service
- [x] Add trial banner to dashboard
- [x] Add "Current Plan" section to settings page
- [x] Handle `window.top.location.href` redirect for Shopify billing
- [x] Run `npm run typecheck`
- [x] Test: pricing page renders with correct current plan
- [x] Test: upgrade button redirects to Shopify billing
- [x] Test: success banner shows after successful upgrade
- [x] Test: usage widget shows correct values

## Success Criteria

- `/app/upgrade` renders plan comparison with current plan highlighted
- Clicking "Upgrade to Starter" redirects to Shopify billing approval
- After approval, `/app/upgrade?success=true` shows success banner
- Dashboard sidebar shows usage widget with runs/products/agents
- Run-limit 403 shows inline upgrade prompt (not generic error)
- Trial banner appears after 20+ findings for free-tier shops
- "Upgrade" link visible in app navigation
- Settings page shows current plan badge
- All TypeScript types pass
- All components under 200 lines

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| `window.top` blocked by CSP | High | Shopify embedded apps should allow this for billing redirects; test on real admin |
| Polaris web components layout limitations | Medium | Use `<s-stack direction="inline">` for card grid; may need CSS for responsive |
| Trial offer shown too aggressively | Low | Only after 20+ findings AND free tier AND never had trial |
| User clicks upgrade during in-progress run | Low | Billing flow is separate from agent execution; no conflict |
| Stale usage data after plan change | Low | Dashboard reloads on navigation; usage loader fetches fresh data |

## Security Considerations

- Upgrade page requires `authenticate.admin(request)` -- no unauthenticated access
- Plan tier displayed from server-side DB -- not from URL or client state
- Subscribe action validates tier param server-side before creating subscription
- Billing redirect URL (confirmationUrl) comes from Shopify API, not user input
- Trial eligibility checked server-side; client cannot force trial activation

## Next Steps

- Phase 5 extends pricing page with Agency tier multi-store management
- Post-launch: A/B testing framework for conversion optimization (out of scope for now)
- Post-launch: email notification for trial expiry (needs email integration)
