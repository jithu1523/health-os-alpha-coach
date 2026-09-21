# Alpha Coach — office brief

**Claude Code reads this file. Codex, OpenCode and Copilot read `AGENTS.md`.**
The two carry the same rules — if you change one, change the other.

Every agent in this office reads this file first. It is the shared ground truth.
If something here is wrong, fix it here rather than working around it.

**Repository:** the working and default branch is `main` (GitHub `jithu1523/health-os-alpha-coach`).
Open pull requests against `main`. (`master` was retired 2026-09-21.)

## The product

Alpha Coach is an adaptive nutrition and discipline coach. One HTML file, no build
step, no server. Most nutrition apps assume a fixed clock — breakfast at 8, lunch at
1. This one assumes nothing until the user taps **"I'm awake"**, then derives every
meal time from that timestamp using interval rules.

**The wedge**: it plans your day around when you actually woke up and, if you opt in,
around what is actually in your kitchen. Nobody large does that well.

`alpha-coach.html` is the entire application. `README.md` has the architecture, state
shape, API seams and known gaps. Read it before your first change.

## Non-negotiable invariants

Breaking any of these is a defect, not a tradeoff.

1. **The schedule anchors on `ateAt`, never `loggedAt`.** When someone ate and when
   they typed it in are different facts. Meal punctuality and logging punctuality are
   scored separately, so a meal eaten on time keeps its credit when the entry is late.
2. **`Points.award()` is the only write path into scoring, and it rejects unknown
   codes.** The conversational layer contains zero `award()` calls. Scoring is a
   function of timestamps and user actions, never of model output. If chat needs to
   score something, route it through a shared action that owns the scoring.
3. **Inventory is optional and ships off.** An enhancement, never a prerequisite.
   With it off, meals, schedule, points and coaching all still work.
4. **Nothing is replaced silently.** When stock forces a meal swap, show the original,
   the missing ingredient with real quantities, the replacement, the reasoning, and an
   escape back to the original.
5. **Never claim something happened when it did not.** No fake AI, no invented
   numbers, no pretending a target is reachable when the maths says otherwise. Honest
   partial results beat confident wrong ones.
6. **Never push food into the night.** Compression stops at the plan's minimum
   spacing. If meals will not fit before bedtime, say so and suggest dropping one.

## Cost discipline

This file is ~290 kb — roughly **75,000 tokens**. Reading it whole is the most
expensive thing you can do, and almost no task needs more than 2% of it.

**Read the `alpha-context` skill before your first edit.** Locate with `grep -n`, read
the region with `sed -n`, edit by unique anchor, and verify by running the suite
rather than re-reading the file. An agent that greps costs a fraction of one that
reads.

## House rules

- **Run the tests before handing anything back.** `npm test` and `npm run test:boot`.
  A red suite is a blocked task, not a finished one.
- **Prove claims by running code, not by reading it.** This codebase already shipped
  one blank-page bug that passed a careful visual read.
- **One file.** Do not split `alpha-coach.html` without office agreement — its
  single-file nature is a feature.
- **Ask before scope changes, spend, or destructive operations.** Everything else,
  just do it and report what changed.

## Working agreement

- The **Engineer** owns `alpha-coach.html`. Others propose; the Engineer merges.
- **QA** can block a hand-off. Nothing ships with a failing suite.
- **Nutrition** has veto over anything touching macros, plan data, or health claims.
- **Researcher** proposes, never merges. Findings are written to `office/research/`.
- Write what you learned to your memory. The next session of you will not remember
  this conversation.
