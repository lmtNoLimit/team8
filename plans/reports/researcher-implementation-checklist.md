# Implementation Checklist — Multi-Agent Architecture
**Date:** 2026-03-05
**Status:** Ready for team kickoff
**Effort:** ~4 hours (hackathon) across 6 developers

---

## Phase 0: Pre-Kickoff (Lead — 30 mins)

### Shared Infrastructure Setup

- [ ] Update `prisma/schema.prisma`
  - [ ] Add `AgentFinding` model (copy from research report)
  - [ ] Run `npm run setup` to validate + push to MongoDB
  - [ ] Verify no errors

- [ ] Create `app/lib/agent-interface.ts`
  - [ ] Copy TypeScript interfaces from research report
  - [ ] Mark file as READ-ONLY in team docs
  - [ ] Run `npm run typecheck` to verify syntax

- [ ] Create `app/agents/agent-registry.ts`
  - [ ] Implement `AgentRegistry` class with `.get()` and `.getAll()`
  - [ ] Add placeholder import stubs for all 5 agents (to be filled in by devs)
  - [ ] Test registry instantiation

- [ ] Create `app/services/agent-executor.server.ts`
  - [ ] Implement `AgentExecutor` class
  - [ ] Add `execute()` method with 30s timeout
  - [ ] Add `saveFindings()` with upsert logic on deduplicationKey
  - [ ] Test with mock agent

- [ ] Create API route files (skeletons)
  - [ ] `app/routes/app.api.agents.$agentId.run.tsx` (POST action)
  - [ ] `app/routes/app.api.agents.findings.tsx` (GET loader)
  - [ ] Both files should import registry + executor and work end-to-end

- [ ] Update `app/routes/app.tsx` (navigation)
  - [ ] Add nav links to `/app` (dashboard) and `/app/agents/{agentId}` (detail pages)

- [ ] Create dashboard shell
  - [ ] Update `app/routes/app._index.tsx` (or create fresh)
  - [ ] Loader: fetch findings grouped by type
  - [ ] Component: render 3 tabs (Handled / Action Needed / Insights)
  - [ ] Add "Run Now" buttons for manual agent triggers

- [ ] Create agent detail page
  - [ ] `app/routes/app.agents.$agentId.tsx`
  - [ ] Loader: fetch findings for one agent
  - [ ] Component: detail view (agent info + findings list)

- [ ] Verify git state
  - [ ] Commit all shared infra: `git add app/lib app/services app/routes prisma && git commit -m "chore: scaffold multi-agent infrastructure"`
  - [ ] Push to main (or wait for team to branch from this commit)

---

## Phase 1: Parallel Agent Development (Devs A–E, 1 hour each)

### Developer A: AEO Agent

**Git:** Branch: `feat/aeo-agent`

- [ ] Create folder: `app/agents/aeo-agent/`

- [ ] Create `app/agents/aeo-agent/aeo.agent.ts`
  - [ ] Implement `Agent` interface
  - [ ] `agentId = "aeo"`
  - [ ] `displayName = "AEO Specialist"`
  - [ ] Implement `run(shop, session)` method
    - [ ] Query products missing metadata (GraphQL)
    - [ ] Analyze with Claude
    - [ ] Return 1-3 findings

- [ ] Create `app/agents/aeo-agent/aeo.queries.server.ts`
  - [ ] GraphQL query to fetch products (title, description, metafields)
  - [ ] Filter for "invisible" products (missing key fields)
  - [ ] Return product array

- [ ] Create `app/agents/aeo-agent/aeo.prompts.ts`
  - [ ] Claude prompt for analyzing product metadata
  - [ ] Input: product array
  - [ ] Output: JSON findings (title, description, action)

- [ ] Create `app/agents/aeo-agent/aeo.test.ts`
  - [ ] Test: returns empty array when no issues found
  - [ ] Test: returns findings when metadata missing
  - [ ] Mock session object

- [ ] Test locally
  - [ ] Create test script to run agent with mock data
  - [ ] Verify findings are generated

- [ ] Commit: `git add app/agents/aeo-agent && git commit -m "feat: implement aeo agent"`

- [ ] **Definition of Done:** Agent produces ≥3 findings for test store

---

### Developer B: Content Agent

**Git:** Branch: `feat/content-agent`

- [ ] Create folder: `app/agents/content-agent/`

- [ ] Create `app/agents/content-agent/content.agent.ts`
  - [ ] Implement `Agent` interface
  - [ ] `agentId = "content"`
  - [ ] `displayName = "Content Writer"`
  - [ ] Implement `run(shop, session)` method
    - [ ] Query products for content quality (titles, descriptions)
    - [ ] Analyze with Claude
    - [ ] Return 1-3 findings (thin content, duplicates, missing info)

