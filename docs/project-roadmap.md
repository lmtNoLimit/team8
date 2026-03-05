# Project Roadmap - AI Store Secretary

**Last Updated:** 2026-03-05
**Current Phase:** Complete (MVP + Billing System Shipped)

---

## Completed Phases (Shipped)

### Phase 0: Foundation (Completed - 2026-02-15)
**Goal:** Establish core architecture and infrastructure

**Deliverables:**
- [x] React Router v7 setup with Polaris web components
- [x] MongoDB + Prisma ORM integration
- [x] Shopify OAuth authentication
- [x] Database schema (Session, AgentFinding, Review, etc.)
- [x] Shopify App Bridge v4 integration

**Status:** ✅ Complete

---

### Phase 1: Agent Infrastructure (Completed - 2026-02-20)
**Goal:** Build agent execution system and 6 agents

**Deliverables:**
- [x] Agent interface contract (`app/lib/agent-interface.ts`)
- [x] Agent executor with parallel execution + 30s timeout (`app/services/agent-executor.server.ts`)
- [x] AEO Agent (conversion rate optimization)
- [x] Content Agent (product descriptions)
- [x] Inventory Agent (stock optimization)
- [x] Review Agent (sentiment analysis)
- [x] Schema Agent (structured data markup)
- [x] Storefront Agent (performance audits)
- [x] Finding storage with deduplication
- [x] Finding status tracking (pending/applied/dismissed)
- [x] Activity logging system
- [x] Daily Briefing dashboard UI

**Status:** ✅ Complete

**Key Files:**
- `app/lib/agent-interface.ts` (locked contract)
- `app/agents/*-agent/*.server.ts` (6 agent implementations)
- `app/services/agent-executor.server.ts`
- `app/services/finding-storage.server.ts`
- `app/services/activity-log.server.ts`

---

### Phase 2: Settings & Control (Completed - 2026-02-25)
**Goal:** Allow merchants to enable/disable agents and set trust levels

**Deliverables:**
- [x] Agent enable/disable toggles
- [x] Trust level dropdowns (advisor/assistant/autopilot)
- [x] Store profile form (name, industry, audience)
- [x] Trust level status indicators in findings
- [x] Trust-level-based action buttons (read-only/apply-dismiss/auto-execute)
- [x] Activity audit trail
- [x] Agent detail pages with context

**Status:** ✅ Complete

**Key Files:**
- `app/routes/app.settings.tsx`
- `app/components/agent-trust-control.tsx`
- `app/components/agent-status-bar.tsx`
- `app/services/agent-settings.server.ts`

---

### Phase 3: Billing & Subscription (Completed - 2026-03-05)
**Goal:** Implement Shopify billing and plan enforcement

**Deliverables:**
- [x] Shopify App Subscriptions API integration
- [x] 4 plan tiers (Free/$29/$99/$249)
- [x] Plan limits config (`app/lib/plan-config.ts`)
- [x] Billing service core (`app/services/billing.server.ts`)
- [x] Billing mutations for GraphQL (`app/services/billing-mutations.server.ts`)
- [x] Subscription webhook handling (`webhooks.app.subscriptions_update.tsx`)
- [x] App uninstall cleanup (`webhooks.app.uninstalled.tsx`)
- [x] Plan enforcement on downgrade (`enforcePlanLimits()`)
- [x] Feature gating via `canRunAgents()` gate
- [x] Product count limit check (24-hour cached)
- [x] Weekly run frequency tracking
- [x] Trial support (optional 14-day trials)
- [x] Upgrade/downgrade flow UI
- [x] Plan comparison table
- [x] Usage widget

**Status:** ✅ Complete

**Key Files:**
- `app/services/billing.server.ts`
- `app/services/billing-mutations.server.ts`
- `app/lib/plan-config.ts`
- `app/routes/app.upgrade.tsx`
- `app/routes/app.api.billing.subscribe.tsx`
- `app/routes/app.api.billing.callback.tsx`
- `app/routes/webhooks.app.subscriptions_update.tsx`
- `app/components/plan-comparison-table.tsx`
- `app/components/plan-usage-widget.tsx`
- `prisma/schema.prisma` (ShopPlan, ProductCount, RunFrequencyLog)

---

### Phase 4: Feature Gating (Completed - 2026-03-05)
**Goal:** Enforce plan limits on agents, trust levels, runs, products

**Deliverables:**
- [x] Agent count gating (free=2, starter=4, pro=6, agency=6)
- [x] Trust level gating (free=advisor, starter=+assistant, pro/agency=+autopilot)
- [x] Weekly run frequency gating (free=2, starter=7, pro=unlimited, agency=unlimited)
- [x] Product catalog size gating (free=25, starter=100, pro/agency=unlimited)
- [x] Subscription status checks (frozen/cancelled blocking)
- [x] Trial expiry enforcement (non-paying tiers)
- [x] Automatic limit enforcement on plan change
- [x] UI restrictions (trust level dropdowns show only allowed options)
- [x] Plan enforcement before agent run

