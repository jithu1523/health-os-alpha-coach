/* Alpha Coach — upgrade-path safety.
   Boots the app against legacy and malformed saved state and asserts it still
   mounts. A blank page shipped once because saved data from an older build was
   missing a key; this exists so that cannot happen again.

   Run from the folder root:  npm install jsdom && node test/boot.mjs           */
import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = fs.readFileSync(path.resolve(process.cwd(), 'alpha-coach.html'), 'utf8');

function boot(seed) {
  const errs = [];
  const vc = new VirtualConsole()
    .on('jsdomError', e => errs.push(e.message))
    .on('error', (...a) => errs.push(String(a[0])));
  // scripts are evaluated manually so localStorage can be seeded first
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://local.test/', virtualConsole: vc });
  if (seed) dom.window.localStorage.setItem('alphacoach.v2', seed);
  const code = [...dom.window.document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  try { dom.window.eval(code); } catch (e) { errs.push('THROW ' + e.message); }
  return { dom, errs };
}

const cases = [
  [null, 'clean first run'],
  [JSON.stringify({ name: 'J', days: {}, history: [], supps: [], ui: { screen: 'today' } }), 'v2 legacy (no points, no obStep)'],
  [JSON.stringify({ name: 'J', onboarded: true, ui: { screen: 'stack' } }), 'onboarded, older screen name'],
  [JSON.stringify({ name: 'J', onboarded: true, ui: { screen: 'does-not-exist' } }), 'unknown screen'],
  [JSON.stringify({ name: 'J', onboarded: true, inv: { items: { chicken: { ref: 'chicken', qty: 500 } } } }), 'had stock, keeps kitchen on'],
  [JSON.stringify({ name: 'J', onboarded: true, inv: { items: {} } }), 'no stock, kitchen stays off'],
  [JSON.stringify({ name: 'J', onboarded: true, inv: { items: { chicken: { ref: 'chicken' } } } }), 'half-formed inventory item'],
  [JSON.stringify({ name: 'J', onboarded: true, points: { ledger: 'not-an-array' }, weights: 'nope', prefs: null, obStep: 'x' }), 'wrong types throughout'],
  [JSON.stringify({ name: 'J', onboarded: true, prefs: { goal: 'cut', wake: '06:30' } }), 'legacy prefs, no flexible key'],
  [JSON.stringify({ name: 'J', onboarded: true, ui: { screen: 'today', modal: null } }), 'legacy ui, no eat-time flags'],
  [JSON.stringify({ name: 'J', onboarded: true, prefs: { foodLookup: false }, ui: { screen: 'today', foodLookup: { mode: 'manual' } } }), 'legacy ui, no photo keys'],
  ['{}', 'empty object'],
  ['not json at all', 'corrupt json']
];

let allOk = true;
for (const [seed, label] of cases) {
  const r = boot(seed);
  await new Promise(x => setTimeout(x, 250));
  const doc = r.dom.window.document;
  const visible = ((doc.querySelector('#app').textContent || '') + (doc.querySelector('#overlay').textContent || '')).trim();
  const crashed = /Something went wrong loading/.test(visible);
  const rendered = visible.length > 150 && !crashed;
  const theme = doc.documentElement.getAttribute('data-theme');
  const kitchen = r.dom.window.AlphaCoach ? r.dom.window.AlphaCoach.invOn() : '?';
  allOk &&= rendered && !!theme;
  console.log(
    `${label.padEnd(34)} render=${rendered ? 'yes' : 'NO '} ` +
    `theme=${String(theme).padEnd(6)} kitchen=${String(kitchen).padEnd(5)} ` +
    `err=${r.errs[0] ? r.errs[0].slice(0, 44) : 'none'}`
  );
}

console.log(allOk ? '\n✓ ALL BOOT PATHS RENDER' : '\n✗ SOME PATHS BLANK');
process.exit(allOk ? 0 : 1);
