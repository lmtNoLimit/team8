---
title: "Storekeeper Landing Page"
description: "Marketing website for Storekeeper AI Store Secretary — Astro + Tailwind CSS on Vercel"
status: pending
priority: P1
effort: 32h
branch: kai/feat/storekeeper-landing-page
tags: [landing-page, marketing, astro, tailwind, vercel]
created: 2026-03-06
---

# Storekeeper Landing Page — Implementation Plan

## Overview

Standalone marketing website for Storekeeper (AI Store Secretary). Separate repo from the main Shopify embedded app. Built with Astro + Tailwind CSS, deployed on Vercel. Targets solo Shopify merchants ($5K-$50K/mo revenue).

**One-liner:** "Your Shopify store is a 2-person company. You're the boss. We're the operations team."

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Astro 5.x | 40% faster than Next.js, 90% less JS, static-first |
| Styling | Tailwind CSS 4.x | Utility-first, rapid iteration, Tailwind UI components |
| Interactivity | Alpine.js | Lightweight (15KB), progressive enhancement via Astro islands |
| Deployment | Vercel | Free tier, excellent Astro support, edge CDN |
| Analytics | Plausible | Privacy-first, no cookies, GDPR-friendly |
| Email | Mailchimp API | Free tier (5K contacts), proven deliverability |
| Images | Astro Image | Auto AVIF/WebP, lazy loading |

## Target Sections (12 total)

1. Hero — headline, CTA, product visual
2. Problem Validation — solo merchant dilemma
3. Solution Overview — one team, one dashboard
4. Consolidation Proof — replaces fragmented app stack
5. How It Works — 3-step flow
6. Trust Progression — Advisor / Assistant / Autopilot
7. Agent Deep Dives — 2-3 featured agents
8. Social Proof — metrics + testimonials
9. Pricing — 4-tier comparison table
10. FAQ / Objection Handling — AI trust questions
11. Final CTA — closing conversion
12. Footer — legal, contact, social

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 01 | [Project Setup](./phase-01-project-setup.md) | 2h | pending |
| 02 | [Design System](./phase-02-design-system.md) | 3h | pending |
| 03 | [Layout & Navigation](./phase-03-layout-and-navigation.md) | 3h | pending |
| 04 | [Hero Section](./phase-04-hero-section.md) | 4h | pending |
| 05 | [Problem + Solution Sections](./phase-05-problem-and-solution-sections.md) | 4h | pending |
| 06 | [Agent Showcase + Trust](./phase-06-agent-showcase-and-trust.md) | 5h | pending |
| 07 | [Social Proof + Pricing](./phase-07-social-proof-and-pricing.md) | 4h | pending |
| 08 | [FAQ + Final CTA + Footer](./phase-08-faq-final-cta-footer.md) | 3h | pending |
| 09 | [SEO + Performance](./phase-09-seo-and-performance.md) | 2h | pending |
| 10 | [Analytics + Email Capture](./phase-10-analytics-and-email-capture.md) | 2h | pending |

## Key Dependencies

- Product screenshots from main app (phases 4-7)
- Agent metadata from `app/agents/agent-registry.server.ts` (phase 6)
- Pricing config from `app/lib/plan-config.ts` (phase 7)
- Vercel account + custom domain DNS (phase 1, phase 9)
- Plausible account (phase 10)

## Design Direction

- **Colors:** Teal (#0D9488) trust/growth + Dark navy (#0F172A) professional + Orange (#F97316) CTAs
- **Typography:** Inter (body 16px, 1.6 line-height) + bold sans-serif headlines
- **Style:** Minimalist, data-driven, real product screenshots
- **Mobile-first:** 59% of solo merchants on mobile
- **Animations:** Minimal, purpose-driven (agent card stagger, trust slider, workflow)

## Research Reports

- [Tech Stack Research](../reports/researcher-3-260306-landing-page-tech-stack.md)
- [SaaS Best Practices](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis](../reports/researcher-2-260306-landing-page-competitor-analysis.md)
