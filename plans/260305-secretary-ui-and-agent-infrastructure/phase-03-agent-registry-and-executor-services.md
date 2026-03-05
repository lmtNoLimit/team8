---
phase: 3
title: "Agent Registry & Executor Services"
status: pending
owner: Lead
effort: 30min
---

# Phase 3: Agent Registry & Executor Services

## Context Links
- [Agent Interface](./phase-02-agent-interface-contract.md)
- [Researcher Report](../reports/researcher-multi-agent-architecture.md) -- Sections 6-7
- DB client: `app/db.server.ts`

## Overview

Create three server-side modules:
1. **Agent Registry** -- Central map of all agents; API routes look up agents here
2. **Agent Executor** -- Runs an agent with timeout, error handling, and calls FindingStorage
3. **Finding Storage** -- Persists `AgentFindingInput[]` to MongoDB with deduplication

## Key Insights

- Registry uses explicit imports (no dynamic/magic discovery). Each stub agent is pre-imported; devs replace the stub.
- Executor wraps `agent.run()` with 30s timeout via `Promise.race`
- FindingStorage uses Prisma upsert on `[shop, agentId, deduplicationKey]` compound unique
- All three files have `.server.ts` suffix to ensure they never bundle into the client

## Requirements

**Functional:**
- Registry: `get(agentId)`, `getAll()`, `list()` methods
- Executor: `execute(agent, shop, admin)` returns saved findings
- Storage: `saveFindings(agentId, shop, inputs)` with upsert dedup
- Storage: `getFindings(shop, filters?)` for dashboard queries
- Storage: `updateFindingStatus(id, status)` for dismiss/apply

**Non-functional:**
- 30-second timeout per agent execution
- Graceful error handling (log + rethrow, don't swallow)
- All files < 200 lines

## Architecture

```
Route handler
  |
  v
AgentRegistry.get(agentId) --> Agent instance
  |
  v
AgentExecutor.execute(agent, shop, admin)
  |-- calls agent.run(shop, admin)
  |-- calls FindingStorage.saveFindings(...)
  v
FindingStorage --> prisma.agentFinding.upsert()
```

## Related Code Files

**Create:**
- `app/agents/agent-registry.server.ts`
- `app/services/agent-executor.server.ts`
- `app/services/finding-storage.server.ts`

**Read (dependencies):**
- `app/lib/agent-interface.ts` (Phase 2)
- `app/db.server.ts` (existing Prisma client)

## Implementation Steps

### Step 1: Create `app/services/finding-storage.server.ts`

```typescript
import prisma from "../db.server";
import type { AgentFindingInput } from "../lib/agent-interface";

/**
 * Persists agent findings to MongoDB with deduplication.
 * Used by AgentExecutor after an agent run completes.
 */

export interface FindingFilters {
  agentId?: string;
  type?: string;
  status?: string;
}

/**
 * Save an array of findings. Upserts on deduplicationKey to avoid duplicates.
 */
export async function saveFindings(
  agentId: string,
  shop: string,
  inputs: AgentFindingInput[]
) {
  const saved = [];

  for (const input of inputs) {
    const dedupKey =
      input.deduplicationKey ?? `${agentId}:${input.title}`;

    const data = {
      agentId,
      shop,
      type: input.type,
      priority: input.priority,
      title: input.title,
      description: input.description,
      action: input.action ?? null,
      metadata: input.metadata ?? null,
      externalId: input.externalId ?? null,
      deduplicationKey: dedupKey,
    };

    const finding = await prisma.agentFinding.upsert({
      where: {
        shop_agentId_deduplicationKey: {
          shop,
          agentId,
          deduplicationKey: dedupKey,
        },
      },
      update: {
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        action: data.action,
        metadata: data.metadata,
      },
      create: {
        ...data,
        status: "pending",
      },
    });

    saved.push(finding);
  }

  return saved;
}

/**
 * Query findings for a shop with optional filters.
 * Used by dashboard loader and findings API route.
 */
export async function getFindings(shop: string, filters?: FindingFilters) {
  const where: Record<string, unknown> = { shop };
  if (filters?.agentId) where.agentId = filters.agentId;
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;

  return prisma.agentFinding.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Update a finding's status (dismiss, apply, etc.)
 */
export async function updateFindingStatus(
  id: string,
  status: "pending" | "applied" | "dismissed"
) {
  return prisma.agentFinding.update({
    where: { id },
    data: { status },
  });
}
```

### Step 2: Create `app/services/agent-executor.server.ts`

```typescript
import type { Agent, AdminClient, AgentFindingInput } from "../lib/agent-interface";
import { saveFindings } from "./finding-storage.server";

const AGENT_TIMEOUT_MS = 30_000;

/**
 * Runs a single agent with timeout protection and persists findings.
 */
export async function executeAgent(
  agent: Agent,
  shop: string,
  admin: AdminClient
) {
  console.log(`[AgentExecutor] Starting ${agent.agentId} for ${shop}`);
  const startTime = Date.now();

  try {
    const findings = await Promise.race([
      agent.run(shop, admin),
      rejectAfterTimeout(AGENT_TIMEOUT_MS, agent.agentId),
    ]);

    if (!findings || findings.length === 0) {
      console.log(`[AgentExecutor] ${agent.agentId}: 0 findings`);
      return [];
    }

    const saved = await saveFindings(agent.agentId, shop, findings);
    const elapsed = Date.now() - startTime;
    console.log(
      `[AgentExecutor] ${agent.agentId}: ${saved.length} findings saved (${elapsed}ms)`
    );

    return saved;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(
      `[AgentExecutor] ${agent.agentId} failed after ${elapsed}ms:`,
      error
    );
    throw error;
  }
}

/**
 * Run ALL registered agents in parallel for a shop.
 * Returns a summary of results per agent.
 */
export async function executeAllAgents(
  agents: Agent[],
  shop: string,
  admin: AdminClient
) {
  const results = await Promise.allSettled(
    agents.map((agent) => executeAgent(agent, shop, admin))
  );

  return agents.map((agent, i) => {
    const result = results[i];
    if (result.status === "fulfilled") {
      return {
        agentId: agent.agentId,
        success: true,
        findingsCount: result.value.length,
      };
    }
    return {
      agentId: agent.agentId,
      success: false,
      error: (result.reason as Error).message,
    };
  });
}

function rejectAfterTimeout(ms: number, agentId: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Agent "${agentId}" timed out after ${ms}ms`)),
      ms
    )
  );
}
```

### Step 3: Create `app/agents/agent-registry.server.ts`

Initially imports stub agents (Phase 5). Developers replace stubs with real implementations.

```typescript
import type { Agent } from "../lib/agent-interface";

