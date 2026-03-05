# Multi-Agent Architecture Research Report
**Date:** 2026-03-05
**Context:** Secretary AI super-app on Shopify embedded app (React Router v7 + Prisma/MongoDB)
**Team Scale:** 5-6 parallel developers
**Focus Areas:** Agent interface, module structure, data flow, routing patterns

---

## Executive Summary

This report provides concrete patterns for building a scalable multi-agent system in your Shopify app. Key findings:

1. **Agent Interface Contract** — Minimal TypeScript interface enabling parallel development
2. **Module Structure** — File organization strategy for 5-6 developers working without conflicts
3. **Route Architecture** — React Router v7 flat routes + API endpoints for agent execution
4. **Data Flow** — Agent findings → MongoDB → Dashboard UI with proper separation of concerns
5. **Prisma Model** — AgentFinding schema with metadata for flexible agent-specific data

**Outcome:** A pattern allowing complete independence between developers while maintaining shared infrastructure.

---

## 1. Agent Interface Contract

### Rationale
Each agent team member needs a clear boundary of what they must implement and what they can rely on from the platform. A minimal interface prevents conflicts while allowing flexibility in implementation.

### TypeScript Definition

**File:** `app/lib/agent-interface.ts`

```typescript
/**
 * Base interface all agents must implement.
 * Enables parallel development and consistent integration.
 */
export interface Agent {
  /** Unique identifier: "aeo" | "content" | "schema" | "inventory" | "storefront" */
  agentId: string;

  /** Human-readable name for the briefing UI */
  displayName: string;

  /** Description of what this agent monitors */
  description: string;

  /**
   * Main execution method. Runs the agent against a shop's data.
   *
   * @param shop Shop domain (e.g., "myshop.myshopify.com")
   * @param session Authenticated session (for GraphQL + API access)
   * @returns Array of findings to persist to database
   *
   * Implementation notes:
   * - Must be idempotent (safe to run multiple times)
   * - Should timeout after 30s (for manual triggers)
   * - Throw only on unrecoverable errors
   * - Query sparingly — batch API calls
   */
  run(shop: string, session: AuthSession): Promise<AgentFindingInput[]>;

  /**
   * Optional: Validate that agent has necessary permissions/scopes.
   * Called during app initialization.
   */
  validateScopes?(requiredScopes: string[]): boolean;

  /**
   * Optional: One-time setup (e.g., webhooks, data seeding).
   * Called on first app install.
   */
  initialize?(shop: string): Promise<void>;

  /**
   * Optional: Cleanup on app uninstall.
   */
  cleanup?(shop: string): Promise<void>;
}

/**
 * What an agent must return from run().
 * Each item becomes a row in agent_findings.
 */
export interface AgentFindingInput {
  /** Unique within agent + shop for deduplication. Leave empty for auto. */
  externalId?: string;

  /** "done" = handled | "action_needed" = needs merchant approval | "insight" = FYI */
  type: "done" | "action_needed" | "insight";

  /** 1 = critical, 2 = high, 3 = medium, 4 = low, 5 = nice-to-have */
  priority: 1 | 2 | 3 | 4 | 5;

  /** Short headline for briefing (max 60 chars) */
  title: string;

  /** Longer explanation (max 300 chars) */
  description: string;

  /** Optional: Suggested action or one-click payload (JSON stringified) */
  action?: string;

  /** Agent-specific data (productIds, before/after snapshots, etc.) */
  metadata?: Record<string, unknown>;

  /** For deduplication; if same combo appears again, update rather than insert */
  deduplicationKey?: string;
}

/**
 * Authenticated session passed to agent.
 * Mirrors Shopify session but adds useful methods.
 */
export interface AuthSession {
  shop: string;
  accessToken: string;

  /** GraphQL client for Shopify Admin API */
  graphql: (query: string, variables?: Record<string, unknown>) => Promise<unknown>;

  /** REST endpoint caller (if needed) */
  rest: (method: string, path: string, body?: unknown) => Promise<unknown>;
}

/**
 * Internal type for findings after DB insertion.
 * Matches the Prisma AgentFinding model.
 */
export interface AgentFinding extends AgentFindingInput {
  id: string;
  agentId: string;
  shop: string;
  status: "pending" | "applied" | "dismissed";
  createdAt: Date;
  updatedAt: Date;
}
```

