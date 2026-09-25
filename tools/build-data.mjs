// data/oxford3000.json + content/*.json -> public/data/words.json (DESIGN §2).
// Aborts with exit 1 when any content file has errors.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadBase, batchNames } from './lib/words.mjs';
import { checkBatch, parseBatchFile } from './lib/check.mjs';

const base = loadBase();
const content = new Map();
let bad = false;

for (const name of batchNames()) {
  const path = join(ROOT, 'content', `${name}.json`);
  if (!existsSync(path)) continue;
  try {
    const entries = parseBatchFile(readFileSync(path, 'utf8'));
    const { errors } = checkBatch(name, entries, base);
    for (const e of errors) console.error(e);
    if (errors.length) bad = true;
    for (const e of entries) content.set(e.id, e);
  } catch (err) {
    console.error(`${name}: ${err.message}`);
    bad = true;
  }
}
if (bad) {
  console.error('build:data aborted: fix the content errors first');
  process.exit(1);
}

const ORDER = ['id', 'w', 'lv', 'pos', 'sense', 'p', 'th', 'ex', 'exTh', 'other', 'e', 'alt', 'gapOnly'];
const levels = {};
for (const w of base) levels[w.lv] = (levels[w.lv] ?? 0) + 1;

const words = [];
const perLevel = {};
for (const w of base) {
  const c = content.get(w.id);
  if (!c) continue;
  const merged = { ...w, ...c };
  const out = {};
  for (const k of ORDER) if (merged[k] !== undefined) out[k] = merged[k];
  words.push(out);
  perLevel[w.lv] = (perLevel[w.lv] ?? 0) + 1;
}

const head = `{"v":1,"total":${base.length},"levels":${JSON.stringify(levels)},"count":${words.length},"words":[\n`;
const text = head + words.map(w => JSON.stringify(w)).join(',\n') + '\n]}\n';
mkdirSync(join(ROOT, 'public', 'data'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'data', 'words.json'), text);

const summary = Object.entries(perLevel).map(([lv, n]) => `${lv} ${n}`).join(', ');
console.log(`words.json: ${words.length} words${summary ? ` (${summary})` : ''}`);
