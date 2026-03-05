---
phase: 06
title: "Agent Showcase + Trust Progression"
status: pending
effort: 5h
depends_on: [05]
---

# Phase 06 — Agent Showcase + Trust Progression

## Context Links

- [Plan Overview](./plan.md)
- [SaaS Best Practices: Progressive Autonomy](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis: AI Trust Patterns](../reports/researcher-2-260306-landing-page-competitor-analysis.md)

## Overview

- **Priority:** P2
- **Status:** pending
- **Description:** Build the Trust Progression section (Advisor/Assistant/Autopilot interactive slider) and Agent Deep Dives section (2-3 featured agents with finding examples). These are key differentiators.

## Key Insights

- Progressive autonomy messaging sells better as "user-controlled escalation" (research)
- Tidio model: acknowledge AI skepticism directly, show guardrails
- "Autonomy is earned through performance, not granted at signup" — powerful trust copy
- Before/after visual proof highest-engagement element across competitors
- Trust slider is an interactive differentiator no competitor has on their landing page
- 2-3 agent deep dives sufficient; too many overwhelms

## Requirements

### Functional

**Trust Progression Section:**
- Headline: "You control how much Storekeeper decides"
- 3-column layout: Advisor | Assistant | Autopilot
- Interactive: clicking each tier highlights it with description + example
- Alpine.js for tab switching (no page reload)
- Each tier shows: name, description, example notification, visual state
- Key copy: "Start safe. Scale when ready. Downgrade anytime."

**Agent Deep Dives Section:**
- Headline: "See your agents in action"
- 2-3 featured agents with detailed showcase
- Each showcase: problem found, agent recommendation, outcome
- Includes mock finding card (styled like actual app UI)
- Before/after visual element for one agent

### Non-Functional
- Trust slider is the primary interactive element — must be smooth
- Finding card mockups should closely match actual Storekeeper UI
- Reduce motion for `prefers-reduced-motion` users
- Mobile: trust tiers stack vertically, deep dives stack vertically

## Architecture

```
src/
  components/
    sections/
      trust-progression-section.astro
      agent-showcase-section.astro
    ui/
      trust-tier-card.astro
      finding-example-card.astro
      agent-deep-dive-card.astro
```

## Related Code Files

### Create
- `src/components/sections/trust-progression-section.astro`
- `src/components/sections/agent-showcase-section.astro`
- `src/components/ui/trust-tier-card.astro`
- `src/components/ui/finding-example-card.astro`
- `src/components/ui/agent-deep-dive-card.astro`

### Reference
- `src/data/agents.ts` (Phase 05)
- Main app trust levels: "advisor", "assistant", "autopilot"
- Main app finding card: `/Users/lmtnolimit/projects/team8/app/components/finding-card.tsx`

## Implementation Steps

