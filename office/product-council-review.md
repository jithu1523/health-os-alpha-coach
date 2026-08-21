# Alpha Coach — Product Council review (2026-08-20)

> ⚠️ **Orchestrator synthesis — NOT team consensus.** Written by Michael (god/orchestrator) **alone**, drawn from the team's existing artifacts. **No specialist reviewed or signed off on this document.** The "opinions" below are Michael's reconstruction of each role's likely view from their prior work (CLAUDE.md, README known gaps, Oscar's research file, Pam's design docs, QA sign-offs) — they are **not** statements the named agents actually made about this review. Read it as one person's summary, not five experts agreeing.

Source material: CLAUDE.md (wedge + 6 invariants), README known gaps, Oscar's market research, Pam's design review, QA sign-offs. Interactive report: Artifact "Alpha Coach Product Council" (carries the same caveat).

## Thesis
Own **"the honest coach that plans around your real day."** Wedge = wake-anchored adaptive scheduling + optional kitchen-aware planning + honesty-first scoring. Defensible; the job is logging-ease parity + closing the retention loop without spending the trust that differentiates us.

## The room (Michael's reconstruction of each role's view — no agent actually said these)
- **Product:** the honesty rules are the brand, not just hygiene; make the wake-anchor magic legible day one.
- **Engineering (Jim):** no backend is the ceiling on everything (sync/backup/full-close notifications). Keep single-file+offline as a trust asset.
- **Design (Pam):** every extra logging tap is churn; ship the compact eat-time control; use Ember's 5 states as retention surface.
- **Research (Oscar):** logging *burden* kills adherence, not the time field. No incumbent derives the day from wake; our required-but-one-tap ateAt is defensible while friction stays low.
- **QA (Dwight):** honesty guarantees verified & real; suites prove RENDER not appearance — needs human eyes + full screen-reader pass.

## Fix now (ranked)
1. **CRITICAL — No real food DB / barcode** (30 items + 16 dish estimates = demo). Biggest adoption wall. [gaps #3]
2. **CRITICAL — No account/sync/backup** (single-device localStorage; cleared cache wipes streaks). Gates everything. [gaps #1]
3. **HIGH — Notifications don't fire when app fully closed** (needs service worker on https origin). Core habit loop. [gaps #2]
4. **HIGH — Accessibility partial** (no full screen-reader pass). Table stakes. [gaps #7]
5. **FINISH — In-flight:** eat-time V2 (7455839) in QA re-verify; geometric redesign iterated+held, ready to land on a clean file w/ human appearance sign-off. Reconcile CLAUDE.md "main" vs repo "master".

## Do better
- Cut logging to one tap (compact "Ate at" row + chips).
- Meal variety/rotation engine (27 unique meals exist; one template repeats).
- Onboarding that dramatizes the "I'm awake" wedge.
- Surface LOGGED_HONESTLY (+8) as a visible reward moment.
- Give Ember's 5 states real, reduced-motion-safe jobs tied to progress.

## Features to lead the segment
- **Next:** backend+account (sync/backup, keep offline-first client); barcode + real food DB; service-worker notifications at *derived* meal times.
- **Then:** health-platform sync (Apple Health/Google Fit — sleep feeds the wake anchor); kitchen-aware planning as premium; variety engine.
- **Always:** market the six invariants as "the coach that never lies to you"; adaptive-not-assumed vs fixed-clock; discipline-not-shame.

## Positioning line
"Every other tracker assumes your day starts at 8 a.m. and rewards you for logging more. Alpha Coach learns your day from the moment you wake, plans around what's actually in your kitchen, and never fakes a number to keep you happy."
