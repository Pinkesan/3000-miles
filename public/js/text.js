// Text helpers: typed answers, gap sentences, Thai gloss overlap, POS labels (DESIGN §2, §4).

export const POS_LABEL = {
  n: { en: 'n.', th: 'คำนาม' },
  v: { en: 'v.', th: 'คำกริยา' },
  adj: { en: 'adj.', th: 'คำคุณศัพท์' },
  adv: { en: 'adv.', th: 'คำกริยาวิเศษณ์' },
  prep: { en: 'prep.', th: 'คำบุพบท' },
  pron: { en: 'pron.', th: 'คำสรรพนาม' },
  det: { en: 'det.', th: 'คำกำหนดนาม' },
  conj: { en: 'conj.', th: 'คำเชื่อม' },
  exclam: { en: 'exclam.', th: 'คำอุทาน' },
  num: { en: 'number', th: 'ตัวเลข' },
  modal: { en: 'modal v.', th: 'กริยาช่วย (modal)' },
  aux: { en: 'aux. v.', th: 'กริยาช่วย' },
  art: { en: 'article', th: 'คำนำหน้านาม' },
  inf: { en: 'to + verb', th: 'to หน้ากริยา' },
};

export function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
}

export function glosses(th) {
  return String(th ?? '').split(', ').map((g) => g.trim()).filter(Boolean);
}

export function glossOverlap(thA, thB) {
  const A = glosses(thA);
  const B = glosses(thB);
  for (const a of A) {
    for (const b of B) {
      if (a === b) return true;
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      if (short.length >= 3 && long.includes(short)) return true;
    }
  }
  return false;
}

export function parseGap(ex) {
  const m = /^([^[\]]*)\[([^[\]]+)\]([^[\]]*)$/.exec(String(ex ?? ''));
  if (!m) throw new Error(`Example needs exactly one [bracketed] part: ${ex}`);
  return { before: m[1], target: m[2], after: m[3] };
}

export function blankGap(ex, blank = '_____') {
  const { before, after } = parseGap(ex);
  return before + blank + after;
}

export function plain(ex) {
  const { before, target, after } = parseGap(ex);
  return before + target + after;
}

// First character, then "_" for each other letter. Letters and spaces are separated by a
// space; hyphens, apostrophes and punctuation stick to their neighbours.
export function letterHint(s) {
  const chars = Array.from(String(s));
  const tokens = chars.map((c, i) => (i === 0 || !/[\p{L}\p{N}]/u.test(c) ? c : '_'));
  const spaced = (c) => c === ' ' || c === '_' || /[\p{L}\p{N}]/u.test(c);
  let out = '';
  tokens.forEach((t, i) => {
    if (i > 0 && spaced(tokens[i - 1]) && spaced(t)) out += ' ';
    out += t;
  });
  return out;
}

export function acceptedSpellings(word) {
  const list = String(word.w).split(', ').concat(word.alt || []);
  return [...new Set(list.map(norm))];
}

export function typedCorrect(input, accepted) {
  const n = norm(input);
  return n !== '' && accepted.some((a) => norm(a) === n);
}

export function posList(word) {
  const codes = [...new Set((word.pos || []).map((p) => p[0]))];
  return codes.map((c) => POS_LABEL[c]?.en ?? c).join(', ');
}
