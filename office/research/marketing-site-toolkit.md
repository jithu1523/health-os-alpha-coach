# Marketing Site Toolkit

Author: researcher Oscar (hive)  
Date: 2026-08-20  
Status: proposed - hands to Pam for `conv-marketing-website`

## Decision

For a high-end, Apple-like landing page, use a **strictly small motion stack**:

1. **Lenis** for smooth scroll.
2. **GSAP + ScrollTrigger** only for hero/section choreography that cannot be expressed cleanly in CSS or Motion.
3. **Swiper** only if the page needs an actual carousel.
4. Avoid AOS and Locomotive Scroll for this brief unless Pam needs a quick prototype.

Important license flag: **GSAP is now free for commercial use, including former Club plugins, but it is not MIT/open-source.** The current npm package lists a "Standard no charge" license. If the mandate is "open-source only," do not use GSAP; use Lenis + Motion instead.

## Animation And Smooth-Scroll Libraries

Bundle sizes below are Bundlephobia API values checked on 2026-08-20. Treat them as planning numbers, not exact final Vite/Next output.

| Library | Current package checked | License | Bundle size | Perf / graceful notes | Recommendation |
|---|---:|---|---:|---|---|
| **Lenis** | `lenis@1.3.26` | MIT | 18.8 kB / 5.5 kB gzip | Uses native-style scroll, no dependencies. Current docs say it honors `prefers-reduced-motion` by disabling smoothing. v5 Locomotive is built on it. | **Use** as the default smooth-scroll layer. |
| **GSAP + ScrollTrigger** | `gsap@3.15.0` | GSAP Standard "no charge" license, not MIT | 70.6 kB / 27.4 kB gzip for package entry; ScrollTrigger adds more when imported | Official GSAP license says commercial projects are covered at no charge as of the 2025 Webflow change. Reduced motion must be implemented with `gsap.matchMedia()` or equivalent. | Use sparingly for premium scroll choreography; track license in `LICENSES.md`. |
| **Motion / Motion One** | `motion@13.1.1`; legacy `@motionone/dom@10.18.0` | MIT | `motion`: 135.7 kB / 45.3 kB gzip; `@motionone/dom`: 22.9 kB / 9.4 kB gzip | Good declarative API and built-in `useReducedMotion` hook. Better for component entrances than whole-page scroll smoothing. | Use for simple UI transitions if Pam is in React; otherwise CSS keyframes may be enough. |
| **AOS** | `aos@2.3.4` | MIT | 14.1 kB / 4.7 kB gzip | Old scroll-reveal pattern; issue tracker suggests manual `disable: matchMedia('(prefers-reduced-motion: reduce)')`. Can create generic template feel. | Avoid for high-end site; acceptable only for throwaway reveal prototype. |
| **Locomotive Scroll** | `locomotive-scroll@5.0.1` | MIT | 34.4 kB / 8.8 kB gzip | v5 docs say it is built on Lenis, TypeScript-first, no old greedy transform engine. Still a larger/opinionated detection + parallax layer. | Usually skip; Lenis + IntersectionObserver covers us with less API. |
| **Swiper** | `swiper@14.1.0` | MIT | 65.2 kB / 19.9 kB gzip | v14 is a TypeScript rewrite focused on smaller bundles. A11y module exists, but carousels still need keyboard, labels, autoplay-off, and reduced-motion handling. | Use only for real product/testimonial carousel; never for basic layout. |

### Motion Guidance For Pam

- Build content so it works with **no JavaScript animation** first.
- Add Lenis after layout is stable.
- Use GSAP only for 2-3 signature moments: first hero reveal, one product-proof transition, one closing CTA. Anything more will feel like a demo reel.
- Respect `prefers-reduced-motion` globally. MDN and W3C both frame this as an accessibility signal; GSAP and Motion provide APIs to branch on it, and Lenis now handles it by default.
- Community scan: Reddit threads in r/webdev/rFrontend repeatedly mention Lenis + GSAP/ScrollTrigger as the current smooth landing-page stack, while also warning that smoothness still fails if layouts are heavy or scroll is hijacked. Treat Reddit as practitioner signal, not authority.

## Royalty-Free Asset Sources

