// Word state and spaced repetition (DESIGN §3). Pure: cards are never mutated.

export const INTERVAL = [0, 1, 2, 4, 7, 14, 30, 60, 120];
export const MILE_BOX = 3;
export const MASTER_BOX = 6;
export const MAX_BOX = 8;

export function lapseBox(b) {
  return Math.max(1, Math.min(b - 2, MILE_BOX));
}

export function gradedToday(card, today) {
  return !!card && card.g === today;
}

export function isDue(card, today) {
  return !!card && card.d <= today;
}

// Returns { card, mile }: mile = the new mile number, or null.
export function gradeCard(card, correct, today, miles) {
  const next = { ...card };
  let mile = null;
  if (correct) {
    next.b = Math.min(MAX_BOX, card.b + 1);
    next.d = today + INTERVAL[next.b];
    delete next.f;
    if (next.b >= MILE_BOX && !next.m) {
      next.m = miles + 1;
      next.md = today;
      mile = next.m;
    }
  } else {
    if (card.b >= MILE_BOX) next.l = (card.l || 0) + 1;
    if (card.m) next.f = 1;
    next.b = lapseBox(card.b);
    next.d = today + 1;
  }
  next.n = (card.n || 0) + 1;
  next.r = (card.r || 0) + (correct ? 1 : 0);
  next.g = today;
  return { card: next, mile };
}

export function teachCard(today, correct) {
  return { b: 1, d: today + 1, g: today, n: 1, r: correct ? 1 : 0, l: 0 };
}

export function knowCard(today, miles) {
  return { b: 3, d: today + INTERVAL[3], g: today, n: 1, r: 1, l: 0, m: miles + 1, md: today, k: 1 };
}

export function status(card) {
  if (!card) return 'new';
  if (!card.m) return 'learning';
  if (card.f) return 'flat';
  return card.b >= MASTER_BOX ? 'mastered' : 'mile';
}

export function countMiles(cards) {
  let n = 0;
  for (const id in cards) if (cards[id].m) n++;
  return n;
}

export function countFlat(cards) {
  let n = 0;
  for (const id in cards) if (cards[id].f) n++;
  return n;
}
