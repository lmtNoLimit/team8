# Product Vision Synthesis — AI Store Secretary
**Date:** 2026-03-05 | **Status:** Team Brainstorm Output

---

## The Vision (Refined)

**One-liner:** "Your Shopify store is a 2-person company. You're the boss. We're the operations team."

A Shopify embedded app that gives solo merchants ($5K-$50K/mo) an entire AI operations team — specialized agents that monitor, analyze, and act on store operations 24/7. Merchants open the app each morning to a briefing: what was handled overnight, what needs their decision, and what's trending.

Over time, trust builds. Agents graduate from advisor → assistant → autopilot. Cancelling the app = firing your entire operations department.

---

## Key Decisions from Brainstorm

### 1. Naming & Positioning

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| **Product Name** | **Storekeeper** (top pick), CORA, Steward (runners-up) | "Secretary" carries gendered/low-status connotations. Storekeeper = immediately understood, single word, ownable |
| **Category** | Create **"AI Store Operations"** | No competitor claims this. Don't say "multi-agent platform" (too technical) or "agentic commerce" (Shopify owns it) |
| **Vs. Sidekick** | Complement, never compete | "Sidekick's storefront ops team." Pursue Sidekick App Extensions integration from day one |
| **Vs. Individual Apps** | "One app replaces 5-10" | Consolidation play. Merchants pay $50-150/mo in siloed apps |
| **Metaphor** | Keep "Secretary" for pitch/marketing only | "2-person company" pitch is gold. Just don't name the product Secretary |

### 2. Pricing (Revised)

| Tier | Monthly | Annual | Products | Agents | Runs | Trust |
|------|---------|--------|----------|--------|------|-------|
| **Free** | $0 | - | 25 | 2 (pick) | 2/week | Advisor only |
| **Starter** | $29 | $24/mo | 100 | 4 | Daily | Advisor + Assistant |
| **Pro** | $99 | $79/mo | Unlimited | All | Unlimited | All (incl. Autopilot) |
| **Agency** | $249 | $199/mo | Unlimited | All | Unlimited | All + 5 stores (+$29/store) |