Use real product/app screenshots or generated product art where possible. Stock imagery should support the value proposition, not become the brand.

| Source | Exact license / terms | Attribution required? | Commercial-use caveats | Recommendation |
|---|---|---:|---|---|
| **Unsplash** | Unsplash License | No, attribution appreciated | Cannot sell images without significant modification; cannot compile a competing image service. Watch trademarks/people. | Safe for atmospheric/product-context images; prefer edited/composited use. |
| **Pexels** | Pexels License; some CC0 content | No, attribution appreciated | Can use/modify commercially. Still verify model/property/trademark context for marketing claims. | Good stock fallback. |
| **Pixabay** | Pixabay Content License / CC0 for some content | No, attribution appreciated | No standalone resale/distribution; no commercial use of recognizable trademarks/logos/brands in goods/services; no misleading/person-sensitive use. | Use carefully; record source URL and avoid branded/recognizable people shots. |
| **unDraw** | unDraw custom license | No | Commercial/personal use allowed, but do not redistribute packs, replicate unDraw, scrape/bulk-download, create integrations, or use assets for AI/ML training. | Use sparingly; the style is recognizable and can look generic. Track license because it is custom. |
| **Humaaans** | CC0 public domain, Pablo Stanley | No | CC0; still avoid implying endorsement if mixed with brand logos. | Good for soft people illustrations, but less Apple-like. |
| **Open Peeps** | CC0 public domain, Pablo Stanley | No | CC0; same endorsement/trademark common-sense caveats. | Good for playful sections, probably not for premium/Apple-like tone. |
| **Lucide** | ISC License | License notice required in copies/substantial portions | Free commercial use; conservative approach is include license notice in `LICENSES.md`. | Best default icon set for this app/site. |
| **Heroicons** | MIT License | License notice required in copies/substantial portions | Free commercial use; include MIT notice. | Good if using Tailwind visual language. |
| **Phosphor** | MIT License | License notice required in copies/substantial portions | Free commercial use; include MIT notice. Package is broad, so import individual icons. | Good for warmer/editorial tone; tree-shake carefully. |

**Loud flags for `LICENSES.md`:** GSAP (custom no-charge, not MIT), unDraw (custom license plus no AI/ML/bulk redistribution), Unsplash/Pexels/Pixabay source URLs, Lucide/Heroicons/Phosphor notices.

## Fonts

Apple-like here means neutral, high x-height, excellent spacing, and restraint. Avoid novelty display faces. Use one sans family plus a mono or second sans only if the page has product telemetry/counters.

| Pairing | Source | License | Why it fits |
|---|---|---|---|
| **Geist Sans + Geist Mono** | Vercel / Google Fonts | SIL OFL 1.1 | Crisp, product-engineering feel; closest free "modern system" option without copying SF Pro. |
| **Inter + Space Grotesk** | Google Fonts / upstream repos | SIL OFL 1.1 | Inter for body/system clarity; Space Grotesk for confident but restrained headings. |
| **Manrope + IBM Plex Mono** | Google Fonts | SIL OFL 1.1 | Slightly warmer geometric body; mono gives precision for metrics/proof blocks. |
| **Satoshi + General Sans** | Fontshare | ITF Free Font License | Premium startup look. Commercial use is free, but Fontshare license is not the same as OFL; read self-hosting/redistribution terms before bundling. |

Recommendation for Pam: **Geist Sans + Geist Mono** if the site is product-led; **Inter + Space Grotesk** if it needs more editorial punch.

## MIT-Licensed Landing Templates Worth Borrowing Structure From

Do not copy branding, copy, or visual identity. Borrow section sequencing and implementation patterns.

