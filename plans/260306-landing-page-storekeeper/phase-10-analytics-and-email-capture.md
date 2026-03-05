---
phase: 10
title: "Analytics + Email Capture"
status: pending
effort: 2h
depends_on: [09]
---

# Phase 10 — Analytics + Email Capture

## Context Links

- [Plan Overview](./plan.md)
- [Tech Stack Research: Analytics & Email](../reports/researcher-3-260306-landing-page-tech-stack.md)

## Overview

- **Priority:** P3
- **Status:** pending
- **Description:** Integrate privacy-first analytics (Plausible or PostHog), add email capture form for waitlist/newsletter, and configure CTA links to Shopify App Store with UTM tracking.

## Key Insights

- Plausible: $9/mo, no cookies, GDPR-friendly, lightweight (< 1KB script)
- PostHog: free tier, more powerful (heatmaps, session replay), but heavier
- For v1: Plausible is simpler and sufficient — upgrade to PostHog later if needed
- Email capture: simple form + Vercel serverless function or Mailchimp embed
- UTM params on all App Store links for conversion attribution
- Track: hero CTA clicks, scroll depth, pricing tier clicks, email signups

## Requirements

### Functional

**Analytics:**
- Plausible analytics script on all pages
- Custom events: `cta_hero_click`, `cta_pricing_click`, `cta_floating_click`, `email_signup`
- Goal tracking for App Store CTA clicks
- No cookie consent banner needed (Plausible is cookie-free)

**Email Capture:**
- Inline email form above footer (or in Final CTA section)
- Fields: email only (minimum friction)
- Success state: "Thanks! We'll keep you updated."
- Error state: "Something went wrong. Try again."
- Backend: Vercel serverless function → Mailchimp API (or simple JSON file for v1)

**UTM Tracking:**
- All Shopify App Store links include UTM params:
  ```
  https://apps.shopify.com/storekeeper?utm_source=landing&utm_medium=web&utm_campaign=launch&utm_content={section}
  ```
- Section-specific `utm_content`: `hero`, `floating`, `pricing_free`, `pricing_starter`, `pricing_pro`, `pricing_agency`, `final_cta`

### Non-Functional
- Analytics script must not block rendering (async load)
- Plausible script < 1KB — negligible performance impact
- Email form validation client-side (HTML5 `type="email"` + `required`)
- Form submission via `fetch()` (no page reload)
- Serverless function cold start < 500ms

## Architecture

```
src/
  components/
    ui/
      email-capture-form.astro   # Email signup form
  lib/
    analytics.ts                 # Plausible event helpers
    utm.ts                       # UTM param builder
api/                             # Vercel serverless functions
  subscribe.ts                   # Email capture endpoint
```

## Related Code Files

### Create
- `src/components/ui/email-capture-form.astro`
- `src/lib/analytics.ts`
- `src/lib/utm.ts`
- `api/subscribe.ts` (Vercel serverless function)
- `.env.example` — update with Plausible and Mailchimp keys

### Modify
- `src/layouts/base-layout.astro` — add Plausible script
- `src/components/sections/final-cta-section.astro` — add email form
- All CTA links — add UTM params
- `src/components/sections/hero-section.astro` — UTM on CTA
- `src/components/sections/pricing-section.astro` — UTM on tier CTAs
- `src/components/ui/floating-cta.astro` — UTM on CTA

## Implementation Steps

1. **Create utm.ts helper**
   ```ts
   const BASE_URL = 'https://apps.shopify.com/storekeeper';

   export function appStoreUrl(section: string): string {
     const params = new URLSearchParams({
       utm_source: 'landing',
       utm_medium: 'web',
       utm_campaign: 'launch',
       utm_content: section,
     });
     return `${BASE_URL}?${params.toString()}`;
   }
   ```

