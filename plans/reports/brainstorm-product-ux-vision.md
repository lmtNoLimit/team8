# Brainstorm: Product & UX Vision — AI Store Secretary

**Date:** 2026-03-05 | **Author:** brainstormer-ux | **Status:** Complete

---

## 1. Daily Rhythm: Beyond the Morning Briefing

### The Morning Briefing IS the Right Core Loop — But It's Not Enough Alone

The "morning briefing" metaphor is strong because it maps to a real-world mental model merchants already have: the morning standup with your team. However, a pure morning-only model has a fatal flaw: **e-commerce doesn't sleep, and merchants check their phones throughout the day.**

### Recommended Rhythm Architecture

**Three-layer temporal model:**

| Layer | Trigger | Channel | Content |
|-------|---------|---------|---------|
| **Morning Briefing** (primary) | Time-based, ~8am local | In-app dashboard | Full briefing: overnight actions, decisions needed, insights |
| **Real-Time Alerts** (interrupt) | Event-driven | Push/email | Critical only: stockout imminent, broken checkout, revenue anomaly |
| **Weekly Digest** (reflection) | Sunday evening | Email | Trends, progress, ROI summary, trust level recommendations |

**What makes merchants OPEN the app daily:**

1. **The "streak" mechanic** — show "Your Secretary handled 47 items this week. 0 issues missed." Merchants open the app because they want to see what the team did, not because they're anxious. This is the Netflix model: you open it to see what's new, not because you have homework.
2. **Decision scarcity** — never show more than 3-5 decisions per day. If there are 20 findings, the Secretary triages and presents the top 3. The rest wait. This prevents overwhelm and makes each visit feel manageable.
3. **Visible ROI counter** — persistent metric: "Your Secretary has saved you an estimated 12 hours and prevented $3,200 in lost revenue this month." This is the anchor that justifies keeping the app.

### What the Current Implementation Gets Right and Wrong

**Right:** The three-section layout (Handled Overnight / Needs Your Decision / Insights) maps perfectly to the PRD vision. The "Run All Agents" button is appropriate for MVP manual triggering.

**Wrong:** The current dashboard (`app._index.tsx`) is a flat list with no personality, no temporal context ("good morning"), no ROI tracking, and no prioritization within sections. Every finding looks the same regardless of urgency. The sidebar just shows agent count — dead space.

### Recommended Enhancement

```
Good morning, [Store Name]!

Your team worked overnight. Here's what happened:

[SCORECARD: 3 handled | 2 need you | 4 insights | Est. savings: $420]

━━ NEEDS YOUR DECISION (2) ━━━━━━━━━━━━━━━━━━━━
  [Priority 1 finding with clear CTA]
  [Priority 2 finding with clear CTA]
  
  "That's everything. The rest can wait."

━━ HANDLED OVERNIGHT (3) ━━━━━━━━━━━━━━━━━━━━━━
  [Collapsed by default — expandable]
  
━━ INSIGHTS (4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [Collapsed by default — expandable]
```

**Key principle:** The dashboard should feel like opening a message from a competent employee, not like opening a data table.

---

## 2. Trust Progression UX

### The Current Implementation

Settings page (`app.settings.tsx`) has radio buttons for Advisor/Assistant/Autopilot per agent. This is functional but emotionally flat. Trust is an emotional decision — the UI treats it like a configuration toggle.

### How Trust Should FEEL

**Trust is not a setting. Trust is a journey.**

```
TRUST PROGRESSION JOURNEY:

Week 1:  Advisor mode → Secretary shows findings, merchant reads all of them
         "Hmm, these are actually pretty good..."

Week 2:  Advisor mode → Secretary starts highlighting accuracy stats
         "This agent has been right 23 out of 25 times"
         [Subtle prompt: "Based on track record, consider upgrading to Assistant?"]

Week 3:  Merchant upgrades to Assistant → Apply buttons appear
         First time clicking "Apply" feels momentous → show confirmation
         "Applied! Here's exactly what changed. Undo within 24 hours."

Week 4:  Assistant mode → merchant is clicking Apply on everything without reading
         [Prompt: "You've approved 100% of Content Agent's suggestions for 2 weeks. 
          Enable Autopilot? It'll handle these automatically and report back."]

Week 8:  Autopilot → "Content Agent handled 34 items this month. 0 errors."
```

