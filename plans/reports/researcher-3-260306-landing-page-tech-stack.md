# Landing Page Tech Stack Research — Storekeeper (Shopify App)
**Date:** 2026-03-06 | **Researcher:** Agent 3

## Executive Summary

For a 2-person team building a marketing landing page for a Shopify embedded app, **Astro is the optimal choice** over Next.js, React Router v7, or no-code builders. Pair it with **Tailwind UI** for design system + **Vercel** for deployment. This minimizes maintenance burden while maximizing conversion velocity and SEO.

**Key recommendation:** Use Astro (static-first) for landing page, keep Shopify embedded app (React Router v7) separate. Deploy on Vercel or Cloudflare Pages for speed and simplicity.

---

## 1. Framework Decision Matrix

### Option A: Astro (RECOMMENDED)
**Verdict: BEST for 2-person team, marketing-focused landing page**

**Advantages:**
- 40% faster load times, 90% less JavaScript vs Next.js (Lighthouse benchmarks)
- Zero JavaScript by default → better Core Web Vitals (LCP <0.5s, CLS <0.1)
- 3x faster builds (1,000-page site: 18s vs 52s in Next.js)
- Perfect SEO baseline (static HTML, minimal JS payload)
- Partial hydration = interactive components only load when needed
- Excellent for content-heavy sites (pricing, features, testimonials, FAQ)

**Use Case:** Product showcase, pricing tables, social proof, email signup form

**Maintenance:** Minimal. No complex state management, no backend dependencies.

**Trade-offs:**
- Limited if you need real-time personalization (user-specific pricing, dynamic content)
- Less mature ecosystem than Next.js (but growing rapidly)

**Plugin ecosystem:** Integrations for analytics, email, CMS, forms exist and mature

---

### Option B: Next.js App Router
**Verdict: OVERKILL for marketing landing page, consider if you need dynamic content**

**Advantages:**
- Tighter React investment (your main app uses React Router v7)
- Can reuse component libraries with embedded app
- Dynamic content support (real-time updates, personalization)

**Disadvantages:**
- ~50% slower than Astro on identical landing page (1-1.5s LCP vs 0.5s)
- Larger JS bundle by default (SEO penalty on poor networks)
- Higher hosting costs (serverless functions, Vercel Premium)
- Overkill for static content
- Framework churn (App Router still maturing, migration path from Pages Router ongoing)

**Cost:** Vercel integration best, but ~$150-500/mo for serious projects

---

### Option C: React Router v7 (Public Routes)
**Verdict: NOT recommended, creates operational complexity**

**Technical feasibility:** Possible via file-based routing
- Create public routes: `root.tsx`, `landing.tsx`, `pricing.tsx`
- Protect `/app/*` routes with authentication check in loader
- Use `<Outlet />` + nested routes

**Problems with this approach:**
1. **Operational burden:** Two separate apps (embedded + marketing) are cleaner than one monolith
2. **Deployment coupling:** Landing page rebuilds trigger full app redeploy
3. **Performance clobbered:** Embedded app includes (Shopify App Bridge, Polaris, auth middleware) bloat landing page JS
4. **SEO risk:** App Bridge scripts + embedded context confuse Google crawlers
5. **Team friction:** Marketing work requires shipping app changes (review cycle overhead)

**Single advantage:** Code reuse. Not worth the cost.

---

### Option D: No-Code Builders (Framer, Webflow, Squarespace)
**Verdict: FASTEST launch, suitable if design > dev time**

**Top players:**
- **Framer:** Best for animations, AI design import, fast iteration. Zero technical debt. Lowest learning curve for designers.
- **Webflow:** Most customizable, pixel-perfect layouts, advanced animations
- **PlayCode (AI-powered):** Describe in English, AI writes real React + Tailwind code (novel, but immature)

