# Multi-Agent Architecture — Visual Reference
**Date:** 2026-03-05
**For:** Secretary AI super-app implementation team

---

## 1. Component Dependencies (Who Needs What)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    DEVELOPER INDEPENDENCE MAP                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

SHARED INFRASTRUCTURE (Lead/Architect maintains)
════════════════════════════════════════════════════════════════════
┌────────────────────────────────────────────────────────────────┐
│ app/lib/agent-interface.ts                                     │
│ - Agent interface (contract)                                   │
│ - AgentFindingInput type                                       │
│ - AuthSession type                                             │
│ ↓ All agents import this (READ-ONLY after kickoff)             │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ app/agents/agent-registry.ts                                   │
│ - Registry instance                                            │
│ - get(agentId) → Agent                                         │
│ ↓ Routes import this                                            │
│ ↓ Devs add their agent to imports + constructor                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ app/services/agent-executor.server.ts                          │
│ - execute(agent, session) → findings                           │
│ - saveFindings() with upsert logic                             │
│ ↓ Routes import this                                            │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ app/routes/app.api.agents.$agentId.run.tsx                     │
│ app/routes/app.api.agents.findings.tsx                         │
│ app/routes/app.agents.$agentId.tsx                             │
│ app/routes/app._index.tsx (dashboard shell)                    │
│ ↓ API endpoints + dashboard layout                              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ prisma/schema.prisma                                           │
│ - AgentFinding model                                           │
│ ↓ Agents → executor → Prisma client writes                     │
└────────────────────────────────────────────────────────────────┘


DEVELOPER-SPECIFIC MODULES (One per dev, no overlap)
════════════════════════════════════════════════════════════════════

Dev A: AEO Agent
┌────────────────────────────────────────────────────────────────┐
│ app/agents/aeo-agent/                                          │
│ ├─ aeo.agent.ts          (implements Agent)                    │
│ ├─ aeo.queries.server.ts (GraphQL queries)                     │
│ ├─ aeo.prompts.ts        (Claude prompts)                      │
│ └─ aeo.test.ts           (unit tests)                          │
│ ↓ Imports: agent-interface (shared)                            │
└────────────────────────────────────────────────────────────────┘

Dev B: Content Agent
┌────────────────────────────────────────────────────────────────┐
│ app/agents/content-agent/                                      │
│ ├─ content.agent.ts                                            │
│ ├─ content.queries.server.ts                                   │
│ ├─ content.prompts.ts                                          │
│ └─ content.test.ts                                             │
│ ↓ Imports: agent-interface (shared)                            │
└────────────────────────────────────────────────────────────────┘

Dev C: Schema Agent
Dev D: Inventory Agent
Dev E: Storefront Agent
(Same structure as Dev A)

Dev F: Secretary Dashboard
┌────────────────────────────────────────────────────────────────┐
│ app/routes/app._index.tsx     (briefing page)                  │
│ app/components/secretary-briefing/                             │
│ ├─ briefing-header.tsx                                         │
│ ├─ findings-tabs.tsx                                           │
│ ├─ finding-card.tsx                                            │
│ └─ agent-status-footer.tsx                                     │
│ ↓ Imports: Prisma (for findings query)                         │
└────────────────────────────────────────────────────────────────┘


DEPENDENCIES (arrows show who imports what)
════════════════════════════════════════════════════════════════════

agent-interface.ts
    ↑
    ├── aeo.agent.ts
    ├── content.agent.ts
    ├── schema.agent.ts
    ├── inventory.agent.ts
    └── storefront.agent.ts

agent-registry.ts
    ↑
    ├── (imports all agents above)
    └── (imported by API routes)

API routes
    ↑
    ├── app.api.agents.$agentId.run.tsx
    │   └── imports: agent-registry, agent-executor
    ├── app.api.agents.findings.tsx
    │   └── imports: Prisma
    └── app.agents.$agentId.tsx
        └── imports: Prisma

app._index.tsx (dashboard)
    └── imports: Prisma, Polaris components

Prisma
    ↑
    └── All routes import it
