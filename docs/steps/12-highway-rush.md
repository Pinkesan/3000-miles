# Step 12. Highway Rush: a 60-second arcade run

**Goal.** A fast, replayable mini-game for words the player has already met: quick
recognition builds automaticity, and three strikes make every answer tense. It never
changes the spaced-repetition state, so it can't break honest progress.

**Read first.** DESIGN §4 (`meaning`, `word`, `listen`, Distractors), §8 (Traffic cones,
Motion); `public/js/quiz.js` (API), `public/js/components/question.js` (API),
`public/js/screens/home.js`, `public/js/sfx.js`, `public/js/icons.js`.

## Rules

- Unlocks when at least 40 words have a card (`b >= 1`). Home shows **Highway Rush** with the
  best score; screen `#/arcade`.
- A run lasts 60 seconds or until the third strike. Questions are picked at random among
  `meaning`, `word` and (with a voice) `listen`, from words with a card; lower boxes are
  picked more often (weight `9 − b`). Options come from `makeQuestion`, so look-alikes are
  in (DESIGN §4).
- Speed starts at 40 mph. Right: +5 mph (max 120) and score += current speed. Wrong: −10 mph
  (min 20), the right answer flashes for 600 ms, and one of the 3 traffic cones falls (a
  strike). No re-asks, no skip.
- The road (lane dashes) scrolls faster with speed (CSS animation duration from the speed);
  reduced motion → a static road and a speed number only.
- End: score, best (`state.arcade.best`), right/wrong, wrong words as links to
  `#/word/<id>`; keep the last 20 runs in `state.arcade.runs` (`{ day, score, right, wrong }`).
  Buttons **เล่นอีกครั้ง** / **กลับหน้าแรก**.
- Keyboard 1–4; a countdown 3-2-1 before the run (skippable with Enter).
- Pure logic in `public/js/arcade.js` (`weightedPick`, `nextSpeed`, `scoreFor`,
  `strikesLeft`, `runSummary`) with tests (the third wrong answer ends the run); SRS
  untouched (test: `cards` object is identical after a run).

## ui-check

Scene `arcade`: seed 60 cards, start a run, answer 10 questions quickly (2 wrong: two cones
down), then force the timer to the end through a test hook (test mode only:
`__app.endRun()`), shoot the run and the results. A second run with 3 wrong answers ends by
itself. Add the screen to `mobile` and `dark`.

## Done when

`npm test` and `npm run ui` pass; version bumped.