### Micro-Interactions That Build Trust

1. **Accuracy badges on findings** — "This agent has been 94% accurate this month" (requires tracking apply/dismiss ratio)
2. **Undo trail** — every applied action has a visible "Undo" for 24-72 hours. Makes "Apply" feel safe.
3. **Before/After previews** — for content changes, show exactly what will change. Diff view. No surprises.
4. **Trust recommendation engine** — after N successful applications, the Secretary itself recommends upgrading trust level. The merchant doesn't have to figure out when to trust more.
5. **Gradual autopilot** — "Autopilot for priority 4-5 items only" before full autopilot. Ease in.
6. **Monthly trust report** — "Here's everything your agents did, accuracy rates, and what would have happened if you'd been on autopilot." Shows the value of the next trust level without forcing it.

### Where to Surface Trust Controls

**NOT buried in Settings.** Trust should be contextual:

- On each finding card: "This agent → Advisor mode" with a link to upgrade
- On the agent detail page: prominent trust level display with recommendation
- In the weekly digest: "3 agents ready for promotion"
- Settings page remains for bulk configuration

---

## 3. Agent Personality

### Strong Recommendation: Give Agents ROLES, Not Personalities

Agents should not have names like "Bob the Inventory Guy" or cartoon avatars. Shopify merchants are business operators — they want professionals, not mascots.

**BUT** agents should feel like distinct team members, not interchangeable cogs.

### The Right Model: Professional Team with Specialties

| Agent | Role Title | Icon | Tone |
|-------|-----------|------|------|
| AEO | AEO Specialist | Radar/Search icon | Technical, precise |
| Content | Content Editor | Pen/Edit icon | Creative, editorial |
| Schema | Schema Expert | Code/Structure icon | Technical, detailed |
| Inventory | Inventory Manager | Box/Warehouse icon | Urgent when needed, calm otherwise |
| Storefront | QA Inspector | Magnifying glass | Observational, quality-focused |
| Review | Review Analyst | Star/Chat icon | Empathetic, customer-voice |

### What Personality Means in Practice

- Each agent's findings should have **a consistent voice** in descriptions. The Content Agent writes differently from the Schema Agent.
- Agent cards should have **distinct icons** (not colors alone — accessibility matters)
- The agent detail page should feel like visiting a team member's desk — their specialty, track record, recent work
- **No first-person pronouns for agents.** The Secretary speaks in first person ("I found..."). Individual agents report in third person in the Secretary's voice ("Your Content Editor found...").

### What to Avoid

- Named characters ("Meet Alex, your AEO specialist!") — feels gimmicky
- Personality quizzes or agent customization — premature complexity
- Anthropomorphization beyond role titles — agents are tools with roles, not characters

---

## 4. "Secretary" Interaction Model

### The Briefing Format is Sufficient for V1. Chat is Premature.

**Why NOT to add chat now:**

1. Chat implies real-time dialogue. Agents run on schedules, not in conversation.
2. Chat creates expectation of instant answers. These agents take 10-30 seconds per run.
3. Chat UX is an entirely different paradigm from dashboard UX — it fragments the experience.
4. Shopify's embedded app context is not ideal for chat (small iframe, constrained nav).

**Why to PLAN for chat in V3+:**

1. "Why did you flag this product?" is a natural question merchants will ask
2. "Run just the inventory check on Product X" is a natural command
3. Cross-agent queries: "What's the full picture on my blue sneakers?" (content + reviews + inventory + schema)

### Recommended Interaction Model Evolution

| Phase | Model | Why |
|-------|-------|-----|
| **V1 (now)** | Dashboard briefing + drill-down | Simple, proven, buildable in a hackathon |
| **V2** | Dashboard + contextual actions (Apply/Dismiss/Explain) | Adds interactivity without chat complexity |
| **V3** | Dashboard + command bar ("Ask your Secretary") | Structured queries, not free-form chat |
| **V4** | Full conversational interface as alternate mode | For power users who prefer dialogue |

### The "Command Bar" Concept (V3)

Instead of a full chat, a command bar at the top of the dashboard:

```
┌─────────────────────────────────────────────────┐
│ Ask your Secretary...                            │
│                                                  │
│ Examples:                                        │
│ "What's happening with Blue Sneakers?"           │
│ "Run AEO check on all new products"              │
│ "Show me everything from this week"              │
│ "Why is bounce rate up on the homepage?"          │
└─────────────────────────────────────────────────┘
```