### Why This Design

- **Minimal:** Only `agentId`, `displayName`, `run()` are required. Everything else is optional.
- **Flexible:** `metadata` is `Record<string, unknown>` — agents can store anything domain-specific.
- **Safe:** Findings can't corrupt the database (`AgentFindingInput` is strictly typed).
- **Testable:** Single `run()` method is easy to unit test without mocking Shopify APIs.
- **Auditable:** Session is passed in, not global — no hidden dependencies.

---

## 2. Module Structure for Parallel Development

### File Organization

```
app/
├── agents/                         # Agent modules (5-6 developers, one per folder)
│   ├── agent-registry.ts           # Central discovery + execution (shared infra)
│   ├── agent-interface.ts          # Agent contract (shared)
│   │
│   ├── aeo-agent/                  # Developer A
│   │   ├── aeo.agent.ts            # Main agent class (implements Agent)
│   │   ├── aeo.queries.server.ts   # GraphQL queries (Shopify Admin API)
│   │   ├── aeo.prompts.ts          # Claude prompts for analysis
│   │   ├── aeo.test.ts             # Unit tests
│   │   └── README.md               # Agent docs
│   │
│   ├── content-agent/              # Developer B
│   │   ├── content.agent.ts
│   │   ├── content.queries.server.ts
│   │   ├── content.prompts.ts
│   │   ├── content.test.ts
│   │   └── README.md
│   │
│   ├── schema-agent/               # Developer C
│   │   ├── schema.agent.ts
│   │   ├── schema.fetch-storefront.server.ts  # Fetch + parse HTML
│   │   ├── schema.validators.ts    # JSON-LD validation
│   │   ├── schema.prompts.ts
│   │   ├── schema.test.ts
│   │   └── README.md
│   │
│   ├── inventory-agent/            # Developer D
│   │   ├── inventory.agent.ts
│   │   ├── inventory.queries.server.ts
│   │   ├── inventory.calculations.ts # Velocity, stockout logic
│   │   ├── inventory.prompts.ts
│   │   ├── inventory.test.ts
│   │   └── README.md
│   │
│   └── storefront-agent/           # Developer E
│       ├── storefront.agent.ts
│       ├── storefront.screenshots.server.ts  # Fetch + analyze
│       ├── storefront.prompts.ts
│       ├── storefront.test.ts
│       └── README.md
│
├── routes/
│   ├── app.tsx                      # Main layout (shared)
│   ├── app._index.tsx               # Secretary dashboard (briefing) — Developer F
│   ├── app.agents.$agentId.tsx      # Individual agent detail page (shared)
│   ├── app.api.agents.$agentId.run.tsx  # Trigger agent execution (shared)
│   └── app.api.agents.findings.tsx  # Fetch findings (shared)
│
├── components/
│   ├── secretary-briefing/          # Briefing dashboard components
│   ├── finding-card/                # Finding display (shared)
│   └── agent-details/               # Agent detail page (shared)
│
├── services/                        # Shared services
│   ├── agent-executor.server.ts     # Runs agents, persists findings
│   └── finding-storage.server.ts    # DB queries for findings
│
└── lib/
    ├── agent-interface.ts           # Shared (no edits after kickoff)
    └── types.ts                     # Shared types
```

### File Ownership Rules (Critical)

**Each developer owns exactly one agent folder. No overlap.**

