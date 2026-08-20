// =============================================================================
// kcalEngine.test.mjs — Node tests for the pure kcal engine.
//
// Run with the real Node:
//   "C:\Program Files\nodejs\node.exe" office/modules/kcalEngine.test.mjs
//
// Covers: known label hit, barcode hit, manual miss (low confidence), portion
// scaling, and that isEstimate is ALWAYS true (invariant #5). Uses an injected
// DB object (no filesystem, no app coupling) so the engine stays testable.
// =============================================================================

import { createKcalEngine, CONFIDENCE, CONFIRM_THRESHOLD } from './kcalEngine.mjs';

// Small injected DB (mirrors foodDb.sample.json shape). Per-serving values.
const DB = {
  attribution: 'TEST-ODbL-ATTRIBUTION',
  items: [
    { key: 'banana', name: 'Banana (1 medium)', kcal: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4, serving_g: 118, source: 'seed' },
    { key: 'apple_pie', name: 'Apple pie (1 slice)', kcal: 296, protein_g: 2.4, carbs_g: 42.5, fat_g: 13.8, serving_g: 125, source: 'seed' },
    { key: 'coca_cola', name: 'Coca-Cola Classic (330ml can)', barcode: '5449000000996', kcal: 139, protein_g: 0, carbs_g: 35, fat_g: 0, serving_g: 330, source: 'openfoodfacts' },
    { key: 'chicken_breast', name: 'Chicken breast (1 cooked)', kcal: 284, protein_g: 53, carbs_g: 0, fat_g: 6.2, serving_g: 172, source: 'seed' },
    { key: 'chicken_sandwich', name: 'Chicken fillet sandwich, NFS', aliases: ['chicken sandwich'], kcal: 393, protein_g: 17.04, carbs_g: 38.47, fat_g: 18.84, serving_g: 140, source: 'fdc_fndds' },
    { key: 'hamburger', name: 'Hamburger (1 sandwich)', aliases: ['burger'], kcal: 354, protein_g: 20, carbs_g: 29, fat_g: 17, serving_g: 150, source: 'seed' },
  ],
};

const { estimateKcal } = createKcalEngine(DB);

