# Brainstorm: Growth, Monetization & Agent Ecosystem

**Date:** 2026-03-05
**Author:** brainstormer-growth
**Status:** Complete
**Project:** AI Store Secretary — Shopify Embedded App

---

## Executive Summary

The proposed pricing ($29/$79/$199) is directionally correct but underprices value at Pro and overcomplicates the free tier. Unit economics are tight but viable at Sonnet pricing. The Agent Marketplace is the long-term moat but premature before 500+ paying merchants. Go-to-market should laser-focus on Shopify App Store SEO and content marketing — paid acquisition will bleed cash at this stage.

**Bottom line:** Fix the pricing anchors, simplify the free tier, nail the first 100 merchants through organic channels, and defer the marketplace to Month 9+.

---

## 1. Pricing Strategy Analysis

### Current Proposal Assessment

| Tier | Price | Verdict |
|------|-------|---------|
| Free | $0 | Good entry point, but constraints need tuning |
| Starter | $29/mo | Reasonable for low-SKU merchants |
| Pro | $79/mo | **Underpriced.** Should be $99-$129/mo |
| Agency | $199/mo (10 stores) | **Dangerous.** Per-store economics don't work |

### Why $79 Pro Is Too Low

- Shopify app store average plan cost: ~$58-67/mo. Pro at $79 feels "above average" but AI Store Secretary delivers **6 specialized agents** running continuously. Comparable AI tools (Jasper, Copy.ai, Surfer SEO) charge $49-$149/mo for single-function AI.
- A merchant saving even 2 hours/week of manual monitoring at $25/hr = $200/mo in value. Price should capture 40-60% of value delivered.
- **Recommendation: $99/mo Pro** with annual discount to $79/mo (effectively current price but anchored higher).

### Proposed Revised Pricing

| Tier | Monthly | Annual (per mo) | Products | Agents | Runs | Trust Levels |
|------|---------|-----------------|----------|--------|------|--------------|
| Free | $0 | - | 25 | 2 | 2/week | Advisor only |
| Starter | $29 | $24 | 100 | 4 | Daily | Advisor + Assistant |
| Pro | $99 | $79 | Unlimited | All 6 | Unlimited | All (incl. Autopilot) |
| Agency | $249 | $199 | Unlimited | All | Unlimited | All + 5 stores |

### Value-Based vs. Cost-Plus

**Use value-based pricing.** Cost-plus is a race to the bottom in AI — token costs drop 30-50% annually. Price on outcomes:
- "This agent found 18 products invisible to AI search" → worth $X in recovered revenue
- "Predicted stockout saved you from $Y in lost sales"
- Show ROI in the dashboard. "This month, AI Secretary saved you an estimated $X."

### Anchoring Strategy

- Show the "highest" tier first on pricing page (Agency $249)
- Position Pro as "Most Popular" with visual badge
- Show "value delivered this month" in-app to justify renewal

---

## 2. Free Tier Design

### Current Proposal: 2 agents, 10 products
**Verdict: Too restrictive on products, about right on agents.**

### The Problem with 10 Products
- Target merchant ($5K-$50K/mo) typically has 20-100+ products
- At 10 products, Free users never see enough value to convert
- They install, see partial results, think "meh", uninstall
- **Critical:** Shopify App Store ranking heavily weights retention + reviews. Bad free experience = low ratings = death spiral

### Recommended Free Tier

| Constraint | Proposed | Rationale |
|------------|----------|-----------|
| Products | **25** | Enough to show real value on a small catalog |
| Agents | **2** (merchant picks) | Choice creates investment + discovery |
| Agent runs | **2 per week** | Enough to show patterns, not enough for daily ops |
| Trust level | **Advisor only** | Can see findings but can't take action — friction drives upgrade |
| Findings retention | **7 days** | Creates urgency; paid tiers keep history |

### Free-to-Paid Conversion Triggers

1. **"Unlock this action" gate**: Free users see findings but hit "Upgrade to apply this fix" when trying to act. This is the #1 driver.
2. **Product limit hit**: "3 more products need attention but exceed your plan. Upgrade to scan all 47."
3. **Agent tease**: Show grayed-out agents with sample findings. "Schema Expert found 5 issues on stores like yours."
4. **Daily run desire**: Merchant checks daily but can only run 2x/week. Friction.
5. **History loss**: After 7 days, findings expire. "Upgrade to keep your full history."

