# Step 7. Score, combo, stars

**Goal.** Every answer counts: points for right answers, a multiplier for right answers in
a row, a bonus for fast multiple-choice answers shown by a draining speed bar, 1–3 stars
per leg and records to beat. Nothing here touches word state (DESIGN §1 rule 8).

**Read first.** DESIGN §6 (Score, combo and stars), §7 (drive, results, home rows), §8
(Combo chip, Speed bar, Stars, Motion), §9, §10 (`records`); `public/js/screens/drive.js`,
`public/js/components/question.js`, `public/js/screens/results.js`,
`public/js/screens/home.js`, `public/js/summary.js`, `public/js/store.js`,
`public/js/sfx.js`, `public/js/icons.js`; in `public/js/plan.js` only `makeDayPlan` and
`buildLeg`.

## Tasks

1. `public/js/score.js` (pure, CLAUDE.md rule 1):
   - `POINTS`, `speedFactor(type, ms)`, `comboMultiplier(combo)`.
   - `scoreAnswer(s, { type, kind, correct, skipped, ms })` → `{ score, combo, bestCombo,
     points }` where `s = { score, combo, bestCombo }`; re-asks and skips are neutral.
   - `legStars({ right, wrong })` → 1–3, or `null` with no answers.
   - `updateRecords(records, { combo, dayScore, today })` → `{ records, newCombo, newDay }`.
   - Tests for every rule of DESIGN §6, with the boundaries: 4/5, 9/10, 19/20 in a row;
     3000/3001 and 6000/6001 ms; typed types never get a speed bonus; rounding; stars at
     95% and 80%; a re-ask or skip after 7 right keeps combo 7 and adds 0 points.
2. State: `records: { combo: 0, day: 0, dayOn: null }` in `freshState` / `normalizeState`
   (+ a store test); `score: 0` in `makeDayPlan` (a plan without it counts as 0);
   `leg.score = { score: 0, combo: 0, bestCombo: 0 }` in `buildLeg` (a saved leg without it
   starts at 0).
3. Drive: time each question from the moment it is shown to the answer
   (`performance.now()`; restart the clock after a reload). Every answer (and a skip) goes
   through `scoreAnswer`; save the leg score with the leg and add points to `plan.score`.
   Top bar: the leg score beside `n / total`; the combo chip (DESIGN §8) from 3 in a row;
   "+P" beside the score for 900 ms after a right answer; `sfx.combo()` (a short rising
   tone, add it to `sfx.js`) when the multiplier steps up. No horizontal scroll at 360px;
   the lane keeps at least 120px.
4. Speed bar (DESIGN §8) in the question component, multiple-choice questions of the drive
   only (an option, off by default, so checkpoints and Highway Rush don't get it). It stops
   where it is when the player answers; hidden with reduced motion.
5. Leg end: `lastLeg` gets `score`, `stars`, `bestCombo`; `updateRecords` with today's
   `plan.score`; save. Results: the score big, the stars (add `star` and `starEmpty` to
   `icons.js`), "ติดกันสูงสุด N", and a "สถิติใหม่: …" line per record beaten (DESIGN §9).
   Keep the existing numbers under them.
6. Home: "คะแนนวันนี้ N · สถิติ M" under the plan line once any score exists.

## ui-check

7. `drive`: answer the first 5 counted questions right and shoot the combo chip
   (`drive-combo`); after the leg `lastLeg.score > 0` and `stars` is 1–3; the results show
   the score and the stars. `mobile`: the drive top bar with a combo at 360px has no
   horizontal scroll. Reduced motion (`Emulation.setEmulatedMedia` with
   `prefers-reduced-motion: reduce`): the speed bar is hidden.

## Done when

`npm test` and `npm run ui` pass; look at the drive top bar and the results at 390×844
and 1366×768, both themes.
