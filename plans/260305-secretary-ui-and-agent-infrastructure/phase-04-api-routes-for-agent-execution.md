---
phase: 4
title: "API Routes for Agent Execution"
status: pending
owner: Lead
effort: 20min
---

# Phase 4: API Routes for Agent Execution

## Context Links
- [Agent Registry](./phase-03-agent-registry-and-executor-services.md)
- Shopify auth pattern: `app/routes/app._index.tsx` loader
- React Router v7 flat routes: `app/routes.ts` uses `flatRoutes()`

## Overview

Create server-side route files for:
1. **Trigger a single agent**: `POST /app/api/agents/:agentId/run`
2. **Trigger all agents**: `POST /app/api/agents/run-all`
3. **Fetch findings (API)**: `GET /app/api/agents/findings`
4. **Update finding status**: `POST /app/api/agents/findings/:id/status`

All routes authenticate via `authenticate.admin(request)` and use services from Phase 3.

## Key Insights

- React Router v7 flat routes: dots in filename = nested segments, `$` = dynamic param
- API routes export `action` (POST) and/or `loader` (GET) -- no default component export
- Shopify embedded app auth adds headers automatically; no extra CORS config needed
- The `admin` object from `authenticate.admin()` has `admin.graphql()` which matches our `AdminClient` interface
- Use `data()` from react-router for JSON responses with status codes

## Requirements

**Functional:**
- Trigger a specific agent by ID (POST)
- Trigger all agents in parallel (POST)
- Fetch findings with optional filters: agentId, type, status (GET)
- Update finding status: dismiss or apply (POST)

**Non-functional:**
- All routes require Shopify admin authentication
- Return JSON responses with success/error status
- Each route file < 60 lines

## Related Code Files

**Create:**
- `app/routes/app.api.agents.$agentId.run.tsx`
- `app/routes/app.api.agents.run-all.tsx`
- `app/routes/app.api.agents.findings.tsx`
- `app/routes/app.api.agents.findings.$id.status.tsx`

**Read (dependencies):**
- `app/shopify.server.ts` -- `authenticate`
- `app/agents/agent-registry.server.ts` -- `getAgent`, `getAllAgents`
- `app/services/agent-executor.server.ts` -- `executeAgent`, `executeAllAgents`
- `app/services/finding-storage.server.ts` -- `getFindings`, `updateFindingStatus`

## Implementation Steps

### Step 1: `app/routes/app.api.agents.$agentId.run.tsx`

Triggers a single agent execution.

```typescript
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../../shopify.server";
import { getAgent } from "../../agents/agent-registry.server";
import { executeAgent } from "../../services/agent-executor.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { agentId } = params;

  if (!agentId) {
    return data({ error: "Missing agentId" }, { status: 400 });
  }

  const agent = getAgent(agentId);
  if (!agent) {
    return data({ error: `Agent "${agentId}" not found` }, { status: 404 });
  }

  try {
    const findings = await executeAgent(agent, session.shop, admin);
    return data({
      success: true,
      agentId,
      findingsCount: findings.length,
    });
  } catch (error) {
    return data(
      { success: false, agentId, error: (error as Error).message },
      { status: 500 }
    );
  }
};
```

### Step 2: `app/routes/app.api.agents.run-all.tsx`

Triggers all agents in parallel. Used by "Run All Agents" button.

```typescript
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../../shopify.server";
import { getAllAgents } from "../../agents/agent-registry.server";
import { executeAllAgents } from "../../services/agent-executor.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const agents = getAllAgents();

  const results = await executeAllAgents(agents, session.shop, admin);

  return data({ success: true, results });
};
```

### Step 3: `app/routes/app.api.agents.findings.tsx`

Fetches findings with optional filters.

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { getFindings } from "../../services/finding-storage.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const findings = await getFindings(session.shop, {
    agentId: url.searchParams.get("agentId") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  return findings;
};
```

### Step 4: `app/routes/app.api.agents.findings.$id.status.tsx`

Updates a finding's status (dismiss / apply).

```typescript
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../../shopify.server";
import { updateFindingStatus } from "../../services/finding-storage.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    return data({ error: "Missing finding ID" }, { status: 400 });
  }

  const formData = await request.formData();
  const status = formData.get("status") as string;

  if (!["pending", "applied", "dismissed"].includes(status)) {
    return data(
      { error: "Invalid status. Must be: pending, applied, dismissed" },
      { status: 400 }
    );
  }

  try {
    const updated = await updateFindingStatus(
      id,
      status as "pending" | "applied" | "dismissed"
    );
    return data({ success: true, finding: updated });
  } catch (error) {
    return data(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
};
```

## Route Map

| File | Method | URL | Purpose |
|------|--------|-----|---------|
| `app.api.agents.$agentId.run.tsx` | POST | `/app/api/agents/:agentId/run` | Run single agent |
| `app.api.agents.run-all.tsx` | POST | `/app/api/agents/run-all` | Run all agents |
| `app.api.agents.findings.tsx` | GET | `/app/api/agents/findings` | Fetch findings |
| `app.api.agents.findings.$id.status.tsx` | POST | `/app/api/agents/findings/:id/status` | Update status |

## Todo List

- [ ] Create `app/routes/app.api.agents.$agentId.run.tsx`
- [ ] Create `app/routes/app.api.agents.run-all.tsx`
- [ ] Create `app/routes/app.api.agents.findings.tsx`
- [ ] Create `app/routes/app.api.agents.findings.$id.status.tsx`
- [ ] Run `npm run typecheck`
- [ ] Test with `npm run dev` + manual curl/fetch calls

## Success Criteria

- All 4 routes register in React Router (visible in dev server logs)
- POST to `/app/api/agents/aeo/run` triggers the AEO agent and returns JSON
- POST to `/app/api/agents/run-all` triggers all agents, returns per-agent results
- GET `/app/api/agents/findings?agentId=aeo` returns findings for AEO agent
- POST to `/app/api/agents/findings/:id/status` with `status=dismissed` updates the finding

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Route path conflicts with other routes | API routes use `app.api.` prefix; no conflict with `app.agents.` UI routes |
| `admin` object shape doesn't match `AdminClient` | Shopify's `admin` has `graphql()` method; type assertion needed if shapes don't align exactly |
| Large payload from executeAllAgents | MVP has 5 agents returning < 20 findings each; total payload is small |

## Next Steps

Phase 5: Create stub agents so routes + registry compile end-to-end.
