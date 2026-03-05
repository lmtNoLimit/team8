---
phase: 2
title: "Agent Interface Contract"
status: pending
owner: Lead
effort: 15min
---

# Phase 2: Agent Interface Contract

## Context Links
- [Researcher Report](../reports/researcher-multi-agent-architecture.md) -- Section 1
- Shopify auth: `app/shopify.server.ts`

## Overview

Create the TypeScript interface contract that every agent must implement. This file is **locked after kickoff** -- no changes during the hackathon. All 5 agent developers depend on this contract.

## Key Insights

- Keep the interface minimal: `agentId`, `displayName`, `description`, `run()`
- `run()` returns `AgentFindingInput[]` -- the executor handles DB persistence
- Pass `admin` object from Shopify auth directly -- don't create a custom AuthSession wrapper for MVP. The `authenticate.admin(request)` already provides a GraphQL client via `admin.graphql()`
- Optional lifecycle methods (`initialize`, `cleanup`) are YAGNI for MVP -- skip them

## Requirements

**Functional:**
- Define `Agent` interface with `run()` method
- Define `AgentFindingInput` type matching the Prisma model shape
- Type-safe finding types: `"done" | "action_needed" | "insight"`
- Type-safe priorities: `1 | 2 | 3 | 4 | 5`

**Non-functional:**
- Zero runtime dependencies (types only)
- Must compile with `npm run typecheck`

## Architecture

The agent interface sits between the executor (caller) and each agent implementation (implementor):

```
AgentExecutor --> Agent.run(shop, admin) --> AgentFindingInput[]
                    ^                            |
                    |                            v
              each agent impl            FindingStorage.save()
```

## Related Code Files

**Create:**
- `app/lib/agent-interface.ts`

## Implementation Steps

### Step 1: Create `app/lib/agent-interface.ts`

```typescript
/**
 * Agent Interface Contract
 * LOCKED after kickoff -- do not modify during hackathon.
 *
 * Every agent must implement the Agent interface.
 * The executor calls run(), saves findings to DB.
 */

/**
 * Finding types for the Secretary briefing.
 * - "done": Agent handled this automatically (Handled Overnight)
 * - "action_needed": Requires merchant decision (Needs Your Decision)
 * - "insight": Informational, no action required (Insights)
 */
export type FindingType = "done" | "action_needed" | "insight";

/** Priority levels: 1 = critical, 5 = nice-to-have */
export type FindingPriority = 1 | 2 | 3 | 4 | 5;

/**
 * What an agent returns from run().
 * Each item becomes a row in the AgentFinding collection.
 */
export interface AgentFindingInput {
  /** "done" | "action_needed" | "insight" */
  type: FindingType;

  /** 1 = critical ... 5 = nice-to-have */
  priority: FindingPriority;

  /** Short headline for briefing. Keep under 80 chars. */
  title: string;

  /** Longer explanation. Keep under 300 chars. */
  description: string;

  /** Suggested action as JSON string, or human-readable instruction */
  action?: string;

  /** Agent-specific structured data (product IDs, scores, snapshots, etc.) */
  metadata?: Record<string, unknown>;

  /**
   * Deduplication key. If same key exists for this agent+shop, the finding
   * is updated instead of duplicated. Recommended format: "topic:identifier"
   * Example: "invisible-products:batch-2026-03-05"
   */
  deduplicationKey?: string;

  /** External identifier from the agent's domain (e.g., product GID) */
  externalId?: string;
}

/**
 * Admin GraphQL client type.
 * This is the `admin` object returned by authenticate.admin(request).
 * Agents use admin.graphql() to query Shopify Admin API.
 */
export interface AdminClient {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<Response>;
}

/**
 * Base interface all agents must implement.
 */
export interface Agent {
  /** Unique identifier: "aeo" | "content" | "schema" | "inventory" | "storefront" */
  readonly agentId: string;

  /** Human-readable name for the briefing UI. Example: "AEO Specialist" */
  readonly displayName: string;

  /** One-line description of what this agent monitors */
  readonly description: string;

  /**
   * Main execution method. Runs the agent against a shop's data.
   *
   * @param shop - Shop domain (e.g., "myshop.myshopify.com")
   * @param admin - Authenticated Shopify Admin client (use admin.graphql())
   * @returns Array of findings to persist
   *
   * Contract:
   * - Must be idempotent (safe to run multiple times)
   * - Should complete within 30 seconds
   * - Return empty array if nothing found (don't throw)
   * - Throw only on unrecoverable errors (network down, auth expired)
   */
  run(shop: string, admin: AdminClient): Promise<AgentFindingInput[]>;
}
```

**Design decisions vs. researcher report:**

1. **Removed `AuthSession` wrapper** -- Pass Shopify's `admin` object directly. The researcher's `AuthSession.rest` method is unused; `admin.graphql()` covers all MVP needs. KISS.
2. **Removed optional lifecycle methods** (`initialize`, `cleanup`, `validateScopes`) -- YAGNI for MVP. Add when needed in V2.
3. **Added `AdminClient` type** -- Lightweight type matching Shopify's actual `admin` object shape. No custom abstraction.
4. **Kept `AgentFinding` internal type out** -- The Prisma-generated type serves this purpose. No need for a parallel type.

## Todo List

- [ ] Create `app/lib/` directory (if not exists)
- [ ] Create `app/lib/agent-interface.ts` with types above
- [ ] Run `npm run typecheck` to verify

## Success Criteria

- File compiles with zero errors
- All 5 agent developers can `import { Agent, AgentFindingInput, AdminClient } from "../lib/agent-interface"`
- No runtime code in the file (types only)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Interface too rigid | `metadata: Record<string, unknown>` provides escape hatch for any agent-specific data |
| `admin.graphql()` return type mismatch | Use `Response` type (standard Fetch API); agents call `.json()` themselves |
| Missing agent-specific needs | Agents can import their own utilities; interface is minimal by design |

## Security Considerations

- `AdminClient` exposes the full authenticated session. Scoped by `shopify.app.toml` (currently `write_products`).
- Each agent inherits the app's scopes -- no per-agent scope isolation in MVP.

## Next Steps

Proceed to Phase 3 (Agent Registry & Executor Services).
