---
name: alpha-audit
description: Audit Alpha Coach for real-world holes — retention risks, friction, silent failures, honesty problems. Use when asked to review the app, assess whether a feature will survive contact with users, or find what is quietly broken.
---

# Auditing

The rule: **measure, do not opine.** Every finding in an audit should come from
running the app, not reading it. Write a simulation, print numbers, then interpret.

## How to run one

Build a jsdom harness (see `alpha-test`), drive the app through a scenario, and print
what you find. Scenarios that have surfaced real problems:

- **A perfect day** — count the taps required. Compare to what a normal tracker asks.
- **A realistic day** — ate everything on time, opened the app twice. Does the score
  reward or punish them?
- **First tap at 9 PM** — where do the meals land?
- **Never restock** — how many days until the model is lying?
- **Cold start, empty kitchen** — is the app useful, or a wall of warnings?
- **Ignore one meal all day** — does the whole day freeze?
- **Eat out** — is there a path, and does it count?
- **A month in** — how many distinct meals has the user seen?

## What counts as a finding

| Class | Test |
|---|---|
| **Bug** | The app does something provably wrong. Show the reproduction. |
| **Hole** | A real-life situation with no path through it. |
| **Retention risk** | Works, but a normal person will abandon it. Quantify the burden. |
| **Honesty problem** | The app implies something it does not know. Worst class — fix first. |

Rank by what loses the user, not by what is easiest to fix.

## Standards to hold it to

- **Time to first value.** How much work before the app does something for them?
- **Daily interaction cost.** Count the required taps. Compare to the alternative.
- **Graceful degradation.** When the user stops maintaining something, does the app
  get quieter or start actively misleading them?
- **Does it answer "is this working?"** Adherence is not an outcome. Weight trend is.
- **Is the metric the goal, or a proxy for it?** Points reward logging; the goal is
  eating well. Name the gap when you see it widening.

## Reporting

Lead with the verdict. Then bugs with reproductions, then holes, then retention risks.
Give the number, not an adjective — "54 interactions before first use", not "onboarding
is long". Finish with a ranked list of what to change, and be willing to say the honest
uncomfortable thing about who the product is not for.
