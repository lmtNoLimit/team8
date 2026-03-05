---
phase: 05
title: "Problem + Solution Sections"
status: pending
effort: 4h
depends_on: [03]
---

# Phase 05 — Problem + Solution Sections

## Context Links

- [Plan Overview](./plan.md)
- [SaaS Best Practices: Consolidation Positioning](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis: ClickUp Playbook](../reports/researcher-2-260306-landing-page-competitor-analysis.md)

## Overview

- **Priority:** P2
- **Status:** pending
- **Description:** Build three content sections: Problem Validation ("solo merchant's dilemma"), Solution Overview ("one team, one dashboard"), and Consolidation Proof ("replaces your app stack"). Also includes How It Works 3-step flow.

## Key Insights

- ClickUp playbook: vague headline -> clarify -> visual proof -> comparison
- Frame competing tools as the problem, not just pain points
- Before/after visual proof bypasses "does it really replace all of them?" objection
- 3-step "How It Works" reduces perceived complexity (research finding)
- Mobile: stack all grids vertically, single column

## Requirements

### Functional

**Problem Section:**
- Headline: "The solo merchant's dilemma"
- 3-4 pain point cards showing fragmented tool categories
- Each card: icon + tool category + pain description
- Visual: scattered app icons converging into chaos

**Solution Section:**
- Headline: "One team. One dashboard. 24/7."
- Brief intro paragraph
- Grid of 7 agent cards (compact) showing name + one-line role
- Each card clickable to scroll to Agent Showcase section

**Consolidation Section:**
- Headline: "Replaces your fragmented app stack"
- Before/after comparison: 7+ app logos arrow Storekeeper
- Table: Agent Name | What It Replaces | What Changes
- Savings callout: "Save $XX/month by consolidating"

**How It Works Section:**
- Headline: "Up and running in 2 minutes"
- 3 numbered steps with icon + title + description
- Step 1: Connect your store (one-click install)
- Step 2: Pick agents and trust level
- Step 3: Get your daily briefing

### Non-Functional
- Alternating section backgrounds (white / slate-50) for visual rhythm
- All sections have `id` attributes for anchor navigation
- Animations: fade-in on scroll (IntersectionObserver via Alpine or CSS)

## Architecture

```
src/
  components/
    sections/
      problem-section.astro
      solution-section.astro
      consolidation-section.astro
      how-it-works-section.astro
    ui/
      pain-point-card.astro
      agent-mini-card.astro
      step-card.astro
      comparison-row.astro
  data/
    agents.ts                    # Agent metadata for cards
```

## Related Code Files

### Create
- `src/components/sections/problem-section.astro`
- `src/components/sections/solution-section.astro`
- `src/components/sections/consolidation-section.astro`
- `src/components/sections/how-it-works-section.astro`
- `src/components/ui/pain-point-card.astro`
- `src/components/ui/agent-mini-card.astro`
- `src/components/ui/step-card.astro`
- `src/data/agents.ts`

### Reference
- `src/components/ui/section-heading.astro` (Phase 02)
- Main app agent registry: `/Users/lmtnolimit/projects/team8/app/agents/agent-registry.server.ts`

## Implementation Steps

1. **Create agents.ts data file**
   ```ts
   export interface AgentInfo {
     id: string;
     name: string;
     shortName: string;
     description: string;
     icon: string;        // Emoji or SVG path
     replaces: string;    // What tool/workflow it replaces
     benefit: string;     // One-line outcome
   }

   export const agents: AgentInfo[] = [
     {
       id: 'storefront',
       name: 'Storefront Agent',
       shortName: 'Storefront',
       description: 'Audits product pages for quality, missing images, broken links, and SEO issues',
       icon: '🏪',
       replaces: 'Manual QA + page auditing tools',
       benefit: 'Catch broken pages before customers do',
     },
     {
       id: 'inventory',
       name: 'Inventory Agent',
       shortName: 'Inventory',
       description: 'Monitors stock levels, predicts stockouts, flags dead inventory',
       icon: '📦',
       replaces: 'Stocky, inventory spreadsheets',
       benefit: 'Never miss a stockout or overstock again',
     },
     {
       id: 'review',
       name: 'Review Agent',
       shortName: 'Reviews',
       description: 'Analyzes customer reviews for sentiment, flags fake/spam reviews',
       icon: '⭐',
       replaces: 'Review monitoring tools, manual scanning',
       benefit: 'Protect reputation and surface real feedback',
     },
     {
       id: 'trend',
       name: 'Trend Agent',
       shortName: 'Trends',
       description: 'Tracks sales trends, seasonal patterns, and emerging opportunities',
       icon: '📈',
       replaces: 'Google Analytics + manual trend analysis',
       benefit: 'Spot opportunities before competitors do',
     },
     {
       id: 'aeo',
       name: 'AEO Agent',
       shortName: 'Search (AEO)',
       description: 'Optimizes product data for AI search engines and answer engines',
       icon: '🔍',
       replaces: 'SEO tools + manual metadata editing',
       benefit: 'Get found by AI-powered search',
     },
     {
       id: 'content',
       name: 'Content Agent',
       shortName: 'Content',
       description: 'Evaluates product descriptions, titles, and images for quality and conversion',
       icon: '✍️',
       replaces: 'Copywriting tools + content audits',
       benefit: 'Higher-converting product pages',
     },
     {
       id: 'schema',
       name: 'Schema Agent',
       shortName: 'Schema',
       description: 'Validates and generates structured data markup for rich search results',
       icon: '🏷️',
       replaces: 'Schema markup plugins + manual JSON-LD',
       benefit: 'Rich results in Google search',
     },
   ];
   ```

