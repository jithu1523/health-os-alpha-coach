# Competitive And SOTA Food Recognition

Author: researcher Oscar (hive)  
Date: 2026-08-21  
Status: proposed - no downloads, no code changes

## Decision

**Cal-AI-grade photo logging is not realistically achievable with our current fully on-device Food-101 classifier alone.** The best commercial apps appear to combine broader recognition, cloud/back-end processing, a large nutrition database, portion/depth estimation, and a correction UX. We can keep the local-first promise for a privacy-preserving baseline, but catching Cal AI/SnapCalorie on accuracy requires either:

1. a **server/multimodal route** for photo analysis, or
2. a larger downloadable local stack: large recognition model + Nutrition5k-style portion model + expanded food DB, with explicit user opt-in and large storage/download warnings.

Recommended next move:

- **Short term:** keep `onnx-community/swin-finetuned-food101-ONNX` only as the offline fallback, not as the claim to SOTA. Add a server-capable research spike behind a separate opt-in for multimodal analysis and compare against the local model on our own meal set.
- **Download first:** Nutrition5k metadata/sample, then full Nutrition5k if compute/storage is approved; Food-101 full only for baseline repro; Food2K/ISIA only after license/access confirmation.
- **Do not promise "image never leaves device" and "Cal AI-grade accuracy" in the same feature.** Those are different product modes.

## Competitive Teardown

| Product | Likely approach | Portion / volume | Accuracy evidence | UX | Where Alpha Coach is behind |
|---|---|---|---|---|---|
| **Cal AI** | Official site/app pages say photo, barcode, and meal description produce calories/macros. Cal AI blog copy says it combines phone depth sensor with advanced AI models. Privacy policy explicitly includes food/drink/medication submitted via voice and image logging; FAQ says data is stored in the cloud. I infer server/cloud processing or cloud-assisted model use; I found no public model card proving on-device inference. | Cal AI marketing says depth sensor + AI analyze food volume. This is plausible on iPhone Pro/LiDAR but not universal. | No credible public benchmark found. App copy claims "insanely accurate"/"100% accuracy" in social copy; treat as marketing. Third-party testing is inconsistent and often affiliate. | Fast: onboard -> snap photo -> nutrition breakdown; barcode and text fallback. | We lack broad labels, portion estimation, polished instant UX, and database retrieval. Our privacy edge is stronger, but accuracy is lower. |
| **SnapCalorie** | TechCrunch reports it identifies food and measures portion size; founded by Wade Norris, ex-Google AI/Google Lens pedigree. YC says the team co-founded Google Lens/Cloud Vision API and published a CVPR paper whose algorithm outperformed a professional nutritionist. | Depth sensors + portion-size algorithm; TechCrunch mentions reviewers and depth sensors. Nutrition5k paper is directly relevant because it includes videos, overhead RGB-D, ingredient masses, and nutrition labels. | SnapCalorie blog claims average caloric error under 20%; YC claims more accurate than a trained nutritionist. These are company/accelerator claims but directionally credible because Nutrition5k is peer-reviewed. | Snap photo or voice note -> AI analyzes food and measures portions -> calories/macros/nutrients. | We do not have depth/portion model or reviewer/correction loop. This is the most important competitor to learn from technically. |
| **Foodvisor** | Foodvisor describes AI photo recognition; guide/API material claims recognition across >20,000 foods. Likely server-side proprietary model + food DB. | User can edit portions; public material is weaker on true volume estimation. | Foodvisor guide claims >95% accuracy on >20,000 foods; this is marketing/API copy, not an independent benchmark. | Photo -> AI identifies items -> nutrition; also voice/type/barcode and favorites. | Broader food taxonomy and edit/portion UX. |
| **MyFitnessPal Meal Scan** | Official FAQ says it uses machine learning/computer vision models built/run by MyFitnessPal and trained on millions of images, then suggests verified foods from its database. | Suggests calories/macros/portions from recognized plate. Public docs focus more on recognition/database suggestions than depth. | No official benchmark found. User tests vary. | Tap + -> Meal Scan -> camera/photo -> suggested verified foods; new photo-upload flow exists. | We lack "verified food DB" breadth and image-to-database matching. |
| **Bite AI / BitePal** | App pages say photo recognition estimates portion and fills calories/macros. Internals are opaque; likely server-side AI. | Claims portion estimation, no public method. | No credible public benchmark found. | Consumer-slick: snap photo -> instant macros + coach. | UX polish and broad auto-fill. |
| **LogMeal API** | Cloud API; docs say it detects food groups, dishes, ingredients, nutrition, and advanced plans estimate volume from RGB/depth images. | Quantity estimation from RGB or depth images; food waste pre/post photo flow at higher tiers. | Marketing/blog claims 85%+ intake tracking accuracy; not an independent benchmark. | API for apps rather than consumer app; upload image -> recognition/nutrition JSON. | Strong server API coverage; not local-first. |

