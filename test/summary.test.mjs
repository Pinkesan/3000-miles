import test from 'node:test';
import assert from 'node:assert/strict';
import { legSummary, tankFill, tankText, queueIds, levelTip } from '../public/js/summary.js';

test('legSummary: percent of graded answers and miles gained', () => {
  const s = legSummary({ stats: { right: 7, wrong: 3, taught: 4, known: 1, reviewed: 5, miles: 2 }, startMiles: 10, endMiles: 12 });
  assert.equal(s.graded, 10);
  assert.equal(s.pct, 70);
  assert.equal(s.gained, 2);
  assert.deepEqual([s.taught, s.known, s.reviewed], [4, 1, 5]);
});

test('legSummary: no graded answers gives null, miles never go down', () => {
  const s = legSummary({ stats: {}, startMiles: 5, endMiles: 3 });
  assert.equal(s.pct, null);
  assert.equal(s.gained, 0);
  assert.equal(legSummary(null).graded, 0);
});

test('tankFill and tankText', () => {
  assert.equal(tankFill({ goal: 20, done: 5, legs: 1 }), 0.25);
  assert.equal(tankFill({ goal: 20, done: 30, legs: 2 }), 1);
  assert.equal(tankFill({ goal: 0, done: 0, legs: 0 }), 0);
  assert.equal(tankFill({ goal: 0, done: 0, legs: 1 }), 1);
  assert.match(tankText({ goal: 20, done: 5, legs: 1 }), /25%/);
  assert.match(tankText({ goal: 10, done: 10, legs: 1 }), /เต็มถัง/);
});

test('queueIds keeps order and drops repeats', () => {
  assert.deepEqual(queueIds([{ id: 'a' }, { id: 'b' }, { id: 'a' }]), ['a', 'b']);
});

test('levelTip: needs 5 resolved words, 80% known, and a level below B2', () => {
  const tip = (known, taught, lv = 'A1') => levelTip({ known, taught }, lv);
  assert.equal(tip(4, 0), null, 'only 4 words');
  assert.deepEqual(tip(5, 0), { known: 5, total: 5 });
  assert.deepEqual(tip(8, 2), { known: 8, total: 10 });
  assert.equal(tip(79, 21), null, '79%');
  assert.deepEqual(tip(80, 20), { known: 80, total: 100 });
  assert.equal(tip(9, 1, 'B2'), null);
  assert.deepEqual(tip(9, 1, 'B1'), { known: 9, total: 10 });
});