// Stub imports -- each developer replaces their stub with a real agent
import { aeoAgent } from "./aeo-agent/aeo-agent.server";
import { contentAgent } from "./content-agent/content-agent.server";
import { schemaAgent } from "./schema-agent/schema-agent.server";
import { inventoryAgent } from "./inventory-agent/inventory-agent.server";
import { storefrontAgent } from "./storefront-agent/storefront-agent.server";

/**
 * Central agent registry. All agents are registered here via explicit imports.
 *
 * To add a new agent:
 * 1. Create folder app/agents/{name}-agent/
 * 2. Export an Agent-conforming object from {name}-agent.server.ts
 * 3. Import + add to agentList below
 */

const agentList: Agent[] = [
  aeoAgent,
  contentAgent,
  schemaAgent,
  inventoryAgent,
  storefrontAgent,
];

const agentMap = new Map<string, Agent>(
  agentList.map((a) => [a.agentId, a])
);

/** Get a single agent by ID */
export function getAgent(agentId: string): Agent | undefined {
  return agentMap.get(agentId);
}

/** Get all registered agents */
export function getAllAgents(): Agent[] {
  return agentList;
}

/** Get agent metadata (for UI listing) */
export function listAgents() {
  return agentList.map((a) => ({
    agentId: a.agentId,
    displayName: a.displayName,
    description: a.description,
  }));
}
```

**Note:** Uses plain functions + module-level state (Map). No class needed -- KISS.

## Todo List

- [ ] Create `app/services/` directory
- [ ] Create `app/services/finding-storage.server.ts`
- [ ] Create `app/services/agent-executor.server.ts`
- [ ] Create `app/agents/` directory
- [ ] Create `app/agents/agent-registry.server.ts` (after Phase 5 stubs exist)
- [ ] Run `npm run typecheck`

## Success Criteria

- `saveFindings()` upserts correctly (no duplicates on repeated calls)
- `executeAgent()` times out after 30s
- `executeAllAgents()` runs all agents in parallel, returns per-agent results
- `getAgent("aeo")` returns the AEO agent instance
- All files compile cleanly

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| MongoDB upsert on nullable deduplicationKey | Compound unique `[shop, agentId, deduplicationKey]` handles this; agents should always set deduplicationKey |
| Sequential `for` loop in saveFindings is slow | Acceptable for MVP (< 20 findings per agent). Use `Promise.all` in V2 if needed |
| Agent import fails (stub not yet created) | Create stubs first (Phase 5) before this file; or use dynamic imports with try/catch |

## Security Considerations

- `AdminClient` (access token) passes through executor to agent. Never logged or persisted.
- Finding metadata is stored as-is in MongoDB. Agents must not store PII or secrets in metadata.

## Next Steps

- Phase 4: Create API routes that wire these services to HTTP endpoints
- Phase 5: Create stub agents so the registry compiles
