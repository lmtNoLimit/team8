# Brainstorm: Background Execution & Proactive Notifications

**Date:** 2026-03-05 | **Status:** Concluded | **Type:** Architecture Decision

---

## Problem Statement

Current app requires merchant to open Shopify admin + app to trigger agents and view findings. This defeats the "Secretary" value prop — a real secretary works while the boss is away and proactively reports.

**Core question:** How can agents run autonomously and notify merchants without them opening the app?

---

## Current Architecture Gaps

1. **No background execution** — `app.api.agents.run-all.tsx` requires `authenticate.admin(request)` (active user session)
2. **No outbound communication** — app has zero notification channels
3. **No scheduling** — agents only run on manual trigger

---

## Agreed Solution

### Architecture: Daily Cron + Email Briefing

```
CRON (6AM daily per merchant timezone)
  -> Load offline access token from DB
  -> Create Admin GraphQL client (no user session needed)
  -> Run all enabled agents in parallel
  -> Collect findings
  -> Claude AI compiles briefing summary
  -> Send email via Resend
  -> Merchant clicks link to view full briefing in app
```

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Priority channel** | Email | Universal, rich content, link to app. Free tier (Resend 3K/mo) |
| **Interaction level** | Read-only briefing | Simplest to ship. Actions require opening app. |
| **Schedule** | 1x/day morning briefing | Matches "Secretary" mental model. Low API cost. |
| **Infrastructure** | Railway (recommended) | Native cron, persistent process, Redis addon, $5/mo start |
| **Future channels** | Telegram, Slack, Shopify Admin | Phase 2+ after email is proven |

### Three Technical Layers

**Layer 1: Offline Token + Background Execution**
- Store offline access token when merchant installs (Shopify SDK built-in)
- Create Admin client from stored token (not from request)
- Background agent runner that doesn't need `authenticate.admin()`

**Layer 2: Job Scheduler**
- BullMQ + Redis for reliable job scheduling
- OR simple node-cron if single-process deployment
- Cron expression per merchant timezone

**Layer 3: Notification Dispatcher**
- Briefing compiler: aggregate findings into readable summary (Claude AI)
- Email sender: Resend API with HTML template
- Channel dispatcher pattern: 1 briefing -> N channels (extensible)
- Settings UI: email address, timezone, on/off toggle

### Email Briefing Content

```
Good morning!

HANDLED OVERNIGHT:
  - Updated llms.txt with 12 new products
  - Fixed broken structured data on 3 product pages

NEEDS YOUR DECISION:
  1. 18 products invisible to ChatGPT Shopping
  2. "Red Sneakers" page has 52% bounce rate
  3. Competitor appeared in Perplexity for your keywords

INSIGHTS:
  - "Sustainable packaging" trending +340% in AI searches

[View Full Briefing ->] (link to app)
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Offline token revoked | Agents can't run | Catch error, send "Please re-authorize" email |
| Agents timeout (6 x 30s) | Briefing delayed | Run parallel, total < 60s |
| Email goes to spam | Merchant never sees briefing | Custom domain, DKIM/SPF, Resend reputation |
| Claude API cost scales | $$ with many merchants | Cache findings, skip if no data change |
| Merchant doesn't want email | Annoyance, uninstall | Opt-in in settings, easy unsubscribe |

---

## Implementation Phases

**Phase 1: Background Execution Foundation**
- Offline token retrieval service
- Background agent runner (decoupled from request auth)
- Cron scheduler setup

**Phase 2: Email Morning Briefing**
- Briefing compiler service
- HTML email template
- Resend integration
- Settings UI (email, timezone, toggle)

**Phase 3: Multi-channel (Future)**
- Telegram bot integration
- Slack webhook integration
- Shopify Admin notification
- Channel preference in settings

---

## Feasibility: CONFIRMED

All components use standard, proven technologies:
- Shopify offline tokens: built into SDK
- Background jobs: BullMQ/node-cron, well-documented
- Email: Resend/SendGrid, trivial API
- No custom infra needed beyond what Railway provides

**Verdict:** 100% feasible. Phase 1+2 shippable in days, not weeks.

---

## Next Steps

- Create detailed implementation plan when ready to build
- Decide on Railway vs alternatives for deployment
- Set up Resend account + custom domain for email deliverability
