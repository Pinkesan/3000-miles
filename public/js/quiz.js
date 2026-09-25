// Question types and question building (DESIGN §4). Pure.

import { shuffle } from './rng.js';
import {
  parseGap, glossOverlap, letterHint, shortHint, editDistance, acceptedSpellings, typedCorrect,
} from './text.js';

const BY_BOX = {
  probe: ['meaning'],
  confirm: ['spell'],
  check: ['spell'],
  1: ['word', 'listen'],
  2: ['gap', 'spell', 'dictation'],
  3: ['spell', 'gapType', 'dictation'],
  4: ['gapType', 'dictation'],
  5: ['gapType', 'spell', 'dictation'],
  exam: ['spell', 'gapType', 'dictation'],
};

// box: 'probe' | 'confirm' | 'check' (a new word's items), 'exam', or 1..8 = the card's box.
export function allowedTypes(box, word, { canListen = true } = {}) {
  const hasGap = !!word.ex;
  if (word.gapOnly && hasGap) {
    return box === 'probe' || box === 1 ? ['gap'] : ['gapType'];
  }
  const row = typeof box === 'number' && box >= 5 ? BY_BOX[5] : BY_BOX[box] || BY_BOX[1];
  const ok = row.filter((t) => {
    if (t === 'listen' || t === 'dictation') return canListen;
    return t.startsWith('gap') ? hasGap : true;
  });
  return ok.length ? ok : [box === 1 ? 'word' : 'spell'];
}

export function chooseType(box, word, caps, rnd) {
  const types = allowedTypes(box, word, caps);
  return types[Math.floor(rnd() * types.length)];
}

const firstForm = (x) => x.w.split(', ')[0].toLowerCase();

// Do two words look alike? Edit distance <= max(1, floor(longer / 3)), or the same first 4+ letters.
export function lookAlike(a, b) {
  const x = firstForm(a);
  const y = firstForm(b);
  if (x === y) return false;
  if (x.length >= 4 && y.length >= 4 && x.slice(0, 4) === y.slice(0, 4)) return true;
  return editDistance(x, y) <= Math.max(1, Math.floor(Math.max(x.length, y.length) / 3));
}

// Up to 2 look-alikes first (closest first, ties in random order), then same p and lv, same p, any.
export function pickDistractors(target, pool, n, rnd) {
  const wTarget = target.w.toLowerCase();
  const ok = pool.filter(
    (x) => x.id !== target.id && x.w.toLowerCase() !== wTarget && !glossOverlap(x.th, target.th),
  );
  const alike = ok.filter((x) => lookAlike(target, x));
  const rest = ok.filter((x) => !alike.includes(x)); // more than 2 look-alikes only if nothing else is left
  const similar = shuffle(alike, rnd)
    .map((x) => [editDistance(firstForm(target), firstForm(x)), x])
    .sort((p, q) => p[0] - q[0])
    .map((p) => p[1]);
  const tiers = [
    similar,
    rest.filter((x) => x.p === target.p && x.lv === target.lv),
    rest.filter((x) => x.p === target.p),
    rest,
    alike,
  ];
  const out = [];
  const seenW = new Set([wTarget]);
  const seenTh = [target.th];
  tiers.forEach((tier, i) => {
    let taken = 0;
    for (const x of i === 0 ? tier : shuffle(tier, rnd)) {
      if (out.length >= n || (i === 0 && taken >= 2)) break;
      const w = x.w.toLowerCase();
      if (out.includes(x) || seenW.has(w) || seenTh.some((t) => glossOverlap(t, x.th))) continue;
      out.push(x);
      seenW.add(w);
      seenTh.push(x.th);
      taken++;
    }
  });
  return out;
}

// hint: 'full' | 'short' (DESIGN §4); dictation never has one.
export function makeQuestion(word, type, pool, rnd, { hint = 'full' } = {}) {
  const q = { type, id: word.id, word };
  const hintOf = (s) => (hint === 'short' ? shortHint(s) : letterHint(s));
  if (type === 'spell') {
    q.accept = acceptedSpellings(word);
    q.hint = hintOf(word.w);
  } else if (type === 'dictation') {
    q.accept = acceptedSpellings(word);
    q.hint = null;
  } else if (type === 'gapType') {
    q.gap = parseGap(word.ex);
    q.accept = [q.gap.target];
    q.hint = hintOf(q.gap.target);
  } else {
    if (type === 'gap') q.gap = parseGap(word.ex);
    const wordLabel = type === 'word' || type === 'gap';
    const label = (x) => (wordLabel ? x.w : x.th);
    const wrong = pickDistractors(word, pool, 3, rnd);
    q.options = shuffle(
      [word, ...wrong].map((x) => ({ id: x.id, label: label(x) })),
      rnd,
    );
  }
  return q;
}

// Synonym retry (DESIGN §4): typed input that spells another word with an overlapping Thai
// meaning. Returns that word, or null.
export function synonymOf(input, target, pool) {
  if (typedCorrect(input, acceptedSpellings(target))) return null;
  return pool.find(
    (x) => x.id !== target.id && typedCorrect(input, acceptedSpellings(x)) && glossOverlap(x.th, target.th),
  ) ?? null;
}

// response: an option id (MCQ) or the typed string (spell, gapType, dictation).
export function isCorrect(question, response) {
  if (question.accept) return typedCorrect(response, question.accept);
  return response === question.id;
}
