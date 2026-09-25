// Day plans, legs and the answer flow (DESIGN §3, §5). Pure: inputs are never mutated.

import { hashSeed } from './rng.js';
import { allowedTypes, chooseType } from './quiz.js';
import { gradeCard, teachCard, knowCard, gradedToday, countMiles } from './srs.js';

export const DUE_CAP = 100;
export const LEG_SIZE = 20;
export const LEG_REVIEWS = 14;
export const CHECK_GAP = 3;
export const REASK_GAP = 3;
export const MAX_REASKS = 2;
export const DAY_NEW_CAP = 100;
export const LEG_NEW_CAP = 40;

const LEVELS = ['A1', 'A2', 'B1', 'B2'];

const wordOf = (byId, id) => (byId instanceof Map ? byId.get(id) : byId[id]);

// Levels from startLevel up to B2, then the lower ones. Inside a level the order is a
// seeded shuffle: sorting by a hash of seed + id keeps it stable while more words get content.
export function introOrder(words, startLevel = 'A1', seed = '3000-miles') {
  const s = Math.max(0, LEVELS.indexOf(startLevel));
  const levels = [...LEVELS.slice(s), ...LEVELS.slice(0, s)];
  const key = new Map(words.map((w) => [w.id, hashSeed(`${seed}:${w.id}`)]));
  const out = [];
  for (const lv of levels) {
    const ids = words.filter((w) => w.lv === lv).map((w) => w.id);
    ids.sort((a, b) => key.get(a) - key.get(b) || (a < b ? -1 : 1));
    out.push(...ids);
  }
  return out;
}

export function makeDayPlan(cards, today, settings = {}) {
  const dueAll = Object.keys(cards)
    .filter((id) => cards[id].d <= today)
    .sort((a, b) => cards[a].d - cards[b].d || cards[a].b - cards[b].b || (a < b ? -1 : 1));
  const due = dueAll.slice(0, DUE_CAP);
  const newTarget = dueAll.length > DUE_CAP ? 0 : (settings.newPerDay ?? 10);
  return {
    day: today, due, dueTotal: dueAll.length, newTarget, goal: due.length + newTarget,
    done: 0, taught: 0, known: 0, right: 0, wrong: 0, miles: 0, legs: 0, shown: [],
  };
}

export function nextNew(order, cards, plan, n, exclude = new Set()) {
  const shown = new Set(plan.shown);
  const out = [];
  for (const id of order) {
    if (out.length >= n) break;
    if (cards[id] || shown.has(id) || exclude.has(id)) continue;
    out.push(id);
  }
  return out;
}

export function newWordItems(id, word, rnd) {
  const type = allowedTypes(0, word, { canListen: false })[0];
  return [
    { key: `meet-${id}`, id, kind: 'meet', type: 'meet' },
    { key: `check-${id}`, id, kind: 'check', type },
  ];
}

function insertAt(queue, index, item) {
  const at = Math.min(index, queue.length);
  return [...queue.slice(0, at), item, ...queue.slice(at)];
}

// Each meet item gets its check CHECK_GAP items later, or last.
function withChecks(base, checks) {
  let queue = base;
  for (const check of checks) {
    const i = queue.findIndex((x) => x.kind === 'meet' && x.id === check.id);
    queue = insertAt(queue, i + 1 + CHECK_GAP, check);
  }
  return queue;
}

// Two reviews, one new word, two reviews, one new word, ..., then the rest.
function interleave(reviews, meets) {
  const out = [];
  let r = 0;
  let m = 0;
  while (r < reviews.length && m < meets.length) {
    for (let k = 0; k < 2 && r < reviews.length; k++) out.push(reviews[r++]);
    out.push(meets[m++]);
  }
  return [...out, ...reviews.slice(r), ...meets.slice(m)];
}

export function buildLeg({ plan, cards, byId, order, today, rnd, caps, extra = false }) {
  const reviews = [];
  if (!extra) {
    for (const id of plan.due) {
      if (reviews.length >= LEG_REVIEWS) break;
      const card = cards[id];
      const word = wordOf(byId, id);
      if (!card || !word || gradedToday(card, today)) continue;
      reviews.push({ key: `review-${id}`, id, kind: 'review', type: chooseType(card.b, word, caps, rnd) });
    }
  }
  const room = LEG_SIZE - reviews.length;
  const want = extra ? room : Math.min(room, plan.newTarget - plan.taught);
  const slots = Math.max(0, Math.min(want, DAY_NEW_CAP - plan.shown.length, LEG_NEW_CAP));
  const ids = nextNew(order, cards, plan, slots).filter((id) => wordOf(byId, id));
  const meets = [];
  const checks = [];
  for (const id of ids) {
    const [meet, check] = newWordItems(id, wordOf(byId, id), rnd);
    meets.push(meet);
    checks.push(check);
  }
  const leg = {
    day: today,
    queue: withChecks(interleave(reviews, meets), checks),
    done: 0,
    reasks: {},
    newCount: ids.length,
    startMiles: countMiles(cards),
    stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 },
  };
  return { leg, plan: { ...plan, shown: [...plan.shown, ...ids], legs: plan.legs + 1 } };
}