## Models To Consider

| Model / route | Size | Classes / scope | License | ONNX / browser status | Recommendation |
|---|---:|---|---|---|---|
| `onnx-community/swin-finetuned-food101-ONNX` | q8/int8 93.3 MB; fp16 177.0 MB | 101 Food-101 classes | Apache-2.0 | **Yes**, transformers.js + ONNX | Keep as offline fallback. Not enough for biryani/global cuisine or portion. |
| Food2K-trained model / PRENet-style backbone | Dataset: 2,000 classes, 1,036,564 images | Much broader food labels | Paper/dataset license unclear; access confirmation needed | No browser-ready HF ONNX found | Best candidate for a train/fine-tune job if license/access is cleared. Server/mobile-native first, browser later. |
| ISIA Food-500 / SGLANet-style models | 500 classes, 399,726 images | Broader than Food-101 | License unclear; official site/torrent access | No browser-ready HF ONNX found | Secondary large classifier dataset; useful if Food2K access fails. |
| `yvelos/dinov3-food-389-v1` / `anonymous-eval/food-recognition` | ~1.214 GB safetensors | 389 food labels over TSOTSA-Img | Apache-2.0 | No ONNX; too large for current browser path | Worth a server-side eval; not a direct Phase 3 local browser replacement. |
| `prithivMLmods/Food-101-93M` | 371.9 MB safetensors | Food-101 only | Apache-2.0 | No ONNX | Not enough class coverage to fix biryani; not browser-ready. |
| Food-specific multimodal VLMs, e.g. OliveGemma/PaliGemma and Llama-3.2 food LoRA | 6 GB to 20+ GB weights | Can identify dishes from language context, ingredients, cuisines | Gemma/Llama licenses; not simple Apache/MIT | Server/GPU or native app only | Best technical route for Cal-AI-like reasoning, but violates "image never leaves device" unless run locally on powerful hardware. |
| GPT-4o / Gemini / hosted VLM + retrieval | No local model download | Open-vocabulary food + text reasoning | API terms, paid | Server only | Fastest way to match competitors. Must be a separate opt-in cloud mode with privacy copy. |

Evidence limit: I found no public Hugging Face Food2K/ISIA model that is both SOTA and transformers.js/ONNX-ready. The better open research path is dataset + training, not a drop-in browser model.

## Large Datasets To Download

Do **not** download until god/human confirms storage, license, and compute.