```

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        MORNING BRIEFING                         │
│                  (Secretary Dashboard Loaded)                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 1. Merchant visits /app
             │    Browser requests dashboard
             │
    ┌────────▼─────────────────────────────────────┐
    │ React Router Loader                          │
    │ app._index.tsx → loader()                    │
    └────────┬─────────────────────────────────────┘
             │
             │ 2. Query database
             │
    ┌────────▼─────────────────────────────────────┐
    │ MongoDB Atlas                                │
    │ SELECT * FROM agent_findings                │
    │ WHERE shop = "example.myshopify.com"        │
    │ ORDER BY type, priority, createdAt          │
    └────────┬─────────────────────────────────────┘
             │
             │ 3. Return to component
             │
    ┌────────▼─────────────────────────────────────┐
    │ useLoaderData() → findings grouped           │
    │ [                                             │
    │   "done": [...],                             │
    │   "action_needed": [...],                    │
    │   "insight": [...]                           │
    │ ]                                             │
    └────────┬─────────────────────────────────────┘
             │
             │ 4. Render tabs
             │
    ┌────────▼─────────────────────────────────────┐
    │ Dashboard UI                                 │
    │ [Handled] [Action Needed] [Insights]         │
    │                                              │
    │ HANDLED OVERNIGHT:                          │
    │ ✓ Updated llms.txt with 12 new products    │
    │ ✓ Fixed broken schema on 3 product pages   │
    │ ✓ Flagged "Blue Widget" — selling out      │
    │                                              │
    │ NEEDS YOUR DECISION:                        │
    │ 18 products invisible to ChatGPT [Apply]   │
    │ "Red Sneakers" has 52% bounce [Review]     │
    │ Competitor X appeared in Perplexity [Go]   │
    │                                              │
    │ INSIGHTS:                                    │
    │ "Sustainable packaging" trending +340%     │
    └────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      AGENT EXECUTION FLOW                        │
│                   (Triggered by "Run Now" Button)                │
└────────┬────────────────────────────────────────────────────────┘
         │
         │ 1. User clicks "Run AEO Agent"
         │
    ┌────▼──────────────────────────────────────┐
    │ POST /app/api/agents/aeo/run              │
    │ (app.api.agents.$agentId.run.tsx)         │
    └────┬──────────────────────────────────────┘
         │
         │ 2. Route action handler
         │
    ┌────▼──────────────────────────────────────┐
    │ Get agent from registry                   │
    │ agentRegistry.get("aeo")                  │
    └────┬──────────────────────────────────────┘
         │
         │ 3. Execute agent
         │
    ┌────▼──────────────────────────────────────┐
    │ agentExecutor.execute(agent, session)     │
    │                                           │
    │ Agent Steps:                              │
    │ a. Fetch data via GraphQL                │
    │    session.graphql(query, vars)          │
    │                                           │
    │ b. Analyze with Claude                    │
    │    analyzeWithClaude(products)           │
    │                                           │
    │ c. Convert to findings                    │
    │    [AgentFindingInput, ...]               │
    └────┬──────────────────────────────────────┘
         │
         │ 4. Save findings
         │
    ┌────▼──────────────────────────────────────┐
    │ agentExecutor.saveFindings()              │
    │                                           │
    │ For each finding:                         │
    │  IF dedup_key exists:                     │
    │    UPDATE row (avoid duplicates)          │
    │  ELSE:                                    │
    │    INSERT new row                         │
    └────┬──────────────────────────────────────┘
         │
         │ 5. Persist to database
         │
    ┌────▼──────────────────────────────────────┐
    │ MongoDB: agent_findings                   │
    │ (new/updated rows)                        │
    └────┬──────────────────────────────────────┘
         │
         │ 6. Return response to browser
         │
    ┌────▼──────────────────────────────────────┐
    │ { success: true, findingsCount: 3 }       │
    └────┬──────────────────────────────────────┘
         │
         │ 7. Revalidate dashboard
         │
    ┌────▼──────────────────────────────────────┐
    │ Browser refetches /app loader             │
    │ Finds new findings in database            │
    │ Dashboard re-renders with latest data     │
    └────────────────────────────────────────┘
```

---

## 3. Module Ownership Matrix

