# Code Review: Upgrade Page Built for Shopify Redesign

**Date:** 2026-03-05
**Reviewer:** code-reviewer agent
**Focus:** UI correctness, Polaris compliance, logic, code quality

## Scope

- Files: `app/components/plan-comparison-table.tsx` (103 LOC), `app/routes/app.upgrade.tsx` (135 LOC)
- Both are newly created files (not modifications of prior versions)
- Supporting context: `app/lib/plan-config.ts`, `app/services/billing.server.ts`, `app/routes/app.api.billing.subscribe.tsx`

## Overall Assessment

Clean, well-structured implementation. Both files are under the 200-line limit. Polaris web component usage is correct throughout -- no raw HTML elements found. Logic for upgrade/downgrade labels and button variants is sound. Two medium-priority gaps and a few low-priority observations noted below.

## Critical Issues

None.

## High Priority

### H1. Grid not responsive -- fixed 4-column layout will overflow on mobile

**File:** `app/components/plan-comparison-table.tsx:44`

The plan doc specifies responsive breakpoints:
```
gridTemplateColumns="@container (inline-size <= 500px) 1fr, @container (inline-size <= 800px) 1fr 1fr, 1fr 1fr 1fr 1fr"
```

Actual implementation uses a hard-coded `repeat(4, 1fr)`:
```tsx
<s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
```

On narrow Shopify admin viewports (mobile, half-screen), 4 equal columns will compress cards to an unreadable width. This was explicitly called out as Key Issue #1 in the plan ("4 plan cards in inline stack overflow on narrow screens") -- the redesign was supposed to fix this.

**Recommendation:** Use the responsive container query syntax from the plan, or at minimum a 2-column fallback. If `s-grid` does not support `@container` queries, wrap with a media-query CSS approach or use `minmax()`:
```tsx
gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
```

### H2. Usage metrics grid also not responsive

**File:** `app/routes/app.upgrade.tsx:106`

The `gridTemplateColumns="1fr auto 1fr auto 1fr"` layout with interleaved `s-divider direction="block"` columns works well on desktop but will squish on mobile. The dividers will consume columns on narrow screens where a stacked layout would be appropriate.

**Recommendation:** Consider `repeat(auto-fit, minmax(150px, 1fr))` and conditionally hide dividers, or accept that the admin sidebar provides minimum width. Document the intentional choice if this is acceptable.

## Medium Priority

### M1. `window.top!.location.href` -- non-null assertion on `window.top`

**File:** `app/routes/app.upgrade.tsx:38`

```tsx
window.top!.location.href = fetcherData.confirmationUrl;
```

The `!` non-null assertion is technically unsafe. In a cross-origin iframe scenario, `window.top` is accessible but accessing `.location.href` may throw a `DOMException` if the frame is sandboxed. For Shopify embedded apps using App Bridge, the standard pattern is `open(url, '_top')` or using the App Bridge `Redirect` utility.

However, this pattern exists already in the codebase and is consistent with the Shopify embedded app model where the app always runs in a same-origin iframe. Acceptable as-is, but adding a `try-catch` or using `window.open(url, '_top')` would be more defensive.

### M2. `fetcherData` cast is untyped from the action

**File:** `app/routes/app.upgrade.tsx:28-32`

```tsx
const fetcherData = subscribeFetcher.data as {
  confirmationUrl?: string;
  error?: string;
  cancelled?: boolean;
} | null;
```

This is a manual type assertion since the fetcher targets a different route (`/app/api/billing/subscribe`). The action can also return `{ success: true, cancelled: true }` -- the `success` field is not captured in the type. Not a bug (it goes unused), but the type could drift from the actual action return shape. Consider extracting a shared type.

### M3. Plan phase status not updated in `plan.md`

**File:** `plans/260305-2258-upgrade-page-built-for-shopify-redesign/plan.md:30-31`

Both phases are marked `TODO` in the plan overview table, but the individual phase files are marked `DONE`. The plan.md should be updated for consistency.

## Low Priority

### L1. `isSubmitting` disables ALL buttons simultaneously

**File:** `app/components/plan-comparison-table.tsx:92`

When any plan is being submitted, all non-current plan buttons show loading state. This is acceptable UX (prevents double-submit), but the user cannot visually distinguish which plan they clicked. A per-tier loading state would improve UX.

