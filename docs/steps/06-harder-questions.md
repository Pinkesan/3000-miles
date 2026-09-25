# Step 6. Harder questions: look-alike options, early typing, dictation, short hints

**Goal.** Multiple choice stops being a giveaway (look-alike options), typing becomes the
main diet from box 2, a new `dictation` type trains the ear, and strong words get shorter
hints. The question rendering moves into a component that checkpoints (Step 9) and Highway
Rush (Step 12) will reuse.

**Read first.** DESIGN §4 (all of it); `public/js/quiz.js`, `public/js/text.js`,
`public/js/plan.js` (`buildLeg`, `newWordItems`, the re-ask part of `legReduce`),
`public/js/screens/drive.js`; in `test/engine.test.mjs` only the `text:` and `quiz:` tests;
in `tools/ui-check.mjs` `playLeg`, `reviewCards` and the `types` scene.

## Engine (pure)

1. `text.js`: `editDistance(a, b)` (Levenshtein) and `shortHint(s)` (DESIGN §4). Tests:
   band/bank 1, quiet/quite 2, accept/except 2, `banana` → `b…`, `ice cream` → `i… c…`,
   `T-shirt` → `T…`.
2. `quiz.js`:
   - The DESIGN §4 table for boxes 1–8 and an `'exam'` row; `dictation` needs `canListen`;
     gapOnly per §4; the fallback when nothing is left.
   - `lookAlike(a, b)` (words, not strings: compares the lowercase first forms) and the
     look-alike tier at the front of `pickDistractors`: up to 2, closest first, ties
     shuffled with `rnd`, the same skips as the other tiers. The old tiers fill the rest.
   - `makeQuestion(word, type, pool, rnd, { hint = 'full' } = {})`: `spell` / `gapType` get
     `letterHint` or `shortHint`; `dictation` → `accept = acceptedSpellings(word)`,
     `hint: null`.
   - `synonymOf(input, target, pool)` → the other word of DESIGN §4 Synonym retry, or `null`.
3. `plan.js`: every item carries `hint`: reviews `'short'` when the card's box ≥ 4, else
   `'full'` (set in `buildLeg`); confirm `'short'` and check `'full'` (set in `legReduce`
   where those items are made); re-asks copy it; an item without `hint` (older saved legs)
   means `'full'`. The drive passes `{ hint: item.hint }` to `makeQuestion`.
4. Tests: each row of the §4 table, with and without a voice, and for gapOnly; look-alikes
   are chosen when they exist (a small pool: band, bank, bend, hand, apple, river, …),
   never more than 2, never with an overlapping gloss, and the old tiers fill up;
   `makeQuestion` hints (full, short, none for dictation); `synonymOf` (bike / bicycle-like
   pair with overlapping Thai → found; an unrelated word, a non-word or the target → `null`).

## Question component

5. Move prompt, options / input and feedback painting from `drive.js` into
   `public/js/components/question.js`. Suggested API: `questionView(app, q, { tag, canSkip,
   onAnswer, onSkip, onNext })` → `{ el, paint(correct, response), replay(), focus() }`.
   `drive.js` keeps the leg flow, the top bar, saving and the key routing. Run
   `ONLY=drive,types` now: nothing may change for the player. If the session is getting
   long, commit here, log what is left, and continue next session.
6. `dictation` in the component (DESIGN §4 table): the big 🔊 button (spoken at once;
   replays alternate rate 0.75 / normal, like `listen`), POS label, `th` small and muted,
   the typed input focused, no hint.
7. Synonym retry for `spell` / `gapType` (DESIGN §4): not graded, the message under the
   input, the input cleared and focused, once per question.

## ui-check

8. `types` (390×844): change the boxes in `reviewCards` so that with seed 1 the reviews
   show `word listen gap spell gapType dictation` (`meaning` is checked in `drive`: probes).
   Shoot `m-drive-dictation` and a question with a short hint.
9. Look-alikes: when a `word` or `gap` question appears for a word that has look-alikes
   among the loaded words (check in the page with `await import('./js/quiz.js')`), at least
   one option must be a look-alike.
10. Synonym retry: a1-01 has `bike` (รถจักรยาน) and `bicycle` (จักรยาน). Seed a card for
    `bicycle` in box 5 and a saved leg (`v: 2`, `day: 20500`) whose only item is
    `{ key: 'review-bicycle', id: 'bicycle', kind: 'review', type: 'spell', hint: 'short' }`;
    open `#/drive`, type `bike` → the retry message and the card unchanged, then `bicycle`
    → right.

## Done when

`npm test` and `npm run ui` pass; look at a dictation question, a short-hint question and
a look-alike question at 390×844.