This is more constrained than chat, more powerful than buttons, and fits the Shopify embedded app model.

### Voice

Voice is premature and probably never appropriate for a Shopify embedded app. Merchants interact with this inside Shopify Admin — desktop/tablet context. Voice adds zero value here.

---

## 5. Cross-Agent Intelligence

### This Is the Killer Feature. It's Also the Hardest.

Current architecture: agents run independently, write findings to the same table, dashboard displays them in flat sections. No cross-agent correlation exists.

### Three Levels of Cross-Agent Intelligence

**Level 1: Co-located display (V1 — achievable now)**
- On product detail views, show findings from ALL agents for that product
- Tag findings with `externalId` (product GID) and group by product
- "Blue Sneakers: 1 AEO issue, 2 content suggestions, 1 inventory alert"

**Level 2: Pattern detection (V2)**
- Post-processing layer that runs after all agents complete
- Looks for correlations: high traffic + low stock = urgent; bad reviews + high returns = product quality issue
- Generates "Secretary Insights" (meta-findings from cross-agent analysis)

**Level 3: Agent collaboration (V3+)**
- Agents share context during execution
- Content Agent asks Review Agent: "What words do customers use for this product?"
- AEO Agent tells Content Agent: "These keywords are trending in AI search"

### Practical Cross-Agent Scenarios

| Scenario | Agents Involved | Secretary Insight |
|----------|----------------|-------------------|
| Low stock + high traffic | Inventory + Storefront | "Blue Sneakers will sell out in 48 hours. Consider reorder or turning off ads." |
| Bad reviews + content mismatch | Review + Content | "Customers say 'runs small' but size guide says 'true to fit'. 67% of 1-star reviews mention sizing." |
| Schema errors + AEO score drop | Schema + AEO | "Structured data broke on 12 products yesterday. AEO visibility dropped 23%." |
| Competitor appearing + your product declining | AEO + Content | "CompetitorX ranks above you for 'wireless earbuds'. Their description mentions 3 attributes yours doesn't." |

### Implementation Recommendation for MVP

Don't try to build cross-agent intelligence in V1. Instead:
- Ensure `externalId` is consistently used across agents (product GID)
- Add a product-centric view that aggregates findings by product
- This creates the DATA foundation for cross-agent intelligence without the LOGIC complexity

---

## 6. Notification Strategy

### The Cardinal Rule: Never Annoy. Always Be Worth Opening.

Merchants are drowning in notifications from Shopify, email marketing tools, review apps, shipping apps. One more noisy app = instant uninstall.

### Notification Tiers

| Tier | Channel | Trigger | Examples |
|------|---------|---------|---------|
| **Critical** (rare, <1/week) | Push + Email | Revenue at risk | "Your checkout schema is broken — Google is rejecting your listings" |
| **Daily Briefing** (1/day) | In-app + optional email | Scheduled | "3 items need your attention" |
| **Weekly Digest** (1/week) | Email only | Scheduled | "This week: 47 handled, $2,100 estimated savings, 2 trends spotted" |
| **Informational** (passive) | In-app badge only | Async | "Content Agent completed. 4 new findings." |

### Anti-Annoyance Rules

1. **Max 1 push notification per day** — ever. Even if the store is on fire.
2. **Email opt-in only** — never default to email notifications
3. **Snooze button on everything** — "Remind me tomorrow" / "Don't show this type again"
4. **Notification settings per agent** — maybe I want inventory alerts but not content suggestions
5. **Auto-downgrade** — if merchant never opens briefing emails after 2 weeks, stop sending them
6. **Batch everything** — 5 findings at 3pm don't generate 5 notifications. They generate 1 badge update.

### The "Red Badge" Strategy

The Shopify embedded app sidebar shows app names. If we can badge the app name (like unread count), that's the most valuable notification channel:

- `AI Secretary (3)` in the Shopify sidebar
- Merchant sees it naturally while doing other admin work
- No push notification needed — ambient awareness

This is the iOS app badge strategy applied to Shopify. Worth investigating if Shopify App Bridge supports this.

---

## 7. Mobile Experience

### Important but Not Primary for V1

