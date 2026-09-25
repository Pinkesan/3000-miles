// Highway Rush: a 60-second run over words the player has met (DESIGN §1 rule 9, §7). Pure.
// It never changes cards: a run only reads them.
import { tankFill } from './summary.js';

export const MIN_CARDS = 40;
export const RUN_SECONDS = 60;
export const STRIKES = 3;
export const SPEED = { start: 40, min: 20, max: 120, up: 5, down: 10 };
export const KEEP_RUNS = 20;

const carded = (cards) => Object.values(cards).filter((c) => c && c.b >= 1).length;

// Unlocked once 40 words have a card (home shows the best score or the muted line).
export function arcadeUnlocked(cards) {
  return carded(cards) >= MIN_CARDS;
}

// Open: unlocked and today's plan is done.
export function arcadeOpen(cards, plan) {
  return arcadeUnlocked(cards) && tankFill(plan) >= 1;
}

// Words with a card, except words due today and not graded today (a run must not review them early).
export function arcadePool(words, cards, today) {
  return words.filter((w) => {
    const c = cards[w.id];
    return c && c.b >= 1 && !(c.d <= today && c.g !== today);
  });
}

// Lower boxes are picked more often (weight 9 - b).
export const boxWeight = (card) => 9 - (card?.b ?? 1);

export function weightedPick(items, weightOf, rnd) {
  if (!items.length) return null;
  const weights = items.map((x) => Math.max(0, weightOf(x)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(rnd() * items.length)];
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

// meaning, word, and listen (with a voice), chosen at random.
export function arcadeType(canListen, rnd) {
  const types = canListen ? ['meaning', 'word', 'listen'] : ['meaning', 'word'];
  return types[Math.floor(rnd() * types.length)];
}

export function nextSpeed(speed, correct) {
  return correct ? Math.min(SPEED.max, speed + SPEED.up) : Math.max(SPEED.min, speed - SPEED.down);
}

// Points for a right answer: the current speed (before it goes up).
export const scoreFor = (speed) => speed;

export const strikesLeft = (wrong) => Math.max(0, STRIKES - wrong);

export function newRun() {
  return { speed: SPEED.start, score: 0, right: 0, wrong: 0, missed: [] };
}

export function answerRun(run, { id, correct }) {
  const missed = correct || run.missed.includes(id) ? run.missed : [...run.missed, id];
  return {
    speed: nextSpeed(run.speed, correct),
    score: run.score + (correct ? scoreFor(run.speed) : 0),
    right: run.right + (correct ? 1 : 0),
    wrong: run.wrong + (correct ? 0 : 1),
    missed,
  };
}

export const runOver = (run, elapsedMs) => run.wrong >= STRIKES || elapsedMs >= RUN_SECONDS * 1000;

// The end of a run: the new best and the last 20 runs. Returns { arcade, isBest, summary }.
export function runSummary(arcade, run, today) {
  const best = arcade?.best ?? 0;
  const summary = { day: today, score: run.score, right: run.right, wrong: run.wrong };
  return {
    isBest: run.score > best,
    summary,
    arcade: { best: Math.max(best, run.score), runs: [...(arcade?.runs ?? []), summary].slice(-KEEP_RUNS) },
  };
}
