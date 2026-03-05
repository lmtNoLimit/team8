---
phase: 08
title: "FAQ + Final CTA + Footer"
status: pending
effort: 3h
depends_on: [03]
---

# Phase 08 — FAQ + Final CTA + Footer

## Context Links

- [Plan Overview](./plan.md)
- [SaaS Best Practices: Objection Handling](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis: Tidio Trust Pattern](../reports/researcher-2-260306-landing-page-competitor-analysis.md)

## Overview

- **Priority:** P2
- **Status:** pending
- **Description:** Build the FAQ accordion (AI trust objection handling), final conversion CTA section, and finalize the footer with legal/contact links.

## Key Insights

- Tidio: directly acknowledge AI skepticism in messaging (rare, highly effective)
- FAQ should address top 6-8 objections merchants have about AI autonomy
- Final CTA repeats primary action with trust reinforcement
- "No credit card required. Cancel anytime." removes final friction
- FAQ accordion: Alpine.js toggle, one open at a time
- Footer already scaffolded in Phase 03; finalize here

## Requirements

### Functional

**FAQ Section:**
- Headline: "Common questions"
- 8 FAQ items with accordion behavior (Alpine.js)
- Only one item open at a time
- Questions address: AI trust, setup time, data safety, cost, cancellation, compatibility
- Direct, concise answers (2-3 sentences max)

**Final CTA Section:**
- Headline: "Ready to replace your app stack?"
- Subheading reinforcing value prop
- Dual CTAs: "Start Free" + "See Pricing"
- Trust badges: "No credit card" + "Cancel anytime" + "2-minute setup"
- Subtle gradient background for visual emphasis

**Footer (finalize):**
- Already created in Phase 03
- Add social media links if available
- Add Shopify App Store badge/link
- Verify all legal page links work (placeholder pages for Privacy, Terms, Security)

### Non-Functional
- FAQ accordion smooth transition (Alpine.js `x-collapse` or height animation)
- Final CTA should feel like a "closing" — distinct from mid-page CTAs
- Accessible: FAQ items use `<details>/<summary>` or proper ARIA roles

## Architecture

```
src/
  components/
    sections/
      faq-section.astro
      final-cta-section.astro
    ui/
      faq-item.astro
  data/
    faq.ts
```

## Related Code Files

### Create
- `src/components/sections/faq-section.astro`
- `src/components/sections/final-cta-section.astro`
- `src/components/ui/faq-item.astro`
- `src/data/faq.ts`

### Modify
- `src/components/ui/footer.astro` (finalize from Phase 03)

## Implementation Steps

1. **Create faq.ts data file**
   ```ts
   export interface FaqItem {
     question: string;
     answer: string;
   }

   export const faqs: FaqItem[] = [
     {
       question: "Will the AI mess up my store?",
       answer: "Start in Advisor mode — agents only show suggestions, never take action without your approval. You control when to graduate to Assistant or Autopilot. Every action is logged and reversible.",
     },
     {
       question: "How long does setup take?",
       answer: "About 2 minutes. Install from the Shopify App Store, pick your agents, choose a trust level, and your first agent run starts immediately. No data migration or API configuration needed.",
     },
     {
       question: "Is my store data safe?",
       answer: "Your data is encrypted in transit and at rest. We never train our AI models on your store data. We follow GDPR and CCPA guidelines. Only the agents you activate access the data they need.",
     },
     {
       question: "What happens if I cancel?",
       answer: "You can cancel anytime from your Shopify admin. Your agents stop running, but your findings history remains accessible. Downgrade to the Free tier to keep basic monitoring.",
     },
     {
       question: "How is this different from Shopify Magic?",
       answer: "Shopify Magic provides general AI assistance. Storekeeper deploys specialized agents — each focused on one area (inventory, reviews, SEO, etc.) running 24/7 with configurable autonomy. It's an operations team, not a chatbot.",
     },
     {
       question: "Can I use Storekeeper with my existing apps?",
       answer: "Yes. Storekeeper reads your store data through Shopify's API and doesn't conflict with other apps. Over time, you may find you can replace some of them as agents cover those functions.",
     },
     {
       question: "What if an agent finds too many issues?",
       answer: "Agents prioritize findings by severity. Critical issues surface first. You can adjust agent sensitivity, pause agents, or switch to Advisor mode if you want to review more carefully.",
     },
     {
       question: "Do I need a paid plan to try it?",
       answer: "No. The Free tier gives you 2 agents with 2 runs per week — enough to see value before upgrading. Paid plans include a 14-day free trial with no credit card required.",
     },
   ];
   ```

