---
name: alpha-design
description: Design or restyle any Alpha Coach surface. Use when adding a screen, changing layout or colour, or reviewing a design. Covers the type roles, the two palettes, component patterns and motion rules.
---

# Design system

## Type roles — fixed, never mixed

| Font | Used for |
|---|---|
| **Unbounded** | headings, numbers, times, meal names — anything the eye should land on |
| **Cabinet Grotesk** | the mascot's voice, coaching copy, reminders — anything conversational |
| **Plus Jakarta Sans** | buttons, labels, forms, everything else |

Use `--f-display`, `--f-talk`, `--f-ui`. Never a raw font name.

## Palettes

Two ship, switchable in Settings, identical in layout and type. **Grove** is default:
sage ground `#F2F4E8`, forest actions `#2F5D34`, lime energy `#C6E85C`, ember warmth
`#C85E2C`. **Ember** is the original warm clay set.

Always use tokens — `var(--accent)`, `var(--lime)`, `var(--ink)`. A hardcoded hex
breaks the theme switch and will be sent back.

Accent discipline: one accent per view. If everything is highlighted, nothing is.

## Components

- `.card` — the default surface, 24 px radius, soft shadow
- `.tile--lime | --mint | --peach | --lilac | --sky | --ink` — pastel stat tiles with
  an icon badge, a big number, a small label
- `.pillbadge` — colour-coded fact chips (kcal, protein, prep time)
- `.hero` — the current action; the strongest thing on the screen
- `.dayring` — concentric arcs, one per axis, average in the centre
- `.weekbars` — seven days, rounded caps, today highlighted
- dark pill bottom nav on mobile, white circle on the active tab

## Motion

- Animate **transform and opacity only**. Progress bars use `scaleX`, never `width`.
- `--d-1` 140 ms for feedback, `--d-2` 260 ms for transitions, `--d-3` 380 ms for entrances.
- Renders are `requestAnimationFrame`-batched. Never re-render on a timer.
- `prefers-reduced-motion` zeroes everything. Do not bypass it.

## Judgement

- **The current action is the hero.** If a user has to hunt for what to do next, the
  screen has failed regardless of how it looks.
- **Progressive disclosure.** Rich, not crowded. Detail goes behind a tap.
- **Every number needs its unit and its target.** "1,240" means nothing; "1,240 of
  2,000 kcal" means something.
- **Motivating, never aggressive.** No guilt, no red alarm states, no shouting.
- Reference shots are for direction, not tracing. We do not use stock photography —
  the mascot is the brand asset.
