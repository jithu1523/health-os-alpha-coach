# Geometric redesign proposal

Date: 2026-08-20  
Owner: DESIGNER Pam  
Scope: Graphics, mascot, and overall look. Proposal only; no changes to `alpha-coach.html`.

## Direction

Use a sharper "calibrated geometry" direction: still calm and minimal, but built from clean planes, measured arcs, clipped corners, and consistent stroke geometry.

What changes:

- Cards keep the current soft product feel, but the shape language becomes more intentional: large surfaces use `--r-lg`, controls use `--r-md`, tiny chips use capsule geometry only when they are status/filter controls.
- Hero areas get one geometric anchor: an angled progress rail, an arc cluster, or the mascot, never all three at once.
- Decorative graphics are token-driven SVG primitives: rings, stepped rails, faceted panels, and small diagonal notches. No raster art, no stock imagery, no gradient-orb decoration.
- Grove and Ember keep identical layout/type. Color comes only from semantic tokens such as `var(--accent)`, `var(--lime)`, `var(--surface-2)`, `var(--ink)`, and new mascot-specific CSS variables mapped per theme.
- The current action remains the hero. Geometry supports scanning; it does not add a second visual headline.

Do not copy:

- Hard 90-degree brutalism. It fights the coaching tone.
- WebGL/canvas mascot rendering. It loses the inline-SVG accessibility and future Rive port path.
- Full-screen decorative motion. Alpha Coach is a daily-use tool, not a showpiece.

## Token refinements

Add theme-mapped mascot and geometry tokens near the existing palette tokens:

```css
:root{
  --geo-corner:18px;
  --geo-cut:polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  --geo-stroke:1.7;
  --mascot-body:var(--peach);
  --mascot-body-2:var(--surface-2);
  --mascot-line:var(--accent-ink);
  --mascot-panel:var(--ink-2);
  --mascot-eye:var(--lime);
  --mascot-arc-off:var(--line-2);
}
html[data-theme="ember"]{
  --mascot-body:var(--peach);
  --mascot-body-2:var(--surface-2);
  --mascot-line:var(--accent-ink);
  --mascot-panel:var(--ink-2);
  --mascot-eye:var(--lime);
  --mascot-arc-off:var(--line-2);
}
```

The mascot can still use JS constants, but those constants should resolve to CSS variables inside SVG attributes. That keeps both palettes live without rewriting the SVG per theme.

## Overall CSS shape language

```css
.geo-panel{
  border:1px solid var(--line);
  border-radius:var(--r-lg);
  background:var(--surface);
  box-shadow:var(--shadow);
  position:relative;
  overflow:hidden;
}
.geo-panel::before{
  content:"";
  position:absolute;
  inset:0;
  clip-path:var(--geo-cut);
  border:1px solid var(--accent-line);
  opacity:.5;
  pointer-events:none;
}
.geo-rail{
  height:8px;
  border-radius:999px;
  background:var(--surface-2);
  overflow:hidden;
}
.geo-rail > i{
  display:block;
  height:100%;
  border-radius:inherit;
  background:var(--accent);
  transform-origin:left center;
  transform:scaleX(var(--p,0));
  transition:transform var(--d-3) var(--ease-out);
}
.geo-notch{
  clip-path:var(--geo-cut);
}
```

Use this on hero/stat surfaces only. Repeated meal cards should stay quieter, with the notch reserved for due/current states.

## Mascot redesign

Name: Ember, retained as a flat 2D inline SVG.

Shape:

- Head becomes a faceted rounded pentagon: one asymmetric chipped corner, two recessed geometric eye slots, one simple mouth path.
- Torso becomes a softened trapezoid with a single diagonal sash. No gradients on the body.
- Hands remain oversized and friendly, but become rounded polygon pads rather than organic blobs.
- Legs become two short tapered blocks with stable grounded feet.
- All paths use filled planes plus tokenized strokes; no body gradients, filters, or canvas effects.

SVG skeleton:

```html
<svg class="mascot m-idle" width="200" viewBox="0 0 300 380" fill="none"
  xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your wellness companion">
  <g class="m-arc m-arc--fuel live" style="--arc-p:.72">
    <path class="arc-bg" pathLength="1" d="M38 136A124 124 0 0 1 262 136"/>
    <path class="arc-fg" pathLength="1" d="M38 136A124 124 0 0 1 262 136"/>
  </g>
  <g class="m-arc m-arc--protein live" style="--arc-p:.48">
    <path class="arc-bg" pathLength="1" d="M28 222A108 108 0 0 1 38 158"/>
    <path class="arc-fg" pathLength="1" d="M28 222A108 108 0 0 1 38 158"/>
  </g>
  <g class="m-arc m-arc--discipline live" style="--arc-p:.86">
    <path class="arc-bg" pathLength="1" d="M272 222A108 108 0 0 0 262 158"/>
    <path class="arc-fg" pathLength="1" d="M272 222A108 108 0 0 0 262 158"/>
  </g>

  <ellipse class="m-ground" cx="150" cy="356" rx="76" ry="7"/>
  <g class="m-body">
    <path class="m-leg m-leg-a" d="M112 236h34l-7 94c-.6 9-6 14-16 14s-16-5-15-14l4-94Z"/>
    <path class="m-leg m-leg-b" d="M154 236h34l4 94c1 9-5 14-15 14s-15.4-5-16-14l-7-94Z"/>
    <path class="m-foot" d="M96 330h44v14H90l6-14Z"/>
    <path class="m-foot" d="M160 330h44l6 14h-50v-14Z"/>
    <path class="m-torso" d="M150 122c-28 0-48 13-54 36l-12 62c-3 17 7 29 24 29h84c17 0 27-12 24-29l-12-62c-6-23-26-36-54-36Z"/>
    <path class="m-sash" d="M98 150l100 44-5 18-96-44 1-18Z"/>
    <path class="m-arm m-arm-a" d="M98 148c-16 9-24 22-27 39l-8 45c-2 10 5 17 15 17 9 0 15-6 17-16l12-69-9-16Z"/>
    <path class="m-arm m-arm-b" d="M202 148c16 9 24 22 27 39l8 45c2 10-5 17-15 17-9 0-15-6-17-16l-12-69 9-16Z"/>
    <path class="m-hand" d="M62 239c-15 0-25 10-25 25 0 18 12 31 30 31 15 0 26-9 26-24 0-20-11-32-31-32Z"/>
    <path class="m-hand" d="M238 239c15 0 25 10 25 25 0 18-12 31-30 31-15 0-26-9-26-24 0-20 11-32 31-32Z"/>
    <path class="m-neck" d="M130 105h40v24h-40z"/>
    <path class="m-head" d="M143 31c32-5 55 15 57 42 2 28-22 45-50 45-29 0-49-19-49-43 0-25 17-40 42-44Z"/>
    <path class="m-chip" d="M178 28l20 16-14 17-15-18 9-15Z"/>
    <path class="m-eye" d="M116 75l18-9 19 8-18 10-19-9Z"/>
    <path class="m-eye" d="M165 74l19-8 18 9-19 9-18-10Z"/>
    <path class="m-lid" d="M116 75l18-9 19 8-18 10-19-9Z"/>
    <path class="m-lid" d="M165 74l19-8 18 9-19 9-18-10Z"/>
    <path class="m-mouth" d="M139 98c8 5 22 5 30-1"/>
  </g>
</svg>
```

Mascot CSS:

```css
.mascot{display:block;overflow:visible}
.m-ground{fill:var(--ink);opacity:.07}
.m-body{transform-origin:50% 92%;animation:mascotBreath 5.6s var(--ease) infinite}
.m-head,.m-arm,.m-hand{fill:var(--mascot-body);stroke:var(--mascot-line);stroke-width:1.7}
.m-torso,.m-leg,.m-foot{fill:var(--mascot-body-2);stroke:var(--mascot-line);stroke-width:1.7}
.m-sash,.m-chip{fill:var(--mascot-panel)}
.m-neck{fill:var(--mascot-line)}
.m-eye{fill:var(--mascot-eye);stroke:var(--mascot-line);stroke-width:1.7}
.m-mouth{stroke:var(--mascot-line);stroke-width:2.4;stroke-linecap:round}
.m-lid{fill:var(--mascot-line);transform-box:fill-box;transform-origin:center;transform:scaleY(0);animation:mascotBlink 7.5s infinite}
.m-arc{transform-origin:150px 190px}
.m-arc path{fill:none;stroke-linecap:round;stroke-width:11}
.m-arc .arc-bg{stroke:var(--mascot-arc-off);opacity:.9}
.m-arc .arc-fg{stroke:var(--accent);stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--arc-p))}
.m-arc.live{animation:arcBreath 5.6s var(--ease) infinite}
.m-arc--protein.live{animation-delay:.3s}
.m-arc--discipline.live{animation-delay:.6s}
@keyframes mascotBreath{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(0,-4px,0) scale(1.012)}}
@keyframes arcBreath{0%,100%{opacity:.62;transform:scale(.97)}50%{opacity:1;transform:scale(1.018)}}
@keyframes mascotBlink{0%,93%,100%{transform:scaleY(0)}96%{transform:scaleY(1)}}
@media (prefers-reduced-motion: reduce){
  .m-body,.m-arc.live,.m-lid{
    animation:none;
    transform:none;
  }
  .m-arc.live{
    opacity:1;
  }
}
```

