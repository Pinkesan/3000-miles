# Step 12. Highway Rush: a 60-second arcade run

**Goal.** What to play after the day's plan (DESIGN §1 rule 9: limit new words, not play).
A fast, replayable mini-game for words the player has already met: quick recognition
builds automaticity, and three strikes make every answer tense. It never changes the
spaced-repetition state, so it can't break honest progress, and it can be played as often
as the player likes. On 2026-09-25 this step moved up to right after Step 7 (it used to
come after Step 11), so the word detail (`#/word/<id>`, Step 10) and the version bump
(Step 11) don't exist yet.

**Read first.** DESIGN §1 rule 9, §4 (`meaning`, `word`, `listen`, Distractors), §5 (leg
step 2: `newCap`, `newLeft`), §7 (home, results, `#/arcade`), §8 (Traffic cones, Motion);
`public/js/quiz.js` (API), `public/js/components/question.js` (API),
`public/js/summary.js` (`tankFill`), `public/js/screens/home.js`,
`public/js/screens/results.js`, `public/js/sfx.js`, `public/js/icons.js`.

## Rules

- Unlocks when at least 40 words have a card (`b >= 1`), and opens each day once today's
  plan is done (`tankFill(plan) >= 1`), so it never replaces the day's reviews. Screen
  `#/arcade`; opening it while it is closed goes home.
- Home (DESIGN §7): once unlocked, a Highway Rush link with the best score, or the muted
  line "เปิดเมื่อขับครบแผนวันนี้" while today's plan isn't done. When nothing is left to
  drive today (the `#day-done` note), a primary **Highway Rush** button under the note.
- Results: when neither ขับต่อ nor ขับเพิ่ม is offered and Highway Rush is open, it is the
  primary button and กลับหน้าแรก the secondary one.
- A run lasts 60 seconds or until the third strike. Questions are picked at random among
  `meaning`, `word` and (with a voice) `listen`, from words with a card, except words due
  today and not graded today (`d <= today && g !== today`: a run must not review them
  early); lower boxes are picked more often (weight `9 − b`). Options come from
  `makeQuestion`, so look-alikes are in (DESIGN §4).
- Speed starts at 40 mph. Right: +5 mph (max 120) and score += current speed. Wrong: −10 mph
  (min 20), the right answer flashes for 600 ms, and one of the 3 traffic cones falls (a
  strike). No re-asks, no skip.
- The road (lane dashes) scrolls faster with speed (CSS animation duration from the speed);
  reduced motion → a static road and a speed number only.
- End: score, best (`state.arcade.best`), right/wrong, the missed words with their Thai
  meaning (`w` + `th`, like the results word list; Step 10 turns them into links to
  `#/word/<id>`); keep the last 20 runs in `state.arcade.runs` (`{ day, score, right,
  wrong }`). Buttons **เล่นอีกครั้ง** / **กลับหน้าแรก**.
- Keyboard 1–4; a countdown 3-2-1 before the run (skippable with Enter).
- Pure logic in `public/js/arcade.js` (`arcadeOpen`, `arcadePool`, `weightedPick`,
  `nextSpeed`, `scoreFor`, `strikesLeft`, `runSummary`) with tests: the third wrong answer
  ends the run; closed below 40 cards and before the plan is done; the pool leaves out
  words due and not graded today; SRS untouched (the `cards` object is identical after a
  run).

## ui-check

Scene `arcade`: seed 60 cards and a finished plan for today, start a run, answer 10
questions quickly (2 wrong: two cones down), then force the timer to the end through a test
hook (test mode only: `__app.endRun()`), shoot the run and the results. A second run with 3
wrong answers ends by itself. With the plan not done, home shows "เปิดเมื่อขับครบแผนวันนี้"
and `#/arcade` goes home. Scene `done`: seed at least 40 cards; home shows the Highway Rush
button under `#day-done`, and results offer it as the primary button. Add the screen to
`mobile` and `dark`.

## Done when

`npm test` and `npm run ui` pass.