```
╔═══════════════════════════════════════════════════════════════╗
║           FILE OWNERSHIP FOR PARALLEL DEVELOPMENT              ║
╠═════════════════════╦═════════════════════════════════════════╣
║ Developer           ║ Files They Own                          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ A (AEO Agent)       ║ app/agents/aeo-agent/**                 ║
║                     ║ ONLY this folder, nothing else          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ B (Content Agent)   ║ app/agents/content-agent/**             ║
║                     ║ ONLY this folder, nothing else          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ C (Schema Agent)    ║ app/agents/schema-agent/**              ║
║                     ║ ONLY this folder, nothing else          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ D (Inventory)       ║ app/agents/inventory-agent/**           ║
║                     ║ ONLY this folder, nothing else          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ E (Storefront)      ║ app/agents/storefront-agent/**          ║
║                     ║ ONLY this folder, nothing else          ║
╠═════════════════════╬═════════════════════════════════════════╣
║ F (Secretary UI)    ║ app/routes/app._index.tsx               ║
║                     ║ app/components/secretary-briefing/**    ║
╠═════════════════════╬═════════════════════════════════════════╣
║ Lead/Architect      ║ app/lib/agent-interface.ts (locked)     ║
║                     ║ app/agents/agent-registry.ts            ║
║                     ║ app/services/agent-executor.server.ts   ║
║                     ║ app/routes/app.api.agents.*.tsx         ║
║                     ║ prisma/schema.prisma                    ║
╚═════════════════════╩═════════════════════════════════════════╝

RULES
─────────────────────────────────────────────────────────────────
✓ Each agent dev has ZERO merge conflicts with other agent devs
✓ Devs can work in parallel on separate git branches
✓ Lead merges all branches at once (they don't overlap)
✓ Dev F can work on dashboard in parallel (only reads findings DB)
✓ Agent registry auto-discovers agents (no manual wiring)
```

---

## 4. Finding Status Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    FINDING LIFECYCLE (MVP)                     │
└────────────────────────────────────────────────────────────────┘

Agent creates finding:
AgentFindingInput {
  type: "action_needed",
  priority: 2,
  title: "18 products invisible to ChatGPT",
  ...
}
         │
         │ agentExecutor.saveFindings()
         │ INSERT into agent_findings
         │
    ┌────▼──────────────────────────────┐
    │ Status: "pending"                 │
    │ Dashboard shows in "Action Needed" │
    │ tab with [Apply] [Dismiss] buttons │
    └────┬───────────────────────────────┘
         │
         ├─ User clicks [Apply]
         │      │
         │  ┌───▼──────────────────────────┐
         │  │ PATCH /api/findings/$id      │
         │  │ { status: "applied" }        │
         │  └───┬──────────────────────────┘
         │      │
         │  ┌───▼──────────────────────────┐
         │  │ Status: "applied"            │
         │  │ Moves to "Handled" tab       │
         │  │ (no longer action_needed)    │
         │  └───────────────────────────────┘
         │
         └─ User clicks [Dismiss]
                  │
              ┌───▼──────────────────────────┐
              │ PATCH /api/findings/$id      │
              │ { status: "dismissed" }      │
              └───┬──────────────────────────┘
                  │
              ┌───▼──────────────────────────┐
              │ Status: "dismissed"          │
              │ Hidden from briefing         │
              │ (unless filter shows archived)│
              └───────────────────────────────┘


DEDUPLICATION (Rerun same agent)
────────────────────────────────────────

First run:
Agent returns finding with deduplicationKey = "aeo:example.myshopify.com:invisible-products"
         │
         │ INSERT
         │
    ┌────▼────────────────────────┐
    │ Row created, status: pending │
    └─────────────────────────────┘

Rerun (same agent, same shop):
Agent returns SAME finding (same title + metadata)
deduplicationKey = "aeo:example.myshopify.com:invisible-products"
         │
         │ UPSERT on (deduplicationKey, shop)
         │ UPDATE existing row instead of INSERT
         │
    ┌────▼────────────────────────┐
    │ Row updated, status: pending │
    │ updatedAt refreshed          │
    │ NO DUPLICATE ROWS            │
    └─────────────────────────────┘
```

---

## 5. Route Structure (React Router v7)

```
ROUTE TREE
══════════════════════════════════════════════════════════════════