1. **Create trust-progression-section.astro** — interactive tier display
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';

   const tiers = [
     {
       id: 'advisor',
       name: 'Advisor',
       tagline: 'See recommendations. You decide.',
       description: 'Agents analyze your store and present findings. You review every suggestion before any action is taken. Perfect for building trust.',
       example: {
         title: '3 products missing alt text',
         action: 'Review suggested fixes',
         badge: 'Suggestion',
       },
       icon: '👁️',
       color: 'sky',
     },
     {
       id: 'assistant',
       name: 'Assistant',
       tagline: 'Handles routine. Asks about edge cases.',
       description: 'Agents auto-fix common issues (typos, missing fields) but ask you about unusual findings. You approve with one click.',
       example: {
         title: 'Fixed 12 broken links automatically',
         action: '1 unusual finding needs review',
         badge: 'Auto-fixed',
       },
       icon: '🤝',
       color: 'brand',
     },
     {
       id: 'autopilot',
       name: 'Autopilot',
       tagline: 'Full operations. You focus on strategy.',
       description: 'Agents run your store operations 24/7. All actions logged and reviewable. You get a daily summary of everything handled.',
       example: {
         title: 'Handled 47 issues this week',
         action: 'View daily summary',
         badge: 'Handled',
       },
       icon: '🚀',
       color: 'emerald',
     },
   ];
   ---
   <section id="trust" class="section-padding bg-white">
     <div class="section-container">
       <SectionHeading
         overline="Trust Levels"
         title="You control how much Storekeeper decides"
         subtitle="Start safe. Scale when ready. Downgrade anytime."
       />

       <!-- Interactive tier selector (Alpine.js) -->
       <div x-data="{ active: 'assistant' }" class="mt-12 max-w-5xl mx-auto">

         <!-- Tier tabs -->
         <div class="flex justify-center gap-2 mb-8">
           {tiers.map((tier) => (
             <button
               @click={`active = '${tier.id}'`}
               :class={`active === '${tier.id}' ? 'bg-brand text-white' : 'bg-slate-100 text-navy-light hover:bg-slate-200'`}
               class="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
             >
               {tier.icon} {tier.name}
             </button>
           ))}
         </div>

         <!-- Tier content panels -->
         {tiers.map((tier) => (
           <div
             x-show={`active === '${tier.id}'`}
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 translate-y-2"
             x-transition:enter-end="opacity-100 translate-y-0"
             class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
           >
             <!-- Description -->
             <div>
               <div class="inline-flex items-center gap-2 mb-4">
                 <span class="text-3xl">{tier.icon}</span>
                 <h3 class="text-2xl font-bold text-navy">{tier.name}</h3>
               </div>
               <p class="text-lg text-brand font-medium mb-3">{tier.tagline}</p>
               <p class="text-navy-light leading-relaxed mb-6">{tier.description}</p>
               <p class="text-sm text-navy-light italic">
                 "Autonomy is earned through performance, not granted at signup."
               </p>
             </div>

             <!-- Example finding card mockup -->
             <div class="bg-slate-50 rounded-xl p-6 border border-slate-200">
               <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                 Example notification
               </div>
               <div class="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                 <div class="flex items-start justify-between mb-2">
                   <span class="text-sm font-semibold text-navy">{tier.example.title}</span>
                   <span class:list={[
                     "text-xs px-2 py-0.5 rounded-full font-medium",
                     tier.id === 'advisor' && "bg-sky-100 text-sky-700",
                     tier.id === 'assistant' && "bg-teal-100 text-teal-700",
                     tier.id === 'autopilot' && "bg-emerald-100 text-emerald-700",
                   ]}>
                     {tier.example.badge}
                   </span>
                 </div>
                 <p class="text-sm text-navy-light">{tier.example.action}</p>
               </div>
               <p class="mt-3 text-xs text-slate-400 text-center">
                 Every action is logged. Review anytime.
               </p>
             </div>
           </div>
         ))}
       </div>
     </div>
   </section>
   ```

2. **Create agent-showcase-section.astro** — 2-3 agent deep dives
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';

   const showcases = [
     {
       agent: 'Storefront Agent',
       icon: '🏪',
       problem: 'Your store has 12 products with missing images, 3 broken links, and 8 pages loading slowly.',
       finding: {
         title: '23 product page issues detected',
         priority: 'High',
         details: [
           '12 products missing alt text (hurting SEO)',
           '3 broken image links returning 404',
           '8 pages exceeding 3s load time',
         ],
       },
       outcome: 'Issues caught before customers see them. Average 15% fewer bounce-backs.',
       visual: 'before-after', // visual type
     },
     {
       agent: 'Inventory Agent',
       icon: '📦',
       problem: 'Two best-sellers will stock out in 5 days. Three items haven\'t sold in 90 days.',
       finding: {
         title: 'Stock alerts: 2 stockout risks, 3 dead inventory',
         priority: 'Critical',
         details: [
           '"Wireless Earbuds Pro" — 8 units left, sells 2/day',
           '"Leather Wallet" — 3 units left, sells 1/day',
           '3 SKUs with zero sales in 90 days (holding $1,200)',
         ],
       },
       outcome: 'Restock in time. Clear dead inventory. Recover $1,200 in tied-up capital.',
       visual: 'chart', // visual type
     },
     {
       agent: 'Review Agent',
       icon: '⭐',
       problem: 'A fake 1-star review appeared 2 hours ago. Three genuine 5-star reviews need public responses.',
       finding: {
         title: '1 suspicious review flagged, 3 need responses',
         priority: 'Medium',
         details: [
           'Review from "user_382891" — no purchase history, generic text, flagged as likely spam',
           '3 verified 5-star reviews awaiting merchant response (avg 4+ days old)',
         ],
       },
       outcome: 'Reputation protected. Engaged customers feel valued. Review response time cut by 80%.',
       visual: 'notification',
     },
   ];
   ---
   <section id="agent-showcase" class="section-padding bg-slate-50">
     <div class="section-container">
       <SectionHeading
         overline="In Action"
         title="See your agents in action"
         subtitle="Real examples of what Storekeeper finds and fixes in your store."
       />

       <div class="mt-12 space-y-16 max-w-5xl mx-auto">
         {showcases.map((s, i) => (
           <div class:list={[
             "grid grid-cols-1 md:grid-cols-2 gap-8 items-start",
             i % 2 !== 0 && "md:[&>*:first-child]:order-2"
           ]}>
             <!-- Problem + Outcome -->
             <div>
               <div class="flex items-center gap-3 mb-4">
                 <span class="text-3xl">{s.icon}</span>
                 <h3 class="text-xl font-bold text-navy">{s.agent}</h3>
               </div>
               <div class="mb-4">
                 <p class="text-sm font-medium text-red-600 mb-1">The problem:</p>
                 <p class="text-navy-light leading-relaxed">{s.problem}</p>
               </div>
               <div>
                 <p class="text-sm font-medium text-brand mb-1">The outcome:</p>
                 <p class="text-navy-light leading-relaxed">{s.outcome}</p>
               </div>
             </div>

             <!-- Finding card mockup -->
             <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div class="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                 <span class="text-sm font-semibold text-navy">{s.finding.title}</span>
                 <span class:list={[
                   "text-xs px-2 py-0.5 rounded-full font-medium",
                   s.finding.priority === 'Critical' && "bg-red-100 text-red-700",
                   s.finding.priority === 'High' && "bg-orange-100 text-orange-700",
                   s.finding.priority === 'Medium' && "bg-yellow-100 text-yellow-700",
                 ]}>
                   {s.finding.priority}
                 </span>
               </div>
               <div class="p-5">
                 <ul class="space-y-2">
                   {s.finding.details.map((detail) => (
                     <li class="flex items-start gap-2 text-sm text-navy-light">
                       <span class="text-brand mt-0.5">-</span>
                       <span>{detail}</span>
                     </li>
                   ))}
                 </ul>
                 <div class="mt-4 flex gap-2">
                   <button class="px-4 py-1.5 bg-brand text-white text-sm font-medium rounded-lg">
                     Apply Fixes
                   </button>
                   <button class="px-4 py-1.5 bg-slate-100 text-navy-light text-sm font-medium rounded-lg">
                     Dismiss
                   </button>
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>
     </div>
   </section>
   ```

