# Step 8. Fast Lane: skip a level you already know

**Goal.** A player who already knows most A1 (or A2…) words shouldn't spend weeks meeting
them one by one. A short test per level lets them fast-travel: the level's words go
straight into spaced review, and each one still has to be answered right once to become a
mile. Rule 7 of DESIGN §1.

**Read first.** DESIGN §3, §4 (`word` type), §5; `public/js/plan.js`, `public/js/srs.js`,
`public/js/screens/home.js`, `public/js/screens/drive.js` (how questions render; reuse its
rendering functions, move shared parts to `public/js/components/question.js` if needed).

## Rules

- Entry: home shows **Fast Lane** when some level has at least 100 words with content and
  at least 60% of them still new. Screen `#/fastlane`: choose a level (shows words with
  content / still new).
- One test per level per day (`state.fastlane[level] = day`; add `fastlane: {}` to
  `freshState`/`normalizeState` and to DESIGN §10).
- Test = 30 random new words of that level (seeded by day + level), each a `word` question
  (Thai → pick the English word). An 8-second bar per question; time out = wrong. No
  feedback between questions (it is a fast lane); a results list at the end.
- Tested words: right → `knowCard` (a mile, `k: 1`); wrong → unchanged (stay new).
- Score ≥ 27/30 → offer **ข้ามระดับนี้** (confirmBox explains: all other new words of the
  level go into review over the next 30 days, and each becomes a mile after one right
  answer). Accepting gives every other new word of the level, in intro order,
  `{ b: 2, d: today + 1 + (i % 30), g: today, n: 0, r: 0, l: 0, k: 1 }`.
  Score < 27 → "ระดับนี้ยังมีคำใหม่ให้เรียนอีกเยอะ ค่อยๆ ขับไปนะ".
- Today's plan doesn't change (fast-travelled words are due from tomorrow). The due cap
  (100 a day) keeps the days light.
- Pure logic in `public/js/fastlane.js`: `canOffer(words, cards, level)`,
  `pickTestWords(words, cards, level, rnd)`, `applyTest(cards, results, today, miles)`,
  `fastTravel(cards, order, level, today)`; tests for each, including that fast-travelled
  cards spread over 30 days and that a right first review makes a mile (b 2 → 3).

## ui-check

Scene `fastlane`: seed nothing, open `#/fastlane`, take the A1 test answering 28 right and
2 wrong, accept the skip, check the card count and due spread through `evaluate`, and
shoot the level chooser, a question and the results.

## Done when

`npm test` and `npm run ui` pass; version bumped (Step 7 rule).