/                          (app._index redirect to /app)
  ├─ /app                  (authenticated layout)
  │   └─ /                 (app._index.tsx)
  │       Secretary Dashboard / Morning Briefing
  │       └─ Displays all findings grouped by type/priority
  │
  │   └─ /agents/$agentId  (app.agents.$agentId.tsx)
  │       Individual Agent Detail Page
  │       └─ Shows findings for one agent only
  │
  │   └─ /api
  │       ├─ /agents/$agentId/run    (POST action)
  │       │   app.api.agents.$agentId.run.tsx
  │       │   Trigger agent execution
  │       │   Returns: { success, findingsCount }
  │       │
  │       └─ /agents/findings         (GET loader)
  │           app.api.agents.findings.tsx
  │           Fetch findings (filtered by status/agentId)
  │           Returns: AgentFinding[]
  │
  ├─ /auth
  │   ├─ /login            (auth.login/route.tsx)
  │   └─ /$               (auth.$.tsx — OAuth callback)
  │
  ├─ /webhooks
  │   ├─ /app/uninstalled
  │   ├─ /app/scopes_update
  │   └─ ...


FILE NAMING (React Router v7 flat routes)
──────────────────────────────────────────────────────────────────

Naming convention: dots → nested segments, $ → dynamic param

File                              Route
app.tsx                          /app (layout)
app._index.tsx                   /app/
app.agents.$agentId.tsx          /app/agents/:agentId
app.api.agents.$agentId.run.tsx  /app/api/agents/:agentId/run
app.api.agents.findings.tsx      /app/api/agents/findings
```

---

## 6. Prisma Schema (Visual)

```
┌────────────────────────────────────────────────────────────────┐
│                   MongoDB: agent_findings                      │
├────────────────────────────────────────────────────────────────┤
│ _id (ObjectId)        → Primary key (auto-generated)           │
│ agentId (String)      → "aeo" | "content" | "schema" | ...     │
│ shop (String)         → "example.myshopify.com"                │
│ type (String)         → "done" | "action_needed" | "insight"   │
│ priority (Int)        → 1 (urgent) to 5 (low)                  │
│ title (String)        → "18 products invisible to ChatGPT"     │
│ description (String)  → Detailed explanation                   │
│ action (String?)      → JSON payload for one-click action      │
│ metadata (Json?)      → Agent-specific data                    │
│ status (String)       → "pending" | "applied" | "dismissed"    │
│ deduplicationKey (?) → "agentId:shop:externalId"               │
│ externalId (String?)  → Agent's identifier for the finding     │
│ createdAt (DateTime)  → When finding was created               │
│ updatedAt (DateTime)  → When finding was last updated          │
├────────────────────────────────────────────────────────────────┤
│ INDEXES (for fast queries)                                     │
│ ✓ (shop, agentId)                                              │
│ ✓ (shop, type, status)                                         │
│ ✓ (createdAt) — for sorting/pagination                         │
└────────────────────────────────────────────────────────────────┘

EXAMPLE ROWS
────────────────────────────────────────────────────────────────

{
  "_id": ObjectId("67a3f1e8b42c1d2e3f4a5b6c"),
  "agentId": "aeo",
  "shop": "example.myshopify.com",
  "type": "action_needed",
  "priority": 2,
  "title": "18 products invisible to ChatGPT",
  "description": "These products lack metadata required for AI...",
  "action": "{\"type\": \"applyMetadata\", \"productIds\": [1,2,3]}",
  "metadata": {
    "productCount": 18,
    "missingFields": ["description", "gtin"],
    "estimatedRevenueLoss": "$150/day"
  },
  "status": "pending",
  "deduplicationKey": "aeo:example.myshopify.com:invisible-products",
  "createdAt": ISODate("2026-03-05T08:30:00Z"),
  "updatedAt": ISODate("2026-03-05T08:30:00Z")
}

