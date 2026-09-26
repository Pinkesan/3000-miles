// Day plans, legs and the answer flow (DESIGN §3, §5). Pure: inputs are never mutated.

import { hashSeed } from './rng.js';
import { allowedTypes, chooseType } from './quiz.js';
import { gradeCard, teachCard, knowCard, gradedToday, countMiles } from './srs.js';

export const DUE_CAP = 100;
export const LEG_SIZE = 20;
export const LEG_REVIEWS = 14;
export const CHECK_GAP = 4;
export const CONFIRM_GAP = 6;
export const REASK_GAP = 3;
export const MAX_REASKS = 2;
export const EXTRA_NEW = 10;

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
    done: 0, taught: 0, known: 0, right: 0, wrong: 0, miles: 0, legs: 0, shown: [], score: 0,
  };
}

// The player changed new words a day (Settings): today's plan follows unless it is capped by a backlog.
// Words already taught or known today stay in the target.
export function withNewPerDay(plan, value) {
  const newTarget = plan.dueTotal > DUE_CAP ? 0 : Math.max(plan.taught + plan.known, value);
  return { ...plan, newTarget, goal: plan.due.length + newTarget };
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

// New words a day (DESIGN §1 rule 9, §5): the plan's own, then one ขับเพิ่ม leg of
// EXTRA_NEW. None extra on a backlog day (newTarget 0).
export function newCap(plan) {
  return plan.newTarget > 0 ? plan.newTarget + EXTRA_NEW : 0;
}

// Can one more new word be shown today?
export function newLeft(plan, cards, order) {
  return plan.shown.length < newCap(plan) && nextNew(order, cards, plan, 1).length > 0;
}

// A new word enters a leg as one probe; the types of its confirm and check are fixed here.
export function newWordItems(id, word) {
  const type = (kind) => allowedTypes(kind, word, { canListen: false })[0];
  return [{
    key: `probe-${id}`, id, kind: 'probe', type: type('probe'), confirmType: type('confirm'), checkType: type('check'),
  }];
}

function insertAt(queue, index, item) {
  const at = Math.min(index, queue.length);
  return [...queue.slice(0, at), item, ...queue.slice(at)];
}

// Two reviews, one new word, two reviews, one new word, ..., then the rest.
function interleave(reviews, probes) {
  const out = [];
  let r = 0;
  let m = 0;
  while (r < reviews.length && m < probes.length) {
    for (let k = 0; k < 2 && r < reviews.length; k++) out.push(reviews[r++]);
    out.push(probes[m++]);
  }
  return [...out, ...reviews.slice(r), ...probes.slice(m)];
}

export function buildLeg({ plan, cards, byId, order, today, rnd, caps, extra = false }) {
  const reviews = [];
  if (!extra) {
    for (const id of plan.due) {
      if (reviews.length >= LEG_REVIEWS) break;
      const card = cards[id];
      const word = wordOf(byId, id);
      if (!card || !word || gradedToday(card, today)) continue;
      reviews.push({ key: `review-${id}`, id, kind: 'review', type: chooseType(card.b, word, caps, rnd), hint: card.b >= 4 ? 'short' : 'full' });
    }
  }
  const room = LEG_SIZE - reviews.length;
  const want = extra ? Math.min(room, EXTRA_NEW) : Math.min(room, plan.newTarget - plan.taught - plan.known);
  const slots = Math.max(0, Math.min(want, newCap(plan) - plan.shown.length));
  const ids = nextNew(order, cards, plan, slots).filter((id) => wordOf(byId, id));
  const probes = ids.flatMap((id) => newWordItems(id, wordOf(byId, id)));
  const leg = {
    v: 2,
    day: today,
    queue: interleave(reviews, probes),
    done: 0,
    reasks: {},
    newCount: ids.length,
    startMiles: countMiles(cards),
    stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 },
    score: { score: 0, combo: 0, bestCombo: 0 },
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

// Events: { type: 'answer', correct }, { type: 'skip' } (probes only: "I don't know this"),
// { type: 'meet' } (drops the Meet card), { type: 'add', items }.
export function legReduce(leg, event) {
  if (event.type === 'add') return { ...leg, queue: [...leg.queue, ...event.items] };
  const [cur, ...rest] = leg.queue;
  if (!cur) return leg;
  if (event.type === 'meet') return { ...leg, queue: rest };
  if (event.type === 'skip' && cur.kind !== 'probe') return leg;
  if (event.type !== 'answer' && event.type !== 'skip') return leg;
  const next = { ...leg, done: leg.done + 1 };
  if (cur.kind === 'probe') {
    if (event.type === 'answer' && event.correct) {
      const confirm = { key: `confirm-${cur.id}`, id: cur.id, kind: 'confirm', type: cur.confirmType ?? 'spell', hint: 'short' };
      return { ...next, queue: insertAt(rest, CONFIRM_GAP, confirm) };
    }
    // wrong or skipped: the lesson follows, then the check. A probe is never re-asked.
    const meet = { key: `meet-${cur.id}`, id: cur.id, kind: 'meet', type: 'meet' };
    const check = { key: `check-${cur.id}`, id: cur.id, kind: 'check', type: cur.checkType ?? 'spell', hint: 'full' };
    return { ...next, queue: [meet, ...insertAt(rest, CHECK_GAP, check)] };
  }
  if (event.correct) return { ...next, queue: rest };
  const n = leg.reasks[cur.id] || 0;
  if (n >= MAX_REASKS) return { ...next, queue: rest };
  const reask = { key: `reask-${cur.id}-${n + 1}`, id: cur.id, kind: 'reask', type: cur.type, hint: cur.hint ?? 'full' };
  return { ...next, reasks: { ...leg.reasks, [cur.id]: n + 1 }, queue: insertAt(rest, REASK_GAP, reask) };
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
  } else if (item.kind === 'probe') {
    if (card) return { ...out, plan };
    count();
  } else if (item.kind === 'check' || item.kind === 'confirm') {
    if (card) return { ...out, plan };
    if (item.kind === 'confirm' && correct) {
      const miles = countMiles(cards);
      out.cards = { ...cards, [id]: knowCard(today, miles) };
      out.mile = miles + 1;
      p.known++;
      p.miles++;
      stats.known++;
      stats.miles++;
    } else {
      out.cards = { ...cards, [id]: teachCard(today, item.kind === 'check' && correct) };
      p.taught++;
      stats.taught++;
    }
    out.graded = true;
    count();
    if (p.taught + p.known <= p.newTarget) p.done++;
  }
  return out;
}
