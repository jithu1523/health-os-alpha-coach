# Photo → Food Classification — Feasibility Spike

Author: Claude engineer (hive) · Date: 2026-08-20 · Status: research spike (NOT app code)
Architecture doc: `office/local-first-photo-kcal-architecture.md` §1, §2.3
Companion module: `office/modules/kcalEngine.mjs`

> Question posed: can a Food-101 ONNX vision-transformer run **fully in-browser via
> transformers.js**, **offline** after a **one-time** model fetch cached to
> IndexedDB/Cache, with the **image never leaving the device**, and its output map
> cleanly onto `kcalEngine`? — **Verdict: YES, feasible.** One real cost: a one-time
> ~85 MB model download on first opt-in. No image ever uploads. No model is
> downloaded as part of this spike.

---

## 1. Concrete model

**Recommended (transformers.js-native, zero export work):**
[`onnx-community/swin-finetuned-food101-ONNX`](https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX)

- **Library tag:** `transformers.js` — ships an `onnx/` folder ready to load, no
  conversion step. License **Apache-2.0** (clean; weights only — no Food-101 images
  redistributed, matching the licensing note in the architecture doc §1).
- **Architecture:** Swin (a hierarchical vision transformer) fine-tuned on Food-101.
- **Label space:** the canonical **101 Food-101 classes** — the exact label space the
  architecture doc commits to (§1). Base checkpoint
  [`aspis/swin-finetuned-food101`](https://huggingface.co/aspis/swin-finetuned-food101)
  reports ~95% top-1 on Food-101 (its model card model-index).

**Pure-ViT alternative** (if we want a plain `google/vit-base-patch16-224` fine-tune
as the architecture doc's §1 list suggests — e.g.
[`nateraw/food`](https://huggingface.co/nateraw/food), 85.9M-param ViT, Apache-2.0, or
[`Shresthadev403/food-image-classification`](https://huggingface.co/Shresthadev403/food-image-classification),
85.9M-param ViT): these ship **PyTorch weights only**, so they need a **one-time
offline ONNX export** (Optimum / `Xenova` conversion) before transformers.js can load
them. The onnx-community Swin model above avoids that step, so it is the pick for the
spike. Both are ViT-family; either satisfies "a Food-101 ViT fine-tune on HF".

### Approximate size (the one real cost)
Swin-base ≈ 87M params. As shipped for the browser:
- **Quantized (int8) ONNX ≈ ~85 MB** ← what we load; matches architecture doc's ~85 MB.
- fp16 ≈ ~175 MB, fp32 ≈ ~350 MB (avoid on the browser path).

Numbers are approximate — confirm the exact `onnx/model_quantized.onnx` byte size
against the repo's file listing before shipping the download-size copy to users.

---

## 2. Exact transformers.js pipeline call

transformers.js is loaded locally (bundled or self-hosted ESM — no CDN in the
single-file app). The classifier is created **once, lazily, on first opt-in**:

```js
import { pipeline, env } from '@huggingface/transformers';

// Local-first knobs:
env.allowRemoteModels = true;   // allow the ONE-TIME fetch from HF on first opt-in
env.useBrowserCache   = true;   // cache weights in the browser Cache/IndexedDB
// (after first load, set allowRemoteModels=false to guarantee offline-only)

const classify = await pipeline(
  'image-classification',
  'onnx-community/swin-finetuned-food101-ONNX',
  { quantized: true }           // pull the ~85 MB int8 weights, not fp32
);

// `photoBlobUrl` is an object URL for the IndexedDB blob — the image stays local.
const results = await classify(photoBlobUrl, { topk: 3 });
```

- **First call:** downloads weights once → transformers.js writes them to the
  **Cache Storage / IndexedDB** the browser gives it. **Subsequent calls are fully
  offline** — no network, honoring "no network call is required for the core loop."
- **The image never leaves the device.** `classify()` runs the ONNX graph locally
  (WASM, or WebGPU where available); there is **no inference endpoint**, no upload.
  This is the whole point of on-device classification (architecture §1 "Decision").

---

## 3. Output shape (top-k + confidence)

```js
[
  { label: 'apple_pie',   score: 0.87 },   // softmax prob in [0,1]
  { label: 'cheesecake',  score: 0.06 },
  { label: 'bread_pudding', score: 0.03 }
]
```

- `label` — a Food-101 class string (underscored, e.g. `apple_pie`, `grilled_salmon`).
- `score` — softmax confidence in **[0,1]**; the top-k array sums toward 1.

---

## 4. Mapping to `kcalEngine`

The class label is the `key` for a **`source: 'label'`** lookup; the softmax score
gates whether we assert or ask (invariant #5):

```js
import { createKcalEngine, CONFIRM_THRESHOLD } from './modules/kcalEngine.mjs';
const { estimateKcal } = createKcalEngine(foodDb);   // foodDb.sample.json / foodDb.json

const top = results[0];                               // { label, score }
const est = estimateKcal({ source: 'label', key: top.label, portion: userPortion });
// est => { kcal, protein_g, carbs_g, fat_g, confidence, isEstimate:true,
//          needsConfirmation, ... }
```

- The Food-101 `label` strings already match the **underscored `key`s** the seed uses
  (`apple_pie`, `french_fries`, `grilled_salmon`, …), and `kcalEngine.normalizeKey`
  handles case/underscores — so the classifier output drops straight in.
- **Two honesty gates stack (invariant #5):**
  1. classifier confidence (`score`) — low top-1 or a close top-2 ⇒ show the top-k as
     a *pick list* and **ask**, don't assert;
  2. `est.needsConfirmation` — a Food-101 class the DB doesn't cover, or only fuzzy-
     matches, comes back low-confidence with `kcal:null`, so we ask rather than invent.
- **Invariant #1 is untouched:** the photo's capture time is a **logged** time. After
  classification the user still confirms the food, the portion, and — critically —
  **`ateAt` via the existing `readAteTimeInput` control**. A photo never sets
  `ateAt = now`. (This spike does no logging; it only produces `label → estimate`.)
- **Invariant #3:** the whole path is opt-in / default-off. With it off, nothing
  downloads and the app is byte-identical to today.

---

## 5. Local-first story

1. Feature ships **OFF**. Turning it on is the only trigger for any network use.
2. **First opt-in:** one-time ~85 MB weight fetch → browser Cache/IndexedDB.
3. **Every use after that:** image → IndexedDB blob → local ONNX inference → top-k →
   `kcalEngine` → user confirms food + portion + `ateAt` → normal meal log path.
4. **No image upload, no inference endpoint, no model bundled in the HTML** — exactly
   the boundaries in architecture §4.

---

## 6. Risks & mitigations

| Risk | Detail | Mitigation |
|---|---|---|
| **First-load download (~85 MB)** | Big one-time fetch; costly on mobile data. | Gate behind explicit opt-in with a clear size warning; download only on Wi-Fi prompt; show progress; allow cancel. Cache so it happens once. |
| **Model size in storage** | ~85 MB sits in Cache/IndexedDB; some browsers evict under pressure. | Detect eviction and re-fetch on next opt-in use; keep the feature degradable (manual/barcode entry still works with the feature off). |
| **Accuracy / wrong class** | 101 classes only; real plates are mixed/occluded; top-1 can be wrong. | Never assert — surface top-k + confidence and **ask** (invariant #5). Nutrition5k calibration (see `build-fooddb.mjs`) sanity-checks portion kcal. |
| **DB coverage gap** | A predicted class may have no `food_items` row. | `kcalEngine` returns `needsConfirmation` + `kcal:null` (no fabrication) → user confirms/enters. |
| **WASM/WebGPU perf on low-end phones** | First inference can be slow (cold WASM). | Warm the pipeline after load; prefer WebGPU when available; keep UI responsive/async. |
| **License** | Weights Apache-2.0 (fine). Food-101 *images* are research-licensed. | We ship **weights + class labels only**, never the images (architecture §1). Flag any redistribution concern to god before shipping. |

**Not done in this spike:** no model downloaded, no app file touched, no logging wired.
Deliverable is the go/no-go + the exact call and mapping for Phase 3.
