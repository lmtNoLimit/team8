# PRD: Your AI Store Secretary

**Version:** 3.0 | **Date:** March 2026 | **Status:** Draft for team alignment

---

## 1. The Concept

### Imagine an e-commerce company with only 2 people: the Merchant and their Secretary.

The merchant is the founder, the decision-maker. But they can't do everything alone — managing inventory, optimizing content, tracking competitors, staying visible to AI search engines, fixing storefront issues...

Today, that merchant either:
- Does everything themselves (burnout, things fall through the cracks)
- Hires a team they can't afford
- Installs 5-10 apps that don't talk to each other

**We give them the third option: an AI Secretary.**

The Secretary is not one tool. It's an entire operations team — a group of specialized agents working under one roof. Each agent is an expert in their domain. They monitor the store 24/7, handle what they can, and brief the merchant every morning on what needs their attention.

```
┌─────────────────────────────────────────────────────────┐
│                    THE MERCHANT                         │
│         (the boss — makes decisions, sets direction)    │
└─────────────────────┬───────────────────────────────────┘
                      │ morning briefing
┌─────────────────────▼───────────────────────────────────┐
│                  THE SECRETARY                          │
│    (AI-powered — manages the team, reports to boss)     │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ AEO      │ │ Content  │ │ Inventory│ │ Store-   │  │
│  │ Specialist│ │ Writer  │ │ Manager  │ │ front QA │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Schema   │ │ Trend    │ │ Competitor│ │  ...     │  │
│  │ Expert   │ │ Analyst  │ │ Watcher  │ │ (more)   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

### The Daily Rhythm

Every morning, the merchant opens the app. The Secretary has already done their homework:

```
Good morning! Here's your briefing:

HANDLED OVERNIGHT:
  - Updated llms.txt with 12 new products you added yesterday
  - Fixed broken structured data on 3 product pages
  - Flagged "Blue Widget" — selling out in 2 days at current pace

NEEDS YOUR DECISION:
  1. 18 products are invisible to ChatGPT Shopping
     → I've prepared optimized metadata. Apply all? [Yes / Review each]

  2. "Red Sneakers" page has 52% bounce rate
     → I suggest improving the hero image + adding size FAQ. Want me to draft it?

  3. Competitor X just appeared in Perplexity for "wireless headphones" — you're not
     → I can optimize your listing in 1 click. Go ahead? [Yes / Skip]

INSIGHTS:
  - "Sustainable packaging" trending +340% in AI searches this week
    You have 3 matching products not optimized yet
