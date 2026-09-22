# Goal-First Onboarding Redesign

Owner: Pam  
Audience: Jim, for implementation in `alpha-coach.html`  
Scope: Design spec and comp only. No app code was changed.

## Intent

The founder feedback is right: setup currently feels like a kitchen audit before the app knows the person. The new flow starts from the user's goal, learns enough about the person to make that goal usable, captures taste once, then asks about food and stock only after Alpha Coach has a reason for each item.

The first run should answer one question per screen:

1. What are you trying to do?
2. Who is this plan for?
3. What will you eat, and what should never appear?
4. Do these plan items work for you?
5. Which of these do you have?
6. How much do you have?
7. Start the real day from `I'm awake`.

Kitchen tracking remains optional. The schedule still starts only after `ACT.wake()` creates a `blankDay(ts)`, and `buildSchedule(d)` still anchors meals from the real wake timestamp and later `ateAt` values.

## Current App Anchors Read

- `defaultState()` keeps `name`, `onboarded`, `obStep`, `prefs`, `suppPlan`, and `inv` in one state object. Current defaults include `prefs.goal`, macro targets, diet, allergies, `like`, `dislike`, `refuse`, cuisines, cooking, equipment, wake/sleep, and `inv.enabled:false`.
- `PLAN` is currently `phase1-lean-cut` with repeatable meal ingredients. `MEALS()` derives active meals from the plan, local swaps, preferences, and rotation.
- `allowedByPrefs()` blocks diet conflicts, allergies, and hard refusals. It also filters the stock-aware plan builder.
- `WakeGate()` is the correct final handoff. It explains that the day starts when the user taps `I'm awake`.
- `ACT.wake()` creates the day with `blankDay(ts)`, sets `S.activeDay`, sets mascot beat `Plan rebuilt from...`, renders today, then toasts the first meal time.
- `buildSchedule(d)` anchors on `d.wake`, rolls from `log.ateAt || log.at`, compresses only down to minimum gaps, and flags overflow instead of pushing food into the night.
- `invOn()` gates the whole kitchen subsystem. With inventory off, meals, schedule, points, and coaching still work.
- `ensureItem(ref)` creates a stock record with `qty:0`.
- `setQty(ref, baseQty, note)` writes a correction transaction.
- Current setup pantry cards show an input plus a separate `I have this` button. That separation caused the founder bug: entering a quantity did not feel like registering ownership.

## Proposed Step Order

### Step 1 - Goal

Primary action: choose one goal.

Use the existing goal options for the first implementation:

- Fat loss
- Lean muscle
- Maintain

Screen copy:

> Start with the goal. Diet, targets, meal suggestions, and stock questions come after this.

UI:

- `.hero` card with Ember idle mascot and three large choice buttons.
- Each option uses the existing `ChipList` behavior but should be visually larger than preference chips.
- The selected goal is reflected immediately in a short summary: `Fat loss selected. I will keep meals higher-protein and tighter on calories.`
- Continue button label: `Continue with this goal`.

Decision rule:

- This screen must come before name, diet, tastes, cooking, or pantry.
- Do not present pantry items here.

### Step 2 - Person

Primary action: learn the person and baseline targets.

Fields:

- Name
- Daily calories
- Protein (g)
- Carbs (g)
- Fat (g)
- Typical sleep time
- Max prep time (min)

Copy:

> These numbers shape the plan. The real day still starts when you tap `I'm awake`.

UI:

- Use existing `.field`, `.input`, `.grid.g2`, `.card`, and `.pillbadge`.
- Show a compact goal summary at the top: `Goal: Fat loss`.
- Use inline validation on blur for number fields. Empty target fields fall back to defaults, but the screen should state that before continuing.
- Do not ask for inventory.

Why sleep here:

- `buildSchedule()` uses the usual sleep time through `sleepBound(d)`, so it belongs with the person profile, not late in setup.

### Step 3 - Diet And Safety

Primary action: set hard constraints.

Fields:

- Diet from existing `DIETS`
- Allergies
- Will not eat

Copy:

> Hard rules. These are never included in meals or replacements.

UI:

- Reuse `ChipList` and `ChoiceGroup`.
- Keep allergies and refusals in compact groups. Do not open a huge all-food wall by default.
- Use search/filter if Jim wants to improve scan speed, but that is not required for the first pass.

Decision states:

- None selected: show `No hard rules yet. You can add them later in Preferences.`
- Selected: show a count pill, for example `3 hard rules`.

### Step 4 - Tastes

Primary action: capture likes and dislikes once.

Fields:

- Foods I like
- Foods I dislike
- Cuisines I want to see
- Cooking ability
- Equipment

Copy:

> Choose what matters. I will not keep asking for more after this.

Rules:

