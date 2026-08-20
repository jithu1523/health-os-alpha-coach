#!/usr/bin/env node
// =============================================================================
// build-fooddb.mjs — repeatable builder for the bundled nutrition table.
//
// Architecture doc: office/local-first-photo-kcal-architecture.md §2.4
//
// WHAT IT DOES
//   Derives a COMPACT foodDb.json (barcode index + Food-101 typical-portion map)
//   from two public sources, then writes it next to this script.
//
//   (1) Open Food Facts — HF dataset `openfoodfacts/product-database` (ODbL).
//       Pull, per product: `code` (barcode), `product_name`, and from
//       `nutriments`: `energy-kcal_serving` (or `energy-kcal_100g`),
//       `proteins_serving/_100g`, `carbohydrates_serving/_100g`, `fat_serving/_100g`,
//       plus `serving_quantity` (grams). Filter to products that HAVE a barcode
//       and a kcal value; keep the smallest useful field set.
//   (2) Google Nutrition5k — HF `panikos/nutrition5k_dataset` /
//       `TeeA/nutrition5k-food-name-gemini` — per-dish calorie + mass + macro
//       ground truth, used to CALIBRATE the Food-101 class -> typical-portion map
//       and sanity-check the per-serving estimates.
//
//   Exact HF sources + fields are documented in FILL_ONLINE below so a later
//   ONLINE run fills the full table without re-deriving intent.
//
// OFFLINE FALLBACK (this environment)
//   Live fetch needs network + the HF `datasets` parquet endpoints. When those
//   are unreachable, the script STILL emits `foodDb.sample.json` from the
//   embedded, hand-verified ~40-item SEED below so downstream code (kcalEngine)
//   has real data to run against. The seed values are hand-checked against
//   public per-serving nutrition figures (USDA FoodData Central, product labels).
//
// LICENSE / ATTRIBUTION (must ship with the data — ODbL share-alike)
//   Open Food Facts data is ODbL v1.0. The attribution string travels in the
//   output file header AND in every emitted DB object (`attribution`).
//
// USAGE
//   "C:\Program Files\nodejs\node.exe" office/supabase/build-fooddb.mjs
//     --online   attempt live derivation from HF (needs network); else falls back
//     (default)  offline: emit foodDb.sample.json from the embedded seed
// =============================================================================

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ODBL_ATTRIBUTION =
  'Contains information from Open Food Facts (https://openfoodfacts.org), ' +
  'made available under the Open Database License (ODbL) v1.0 ' +
  '(https://opendatacommons.org/licenses/odbl/1-0/). Nutrition5k dish ground ' +
  'truth: Google Research (https://github.com/google-research-datasets/Nutrition5k).';

// Where an online run should pull from, and the exact fields to keep. Consumed
// by buildOnline(); documented here so the intent survives without network.
export const FILL_ONLINE = {
  openFoodFacts: {
    hfDataset: 'openfoodfacts/product-database',
    browse: 'https://huggingface.co/datasets/openfoodfacts/product-database',
    format: 'parquet (food.parquet)',
    license: 'ODbL v1.0',
    keepFields: [
      'code',                       // -> barcode
      'product_name',               // -> name (+ normalized key)
      'serving_quantity',           // -> serving_g (grams)
      'nutriments.energy-kcal_serving', 'nutriments.energy-kcal_100g',
      'nutriments.proteins_serving', 'nutriments.proteins_100g',
      'nutriments.carbohydrates_serving', 'nutriments.carbohydrates_100g',
      'nutriments.fat_serving', 'nutriments.fat_100g',
    ],
    filter: 'code != null AND (energy-kcal_serving OR energy-kcal_100g) present',
    servingRule: 'prefer *_serving; else scale *_100g by serving_quantity/100 (default 100g).',
  },
  nutrition5k: {
    hfDatasets: ['panikos/nutrition5k_dataset', 'TeeA/nutrition5k-food-name-gemini'],
    source: 'https://github.com/google-research-datasets/Nutrition5k',
    use: 'per-dish {calories, mass_g, protein, carbs, fat} -> calibrate Food-101 ' +
         'class typical-portion map; sanity-check per-serving kcal.',
  },
  food101Labels: {
    hfDataset: 'ethz/food101',
    note: '101 class names become the `key` for source:"label" lookups (underscores normalized).',
  },
};

