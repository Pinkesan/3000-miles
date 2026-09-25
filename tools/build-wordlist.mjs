// Builds data/oxford3000.json from Oxford University Press's free PDF lists
// (The Oxford 3000, American English). Run once; the JSON is committed.
//   node tools/build-wordlist.mjs
// Needs pdftotext (Git for Windows ships it in mingw64/bin). The PDFs are
// downloaded into data/raw/ (gitignored) when missing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'data', 'oxford3000.json');
const URL_BASE = 'https://www.oxfordlearnersdictionaries.com/external/pdf/wordlists/oxford-3000-5000/';
const ALPHA_PDF = 'American_Oxford_3000.pdf';
const CEFR_PDF = 'American_Oxford_3000_by_CEFR_level.pdf';
const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const BATCH_SIZE = 100;

// Longest match first. Codes are what the game and content files use.
const POS = [
  ['indefinite article', 'art'], ['definite article', 'art'], ['infinitive marker', 'inf'],
  ['auxiliary v.', 'aux'], ['modal v.', 'modal'], ['ordinal number', 'num'],
  ['n.', 'n'], ['noun.', 'n'], ['v.', 'v'], ['adj.', 'adj'], ['adv.', 'adv'], ['prep.', 'prep'],
  ['pron.', 'pron'], ['det.', 'det'], ['conj.', 'conj'], ['exclam.', 'exclam'], ['number', 'num'],
];

// The two OUP PDFs disagree on these entries. We follow the by-CEFR-level PDF,
// or fix an obvious typo ("produce v. A2, v. B2"). Checked 2026-09-25.
const FIXES = {
  cannot: [['modal', 'A1']],
  house: [['n', 'A1'], ['v', 'B2']],
  produce: [['v', 'A2'], ['n', 'B2']],
  progress: [['n', 'A2'], ['v', 'B2']],
  attention: [['n', 'A2'], ['exclam', 'A2']],
  ski: [['v', 'A2'], ['n', 'A2'], ['adj', 'A2']],
  storm: [['n', 'A2'], ['v', 'A2']],
  sweet: [['adj', 'A2'], ['n', 'A2']],
};
// Known differences that remain after FIXES (typos in the CEFR PDF: "exit v", "wish v,";
// "mess v." is only in the alphabetical PDF and we keep it).
const KNOWN_DIFFS = new Set(['exit|v|B2', 'expectation|n|B2', 'wish|v|A2', 'wish|n|A2', 'mess|v|B1']);

// ids for headwords that share a spelling. OUP sense labels are kept in `sense`;
// numbered homographs get a short English hint so content writers pick the right meaning.
const IDS = {
  'bank (money)': 'bank-money', 'bank (river)': 'bank-river',
  'bear (deal with)': 'bear-deal', 'bear (animal)': 'bear-animal',
  'kind (type)': 'kind-type', 'kind (caring)': 'kind-caring',
  'last1 (final)': 'last-final', 'last1 (taking time)': 'last-duration',
  'light (from the sun/a lamp)': 'light-lamp', 'light (not heavy)': 'light-weight',
  'like (similar)': 'like-similar', 'like (find sb/sth pleasant)': 'like-enjoy',
  'mine (belongs to me)': 'mine-pron', 'mine (hole in the ground)': 'mine-hole',
  'race (competition)': 'race-contest', 'race (of people)': 'race-people',
  'rest (remaining part)': 'rest-remainder', 'rest (sleep/relax)': 'rest-relax',
  'rock (stone)': 'rock-stone', 'rock (music)': 'rock-music',
  'second1 (next after the first)': 'second-next', 'second1 (unit of time)': 'second-time',
  'set (put)': 'set-put', 'set (group)': 'set-group',
  'stick (push into/attach)': 'stick-attach', 'stick (piece of wood)': 'stick-wood',
  May: 'may-month', IT: 'it-tech',
};
const HINTS = {
  can1: 'be able to', can2: 'metal container',
  close1: 'shut; end', close2: 'near',
  lie1: 'be flat, rest', live1: 'have your home; be alive', live2: 'not recorded; living',
  ring1: 'circle; jewelry', ring2: 'make a bell/phone sound',
  tear1: 'pull apart', tear2: 'water from your eye',
  used1: 'second-hand, not new', used2: 'familiar with (be used to sth)',
  wind1: 'moving air', wind2: 'turn, twist',
  May: 'the month', IT: 'information technology',
};

