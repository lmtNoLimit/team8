---
title: "Pricing Strategy Implementation"
description: "Add tiered billing (Free/Starter/Pro/Agency) with Shopify Billing API, feature gating, and conversion UX"
status: completed
priority: P1
effort: 28h
branch: main
tags: [billing, pricing, shopify-api, feature-gating, monetization]
created: 2026-03-05
completed: 2026-03-05
---

# Pricing Strategy Implementation

## Summary

Implement 4-tier pricing (Free $0 / Starter $29 / Pro $99 / Agency $249) with Shopify Billing API integration, plan-aware feature gating across agents, trust levels, and run frequency, plus conversion UX with contextual upsells.

## Current State

- Zero billing code exists. All features unrestricted.
- 6 agents, 3 trust levels, no limits on runs or products.
- Scopes: `write_products` only. No `read_products` for product count.

## Phases

| # | Phase | Est. | Status | File |
|---|-------|------|--------|------|
| 1 | DB Schema + Plan Service | 5h | completed | [phase-01](phase-01-db-schema-and-plan-service.md) |
| 2 | Shopify Billing Integration | 6h | completed | [phase-02](phase-02-shopify-billing-integration.md) |
| 3 | Agent Trust Level Gating | 5h | completed | [phase-03](phase-03-agent-trust-level-gating.md) |
| 4 | Pricing Page + Conversion UX | 8h | completed | [phase-04](phase-04-pricing-page-and-conversion-ux.md) |
| 5 | Agency Multi-Store + Polish | 4h | completed | [phase-05](phase-05-agency-multi-store-and-polish.md) |

## Key Dependencies

- Phase 1 is prerequisite for all other phases (ShopPlan model + billing service)
- Phase 2 depends on Phase 1 (subscription creation needs ShopPlan)
- Phase 3 depends on Phase 1 (gating reads plan limits from billing service)
- Phase 4 depends on Phases 1-3 (UI needs working billing + gating)
- Phase 5 depends on Phases 1-4 (agency tier extends existing billing)

## Tier Matrix

| | Free | Starter ($29) | Pro ($99) | Agency ($249) |
|---|---|---|---|---|
| Products | 25 | 100 | Unlimited | Unlimited |
| Agents | 2 (pick) | 4 | All 6 | All 6 |
| Runs/week | 2 | 7 (daily) | Unlimited | Unlimited |
| Trust levels | Advisor | Advisor+Assistant | All | All |
| Stores | 1 | 1 | 1 | 5 (+$29/ea) |

## Scope Notes

- Free tier = DB-only, no Shopify subscription object
- Annual billing: separate plan variants (not Phase 1-4 scope, defer to Phase 5)
- Trial: 7-day, triggered after "wow moment" (20+ findings), not on Day 1
- Needs new scope: `read_products` for product count sync
- API version: Must reconcile `shopify.server.ts` (October25) with `shopify.app.toml` (2026-04)

## Red Team Review

### Session — 2026-03-05
**Findings:** 12 (12 accepted, 0 rejected)
**Severity breakdown:** 3 Critical, 7 High, 2 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | Callback tier param forgery — derive tier from DB not URL | Critical | Accept | Phase 2 |
| 2 | TOCTOU race on run count — increment-before-execute | Critical | Accept | Phase 1 |
| 3 | Default-enabled agents bypass free tier limit | Critical | Accept | Phase 1, 3 |
| 4 | Product count limit never enforced | High | Accept | Phase 1 |
| 5 | Trial expiry blocks paying customers after conversion | High | Accept | Phase 1, 2 |
| 6 | Downgrade cancel route not implemented | High | Accept | Phase 2, 4 |
| 7 | No existing subscription check before creating new | High | Accept | Phase 2 |
| 8 | API version mismatch (October25 vs 2026-04) | High | Accept | Phase 2 |
| 9 | App uninstall doesn't clean up billing records | High | Accept | Phase 2 |
| 10 | Agency multi-store has no functional backend | High | Accept (modified) | Phase 5 |
| 11 | Webhook handler overly permissive OR condition | Medium | Accept | Phase 2 |
| 12 | Prisma `undefined` vs `null` in downgradeToFree | Medium | Accept | Phase 2 |