| Developer | Folder | Can Create/Edit |
|-----------|--------|-----------------|
| A (AEO) | `app/agents/aeo-agent/**` | Only files in this folder |
| B (Content) | `app/agents/content-agent/**` | Only files in this folder |
| C (Schema) | `app/agents/schema-agent/**` | Only files in this folder |
| D (Inventory) | `app/agents/inventory-agent/**` | Only files in this folder |
| E (Storefront) | `app/agents/storefront-agent/**` | Only files in this folder |
| F (Secretary UI) | `app/routes/app._index.tsx`, `app/components/secretary-briefing/**` | Only these files |
| Lead | Shared infra (`agents/agent-registry.ts`, `services/**`, routes templates) | Only shared files |

**Shared Infra (Lead Maintains)**
- `agent-interface.ts` — locked after kickoff
- `agent-registry.ts` — agent discovery + execution
- `routes/app.api.agents.$agentId.run.tsx` — trigger logic
- `routes/app.api.agents.findings.tsx` — findings API
- `routes/app.agents.$agentId.tsx` — detail page (shared template)
- `services/agent-executor.server.ts` — execution harness

**What Developers Can Assume (Pre-built)**

Each agent dev gets:

1. **Prisma client** — Already set up, MongoDB connected
2. **Shopify session** — Auth already handled in route loaders
3. **GraphQL client** — Ready to query Admin API
4. **Agent registry** — Auto-discovers agents (no manual registration needed)
5. **Finding storage** — Agent just returns `AgentFindingInput[]`, finding saver handles DB
6. **Claude API access** — Available via env var (shared)

**Git Workflow**
- Each agent dev commits to their own branch: `feat/aeo-agent`, `feat/content-agent`, etc.
- Lead merges all into `main` at once
- No dependency on each other's code until merge

---

## 3. Route Structure (React Router v7 Flat Routes)

### Route Hierarchy

```
/app
├── / (app._index.tsx) — Secretary Dashboard / Morning Briefing
│                        Shows all findings grouped by type/priority
│
├── /agents/$agentId (app.agents.$agentId.tsx) — Agent Detail Page
│                     Shows all findings for one agent
│                     Drill-down + take actions (V2+)
│
└── /api
    ├── /agents/$agentId/run (app.api.agents.$agentId.run.tsx) — Trigger Agent
    │                        POST request → runs agent → returns findings
    │
    └── /agents/findings (app.api.agents.findings.tsx) — Fetch Findings
                         GET /agents/findings?status=pending&agentId=aeo
```

### Route Files

**File: `app/routes/app._index.tsx` (Secretary Dashboard)**

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Fetch all findings for this shop, grouped by type
  const findings = await prisma.agentFinding.findMany({
    where: { shop: session.shop },
    orderBy: [
      { type: "asc" }, // done, action_needed, insight
      { priority: "asc" },
      { createdAt: "desc" },
    ],
  });

  // Group by type for display
  const grouped = {
    done: findings.filter(f => f.type === "done"),
    action_needed: findings.filter(f => f.type === "action_needed"),
    insight: findings.filter(f => f.type === "insight"),
  };

  return { findings: grouped };
};

export default function Dashboard() {
  const { findings } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Good morning! Your briefing is ready.">
      {/* Render briefing */}
    </s-page>
  );
}
```

**File: `app/routes/app.agents.$agentId.tsx` (Agent Detail Page)**

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { agentId } = params;

  const findings = await prisma.agentFinding.findMany({
    where: {
      shop: session.shop,
      agentId,
    },
    orderBy: { createdAt: "desc" },
  });

  return { agentId, findings };
};

export default function AgentDetail() {
  const { agentId, findings } = useLoaderData<typeof loader>();

  return (
    <s-page heading={`${agentId} Agent`}>
      {/* Render agent-specific findings */}
    </s-page>
  );
}
```

