import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newlyReached, reachedStops, carFraction } from '../public/js/progress.js';

const route = JSON.parse(readFileSync(new URL('../public/data/route.json', import.meta.url), 'utf8'));
const COLORS = ['sign', 'sunset', 'sky', 'desert'];

test('route.json: 16 stops from 0 to total, strictly increasing', () => {
  assert.equal(route.stops.length, 16);
  assert.equal(route.stops[0].at, 0);
  assert.equal(route.stops.at(-1).at, route.total);
  assert.equal(route.total, 3000);
  route.stops.forEach((s, i) => {
    if (i) assert.ok(s.at > route.stops[i - 1].at, `${s.id} is after the previous stop`);
  });
});

test('route.json: every field present, colors rotate', () => {
  const ids = new Set();
  route.stops.forEach((s, i) => {
    for (const k of ['id', 'city', 'state', 'fact', 'factTh', 'color']) assert.ok(s[k], `${s.id}: ${k}`);
    assert.ok(Number.isInteger(s.at));
    assert.equal(s.color, COLORS[i % 4]);
    ids.add(s.id);
  });
  assert.equal(ids.size, 16);
});

test('newlyReached: stops passed and not unlocked yet, never New York', () => {
  assert.deepEqual(newlyReached(route, 0, {}), []);
  assert.deepEqual(newlyReached(route, 89, {}), []);
  assert.deepEqual(newlyReached(route, 90, {}).map((s) => s.id), ['philadelphia']);
  assert.deepEqual(newlyReached(route, 250, {}).map((s) => s.id), ['philadelphia', 'washington']);
  assert.deepEqual(newlyReached(route, 250, { philadelphia: 20500 }).map((s) => s.id), ['washington']);
});

test('reachedStops and carFraction agree with the route', () => {
  assert.deepEqual(reachedStops(route, 89, 90).map((s) => s.id), ['philadelphia']);
  assert.equal(carFraction(route, 0), 0);
  assert.equal(carFraction(route, 3000), 1);
  assert.ok(carFraction(route, 600) > carFraction(route, 565));
});
