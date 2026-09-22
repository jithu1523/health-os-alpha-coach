# Mascot And Wake Moment Comps

Date: 2026-09-21  
Owner: DESIGNER Pam  
Scope: Visual direction only. Do not edit `alpha-coach.html`.

## Sources Checked

- `alpha-coach.html:17-94` for Grove and Ember tokens.
- `alpha-coach.html:270-310` for current mascot state CSS.
- `alpha-coach.html:847-888` for the inline SVG mascot geometry and arc structure.
- `alpha-coach.html:1763-1814` for wake-anchored schedule derivation.
- `alpha-coach.html:3279-3288` for the current wake gate.
- `alpha-coach.html:4948-4958` for the actual wake action and toast timing.
- `office/geometric-redesign-proposal.md` for prior calibrated-geometry direction.

Static comps:

- `office/design/mascot-milestone-states.svg`
- `office/design/wake-rederive-sequence.svg`

## Non-Negotiables For Jim

- Keep the existing inline SVG mascot geometry. Do not replace Ember with raster art, emoji, canvas, WebGL, or a new character.
- Use app tokens only in implementation: `var(--accent)`, `var(--lime)`, `var(--ember)`, `var(--surface)`, `var(--surface-2)`, `var(--ink)`, `var(--mascot-*)`.
- Keep motion to transform, opacity, and existing SVG stroke-dashoffset for arcs. Do not animate width, height, top, left, margin, padding, or path data.
- Respect `prefers-reduced-motion: reduce`. Reduced motion still shows the state change, but without travel, bounce, or looping.
- Make the current action the hero. The wake moment is not a celebration overlay; it is a clear cause-and-effect explanation.

## Palette Direction

Grove remains the default:

- Ground: `--bg`
- Main surface: `--surface`
- Action and arc fill: `--accent`
- Positive energy: `--lime`
- Warm caution/detail: `--ember`
- Mascot planes: `--mascot-body`, `--mascot-body-2`, `--mascot-line`, `--mascot-panel`, `--mascot-eye`, `--mascot-arc-off`

Ember uses the same layout and state behavior with its existing remapped tokens. Do not create separate Ember-only drawings.

## Mascot Milestone States

The five states should read as adherence feedback, not mood decoration. The app already has `reaction: idle | wake | cheer | concern | rest`; keep that API.

| State | Expression And Pose | Fires When | Motion | Reduced-Motion Static |
| --- | --- | --- | --- | --- |
| `idle` | Balanced stance, small smile, eyes open, arcs show current fuel/protein/meals. | Between actions, ordinary plan review, no urgent next step. | Existing slow breath and arc breath. No attention grab. | Neutral body, visible current arcs, no blinking loop. |
| `wake` | Body rises from rest, eyes open, arcs wake from quiet to current values. | After first tap on `I'm awake`, and after corrected wake time. | One 380 ms lift using `--ease-out`; top arc draws first, side arcs follow by 40-60 ms. | Body already lifted; arcs snap to current values; show a small "Plan rebuilt from 8:24" text confirmation. |
| `cheer` | Slight upward body, brighter eyes, arcs fully present. Keep it earned, not confetti-heavy. | On-time meal logged, reward unlock, streak saved, all planned actions completed. | 260-380 ms pop using transform/opacity only; no looping celebration after the first beat. | Static high pose with lime/accent emphasis on the earned arc. |
| `concern` | Small lean, mouth flattens, ember/accent warning arc. No red alarm, no shame face. | Late meal, schedule compression warning, missing inventory if inventory is on, meal cannot fit before bedtime. | Slow 260 ms lean in; no shake. Concern is guidance, not scolding. | Static lean with text explaining the recoverable next action. |
| `rest` | Lids down, body settled lower, arcs quiet but still readable. | Before day starts, after bedtime, completed day recap. | Existing slower breath is acceptable; no busy loop. | Lids down, no movement, current or final arcs remain visible. |

## Mascot Arc Semantics

Keep three arcs and make their meaning explicit in implementation comments and labels:

- Top arc: fuel or kcal progress toward target.
- Left arc: protein progress toward target.
- Right arc: meal rhythm or adherence completion for the day.