- After the user continues, do not show another "pick more likes" prompt in onboarding.
- Later learning comes from what they log, swap, clear, dislike, and restock.
- `Like` is a preference, not a hard rule.
- `Dislike` is avoided when a good alternative exists.
- `Will not eat` stays in Step 3 because it is a hard rule.

Empty state:

> No taste picks yet. I will learn from what you eat and what you skip.

UI:

- Keep the first group open, keep later groups collapsed with counts.
- Reuse `ChoiceGroup()` for progressive disclosure.
- Tappable chips must remain at least 44px high on touch devices.

### Step 5 - Plan Fit

Primary action: ask "Do these work for you?"

Source:

- Use `MEALS()` after goal, diet, hard rules, likes, dislikes, cooking, equipment, and prep time are set.
- Show the current plan meals and the highest-signal ingredients, not the whole catalog.

Screen layout:

- Heading: `Do these work for you?`
- Body: `This is the first pass from your goal and tastes. Keep what works. Change what does not.`
- Meal cards use existing `.card`, `.meal-name`, `.pillbadge`, and ingredient rows.

Each meal card:

- Meal name and slot
- kcal and protein
- Prep time
- Main ingredients
- Controls: `Works`, `Swap`, `Never this`

Decision states:

- Default: no meal needs a decision. Continue is enabled.
- `Swap`: open the existing replacement pattern. Replacement must show the original, replacement, and reason.
- `Never this`: writes to refusal/disliked meal path, not a silent stock swap.
- If no acceptable meal remains: show `I cannot build a safe match from those rules yet. Loosen one rule or continue with defaults and edit later.`

Do not:

- Do not claim AI generated a plan. The current app is deterministic unless a future API is wired.
- Do not hide macro impossibility. If targets cannot fit, say so.

### Step 6 - Have Vs Do Not Have

Primary action: classify only the plan-relevant items.

Source:

- Use `planRefs()` after Step 5.
- Keep inventory optional. If inventory is off, first ask:
  - `Track my kitchen`
  - `Skip stock for now`

Copy:

> These are the items this plan needs. Pick what is already in your kitchen.

Item states:

- Unknown: default, neutral.
- Have: owned, quantity panel opens immediately.
- Do not have: not owned, goes to shopping list when inventory is on.
- Later: optional escape for items the user does not want to answer now.

Interaction:

- Tapping `Have` immediately calls the same logical path as a stock write.
- If there is no quantity yet, register the item as owned with the catalog's sensible default amount:
  - `CATALOG[ref].pack` when available.
  - Otherwise `CATALOG[ref].serving`.
  - Otherwise `1` in the base unit.
- The quantity field opens focused so the default can be corrected.
- Tapping `Do not have` sets quantity to `0` and removes the owned state.
- Tapping `Later` leaves quantity untouched and excludes the item from the setup summary count.

Visual:

- Use segmented controls per item, not a separate global button.
- Keep the active state visible by text and shape, not color alone.
- Use `aria-pressed` on choices.

### Step 7 - Quantity

Primary action: set amount without a second ownership button.

This is the bug fix.

Rule:

Entering a positive quantity registers the item as owned. Selecting an item as `Have` registers it as owned. There is no separate `I have this` button.

Recommended card pattern:

```html
<article class="card pad-s stock-card" data-stock-state="have">
  <div class="spread">
    <div>
      <div class="meal-name">Rolled oats</div>
      <div class="meta">Grain - needed in Protein oats and eggs</div>
    </div>
    <span class="tag ok">Owned</span>
  </div>

  <div class="stock-choice" role="group" aria-label="Rolled oats stock">
    <button class="chip" data-act="obStock" data-v="oats:have" aria-pressed="true">Have</button>
    <button class="chip" data-act="obStock" data-v="oats:none" aria-pressed="false">Do not have</button>
    <button class="chip" data-act="obStock" data-v="oats:later" aria-pressed="false">Later</button>
  </div>

  <label class="field">
    <span>Quantity</span>
    <input class="input" type="number" inputmode="decimal" data-ob-stock-qty="oats" value="1">
  </label>
</article>
```

Recommended action behavior:

- `obStock(ref, 'have')`: call `ensureItem(ref,{source:'user'})`, then if current quantity is `0`, call `setQty(ref, defaultQty, 'Recorded during setup')`.
- `input[data-ob-stock-qty]` on `input` or debounced `change`: when parsed quantity is `> 0`, call `setQty(ref, toBase(value, unit, it), 'Recorded during setup')` and set state to `have`.
- If the quantity is cleared or set to `0`, do not silently delete. Show inline state `Quantity is empty. This will count as not in stock.` On blur, set quantity to `0` only if the field is still empty or zero.
- Unit changes convert through existing `toBase()` and use `CATALOG[ref].base`.
- Show `Registered as owned` in a polite live region when quantity becomes positive.

Do not ship:

