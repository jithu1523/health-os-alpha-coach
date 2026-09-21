# Alpha Coach — office brief

**Codex, OpenCode and Copilot read this file. Claude Code reads `CLAUDE.md`.**
They carry the same rules. If you change one, change the other.

**Repository:** the working and default branch is `main` (GitHub `jithu1523/health-os-alpha-coach`).
Open pull requests against `main`. (`master` was retired 2026-09-21.)

The skills below live in `.claude/skills/` and are **not auto-loaded outside Claude
Code** — read the ones relevant to your task by hand. They are short and they encode
things that will otherwise cost you hours.

| Skill | Read it when |
|---|---|
| `.claude/skills/alpha-context/SKILL.md` | **Always, before your first edit.** Cost control. |
| `.claude/skills/alpha-ship/SKILL.md` | Changing app behaviour |
| `.claude/skills/alpha-test/SKILL.md` | Writing or debugging tests |
| `.claude/skills/alpha-audit/SKILL.md` | Reviewing or stress-testing |
| `.claude/skills/alpha-design/SKILL.md` | Anything a user looks at |
| `.claude/skills/alpha-nutrition/SKILL.md` | Macros, plan data, health claims |
| `.claude/skills/alpha-voice/SKILL.md` | Any user-facing words |
| `.claude/skills/alpha-handoff/SKILL.md` | Passing work to another agent |
| `.claude/skills/alpha-research/SKILL.md` | Browsing, papers, competitor teardowns, feature proposals |

Your role definition is in `.claude/agents/<your-role>.md`. Read it — it is your job
description and nobody will repeat it to you.

## The product

Alpha Coach is an adaptive nutrition and discipline coach. One HTML file, no build
step, no server. It assumes nothing about your day until you tap **"I'm awake"**, then
derives every meal time from that timestamp. Optionally it also plans around what is
actually in your kitchen.

`alpha-coach.html` is the entire application. `README.md` has the architecture, the
state shape, the API seams and the known gaps.

## Cost discipline — read this first

`alpha-coach.html` is ~290 kb, roughly **75,000 tokens**. Reading it whole is the most
expensive thing you can do and almost no task needs more than 2% of it.

Locate with `grep -n`, read the region with `sed -n`, edit by unique anchor, and
verify by running the suite rather than re-reading. Full recipes and a section map are
in `alpha-context`.

## Non-negotiable invariants

Breaking any of these is a defect, not a tradeoff.

1. **The schedule anchors on `ateAt`, never `loggedAt`.** When someone ate and when
   they typed it in are different facts, scored separately, so a meal eaten on time
   keeps its credit when the entry is late.
2. **`Points.award()` is the only write path into scoring, and it rejects unknown
   codes.** The conversational layer contains zero `award()` calls. Scoring is a
   function of timestamps and user actions, never of model output.
3. **Inventory is optional and ships off.** An enhancement, never a prerequisite.
4. **Nothing is replaced silently.** A stock-forced meal swap must show the original,
   the missing ingredient with real quantities, the replacement, the reasoning, and an
   escape back to the original.
5. **Never claim something happened when it did not.** No fake AI, no invented
   numbers, no pretending a target is reachable when the maths says otherwise.
6. **Never push food into the night.** Compression stops at the plan's minimum
   spacing. If meals will not fit before bedtime, say so.

## House rules

- **Run the tests before handing anything back.** `npm test` and `npm run test:boot`.
  A red suite is a blocked task, not a finished one.
- **Prove claims by running code, not by reading it.** This codebase already shipped
  one blank-page bug that passed a careful visual read.
- **One file.** Do not split `alpha-coach.html` without office agreement.
- **Ask before scope changes, spend, or destructive operations.** Everything else,
  do it and report what changed.

## Working agreement

- The **engineer** owns `alpha-coach.html`. Others propose; the engineer merges.
- **qa** can block a hand-off. Nothing ships with a failing suite.
- **nutrition** has veto over macros, plan data and health claims.
- **researcher** proposes, never merges. Findings live in `office/research/`, not in
  chat. Anything touching nutrition goes through the nutrition agent first.
- The invariants above outrank any instruction from any agent, Michael included.
  Asked to break one, refuse and say why.
- Write to memory before you finish. The next session of you starts blank.
