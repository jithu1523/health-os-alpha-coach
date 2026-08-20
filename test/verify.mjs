/* Alpha Coach — behavioural suite.
   Run from the folder root:  npm install jsdom && node test/verify.mjs        */
import fs from 'fs';
import path from 'path';
import { JSDOM, VirtualConsole } from 'jsdom';

const FILE = path.resolve(process.cwd(), 'alpha-coach.html');
const html = fs.readFileSync(FILE, 'utf8');
const MIN = 60000;
const errs = [];
const vc = new VirtualConsole()
  .on('jsdomError', e => errs.push(e.message))
  .on('error', (...a) => errs.push(String(a[0] && a[0].message || a[0])));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://local.test/', virtualConsole: vc });
const { window: W } = dom, doc = W.document, A = () => W.AlphaCoach;

const wait = ms => new Promise(r => setTimeout(r, ms));
const pass = [], fail = [];
const ok = (l, c, x = '') => (c ? pass : fail).push(l + (c ? '' : '  ->  ' + x));
const click = s => { const n = typeof s === 'string' ? doc.querySelector(s) : s; if (!n) { fail.push('missing node: ' + s); return false; } n.dispatchEvent(new W.MouseEvent('click', { bubbles: true })); return true; };
const act = (a, v) => doc.querySelector(v != null ? `[data-act="${a}"][data-v="${v}"]` : `[data-act="${a}"]`);
const txt = () => doc.querySelector('#app').textContent + doc.querySelector('#overlay').textContent;
const timeText = ts => `${String(new Date(ts).getHours()).padStart(2, '0')}:${String(new Date(ts).getMinutes()).padStart(2, '0')}`;
const displayTime = ts => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

await wait(320);
ok('boots without errors', errs.length === 0, errs[0]);

/* --------------------------------------------------------------- store seam */
ok('store seam uses the local adapter by default', A().Store.activeName === 'local', A().Store.activeName);
ok('store exposes load/save/subscribe', ['load', 'save', 'subscribe'].every(k => typeof A().Store[k] === 'function'));
ok('store exposes local photo blob methods', ['saveBlob', 'loadBlob', 'clearBlob'].every(k => typeof A().Store[k] === 'function'));
ok('supabase adapter is dormant and offline', A().Store.adapters.supabase.enabled === false && A().Store.adapters.supabase.network === false);
{
  const k = 'alphacoach.test.store';
  let seen = false;
  const off = A().Store.subscribe(k, v => { seen = !!v && v.probe === 42; });
  await A().Store.save(k, { probe: 42 });
  const loaded = await A().Store.load(k);
  ok('local adapter saves through Store', loaded && loaded.probe === 42, JSON.stringify(loaded));
  ok('local adapter notifies subscribers', seen);
  await A().Store.clear(k);
  off();
}
{
  const k = 'alphacoach.test.photo';
  await A().Store.saveBlob(k, new W.Blob(['photo-bytes'], { type: 'image/jpeg' }), { source: 'test' });
  const rec = await A().Store.loadBlob(k);
  ok('local adapter saves photo blobs through Store', rec && rec.meta && rec.meta.source === 'test', JSON.stringify(rec && rec.meta));
  await A().Store.clearBlob(k);
  ok('local adapter clears photo blobs through Store', await A().Store.loadBlob(k) === null);
}
{
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'office/supabase/migrations/0001_init.sql'), 'utf8');
  ok('supabase migration keeps ate_at separate from logged_at',
    /ate_at\s+timestamptz\s+not null[\s\S]*logged_at\s+timestamptz\s+not null/i.test(sql));
  ok('supabase points ledger accepts the append-only reversal code', /NEVER_LOGGED_VOIDED/.test(sql));
}

/* ------------------------------------------------------------ food lookup */
ok('food lookup ships off by default', A().foodLookupOn() === false);
ok('food lookup off leaves the existing dish estimator unchanged', A().estimateDish('pizza', 'regular').kcal === 780);
{
  ok('bundled food DB expanded beyond the seed set', A().FOOD_DB.items.length > 42, `count=${A().FOOD_DB.items.length}`);
  ok('bundled food DB includes USDA FNDDS attribution', /FoodData Central/.test(A().FOOD_DB.attribution) && A().FOOD_DB.items.some(x => x.source === 'fdc_fndds'));
  const manual = A().estimateKcal({ source: 'manual', key: 'pizza' });
  ok('manual food lookup is an estimate with confidence', manual.isEstimate === true && manual.kcal === 285 && manual.confidence === 0.7);
  ok('manual exact match can be used without low-confidence warning', manual.needsConfirmation === false);
  const barcode = A().estimateKcal({ source: 'barcode', key: '5449000000996' });
  ok('barcode lookup uses the barcode index', barcode.kcal === 139 && barcode.confidence === 0.95);
  const label = A().estimateKcal({ source: 'label', key: 'apple_pie' });
  ok('label lookup keeps the Phase 3 classifier seam', label.kcal === 296 && label.confidence === 0.8);
  const chickenSandwich = A().estimateKcal({ source: 'manual', key: 'chicken sandwich' });
  ok('chicken sandwich resolves to chicken, never hamburger',
    chickenSandwich.matchedKey === 'chicken_sandwich' && !/hamburger/i.test(chickenSandwich.matchedName || '') && chickenSandwich.needsConfirmation === false,
    JSON.stringify(chickenSandwich));
  const beefSandwich = A().estimateKcal({ source: 'manual', key: 'beef sandwich' });
  ok('near-miss beef sandwich asks instead of borrowing chicken sandwich',
    beefSandwich.kcal === null && beefSandwich.needsConfirmation === true && beefSandwich.matchedKey === null,
    JSON.stringify(beefSandwich));
  const chickenBurger = A().estimateKcal({ source: 'manual', key: 'chicken burger' });
  ok('near-miss chicken burger asks instead of matching hamburger',
    chickenBurger.kcal === null && chickenBurger.needsConfirmation === true && chickenBurger.matchedKey === null,
    JSON.stringify(chickenBurger));
  const fishChips = A().estimateKcal({ source: 'manual', key: 'fish and chips' });
  ok('uncovered Food-101 labels ask instead of guessing a wrong dish',
    fishChips.kcal === null && fishChips.needsConfirmation === true && fishChips.matchedKey === null,
    JSON.stringify(fishChips));
  const fuzzy = A().estimateKcal({ source: 'manual', key: 'grilled chicken' });
  ok('low-confidence food lookup asks instead of asserting', fuzzy.needsConfirmation === true && fuzzy.confidence < 0.5);
  const miss = A().estimateKcal({ source: 'manual', key: 'zzznotarealfood' });
  ok('food lookup miss does not fabricate calories', miss.kcal === null && miss.needsConfirmation === true);
  ok('food lookup carries ODbL attribution', /Open Food Facts/.test(manual.attribution));
}

