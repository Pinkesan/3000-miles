// Word forms for the content checker: which spellings count as "the word" inside an
// example sentence, and which words a sentence may use without a vocabulary warning.
import { loadBase } from './words.mjs';

// Irregular forms of every irregular word in the list (lowercase keys).
export const IRREGULAR = {
  // be, have, do and the modals (contractions included)
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being', "isn't", "aren't", "wasn't", "weren't", "i'm", "'m", "'re", "'s"],
  have: ['has', 'had', 'having', "haven't", "hasn't", "hadn't", "'ve"],
  do: ['does', 'did', 'done', 'doing', "don't", "doesn't", "didn't"],
  can: ['could', "can't", "couldn't"],
  cannot: ["can't"],
  could: ["couldn't"],
  will: ['would', "won't", "'ll", "wouldn't"],
  would: ["wouldn't", "'d"],
  shall: ['should', "shan't"],
  should: ["shouldn't"],
  may: ['might'],
  might: [],
  must: ["mustn't"],
  // irregular verbs
  arise: ['arose', 'arisen'],
  bear: ['bore', 'borne', 'born'],
  beat: ['beaten'],
  become: ['became'],
  begin: ['began', 'begun'],
  bend: ['bent'],
  bet: [],
  bite: ['bit', 'bitten'],
  blow: ['blew', 'blown'],
  break: ['broke', 'broken'],
  bring: ['brought'],
  broadcast: [],
  build: ['built'],
  burn: ['burnt'],
  buy: ['bought'],
  cast: [],
  catch: ['caught'],
  choose: ['chose', 'chosen'],
  come: ['came'],
  cost: [],
  cut: [],
  deal: ['dealt'],
  dig: ['dug'],
  draw: ['drew', 'drawn'],
  dream: ['dreamt'],
  drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  feed: ['fed'],
  feel: ['felt'],
  fight: ['fought'],
  find: ['found'],
  fly: ['flew', 'flown'],
  forget: ['forgot', 'forgotten'],
  forgive: ['forgave', 'forgiven'],
  freeze: ['froze', 'frozen'],
  get: ['got', 'gotten'],
  give: ['gave', 'given'],
  go: ['goes', 'went', 'gone'],
  grow: ['grew', 'grown'],
  hang: ['hung'],
  hear: ['heard'],
  hide: ['hid', 'hidden'],
  hit: [],
  hold: ['held'],
  hurt: [],
  keep: ['kept'],
  know: ['knew', 'known'],
  lay: ['laid'],
  lead: ['led'],
  lean: ['leant'],
  learn: ['learnt'],
  leave: ['left'],
  lend: ['lent'],
  let: [],
  lie: ['lay', 'lain', 'lying', 'lied'],
  light: ['lit'],
  lose: ['lost'],
  make: ['made'],
  mean: ['meant'],
  meet: ['met'],
  pay: ['paid'],
  put: [],
  quit: [],
  read: [],
  rid: [],
  ride: ['rode', 'ridden'],
  ring: ['rang', 'rung'],
  rise: ['rose', 'risen'],
  run: ['ran'],
  say: ['said'],
  see: ['saw', 'seen'],
  seek: ['sought'],
  sell: ['sold'],
  send: ['sent'],
  set: [],
  shake: ['shook', 'shaken'],
  shine: ['shone'],
  shoot: ['shot'],
  show: ['shown'],
  shut: [],
  sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'],
  sit: ['sat'],
  sleep: ['slept'],
  slide: ['slid'],
  speak: ['spoke', 'spoken'],
  spell: ['spelt'],
  spend: ['spent'],
  split: [],
  spread: [],
  stand: ['stood'],
  steal: ['stole', 'stolen'],
  stick: ['stuck'],
  strike: ['struck', 'stricken'],
  swear: ['swore', 'sworn'],
  sweep: ['swept'],
  swim: ['swam', 'swum'],
  take: ['took', 'taken'],
  teach: ['taught'],
  tear: ['tore', 'torn'],
  tell: ['told'],
  think: ['thought'],
  throw: ['threw', 'thrown'],
  understand: ['understood'],
  upset: [],
  wake: ['woke', 'woken'],
  wear: ['wore', 'worn'],
  wind: ['wound'],
  win: ['won'],
  write: ['wrote', 'written'],
  prove: ['proven'],
  // plurals
  child: ['children'],
  man: ['men'],
  woman: ['women'],
  policeman: ['policemen'],
  businessman: ['businessmen'],
  gentleman: ['gentlemen'],
  chairman: ['chairmen'],
  person: ['people'],
  foot: ['feet'],
  tooth: ['teeth'],
  mouse: ['mice'],
  knife: ['knives'],
  life: ['lives'],
  wife: ['wives'],
  leaf: ['leaves'],
  half: ['halves'],
  shelf: ['shelves'],
  thief: ['thieves'],
  self: ['selves'],
  staff: ['staffs'],
  analysis: ['analyses'],
  basis: ['bases'],
  crisis: ['crises'],
  emphasis: ['emphases'],
  medium: ['media', 'mediums'],
  stadium: ['stadia'],
  maximum: ['maxima'],
  minimum: ['minima'],
  // comparatives and superlatives
  good: ['better', 'best'],
  bad: ['worse', 'worst'],
  far: ['farther', 'further', 'farthest', 'furthest'],
  little: ['less', 'least'],
  many: ['more', 'most'],
  much: ['more', 'most'],
  well: ['better', 'best'],
  old: ['elder', 'eldest'],
  late: ['latter', 'last'],
};

