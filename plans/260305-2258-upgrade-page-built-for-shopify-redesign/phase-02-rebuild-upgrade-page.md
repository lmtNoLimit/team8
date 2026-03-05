# Phase 2: Rebuild Upgrade Page Route

## Status: DONE
## Priority: High
## File: `app/routes/app.upgrade.tsx`

## Overview
Update the upgrade page layout to follow BFS patterns: add breadcrumb navigation, page description, and rebuild the usage section using the Shopify metrics card pattern.

## Implementation Steps

### 1. Add Breadcrumb Navigation
```tsx
<s-link slot="breadcrumb-actions" href="/app">Home</s-link>
```

### 2. Add Page Description
Below the heading, before plan cards, add context text explaining the page.

### 3. Rebuild Usage Section
Replace current basic boxes with a metrics card pattern (from Shopify docs):
- Single `s-section` containing an `s-grid` with `s-divider direction="block"` separators
- Each metric: label (s-text strong) + value (s-text) in a compact cell
- Responsive: 3 columns on desktop, stacks on mobile

### Current Usage Section Structure
```
s-section heading="Current Usage"
  s-grid (3 columns with dividers)
    Metric: Runs this week (value / limit)
    s-divider direction="block"
    Metric: Products (value / limit)
    s-divider direction="block"
    Metric: Agents (count available)
```

### 4. Keep Existing Logic
- Loader unchanged (getShopPlan, getUsageSummary)
- handleSelectPlan function unchanged
- Banner notifications unchanged
- Redirect logic unchanged

## Related Code Files
- `app/routes/app.upgrade.tsx` - modify
- `app/components/plan-comparison-table.tsx` - consumed here (modified in Phase 1)

## Success Criteria
- Breadcrumb "Home" links back to `/app`
- Page has descriptive subtitle text
- Usage metrics displayed in horizontal metrics card style with dividers
- All existing functionality preserved (subscribe, cancel, redirect, banners)
- Page layout uses `inlineSize="base"` (narrow, form-like - appropriate for plan selection)