| Template | License | Why it is useful |
|---|---|---|
| [`mhyfritz/astro-landing-page`](https://github.com/mhyfritz/astro-landing-page) | MIT | Astro + Tailwind landing structure, simple static-first sections, low moving parts. Good if the marketing page should stay fast and deployable. |
| [`leoMirandaa/shadcn-landing-page`](https://github.com/leoMirandaa/shadcn-landing-page) | MIT | Strong SaaS section grammar: hero, logos, features, pricing/FAQ patterns. Useful for structure, but visually too template-like unless heavily restyled. |
| [`gonzalochale/saas-landing-template`](https://github.com/gonzalochale/saas-landing-template) | MIT | Modern Next/Tailwind/shadcn layout with production-style sections. Useful for spacing and component inventory. |
| [`arthelokyo/astrowind`](https://github.com/arthelokyo/astrowind) | MIT | Heavier but mature Astro/Tailwind marketing starter. Useful for sitemap/SEO/blog-ready structure, not for copying appearance. |

I checked `cruip/tailwind-landing-page-template`, but GitHub API did not report a license even though search snippets call it free. Do not borrow from it until license is verified from the repo itself.

## Proposed Stack

If Pam is making a one-off polished landing page:

- Framework: static HTML/CSS/JS or Astro if a separate marketing repo/site exists.
- Motion: Lenis + CSS transitions first; GSAP only for signature scroll scenes.
- Carousel: Swiper only if content really needs swiping.
- Icons: Lucide.
- Fonts: Geist Sans + Geist Mono, or Inter + Space Grotesk.
- Images: product screenshots/generated product art first; Unsplash/Pexels only for supporting scenes.
- Accessibility gate: reduced motion view, keyboard nav, no autoplay by default, no scrolljacking, content visible before animation JS loads.

## What Would Have To Be True For This To Be Wrong

- Pam is building in a React-only stack and needs component-level animation everywhere. Then Motion may replace GSAP for most interactions.
- The page requires complex pinned scroll narratives. Then GSAP + ScrollTrigger becomes justified despite the custom license.
- Legal requires OSI-approved open-source only. Then GSAP and unDraw are out; use Lenis, Motion, Swiper, Lucide/Heroicons/Phosphor, Google Fonts/OFL, and CC0/Pexels/Unsplash/Pixabay assets only after license review.
- The final visual target becomes playful rather than premium. Then Open Peeps/Humaaans become more appropriate.

## Sources

- Package/license/size checks: npm registry and Bundlephobia API for `lenis`, `gsap`, `motion`, `@motionone/dom`, `aos`, `locomotive-scroll`, `swiper`.
- GitHub API license checks: `darkroomengineering/lenis`, `greensock/GSAP`, `motiondivision/motionone`, `michalsnik/aos`, `locomotivemtl/locomotive-scroll`, `nolimits4web/swiper`, `lucide-icons/lucide`, `tailwindlabs/heroicons`, `phosphor-icons/core`, and listed templates.
- GSAP license/pricing: <https://gsap.com/community/standard-license/>, <https://gsap.com/pricing/>, <https://webflow.com/updates/gsap-becomes-free>
- GSAP reduced-motion docs: <https://gsap.com/resources/a11y/>, <https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/>
- Lenis docs/repo: <https://github.com/darkroomengineering/lenis>, <https://lenis.dev/>
- Locomotive Scroll docs: <https://scroll.locomotive.ca/>, <https://scroll.locomotive.ca/docs/>
- Swiper docs/license: <https://swiperjs.com/swiper-api>, <https://swiperjs.com/changelog>, <https://github.com/nolimits4web/swiper/blob/master/LICENSE>
- Reduced motion references: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion>, <https://www.w3.org/WAI/WCAG22/Techniques/css/C39>
- Asset licenses: <https://unsplash.com/license>, <https://www.pexels.com/license/>, <https://pixabay.com/service/license-summary/>, <https://pixabay.com/service/terms/>, <https://undraw.co/license>, <https://www.humaaans.com/>, <https://www.openpeeps.com/>, <https://lucide.dev/license>, <https://heroicons.com/>, <https://phosphoricons.com/>
- Font licenses: <https://github.com/rsms/inter>, <https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt>, <https://vercel.com/font>, <https://github.com/vercel/geist-font>, <https://www.fontshare.com/licenses/itf-ffl>, <https://fontshare.com/licenses/sil-ofl>, <https://fonts.floriankarsten.com/space-grotesk>
- Community scan: Reddit r/webdev thread "How is this website so smooth?", r/Frontend thread "Smooth scroll opinions?", r/nextjs thread "Locomotive Scroll or Lenis integration?", r/web_design thread "Is smooth (locomotive) scrolling ALWAYS bad UX design?", r/webdev thread "Looking for stunning Framer-style landing page templates".
