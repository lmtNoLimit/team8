---
phase: 8
title: "Navigation Update"
status: pending
owner: Lead
effort: 10min
---

# Phase 8: Navigation Update

## Context Links
- Current layout: `app/routes/app.tsx`
- [Dashboard](./phase-06-secretary-dashboard-ui.md)
- [Agent Detail](./phase-07-agent-detail-page.md)

## Overview

Update the `app.tsx` layout to reflect Secretary branding and add navigation links for the agent detail pages.

## Related Code Files

**Modify:**
- `app/routes/app.tsx`

**Delete route (no longer needed):**
- `app/routes/app.additional.tsx` -- template placeholder

## Implementation Steps

### Step 1: Update `app/routes/app.tsx` navigation

Replace the current `<s-app-nav>` content:

```tsx
<s-app-nav>
  <s-link href="/app">Secretary Briefing</s-link>
  <s-link href="/app/agents/aeo">AEO Agent</s-link>
  <s-link href="/app/agents/content">Content Agent</s-link>
  <s-link href="/app/agents/schema">Schema Agent</s-link>
  <s-link href="/app/agents/inventory">Inventory Agent</s-link>
  <s-link href="/app/agents/storefront">Storefront Agent</s-link>
</s-app-nav>
```

### Step 2: Remove `app.additional.tsx`

Delete the template placeholder page. It's no longer relevant.

```bash
rm app/routes/app.additional.tsx
```

## Todo List

- [ ] Update `<s-app-nav>` in `app/routes/app.tsx`
- [ ] Delete `app/routes/app.additional.tsx`
- [ ] Run `npm run typecheck`
- [ ] Verify navigation works in embedded Shopify admin

## Success Criteria

- "Secretary Briefing" link navigates to `/app`
- Each agent link navigates to `/app/agents/:agentId`
- No broken navigation links
- Template placeholder page is removed

## Next Steps

Phase 9: Agent Developer Guide.
