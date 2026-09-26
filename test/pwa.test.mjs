import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const PUBLIC = new URL('../public/', import.meta.url);
const sw = readFileSync(new URL('sw.js', PUBLIC), 'utf8');
// Files in public/ that the service worker does not precache.
const EXCLUDE = ['sw.js', 'fonts/OFL-anuphan.txt', 'fonts/OFL-overpass.txt', 'fonts/OFL-overpassmono.txt'];

const walk = (dir, base = '') =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(new URL(`${e.name}/`, dir), `${base}${e.name}/`) : [`${base}${e.name}`]);

test('sw.js VERSION matches version.js', async () => {
  const { VERSION } = await import('../public/js/version.js');
  assert.equal(/const VERSION = '([^']+)'/.exec(sw)?.[1], VERSION);
});

test('every file in public/ is precached or excluded, and every precached file exists', () => {
  const list = /const FILES = \[([\s\S]*?)\];/.exec(sw)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  const files = list.filter((f) => f !== './').map((f) => f.replace(/^\.\//, ''));
  for (const f of walk(PUBLIC)) assert.ok(files.includes(f) || EXCLUDE.includes(f), `${f} is neither in FILES nor excluded`);
  for (const f of files) assert.ok(existsSync(new URL(f, PUBLIC)), `${f} is in FILES but missing`);
  assert.ok(list.includes('./'));
});

test('manifest: fields and icons', () => {
  const m = JSON.parse(readFileSync(new URL('manifest.webmanifest', PUBLIC), 'utf8'));
  assert.equal(m.short_name, '3000 Miles');
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, './');
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(new URL(i.src, PUBLIC)), i.src);
});
