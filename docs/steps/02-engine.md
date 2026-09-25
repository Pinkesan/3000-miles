# Step 2. Game engine (pure modules + tests)

**Goal.** Every rule in DESIGN §3–§6 as small, pure, tested ES modules in `public/js/`.
No UI in this step. Later steps build on these names, so keep the API below.

**Read first.** `docs/DESIGN.md` §2–§6 (all numbers are there), the first 3 lines of
`public/data/words.json`. Don't read the tools.

**Pure means:** no `document`, `window`, `localStorage` or `Date.now()`; `today` and `rnd`
are parameters; inputs are never mutated (return new objects). Browser and Node both
import these files (`node --test`).

## Modules and API

`public/js/rng.js`
- `hashSeed(str)` (FNV-1a, 32-bit) · `makeRng(seed)` (mulberry32; seed number or string)
  → `() => number in [0, 1)` · `shuffle(arr, rnd)` (new array) · `pick(arr, rnd)` ·
  `sample(arr, n, rnd)`.

`public/js/day.js`
- `ROLLOVER_HOUR = 4` · `dayNumber(date = new Date(), rolloverHour = 4)` (DESIGN §5) ·
  `dayToDate(day)` (a local Date at noon) · `daysBetween(a, b)`.

`public/js/srs.js` (DESIGN §3)
- `INTERVAL`, `MILE_BOX = 3`, `MASTER_BOX = 6`, `MAX_BOX = 8`, `lapseBox(b)`.
- `gradeCard(card, correct, today, miles)` → `{ card, mile }` (`mile` = the new mile
  number or `null`).
- `teachCard(today, correct)` → card · `knowCard(today, miles)` → card (with `m`).
- `gradedToday(card, today)` · `isDue(card, today)` · `status(card)` →
  `'new' | 'learning' | 'flat' | 'mile' | 'mastered'` · `countMiles(cards)` ·
  `countFlat(cards)`.

`public/js/text.js`
- `norm(s)` · `glosses(th)` · `glossOverlap(thA, thB)` (DESIGN §4) ·
  `parseGap(ex)` → `{ before, target, after }` (throws unless exactly one `[...]`) ·
  `blankGap(ex, blank = '_____')` · `plain(ex)` (brackets removed) · `letterHint(s)` ·
  `acceptedSpellings(word)` · `typedCorrect(input, accepted)` ·
  `POS_LABEL` (`{ n: { en: 'n.', th: 'คำนาม' }, … }` from DESIGN §2) ·
  `posList(word)` → `"n., v."`.

`public/js/quiz.js` (DESIGN §4)
- `allowedTypes(box, word, { canListen })` → types; `box` is `0` for new-word checks,
  `'know'` for the "I know this" question.
- `chooseType(box, word, caps, rnd)` · `pickDistractors(target, pool, n, rnd)` →
  words · `makeQuestion(word, type, pool, rnd)` · `isCorrect(question, response)`.
- Question shape:
  `{ type, id, word, options?: [{ id, label }], accept?: string[], gap?: { before, target, after }, hint? }`.
  Options: `meaning`/`listen` → label = `th`; `word`/`gap` → label = `w`; the right
  option's `id` is the word id. `spell` → `accept = acceptedSpellings(word)`,
  `hint = letterHint(word.w)`; `gapType` → `accept = [gap.target]`,
  `hint = letterHint(gap.target)`.

`public/js/plan.js` (DESIGN §5)
- Constants: `DUE_CAP = 100, LEG_SIZE = 20, LEG_REVIEWS = 14, CHECK_GAP = 3,
  REASK_GAP = 3, MAX_REASKS = 2, DAY_NEW_CAP = 100, LEG_NEW_CAP = 40`.
- `introOrder(words, startLevel = 'A1', seed = '3000-miles')` → ids.
- `makeDayPlan(cards, today, settings)` → `{ day, due, dueTotal, newTarget, goal, done: 0,
  taught: 0, known: 0, right: 0, wrong: 0, miles: 0, legs: 0, shown: [] }`.
- `nextNew(order, cards, plan, n, exclude = new Set())` → up to n ids.
- `buildLeg({ plan, cards, byId, order, today, rnd, caps, extra = false })` →
  `{ leg, plan }` (plan gets the new ids in `shown` and `legs + 1`).
  `leg = { day, queue: [item], done: 0, reasks: {}, newCount, startMiles, stats: { right,
  wrong, taught, known, reviewed, miles } }`,
  `item = { key, id, kind: 'meet' | 'check' | 'know' | 'review' | 'reask', type }`.
  Order and limits exactly as DESIGN §5. `extra: true` → new words only (ขับเพิ่ม).