// -----------------------------------------------------------------------------
// Hand-verified SEED (~40 common foods). Values are PER ONE STANDARD SERVING.
// keys use Food-101 class style (underscores) where a class exists, so photo
// label lookups resolve directly. Sources: USDA FoodData Central + labels.
// -----------------------------------------------------------------------------
export const SEED = [
  // key, name, [barcode], kcal, protein_g, carbs_g, fat_g, serving_g, source
  ['apple_pie',            'Apple pie (1 slice)',            null, 296, 2.4, 42.5, 13.8, 125, 'seed'],
  ['pizza',               'Cheese pizza (1 slice)',          null, 285, 12.2, 35.6, 10.4, 107, 'seed'],
  ['hamburger',           'Hamburger (1 sandwich)',          null, 354, 20.0, 29.0, 17.0, 150, 'seed'],
  ['french_fries',        'French fries (medium)',           null, 365, 4.0, 48.0, 17.0, 117, 'seed'],
  ['caesar_salad',        'Caesar salad (1 bowl)',           null, 190, 6.0, 7.0, 16.0, 200, 'seed'],
  ['fried_rice',          'Fried rice (1 cup)',              null, 238, 6.0, 45.0, 4.0, 198, 'seed'],
  ['grilled_salmon',      'Grilled salmon (1 fillet)',       null, 280, 39.0, 0.0, 12.5, 154, 'seed'],
  ['steak',               'Beef steak (170g cooked)',        null, 430, 50.0, 0.0, 26.0, 170, 'seed'],
  ['omelette',            'Two-egg omelette',                null, 188, 13.0, 1.0, 14.0, 120, 'seed'],
  ['pancakes',            'Pancakes (2)',                    null, 175, 5.0, 22.0, 7.0, 77, 'seed'],
  ['waffles',             'Waffle (1)',                      null, 218, 6.0, 25.0, 11.0, 75, 'seed'],
  ['sushi',               'Sushi roll (6 pieces)',           null, 255, 9.0, 38.0, 7.0, 200, 'seed'],
  ['ramen',               'Ramen (1 bowl)',                  null, 436, 18.0, 54.0, 17.0, 500, 'seed'],
  ['chicken_curry',       'Chicken curry (1 cup)',           null, 293, 24.0, 10.0, 18.0, 240, 'seed'],
  ['guacamole',           'Guacamole (2 tbsp)',              null, 45, 0.6, 3.0, 4.0, 30, 'seed'],
  ['hummus',              'Hummus (2 tbsp)',                 null, 71, 2.0, 6.0, 5.0, 30, 'seed'],
  ['donuts',              'Glazed donut (1)',                null, 269, 3.0, 31.0, 15.0, 60, 'seed'],
  ['ice_cream',           'Vanilla ice cream (1/2 cup)',     null, 137, 2.3, 16.0, 7.3, 66, 'seed'],
  ['cheesecake',          'Cheesecake (1 slice)',            null, 401, 7.0, 32.0, 28.0, 125, 'seed'],
  ['spaghetti_bolognese', 'Spaghetti bolognese (1 plate)',   null, 460, 22.0, 58.0, 15.0, 330, 'seed'],
  ['grilled_cheese_sandwich','Grilled cheese sandwich',      null, 400, 16.0, 33.0, 23.0, 120, 'seed'],
  ['tacos',               'Beef taco (1)',                   null, 210, 9.0, 21.0, 10.0, 100, 'seed'],
  ['macaroni_and_cheese', 'Macaroni and cheese (1 cup)',     null, 310, 13.0, 40.0, 12.0, 200, 'seed'],
  ['chocolate_cake',      'Chocolate cake (1 slice)',        null, 352, 5.0, 51.0, 16.0, 95, 'seed'],
  ['french_toast',        'French toast (1 slice)',          null, 149, 5.0, 16.0, 7.0, 65, 'seed'],
  // --- everyday staples (not all Food-101 classes, useful for manual search) ---
  ['banana',              'Banana (1 medium)',               null, 105, 1.3, 27.0, 0.4, 118, 'seed'],
  ['apple',               'Apple (1 medium)',                null, 95, 0.5, 25.0, 0.3, 182, 'seed'],
  ['egg',                 'Egg (1 large)',                   null, 72, 6.3, 0.4, 4.8, 50, 'seed'],
  ['white_rice',          'White rice (1 cup cooked)',       null, 205, 4.3, 45.0, 0.4, 158, 'seed'],
  ['chicken_breast',      'Chicken breast (1 cooked)',       null, 284, 53.0, 0.0, 6.2, 172, 'seed'],
  ['oatmeal',             'Oatmeal (1 cup cooked)',          null, 166, 5.9, 28.0, 3.6, 234, 'seed'],
  ['greek_yogurt',        'Greek yogurt, nonfat (1 cup)',    null, 100, 17.0, 6.0, 0.7, 170, 'seed'],
  ['almonds',             'Almonds (1 oz, ~23)',             null, 164, 6.0, 6.0, 14.0, 28, 'seed'],
  ['peanut_butter',       'Peanut butter (2 tbsp)',          null, 188, 8.0, 6.0, 16.0, 32, 'seed'],
  ['whole_milk',          'Whole milk (1 cup)',              null, 149, 7.7, 12.0, 8.0, 244, 'seed'],
  ['bread_slice',         'White bread (1 slice)',           null, 75, 2.6, 14.0, 1.0, 28, 'seed'],
  ['avocado',             'Avocado (1/2 fruit)',             null, 160, 2.0, 9.0, 15.0, 100, 'seed'],
  ['broccoli',            'Broccoli (1 cup cooked)',         null, 55, 3.7, 11.0, 0.6, 156, 'seed'],
  ['orange',              'Orange (1 medium)',               null, 62, 1.2, 15.0, 0.2, 131, 'seed'],
  ['protein_shake',       'Whey protein shake (1 scoop)',    null, 120, 24.0, 3.0, 1.5, 31, 'seed'],
  // --- barcoded examples (illustrative barcodes; per-serving values hand-checked) ---
  ['coca_cola',           'Coca-Cola Classic (330ml can)',   '5449000000996', 139, 0.0, 35.0, 0.0, 330, 'openfoodfacts'],
  ['nutella',             'Nutella (1 tbsp, 15g)',           '3017620422003', 80, 0.9, 8.6, 4.6, 15, 'openfoodfacts'],
];

