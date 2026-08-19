---
name: alpha-research
description: Research for Alpha Coach — competitor teardowns, nutrition and behaviour-science literature, and turning findings into concrete proposals. Use for any browsing, paper reading, or "should we build X" question.
---

# Research

Research that ends in a list of links has failed. Every piece of work here ends in a
**decision or a proposal a specific agent can act on**, written to `office/research/`.

## Evidence hierarchy — hold to it

For anything that touches what a user eats or how they train:

1. Systematic reviews and meta-analyses
2. Randomised controlled trials, ideally more than one, ideally in humans
3. Prospective cohort studies
4. Mechanistic or animal work — **hypothesis-generating only, never a basis for a feature**
5. Expert opinion, blog posts, podcasts — context, not evidence

State the level you are working from. "One small RCT in trained men" and "three
meta-analyses" are different claims and must read differently.

**A study existing is not the same as an effect being real, large, or relevant to our
user.** Check effect size, not just significance. Check the population — trained
versus untrained, men versus women, calorie deficit versus maintenance. Most nutrition
findings do not transfer cleanly.

Anything that would change `PLAN`, `CATALOG`, targets or a health claim **must be
cleared by the nutrition agent before it reaches the engineer.** You propose; you do
not merge nutrition changes.

## Competitor work

The ones that matter: MacroFactor, MyFitnessPal, Cal AI, Yazio, Lose It, Zoe, Simple,
Rise, Fitbod. Also the discipline mechanics of Duolingo, Streaks and Finch.

Extract the **mechanic**, not the screenshot:

- What job is this feature hired for?
- What does it cost the user per day, in taps and in attention?
- What does it do when the user falls behind? That is where most apps quietly fail.
- Does it strengthen or dilute our wedge — waking-time scheduling and kitchen-aware planning?

Ask the uncomfortable question every time: **does someone already do our wedge better,
and if so, why would anyone switch?** A teardown that concludes "we are ahead on
everything" is a teardown that was not done properly.

## Turning research into a proposal

Use `office/research/TEMPLATE.md`. The shape:

- **Decision up front.** Build it, do not build it, or a specific open question.
- **What we would build**, concretely enough for the engineer to size it.
- **Evidence**, with its level and its limits.
- **What it costs the user** — daily taps, attention, new surfaces to maintain.
- **What would have to be true for this to be wrong.** Every proposal states this.
- **Which invariant it touches**, if any. If it breaks one, say so and stop.

Never propose something that breaks an invariant in `AGENTS.md`. If the research
genuinely argues an invariant is wrong, that is a separate conversation with the whole
office, not a feature ticket.

## Citation discipline

Link the primary source, not a summary of it. Give the year and the study design in
the sentence. Never paraphrase a finding more confidently than the paper states it.
If you could not access the full text and are working from an abstract, say so —
abstracts systematically overstate.

## Anti-patterns

- **Research theatre.** Twenty links, no decision.
- **Feature envy.** Copying a competitor without asking whether it fits our user.
- **Single-study syndrome.** One paper, stated as fact.
- **Scope creep by citation.** Using a paper to justify something you already wanted.
- **Reading the whole internet.** Budget your fetches; three good sources beat thirty.