2. **Create problem-section.astro**
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';

   const painPoints = [
     {
       icon: '🔀',
       title: '7+ separate tools',
       description: 'SEO, reviews, inventory, content, analytics — each in its own dashboard with its own subscription.',
     },
     {
       icon: '🏝️',
       title: 'Data silos everywhere',
       description: 'Your tools don\'t talk to each other. Issues fall through the cracks between apps.',
     },
     {
       icon: '⏰',
       title: 'Constant manual work',
       description: 'You spend hours checking dashboards, running audits, and fixing issues one by one.',
     },
     {
       icon: '💸',
       title: '$200+/month in app fees',
       description: 'Each tool charges separately. The costs add up fast for a solo merchant.',
     },
   ];
   ---
   <section id="problem" class="section-padding bg-white">
     <div class="section-container">
       <SectionHeading
         overline="The Problem"
         title="The solo merchant's dilemma"
         subtitle="You're running a store alone. But you're managing a dozen tools to keep it competitive."
       />

       <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {painPoints.map((point) => (
           <div class="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
             <div class="text-3xl mb-4">{point.icon}</div>
             <h3 class="text-lg font-semibold text-navy mb-2">{point.title}</h3>
             <p class="text-sm text-navy-light leading-relaxed">{point.description}</p>
           </div>
         ))}
       </div>
     </div>
   </section>
   ```

3. **Create solution-section.astro** — agent grid overview
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';
   import { agents } from '../../data/agents';
   ---
   <section id="features" class="section-padding bg-slate-50">
     <div class="section-container">
       <SectionHeading
         overline="The Solution"
         title="One team. One dashboard. 24/7."
         subtitle="Meet your AI operations team. Each agent specializes in one area of your store."
       />

       <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
         {agents.map((agent) => (
           <a href="#agent-showcase" class="group p-5 rounded-xl bg-white border border-slate-200
             hover:border-brand hover:shadow-md transition-all duration-200">
             <div class="text-2xl mb-3">{agent.icon}</div>
             <h3 class="font-semibold text-navy group-hover:text-brand transition-colors mb-1">
               {agent.shortName}
             </h3>
             <p class="text-sm text-navy-light leading-relaxed">{agent.benefit}</p>
           </a>
         ))}
       </div>
     </div>
   </section>
   ```

