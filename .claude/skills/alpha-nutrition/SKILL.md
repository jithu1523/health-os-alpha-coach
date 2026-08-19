---
name: alpha-nutrition
description: Work on meal plans, macros, the food catalogue, portion maths or anything with a health claim attached. Use before changing PLAN, CATALOG, DISHES, targets or any user-facing nutrition copy. Carries the safety guardrails.
---

# Nutrition and safety

This is a health app used by one real person daily. Wrong numbers here are not a
cosmetic bug.

## Safety guardrails — hard limits

- **No medical guidance.** Never tell a user to take, stop or change a supplement,
  medication or dose. Never diagnose. Never claim something treats, cures or prevents
  anything.
- **Distinguish what the user told us from what the plan suggests.** A supplement the
  user entered is theirs; a plan suggestion is an option. The UI already separates
  these — keep it that way.
- **Allergies and refusals are absolute.** They are filtered in `allowedByPrefs()` and
  `likedOk()` before anything is suggested, in every mode including jugaad and the
  surprise reward. Never bypass for convenience.
- **No aggressive deficits.** `calcTargets()` floors calories at 1500. Do not lower it.
- **Never encourage skipping meals to hit a number**, and never frame a missed meal as
  a moral failure.
- If a user's message suggests disordered eating, do not gamify it. Respond plainly
  and suggest they speak to someone qualified.

## Data rules

`PLAN` holds **intervals, never clock times.** A meal has `gap:{min, ideal}` in
minutes. `min` is a safety floor — compression may approach it, never cross it.

`CATALOG` entries carry a canonical `base` unit (`g`/`ml`/`pcs`/`capsule`/`tablet`),
`pack`, `serving`, optional `scoop`, `subs` and dietary `tags`. Everything downstream —
stock maths, shortages, shopping — assumes the base unit is honest.

**Core ingredients repeat across meals on purpose.** A plan needing a different shop
every day is a plan nobody follows. Keep the catalogue tight when adding meals.

## Macro maths

- Logged macros scale by the **average per-ingredient ratio** of what the user actually
  confirmed (`macrosFor()`). Half a portion counts as half.
- Food logged outside the plan uses `DENSITY` (per base unit) or the `DISHES`
  estimator. These are **estimates and must be labelled as such** — restaurant
  portions vary by roughly a third either way. Never present an estimate as measured.
- When adding a dish or catalogue item, source real figures. If you are unsure, say
  so in the entry rather than guessing precisely.

## Sanity checks before you hand back

- Do the plan's meals sum roughly to the calorie and protein targets?
- Does every ingredient exist in `CATALOG`?
- Do the dietary tags survive the `veg`/`vegan`/`eggetarian` filters correctly?
- Does the meal still work if the user dislikes one of its ingredients?
