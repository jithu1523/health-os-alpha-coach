#!/usr/bin/env node
// =============================================================================
// build-fooddb.mjs - repeatable builder for the bundled nutrition table.
//
// Outputs a compact offline foodDb.sample.json:
//   - seed/barcode rows retained from Phase 2
//   - everyday prepared-food rows DERIVED from USDA FoodData Central FNDDS CSV
//   - aliases/source provenance carried per row
//
// Usage:
//   "C:\Program Files\nodejs\node.exe" office/supabase/build-fooddb.mjs
//   "C:\Program Files\nodejs\node.exe" office/supabase/build-fooddb.mjs --online
//
// --online downloads the small historical FNDDS 2019-2020 CSV archive from the
// official USDA download endpoint if it is not cached. The latest FNDDS 2021-2023
// CSV is 200 MB zipped / 1.6 GB unzipped, so this builder deliberately uses the
// 4.3 MB 2019-2020 public-domain release for a compact, auditable bundle.
// =============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '.cache');
const FNDDS_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2022-10-28.zip';
const FNDDS_ZIP = join(CACHE_DIR, 'FoodData_Central_survey_food_csv_2022-10-28.zip');
const FNDDS_DIR = join(CACHE_DIR, 'fndds-2019-2020');
const FNDDS_ROOT = join(FNDDS_DIR, 'FoodData_Central_survey_food_csv_2022-10-28');

export const USDA_ATTRIBUTION =
  'USDA FoodData Central, Food and Nutrient Database for Dietary Studies (FNDDS) 2019-2020, public domain / CC0 1.0.';
export const ODBL_ATTRIBUTION =
  'Contains information from Open Food Facts (https://openfoodfacts.org), made available under the Open Database License (ODbL) v1.0 (https://opendatacommons.org/licenses/odbl/1-0/).';
export const NUTRITION5K_ATTRIBUTION =
  'Nutrition5k dish ground truth: Google Research (https://github.com/google-research-datasets/Nutrition5k).';
export const ATTRIBUTION = `${USDA_ATTRIBUTION} ${ODBL_ATTRIBUTION} ${NUTRITION5K_ATTRIBUTION}`;

// Values are per one standard serving. These rows remain useful for barcodes,
// staples, and Phase 2's small offline baseline. New USDA rows are derived below.
export const SEED = [
  ['apple_pie','Apple pie (1 slice)',null,296,2.4,42.5,13.8,125,'seed',[]],
  ['pizza','Cheese pizza (1 slice)',null,285,12.2,35.6,10.4,107,'seed',[]],
  ['hamburger','Hamburger (1 sandwich)',null,354,20,29,17,150,'seed',['burger']],
  ['french_fries','French fries (medium)',null,365,4,48,17,117,'seed',['fries']],
  ['caesar_salad','Caesar salad (1 bowl)',null,190,6,7,16,200,'seed',[]],
  ['fried_rice','Fried rice (1 cup)',null,238,6,45,4,198,'seed',[]],
  ['grilled_salmon','Grilled salmon (1 fillet)',null,280,39,0,12.5,154,'seed',[]],
  ['steak','Beef steak (170g cooked)',null,430,50,0,26,170,'seed',[]],
  ['omelette','Two-egg omelette',null,188,13,1,14,120,'seed',['omelet']],
  ['pancakes','Pancakes (2)',null,175,5,22,7,77,'seed',[]],
  ['waffles','Waffle (1)',null,218,6,25,11,75,'seed',[]],
  ['sushi','Sushi roll (6 pieces)',null,255,9,38,7,200,'seed',[]],
  ['ramen','Ramen (1 bowl)',null,436,18,54,17,500,'seed',[]],
  ['chicken_curry','Chicken curry (1 cup)',null,293,24,10,18,240,'seed',[]],
  ['guacamole','Guacamole (2 tbsp)',null,45,0.6,3,4,30,'seed',[]],
  ['hummus','Hummus (2 tbsp)',null,71,2,6,5,30,'seed',[]],
  ['donuts','Glazed donut (1)',null,269,3,31,15,60,'seed',['donut']],
  ['ice_cream','Vanilla ice cream (1/2 cup)',null,137,2.3,16,7.3,66,'seed',[]],
  ['cheesecake','Cheesecake (1 slice)',null,401,7,32,28,125,'seed',[]],
  ['spaghetti_bolognese','Spaghetti bolognese (1 plate)',null,460,22,58,15,330,'seed',[]],
  ['grilled_cheese_sandwich','Grilled cheese sandwich',null,400,16,33,23,120,'seed',[]],
  ['tacos','Beef taco (1)',null,210,9,21,10,100,'seed',['taco']],
  ['macaroni_and_cheese','Macaroni and cheese (1 cup)',null,310,13,40,12,200,'seed',['mac and cheese']],
  ['chocolate_cake','Chocolate cake (1 slice)',null,352,5,51,16,95,'seed',[]],
  ['french_toast','French toast (1 slice)',null,149,5,16,7,65,'seed',[]],
  ['banana','Banana (1 medium)',null,105,1.3,27,0.4,118,'seed',[]],
  ['apple','Apple (1 medium)',null,95,0.5,25,0.3,182,'seed',[]],
  ['egg','Egg (1 large)',null,72,6.3,0.4,4.8,50,'seed',[]],
  ['white_rice','White rice (1 cup cooked)',null,205,4.3,45,0.4,158,'seed',['rice']],
  ['chicken_breast','Chicken breast (1 cooked)',null,284,53,0,6.2,172,'seed',[]],
  ['oatmeal','Oatmeal (1 cup cooked)',null,166,5.9,28,3.6,234,'seed',[]],
  ['greek_yogurt','Greek yogurt, nonfat (1 cup)',null,100,17,6,0.7,170,'seed',[]],
  ['almonds','Almonds (1 oz, ~23)',null,164,6,6,14,28,'seed',[]],
  ['peanut_butter','Peanut butter (2 tbsp)',null,188,8,6,16,32,'seed',[]],
  ['whole_milk','Whole milk (1 cup)',null,149,7.7,12,8,244,'seed',[]],
  ['bread_slice','White bread (1 slice)',null,75,2.6,14,1,28,'seed',[]],
  ['avocado','Avocado (1/2 fruit)',null,160,2,9,15,100,'seed',[]],
  ['broccoli','Broccoli (1 cup cooked)',null,55,3.7,11,0.6,156,'seed',[]],
  ['orange','Orange (1 medium)',null,62,1.2,15,0.2,131,'seed',[]],
  ['protein_shake','Whey protein shake (1 scoop)',null,120,24,3,1.5,31,'seed',[]],
  ['coca_cola','Coca-Cola Classic (330ml can)','5449000000996',139,0,35,0,330,'openfoodfacts',['cola']],
  ['nutella','Nutella (1 tbsp, 15g)','3017620422003',80,0.9,8.6,4.6,15,'openfoodfacts',[]],
];

