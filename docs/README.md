# AI Store Secretary - Documentation Hub

Welcome to the documentation for **AI Store Secretary**, a Shopify embedded app that orchestrates AI agents to optimize merchant stores.

**Current Version:** 1.0.0 (Released 2026-03-05)
**Status:** Stable with Billing System Complete

---

## Quick Navigation

### For Everyone
- **[Project Overview & PDR](./project-overview-pdr.md)** — Vision, requirements, acceptance criteria, and use cases
- **[Roadmap](./project-roadmap.md)** — Timeline, phases, metrics, and upcoming features
- **[Changelog](./project-changelog.md)** — What's new in v1.0.0 and version history

### For Developers
- **[Codebase Summary](./codebase-summary.md)** — File structure, core features, tech stack
- **[System Architecture](./system-architecture.md)** — Design diagrams, data models, request flows
- **[Code Standards](./code-standards.md)** — Patterns, conventions, best practices, and examples

### For Agent Developers
- **[Agent Developer Guide](./agent-developer-guide.md)** — How to create and register agents (locked interface)

### For Documentation Maintainers
- **[Update Summary](./UPDATE_SUMMARY.md)** — What changed in recent updates (2026-03-05)

---

## Key Concepts

### Plan Tiers
The app uses a 4-tier subscription model with feature gating:

| Tier | Price | Agents | Runs/Week | Products | Trust Levels | Stores |
|------|-------|--------|-----------|----------|--------------|--------|
| **Free** | $0 | 2 | 2 | 25 | Advisor | 1 |
| **Starter** | $29 | 4 | 7 | 100 | Advisor + Assistant | 1 |
| **Pro** | $99 | 6 | Unlimited | Unlimited | All | 1 |
| **Agency** | $249 | 6 | Unlimited | Unlimited | All | 5+ |