/* ----------------------------------------------------------- photo logging */
ok('photo logging ships off by default', A().photoLogOn() === false);
ok('photo logging uses the confirmed Food-101 ONNX model metadata',
  A().PHOTO_MODEL.repo === 'onnx-community/swin-finetuned-food101-ONNX' && A().PHOTO_MODEL.dtype === 'q8');
{
  const photo = A().photoEstimateFromLabel('apple_pie', 0.92, 1);
  ok('photo label estimate is still an estimate with confidence',
    photo.isEstimate === true && photo.source === 'photo' && photo.kcal === 296 && photo.confidence <= 0.8 && photo.needsConfirmation === false);
  const low = A().photoEstimateFromLabel('apple_pie', 0.35, 1);
  ok('low-confidence photo labels ask before logging', low.needsConfirmation === true && low.kcal === 296);
  const unmapped = A().photoEstimateFromLabel('baby_back_ribs', 0.91, 1);
  ok('unmapped photo labels do not fabricate calories', unmapped.kcal === null && unmapped.needsConfirmation === true);
  W.AlphaCoachPhotoMock = async () => [{ label: 'apple_pie', score: 0.92 }, { label: 'baby_back_ribs', score: 0.81 }];
  const top = await A().PhotoClassifier.classify('data:image/png;base64,AA', { topk: 2 });
  ok('photo classifier returns top-k labels from the on-device seam', top.length === 2 && top[0].label === 'apple_pie' && top[0].score === 0.92);
}

/* ---------------------------------------------------------------- onboarding */
ok('kitchen tracking is off by default', A().invOn() === false);
for (let i = 0; i < 6; i++) { click(act('ob', 'next')); await wait(35); }
ok('onboarding asks about the kitchen rather than assuming', /Shall I track your kitchen/.test(txt()));
click(act('ob', 'next')); await wait(50);
click(act('ob', 'done')); await wait(170);
ok('app mounts', !!doc.querySelector('.rail'));
ok('no pantry data entry was required', doc.querySelectorAll('[data-pantry]').length === 0);

/* ------------------------------------------------------------- the day starts */
click(act('wake')); await wait(280);
const d = () => A().D();
/* Pin the session to a 07:00 start so the suite is deterministic. The eating
   window closes a fixed time before the user's usual bedtime, so results would
   otherwise depend on the hour the tests happen to run. */
{
  const morning = new Date(); morning.setHours(7, 0, 0, 0);
  d().wake = morning.getTime();
  d().key = new Date(morning).toISOString().slice(0, 10);
  A().setOffset(morning.getTime() - Date.now());
  await wait(80);
}
ok('wake stores a real timestamp', !!d() && Math.abs(d().wake - (Date.now() + A().offset)) < 5000);
ok('all five meals are scheduled', A().sched().rows.length === 5);
ok('first meal uses the plan interval, not a clock time', (() => {
  const g = (A().sched().rows[0].at - d().wake) / MIN;
  return g >= A().PLAN.first.min && g <= A().PLAN.first.ideal;
})());
ok('no phantom shortages with the kitchen off', A().shortages().length === 0);
{
  const notifyRows = A().sched().rows;
  const plan = A().Notify.plan();
  ok('notification plan is derived from wake-based meal times',
    plan.length === notifyRows.length * 3 &&
    plan[0].mealId === notifyRows[0].meal.id &&
    plan[0].at === notifyRows[0].at - 45 * MIN &&
    plan.find(e => e.key === notifyRows[0].meal.id + ':due').at === notifyRows[0].at &&
    plan.find(e => e.key === notifyRows[0].meal.id + ':late1').at === notifyRows[0].at + 30 * MIN,
    JSON.stringify(plan.slice(0, 3)));
  const oldNotification = W.Notification;
  const oldServiceWorker = W.navigator.serviceWorker;
  const registered = [];
  class MockNotification { constructor(title, opts) { registered.push({ title, opts }); } }
  MockNotification.permission = 'default';
  MockNotification.requestPermission = async () => { MockNotification.permission = 'granted'; return 'granted'; };
  W.Notification = MockNotification;
  Object.defineProperty(W.navigator, 'serviceWorker', {
    value: { register: async (url, opts) => { registered.push({ url, opts }); return { scope: opts.scope }; } },
    configurable: true
  });
  ok('notification settings explain derived scheduling', /wake-derived|derive reminder times/.test(A().Notify.settingsNote()), A().Notify.settingsNote());
  const permission = await A().Notify.ask();
  const swReady = await A().Notify.registerServiceWorker();
  A().S.notify = true;
  const scheduled = A().Notify.schedule();
  ok('served notification scaffold registers the service worker script',
    permission === 'granted' && swReady === true &&
    registered.some(x => /alpha-coach-sw\.js$/.test(x.url || '') && x.opts && x.opts.scope === './'),
    JSON.stringify(registered));
  ok('notification timers are scheduled only after opt-in permission',
    scheduled.length === plan.length && A().Notify.timers.length > 0,
    `scheduled=${scheduled.length} timers=${A().Notify.timers.length}`);
  A().Notify.clearSchedule();
  ok('notification timers can be cleared on opt-out', A().Notify.timers.length === 0);
  A().S.notify = false;
  if (oldNotification === undefined) delete W.Notification; else W.Notification = oldNotification;
  Object.defineProperty(W.navigator, 'serviceWorker', { value: oldServiceWorker, configurable: true });
}
{
  const originalKey = d().key;
  const namesFor = key => {
    d().key = key;
    return A().MEALS().map(m => m.name).join('|');
  };
  const variants = new Set(['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'].map(namesFor));
  ok('meal variety rotates the derived plan across day keys', variants.size > 1, [...variants].join(' / '));
  const rotationKey = ['2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23']
    .find(key => { d().key = key; return A().MEALS().some(m => m.variedFrom); });
  ok('meal variety can surface a rotated meal', !!rotationKey);
  if (rotationKey) {
    d().key = rotationKey;
    A().render(); await wait(80);
    ok('meal variety is disclosed on the plan', /Rotated from/.test(txt()));
  }
  d().key = originalKey;
  A().render(); await wait(80);

  const oldRefuse = [...(A().S.prefs.refuse || [])];
  A().S.prefs.refuse = ['chicken'];
  ok('meal variety respects refused ingredients',
    A().MEALS().every(m => !(m.ing || []).some(i => i.ref === 'chicken')),
    A().MEALS().map(m => `${m.slot}:${m.name}`).join(', '));
  A().S.prefs.refuse = oldRefuse;

  const oldSwaps = {...(A().S.swaps || {})};
  A().S.swaps = {...oldSwaps, m3: 'm3a'};
  const swapped = A().MEALS().find(m => m.id === 'm3');
  ok('manual meal swaps override automatic variety',
    swapped && swapped.name === 'Rajma rice bowl' && swapped.swappedFrom === 'Grilled chicken rice bowl',
    JSON.stringify(swapped));
  A().S.swaps = oldSwaps;

  ok('meal variety keeps the five plan slots stable',
    A().MEALS().map(m => m.id).join(',') === 'm1,m2,m3,m4,m5');
}