### Conversion Funnel Targets

- Install → Free active (7d): 60%
- Free active → Paid (30d): 8-12%
- Target: If 10,000 installs/year, ~800-1,200 paying customers

---

## 3. Agent Marketplace Vision

### Timeline Reality Check

**DO NOT build the marketplace before Month 9-12.** Here's why:
- You need 500+ paying merchants to attract third-party developers
- The agent interface is "LOCKED" (per codebase) but will inevitably need changes based on real usage
- Quality control infrastructure is zero today
- The marketplace is a distraction before PMF is proven

### Phased Marketplace Roadmap

**Phase 1 (Month 1-6): Internal agents only**
- Ship 6 built-in agents, prove value, iterate on interface
- Gather data on what merchants actually want

**Phase 2 (Month 6-9): Invite-only partners**
- Open SDK to 3-5 hand-picked developer partners
- Build quality review pipeline manually (human review)
- Learn what developers need from the SDK

**Phase 3 (Month 9-12): Open marketplace beta**
- Public SDK with documentation
- Automated testing + human review for submissions
- Revenue share model launches

**Phase 4 (Month 12+): Scale marketplace**
- Self-serve submission
- Agent ratings/reviews from merchants
- Developer analytics dashboard

### Revenue Share Model

| Approach | Split | Pros | Cons |
|----------|-------|------|------|
| Shopify model (80/20) | Dev 80%, Platform 20% | Attracts developers | Low margin |
| Apple model (70/30) | Dev 70%, Platform 30% | Industry standard | Developers complain |
| **Recommended** | **Dev 75%, Platform 25%** | Competitive, sustainable | - |

Additional considerations:
- First $10K lifetime revenue: 0% platform take (attract early developers)
- Shopify already takes 15-20% of your revenue. Don't stack too aggressively on developers.
- Net to you: Merchant pays $X for third-party agent. You keep 25%. Shopify takes 15-20% of that 25%. Your real take ≈ 20%.

### SDK Requirements (For Future Planning)

```
AgentSDK needs:
- Agent interface (already defined: run() → AgentFindingInput[])
- Sandboxed execution environment (can't access other merchants' data)
- Rate limits per agent (token budget, API call limits)
- Testing harness (mock shop data for development)
- Submission CLI (validate + package + submit)
- Analytics API (installs, runs, ratings for developers)
```

### Quality Control

- **Automated:** Type checking, security scan, sandbox compliance, performance benchmarks (must complete in 30s per interface contract)
- **Human review:** First submission always human-reviewed. Updates auto-approved if no scope change.
- **Merchant ratings:** 1-5 stars + reviews on each agent. Below 3.0 average after 20+ ratings → delisted for review.

---

## 4. Go-to-Market: First 100 Merchants

### Channel Priority (Ranked by ROI)

#### Tier 1: Shopify App Store SEO (40% of effort)
- **This is the game.** 70%+ of Shopify app discovery happens through the App Store.
- Ranking factors: reviews, ratings, installs, keyword relevance, "Built for Shopify" badge
- Target keywords: "AI store manager", "product optimization AI", "store monitoring", "AI SEO Shopify", "product description AI"
- **Action: Get "Built for Shopify" badge ASAP.** This requires passing Shopify's quality review.
- Target: 50-100 5-star reviews in first 3 months (ask happy free tier users)

#### Tier 2: Content Marketing (30% of effort)
- Blog posts: "How AI is changing e-commerce in 2026", "5 things killing your Shopify store's AI visibility"
- YouTube: Screen recordings showing the Daily Briefing in action
- SEO-optimized landing page targeting "Shopify AI assistant" long-tail keywords
- Guest posts on Shopify-focused blogs (Shopify blog, Practical Ecommerce, eCommerceFuel)

#### Tier 3: Community & Partnerships (20% of effort)
- Shopify Community forums — answer questions, don't spam
- r/shopify, r/ecommerce — genuine participation
- Shopify Meetups and events
- Partner with 2-3 Shopify agencies for referrals (offer them Agency tier free + referral commission)

#### Tier 4: Direct Outreach (10% of effort)
- Cold email to merchants with visible pain points (broken schema, thin content)
- "We scanned your store and found X issues" — provide free value upfront
- Target: 5-10 conversions from 200 outreach emails

