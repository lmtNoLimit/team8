# Upgrade Page - Built for Shopify Redesign

## Status: Complete

## Summary
Rebuild the `/app/upgrade` pricing page UI to comply with Built for Shopify (BFS) design guidelines. Current page uses basic `s-box` + `s-stack` layout that looks flat and doesn't follow Shopify admin design patterns.

## Key Issues with Current UI
1. **No responsive grid** - 4 plan cards in `s-stack direction="inline"` overflow on narrow screens
2. **Weak visual hierarchy** - plan names use `<strong>` inside `s-text`, no proper headings
3. **No recommended plan highlight** - all cards look identical
4. **Flat feature list** - plain `s-paragraph` for each feature, no structure
5. **Basic usage section** - doesn't follow metrics card pattern from Shopify docs
6. **Missing breadcrumb** - no back navigation to app home
7. **No page description** - missing context text

## Design Decisions
- Use `s-grid` with responsive `gridTemplateColumns` for 4 plan cards
- Each plan card = `s-section` (renders as card in admin)
- Highlight "Pro" as recommended plan with `s-badge tone="info"` + `Popular` label
- Feature list with structured `s-stack` items and checkmark text prefix
- Usage section follows Shopify metrics card pattern with `s-divider direction="block"`
- Add breadcrumb back to app home
- Add page subtitle explaining the page purpose

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Rebuild plan comparison table component | DONE | [phase-01](./phase-01-rebuild-plan-comparison-table.md) |
| 2 | Rebuild upgrade page route | DONE | [phase-02](./phase-02-rebuild-upgrade-page.md) |

## Files to Modify
- `app/components/plan-comparison-table.tsx` - complete rewrite
- `app/routes/app.upgrade.tsx` - update layout, usage section

## Files NOT Modified
- `app/lib/plan-config.ts` - data layer unchanged
- `app/services/billing.server.ts` - business logic unchanged
- `app/components/plan-usage-widget.tsx` - separate component, not part of this page
