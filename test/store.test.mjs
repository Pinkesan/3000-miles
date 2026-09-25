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
