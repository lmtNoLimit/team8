---
title: "AI Secretary UI & Agent Infrastructure"
description: "Shared infra + dashboard UI enabling 5-6 devs to independently build specialized agents for a morning briefing system"
status: pending
priority: P1
effort: 12h (2h lead infra + 4h parallel agent dev + 2h UI + 2h integration + 2h buffer)
branch: main
tags: [infrastructure, agents, dashboard, hackathon, polaris]
created: 2026-03-05
---

# AI Secretary UI & Agent Infrastructure

## Goal

Build shared infrastructure and dashboard UI so 5-6 engineers can independently build specialized agents during a 4-hour hackathon. Each agent writes findings to MongoDB; the Secretary Dashboard displays them as a morning briefing.

## Architecture Overview

```
Merchant opens /app
        |
  Secretary Dashboard (app._index.tsx)
  reads from agent_findings collection
        ^
        | writes via FindingStorage service
   +----|----+------+------+------+
   |    |    |      |      |      |
  AEO Content Schema Inventory Storefront
  (A)   (B)   (C)    (D)       (E)
```

## Phases

| # | Phase | Owner | Status | Effort |
|---|-------|-------|--------|--------|
| 1 | [Prisma Schema & DB Setup](./phase-01-prisma-schema-and-db-setup.md) | Lead | pending | 15min |
| 2 | [Agent Interface Contract](./phase-02-agent-interface-contract.md) | Lead | pending | 15min |
| 3 | [Agent Registry & Executor Services](./phase-03-agent-registry-and-executor-services.md) | Lead | pending | 30min |
| 4 | [API Routes for Agent Execution](./phase-04-api-routes-for-agent-execution.md) | Lead | pending | 20min |
| 5 | [Stub Agents for Each Developer](./phase-05-stub-agents-for-each-developer.md) | Lead | pending | 20min |
| 6 | [Secretary Dashboard UI](./phase-06-secretary-dashboard-ui.md) | Dev F / Lead | pending | 2h |
| 7 | [Agent Detail Page](./phase-07-agent-detail-page.md) | Lead | pending | 30min |
| 8 | [Navigation Update](./phase-08-navigation-update.md) | Lead | pending | 10min |
| 9 | [Agent Developer Guide](./phase-09-agent-developer-guide.md) | Lead | pending | 20min |

## Key Dependencies

- Phases 1-5 MUST complete before hackathon begins (lead pre-work)
- Phase 6 can start in parallel with agent development
- Phases 7-8 can happen any time after Phase 4
- Phase 9 delivered as a document before kickoff

## File Ownership Matrix

| Owner | Files |
|-------|-------|
| Lead | `prisma/schema.prisma`, `app/lib/agent-interface.ts`, `app/agents/agent-registry.ts`, `app/services/**`, `app/routes/app.api.*`, `app/routes/app.agents.*`, `app/routes/app.tsx` |
| Dev A (AEO) | `app/agents/aeo-agent/**` |
| Dev B (Content) | `app/agents/content-agent/**` |
| Dev C (Schema) | `app/agents/schema-agent/**` |
| Dev D (Inventory) | `app/agents/inventory-agent/**` |
| Dev E (Storefront) | `app/agents/storefront-agent/**` |
| Dev F (UI) | `app/routes/app._index.tsx`, `app/components/secretary-briefing/**` |

## Definition of Done

Each agent produces >= 3 findings for a test store, writes to `agent_findings`, and shows up in the Secretary briefing UI.