**File: `app/routes/app.api.agents.$agentId.run.tsx` (Trigger Agent)**

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { agentRegistry } from "../agents/agent-registry";
import { agentExecutor } from "../services/agent-executor.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const { session } = await authenticate.admin(request);
  const { agentId } = params;

  // Get agent from registry
  const agent = agentRegistry.get(agentId);
  if (!agent) {
    return { error: `Agent "${agentId}" not found` };
  }

  try {
    // Run agent + save findings
    const findings = await agentExecutor.execute(agent, session);
    return { success: true, findingsCount: findings.length };
  } catch (error) {
    console.error(`Agent ${agentId} failed:`, error);
    return { error: (error as Error).message };
  }
};
```

**File: `app/routes/app.api.agents.findings.tsx` (Fetch Findings API)**

```typescript
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId");
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = { shop: session.shop };
  if (agentId) where.agentId = agentId;
  if (status) where.status = status;

  const findings = await prisma.agentFinding.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return findings;
};
```

### Route Naming Convention (Critical for Flat Routes)

React Router v7 with `@react-router/fs-routes` uses a dot-based naming scheme. Each dot becomes a nested route segment, and `$` denotes a dynamic parameter:

| File Name | Route |
|-----------|-------|
| `app.tsx` | `/app` (layout) |
| `app._index.tsx` | `/app/` (dashboard) |
| `app.agents.$agentId.tsx` | `/app/agents/:agentId` (detail) |
| `app.api.agents.$agentId.run.tsx` | `/app/api/agents/:agentId/run` (action) |
| `app.api.agents.findings.tsx` | `/app/api/agents/findings` (loader) |

**Pro tip:** Always suffix API routes with `.tsx` (not `.server.ts`). They're route files, not utilities.

---

## 4. Data Flow Architecture

### Sequence: Agent Execution → Database → UI Display

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Secretary Dashboard loaded                               │
│    User visits /app                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ app._index.tsx loader()
                     │ queries agent_findings table
                     │
         ┌───────────▼────────────────┐
         │ MongoDB: agent_findings    │
         │ (grouped by type)          │
         └───────────┬────────────────┘
                     │
                     │ useLoaderData()
                     │
         ┌───────────▼──────────────────────────┐
         │ React component renders findings     │
         │ (done, action_needed, insight tabs) │
         └──────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ 2. User triggers agent execution (manual in MVP)            │
│    Clicks "Run AEO Agent" button                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/agents/aeo/run
                     │ (app.api.agents.$agentId.run.tsx)
                     │
         ┌───────────▼─────────────────────────┐
         │ AgentExecutor.execute()             │
         │ 1. Load AEO agent from registry     │
         │ 2. Call agent.run(shop, session)    │
         │ 3. Get AgentFindingInput[] array    │
         └───────────┬─────────────────────────┘
                     │
         ┌───────────▼─────────────────────────┐
         │ FindingStorage.save()               │
         │ - Upsert on deduplicationKey        │
         │ - Insert new findings              │
         │ - Respect finding TTL (optional)   │
         └───────────┬─────────────────────────┘
                     │
         ┌───────────▼────────────────┐
         │ MongoDB: agent_findings    │
         │ (new rows inserted)        │
         └───────────┬────────────────┘
                     │
                     │ Revalidate /app loader
                     │ Browser fetches new findings
                     │
         ┌───────────▼──────────────────────────┐
         │ Dashboard re-renders with new data  │
         │ User sees: "Found 18 invisible..."   │
         └──────────────────────────────────────┘
```

### Database Writes (3 Scenarios)

**Scenario 1: New Finding (First Run)**
```
Input: { agentId: "aeo", title: "18 products invisible", ... }
↓
INSERT INTO agent_findings { agentId, shop, type, ... }
↓
Stored as: status: "pending"
```

**Scenario 2: Duplicate Detection (Rerun Same Agent)**
```
Input: Same title + deduplicationKey, different priority
↓
UPSERT by (shop, agentId, deduplicationKey)
↓
Updates existing row (updatedAt changes, avoids duplicate rows)
```

