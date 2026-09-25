import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../public/js/rng.js';
import {
  arcadeOpen, arcadeUnlocked, arcadePool, weightedPick, boxWeight, arcadeType, nextSpeed, scoreFor,
  strikesLeft, newRun, answerRun, runOver, runSummary, SPEED,
} from '../public/js/arcade.js';

const words = Array.from({ length: 60 }, (_, i) => ({ id: `w${i}`, w: `word${i}` }));
const cardsOf = (n) => Object.fromEntries(words.slice(0, n).map((w) => [w.id, { b: 2, d: 20600, g: 20500 }]));
const donePlan = { goal: 10, done: 10, legs: 1 };
const openPlan = { goal: 10, done: 4, legs: 1 };

test('closed below 40 cards and before the plan is done', () => {
  assert.equal(arcadeOpen(cardsOf(39), donePlan), false);
  assert.equal(arcadeOpen(cardsOf(40), donePlan), true);
  assert.equal(arcadeOpen(cardsOf(40), openPlan), false);
  assert.equal(arcadeUnlocked(cardsOf(40)), true);
  assert.equal(arcadeUnlocked(cardsOf(39)), false);
});

test('a card in box 0 does not count', () => {
  assert.equal(arcadeUnlocked({ ...cardsOf(39), x: { b: 0, d: 1 } }), false);
});

test('the pool leaves out words due and not graded today', () => {
  const cards = cardsOf(3);
  cards.w0 = { b: 2, d: 20500, g: 20499 }; // due, not graded today: out
  cards.w1 = { b: 2, d: 20500, g: 20500 }; // due but graded today: in
  cards.w2 = { b: 2, d: 20501, g: 20499 }; // not due: in
  assert.deepEqual(arcadePool(words, cards, 20500).map((w) => w.id), ['w1', 'w2']);
});

test('weightedPick: lower boxes weigh more, never picks weight 0', () => {
  assert.equal(boxWeight({ b: 1 }), 8);
  assert.equal(boxWeight({ b: 8 }), 1);
  const rnd = makeRng('wp');
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 2000; i++) counts[weightedPick(['a', 'b'], (x) => (x === 'a' ? 8 : 1), rnd)]++;
  assert.ok(counts.a > counts.b * 4);
  assert.equal(weightedPick(['a', 'b'], (x) => (x === 'a' ? 0 : 1), rnd), 'b');
  assert.equal(weightedPick([], () => 1, rnd), null);
});

test('arcadeType: listen only with a voice', () => {
  const rnd = makeRng('t');
  const seen = new Set();
  for (let i = 0; i < 100; i++) seen.add(arcadeType(false, rnd));
  assert.deepEqual([...seen].sort(), ['meaning', 'word']);
  for (let i = 0; i < 100; i++) seen.add(arcadeType(true, rnd));
  assert.ok(seen.has('listen'));
});

test('speed: +5 to 120, -10 to 20; score is the speed before the change', () => {
  assert.equal(nextSpeed(40, true), 45);
  assert.equal(nextSpeed(118, true), 120);
  assert.equal(nextSpeed(40, false), 30);
  assert.equal(nextSpeed(25, false), SPEED.min);
  assert.equal(scoreFor(45), 45);
  let run = newRun();
  run = answerRun(run, { id: 'a', correct: true });
  assert.equal(run.score, 40);
  assert.equal(run.speed, 45);
  run = answerRun(run, { id: 'b', correct: true });
  assert.equal(run.score, 85);
});

test('the third wrong answer ends the run', () => {
  let run = newRun();
  for (const id of ['a', 'b']) run = answerRun(run, { id, correct: false });
  assert.equal(runOver(run, 1000), false);
  assert.equal(strikesLeft(run.wrong), 1);
  run = answerRun(run, { id: 'c', correct: false });
  assert.equal(runOver(run, 1000), true);
  assert.equal(strikesLeft(run.wrong), 0);
  assert.equal(strikesLeft(5), 0);
  assert.deepEqual(run.missed, ['a', 'b', 'c']);
});

test('the run ends after 60 seconds; a missed word is listed once', () => {
  let run = newRun();
  assert.equal(runOver(run, 59999), false);
  assert.equal(runOver(run, 60000), true);
  run = answerRun(run, { id: 'a', correct: false });
  run = answerRun(run, { id: 'a', correct: false });
  assert.deepEqual(run.missed, ['a']);
});

test('runSummary: best, last 20 runs, inputs untouched', () => {
  const arcade = { best: 100, runs: Array.from({ length: 20 }, (_, i) => ({ day: i, score: i, right: 1, wrong: 0 })) };
  const frozen = JSON.stringify(arcade);
  const low = runSummary(arcade, { ...newRun(), score: 90, right: 3, wrong: 3 }, 20500);
  assert.equal(low.isBest, false);
  assert.equal(low.arcade.best, 100);
  assert.equal(low.arcade.runs.length, 20);
  assert.deepEqual(low.arcade.runs.at(-1), { day: 20500, score: 90, right: 3, wrong: 3 });
  assert.equal(low.arcade.runs[0].day, 1);
  const high = runSummary(arcade, { ...newRun(), score: 150 }, 20500);
  assert.equal(high.isBest, true);
  assert.equal(high.arcade.best, 150);
  assert.equal(JSON.stringify(arcade), frozen);
  assert.equal(runSummary(undefined, newRun(), 1).arcade.runs.length, 1);
});

test('a run never touches the cards', () => {
  const cards = cardsOf(50);
  const frozen = JSON.stringify(cards);
  const pool = arcadePool(words, cards, 20500);
  let run = newRun();
  const rnd = makeRng('run');
  for (let i = 0; i < 10; i++) {
    const w = weightedPick(pool, (x) => boxWeight(cards[x.id]), rnd);
    run = answerRun(run, { id: w.id, correct: i % 3 !== 0 });
  }
  assert.equal(JSON.stringify(cards), frozen);
});