2. **Create faq-section.astro**
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';
   import { faqs } from '../../data/faq';
   ---
   <section id="faq" class="section-padding bg-white">
     <div class="section-container max-w-3xl">
       <SectionHeading
         overline="FAQ"
         title="Common questions"
         subtitle="Everything you need to know about Storekeeper."
       />

       <div x-data="{ openIndex: null }" class="mt-12 space-y-3">
         {faqs.map((faq, i) => (
           <div class="border border-slate-200 rounded-lg overflow-hidden">
             <button
               @click={`openIndex = openIndex === ${i} ? null : ${i}`}
               class="w-full flex items-center justify-between p-4 text-left
                 hover:bg-slate-50 transition-colors"
               :aria-expanded={`openIndex === ${i}`}
             >
               <span class="font-medium text-navy pr-4">{faq.question}</span>
               <svg
                 class="w-5 h-5 text-navy-light flex-shrink-0 transition-transform duration-200"
                 :class={`openIndex === ${i} ? 'rotate-180' : ''`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
               >
                 <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
               </svg>
             </button>
             <div
               x-show={`openIndex === ${i}`}
               x-transition:enter="transition ease-out duration-200"
               x-transition:enter-start="opacity-0"
               x-transition:enter-end="opacity-100"
               x-transition:leave="transition ease-in duration-150"
               x-transition:leave-start="opacity-100"
               x-transition:leave-end="opacity-0"
               x-cloak
               class="px-4 pb-4"
             >
               <p class="text-navy-light leading-relaxed">{faq.answer}</p>
             </div>
           </div>
         ))}
       </div>
     </div>
   </section>
   ```

3. **Create final-cta-section.astro**
   ```astro
   ---
   import CtaButton from '../ui/cta-button.astro';
   ---
   <section class="section-padding bg-gradient-to-br from-navy to-slate-800 text-white">
     <div class="section-container text-center max-w-3xl">
       <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
         Ready to replace your app stack?
       </h2>
       <p class="text-lg text-slate-300 mb-8">
         Join thousands of solo merchants running their stores with AI agents.
         Start free, upgrade when you're ready.
       </p>

       <!-- Dual CTAs -->
       <div class="flex flex-col sm:flex-row justify-center gap-4 mb-8">
         <a href="https://apps.shopify.com/storekeeper"
           class="inline-flex items-center justify-center px-8 py-4
             bg-accent hover:bg-accent-dark text-white font-semibold
             rounded-lg transition-colors text-lg">
           Start Free
         </a>
         <a href="#pricing"
           class="inline-flex items-center justify-center px-8 py-4
             bg-white/10 hover:bg-white/20 text-white font-semibold
             border border-white/20 rounded-lg transition-colors text-lg">
           See Pricing
         </a>
       </div>

       <!-- Trust badges -->
       <div class="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
         <div class="flex items-center gap-2">
           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
             <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
           </svg>
           No credit card required
         </div>
         <div class="flex items-center gap-2">
           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
             <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
           </svg>
           Cancel anytime
         </div>
         <div class="flex items-center gap-2">
           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
             <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
           </svg>
           2-minute setup
         </div>
       </div>
     </div>
   </section>
   ```

4. **Finalize footer.astro** (from Phase 03)
   - Add Shopify App Store link/badge if available
   - Add social media links (Twitter/X, LinkedIn) when ready
   - Verify privacy/terms links (create placeholder pages if needed):
     ```bash
     # Placeholder pages
     src/pages/privacy.astro    # "Privacy Policy - Coming soon"
     src/pages/terms.astro      # "Terms of Service - Coming soon"
     ```

5. **FAQ accessibility**
   - Each FAQ item: `role="region"`, `aria-expanded` toggles
   - Keyboard: Enter/Space toggles current item
   - Focus visible indicator on FAQ buttons
   - Screen reader announces expanded/collapsed state

6. **Mobile responsiveness**
   - FAQ: full width, no changes needed (single column)
   - Final CTA: stack buttons vertically on mobile
   - Trust badges: wrap naturally with `flex-wrap`

## Todo List

- [ ] Create faq.ts with 8 FAQ items addressing AI trust objections
- [ ] Create faq-section.astro with Alpine.js accordion
- [ ] Implement single-open behavior (only one FAQ open at a time)
- [ ] Create final-cta-section.astro with dark gradient background
- [ ] Add dual CTAs and trust badges to final CTA
- [ ] Finalize footer with social links and App Store link
- [ ] Create placeholder privacy.astro and terms.astro pages
- [ ] Add ARIA attributes to FAQ accordion
- [ ] Test keyboard navigation through FAQ items
- [ ] Test mobile layout: stacked CTAs, wrapped trust badges
- [ ] Verify chevron rotation animation on FAQ open/close

## Success Criteria

- FAQ accordion opens/closes smoothly (one at a time)
- All 8 FAQ items address real merchant objections
- Final CTA section visually distinct (dark gradient background)
- "Start Free" button prominent, "See Pricing" secondary
- Trust badges visible below CTAs
- Footer links work (or show "Coming soon" placeholder)
- Keyboard navigation works for FAQ
- Mobile layout renders correctly

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| FAQ answers too long | Low | Keep to 2-3 sentences per answer |
| Alpine.js accordion flicker | Low | `x-cloak` + opacity transition |
| Legal pages missing | Medium | Create placeholder pages with "Coming soon" |
| Final CTA competes with floating CTA | Low | Floating CTA hides when final CTA is in viewport |

## Security Considerations

- No user input in FAQ or Final CTA
- Legal pages are static placeholders for v1
- Contact email in footer should use mailto link (no form)

## Next Steps

- Phase 09: SEO + Performance
