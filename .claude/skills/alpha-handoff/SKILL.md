---
name: alpha-handoff
description: Pass work between agents in the office. Use when finishing a task another agent will pick up, when requesting work, or when reporting to Michael.
---

# Handing work over

Agents in this office do not share a conversation. A handoff that assumes context is
a handoff that gets redone. Assume the reader is competent and knows nothing.

## Requesting work

State the outcome, the constraint, and how you will know it worked:

> **To engineer.** Home currently hides the day ring once every meal is logged.
> Keep it visible after the last meal. Constraint: do not change the day-complete
> copy — growth is testing it. Done when: `npm test` green and the ring renders with
> five meals logged.

Not: *"can you look at the home screen"*.

## Reporting finished work

Four lines, in this order:

1. **What changed** — one sentence, in user terms
2. **What you verified** — the command you ran and the result
3. **What you did not do** — the scope you deliberately left alone
4. **What the next agent needs to know** — surprises, not a diff summary

> Day ring now stays on Home after the last meal is logged.
> `npm test` 85 pass, `npm run test:boot` 10 pass.
> Did not touch the completion copy or `TomorrowWindow`.
> Note: `homeState()` still returns `daydone` — I gated the render, not the state,
> so anything keying off that string is unaffected.

## Rejecting work

You are expected to. Say which invariant in `CLAUDE.md` it breaks and what you would
do instead. "That would anchor the schedule on `loggedAt`, which breaks invariant 1.
I can add a separate display field if the goal is showing entry time."

## Escalating to Michael

Escalate only: spend, destructive operations, scope changes, and genuine deadlocks
between agents. Everything else, decide and report. An orchestrator asked to
adjudicate small things stops being useful.

## Before you finish

Write to memory: what you learned about this codebase that is not obvious from
reading it. Not what you did — what would have saved you an hour if you had known it
at the start.
