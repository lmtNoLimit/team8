# Pricing Strategy Research Synthesis
**Date:** 2026-03-05 | **Sources:** 3 researcher reports | **Status:** Complete

---

## Executive Summary

4-tier pricing (Free/Starter/Pro/Agency) is technically feasible on Shopify's billing API. Revenue share is 15% (not 20% — changed Jan 2025). Recommended approach: hybrid freemium + contextual 7-day trial. Feature gating requires 3-5 new DB models and a service layer. Estimated implementation: 6-8 weeks across 5 phases.

---

## Key Findings (Cross-Report)

### 1. Billing API (Researcher-1)
- **AppSubscriptionCreate** supports recurring + usage-based in single subscription
- **Free tier**: No Shopify subscription object; track in app DB; use `billing.check()` not `billing.require()`
- **Annual billing**: Use discount field (17.24% off for annual) or separate ANNUAL interval subscription
- **Agency per-store**: Combine $249 recurring + usage-based $29/store cap in one subscription
- **Revenue share**: 15% (was 20%). First $1M lifetime exempted. Net margin ~85%.
- **Proration**: Shopify handles automatically on upgrades/downgrades
- **Trial**: `trialDays` parameter (1-1000 days); can extend mid-trial

### 2. Feature Gating (Researcher-2)
- **5 new DB models**: ShopPlan, ProductCount, RunFrequencyLog, AgentEntitlementOverride, StoreAssignment
- **3-layer enforcement**: Middleware (plan status) → Service (limits) → UI (hints)
- **Product count**: Cache locally, sync daily via Shopify API
- **Run limiting**: Track per-week via RunFrequencyLog, weekly cleanup
- **Trust levels**: Enforce in updateAgentTrustLevel + toggleAgentEnabled
- **Agency multi-store**: Single shared DB with StoreAssignment mapping

### 3. Conversion UX (Researcher-3)
- **Hybrid model**: Freemium (no CC) → contextual 7-day trial after wow moment
- **Target**: 9% free-to-paid needs trial mechanics (pure freemium = 2.6%)
- **Critical timing**: Never paywall Day 1. Let user see 20+ findings first.
- **Triggers**: Feature lock modals on Assistant/Autopilot access, run limit hit, product limit
- **Usage widget**: Always-visible sidebar showing limits consumption
- **A/B tests**: Trial length (7v14d), paywall timing (1 run vs 5 findings), CTA copy

---

## Revised Unit Economics (15% Revenue Share)

| Tier | Price | After Shopify 15% | API + Infra | Net Margin |
|------|-------|--------------------|-------------|------------|
| Starter | $29 | $24.65 | ~$4.50 | **$20.15 (69%)** |
| Pro | $99 | $84.15 | ~$7.50 | **$76.65 (77%)** |
| Agency | $249 | $211.65 | ~$35.50 | **$176.15 (71%)** |

Better than vision doc estimates (which used 20% share).

---

## Implementation Roadmap (5 Phases, ~6-8 weeks)

### Phase 1: DB Schema + Plan Service (Week 1-2)
- Add ShopPlan, ProductCount, RunFrequencyLog models to Prisma
- Create `billing.server.ts` with getPlan, canRunAgents, getRunsThisWeek
- Default all existing shops to "free" tier
- Add plan check to run-all route (block if over limits)
- **Ship**: Run frequency + product limit enforcement

### Phase 2: Shopify Billing Integration (Week 3-4)
- Add `billing` scope to shopify.app.toml
- Implement appSubscriptionCreate for Starter/Pro/Agency
- Create billing webhook handler (app_subscriptions/update)
- Auto-create/update ShopPlan on subscription events
- Handle free tier as DB-only (no Shopify subscription)
- **Ship**: Self-service paid upgrades

### Phase 3: Agent + Trust Level Gating (Week 4-5)
- Enforce agent count limit in toggleAgentEnabled
- Enforce trust level restriction in updateAgentTrustLevel
- Block Autopilot/Assistant on Free tier
- Auto-downgrade trust levels on plan downgrade
- **Ship**: Feature gating by tier

### Phase 4: Pricing Page + Conversion UX (Week 5-6)
- Create `/app/upgrade` route with plan comparison table
- Contextual upsell modals (feature lock, run limit, trust level)
- Usage widget in dashboard sidebar (runs, products, agents)
- 7-day trial offer triggered after wow moment
- Upgrade/downgrade confirmation flows
- **Ship**: Complete billing UX

### Phase 5: Agency Multi-Store + Polish (Week 7-8)
- StoreAssignment model for multi-store
- "My Stores" dashboard in settings
- Usage-based billing for additional stores
- Graceful degradation messaging
- A/B test framework for conversion optimization
- **Ship**: Agency tier fully functional

---

## Files Impact Summary

### New Files
- `prisma/schema.prisma` (modify — add 3-5 models)
- `app/services/billing.server.ts` (new — plan CRUD, limit checks)
- `app/routes/app.upgrade.tsx` (new — pricing page)
- `app/routes/webhooks.app-subscriptions.tsx` (new — billing webhook)
- `app/components/plan-usage-widget.tsx` (new — sidebar widget)
- `app/components/upgrade-modal.tsx` (new — contextual upsell)

### Modified Files
- `app/services/agent-settings.server.ts` — plan checks in toggle/trust functions
- `app/routes/app.api.agents.run-all.tsx` — plan + frequency + product checks
- `app/routes/app._index.tsx` — usage widget, upgrade banner
- `app/routes/app.settings.tsx` — plan tier display, upgrade prompts
- `shopify.app.toml` — add billing scope + webhook

---

## Unresolved Questions

1. Revenue share: Vision doc said 20% but Shopify changed to 15% (Jan 2025). Update all financial models.
2. Trial strategy: 7-day vs 14-day trial — need A/B test data.
3. Product count API: Accuracy at scale (10K+ products).
4. Agency billing contact: Primary store only or per-store billing?
5. Downgrade UX: Auto-downgrade trust levels or let merchant choose which to disable?
6. Autopilot liability: Legal review needed for agents taking actions automatically.
7. Cancellation grace period: Immediate feature loss or end-of-cycle?

---

## Recommendations

1. **Start Phase 1 immediately** — DB schema + enforcement is prerequisite for everything
2. **Use 15% revenue share** in all financial models (not 20%)
3. **Hybrid freemium + trial** — best path to 9% conversion
4. **Skip AgentEntitlementOverride** in MVP (YAGNI) — add when needed
5. **Skip multi-store** until Phase 5 — Agency tier is lowest priority
6. **A/B test early** — paywall timing is the highest-leverage variable
