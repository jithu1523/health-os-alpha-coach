// =============================================================================
// kcalEngine.mjs — pure, app-decoupled kcal/macro estimator (ESM)
//
// Architecture doc: office/local-first-photo-kcal-architecture.md §2.4
// Invariant #5:     EVERY result is an ESTIMATE (isEstimate:true) with a
//                   confidence in [0,1]. A miss NEVER fabricates a number — it
//                   returns kcal:null with low confidence and needsConfirmation.
//
// This module imports NOTHING from the app and NOTHING from Node at the top
// level, so it runs unchanged in the browser. It takes the food DB by injection
// (a plain object) — trivially testable. A Node-only async helper
// (loadFoodDbFromPath / createKcalEngineFromPath) reads JSON from disk via a
// dynamic import, keeping the browser path free of `node:*` imports.
//
// Food DB shape (as produced by build-fooddb.mjs / foodDb.sample.json):
//   {
//     attribution: "Contains information from Open Food Facts ... (ODbL) v1.0.",
//     items: [ { key, name, barcode?, kcal, protein_g, carbs_g, fat_g,
//                serving_g, source } , ... ]   // values are PER ONE SERVING
//   }
// =============================================================================

// Confidence policy (invariant #5). These are deliberately < 1: every lookup is
// an estimate of a *typical* serving, never a measured truth for this plate.
export const CONFIDENCE = {
  BARCODE_EXACT: 0.95, // a scanned barcode names an exact product
  LABEL_EXACT:   0.80, // a photo/label class -> typical-portion map
  MANUAL_EXACT:  0.70, // user typed a name that matches a key exactly
  MANUAL_FUZZY:  0.40, // partial/token match — plausible, confirm it
  MISS:          0.00, // nothing found — ask, do not assert
};

// Below this the caller MUST ask the user to confirm rather than present a
// number as fact (invariant #5).
export const CONFIRM_THRESHOLD = 0.5;

/** Normalize a free-text or label key for matching: lowercase, collapse
 *  separators/whitespace to single spaces, strip surrounding punctuation. */
export function normalizeKey(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[_/]+/g, ' ')      // food-101 uses underscores: "apple_pie"
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Index a food DB object. Pure & synchronous — safe in the browser.
 * @param {object} db  { attribution?, items:[...] }
 * @returns {{ attribution:string, items:Array, byKey:Map, byBarcode:Map }}
 */
export function loadFoodDb(db) {
  if (typeof db === 'string') {
    throw new TypeError(
      'loadFoodDb takes a DB object. To read from disk in Node use loadFoodDbFromPath().');
  }
  if (!db || typeof db !== 'object' || !Array.isArray(db.items)) {
    throw new TypeError('loadFoodDb: expected an object with an items[] array');
  }
  const byKey = new Map();
  const byBarcode = new Map();
  for (const it of db.items) {
    if (it.key) byKey.set(normalizeKey(it.key), it);
    if (it.name) {                       // also index the human name
      const nk = normalizeKey(it.name);
      if (!byKey.has(nk)) byKey.set(nk, it);
    }
    if (it.barcode) byBarcode.set(String(it.barcode).trim(), it);
  }
  return { attribution: db.attribution || '', items: db.items, byKey, byBarcode };
}

/** Node-only: read a JSON food DB from disk. Uses a dynamic import so the
 *  browser bundle never pulls in `node:fs`. */
export async function loadFoodDbFromPath(path) {
  const fs = await import('node:fs');
  return loadFoodDb(JSON.parse(fs.readFileSync(path, 'utf8')));
}

/**
 * Build an engine bound to an already-loaded DB (object) or a raw DB object.
 * Synchronous & browser-safe.
 * @param {object} source  A DB object, OR the indexed object from loadFoodDb().
 * @returns {{ estimateKcal:function, db:object }}
 */
export function createKcalEngine(source) {
  const db = source && source.byKey instanceof Map ? source : loadFoodDb(source);

  /**
   * @param {{source:'label'|'barcode'|'manual', key:string, portion?:number}} q
   * @returns {{kcal:number|null, protein_g:number|null, carbs_g:number|null,
   *            fat_g:number|null, source:string, confidence:number,
   *            isEstimate:true, needsConfirmation:boolean, matchedKey:string|null,
   *            servingG:number|null, portion:number, note:string, attribution:string}}
   */
  function estimateKcal({ source: src, key, portion = 1 } = {}) {
    const p = Number.isFinite(portion) && portion > 0 ? portion : 1;
    const base = {
      source: src || 'manual',
      isEstimate: true,          // invariant #5 — ALWAYS true
      portion: p,
      attribution: db.attribution,
    };

    let hit = null;
    let confidence = CONFIDENCE.MISS;

    if (src === 'barcode') {
      hit = db.byBarcode.get(String(key == null ? '' : key).trim()) || null;
      if (hit) confidence = CONFIDENCE.BARCODE_EXACT;
    } else if (src === 'label') {
      hit = db.byKey.get(normalizeKey(key)) || null;
      if (hit) confidence = CONFIDENCE.LABEL_EXACT;
    } else { // 'manual' (default) — free-text search
      const nk = normalizeKey(key);
      hit = db.byKey.get(nk) || null;
      if (hit) {
        confidence = CONFIDENCE.MANUAL_EXACT;
      } else if (nk) {
        hit = fuzzyFind(db, nk);         // plausible partial match — confirm it
        if (hit) confidence = CONFIDENCE.MANUAL_FUZZY;
      }
    }

    if (!hit) {
      // INVARIANT #5: never invent a number. Null macros, low confidence, and a
      // clear needs-confirmation flag so the caller ASKS.
      return {
        ...base,
        kcal: null, protein_g: null, carbs_g: null, fat_g: null,
        confidence: CONFIDENCE.MISS,
        needsConfirmation: true,
        matchedKey: null,
        servingG: null,
        note: `No match for ${src || 'manual'} "${key}". Needs user confirmation — not fabricating a value.`,
      };
    }

    const scale = (v) => (v == null ? null : round2(v * p));
    return {
      ...base,
      kcal: scale(hit.kcal),
      protein_g: scale(hit.protein_g),
      carbs_g: scale(hit.carbs_g),
      fat_g: scale(hit.fat_g),
      confidence,
      needsConfirmation: confidence < CONFIRM_THRESHOLD,
      matchedKey: hit.key || normalizeKey(hit.name),
      servingG: hit.serving_g == null ? null : round2(hit.serving_g * p),
      note: `Estimate from ${hit.source || 'foodDb'} for "${hit.name}" (typical serving x${p}).`,
    };
  }

  return { estimateKcal, db };
}

/** Node-only convenience: build an engine from a JSON path. */
export async function createKcalEngineFromPath(path) {
  return createKcalEngine(await loadFoodDbFromPath(path));
}

function fuzzyFind(db, nk) {
  const tokens = nk.split(' ').filter(Boolean);
  let best = null, bestScore = 0;
  for (const it of db.items) {
    const name = normalizeKey(it.name || it.key || '');
    if (!name) continue;
    let score = 0;
    if (name.includes(nk) || nk.includes(name)) score = 3;
    else {
      const nameTokens = new Set(name.split(' '));
      score = tokens.reduce((a, t) => a + (nameTokens.has(t) ? 1 : 0), 0);
    }
    if (score > bestScore) { bestScore = score; best = it; }
  }
  return bestScore > 0 ? best : null;
}

function round2(n) { return Math.round(n * 100) / 100; }

export default createKcalEngine;
