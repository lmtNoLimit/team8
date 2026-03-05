---
phase: 01
title: "Project Setup"
status: pending
effort: 2h
---

# Phase 01 — Project Setup

## Context Links

- [Plan Overview](./plan.md)
- [Tech Stack Research](../reports/researcher-3-260306-landing-page-tech-stack.md)

## Overview

- **Priority:** P1 (blocker for all other phases)
- **Status:** pending
- **Description:** Initialize standalone Astro project with Tailwind CSS, configure Vercel deployment, establish folder structure and dev tooling.

## Key Insights

- Astro 5.x with static output mode — zero JS by default, partial hydration for interactive islands
- Tailwind CSS 4.x with JIT compiler — utility-first, no custom CSS files needed
- Alpine.js for client interactivity (trust slider, FAQ accordion, mobile nav toggle)
- Separate git repo from main embedded app (`storekeeper-landing/`)

## Requirements

### Functional
- Astro dev server runs at `localhost:4321`
- Tailwind CSS classes compile correctly
- Alpine.js available for interactive components via Astro integration
- Vercel deploys from `main` branch on push
- Image optimization pipeline works (AVIF/WebP)

### Non-Functional
- Build time < 10 seconds
- Zero runtime JS on static pages (before Alpine islands)
- Node 20+ required

## Architecture

```
storekeeper-landing/
  src/
    layouts/
      base-layout.astro          # HTML shell, meta tags, global styles
    pages/
      index.astro                # Single-page landing (all sections)
    components/
      sections/
        hero-section.astro
        problem-section.astro
        solution-section.astro
        consolidation-section.astro
        how-it-works-section.astro
        trust-progression-section.astro
        agent-showcase-section.astro
        social-proof-section.astro
        pricing-section.astro
        faq-section.astro
        final-cta-section.astro
      ui/
        nav-bar.astro
        footer.astro
        cta-button.astro
        agent-card.astro
        pricing-card.astro
        faq-item.astro
        testimonial-card.astro
        badge.astro
        section-heading.astro
    data/
      agents.ts                  # Agent metadata (name, description, icon, replaces)
      pricing.ts                 # Tier config mirrored from main app
      testimonials.ts            # Testimonial content
      faq.ts                     # FAQ Q&A pairs
    assets/
      images/                    # Product screenshots, agent icons, logos
      fonts/                     # Inter font files (self-hosted for performance)
    styles/
      globals.css                # Tailwind directives + custom properties
  public/
    favicon.svg
    robots.txt
    og-image.png                 # Default Open Graph image
  astro.config.mjs
  tailwind.config.mjs
  tsconfig.json
  package.json
  vercel.json
  .gitignore
```

## Related Code Files

### Create
- All files in the architecture tree above
- `.env.example` with placeholder keys

### Reference (from main app)
- `/Users/lmtnolimit/projects/team8/app/lib/plan-config.ts` — pricing tiers
- `/Users/lmtnolimit/projects/team8/app/agents/agent-registry.server.ts` — agent metadata

## Implementation Steps

1. **Create project directory** (sibling to team8 or inside as `landing/`)
   ```bash
   npm create astro@latest storekeeper-landing -- --template minimal --typescript strict
   cd storekeeper-landing
   ```

2. **Install core dependencies**
   ```bash
   npx astro add tailwind
   npm install @astrojs/sitemap @astrojs/alpinejs alpinejs
   npm install -D @types/alpinejs
   ```

3. **Configure Astro** (`astro.config.mjs`)
   ```js
   import { defineConfig } from 'astro/config';
   import tailwind from '@astrojs/tailwind';
   import sitemap from '@astrojs/sitemap';
   import alpinejs from '@astrojs/alpinejs';

   export default defineConfig({
     site: 'https://storekeeper.app',
     output: 'static',
     integrations: [tailwind(), sitemap(), alpinejs()],
     image: {
       domains: ['storekeeper.app'],
     },
   });
   ```

4. **Configure Tailwind** (`tailwind.config.mjs`) — detailed in Phase 02

5. **Setup globals.css**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

6. **Create base layout** (`src/layouts/base-layout.astro`)
   - HTML5 doctype, lang="en"
   - Meta viewport, charset
   - Slot for `<head>` extras
   - Slot for page content
   - Self-hosted Inter font via `@font-face`

7. **Create index page** (`src/pages/index.astro`)
   - Import base layout
   - Import all section components (empty stubs initially)
   - Compose sections in order

8. **Create stub components** for all sections
   - Each section exports an Astro component with placeholder content
   - Use `<section id="section-name">` for scroll anchoring

9. **Configure Vercel** (`vercel.json`)
   ```json
   {
     "framework": "astro",
     "buildCommand": "npm run build",
     "outputDirectory": "dist"
   }
   ```

10. **Initialize git repo + first commit**
    ```bash
    git init
    git add .
    git commit -m "feat: initialize Astro project with Tailwind CSS and Alpine.js"
    ```

11. **Deploy to Vercel**
    ```bash
    npx vercel --prod
    ```

12. **Verify**
    - `npm run dev` serves at localhost:4321
    - `npm run build` completes < 10s
    - Vercel preview URL loads successfully
    - Lighthouse audit: 100/100 on empty page

## Todo List

- [ ] Create Astro project with minimal template
- [ ] Install Tailwind CSS, Alpine.js, sitemap integrations
- [ ] Configure astro.config.mjs (static output, site URL, integrations)
- [ ] Create folder structure (layouts, pages, components, data, assets, styles)
- [ ] Create base layout with HTML shell
- [ ] Create index.astro with section stubs
- [ ] Create all stub section components
- [ ] Create data files (agents.ts, pricing.ts, testimonials.ts, faq.ts)
- [ ] Add robots.txt, favicon.svg, .gitignore
- [ ] Configure vercel.json
- [ ] Init git, first commit
- [ ] Deploy to Vercel, verify preview URL
- [ ] Verify dev server, build, Lighthouse baseline

## Success Criteria

- `npm run dev` starts without errors
- `npm run build` produces static HTML in `dist/`
- All 11 section components render as stubs on index page
- Tailwind classes compile (visible styling)
- Alpine.js loads in browser (test with `x-data` binding)
- Vercel deployment succeeds
- Lighthouse: Performance 100, Accessibility 100 (empty page baseline)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Astro version incompatibility | Medium | Pin to `astro@5.x` in package.json |
| Tailwind v4 breaking changes | Low | Use `@astrojs/tailwind` official integration |
| Vercel build failure | Low | Test `npm run build` locally first |
| Font loading FOUT | Low | Self-host Inter with `font-display: swap` |

## Security Considerations

- No env secrets needed for static landing page
- `.env.example` for future analytics/email keys only
- No user data collection at this phase

## Next Steps

- Phase 02: Design System (colors, typography, spacing tokens)