**Why it matters:**
- Merchants check Shopify Admin on mobile constantly (order fulfillment, customer service)
- The morning briefing is a natural "check while drinking coffee" moment
- Decision-making on mobile is natural for binary choices (Apply/Dismiss)

**Why it's not V1 priority:**
- Shopify embedded apps render in a mobile webview — Polaris web components handle responsive layout already
- The briefing format (list of cards) works well on mobile without custom mobile work
- Complex actions (reviewing content changes, comparing before/after) are desktop-first

### Mobile UX Principles

1. **Briefing is mobile-first** — cards with big tap targets, clear CTAs
2. **Agent details are desktop-first** — more complex, can wait
3. **Swipe gestures** — swipe right to apply, swipe left to dismiss (V2, Tinder for store operations)
4. **No horizontal scrolling ever** — all layouts must be single-column on mobile
5. **Progressive disclosure** — collapse descriptions by default on mobile, show title + badge + CTA only

### Current Code Assessment

The Polaris web component usage (`s-stack`, `s-box`, `s-section`) should be responsive by default. No mobile-specific work needed for V1 beyond testing.

---

## 8. Onboarding: First 5 Minutes

### The Current Empty State Problem

Current dashboard when empty: "No findings yet. Click 'Run All Agents' to start your briefing." This is terrible. The merchant installed the app expecting value. They get a blank page with a button.

### Recommended Onboarding Flow

**Minute 0-1: Install + Landing**
```
"Welcome to AI Secretary! Let's set up your team."

Step 1 of 3: Tell us about your store
[Store Name] [Industry] [Target Audience]

"This helps your agents give relevant recommendations."
```

**Minute 1-2: First Run**
```
"Let's run your first briefing!"

[Running AEO Specialist...]     Done — 4 findings
[Running Content Editor...]     Done — 6 findings  
[Running Schema Expert...]      Done — 3 findings
[Running Inventory Manager...]  Done — 2 findings
[Running QA Inspector...]       Done — 5 findings
[Running Review Analyst...]     Done — 3 findings

"Your team found 23 opportunities! Let's review."
```

This screen is powerful: the merchant WATCHES their team work. Real-time progress. Each agent completing feels like hiring an employee in fast-forward.

**Minute 2-4: First Briefing with Annotations**
```
"Here's your first briefing:"

[Contextual tooltips on first visit]
"These are things your team handled automatically" → Handled section
"These need your input — tap to decide" → Decision section
"Good to know, no action needed" → Insights section
```

**Minute 4-5: Trust Level Intro**
```
"Your team is set to Advisor mode — they recommend, you decide."

"As you get comfortable, you can upgrade agents to:
 Assistant (one-click apply) or Autopilot (auto-handle).
 
 We'll recommend upgrades based on accuracy."

[Got it, show me my briefing]
```

### The First-Run Animation

The "agents running" screen is the MOST IMPORTANT screen in the entire app. It's the only time the merchant viscerally experiences having a team. Every subsequent visit is just reading the team's output. This one moment — watching 6 agents work in parallel and produce 20+ findings in 30 seconds — IS the product demo.

**Invest heavily in this screen.** Progress bars per agent. Checkmarks. Finding count incrementing. Make it feel like a command center spinning up.

---

## 9. The "Wow Moment"

### The Single Interaction That Creates Dependency

**Scenario: The First Morning After Installation**

The merchant installed the app yesterday. They ran the agents once, looked at findings, dismissed a few, applied two content suggestions. Then they went home.

This morning, they open Shopify Admin. They see the Secretary app in the sidebar. They click it.

```
Good morning! While you were away:

HANDLED OVERNIGHT:
  - Fixed structured data on 3 products the Schema Expert flagged
  - Updated llms.txt with your 2 new products from yesterday
  
NEEDS YOUR DECISION:
  1. Your "Blue Widget" has 3 days of stock left at current pace
     → Reorder? [Mark as Reordered] [Snooze 3 days]

INSIGHTS:
  "Sustainable packaging" is trending +340% in AI searches.
  You have 3 eco-friendly products not yet optimized for this term.

Your Secretary has handled 5 items and saved you an estimated 45 minutes.
```

**THIS is the wow moment.** The merchant didn't have to do anything. Their Secretary worked overnight. The store is better than when they left it. And the only thing that needs their brain is a real decision about restocking.

For the first time, they feel like they have a team.

### What Makes This Moment Possible

