---
phase: 02
title: "Design System"
status: pending
effort: 3h
depends_on: [01]
---

# Phase 02 — Design System

## Context Links

- [Plan Overview](./plan.md)
- [Competitor Analysis](../reports/researcher-2-260306-landing-page-competitor-analysis.md)
- [SaaS Best Practices](../reports/researcher-1-260306-landing-page-saas-best-practices.md)

## Overview

- **Priority:** P1 (blocker for all UI phases)
- **Status:** pending
- **Description:** Define color palette, typography scale, spacing tokens, component primitives, and responsive breakpoints in Tailwind config. All subsequent phases reference this system.

## Key Insights

- Teal/green = trust, growth (competitor pattern: Tidio green, Omnisend navy+lime)
- Dark navy = professional, secure (competitor pattern: Jasper, PageFly)
- Orange accent = urgency on CTAs (high contrast against teal)
- Inter font: excellent readability, widely supported, free
- Mobile-first: 59% of Shopify solo merchants on mobile
- Minimalist data-driven design converts best (research finding)

## Requirements

### Functional
- Tailwind config extends default theme with custom tokens
- Color palette supports light theme only (no dark mode for v1)
- Typography scale covers headings (h1-h4), body, caption, overline
- Spacing scale consistent with 4px base grid
- Responsive breakpoints: mobile-first (default) → sm (640) → md (768) → lg (1024) → xl (1280)
- Reusable component classes via `@apply` for common patterns

### Non-Functional
- No custom CSS files beyond `globals.css` (Tailwind utility-first)
- All colors pass WCAG AA contrast ratio (4.5:1 for text, 3:1 for large text)
- Font files self-hosted (no Google Fonts CDN for privacy + performance)

## Architecture

### Color Palette

```
Brand Colors:
  primary:     teal-600    (#0D9488)  — trust, growth, main brand
  primary-dark: teal-700   (#0F766E)  — hover states
  primary-light: teal-50   (#F0FDFA)  — backgrounds, highlights

  secondary:   slate-900   (#0F172A)  — dark navy, headings, professional
  secondary-light: slate-700 (#334155) — body text

  accent:      orange-500  (#F97316)  — CTAs, urgency
  accent-dark: orange-600  (#EA580C)  — CTA hover

  neutral:     slate-100   (#F1F5F9)  — section backgrounds
  neutral-dark: slate-200  (#E2E8F0)  — borders, dividers

  white:       #FFFFFF               — page background
  black:       slate-950   (#020617) — rare, max contrast

Semantic Colors:
  success:     emerald-500 (#10B981)  — positive indicators
  warning:     amber-500   (#F59E0B)  — caution indicators
  error:       red-500     (#EF4444)  — error states
  info:        sky-500     (#0EA5E9)  — informational
```

### Typography Scale

```
Font family: Inter (self-hosted, variable weight 400-700)

Display (hero):
  text-5xl (48px) / leading-tight (1.15) / font-bold
  md:text-6xl (60px) / md:leading-tight
  xl:text-7xl (72px)

H1 (section headings):
  text-3xl (30px) / leading-tight / font-bold
  md:text-4xl (36px)

H2 (subsection):
  text-2xl (24px) / leading-snug / font-semibold
  md:text-3xl (30px)

H3 (card titles):
  text-xl (20px) / leading-snug / font-semibold

H4 (labels):
  text-lg (18px) / leading-normal / font-medium

Body:
  text-base (16px) / leading-relaxed (1.625) / font-normal
  Color: slate-700

Body Large:
  text-lg (18px) / leading-relaxed / font-normal

Caption:
  text-sm (14px) / leading-normal / font-normal
  Color: slate-500

Overline:
  text-xs (12px) / leading-none / font-semibold / uppercase / tracking-widest
  Color: teal-600
```

### Spacing

```
Base grid: 4px
section-y:   py-16 md:py-24 (64px / 96px)  — vertical section padding
section-x:   px-4 sm:px-6 lg:px-8          — horizontal page padding
container:   max-w-7xl mx-auto              — content max width (1280px)
gap-stack:   space-y-4 (16px)              — default vertical stack
gap-grid:    gap-6 md:gap-8               — grid gaps
```

### Responsive Breakpoints

```
default:   0-639px     mobile (single column)
sm:        640px+      large mobile / small tablet
md:        768px+      tablet (2-column grids)
lg:        1024px+     desktop (3-4 column grids)
xl:        1280px+     wide desktop (max-width containers)
```

## Related Code Files

### Create
- `tailwind.config.mjs` — full config with custom theme
- `src/styles/globals.css` — Tailwind directives + custom properties + font-face
- `src/assets/fonts/Inter-Variable.woff2` — self-hosted Inter font

### Modify
- `astro.config.mjs` — ensure Tailwind integration configured

## Implementation Steps

1. **Download Inter font** — get variable font woff2 from Google Fonts or fontsource
   ```bash
   npm install @fontsource-variable/inter
   ```
   Or manually download `Inter-Variable.woff2` to `src/assets/fonts/`

