# Alpha Coach — Local-First Data, Supabase & Photo-Kcal Architecture

Owner: Michael (god / orchestrator) · Date: 2026-08-20 · Status: APPROVED program, phased
Grounds all engineering dispatches for the "fix-all + Supabase + HuggingFace photo/kcal" build.

> Human directive (2026-08-20): "Fix all that you have mentioned. Add Supabase to it. Check
> HuggingFace for databases and adapt to it in our systems for photo logging and kcal analyzing.
> Keep it on local right now before we connect it to a server later."

---

## 0. Non-negotiables (carry into every phase)

The six invariants still bind. The two that constrain this work most:

- **#1 — schedule anchors on `ateAt`, not `loggedAt`.** A photo's capture time is a *logged* time;
  the eaten time is still the user's stated `ateAt`. Photo logging MUST route through the existing
  `readAteTimeInput` semantics. A photo never silently sets `ateAt = now`.
- **#3 — extras ship OFF.** Photo logging, the kcal engine, and account sync are all **opt-in,
  default-off**, exactly like inventory. A fresh install behaves byte-identically to today.
- **#5 — never claim something happened that didn't.** A kcal *estimate* is labelled an estimate
  with its confidence; a low-confidence photo classification asks the user to confirm, it does not
  assert. No fabricated numbers, no silent rounding presented as truth.
- **#2 — `Points.award()` is the only scoring write path.** Nothing in the photo/kcal/sync layers
  awards points except through `award()` with a known RULES code.

Local-first means: **no network call is required for the core loop today.** Everything degrades to
today's offline single-file behaviour if every new module is off or unreachable.

---

## 1. HuggingFace evidence (what we adapt)

Searched the Hub 2026-08-20 (authenticated as `bjithendra03`). Selected sources:

### Photo → food label (on-device classification)
- **`ethz/food101`** — 101 food categories, 101k images, the canonical benchmark (605k downloads,
  143 likes). This is our **label space**: 101 classes.
- Fine-tuned ViT checkpoints on food101 exist and export cleanly to ONNX for **transformers.js**
  (in-browser, no server): e.g. `Shresthadev403/food-image-classification`,
  `SeyedAli/Food-Image-Classification-VIT`, `Luke537/image_classification_food_model`
  (all `google/vit-base-patch16-224-in21k` fine-tunes, `dataset:food101`).
