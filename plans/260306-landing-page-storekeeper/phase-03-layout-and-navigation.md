---
phase: 03
title: "Layout & Navigation"
status: pending
effort: 3h
depends_on: [02]
---

# Phase 03 — Layout & Navigation

## Context Links

- [Plan Overview](./plan.md)
- [Phase 02: Design System](./phase-02-design-system.md)

## Overview

- **Priority:** P1 (blocker for content sections)
- **Status:** pending
- **Description:** Build the base HTML layout, responsive navigation bar with scroll-linked highlights, site footer, and foundational SEO meta tags. These wrap all page content.

## Key Insights

- Single-page layout — all sections on `index.astro`, nav links scroll to anchors
- Sticky nav appears after scrolling past hero (transparent over hero, solid background after)
- Mobile hamburger menu with Alpine.js toggle
- Footer is compact: legal links, social, contact
- SEO meta in base layout, page-specific overrides via props

## Requirements

### Functional
- Nav bar with logo + 5 anchor links: Features, How It Works, Pricing, FAQ, CTA button
- Nav transparent over hero, white bg with shadow after scroll (Alpine.js `x-data`)
- Mobile: hamburger icon toggles slide-down menu (Alpine.js)
- Footer: 3-column layout (Brand + tagline | Links | Legal)
- Base layout accepts `title`, `description`, `ogImage` props for SEO
- Skip-to-content link for accessibility
- Smooth scroll to sections via `scroll-behavior: smooth`

### Non-Functional
- Nav z-index above all content
- No CLS from nav height changes (fixed height: 64px mobile, 72px desktop)
- Footer renders correctly on all breakpoints
- Semantic HTML: `<header>`, `<main>`, `<footer>`, `<nav>`

## Architecture

```
src/
  layouts/
    base-layout.astro          # HTML shell: head, meta, fonts, scripts
  components/
    ui/
      nav-bar.astro            # Sticky nav with scroll detection
      footer.astro             # Site footer
      mobile-menu.astro        # Mobile slide-down menu (Alpine.js island)
  pages/
    index.astro                # Imports layout + all sections
```

## Related Code Files

### Create
- `src/layouts/base-layout.astro`
- `src/components/ui/nav-bar.astro`
- `src/components/ui/footer.astro`
- `src/components/ui/mobile-menu.astro`

### Modify
- `src/pages/index.astro` — wrap in base layout, add all section stubs

## Implementation Steps

1. **Create base-layout.astro**
   ```astro
   ---
   interface Props {
     title?: string;
     description?: string;
     ogImage?: string;
   }
   const {
     title = 'Storekeeper — AI Operations Team for Your Shopify Store',
     description = '7 AI agents monitor your store 24/7. Replace your fragmented app stack with one operations team.',
     ogImage = '/og-image.png',
   } = Astro.props;
   const canonicalURL = new URL(Astro.url.pathname, Astro.site);
   ---
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1" />
       <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
       <link rel="canonical" href={canonicalURL} />

       <title>{title}</title>
       <meta name="description" content={description} />

       <!-- Open Graph -->
       <meta property="og:type" content="website" />
       <meta property="og:title" content={title} />
       <meta property="og:description" content={description} />
       <meta property="og:image" content={ogImage} />
       <meta property="og:url" content={canonicalURL} />

       <!-- Twitter -->
       <meta name="twitter:card" content="summary_large_image" />
       <meta name="twitter:title" content={title} />
       <meta name="twitter:description" content={description} />
       <meta name="twitter:image" content={ogImage} />

       <slot name="head" />
     </head>
     <body class="min-h-screen flex flex-col">
       <a href="#main" class="sr-only focus:not-sr-only focus:absolute
         focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2
         focus:bg-brand focus:text-white focus:rounded">
         Skip to content
       </a>

       <NavBar />

       <main id="main" class="flex-1">
         <slot />
       </main>

       <Footer />
     </body>
   </html>
   ```

2. **Create nav-bar.astro** — sticky nav with scroll detection
   ```astro
   ---
   const navLinks = [
     { label: 'Features', href: '#features' },
     { label: 'How It Works', href: '#how-it-works' },
     { label: 'Pricing', href: '#pricing' },
     { label: 'FAQ', href: '#faq' },
   ];
   ---
   <header
     x-data="{ scrolled: false, mobileOpen: false }"
     x-init="window.addEventListener('scroll', () => scrolled = window.scrollY > 80)"
     :class="scrolled ? 'bg-white/95 backdrop-blur shadow-sm' : 'bg-transparent'"
     class="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
   >
     <nav class="section-container flex items-center justify-between h-16 md:h-18">
       <!-- Logo -->
       <a href="/" class="flex items-center gap-2">
         <img src="/favicon.svg" alt="" class="h-8 w-8" />
         <span class="font-bold text-xl text-navy">Storekeeper</span>
       </a>

       <!-- Desktop nav links -->
       <div class="hidden md:flex items-center gap-8">
         {navLinks.map(link => (
           <a href={link.href} class="text-sm font-medium text-navy-light
             hover:text-brand transition-colors">{link.label}</a>
         ))}
         <a href="#pricing" class="btn-primary text-sm px-4 py-2">
           Start Free
         </a>
       </div>

       <!-- Mobile hamburger -->
       <button
         @click="mobileOpen = !mobileOpen"
         class="md:hidden p-2 text-navy"
         aria-label="Toggle menu"
       >
         <!-- Hamburger/X icon via Alpine toggle -->
         <svg x-show="!mobileOpen" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
         </svg>
         <svg x-show="mobileOpen" x-cloak class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
         </svg>
       </button>
     </nav>

     <!-- Mobile menu dropdown -->
     <div
       x-show="mobileOpen"
       x-transition:enter="transition ease-out duration-200"
       x-transition:enter-start="opacity-0 -translate-y-2"
       x-transition:enter-end="opacity-100 translate-y-0"
       x-transition:leave="transition ease-in duration-150"
       x-transition:leave-start="opacity-100 translate-y-0"
       x-transition:leave-end="opacity-0 -translate-y-2"
       x-cloak
       class="md:hidden bg-white border-t border-slate-100 shadow-lg"
     >
       <div class="section-container py-4 space-y-3">
         {navLinks.map(link => (
           <a href={link.href} @click="mobileOpen = false"
             class="block py-2 text-base font-medium text-navy-light hover:text-brand">
             {link.label}
           </a>
         ))}
         <a href="#pricing" @click="mobileOpen = false"
           class="btn-primary w-full text-center mt-2">
           Start Free
         </a>
       </div>
     </div>
   </header>
   ```