2. **Update all CTA links** with UTM params
   ```astro
   ---
   import { appStoreUrl } from '../../lib/utm';
   ---
   <!-- Hero CTA -->
   <a href={appStoreUrl('hero')} class="btn-primary">Start Free</a>

   <!-- Floating CTA -->
   <a href={appStoreUrl('floating')} class="btn-primary">Start Free</a>

   <!-- Pricing CTAs -->
   <a href={appStoreUrl('pricing_starter')}>Start 14-Day Trial</a>
   ```

3. **Add Plausible analytics** to base-layout.astro
   ```html
   <!-- Plausible Analytics (cookie-free, GDPR-friendly) -->
   <script defer data-domain="storekeeper.app"
     src="https://plausible.io/js/script.js"></script>
   ```
   For custom events:
   ```html
   <script defer data-domain="storekeeper.app"
     src="https://plausible.io/js/script.tagged-events.js"></script>
   ```

4. **Create analytics.ts** — event tracking helpers
   ```ts
   // Plausible custom events
   declare global {
     interface Window {
       plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
     }
   }

   export function trackEvent(name: string, props?: Record<string, string>): void {
     if (typeof window !== 'undefined' && window.plausible) {
       window.plausible(name, props ? { props } : undefined);
     }
   }
   ```

5. **Add event tracking to CTAs**
   Use `data-analytics` attributes on CTA links for Plausible's tagged events:
   ```html
   <a href={appStoreUrl('hero')}
     class="plausible-event-name=CTA+Click plausible-event-section=hero btn-primary">
     Start Free
   </a>
   ```
   Or use inline script for Alpine.js-managed elements.

6. **Create email-capture-form.astro**
   ```astro
   <div x-data="{ email: '', status: 'idle', message: '' }" class="max-w-md mx-auto">
     <form
       @submit.prevent="
         status = 'loading';
         fetch('/api/subscribe', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email }),
         })
         .then(r => r.json())
         .then(data => {
           status = data.ok ? 'success' : 'error';
           message = data.message;
           if (data.ok) {
             email = '';
             window.plausible?.('Email+Signup');
           }
         })
         .catch(() => {
           status = 'error';
           message = 'Something went wrong. Try again.';
         })
       "
       class="flex gap-2"
     >
       <input
         type="email"
         x-model="email"
         required
         placeholder="you@store.com"
         class="flex-1 px-4 py-3 rounded-lg border border-slate-300
           focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none
           text-navy placeholder:text-slate-400"
       />
       <button
         type="submit"
         :disabled="status === 'loading'"
         class="btn-primary px-6 py-3 whitespace-nowrap"
       >
         <span x-show="status !== 'loading'">Get Updates</span>
         <span x-show="status === 'loading'" x-cloak>Sending...</span>
       </button>
     </form>

     <!-- Success message -->
     <p x-show="status === 'success'" x-cloak
       class="mt-3 text-sm text-emerald-600 text-center">
       Thanks! We'll keep you updated.
     </p>

     <!-- Error message -->
     <p x-show="status === 'error'" x-cloak x-text="message"
       class="mt-3 text-sm text-red-600 text-center">
     </p>

     <p class="mt-2 text-xs text-slate-400 text-center">
       No spam. Unsubscribe anytime.
     </p>
   </div>
   ```

