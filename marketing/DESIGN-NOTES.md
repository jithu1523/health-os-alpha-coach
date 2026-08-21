# Alpha Coach Marketing Site V2 - Design Notes

## Source Of Truth

- V2 is rebuilt from the app's actual visual system, not generic landing-page styling.
- The Grove and Ember palette tokens were pulled from `alpha-coach.html`; the site also keeps a dark theme for review.
- The hero mascot is a port of the app's inline SVG mascot: same head paths, body structure, five state classes, breathing/blink states, and `.m-arc--fuel`, `.m-arc--protein`, `.m-arc--discipline` progress arcs.
- The day rings are real SVG progress rings using `pathLength="1"`, `stroke-dasharray`, and `stroke-dashoffset`, matching the app's ring implementation pattern. No ring PNG remains.

## Type System

- Display: `--f-display` uses Unbounded for the product name, section heads, times, and high-signal numbers.
- Talk: `--f-talk` uses Cabinet Grotesk for coaching copy.
- UI: `--f-ui` uses Plus Jakarta Sans for navigation, buttons, labels, and body scaffolding.
- Letter spacing is fixed at `0` across authored CSS to avoid compressed, template-like typography.

## Motion And Interaction

- No third-party animation library is used.
- Motion is transform/opacity/stroke-dashoffset based and runs through CSS transitions, CSS keyframes, `IntersectionObserver`, and `requestAnimationFrame`-batched scroll updates.
- The mascot reacts to pointer movement with eye tracking and stage parallax. Hovering the stage fills the mascot arcs and shifts the mascot into `cheer`.
- The state dock lets reviewers test idle, wake, cheer, concern, and rest states from the ported app state classes.
- `prefers-reduced-motion: reduce` disables animation, parallax, scroll smoothing, and reveals.

## Layout Rationale

- Hero: a layered premium product stage replaces the V1 phone mockup. It combines app-derived rings, the real vector mascot, the derived schedule, and an honesty callout in one first-viewport composition.
- Real day: three high-depth proof cards explain wake anchoring, ate-at separation, and night compression boundaries.
- Kitchen: a visible stock-forced swap example shows the original, missing quantity, replacement, and reason without implying inventory is required.
- Product promise: app-like cards show the current action and numbers with units/targets.
- Honesty: the dark trust band turns the invariants into the marketing argument without fake metrics, testimonials, or press.

## Research Fold-In

- Oscar's `marketing-site-toolkit.md` recommends a small motion stack and flags GSAP as not MIT/OSI open-source.
- `office/research/premium-web-craft.md` landed after the concrete port was underway; V2 was checked against it before handoff. The page follows its core direction: real product artifacts, app-derived SVG rings, interactive vector mascot, restrained Grove/Ember tokens, controlled depth, visible next-section hint, no fake dashboards, and no generic rainbow gradient treatment.
- I stayed dependency-free instead of adding Lenis, Motion, Swiper, Pixi, or Three because the required effects are achievable with native SVG/CSS/JS and this keeps licensing and performance cleaner.

## Responsiveness

- The stage collapses into stacked preview panels below 620px and is verified at 375px.
- Both light and dark themes are available through `?theme=light`, `?theme=dark`, and the theme toggle. Ember is also available through `?theme=ember`.
