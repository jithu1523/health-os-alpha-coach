# Eat-time control design review

Date: 2026-08-20  
Owner: DESIGNER Pam  
Scope: Review of shipped shared `eatTimeControl()` placement for eating-out estimator and replacement modals. No product code changes.

## Verdict

The shipped placement is directionally right but too heavy for eating-out.

Keep the control inline on the final logging surface, visible before the final save action, because `ateAt` must stay a stated user fact. For eating-out specifically, change the shared control from a full explanatory time field into a compact confirmation row with one-tap corrections.

This is a change request against committed shared code. `eatTimeControl()` is used by the replacement modal, estimator modal, and the main meal-confirmation path, so the cost is higher than an eating-out-only tweak.

## What shipped

- `eatTimeControl()` renders an always-visible `When did you actually eat it?` native time input, prefilled to `now()`.
- The same control includes a long note: logging now, set the real time if earlier, schedule credit is based on eating time.
- Replacement modal: the control appears immediately after the intro copy and before the `Estimate it from a photo or a dish` action.
- Estimator modal: the control appears after the estimate summary and caution copy, before calorie/protein adjustment fields and the final log button.
- Main meal confirmation also uses the same control, so any change affects high-traffic normal logging.

## Recommendation

Refine the shared control to:

```html
<div class="eat-time eat-time--compact">
  <div class="eat-time-main">
    <span class="label">Ate at</span>
    <button class="eat-time-value" type="button">7:20 PM</button>
    <span class="tag mute">now</span>
  </div>
  <div class="eat-time-chips">
    <button class="chip" aria-pressed="true">Now</button>
    <button class="chip">30m ago</button>
    <button class="chip">1h ago</button>
    <button class="chip">Meal time</button>
    <button class="iconbtn" aria-label="Pick exact time">clock</button>
  </div>
  <p class="eat-time-note talk">Change it if you ate earlier. Schedule credit uses this time.</p>
</div>
```

Interaction:

- Default remains current time, visibly labelled `now`; leaving it unchanged is still a stated choice because the value is visible on the confirmation surface.
- Quick chips set the value without opening a time picker: `Now`, `30m ago`, `1h ago`, `Meal time` when a planned meal context exists.
- The clock/edit affordance opens the existing exact time input or native time picker.
- The primary button should include the selected value where space allows: `Log dinner eaten at 7:20 PM`.
- If the user edits time during the estimator flow, carry that value into replacement within the same session.

Placement:

- Estimator: keep it after the estimate output/caveat and before editable calorie/protein fields plus the final save button.
- Replacement: move it below the `Estimate it from a photo or a dish` action and above the manual `What you ate` fields. That keeps the common estimate path as the hero while still requiring a visible stated time before saving.
- Main meal confirmation: keep it visible above ingredient deduction details, but use the compact row to reduce visual weight.

## Cost and risk

- Engineering: medium. This touches shared `eatTimeControl()` and likely needs state/handlers for quick chips, exact-time editing, and selected-label rendering.
- Product surface: high-traffic. The main meal logging path changes too, so QA needs normal planned-meal confirmation coverage, not only eating-out coverage.
- Design risk: low if kept compact. The current long note explains the invariant, but it competes with the modal's actual job. The compact note preserves honesty without making time entry feel like a lecture.

## Evidence used

Oscar's `office/research/meal-time-logging-placement.md` found no direct evidence that asking for eaten time alone reduces adherence, but did find recurring adherence risk from logging burden and confusing/time-consuming entry. His recommendation matches this review: visible inline confirmation, not a separate modal, with quick corrections and exact edit access.

## Invariants

- Preserves `ateAt`, never `loggedAt`, as the schedule anchor.
- Preserves honesty: no hidden or silently invented eating time.
- Does not alter meal compression behavior.