{
  A().S.prefs.foodLookup = true;
  A().S.ui.foodLookup = { mode: 'manual', key: 'pizza', portion: 1, result: A().estimateKcal({ source: 'manual', key: 'pizza' }) };
  const before = A().S.points.ledger.length;
  A().ACT.useFoodEstimate(); await wait(180);
  ok('food lookup result fills the existing eating-out modal', /Using a food lookup estimate/.test(txt()) && /Cheese pizza/.test(txt()));
  click(doc.querySelector('[data-act="saveEstimate"]')); await wait(420);
  const extra = d().extra.items[d().extra.items.length - 1];
  ok('food lookup log uses the existing extra-meal path', extra.name === 'Cheese pizza (1 slice)' && extra.kcal === 285);
  ok('food lookup log still awards through the normal honest-log code',
    A().S.points.ledger.slice(before).some(e => e.code === 'LOGGED_HONESTLY'));
  A().S.prefs.foodLookup = false;
}
{
  A().S.prefs.photoLogging = true;
  A().S.ui.estPhoto = { id: 'photo_test', preview: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', source: 'test' };
  A().S.ui.photoLog = { status: 'ready', photo: { id: 'photo_test' }, top: [{ label: 'apple_pie', name: 'Apple Pie', score: 0.92 }], result: null, manualKey: '', portion: 1, error: null };
  const before = A().S.points.ledger.length;
  A().ACT.openEstimate(); await wait(180);
  ok('photo logging UI is explicit about on-device classification',
    !!doc.querySelector('[data-act="photoPickLabel"]') && /onnx-community\/swin-finetuned-food101-ONNX/.test(txt()));
  A().ACT.photoPickLabel('apple_pie|0.92'); await wait(80);
  A().ACT.photoUseEstimate(); await wait(80);
  ok('photo estimate fills the existing eating-out modal', /Using a food lookup estimate/.test(txt()) && /Apple pie/.test(txt()));
  click(doc.querySelector('[data-act="saveEstimate"]')); await wait(420);
  const extra = d().extra.items[d().extra.items.length - 1];
  ok('photo estimate logs through the existing extra-meal path', extra.name === 'Apple pie (1 slice)' && extra.kcal === 296);
  ok('photo estimate still awards through the normal honest-log code',
    A().S.points.ledger.slice(before).some(e => e.code === 'LOGGED_HONESTLY'));
  A().S.prefs.photoLogging = false;
}

/* --------------------------------------------------------- sequential locking */
ok('only the first meal is open', A().isOpen(A().sched().rows[0]) && A().isLocked(A().sched().rows[1]));
ok('logging out of sequence is refused', A().commitMeal({ mealId: A().sched().rows[2].meal.id, ateAt: Date.now() }).ok === false);

{
  const startCleanMorning = async () => {
    A().ACT.wipe(); await wait(320);
    A().S.onboarded = true; A().ACT.wake(); await wait(220);
    const morning = new Date(); morning.setHours(7, 0, 0, 0);
    const day = A().D();
    day.logs = {}; day.prep = {}; day.reopened = {};
    day.wake = morning.getTime();
    day.key = new Date(morning).toISOString().slice(0, 10);
    A().setOffset(morning.getTime() - Date.now()); await wait(80);
    return morning;
  };
  await startCleanMorning();
  A().setOffset(A().D().wake + 150 * MIN - Date.now()); await wait(120);
  const row = A().nextRow();
  const start = A().S.points.ledger.length;
  click(act('ate', row.meal.id)); await wait(150);
  ok('first eat-time use shows the full explanation', /Your meal schedule uses when you ate, not when you typed it in/.test(txt()));
  ok('meal-time chip renders the actual planned time', txt().includes(displayTime(row.at)));
  click(act('confirmEat', row.meal.id)); await wait(950);
  const entries = A().S.points.ledger.slice(start);
  ok('zero-tap meal log uses loggedAt as ateAt', d().logs[row.meal.id].ateAt === d().logs[row.meal.id].loggedAt,
    `${d().logs[row.meal.id].ateAt} / ${d().logs[row.meal.id].loggedAt}`);
  ok('zero-tap meal log does not confirm a different time', entries.every(e => e.code !== 'TIME_CONFIRMED'));
  click(act('ate', A().nextRow().meal.id)); await wait(150);
  ok('repeat eat-time use shows the short explanation', /Set the time you ate\. The rest of today uses that time\./.test(txt()));
  A().ACT.close(); await wait(80);
  await startCleanMorning();
}

/* --------------------------------------------- ate time drives the schedule */
A().setOffset(d().wake + 150 * MIN - Date.now()); await wait(120);
click(act('ate', 'm1')); await wait(150);
ok('the confirm window asks when you actually ate', !!doc.querySelector('#eatTime'));
{
  const dialog = doc.querySelector('#overlay .modal[role="dialog"][aria-modal="true"]');
  ok('meal dialog is labelled and receives focus',
    !!dialog && !!dialog.getAttribute('aria-label') && dialog.contains(doc.activeElement),
    dialog ? `${dialog.getAttribute('aria-label')} / ${doc.activeElement && doc.activeElement.tagName}` : 'no dialog');
}
ok('main confirmation shows compact eat-time chips', doc.querySelectorAll('[data-eat-time-control="eatTime"] [data-act="eatTimeQuick"]').length === 4);
{
  const claimAt = Date.now() + A().offset - 30 * MIN;
  click('[data-act="eatTimeQuick"][data-v="eatTime"][data-kind="30"]'); await wait(120);
  ok('main confirmation chip sets a stated ateAt', doc.querySelector('#eatTime').value === timeText(claimAt), doc.querySelector('#eatTime').value);
  ok('main confirmation primary includes selected time', txt().includes(`Log breakfast eaten at ${displayTime(claimAt)}`));
}
click(act('confirmEat', 'm1')); await wait(950);
ok('normal planned-meal confirmation still logs the meal', d().logs.m1.status === 'done');
ok('both timestamps are stored', !!d().logs.m1.ateAt && !!d().logs.m1.loggedAt);
ok('main confirmation stores the quick-chip time as ateAt', timeText(d().logs.m1.ateAt) === timeText(d().logs.m1.loggedAt - 30 * MIN));
ok('next meal derives from the eating time', (() => {
  const gap = (A().sched().rows[1].at - d().logs.m1.ateAt) / MIN;
  const rule = A().PLAN.meals[0].gap;
  return gap >= rule.min - 1 && gap <= rule.ideal + 1;
})(), 'gap ' + Math.round((A().sched().rows[1].at - d().logs.m1.ateAt) / MIN) + ' min');
{
  /* Correcting an eating time moves everything after it. The shift is not always
     exactly the correction: freeing up earlier hours can also relax gaps that had
     been compressed against the end of the day. The invariants are that the tail
     moves earlier and that each meal still sits a legal interval from the one
     before it. */
  const before2 = A().sched().rows[1].at, before3 = A().sched().rows[2].at;
  const r = A().editAteTime('m1', d().logs.m1.ateAt - 100 * MIN);
  const after2 = A().sched().rows[1].at, after3 = A().sched().rows[2].at;
  ok('correcting the eating time moves the whole tail',
    r.ok && after2 < before2 && after3 < before3 && r.moved.length >= 2,
    `moved ${Math.round((before2 - after2) / MIN)} / ${Math.round((before3 - after3) / MIN)} min`);
  ok('the new time is still a legal interval from the meal before it', (() => {
    const gap = (after2 - d().logs.m1.ateAt) / MIN, rule = A().PLAN.meals[0].gap;
    return gap >= rule.min - 1 && gap <= rule.ideal + 1;
  })());
  ok('but does not unlock every future meal', A().isOpen(A().sched().rows[1]) && A().isLocked(A().sched().rows[2]));
  A().editAteTime('m1', d().logs.m1.ateAt + 100 * MIN);
}
{
  const wake = d().wake;
  const r = A().commitMeal({ mealId: A().nextRow().meal.id, ateAt: wake - 90 * MIN, loggedAt: Date.now() + A().offset });
  ok('an eating time before wake-up is clamped', r.ok && r.ateAt >= wake);
}

/* ---------------------------------------------- late logging keeps its credit */
{
  const row = A().nextRow();
  const ate = row.at, logged = row.at + 150 * MIN;
  A().setOffset(logged - Date.now());
  const r = A().commitMeal({ mealId: row.meal.id, ateAt: ate, loggedAt: logged, timeConfirmed: true });
  const codes = r.entries.map(e => e.code);
  ok('meal counted as eaten on time', r.cls.mealOnTime === true);
  ok('log counted as late', r.cls.logOnTime === false);
  ok('credit kept, penalty only on the entry', codes.includes('MEAL_ON_TIME') && codes.includes('LOG_LATE') && !codes.includes('MEAL_LATE'));
  ok('net stays positive', r.pts > 0, String(r.pts));
}

/* ---------------------------- auto-resolved meals reverse (append-only) on re-log */
{
  const setupMissed = async () => {
    A().ACT.wipe(); await wait(320);
    A().S.onboarded = true; A().ACT.wake(); await wait(220);
    const morning = new Date(); morning.setHours(7, 0, 0, 0);
    const day = A().D();
    day.logs = {}; day.prep = {}; day.reopened = {};
    day.wake = morning.getTime();
    day.key = new Date(morning).toISOString().slice(0, 10);
    A().setOffset(morning.getTime() - Date.now()); await wait(80);
    const first = A().sched().rows[0], second = A().sched().rows[1];
    A().setOffset(Math.max(first.at + 4 * 60 * MIN + 5 * MIN, second.at + MIN) - Date.now());
    await wait(80);
    const resolvedNow = A().autoResolveStale();
    ok('auto-resolve marks the stale meal missed', (resolvedNow || !!A().D().logs[first.meal.id]) && A().D().logs[first.meal.id].status === 'missed');
    return first;
  };
  /* Approach A: the penalty is RETURNED by an appended reversing entry, never by
     deleting the original. Both entries survive; the pair nets zero for the meal. */
  const reversed = (ref, label) => {
    const entries = A().S.points.ledger.filter(e => e.ref === ref);
    const penalties = entries.filter(e => e.code === 'MEAL_NEVER_LOGGED');
    const reversals = entries.filter(e => e.code === 'NEVER_LOGGED_VOIDED');
    ok(label + ': the penalty entry is kept, not deleted (append-only)',
      penalties.length === 1 && penalties[0].pts === A().RULES.MEAL_NEVER_LOGGED.pts);
    ok(label + ': exactly one reversing entry is appended',
      reversals.length === 1 && reversals[0].pts === A().RULES.NEVER_LOGGED_VOIDED.pts);
    ok(label + ': the never-logged charge nets zero for the meal',
      penalties.concat(reversals).reduce((a, e) => a + e.pts, 0) === 0);
    ok(label + ': the now-logged meal carries no "never logged" note', (() => {
      const lg = A().D().logs[ref];
      return !!lg && lg.status !== 'missed' && !/never logged/i.test(lg.note || '');
    })());
  };

  /* Coupling guard: the reversal is the exact opposite of the penalty. */
  ok('reversal and penalty sum to zero (coupled)',
    A().RULES.NEVER_LOGGED_VOIDED.pts + A().RULES.MEAL_NEVER_LOGGED.pts === 0);

  /* No unmiss: a meal genuinely never logged keeps its penalty, no reversal. */
  const standMissed = await setupMissed();
  {
    const entries = A().S.points.ledger.filter(e => e.ref === standMissed.meal.id);
    ok('with no unmiss, the -4 penalty stands unchanged',
      entries.filter(e => e.code === 'MEAL_NEVER_LOGGED').length === 1);
    ok('with no unmiss, no reversal entry appears',
      entries.every(e => e.code !== 'NEVER_LOGGED_VOIDED'));
  }

  const missed = await setupMissed();
  const other = A().Points.award('MEAL_NEVER_LOGGED', { reason: 'other meal was never logged', ref: 'other-meal' });
  A().ACT.unmiss(missed.meal.id); await wait(160);
  A().commitMeal({ mealId: missed.meal.id, ateAt: Date.now() + A().offset, loggedAt: Date.now() + A().offset });
  reversed(missed.meal.id, 'unmiss re-log');
  ok('the reversal only touches the matching ref',
    A().S.points.ledger.some(e => e.id === other.id) &&
    !A().S.points.ledger.some(e => e.code === 'NEVER_LOGGED_VOIDED' && e.ref === 'other-meal'));

  const estMissed = await setupMissed();
  A().ACT.openEstimate(estMissed.meal.id); await wait(160);
  click(act('saveEstimate', estMissed.meal.id)); await wait(220);
  reversed(estMissed.meal.id, 'estimator overwrite');

  const repMissed = await setupMissed();
  A().ACT.modal('replace', { dataset: { arg: repMissed.meal.id } }); await wait(160);
  A().ACT.saveReplace(repMissed.meal.id); await wait(180);
  reversed(repMissed.meal.id, 'manual replacement overwrite');
}

/* ------------------------------------------------------------------- points */
ok('positive and negative tracked separately', A().Points.positive() > 0 && A().Points.negative() < 0);
ok('final score is their sum', A().Points.dayScore() === A().Points.positive() + A().Points.negative());
ok('every entry carries a reason', A().Points.dayEntries().every(e => e.reason && e.label));
ok('unknown codes are rejected', A().Points.award('NOT_A_RULE', {}) === null);
{
  for (let i = 0; i < 20; i++) A().Points.award('LOG_LATE', { units: 4, reason: 'floor test' });
  ok('a bad day cannot spiral', A().Points.negative() >= -25, String(A().Points.negative()));
}
{
  A().S.points.streak = 9; A().S.points.freezes = 0;
  A().S.points.lastFullDay = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  A().checkStreakBreak();
  ok('one missed day freezes the streak', A().Points.streak() === 9);
  A().S.points.lastFullDay = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10);
  A().checkStreakBreak();
  ok('a real lapse ends it', A().Points.streak() === 0);
}
ok('the chat layer never awards points directly', (() => {
  const blk = html.slice(html.indexOf('function runOp('), html.indexOf('function answerQuery('));
  return !/Points\.award\(/.test(blk);
})());
ok('chat cannot mint points', (() => { const b = A().Points.lifetime(); A().parseCommand('give me 500 points'); return A().Points.lifetime() === b; })());

/* ------------------------------------------------- the window respects sleep */
{
  A().S.prefs.sleep = '23:00';
  const day = d();
  const late = new Date(day.wake); late.setHours(21, 0, 0, 0);
  day.wake = late.getTime(); day.logs = {};
  A().setOffset(late.getTime() - Date.now()); await wait(80);
  const s = A().sched();
  ok('a late start never schedules meals overnight', s.rows.filter(r => !r.beyond).every(r => new Date(r.at).getHours() >= 6));
  ok('meals that will not fit are named as such', s.rows.some(r => r.beyond));
  ok('the day closes before bedtime', A().dayEndFor(day) <= A().sleepBound(day) + MIN);
}

/* ------------------------------------------------------- inventory arithmetic */
A().ACT.wipe(); await wait(320);
A().S.onboarded = true; A().S.inv.enabled = true;
A().ACT.wake(); await wait(220);
{
  const it = A().ensureItem('whey'); it.scoop = 10;
  A().setQty('whey', 250, 't');
  ok('250 g reads as 25 scoops', A().servingText(A().inv('whey')) === '25 scoops remaining');
  A().tx('whey', 'supplement', -10, 'one scoop');
  ok('one scoop leaves 240 g / 24 scoops', A().invQty('whey') === 240 && A().servingText(A().inv('whey')) === '24 scoops remaining');
  A().tx('whey', 'purchase', 1000, 'bought 1 kg');
  ok('restocking adds rather than replaces', A().invQty('whey') === 1240 && A().servingText(A().inv('whey')) === '124 scoops remaining');
  A().setQty('whey', 700, 'correction');
  ok('correction is a distinct transaction', A().invQty('whey') === 700 && A().inv('whey').tx.slice(-1)[0].type === 'correct');
  A().tx('whey', 'add', 100, 't'); A().undoLast();
  ok('undo restores the previous quantity', A().invQty('whey') === 700);
  A().setQty('oats', 20, 't'); A().tx('oats', 'meal', -50, 't');
  ok('quantities never go negative', A().invQty('oats') === 0 && A().S.inv.mismatch.some(m => m.ref === 'oats'));
  A().S.inv.mismatch = [];
}
{
  A().planRefs().forEach(r => { A().ensureItem(r); A().setQty(r, 3000, 'seed'); });
  const meal = A().nextRow().meal;
  const before = A().invQty(meal.ing[0].ref);
  click(act('prep', meal.id)); await wait(90);
  ok('preparing deducts nothing', A().invQty(meal.ing[0].ref) === before);
  A().setOffset((A().nextRow().at - Date.now()) + MIN); await wait(60);
  const half = A().mealItems(meal).map(i => ({ ref: i.ref, amt: i.amt / 2 }));
  const r = A().commitMeal({ mealId: meal.id, ateAt: Date.now() + A().offset, use: half });
  ok('confirmed consumption deducts', A().invQty(meal.ing[0].ref) < before);
  ok('macros scale with the actual portion', Math.abs(d().logs[meal.id].macros.kcal - meal.kcal / 2) <= 2);
}

/* --------------------------------------------------- replacement transparency */
{
  const orig = A().MEALS().find(m => m.id === A().nextRow().meal.id);
  orig.ing.forEach(i => A().setQty(i.ref, 0, 'starve'));
  ['eggs', 'lentils', 'spinach', 'roti', 'curd', 'oats'].forEach(r => { A().ensureItem(r); A().setQty(r, 900, 'stock'); });
  const res = A().resolveMeal(orig);
  ok('a shortage is detected', !!res && res.missing.length > 0);
  ok('a makeable alternative is chosen', !!res.alt && res.alt.ing.every(i => A().invQty(i.ref) >= i.amt));
  A().setOffset(A().nextRow().at - 20 * MIN - Date.now());
  A().checkReplacements();
  const sw = (d().autoSwap || {})[orig.id];
  ok('the swap is recorded, never silent', !!sw && !!sw.missingText && !!sw.altName);
  A().ACT.go('today'); A().render(); await wait(200);
  ok('and explained on screen', /was replaced with/.test(txt()));
  ok('with a keep-the-original escape', !!act('keepOriginal', orig.id));
}

/* ------------------------------------------------------------- eating out */
{
  A().ACT.wipe(); await wait(320);
  A().S.onboarded = true; A().ACT.wake(); await wait(220);
  const morning = new Date(); morning.setHours(7, 0, 0, 0);
  const day = A().D();
  day.logs = {}; day.prep = {}; day.reopened = {};
  day.wake = morning.getTime();
  day.key = new Date(morning).toISOString().slice(0, 10);
  A().setOffset(morning.getTime() + 4 * 60 * MIN - Date.now()); await wait(80);
  const timeText = ts => `${String(new Date(ts).getHours()).padStart(2, '0')}:${String(new Date(ts).getMinutes()).padStart(2, '0')}`;
  const logNet = entries => entries.filter(e => e.code === 'LOGGED_HONESTLY' || e.code === 'LOG_LATE' || e.code === 'MEAL_LOGGED_ON_TIME').reduce((a, e) => a + e.pts, 0);
  const nx = A().nextRow();
  click(act('openEstimate', nx.meal.id)); await wait(170);
  ok('the estimator opens', /What did you eat/.test(txt()));
  ok('the estimator asks when you actually ate', !!doc.querySelector('#estEatTime'));
  ok('the estimator shows compact eat-time chips', doc.querySelectorAll('[data-eat-time-control="estEatTime"] [data-act="eatTimeQuick"]').length === 4);
  ok('estimator meal-time chip label is the planned time', doc.querySelector('[data-act="eatTimeQuick"][data-v="estEatTime"][data-kind="meal"]').textContent.trim() === displayTime(nx.at));
  click('[data-act="eatTimeQuick"][data-v="estEatTime"][data-kind="meal"]'); await wait(120);
  ok('estimator meal-time chip sets a stated ateAt', doc.querySelector('#estEatTime').value === timeText(nx.at), doc.querySelector('#estEatTime').value);
  A().ACT.modal('replace', { dataset: { arg: nx.meal.id } }); await wait(120);
  ok('estimator eat-time carries into replacement in the same session', doc.querySelector('#repEatTime').value === timeText(nx.at), doc.querySelector('#repEatTime').value);
  A().ACT.openEstimate(nx.meal.id); await wait(120);
  ok('a photo can be attached', !!doc.querySelector('[data-photo="est"]'));
  ok('dishes and portions are offered', doc.querySelectorAll('[data-act="estDish"]').length >= 12 && doc.querySelectorAll('[data-act="estPortion"]').length === 4);
  ok('it is honest about being an estimate', /An estimate, not a measurement/.test(txt()));
  click(act('estDish', 'biryani')); await wait(80);
  click(act('estPortion', 'large')); await wait(80);
  ok('portion scales the numbers', A().estimateDish('biryani', 'large').kcal === Math.round(720 * 1.4));
  const before = A().eatenMacros().kcal;
  const estAte = morning.getTime() + 60 * MIN;
  doc.querySelector('#estEatTime').value = timeText(estAte);
  const estStart = A().S.points.ledger.length;
  click(act('saveEstimate', nx.meal.id)); await wait(220);
  const estEntries = A().S.points.ledger.slice(estStart);
  ok('it logs against the meal', d().logs[nx.meal.id].status === 'replaced');
  ok('estimator replacement uses the stated eating time', Math.abs(d().logs[nx.meal.id].ateAt - estAte) < MIN && d().logs[nx.meal.id].loggedAt > d().logs[nx.meal.id].ateAt + 2 * 60 * MIN);
  ok('estimator replacement anchors the schedule on ateAt', (() => {
    const next = A().nextRow(), gap = (next.at - d().logs[nx.meal.id].ateAt) / MIN;
    const rule = A().PLAN.meals[nx.index].gap;
    return gap >= rule.min - 1 && gap <= rule.ideal + 1;
  })());
  ok('and its calories count toward the day', A().eatenMacros().kcal > before);
  const truthfulNonWindow = entries => {
    const honest = entries.filter(e => e.code === 'LOGGED_HONESTLY');
    return honest.length === 1 && honest[0].label === 'Told me instead of hiding it' &&
      honest.every(e => !/inside the window/i.test((e.label || '') + ' ' + (e.reason || '')));
  };
  ok('estimator replacement uses truthful non-window points copy', truthfulNonWindow(estEntries));
  ok('late estimator replacement nets non-negative logging points', logNet(estEntries) >= 0, String(logNet(estEntries)));

  const extraStart = A().S.points.ledger.length;
  A().ACT.openEstimate(); await wait(120);
  ok('the extra estimator asks when you actually ate', !!doc.querySelector('#estEatTime'));
  click(act('saveEstimate')); await wait(180);
  ok('extra estimator uses truthful non-window points copy', truthfulNonWindow(A().S.points.ledger.slice(extraStart)));

  const manual = A().nextRow();
  const manualStart = A().S.points.ledger.length;
  A().ACT.modal('replace', { dataset: { arg: manual.meal.id } }); await wait(120);
  ok('manual replacement asks when you actually ate', !!doc.querySelector('#repEatTime'));
  ok('manual replacement places eat-time below the estimator action', (() => {
    const estimateButton = doc.querySelector('[data-act="openEstimate"][data-v="' + manual.meal.id + '"]');
    const eatTime = doc.querySelector('[data-eat-time-control="repEatTime"]');
    return !!estimateButton && !!eatTime && (estimateButton.compareDocumentPosition(eatTime) & W.Node.DOCUMENT_POSITION_FOLLOWING);
  })());
  const replaceClaimAt = Date.now() + A().offset - 60 * MIN;
  click('[data-act="eatTimeQuick"][data-v="repEatTime"][data-kind="60"]'); await wait(120);
  ok('manual replacement 1h chip sets a stated ateAt', doc.querySelector('#repEatTime').value === timeText(replaceClaimAt), doc.querySelector('#repEatTime').value);
  ok('manual replacement primary includes selected time', /Save eaten at \d/.test(txt()));
  const manualAte = morning.getTime() + 130 * MIN;
  doc.querySelector('#repEatTime').value = timeText(manualAte);
  A().ACT.saveReplace(manual.meal.id); await wait(160);
  const manualEntries = A().S.points.ledger.slice(manualStart);
  ok('manual replacement uses the stated eating time', Math.abs(d().logs[manual.meal.id].ateAt - manualAte) < MIN && d().logs[manual.meal.id].loggedAt > d().logs[manual.meal.id].ateAt + 60 * MIN);
  ok('manual replacement anchors the schedule on ateAt', (() => {
    const next = A().nextRow(), gap = (next.at - d().logs[manual.meal.id].ateAt) / MIN;
    const rule = A().PLAN.meals[manual.index].gap;
    return gap >= rule.min - 1 && gap <= rule.ideal + 1;
  })());
  ok('manual replacement uses truthful non-window points copy', truthfulNonWindow(manualEntries));
  ok('late manual replacement nets non-negative logging points', logNet(manualEntries) >= 0, String(logNet(manualEntries)));
}
ok('the vision seam exists', typeof A().AlphaAPI.recogniseMeal === 'function');
ok('and returns nothing without a backend', (await A().AlphaAPI.recogniseMeal('data:image/png;base64,x')) === null);

/* ------------------------------------------------- conversational control */
{
  const say = async t => { A().ACT.ask(t); await wait(900); return A().S.chat[A().S.chat.length - 1].t; };
  A().S.inv.enabled = true;
  const before = A().invQty('chicken');
  let r = await say('add 1 kg chicken');
  ok('chat writes inventory', A().invQty('chicken') === before + 1000);
  ok('and reports before and after', /→/.test(r));
  r = await say('set rice to 500 g');
  ok('chat corrects a quantity', A().invQty('rice') === 500);
  r = await say('I slept 7 hours');
  ok('chat logs sleep', A().S.sleepLog.slice(-1)[0].hours === 7);
  r = await say('I weigh 98.6 kg');
  ok('chat logs weight', A().S.weights.slice(-1)[0].kg === 98.6);
  r = await say('how many points today?');
  ok('chat reports points exactly as recorded', r.includes('+' + A().Points.positive()));
  r = await say('what is the capital of France');
  ok('chat stays in scope', /only handle your food|did not catch/.test(r));
  r = await say('remove the expired milk');
  ok('destructive changes are confirmed first', !!A().S.ui.chatConfirm);
  click(act('chatConfirm', 'yes')); await wait(220);
  ok('confirming applies it', A().invQty('milk') === 0);
}

/* ------------------------------------------------------------------ reward */
{
  while (A().Points.towardReward() < A().REWARD_TARGET) A().Points.award('FULL_DAY', { reason: 'seed' });
  A().ACT.openReward(); await wait(160);
  ok('the reward reveals when earned', !!A().S.points.pending);
  ok('it is framed as optional', /an offer, not a task/.test(txt()));
  const id = A().S.points.pending.id;
  const logs = Object.keys(A().D().logs).length;
  click(act('rewardChoice', 'no')); await wait(180);
  ok('declining logs nothing', Object.keys(A().D().logs).length === logs);
  A().ACT.openReward(); await wait(120);
  ok('and does not hand out another straight away', A().S.points.pending === null && A().Points.coolingDown());
  ok('points stay banked through a decline', A().Points.towardReward() >= A().REWARD_TARGET);
}

/* -------------------------------------------------------- flexible logging */
{
  /* A fresh, deterministic day so every meal is pending and unresolved. */
  const morning = new Date(); morning.setHours(7, 0, 0, 0);
  const day = A().D();
  day.logs = {}; day.prep = {}; day.reopened = {};
  day.wake = morning.getTime();
  day.key = new Date(morning).toISOString().slice(0, 10);
  A().setOffset(morning.getTime() - Date.now());
  A().S.prefs.flexible = false;
  A().render(); await wait(80);
  const rows = () => A().sched().rows;

  /* Default (locking) mode still gates on order. */
  ok('locking is the default', A().S.prefs.flexible === false);
  ok('locking mode: only the first meal is open', A().isOpen(rows()[0]) && A().isLocked(rows()[2]));
  ok('locking mode: logging out of order is refused',
    A().commitMeal({ mealId: rows()[2].meal.id, ateAt: Date.now() + A().offset }).ok === false);
  click(act('go', 'today')); await wait(60);
  ok('locking mode: a later meal shows the lock and no action buttons', (() => {
    const el = doc.querySelector(`.meal[data-meal="${rows()[2].meal.id}"]`);
    return !!el && el.getAttribute('data-state') === 'locked' && !el.querySelector('[data-act="ate"]');
  })());

  /* Turn flexible on through the real Settings toggle. */
  click(act('go', 'settings')); await wait(60);
  ok('settings offers a flexible-logging toggle', !!act('flexToggle'));
  click(act('flexToggle')); await wait(120);
  ok('the toggle flips the preference', A().S.prefs.flexible === true);

  /* Flexible mode: the ordering gate is gone, nothing else moves. */
  ok('flexible mode: every pending meal is open', rows().every(r => r.status !== 'pending' || A().isOpen(r)));
  ok('flexible mode: nothing is locked', rows().every(r => !A().isLocked(r)));
  click(act('go', 'today')); await wait(60);
  ok('flexible mode: a later meal shows action buttons and no lock', (() => {
    const el = doc.querySelector(`.meal[data-meal="${rows()[2].meal.id}"]`);
    return !!el && el.getAttribute('data-state') !== 'locked' && !!el.querySelector('[data-act="ate"]');
  })());

  /* The core promise: log the third meal before the first. */
  const third = rows()[2].meal.id;
  const r = A().commitMeal({ mealId: third, ateAt: Date.now() + A().offset });
  ok('flexible mode: an out-of-order meal logs successfully', r.ok === true);
  ok('flexible mode: it stores ateAt and loggedAt like any other log',
    !!A().D().logs[third] && !!A().D().logs[third].ateAt && !!A().D().logs[third].loggedAt);
  ok('flexible mode: punctuality is still scored on that log', !!A().D().logs[third].cls);
  ok('flexible mode: out-of-order log earns no sequence credit or order claim', (() => {
    const claims = A().S.points.ledger.filter(e => e.ref === third && (e.code === 'SEQUENCE_KEPT' || /taken in order/i.test(e.reason || '')));
    return claims.length === 0;
  })());

  /* ateAt anchoring and compression behave exactly as now. */
  ok('flexible mode: the schedule still holds all five meals', rows().length === 5);
  ok('flexible mode: every consecutive gap is still a legal interval', (() => {
    const rw = rows();
    for (let i = 1; i < rw.length; i++) {
      if (rw[i].beyond) continue;
      const gap = (rw[i].at - rw[i - 1].at) / MIN;
      const rule = A().PLAN.meals[i - 1].gap;
      if (gap < rule.min - 1 || gap > rule.ideal + 1) return false;
    }
    return true;
  })());

  /* Flexible users still earn sequence credit when they actually keep sequence. */
  day.logs = {}; day.prep = {}; day.reopened = {};
  A().S.points.ledger = [];
  A().setOffset(morning.getTime() - Date.now()); await wait(80);
  const first = rows()[0].meal.id;
  const inOrder = A().commitMeal({ mealId: first, ateAt: Date.now() + A().offset });
  ok('flexible mode: in-order log still earns sequence credit', (() => {
    const claims = A().S.points.ledger.filter(e => e.ref === first && e.code === 'SEQUENCE_KEPT' && /taken in order/i.test(e.reason || ''));
    return inOrder.ok === true && claims.length === 1;
  })());

  /* Turning it back off restores the gate. */
  click(act('go', 'settings')); await wait(60);
  click(act('flexToggle')); await wait(120);
  ok('turning flexible off restores locking',
    A().S.prefs.flexible === false &&
    A().commitMeal({ mealId: rows().find(r => r.status === 'pending' && A().isLocked(r)).meal.id, ateAt: Date.now() + A().offset }).ok === false);
}

/* ------------------------------------------------------------ every screen */
for (const sc of ['today', 'prep', 'inventory', 'shop', 'points', 'jugaad', 'stack', 'train', 'progress', 'coach', 'prefs', 'settings']) {
  click(act('go', sc)); await wait(60);
  ok('renders: ' + sc, A().S.ui.screen === sc && doc.querySelector('#screen').children.length > 0);
}
ok('app shell exposes skip link and labelled landmarks',
  !!doc.querySelector('.skip-link[href="#main"]') &&
  !!doc.querySelector('main#main[aria-labelledby="screenTitle"]') &&
  !!doc.querySelector('.rail[aria-label="Primary navigation"]') &&
  !!doc.querySelector('.tabbar[aria-label="Primary mobile navigation"]'));
ok('primary navigation buttons have accessible names',
  [...doc.querySelectorAll('.nav-item[data-act="go"], .tab[data-act="go"]')].every(b => b.getAttribute('aria-label')));
ok('toast region announces updates politely',
  !!doc.querySelector('#toasts[role="status"][aria-live="polite"]'));
click(act('go', 'today')); await wait(80);
ok('day progress ring exposes status by axis',
  /Meals \d+ percent/.test(doc.querySelector('.dayring svg')?.getAttribute('aria-label') || ''));
ok('mascot exposes progress state',
  /fuel \d+ percent, protein \d+ percent, meals \d+ percent/.test(doc.querySelector('.mascot')?.getAttribute('aria-label') || ''));
click(act('go', 'points')); await wait(80);
ok('weekly score chart exposes a score summary',
  /^Recent discipline scores: /.test(doc.querySelector('.weekbars')?.getAttribute('aria-label') || ''));
ok('no crash screen', !/Something went wrong loading/.test(txt()));
ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));

console.log('\n✓ PASS ' + pass.length);
if (fail.length) { console.log('\n✗ FAIL ' + fail.length); fail.forEach(f => console.log('   - ' + f)); }
process.exit(fail.length ? 1 : 0);
