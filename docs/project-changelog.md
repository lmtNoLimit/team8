# Project Changelog - AI Store Secretary

**Status:** Active Development
**Last Updated:** 2026-03-05

---

## [1.0.0] - 2026-03-05 (Release Candidate → Stable)

### Added
- **Billing System Complete**
  - Shopify App Subscriptions API integration (app/services/billing-mutations.server.ts)
  - 4 plan tiers: Free, Starter ($29), Pro ($99), Agency ($249)
  - Plan enforcement via canRunAgents() gate (app/services/billing.server.ts)
  - Automatic tier enforcement on subscription state change
  - Plan-limited features: agent count, trust levels, run frequency, product count

- **Plan Limits & Feature Gating**
  - Agent count limits by tier (free=2, starter=4, pro/agency=6)
  - Weekly run frequency tracking and enforcement (free=2, starter=7, pro/agency=unlimited)
  - Product catalog size limits enforced (free=25, starter=100, pro/agency=unlimited)
  - Trust level restrictions (free=advisor, starter=+assistant, pro/agency=+autopilot)
  - Subscription status checks (frozen/cancelled blocking agent runs)
  - Trial expiry enforcement for non-paying tiers

- **Multi-Store Management (Agency Tier)**
  - StoreAssignment model for managing secondary stores (prisma/schema.prisma)
  - addManagedStore() and removeManagedStore() APIs (app/services/billing.server.ts)
  - Usage-based billing for stores beyond 5 included ($29/store/month)
  - Overage capped at $290/month total
  - Store management UI (app/components/store-management.tsx)

- **New Database Models**
  - ShopPlan: Subscription tier, status, trial/period dates
  - ProductCount: Cached product count (24-hour TTL)
  - RunFrequencyLog: Weekly run tracking (Monday-based UTC weeks)
  - StoreAssignment: Multi-store relationships for Agency tier

- **New Routes**
  - POST /app/api/billing/subscribe: Initiate subscription checkout
  - GET /app/api/billing/callback: Subscription callback handler
  - POST /webhooks/app/subscriptions_update: Webhook for subscription state changes
  - GET /app/upgrade: Plan comparison table and upgrade flow
  - POST /app/api/agents/run-all: Execute all enabled agents in parallel

- **New Components**
  - PlanComparisonTable (app/components/plan-comparison-table.tsx): Feature matrix with select buttons
  - PlanUsageWidget (app/components/plan-usage-widget.tsx): Shows usage vs plan limits
  - AgentTrustControl (app/components/agent-trust-control.tsx): Trust level dropdown (plan-gated)
  - StoreManagement (app/components/store-management.tsx): Add/remove managed stores
  - UpgradeBanner (app/components/upgrade-banner.tsx): CTA for limited features
  - AgentStatusBar (app/components/agent-status-bar.tsx): Enable/disable toggles (plan-gated)

- **Webhook Handlers**
  - webhooks.app.subscriptions_update.tsx: Handle subscription state changes, trigger enforcePlanLimits()
  - webhooks.app.uninstalled.tsx: Cleanup billing records on app uninstall
  - webhooks.app.scopes_update.tsx: Handle permission changes

- **Updated Shopify Configuration**
  - API version: April26 (2024-04)
  - New scopes: read_products, write_products
  - New webhooks: app_subscriptions/update, app_uninstalled, app_scopes_update

### Changed
- **Billing Service (app/services/billing.server.ts)**
  - Core service now handles: ShopPlan CRUD, usage queries, plan limit enforcement
  - getShopPlan(): Initialize or fetch, create free tier if missing
  - canRunAgents(): Gate checks (subscription status, trial, product count, weekly frequency)
  - enforcePlanLimits(): On downgrade, disable agents beyond limit and downgrade trust levels
  - getUsageSummary(): For UI consumption
  - Multi-store functions: getManagedStores(), addManagedStore(), removeManagedStore()

- **Plan Configuration (app/lib/plan-config.ts)**
  - Centralized PLAN_LIMITS record with tier-specific limits
  - PlanLimitError custom error for graceful handling
  - Helper functions: getPlanLimits(), getCurrentWeekStart()
  - Added constants: AGENCY_INCLUDED_STORES=5, AGENCY_EXTRA_STORE_PRICE=$29, AGENCY_USAGE_CAP=$290