- **Decision:** classification runs **on-device via transformers.js (ONNX)**, lazily downloaded on
  first opt-in. Keeps "local" true — no image ever leaves the device. Model is NOT bundled in the
  HTML (it's ~85 MB); it is fetched once to IndexedDB/Cache when the user turns the feature on.

### Food/barcode → kcal + macros (bundled lookup)
- **`openfoodfacts/product-database`** — the Open Food Facts product DB (13.2 k downloads, 139
  likes, ODbL). Carries **barcodes + `nutriments` (energy-kcal, protein, carbs, fat) per product**.
  This is our source for **(a) barcode lookup** and **(b) the food→kcal seed table**.
- **`openfoodfacts/FoodIntake/openfoodfacts_package_weights`** — serving/package weights, for
  turning "1 item" into grams.
- **`panikos/nutrition5k_dataset` / `TeeA/nutrition5k-food-name-gemini`** — Google Nutrition5k:
  per-dish **calorie + mass + macro ground truth** for plated meals. Used to calibrate the
  101-class → typical-portion-kcal map and to sanity-check estimates.

**Licensing note (must respect):** Open Food Facts data is **ODbL** (attribution + share-alike on
the DB). We bundle a *derived compact subset* and carry the attribution string in-app. Food-101 is
research-licensed images; we ship only *class labels + a trained model's weights*, never the images.
Flag any redistribution concern to god before shipping.

---

## 2. Target architecture (local now, server later)

```
                         alpha-coach.html  (single file, offline-first)
   ┌───────────────────────────────────────────────────────────────────────┐
   │  Schedule engine · Inventory ledger · Discipline points  (UNCHANGED)   │
   │                                                                        │
   │  NEW, all opt-in / default-off:                                        │
   │   ┌── data layer ─────────────────────────────────────────────────┐   │
   │   │  store adapter  ──►  LocalAdapter (localStorage/IndexedDB) [NOW]│   │
   │   │                 ──►  SupabaseAdapter (same interface)   [LATER] │   │
   │   └────────────────────────────────────────────────────────────────┘  │
   │   ┌── nutrition ──────────────────────────────────────────────────┐   │
   │   │  foodDb.json (bundled, OFF-derived)  +  barcode index          │   │
   │   │  kcalEngine: label|barcode|manual → kcal/macros (est + conf)   │   │
   │   └────────────────────────────────────────────────────────────────┘  │
   │   ┌── photo logging ─────────────────────────────────────────────┐    │
   │   │  capture → IndexedDB blob → classifier(transformers.js/ONNX)  │    │
   │   │  → label → kcalEngine → user CONFIRMS ateAt + amount → log    │    │
   │   └───────────────────────────────────────────────────────────────┘   │
   └───────────────────────────────────────────────────────────────────────┘
```

### 2.1 The store adapter (the seam that makes "local now, server later" real)
Introduce ONE persistence interface, so today's `localStorage['alphacoach.v2']` and tomorrow's
Supabase are swappable **without touching engine code**:

```
interface Store {
  load(key): Promise<obj>        // returns app state slice
  save(key, obj): Promise<void>
  subscribe(key, cb): unsub      // for future realtime; no-op locally
}
```
- **NOW:** `LocalAdapter` wraps localStorage (+ IndexedDB for blobs/photos). Ships active.
- **LATER:** `SupabaseAdapter` implements the same three methods against Supabase Postgres +
  Realtime + Storage. Selecting it is a **single config flag** + a URL/anon-key. No engine rewrite.
- Current synchronous localStorage reads are wrapped; the app boots from a hydrated snapshot so the
  async seam doesn't change first-paint behaviour.

### 2.2 Supabase (added now, pointed local)
- Author the **schema as Supabase-ready SQL migrations** now (`office/supabase/migrations/*.sql`):
  `profiles`, `days`, `meals` (`ate_at timestamptz`, `logged_at timestamptz` — invariant #1 in the
  schema itself), `meal_photos` (Storage ref + label + confidence), `food_items` (kcal/macros),
  `points_ledger` (append-only; mirrors `Points.award`). RLS policies drafted (`user_id = auth.uid()`).
- **Local dev:** run against a **local Supabase stack** (`supabase start`, Docker) OR keep migrations
  on disk unrun. Either way **no hosted project is created yet** (honours "keep it on local"). We do
  NOT call the Supabase MCP `create_project` until the human says "connect it to a server."
- The app does NOT depend on Supabase to function — `SupabaseAdapter` is dormant behind the flag.

### 2.3 Photo logging (local, honest)
1. User opts in (default OFF). First use lazily fetches the ONNX food classifier → Cache/IndexedDB.
2. Capture/upload photo → stored as a blob in **IndexedDB** (never uploaded anywhere locally).
3. `classifier(photo)` → top-k Food-101 labels + softmax confidence.
4. `kcalEngine(label)` → typical-portion kcal/macros **as an estimate with a confidence band**.
5. **User confirms**: the food, the amount (portion multiplier), and — critically — **`ateAt` via
   the existing eatTimeControl** (invariant #1). Low confidence ⇒ we *ask*, never assert (invariant #5).
6. Log flows through the normal meal path + `Points.award()`. Photo + label + confidence persisted.

### 2.4 kcal engine
- Inputs: a Food-101 label, OR a scanned barcode, OR a manual food-search hit → output kcal + P/C/F
  for a stated portion, each tagged `{source, confidence, isEstimate:true}`.
- `foodDb.json`: compact bundled table (barcode index + 101-class portion map), derived offline from
  Open Food Facts + Nutrition5k by a **repeatable build script** (`office/supabase/build-fooddb.mjs`)
  — NOT hand-typed. Script is committed so the DB is reproducible and auditable.

---

## 3. The "fix-all" list, mapped to phases

From the Product Council review (office/product-council-review.md), in dependency order:

| # | Fix | Phase | Local-first? |
|---|-----|-------|--------------|
| A | Finish **eat-time V2** sign-off (in QA now) | 0 | yes |
| B | Land **geometric redesign** (held) + human appearance sign-off | 0 | yes |
| C | **Store adapter seam** + Supabase-ready schema/migrations | 1 | yes (local adapter) |
| D | **Bundled food DB + kcal engine** (OFF-derived, barcode index) | 2 | yes |
| E | **Barcode scan** (manual first; camera scan opt-in) → kcal | 2 | yes |
| F | **Photo logging** (on-device classifier → kcal → confirm ateAt) | 3 | yes (on-device) |
| G | **Full-close notifications** (service worker; needs https origin) | 4 | partial* |
| H | **Accessibility** screen-reader pass | 4 | yes |
| I | **Meal-variety engine** (27 meals exist, one template repeats) | 4 | yes |
| J | Reconcile `CLAUDE.md` "main" vs repo "master" before any PR | 0 | n/a |

*G needs the app served from an https origin for a real service worker; works locally via
`localhost` during dev, real push arrives when we host. Scaffold now, enable when served.

**Sequencing rule (unchanged):** correctness queue first. Phase 0 (eat-time sign-off + geometric)
lands before Phase 1 opens, so any regression is unambiguous on a clean file. Each phase is ONE
reviewable change; QA verifies structure + the HUMAN signs off on any appearance change.

---

## 4. What we do NOT do yet
- No hosted Supabase project (no `create_project`); no data leaves the device.
- No model bundled into the HTML; no image upload; no external inference endpoint.
- No silent migration of existing `alphacoach.v2` state — new stores are additive and off by default.

---

## 5. Open decisions for the human
1. **Execution seat:** the floor is god + QA Dwight only (Jim/Pam/Oscar archived). Phases 1–4 need
   an engineering seat. Re-seat an engineer, or authorise god to fork a Claude engineer subagent?
2. **Local Supabase stack:** stand up Docker `supabase start` locally now (fuller test), or keep
   migrations on-disk until we host? (Default: on-disk migrations now, no Docker.)
3. **ODbL attribution** placement in-app (Settings → About) — confirm acceptable.
