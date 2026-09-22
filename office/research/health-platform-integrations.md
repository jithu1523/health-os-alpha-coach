# Do not auto-fill wake time inside the single HTML app; test a native bridge first

**Date** 2026-09-21 · **Author** researcher · **Status** proposed

## Decision

Do not build Apple Health or Google Fit / Health Connect wake-anchor auto-fill directly into `alpha-coach.html`. The current product is a single offline HTML file with no build step, no server and no native container; Apple HealthKit and Android Health Connect require native app capabilities and user-granted health permissions. The only honest path is a small, explicit native bridge spike that reads the latest sleep session locally and offers a suggested wake time that the user confirms before the schedule is anchored.

## What we would build

Build a thin bridge, not an invisible import:

1. A shared wake-source contract: `{ source, wakeAt, sleepSessionStart, sleepSessionEnd, confidence, importedAt }`.
2. A confirmation surface in Alpha Coach that says, in effect, "Looks like you woke at 7:12 AM from Apple Health / Health Connect. Use this?" with edit and skip controls.
3. An iOS bridge that uses HealthKit to read sleep analysis samples and passes one derived wake candidate into the app.
4. An Android bridge that uses Health Connect first, not legacy Google Fit, and passes one derived wake candidate into the app.
5. A fallback that keeps the current "I'm awake" tap fully intact when permission is missing, data is stale, or the user disagrees.

Do not infer a schedule silently. The imported value is a suggestion, not a fact, until the user confirms it.

## Evidence

