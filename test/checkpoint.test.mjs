import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng } from '../public/js/rng.js';
import {
  cleared, openCheckpoint, canTry, examWords, examItems, examAnswer, examResult, recordTry, mapMiles, passMark,
} from '../public/js/checkpoint.js';

const route = JSON.parse(readFileSync(new URL('../public/data/route.json', import.meta.url), 'utf8'));
const TODAY = 20500;

// n mile cards with miles 1..n
function mileCards(n, extra = {}) {
  const cards = {};
  for (let i = 1; i <= n; i++) cards[`w${i}`] = { b: 4, d: TODAY + 5, g: TODAY - 3, n: 3, r: 3, l: 0, m: i, md: TODAY - 3, ...extra };
  return cards;
}

test('examResult: 80% passes, stars at 90% and 100%', () => {
  assert.deepEqual(examResult(12, 15), { pct: 80, passed: true, stars: 1 });
  assert.deepEqual(examResult(11, 15), { pct: 73, passed: false, stars: 0 });
  assert.deepEqual(examResult(14, 15), { pct: 93, passed: true, stars: 2 });
  assert.deepEqual(examResult(15, 15), { pct: 100, passed: true, stars: 3 });
  assert.deepEqual(examResult(24, 30), { pct: 80, passed: true, stars: 1 });
  assert.equal(passMark(15), 12);
  assert.equal(passMark(30), 24);
  assert.equal(examResult(0, 0).passed, false);
});

test('examWords: 15 from the stop, all if fewer, Santa Monica takes 30 from all', () => {
  const cards = mileCards(100);
  const ids = examWords(cards, route, 'philadelphia', makeRng('a'));
  assert.equal(ids.length, 15);
  assert.equal(new Set(ids).size, 15);
  assert.ok(ids.every((id) => cards[id].m <= 90 && cards[id].m > 0));
  // Washington: miles 91..215, only 10 words exist there
  assert.equal(examWords(mileCards(100), route, 'washington', makeRng('a')).length, 10);
  const all = mileCards(3000);
  assert.equal(examWords(all, route, 'santa-monica', makeRng('a')).length, 30);
  assert.deepEqual(examWords(cards, route, 'philadelphia', makeRng('a')), ids, 'same seed, same words');
  assert.deepEqual(examWords(cards, route, 'nowhere', makeRng('a')), []);
});

test('examItems: exam-<id>, kind exam, short hint, allowed types', () => {
  const byId = new Map([
    ['w1', { id: 'w1', w: 'band', th: 'วงดนตรี', ex: 'The **band** plays.' }],
    ['w2', { id: 'w2', w: 'bank', th: 'ธนาคาร' }],
  ]);
  const items = examItems(['w1', 'w2', 'gone'], byId, { canListen: false }, makeRng('x'));
  assert.equal(items.length, 2);
  for (const it of items) {
    assert.equal(it.kind, 'exam');
    assert.equal(it.hint, 'short');
    assert.equal(it.key, `exam-${it.id}`);
    assert.ok(['spell', 'gapType'].includes(it.type));
  }
  assert.equal(items[1].type, 'spell', 'no example: a plain spell question');
});

test('examAnswer: a right answer and a word graded today change nothing', () => {
  const cards = mileCards(3);
  const right = examAnswer(cards, 'w1', true, TODAY, 3);
  assert.equal(right.cards, cards);
  assert.equal(right.graded, false);
  const practiced = { ...cards, w2: { ...cards.w2, g: TODAY } };
  const same = examAnswer(practiced, 'w2', false, TODAY, 3);
  assert.equal(same.cards, practiced);
  assert.equal(same.graded, false);
});

test('examAnswer: a miss on a mile word sets f, drops the box, and is graded today', () => {
  const cards = mileCards(3);
  const res = examAnswer(cards, 'w1', false, TODAY, 3);
  assert.equal(res.graded, true);
  assert.equal(res.cards.w1.f, 1);
  assert.equal(res.cards.w1.g, TODAY);
  assert.ok(res.cards.w1.b < cards.w1.b);
  assert.equal(res.cards.w1.d, TODAY + 1);
  assert.equal(cards.w1.f, undefined, 'input not mutated');
  assert.equal(res.cards.w2, cards.w2);
});

test('cleared: passed, or postcard already unlocked', () => {
  assert.equal(cleared('philadelphia', {}, {}), false);
  assert.equal(cleared('philadelphia', { philadelphia: { passed: TODAY } }, {}), true);
  assert.equal(cleared('philadelphia', { philadelphia: { passed: null } }, {}), false);
  assert.equal(cleared('philadelphia', {}, { philadelphia: TODAY }), true);
});

test('openCheckpoint: first reached, not cleared, in route order; never New York', () => {
  assert.equal(openCheckpoint(route, 0, {}, {}), null);
  assert.equal(openCheckpoint(route, 89, {}, {}), null);
  assert.equal(openCheckpoint(route, 90, {}, {}).id, 'philadelphia');
  assert.equal(openCheckpoint(route, 250, {}, {}).id, 'philadelphia');
  assert.equal(openCheckpoint(route, 250, { philadelphia: { passed: TODAY } }, {}).id, 'washington');
  assert.equal(openCheckpoint(route, 250, {}, { philadelphia: TODAY }).id, 'washington');
  assert.equal(openCheckpoint(route, 250, {}, { philadelphia: 1, washington: 1 }), null);
});

test('canTry: once a day', () => {
  assert.equal(canTry(undefined, TODAY), true);
  assert.equal(canTry({ last: TODAY - 1 }, TODAY), true);
  assert.equal(canTry({ last: TODAY }, TODAY), false);
});

test('recordTry: tries count, best never goes down, passed keeps its first day', () => {
  const a = recordTry(undefined, { passed: false, stars: 0 }, TODAY);
  assert.deepEqual(a, { best: 0, passed: null, last: TODAY, tries: 1 });
  const b = recordTry(a, { passed: true, stars: 2 }, TODAY + 1);
  assert.deepEqual(b, { best: 2, passed: TODAY + 1, last: TODAY + 1, tries: 2 });
  const c = recordTry(b, { passed: true, stars: 1 }, TODAY + 2);
  assert.deepEqual(c, { best: 2, passed: TODAY + 1, last: TODAY + 2, tries: 3 });
  assert.deepEqual(a, { best: 0, passed: null, last: TODAY, tries: 1 }, 'input not mutated');
});

test('mapMiles: the car waits at the open checkpoint', () => {
  assert.equal(mapMiles(route, 50, {}, {}), 50);
  assert.equal(mapMiles(route, 100, {}, {}), 90);
  assert.equal(mapMiles(route, 100, { philadelphia: { passed: TODAY } }, {}), 100);
  assert.equal(mapMiles(route, 300, { philadelphia: { passed: TODAY } }, {}), 215);
});
