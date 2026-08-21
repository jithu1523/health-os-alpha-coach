# Research index

Every note lives here. Newest first. One line each — the decision, not the topic.

| Date | Note | Decision | Status |
|---|---|---|---|
| 2026-08-21 | [Cal-AI-grade food photo logging needs broader data and likely server mode](competitive-and-sota-food-recognition.md) | Keep Food-101 ONNX as privacy-first fallback, evaluate cloud/multimodal or larger native/server models for parity, and download Nutrition5k/Food-101 first before Food2K/ISIA pending license and compute approval. | proposed |
| 2026-08-20 | [Expand the food DB from open prepared-food sources](fooddb-expansion-sources.md) | Derive everyday prepared foods from USDA FNDDS/FDC first, use Open Food Facts for packaged/barcode rows with ODbL tracking, and fix fuzzy matching so weak-token near misses ask instead of returning hamburger for chicken sandwich. | proposed |
| 2026-08-20 | [Make marketing V2 feel premium through product-specific craft](premium-web-craft.md) | Build around a real interactive SVG ring, reactive vector mascot, restrained Grove/Ember-derived depth, and Lenis/Motion with optional Pixi/Three for one hero-grade scene; reject generic AI-gradient/card design. | proposed |
| 2026-08-20 | [Use a small, license-tracked marketing-site toolkit](marketing-site-toolkit.md) | Recommend Lenis as the smooth-scroll default, GSAP only for signature choreography with license tracking, Lucide/Geist as safe defaults, and vetted MIT templates for structure. | proposed |
| 2026-08-20 | [Confirm the Phase 3 on-device Food-101 classifier](phase3-classifier-due-diligence.md) | Use `onnx-community/swin-finetuned-food101-ONNX` for the first browser path, correcting q8 size to 93.3 MB and keeping kcal estimates gated by user confirmation; do not switch to PyTorch-only alternatives. | proposed |
| 2026-08-20 | [Require meal time, but make it a visible one-tap confirmation](meal-time-logging-placement.md) | Build the required `ateAt` input inline on the final logging confirmation, with honest defaults and one-tap corrections; do not hide it or make it a separate modal. | proposed |

---

## Standing questions

The researcher works through these unless given something more urgent. Ranked by what
would change our decisions most.

1. **Does anyone already do our wedge better?** Waking-time-anchored scheduling and
   kitchen-aware meal planning. If someone does, what is our answer?
2. **What does the evidence say about meal timing and meal frequency** for body
   composition, in humans, in a deficit? Our entire schedule engine rests on this
   mattering. If it does not, the wedge is convenience rather than physiology — which
   is still a product, but a different one.
3. **What actually retains people in nutrition apps past week three?** Measured, not
   claimed. Our audit says logging friction is the killer.
4. **Do streak and points mechanics help or harm adherence** in health behaviour
   specifically, as opposed to language learning? We inherited the mechanic; we have
   not checked it transfers.
5. **How accurate is photo-based calorie estimation** in current products, and what is
   the honest error band we should show users?
6. **What do the best inventory or pantry apps do** about the maintenance problem, and
   has anyone solved it?
7. **Barcode and food-database options** — coverage, licensing, cost, for Indian foods
   in particular.
8. **Protein targets in a deficit** for a trained adult — where is the actual evidence
   ceiling, and is our 1.8 g/kg defensible?

## Rules for this folder

- One file per question. Name it for the decision.
- Update this index in the same commit as the note.
- Mark a note **parked** rather than deleting it. Knowing what we already looked at
  and set aside is worth as much as the accepted ones.
