# Alpha Coach — working copy

A single-file adaptive nutrition and discipline coach. Open `alpha-coach.html` in a
browser. No build step, no install, no server. All state lives in `localStorage`
under the key `alphacoach.v2`.

This folder is a complete, self-contained snapshot. Nothing outside it is required.

---

## Repository layout

To avoid confusion about what is the app vs. supporting material:

| Path | What it is |
| --- | --- |
| `alpha-coach.html` | **THE APP.** The entire product — one file. This is what you open and edit. |
| `alpha-coach-sw.js` | Service worker paired with the app's notifications. Registers only when served over http(s); the app works without it on `file://`. |
| `test/` | Test suites. `npm test` (verify) + `npm run test:boot` (boot-path render checks). |
| `package.json`, `package-lock.json` | Test/dev scripts only. The app itself needs no dependencies. |
| `marketing/` | A **separate** static marketing/landing website (`marketing/index.html`) — NOT the app. Its own design notes + licenses live alongside it. |
| `office/` | Design, architecture, and research documents (product council, local-first architecture, spikes). **Docs, not app code.** |
| `office/research/` | Cited research write-ups (Cal AI / SOTA food recognition, food-DB expansion, classifier due-diligence, premium web craft, marketing toolkit). |
| `.claude/` | Agent/skill configuration for the assistants that worked on this repo. |

> The marketing site is intentionally a copy-free, standalone page under `marketing/`.
> If you ever see a stray `index.html` at the repo root, it was a duplicate and has been removed — the app is always `alpha-coach.html`.

---

## What the app is

Most nutrition apps assume a fixed clock — breakfast at 8, lunch at 1. This one
assumes nothing until the user taps **"I'm awake"**, then derives every meal time
from that timestamp using interval rules from the plan. It also, optionally, tracks
what is physically in the user's kitchen and plans around it.

Three systems share the shell and are deliberately kept separate:

1. **Schedule engine** — derives meal times from real events
2. **Inventory ledger** — optional; base-unit stock with a transaction history
3. **Discipline points** — deterministic scoring from timestamps

A fourth layer, the **conversational control layer**, is a deterministic parser that
drives the same actions the buttons call. It is not a model.

---

## Running it

```
open alpha-coach.html          # macOS
start alpha-coach.html         # Windows
```

Fonts load from Google Fonts and Fontshare; offline they fall back to system fonts
and the layout is unaffected.

**Settings → Preview time** shifts the clock forward (+45m, +90m, +3h, +6h, +12h) so
meal states (coming soon → due → overdue → day complete) can be inspected without
waiting hours. This is a development affordance and is labelled as such in the UI.

---

## File map

```
alpha-coach.html      the entire application (~285 kb, one file)
assets/mascot.png     rendered reference of the SVG mascot ("Ember")
assets/ring.png       rendered reference of the day-completion ring
test/verify.mjs       headless behavioural suite (Node + jsdom)
test/boot.mjs         upgrade-path safety: boots against malformed saved state
```

Inside `alpha-coach.html` the order is: CSS tokens → CSS components → mascot SVG →
catalogue and plan data → units → inventory ledger → schedule engine → points →
replacement engine → conversational layer → screens → modals → render → actions → boot.
Each section is separated by a banner comment.

---

## Architecture notes

### Schedule engine
`buildSchedule(d)` is the core. It walks the plan meals, anchors on the most recent
real event, and lays the remainder out using min/ideal interval pairs from `PLAN`.

- Anchors on **`log.ateAt`** (when the user actually ate), never on `loggedAt`
  (when they typed it in). This distinction is load-bearing — see below.
- If the remaining ideal intervals do not fit before the day closes it **compresses
  the flexible slack**, never below the plan's minimum spacing (`compressed: true`).
- If even minimum spacing does not fit, it flags `overflow: true` and names a
  `dropCandidate` rather than squeezing. Meals past the close are flagged `beyond`
  and rendered as "will not fit before you sleep" rather than given a 3 AM slot.
