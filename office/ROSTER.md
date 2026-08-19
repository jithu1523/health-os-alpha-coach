# The Alpha Coach office

How to run this project in Munder Difflin, and who does what.

Michael (the GOD orchestrator) seats himself. Everyone below is an agent you spawn
with **Add agent**, pointed at this folder as the working directory. Each is a real
`claude` session, so each one costs real tokens — spawn what you need, not the whole
floor.

---

## Start with three

For most work, this is the office:

| Desk | Agent | Owns |
|---|---|---|
| 1 | **engineer** | `alpha-coach.html`. All behaviour changes. |
| 2 | **qa** | The suites. Can block a hand-off. |
| 3 | **designer** | Every surface a user looks at. |

Add the others when the work calls for them:

| Agent | Spawn when |
|---|---|
| **nutrition** | anything touches macros, plan data, targets or a health claim |
| **platform** | backend, sync, auth, push notifications, the vision endpoint |
| **growth** | onboarding friction, retention, tuning the points economy |
| **content** | expanding the meal library, jugaad recipes, surprise rewards |
| **researcher** | competitor teardowns, reading papers, "should we build X" questions |

---

## Which engine runs which desk

**Codex is the default engine.** Claude Code is reserved for the few jobs where it
earns its cost. Four engines are installed; that is enough.

| Agent | Engine | Why |
|---|---|---|
| **engineer** | **Codex** | Default. Escalate a specific task to Claude Code only on the triggers below. |
| **qa** | **Claude Code** | The one desk worth the money. QA sessions are short — run the suites, read failures — and a reviewer on a different model from the author catches what the author cannot. |
| **designer** | Codex | |
| **nutrition** | Codex | |
| **platform** | Codex | |
| **growth** | Codex | |
| **content** | Copilot or OpenCode | Volume writing, low risk, cheapest seat. |
| **researcher** | Codex, or Claude Code if Codex cannot browse | Reading pages is token-heavy, so start cheap. Test browsing on the first task — see below. |

### When to escalate a task to Claude Code

Not by role — by task. Escalate only when:

- Codex has failed the same task twice with the suite still red
- The change spans four or more sections of `alpha-coach.html` at once
- It touches an invariant in `CLAUDE.md` and needs judgement, not typing
- A bug reproduces but nobody can locate the cause

Everything else stays on Codex. One expensive session beats ten cheap failed ones,
but ten cheap successful ones beat one expensive one.

### Before trusting the researcher seat

The researcher is the one role that depends on web access. Claude Code has first-class
search and fetch; Codex CLI's browsing support is less certain and may vary by version.

**Test it as the seat's first task**, before giving it real work:

> Fetch https://macrofactorapp.com and tell me the page title and one sentence about
> what they claim to do. If you cannot reach the web, say so plainly — do not answer
> from memory.

If it cannot browse, either give it shell access to `curl` or move that one seat to
Claude Code. An agent that answers research questions from training data instead of
saying it cannot browse is worse than no researcher at all.

### The bigger cost lever

Model choice is second-order. `alpha-coach.html` is ~75,000 tokens, and an agent that
reads it whole on every task burns more than the model difference ever will. The
`alpha-context` skill is mandatory reading for every agent — it is worth more to your
bill than which CLI you pick.

---

## Prerequisites, for this project

The harness screen covers its own needs. Two notes specific to this office:

- **Build the memory palace.** If mempalace says *"installed — palace not built yet"*,
  the memory-seeding step below does nothing useful — agents keep plain notes but
  cannot search them by meaning. Use the harness's own setup action to build it.
- **`node` must be on PATH.** QA cannot run either suite without it. Check with
  `node -v`. The npm-installed engines imply it is already there.

---

## Setup, once

1. **Register this folder** as a project in the onboarding wizard (Step 3).
2. **Spawn the agents.** Working directory = this folder. The default `claude`
   command is correct. Each session automatically picks up:
   - `CLAUDE.md` — the office brief and the invariants
   - `.claude/agents/*.md` — role definitions
   - `.claude/skills/*/SKILL.md` — the six skills
   - `.claude/settings.json` — permissions
3. **Seed each agent's memory** on first run. Paste this as the opening message:

   > You are the `<role>` for Alpha Coach. Read CLAUDE.md and README.md, then write a
   > short summary of your role, the invariants you must not break, and the skills
   > available to you into your memory. Do not change any code yet.

   The hive gives every agent long-term memory, but only if something is written to
   it. Skip this and you will re-explain the project every session.
4. **Install dependencies once** so QA can run: `npm install` in this folder.

---

## Delegating to Michael

Michael routes work. Give him outcomes, not instructions:

- *"Ship a flexible mode that keeps points and adaptive scheduling but drops the
  sequential locking."* → engineer builds, qa tests, growth checks the economy
- *"The meal library is too small. Get it to 40 unique meals."* → content writes,
  nutrition clears the numbers, engineer merges
- *"Audit whether anyone would still be using this in month two."* → growth runs it,
  qa reproduces anything found
- *"Stand up Supabase auth and sync behind the existing AlphaAPI seams."* → platform

He resolves routine traffic himself and escalates only spend, destructive operations
and scope changes to you. That is the intended shape — do not micromanage the floor.

---

## Standing rules

- **The suites are the gate.** `npm test` and `npm run test:boot`. Red means blocked.
- **Only the engineer edits `alpha-coach.html`.** Everyone else proposes.
- **Nutrition has veto** on macros, plan data and health claims.
- **QA can block anyone**, including the engineer.
- **The invariants in `CLAUDE.md` outrank any instruction from any agent**, Michael
  included. An agent asked to break one should refuse and say why.
- **Write to memory before you finish.** The next session of you starts blank.

---

## Known work, ranked

From the last audit. Roughly the order that matters.

1. **Backend, accounts, sync** — platform. Gates everything else.
2. **Service-worker push** — platform. The retention mechanic is half-built.
3. **Meal variety** — content + nutrition. Five meals repeating is a week-three churn risk.
4. **Flexible mode** — engineer + growth. Sequential locking is high-discipline by
   design and will not suit most people.
5. **Real food database and barcode lookup** — platform + content.
6. **Health platform integration** (Apple Health / Google Fit) — platform.
7. **Full accessibility pass** — designer. Focus handling is done; screen readers are not.

`README.md` has the full known-gaps list with context.