**Status:** ✅ Complete

---

### Phase 5: Multi-Store Management (Agency) (Completed - 2026-03-05)
**Goal:** Support Agency tier with managed stores

**Deliverables:**
- [x] StoreAssignment model (primaryShop → managedShop relationships)
- [x] `getManagedStores()` service
- [x] `addManagedStore()` with tier validation
- [x] `removeManagedStore()` for removing stores
- [x] Usage-based billing for extra stores ($29/month each)
- [x] Overage cap enforcement ($290/month)
- [x] Store management UI (`app/components/store-management.tsx`)
- [x] Usage record creation for Shopify billing

**Status:** ✅ Complete

**Key Files:**
- `app/services/billing.server.ts` (agency functions)
- `app/services/billing-mutations.server.ts` (createUsageRecord)
- `app/components/store-management.tsx`
- `prisma/schema.prisma` (StoreAssignment)

---

## Current Phase (Shipping)

### Phase 3.5: Polish & Bug Fixes (2026-03-05)
**Goal:** Ensure all billing flows work end-to-end, no regressions

**Status:** ✅ Complete

**Verifications:**
- [x] Free tier users cannot exceed limits
- [x] Paid tier users have correct features
- [x] Downgrade to free tier works correctly
- [x] Trial offer appears after 20 findings
- [x] Trial cancellation transitions to free
- [x] Product count cache respects 24-hour TTL
- [x] Weekly run counter resets on Monday UTC
- [x] Multi-store add/remove works for Agency
- [x] All webhook handlers return 200 OK
- [x] Error scenarios handled gracefully

---

## Upcoming Phases (Backlog)

### Phase 6: Advanced Agent Features (Estimated: Q2 2026)
**Goal:** Enable low-code agent customization

**Planned Features:**
- [ ] Custom agent creation UI (agent type, query template, analysis prompt)
- [ ] Agent scheduling (hourly, daily, weekly runs)
- [ ] Conditional execution (run if inventory < X, rating < Y, etc.)
- [ ] Output templates (customizable finding format)
- [ ] Agent versioning (rollback to previous agent config)
- [ ] Agent performance metrics (findings/month, accuracy, impact)

**Estimated Effort:** 4 weeks

**Success Criteria:**
- 10+ agency customers create custom agents
- 50% of custom agents improve (reused multiple times)
- Zero agent execution errors on custom agents

---

### Phase 7: Integrations & Automation (Estimated: Q3 2026)
**Goal:** Connect findings to external systems and enable direct actions

**Planned Features:**
- [ ] Slack notifications (findings → Slack channel)
- [ ] Discord notifications (findings → Discord webhook)
- [ ] Email notifications (daily briefing digest)
- [ ] Zapier integration (IFTTT-like automation)
- [ ] Direct action execution (add product tag, adjust inventory, bulk update)
- [ ] Webhook outbound (send findings to external APIs)
- [ ] CSV/JSON export (findings data)

**Estimated Effort:** 6 weeks

**Success Criteria:**
- 30% of paid users enable notifications
- 50% of Agency tier users enable direct actions
- <100ms action execution latency

---

### Phase 8: Analytics & Insights (Estimated: Q4 2026)
**Goal:** Help merchants understand impact of AI optimization

**Planned Features:**
- [ ] Agent performance dashboard (findings/month, applied %, impact)
- [ ] Trend analysis (recurring issues, seasonal patterns)
- [ ] ROI calculator (estimated impact of applied findings)
- [ ] Predictive insights (likely issues before they occur)
- [ ] Benchmarking (compare metrics to similar stores)
- [ ] Historical findings browser (search, filter, sort)

**Estimated Effort:** 8 weeks

**Success Criteria:**
- 40% of paid users check analytics monthly
- 25% of users cite analytics in upgrade decisions
- Predictive alerts have 80%+ accuracy

---

### Phase 9: Enterprise & Compliance (Estimated: 2027)
**Goal:** Support large teams and compliance requirements

**Planned Features:**
- [ ] SSO (OAuth/SAML) for Agency tier
- [ ] Role-based access control (read-only vs manage vs admin)
- [ ] Audit log export (CSV/JSON/PDF)
- [ ] Custom SLA support (dedicated support tier)
- [ ] SOC 2 Type II compliance
- [ ] HIPAA/GDPR certifications
- [ ] White-label option (custom domain)

**Estimated Effort:** 10 weeks (phases, not all at once)

**Success Criteria:**
- First enterprise contract signed
- SOC 2 report published
- 5+ white-label instances

---

## Metrics Dashboard

### User Growth
| Period | Free | Starter | Pro | Agency | Total |
|--------|------|---------|-----|--------|-------|
| 2026-03 | 120 | 8 | 2 | 1 | 131 |
| 2026-04 | *TBD* | *TBD* | *TBD* | *TBD* | *TBD* |