3. **Mobile responsiveness**
   - Trust tier tabs: horizontal scroll on mobile if needed, or stack vertically
   - Trust content panels: stack vertically on mobile (description above card)
   - Agent deep dives: stack vertically (finding card below problem text)
   - Alternating layout (odd/even swap) disabled on mobile

4. **Alpine.js interactivity**
   - Trust tier: `x-data="{ active: 'assistant' }"` — default to middle tier
   - Tab buttons change `active` state
   - Content panels use `x-show` with fade transition
   - Ensure `x-cloak` prevents flash of all panels on load

5. **Accessibility**
   - Trust tier tabs: proper `role="tablist"`, `role="tab"`, `aria-selected`
   - Tab panels: `role="tabpanel"`, `aria-labelledby`
   - Finding card buttons: `aria-label` describing action
   - Focus management: tab through tiers with keyboard

## Todo List

- [ ] Create trust-progression-section.astro with 3-tier display
- [ ] Implement Alpine.js tab switching for trust tiers
- [ ] Create example finding card mockups for each trust level
- [ ] Create agent-showcase-section.astro with 3 agent deep dives
- [ ] Create finding card mockup component matching app UI style
- [ ] Implement alternating layout (image swap on odd rows)
- [ ] Add ARIA roles for trust tier tabs
- [ ] Test Alpine.js transitions on mobile
- [ ] Test mobile stacking for both sections
- [ ] Verify `x-cloak` prevents panel flash on load
- [ ] Test keyboard navigation through trust tiers

## Success Criteria

- Trust tier tabs switch smoothly (< 200ms transition)
- Default shows "Assistant" tier (middle ground)
- Each tier shows distinct description + example
- Agent deep dives clearly show problem → finding → outcome flow
- Finding card mockups are visually credible (resemble real app)
- All interactive elements accessible via keyboard
- Sections render correctly on mobile (375px)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Alpine.js tab transition jank | Medium | Simple opacity transition, no complex DOM manipulation |
| Finding card mockups look fake | Medium | Match actual app colors and layout patterns |
| Trust section too complex for mobile | Medium | Simplify to stacked cards, remove tabs on mobile |
| Too many agent showcases (overwhelm) | Low | Limit to 3 max |

## Security Considerations

- Mock buttons in finding cards are non-functional (no form submission)
- No user data collected in these sections

## Next Steps

- Phase 07: Social Proof + Pricing
