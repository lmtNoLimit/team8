---
phase: 1
title: "Prisma Schema & DB Setup"
status: pending
owner: Lead
effort: 15min
---

# Phase 1: Prisma Schema & DB Setup

## Context Links
- [PRD](../../docs/plans/2026-03-05-agentic-super-app-prd.md)
- [Researcher Report](../reports/researcher-multi-agent-architecture.md)
- Current schema: `prisma/schema.prisma`

## Overview

Add the `AgentFinding` model to Prisma schema and push to MongoDB Atlas. This is the central data store all agents write to and the dashboard reads from.

## Key Insights

- MongoDB uses `prisma db push` (no migrations)
- Existing `Session` model must remain untouched
- Composite indexes needed for dashboard query performance
- `deduplicationKey` needs a unique constraint for upsert support, but MongoDB with Prisma doesn't support `@@unique` on nullable fields easily -- use a compound unique on `[shop, agentId, deduplicationKey]` instead

## Requirements

**Functional:**
- Store agent findings with type, priority, title, description, action, metadata
- Support deduplication on reruns
- Query by shop + agentId, shop + type + status efficiently

**Non-functional:**
- Schema must validate via `npm run typecheck`
- `prisma db push` must succeed without data loss on existing Session collection

## Related Code Files

**Modify:**
- `prisma/schema.prisma` -- add AgentFinding model

## Implementation Steps

### Step 1: Add AgentFinding model to schema

Append to `prisma/schema.prisma` after the Session model:

```prisma
model AgentFinding {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId

  agentId          String   // "aeo", "content", "schema", "inventory", "storefront"
  shop             String   // merchant shop domain

  type             String   // "done", "action_needed", "insight"
  priority         Int      // 1-5 (1 = most critical)

  title            String   // headline for briefing (max 60 chars)
  description      String   // detailed explanation (max 300 chars)
  action           String?  // suggested action / one-click payload (JSON string)

  metadata         Json?    // agent-specific flexible data

  status           String   @default("pending") // "pending", "applied", "dismissed"

  deduplicationKey String?  // prevents duplicate findings on reruns
  externalId       String?  // agent's unique identifier for the finding

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([shop, agentId, deduplicationKey])
  @@index([shop, agentId])
  @@index([shop, type, status])
  @@index([createdAt])
}
```

### Step 2: Generate Prisma client and push schema

```bash
npx prisma generate
npx prisma db push
```

### Step 3: Verify

```bash
npm run typecheck
```

Open Prisma Studio to confirm collection exists:
```bash
npx prisma studio
```

## Todo List

- [ ] Add AgentFinding model to `prisma/schema.prisma`
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push`
- [ ] Run `npm run typecheck` to verify
- [ ] Confirm via Prisma Studio

## Success Criteria

- `AgentFinding` collection exists in MongoDB Atlas
- `prisma.agentFinding.findMany()` compiles without error
- Existing `Session` data is untouched
- Compound unique index on `[shop, agentId, deduplicationKey]` exists

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `prisma db push` fails on existing data | Schema is additive (new model only), no risk to Session |
| Nullable `deduplicationKey` in unique index | MongoDB handles null uniqueness per-document; multiple nulls are allowed |

## Next Steps

Proceed to Phase 2 (Agent Interface Contract) immediately after.