### Channel NOT to pursue yet
- **Paid ads:** CAC will be $100-$300+ per install. At $29-$99/mo with churn, payback period is too long.
- **Influencer marketing:** Too expensive, wrong audience density.
- **Enterprise sales:** You don't have the product maturity for Shopify Plus yet.

### First 100 Merchant Timeline

| Month | Target | Cumulative | Primary Channel |
|-------|--------|------------|-----------------|
| 1 | 10 | 10 | Direct outreach + beta invites |
| 2 | 20 | 30 | App Store + early reviews |
| 3 | 30 | 60 | Content marketing kicks in |
| 4 | 40 | 100 | App Store ranking improving |

---

## 5. Viral/Referral Mechanics

### Honest Assessment
**Shopify apps are not inherently viral.** Merchants don't talk to other merchants about their tools the way consumers share apps. However, there are leverage points:

### What Can Work

1. **Shareable Store Health Report**
   - Monthly PDF/web report: "Your Store Health Score: 78/100"
   - Merchants share this with their VA, agency, or business partner
   - Report includes "Powered by AI Store Secretary" branding + signup link
   - The person receiving it may manage other stores → install
   - **This is the single best viral mechanic available.**

2. **Agency Multiplier**
   - One agency manages 5-20 stores. Land the agency, get 5-20 installs.
   - Agency tier is a growth vector, not just a pricing tier.
   - Offer agencies white-label or co-branded reports.

3. **Referral Program**
   - "Give $10, Get $10" — simple credit toward monthly bill
   - Track via unique referral links in the app settings
   - Target: 15-20% of new merchants from referrals by Month 6

4. **"Featured on" Badge**
   - If a merchant's store scores 90+ on AI readiness, offer a badge for their footer
   - "AI Optimized Store — Verified by AI Secretary"
   - Curiosity-driven clicks from store visitors → landing page → install