For accessibility, keep the current `aria-label` pattern: "Coach mascot, wake state, fuel 42 percent, protein 18 percent, meals 0 percent." The user should never need color vision to understand the state; pair any warning with nearby copy.

## Onboarding Wake Moment

Goal: show that tapping `I'm awake` re-derives the whole plan from the actual timestamp.

The beat should be one compact sequence:

1. **Tap cause.** The `I'm awake` button responds immediately with press feedback. The button stays the visual source.
2. **Anchor appears.** Replace the generic gate message with a focused anchor chip: `Wake 8:24`. The mascot uses `wake`.
3. **Plan redraws.** Meal rows transition from ghost/placeholder times to derived times as one grouped redraw: breakfast, lunch, dinner. Use a 30-50 ms stagger only if it does not delay interaction.
4. **Next action locks.** The first meal row becomes the hero row. The confirmation toast says the same fact the screen shows.

The screen should answer, in order:

- "What did I just do?" Wake timestamp set.
- "What changed?" All meal times recalculated.
- "What should I do next?" First meal time and meal name.

## Motion Spec

Use existing app motion tokens:

- Press feedback: `--d-1` 140 ms.
- State transition: `--d-2` 260 ms.
- Onboarding entrance/redraw: `--d-3` 380 ms.
- Easing: `--ease-out` for arriving elements, `--ease` for quiet background breathing.

Motion choreography:

- Button press: subtle `scale(.97)` while pressed, then release.
- Wake anchor: opacity in plus `translate3d(0, 8px, 0)` to `translate3d(0, 0, 0)`.
- Meal rows: old ghost rows fade to opacity 0; new rows fade/translate in from 8 px below. Do not animate row height.
- Arcs: update `stroke-dashoffset` to current progress. This is already how the mascot works.
- Toast: keep current 260 ms delay if implementation needs the render to land first; do not add an extra spinner for a local calculation.

Avoid:

- Full-screen celebration.
- Confetti.
- Infinite recalculation loop.
- Timeline scrubbers.
- Any fake "AI thinking" or invented numbers.

## Reduced-Motion Fallback

When `prefers-reduced-motion: reduce` is active:

- Do not move the mascot, rows, or cards.
- Crossfade opacity only if needed for comprehension.
- Show the same final facts immediately: `Wake 8:24`, derived meal times, first meal hero row.
- Keep the toast or inline confirmation. The user still needs feedback.

## Implementation Notes For Jim

This is a design handoff, not app code. Suggested integration shape:

- Reuse existing `Mascot({ reaction, progress })`.
- Add a short-lived UI flag such as `S.ui.justWokeAt` or equivalent only if needed for the first render beat.
- Do not persist animation state as product data.
- Use existing `ACT.wake()` data flow: `blankDay(ts)`, `activeDay`, `save()`, `render()`, `nextRow()`.
- The recalculation display should be derived from `sched()` or `activeRows()`, not a separate copied schedule.
- If a corrected wake time is entered later, reuse the same visual language at a smaller scale: anchor chip changes, rows redraw, toast confirms.

## Skill Application

- `apple-design`: direct feedback on tap, visible cause and effect, spatial continuity from button to wake anchor to rows, reduced-motion fallback.
- `emil-design-eng`: every animation has a purpose; UI motion stays under 300 ms except the rare onboarding explanatory beat at `--d-3`; no `scale(0)`, no `transition: all`.
- `ui-ux-pro-max`: touch target/feedback, no hover-only behavior, no flashing loading state for a near-instant local recalculation, text confirmation alongside visual state.
- `improve-animations`: recon confirmed current conventions: CSS tokens, transform/opacity motion, stroke-dashoffset arcs, and reduced-motion handling. This comp extends those conventions instead of inventing a parallel system.

## Acceptance Checklist

- Grove and Ember both work through the same token names.
- 375 px width has no horizontal scroll and the first meal hero remains visible after wake.
- Reduced motion shows the final facts without travel.
- Screen reader receives a meaningful mascot label and a confirmation status/toast.
- No app invariant changes: wake anchors schedule, inventory stays optional, and no food is pushed into the night.
