---
name: alpha-ship
description: Make a change to alpha-coach.html safely. Use whenever editing the app — adding a feature, fixing a bug, or changing a screen. Covers where things live in the single file, which invariants are load-bearing, and how to verify before handing back.
---

# Shipping a change

`alpha-coach.html` is ~290 kb and holds everything. Section banner comments mark the
boundaries. In order: CSS tokens → CSS components → mascot SVG → catalogue and plan
data → units → inventory ledger → schedule engine → points → replacement engine →
conversational layer → screens → modals → render → actions → boot.

## Before you touch anything

```bash
npm test && npm run test:boot     # establish a green baseline
```

If it is already red, fix that first or say so. Never start work on a red baseline —
you will not know which failure is yours.

## Finding your way

Grep for the banner comment, not the function name — several helpers share names with
CSS classes.

| Change | Start at |
|---|---|
| meal times, spacing, compression | `function buildSchedule` |
| what counts as on time | `classifyLog`, `scoreMealLog` |
| a new points rule | the `RULES` table — add there, never inline a number |
| stock maths | `tx()` — the single mutation point |
| a new chat intent | `parseClause` then `runOp` |
| a new screen | add to `SCREENS`, `NAV`, and the allowed-screen list in `migrate` |
| a new modal | the `body` map inside `Overlay()` |
| colours, spacing, type | the `:root` token block — never hardcode a hex |

## Editing style

- Prefer a targeted `Edit` over rewriting a region. The file is large and a broad
  replace will silently clobber something.
- After every edit, extract and syntax-check before running anything else:
  ```bash
  node -e "const s=require('fs').readFileSync('alpha-coach.html','utf8');
    const m=s.match(/<script>([\s\S]*)<\/script>/); require('fs').writeFileSync('/tmp/a.js',m[1]);"
  node --check /tmp/a.js
  ```
- New state key? Add it to `defaultState()` **and** handle it in `migrate()`. Saved
  data from an older build is the most common source of blank pages.
- New screen? Add it to the allowed list in `migrate()` or a saved
  `ui.screen` pointing at it will be reset.

## Things that have bitten before

- **A missing key in saved state took the whole app blank.** `migrate()` now fills
  every key from `defaultState()` and type-checks. Keep it that way.
- **Re-rendering a modal wipes what the user typed.** Anything the user edits inside a
  modal must live in state (`S.ui.*`), not only in the DOM.
- **`commitMeal` is the only place a meal gets logged.** Buttons and chat both land
  there. Do not add a second path.
- **Full re-render on a timer causes jank.** The tick patches text nodes and only
  re-renders when a meal's state actually changes.

## Before you hand back

1. `npm test` green
2. `npm run test:boot` green
3. A new test covering what you changed, in `test/verify.mjs`
4. One sentence on what changed and what you verified, not a description of the diff