**Scenario 3: Merchant Action (V2+)**
```
User clicks "Apply" on a finding
↓
PATCH /api/agents/findings/$id { status: "applied", appliedAt: now }
↓
Finding marked as applied (no longer shown in "needs action" tab)
```

---

## 5. Prisma Data Model

### Schema Definition

**File:** `prisma/schema.prisma`

```prisma
// Existing Session model (unchanged)
model Session {
  mongodb_id  String    @id @default(auto()) @map("_id") @db.ObjectId
  id          String    @unique
  shop        String
  state       String
  isOnline    Boolean   @default(false)
  scope       String?
  expires     DateTime?
  accessToken String
  userId      BigInt?
  firstName   String?
  lastName    String?
  email       String?
  accountOwner  Boolean  @default(false)
  locale        String?
  collaborator  Boolean? @default(false)
  emailVerified Boolean? @default(false)
  refreshToken        String?
  refreshTokenExpires DateTime?
}

// NEW: Agent findings for briefing
model AgentFinding {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId

  // Agent metadata
  agentId         String   // "aeo", "content", "schema", "inventory", "storefront"
  shop            String   // merchant shop domain

  // Finding classification
  type            String   // "done", "action_needed", "insight"
  priority        Int      // 1-5 (1 = most critical)

  // Content
  title           String   // headline (60 chars max)
  description     String   // explanation (300 chars max)
  action          String?  // suggested action or JSON payload

  // Flexible agent-specific data
  metadata        Json?    // {productIds: [1,2,3], before: {...}, after: {...}}

  // Status tracking
  status          String   @default("pending") // "pending", "applied", "dismissed"

  // Deduplication
  deduplicationKey String?  // "(agentId):(shop):(externalId)" — prevents duplicates
  externalId      String?  // agent's unique identifier for the finding

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Indexes for common queries
  @@index([shop, agentId])
  @@index([shop, type, status])
  @@index([createdAt])
}
```

### Why This Design

- **Flexible:** `metadata` stores anything (product IDs, snapshots, analysis)
- **Deduplication:** `deduplicationKey` prevents duplicate findings on reruns
- **Queryable:** Indexes on (shop, agentId), (shop, type, status) — fast dashboard loads
- **Statusful:** `status` field allows agents to track what's been actioned (V2+)
- **Auditable:** `createdAt`/`updatedAt` timestamps for analytics

### Example Data

```json
{
  "id": "67a3f1e8b42c1d2e3f4a5b6c",
  "agentId": "aeo",
  "shop": "example.myshopify.com",
  "type": "action_needed",
  "priority": 2,
  "title": "18 products invisible to ChatGPT",
  "description": "These products lack metadata required for AI discovery. Apply optimized descriptions to fix.",
  "action": "{\"type\": \"applyMetadata\", \"productIds\": [1,2,3,...]}",
  "metadata": {
    "productIds": [1, 2, 3, 4, 5],
    "missingFields": ["description", "gtin"],
    "estimatedRevenueLoss": "$150/day"
  },
  "status": "pending",
  "deduplicationKey": "aeo:example.myshopify.com:invisible-products",
  "createdAt": "2026-03-05T08:30:00Z",
  "updatedAt": "2026-03-05T08:30:00Z"
}
```

---

## 6. Agent Registry & Execution

### Agent Registry (Auto-Discovery)

**File:** `app/agents/agent-registry.ts`

```typescript
import { Agent } from "./agent-interface";
import { AEOAgent } from "./aeo-agent/aeo.agent";
import { ContentAgent } from "./content-agent/content.agent";
import { SchemaAgent } from "./schema-agent/schema.agent";
import { InventoryAgent } from "./inventory-agent/inventory.agent";
import { StorefrontAgent } from "./storefront-agent/storefront.agent";

/**
 * Central registry. Each agent imports itself here.
 * This pattern allows parallel development: each dev adds their agent once.
 */
class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    // Register all agents
    const agentInstances: Agent[] = [
      new AEOAgent(),
      new ContentAgent(),
      new SchemaAgent(),
      new InventoryAgent(),
      new StorefrontAgent(),
    ];

    for (const agent of agentInstances) {
      this.agents.set(agent.agentId, agent);
    }
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  list(): { agentId: string; displayName: string; description: string }[] {
    return Array.from(this.agents.values()).map(a => ({
      agentId: a.agentId,
      displayName: a.displayName,
      description: a.description,
    }));
  }
}

export const agentRegistry = new AgentRegistry();
```