2. **Configure Tailwind** (`tailwind.config.mjs`)
   ```js
   /** @type {import('tailwindcss').Config} */
   export default {
     content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
     theme: {
       extend: {
         colors: {
           brand: {
             DEFAULT: '#0D9488',
             dark: '#0F766E',
             light: '#F0FDFA',
           },
           navy: {
             DEFAULT: '#0F172A',
             light: '#334155',
           },
           accent: {
             DEFAULT: '#F97316',
             dark: '#EA580C',
           },
         },
         fontFamily: {
           sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
         },
         animation: {
           'fade-in': 'fadeIn 0.6s ease-out forwards',
           'slide-up': 'slideUp 0.6s ease-out forwards',
           'stagger': 'fadeIn 0.4s ease-out forwards',
         },
         keyframes: {
           fadeIn: {
             '0%': { opacity: '0' },
             '100%': { opacity: '1' },
           },
           slideUp: {
             '0%': { opacity: '0', transform: 'translateY(20px)' },
             '100%': { opacity: '1', transform: 'translateY(0)' },
           },
         },
       },
     },
     plugins: [],
   };
   ```

3. **Setup globals.css**
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
     @font-face {
       font-family: 'Inter Variable';
       font-style: normal;
       font-weight: 100 900;
       font-display: swap;
       src: url('/fonts/Inter-Variable.woff2') format('woff2');
     }

     html {
       scroll-behavior: smooth;
       -webkit-font-smoothing: antialiased;
     }

     body {
       @apply font-sans text-navy-light bg-white;
     }

     h1, h2, h3, h4 {
       @apply text-navy font-bold;
     }
   }

   @layer components {
     .section-container {
       @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
     }

     .section-padding {
       @apply py-16 md:py-24;
     }

     .btn-primary {
       @apply inline-flex items-center justify-center px-6 py-3
              bg-accent hover:bg-accent-dark text-white font-semibold
              rounded-lg transition-colors duration-200
              text-base md:text-lg;
     }

     .btn-secondary {
       @apply inline-flex items-center justify-center px-6 py-3
              bg-white hover:bg-slate-50 text-navy font-semibold
              border-2 border-slate-200 rounded-lg
              transition-colors duration-200
              text-base md:text-lg;
     }

     .overline {
       @apply text-xs font-semibold uppercase tracking-widest text-brand;
     }
   }
   ```

4. **Create reusable UI primitives**

   `src/components/ui/section-heading.astro`:
   ```astro
   ---
   interface Props {
     overline?: string;
     title: string;
     subtitle?: string;
     centered?: boolean;
   }
   const { overline, title, subtitle, centered = true } = Astro.props;
   ---
   <div class:list={["max-w-3xl", centered && "mx-auto text-center"]}>
     {overline && <p class="overline mb-3">{overline}</p>}
     <h2 class="text-3xl md:text-4xl font-bold text-navy mb-4">{title}</h2>
     {subtitle && <p class="text-lg text-navy-light">{subtitle}</p>}
   </div>
   ```

   `src/components/ui/cta-button.astro`:
   ```astro
   ---
   interface Props {
     href: string;
     variant?: 'primary' | 'secondary';
     size?: 'base' | 'lg';
   }
   const { href, variant = 'primary', size = 'base' } = Astro.props;
   ---
   <a href={href} class:list={[
     variant === 'primary' ? 'btn-primary' : 'btn-secondary',
     size === 'lg' && 'px-8 py-4 text-lg',
   ]}>
     <slot />
   </a>
   ```

   `src/components/ui/badge.astro`:
   ```astro
   ---
   interface Props {
     tone?: 'brand' | 'accent' | 'neutral';
   }
   const { tone = 'brand' } = Astro.props;
   const colors = {
     brand: 'bg-brand-light text-brand',
     accent: 'bg-orange-50 text-accent-dark',
     neutral: 'bg-slate-100 text-slate-600',
   };
   ---
   <span class:list={["inline-block px-3 py-1 text-xs font-semibold rounded-full", colors[tone]]}>
     <slot />
   </span>
   ```

5. **Verify contrast ratios**
   - Navy (#0F172A) on white: 16.75:1 (passes AAA)
   - Teal (#0D9488) on white: 4.52:1 (passes AA)
   - Orange (#F97316) on white: 3.2:1 (AA large text only — use on large CTAs)
   - Slate-700 (#334155) on white: 7.69:1 (passes AAA)
   - White on orange (#F97316): 3.2:1 (use bold/large text for CTA buttons)

6. **Test responsive behavior**
   - Verify mobile-first defaults render correctly at 375px
   - Verify tablet layout at 768px
   - Verify desktop layout at 1280px

## Todo List

- [ ] Install/download Inter variable font
- [ ] Configure tailwind.config.mjs with custom colors, fonts, animations
- [ ] Write globals.css with Tailwind directives, font-face, base/component layers
- [ ] Create section-heading.astro component
- [ ] Create cta-button.astro component
- [ ] Create badge.astro component
- [ ] Verify WCAG contrast ratios for all color pairings
- [ ] Test responsive breakpoints at 375px, 768px, 1280px
- [ ] Verify font loading (no FOUT/FOIT)

## Success Criteria

- Tailwind config compiles without errors
- Custom colors, fonts, and animations available in templates
- UI primitives (section-heading, cta-button, badge) render correctly
- All text colors pass WCAG AA contrast (4.5:1 body, 3:1 large)
- Inter font loads with `font-display: swap` (no flash)
- Mobile-first layout works at 375px width

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Orange CTA fails AA contrast on white bg | Medium | Use large text (18px+) or darken to orange-600 |
| Inter font file too large | Low | Use variable font (single woff2 < 100KB) |
| Tailwind v4 config syntax changes | Low | Pin version, follow official docs |

## Next Steps

- Phase 03: Layout & Navigation (base layout, nav bar, footer, SEO meta)
