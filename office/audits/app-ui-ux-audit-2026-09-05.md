# Alpha Coach App UI/UX Audit - 2026-09-05

Scope: `alpha-coach.html`, the shipped single-file offline app. The audit used the local Alpha skills plus Impeccable, ui-ux-pro-max, apple-design, emil-design-eng, and review-animations. Evidence included baseline suites, Impeccable detector output before edits, and two independent subagent assessments.

Verification:
- Baseline before edits: `npm test` PASS 207; `npm run test:boot` all 13 boot paths render.
- Final: `C:\Program Files\nodejs\node.exe test\verify.mjs` PASS 216.
- Final: `C:\Program Files\nodejs\node.exe test\boot.mjs` all 13 boot paths render.
- Final syntax parse: one inline script parsed cleanly.
- Impeccable detector rerun was attempted, but the engine download failed checksum verification. Local static checks confirmed no `repeating-linear-gradient`, no `.typing i` infinite animation, no `transition: all`, and no `scale(0)`.

## AUDIT FINDINGS

### REMOVE

1. Remove icon-only mobile navigation as the only mobile route to core destinations.
   Why: at 375px the rail disappears and the tab labels were hidden, while `Points`, `Progress`, `Train`, `Supplements`, `Settings`, `Preferences`, and `Use what I have` had no direct mobile destination. This is a P1 information-architecture failure.

2. Remove stock and deduction controls from the meal confirmation when inventory is off.
   Why: inventory ships off by invariant. Showing "In stock", quantity inputs, shortage copy, and "Log without changing inventory" while inventory is disabled made an optional feature feel active and created false expectations.

3. Remove the direct destructive reset from Settings.
   Why: "Reset all data" was a one-click `wipe` action. Destructive actions need a stronger exit and confirmation.

4. Remove the infinite typing-dot animation.
   Why: the detector flagged it and the motion was not carrying enough product value to justify perpetual animation. Static staggered dots preserve the state without motion debt.

5. Remove the generated repeating-stripe placeholder from empty weekly bars.
   Why: the stripe texture was decorative, detector-flagged, and not semantically useful. A quiet dashed empty bar is simpler and clearer.

### KEEP

1. Keep the single-file offline architecture.
   Why: the app's core promise is one self-contained file with no build step, no server, and no new runtime dependency. The audit found no reason to add Motion, Dialkit, CDN assets, or a bundler.

2. Keep wake-first planning and `ateAt` scheduling language.
   Why: the app's strongest UX is that it asks when the day actually starts, then derives the plan from that fact. Existing eat-time copy supports invariant 1 and stayed intact.

3. Keep transparent stock replacement behavior.
   Why: the current replacement flow shows missing items, reasoning, and escape paths. That matches invariant 4 and should not be visually "simplified" away.

4. Keep the Grove/Ember visual identity and mascot/ring system.
   Why: the app has a specific, authored visual language. The audit issue is density and access, not lack of identity.

### CHANGE

1. Change mobile navigation to expose secondary tools through a real route.
   Why: a five-item bottom nav should stay focused, but hidden secondary screens need a reachable place.

2. Change keyboard focus coverage for custom controls.
   Why: `.btn` had focus-visible styling, but custom chips, checkboxes, icon buttons, nav items, modal close buttons, link buttons, and card buttons did not consistently show keyboard focus.

3. Change mobile tap targets for compact controls.
   Why: several controls rendered below the 44px mobile touch target: `.btn.sm`, `.btn.xs`, `.chip`, `.iconbtn`, `.qbtn`, `.modal-x`, and `.chk`.

4. Change body text from 15px to 16px.
   Why: ui-ux-pro-max and mobile app heuristics favor a 16px base for readable body text. This was a low-risk global readability fix after the suites stayed green.

5. Change inventory-off confirmation behavior to enforce no-deduct in code, not just copy.
   Why: removing controls is not enough. The action path must also avoid inventory consumption while `invOn()` is false.

6. Change first-run/preferences option walls in a later interaction pass.
   Why: onboarding step 3 and preferences contain very large button/chip sets. A safe fix likely needs grouping, search, or progressive disclosure and should be designed as a distinct flow.

7. Change font strategy only with human sign-off.
   Why: Impeccable flagged Plus Jakarta Sans as overused, but typography is tied to the existing Grove/Ember identity. Swapping fonts in an offline single-file app is a subjective visual decision and may add asset/legal work.

## FIXED

1. `alpha-coach.html` CSS base: body `15px` -> `16px`; global `button` gained `touch-action: manipulation`; `.main` gained bottom scroll padding.

2. `alpha-coach.html` focus states: focus-visible ring coverage expanded from mostly `.btn` and inputs -> nav, tabs, chips, icon buttons, custom checkboxes, modal close, link buttons, chat FAB, hero note, and action cards.

3. `alpha-coach.html` touch targets: `.chk` changed from 24x24 -> 44x44. On mobile, compact buttons/chips/icon controls now compute to at least 44px high, and square icon controls also get 44px min width.

4. `alpha-coach.html` motion: `.typing i` changed from infinite animated dots -> static staggered-opacity dots.

5. `alpha-coach.html` empty chart styling: repeating diagonal stripe gradient -> quiet surface fill with dashed border.

6. `alpha-coach.html` mobile IA: `TABS` changed from `today/prep/inventory/shop/coach` with hidden labels -> `today/prep/inventory/coach/more` with visible compact labels. `More` is registered in migration and rendering.

7. `alpha-coach.html` More screen: added `ScreenMore()` with links to Shopping, Discipline, Use what I have, Supplements, Train, Progress, Preferences, and Settings.

8. `alpha-coach.html` inventory-off confirmation: meal confirmation now shows time-only copy when kitchen tracking is off and `confirmEat()` forces `noDeduct` when `!invOn()`.

9. `alpha-coach.html` reset safety: Settings reset now opens a confirmation modal; `wipe()` remains the actual reset only behind the confirmation button.

10. `test/verify.mjs`: added regression coverage for inventory-off confirmation copy, reset confirmation, More screen rendering/links, mobile More tab label, focus coverage, mobile touch targets, no infinite typing-dot animation, and no repeating stripe texture.

## RECOMMENDED-BUT-NOT-APPLIED

1. Onboarding/preferences option-wall redesign.
   Reason: safe changes here require a separate UX pass. Collapsing or regrouping dozens of controls risks hiding user-critical setup choices without human review.

2. Font replacement for the detector's "overused font" warning.
   Reason: typography is part of the existing visual identity and any replacement must stay offline, licensed, and visually approved.

3. Full reduced-motion policy redesign.
   Reason: the current global reduced-motion rule is broad. I removed one unnecessary perpetual animation, but retuning all motion should be done with a full motion review because it touches feedback throughout the app.

4. Real visual and assistive-technology QA.
   Reason: the suites prove render and behavior, not appearance. The app still needs human eyes at desktop and 375px, plus real VoiceOver/NVDA testing if accessibility sign-off is required.