## Five states

`idle`

- Body breathes on the existing 5.6s rhythm.
- Arcs breathe with phase offsets.
- Eyes blink occasionally.
- Use when the app is waiting, neutral, or showing ordinary progress.

`wake`

```css
.m-wake .m-body{animation:mascotWake 900ms var(--ease-out) both, mascotBreath 5.6s var(--ease) 900ms infinite}
@keyframes mascotWake{from{transform:translate3d(0,14px,0) scale(.96);opacity:.7}to{transform:none;opacity:1}}
```

- Use after "I'm awake".
- Geometry rises from grounded, not bouncy.

`cheer`

```css
.m-cheer .m-body{animation:mascotCheer 700ms var(--ease-out) both, mascotBreath 5.6s var(--ease) 700ms infinite}
@keyframes mascotCheer{0%{transform:none}38%{transform:translate3d(0,-12px,0) scale(1.03)}72%{transform:translate3d(0,2px,0) scale(.995)}100%{transform:none}}
.m-cheer .m-arc .arc-fg{opacity:1}
```

- Use for logged meal, reward unlock, day-complete.
- No confetti dependency required; pair with existing SVG spark primitives if needed.

`concern`

```css
.m-concern .m-body{animation:mascotLean 2.8s var(--ease) infinite}
@keyframes mascotLean{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-1.5deg) translate3d(-2px,0,0)}}
.m-concern .m-mouth{transform:translate3d(0,2px,0) scaleY(.75)}
```

- Use for late, inventory warning, or schedule compression warning.
- Motion is slow and quiet; no alarm state.

`rest`

```css
.m-rest .m-body{animation:mascotBreath 8.4s var(--ease) infinite}
.m-rest .m-lid{transform:scaleY(1);animation:none;opacity:.86}
.m-rest .m-arc.live{animation-duration:8.4s}
```

- Use after bedtime or completed day.
- Breathing slows; arcs remain visible as context.

All states remain transform/opacity only. Mouth/lid changes should be implemented by toggling classes or fixed final transforms, not by animating path data.

## Three-arc breathing and progress system

The arcs keep the existing dual role: breathing guide plus day progress.

Recommended mapping:

- Top arc: fuel/kcal completion toward target.
- Left arc: protein completion toward target.
- Right arc: discipline rhythm, derived from meal timing plus planned actions completed.

Rendering:

- Use `pathLength="1"` and `stroke-dashoffset` from CSS variables or inline style.
- Filled progress is always `var(--accent)`.
- Empty progress is `var(--mascot-arc-off)`.
- Breathing affects the arc group transform and opacity only, never stroke geometry.
- For reduced motion, arcs render static at the current progress values.

## Motion approach

Use pure CSS for this redesign.

Reason:

- The current app already has the right animation architecture: CSS tokens, requestAnimationFrame-batched renders, and `prefers-reduced-motion`.
- The requested geometry needs state changes, breathing, press feedback, and small entrances. CSS handles all of that with transform/opacity and no runtime dependency.
- `file://` and offline use stay intact. A CDN animation library would need a failure path; pure CSS has no network failure mode.

Do not add Motion.dev for the first geometric pass. If Jim later needs interruptible timeline choreography across multiple screen elements, propose a tiny inline helper before using CDN. Keep any helper enhancement-only and never required for render.

## PIXI

Do not use PIXI for mascot or UI.

I do not recommend PIXI for any part of this proposal. The desired look is crisp SVG geometry, and the app benefits from DOM accessibility, theming through CSS variables, and a future Rive port path. PIXI would only be worth proposing for an isolated, optional day-complete celebration if the product later needs hundreds of particles or shader effects. This redesign does not.

## Integration notes for Jim

- Replace the mascot constants with CSS-variable-backed SVG fills/strokes instead of hardcoded body colors.
- Keep `reaction: idle | wake | cheer | concern | rest`.
- Keep `arcs` support, but consider moving from binary arc-on/off to numeric progress values when the data is available.
- Do not change type roles.
- Do not add npm dependencies.
- Run normal suites after integration: `npm test` and `npm run test:boot`.

## QA checks after integration

- Grove and Ember both show the same layout and readable mascot contrast.
- `prefers-reduced-motion: reduce` leaves the mascot static and screens usable.
- Mascot states render from `file://` while offline.
- No body gradients, canvas, or WebGL are introduced.
- All icon-only controls retain accessible labels and focus rings.
- Mobile widths around 375px have no horizontal scroll and no clipped text.