### Agent Executor Service

**File:** `app/services/agent-executor.server.ts`

```typescript
import { Agent, AuthSession, AgentFinding } from "../agents/agent-interface";
import prisma from "../db.server";

/**
 * Runs an agent and persists findings to the database.
 * Handles deduplication and error recovery.
 */
export class AgentExecutor {
  async execute(agent: Agent, session: AuthSession): Promise<AgentFinding[]> {
    console.log(`[Agent] Starting ${agent.agentId} for shop ${session.shop}`);

    try {
      // Run the agent
      const findings = await Promise.race([
        agent.run(session.shop, session),
        this.timeout(30000), // 30s timeout
      ]);

      if (!findings || findings.length === 0) {
        console.log(`[Agent] ${agent.agentId} returned 0 findings`);
        return [];
      }

      // Save findings to database
      const saved = await this.saveFindings(agent.agentId, session.shop, findings);
      console.log(`[Agent] ${agent.agentId} saved ${saved.length} findings`);

      return saved;
    } catch (error) {
      console.error(`[Agent] ${agent.agentId} failed:`, error);
      throw error;
    }
  }

  private async saveFindings(
    agentId: string,
    shop: string,
    inputs: AgentFindingInput[]
  ): Promise<AgentFinding[]> {
    const saved: AgentFinding[] = [];

    for (const input of inputs) {
      const dedupKey = input.deduplicationKey ||
        `${agentId}:${shop}:${input.externalId || input.title}`;

      const finding = await prisma.agentFinding.upsert({
        where: { deduplicationKey_shop: { deduplicationKey: dedupKey, shop } },
        update: {
          type: input.type,
          priority: input.priority,
          title: input.title,
          description: input.description,
          action: input.action,
          metadata: input.metadata,
          updatedAt: new Date(),
        },
        create: {
          agentId,
          shop,
          deduplicationKey: dedupKey,
          type: input.type,
          priority: input.priority,
          title: input.title,
          description: input.description,
          action: input.action,
          metadata: input.metadata,
          externalId: input.externalId,
        },
      });

      saved.push(finding);
    }

    return saved;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Agent execution timeout after ${ms}ms`)), ms)
    );
  }
}

export const agentExecutor = new AgentExecutor();
```

---

## 7. Skeleton Agent Implementation

### Template for Each Developer

**File:** `app/agents/aeo-agent/aeo.agent.ts`

```typescript
import { Agent, AuthSession, AgentFindingInput } from "../agent-interface";
import { fetchProductsWithoutMetadata } from "./aeo.queries.server";
import { analyzeWithClaude } from "../../lib/claude.server";

export class AEOAgent implements Agent {
  agentId = "aeo";
  displayName = "AEO Specialist";
  description = "Monitors product visibility to AI agents (ChatGPT, Perplexity, Gemini)";