{
  "_id": ObjectId("67a3f1e8b42c1d2e3f4a5b6d"),
  "agentId": "content",
  "shop": "example.myshopify.com",
  "type": "done",
  "priority": 3,
  "title": "Updated llms.txt with 12 new products",
  "description": "Added structured data for products...",
  "metadata": { "productIds": [100,101,102,...] },
  "status": "applied",
  "deduplicationKey": "content:example.myshopify.com:llms-update",
  "createdAt": ISODate("2026-03-04T22:15:00Z"),
  "updatedAt": ISODate("2026-03-05T08:10:00Z")
}
```

---

## 7. Agent Execution Timeline (Sequence Diagram)

```
User                App                 Registry       Executor        GraphQL      Claude       MongoDB
 │                   │                      │              │              │             │            │
 │ Click "Run AEO"   │                      │              │              │             │            │
 ├───────────────────>                      │              │              │             │            │
 │                   │ POST /api/agents/aeo/run            │              │             │            │
 │                   ├─────────────────────────────────────>              │             │            │
 │                   │                      │ agentRegistry.get("aeo")    │             │            │
 │                   │                      │<──────────────┤             │             │            │
 │                   │                      │              │             │             │            │
 │                   │                      │ execute(agent, session)    │             │            │
 │                   ├──────────────────────────────────────────>         │             │            │
 │                   │                      │              │             │             │            │
 │                   │                      │              │ agent.run() │             │            │
 │                   │                      │              ├────────────>             │            │
 │                   │                      │              │ (GraphQL)                │            │
 │                   │                      │              │             │             │            │
 │                   │                      │              │ {products}                │            │
 │                   │                      │              │<────────────┤             │            │
 │                   │                      │              │             │             │            │
 │                   │                      │              │ analyzeWithClaude({...})  │            │
 │                   │                      │              ├─────────────────────────> │            │
 │                   │                      │              │             │             │            │
 │                   │                      │              │             {findings}    │            │
 │                   │                      │              │<──────────────────────────┤            │
 │                   │                      │              │             │             │            │
 │                   │                      │ [AgentFindingInput[]]      │             │            │
 │                   │                      │<─────────────┤             │             │            │
 │                   │                      │              │             │             │            │
 │                   │                      │ saveFindings()             │             │            │
 │                   │                      ├──────────────────────────────────────────────────────>
 │                   │                      │              │             │             │            │
 │                   │                      │              │             │             │    {saved}  │
 │                   │                      │              │             │             │<────────────
 │                   │                      │              │             │             │            │
 │                   │ { success: true, findingsCount: 3 } │             │             │            │
 │<───────────────────────────────────────────────────────────────────────────────────────────────
 │                   │                      │              │             │             │            │
 │ Browser reloads   │                      │              │             │             │            │
 │ /app dashboard    │                      │              │             │             │            │
 ├───────────────────>                      │              │             │             │            │
 │                   │ GET /app (loader)    │              │             │             │            │
 │                   │                      │ Prisma.findMany()          │             │            │
 │                   │                      │             │             │             │            │
 │                   │                      │ [findings from DB]         │             │            │
 │                   │                      │<──────────────────────────────────────────────────────
 │                   │                      │              │             │             │            │
 │ Dashboard shows   │                      │              │             │             │            │
 │ new findings      │                      │              │             │             │            │
 |<────────────────────                     │              │             │             │            │
```

---

## 8. Priority & Status Color Coding (UI)

```
FINDING TYPE BADGES
────────────────────────────────────────────────────────────────
✓ "done"           → Green badge     "Handled"
⚠ "action_needed"  → Orange badge    "Action Needed"
ℹ "insight"        → Blue badge      "Insights"

PRIORITY COLOR CODING (within each type)
────────────────────────────────────────────────────────────────
1 = Red        (Critical — merchant must see)
2 = Orange     (High — should review today)
3 = Yellow     (Medium — review this week)
4 = Gray       (Low — nice to know)
5 = Light Gray (Nice-to-have — can ignore)

EXAMPLE DASHBOARD TAB
────────────────────────────────────────────────────────────────

┌─ ACTION NEEDED TAB ────────────────────────────────────────┐
│                                                             │
│  Priority 2 (Orange)                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 18 products invisible to ChatGPT                     │  │
│  │ These products lack metadata required for AI...      │  │
│  │ [Apply]  [Dismiss]                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Priority 3 (Yellow)                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ "Red Sneakers" page has 52% bounce rate             │  │
│  │ I suggest improving the hero image + size FAQ...    │  │
│  │ [Review]  [Dismiss]                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

This visual guide complements the detailed architecture report. Key takeaways:

1. **Zero Developer Overlap** — Each dev owns one folder, no git conflicts
2. **Clear Data Flow** — Agent → Executor → MongoDB → Dashboard
3. **Simple Status Lifecycle** — pending → applied/dismissed
4. **Fast Queries** — Strategic indexes on shop, agentId, type, status
5. **Deduplication** — UPSERT on deduplicationKey prevents duplicate findings
6. **Scalable Routes** — React Router v7 flat routes auto-discover all endpoints

Ready to implement!