// Compact target list. The names are search instructions; kcal/macros/servings
// are derived from FNDDS source rows, never typed here.
export const FNDDS_TARGETS = [
  ['chicken_sandwich','Chicken fillet sandwich, NFS',['chicken sandwich']],
  ['chicken_wrap','Chicken fillet wrap sandwich, grilled, from fast food',['chicken wrap']],
  ['chicken_salad_sandwich','Chicken salad sandwich on wheat',['chicken salad sandwich']],
  ['breakfast_burrito','Egg burrito',['breakfast burrito','egg burrito']],
  ['chicken_burrito','Burrito, chicken, with beans and rice, cheese',['chicken burrito']],
  ['beef_burrito','Burrito, beef, with beans and rice, cheese',['beef burrito']],
  ['club_sandwich','Club sandwich',['club sandwich']],
  ['turkey_sandwich','Turkey sandwich',['turkey sandwich']],
  ['tuna_sandwich','Tuna salad sandwich',['tuna sandwich']],
  ['pulled_pork_sandwich','Pulled pork sandwich',['pulled pork sandwich']],
  ['lobster_roll_sandwich','Lobster roll sandwich',['lobster roll']],
  ['hot_dog','Frankfurter or hot dog sandwich',['hot dog']],
  ['chicken_wings','Chicken wing, fried',['chicken wings']],
  ['fish_and_chips','Fish and chips',['fish and chips']],
  ['falafel','Falafel',['falafel']],
  ['falafel_sandwich','Falafel sandwich',['falafel wrap']],
  ['pho','Pho',['pho']],
  ['lasagna','Lasagna with meat',['lasagna']],
  ['ravioli','Ravioli, cheese-filled',['ravioli']],
  ['dumplings','Dumpling, meat filled',['dumplings']],
  ['spring_rolls','Egg roll, vegetable',['spring rolls','egg roll']],
  ['samosa','Samosa',['samosa']],
  ['pad_thai','Pad Thai',['pad thai']],
  ['paella','Paella',['paella']],
  ['nachos','Nachos with cheese',['nachos']],
  ['onion_rings','Onion rings',['onion rings']],
  ['garlic_bread','Garlic bread',['garlic bread']],
  ['clam_chowder','Clam chowder',['clam chowder']],
  ['french_onion_soup','Onion soup, with cheese',['french onion soup']],
  ['hot_and_sour_soup','Hot and sour soup',['hot and sour soup']],
  ['miso_soup','Miso soup',['miso soup']],
  ['greek_salad','Greek salad',['greek salad']],
  ['huevos_rancheros','Huevos rancheros',['huevos rancheros']],
  ['eggs_benedict','Eggs benedict',['eggs benedict']],
  ['deviled_eggs','Deviled egg',['deviled eggs']],
  ['chicken_quesadilla','Chicken quesadilla',['chicken quesadilla']],
  ['quesadilla','Cheese quesadilla',['quesadilla']],
  ['pork_chop','Pork chop, cooked',['pork chop']],
  ['prime_rib','Prime rib',['prime rib']],
  ['filet_mignon','Beef tenderloin steak',['filet mignon']],
  ['crab_cakes','Crab cake',['crab cakes']],
  ['scallops','Scallops, cooked',['scallops']],
  ['oysters','Oysters, cooked',['oysters']],
  ['mussels','Mussels, cooked',['mussels']],
  ['fried_calamari','Fried calamari',['fried calamari']],
  ['shrimp_and_grits','Shrimp and grits',['shrimp and grits']],
  ['poutine','Poutine',['poutine']],
  ['baklava','Baklava',['baklava']],
  ['beignets','Beignet',['beignets']],
  ['bread_pudding','Bread pudding',['bread pudding']],
  ['carrot_cake','Carrot cake',['carrot cake']],
  ['cup_cakes','Cupcake',['cupcake']],
  ['red_velvet_cake','Red velvet cake',['red velvet cake']],
  ['strawberry_shortcake','Strawberry shortcake',['strawberry shortcake']],
  ['chocolate_mousse','Chocolate mousse',['chocolate mousse']],
  ['creme_brulee','Creme brulee',['creme brulee']],
  ['cannoli','Cannoli',['cannoli']],
  ['churros','Churro',['churros']],
  ['macarons','Macaroon',['macaron','macarons']],
  ['tiramisu','Tiramisu',['tiramisu']],
  ['frozen_yogurt','Frozen yogurt',['frozen yogurt']],
  ['edamame','Edamame',['edamame']],
  ['bruschetta','Bruschetta',['bruschetta']],
  ['cheese_plate','Cheese plate',['cheese plate']],
  ['ceviche','Ceviche',['ceviche']],
];