let pass = 0, fail = 0;
const results = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; results.push(`  PASS  ${name}`); }
  else { fail++; results.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function approx(a, b, eps = 0.01) { return a != null && Math.abs(a - b) <= eps; }

// --- 1. Known label hit ------------------------------------------------------
{
  const r = estimateKcal({ source: 'label', key: 'apple_pie' });
  ok('label hit: apple_pie resolves', r.kcal != null && approx(r.kcal, 296), `kcal=${r.kcal}`);
  ok('label hit: confidence = LABEL_EXACT', r.confidence === CONFIDENCE.LABEL_EXACT, `conf=${r.confidence}`);
  ok('label hit: not flagged needsConfirmation', r.needsConfirmation === false);
  ok('label hit: macros present', approx(r.protein_g, 2.4) && approx(r.carbs_g, 42.5) && approx(r.fat_g, 13.8));
  // food-101 style underscores/case normalize:
  const r2 = estimateKcal({ source: 'label', key: 'Apple_Pie' });
  ok('label hit: key normalization (Apple_Pie)', approx(r2.kcal, 296));
}

// --- 2. Barcode hit ----------------------------------------------------------
{
  const r = estimateKcal({ source: 'barcode', key: '5449000000996' });
  ok('barcode hit: coca_cola resolves', approx(r.kcal, 139), `kcal=${r.kcal}`);
  ok('barcode hit: confidence = BARCODE_EXACT', r.confidence === CONFIDENCE.BARCODE_EXACT, `conf=${r.confidence}`);
  ok('barcode hit: source echoed', r.source === 'barcode');
}

// --- 3. Manual miss (low confidence, no fabricated number) -------------------
{
  const r = estimateKcal({ source: 'manual', key: 'zzznotarealfood' });
  ok('manual miss: kcal is null (no fabrication)', r.kcal === null, `kcal=${r.kcal}`);
  ok('manual miss: macros null', r.protein_g === null && r.carbs_g === null && r.fat_g === null);
  ok('manual miss: confidence = MISS (0)', r.confidence === CONFIDENCE.MISS);
  ok('manual miss: needsConfirmation flag set', r.needsConfirmation === true);
  ok('manual miss: confidence below confirm threshold', r.confidence < CONFIRM_THRESHOLD);
  // A manual EXACT hit should still be a confident-ish estimate:
  const hit = estimateKcal({ source: 'manual', key: 'banana' });
  ok('manual exact: banana resolves', approx(hit.kcal, 105));
  ok('manual exact: confidence = MANUAL_EXACT', hit.confidence === CONFIDENCE.MANUAL_EXACT);
  // A fuzzy/partial manual match is low-confidence and asks to confirm:
  const fuzzy = estimateKcal({ source: 'manual', key: 'grilled chicken' });
  ok('manual fuzzy: partial match found', fuzzy.kcal != null, `matched=${fuzzy.matchedKey}`);
  ok('manual fuzzy: low confidence -> needsConfirmation', fuzzy.needsConfirmation === true, `conf=${fuzzy.confidence}`);
}

// --- 3b. Match honesty: critical/head token agreement ------------------------
{
  const chicken = estimateKcal({ source: 'manual', key: 'chicken sandwich' });
  ok('match honesty: chicken sandwich resolves to chicken row',
    chicken.matchedKey === 'chicken_sandwich' && chicken.needsConfirmation === false,
    `matched=${chicken.matchedKey} conf=${chicken.confidence}`);
  ok('match honesty: chicken sandwich never becomes hamburger',
    chicken.matchedKey !== 'hamburger' && !/hamburger/i.test(chicken.matchedName || ''),
    `matched=${chicken.matchedKey} name=${chicken.matchedName}`);
  const chickenBurger = estimateKcal({ source: 'manual', key: 'chicken burger' });
  ok('match honesty: chicken burger asks instead of borrowing hamburger',
    chickenBurger.kcal === null && chickenBurger.needsConfirmation === true && chickenBurger.matchedKey === null,
    `matched=${chickenBurger.matchedKey} conf=${chickenBurger.confidence}`);
  const beefSandwich = estimateKcal({ source: 'manual', key: 'beef sandwich' });
  ok('match honesty: beef sandwich asks instead of borrowing chicken sandwich',
    beefSandwich.kcal === null && beefSandwich.needsConfirmation === true && beefSandwich.matchedKey === null,
    `matched=${beefSandwich.matchedKey} conf=${beefSandwich.confidence}`);
}

// --- 4. Portion scaling ------------------------------------------------------
{
  const one = estimateKcal({ source: 'label', key: 'banana' });
  const two = estimateKcal({ source: 'label', key: 'banana', portion: 2 });
  ok('portion: x2 doubles kcal', approx(two.kcal, one.kcal * 2), `1x=${one.kcal} 2x=${two.kcal}`);
  ok('portion: x2 doubles protein', approx(two.protein_g, one.protein_g * 2));
  ok('portion: x2 doubles serving grams', approx(two.servingG, one.servingG * 2));
  const half = estimateKcal({ source: 'label', key: 'banana', portion: 0.5 });
  ok('portion: x0.5 halves kcal', approx(half.kcal, one.kcal * 0.5), `half=${half.kcal}`);
  ok('portion: invalid portion falls back to 1', estimateKcal({ source: 'label', key: 'banana', portion: -3 }).kcal === one.kcal);
  ok('portion: confidence unaffected by portion', two.confidence === one.confidence);
}

// --- 5. isEstimate ALWAYS true (invariant #5) --------------------------------
{
  const cases = [
    { source: 'label', key: 'apple_pie' },
    { source: 'barcode', key: '5449000000996' },
    { source: 'manual', key: 'banana' },
    { source: 'manual', key: 'zzznotarealfood' },   // miss
    { source: 'label', key: 'also_missing' },        // miss
    { source: 'barcode', key: '0000000000000' },     // miss
    {},                                              // empty query
  ];
  let allEstimates = true, allConfInRange = true;
  for (const c of cases) {
    const r = estimateKcal(c);
    if (r.isEstimate !== true) allEstimates = false;
    if (!(r.confidence >= 0 && r.confidence <= 1)) allConfInRange = false;
  }
  ok('invariant #5: isEstimate is true for EVERY result', allEstimates);
  ok('invariant #5: confidence always in [0,1]', allConfInRange);
  ok('attribution carried on results', estimateKcal({ source: 'label', key: 'banana' }).attribution === 'TEST-ODbL-ATTRIBUTION');
}

// --- report ------------------------------------------------------------------
console.log('kcalEngine tests\n' + results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total`);
process.exit(fail === 0 ? 0 : 1);
