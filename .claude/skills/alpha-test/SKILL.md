---
name: alpha-test
description: Write or debug tests for Alpha Coach. Use when adding coverage, when a suite goes red, or when you need to prove a behaviour actually works. Covers the jsdom harness, the exposed API, and the determinism traps specific to this app.
---

# Testing Alpha Coach

Two suites, both plain Node + jsdom, run from the folder root:

```bash
npm test           # test/verify.mjs  — behaviour
npm run test:boot  # test/boot.mjs    — upgrade-path safety
```

## The harness

`window.AlphaCoach` exposes the internals for testing: `S`, `D()`, `sched()`,
`nextRow()`, `commitMeal()`, `editAteTime()`, `Points`, `RULES`, `invOn()`, `tx()`,
`setQty()`, `shortages()`, `jugaadPlan()`, `estimateDish()`, `parseCommand()`, `ACT`,
`render()` and more. Prefer driving the **UI** (`click(act('ate','m1'))`) over calling
internals — a test that only calls functions will not catch a button that is missing.

`setOffset(ms)` shifts the app's clock. Everything time-based flows through `now()`,
so this is how you reach states hours away.

## Determinism traps — read these

**The eating window depends on wall-clock time.** It closes 90 minutes before the
user's usual bedtime, so a suite that passes at 09:00 can fail at 21:00. Pin the
session before asserting on schedule maths:

```js
const morning = new Date(); morning.setHours(7,0,0,0);
d().wake = morning.getTime();
d().key  = new Date(morning).toISOString().slice(0,10);
A().setOffset(morning.getTime() - Date.now());
```

**Correcting an eating time does not always shift the tail by exactly that amount.**
Freeing up earlier hours can relax gaps that were compressed against the end of the
day. Assert the invariant — the tail moved earlier, each gap sits inside the plan's
min–ideal band — not an exact minute count.

**`commitMeal()` does not render.** Call `A().render()` before asserting on the DOM,
or you will be reading a stale screen. The UI path renders for you; the direct call
does not.

**Guards use short timers.** Double-tap protection and the supplement toggle hold a
lock for a few hundred milliseconds. Wait past it before clicking the same control
again, or your second click is silently dropped.

**`await wait()` after every click.** Rendering is `requestAnimationFrame`-batched.

## Writing a good assertion

Test the promise the user was made, not the implementation:

- bad: `ok('gap is 180', gap === 180)`
- good: `ok('next meal sits a legal interval after the last one', gap >= rule.min && gap <= rule.ideal)`

When an assertion fails, pass the actual value as the third argument. A failure that
does not tell you what it got is a failure you will debug twice.

## Boot safety

`test/boot.mjs` seeds malformed and legacy saved state and asserts the app still
mounts. **Add a case whenever you add a state key.** This suite exists because a
missing key once shipped a blank white page to a real user.