1. Autopilot must be enabled on at least 1-2 agents (Schema + AEO are safe defaults)
2. Secretary must run overnight (cron/scheduled job — not in V1 but critical for V2)
3. "Handled Overnight" section must show WHAT was done, not just that something happened
4. Time-saved estimate, even if rough, makes value tangible

### Fallback Wow Moment for V1 (No Autopilot Yet)

In V1 where everything is Advisor mode and manually triggered:

**The wow is the first "Run All Agents" result.**

20+ findings across 6 domains in 30 seconds. Things the merchant didn't know about their own store. A content agent catching thin descriptions. A schema agent finding broken structured data. An inventory agent spotting a product selling faster than expected.

The message: "This app knows my store better than I do after 30 seconds of analysis."

---

## 10. North Star Vision: 2 Years Out

### Year 1: "Your AI Operations Team"

- 10-15 agents covering all major store operations
- Autopilot mode mature and trusted
- Agent Marketplace launched — third-party developers building agents
- Weekly digest email has 60%+ open rate (because it's genuinely useful)
- Average merchant has 5+ agents on autopilot
- Brand: "The app you forget is running until you see the results"

### Year 2: "The AI Secretary Platform"

**The Secretary becomes the OPERATING SYSTEM for Shopify store operations.**

Not just an app — a platform where:

1. **Agent Marketplace** — 50+ agents from third-party developers. Merchants browse and install agents like hiring freelancers. Revenue share model.
2. **Cross-store intelligence** — anonymized benchmarking. "Your AEO score is 72. Top stores in your category average 89." The Secretary knows what "good" looks like because it sees thousands of stores.
3. **Proactive strategy** — Secretary spots opportunities. "Black Friday is 6 weeks away. Based on last year's data and current trends, here's your prep checklist. Want me to start executing?"
4. **Multi-store management** — agency dashboard. One Secretary managing 50 stores. Different teams per store.
5. **Deep Shopify integration** — Secretary becomes the FIRST thing merchants open, not Shopify Admin. Everything routes through the Secretary's lens.
6. **Conversation mode** — "Secretary, what happened with Blue Sneakers this quarter?" Natural language queries across all agent data. Institutional memory for the store.

### The Ultimate Test

In 2 years, if a merchant considers cancelling:

- They'd lose 10+ agents monitoring their store 24/7
- They'd lose cross-agent insights they can't get anywhere else
- They'd lose months of learned context about their specific store
- They'd lose the autopilot actions handling 50+ items/month
- They'd go back to checking 5 separate apps manually

**Cancelling = firing your entire operations department.** That's the moat.

---

## Summary of Recommendations

### V1 (Hackathon MVP) — Do Now
1. Add time-of-day greeting + scorecard banner to dashboard
2. Collapse "Handled" and "Insights" sections by default — focus on decisions
3. Limit visible decisions to top 3-5 by priority
4. Add "Run All Agents" progress animation (the wow moment)
5. Fill the sidebar with estimated value/savings counter
6. Store profile onboarding flow before first agent run

### V2 (Month 2) — Plan For
1. Scheduled agent runs (cron) — enables "overnight" handling
2. Undo/rollback on applied actions
3. Accuracy tracking per agent (foundation for trust recommendations)
4. Email briefing digest (opt-in)
5. Product-centric cross-agent view
6. Before/After preview on content changes

### V3 (Month 4) — Vision
1. Trust recommendation engine ("this agent is ready for autopilot")
2. Command bar for structured queries
3. Cross-agent pattern detection
4. Weekly digest email with ROI summary
5. Notification tiers (critical push, daily badge, weekly email)
6. Agent Marketplace foundation

---

## Unresolved Questions

1. **Shopify App Bridge badge support** — can we show unread count on the app sidebar icon? Most valuable passive notification channel.
2. **Scheduled runs infrastructure** — BullMQ or similar job queue for V2? Or Shopify Flow triggers?
3. **ROI estimation methodology** — how to calculate "estimated time saved" and "estimated revenue protected"? Needs a defensible formula.
4. **Store Profile auto-fill** — can we pull store name, industry from Shopify API automatically instead of asking?
5. **Mobile webview constraints** — any Shopify-specific limitations on push notifications from embedded apps?
6. **Default trust levels** — should we auto-enable Autopilot for "safe" agents (Schema, AEO) to create wow moment sooner? Or does that violate trust?
