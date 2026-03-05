# Product Development Requirements (PDR) - AI Store Secretary

**Status:** Released (2026-03-05)
**Version:** 1.0 - Billing System Complete

---

## Executive Summary

**AI Store Secretary** is a Shopify embedded app that automates store optimization through a team of AI agents. The application delivers daily insights to merchants and supports automated actions through a tiered subscription model with plan-limited features.

**Key Value Proposition:**
- AI-driven insights without manual store reviews
- Actionable recommendations with trust-level-based automation
- Scalable multi-agent architecture
- Freemium model supporting growth from small to enterprise merchants

---

## Product Vision

### 1. Market Opportunity

Shopify store owners lack automated, AI-powered optimization tools. Current alternatives:
- Manual analysis (time-intensive, inconsistent)
- Fragmented specialty apps (inventory, reviews, SEO separately)
- Generic AI assistants (not Shopify-optimized)

**Target Market:**
- Primary: Shopify stores with 25-500 products (early revenue)
- Secondary: Enterprise (Agency tier, multi-store management)

### 2. Functional Requirements

#### Core Agent System (Completed)
1. **6 AI Agents** producing daily findings:
   - AEO Agent: Conversion rate optimization
   - Content Agent: Product description quality
   - Inventory Agent: Stock level optimization
   - Review Agent: Sentiment analysis on customer feedback
   - Schema Agent: Structured data markup audits
   - Storefront Agent: Performance and UX audits

2. **Finding Management:**
   - Agents produce typed findings (done/action_needed/insight)
   - Priority levels 1-5 (critical to informational)
   - Deduplication across runs
   - Status tracking (pending/applied/dismissed)

3. **Trust Levels (User Control):**
   - Advisor: Read-only findings
   - Assistant: Manual approval required before action
   - Autopilot: Auto-execute within 5 seconds

#### Billing & Monetization (Completed)
1. **Subscription Model:**
   - Free tier: Limited feature access, 2 agents, 2 runs/week
   - Starter tier ($29): 4 agents, 7 runs/week, assistant trust level
   - Pro tier ($99): 6 agents, unlimited runs, all trust levels
   - Agency tier ($249): Multi-store management with usage-based overage

2. **Plan-Limited Features:**
   - Agent count gated by tier
   - Weekly run frequency capped by tier
   - Product catalog size limits enforced
   - Trust levels restricted by plan (free=advisor only, starter=+assistant, pro/agency=+autopilot)
   - Store count limited (agency: 5 included + overage)

3. **Subscription Lifecycle:**
   - Shopify billing API integration
   - Optional 14-day trials on paid tiers
   - Automatic tier enforcement on state change
   - Graceful downgrade to free tier

4. **Multi-Store Management (Agency Tier):**
   - Primary shop can manage up to 5 secondary stores
   - Extra stores charged at $29/month
   - Overage capped at $290/month total
   - Usage tracked and invoiced separately

### 3. Non-Functional Requirements

**Performance:**
- Agent execution completes in <30 seconds (timeout protection)
- Dashboard loads within 2 seconds
- GraphQL queries cached where appropriate
- Product count cached 24 hours (TTL)

**Scalability:**
- Parallel agent execution (6 agents simultaneously)
- MongoDB indexes on critical query paths
- Graceful degradation if one agent fails
- Support for 1000+ concurrent stores

**Reliability:**
- Webhook retry mechanism (Shopify-managed)
- Idempotent agent runs (safe to execute multiple times)
- Transaction-safe finding upserts
- Comprehensive activity audit trail

**Security:**
- OAuth 2.0 with Shopify (session-based auth)
- Data isolation by shop (all queries filtered)
- API key protection (env-based, never hardcoded)
- Subscription status verification before feature access

**Compliance:**
- GDPR-ready (shop data deletion on uninstall)
- Shopify billing compliance (subscription state tracking)
- Audit trail for all findings and actions
- No persistent state for disabled agents

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Router v7 + Polaris web components |
| **Backend** | Node.js + Express (Shopify CLI) |
| **Database** | MongoDB + Prisma ORM |
| **AI** | Claude API (claude-sonnet-4-6) |
| **Billing** | Shopify App Subscriptions API |
| **Deployment** | Shopify CLI tunnel (dev) / Vercel/Heroku (prod) |

### Data Models

**Subscription & Plan:**
- `ShopPlan` — Current tier, subscription ID, trial end date, period end
- `ProductCount` — Cached product count with 24-hour TTL
- `RunFrequencyLog` — Weekly run tracking (Monday-based weeks)
- `StoreAssignment` — Multi-store relationships (Agency tier)

**Agent Findings:**
- `AgentFinding` — Type, priority, title, description, action, status, dedup key
- `Review` — Imported customer reviews (for Review Agent)
- `AgentSetting` — Per-agent trust level, enabled/disabled state

**Audit:**
- `ActivityLog` — All agent runs, finding actions, auto-executions
- `StoreProfile` — Merchant metadata

**Auth:**
- `Session` — Shopify OAuth sessions (Prisma-backed)

### Deployment

**Development:**
```bash
npm run dev  # Shopify CLI tunnel + HMR
```

**Production:**
- Vercel: `npm run build && npm run start`
- Heroku: Same build/start commands
- Database: MongoDB Atlas (cloud-hosted)

---

## Acceptance Criteria

### Phase 1: Agent Infrastructure (Completed)
- [x] Agent interface contract locked
- [x] 6 agents registered and functional
- [x] Agent executor with timeout protection
- [x] Finding storage with deduplication
- [x] Finding status tracking (pending/applied/dismissed)
- [x] Activity logging for all actions
- [x] Dashboard displaying findings by agent