### Revenue
| Metric | Target |
|--------|--------|
| Monthly Recurring Revenue (MRR) | $1,500+ |
| Average Revenue Per User (ARPU) | $50-75 |
| Churn Rate | <5% monthly |
| Upgrade Rate (Free → Paid) | 15-20% |

### Product Health
| Metric | Target |
|--------|--------|
| Agent Success Rate | >95% |
| Dashboard Load Time | <2s |
| Finding Quality (applied %) | >30% |
| User Engagement (weekly active) | >60% |

---

## Dependencies & Blockers

### Known Constraints
1. **Shopify CLI Limitations:** HMR tunnel sometimes disconnects; workaround = manual tunnel reset
2. **MongoDB Atlas Free Tier:** Will need upgrade after 100k+ records; plan for Q2
3. **Claude API Costs:** ~$0.50 per agent run; monitor usage, optimize prompts
4. **Multi-Agent Timing:** All 6 agents run in parallel; 30s timeout may be tight for slow networks

### Mitigations
- [ ] Set up monitoring dashboard for API costs
- [ ] Cache agent results (don't recompute same findings)
- [ ] Add request logging to identify slow agents
- [ ] Plan MongoDB Atlas upgrade before hitting limits

---

## Release Timeline

| Phase | Status | Start | End | Duration |
|-------|--------|-------|-----|----------|
| **Phase 0-5** | ✅ Shipped | 2026-02-01 | 2026-03-05 | 5 weeks |
| **Phase 6** | Planned | 2026-04-01 | 2026-05-01 | 4 weeks |
| **Phase 7** | Planned | 2026-06-01 | 2026-07-15 | 6 weeks |
| **Phase 8** | Planned | 2026-09-01 | 2026-10-01 | 8 weeks |
| **Phase 9** | Planned | 2027-Q1 | 2027-Q2 | 10 weeks |

---

## Decision Log

### Decision: Freemium Model with Plan Tiers
**Date:** 2026-02-10
**Rationale:** Maximize user adoption (free tier) while generating revenue from engaged users. Tier structure aligns with user growth path.
**Alternative Considered:** Subscription-only (rejected: would limit market reach)

### Decision: 4 Plan Tiers (Free, Starter, Pro, Agency)
**Date:** 2026-02-12
**Rationale:** 4 tiers provide clear progression without overwhelming options. Agency tier targets enterprise with multi-store support.
**Alternative Considered:** 5 tiers with "Premium" (rejected: too complex)

### Decision: Shopify Billing API vs Custom Stripe
**Date:** 2026-02-14
**Rationale:** Shopify Billing is native, simpler integration, better UX for merchants already in Shopify Admin.
**Alternative Considered:** Stripe (rejected: adds complexity, merchant confusion)

### Decision: Plan Limits via `canRunAgents()` Gate
**Date:** 2026-02-18
**Rationale:** Centralized enforcement point, easier to audit and test. Single source of truth for limits.
**Alternative Considered:** Distributed checks throughout codebase (rejected: would create inconsistencies)

### Decision: MongoDB Over PostgreSQL
**Date:** 2026-01-15
**Rationale:** Schema flexibility for agent findings (varied JSON metadata), easier to scale horizontally, simpler deployment.
**Alternative Considered:** PostgreSQL (rejected: schema migrations more rigid)

---

## Stakeholder Communication

### Monthly Status Updates
- [ ] Product metrics dashboard published (15th of month)
- [ ] User feedback summary (15th of month)
- [ ] Bug/issue tracker review (20th of month)

### Quarterly Business Reviews
- [ ] Revenue metrics vs target
- [ ] User churn analysis
- [ ] Roadmap reprioritization

### Weekly Standups
- [ ] Sprint progress
- [ ] Blockers & risks
- [ ] Upcoming week priorities

---

## Success Metrics (Overall Product)

### Q1 2026 (Launch Quarter)
- [x] 100+ free tier installs
- [x] 10+ paid tier installs
- [ ] $500 MRR
- [ ] 40% 30-day retention (free)
- [ ] 75% 30-day retention (paid)

### Q2 2026
- [ ] 500+ free tier installs
- [ ] 50+ paid tier installs
- [ ] $2,000 MRR
- [ ] 50% 30-day retention (free)
- [ ] 80% 30-day retention (paid)
- [ ] Phase 6 (Advanced Agents) shipped

### Q3 2026
- [ ] 1,000+ free tier installs
- [ ] 150+ paid tier installs
- [ ] $5,000 MRR
- [ ] 10+ enterprise (Agency) customers
- [ ] Phase 7 (Integrations) shipped

### Q4 2026+
- [ ] 5,000+ total installs
- [ ] 500+ paid tier customers
- [ ] $20,000+ MRR
- [ ] 50+ agency customers
- [ ] Phase 8-9 (Analytics, Enterprise) shipped