- The day closes at `dayEndFor(d)` = min(wake + 15h, usual bedtime − 90 min).

### Ate time vs logged time
`classifyLog()` judges two things independently:

- **Meal punctuality** — `ateAt` vs the planned time (30 min grace)
- **Log punctuality** — `loggedAt` vs `ateAt` (30 min grace)

A meal eaten on time but entered three hours later keeps `MEAL_ON_TIME` and takes
only a bounded `LOG_LATE`. Net stays positive. This is intentional: punishing
someone for forgetting their phone is how these apps lose users.

`editAteTime(mealId, ts)` corrects one meal, recalculates everything downstream, and
unlocks the next meal if its adjusted time has already passed. It does **not**
cascade unlocks to the whole day.

### Sequential locking
`isOpen(row)` returns true only for the first unresolved meal; everything after is
locked. To prevent one forgotten meal freezing the day, `autoResolveStale()` marks a
meal `missed` once it is 4 h overdue **and** the next meal is already due, takes a
bounded penalty, and moves on. The user can tap "I did eat this" to reopen it
(`d.reopened[mealId]` exempts it from being re-resolved).

### Points — read this before touching it
`Points.award(code, opts)` is the **only** write path and rejects any code not in the
`RULES` table. The conversational layer contains no `award()` call anywhere; where
chat needed to score something it calls a shared action (`inventoryAction()`,
`completeWorkout()`) that owns the scoring. `snapshotForAI()` exposes points
read-only.

If you add an AI layer, preserve this. The invariant is: **scoring is a function of
timestamps and user actions, never of model output.**

Daily negatives floor at `DAILY_NEG_FLOOR` (−25) so a bad day cannot spiral. One
missed day per week freezes the streak rather than breaking it.

### Inventory (optional)
`invOn()` gates the entire subsystem — it ships **off**. With it off there are no
shortages, no shopping list, no auto-replacement, and meals deduct nothing.

Everything is stored in one canonical base unit per item (`g` / `ml` / `pcs` /
`capsule` / `tablet`). kg, scoops and servings are display concerns only. `tx()` is
the single mutation point and writes a transaction record; quantities clamp at zero
and raise a mismatch flag rather than going negative.

Restocking **adds**; `setQty()` is a separate "correction" path with its own
transaction type. Deduction happens only on confirmed consumption — never on
"prepared".

### Meal replacement
`resolveMeal(meal)` checks stock, and `checkReplacements()` applies the closest
makeable alternative when the next meal comes into view. It is never silent: the
swap records the original name, the missing ingredient with real quantities, the
reasoning, and the ingredients it will use, all surfaced on Home with a
"keep the original" escape.

### Conversational layer
`parseCommand(text)` → ops → `runOps(ops)`. Deterministic regex intents, no model.
Handles queries, meal logging with stated times, inventory edits, preferences,
sleep/weight/water, meal replacement, eating out, and multi-intent messages.
Destructive ops set `risky: true` and require confirmation. Out-of-scope questions
are declined rather than answered.

---

## API seams

All stubbed. Each returns `null` with no backend so callers fall back to local
behaviour rather than pretending. Set `AlphaAPI.base` (Settings → Intelligence layer)
to activate.

| Method | Endpoint | Returns |
|---|---|---|
| `coach(message, ctx)` | `POST /coach/message` | `{reply}` |
| `interpret(text, snapshot)` | `POST /coach/interpret` | `{ops}` — same shape the local parser emits |
| `recogniseMeal(imageDataUrl)` | `POST /vision/meal` | `{items:[{name,kcal,protein,carbs,fat,confidence}]}` |
| `inventoryCommand(text)` | `POST /inventory/command` | `{ops}` for natural-language stock edits |
| `preferenceCommand(text)` | `POST /preferences/command` | preference patch + rebuilt meals |
| `planFromInventory(payload)` | `POST /plan/from-inventory` | replaces the deterministic jugaad planner |
| `logMeal(payload)` | `POST /meals/log` | — |
| `syncShoppingList(list)` | `POST /shopping/sync` | — |

