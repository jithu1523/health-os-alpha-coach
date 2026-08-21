# Premium Web Craft For Marketing V2

Author: researcher Oscar (hive)  
Date: 2026-08-20  
Status: proposed - feeds Pam's marketing website V2

## Decision

The V2 marketing page should stop trying to look "impressive" through generic gradients and big cards. It should feel expensive through **restraint, depth, real interactive product metaphors, and motion that explains state**.

Build a premium one-page experience around:

- One restrained visual system derived from Alpha Coach Grove/Ember, not a rainbow tech gradient.
- A real interactive SVG progress ring as the central product metaphor.
- An interactive vector mascot that reacts to cursor/scroll/state, not a static PNG.
- Layered elevation and optical detail: hairline borders, soft inner shadows, controlled blur, glass only where it has a spatial job.
- Lenis + Motion as the default open-source motion stack; Three.js/Pixi.js only for one hero-grade interactive scene if Pam wants the page to feel truly bespoke.

## Reference-Class Sites

These observations are my visual/product-design inference from the linked public sites, supported by official pages where available.

| Site | What reads expensive | What Pam should borrow |
|---|---|---|
| [Linear](https://linear.app/) | Dense product UI is staged like an artifact, not a screenshot dump. Dark surfaces use low-contrast layers, tiny labels, timeline/issue details, and precise motion around product workflows. Linear also writes explicitly about craft and quality as product inputs. | Use the actual Alpha Coach mechanics as artifacts: wake anchor, meal schedule, points ledger, ring, mascot. Let UI detail sell the product instead of generic lifestyle copy. |
| [Stripe](https://stripe.com/) | Strong spatial hierarchy: headline, product surfaces, financial primitives, and motion that demonstrates infrastructure. Stripe's own front-end post emphasizes using native Web Animations API for most UI animation and keeping custom animation small. | Use one high-confidence animated hero system, not animation everywhere. Make every animated element explain "adaptive day planning" or "honest estimate confirmation." |
| [Vercel](https://vercel.com/) / [Geist](https://vercel.com/geist/introduction) | Monochrome precision, sharp typography, minimal chrome, and code/product artifacts. Geist frames itself around simplicity, minimalism, speed, precision, clarity, and functionality. | If the page feels busy, delete. Use whitespace, one dominant type scale, one accent, and precise component spacing. |
| [Framer](https://www.framer.com/) | Big canvas-first interactions, site previews, smooth transitions, and an editorial rhythm that shows the tool by using the tool. | Put the product's interaction in the page: hover/scroll changes the ring, meal cards, or mascot state. Avoid static screenshots in floating mockup cards. |
| [Apple](https://www.apple.com/) / [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Product first, large negative space, extremely disciplined copy, optical typography, and motion that conveys status/feedback rather than decoration. | Lead with "Alpha Coach" and the living schedule/ring. Keep copy short. Use motion to reveal cause and effect: wake time -> schedule -> log -> points. |
| [Rivian](https://rivian.com/) | High-quality real photography, tactile materials, environmental depth, and confident pacing. It feels premium because the product is physically present. | If using imagery, show a real phone/product moment or generated product render with inspectable detail, not abstract blobs. |
| [Arc](https://arc.net/) / Browser Company style | Opinionated product personality, playful but intentional interactions, and asymmetric editorial layout. | The mascot can add personality, but it must be rigged and responsive; otherwise it reads like clip art. |

## Open-Source Toolkit

Package sizes are planning estimates from npm/Bundlephobia checks on 2026-08-20.

| Tool | License | Size signal | Use when | Perf / degradation |
|---|---|---:|---|---|
| [Lenis](https://github.com/darkroomengineering/lenis) | MIT | 18.8 kB / 5.5 kB gzip | Smooth scrolling and scroll-linked polish. | Keep native content order; disable all scroll smoothing under `prefers-reduced-motion`. Current Lenis docs say it respects reduced motion. |
| [Motion](https://motion.dev/) | MIT | 135.7 kB / 45.3 kB gzip | Component entrances, hover/tap feedback, spring timing, scroll progress transforms. | Use `useReducedMotion`; prefer transform/opacity; no layout-thrashing animation. |
| [Three.js](https://threejs.org/) | MIT | 725.9 kB / 182.4 kB gzip for package entry | One real 3D product object/scene: phone, ring, meal cards in depth. | Lazy-load only after hero becomes visible; static SVG/PNG fallback; stop render loop when offscreen. |
| [Pixi.js](https://pixijs.com/) | MIT | 881.2 kB / 251.3 kB gzip for package entry | 2D mascot rig, particle-light texture, canvas vector scene where SVG gets too complex. | Use only if SVG rig cannot hit the interaction quality; lazy-load; cap DPR; pause when hidden. |
| Native SVG/canvas | Web platform | 0 dependency | Progress ring, line reveals, mask effects, reactive mascot parts. | Best default. Works without JS if values are rendered into CSS variables/attributes. |
| Web Animations API | Web platform | 0 dependency | Small imperative effects outside React. | Stripe has used this pattern for small animation payloads; good for precise but lightweight UI motion. |

Do not treat Pixi/Three as banned here. The no-Pixi concern is app-specific; this hosted marketing page can use them if the interaction is worth the cost and degrades cleanly.

## Interactive Components

### Animated Progress Ring

Use SVG first:

- Draw separate arcs for fuel/protein/discipline using `<circle>` or `<path>`.
- Set `pathLength="1"` and animate `stroke-dashoffset` from `1` to `1 - progress`.
- Add a subtle leading cap/dot that follows the active arc.
- Bind scroll progress or cursor x-position to preview different day states.
- On reduced motion, render the final state with no sweep animation.

Implementation shape:

```text
svg ring
  track paths: low-alpha neutral strokes
  value paths: Grove green / Ember ember / protein accent
  CSS vars: --fuel, --protein, --discipline
  interaction: hover card -> ring morphs to that meal's contribution
```

Why it works: MDN documents `stroke-dashoffset` as the offset for SVG dash rendering, which is exactly the ring-fill mechanism. This gives premium motion with almost no dependency cost.

### Interactive Vector Mascot

Use SVG rig first; escalate to Pixi only if SVG becomes brittle.

SVG rig:

- Group head/body/eyes/mouth/arms/shadow as named `<g>` layers.
- Cursor x/y drives eye pupil translation and 1-2 degree head tilt.
- Scroll section changes state: idle -> awake -> planning -> cheer -> concern.
- Mouth is a small path swap, not a bitmap.
- Discipline/fuel/protein states color the ring around the mascot, not the whole character.

Pixi rig:

- Use if the mascot needs particles, soft physics, or many tiny moving parts.
- Keep the model 2D vector-like; no random glowing particles unless they map to product state.
- Disable on reduced motion and show the SVG state frame.

## Kill The AI-Generated Look

Signals that read "AI slop":

- Rainbow gradients with no relationship to the app.
- Every section in a rounded card.
- Fake dashboards full of invented numbers.
- Decorative blobs, orbs, bokeh, and glass layers that do not define depth.
- Centered hero plus generic "AI-powered" headline.
- Repeated icon cards with identical shadows.
- Motion that moves because it can, not because state changed.

Signals that read designed:

- One accent system derived from Alpha Coach tokens: Grove green/fuel, Ember warmth, disciplined neutral surfaces.
- Real product artifacts: wake timestamp, schedule compression, food confirmation, points ledger, estimate labels.
- Layered depth: background band, product surface, ring/mascot foreground, hairline highlight, soft shadow. No cards inside cards.
- Intentional asymmetry: hero ring offset, copy aligned to a precise grid, next section peeking into the first viewport.
- Typography that fits its role: hero-scale only for the brand/value, compact type for product UI.
- Motion language with rules: reveal once, respond on hover, scrub on scroll, stop under reduced motion.

## Actionable Spec For Pam

First viewport:

- Full-bleed product scene, not a split card layout.
- H1: **Alpha Coach**.
- Supporting copy: one sentence about planning around the day you actually woke up.
- Centerpiece: interactive SVG ring + vector mascot, with real labels for Fuel / Protein / Discipline.
- Behind it: a quiet schedule strip showing wake -> meals -> bedtime compression.
- Keep a visible hint of the next section below the fold.

Section sequence:

1. **Hero:** ring/mascot interaction demonstrates "wake time changes the day."
2. **Honesty proof:** "ateAt, not loggedAt" shown as a mini timeline; this differentiates the product and avoids fake AI claims.
3. **Adaptive plan:** meal cards slide into a compressed but safe schedule; when they no longer fit, the UI says so instead of pushing into the night.
4. **Food logging:** show photo/barcode/manual as opt-in estimate paths, always ending in confirmation.
5. **Discipline:** points ledger as an append-only artifact; show reversal entry honestly.
6. **CTA:** quiet, product-led, no giant gradient button.

Motion rules:

- One scroll-linked sequence: wake -> schedule -> ring.
- One hover interaction: meal card updates ring/mascot expression.
- One microinteraction: CTA or "I'm awake" button has tactile response.
- Reduced motion: all end states visible, no parallax, no continuous animation.

Color:

- Grove page: near-white / ink / green accent / warm amber status.
- Ember page: near-black / off-white / ember accent / muted green status.
- No purple-blue hero gradient unless it comes from an actual product scene.

## What Would Have To Be True For This To Be Wrong

- The marketing site is not hosted and must remain one self-contained file with no lazy-loaded assets. Then use SVG/CSS only and skip Pixi/Three.
- Pam has a full visual brand direction from the human that intentionally rejects Grove/Ember. Then derive the system from that instead.
- The target is playful consumer virality rather than premium trust. Then the mascot can take more space and the site can loosen, but it should still avoid fake numbers and generic AI visuals.

## Sources

- Reference sites: <https://linear.app/>, <https://stripe.com/>, <https://vercel.com/>, <https://www.framer.com/>, <https://www.apple.com/>, <https://rivian.com/>, <https://arc.net/>
- Linear craft/method: <https://linear.app/now/why-is-quality-so-rare>, <https://linear.app/method>
- Vercel design/Geist: <https://vercel.com/design>, <https://vercel.com/geist/introduction>, <https://vercel.com/font>
- Apple HIG: <https://developer.apple.com/design/human-interface-guidelines>, <https://developer.apple.com/design/human-interface-guidelines/motion>, <https://developer.apple.com/videos/play/wwdc2020/10175/>
- Stripe front-end animation: <https://stripe.com/blog/connect-front-end-experience>
- Toolkit docs/licenses: <https://github.com/darkroomengineering/lenis>, <https://motion.dev/>, <https://threejs.org/>, <https://github.com/mrdoob/three.js/>, <https://pixijs.com/>, <https://github.com/pixijs/pixijs>
- SVG/reduced-motion references: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/stroke-dashoffset>, <https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dashoffset>, <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion>, <https://www.w3.org/WAI/WCAG22/Techniques/css/C39>
