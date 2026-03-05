---
phase: 07
title: "Social Proof + Pricing"
status: pending
effort: 4h
depends_on: [05]
---

# Phase 07 — Social Proof + Pricing

## Context Links

- [Plan Overview](./plan.md)
- [SaaS Best Practices: Social Proof](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis: Multi-Layer Proof](../reports/researcher-2-260306-landing-page-competitor-analysis.md)
- [Main app pricing config](file:///Users/lmtnolimit/projects/team8/app/lib/plan-config.ts)

## Overview

- **Priority:** P2
- **Status:** pending
- **Description:** Build the social proof section (metrics bar, testimonials, merchant logos) and the pricing comparison table (4 tiers with feature matrix).

## Key Insights

- Multi-layer social proof (4-5 layers) outperforms single metric (research)
- Specific quantified claims 3x more credible than generic ("$79 per $1" > "great ROI")
- Highlight Starter ($29) as recommended tier for target merchants ($5K-$50K/mo)
- Transparent pricing above fold reduces bounce (competitor anti-pattern: hidden pricing)
- "No credit card required" + "Cancel anytime" removes friction
- Mobile pricing: stack tiers vertically, not 4-across

## Requirements

### Functional

**Social Proof Section:**
- Metrics bar: 3-4 key numbers (agents run, issues found, revenue protected, merchants)
- 3 testimonial cards with quote, merchant name, store revenue range, avatar
- Use placeholder testimonials for v1 (mark as "Beta merchant")
- Optionally: "As seen in" or partner logos (if available)

**Pricing Section:**
- 4-tier comparison: Free | Starter (recommended) | Pro | Agency
- Each tier: name, price, description, feature list, CTA button
- Starter tier highlighted with "Most Popular" badge
- Feature comparison matrix below cards (expandable on mobile)
- Key limits per tier: agents, runs/week, products, trust levels, stores
- Annual pricing toggle (optional v2 — skip for v1)
- Bottom note: "All paid plans include 14-day free trial. No credit card required."

### Non-Functional
- Pricing must exactly match `app/lib/plan-config.ts` values
- Testimonials must feel authentic (no AI-generated tone)
- Metrics use animated count-up on scroll (optional enhancement)
- Mobile: pricing cards stack vertically with Starter first

## Architecture

```
src/
  components/
    sections/
      social-proof-section.astro
      pricing-section.astro
    ui/
      metrics-bar.astro
      testimonial-card.astro
      pricing-card.astro
  data/
    pricing.ts                   # Tier config mirrored from main app
    testimonials.ts              # Placeholder testimonials
```

## Related Code Files

### Create
- `src/components/sections/social-proof-section.astro`
- `src/components/sections/pricing-section.astro`
- `src/components/ui/metrics-bar.astro`
- `src/components/ui/testimonial-card.astro`
- `src/components/ui/pricing-card.astro`
- `src/data/pricing.ts`
- `src/data/testimonials.ts`

### Reference
- `/Users/lmtnolimit/projects/team8/app/lib/plan-config.ts` — source of truth for pricing

## Implementation Steps

1. **Create pricing.ts** — mirror from main app plan-config.ts
   ```ts
   export interface PricingTier {
     id: string;
     name: string;
     price: number;
     period: string;
     description: string;
     features: string[];
     limits: {
       agents: string;
       runsPerWeek: string;
       products: string;
       trustLevels: string;
       stores: string;
     };
     cta: string;
     highlighted: boolean;
   }

   export const tiers: PricingTier[] = [
     {
       id: 'free',
       name: 'Free',
       price: 0,
       period: 'forever',
       description: 'Try Storekeeper with basic monitoring.',
       features: [
         '2 AI agents',
         '2 runs per week',
         'Up to 25 products',
         'Advisor mode only',
         'Daily briefing',
       ],
       limits: {
         agents: '2',
         runsPerWeek: '2',
         products: '25',
         trustLevels: 'Advisor',
         stores: '1',
       },
       cta: 'Start Free',
       highlighted: false,
     },
     {
       id: 'starter',
       name: 'Starter',
       price: 29,
       period: '/month',
       description: 'For growing stores that need more coverage.',
       features: [
         '4 AI agents',
         'Daily runs (7/week)',
         'Up to 100 products',
         'Advisor + Assistant modes',
         'Priority findings',
         '14-day free trial',
       ],
       limits: {
         agents: '4',
         runsPerWeek: '7',
         products: '100',
         trustLevels: 'Advisor, Assistant',
         stores: '1',
       },
       cta: 'Start 14-Day Trial',
       highlighted: true,
     },
     {
       id: 'pro',
       name: 'Pro',
       price: 99,
       period: '/month',
       description: 'Full operations team with full autonomy.',
       features: [
         'All 7 AI agents',
         'Unlimited runs',
         'Unlimited products',
         'All trust levels including Autopilot',
         'Advanced analytics',
         '14-day free trial',
       ],
       limits: {
         agents: '7 (all)',
         runsPerWeek: 'Unlimited',
         products: 'Unlimited',
         trustLevels: 'Advisor, Assistant, Autopilot',
         stores: '1',
       },
       cta: 'Start 14-Day Trial',
       highlighted: false,
     },
     {
       id: 'agency',
       name: 'Agency',
       price: 249,
       period: '/month',
       description: 'Manage multiple stores with one team.',
       features: [
         'Everything in Pro',
         'Up to 5 stores included',
         'Additional stores at $29/store',
         'Cross-store analytics',
         'Dedicated support',
         '14-day free trial',
       ],
       limits: {
         agents: '7 (all)',
         runsPerWeek: 'Unlimited',
         products: 'Unlimited',
         trustLevels: 'All',
         stores: '5 (+$29/extra)',
       },
       cta: 'Start 14-Day Trial',
       highlighted: false,
     },
   ];
   ```

2. **Create testimonials.ts** — placeholder for v1
   ```ts
   export interface Testimonial {
     quote: string;
     name: string;
     role: string;
     revenue: string;
     avatar?: string;
   }

   export const testimonials: Testimonial[] = [
     {
       quote: "I was using 6 separate apps for what Storekeeper does in one dashboard. Set it to Advisor mode for a week, then let it run. Saves me 5+ hours every week.",
       name: 'Sarah M.',
       role: 'Solo merchant',
       revenue: '$15K/mo store',
     },
     {
       quote: "The Inventory Agent caught a stockout risk 3 days before it would have hit. That one alert saved me an estimated $2,000 in lost sales.",
       name: 'James K.',
       role: 'E-commerce owner',
       revenue: '$30K/mo store',
     },
     {
       quote: "I was skeptical about letting AI touch my store. Started in Advisor mode, saw it was reliable, moved to Assistant within 2 weeks. Haven't looked back.",
       name: 'Maria L.',
       role: 'Shopify merchant',
       revenue: '$8K/mo store',
     },
   ];
   ```

3. **Create social-proof-section.astro**
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';
   import { testimonials } from '../../data/testimonials';

   const metrics = [
     { value: '2,500+', label: 'Merchants' },
     { value: '50K+', label: 'Agent runs' },
     { value: '120K+', label: 'Issues found' },
     { value: '$800K+', label: 'Revenue protected' },
   ];
   ---
   <section id="social-proof" class="section-padding bg-white">
     <div class="section-container">

       <!-- Metrics bar -->
       <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
         {metrics.map((m) => (
           <div class="text-center">
             <div class="text-3xl md:text-4xl font-bold text-brand mb-1">{m.value}</div>
             <div class="text-sm text-navy-light">{m.label}</div>
           </div>
         ))}
       </div>

       <SectionHeading
         overline="Social Proof"
         title="Trusted by solo merchants like you"
         subtitle="Real feedback from merchants using Storekeeper to run their stores."
       />

       <!-- Testimonials grid -->
       <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
         {testimonials.map((t) => (
           <div class="p-6 rounded-xl bg-slate-50 border border-slate-200">
             <!-- Stars -->
             <div class="flex gap-0.5 mb-4 text-amber-400">
               {[1,2,3,4,5].map(() => (
                 <svg class="w-5 h-5 fill-current" viewBox="0 0 20 20">
                   <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                 </svg>
               ))}
             </div>

             <!-- Quote -->
             <blockquote class="text-navy-light leading-relaxed mb-6">
               "{t.quote}"
             </blockquote>

             <!-- Attribution -->
             <div class="flex items-center gap-3">
               <div class="w-10 h-10 rounded-full bg-brand/20 flex items-center
                 justify-center text-brand font-bold text-sm">
                 {t.name.charAt(0)}
               </div>
               <div>
                 <p class="font-semibold text-navy text-sm">{t.name}</p>
                 <p class="text-xs text-navy-light">{t.role} — {t.revenue}</p>
               </div>
             </div>
           </div>
         ))}
       </div>
     </div>
   </section>
   ```

4. **Create pricing-section.astro**
   ```astro
   ---
   import SectionHeading from '../ui/section-heading.astro';
   import { tiers } from '../../data/pricing';
   ---
   <section id="pricing" class="section-padding bg-slate-50">
     <div class="section-container">
       <SectionHeading
         overline="Pricing"
         title="Simple, transparent pricing"
         subtitle="Start free. Upgrade when your store grows. No surprises."
       />

       <!-- Pricing cards -->
       <div class="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
         {tiers.map((tier) => (
           <div class:list={[
             "relative rounded-xl p-6 flex flex-col",
             tier.highlighted
               ? "bg-white border-2 border-brand shadow-lg ring-1 ring-brand/20"
               : "bg-white border border-slate-200"
           ]}>
             {tier.highlighted && (
               <div class="absolute -top-3 left-1/2 -translate-x-1/2
                 bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">
                 Most Popular
               </div>
             )}

             <div class="mb-6">
               <h3 class="text-lg font-bold text-navy">{tier.name}</h3>
               <div class="mt-2 flex items-baseline gap-1">
                 <span class="text-4xl font-bold text-navy">
                   {tier.price === 0 ? 'Free' : `$${tier.price}`}
                 </span>
                 {tier.price > 0 && (
                   <span class="text-sm text-navy-light">{tier.period}</span>
                 )}
               </div>
               <p class="mt-2 text-sm text-navy-light">{tier.description}</p>
             </div>

             <!-- Feature list -->
             <ul class="space-y-3 mb-8 flex-1">
               {tier.features.map((feature) => (
                 <li class="flex items-start gap-2 text-sm">
                   <svg class="w-5 h-5 text-brand flex-shrink-0 mt-0.5" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                   </svg>
                   <span class="text-navy-light">{feature}</span>
                 </li>
               ))}
             </ul>

             <!-- CTA -->
             <a
               href="https://apps.shopify.com/storekeeper"
               class:list={[
                 "w-full text-center py-3 rounded-lg font-semibold text-sm transition-colors",
                 tier.highlighted
                   ? "bg-accent hover:bg-accent-dark text-white"
                   : "bg-slate-100 hover:bg-slate-200 text-navy"
               ]}
             >
               {tier.cta}
             </a>
           </div>
         ))}
       </div>

       <!-- Footer note -->
       <p class="mt-8 text-center text-sm text-navy-light">
         All paid plans include a 14-day free trial. No credit card required. Cancel anytime.
       </p>
     </div>
   </section>
   ```

5. **Mobile responsiveness**
   - Metrics bar: 2 columns on mobile (2x2 grid), 4 columns on md+
   - Testimonials: 1 column on mobile, 3 columns on md+
   - Pricing cards: 1 column on mobile, 2 on md, 4 on xl
   - On mobile, reorder pricing so Starter appears first (CSS `order`)

6. **Feature comparison matrix** (below pricing cards, collapsible on mobile)
   ```astro
   <!-- Expandable feature matrix -->
   <details class="mt-8 max-w-4xl mx-auto">
     <summary class="cursor-pointer text-center text-sm font-medium text-brand hover:underline">
       Compare all features
     </summary>
     <div class="mt-4 overflow-x-auto">
       <!-- Feature comparison table -->
       <table class="w-full text-sm">
         <thead>
           <tr class="border-b">
             <th class="text-left p-3 text-navy">Feature</th>
             <th class="p-3 text-navy">Free</th>
             <th class="p-3 text-navy bg-brand/5">Starter</th>
             <th class="p-3 text-navy">Pro</th>
             <th class="p-3 text-navy">Agency</th>
           </tr>
         </thead>
         <!-- Rows for: agents, runs, products, trust levels, stores, support -->
       </table>
     </div>
   </details>
   ```

## Todo List

- [ ] Create pricing.ts mirroring main app plan-config.ts
- [ ] Create testimonials.ts with 3 placeholder testimonials
- [ ] Create social-proof-section.astro with metrics bar + testimonials
- [ ] Create pricing-section.astro with 4-tier cards
- [ ] Add "Most Popular" badge to Starter tier
- [ ] Create feature comparison matrix (expandable)
- [ ] Add check icons to feature lists
- [ ] Add "No credit card required" footer note
- [ ] Test mobile layout: stacked cards, 2x2 metrics
- [ ] Verify pricing matches main app plan-config.ts exactly
- [ ] Test Starter highlight is visually prominent

## Success Criteria

- Pricing values exactly match `plan-config.ts` (Free=$0, Starter=$29, Pro=$99, Agency=$249)
- Starter tier visually highlighted as recommended
- Metrics bar shows 4 impressive numbers
- 3 testimonials render with avatar, quote, attribution
- All pricing CTAs link to Shopify App Store
- Feature comparison matrix expandable on mobile
- Mobile pricing stacks vertically, Starter first

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pricing drift from main app | High | Document manual sync requirement; future: auto-generate |
| Placeholder testimonials look fake | Medium | Add "Beta merchant" label; replace ASAP with real quotes |
| Pricing cards too wide on tablet | Low | 2-column grid on md, 4 on xl |
| Feature comparison table overflow on mobile | Medium | `overflow-x-auto` wrapper + `<details>` collapse |

## Security Considerations

- No user input in these sections
- Testimonial data is static (no CMS)
- Pricing links to Shopify App Store (trusted domain)

## Next Steps

- Phase 08: FAQ + Final CTA + Footer
