import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const words = JSON.parse(readFileSync(new URL('../data/oxford3000.json', import.meta.url), 'utf8'));
const CODES = new Set(['n', 'v', 'adj', 'adv', 'prep', 'pron', 'det', 'conj', 'exclam', 'num', 'modal', 'aux', 'art', 'inf']);

test('base list has 3000 words with the official level counts', () => {
  assert.equal(words.length, 3000);
  const count = {};
  for (const w of words) count[w.lv] = (count[w.lv] ?? 0) + 1;
  assert.deepEqual(count, { A1: 900, A2: 800, B1: 700, B2: 600 });
});

test('ids are unique and well formed; POS codes are known; lv is the lowest POS level', () => {
  const ids = new Set();
  for (const w of words) {
    assert.match(w.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, w.id);
    assert.ok(!ids.has(w.id), `duplicate id ${w.id}`);
    ids.add(w.id);
    assert.ok(w.w && w.pos.length, w.id);
    for (const [p, lv] of w.pos) {
      assert.ok(CODES.has(p), `${w.id}: unknown POS ${p}`);
      assert.ok(lv >= w.lv, `${w.id}: ${lv} is below ${w.lv}`);
    }
    assert.ok(w.pos.some(([, lv]) => lv === w.lv), w.id);
  }
});

test('30 batches of 100, level by level', () => {
  const sizes = new Map();
  for (const w of words) sizes.set(w.batch, (sizes.get(w.batch) ?? 0) + 1);
  assert.equal(sizes.size, 30);
  for (const [batch, n] of sizes) assert.equal(n, 100, batch);
  assert.equal(words[0].batch, 'a1-01');
  assert.equal(words.at(-1).batch, 'b2-06');
  for (const w of words) assert.ok(w.batch.startsWith(w.lv.toLowerCase() + '-'), w.id);
});

test('words that share a spelling can be told apart by their sense', () => {
  const groups = new Map();
  for (const w of words) {
    const key = w.w.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const withoutSense = list.filter((w) => !w.sense);
    assert.ok(withoutSense.length <= 1, `${key}: ${withoutSense.map((w) => w.id).join(', ')} need a sense`);
  }
});
