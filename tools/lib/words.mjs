// The base word list (data/oxford3000.json): loaded once, read-only.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let cache = null;

export function loadBase() {
  if (!cache) cache = JSON.parse(readFileSync(join(ROOT, 'data', 'oxford3000.json'), 'utf8'));
  return cache;
}

export function byId() {
  return new Map(loadBase().map(w => [w.id, w]));
}

export function batchNames() {
  const names = [];
  for (const w of loadBase()) if (!names.includes(w.batch)) names.push(w.batch);
  return names;
}

export function batchWords(name) {
  return loadBase().filter(w => w.batch === name);
}