3. **Create footer.astro**
   ```astro
   ---
   const currentYear = new Date().getFullYear();
   const footerLinks = {
     product: [
       { label: 'Features', href: '#features' },
       { label: 'Pricing', href: '#pricing' },
       { label: 'FAQ', href: '#faq' },
     ],
     legal: [
       { label: 'Privacy Policy', href: '/privacy' },
       { label: 'Terms of Service', href: '/terms' },
       { label: 'Security', href: '/security' },
     ],
   };
   ---
   <footer class="bg-navy text-slate-300">
     <div class="section-container py-12 md:py-16">
       <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
         <!-- Brand -->
         <div>
           <div class="flex items-center gap-2 mb-4">
             <img src="/favicon.svg" alt="" class="h-8 w-8" />
             <span class="font-bold text-xl text-white">Storekeeper</span>
           </div>
           <p class="text-sm text-slate-400 max-w-xs">
             Your AI operations team for Shopify. 7 agents. One dashboard. 24/7.
           </p>
         </div>

         <!-- Product links -->
         <div>
           <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
           <ul class="space-y-2">
             {footerLinks.product.map(link => (
               <li><a href={link.href} class="text-sm hover:text-white transition-colors">{link.label}</a></li>
             ))}
           </ul>
         </div>

         <!-- Legal links -->
         <div>
           <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
           <ul class="space-y-2">
             {footerLinks.legal.map(link => (
               <li><a href={link.href} class="text-sm hover:text-white transition-colors">{link.label}</a></li>
             ))}
           </ul>
         </div>
       </div>

       <!-- Bottom bar -->
       <div class="mt-12 pt-8 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
         <p class="text-sm text-slate-400">&copy; {currentYear} Storekeeper. All rights reserved.</p>
         <div class="flex gap-4">
           <a href="mailto:support@storekeeper.app" class="text-sm hover:text-white transition-colors">
             support@storekeeper.app
           </a>
         </div>
       </div>
     </div>
   </footer>
   ```

4. **Update index.astro** — compose layout + section stubs
   ```astro
   ---
   import BaseLayout from '../layouts/base-layout.astro';
   import HeroSection from '../components/sections/hero-section.astro';
   import ProblemSection from '../components/sections/problem-section.astro';
   // ... all section imports
   ---
   <BaseLayout>
     <HeroSection />
     <ProblemSection />
     <SolutionSection />
     <ConsolidationSection />
     <HowItWorksSection />
     <TrustProgressionSection />
     <AgentShowcaseSection />
     <SocialProofSection />
     <PricingSection />
     <FaqSection />
     <FinalCtaSection />
   </BaseLayout>
   ```

5. **Add `x-cloak` CSS** to globals.css to hide Alpine elements before init
   ```css
   [x-cloak] { display: none !important; }
   ```

6. **Test scroll behavior**
   - Clicking nav links scrolls smoothly to section anchors
   - Nav background transitions from transparent → white on scroll
   - Mobile menu opens/closes with animation
   - All links close mobile menu on click

## Todo List

- [ ] Create base-layout.astro with HTML shell, meta tags, slots
- [ ] Create nav-bar.astro with scroll detection (Alpine.js)
- [ ] Create mobile menu with slide-down animation
- [ ] Create footer.astro with 3-column layout
- [ ] Update index.astro to use base layout
- [ ] Add `[x-cloak]` CSS rule to globals.css
- [ ] Add skip-to-content link for accessibility
- [ ] Test smooth scroll to all section anchors
- [ ] Test nav transparency→solid transition on scroll
- [ ] Test mobile menu at 375px width
- [ ] Verify no CLS from nav height changes
- [ ] Test footer layout on mobile/tablet/desktop

## Success Criteria

- Nav renders correctly at all breakpoints (375px, 768px, 1280px)
- Scroll detection toggles nav background (transparent → white)
- Mobile menu opens/closes without jank
- All anchor links scroll to correct sections
- Footer renders 3-column on desktop, stacked on mobile
- Skip-to-content link visible on keyboard focus
- No CLS from nav or layout changes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Alpine.js not hydrating (SSR issue) | High | Use `client:load` directive on Alpine components |
| Nav covers content when scrolling to anchor | Medium | Add `scroll-margin-top: 80px` to sections |
| Mobile menu flicker on page load | Low | `x-cloak` + `[x-cloak] { display: none }` |

## Security Considerations

- External links use `rel="noopener noreferrer"` and `target="_blank"`
- No user input processing in nav or footer

## Next Steps

- Phase 04: Hero Section (headline, CTA, product visual, floating CTA)
