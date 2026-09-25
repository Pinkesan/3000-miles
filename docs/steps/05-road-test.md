# Step 5. Road test: ask before teaching

**Goal.** A new word is asked before it is shown. A known word costs one quick answer and
one typed answer, then it is a mile; an unknown word gets the lesson and a typed recall.
The free mile of "รู้จักคำนี้แล้ว" goes away, and the player can pick the level to start
from. First of the steps that make the game harder (DESIGN §1 was rewritten on 2026-09-25
after the user found Step 4 too easy).

**Read first.** DESIGN §1 (rules), §3 (Taught new word, Known word), §4 (item kinds, the
probe / confirm / check rows, Probe, Stage tags, Keyboard, Meet card), §5 (Day plan, Leg,
New word flow, In a leg), §7 (Start-level tip); `public/js/plan.js`, `public/js/quiz.js`
(`allowedTypes`), `public/js/summary.js`, `public/js/screens/drive.js`,
`public/js/screens/results.js`, `public/js/screens/home.js`,
`public/js/components/wordcard.js`; in `test/engine.test.mjs` only the `quiz:` and `plan:`
tests; in `tools/ui-check.mjs` `playLeg` and the `home`, `drive`, `resume` scenes.

## Engine (pure)

1. `quiz.js`: `allowedTypes(box, …)` takes `'probe'` → `meaning`, `'confirm'` and
   `'check'` → `spell` (gapOnly: `gap`, `gapType`, `gapType`). `0` and `'know'` go away.
   The numeric rows and the letter hints stay as they are until Step 6.
2. `plan.js`:
   - Item kinds `probe | meet | check | confirm | review | reask`; `know` goes away.
     `CHECK_GAP = 4`, new `CONFIRM_GAP = 6`, new `EXTRA_NEW = 10`. Remove `LEG_NEW_CAP`,
     `needsExtraNew` and `extraNewWord`: known words now count toward `newTarget`, so no
     extra word is needed after one.
   - `newWordItems(id, word)` → `[{ key: 'probe-<id>', id, kind: 'probe', type,
     confirmType, checkType }]` (the two later types come from `allowedTypes`, so
     `legReduce` needs no word).
   - `buildLeg`: new words while `taught + known + new in this leg < newTarget`; an extra
     leg takes up to `EXTRA_NEW`; both still capped by `DAY_NEW_CAP`. Reviews and probes
     are interleaved R R P R R P …, then the rest. No checks at build time. `leg.v = 2`.
   - `legReduce`, an `answer` on a probe: right → `{ key: 'confirm-<id>', kind: 'confirm',
     type: confirmType }` CONFIRM_GAP items later (or last); wrong → `[meet, …rest]` with
     `{ key: 'check-<id>', kind: 'check', type: checkType }` CHECK_GAP items after the meet
     (or last). A probe is never re-asked. New event `{ type: 'skip' }` (ไม่รู้จักคำนี้,
     probes only): like a wrong probe, `leg.done + 1`. `{ type: 'meet' }` only drops the meet.
     Other answers as before (a wrong confirm or check gets a re-ask).
   - `recordAnswer`: `probe` → no card, counts in `right`/`wrong` (plan and leg stats),
     `graded: false`. `confirm` → right: `knowCard` (a mile, `known + 1`); wrong:
     `teachCard(today, false)` (`taught + 1`). `check` → `teachCard` (`taught + 1`).
     For both: `plan.done + 1` while `taught + known <= newTarget`. `review`, `reask` as
     before.
3. `summary.js`: `levelTip(plan, startLevel)` → `{ known, total }` when DESIGN §7's
   start-level tip applies, else `null`.
4. Tests (rewrite the `know` tests rather than deleting them): R R P order; a right probe
   puts its confirm 6 items later, or last in a short queue; a wrong probe and a skip put the
   meet first and the check 4 items after it; a probe is never re-asked; right confirm →
   mile + `known`; wrong confirm → b 1 + `taught` + a re-ask; probe answers change no card;
   known words count toward `done` and stop new words at `newTarget`; an extra leg takes
   10; the whole-day test and the `words.json` smoke test still finish (answer probes right
   and wrong); `levelTip` thresholds (4 vs 5 words, 79% vs 80%, B2 never).

## Drive, results, home

5. `drive.js`:
   - A saved leg without `v: 2` is dropped (its answers are saved already); build a new one.
   - Probe: the `meaning` question (spoken with autoplay) plus **ไม่รู้จักคำนี้**
     (`class="btn btn-secondary btn-skip"`, key `0`) under the options. Right → the usual
     feedback and auto-advance. Wrong → red/green options, "ยังไม่ใช่ คำตอบคือ …", no mini
     card, the button **เรียนคำนี้** → the Meet card. Skip → the Meet card at once.
   - Meet card: one button, **จำแล้ว**. Remove `onKnow` and its button from `wordcard.js`.
   - Stage tags per DESIGN §4. A right confirm plays the new-mile moment (sound, +1 ไมล์).
   - Remove the `extraNewWord` call.
6. `results.js`: `canContinue` counts `taught + known` against `newTarget`; the start-level
   tip from `levelTip` under the stats ("… เปลี่ยนได้ที่หน้าแรก", a link to `#/`).
7. Home: a temporary select **เริ่มจากระดับ** (A1/A2/B1/B2, each with the number of words
   that have content: "B1 · 100 คำ") under คำใหม่ต่อวัน. It saves `settings.startLevel`
   and sets `app.order = introOrder(app.words, level)`. Step 10 moves both selects to
   settings.

## ui-check

8. `playLeg` policy: probes → right, skip, wrong, then alternate right / skip; meet →
   จำแล้ว; the 2nd typed answer wrong ("zzz"), all other answers right. Checks: the Meet
   card follows the skip and the wrong probe; the Meet card has one button; a right confirm
   shows "+1 ไมล์". Shots: `drive-probe`, `drive-probe-wrong`, `drive-meet`, `drive-confirm`.
9. `drive`: day one now shows `meaning` and `spell` (not `word`). `resume`: probe right,
   probe skip, reload → same item; then write a saved leg without `v` into localStorage and
   open `#/drive`: a new leg starts, no JS errors. `home`: set เริ่มจากระดับ to B1 and back;
   it is saved.

## Done when

`npm test` and `npm run ui` pass; look at `drive-probe`, `drive-probe-wrong` and
`drive-confirm` at 390×844. DESIGN already describes this step (the short hint of the
confirm comes in Step 6); if the code has to differ, write it in the Log.
