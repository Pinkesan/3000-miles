import test from 'node:test';
import assert from 'node:assert/strict';
import { POINTS, speedFactor, comboMultiplier, scoreAnswer, legStars, updateRecords } from '../public/js/score.js';

const zero = { score: 0, combo: 0, bestCombo: 0 };

test('POINTS per type (DESIGN §6)', () => {
  assert.deepEqual(POINTS, { meaning: 10, listen: 10, word: 10, gap: 15, spell: 20, gapType: 25, dictation: 25 });
});

test('speedFactor: boundaries at 3000 and 6000 ms', () => {
  assert.equal(speedFactor('word', 0), 1.5);
  assert.equal(speedFactor('word', 3000), 1.5);
  assert.equal(speedFactor('word', 3001), 1.2);
  assert.equal(speedFactor('word', 6000), 1.2);
  assert.equal(speedFactor('word', 6001), 1);
});

test('speedFactor: typed types never get a bonus', () => {
  for (const t of ['spell', 'gapType', 'dictation']) assert.equal(speedFactor(t, 500), 1);
});

test('comboMultiplier: boundaries 4/5, 9/10, 19/20', () => {
  const m = [0, 1, 4, 5, 9, 10, 19, 20, 50].map(comboMultiplier);
  assert.deepEqual(m, [1, 1, 1, 1.5, 1.5, 2, 2, 3, 3]);
});

test('scoreAnswer: a right answer adds points and raises the combo', () => {
  const r = scoreAnswer(zero, { type: 'word', kind: 'review', correct: true, ms: 8000 });
  assert.deepEqual(r, { score: 10, combo: 1, bestCombo: 1, points: 10 });
});

test('scoreAnswer: speed and type multiply, result is rounded', () => {
  assert.equal(scoreAnswer(zero, { type: 'gap', kind: 'review', correct: true, ms: 2000 }).points, 23); // 15 * 1.5 = 22.5
  assert.equal(scoreAnswer(zero, { type: 'spell', kind: 'check', correct: true, ms: 100 }).points, 20);
});

test('scoreAnswer: the multiplier uses the combo including this answer', () => {
  const four = { score: 40, combo: 4, bestCombo: 4 };
  const r = scoreAnswer(four, { type: 'word', kind: 'review', correct: true, ms: 9000 });
  assert.equal(r.combo, 5);
  assert.equal(r.points, 15); // 10 * 1.5
  const nine = { score: 0, combo: 9, bestCombo: 9 };
  assert.equal(scoreAnswer(nine, { type: 'word', kind: 'review', correct: true, ms: 9000 }).points, 20);
  const nineteen = { score: 0, combo: 19, bestCombo: 19 };
  assert.equal(scoreAnswer(nineteen, { type: 'word', kind: 'review', correct: true, ms: 9000 }).points, 30);
});

test('scoreAnswer: a wrong answer resets the combo but keeps the best', () => {
  const r = scoreAnswer({ score: 90, combo: 7, bestCombo: 7 }, { type: 'word', kind: 'review', correct: false, ms: 1000 });
  assert.deepEqual(r, { score: 90, combo: 0, bestCombo: 7, points: 0 });
});

test('scoreAnswer: re-asks and skips are neutral', () => {
  const s = { score: 70, combo: 7, bestCombo: 7 };
  const reask = scoreAnswer(s, { type: 'word', kind: 'reask', correct: true, ms: 500 });
  assert.deepEqual(reask, { score: 70, combo: 7, bestCombo: 7, points: 0 });
  const reaskWrong = scoreAnswer(s, { type: 'word', kind: 'reask', correct: false, ms: 500 });
  assert.equal(reaskWrong.combo, 7);
  const skip = scoreAnswer(s, { kind: 'probe', skipped: true });
  assert.deepEqual(skip, { score: 70, combo: 7, bestCombo: 7, points: 0 });
});

test('scoreAnswer does not mutate its input', () => {
  const s = Object.freeze({ score: 5, combo: 1, bestCombo: 1 });
  scoreAnswer(s, { type: 'word', kind: 'review', correct: true, ms: 100 });
  assert.deepEqual(s, { score: 5, combo: 1, bestCombo: 1 });
});

test('legStars: 95% is 3, 80% is 2, below is 1, no answers is null', () => {
  assert.equal(legStars({ right: 19, wrong: 1 }), 3);
  assert.equal(legStars({ right: 18, wrong: 1 }), 2); // 94.7%
  assert.equal(legStars({ right: 4, wrong: 1 }), 2);
  assert.equal(legStars({ right: 79, wrong: 21 }), 1);
  assert.equal(legStars({ right: 0, wrong: 3 }), 1);
  assert.equal(legStars({ right: 0, wrong: 0 }), null);
});

test('updateRecords: beating each record', () => {
  const start = { combo: 5, day: 100, dayOn: 1 };
  const a = updateRecords(start, { combo: 8, dayScore: 90, today: 9 });
  assert.deepEqual(a, { records: { combo: 8, day: 100, dayOn: 1 }, newCombo: true, newDay: false });
  const b = updateRecords(start, { combo: 5, dayScore: 101, today: 9 });
  assert.deepEqual(b, { records: { combo: 5, day: 101, dayOn: 9 }, newCombo: false, newDay: true });
  assert.deepEqual(start, { combo: 5, day: 100, dayOn: 1 });
});

test('updateRecords: a fresh or missing record', () => {
  const r = updateRecords(undefined, { combo: 3, dayScore: 40, today: 7 });
  assert.deepEqual(r.records, { combo: 3, day: 40, dayOn: 7 });
  assert.ok(r.newCombo && r.newDay);
  const none = updateRecords({ combo: 0, day: 0, dayOn: null }, { combo: 0, dayScore: 0, today: 7 });
  assert.equal(none.newCombo || none.newDay, false);
});