**Key changes:** Pro bumped $79→$99, Free gets 25 products (not 10), Free is Advisor-only (can't act = #1 conversion driver), Agency restructured per-store.

### 3. Unit Economics

| | Starter | Pro | Agency |
|--|---------|-----|--------|
| Revenue | $29 | $99 | $249 |
| After Shopify 20% | $23.20 | $79.20 | $199.20 |
| Claude API + infra | $4.50 | $7.50 | $35.50 |
| **Net margin** | **$18.70 (64%)** | **$71.70 (72%)** | **$163.70 (66%)** |

Claude API costs ~$3-6/mo per merchant. Sustainable. Push merchants toward Pro for healthy margins.

### 4. Product & UX Core Decisions

| Area | Decision |
|------|----------|
| **Core loop** | Morning briefing IS the right core loop + real-time critical alerts + weekly email digest |
| **Dashboard** | Greeting + scorecard banner + max 3-5 decisions/day + ROI counter. Not a flat data table. |
| **Trust progression** | Journey, not toggle. Accuracy badges → undo trail → trust recommendations → gradual autopilot |
| **Agent personality** | Roles + icons + distinct voice tones. NO names/avatars/mascots. Professional team, not cartoon. |
| **Interaction model** | V1: briefing. V2: contextual actions. V3: command bar. V4: conversational. No chat in V1. |
| **Cross-agent intel** | V1: consistent `externalId`, product-centric view. V2: pattern detection. V3: agent collaboration. |
| **Notifications** | Max 1 push/day. Email opt-in. App sidebar badge if possible. Anti-annoyance rules. |
| **Onboarding** | Store profile → first run animation (THE most important screen) → annotated first briefing |
| **Wow moment V1** | First "Run All Agents" = 20+ findings in 30 seconds. "This app knows my store better than I do." |
| **Wow moment V2+** | First morning after install. Secretary handled things overnight. "I have a team." |

### 5. Go-to-Market (First 100 Merchants)

| Priority | Channel | Effort |
|----------|---------|--------|
| 1 | Shopify App Store SEO + "Built for Shopify" badge | 40% |
| 2 | Content marketing (blog, YouTube, guest posts) | 30% |
| 3 | Community + agency partnerships | 20% |
| 4 | Direct outreach ("we scanned your store") | 10% |

**NOT now:** Paid ads (CAC too high), influencer marketing, enterprise sales, localization.

### 6. Growth Levers

| Lever | When |
|-------|------|
| Shareable Store Health Report (best viral mechanic) | Month 1-3 |
| Agency multiplier (1 agency = 5-20 stores) | Month 3-6 |
| New agents every quarter (2/quarter) | Ongoing |
| Referral program ($10 give/$10 get) | Month 3-6 |
| Agent Marketplace (invite-only partners) | Month 9-12 |
| "Stores Like Yours" benchmarks | Month 6+ (need 200+ stores) |
| AI Credits for premium actions | Month 6+ |
| International (Germany first) | Month 9+ |

### 7. Strategic Guardrails

**DO:**
- Complement Sidekick, position as storefront specialist
- Pursue Sidekick App Extensions integration from day one
- Collect anonymized benchmark data from Day 1
- Start trust progression at Advisor, let merchants graduate
- Implement per-merchant token budgets

**DON'T:**
- Don't compete with Sidekick (existential risk)
- Don't build Agent Marketplace before Month 9
- Don't pursue paid ads before PMF
- Don't localize before Month 9
- Don't offer usage-based pricing
- Don't offer white-label for agencies
- Don't build multi-platform before PMF on Shopify

---

## North Star Vision (2 Years)

**Year 1:** Reliable AI operations team. 10-15 agents. Autopilot mature. Agent Marketplace launched. "The app you forget is running until you see the results."

**Year 2:** The AI Secretary PLATFORM. 50+ agents (third-party marketplace). Cross-store benchmarking. Proactive seasonal strategy. Multi-store agency dashboard. Command bar for natural language queries. Institutional memory for every store.

**The moat:** Cancelling = firing your entire operations department. No single competitor can replicate the full team.

---

## Market Sizing

| | Value |
|--|-------|
| TAM | ~$806M/yr (2.24M active Shopify stores) |
| SAM | ~$200-270M/yr (336K-448K stores in $5K-$50K range) |
| SOM Y1 | $200K-$800K ARR (336-1,344 paying merchants) |
| Target Y1 ARR | $300K-$900K (validated as realistic) |

---

## Biggest Threats (Ranked)

1. **Sidekick goes deep on storefront** — 60-70% probability in 18mo. Mitigation: speed, depth, habit, integrate into their ecosystem.
2. **Failed daily habit / low DAU** — execution-dependent. The briefing must feel like opening a message from a competent employee, not a data table.
3. **Inconsistent agent quality** — merchants try once, leave. Each agent must be best-in-class.
4. **Free tier cost spiral** — 5K free users = $12.5K/mo loss. Need 9%+ conversion rate.

---

## Unresolved Questions (Consolidated)

1. Has the "morning briefing" habit been validated with actual merchants?
2. Sidekick App Extensions API surface — how deep can we integrate?
3. Trademark conflict check for "Storekeeper"
4. Should simpler agents use Haiku instead of Sonnet? (80% cost reduction)
5. Autopilot liability — who's responsible when agents make mistakes?
6. Review data sourcing — Judge.me, Yotpo, or Shopify native reviews?
7. Multi-tenant architecture for Agency tier — same DB or separate?
8. Shopify App Bridge badge support — can we show unread count on sidebar?
9. ROI estimation methodology — defensible formula for "time saved"?
10. Default trust levels — auto-enable Autopilot for "safe" agents?
