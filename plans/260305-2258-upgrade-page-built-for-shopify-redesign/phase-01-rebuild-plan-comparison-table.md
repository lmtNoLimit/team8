# Phase 1: Rebuild Plan Comparison Table Component

## Status: DONE
## Priority: High
## File: `app/components/plan-comparison-table.tsx`

## Overview
Complete rewrite of `PlanComparisonTable` to follow Built for Shopify design patterns. Use `s-grid` for responsive layout, `s-section` for card appearance, proper heading hierarchy, and structured feature lists.

## Key Insights from BFS Research
- `s-section` at top level renders as card - use instead of `s-box` with manual border
- `s-grid` with responsive `gridTemplateColumns` handles mobile/desktop
- `s-heading` component not yet confirmed in app-home - use `s-text` with `<strong>` for headings (per project convention)
- Badge `tone="info"` for "Popular" label on recommended plan
- Buttons: `variant="primary"` only for recommended plan, `variant="secondary"` for others

## Architecture

### Layout Structure
```
s-grid (responsive 4 columns -> 2 columns -> 1 column)
  Plan Card (s-section) x4
    Header: Plan name + tagline + Popular badge (Pro only)
    Price: Large price display
    Divider
    Feature list (s-stack direction="block")
      Feature item x N (checkmark prefix)
    CTA button (primary for Pro, secondary for others)
```

### Responsive Grid
```
gridTemplateColumns="@container (inline-size <= 500px) 1fr, @container (inline-size <= 800px) 1fr 1fr, 1fr 1fr 1fr 1fr"
```

### Feature List Per Plan
Each plan shows a structured list with all relevant limits:
- Products limit
- Agents count
- Runs per week
- Trust levels
- Multi-store (Agency only)

### Button Logic
| State | Label | Variant |
|-------|-------|---------|
| Current plan | "Current plan" badge | No button |
| Recommended upgrade (Pro) | "Upgrade" | primary |
| Other upgrade | "Upgrade" | secondary |
| Downgrade | "Downgrade" | secondary |
| Submitting | loading spinner | - |

## Implementation Steps
1. Keep same props interface (`PlanComparisonTableProps`)
2. Add `PLAN_FEATURES` config mapping tier -> feature description strings
3. Replace `s-stack direction="inline"` with `s-grid` responsive layout
4. Each plan card: `s-box` with padding/border (nested inside grid)
5. Add "Popular" badge to Pro tier
6. Structure feature list with consistent formatting
7. Use `variant="primary"` button only for recommended (Pro) plan

## Success Criteria
- 4 plan cards displayed in responsive grid
- Cards have clear visual hierarchy (name, price, features, CTA)
- Pro plan has "Popular" badge
- Responsive: stacks to 2 columns then 1 column on narrow screens
- Current plan shows badge instead of button
- Upgrade/Downgrade labels correct based on current tier position
