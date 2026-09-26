import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterWords, chipCounts, matchesQuery, nextReviewText } from '../public/js/wordlist.js';
import { withNewPerDay, makeDayPlan } from '../public/js/plan.js';

const words = [
  { id: 'band', w: 'band', lv: 'A1', th: 'วงดนตรี' },
  { id: 'bank-money', w: 'bank', lv: 'A1', th: 'ธนาคาร' },
  { id: 'banana', w: 'Banana', lv: 'A2', th: 'กล้วย' },
  { id: 'hand', w: 'hand', lv: 'A1', th: 'มือ (ของคน)' },
];
const cards = {
  band: { b: 3, d: 20510, m: 1 },
  'bank-money': { b: 2, d: 20501 },
  hand: { b: 3, d: 20510, m: 2, f: 1 },
};

test('search: English matches the start, Thai matches anywhere', () => {
  assert.deepEqual(filterWords(words, cards, { q: 'ban' }).map((w) => w.id), ['band', 'bank-money', 'banana']);
  assert.deepEqual(filterWords(words, cards, { q: 'and' }).map((w) => w.id), []);
  assert.deepEqual(filterWords(words, cards, { q: 'ของ' }).map((w) => w.id), ['hand']);
  assert.ok(matchesQuery(words[2], ' BANA '));
  assert.ok(matchesQuery(words[0], ''));
});

test('filters by level and status', () => {
  assert.deepEqual(filterWords(words, cards, { lv: 'A1', st: 'flat' }).map((w) => w.id), ['hand']);
  assert.deepEqual(filterWords(words, cards, { st: 'new' }).map((w) => w.id), ['banana']);
  assert.deepEqual(filterWords(words, cards, { q: 'ban', lv: 'A1', st: 'learning' }).map((w) => w.id), ['bank-money']);
});

test('chip counts follow the other filters', () => {
  const c = chipCounts(words, cards, { lv: 'A1' });
  assert.deepEqual(c.statuses, { new: 0, learning: 1, flat: 1, mile: 1, mastered: 0 });
  assert.equal(c.allStatuses, 3);
  assert.equal(c.levels.A1, 3);
  assert.equal(c.levels.A2, 1);
  assert.equal(chipCounts(words, cards, { st: 'new' }).levels.A2, 1);
  assert.equal(chipCounts(words, cards, { st: 'new' }).levels.A1, 0);
});

test('next review text', () => {
  assert.equal(nextReviewText(undefined, 20500), '');
  assert.equal(nextReviewText({ d: 20500 }, 20500), 'ถึงกำหนดแล้ว');
  assert.equal(nextReviewText({ d: 20490 }, 20500), 'ถึงกำหนดแล้ว');
  assert.equal(nextReviewText({ d: 20501 }, 20500), 'พรุ่งนี้');
  assert.equal(nextReviewText({ d: 20505 }, 20500), 'อีก 5 วัน');
});

test('changing new words a day recomputes the plan', () => {
  const plan = makeDayPlan({ a: { b: 1, d: 20500 }, b: { b: 1, d: 20500 } }, 20500, { newPerDay: 10 });
  assert.equal(plan.goal, 12);
  const p15 = withNewPerDay(plan, 15);
  assert.equal(p15.newTarget, 15);
  assert.equal(p15.goal, 17);
  assert.equal(plan.newTarget, 10); // not mutated
  // words taught or known today stay in the target
  const busy = { ...plan, taught: 6, known: 3 };
  assert.equal(withNewPerDay(busy, 5).newTarget, 9);
  assert.equal(withNewPerDay(busy, 5).goal, 2 + 9);
  // a backlog day has no new words
  const cards = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`w${i}`, { b: 1, d: 20500 }]));
  const backlog = makeDayPlan(cards, 20500, { newPerDay: 10 });
  assert.equal(backlog.newTarget, 0);
  assert.equal(withNewPerDay(backlog, 30).newTarget, 0);
  assert.equal(withNewPerDay(backlog, 30).goal, 100);
});