function seedToItems(seed = SEED) {
  return seed.map(([key, name, barcode, kcal, protein_g, carbs_g, fat_g, serving_g, source, aliases]) => clean({
    key, name, barcode: barcode || undefined, kcal, protein_g, carbs_g, fat_g, serving_g, source,
    aliases: aliases && aliases.length ? aliases : undefined,
  }));
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length)));
}

function norm(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[_/]+/g, ' ').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function round2(n) { return Math.round(n * 100) / 100; }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (quoted) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift() || [];
  return rows.filter(r => r.length && r.some(Boolean)).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])));
}

async function ensureFndds() {
  mkdirSync(CACHE_DIR, { recursive: true });
  if (!existsSync(FNDDS_ZIP)) {
    const res = await fetch(FNDDS_URL, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`USDA FNDDS download failed: HTTP ${res.status}`);
    writeFileSync(FNDDS_ZIP, Buffer.from(await res.arrayBuffer()));
  }
  if (!existsSync(join(FNDDS_ROOT, 'food.csv'))) {
    mkdirSync(FNDDS_DIR, { recursive: true });
    if (process.platform === 'win32') {
      execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${FNDDS_ZIP.replace(/'/g, "''")}' -DestinationPath '${FNDDS_DIR.replace(/'/g, "''")}' -Force`], { stdio: 'inherit' });
    } else {
      execFileSync('unzip', ['-o', FNDDS_ZIP, '-d', FNDDS_DIR], { stdio: 'inherit' });
    }
  }
}