### Phase 2: Billing & Subscription (Completed)
- [x] 4 plan tiers with distinct limits
- [x] Shopify billing API integration
- [x] Plan enforcement via `canRunAgents()` gate
- [x] Automatic tier enforcement on webhook
- [x] Graceful downgrade (disable agents, downgrade trust levels)
- [x] Trial support (14-day optional trials)
- [x] Product count limit enforcement
- [x] Weekly run frequency tracking
- [x] Upgrade/downgrade flow with success/error handling

### Phase 3: Feature Gating (Completed)
- [x] Agent count limited by tier
- [x] Trust levels restricted by plan
- [x] Trust level UI dropdowns showing only allowed options
- [x] Automatic downgrade of trust levels on plan downgrade
- [x] Agent enable/disable toggles on settings page
- [x] Plan comparison table showing features

### Phase 4: Multi-Store Management (Completed)
- [x] Agency tier supports multiple stores
- [x] Store management UI (add/remove stores)
- [x] Usage-based billing for extra stores
- [x] Overage capped at $290/month

### Phase 5: UI/UX Polish (Completed)
- [x] Upgrade banner on free tier
- [x] Usage widget showing runs used / limit
- [x] Plan comparison table on upgrade page
- [x] Trial offer on free tier (after 20 findings)
- [x] All UI using Polaris web components
- [x] Error handling for all billing flows

---

## Metrics & Success Criteria

### Launch Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Monthly Active Installs | 50+ | Proof of product-market fit |
| Free → Paid Conversion | 10-15% | Revenue model validation |
| 30-day Retention (Free) | 40%+ | Engagement baseline |
| 30-day Retention (Paid) | 75%+ | Paid customer satisfaction |
| Agent Run Success Rate | 95%+ | Reliability (timeout, errors) |
| Average Monthly Revenue | $500+ | Pricing validation |

### Product Health

| Metric | Target |
|--------|--------|
| Dashboard Load Time | <2 seconds |
| Agent Execution Time | <30 seconds |
| Finding Creation Latency | <500ms |
| Error Rate | <0.5% |
| Support Response Time | <24 hours |

---

## Roadmap & Future Phases

### Phase 6: Advanced Agent Features (Planned)
- [ ] Custom agent creation via UI (low-code)
- [ ] Agent scheduling (run every X hours)
- [ ] Conditional execution (run if conditions met)
- [ ] Agent output templates (custom findings format)

### Phase 7: Integrations (Planned)
- [ ] Webhook outbound (Slack, Discord, email notifications)
- [ ] Zapier integration
- [ ] Direct store action execution (update tags, inventory sync)

### Phase 8: Analytics & Insights (Planned)
- [ ] Agent performance dashboard (findings/month, accuracy)
- [ ] Trend analysis (which issues recurring)
- [ ] ROI calculator (estimated impact of applied findings)
- [ ] Predictive insights (likely issues before they occur)

### Phase 9: Enterprise Features (Planned)
- [ ] SSO (OAuth/SAML) for Agency tier
- [ ] Role-based access control (read-only vs manage)
- [ ] Audit log export (CSV/JSON)
- [ ] Custom SLA support

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Claude API rate limiting | High | Medium | Implement queue, fallback to cached findings |
| Shopify API changes | Medium | Low | Monitor changelog, test quarterly |
| Product catalog explosion | Medium | Low | Aggressive caching, async syncs |
| Subscription churn | High | Medium | Improve finding quality, retention emails |
| Multi-store scaling issues | Medium | Low | Load test Agency tier before promoting |
| Data privacy concerns | High | Low | SOC 2 compliance, clear privacy policy |

---

## Success Stories & Use Cases

### Use Case 1: E-Commerce Store Scaling
**Merchant Profile:** 50-100 products, new to growth strategies

**Problem:** Manual daily store audits are time-intensive; many optimization opportunities missed.

**Solution:**
1. Install app on free tier
2. Agents discover issues (content quality, inventory gaps, review sentiment)
3. Generate 20+ findings (qualifies for trial offer)
4. Upgrade to Starter tier
5. Set agents to Assistant mode (manual approval)
6. Apply 3-5 findings per week
7. Estimated impact: 15-20% traffic uplift after 90 days

### Use Case 2: Multi-Brand Management
**Merchant Profile:** Agency managing 8 stores, each 200-400 products

**Problem:** Managing each store separately is inefficient; inconsistent strategies.

**Solution:**
1. Agency owner upgrades to Agency tier ($249/month + 3 extra stores at $87)
2. Manages 5 stores directly from primary account
3. Agents run across all 5 stores simultaneously
4. Configure shared trust level policies
5. Autopilot mode executes recommendations across portfolio
6. Reduced operational overhead, consistent optimization strategy

---

## Documentation References

- **Architecture:** See `docs/system-architecture.md`
- **Codebase:** See `docs/codebase-summary.md`
- **Code Standards:** See `docs/code-standards.md`
- **Agent Developer Guide:** See `docs/agent-developer-guide.md`

---

## Sign-Off

**Product Owner:** Team8
**Release Date:** 2026-03-05
**Status:** Launched (Billing system complete, all MVP features implemented)

**Key Achievements:**
- Delivered complete agent infrastructure with 6 functional agents
- Implemented Shopify billing integration with 4 plan tiers
- Feature gating enforces plan limits consistently
- Multi-store support for enterprise customers
- Polaris-based UI with full responsive design
- Comprehensive activity audit trail

**Next Priority:** Phase 6 (Advanced Agent Features) pending customer feedback.