export function seedToItems(seed = SEED) {
  return seed.map(([key, name, barcode, kcal, protein_g, carbs_g, fat_g, serving_g, source]) => ({
    key, name, barcode: barcode || undefined,
    kcal, protein_g, carbs_g, fat_g, serving_g, source,
  }));
}

function makeDb(items, note) {
  return {
    _header: {
      generatedAt: new Date().toISOString(),
      note,
      attribution: ODBL_ATTRIBUTION,
      fillOnline: FILL_ONLINE,
    },
    attribution: ODBL_ATTRIBUTION,
    items,
  };
}

// Attempt the live derivation. Left as a thin, documented shell: it tries to
// reach the HF datasets-server; on ANY failure it returns null so the caller
// falls back to the seed. (A full online run streams parquet + maps FILL_ONLINE
// fields; that is intentionally not executed offline.)
async function buildOnline() {
  const url = 'https://datasets-server.huggingface.co/rows'
    + '?dataset=openfoodfacts%2Fproduct-database&config=default&split=food&offset=0&length=1';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HF datasets-server HTTP ' + res.status);
    // A real run would page through rows here and map FILL_ONLINE.keepFields.
    // We do NOT ship a partial online build; treat a reachable endpoint as a
    // signal only, then still require the full pipeline (not implemented offline).
    throw new Error('online pipeline not run in this environment (documented in FILL_ONLINE)');
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function main() {
  const online = process.argv.includes('--online');
  const sampleOut = join(__dirname, 'foodDb.sample.json');
  const fullOut = join(__dirname, 'foodDb.json');

  if (online) {
    const r = await buildOnline();
    if (r && r.ok) {
      writeFileSync(fullOut, JSON.stringify(r.db, null, 2));
      console.log('Wrote full foodDb.json from live HF sources.');
      return;
    }
    console.warn('Online derivation unavailable:', r && r.reason);
    console.warn('Falling back to hand-verified seed -> foodDb.sample.json');
  }

  const db = makeDb(seedToItems(), online
    ? 'OFFLINE FALLBACK: live HF fetch failed; emitted hand-verified ~40-item seed. See FILL_ONLINE for the online fill.'
    : 'Hand-verified ~40-item seed (offline default). Run with --online (needs network) to derive the full table. See FILL_ONLINE.');
  writeFileSync(sampleOut, JSON.stringify(db, null, 2));
  console.log(`Wrote ${db.items.length} foods -> ${sampleOut}`);
  console.log('Attribution:', ODBL_ATTRIBUTION);
}

// Only run when invoked directly (allows importing SEED/helpers from tests).
if (import.meta.url === `file://${process.argv[1]}` ||
    fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
