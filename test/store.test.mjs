import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, freshState, createStore, KEY, DEFAULT_SETTINGS } from '../public/js/store.js';

test('junk becomes a fresh state', () => {
  for (const junk of [null, undefined, 5, 'x', [], true]) assert.deepEqual(normalizeState(junk), freshState());
});

test('a partial save gets the missing parts', () => {
  const s = normalizeState({ settings: { newPerDay: 20 }, cards: { a: { b: 1 } }, streak: { cur: 3 } });
  assert.equal(s.settings.newPerDay, 20);
  assert.equal(s.settings.rate, DEFAULT_SETTINGS.rate);
  assert.deepEqual(s.cards, { a: { b: 1 } });
  assert.deepEqual(s.streak, { cur: 3, best: 0, last: null, rests: 0 });
  assert.deepEqual(s.arcade, { best: 0, runs: [] });
  assert.equal(s.leg, null);
});

test('checkpoints and exam: fresh defaults, kept when valid, junk dropped', () => {
  const f = freshState();
  assert.deepEqual(f.checkpoints, {});
  assert.equal(f.exam, null);
  const cp = { philadelphia: { best: 2, passed: 20500, last: 20500, tries: 1 } };
  const exam = { day: 20500, stopId: 'washington', items: [], done: 0, right: 0, missed: [] };
  const s = normalizeState({ checkpoints: cp, exam });
  assert.deepEqual(s.checkpoints, cp);
  assert.deepEqual(s.exam, exam);
  const j = normalizeState({ checkpoints: [1], exam: 'x' });
  assert.deepEqual(j.checkpoints, {});
  assert.equal(j.exam, null);
});

test('unknown settings values fall back to defaults', () => {
  const s = normalizeState({ settings: { newPerDay: 7, startLevel: 'C2', theme: 'pink', rate: 9, autoplay: 'yes', sound: 0, voice: 3 } });
  assert.deepEqual(s.settings, DEFAULT_SETTINGS);
});

test('does not share objects with the input', () => {
  const a = freshState();
  const b = freshState();
  a.settings.newPerDay = 30;
  assert.equal(b.settings.newPerDay, 10);
});

test('store saves and reloads; broken storage falls back to memory', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const one = createStore(storage);
  one.update((s) => { s.settings.newPerDay = 15; });
  assert.equal(createStore(storage).state.settings.newPerDay, 15);
  assert.ok(mem.has(KEY));

  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  const two = createStore(broken);
  two.update((s) => { s.settings.newPerDay = 5; });
  assert.equal(two.state.settings.newPerDay, 5);
  assert.equal(two.persistent, false);
  assert.equal(createStore(null).state.settings.newPerDay, 10);
  mem.set(KEY, '{not json');
  assert.deepEqual(createStore(storage).state, freshState());
});

test('records: fresh, missing and junk values', () => {
  assert.deepEqual(freshState().records, { combo: 0, day: 0, dayOn: null });
  assert.deepEqual(normalizeState({ cards: {} }).records, { combo: 0, day: 0, dayOn: null });
  assert.deepEqual(normalizeState({ records: { combo: 12, day: 340, dayOn: 20700 } }).records, { combo: 12, day: 340, dayOn: 20700 });
  assert.deepEqual(normalizeState({ records: { combo: 'x', day: null, dayOn: 'y' } }).records, { combo: 0, day: 0, dayOn: null });
});

const memStore = () => {
  const mem = new Map();
  return createStore({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) });
};

test('backup: export then import gives the same state', () => {
  const a = memStore();
  a.update((s) => {
    s.settings.newPerDay = 20;
    s.cards.bank = { b: 4, d: 20510, g: 20500, n: 5, r: 4, l: 1, m: 7, md: 20495 };
    s.flags.bank = { day: 20500, note: 'x' };
    s.stops.philadelphia = 20501;
  });
  const file = a.exportData(new Date('2026-09-26T10:00:00Z'));
  assert.equal(file.app, '3000-miles');
  assert.equal(file.v, 1);
  assert.equal(file.exportedAt, '2026-09-26T10:00:00.000Z');
  const b = memStore();
  b.importData(JSON.stringify(file));
  assert.deepEqual(b.state, a.state);
});

test('backup: a wrong app or broken JSON throws and keeps the state', () => {
  const s = memStore();
  s.update((x) => { x.settings.newPerDay = 15; });
  assert.throws(() => s.importData('{nope'));
  assert.throws(() => s.importData(JSON.stringify({ app: 'other', v: 1, data: {} })));
  assert.throws(() => s.importData(JSON.stringify({ app: '3000-miles', v: 1 })));
  assert.throws(() => s.importData('[]'));
  assert.equal(s.state.settings.newPerDay, 15);
});

test('backup: a partial file is normalized', () => {
  const s = memStore();
  s.importData(JSON.stringify({ app: '3000-miles', v: 1, data: { settings: { theme: 'dark' }, cards: { a: { b: 2 } } } }));
  assert.equal(s.state.settings.theme, 'dark');
  assert.equal(s.state.settings.rate, DEFAULT_SETTINGS.rate);
  assert.deepEqual(s.state.arcade, { best: 0, runs: [] });
  assert.deepEqual(s.state.cards, { a: { b: 2 } });
  s.reset();
  assert.deepEqual(s.state, freshState());
});

test('version.js matches package.json', async () => {
  const { readFileSync } = await import('node:fs');
  const { VERSION } = await import('../public/js/version.js');
  assert.equal(VERSION, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version);
});
