# Step 9. Checkpoints: an exam at every city

**Goal.** A boss at every stop: a typed exam on the words of that part of the trip. Pass it
to get the postcard, try once a day, and missed words become flat tires. Miles never go
down, but the car waits at the city limits until the exam is passed.

**Read first.** DESIGN §3 (Checkpoint answers), §4 (`exam` row, Stage tags), §6 (the line
under the route table, Checkpoints), §7 (home, results, checkpoint, map rows), §8
(Checkpoint, Stars), §9, §10; `public/js/progress.js` (API), `public/js/quiz.js` (API),
`public/js/components/question.js` (API), `public/js/screens/results.js`,
`public/js/screens/home.js`, `public/js/screens/map.js`, `public/js/main.js`,
`public/js/store.js`; in `tools/ui-check.mjs` the `arrive` and `map` scenes.

## Engine (pure): `public/js/checkpoint.js`

1. Functions, each with tests:
   - `cleared(stopId, checkpoints, stops)`: passed, or the postcard is already unlocked
     (stops unlocked in Step 8 count as cleared, without stars).
   - `openCheckpoint(route, miles, checkpoints, stops)` → the first stop after New York
     with `at <= miles` that isn't cleared, or `null`.
   - `canTry(cp, today)`: not finished an exam of this stop today.
   - `examWords(cards, route, stopId, rnd)` → 15 ids sampled from `stopWords` (all of them
     if fewer); `santa-monica`: 30 from all mile words.
   - `examItems(ids, byId, caps, rnd)` → `{ key: 'exam-<id>', id, kind: 'exam', type, hint:
     'short' }` with types from the `exam` row (`chooseType('exam', …)`).
   - `examAnswer(cards, id, correct, today, miles)` → `{ cards, graded }` (DESIGN §3: a
     miss on a word not graded today → `gradeCard(card, false, …)`; otherwise unchanged).
   - `examResult(right, total)` → `{ pct, passed, stars }` (pass 80%, ★★ 90%, ★★★ 100%).
   - `recordTry(cp, result, today)` → the new `checkpoints[id]` (`tries + 1`, `last =
     today`, `best` never goes down, `passed` keeps its first day).
   - `mapMiles(route, miles, checkpoints, stops)` → the open checkpoint's `at`, else `miles`.
   Test cases: 12/15 passes with ★, 11/15 fails, 14/15 ★★, 15/15 ★★★; Santa Monica takes
   30; a right answer and a word graded today leave `cards` unchanged; a miss on a mile
   word sets `f`; `openCheckpoint` skips cleared stops and returns them in route order.
2. State: `checkpoints: {}` and `exam: null` in `freshState` / `normalizeState` (+ a store
   test).

## Screens

3. `public/js/screens/checkpoint.js` (`#/checkpoint/<id>`; allowed for the open checkpoint
   and for cleared ones (more stars), else → home):
   - Intro: the city on a checkpoint sign (DESIGN §8), "N คำ · ผ่าน ⌈0.8N⌉ คำขึ้นไป · สอบได้
     วันละครั้ง", the best stars, **เริ่มสอบ** (after today's try: disabled, "ลองใหม่พรุ่งนี้").
   - The exam: `questionView` per item (no speed bar, no re-asks, no skip), stage tag
     "ด่านตรวจ" + `n / N`; after each answer ✓/✗ (the answer on a miss) and **ต่อไป**.
     Apply `examAnswer` and save after every answer. `state.exam = { day, stopId, items,
     done, right, missed }` lets a reload continue; it is dropped when the day changes (the
     answers already saved stay).
   - The end: `right / N`, the stars, "ผ่านด่านแล้ว! ได้โปสการ์ดใบใหม่" or "ยังไม่ผ่าน ต้องได้
     ⌈0.8N⌉ จาก N ลองใหม่พรุ่งนี้", the missed words (w + th), **รับโปสการ์ด** (a first pass:
     `state.stops[id] = today`, `sfx.stop()`, then `#/postcard/<id>`) and **กลับหน้าแรก**.
     `recordTry` and `state.exam = null` are saved when the end shows.
   - Test hooks like the drive: `app.hooks = { item, question }`.
4. Reaching a stop now opens its checkpoint: `unlockReached` (Step 8) no longer unlocks
   postcards; the results show "ถึงด่านตรวจ <city> แล้ว" + **เข้าด่าน** instead.
5. Home: while `openCheckpoint` exists, the guide sign reads `CHECKPOINT` · city ·
   "สอบผ่านเพื่อไปต่อ" with the barrier stripe, and **เข้าด่าน** (secondary) sits under the
   main button; after today's try it says "ลองใหม่พรุ่งนี้" instead of the button.
6. Map: the car at `carFraction(route, mapMiles(…))`; a barrier on the open checkpoint's
   marker; 1–3 small stars under stops with a pass. Postcard tiles follow `state.stops`.

## ui-check

7. `checkpoint`: seed cards with `m` 1..100 on 100 real ids (miles 100; spread their `d`
   so few are due). Home shows the Philadelphia checkpoint; the exam, 13 right and 2 wrong
   → passed with ★; those 2 cards have `f`; `stops.philadelphia` is set; the postcard
   opens; home shows no checkpoint (Washington opens at 215). Then a fresh run of the same
   seed with 11 right → failed; home says ลองใหม่พรุ่งนี้; `mapMiles` = 90 (the car waits).
   Reload in the middle of an exam once: it continues at the same question. Shots: intro,
   a question, the pass end, the fail end, the map with the barrier.
8. `arrive` (Step 8): now expects "ถึงด่านตรวจ" and **เข้าด่าน** instead of the postcard
   button. Add the checkpoint intro and a question to `mobile` and `dark`.

## Done when

`npm test` and `npm run ui` pass; the checkpoint screens look right at 390×844 and
1366×768 in both themes.