`applyInventoryOps(ops)` already exists to write parser output into the ledger.

---

## State shape (`localStorage["alphacoach.v2"]`)

```js
{
  name, onboarded, obStep, theme,          // 'grove' | 'ember'
  prefs: { goal, kcal, protein, carbs, fat, diet, allergies[], like[],
           dislike[], refuse[], cuisines[], cooking, equipment[],
           prepTime, budget, wake, sleep },
  activeDay,                                // key into days{}
  days: { "<dayKey>@<ts>": {
      key, wake, logs{}, prep{}, suppLog{}, autoSwap{}, keepOriginal{},
      reopened{}, partial{}, push{}, reminders[], notes[], water, extra{},
      tomorrowPrep{}, closed
  }},
  logs entry: { status:'done'|'skipped'|'replaced'|'missed',
                ateAt, loggedAt, planned, consumed[], macros{}, cls{}, note },
  inv: { enabled, items: { <ref>: {ref,name,cat,base,qty,pack,serving,scoop,
                                    expiry,location,tx[],purchased,consumed} },
         last, mismatch[] },
  points: { ledger[], streak, freezes, lastFullDay, unlocked[], declined[],
            declineUntil, pending, spent },
  suppPlan[], shop{}, swaps{}, weights[], sleepLog[], history[], chat[], workout{}
}
```

Migration is defensive: every missing key is filled from `defaultState()`, types are
checked, and inventory items written by older builds are normalised. A render that
throws shows a recovery card with a reset button rather than a blank page.

---

## Tests

```bash
npm install jsdom
node test/verify.mjs     # behavioural suite
node test/boot.mjs       # upgrade-path safety
```

`verify.mjs` covers the schedule maths, ate-vs-logged scoring, sequential locking and
auto-resolve, points isolation from the chat layer, inventory arithmetic (including
the scoop example), replacement transparency, reward gating, the estimator, and every
screen rendering.

`boot.mjs` seeds malformed and legacy saved state (missing keys, wrong types,
half-formed inventory items, corrupt JSON) and asserts the app still mounts.

---

## Known gaps

Ranked. Nothing here is a defect — these are unbuilt.

1. **No backend.** Single-device `localStorage`. No account, sync or backup.
   This gates everything else.
2. **Notifications are half-solved.** Permission flow and background-tab delivery
   work; a service worker on a served origin (https, not `file://`) is needed for
   delivery when the app is fully closed. The permission plumbing is reusable as-is.
3. **No real food database.** 30 catalogue items and 16 restaurant dish estimates.
   Production needs a proper database and barcode lookup.
4. **One daily meal template.** Five meals repeat; 27 unique meals exist across the
   swap library, jugaad recipes and surprise rewards. No week rotation or variety
   engine.
5. **No health-platform integration** (Apple Health / Google Fit) for weight,
   steps or sleep.
6. **Sequential locking is high-discipline by design.** A "flexible mode" that keeps
   the points and adaptive scheduling but drops the locking has not been built.
7. **Accessibility is partial.** Focus is trapped and restored in modals; a full
   screen-reader pass has not been done.

---

## Design system

Type roles are fixed and should not be mixed:

- **Unbounded** — headings, numbers, times, meal names
- **Cabinet Grotesk** — mascot voice, coaching copy, reminders
- **Plus Jakarta Sans** — all other interface text

Two palettes ship, switchable in Settings, identical in layout and type:

- **Grove** (default) — sage ground `#F2F4E8`, forest actions `#2F5D34`,
  lime energy `#C6E85C`, ember warmth `#C85E2C`
- **Ember** — the original warm clay palette, accent `#C85E2C`

The mascot is inline SVG, flat 2D with no gradients on the body, so it ports to Rive
cleanly. States: `idle | wake | cheer | concern | rest`. The three arcs double as a
breathing guide and a day-progress indicator.