### L2. Missing `_action` field on non-cancel submit

**File:** `app/routes/app.upgrade.tsx:49-52`

The cancel path sends `{ _action: "cancel" }`, but the upgrade path sends `{ tier, trial }` without `_action`. The subscribe route action checks `actionType === "cancel"` first, then falls through. This works but deviates from the project convention of always including a hidden `_action` field for multi-action routes.

### L3. Trust level display could be more user-friendly

**File:** `app/components/plan-comparison-table.tsx:28`

```tsx
`Trust: ${limits.allowedTrustLevels.join(", ")}`
```

Produces `Trust: advisor` or `Trust: advisor, assistant, autopilot`. These are internal enum values. Consider capitalizing: `Advisor, Assistant, Autopilot`.

### L4. `getPlanFeatures` called inside render loop

**File:** `app/components/plan-comparison-table.tsx:52`

`getPlanFeatures(tier)` is called on every render for each tier. The function is lightweight (no side effects, just array construction), so this is fine performance-wise. Could be memoized with `useMemo` but not necessary at this scale.

## Edge Cases Found by Scout

### E1. Downgrade to Free when already on Free
If `currentTier` is `"free"` and user somehow triggers `handleSelectPlan("free")`, it submits a cancel action. The subscribe route handles this gracefully (no active subscription to cancel, just downgrades), so this is safe. However, the UI correctly prevents this since `isCurrent` shows a badge instead of a button.

### E2. `currentTier` mismatch with `TIER_ORDER`
If `currentTier` from the database contains an unexpected value (e.g., a stale tier name), `TIER_ORDER.indexOf(currentTier as PlanTier)` returns `-1`. This makes `currentIndex = -1`, so `isDowngrade` is always `false` for all tiers (every `tierIndex >= 0 > -1`). All buttons show "Upgrade". This is a safe degradation.

### E3. Concurrent subscription state
If a user opens the upgrade page and a webhook simultaneously changes their plan, the displayed `currentTier` could be stale. The page would show the old tier. This is inherent to server-rendered data and not a bug -- reloading the page shows the correct state. No action needed.

### E4. `success` query param persists on navigation
After a successful plan change, `?success=true` stays in the URL. If the user refreshes or bookmarks, the success banner keeps showing. Consider clearing the query param after displaying the banner (via `useEffect` + `navigate(pathname, { replace: true })`).

## Positive Observations

1. **Zero raw HTML** -- both files use Polaris web components exclusively
2. **Clean data/view separation** -- `getPlanFeatures()` and `formatLimit()` helpers keep render logic readable
3. **Correct badge tones** -- `"info"` for Popular, `"success"` for Current plan, `"critical"` for errors, `"success"` for success banners
4. **Proper breadcrumb slot** -- `<s-link slot="breadcrumb-actions">` follows the documented pattern
5. **Parallel data loading** -- `Promise.all([getShopPlan, getUsageSummary])` in the loader
6. **Idempotent redirect guard** -- `redirecting` state prevents double navigation
7. **Both files under 200 LOC** -- well within project size limits
8. **Button variant logic correct** -- `primary` only for recommended Pro, `secondary` for all others

## Recommended Actions

1. **[High]** Add responsive breakpoints to `s-grid` in plan comparison table
2. **[High]** Add responsive handling to usage metrics grid
3. **[Medium]** Update `plan.md` phase statuses from TODO to DONE
4. **[Low]** Capitalize trust level display strings
5. **[Low]** Clear `?success=true` query param after display
6. **[Low]** Add `_action` field to upgrade submit for convention consistency

## Metrics

- Type Coverage: Passes `tsc --noEmit` cleanly (no new errors)
- Lint: 0 new errors/warnings in reviewed files (27 pre-existing across codebase)
- Test Coverage: No tests for UI components (existing pattern -- no component tests in codebase)
- File Size: 103 LOC + 135 LOC = 238 LOC total (both under 200 individually)

## Unresolved Questions

1. Does `s-grid` in the current Shopify Polaris web components version support `@container` query syntax in `gridTemplateColumns`? If not, `repeat(auto-fit, minmax())` may be the only viable responsive approach.
2. The plan mentioned using `s-section` for cards ("renders as card in admin") but implementation uses `s-box` -- was this an intentional deviation? `s-box` with border props matches the existing codebase pattern.
