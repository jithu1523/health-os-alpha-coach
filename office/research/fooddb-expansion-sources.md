# Food DB Expansion Sources

Author: researcher Oscar (hive)  
Date: 2026-08-20  
Status: proposed - feeds `expand-fooddb-build`

## Decision

Expand the offline bundled DB from **USDA FoodData Central first**, specifically:

1. **FNDDS / Survey foods** for everyday prepared foods: chicken sandwich, wraps, burritos, fast-food-style meals, mixed dishes, home-cooked reported foods.
2. **SR Legacy / Foundation Foods** for clean staples and ingredients.
3. **Open Food Facts** for packaged/barcode foods, with ODbL attribution/share-alike tracked loudly.
4. Use commercial APIs such as FatSecret, Nutritionix, Edamam, and Spoonacular only as optional online integrations later. They are not appropriate as sources for a compact redistributable offline bundle.

The match-quality bug is not only a data-volume bug. The current fuzzy strategy can let a partial token like `sandwich` drag `hamburger` above the ask-threshold. The fix should require stronger phrase/head-token agreement and let near misses fall to `needsConfirmation`.

## Ranked Sources

| Rank | Source | Best use | License / commercial status | Access | Dataset size signal | Bundle strategy |
|---:|---|---|---|---|---|---|
| 1 | [USDA FoodData Central](https://fdc.nal.usda.gov/) - FNDDS / Survey foods | Everyday prepared foods, restaurant-style foods, mixed dishes, common US dietary survey entries | Public domain / CC0 1.0; USDA requests citation but no permission required | Bulk downloads plus API; API key required for production, `DEMO_KEY` works for small tests | Official docs expose multiple data types: Foundation, Experimental, FNDDS, Branded, SR Legacy. Search probe found real FNDDS entries for chicken sandwich/wrap. | Derive a compact generic prepared-food table: normalized key, display name, kcal/macros per serving or per 100g, serving gram estimate where available, source FDC ID, data type. |
| 2 | [USDA FoodData Central](https://fdc.nal.usda.gov/) - SR Legacy / Foundation | Staples: chicken breast, rice, eggs, vegetables, dairy, oils | Same CC0/public-domain terms | Bulk/API | Smaller, high-quality reference-food corpus; not a prepared-meal database | Use for manual staples and ingredient fallback; do not let raw ingredient entries outrank prepared-food phrase matches. |
| 3 | [Open Food Facts](https://world.openfoodfacts.org/data) | Packaged staples, barcode lookup, brand products, supermarket meals | Open Database License (ODbL); attribution required; derivative DB/share-alike obligations | API, search, bulk dumps; no key for normal API use | OFF says it serves millions of visitors/API calls; public ecosystem commonly cites multi-million product coverage. Live probe found packaged burrito products. | Keep barcode/product subset separate from generic foods. Include attribution in-app and in `LICENSES.md`; derived DB may need ODbL treatment. |
| 4 | [Canadian Nutrient File](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-about-us.html) | Cross-check staples/common foods; Canada-specific names | Government open data / Canada Open Government Licence on data portals | Web/download/API variants depending on release | Health Canada describes CNF as covering foods commonly consumed in Canada, about 5,993 foods on current public page | Useful secondary validation source, but not enough prepared-restaurant coverage to lead. |
| 5 | Nutrition5k / recipe-photo datasets | Portion calibration, not broad lookup | Dataset-specific; already in architecture as calibration input | Bulk/research datasets | Thousands of dishes/images, but not a named everyday lookup DB | Use to calibrate Food-101 typical portions; not primary text-search source. |

## Restricted / Not Suitable For Offline Bundle

| Source | Why it is tempting | Why it should not seed the bundle |
|---|---|---|
| [FatSecret Platform API](https://platform.fatsecret.com/) | Strong global branded/restaurant/common-food API; commercial use marketed as permitted | Terms grant a revocable, nonsublicensable, nontransferable API license. This is API access, not open redistributable data. Use later only with live API terms and keys. |
| [Nutritionix](https://developer.nutritionix.com/signup) | Natural-language meal parsing and common/branded/restaurant coverage | Signup page says free public trials are no longer available and the API license is non-exclusive/revocable/nonsublicensable/nontransferable. Not an offline bundle source. |
| [Edamam Nutrition API](https://developer.edamam.com/edamam-nutrition-api) | Strong nutrition analysis and food database | Edamam docs/terms state data caching is not permitted unless explicitly allowed. This conflicts with a bundled offline subset. |
| [Spoonacular](https://spoonacular.com/food-api) | Recipes, menu items, ingredients, products | API product with plan limits and terms; not an open redistributable nutrition database. Useful for comparison, not bundling. |

## Live Probe Findings

I probed FoodData Central search with `DEMO_KEY` for common missed foods:

- `chicken sandwich` returned branded `CHICKEN SANDWICH` entries plus FNDDS `Chicken fillet sandwich, NFS`, `Chicken salad sandwich on wheat`, and `Chicken salad sandwich on white`.
- `chicken wrap` returned FNDDS `Chicken salad sandwich wrap`, `Chicken fillet wrap sandwich, fried, from fast food`, and `Chicken fillet wrap sandwich, grilled, from fast food`.
- `burrito` returned branded burritos and many packaged/ready-to-heat items.
- `hamburger` returned branded hamburger entries and FNDDS `Hamburger (McDonalds)`.

That is enough to fix the user's observed "chicken sandwich -> hamburger" failure without inventing data: USDA already has generic prepared-food records that are closer than hamburger.

Open Food Facts was intermittently unavailable during live search, but a `burrito` query returned packaged products such as Carrefour/Old El Paso burrito-related items and a burrito bowl. This reinforces the split: OFF is strongest for barcode/packaged foods, not generic restaurant-style prepared foods.

## Compact Bundle Derivation

Build a repeatable derivation script, not hand-entered rows:

1. Pull FDC bulk/API records from FNDDS, SR Legacy/Foundation, and selected Branded.
2. Keep only calorie/protein/carbs/fat, serving grams, source ID, data type, brand/barcode where relevant, and normalized display names.
3. Generate three indexes:
   - `byKey`: normalized exact/common names.
   - `byPhrase`: prepared-food phrases and aliases.
   - `byBarcode`: OFF/FDC branded barcode entries.
4. Keep a curated alias file for high-frequency everyday foods:
   - `chicken sandwich` -> FNDDS chicken fillet/salad sandwich candidates.
   - `wrap` -> wrap sandwich candidates, not generic sandwich/burger.
   - `burrito` -> FNDDS generic burrito candidates before branded products unless barcode is present.
   - `burger` / `hamburger` synonyms only for burger queries, never for `chicken sandwich`.
5. Store provenance per item:
   - `source: "fdc_fndds" | "fdc_sr_legacy" | "fdc_foundation" | "fdc_branded" | "openfoodfacts"`.
   - `sourceId`, `license`, `attribution`.
6. Ship the compact subset offline; keep full raw data out of the app.

## Match-Quality Fix

The current fuzzy behavior should be replaced with a conservative scorer:

- Exact normalized key/name match: OK.
- Full phrase contains query or query contains full phrase: OK if the food class/head noun matches.
- Token overlap must pass both:
  - coverage threshold: at least 70% of meaningful query tokens match;
  - critical-token threshold: the protein/dish head token must match, e.g. `chicken` cannot be dropped.
- Use stopwords and generic tokens:
  - weak tokens: `sandwich`, `wrap`, `bowl`, `plate`, `meal`, `with`, `and`, `style`, `nfs`;
  - strong tokens: `chicken`, `turkey`, `beef`, `egg`, `paneer`, `rice`, `burrito`, `salmon`.
- Penalize cross-protein mismatches:
  - query `chicken sandwich` should not match `hamburger`, `beef sandwich`, or `turkey sandwich` above threshold.
- Source priority for text search:
  - exact alias > FNDDS prepared > curated app item > SR/Foundation ingredient > branded generic-name > fuzzy fallback.
- Confidence mapping:
  - exact/alias FNDDS prepared food: 0.75-0.85 estimate, still `isEstimate:true`.
  - partial prepared match with all critical tokens: 0.45-0.60; ask if below threshold.
  - only weak-token overlap: 0.0-0.35 and `needsConfirmation:true`.

For the concrete bug: `chicken sandwich` should either resolve to an FNDDS chicken sandwich candidate, or return `needsConfirmation`. It should never confidently return `hamburger` because the strong token `chicken` is missing.

## Attribution And License Obligations

Loud flags for `LICENSES.md` and in-app About:

- **USDA FoodData Central:** public domain/CC0; cite FoodData Central as requested by USDA.
- **Open Food Facts:** ODbL; attribution required; derivative database/share-alike obligations must be tracked. Keep OFF-derived rows/provenance separable so the licensing story is auditable.
- **Canadian Nutrient File:** use under applicable Government of Canada open-data terms; cite Health Canada/CNF.
- **Restricted APIs:** FatSecret, Nutritionix, Edamam, Spoonacular are not offline-bundle sources unless we negotiate/use their terms explicitly.

## What Would Have To Be True For This To Be Wrong

- If the human's food search target is mostly branded packaged foods and barcodes, Open Food Facts should outrank FDC FNDDS.
- If Alpha Coach becomes server-backed and paid API licenses are acceptable, FatSecret/Nutritionix/Edamam could be revisited as online enrichers.
- If Phase 3 photo logging becomes the dominant path, the 101 Food-101 label map may matter more than free-text everyday search, but FNDDS is still the best open prepared-food calorie source.

## Sources

- USDA FoodData Central homepage/license: <https://fdc.nal.usda.gov/>
- USDA API guide: <https://fdc.nal.usda.gov/api-guide>
- USDA downloadable datasets: <https://fdc.nal.usda.gov/download-datasets>
- USDA data type documentation: <https://fdc.nal.usda.gov/data-documentation>
- USDA FAQ/API key note: <https://fdc.nal.usda.gov/faq>
- Data.gov FoodData Central summary: <https://catalog.data.gov/dataset/fooddata-central>
- Open Food Facts data page: <https://world.openfoodfacts.org/data>
- Open Food Facts API docs: <https://openfoodfacts.github.io/openfoodfacts-server/api/>
- Open Food Facts reuse/license page: <https://wiki.openfoodfacts.org/Reusing_Open_Food_Facts_Data>
- FatSecret Platform and terms: <https://platform.fatsecret.com/>, <https://platform.fatsecret.com/terms>, <https://platform.fatsecret.com/docs/guides>
- Nutritionix API signup/license page: <https://developer.nutritionix.com/signup>
- Edamam nutrition API and terms: <https://developer.edamam.com/edamam-nutrition-api>, <https://www.edamam.com/terms/api/>
- Spoonacular API: <https://spoonacular.com/food-api>
- Canadian Nutrient File: <https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-about-us.html>, <https://food-nutrition.canada.ca/cnf-fce/index-eng.jsp>
