// Content checker: the rules are in docs/CONTENT-GUIDE.md ("What the checker checks").
import { forms, knownWords, tokenize } from './forms.mjs';

const KEYS = new Set(['id', 'p', 'th', 'ex', 'exTh', 'other', 'e', 'alt', 'gapOnly']);
const REQUIRED = ['id', 'p', 'th', 'ex', 'exTh'];
const THAI = /[฀-๿]/;
const POLITE = /ครับ|ค่ะ/;
const EMOJI = /^\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;

let known = null;

// Parse a content file: a JSON array, one entry per line. Throws a readable error.
export function parseBatchFile(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().replace(/,$/, '');
      if (!line || line === '[' || line === ']') continue;
      try {
        JSON.parse(line);
      } catch (e) {
        throw new Error(`line ${i + 1}: ${e.message}`);
      }
    }
    throw new Error(err.message);
  }
}

// The Thai check shared by `th` and `other`: returns a problem or null.
function thaiProblem(th) {
  if (typeof th !== 'string' || !THAI.test(th)) return 'has no Thai letters';
  if (/[A-Za-z]/.test(th.replace(/\([^)]*\)/g, ''))) return 'has Latin letters outside parentheses';
  if (th.length > 45) return `is ${th.length} characters (max 45)`;
  if (/[;/]/.test(th)) return 'uses ; or / (join glosses with ", ")';
  if (POLITE.test(th)) return 'has ครับ/ค่ะ';
  return null;
}

export function checkBatch(name, entries, base, opts = {}) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(entries)) {
    return { errors: [`${name}: the file must be a JSON array`], warnings };
  }
  known ??= knownWords(base);
  const words = new Map(base.filter(w => w.batch === name).map(w => [w.id, w]));
  const seen = new Set();
  const thSeen = new Map();

  entries.forEach((e, i) => {
    if (!e || typeof e !== 'object' || Array.isArray(e)) {
      errors.push(`${name} #${i + 1}: not an object`);
      return;
    }
    const tag = `${name} ${e.id ?? '#' + (i + 1)}`;
    const err = msg => errors.push(`${tag}: ${msg}`);
    const warn = msg => warnings.push(`${tag}: ${msg}`);

    // 1. keys
    for (const k of Object.keys(e)) if (!KEYS.has(k)) err(`unknown key "${k}"`);
    const missing = REQUIRED.filter(k => typeof e[k] !== 'string' || !e[k]);
    if (missing.length) {
      err(`missing ${missing.join(', ')}`);
      if (typeof e.id !== 'string') return;
    }

    // 2. id
    const word = words.get(e.id);
    if (!word) {
      err('id is not in this batch');
      return;
    }
    if (seen.has(e.id)) err('duplicate id');
    seen.add(e.id);

    // 3. p
    const codes = word.pos.map(p => p[0]);
    if (typeof e.p === 'string' && !codes.includes(e.p)) {
      err(`p "${e.p}" is not one of ${codes.join(', ')}`);
    }

    // 4. th
    if (typeof e.th === 'string' && e.th) {
      const problem = thaiProblem(e.th);
      if (problem) err(`th ${problem}`);
      if (e.th.split(', ').length > 3) warn('th has more than 3 glosses');
      if (thSeen.has(e.th)) warn(`same th as ${thSeen.get(e.th)}`);
      else thSeen.set(e.th, e.id);
    }

    // 5 + 6. ex
    if (typeof e.ex === 'string' && e.ex) {
      const brackets = e.ex.match(/\[[^\]]*\]/g) ?? [];
      const nWords = e.ex.trim().split(/\s+/).length;
      if (brackets.length !== 1 || (e.ex.match(/[[\]]/g) ?? []).length !== 2) {
        err('ex needs exactly one [bracketed] word');
      } else {
        const form = brackets[0].slice(1, -1).toLowerCase();
        if (!forms(word.w).has(form)) err(`ex: "${form}" is not a form of "${word.w}"`);
      }
      if (nWords < 4 || nWords > 14) err(`ex has ${nWords} words (4-14)`);
      if (!/^\[?[A-Z]/.test(e.ex)) err('ex must start with a capital letter');
      if (!/[.?!]$/.test(e.ex)) err('ex must end with . ? or !');
      if (/[^\x20-\x7E]/.test(e.ex)) err('ex must be plain ASCII');
      const unknown = [...new Set(tokenize(e.ex).filter(t => !known.has(t)))];
      if (unknown.length > 1) warn(`ex has ${unknown.length} words outside the list: ${unknown.join(', ')}`);
    }

    // 7. exTh
    if (typeof e.exTh === 'string' && e.exTh) {
      if (!THAI.test(e.exTh)) err('exTh has no Thai letters');
      if (POLITE.test(e.exTh)) err('exTh has ครับ/ค่ะ');
    }

    // 8. other
    if (e.other !== undefined) {
      if (!Array.isArray(e.other) || e.other.length > 2) {
        err('other must be an array of at most 2 pairs');
      } else {
        for (const pair of e.other) {
          if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string') {
            err('other pairs are [code, thai]');
            continue;
          }
          if (!codes.includes(pair[0]) || pair[0] === e.p) err(`other code "${pair[0]}" is not another POS of the word`);
          const problem = thaiProblem(pair[1]);
          if (problem) err(`other "${pair[0]}" ${problem}`);
        }
      }
    }

    // 9. e, alt, gapOnly
    if (e.e !== undefined && (typeof e.e !== 'string' || !EMOJI.test(e.e))) err('e must be a single emoji');
    if (e.alt !== undefined) {
      const ok = Array.isArray(e.alt) && e.alt.length > 0 &&
        e.alt.every(a => typeof a === 'string' && a && !/[^\x20-\x7E]/.test(a));
      if (!ok) err('alt must be a non-empty array of ASCII strings');
    }
    if (e.gapOnly !== undefined && e.gapOnly !== true) err('gapOnly must be true');
  });

  if (!opts.allowMissing) {
    const absent = [...words.keys()].filter(id => !seen.has(id));
    if (absent.length) {
      const shown = absent.slice(0, 5).join(', ') + (absent.length > 5 ? ', ...' : '');
      errors.push(`${name}: ${absent.length} ids missing (${shown})`);
    }
  }
  return { errors, warnings };
}