function loadFndds() {
  const foodRows = parseCsv(readFileSync(join(FNDDS_ROOT, 'food.csv'), 'utf8'));
  const nutrientRows = parseCsv(readFileSync(join(FNDDS_ROOT, 'food_nutrient.csv'), 'utf8'));
  const portionRows = parseCsv(readFileSync(join(FNDDS_ROOT, 'food_portion.csv'), 'utf8'));
  const foods = new Map(foodRows.map(r => [r.fdc_id, r]));
  const per100 = new Map();
  for (const r of nutrientRows) {
    if (!['203', '204', '205', '208'].includes(r.nutrient_id)) continue;
    const rec = per100.get(r.fdc_id) || {};
    const v = Number(r.amount);
    if (r.nutrient_id === '208') rec.kcal = v;
    if (r.nutrient_id === '203') rec.protein_g = v;
    if (r.nutrient_id === '205') rec.carbs_g = v;
    if (r.nutrient_id === '204') rec.fat_g = v;
    per100.set(r.fdc_id, rec);
  }
  const portions = new Map();
  for (const r of portionRows) {
    const g = Number(r.gram_weight);
    if (!Number.isFinite(g) || g <= 0) continue;
    const cur = portions.get(r.fdc_id);
    const desc = r.portion_description || '';
    const score = /quantity not specified/i.test(desc) ? 1 : /1 |sandwich|piece|cup|bowl|patty|slice|small\/regular|hot dog/i.test(desc) ? 3 : 2;
    if (!cur || score > cur.score || (score === cur.score && g > cur.gram_weight)) portions.set(r.fdc_id, { gram_weight: g, desc, score });
  }
  return { foods, per100, portions };
}

function findFood(fdc, query) {
  const q = norm(query);
  const qTokens = q.split(' ').filter(Boolean);
  let best = null, bestScore = -1;
  for (const r of fdc.foods.values()) {
    const n = norm(r.description);
    if (!n) continue;
    let score = 0;
    if (n === q) score += 100;
    if (n.startsWith(q)) score += 70;
    if (n.includes(q)) score += 55;
    score += qTokens.reduce((a, t) => a + (n.split(' ').includes(t) ? 6 : 0), 0);
    if (/\bnfs\b|not specified|ns as to/i.test(r.description)) score += 3;
    if (/baby food|infant|formula|school cafeteria/i.test(r.description)) score -= 20;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return bestScore >= 50 ? best : null;
}

function deriveFnddsItems() {
  const fdc = loadFndds();
  const out = [];
  for (const [key, query, aliases] of FNDDS_TARGETS) {
    const food = findFood(fdc, query);
    if (!food) continue;
    const n = fdc.per100.get(food.fdc_id);
    if (!n || !Number.isFinite(n.kcal)) continue;
    const portion = fdc.portions.get(food.fdc_id) || { gram_weight: 100, desc: '100 g' };
    const scale = portion.gram_weight / 100;
    out.push(clean({
      key,
      name: food.description,
      kcal: Math.round(n.kcal * scale),
      protein_g: round2((n.protein_g || 0) * scale),
      carbs_g: round2((n.carbs_g || 0) * scale),
      fat_g: round2((n.fat_g || 0) * scale),
      serving_g: round2(portion.gram_weight),
      serving_text: portion.desc,
      source: 'fdc_fndds',
      sourceId: food.fdc_id,
      license: 'CC0-1.0',
      attribution: USDA_ATTRIBUTION,
      aliases,
    }));
  }
  return out;
}

function mergeItems(seed, fndds) {
  const byKey = new Map();
  for (const it of seed) byKey.set(it.key, it);
  for (const it of fndds) byKey.set(it.key, it);
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function makeDb(items, note) {
  return {
    _header: {
      generatedAt: new Date().toISOString(),
      note,
      attribution: ATTRIBUTION,
      sources: {
        fndds: { url: FNDDS_URL, release: 'FNDDS 2019-2020 CSV, 2022-10-28', license: 'Public domain / CC0 1.0' },
        openFoodFacts: { url: 'https://world.openfoodfacts.org/data', license: 'ODbL v1.0' },
        nutrition5k: { url: 'https://github.com/google-research-datasets/Nutrition5k', use: 'portion calibration reference' },
      },
    },
    attribution: ATTRIBUTION,
    items,
  };
}

async function main() {
  const online = process.argv.includes('--online');
  const sampleOut = join(__dirname, 'foodDb.sample.json');
  let fndds = [];
  if (online || existsSync(join(FNDDS_ROOT, 'food.csv'))) {
    await ensureFndds();
    fndds = deriveFnddsItems();
  }
  const items = mergeItems(seedToItems(), fndds);
  const db = makeDb(items, fndds.length
    ? `Derived compact everyday-food bundle: ${fndds.length} USDA FNDDS rows + ${SEED.length} seed/OFF rows.`
    : `Offline seed only. Run with --online to derive USDA FNDDS rows from ${FNDDS_URL}.`);
  writeFileSync(sampleOut, JSON.stringify(db, null, 2));
  console.log(`Wrote ${db.items.length} foods (${fndds.length} FNDDS-derived) -> ${sampleOut}`);
  console.log('Attribution:', ATTRIBUTION);
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
