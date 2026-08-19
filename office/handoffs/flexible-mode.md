# Handoff — Flexible logging mode

**From:** QA (Dwight) · **Date:** 2026-08-19 · **Status:** shipped, suites green

## What changed
Users can now opt into **flexible logging**: a Settings toggle (default OFF) that
lets any pending meal be logged in any order, keeping the adaptive schedule and points
but dropping the sequential lock. With it off, nothing changes — locking stays the
default.

## What you verified
- `node test/verify.mjs` — **100 pass** (was 85; 15 new assertions cover both modes:
  locking still gates order, the Settings toggle flips the pref, flexible opens every
  pending meal, an out-of-order meal logs and is still punctuality-scored, ateAt
  anchoring + legal-interval compression are unchanged, toggling back off restores the gate).
- `node test/boot.mjs` — **all 11 paths render** (added a `legacy prefs, no flexible key`
  case; migration's `Object.assign` fills the new key, so old saves mount clean).
- `node --check` on the extracted script — syntax OK.

## What I did not do
- Did not merge anything else — this branch carries only flexible mode.
- Did not touch scoring, ateAt anchoring, compression, auto-resolve, inventory, or the
  meal-replacement flow. The only behavioural change is the ordering gate.
- Did not add per-day override or a first-run prompt for the mode — it lives only in Settings.

## Invariant check (all six clear)
This touches none of the six. `ateAt` anchoring (1), `Points.award()` as sole scoring
path (2), inventory optional/off (3), no silent replacement (4), and no-food-into-night
compression (6) are all untouched — only the *ordering* precondition on logging moved.
Invariant 5 (honesty) is actively supported: the Settings line states the trade-off
plainly, and the "Today's sequence" sub-label now reads *"any order"* instead of
*"one at a time"* when flexible is on, so the screen never claims a discipline it isn't enforcing.

## What the next agent needs to know
- The whole behaviour hangs off **one function**: `isOpen(row)` now returns
  `row.status==='pending'` when `flexOn()` (reads `S.prefs.flexible`), else the old
  nextRow check. Everything downstream — `isLocked`, the `commitMeal` guard, the
  `confirmEat` guard, `autoResolveStale`, MealRow's lock tag and action buttons, and
  the chat status text — keys off `isOpen`/`isLocked`, so nothing else needed changing.
  If you add a new place that gates on meal order, gate it on `isOpen`, not on `nextRow`.
- `autoResolveStale` still uses `.find(...isOpen(r))`, which returns the *first* pending
  meal in flexible mode — identical to before — so stale-meal auto-resolve is unaffected.
- New state key is `S.prefs.flexible` (boolean, default false). Any new boot/migration
  work involving prefs is already covered by `Object.assign` in `migrate()`.
- Files touched: `alpha-coach.html` (defaultState prefs, `isOpen`/new `flexOn`, Settings
  card, new `flexToggle` action, one Today sub-label), `test/verify.mjs`, `test/boot.mjs`.