| Rank | Dataset | Size / classes | Exact access URL | License / restriction | Why download |
|---:|---|---|---|---|---|
| 1 | **Nutrition5k** | `nutrition5k_dataset.tar.gz` **181.4 GB**; 5,006 dishes with side videos, overhead RGB-D, ingredient masses, calories/macros | `https://storage.cloud.google.com/nutrition5k_dataset/nutrition5k_dataset.tar.gz`; bucket path `gs://nutrition5k_dataset/nutrition5k_dataset/` | Creative Commons v4.0; GitHub README says share/adapt for any purpose, even commercially, with citation | Best open dataset for portion/nutrition estimation. This is how we move beyond classification. Download metadata/sample first, full archive after compute approval. |
| 2 | **Food-101 full** | HF download size **5,059,972,308 bytes (~5.06 GB)**; 101 classes, 101k images | `https://huggingface.co/datasets/ethz/food101`; parquet shards under `/resolve/main/data/train-*` and `/data/validation-*` | HF card says license unknown; original ETHZ dataset is research benchmark. Verify before redistribution. | Baseline reproducibility and local Food-101 eval; not enough for Cal AI, but cheap enough to pull. |
| 3 | **Food2K** | 2,000 classes, 1,036,564 images; HyperAI lists `food2k/k.zip` **64.23 GB** | `https://hyper.ai/en/datasets/32032` / original paper `https://arxiv.org/abs/2103.16107` | License/access unclear; some literature says not publicly available or requires access request. Treat as research-only until verified. | Best label coverage candidate for biryani/global-food misses if access/license is cleared. |
| 4 | **ISIA Food-500** | 500 classes, 399,726 images; HyperAI lists **40.56 GB** torrent | Official paper points to `http://123.57.42.89/FoodComputing-Dataset/ISIA-Food500.html`; HyperAI mirror `https://hyper.ai/en/datasets/32283` | License unclear; research dataset. | Backup broad classifier dataset if Food2K is unavailable. |
| 5 | **UEC Food-256 / UEC Food-100** | 256/100 Japanese food classes; official pages, size not reliably fetched in this run; Kaggle mirror showed ~1.88 GB but license unknown | `https://foodcam.mobi/dataset256.html`; `https://foodcam.mobi/dataset100.html` | License unclear; verify from official dataset page before use. | Useful for Asian/Japanese classes; not enough for biryani/global coverage. |
| 6 | **UECFoodPix / UECFoodPixComplete** | Segmentation datasets: **707 MB** and **759 MB** from search result | `https://mm.cs.uec.ac.jp/uecfoodpix/` | License unclear from fetched snippets; verify before use | Segmentation/portion helper, not broad recognition. |
| 7 | **Recipe1M+** | >1M recipes, 13M images; im2recipe repo notes large tar archives and access by form/email, around 210 GB scale in public notes | `https://pic2recipe.csail.mit.edu/`; `https://github.com/torralba-lab/im2recipe-Pytorch` | Research-only/non-commercial signals in community notes; must verify with access agreement | Useful for image-recipe retrieval/ingredient reasoning, not immediate kcal estimation. |
| 8 | **Indian-food sets / Khana** | Kaggle examples: 4,000 images / 80 Indian classes; Khana paper claims ~131k images / 80 labels | Kaggle: `https://www.kaggle.com/datasets/iamsouravbanerjee/indian-food-images-dataset`; Khana paper `https://arxiv.org/html/2509.06006v1` | Kaggle licenses vary; Khana download not confirmed in this run | Good targeted supplement for biryani-type misses after legal/access check; too small to replace Food2K. |

## On-Device Vs Server Verdict

**On-device browser only:** feasible for low-friction label suggestions, not Cal-AI-grade logging. A 93 MB Food-101 model misses common/global classes and has no robust portion estimation. Larger DINO/ViT models cross 1 GB and still do not solve volume or nutrition database mapping.

**On-device native app:** more plausible if we can use Core ML/NNAPI, cache hundreds of MB to multiple GB, and use depth APIs. Still hard for open-vocabulary dishes and hidden ingredients.

**Server/cloud:** required for current best commercial parity. Server lets us use multimodal LLMs, large classification/segmentation models, retrieval over food databases, and iterative corrections. This breaks the original "image never leaves device" promise, so it must be a separate opt-in mode with privacy copy, not a silent replacement.

## Concrete Recommendation

1. **Keep local Phase 3 scoped as privacy-first assistive logging:** top-k suggestions, estimate labels, user confirmation, no claim of Cal AI accuracy.
2. **Create a separate "cloud photo analysis" proposal:** opt-in, explicit photo upload, server/multimodal model, retention controls, and honest accuracy copy.
3. **Download order after approval:**
   - Nutrition5k metadata/sample first; full 181.4 GB if compute/storage approved.
   - Food-101 full 5.06 GB for reproducible local baseline.
   - Food2K 64.23 GB only after license/access confirmation.
   - ISIA Food-500 40.56 GB only if Food2K is blocked.
   - Indian/Khana datasets only after license/download confirmation as targeted supplements.
