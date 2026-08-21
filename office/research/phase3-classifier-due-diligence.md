# Phase 3 Classifier Due Diligence

Author: researcher Oscar (hive)  
Date: 2026-08-20  
Status: proposed - feeds `phase3-photo-logging`, no app/code changes

## Decision

**CONFIRM `onnx-community/swin-finetuned-food101-ONNX` for Phase 3, with corrected size copy and a hard confirmation UX.**

It is the only real Hugging Face Food-101 model I found that is already tagged `transformers.js`, ships ONNX files, exposes the canonical 101 Food-101 labels, and can be loaded directly by the browser image-classification pipeline. The main correction to the existing spike is download size: the q8/int8 ONNX file is **93,297,500 bytes (93.3 MB / 89.0 MiB)**, not "~85 MB". The fp16 file is **177,017,515 bytes (177.0 MB / 168.8 MiB)**.

Do **not** switch to `nateraw/food`, `Shresthadev403/food-image-classification`, or `prithivMLmods/Food-101-93M` for the first browser build. They are useful comparators, but as of this check they are PyTorch/safetensors repos without shipped ONNX browser artifacts, so they add conversion and validation work before they can run in `transformers.js`.

## What we would build

- Lazy-load `onnx-community/swin-finetuned-food101-ONNX` only after explicit user opt-in.
- Use the `image-classification` pipeline with the ONNX path already in the HF repo.
- Prefer the q8/int8 file for the default browser path; keep fp16/WebGPU as a later performance experiment, not the first shipped path.
- Cache model files in browser Cache/IndexedDB through the existing transformers.js/HF Hub loader; never bundle weights into `alpha-coach.html`.
- Treat output as a top-k suggestion list. The user must confirm food, amount, and `ateAt` before anything is logged.

## Evidence Grade

**Engineering evidence: moderate.** The repository metadata, file listing, CORS headers, and transformers.js docs are direct primary sources. I did not download and run the model in-browser in this task.

**Model-quality evidence: thin to moderate.** Accuracy figures are Hugging Face model-card/self-reported eval metrics on Food-101. I found top-1 accuracy for the main candidates; I did **not** find model-card top-5 accuracy for these HF repos. No independent Alpha Coach phone-camera eval exists yet, so real-product accuracy remains unproven.

## Candidate Table