  async run(shop: string, session: AuthSession): Promise<AgentFindingInput[]> {
    // 1. Fetch data
    const products = await fetchProductsWithoutMetadata(session);

    if (products.length === 0) {
      return []; // No findings
    }

    // 2. Analyze with Claude
    const analysis = await analyzeWithClaude({
      agentId: this.agentId,
      products,
      shop,
    });

    // 3. Convert analysis to findings
    const findings: AgentFindingInput[] = [
      {
        type: "action_needed",
        priority: 2,
        title: `${products.length} products invisible to ChatGPT`,
        description: `These products lack metadata required for AI discovery. Apply optimized descriptions to fix.`,
        action: JSON.stringify({
          type: "applyMetadata",
          productIds: products.map(p => p.id),
        }),
        metadata: {
          productCount: products.length,
          missingFields: ["description", "gtin"],
          estimatedRevenueLoss: "$150/day",
        },
        deduplicationKey: `${this.agentId}:${shop}:invisible-products`,
      },
    ];

    return findings;
  }
}
```

---

## 8. Component Structure (Secretary Dashboard)

### Component Hierarchy

```
SecretaryBriefing (app._index.tsx)
├── BriefingHeader
│   └── RunAllAgentsButton
│
├── FindingsTabs
│   ├── "Handled" Tab
│   │   └── FindingCard[] (status: "done")
│   │
│   ├── "Action Needed" Tab
│   │   └── FindingCard[] (status: "action_needed")
│   │       ├── PriorityBadge
│   │       ├── ActionButton
│   │       └── DismissButton
│   │
│   └── "Insights" Tab
│       └── FindingCard[] (status: "insight")
│
└── AgentStatusFooter
    ├── Agent avatars (aeo, content, schema, inventory, storefront)
    └── Last run timestamps
```

**Design Considerations:**
- Use Polaris stack layouts (`<s-stack>`, `<s-box>`, `<s-section>`)
- Show priority visually (color-coded badges: red=1, orange=2, yellow=3, etc.)
- Group by type first (done/needed/insight), then sort by priority within each group
- "Run Now" buttons next to each agent for manual triggers

---

## 9. Sample Agent Interactions (Dev Workflow)

### Developer A (AEO Agent) Workflow

```bash
# 1. Create agent file
touch app/agents/aeo-agent/aeo.agent.ts

# 2. Implement Agent interface
class AEOAgent implements Agent {
  agentId = "aeo"
  async run(shop, session) { ... }
}

# 3. Create helper files
touch app/agents/aeo-agent/aeo.queries.server.ts
touch app/agents/aeo-agent/aeo.prompts.ts

# 4. Write unit test
touch app/agents/aeo-agent/aeo.test.ts

# 5. When ready, update registry
# Edit: app/agents/agent-registry.ts
# Add: import { AEOAgent } from "./aeo-agent/aeo.agent"
# Add to constructor: new AEOAgent()

# 6. Test manually (once Lead merges shared infra)
curl -X POST http://localhost:3000/app/api/agents/aeo/run \
  -H "Content-Type: application/json" \
  -d '{"shop":"test.myshopify.com"}'