4. **Create consolidation-section.astro** — before/after proof
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';
   import { agents } from '../../data/agents';
   ---
   <section class="section-padding bg-white">
     <div class="section-container">
       <SectionHeading
         overline="Consolidation"
         title="Replaces your fragmented app stack"
         subtitle="Stop paying for 7 tools that don't talk to each other."
       />

       <!-- Comparison table -->
       <div class="mt-12 max-w-4xl mx-auto">
         <div class="rounded-xl border border-slate-200 overflow-hidden">
           <!-- Header -->
           <div class="grid grid-cols-3 bg-navy text-white text-sm font-semibold">
             <div class="p-4">Agent</div>
             <div class="p-4">Replaces</div>
             <div class="p-4">What You Get</div>
           </div>
           <!-- Rows -->
           {agents.map((agent, i) => (
             <div class:list={[
               "grid grid-cols-3 text-sm border-t border-slate-100",
               i % 2 === 0 ? "bg-white" : "bg-slate-50"
             ]}>
               <div class="p-4 font-medium text-navy flex items-center gap-2">
                 <span>{agent.icon}</span> {agent.shortName}
               </div>
               <div class="p-4 text-navy-light">{agent.replaces}</div>
               <div class="p-4 text-brand font-medium">{agent.benefit}</div>
             </div>
           ))}
         </div>
       </div>

       <!-- Savings callout -->
       <div class="mt-8 text-center">
         <div class="inline-flex items-center gap-3 px-6 py-3 bg-brand-light rounded-full">
           <span class="text-brand font-bold text-lg">Save $100-300/month</span>
           <span class="text-sm text-navy-light">by consolidating your app stack</span>
         </div>
       </div>
     </div>
   </section>
   ```

5. **Create how-it-works-section.astro** — 3-step flow
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';

   const steps = [
     {
       number: '1',
       title: 'Connect your store',
       description: 'One-click install from the Shopify App Store. No complex integrations or API keys.',
       icon: '🔌',
     },
     {
       number: '2',
       title: 'Pick your agents & trust level',
       description: 'Choose which agents to activate. Start in Advisor mode (read-only) or let them act.',
       icon: '🎛️',
     },
     {
       number: '3',
       title: 'Get your daily briefing',
       description: 'Every morning: issues found, actions taken, revenue impact. One dashboard instead of seven.',
       icon: '📋',
     },
   ];
   ---
   <section id="how-it-works" class="section-padding bg-slate-50">
     <div class="section-container">
       <SectionHeading
         overline="Getting Started"
         title="Up and running in 2 minutes"
         subtitle="No complex setup. No data migration. Just install and go."
       />

       <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
         {steps.map((step) => (
           <div class="text-center">
             <div class="inline-flex items-center justify-center w-16 h-16
               bg-brand/10 text-3xl rounded-2xl mb-6">
               {step.icon}
             </div>
             <div class="inline-flex items-center justify-center w-8 h-8
               bg-brand text-white text-sm font-bold rounded-full mb-4">
               {step.number}
             </div>
             <h3 class="text-xl font-semibold text-navy mb-3">{step.title}</h3>
             <p class="text-navy-light leading-relaxed">{step.description}</p>
           </div>
         ))}
       </div>

       <!-- CTA after steps -->
       <div class="mt-12 text-center">
         <a href="https://apps.shopify.com/storekeeper" class="btn-primary">
           Install Free in 30 Seconds
         </a>
       </div>
     </div>
   </section>
   ```

6. **Mobile responsiveness**
   - Problem cards: 1 column on mobile, 2 on sm, 4 on lg
   - Solution agent grid: 1 column mobile, 2 sm, 3 lg, 4 xl
   - Consolidation table: horizontal scroll on mobile (or stack rows)
   - How It Works: vertical stack on mobile, 3 columns on md+

7. **Add scroll animations** (optional enhancement)
   Use CSS `@media (prefers-reduced-motion: no-preference)` + IntersectionObserver:
   ```css
   .animate-on-scroll {
     opacity: 0;
     transform: translateY(20px);
     transition: opacity 0.6s ease, transform 0.6s ease;
   }
   .animate-on-scroll.visible {
     opacity: 1;
     transform: translateY(0);
   }
   ```
   Alpine.js or vanilla JS observer to add `.visible` class on intersection.

## Todo List

- [ ] Create agents.ts data file with all 7 agent metadata
- [ ] Create problem-section.astro with 4 pain point cards
- [ ] Create solution-section.astro with 7 agent mini-cards
- [ ] Create consolidation-section.astro with comparison table
- [ ] Create how-it-works-section.astro with 3-step flow
- [ ] Add savings callout to consolidation section
- [ ] Add mid-page CTA after How It Works
- [ ] Test mobile layout for all 4 sections
- [ ] Test consolidation table readability on mobile (scroll or stack)
- [ ] Add alternating section backgrounds (white / slate-50)
- [ ] Verify all section `id` attributes match nav links

## Success Criteria

- Pain points resonate (4 cards visible, scannable)
- Agent grid shows all 7 agents with clear role descriptions
- Consolidation table clearly shows what each agent replaces
- 3-step flow is immediately understandable
- Savings callout is prominent and credible
- All sections render correctly on mobile (375px)
- Section backgrounds alternate for visual rhythm

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Consolidation table too wide on mobile | Medium | Horizontal scroll wrapper or stack rows vertically |
| Agent descriptions too long for cards | Low | Keep to one short sentence per card |
| Savings claim feels unsubstantiated | Medium | Add footnote: "Based on average app subscription costs" |

## Security Considerations

- No user input in these sections
- External links (App Store) open in same tab

## Next Steps

- Phase 06: Agent Showcase + Trust Progression