export function legCurrent(leg) {
  return leg.queue[0] ?? null;
}

export function legProgress(leg) {
  const total = leg.done + leg.queue.length;
  return total === 0 ? 1 : leg.done / total;
}

export function legReduce(leg, event) {
  if (event.type === 'add') return { ...leg, queue: [...leg.queue, ...event.items] };
  const [cur, ...rest] = leg.queue;
  if (!cur) return leg;
  if (event.type === 'meet') {
    if (!event.know) return { ...leg, queue: rest };
    // "I know this": the pending check is replaced by an immediate word question.
    const check = rest.find((x) => x.kind === 'check' && x.id === cur.id);
    const know = { key: `know-${cur.id}`, id: cur.id, kind: 'know', type: check?.type === 'gap' ? 'gap' : 'word' };
    return { ...leg, queue: [know, ...rest.filter((x) => x !== check)] };
  }
  if (event.type !== 'answer') return leg;
  const next = { ...leg, done: leg.done + 1 };
  if (event.correct) return { ...next, queue: rest };
  if (cur.kind === 'know') {
    const meet = { key: `meet-${cur.id}`, id: cur.id, kind: 'meet', type: 'meet' };
    const check = { key: `check-${cur.id}`, id: cur.id, kind: 'check', type: cur.type === 'gap' ? 'gap' : 'meaning' };
    return { ...next, queue: insertAt([meet, ...rest], 1 + CHECK_GAP, check) };
  }
  const n = leg.reasks[cur.id] || 0;
  if (n >= MAX_REASKS) return { ...next, queue: rest };
  const reask = { key: `reask-${cur.id}-${n + 1}`, id: cur.id, kind: 'reask', type: cur.type };
  return { ...next, reasks: { ...leg.reasks, [cur.id]: n + 1 }, queue: insertAt(rest, REASK_GAP, reask) };
}

export function needsExtraNew(plan, leg) {
  const pending = leg.queue.filter((x) => x.kind === 'check').length;
  return plan.taught + pending < plan.newTarget
    && plan.shown.length < DAY_NEW_CAP
    && leg.newCount < LEG_NEW_CAP;
}

// After a right "I know this": one more new word at the end of the leg if the plan needs it.
// Returns { plan, leg } or null.
export function extraNewWord({ plan, cards, byId, order, leg, rnd }) {
  if (!needsExtraNew(plan, leg)) return null;
  const [id] = nextNew(order, cards, plan, 1).filter((x) => wordOf(byId, x));
  if (!id) return null;
  const items = newWordItems(id, wordOf(byId, id), rnd);
  return {
    plan: { ...plan, shown: [...plan.shown, id] },
    leg: { ...legReduce(leg, { type: 'add', items }), newCount: leg.newCount + 1 },
  };
}

// Applies one answer to cards, plan and leg stats (DESIGN §3). It does not touch the leg
// queue: call legReduce with the same answer afterwards.
export function recordAnswer({ cards, plan, leg, today, item, correct }) {
  const id = item.id;
  const stats = { ...leg.stats };
  const p = { ...plan };
  const out = { cards, plan: p, leg: { ...leg, stats }, mile: null, graded: false };
  const count = () => {
    if (correct) { p.right++; stats.right++; } else { p.wrong++; stats.wrong++; }
  };
  const card = cards[id];

  if (item.kind === 'review') {
    if (!card || gradedToday(card, today)) return { ...out, plan };
    const r = gradeCard(card, correct, today, countMiles(cards));
    out.cards = { ...cards, [id]: r.card };
    out.graded = true;
    count();
    stats.reviewed++;
    if (plan.due.includes(id)) p.done++;
    if (r.mile) { out.mile = r.mile; p.miles++; stats.miles++; }
  } else if (item.kind === 'check') {
    if (card) return { ...out, plan };
    out.cards = { ...cards, [id]: teachCard(today, correct) };
    out.graded = true;
    count();
    p.taught++;
    stats.taught++;
    if (p.taught <= p.newTarget) p.done++;
  } else if (item.kind === 'know' && correct && !card) {
    const miles = countMiles(cards);
    out.cards = { ...cards, [id]: knowCard(today, miles) };
    out.graded = true;
    out.mile = miles + 1;
    count();
    p.known++;
    p.miles++;
    stats.known++;
    stats.miles++;
  }
  return out;
}
