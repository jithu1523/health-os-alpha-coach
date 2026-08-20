# Require meal time, but make it a visible one-tap confirmation

**Date** 2026-08-20 | **Author** researcher Oscar | **Status** proposed

## Decision

Build the required `ateAt` input, but do not make it a separate blocking modal step. Put a compact, always-visible **Ate at** row on the final logging confirmation surface for both the eating-out estimator and replacement flow, prefilled from the best honest source, with one-tap chips for common corrections and an edit affordance for exact time. Evidence does not show that asking for meal time alone reduces adherence, but it does show that logging burden, time-consuming entry, and poor usability are recurring adherence risks; hiding or silently defaulting the time would violate the schedule invariant.

## What we would build

On the estimator confirmation and the replacement confirmation, show:

`Ate at 7:20 PM` plus chips: `Now`, `30m ago`, `1h ago`, `Meal time`, and a clock/edit button.

Default order:

1. If a captured/uploaded photo has a reliable taken-at timestamp, prefill from that and label it `from photo`.
2. If the user came from a planned meal card, prefill that scheduled meal time and label it `planned`.
3. Otherwise prefill current time and label it `now`.

The primary button should include the visible value, for example `Log dinner eaten at 7:20 PM`. If the user edits the time once in an estimator session, carry that value into any replacement modal. Do not silently backdate, and do not bury time behind an optional advanced control.

## Evidence

| Claim | Source | Level | Limits |
|---|---|---|---|
| I found no direct trial isolating "ask for eaten time" as a cause of lower food-log completion. The evidence is indirect: time is one more input in a workflow already known to be burden-sensitive. | Search across PubMed/JMIR/app-support sources on 2026-08-20. | evidence gap | Absence of evidence is not evidence of no effect. This should be A/B tested if the product has enough traffic. |
| Dietary self-monitoring adherence declines over time, and labor-intensive phone self-monitoring is cited as one reason adherence wanes. | Lin et al. 2025, JMIR model-development study, https://www.jmir.org/2025/1/e65431/ | model-development study plus cited prior evidence | Not specific to meal timestamp fields; population and intervention differ from Alpha Coach. |
| App-based dietary self-monitoring can support weight loss, but frequency and consistency matter more than perfect completeness; backlogging is common and can make entries appear real-time when they were not. | Payne et al. 2022, Obesity Science & Practice, https://pmc.ncbi.nlm.nih.gov/articles/PMC9159560/ | observational/descriptive study | Short, uncontrolled 8-week study; mostly White, middle-aged, educated women; not a timestamp UI experiment. |
| For food-timing research, editable timestamps matter; photo-entry timestamps can preserve more accurate eating time even when manual logging happens later. | Popp et al. 2023, JMIR Formative Research app evaluation, https://formative.jmir.org/2023/1/e35858 | app evaluation/usability study | Evaluated 11 apps with 7 testers in 2020; not current commercial UX for every app. |
| High data-entry burden, time to enter data, and confusing apps are cited reasons users stop using mHealth apps; multiple input methods can reduce food-logging time. | Popp et al. 2023, JMIR Formative Research, discussion citing mHealth survey evidence, https://formative.jmir.org/2023/1/e35858 | app evaluation plus cited survey | Indirect, but directly relevant to friction risk. |
| MyFitnessPal Premium makes food timestamps optional and off by default; when enabled, Add Food shows a Time option with the closest current time, and users can adjust it. | MyFitnessPal support, updated 2026-03-24, https://support.myfitnesspal.com/hc/en-us/articles/360036224752-Food-Timestamps-FAQs and https://support.myfitnesspal.com/hc/en-us/articles/360032621731-Can-I-track-the-time-that-I-log-a-food | official product support | Public support docs; I did not verify inside a logged-in app session. |
| Cronometer Gold timestamps are optional; when enabled, a time-of-day box is ticked by default on diary entries and can be changed. It also supports group timestamp editing. | Cronometer support, updated 2026-06-24, https://support.cronometer.com/hc/en-us/articles/360021811032-Timestamps and https://support.cronometer.com/hc/en-us/articles/360018031812-Edit-Diary-Entries | official product support | Paid-tier behavior; public docs only. |
| Lose It requires timestamps to be added manually; there is no automatic timestamp setting. A timestamp on the first item can apply to other foods in the same session. | Lose It support, updated 2026-07-23, https://loseit.zendesk.com/hc/en-us/articles/51699529280532-Understanding-Food-Timestamps and https://loseit.zendesk.com/hc/en-us/articles/51699218630036-Can-Timestamps-be-Automatically-Added | official product support | Manual timestamp path is visible in docs but appears secondary under Log Details. |
| MacroFactor's logger defaults to the current hour and lets users log to a different date/time through a calendar icon; it optimizes for keeping logging in one flow. | MacroFactor docs, https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor and product blog, https://macrofactor.com/new-food-logger/ | official product docs/blog | MacroFactor is a coach/logger with a timeline model, closer to Alpha Coach than generic calorie counters but still not a waking-time scheduler. |
| Cal AI public materials emphasize speed: photo, barcode, or text/description to get nutrition info quickly. I found no official public support doc describing an explicit eaten-time control. | Cal AI website, https://www.calai.app/; Google Play listing updated 2026-08-15, https://play.google.com/store/apps/details?id=com.viraldevelopment.calai; Apple App Store listing, https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 | official marketing/app-store material plus user reviews | Not enough to verify actual timestamp behavior. A direct app install or account walkthrough is needed before making a stronger claim. |

## What it costs the user

Expected incremental cost if designed inline: one glance and zero to two taps on most logs. If the default is right, the user just sees the timestamp in the primary button. If wrong, `30m ago` or `1h ago` fixes most retrospective cases with one tap; exact editing costs one extra tap plus a time picker.

Cost if designed as a separate required modal: one extra decision point after the user has already done the hard work of estimating or accepting a replacement. That is the riskiest version for completion.

Cost if hidden behind an optional control: low friction but bad data. It breaks the product's schedule model because `ateAt` is not optional for scoring meal punctuality honestly.

## What would have to be true for this to be wrong

This recommendation is wrong if an A/B test shows that an inline visible required time row materially reduces completed eating-out logs compared with a hidden/default timestamp, without improving schedule correctness or user trust enough to offset the loss. It is also wrong if most eating-out logs are truly in-the-moment and photo metadata/current time is already accurate, because the field could then be even more lightweight: visible but de-emphasized unless the log is late.

## Invariants touched

1. Schedule anchors on `ateAt`, never `loggedAt`: directly touched; the proposal preserves it.
5. Never claim something happened when it did not: directly touched; the note rejects silent backdating.
6. Never push food into the night: indirectly touched because late retrospective logs must not cause schedule compression from `loggedAt`.

No invariant is broken.

## Handoff

Pam/design should place the `Ate at` row in the final confirmation area, not as an earlier estimator question and not hidden under advanced details. Engineer should implement only after design confirms exact placement and copy. QA should add a path test proving a late log uses `ateAt` for meal punctuality and preserves separate `loggedAt` metadata.
