# Planner Agent Memory

## Project: team8 (AI Secretary Shopify App)

### Architecture
- Shopify embedded app using React Router v7 with flat file-system routes (`flatRoutes()`)
- Prisma + MongoDB Atlas (uses `prisma db push`, no migrations)
- Polaris web components (`<s-page>`, `<s-section>`, `<s-box>`, `<s-stack>`, `<s-badge>`, `<s-banner>`, `<s-button>`)
- Auth via `authenticate.admin(request)` returns `{ session, admin }` where `admin.graphql()` is the API client
- DB singleton at `app/db.server.ts`, Shopify config at `app/shopify.server.ts`

### Key Conventions
- Route files: dots = nested segments, `$` = dynamic param (e.g., `app.agents.$agentId.tsx`)
- API routes export `action` (POST) and/or `loader` (GET) -- no default component
- Server-only files use `.server.ts` suffix
- Current scopes: `write_products` only (need to add `read_inventory`, `read_orders` for agents)

### Polaris Web Components (App Home)
- NO `<s-tabs>` or `<s-data-table>` available in App Home context
- Use `<s-section heading="...">` blocks for visual grouping instead of tabs
- `<s-badge tone="critical|warning|info|success">` for status indicators
- `<s-page>` has `slot="primary-action"` for header buttons and `slot="aside"` for sidebar

### Plans
- Active plan: `plans/260305-secretary-ui-and-agent-infrastructure/`
- PRD: `docs/plans/2026-03-05-agentic-super-app-prd.md`
- Research report: `plans/reports/researcher-multi-agent-architecture.md`