- [ ] Create `app/agents/content-agent/content.queries.server.ts`
  - [ ] GraphQL query: fetch product titles, descriptions, tags
  - [ ] Identify issues (short descriptions, duplicates, missing tags)

- [ ] Create `app/agents/content-agent/content.prompts.ts`
  - [ ] Claude prompt for content quality audit

- [ ] Create `app/agents/content-agent/content.test.ts`
  - [ ] Test content quality detection

- [ ] Commit: `git add app/agents/content-agent && git commit -m "feat: implement content agent"`

- [ ] **Definition of Done:** Agent produces ≥3 findings for test store

---

### Developer C: Schema Agent

**Git:** Branch: `feat/schema-agent`

- [ ] Create folder: `app/agents/schema-agent/`

- [ ] Create `app/agents/schema-agent/schema.agent.ts`
  - [ ] Implement `Agent` interface
  - [ ] `agentId = "schema"`
  - [ ] `displayName = "Schema Expert"`
  - [ ] Implement `run(shop, session)` method
    - [ ] Fetch storefront pages (product pages)
    - [ ] Parse JSON-LD structured data
    - [ ] Analyze with Claude
    - [ ] Return findings (missing schema, invalid JSON-LD, opportunities)

- [ ] Create `app/agents/schema-agent/schema.fetch-storefront.server.ts`
  - [ ] Fetch storefront HTML (fetch product pages)
  - [ ] Extract `<script type="application/ld+json">` tags
  - [ ] Parse JSON-LD

- [ ] Create `app/agents/schema-agent/schema.validators.ts`
  - [ ] Validate JSON-LD schema (presence of required fields)
  - [ ] Check for common errors (invalid types, missing price, etc.)

- [ ] Create `app/agents/schema-agent/schema.prompts.ts`
  - [ ] Claude prompt for schema analysis

- [ ] Create `app/agents/schema-agent/schema.test.ts`
  - [ ] Test JSON-LD parsing
  - [ ] Test schema validation

- [ ] Commit: `git add app/agents/schema-agent && git commit -m "feat: implement schema agent"`

- [ ] **Definition of Done:** Agent produces ≥3 findings for test store

---

### Developer D: Inventory Agent

**Git:** Branch: `feat/inventory-agent`

- [ ] Create folder: `app/agents/inventory-agent/`

- [ ] Create `app/agents/inventory-agent/inventory.agent.ts`
  - [ ] Implement `Agent` interface
  - [ ] `agentId = "inventory"`
  - [ ] `displayName = "Inventory Manager"`
  - [ ] Implement `run(shop, session)` method
    - [ ] Query inventory levels + order history
    - [ ] Calculate sell-through velocity
    - [ ] Flag stockouts, dead stock, low inventory
    - [ ] Return findings

- [ ] Create `app/agents/inventory-agent/inventory.queries.server.ts`
  - [ ] GraphQL: fetch products with inventory levels
  - [ ] GraphQL: fetch recent orders (for velocity calc)

- [ ] Create `app/agents/inventory-agent/inventory.calculations.ts`
  - [ ] Calculate units/day sell-through
  - [ ] Estimate days until stockout
  - [ ] Identify slow-moving items

- [ ] Create `app/agents/inventory-agent/inventory.prompts.ts`
  - [ ] Claude prompt for inventory insights

- [ ] Create `app/agents/inventory-agent/inventory.test.ts`
  - [ ] Test velocity calculation
  - [ ] Test stockout detection

- [ ] Commit: `git add app/agents/inventory-agent && git commit -m "feat: implement inventory agent"`

- [ ] **Definition of Done:** Agent produces ≥3 findings for test store

---

### Developer E: Storefront Agent

**Git:** Branch: `feat/storefront-agent`

- [ ] Create folder: `app/agents/storefront-agent/`

- [ ] Create `app/agents/storefront-agent/storefront.agent.ts`
  - [ ] Implement `Agent` interface
  - [ ] `agentId = "storefront"`
  - [ ] `displayName = "Storefront QA"`
  - [ ] Implement `run(shop, session)` method
    - [ ] Check storefront pages (performance, mobile, images, rendering)
    - [ ] Return findings (broken images, slow pages, mobile issues, UX problems)

- [ ] Create `app/agents/storefront-agent/storefront.screenshots.server.ts`
  - [ ] Fetch storefront pages
  - [ ] Check HTTP status, load time
  - [ ] Parse HTML for image validity
  - [ ] (Optional: use Playwright for full page checks)

