---
name: alpha-context
description: Work inside alpha-coach.html without burning context. Use on EVERY task that touches the app file. Reading the whole file costs roughly 75k tokens each time — this skill is how you avoid that.
---

# Context budget

`alpha-coach.html` is ~290 kb, roughly **75,000 tokens**. Reading it whole is the
single most expensive thing an agent can do here, and most tasks need less than 2% of
it. Read narrow.

## Never do this

- `Read` the whole file
- Re-read it after every edit to "check"
- Paste large regions into your reasoning to think about them

## Do this instead

**1. Locate first, read second.** Every section has a banner comment.

```bash
grep -n "SCHEDULE ENGINE\|function buildSchedule" alpha-coach.html
sed -n '1010,1060p' alpha-coach.html          # only the region you need
```

**2. Use Grep with context, not Read.** `output_mode: content` with `-C 12` gives you
the function and its neighbours for a few hundred tokens.

**3. Edit by unique anchor.** Match the smallest unique string and replace it. Never
rewrite a region you had to read in full to reproduce.

**4. Verify by running, not by reading.** After an edit:

```bash
node -e "const s=require('fs').readFileSync('alpha-coach.html','utf8');
  const m=s.match(/<script>([\s\S]*)<\/script>/);
  require('fs').writeFileSync('/tmp/a.js',m[1]);"
node --check /tmp/a.js && npm test
```

The suite tells you whether it works. Re-reading the file does not.

## Section map — go straight here

| Looking for | Grep for |
|---|---|
| colours, spacing, type | `ALPHA COACH — tokens` |
| mascot SVG | `function Mascot` |
| plan data, catalogue | `const CATALOG` / `const PLAN` |
| stock maths | `function tx(` |
| meal times, compression | `function buildSchedule` |
| punctuality scoring | `function classifyLog` |
| points rules | `const RULES` |
| meal replacement | `function resolveMeal` |
| chat parsing | `function parseClause` |
| chat execution | `function runOp(` |
| a screen | `function Screen<Name>` |
| a modal | `function Overlay` |
| actions | `const ACT` |
| state shape | `function defaultState` |
| migration | `function migrate` |

## Budget guide

| Task | Should cost |
|---|---|
| one-line copy change | under 5k tokens |
| a new points rule | under 15k |
| a new modal | under 30k |
| a new screen | under 60k |

If you are past double these, stop and re-plan. You are almost certainly re-reading
something you already have.

## Cheap escalation

If a task genuinely needs the whole file — a global refactor, a rename across
sections — say so and hand it up rather than grinding through it in a loop. One
expensive session beats ten cheap failed ones.
