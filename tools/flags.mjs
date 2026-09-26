// Lists the words a player flagged, from a backup file made in settings (DESIGN §10).
//   node tools/flags.mjs 3000-miles-2026-10-01.json
// Output: one line per word, grouped by batch: batch | id | w | th | ex | note
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pure: backup object + base list + content entries by id -> rows sorted by batch, then list order.
export function flaggedRows(backup, base, contentById) {
  const flags = backup?.data?.flags;
  if (backup?.app !== '3000-miles' || !flags || typeof flags !== 'object') throw new Error('not a 3000 Miles backup');
  const rows = [];
  base.forEach((w, order) => {
    const f = flags[w.id];
    if (!f) return;
    const c = contentById.get(w.id) || {};
    rows.push({ batch: w.batch, order, id: w.id, w: w.w, th: c.th || '', ex: c.ex || '', note: f.note || '' });
  });
  return rows.sort((a, b) => a.batch.localeCompare(b.batch) || a.order - b.order);
}

export function formatRows(rows) {
  const out = [];
  let batch = '';
  for (const r of rows) {
    if (r.batch !== batch) { batch = r.batch; out.push(`# ${batch}`); }
    out.push([r.batch, r.id, r.w, r.th, r.ex, r.note].join(' | '));
  }
  return out.join('\n');
}

function loadContent(base) {
  const map = new Map();
  for (const batch of new Set(base.map((w) => w.batch))) {
    try {
      for (const e of JSON.parse(readFileSync(path.join(ROOT, 'content', `${batch}.json`), 'utf8'))) map.set(e.id, e);
    } catch { /* a batch without content yet */ }
  }
  return map;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node tools/flags.mjs <backup.json>'); process.exit(1); }
  const base = JSON.parse(readFileSync(path.join(ROOT, 'data', 'oxford3000.json'), 'utf8'));
  try {
    const rows = flaggedRows(JSON.parse(readFileSync(file, 'utf8')), base, loadContent(base));
    console.log(rows.length ? formatRows(rows) : 'No flagged words.');
    if (rows.length) console.log(`\n${rows.length} flagged word${rows.length === 1 ? '' : 's'}`);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}