- An input that requires pressing `I have this` afterward.
- A saved quantity that still renders in the final summary as `0 items you have`.
- A disabled Continue button just because the user skipped stock. Inventory is optional.

### Step 8 - Review And Wake Handoff

Primary action: finish setup and land at the existing WakeGate/today flow.

Screen copy with stock on:

> You are set. I saved your goal, tastes, and stock. Tap `I'm awake` when the day actually starts.

Screen copy with stock skipped:

> You are set. Meals, schedule, points, and coaching work without kitchen tracking. You can turn it on later.

Summary cards:

- Goal
- Target calories and protein
- Hard rules count
- Taste picks count
- Items owned count
- Shopping list count

Action:

- `Start using Alpha Coach` should set `S.onboarded=true`, keep `S.ui.screen='today'`, and let the user hit WakeGate if no active day exists.
- Do not call `ACT.wake()` automatically from setup. The wake timestamp must be the real start of day.

## Empty And Decision States

| State | What The User Sees | Required Behavior |
| --- | --- | --- |
| No goal selected | Goal choices, Continue disabled or defaults to current `cut` with visible selected state | The user can see which goal will be used |
| No name | Name can stay empty until finish | Finish fallback remains `Athlete` |
| No taste picks | `I will learn from what you eat and what you skip` | Do not ask again in onboarding |
| No hard rules | `No hard rules yet` | Preferences remain editable later |
| No acceptable meal | Calm explanation plus `Back to tastes` and `Use defaults for now` | No fake plan |
| Inventory skipped | `Kitchen tracking is off` | No shortages, no shopping list pressure |
| Item marked Have with no quantity | Default quantity is written and field focused | The item counts as owned immediately |
| Positive quantity typed first | Item becomes Have and writes quantity | No separate button |
| Quantity cleared | Inline warning on blur, then qty `0` if left empty | Summary updates honestly |
| All items Do not have | `0 items owned, X to buy` | This is valid; do not block setup |

## Motion And Feedback

Use Alpha Coach timing tokens:

- Press feedback: `--d-1` and `transform: scale(0.97)`.
- Step transitions: `--d-2`, opacity plus `translateY(8px)` only.
- Final review entrance: `--d-3`, small stagger of summary cards, 30-50ms apart.
- Progress indicator: animate `transform: scaleX(...)`, never `width`.
- Reduced motion: no translate or stagger; use opacity or static changes.

Craft rules:

- Feedback appears on pointer down, not only after click.
- Transitions must be interruptible; do not lock input during step animation.
- No `transition: all`.
- Do not animate height, width, margin, or padding.
- No `scale(0)` entries.

## Component Reuse

Reuse these app patterns:

- `Mascot()` for setup context and final handoff.
- `.hero` for the current primary action.
- `.card` and `.pad-s` for repeated item cards.
- `.chip` and `ChipList()` for small choices.
- `ChoiceGroup()` for collapsed preference groups.
- `.field` and `.input` for labeled quantity and target inputs.
- `.pillbadge` or `.tag` for kcal, protein, prep time, owned, and to-buy states.
- `InventoryOff()` language model: kitchen tracking is useful, optional, and reversible.
- `WakeGate()` copy model: the real day begins at `I'm awake`.

Use tokens only in implementation:

- Color: `var(--accent)`, `var(--ink)`, `var(--muted)`, `var(--line)`, `var(--lime)`, existing tile classes.
- Type: `var(--f-display)`, `var(--f-talk)`, `var(--f-ui)`.
- Motion: `--d-1`, `--d-2`, `--d-3`.

## Accessibility

- Every chip/button has visible text and `aria-pressed` when selected.
- Quantity fields have labels, units, and inline validation. No placeholder-only labels.
- Touch targets are at least 44px high with at least 8px spacing between adjacent controls.
- Do not rely on color alone for Have/Do not have/Later.
- The `Registered as owned` feedback uses a polite live region.
- Back and Skip remain available. The flow is guided, not a locked tour.
- Screen reader focus order matches visual order: goal, person fields, constraints, tastes, plan fit, stock, review.

## Jim Implementation Notes

Suggested small implementation slices:

1. Reorder `Onboarding()` steps and copy only. Keep existing handlers.
2. Split stock setup into item state controls plus quantity inputs.
3. Add a setup-only action such as `obStock` or update `pantrySave` so positive quantity writes immediately.
4. Ensure review counts use `haveList()` and `shortages()` after the new quantity behavior.
5. Verify setup with inventory off, inventory on with zero items, and inventory on with quantity typed but no button press.

Non-negotiables:

- Do not edit schedule anchoring. `buildSchedule()` remains wake/ateAt based.
- Do not auto-start the day during onboarding.
- Do not make inventory required.
- Do not silently replace meals based on stock without showing original, missing quantity, replacement, reason, and escape.