- `legCurrent(leg)` → `queue[0]` or `null` · `legProgress(leg)` → `done / (done + queue.length)`.
- `legReduce(leg, event)` → new leg. Events:
  - `{ type: 'meet', know: false }`: drop the meet item.
  - `{ type: 'meet', know: true }`: drop the meet item and that word's pending check;
    put a `know` item (type `word`, or `gap` for `gapOnly`) first.
  - `{ type: 'answer', correct }`: drop the item, `done + 1`. A wrong `know` → a new meet
    item first and a check item after `CHECK_GAP` items. Any other wrong answer → a
    `reask` item (same type) after `REASK_GAP` items, while `reasks[id] < MAX_REASKS`.
  - `{ type: 'add', items }`: append (used for the extra new word after a right `know`).
- `newWordItems(id, word, rnd)` → `[meet, check]` · `needsExtraNew(plan, leg)` → boolean
  (DESIGN §5: plan still short of `newTarget` counting pending checks, and the caps).
- `recordAnswer({ cards, plan, leg, today, item, correct })` →
  `{ cards, plan, leg, mile, graded }`: applies DESIGN §3 by item kind — `review`:
  grade once a day, `done + 1` if the id is in `plan.due`; `check`: teach, `taught + 1`,
  `done + 1` while `taught <= newTarget`; `know`: right → `knowCard` + `known + 1`;
  `reask`: nothing. `plan.right/wrong` and `leg.stats` count graded answers only; every
  new mile adds 1 to `plan.miles` and `leg.stats.miles`.

`public/js/progress.js` (DESIGN §6)
- `tank(plan)` · `rollover(streak, today)` · `fillTank(streak, today)` ·
  `nextStop(route, miles)` · `lastStop(route, miles)` ·
  `reachedStops(route, before, after)` → stops · `stopWords(cards, route, stopId)` →
  ids sorted by `m` · `carFraction(route, miles)` → 0..1 along the map (stops evenly
  spaced; position inside a segment by miles).

## Tests (`test/engine.test.mjs`, split into more files if long)

Use small fake word lists built in the test (a dozen words), not `words.json`, except one
smoke test that runs a whole leg on the real `words.json`.

- rng: same seed → same sequence; shuffle keeps all elements.
- day: 03:59 belongs to the day before, 04:00 to the new day; a month end; a year end.
- srs: correct climbs with the right intervals; box 8 stays 8; wrong from 1, 3, 5, 8 gives
  1, 1, 3, 3 and `d = today + 1`; the first time a card reaches box 3 it gets `m = miles + 1`
  and never loses it; `f` set on a wrong mile word and cleared by the next right answer;
  `status` for all five cases.
- text: `norm`, `glossOverlap` ("ใหญ่" vs "ใหญ่มาก" overlap; "ใจ" vs "ใจดี" don't, the
  shorter has 2 characters), `parseGap` errors, `letterHint` for banana, T-shirt,
  ice cream, o'clock; `acceptedSpellings` for `a, an` and `alt`.
- quiz: every row of the §4 table; `listen` dropped without a voice; `gapOnly`;
  distractors never include a same-`w` word or an overlapping gloss, and fall back to other
  POS when needed; `isCorrect` for options and typed answers.
- plan: intro order starts at `startLevel` and is stable for a seed; plan caps due at 100
  and sets `newTarget = 0` when more than 100 are due; leg order R R N R R N; check after 3
  items; reask after 3 items and at most 2; `know` right/wrong paths; a word graded earlier
  today is practice only (`graded: false`); `done` and `tank` numbers; extra leg = new only;
  `DAY_NEW_CAP` respected.
- progress: streak +1 on consecutive days, reset after a gap, rests used and earned at 7 and
  capped at 2; `nextStop` at 0, between stops, at 3000; `reachedStops` across two stops;
  `stopWords` bounds.

## Done when

- `npm test` passes (aim for 50+ assertions across the modules).
- `grep -nE "document|window|localStorage|Date\.now" public/js/{rng,day,srs,text,quiz,plan,progress}.js`
  prints nothing.
- Log line lists the exported API if it differs from this file in any way.
