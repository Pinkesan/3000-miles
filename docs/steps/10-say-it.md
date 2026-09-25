# Step 10. Say it: a speaking question type (optional)

**Goal.** For strong words, the player says the English word out loud instead of typing it,
which practices pronunciation for the trip. Speech recognition is unreliable for single
words, so a recognition miss must never cost the player a word.

**Read first.** DESIGN §4; `public/js/quiz.js`, the drive screen's question rendering,
`public/js/screens/settings.js`, and from Journey to America (read-only)
`C:\Users\Pinke\Desktop\ผลงาน\06-j1-quest\public\js\speech.js` (`createListener`,
`MIC_ERRORS`, `canListen`).

## Rules

- Setting **โหมดพูด** (off by default; hidden when `canListen()` is false). The first time
  it is turned on, explain that Chrome/Edge send audio to the browser maker's speech service.
- New type `say` for box ≥ 4 when the setting is on and `canListen()`: it replaces `spell`
  half of the time (`allowedTypes` gets `canSay` in its caps; update the DESIGN §4 table).
- Prompt: `th` + POS + a mic button (Space also starts/stops). Recognition `en-US`,
  `maxAlternatives: 5`, no interim results.
- Right when any alternative, after `norm`, equals `w` or contains it as a whole word (for
  phrases: contains the phrase). Also accept `alt` spellings.
- A miss shows "ได้ยินว่า: …" and allows one more try. After two misses the question turns
  into a `spell` question for the same word (graded normally). Mic errors (no permission,
  no speech) → the same fallback with the message from `MIC_ERRORS`.
- Pure parts (`sayMatches(alternatives, word)`) in `quiz.js` with tests (homophone-like
  misses such as "bear" for "bare" are simply wrong; no fuzzy matching).

## ui-check

Recognition can't run headless: stub `SpeechRecognition` in the page (like the speech
synthesis stub) to return scripted alternatives; scene `say`: one right answer, one miss
then right, one double miss → falls back to spell.

## Done when

`npm test` and `npm run ui` pass; version bumped; the user tried it once on their phone
(ask them in the report).