- [ ] Create `app/agents/storefront-agent/storefront.prompts.ts`
  - [ ] Claude prompt for storefront quality analysis

- [ ] Create `app/agents/storefront-agent/storefront.test.ts`
  - [ ] Test page fetch + parse
  - [ ] Test image link validation

- [ ] Commit: `git add app/agents/storefront-agent && git commit -m "feat: implement storefront agent"`

- [ ] **Definition of Done:** Agent produces ≥3 findings for test store

---

## Phase 2: Dashboard UI (Developer F, 1 hour)

**Git:** Branch: `feat/secretary-dashboard`

- [ ] Update `app/routes/app._index.tsx`
  - [ ] Loader: fetch findings grouped by type
  - [ ] Component: render 3 tabs
    - [ ] "Handled" (type: "done")
    - [ ] "Action Needed" (type: "action_needed")
    - [ ] "Insights" (type: "insight")
  - [ ] Within each tab, sort by priority (1 first)

- [ ] Create `app/components/secretary-briefing/briefing-header.tsx`
  - [ ] Heading: "Good morning! Your briefing is ready."
  - [ ] Subheading: last update time
  - [ ] "Run All Agents" button (optional for MVP)

- [ ] Create `app/components/secretary-briefing/findings-tabs.tsx`
  - [ ] 3 tabs for type grouping
  - [ ] Count badge per tab

- [ ] Create `app/components/secretary-briefing/finding-card.tsx`
  - [ ] Display: title, description, priority color
  - [ ] Action buttons: [Apply] / [Dismiss] if status pending
  - [ ] Show metadata summary (optional)

- [ ] Create `app/components/secretary-briefing/agent-status-footer.tsx`
  - [ ] Show all agents + last run timestamp
  - [ ] "Run Now" button next to each agent

- [ ] Test dashboard locally
  - [ ] Manually insert test findings into MongoDB
  - [ ] Verify dashboard groups + displays correctly
  - [ ] Click "Run Now" on an agent (should trigger API endpoint)
  - [ ] Verify new findings appear

- [ ] Commit: `git add app/routes/app._index.tsx app/components/secretary-briefing && git commit -m "feat: implement secretary dashboard"`

- [ ] **Definition of Done:** Dashboard displays findings from agents, "Run Now" buttons work

---

## Phase 3: Integration & Merge (Lead, 30 mins)

- [ ] Review all 6 branches
  - [ ] Verify no shared file edits
  - [ ] Confirm all agents implement `Agent` interface correctly
  - [ ] Check Prisma compatibility

- [ ] Update `app/agents/agent-registry.ts`
  - [ ] Uncomment/add imports for all 5 agents
  - [ ] Register all agents in constructor
  - [ ] Run `npm run typecheck` to verify

- [ ] Merge all branches into main
  - [ ] Use squash or regular merge (no fast-forward required)
  - [ ] Resolve any conflicts (should be none if file ownership respected)

- [ ] Post-merge verification
  - [ ] `npm run typecheck` — should pass
  - [ ] `npm run lint` — should pass (or only warn on non-critical)
  - [ ] `npm run dev` — app should start

- [ ] Smoke test
  - [ ] Visit `/app` dashboard — should load without errors
  - [ ] Click "Run Now" for one agent — should trigger execution
  - [ ] Check MongoDB for inserted findings
  - [ ] Refresh dashboard — should show findings

---

## Definition of Done (MVP)

### Per Agent
- [ ] Implements `Agent` interface
- [ ] Produces ≥3 findings for test shop
- [ ] Writes findings to MongoDB (via executor)
- [ ] No errors or timeouts

### Dashboard
- [ ] Displays findings from all agents
- [ ] Groups by type (done / action_needed / insight)
- [ ] Sorts by priority within each group
- [ ] "Run Now" buttons trigger agents
- [ ] No console errors

### Database
- [ ] `AgentFinding` model in Prisma
- [ ] ✓ Deduplication via upsert
- [ ] ✓ Indexes on (shop, agentId), (shop, type, status)

### Code Quality
- [ ] TypeScript compilation passes
- [ ] No import errors
- [ ] ESLint warnings only (no errors)
- [ ] All routes auto-discovered by React Router

---

## Parallel Development Timeline