| Candidate | Browser-ready ONNX? | Params / model size | Food-101 top-1 | Food-101 top-5 | License | Decision |
|---|---:|---:|---:|---:|---|---|
| [`onnx-community/swin-finetuned-food101-ONNX`](https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX) | **Yes**: `onnx/` files + `transformers.js` tag | Approx 88M params inferred from fp32 file; q8/int8 93.3 MB, fp16 177.0 MB, fp32 352.4 MB | 0.9210 eval accuracy; model-index also lists 0.9136 validation accuracy | Not reported on card | Apache-2.0 | **Use it** |
| [`nateraw/food`](https://huggingface.co/nateraw/food) | No shipped ONNX | ViT-base class, fp32 PyTorch `pytorch_model.bin` 343.6 MB | 0.8913 | Not reported | Apache-2.0 | Do not use unless we convert/test ONNX ourselves |
| [`Shresthadev403/food-image-classification`](https://huggingface.co/Shresthadev403/food-image-classification) | No shipped ONNX | ViT-base class, `model.safetensors` 343.5 MB | 0.8831 | Not reported | No license tag/card license found | Reject for first build |
| [`prithivMLmods/Food-101-93M`](https://huggingface.co/prithivMLmods/Food-101-93M) | No shipped ONNX | 93M params on card, F32 `model.safetensors` 371.9 MB | 0.8973 from card classification report | Not reported as eval metric; demo shows top-5 display only | Apache-2.0 | Interesting later candidate if converted, but not first browser path |
| [`Amrrs/indian-foods`](https://huggingface.co/Amrrs/indian-foods) / [`Amrrs/south-indian-foods`](https://huggingface.co/Amrrs/south-indian-foods) | No shipped ONNX | ViT-base class, fp32 PyTorch 343.3 MB each | 0.9286 / 0.875, but on tiny 5-class cuisine datasets, not Food-101 | Not reported | No license tag/card license found | Not comparable; possible future cuisine supplement only |

### Exact ONNX Files For The Recommended Model

Repo: `onnx-community/swin-finetuned-food101-ONNX`  
Commit observed in headers: `e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8`

| Path | Bytes | MB | Notes |
|---|---:|---:|---|
| `onnx/model_int8.onnx` | 93,297,500 | 93.3 | preferred default q8/int8 browser file |
| `onnx/model_quantized.onnx` | 93,297,500 | 93.3 | same size as int8 |
| `onnx/model_uint8.onnx` | 93,297,500 | 93.3 | same size as int8 |
| `onnx/model_fp16.onnx` | 177,017,515 | 177.0 | possible WebGPU/fp16 experiment, not default |
| `onnx/model.onnx` | 352,389,545 | 352.4 | full fp32; too large for first mobile path |
| `onnx/model_q4f16.onnx` | 52,685,075 | 52.7 | smaller, but requires quality/perf validation before considering |
| `onnx/model_bnb4.onnx` | 55,043,231 | 55.0 | smaller, but requires quality/perf validation before considering |
| `onnx/model_q4.onnx` | 60,448,784 | 60.4 | smaller, but requires quality/perf validation before considering |

Use this resolve URL pattern for lazy fetches:

```text
https://huggingface.co/{repo_id}/resolve/{revision}/{path}
```

Concrete q8 path:

```text
https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX/resolve/main/onnx/model_int8.onnx
```

The HF docs show this same `/resolve/main/<filename>` URL shape for `hf_hub_url()`, and the HEAD check for `model_int8.onnx` returned `content-length: 93297500`, `accept-ranges: bytes`, `x-linked-size: 93297500`, and final CDN `access-control-allow-origin: *`. With an explicit `Origin: http://localhost:8080`, the initial HF resolver response reflected that origin, so browser lazy-fetch looks feasible. Caveat: unauthenticated resolver requests are rate-limited; the product should treat first-download failure as a graceful "try again on Wi-Fi" state, not a broken logging flow.

## Transformers.js Compatibility

Confirmed for the recommended model:

- HF model card has `library_name: transformers.js` and `pipeline_tag: image-classification`.
- The model card shows direct usage with `pipeline('image-classification', 'onnx-community/swin-finetuned-food101-ONNX')`.
- The repo contains `config.json`, `preprocessor_config.json`, and ONNX model files under `onnx/`.
- `config.json` exposes 101 labels matching Food-101 label strings such as `apple_pie`, `grilled_salmon`, `samosa`, `sushi`, `tacos`, and `waffles`.
- Transformers.js docs state that it runs Transformers in the browser without a server, uses ONNX Runtime, supports computer-vision image classification, and recommends quantized dtypes for browser constraints.

The alternatives do not meet this bar because their repos have only `pytorch_model.bin` or `model.safetensors` and no `onnx/` artifacts. Transformers.js can work with converted models, but that is a separate engineering project and would need its own quality/performance validation.

## Coverage Against Our Food DB

Food-101 is broad, but it is not "all food." It has 101 plated-dish classes, mostly Western/restaurant categories plus some international classes (`bibimbap`, `gyoza`, `pad_thai`, `pho`, `samosa`, `sushi`, `takoyaki`). It does **not** identify branded foods, individual ingredients, exact recipes, drinks, supplements, or most Indian home foods.

Local coverage today is incomplete:

- `office/supabase/foodDb.sample.json` has 42 sample items.
- 25 of those keys are Food-101 labels.
- 76 Food-101 labels are missing from the sample DB, including common classifier outputs such as `baby_back_ribs`, `bibimbap`, `breakfast_burrito`, `chicken_wings`, `dumplings`, `falafel`, `fish_and_chips`, `lasagna`, `miso_soup`, `pad_thai`, `pho`, `samosa`, and `tiramisu`.
- 17 sample keys are useful manual/barcode/staple entries outside Food-101, such as `banana`, `white_rice`, `chicken_breast`, `protein_shake`, `coca_cola`, and `nutella`.

This means Phase 3 depends on Phase 2 finishing the full 101-class typical-portion map. Until then, many photo labels must return `needsConfirmation` / `kcal:null`, not a fabricated estimate.

## License And Redistribution

Recommended path:

- Model repo license: Apache-2.0 on the HF card.
- Use pattern: lazy fetch from the public HF model repo after explicit opt-in, cache locally, do not bundle in `alpha-coach.html`.
- Required product hygiene: show model attribution and Apache-2.0 notice in the feature/about copy; do not imply Alpha Coach owns the model; retain a graceful failure path if HF hosting/rate limits/network are unavailable.

I did not find a license blocker for lazy-fetching the Apache-2.0 model weights from HF. I would still have legal/product review the exact About/attribution copy before public distribution because this is not legal advice and HF terms require compliance with service terms, model license, and applicable law.

Food-101 itself is cited as a research dataset with 101,000 images, 101 classes, 750 train images and 250 manually reviewed test images per class. Alpha Coach should not redistribute Food-101 images. Using model weights and labels is materially different from bundling the image dataset, but the UI should avoid any claim that Food-101 coverage means complete real-world food coverage.

## Invariants Touched

- **#1 `ateAt`, never `loggedAt`:** photo capture/classification time must never become eaten time. The final log still uses the existing ate-time confirmation.
- **#3 extras ship off:** no model download until explicit opt-in.
- **#5 never claim what did not happen:** show label confidence, top-k alternatives, and estimate language; low confidence or missing DB mapping asks the user instead of asserting.
- **#2 scoring write path:** classifier output must not award points; only the normal confirmed meal-log path can reach `Points.award()`.

## What Would Have To Be True For This To Be Wrong

- A different HF repo already ships a Food-101 or better food classifier with `transformers.js` + ONNX artifacts, a smaller q8/fp16 browser file, equal or better independently verified accuracy, and a clean license. I did not find one in HF search/API results.
- The smaller q4/q4f16/bnb4 files for the recommended repo retain acceptable top-k quality on real user phone photos. If true, the first-load size could drop to roughly 53-60 MB, but this requires an actual browser eval before switching.
- Our Phase 2 food DB produces full, calibrated mappings for all 101 labels. If it does not, photo logging should remain parked or ship as "label suggestion only" rather than kcal estimation.
- A small Indian-food specialist model, converted to ONNX, materially improves real user logging enough to justify a second model and a model-router UX. That is plausible later, but it does not replace the Phase 3 base classifier.

## Sources

- Hugging Face model card: [`onnx-community/swin-finetuned-food101-ONNX`](https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX)
- HF API file listing used for exact sizes: [`/api/models/onnx-community/swin-finetuned-food101-ONNX?blobs=1`](https://huggingface.co/api/models/onnx-community/swin-finetuned-food101-ONNX?blobs=1)
- HF raw config used for 101 label check: [`config.json`](https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX/raw/main/config.json)
- Hugging Face Transformers.js docs: <https://huggingface.co/docs/transformers.js/en/index>
- Hugging Face Hub file download docs: <https://huggingface.co/docs/huggingface_hub/en/package_reference/file_download>
- Hugging Face Terms of Service: <https://huggingface.co/terms-of-service>
- Food-101 dataset card: <https://huggingface.co/datasets/ethz/food101>
- ETHZ Food-101 original dataset page: <https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/>
- Alternative HF models checked: [`nateraw/food`](https://huggingface.co/nateraw/food), [`Shresthadev403/food-image-classification`](https://huggingface.co/Shresthadev403/food-image-classification), [`prithivMLmods/Food-101-93M`](https://huggingface.co/prithivMLmods/Food-101-93M), [`Amrrs/indian-foods`](https://huggingface.co/Amrrs/indian-foods), [`Amrrs/south-indian-foods`](https://huggingface.co/Amrrs/south-indian-foods)
- Local architecture/spike files: `office/local-first-photo-kcal-architecture.md`, `office/photo-classify-spike.md`, `office/supabase/foodDb.sample.json`, `office/modules/kcalEngine.mjs`
