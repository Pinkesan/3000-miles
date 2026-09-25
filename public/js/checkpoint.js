// Checkpoint exams (DESIGN §6). Pure: cards and checkpoints are never mutated.
import { sample } from './rng.js';
import { chooseType } from './quiz.js';
import { gradeCard, gradedToday } from './srs.js';
import { stopWords } from './progress.js';

export const EXAM_SIZE = 15;
export const FINALE_SIZE = 30;
export const PASS_RATE = 0.8;

const stopsOf = (route) => (Array.isArray(route) ? route : route.stops);

// Passed, or the postcard was unlocked before checkpoints existed (Step 8).
export function cleared(stopId, checkpoints, stops) {
  return checkpoints[stopId]?.passed != null || stops[stopId] != null;
}

// The first stop after New York that miles have reached and that isn't cleared, or null.
export function openCheckpoint(route, miles, checkpoints, stops) {
  return stopsOf(route).find((s) => s.at > 0 && s.at <= miles && !cleared(s.id, checkpoints, stops)) ?? null;
}

export function canTry(cp, today) {
  return !cp || cp.last !== today;
}

export function examSize(route, stopId) {
  const stops = stopsOf(route);
  return stops[stops.length - 1].id === stopId ? FINALE_SIZE : EXAM_SIZE;
}

// Ids to ask: a sample of the stop's mile words; Santa Monica takes 30 from all mile words.
export function examWords(cards, route, stopId, rnd) {
  const stops = stopsOf(route);
  const finale = stops[stops.length - 1].id === stopId;
  const pool = finale
    ? Object.keys(cards).filter((id) => cards[id].m).sort((a, b) => cards[a].m - cards[b].m)
    : stopWords(cards, route, stopId);
  return sample(pool, examSize(route, stopId), rnd);
}

export function examItems(ids, byId, caps, rnd) {
  const items = [];
  for (const id of ids) {
    const word = byId instanceof Map ? byId.get(id) : byId[id];
    if (!word) continue;
    items.push({ key: `exam-${id}`, id, kind: 'exam', type: chooseType('exam', word, caps, rnd), hint: 'short' });
  }
  return items;
}

// A miss on a word not graded today is graded like a review; anything else changes nothing.
export function examAnswer(cards, id, correct, today, miles) {
  const card = cards[id];
  if (correct || !card || gradedToday(card, today)) return { cards, graded: false };
  const { card: next } = gradeCard(card, false, today, miles);
  return { cards: { ...cards, [id]: next }, graded: true };
}

export function examResult(right, total) {
  const pct = total > 0 ? Math.round((right / total) * 100) : 0;
  const passed = total > 0 && right >= Math.ceil(PASS_RATE * total);
  const stars = !passed ? 0 : right === total ? 3 : right / total >= 0.9 ? 2 : 1;
  return { pct, passed, stars };
}

export function passMark(total) {
  return Math.ceil(PASS_RATE * total);
}

// The new checkpoints[id] after a finished try.
export function recordTry(cp, result, today) {
  const old = cp ?? { best: 0, passed: null, last: null, tries: 0 };
  return {
    best: Math.max(old.best, result.stars),
    passed: old.passed ?? (result.passed ? today : null),
    last: today,
    tries: old.tries + 1,
  };
}

// The car waits at the city limits of an open checkpoint.
export function mapMiles(route, miles, checkpoints, stops) {
  const open = openCheckpoint(route, miles, checkpoints, stops);
  return open ? open.at : miles;
}