# 7. Commit
git add app/agents/aeo-agent/**
git commit -m "feat: implement aeo agent"
```

### Testing Without Full Infrastructure

Each agent can be tested in isolation:

```typescript
// app/agents/aeo-agent/aeo.test.ts
import { AEOAgent } from "./aeo.agent";

describe("AEOAgent", () => {
  it("returns empty array when all products are optimized", async () => {
    const agent = new AEOAgent();
    const session = {
      shop: "test.myshopify.com",
      graphql: async () => ({ data: { products: [] } }),
    };
    const findings = await agent.run("test.myshopify.com", session as any);
    expect(findings).toEqual([]);
  });
});
```

No mocking needed — just pass a mock `session` with a stub `graphql()` method.

---

## 10. Integration Checklist (Lead's Responsibility)

**Before kickoff (shared infra):**
- [ ] Create `agent-interface.ts` (locked after kickoff)
- [ ] Create `agent-registry.ts` skeleton (devs add their agent)
- [ ] Create `AgentExecutor` service
- [ ] Update Prisma schema + run `prisma db push`
- [ ] Create route files (API endpoints)
- [ ] Create dashboard layout (`app._index.tsx`)

**Post-implementation (before demo):**
- [ ] Each dev commits their agent
- [ ] Lead merges all branches
- [ ] Lead updates `agent-registry.ts` to import all agents
- [ ] Run `npm run setup` (typecheck + db push)
- [ ] Run `npm run dev` and test
- [ ] Trigger each agent manually via dashboard "Run Now" buttons

---

## 11. Deployment & Scaling Considerations

### MVP (4-hour hackathon)
- **Agent Execution:** Manual triggers only (buttons in UI)
- **Frequency:** On-demand via `/app/api/agents/$agentId/run`
- **Data Retention:** All findings kept forever (simple for MVP)

### V2 (After MVP)
- **Scheduling:** BullMQ for recurring jobs (e.g., run agents daily at 6 AM)
- **Execution:** Longer timeout, background jobs, retry logic
- **Optimization:** Delete old findings after 30 days (configurable TTL)

### Scaling (V3+)
- **Multi-tenancy:** Already in schema (`shop` field)
- **Database:** MongoDB Atlas handles scaling (increase storage plan)
- **Parallelization:** Run agents concurrently instead of sequentially
- **Monitoring:** Log findings to separate analytics collection for trend analysis

---

## 12. Security & Scope Notes

### Session Access
Each agent receives the full `AuthSession` (accessToken + graphql client). This is intentional:
- Agents need to query Shopify Admin API
- Scopes controlled by `shopify.app.toml` (e.g., `write_products`)
- Each agent only accesses data its scope permits

### Recommended Scopes for MVP
```toml
# shopify.app.toml
scopes = "write_products,read_inventory,read_orders"
```

Agents that need more: add to scopes, update `validateScopes()` in agent interface.

### Finding Privacy
- Findings stored in same MongoDB database as sessions
- Include `shop` in every query (multi-tenant isolation)
- No user-level isolation within shop (assumed single merchant per shop for MVP)

---

## 13. Unresolved Questions

1. **Claude API vs. local models?** Using Claude in findings report; clarify cost/perf vs. self-hosted.
2. **Webhook vs. polling for storefront data?** Schema/Storefront agents may need live storefront snapshots; clarify frequency.
3. **Finding TTL / cleanup?** Delete old findings after N days to avoid MongoDB bloat; decide retention policy.
4. **Async agent runs (V2)?** Currently all synchronous (30s timeout). Will you use BullMQ or similar for background jobs?
5. **Action payload format?** Agents return `action` field as JSON string. What's the spec for "apply metadata" payload? Standardize across agents.

---

## Summary

**Architecture Delivered:**

| Component | Status | Notes |
|-----------|--------|-------|
| Agent Interface Contract | Ready | `Agent`, `AgentFindingInput`, `AuthSession` |
| Module Structure | Ready | One folder per agent, no overlap |
| Route Templates | Ready | Loader, action, API endpoints |
| Prisma Model | Ready | `AgentFinding` with flexible metadata |
| Registry + Executor | Ready | Auto-discovery, deduplication, error handling |
| Dashboard Components | Template | Layout structure, finding cards |
| Test Strategy | Pattern | Unit test + mock session approach |

**File Paths to Create (in order):**
1. `prisma/schema.prisma` — add AgentFinding model
2. `app/lib/agent-interface.ts` — TypeScript contract
3. `app/agents/agent-registry.ts` — auto-discovery
4. `app/services/agent-executor.server.ts` — execution + persistence
5. `app/routes/app.api.agents.$agentId.run.tsx` — trigger endpoint
6. `app/routes/app.api.agents.findings.tsx` — findings fetch API
7. `app/routes/app._index.tsx` — dashboard (replace template)
8. `app/agents/{aeo,content,schema,inventory,storefront}-agent/` — one per dev

**Go-live Readiness:**
- Prisma schema validates on `npm run typecheck`
- Routes auto-discovered by React Router
- Agents plug in via registry (no manual wiring)
- Database writes are idempotent (upsert on deduplicationKey)
- Error handling includes 30s timeout per agent

This architecture unblocks parallel development and scales to 5-6 developers without conflicts.