```

The merchant reviews. Approves. Delegates. Moves on with their day.

**That's the product.** A 2-person company that actually works.

---

## 2. Problem Statement

### Running a Shopify store alone is an impossible job.

A solo merchant is simultaneously the CEO, marketer, inventory manager, content writer, data analyst, SEO specialist, and customer service rep. The average merchant uses 5-10 apps, each solving one narrow problem in isolation. None of them talk to each other. None of them prioritize for you. None of them act on your behalf.

The result:
- **Cognitive overload:** Dozens of dashboards, alerts, and signals every day with no unified view
- **Missed opportunities:** Things fall through the cracks — a trending product not optimized, a stockout nobody caught, broken schema nobody noticed
- **No leverage:** Tools tell you *what's wrong* but leave you to fix it yourself. A solo merchant doesn't have the bandwidth.

### Why not Shopify Sidekick?

Shopify's Sidekick Pulse gives merchants daily recommendations — but it stays at the **admin level** (orders, analytics, general tips). Sidekick **has storefront data** but hasn't leveraged it yet. It doesn't tell you what your customers actually see, how AI agents discover your products, whether your structured data is broken, or how your content quality compares to competitors.

**The storefront is where revenue happens. That's where we go deep.**

---

## 3. Solution: The AI Secretary

### Core Concept

One app that acts as your AI Secretary — managing a team of specialist agents that run your store operations.

**Three trust levels (merchant controls how much the Secretary can do):**

| Level | Secretary Behavior | Merchant Effort |
|-------|-------------------|-----------------|
| **Advisor** (MVP) | "Here's what I found and what I recommend" | Merchant decides + acts |
| **Assistant** (V2) | "Here's what I recommend — one click to apply" | Merchant approves |
| **Autopilot** (V3) | "I handled these overnight. Here's what I did." | Merchant reviews |

Each merchant chooses their comfort level per agent. You might trust the Schema Agent on Autopilot but keep the Content Agent as Advisor.

### Why "Secretary" and not "Copilot"?

A copilot sits beside you while *you* drive. A secretary **runs the office** — they manage, coordinate, and execute so you can focus on the business. The mental model matters:

- Copilot: "I'll help you do things" (still your job)
- **Secretary: "I'll handle it and tell you what happened"** (it's their job)

---

## 4. The Agent Team

> The specific agents below are a **starting proposal for MVP**. The final list will be decided with the team. The architecture supports adding/removing agents freely.

Each agent follows the same pattern:
1. **Monitor** — continuously watch its domain
2. **Analyze** — identify issues, opportunities, trends
3. **Report** — write findings to the Secretary's briefing
4. **Act** (V2+) — execute approved actions

### Proposed MVP Agents

| Agent | Domain | What it does | Data Source |
|-------|--------|-------------|-------------|
| **AEO Agent** | AI Discoverability | Scores products for AI agent visibility (ChatGPT, Perplexity, Gemini), identifies blind spots | Product data + llms.txt + schema |
| **Content Agent** | Product Content | Audits titles/descriptions for quality, flags thin or duplicate content, drafts improvements | Product metafields + storefront |
| **Schema Agent** | Structured Data | Validates JSON-LD/structured data, auto-generates missing schema, fixes errors | Storefront HTML |
| **Inventory Agent** | Stock & Sales | Monitors stock levels, calculates sell-through velocity, flags stockouts and dead stock | Orders + Inventory API |
| **Storefront Agent** | Store Quality | Checks live storefront — page rendering, image quality, mobile issues, UX problems | Storefront MCP |

The **6th person** builds the **Secretary UI** (Command Center) — the daily briefing dashboard that aggregates all agent outputs.

---

## 5. Why Us — Moat

### 5.1 The Moat: Orchestration (A) + Execution (C)

**No one else is building a team of coordinated agents for Shopify merchants.**

Individual apps exist for AEO, inventory, content, SEO — but they're solo practitioners. We're building a **firm**. The moat compounds:

- **Orchestration:** Agents share context. The Inventory Agent sees what the Trend Agent spotted. The Content Agent knows what the AEO Agent needs. Isolated tools can't do this.
- **Execution:** We don't just report — we act. From V2 onward, the Secretary handles things so the merchant doesn't have to. This creates dependency (in a good way).
- **Growing team:** Each new agent makes the whole system smarter. Competitors would have to replicate the entire team, not just one feature.

### 5.2 The Sidekick Gap

| | Sidekick Pulse | Our Secretary |
|--|----------------|---------------|
| Data | Has admin + storefront data | Same data access via MCP |
| Focus | Admin-level insights (broad, shallow) | **Storefront-first** (deep, specialized) |
| Execution | Some admin actions | Storefront actions (content, schema, metadata, AEO) |
| Intelligence | General recommendations | Domain-expert agents with cross-agent context |

Sidekick **has** the storefront data but focuses on admin ops. We move first on storefront intelligence — the layer closest to revenue. We complement Sidekick, not compete.

If Sidekick eventually goes deeper on storefront: by then we're entrenched with merchant habits + superior domain depth.

### 5.3 Trust Progression = Switching Cost

```
Month 1:  Merchant reads briefings → sees value → trusts the Secretary
Month 2:  Merchant starts approving actions → saves time → depends on Secretary
Month 4:  Merchant enables Autopilot → Secretary runs the store → can't live without it
```

Turning off the app = firing your entire operations team.

---

## 6. MVP Scope — 4-Hour Hackathon

**Constraint:** 6 engineers, 4 hours each, 1 feature per person.

**Goal:** A working demo where 5 agents produce findings and the Secretary UI displays a morning briefing.

### Architecture

```
┌─────────────────────────────────────────────┐
│            Secretary UI (Briefing)           │
│   (Polaris dashboard — morning report)      │
└─────────────┬───────────────────────────────┘
              │ reads from
┌─────────────▼───────────────────────────────┐
│           Agent Findings Store              │
│   (agent_id, type, priority, title,         │
│    description, action, status)             │
└─────────────▲───────────────────────────────┘
              │ writes to
    ┌─────────┼─────────┬───────────┐
    │         │         │           │