const VOWEL = /[aeiou]/;

// Regular variants of one lowercase word (generous: extra spellings are harmless).
function regular(x) {
  const out = new Set([x]);
  const last = x.at(-1);
  out.add(x + 's').add(x + 'es').add(x + "'s").add(x + "s'");
  out.add(x + 'ed').add(x + 'd').add(x + 'ing').add(x + 'er').add(x + 'est');
  out.add(x + 'r').add(x + 'st');
  if (/[^aeiou]y$/.test(x)) {
    const s = x.slice(0, -1);
    out.add(s + 'ies').add(s + 'ied').add(s + 'ier').add(s + 'iest');
  }
  if (last === 'e') out.add(x.slice(0, -1) + 'ing');
  if (x.endsWith('ie')) out.add(x.slice(0, -2) + 'ying');
  if (last === 'f') out.add(x.slice(0, -1) + 'ves');
  if (x.endsWith('fe')) out.add(x.slice(0, -2) + 'ves');
  if (/[^aeiou]$/.test(x) && VOWEL.test(x)) {
    for (const suf of ['ed', 'ing', 'er', 'est', 'y']) out.add(x + last + suf);
  }
  return out;
}

function wordForms(x) {
  const out = regular(x);
  for (const f of IRREGULAR[x] ?? []) out.add(f);
  return out;
}

// All lowercase forms of a base word `w` as printed in the list.
export function forms(w) {
  const x = w.toLowerCase();
  if (x === 'a, an') return new Set(['a', 'an']);
  if (x.includes("'") && !x.includes(' ')) return new Set([x]);
  if (x.includes(' ')) {
    const parts = x.split(' ');
    const out = new Set([x]);
    for (const f of wordForms(parts[0])) out.add([f, ...parts.slice(1)].join(' '));
    const last = parts.length - 1;
    for (const f of wordForms(parts[last])) out.add([...parts.slice(0, last), f].join(' '));
    return out;
  }
  if (x.includes('-')) {
    const parts = x.split('-');
    const last = parts.length - 1;
    const out = new Set([x]);
    for (const f of wordForms(parts[last])) out.add([...parts.slice(0, last), f].join('-'));
    return out;
  }
  return wordForms(x);
}

// Every form of every word in the list, plus the separate words of phrases.
export function knownWords(base = loadBase()) {
  const known = new Set();
  for (const entry of base) {
    for (const f of forms(entry.w)) {
      known.add(f);
      for (const piece of f.split(/[ -]/)) known.add(piece);
    }
  }
  return known;
}

const CONTRACTIONS = [
  [/^can't$/, ['can', 'not']],
  [/^won't$/, ['will', 'not']],
  [/^shan't$/, ['shall', 'not']],
  [/^(.+)n't$/, m => [m[1], 'not']],
  [/^(.+)'m$/, m => [m[1], 'am']],
  [/^(.+)'re$/, m => [m[1], 'are']],
  [/^(.+)'ll$/, m => [m[1], 'will']],
  [/^(.+)'ve$/, m => [m[1], 'have']],
  [/^(.+)'d$/, m => [m[1], 'would']],
  [/^(.+)'s$/, m => [m[1], 'is']],
];

// Words of a sentence for the vocabulary warning: lowercase, contractions split,
// numbers and capitalized non-first words (names) skipped.
export function tokenize(sentence) {
  const out = [];
  const raw = sentence.replace(/[[\]]/g, '').split(/\s+/).filter(Boolean);
  raw.forEach((token, i) => {
    let t = token.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');
    if (!t || /\d/.test(t)) return;
    if (i > 0 && /^[A-Z]/.test(t) && t !== 'I' && !/^I'/.test(t)) return;
    t = t.toLowerCase();
    for (const [re, to] of CONTRACTIONS) {
      const m = t.match(re);
      if (m) {
        out.push(...(typeof to === 'function' ? to(m) : to));
        return;
      }
    }
    out.push(t);
  });
  return out;
}
