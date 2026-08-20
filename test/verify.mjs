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

await wait(320);
ok('boots without errors', errs.length === 0, errs[0]);

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

/* --------------------------------------------------------- sequential locking */
ok('only the first meal is open', A().isOpen(A().sched().rows[0]) && A().isLocked(A().sched().rows[1]));
ok('logging out of sequence is refused', A().commitMeal({ mealId: A().sched().rows[2].meal.id, ateAt: Date.now() }).ok === false);

/* --------------------------------------------- ate time drives the schedule */
A().setOffset(d().wake + 150 * MIN - Date.now()); await wait(120);
click(act('ate', 'm1')); await wait(150);
ok('the confirm window asks when you actually ate', !!doc.querySelector('#eatTime'));
click(act('confirmEat', 'm1')); await wait(950);
ok('both timestamps are stored', !!d().logs.m1.ateAt && !!d().logs.m1.loggedAt);
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
  A().setOffset(120 * MIN); await wait(80);
  const nx = A().nextRow();
  click(act('openEstimate', nx.meal.id)); await wait(170);
  ok('the estimator opens', /What did you eat/.test(txt()));
  ok('a photo can be attached', !!doc.querySelector('[data-photo="est"]'));
  ok('dishes and portions are offered', doc.querySelectorAll('[data-act="estDish"]').length >= 12 && doc.querySelectorAll('[data-act="estPortion"]').length === 4);
  ok('it is honest about being an estimate', /An estimate, not a measurement/.test(txt()));
  click(act('estDish', 'biryani')); await wait(80);
  click(act('estPortion', 'large')); await wait(80);
  ok('portion scales the numbers', A().estimateDish('biryani', 'large').kcal === Math.round(720 * 1.4));
  const before = A().eatenMacros().kcal;
  click(act('saveEstimate', nx.meal.id)); await wait(220);
  ok('it logs against the meal', d().logs[nx.meal.id].status === 'replaced');
  ok('and its calories count toward the day', A().eatenMacros().kcal > before);
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
ok('no crash screen', !/Something went wrong loading/.test(txt()));
ok('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));

console.log('\n✓ PASS ' + pass.length);
if (fail.length) { console.log('\n✗ FAIL ' + fail.length); fail.forEach(f => console.log('   - ' + f)); }
process.exit(fail.length ? 1 : 0);