7. **Create Vercel serverless function** (`api/subscribe.ts`)
   ```ts
   import type { VercelRequest, VercelResponse } from '@vercel/node';

   export default async function handler(req: VercelRequest, res: VercelResponse) {
     if (req.method !== 'POST') {
       return res.status(405).json({ ok: false, message: 'Method not allowed' });
     }

     const { email } = req.body;

     if (!email || !email.includes('@')) {
       return res.status(400).json({ ok: false, message: 'Valid email required' });
     }

     try {
       // Option A: Mailchimp API
       const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
       const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
       const MAILCHIMP_DC = MAILCHIMP_API_KEY?.split('-').pop(); // e.g., "us21"

       if (MAILCHIMP_API_KEY && MAILCHIMP_LIST_ID) {
         const response = await fetch(
           `https://${MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members`,
           {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               Authorization: `apikey ${MAILCHIMP_API_KEY}`,
             },
             body: JSON.stringify({
               email_address: email,
               status: 'subscribed',
               tags: ['landing-page'],
             }),
           }
         );

         if (!response.ok) {
           const data = await response.json();
           if (data.title === 'Member Exists') {
             return res.status(200).json({ ok: true, message: "You're already subscribed!" });
           }
           throw new Error(data.detail || 'Mailchimp error');
         }
       }

       // Option B: If no Mailchimp, just log (for development)
       console.log(`Email signup: ${email}`);

       return res.status(200).json({ ok: true, message: 'Subscribed successfully!' });
     } catch (error) {
       console.error('Subscribe error:', error);
       return res.status(500).json({ ok: false, message: 'Something went wrong. Try again.' });
     }
   }
   ```

8. **Update .env.example**
   ```
   # Analytics (Plausible)
   # PUBLIC_PLAUSIBLE_DOMAIN=storekeeper.app

   # Email (Mailchimp)
   # MAILCHIMP_API_KEY=xxx-us21
   # MAILCHIMP_LIST_ID=abc123
   ```

9. **Add email form to Final CTA section**
   - Insert between CTAs and trust badges
   - Or create dedicated section above footer
   - Copy: "Get product updates and tips for solo merchants"

10. **Test tracking**
    - Verify Plausible script loads (Network tab)
    - Verify custom events fire (Plausible dashboard or console)
    - Verify UTM params present on all App Store links
    - Verify email form submits and shows success/error states
    - Test form with invalid email (client-side validation)

## Todo List

- [ ] Create utm.ts helper for App Store URLs
- [ ] Update ALL CTA links with UTM params (hero, floating, pricing x4, final)
- [ ] Add Plausible script to base-layout.astro
- [ ] Create analytics.ts event tracking helpers
- [ ] Add tagged event classes to CTA elements
- [ ] Create email-capture-form.astro with Alpine.js
- [ ] Create api/subscribe.ts serverless function
- [ ] Add Mailchimp integration (or log-only for dev)
- [ ] Update .env.example with analytics/email keys
- [ ] Add email form to final CTA or pre-footer section
- [ ] Test UTM params on all outbound links
- [ ] Test email form submit, success, error states
- [ ] Verify Plausible tracks pageviews
- [ ] Test custom events fire correctly
- [ ] Run final Lighthouse audit (ensure analytics doesn't degrade score)

## Success Criteria

- Plausible script loads on all pages (< 1KB, no render blocking)
- All App Store links include correct UTM params
- Email form submits successfully, shows feedback
- Form validates email client-side (HTML5 + required)
- Custom events tracked: CTA clicks, email signups
- Lighthouse Performance still 95+ with analytics added
- No cookie consent banner needed (Plausible is cookie-free)

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Plausible script blocked by ad blockers | Medium | Accept ~15% data loss; no workaround for static site |
| Mailchimp API rate limits | Low | Landing page volume too low to trigger limits |
| Serverless function cold start | Low | < 500ms acceptable for form submission |
| Email form spam | Medium | Add honeypot field or rate limiting in serverless function |
| UTM params break App Store redirect | Low | Test all links manually before launch |

## Security Considerations

- Serverless function validates email format before Mailchimp API call
- Mailchimp API key stored in environment variables (never client-side)
- Add honeypot hidden field to email form for basic bot protection
- Rate limiting: consider Vercel Edge middleware for abuse prevention
- No PII stored locally; emails go directly to Mailchimp

## Next Steps

This is the final implementation phase. Post-launch:
- Replace placeholder testimonials with real merchant quotes
- Add blog/content section for SEO
- A/B test hero headline variants
- Monitor Plausible dashboard for conversion metrics
- Replace placeholder product screenshots with real app images