4. **Evaluation before build:** create a 100-200 image Alpha Coach meal set covering pizza variants, biryani, fried rice, wraps, sandwiches, Indian meals, mixed plates, drinks, and leftovers. Score local Food-101, any large classifier, and one hosted VLM against the same set.

## Invariants Touched

- **#1 ateAt:** photo capture time is still not eaten time. Every route must end in ateAt confirmation.
- **#3 extras off:** large models/cloud analysis must be opt-in, default off.
- **#5 honesty:** every kcal result is an estimate; low confidence asks. Do not claim Cal AI-level accuracy unless our own eval proves it.
- **#2 scoring:** no classifier/model path awards points directly.

## What Would Have To Be True For This To Be Wrong

- A broad, high-accuracy, permissively licensed, transformers.js-compatible food model appears with hundreds/thousands of classes and manageable q8 size. I did not find one.
- Cal AI publicly proves it runs entirely on-device with small models and no cloud analysis. Its privacy/cloud-storage pages and broad UX make that unlikely.
- User acceptance strongly favors privacy over accuracy. Then the current on-device approach can be positioned as a differentiator, not a parity play.

## Sources

- Cal AI official/app/privacy: <https://www.calai.app/>, <https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616>, <https://play.google.com/store/apps/details?id=com.viraldevelopment.calai>, <https://www.calai.app/privacy>, <https://www.calai.app/faq>, <https://www.calai.app/blog/how-are-calories-measured>
- Cal AI business/status context: <https://www.businessinsider.com/cal-ai-myfitnesspal-calorie-tracker-teen-founder-flow-zack-yadegari-2026-6>, <https://www.businessinsider.com/startup-ai-app-tiny-team-scaled-millions-sold-myfitnesspal-2026-4>, <https://techcrunch.com/2026/04/21/apples-cal-ai-crackdown-signals-its-still-policing-the-app-store/>
- SnapCalorie: <https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/>, <https://www.ycombinator.com/companies/snapcalorie>, <https://www.snapcalorie.com/blog/snapcalorie-revolutionizing-nutrition-tracking-ai>, <https://play.google.com/store/apps/details?id=com.snapcalorie.alpha002>
- MyFitnessPal Meal Scan: <https://support.myfitnesspal.com/hc/en-us/articles/360045761612-Meal-Scan-FAQ>, <https://blog.myfitnesspal.com/meal-scan/>, <https://www.myfitnesspal.com/>
- Foodvisor/Bite/LogMeal: <https://www.foodvisor.io/en/guides/article/food-image-recognition-explained/>, <https://bitepal.app/>, <https://apps.apple.com/us/app/bite-ai-photo-calorie-scanner/id6736922373>, <https://logmeal.com/api/>, <https://docs.logmeal.com/docs/guides-essential-concepts-recognition-capabilities>
- Peer-reviewed / research: Nutrition5k paper and dataset <https://arxiv.org/abs/2103.03375>, <https://github.com/google-research-datasets/Nutrition5k>; image dietary assessment review <https://pmc.ncbi.nlm.nih.gov/articles/PMC10836267/>; comparative validity study <https://pmc.ncbi.nlm.nih.gov/articles/PMC11314244/>
- Models: <https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX>, <https://huggingface.co/prithivMLmods/Food-101-93M>, <https://huggingface.co/yvelos/dinov3-food-389-v1>, <https://huggingface.co/anonymous-eval/food-recognition>, <https://huggingface.co/JamesZar/OliveGemma-3B>, <https://huggingface.co/Anachronox39/Llama-3.2-11B-Vision-Food-mini>
- Datasets: <https://huggingface.co/datasets/ethz/food101>, <https://hyper.ai/en/datasets/32032>, <https://arxiv.org/abs/2103.16107>, <https://hyper.ai/en/datasets/32283>, <https://arxiv.org/abs/2008.05655>, <https://foodcam.mobi/dataset256.html>, <https://mm.cs.uec.ac.jp/uecfoodpix/>, <https://pic2recipe.csail.mit.edu/>, <https://github.com/torralba-lab/im2recipe-Pytorch>, <https://www.kaggle.com/datasets/iamsouravbanerjee/indian-food-images-dataset>, <https://arxiv.org/html/2509.06006v1>