| Claim | Source | Level | Limits |
|---|---|---|---|
| Apple exposes sleep through HealthKit category data, including sleep analysis values such as awake, core, deep and rapid eye movement (REM) sleep. | Apple Developer: [`HKCategoryTypeIdentifier.sleepAnalysis`](https://developer.apple.com/documentation/healthkit/hkcategorytypeidentifier/sleepanalysis), [`HKCategoryValueSleepAnalysis`](https://developer.apple.com/documentation/healthkit/hkcategoryvaluesleepanalysis) | Official platform documentation | Apple docs are the API contract, not an implementation test. Real data quality varies by device and source. |
| HealthKit requires an app-level HealthKit capability/entitlement and fine-grained authorization for each data type the app reads or writes. | Apple Developer: [Setting up HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit), [HealthKit entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.healthkit.access), [Authorizing access to health data](https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data) | Official platform documentation | Apple docs do not provide a browser path. This points to native iOS/watchOS app work. |
| Health Connect represents sleep as `SleepSessionRecord` records with `startTime`, `endTime` and optional stages including awake, out of bed, light, deep and REM. | Android Developers: [Track sleep sessions](https://developer.android.com/health-and-fitness/health-connect/features/sleep-sessions), [Develop sleep experiences](https://developer.android.com/health-and-fitness/health-connect/experiences/sleep) | Official platform documentation | The API exposes sessions; deriving "woke for the day" still needs product rules. |
| Health Connect requires an Android app, SDK dependency, manifest permissions, runtime permission flow, privacy-policy rationale and repeated permission checks. | Android Developers: [Get started with Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started) | Official platform documentation | This is not available to a standalone HTML file opened in a browser. |
| Google Fit APIs are legacy; Google says they are supported only until the end of 2026 and recommends Google Health API or Health Connect depending on app shape. | Android Developers: [Fit migration guide](https://developer.android.com/health-and-fitness/health-connect/migration/fit) | Official platform documentation | Current as of the 2026-09-10 docs page. We should not start new mobile work on Google Fit. |
| Google Health API is the cloud successor path for Fitbit / Pixel Watch style data and uses Google Cloud plus OAuth 2.0; it supports sleep data and sleep scopes. | Google Developers: [Google Health API](https://developers.google.com/health), [Google Health sleep](https://developers.google.com/health/data-types/sleep), [Set up Google Cloud and OAuth](https://developers.google.com/health/setup) | Official platform documentation | This is a server/web OAuth integration, not an offline local file fit. It also adds cloud handling of sensitive health data. |

## API surface and permission model

### Apple Health / HealthKit

HealthKit is the right Apple API, but it is native. The app needs the HealthKit capability and entitlement, user-facing purpose strings, and a `HKHealthStore.requestAuthorization` flow for read access to sleep analysis. Sleep comes back as category samples, not a single "wake time" field. The bridge would query recent `sleepAnalysis` samples, normalize overlapping in-bed/asleep/awake intervals, select the most recent completed main sleep session, and propose the session end or last meaningful awake/out-of-bed boundary as `wakeAt`.

Practical rule: if the latest sleep data is missing, fragmented, older than the current civil day, or overlaps a short nap, do not auto-fill. Ask the user.

### Android / Health Connect

Health Connect is the right Android mobile-first API. The bridge needs the Health Connect SDK, declared `android.permission.health.READ_SLEEP`, Play Console data-type declaration, a privacy-policy rationale activity, and runtime permission via Health Connect's permission screen. Sleep is exposed as `SleepSessionRecord` with session start/end and optional stage records. For wake anchoring, the simplest first version should use the end of the latest overnight session, then later refine with stages such as `AWAKE`, `OUT_OF_BED` and `AWAKE_IN_BED`.

Do not start with Google Fit. If the team wants a cloud Fitbit / Pixel Watch path later, evaluate Google Health API separately because it requires Google Cloud, OAuth 2.0, scope review, token storage and a privacy posture that no longer matches an offline-only app.

## Fit with the single offline HTML model

This does not fit the current model by itself.

| Path | Possible? | Fit | Rough complexity | Notes |
|---|---:|---|---|---|
| Plain `alpha-coach.html` opened locally | No | Bad | Not viable | Browser JavaScript cannot request HealthKit or Health Connect permissions. |
| Progressive Web App | No for these health APIs | Bad | Not viable | Offline caching does not grant native health APIs. |
| iOS native wrapper around the HTML | Yes | Medium | High | Requires Xcode project, HealthKit entitlement, App Store/privacy work and a JavaScript bridge. |
| Android native wrapper around the HTML | Yes | Medium | Medium-high | Requires Android project, Health Connect SDK, Play Console declarations, permission rationale and a JavaScript bridge. |
| Companion native app that exports/copies wake time into Alpha Coach | Yes | Medium-low | Medium | Less invasive than a full wrapper, but user flow is clunkier. |
| Google Health API cloud integration | Yes technically | Poor for offline product | High | Requires server/OAuth/token handling and turns sensitive sleep data into cloud data. |

## Privacy implications

Sleep data is highly sensitive. The least-bad version is local-only:

- Request only sleep read permission, not broad health access.
- Store only the confirmed wake anchor in Alpha Coach state, not raw sleep stages.
- Show source and timestamp every time a wake suggestion is used.
- Keep manual wake entry as the default fallback.
- Avoid server sync unless the product explicitly changes its privacy model.
- Treat imported sleep as untrusted. Device gaps, naps, shared devices, travel and manual edits can all produce misleading wake times.

## What it costs the user

One-time cost:

- iOS: Apple Health permission screen with sleep access, plus our explanation of why we need it.
- Android: Health Connect permission screen, privacy-policy rationale and possibly installing/enabling Health Connect on older Android versions.

Daily cost:

- Best case: one confirmation tap instead of entering/tapping "I'm awake".
- Common failure case: user still taps "I'm awake" because permission is off, wearable was not worn, sleep data synced late, or the inferred session is ambiguous.

Attention cost:

- This feature adds trust work. A wrong wake suggestion at the start of the day is more damaging than no suggestion because it shifts every meal time.

## Recommended first step

Run a one-week Android Health Connect bridge spike before touching production app behavior:

1. Build a tiny Android native proof of concept outside `alpha-coach.html`.
2. Request only `READ_SLEEP`.
3. Read the latest `SleepSessionRecord` from the last 36 hours.
4. Print the proposed `wakeAt`, source app, session start/end and stage summary.
5. Manually compare against the user's expected wake time for at least five mornings.

Android first is the cheaper spike because Health Connect's `SleepSessionRecord` already has session boundaries and the docs are clearer for the target data shape. If that does not produce a reliable wake candidate, the iOS wrapper is not worth starting yet.

## What would have to be true for this to be wrong

This recommendation is wrong if a current browser or Progressive Web App API can request Apple Health or Health Connect sleep permissions directly, or if Alpha Coach is allowed to stop being a single offline HTML file and become a native app. It is also wrong if real-device testing shows sleep-session end time is accurate enough across Apple Watch, Fitbit / Pixel Watch, Samsung Health and manual sleep entries that confirmation becomes unnecessary. Until then, silent auto-fill would violate the product's "never claim something happened when it did not" rule.

## Invariants touched

- **Schedule anchors on `ateAt`, never `loggedAt`:** Not directly changed. The wake anchor affects derived meal times, but meal scoring must still use `ateAt`.
- **Never claim something happened when it did not:** Directly touched. Imported wake time must be confirmed or clearly framed as a suggestion.
- **Never push food into the night:** Indirectly touched. A wrong late wake anchor could compress the day; existing compression rules must remain in force.

No nutrition/macros/health-claim change is proposed, so nutrition review is not required before this goes to engineering. Privacy/product review is required before any native bridge work.

## Handoff

Send to the engineer only as a plan. The next concrete task is a separate Android Health Connect proof of concept, not a change to `alpha-coach.html`. If the office wants iOS parity after that, plan a separate HealthKit wrapper spike with Apple Developer entitlement and App Store/privacy-policy requirements called out before implementation.