┌───┴──┐ ┌───┴──┐ ┌───┴──┐ ┌─────┴────┐
│ AEO  │ │Content│ │Schema│ │Inventory │ ...
│Agent │ │Agent  │ │Agent │ │Agent     │
└──────┘ └──────┘ └──────┘ └──────────┘
```

Each agent is a **standalone module** — independently buildable, perfect for parallel development. All agents write to the same `agent_findings` table. The Secretary UI reads from it.

### Data Model

```prisma
model AgentFinding {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  agentId     String   // "aeo", "content", "schema", "inventory", "storefront"
  shop        String   // merchant shop domain
  type        String   // "done", "action_needed", "insight"
  priority    Int      // 1-5 (1 = highest)
  title       String   // "18 products invisible to ChatGPT"
  description String   // detailed explanation
  action      String?  // suggested action / one-click payload
  metadata    Json?    // agent-specific data
  status      String   @default("pending") // "pending", "applied", "dismissed"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| App Framework | Remix (Shopify template) |
| Frontend | React + Shopify Polaris |
| Database | MongoDB (Docker, already set up) |
| AI | Claude API |
| Storefront Data | Shopify Storefront MCP |
| Job Runner | Manual trigger for MVP (BullMQ later) |

### Hackathon Schedule

| Time | Activity |
|------|---------|
| 0:00 - 0:30 | Align on PRD + assign agents + set up shared infra |
| 0:30 - 1:00 | Scaffold: DB model, agent interface contract, UI shell |
| 1:00 - 3:30 | Parallel build: each person builds their agent / UI |
| 3:30 - 4:00 | Integration + demo prep |

**Definition of done per agent:** Produces at least 3 findings for a test store, writes to `agent_findings`, shows up in the Secretary briefing UI.

---

## 7. Post-MVP Roadmap

| Phase | Timeline | What changes |
|-------|----------|-------------|
| **V2 — Assistant** | Month 2 | Agents can execute with merchant approval. "Apply all" button. Undo/rollback. |
| **V3 — Autopilot** | Month 4 | Per-agent autonomy settings. Agents act overnight, report in morning. Trust scores. |
| **V4 — Agent Marketplace** | Month 6+ | Third-party agents. Merchants choose which to activate. Revenue share. |

**Agent expansion** (team to decide, not finalized):
- Pricing Agent, Review Agent, SEO Agent, Ad Agent, Competitive Agent, etc.
- Each new agent = more value = stronger moat

---

## 8. Pricing (Proposed)

| Tier | Price | What you get |
|------|-------|-------------|
| Free | $0 | 2 agents, 10 products, Advisor mode only |
| Starter | $29/mo | All agents, 100 products, Advisor mode |
| Pro | $79/mo | All agents, unlimited products, Assistant mode (one-click execution) |
| Agency | $199/mo | Multi-store (10), white-label, Autopilot mode |

**Value anchor:** Merchants pay $10-30/app for 5 isolated tools = $50-150/mo. One Secretary at $79/mo replaces them all.

---

## 9. Key Metrics

| Metric | Target (Y1) |
|--------|-------------|
| DAU/MAU | >30% (daily briefing habit) |
| Agents used per merchant | >3 (proves multi-agent value) |
| Actions executed via agents | >50/merchant/month |
| Free-to-paid conversion | 10-15% |
| Y1 ARR | $300K-$900K |

---

## 10. Risks

| Risk | Mitigation |
|------|-----------|
| "Super app" = mediocre at everything | Each agent must be best-in-class. Quality > quantity. Add agents slowly. |
| Sidekick leverages storefront data | First-mover on storefront depth. Entrenched habits + specialization by the time they catch up. |
| Merchant doesn't trust auto-execution | Start as Advisor. Build trust. Unlock Assistant/Autopilot only after proven accuracy. |
| 4-hour MVP too shallow | MVP proves the *concept* (multi-agent → unified briefing). Depth comes in V2. |
| Agent quality inconsistent | Shared quality bar: each agent must produce actionable, revenue-linked findings. No filler. |

---

## 11. Open Questions (for team)

1. **Which 5 agents for MVP?** Proposal above is a starting point
2. **App name?** "Secretary" is the concept — what's the product name?
3. **Claude API vs. other models?** Cost vs. quality per agent
4. **Storefront MCP endpoints** — which data is available today?
5. **Demo store** — which test store for the hackathon?

---

## 12. The One-Line Pitch

**"Your Shopify store is a 2-person company now. You're the boss. We're the Secretary."**

---

*The agent list, pricing, and roadmap will evolve. The core thesis is fixed: a solo merchant + an AI Secretary = a fully-staffed operation.*