function pdfText(file) {
  const pdf = path.join(RAW, file);
  if (!existsSync(pdf)) {
    mkdirSync(RAW, { recursive: true });
    console.log('downloading', file);
    execFileSync('curl', ['-sL', '-A', 'Mozilla/5.0', '-o', pdf, URL_BASE + file]);
  }
  const bins = ['pdftotext', 'C:/Program Files/Git/mingw64/bin/pdftotext.exe'];
  for (const bin of bins) {
    try {
      return execFileSync(bin, ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  throw new Error('pdftotext not found (install Git for Windows or poppler)');
}

function clean(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => !/Oxford University Press|^\s*\d+ \/ \d+\s*$|The Oxford 3000(TM|™)|most important words to learn/.test(l))
    .join(' ')
    .replace(/[‘’]/g, "'")
    .replace(/(\w)\.\/\s+(\w)/g, '$1./$2') // "det./ number" split by a line break
    .replace(/\s+/g, ' ')
    .trim();
}

// "adj., det., pron., v." or "det./pron./adv." -> codes, or null when it isn't a POS list.
function parsePosList(s) {
  s = s.trim().replace(/,$/, '');
  const out = [];
  let rest = s;
  while (rest.length) {
    const hit = POS.find(([t]) => rest === t || rest.startsWith(t + ',') || rest.startsWith(t + '/'));
    if (!hit) return out.length && rest === '' ? out : null;
    out.push(hit[1]);
    rest = rest.slice(hit[0].length).replace(/^[,/]\s*/, '');
  }
  return out.length ? out : null;
}

function splitHead(seg) {
  const toks = seg.trim().split(' ');
  for (let i = 1; i < toks.length; i++) {
    const pos = parsePosList(toks.slice(i).join(' '));
    if (pos) return { head: toks.slice(0, i).join(' '), pos };
  }
  throw new Error('cannot split headword: ' + seg);
}

// ---- alphabetical list: an entry ends at a level that is not followed by a comma
const LV_RE = /(?<=^|[\s.])(A1|A2|B1|B2)(?=$|[\s,])/g;
const alpha = clean(pdfText(ALPHA_PDF));
const rawEntries = [];
let start = 0;
for (const m of alpha.matchAll(LV_RE)) {
  const end = m.index + m[0].length;
  if (alpha.slice(end).trimStart()[0] === ',') continue;
  rawEntries.push(alpha.slice(start, end).trim());
  start = end;
}
if (alpha.slice(start).trim()) throw new Error('trailing text: ' + alpha.slice(start, start + 80));

const words = rawEntries.map((e) => {
  const parts = e.split(/\s*(?<=^|[\s.])(A1|A2|B1|B2)(?=$|[\s,])\s*,?\s*/);
  const { head, pos: firstPos } = splitHead(parts[0]);
  let pos = [];
  let list = firstPos;
  for (let i = 1; i < parts.length; i += 2) {
    for (const p of list) pos.push([p, parts[i]]);
    if (parts[i + 1]?.trim()) list = parsePosList(parts[i + 1]) ?? (() => { throw new Error('bad POS in ' + e); })();
  }
  const m = head.match(/^(.+?)(\d)?(?: \((.+)\))?$/);
  const w = m[1];
  const key = head; // as printed, e.g. "last1 (final)"
  if (FIXES[w]) pos = FIXES[w];
  // merge duplicate codes, keep the lowest level
  const seen = new Map();
  for (const [p, lv] of pos) if (!seen.has(p) || lv < seen.get(p)) seen.set(p, lv);
  pos = [...seen];
  const lv = pos.map(([, l]) => l).sort()[0];
  const slug = w.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const id = IDS[key] ?? IDS[w] ?? (m[2] && ['can', 'close', 'lie', 'live', 'ring', 'tear', 'used', 'wind'].includes(w) ? `${slug}-${m[2]}` : slug);
  const entry = { id, w, lv, pos };
  const sense = m[3] ?? HINTS[w + (m[2] ?? '')] ?? HINTS[w];
  if (sense) entry.sense = sense;
  return entry;
});

// ---- cross-check against the by-CEFR-level PDF
const cefr = clean(pdfText(CEFR_PDF)).replace(/^.*?(?=\bA1\b)/, '');
const toks = cefr.split(' ');
const cefrSet = new Set();
let level = null;
for (let i = 0; i < toks.length; ) {
  if (LEVELS.includes(toks[i])) { level = toks[i++]; continue; }
  let found = null;
  let j = i + 1;
  for (; j < toks.length && j < i + 6 && !found; j++) {
    for (let k = Math.min(toks.length, j + 8); k > j; k--) {
      const cand = toks.slice(j, k).join(' ');
      if (/[,/]$/.test(cand)) continue;
      const pl = parsePosList(cand);
      if (pl) { found = { j, k, pl }; break; }
    }
  }
  if (!found) throw new Error('CEFR parse failed near: ' + toks.slice(i, i + 6).join(' '));
  const head = toks.slice(i, found.j).join(' ').replace(/\d(?= \(|$)/, '').replace(/ \(.+\)$/, '');
  for (const p of found.pl) cefrSet.add(`${head}|${p}|${level}`);
  i = found.k;
}
const alphaSet = new Set(words.flatMap((x) => x.pos.map(([p, lv]) => `${x.w}|${p}|${lv}`)));
const diffs = [
  ...[...alphaSet].filter((k) => !cefrSet.has(k)),
  ...[...cefrSet].filter((k) => !alphaSet.has(k)).map((k) => 'cefr-only ' + k),
].filter((k) => !KNOWN_DIFFS.has(k) && !/^cefr-only (exit v expectation|wish v,)\|/.test(k));
if (diffs.length) throw new Error('unexpected differences between the two PDFs:\n' + diffs.join('\n'));

// ---- checks, batches, output
const ids = new Set();
for (const x of words) {
  if (ids.has(x.id)) throw new Error('duplicate id ' + x.id);
  ids.add(x.id);
}
const count = Object.fromEntries(LEVELS.map((l) => [l, words.filter((x) => x.lv === l).length]));
if (words.length !== 3000) throw new Error('expected 3000 words, got ' + words.length);

const ordered = LEVELS.flatMap((l) => words.filter((x) => x.lv === l));
for (const l of LEVELS) {
  ordered.filter((x) => x.lv === l).forEach((x, i) => {
    x.batch = `${l.toLowerCase()}-${String(Math.floor(i / BATCH_SIZE) + 1).padStart(2, '0')}`;
  });
}
const lines = ordered.map((x) => '  ' + JSON.stringify(x));
writeFileSync(OUT, '[\n' + lines.join(',\n') + '\n]\n');
console.log(`wrote ${path.relative(ROOT, OUT)}: ${words.length} words`, count,
  `${new Set(ordered.map((x) => x.batch)).size} batches of ${BATCH_SIZE}`);