- **App Navigation (app.tsx)**
  - Added "/app/upgrade" link to sidebar for managing subscription
  - Settings page now shows trust level UI (plan-gated options)
  - Agent enable/disable toggles now respect plan limits

- **Agent Executor (app/services/agent-executor.server.ts)**
  - Added gate check before executing agents
  - Increments weekly run counter on successful execution
  - Graceful error handling if gate check fails

- **CLAUDE.md Project Guide**
  - Added Billing System section with plan tiers, key services, lifecycle, feature gating
  - Documented how to add new plan tiers
  - Updated Config Files section with new scopes and API version
  - Updated Routing section with new billing routes
  - Updated Database section with new models

### Fixed
- Subscription state verification before granting features (prevents unauthorized access)
- Trial expiry check only blocks non-paying tiers (paying tiers with active status allowed)
- Product count cache respects 24-hour TTL (prevents unnecessary API calls)
- Weekly run counter resets correctly on Monday UTC (not arbitrary days)
- Downgrade to free tier nulls subscription fields (not undefined) for Prisma compatibility

### Security
- Added plan enforcement gate before all agent runs
- Added subscription status validation in billing service
- Data isolation maintained: all queries filtered by shop field
- API key protection via environment variables (never hardcoded)

### Performance
- Parallel agent execution (6 agents simultaneously, <30s timeout)
- Product count cached 24 hours (avoids daily GraphQL calls)
- Database indexes on critical query paths (shop, agentId, createdAt)
- Graceful degradation if one agent fails (others continue)

### Backward Compatibility
- Existing agents continue to work without modification
- Trust level default "advisor" maintained for all agents
- Finding storage unchanged; deduplication still works
- Activity logging still captures all events

### Testing
- All plan limit gates tested with mocked plans
- Subscription webhook handlers tested with sample payloads
- Multi-store add/remove tested with Agency tier validation
- Downgrade logic tested to ensure agents disabled in correct order
- Trial expiry logic tested for paid and non-paid tiers

### Documentation
- Created docs/codebase-summary.md: Full codebase overview
- Created docs/system-architecture.md: Architecture diagrams and data flow
- Created docs/code-standards.md: Code style, patterns, and guidelines
- Created docs/project-overview-pdr.md: PDR with acceptance criteria
- Created docs/project-roadmap.md: Phases, timeline, and success metrics
- Updated docs/project-changelog.md: This file

### Migration Notes
- New users created with Free tier ShopPlan on first install
- Existing users (if any) will need ShopPlan record created (migrations TBD)
- No schema breaking changes; all new fields optional

---

## [0.9.0] - 2026-02-25 (Beta)

### Added
- Agent enable/disable toggles per agent (app/components/agent-status-bar.tsx)
- Trust level dropdowns (advisor/assistant/autopilot) (app/components/agent-trust-control.tsx)
- Store profile form (industry, audience, description) (app/routes/app.settings.tsx)
- Agent detail pages with breadcrumb navigation
- Activity audit trail (agent runs, finding actions) (app/services/activity-log.server.ts)
- Support for all three trust levels in finding cards

### Changed
- Finding card UI now respects trust level (read-only for advisor, buttons for assistant, auto-execute for autopilot)
- Settings page reorganized with tabs (Profile, Trust Levels, API Config)
- Navigation updated with settings link

### Fixed
- Agent settings persistence across sessions
- Trust level changes immediately reflected in UI

---

## [0.8.0] - 2026-02-20 (Alpha)

### Added
- **6 AI Agents**
  - AEO Agent: Conversion rate optimization via A/B tests
  - Content Agent: Product description quality analysis
  - Inventory Agent: Stock level optimization
  - Review Agent: Customer feedback sentiment analysis
  - Schema Agent: Structured data markup audits
  - Storefront Agent: UX/performance audits