→ See [Project Overview](./project-overview-pdr.md#plan-tiers) for details

### Feature Gating
Features are limited by plan tier:
- **Agent Count:** Free=2, Starter=4, Pro/Agency=6
- **Trust Levels:** Free=Advisor, Starter=+Assistant, Pro/Agency=+Autopilot
- **Run Frequency:** Free=2/week, Starter=7/week, Pro/Agency=unlimited
- **Product Limit:** Free=25, Starter=100, Pro/Agency=unlimited

→ See [Code Standards](./code-standards.md#billing-service-patterns) for implementation

### Agent System
6 AI agents analyze stores and produce findings:
1. **AEO Agent** — Conversion rate optimization
2. **Content Agent** — Product descriptions
3. **Inventory Agent** — Stock levels
4. **Review Agent** — Customer sentiment
5. **Schema Agent** — Structured data
6. **Storefront Agent** — UX/performance

→ See [Codebase Summary](./codebase-summary.md#core-features) for agent details

### Trust Levels
Control how agents take action:
- **Advisor** (Free) — Read-only findings, no actions
- **Assistant** (Starter+) — Manual "Apply" / "Dismiss" buttons
- **Autopilot** (Pro/Agency) — Auto-execute within 5 seconds

→ See [System Architecture](./system-architecture.md#trust-level-behaviors) for behaviors

---

## Common Tasks

### I want to...

#### Add a new agent
1. Read: [Agent Developer Guide](./agent-developer-guide.md)
2. Reference: [Code Standards - Agent Development](./code-standards.md#agent-development)
3. Implement: Create `app/agents/{name}-agent/{name}-agent.server.ts`
4. Register: Add to `app/agents/agent-registry.server.ts`

#### Add a new plan tier
1. Read: [Code Standards - Adding New Plan Tiers](./code-standards.md#adding-new-plan-tiers)
2. Edit: `app/lib/plan-config.ts` (PLAN_LIMITS + PlanTier type)
3. Update: `billing-mutations.server.ts` (createSubscription pricing)
4. Test: Plan enforcement flows in plan.md

#### Understand the billing system
1. Start: [Codebase Summary - Billing System](./codebase-summary.md#key-patterns--constraints)
2. Deep dive: [System Architecture - Billing Subsystem](./system-architecture.md#2-billing--entitlement-system)
3. Implementation: [Code Standards - Billing Patterns](./code-standards.md#billing-service-patterns)

#### Deploy to production
1. Read: [Project Overview - Deployment](./project-overview-pdr.md#deployment)
2. Check: [Codebase Summary - Configuration Files](./codebase-summary.md#configuration-files)
3. Reference: CLAUDE.md Config Files section

#### Debug a feature gating issue
1. Check: [System Architecture - Feature Gates](./system-architecture.md#plan-tiers-feature-limits)
2. Review: `app/services/billing.server.ts` (canRunAgents function)
3. Validate: Subscription status and plan limits

#### Review what changed
1. See: [Changelog](./project-changelog.md) for v1.0.0
2. See: [Update Summary](./UPDATE_SUMMARY.md) for 2026-03-05 changes
3. Details: Each doc has "Changed" section

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Shopify Merchant Store                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         React Router App (Daily Briefing)               │
│       Polaris Web Components (s-* elements)             │
└─────────────────────────────────────────────────────────┘
                    /        |         \
        ┌───────────┴─────────┴────────────┐
        ↓           ↓          ↓            ↓
    ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │ Agents │ │Billing │ │Findings│ │Shopify   │
    │(Claude)│ │ Gates  │ │Storage │ │Admin API │
    └────────┘ └────────┘ └────────┘ └──────────┘
        ↓           ↓          ↓            ↓
        └───────────┴─────────┴────────────┘
              ↓
        ┌──────────────────┐
        │  MongoDB         │
        │  (Findings,      │
        │   Plans,         │
        │   Settings)      │
        └──────────────────┘
```

→ Full diagram: [System Architecture - High-Level Overview](./system-architecture.md#high-level-overview)

---

## File Organization

```
docs/
├── README.md                      ← You are here
├── codebase-summary.md            ← Quick codebase overview
├── system-architecture.md         ← Design & data flow
├── code-standards.md              ← Patterns & conventions
├── project-overview-pdr.md        ← Vision & requirements
├── project-roadmap.md             ← Timeline & phases
├── project-changelog.md           ← Version history
├── agent-developer-guide.md       ← How to create agents
└── UPDATE_SUMMARY.md              ← Recent changes
```

---

## Tech Stack

- **Frontend:** React Router v7 + Polaris web components (s-* custom elements)
- **Backend:** Node.js + Express (via Shopify CLI)
- **Database:** MongoDB + Prisma ORM
- **AI:** Claude API (claude-sonnet-4-6)
- **Billing:** Shopify App Subscriptions API
- **Auth:** Shopify OAuth 2.0

→ See [Codebase Summary - Stack](./codebase-summary.md#tech-stack)

---

## Key Services

### Core Billing (app/services/billing.server.ts)
- `getShopPlan(shop)` — Fetch or initialize subscription
- `canRunAgents(shop)` — Check if run is allowed (gate)
- `enforcePlanLimits(shop, tier)` — Downgrade agents/trust levels
- `getUsageSummary(shop)` — For UI display

### Billing Mutations (app/services/billing-mutations.server.ts)
- `createSubscription()` — Initiate checkout
- `getSubscriptionStatus()` — Poll Shopify
- `cancelSubscription()` — Downgrade to free
- `createUsageRecord()` — Track Agency overage

### Agent Execution (app/services/agent-executor.server.ts)
- `execute()` — Run agents in parallel with 30s timeout

### Finding Storage (app/services/finding-storage.server.ts)
- `upsertFinding()` — Store findings with deduplication
- `updateFindingStatus()` — Mark applied/dismissed

### Activity Logging (app/services/activity-log.server.ts)
- `logActivity()` — Audit trail for all events

→ Full details: [System Architecture - Services](./system-architecture.md#core-subsystems)

---

## Database Schema

### Subscription & Plan
- **ShopPlan** — Current tier, subscription ID, dates
- **ProductCount** — Cached product count (24h TTL)
- **RunFrequencyLog** — Weekly run tracking
- **StoreAssignment** — Multi-store relationships

### Findings
- **AgentFinding** — Discoveries with status tracking
- **Review** — Customer review data
- **AgentSetting** — Per-agent config (trust level, enabled)

### Audit
- **ActivityLog** — All user actions and agent runs
- **StoreProfile** — Merchant metadata

### Auth
- **Session** — Shopify OAuth sessions

→ Full schema: [System Architecture - Data Model](./system-architecture.md#data-model)

---

## Routing

### Main Pages
- `GET /app` — Daily Briefing dashboard
- `GET /app/agents` — My Team (agents list + activity)
- `GET /app/agents/{agentId}` — Agent detail
- `GET /app/settings` — Store profile + trust levels
- `GET /app/upgrade` — Plan comparison + upgrade flow

### API Routes
- `POST /app/api/agents/{agentId}/run` — Run single agent
- `POST /app/api/agents/run-all` — Run all agents
- `POST /app/api/agents/findings` — Upsert finding
- `PATCH /app/api/agents/findings/{id}/status` — Update status
- `POST /app/api/billing/subscribe` — Start subscription
- `GET /app/api/billing/callback` — Subscription callback

### Webhooks
- `POST /webhooks/app/subscriptions_update` — Subscription state change
- `POST /webhooks/app/uninstalled` — App uninstall cleanup
- `POST /webhooks/app/scopes_update` — Permission changes

→ Full list: [CLAUDE.md - Routing](../CLAUDE.md#routing-flat-file-system-routes)

---

## Getting Started

### 1. Read the Overview (15 min)
- [Project Overview - Vision Section](./project-overview-pdr.md#2-product-vision)
- [Codebase Summary - Project Overview](./codebase-summary.md#project-overview)

### 2. Understand the Architecture (30 min)
- [System Architecture - High-Level Overview](./system-architecture.md#high-level-overview)
- [System Architecture - Core Subsystems](./system-architecture.md#core-subsystems)

### 3. Set Up Development (See main README.md in repo)
```bash
# See /Users/lmtnolimit/projects/team8/README.md for setup
npm run dev
```

### 4. Read Your Role-Specific Docs
- **Agent Developer?** → [Agent Developer Guide](./agent-developer-guide.md)
- **Backend Engineer?** → [Code Standards](./code-standards.md)
- **Product Manager?** → [Project Overview](./project-overview-pdr.md)
- **DevOps?** → [Deployment](./project-overview-pdr.md#deployment)

### 5. Explore the Codebase
```bash
# Key directories
app/services/          # Business logic (billing, agents, findings)
app/components/        # UI components (all Polaris web components)
app/lib/              # Utilities (plan config, AI wrapper, agent interface)
app/routes/           # Route handlers (pages, APIs, webhooks)
prisma/schema.prisma  # Database schema
```

---

## Support & References

### Internal Documentation
- CLAUDE.md — Project guide with commands, architecture, rules
- /README.md — Setup and troubleshooting (Vietnamese)

### External References
- [Shopify Admin API Docs](https://shopify.dev/docs/api/admin-rest)
- [React Router Docs](https://reactrouter.com/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Claude API Docs](https://console.anthropic.com/docs/api)
- [Polaris Web Components](https://shopify.dev/docs/api/polaris-web-components)

### Community
- Shopify Partner Dashboard
- Anthropic Discord/Community
- React Router GitHub Discussions

---

## Contributing

### Updating Documentation
1. Edit relevant .md file in docs/
2. Verify examples match actual code
3. Update changelog entry
4. Link to related sections

### Code Changes That Impact Docs
- New agent? → Update [agent-developer-guide.md](./agent-developer-guide.md)
- New route? → Update [CLAUDE.md](../CLAUDE.md) routing section
- New service? → Update [system-architecture.md](./system-architecture.md)
- New pattern? → Update [code-standards.md](./code-standards.md)
- Phase complete? → Update [project-roadmap.md](./project-roadmap.md)

### Review Schedule
- **Weekly:** Verify code matches docs
- **Monthly:** Update metrics and progress
- **Phase-based:** Major doc updates for new features

---

## FAQ

**Q: Where do I find the billing limit for Free tier?**
A: See [Project Overview - Plan Tiers](./project-overview-pdr.md#4-plan-limits--feature-gating) or [Code Standards - Plan Limits](./code-standards.md#adding-new-plan-tiers)

**Q: How do I add a new agent?**
A: See [Agent Developer Guide](./agent-developer-guide.md) or [Code Standards - Agent Development](./code-standards.md#agent-development)

**Q: What is the subscription lifecycle?**
A: See [System Architecture - Subscription Lifecycle](./system-architecture.md#5-shopify-billing-integration)

**Q: How are features gated by plan?**
A: See [System Architecture - Plan Tiers & Feature Gating](./system-architecture.md#plan-tiers-feature-limits)

**Q: Where is the feature gating code?**
A: `app/services/billing.server.ts` (core), `app/lib/plan-config.ts` (limits)

**Q: How do I deploy to production?**
A: See [Project Overview - Deployment](./project-overview-pdr.md#deployment) and CLAUDE.md Config Files

**Q: What changed in v1.0.0?**
A: See [Changelog v1.0.0](./project-changelog.md#100---2026-03-05-release-candidate--stable)

**Q: How do I understand the request flow?**
A: See [System Architecture - Request Flow Examples](./system-architecture.md#request-flow-examples) (3 scenarios)

---

## Document Status

| Document | Status | Last Updated | Coverage |
|----------|--------|--------------|----------|
| README.md | ✅ Complete | 2026-03-05 | 100% |
| codebase-summary.md | ✅ Complete | 2026-03-05 | 100% |
| system-architecture.md | ✅ Complete | 2026-03-05 | 100% |
| code-standards.md | ✅ Complete | 2026-03-05 | 100% |
| project-overview-pdr.md | ✅ Complete | 2026-03-05 | 100% |
| project-roadmap.md | ✅ Complete | 2026-03-05 | 100% |
| project-changelog.md | ✅ Complete | 2026-03-05 | 100% |
| agent-developer-guide.md | ✅ Existing | Earlier | 100% |
| UPDATE_SUMMARY.md | ✅ Complete | 2026-03-05 | 100% |

---

## Quick Links by Role

### Product Manager
1. [Project Overview - Vision](./project-overview-pdr.md#2-product-vision)
2. [Roadmap - Metrics](./project-roadmap.md#metrics-dashboard)
3. [Changelog - What's New](./project-changelog.md#100---2026-03-05-release-candidate--stable)

### Backend Engineer
1. [Code Standards - Patterns](./code-standards.md)
2. [System Architecture - Services](./system-architecture.md#core-subsystems)
3. [Codebase Summary - File Organization](./codebase-summary.md#file-organization)

### Frontend Engineer
1. [Code Standards - Polaris Components](./code-standards.md#polaris-web-components)
2. [Code Standards - React Router](./code-standards.md#react-router-patterns)
3. [Codebase Summary - UI Components](./codebase-summary.md#ui-components)

### Agent Developer
1. [Agent Developer Guide](./agent-developer-guide.md)
2. [Code Standards - Agent Development](./code-standards.md#agent-development)
3. [Codebase Summary - Agent System](./codebase-summary.md#1-agent-system)

### DevOps/Infra
1. [Project Overview - Deployment](./project-overview-pdr.md#deployment)
2. [Codebase Summary - Configuration](./codebase-summary.md#configuration-files)
3. CLAUDE.md Config Files section

---

**Last Updated:** 2026-03-05
**Version:** 1.0.0
**Maintained By:** Documentation Team

---

*For questions or contributions, see the [contributing guidelines](./UPDATE_SUMMARY.md#next-steps-for-maintaining-docs)*
