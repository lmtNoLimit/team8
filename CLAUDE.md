# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI Store Secretary** — a Shopify embedded app that manages a team of AI agents to monitor and optimize a merchant's store. Built with React Router v7, Prisma/MongoDB, and Shopify App Bridge v4 with Polaris web components.

## Commands

```bash
npm run dev              # Start dev server via Shopify CLI (tunnel + HMR)
npm run build            # Production build (react-router build)
npm run start            # Serve production build
npm run typecheck        # Generate route types + tsc --noEmit
npm run lint             # ESLint with cache
npm run setup            # prisma generate && prisma db push
npm run graphql-codegen  # Generate GraphQL types from Admin API schema
npx prisma studio        # Visual database browser
```

## Architecture

### App Structure

```
App name (click -> Daily Briefing dashboard)
  My Team         -> /app/agents       (tabs: Agents | Activity)
  Settings        -> /app/settings     (store profile, trust levels, API config)
  Agent Detail    -> /app/agents/:id   (breadcrumb back to My Team)
```

### Agent System

- Each agent implements the `Agent` interface from `app/lib/agent-interface.ts`
- Agents are registered in `app/agents/agent-registry.server.ts`
- Agent executor runs agents with timeout protection: `app/services/agent-executor.server.ts`
- Findings stored via: `app/services/finding-storage.server.ts`
- Activity logging: `app/services/activity-log.server.ts`
- Trust levels per agent (advisor/assistant/autopilot): `app/services/agent-settings.server.ts`

**To add a new agent:**
1. Create folder `app/agents/{name}-agent/`
2. Export an `Agent`-conforming object from `{name}-agent.server.ts`
3. Import + add to `agentList` in `app/agents/agent-registry.server.ts`
4. Add agent label to `AGENT_LABELS` in `app/components/finding-card.tsx` and `app/routes/app.agents._index.tsx`

### Routing (flat file-system routes)

Routes are discovered automatically via `@react-router/fs-routes` (`flatRoutes()` in `app/routes.ts`). Naming convention:

- `app.tsx` — Authenticated layout with nav (all `/app/*` routes nest here)
- `app._index.tsx` — Daily Briefing dashboard at `/app`
- `app.agents._index.tsx` — My Team page (agents list + activity tab)
- `app.agents.$agentId.tsx` — Individual agent detail page
- `app.settings.tsx` — App settings (store profile, trust levels)
- `app.api.*.tsx` — API routes (agent runs, finding status, review seed)
- `auth.$.tsx` — OAuth callback catch-all
- `auth.login/route.tsx` — Manual shop login form
- `webhooks.app.*.tsx` — Webhook handlers

### Auth Flow

`app/shopify.server.ts` configures the Shopify app with `@shopify/shopify-app-react-router`. Key exports:
- `authenticate` — call `authenticate.admin(request)` in every protected route loader/action
- `login` — used by the login page
- `sessionStorage` — Prisma-backed (MongoDB)
- `addDocumentResponseHeaders` — injected in `entry.server.tsx` for CSP headers

### Database

- Prisma with MongoDB (`prisma/schema.prisma`)
- Models: `Session`, `AgentFinding`, `Review`, `AgentSetting`, `StoreProfile`, `ActivityLog`
- MongoDB uses `prisma db push` (no migrations)
- After changing schema: `npx prisma db push && npx prisma generate`

### Claude API

- Wrapper at `app/lib/ai.server.ts` — `askClaude()` and `askClaudeJSON<T>()`
- Uses `@anthropic-ai/sdk`, reads `ANTHROPIC_API_KEY` from env
- Model: `claude-sonnet-4-6`

## Rules

### UI: ALWAYS Use Polaris Web Components

**This is mandatory for ALL UI code in this repo.**

- Use `s-*` web components: `s-page`, `s-section`, `s-box`, `s-stack`, `s-text`, `s-paragraph`, `s-button`, `s-banner`, `s-badge`, `s-link`, `s-text-field`, `s-choice-list`, `s-choice`
- Types from `@shopify/polaris-types`
- **NEVER** use raw HTML (`div`, `span`, `button`, `h1`, `p`, `input`)
- **NEVER** import from `@shopify/polaris` (React components). We use web components only.
- For cards/containers: use `s-box` with `padding="base" borderWidth="base" borderRadius="base"` (no `s-card`)
- For text: use `s-text` (no `variant` prop) or `s-paragraph`. Use `<strong>` inside `s-text` for headings.
- For layout: use `s-stack direction="block|inline" gap="small|base"`
- For page structure: `s-page` > `s-section` > content. Use `slot="aside"` for sidebar, `slot="primary-action"` for header button.
- For breadcrumb back navigation: `<s-link slot="breadcrumb-actions" href="...">Label</s-link>` inside `s-page`
- For forms: use `useFetcher()` with `fetcher.Form` or `fetcher.submit()`. Hidden `_action` field for multiple actions per route.
- Badge tones: `"info" | "critical" | "warning" | "neutral" | "success" | "caution"` (NOT "attention" or "subdued")

### Agent Interface Contract

- **LOCKED** — do not modify `app/lib/agent-interface.ts`
- Every agent's `run()` must return `AgentFindingInput[]`
- Must be idempotent, complete within 30 seconds
- Return empty array if nothing found, throw only on unrecoverable errors
- Use `deduplicationKey` to prevent duplicate findings

### Trust Levels

| Level | Behavior |
|-------|----------|
| **Advisor** | Findings shown read-only. No action buttons. |
| **Assistant** | Findings shown with "Apply" / "Dismiss" buttons. |
| **Autopilot** | Agent auto-executes. Findings appear in "Handled" section. |

Settings stored in `AgentSetting` model, managed via `app/services/agent-settings.server.ts`.

## Key Patterns

- **Embedded app navigation**: Use `Link` from `react-router` or `s-link`, never `<a>`. Use `redirect` from `authenticate.admin`, not from `react-router`.
- **GraphQL**: Use `admin.graphql()` from the authenticated session. Types generated to `app/types/`.
- **Webhooks**: Declared in `shopify.app.toml`, not registered in code. Handlers are route files.
- **ESLint**: Allows `variant` prop on unknown elements (Polaris web components). `shopify` is a readonly global (App Bridge).
- **Server-only files**: Use `.server.ts` suffix for files that should never be bundled to the client (agents, services, AI wrapper).

## Config Files

| File | Purpose |
|---|---|
| `shopify.app.toml` | App identity, scopes (`write_products`), webhooks, API version |
| `shopify.web.toml` | Dev/predev commands (prisma generate + db push + react-router dev) |
| `.graphqlrc.ts` | GraphQL codegen — Admin API, auto-discovers extension schemas |
| `vite.config.ts` | HMR on port 64999, optimizes app-bridge-react, port from `$PORT` or 3000 |
| `.env` | `DATABASE_URL` + `ANTHROPIC_API_KEY` |