- **Agent Execution System**
  - Agent executor with parallel execution and 30-second timeout (app/services/agent-executor.server.ts)
  - Finding deduplication via unique (shop, agentId, deduplicationKey) constraint
  - Finding status tracking (pending/applied/dismissed)
  - Activity logging system (app/services/activity-log.server.ts)

- **Daily Briefing Dashboard**
  - Real-time findings display with priority badges
  - Per-agent activity tabs
  - Trust level indicators in finding cards
  - "Run All Agents" button for manual execution

- **API Routes**
  - POST /app/api/agents/{agentId}/run: Execute single agent
  - POST /app/api/agents/run-all: Execute all enabled agents
  - POST /app/api/agents/findings: Upsert finding
  - PATCH /app/api/agents/findings/{id}/status: Update finding status
  - POST /app/api/reviews/seed: Seed test data

- **Database Models**
  - AgentFinding: Store agent discoveries with deduplication
  - Review: Customer review data
  - AgentSetting: Per-agent configuration
  - ActivityLog: Audit trail
  - StoreProfile: Merchant metadata

### Changed
- App layout restructured with agent-focused navigation
- Dashboard displays findings grouped by type/priority

### Deployment
- Shopify CLI tunnel working for local development
- Ready for testing on development stores

---

## [0.1.0] - 2026-02-01 (Foundation)

### Added
- React Router v7 setup with flat file-system routes
- Shopify OAuth authentication (shopify.server.ts)
- Polaris web components (s-* custom elements)
- MongoDB + Prisma ORM integration
- Shopify App Bridge v4
- Basic app layout with navigation sidebar
- Session storage (Prisma-backed)

### Documentation
- CLAUDE.md project guide created
- README.md with setup instructions (Vietnamese)
- Initial codebase structure documented

---

## Planned Changes

### For Next Release (Phase 6: Advanced Agents)
- [ ] Low-code agent creation UI
- [ ] Agent scheduling (hourly, daily, weekly)
- [ ] Conditional execution (if inventory < X, etc.)
- [ ] Custom output templates
- [ ] Agent versioning and rollback

### For Q3 2026 (Phase 7: Integrations)
- [ ] Slack/Discord notifications
- [ ] Email digest feature
- [ ] Zapier integration
- [ ] Direct action execution (update tags, adjust inventory)
- [ ] CSV/JSON export

### For Q4 2026 (Phase 8: Analytics)
- [ ] Agent performance dashboard
- [ ] Trend analysis and predictive insights
- [ ] ROI calculator
- [ ] Benchmarking against similar stores

### For 2027 (Phase 9: Enterprise)
- [ ] SSO (OAuth/SAML)
- [ ] Role-based access control
- [ ] Audit log export
- [ ] SOC 2 compliance
- [ ] White-label support

---

## Known Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|-----------|
| Shopify CLI tunnel disconnects sporadically | Medium | Open | Manual tunnel reset required |
| Claude API rate limit not yet implemented | Medium | Open | Monitor logs, implement queue if needed |
| Product count cache can be stale for 24h | Low | Open | User can force refresh via button (TBD) |

---

## Performance Notes

- Agent execution: ~2-5 seconds per agent (parallel, <30s total timeout)
- Dashboard load: <2 seconds (paginated findings)
- API response time: <500ms (cached queries)
- Database queries: Indexed on shop, agentId, createdAt

---

## Breaking Changes

None in version 1.0.0 (initial stable release).

---

## Contributors

- Team8: Full-stack development, architecture
- Shopify: Admin API, billing API, CLI
- Anthropic: Claude API

---

## Support & Feedback

Report issues via: [Shopify Partner Dashboard → App Support]
Feature requests: team8.io (TBD)
Documentation: docs/ folder in repository

---

## Version History Summary

| Version | Date | Status | Focus |
|---------|------|--------|-------|
| 1.0.0 | 2026-03-05 | Stable | Billing system, plan enforcement |
| 0.9.0 | 2026-02-25 | Beta | Agent control, trust levels |
| 0.8.0 | 2026-02-20 | Alpha | Agent infrastructure |
| 0.1.0 | 2026-02-01 | Foundation | Scaffold, auth, database |

---

**Next Update:** 2026-04-01 (Phase 6 progress or Q1 metrics)