```
Timeline (Ideal)
────────────────────────────────────────────────────────

0:00 - 0:30  SETUP (Lead)
             ├─ Scaffold shared infra
             ├─ Create Prisma model
             ├─ Create agent interface
             ├─ Create routes + executor
             └─ Commit to main

0:30 - 3:30  PARALLEL BUILD (Devs A–F)
             Dev A ─ AEO Agent (1 hour)
             Dev B ─ Content Agent (1 hour)
             Dev C ─ Schema Agent (1 hour)
             Dev D ─ Inventory Agent (1 hour)
             Dev E ─ Storefront Agent (1 hour)
             Dev F ─ Dashboard (1 hour)

3:30 - 4:00  INTEGRATION & DEMO (Lead)
             ├─ Merge all branches
             ├─ Update registry
             ├─ Run full test
             └─ Demo to team
```

---

## Git Workflow

### Branch Strategy
```bash
# Lead creates main shared infra
git checkout -b chore/shared-infrastructure
git commit -m "chore: scaffold multi-agent infrastructure"
git push origin chore/shared-infrastructure
# → PR review + merge to main

# Each dev branches from main
git checkout main
git pull
git checkout -b feat/[agent-name]-agent
# ... implement ...
git commit -m "feat: implement [agent-name] agent"
git push origin feat/[agent-name]-agent
# → Don't create PR yet (wait for lead)

# Lead: merge all branches at once
git checkout main
git pull
git merge --no-ff feat/aeo-agent
git merge --no-ff feat/content-agent
git merge --no-ff feat/schema-agent
git merge --no-ff feat/inventory-agent
git merge --no-ff feat/storefront-agent
git merge --no-ff feat/secretary-dashboard
git push origin main
```

### Commit Message Style
```
feat: implement [agent-name] agent
feat: implement secretary dashboard
chore: scaffold multi-agent infrastructure
```

---

## Testing During Development

### Per-Agent Testing (No Backend Needed)
```typescript
// agents/aeo-agent/aeo.test.ts
import { AEOAgent } from "./aeo.agent";

const agent = new AEOAgent();

// Mock session
const mockSession = {
  shop: "test.myshopify.com",
  accessToken: "fake-token",
  graphql: jest.fn().mockResolvedValue({
    data: { products: { edges: [/* mock products */] } }
  })
};

// Run agent
const findings = await agent.run("test.myshopify.com", mockSession);

// Assert
expect(findings).toHaveLength(3);
expect(findings[0].type).toBe("action_needed");
```

### Manual Testing (After Shared Infra Ready)
```bash
# Start dev server
npm run dev

# Visit dashboard
open http://localhost:3000/app

# Manually insert test findings
npx prisma studio
# → Add a row to agent_findings table

# Refresh browser
# → Should see finding on dashboard

# Trigger agent manually
curl -X POST http://localhost:3000/app/api/agents/aeo/run
# → Should return { success: true, findingsCount: X }
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Agent not discovered | Registry not updated | Dev commits agent, Lead adds to registry |
| Findings not saving | Executor not called | Verify route action calls agentExecutor.execute() |
| Dashboard blank | No findings in DB | Manually insert test data or run agent |
| TypeScript errors | Missing interface | Verify agent implements `Agent` interface |
| API timeout | Agent > 30s | Add `async.parallel()` or `Promise.race()` timeout |
| Dedup not working | Missing deduplicationKey | Ensure agent returns unique `deduplicationKey` per finding |

---

## Success Criteria (MVP Demo)

At 4:00 PM, team demonstrates:

1. ✓ Dashboard loads at `/app`
2. ✓ Shows findings from ≥3 agents
3. ✓ Findings grouped by type (done / action_needed / insight)
4. ✓ Priority color-coded
5. ✓ "Run Now" button triggers agent execution
6. ✓ New findings appear after execution
7. ✓ No errors in console or server logs
8. ✓ Code is clean and follows interface contract

That's MVP. ✓

---

## Post-MVP (Roadmap Notes)

### V2 — Assistant Mode
- [ ] "Apply" button executes agent-suggested actions
- [ ] Undo/rollback for applied findings
- [ ] Action payload standardization

### V3 — Autopilot Mode
- [ ] BullMQ for scheduled runs (daily 6 AM)
- [ ] Per-agent trust scores
- [ ] Merchants enable autopilot per agent

### Scaling
- [ ] Finding retention policy (delete after 30 days)
- [ ] Parallel agent execution
- [ ] Multi-shop analytics
- [ ] Agent performance metrics

---

## Contact & Support

If you hit blockers during implementation:

1. **Agent interface question?** → Check `agent-interface.ts` (read-only spec)
2. **Executor issue?** → Check `agent-executor.server.ts` or ask lead
3. **Database problem?** → Check Prisma schema + run `npm run setup`
4. **Route not working?** → Verify React Router naming (dots → segments)

Good luck! 🚀