### What Won't Work
- Social sharing of individual findings (too niche, no network effect)
- Gamification/leaderboards (merchants don't care about competing with each other)
- Viral loops within Shopify admin (no mechanism for it)

---

## 6. Usage-Based Pricing

### Should We Charge Per Agent Run?

**No. Not at this stage.** Here's why:

| Model | Pros | Cons |
|-------|------|------|
| Per agent run | Aligns cost with usage | Merchants hate unpredictable bills; discourages exploration |
| Per finding | Pay for value | Perverse incentive to generate more findings; trust erodes |
| Per action executed | Pure value-based | Too complex to track; merchants confused |
| **Flat subscription** | **Predictable, simple** | **Doesn't scale with usage** |
| **Hybrid (sub + overage)** | **Best of both** | **Adds complexity** |

### Recommended: Flat Subscription with Soft Limits

- **Starter/Pro:** Flat monthly fee. No per-run charges. Include generous limits (daily runs for Starter, unlimited for Pro).
- **Overage scenario:** Only if a merchant's catalog is massive (1000+ products) and requires extra API calls beyond included allocation.
- **Future (Month 6+):** Introduce "AI Credits" for premium actions like bulk content rewriting or deep competitor analysis. This is your upsell, not your base pricing.

### Why Not Usage-Based Now

1. Shopify merchants are used to flat subscription apps. Usage-based is foreign and scary.
2. Unpredictable costs are the #1 reason merchants uninstall apps.
3. Your target ($5K-$50K/mo revenue) merchants are cost-conscious. They need predictability.
4. Usage-based requires metering infrastructure you haven't built yet.

---

## 7. Agency/Multi-Store Tier

### Trap or Growth Vector?

**Both. Handle with care.**

### Why It's a Growth Vector
- One agency install = 5-20 store installs (massive leverage)
- Agencies are influential — their recommendation drives merchant adoption
- White-label/co-branded reports make agencies look smart
- Agencies have higher willingness to pay ($199-$499/mo is normal for them)

### Why It's a Trap
- At $199/mo for 10 stores = $19.90/store. Your unit economics at this price are terrible (see Section 12).
- Agencies demand premium support, custom features, and API access
- Agencies churn hard — when they lose a client, you lose a store
- One unhappy agency = one bad review that affects 10 stores' worth of revenue

### Recommendation

| Aspect | Decision |
|--------|----------|
| Offer Agency tier? | **Yes, but restructure pricing** |
| Price | **$249/mo for 5 stores + $29/store after that** |
| Priority | **Month 3+** (don't build multi-store infra for launch) |
| Support | Dedicated Slack channel for agencies (not 1:1 support) |
| White-label | **No.** Too early. Offer co-branded reports instead. |

---

## 8. Data Moat & Aggregate Intelligence

### The Opportunity

As you process hundreds of stores, you accumulate:
- Average product description length by industry
- Common structured data errors by Shopify theme
- Inventory velocity benchmarks by category
- Review sentiment patterns by product type
- Conversion rate correlations with content quality

### "Stores Like Yours" Benchmarks

**This is a legitimate competitive moat and should be a Pro/Agency feature.**

Example insights:
- "Your product descriptions average 45 words. Similar stores in your category average 120 words."
- "85% of stores your size have Organization schema. You don't."
- "Stores that fixed the issues we identified saw an average 23% improvement in AI search visibility."

### Implementation Reality

- **Need 200+ stores minimum** to generate statistically meaningful benchmarks
- **Privacy:** Never expose individual store data. Only aggregates.
- **Timeline:** Start collecting anonymized metrics from Day 1. Surface benchmarks at Month 6+ when you have enough data.
- **Competitive advantage:** This is nearly impossible for competitors to replicate without the same scale.

### Data Architecture (Start Planning Now)

```
Anonymized metrics to collect from Day 1:
- Product count, description word count, image count per product
- Schema types present/missing
- Inventory turnover rates
- Review sentiment distribution
- Agent finding frequencies by type
- Store industry/category (from StoreProfile)
```

Store these as anonymized aggregates in a separate analytics collection. Never store in a way that can be traced back to individual shops.

---

## 9. Expansion Revenue

### Land-and-Expand Playbook

| Stage | Trigger | Expansion Path | Revenue Impact |
|-------|---------|----------------|----------------|
| **Land** | Free install | 2 agents, 25 products | $0 |
| **Expand 1** | Product limit hit | Upgrade to Starter | +$29/mo |
| **Expand 2** | Wants all agents | Upgrade to Pro | +$70/mo |
| **Expand 3** | Wants Autopilot | Already in Pro | $0 (retention) |
| **Expand 4** | Premium agents | Marketplace agents (future) | +$10-$30/mo per agent |
| **Expand 5** | More stores | Agency tier or add-on stores | +$29/store |
| **Expand 6** | AI Credits | Bulk content rewriting, deep analysis | +$10-$50/mo |

### Net Revenue Retention (NRR) Target

- **Target: 110-120% NRR** — meaning existing customers spend 10-20% more over time
- This requires at least 2 clear upsell paths beyond the initial plan
- Agent Marketplace + AI Credits provide this in Month 6+

### Highest-Leverage Expansion: More Agents

- New first-party agents are your best expansion tool
- Every new agent = new reason for Free users to upgrade, Starter users to go Pro
- Roadmap: 2 new agents per quarter. Ideas:
  - Pricing Agent (competitor price monitoring)
  - Email/SMS Agent (post-purchase flow analysis)
  - Social Proof Agent (UGC optimization)
  - Shipping Agent (delivery promise optimization)
  - Accessibility Agent (ADA compliance)

---

## 10. Partnership Opportunities

### High-Value Partnerships (Pursue in Order)

#### 1. Shopify Theme Developers (Month 2-4)
- Schema Agent findings are theme-specific. Partner with top themes (Dawn, Impulse, Prestige)
- "Optimized for [Theme Name]" badge in your listing
- Theme developers recommend your app in their docs
- **Cost: Free. Mutual benefit.**

#### 2. Review App Integrations (Month 3-6)
- Judge.me, Yotpo, Loox — your Review Agent needs review data
- Deep integration = better findings = stickier product
- **Cost: Engineering time. High value.**

#### 3. Shopify Agencies (Month 3-6)
- Top 20 Shopify agencies manage 50-500+ stores each
- Offer: Free Agency tier for 3 months + 20% revenue share on referrals
- **Cost: Margin compression. But massive distribution.**

#### 4. E-commerce Tool Ecosystem (Month 6+)
- Integrate with Klaviyo (email), Gorgias (support), Triple Whale (analytics)
- Share data between tools for richer agent insights
- **Cost: API integration work. Medium priority.**

#### 5. Shopify Plus Technology Partners (Month 9+)
- Requires proven product + case studies
- Access to high-value merchants ($1M+/mo revenue)
- **Cost: Enterprise features + certification. High effort, high reward.**

---

## 11. International Strategy

### Honest Assessment

**Don't localize at launch. English-first for 6+ months.**

### Rationale
- 70%+ of Shopify merchants are English-speaking (US, UK, CA, AU)
- Localization is expensive: UI translation, Claude prompt translation, support in multiple languages
- Your AI prompts are English-optimized. Multi-language prompts perform worse without significant engineering.
- Target market ($5K-$50K/mo) is dense in English-speaking markets

### When to Internationalize

| Market | When | Why |
|--------|------|-----|
| **UK/CA/AU** | Month 1 (no work needed) | English-speaking, same product |
| **Germany** | Month 9+ | Largest EU e-commerce market, Shopify growing fast |
| **France** | Month 12+ | Second-largest EU market |
| **Japan** | Month 12+ | Third-largest e-commerce market globally |
| **LATAM (PT/ES)** | Month 15+ | Growing Shopify adoption, less competition |

### Localization Requirements (When Ready)
- UI strings (React i18n — straightforward)
- Agent prompt templates in target language
- Claude Sonnet handles multilingual well, but prompts need tuning
- Support coverage (minimum: email in local language)
- App Store listing translation (Shopify supports localized listings)

---

## 12. Unit Economics — The Hard Numbers

### Claude API Cost Per Merchant Per Month

**Current model: claude-sonnet-4-6**
- Input: $3/M tokens
- Output: $15/M tokens

**Per Agent Run (estimated from codebase analysis):**

| Component | Input Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|------|
| System prompt | ~200 | - | $0.0006 |
| Product data (50 products) | ~3,000 | - | $0.009 |
| Analysis response | - | ~800 | $0.012 |
| **Total per agent run** | **~3,200** | **~800** | **~$0.022** |

Note: Currently only the Review Agent calls Claude. Other 5 agents are stubs returning hardcoded data. Real implementations will all call Claude.

**Per Merchant Per Day (all 6 agents, daily runs):**
- 6 agents × $0.022 = **$0.13/day**
- Monthly: **$3.90/month**

**Per Merchant Per Day (realistic, larger stores with 200+ products):**
- Input tokens scale: ~10,000 tokens per agent
- 6 agents × ($0.03 input + $0.012 output) = **$0.25/day**
- Monthly: **$7.50/month**

**With prompt caching (90% savings on repeated prompts):**
- System prompts cached: saves ~30% of input costs
- Monthly (small store): **$2.70-$3.00**
- Monthly (large store): **$5.00-$6.00**

### Margin Analysis

| Tier | Revenue | API Cost (avg) | MongoDB | Infra | Gross Margin |
|------|---------|---------------|---------|-------|--------------|
| Free | $0 | $1.50 (2 agents, 2x/week) | $0.50 | $0.50 | **-$2.50** |
| Starter ($29) | $29 | $3.00 | $0.50 | $1.00 | **$24.50 (84%)** |
| Pro ($99) | $99 | $6.00 | $0.50 | $1.00 | **$91.50 (92%)** |
| Agency ($249, 5 stores) | $249 | $30.00 | $2.50 | $3.00 | **$213.50 (86%)** |

**Note:** Shopify takes 15-20% of app revenue. After Shopify's cut:

| Tier | After Shopify Cut (20%) | API + Infra | Net Margin |
|------|------------------------|-------------|------------|
| Free | $0 | $2.50 | **-$2.50** |
| Starter | $23.20 | $4.50 | **$18.70 (64%)** |
| Pro | $79.20 | $7.50 | **$71.70 (72%)** |
| Agency | $199.20 | $35.50 | **$163.70 (66%)** |

### Is $29/mo Sustainable?

**Yes, but barely comfortable.** At $18.70 net margin per Starter merchant, you need ~800 Starter merchants to cover a single engineer's salary ($180K/yr). This is why pushing merchants to Pro ($99) matters enormously.

### Free Tier Cost Management

Each free user costs ~$2.50/mo. At 5,000 free users = $12,500/mo in pure loss. This is your "marketing spend." If 10% convert to paid, that's 500 × $29+ = $14,500+/mo. **Breakeven if conversion rate ≥ 9% and average paid plan ≥ $35/mo.**

**Risk mitigation:** Free tier must have hard limits. 2 agents, 2 runs/week, 25 products. No exceptions.

### Cost Trajectory

Claude API costs historically drop 30-50% per year. By Year 2:
- Per-merchant costs could be 50% lower
- Margin improvement flows directly to bottom line
- This is why value-based pricing (not cost-plus) is critical — you keep the margin as costs drop

---

## 13. Y1 ARR Scenarios

### Conservative Scenario ($300K ARR)

| Quarter | Free Users | Paid Users | Mix | MRR |
|---------|-----------|------------|-----|-----|
| Q1 | 200 | 30 | 70% Starter, 30% Pro | $1,500 |
| Q2 | 800 | 120 | 60% Starter, 35% Pro, 5% Agency | $6,900 |
| Q3 | 1,800 | 300 | 55% Starter, 35% Pro, 10% Agency | $16,500 |
| Q4 | 3,000 | 500 | 50% Starter, 35% Pro, 15% Agency | $25,000 |

**Y1 ARR: ~$300K**

### Optimistic Scenario ($900K ARR)

Requires: "Built for Shopify" badge by Month 2, strong App Store ranking, 15%+ conversion rate.

| Quarter | Paid Users | MRR |
|---------|------------|-----|
| Q1 | 80 | $4,000 |
| Q2 | 350 | $21,000 |
| Q3 | 800 | $48,000 |
| Q4 | 1,500 | $75,000 |

**Y1 ARR: ~$900K**

### What Makes the Difference

The gap between $300K and $900K comes down to:
1. **App Store ranking** — getting to page 1 for key search terms
2. **Conversion rate** — 8% vs 15% free-to-paid
3. **Mix shift** — getting more merchants into Pro vs. Starter
4. **Churn** — keeping monthly churn below 5%

---

## 14. Critical Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Claude API cost spikes | Medium | Implement per-merchant token budgets; cache aggressively; consider Haiku for simple agents |
| Shopify changes App Store algorithm | High | Diversify acquisition channels; build direct relationships |
| Agents produce bad recommendations | Critical | Always start at Advisor level; require human approval; build feedback loop |
| Free tier costs spiral | Medium | Hard limits enforced in code; auto-disable after 30 days of inactivity |
| Agency tier support burden | Medium | Self-serve docs; community forum; limit to 5 stores initially |
| Competitor copies approach | Medium | Data moat (benchmarks); execution speed; agent marketplace lock-in |

---

## 15. Key Recommendations Summary

### Do Now (Month 1-3)
1. **Price Pro at $99/mo** (annual $79/mo). Anchor higher.
2. **Free tier: 25 products, 2 agents, 2 runs/week, Advisor only, 7-day retention**
3. **Get "Built for Shopify" badge** — top priority for App Store ranking
4. **Implement token budgets per merchant** — protect your margins
5. **Start collecting anonymized benchmarking data** from Day 1
6. **Shareable Store Health Report** — your best viral mechanic

### Do Soon (Month 3-6)
7. Introduce AI Credits for premium actions (bulk rewriting, deep analysis)
8. Partner with 3 Shopify agencies for distribution
9. Integrate with Judge.me/Yotpo for real review data
10. Launch referral program ($10 give / $10 get)

### Do Later (Month 6-12)
11. Open Agent SDK to invite-only partners
12. Surface "Stores Like Yours" benchmarks (need 200+ stores)
13. Build multi-store infrastructure for Agency tier
14. Consider Haiku for simple/fast agents to reduce costs

### Don't Do
- Don't build the marketplace before Month 9
- Don't pursue paid advertising before product-market fit
- Don't localize before Month 9
- Don't offer usage-based pricing (merchants hate unpredictable bills)
- Don't offer white-label for agencies (too early, too complex)
- Don't undercut on price to compete — compete on agent quality

---

## Unresolved Questions

1. **Shopify's own AI play:** Shopify is investing heavily in AI (Sidekick, Magic). How much of our value proposition will Shopify eventually commoditize? Need competitive intelligence on their roadmap.
2. **Model selection per agent:** Should simpler agents (inventory, schema) use Haiku ($0.25/$1.25 per M tokens) instead of Sonnet? Could cut costs 80% for those agents.
3. **Autopilot liability:** When an agent auto-executes and makes a mistake (e.g., wrong product description), who is liable? Need terms of service clarity.
4. **Review data sourcing:** Current Review Agent reads from local DB (seeded data). Real implementation needs Judge.me/Yotpo API or Shopify's native reviews. Which to prioritize?
5. **Multi-tenant architecture:** Current schema is single-tenant (one MongoDB). Agency tier with 10 stores — same DB? Separate collections? Performance implications?
