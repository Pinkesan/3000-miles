# Step 4. The drive: legs, questions, results (first playable version)

**Goal.** The user can play: start a leg from home, meet new words, answer all six
question types, get feedback, finish with a results screen, and come back tomorrow to
reviews. Progress survives reloads and closed tabs.

**Read first.** DESIGN §4, §5, §7 (drive, results), §9; `public/js/plan.js` (API only),
`public/js/quiz.js` (API only), `public/js/main.js`, `public/js/store.js`,
`public/js/components/wordcard.js`, `public/js/speech.js`, `public/js/sfx.js`,
`tools/ui-check.mjs`.

## Tasks

1. `public/js/screens/drive.js` (`#/drive`)
   - Resume `state.leg` if it belongs to today; otherwise `buildLeg` (normal while the plan
     isn't done, `extra: true` after) and save it. Nothing to do → a short message and a
     link home (DESIGN §9 tone).
   - Top bar: exit button (confirmBox "ออกจากช่วงนี้? คำที่ตอบแล้วบันทึกไว้แล้ว"), the
     leg lane with the car moving by `legProgress`, `n / total`.
   - `meet` item: the word card + **จำแล้ว** / **รู้จักคำนี้แล้ว** → `legReduce`.
   - Question items: `makeQuestion(word, item.type, app.words, makeRng(`${day}:${item.key}`))`
     so a reload shows the same options. Render per type (DESIGN §4 table): options as
     numbered full-width buttons; `listen` with a big speaker button; `spell` and `gapType`
     with the letter hint, an input and **ตรวจคำตอบ**; gap sentences with the blank and
     `exTh`.
   - Answer → `isCorrect` → `recordAnswer` → `legReduce` → `store.update` (save) →
     feedback (DESIGN §4: colors + ✓/✗, sound, speech, mini word card when wrong, auto
     advance for meaning/word/listen when right). After a right `know` answer, if
     `needsExtraNew(plan, leg)`, add `newWordItems` for `nextNew(...)`.
   - New mile → `sfx.mile()` and a small "+1 ไมล์" near the odometer chip in the top bar.
   - Keyboard: 1–4, Enter, Space (replay, not while typing), Esc (exit). Inputs follow
     DESIGN §4 attributes; focus the input when a typing question appears.
   - Leg finished → `state.lastLeg = { day, stats, startMiles, endMiles, ids }`,
     `state.leg = null`, save, go to `#/results`.
2. `public/js/screens/results.js` (`#/results`): from `state.lastLeg`: correct % (graded
   answers), miles gained with the odometer showing the new total, taught / known /
   reviewed, today's tank as text (the gauge comes in Step 5), buttons **ขับต่อ** (plan not
   done), **ขับเพิ่ม** (plan done and new words left) and **กลับหน้าแรก**; the words of the
   leg as a compact list (w + th). No `lastLeg` → redirect home.
3. Home: the main button label follows DESIGN §7 (ออกเดินทาง / ขับต่อ / ขับเพิ่ม).
4. Test hooks (test mode only): `__app.item()` → current leg item, `__app.question()` →
   current question object (it includes the right answer). Don't add hooks that answer for
   the player: the UI check clicks and types like a player and uses `question()` only to
   know what is right.
5. `tools/ui-check.mjs` scenes:
   - `drive`: fresh state, start the first leg; on each item read `__app.item()` /
     `__app.question()`: meet → click จำแล้ว (the third meet: รู้จักคำนี้แล้ว); questions →
     click/type the right answer, except the 2nd graded question (answer wrong: pick a wrong
     option or type "zzz") to see the feedback and the re-ask. Shoot each question type the
     first time it appears (`drive-meaning`, `drive-gap`, …) and the wrong feedback. Types
     that need higher boxes don't appear on day one: seed a second run with cards in boxes
     1–6 due today (write `state` into localStorage before loading) so every type appears.
   - `results`: after the leg, shoot the results; reload and check the results still show.
   - `resume`: start a leg, answer two items, reload, check the leg continues at the same
     item.
   - `mobile` and `dark`: add a question and the results screen.
6. Tests: whatever pure helper you add (for example formatting the results) gets a test.

## Done when

- `npm test` and `npm run ui` pass; every question type has a screenshot at 390×844 and
  looks right (nothing overflows, the keyboard doesn't hide the input on mobile width).
- Report to the user how to play (start.bat, or the LAN URL on a phone on the same Wi-Fi;
  offline and "install on phone" come in Step 7) and that only the words with content so
  far are playable (100 after Step 1).
