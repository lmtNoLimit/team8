---
phase: 04
title: "Hero Section"
status: pending
effort: 4h
depends_on: [03]
---

# Phase 04 — Hero Section

## Context Links

- [Plan Overview](./plan.md)
- [SaaS Best Practices: Hero Section Deep Dive](../reports/researcher-1-260306-landing-page-saas-best-practices.md)
- [Competitor Analysis: Headline Patterns](../reports/researcher-2-260306-landing-page-competitor-analysis.md)

## Overview

- **Priority:** P1 (first impression, highest conversion impact)
- **Status:** pending
- **Description:** Build the hero section with primary headline, supporting copy, dual CTAs, product screenshot/visual, and floating sticky CTA that appears on scroll.

## Key Insights

- Hero must communicate value in 3-5 seconds (research finding)
- Outcome-focused headline > feature-list headline (7-12 words optimal)
- Primary CTA below headline, not buried below fold
- Product screenshot/video is mandatory (not generic illustration)
- Floating CTA appears after scrolling past hero for persistent conversion
- Mobile: single-column, CTA full-width, visual below copy

## Requirements

### Functional
- Headline: "Your Shopify store is a 2-person company. You're the boss. We're the operations team."
- Subheading: "7 AI agents run your store 24/7. Replace your fragmented app stack."
- Primary CTA: "Start Free" (orange, links to Shopify App Store install)
- Secondary CTA: "See How It Works" (outline, scrolls to #how-it-works)
- Product visual: Dashboard screenshot or promo image (placeholder initially)
- Floating CTA: Sticky bar appears when hero scrolls out of viewport
- Social proof line below CTAs: "Join 2,500+ solo merchants" (or similar)

### Non-Functional
- LCP candidate: hero headline or product image — must render in < 1s
- Hero height: 100vh on mobile, ~80vh on desktop (not full viewport on desktop)
- No layout shift from image loading (explicit width/height on `<img>`)
- Floating CTA z-index below nav, above content

## Architecture

```
src/
  components/
    sections/
      hero-section.astro         # Full hero with responsive layout
    ui/
      floating-cta.astro         # Sticky CTA bar (Alpine.js show/hide)
  assets/
    images/
      hero-dashboard.png         # Product screenshot (placeholder)
```

## Related Code Files

### Create
- `src/components/sections/hero-section.astro`
- `src/components/ui/floating-cta.astro`
- `src/assets/images/hero-dashboard.png` (placeholder)

### Reference
- `src/components/ui/cta-button.astro` (from Phase 02)
- `src/styles/globals.css` (btn-primary, btn-secondary classes)

## Implementation Steps

1. **Create hero-section.astro**
   ```astro
   ---
   import CtaButton from '../ui/cta-button.astro';
   ---
   <section id="hero" class="relative overflow-hidden bg-gradient-to-b from-brand-light to-white">
     <!-- Top padding for fixed nav -->
     <div class="section-container pt-24 md:pt-32 pb-16 md:pb-24">
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

         <!-- Copy column -->
         <div class="max-w-xl">
           <p class="overline mb-4">AI Operations for Shopify</p>

           <h1 class="text-4xl md:text-5xl xl:text-6xl font-bold text-navy leading-tight mb-6">
             Your store is a 2-person company.
             <span class="text-brand">You're the boss. We're the operations team.</span>
           </h1>

           <p class="text-lg md:text-xl text-navy-light mb-8 leading-relaxed">
             7 AI agents monitor your store 24/7 — catching issues, optimizing content,
             and handling operations before they hurt revenue. Replace your fragmented app stack.
           </p>

           <!-- Dual CTAs -->
           <div class="flex flex-col sm:flex-row gap-4 mb-8">
             <CtaButton href="https://apps.shopify.com/storekeeper" variant="primary" size="lg">
               Start Free
             </CtaButton>
             <CtaButton href="#how-it-works" variant="secondary" size="lg">
               See How It Works
             </CtaButton>
           </div>

           <!-- Social proof line -->
           <div class="flex items-center gap-3 text-sm text-navy-light">
             <div class="flex -space-x-2">
               <!-- Avatar placeholders (3 circles) -->
               <div class="w-8 h-8 rounded-full bg-brand/20 border-2 border-white"></div>
               <div class="w-8 h-8 rounded-full bg-brand/30 border-2 border-white"></div>
               <div class="w-8 h-8 rounded-full bg-brand/40 border-2 border-white"></div>
             </div>
             <span>Trusted by <strong>2,500+</strong> solo merchants</span>
           </div>
         </div>

         <!-- Visual column -->
         <div class="relative">
           <div class="rounded-xl shadow-2xl overflow-hidden border border-slate-200">
             <img
               src="/images/hero-dashboard.png"
               alt="Storekeeper dashboard showing AI agent findings and daily briefing"
               width="1200"
               height="800"
               class="w-full h-auto"
               loading="eager"
               fetchpriority="high"
             />
           </div>
           <!-- Decorative gradient blob behind image -->
           <div class="absolute -z-10 -top-8 -right-8 w-72 h-72
             bg-brand/10 rounded-full blur-3xl"></div>
         </div>
       </div>
     </div>
   </section>
   ```

2. **Create floating-cta.astro** — appears when hero scrolls out of view
   ```astro
   <div
     x-data="{ visible: false }"
     x-init="
       const hero = document.getElementById('hero');
       const observer = new IntersectionObserver(
         ([entry]) => visible = !entry.isIntersecting,
         { threshold: 0 }
       );
       observer.observe(hero);
     "
     x-show="visible"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="translate-y-full opacity-0"
     x-transition:enter-end="translate-y-0 opacity-100"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="translate-y-0 opacity-100"
     x-transition:leave-end="translate-y-full opacity-0"
     x-cloak
     class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur
       border-t border-slate-200 shadow-lg"
   >
     <div class="section-container py-3 flex items-center justify-between">
       <p class="hidden sm:block text-sm font-medium text-navy">
         Replace your app stack with AI agents
       </p>
       <a href="https://apps.shopify.com/storekeeper"
         class="btn-primary text-sm px-5 py-2 w-full sm:w-auto text-center">
         Start Free
       </a>
     </div>
   </div>
   ```

3. **Add floating CTA to base layout** — import after `<Footer />`

4. **Prepare placeholder product image**
   - Create `public/images/hero-dashboard.png` — screenshot of actual Storekeeper dashboard
   - Size: 1200x800px, optimized (< 200KB)
   - Alt text describes dashboard content for accessibility
   - If no screenshot available yet, use a styled placeholder with descriptive text

5. **Mobile-specific adjustments**
   - Stack copy above image (grid `grid-cols-1`)
   - CTAs full-width on mobile (`flex-col` on small screens)
   - Reduce heading size: `text-4xl` on mobile vs `text-6xl` on xl
   - Hero padding: `pt-24` (room for fixed nav)

6. **Performance optimization**
   - Hero image: `loading="eager"` + `fetchpriority="high"` (LCP candidate)
   - Use `<picture>` with AVIF/WebP sources if Astro Image integration available
   - Preload hero image in `<head>` via base-layout slot:
     ```html
     <link rel="preload" as="image" href="/images/hero-dashboard.png" />
     ```

7. **Scroll-margin for anchored sections**
   Add to globals.css:
   ```css
   section[id] {
     scroll-margin-top: 5rem; /* 80px for fixed nav */
   }
   ```

## Todo List

- [ ] Create hero-section.astro with headline, subheading, CTAs
- [ ] Add product screenshot placeholder (or real dashboard image)
- [ ] Style responsive layout: copy left, image right on lg+
- [ ] Add social proof line with avatar placeholders
- [ ] Create floating-cta.astro with IntersectionObserver
- [ ] Add floating CTA to base layout
- [ ] Add scroll-margin-top to section anchors
- [ ] Preload hero image in head
- [ ] Test mobile layout: stacked columns, full-width CTAs
- [ ] Test floating CTA appears/disappears on scroll
- [ ] Verify LCP < 1.5s with hero image
- [ ] Verify no CLS from hero image loading

## Success Criteria

- Headline readable in < 3 seconds
- Both CTAs visible above fold on desktop (1280px)
- CTAs visible without scrolling on mobile (375px, after headline)
- Product image loads without layout shift
- Floating CTA slides up when hero leaves viewport
- Floating CTA slides down when scrolling back to hero
- LCP metric < 1.5 seconds
- No CLS from image or floating CTA

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| No product screenshot available | High | Create styled placeholder with mock data |
| Hero image too large (slow LCP) | High | Compress to < 200KB, use AVIF/WebP |
| Floating CTA annoying on mobile | Medium | Compact design, easy dismiss (scroll up) |
| Headline too long for mobile | Medium | Line breaks at natural points, smaller font |

## Security Considerations

- External CTA link (Shopify App Store) opens in same tab (intended flow)
- No user input in hero section

## Next Steps

- Phase 05: Problem + Solution Sections
