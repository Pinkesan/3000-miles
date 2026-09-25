// Question types and question building (DESIGN §4). Pure.

import { shuffle } from './rng.js';
import { parseGap, glossOverlap, letterHint, acceptedSpellings, typedCorrect } from './text.js';

const BY_BOX = {
  0: ['meaning'],
  know: ['word'],
  1: ['meaning', 'listen'],
  2: ['word', 'listen'],
  3: ['gap', 'word'],
  4: ['gap', 'spell'],
  5: ['spell', 'gapType'],
};

// box: 0 = check after the Meet card, 'know' = "I know this", 1..8 = the card's box.
export function allowedTypes(box, word, { canListen = true } = {}) {
  const hasGap = !!word.ex;
  if (word.gapOnly && hasGap) {
    return box === 0 || box === 'know' || box <= 3 ? ['gap'] : ['gapType'];
  }
  const row = typeof box === 'number' && box >= 5 ? BY_BOX[5] : BY_BOX[box] || BY_BOX[1];
  const ok = row.filter((t) => (t === 'listen' ? canListen : t.startsWith('gap') ? hasGap : true));
  return ok.length ? ok : ['meaning'];
}

export function chooseType(box, word, caps, rnd) {
  const types = allowedTypes(box, word, caps);
  return types[Math.floor(rnd() * types.length)];
}

export function pickDistractors(target, pool, n, rnd) {
  const wTarget = target.w.toLowerCase();
  const ok = pool.filter(
    (x) => x.id !== target.id && x.w.toLowerCase() !== wTarget && !glossOverlap(x.th, target.th),
  );
  const tiers = [
    ok.filter((x) => x.p === target.p && x.lv === target.lv),
    ok.filter((x) => x.p === target.p),
    ok,
  ];
  const out = [];
  const seenW = new Set([wTarget]);
  const seenTh = [target.th];
  for (const tier of tiers) {
    for (const x of shuffle(tier, rnd)) {
      if (out.length >= n) return out;
      const w = x.w.toLowerCase();
      if (out.includes(x) || seenW.has(w) || seenTh.some((t) => glossOverlap(t, x.th))) continue;
      out.push(x);
      seenW.add(w);
      seenTh.push(x.th);
    }
  }
  return out;
}

export function makeQuestion(word, type, pool, rnd) {
  const q = { type, id: word.id, word };
  if (type === 'spell') {
    q.accept = acceptedSpellings(word);
    q.hint = letterHint(word.w);
  } else if (type === 'gapType') {
    q.gap = parseGap(word.ex);
    q.accept = [q.gap.target];
    q.hint = letterHint(q.gap.target);
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

// response: an option id (MCQ) or the typed string (spell, gapType).
export function isCorrect(question, response) {
  if (question.accept) return typedCorrect(response, question.accept);
  return response === question.id;
}