**Trade-offs:**
- Vendor lock-in (moving away later = rewrite)
- Limited analytics integration (Mailchimp/ConvertKit built-in, but GA4 harder)
- CMS limitations (can't query Shopify API dynamically)
- Pricing: $100-300/mo for production

**When to use:** Designer-led team, heavy animation focus, zero dev resources

---

## 2. Recommended Stack: Astro + Tailwind UI

### Why this combination:

**Astro:**
- Framework provides structure, routing, static generation, image optimization
- Built-in SEO (automatic sitemap, meta tag helpers)
- Supports partial hydration (Alpine.js, Preact, Svelte for interactive pieces)

**Tailwind UI:**
- Premium, hand-crafted landing page components (hero, pricing table, testimonials, feature grid, CTA sections)
- Purpose-built for SaaS conversions
- Unmatched for fast, professional designs (beats shadcn/ui for marketing)
- One-time cost (~$299 lifetime) vs ongoing drag-and-drop builder fees

**Why NOT Polaris design system:**
- Polaris designed for *admin interfaces* (data-heavy, workflows), not marketing
- Consumer-facing marketing sites need different affordances (emotions, urgency, trust signals)
- Would confuse users (they expect design consistency with Shopify admin, not a storefront-like site)

---

## 3. Design System Details

### Tailwind UI for Landing Page
- **Components included:** Hero sections, pricing tables, testimonials, feature grids, CTAs, forms, footers, navigation
- **Cost:** $299 one-time (not subscription)
- **Integration:** Copy Tailwind CSS classes directly into Astro components
- **Customization:** Full access to source (no black-box)

### Embedded App: Keep Polaris Web Components
- Marketing site ≠ app interface; design system choice appropriate to context
- Users already see Polaris in Shopify admin; no expectation of consistency in marketing

---

## 4. Hosting & Deployment

### Deployment Comparison (2026)

| Platform | Build Speed | Performance | Cost | Best For |
|----------|-------------|-------------|------|----------|
| **Vercel** | 60-90s | Very good (Next.js optimized) | Free→$20/mo for analytics | Next.js, any framework |
| **Cloudflare Pages** | 49-58s (FASTEST) | Excellent (300+ edge locations) | Free→$200/mo enterprise | Global reach, edge compute |
| **Netlify** | ~90s | Good | Free→$299/mo pro | Balanced, forms built-in |

### Recommendation: **Vercel or Cloudflare Pages**
- Both free tier suitable for landing page
- Vercel: unmatched DX, Astro support excellent
- Cloudflare Pages: marginally faster, 300+ global edges
- **Choose Vercel if:** Team familiar with Next.js ecosystem
- **Choose Cloudflare if:** Global audience, want aggressive caching

### Custom Domain Setup
- Point CNAME record (or A record) to hosting platform
- **DNS propagation:** up to 48 hours
- Shopify doesn't control landing page DNS; standard domain registration applies
- Example: `app.storekeeper.com` → Vercel DNS records

---

## 5. SEO & Performance Requirements

### Core Web Vitals Targets (Google 2026)
| Metric | Target | Astro Baseline |
|--------|--------|---|
| **LCP** (Largest Contentful Paint) | <2.5s | ~0.5s ✓ |
| **INP** (Interaction to Next Paint) | <200ms | ~100ms ✓ |
| **CLS** (Cumulative Layout Shift) | <0.1 | ~0.05 ✓ |

Astro ships ~50KB JS by default (vs 200KB+ Next.js). Performance advantage carries through.

### Structured Data (Schema Markup)
**Essential for Shopify app landing pages:**

1. **SoftwareApplication/WebApplication** (JSON-LD in `<head>`)
   - Required fields: name, price, ratings/reviews
   - Enables rich snippets in Google Search
   ```json
   {
     "@context": "https://schema.org",
     "@type": "SoftwareApplication",
     "name": "Storekeeper",
     "applicationCategory": "BusinessApplication",
     "price": "29.00",
     "priceCurrency": "USD"
   }
   ```

2. **Organization** (on homepage/about)
   - Logo, founding date, social media, contact

3. **Product** schema (pricing page)
   - Feature descriptions, plan tiers

### Astro SEO Support
- Auto-generates `sitemap.xml`
- Built-in `astro:content` collection for blog posts (if added later)
- Integrations: `@astrojs/seo`, `@astrojs/sitemap` (zero config)
- Meta tags: use `<ViewTransitions />` for smooth page transitions

### Image Optimization
- Astro auto-optimizes images (AVIF/WebP with fallback)
- Lazy loading by default
- No manual optimization needed

---

## 6. Key Integrations

### Analytics
**Recommendation: Plausible or PostHog (privacy-first)**
- ConvertKit/Mailchimp focus on *email* tracking, not site analytics
- Plausible: $9-20/mo, no cookies, GDPR-friendly
- PostHog: free tier, product analytics + heatmaps
- GA4: free, but cookie consent required in EU

**Integration:** Add script tag in Astro layout, done

### Email Capture

**Option A: ConvertKit (now "Kit")**
- Built-in landing page templates (53 templates)
- Email form embed (copy-paste iframe or custom form)
- Focus: creators, newsletter-first
- Limitation: form templates basic, limited customization
- Analytics: subscriber growth, open rates

**Option B: Mailchimp**
- Forms: drag-and-drop, more customizable
- Landing page builder: integrated
- Analytics: conversion rates, page views, comparative reports
- Free tier generous (5,000 contacts)

**Option C: Custom (Recommended for 2-person team)**
- Use Astro form handling + Serverless function (Vercel/Cloudflare)
- Save emails to: Supabase (free tier), MongoDB (via Prisma), or Mailchimp API
- Full control, zero vendor lock-in
- Complexity: ~2-3 hours setup (form + email validation + database)

**Simplest path:** Mailchimp's form embed (copy iframe, instant email capture)

### App Store Listing Integration
- Link to: Shopify App Store listing (`https://apps.shopify.com/storekeeper` or similar)
- CTA button: "Install App" → redirects to install flow
- Tracking: Use UTM params to measure landing page → install conversion

---

## 7. File Structure (Astro Recommended Setup)

```
storekeeper-landing/
├── src/
│   ├── layouts/
│   │   └── base.astro           # Nav + footer wrapper
│   ├── pages/
│   │   ├── index.astro          # Hero + features
│   │   ├── pricing.astro        # Pricing tiers
│   │   ├── features.astro       # Feature deep-dive
│   │   └── contact.astro        # Email signup (or popup)
│   ├── components/
│   │   ├── hero.astro
│   │   ├── pricing-table.astro
│   │   ├── testimonials.astro
│   │   ├── email-form.astro
│   │   └── cta.astro
│   ├── styles/
│   │   └── globals.css          # Tailwind imports
│   └── lib/
│       └── seo.ts              # SEO helpers, schema markup
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## 8. Deployment Checklist

**Before going live:**
- [ ] Core Web Vitals: run Lighthouse CI, ensure all >90
- [ ] SEO: validate meta tags, OG tags (Twitter card, Open Graph)
- [ ] Schema markup: test with Google Rich Results tool
- [ ] Email capture: test form submission, verify webhook/email delivery
- [ ] Analytics: verify Plausible/GA4 tracking working
- [ ] DNS: point custom domain (CNAME or A record)
- [ ] Redirects: if migrating from old landing page, setup 301 redirects
- [ ] Monitoring: setup error tracking (Sentry) and uptime checks (Uptime Robot free)
- [ ] SSL/TLS: automatic via Vercel/Cloudflare (HTTPS enforced)

---

## 9. Competitive Advantage Analysis

### Why Astro > Next.js for this landing page:

1. **Speed advantage:** 40% faster = +2% conversion lift (industry data)
2. **Cost:** Vercel free tier covers landing page; Next.js free tier + serverless still cheaper than builder tools, but Astro = zero functions needed
3. **SEO:** Clean static HTML, zero hydration overhead = Google crawler friendliness
4. **Maintenance:** Fire-and-forget static files vs Next.js runtime overhead
5. **Team scaling:** Designer can contribute Tailwind markup without JS knowledge

### vs. Webflow/Framer:
- Webflow: $100/mo, designer-friendly, but slower exports, hard to move
- Framer: Beautiful animations, but limited for complex forms/integrations
- Astro: Dev-friendly, full control, portable, open-source

---

## 10. Timeline & Effort Estimate

**Tech stack selection:** 2-3 days (dev + designer pairing)

**Development (2-person team):**
- Astro project setup + Tailwind UI: 1 day
- Core pages (hero, pricing, features): 3-4 days
- Email form + analytics: 1 day
- Testing, optimizations, polish: 2 days
- **Total: ~7-9 days**

**Alternative (Framer):**
- Design: 2-3 days
- Launch: 1 day (drag-and-drop)
- **Total: ~3-4 days** (faster if design-focused)

---

## 11. Implementation Gotchas & Risks

### Astro-Specific
1. **Partial hydration learning curve:** Need to understand when components hydrate (Alpine.js for interactivity)
2. **No SSR by default:** If you later need server-side rendering, requires middleware config
3. **Asset pipeline:** Image optimization can be slow on first build (one-time cost)

### Deployment
1. **DNS propagation:** 48-hour window; test on staging domain first
2. **Email delivery:** If using custom form, test spam score (use Mailchimp API or SendGrid for reliability)
3. **Analytics:** Plausible/GA4 can take 24 hours to show first data

### Integration
1. **ConvertKit/Mailchimp API rate limits:** Low risk for landing page, but cache form validation
2. **Shopify App Store link:** Verify install flow works on all devices (mobile-critical)

---

## 12. Maintenance Burden (Year 1+)

### Astro
- Security updates: ~quarterly (npm audit)
- Content updates: Edit `.astro` files directly
- Analytics review: Monthly
- No database, no serverless timeouts, no state management

### vs. Next.js
- Same security patch frequency
- More npm dependencies (larger surface area)
- Serverless cold starts (if using Vercel functions)
- More complex debugging if performance regresses

### vs. Builders (Webflow)
- No code to maintain
- BUT: Feature requests blocked by builder limitations (expensive)
- Vendor lock-in (export complexity)

---

## Unresolved Questions

1. **Real-time pricing updates?** Does Storekeeper pricing change dynamically (e.g., usage-based tiers, seasonal discounts)? If yes, requires dynamic data source (Shopify API query or CMS). Astro can handle via SSR or ISR, but adds complexity.

2. **Blog/content marketing?** Future SEO strategy? Astro + Markdown collection is ideal, but requires content ops planning.

3. **A/B testing?** Need multivariate testing (multiple hero variants)? Builders do this natively; Astro requires custom middleware or third-party service (VWO, Convert).

4. **Multi-language?** Future international expansion? Astro's i18n setup is manual but powerful; builders often include it.

5. **Team handoff?** If designer works solo, Framer might be more comfortable than pushing to Astro repo. Budget for onboarding cost.

---

## Final Recommendation

**Use Astro + Tailwind UI + Vercel**

- **Time to launch:** 7-9 days
- **Monthly cost:** Free (until >100K pageviews)
- **SEO out-of-box:** Better than any competitor
- **Team compatibility:** React dev + designer both productive
- **Maintenance:** Lowest ongoing burden
- **Extensibility:** Can add blog, docs, multiple landing variants later without redesign

**Alternative if design speed critical:** Framer (3-day launch, $10/mo domain)

---

## Sources

- [Astro vs Next.js 2026 Performance Comparison](https://pagepro.co/blog/astro-nextjs/)
- [Next.js vs Astro: Framework Benchmarks](https://senorit.de/en/blog/astro-vs-nextjs-2025)
- [Shopify Landing Page Design & Conversions](https://www.shopify.com/blog/landing-page-design)
- [React Router v7 Public Routes & Authentication](https://www.robinwieruch.de/react-router-private-routes/)
- [Tailwind UI vs shadcn/ui Marketing Sites](https://uiarchives.com/blog/tailwind-ui-vs-shadcn-ui)
- [Vercel vs Netlify vs Cloudflare Pages 2026](https://www.codebrand.us/blog/vercel-vs-netlify-vs-cloudflare-2026/)
- [Core Web Vitals Optimization 2026](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)
- [SaaS SEO & Structured Data Schema](https://www.madx.digital/learn/schema-seo-for-saas-company)
- [ConvertKit vs Mailchimp 2026](https://moosend.com/blog/convertkit-vs-mailchimp/)
- [Framer Alternatives & No-Code Builders](https://super.so/blog/framer-alternatives)
