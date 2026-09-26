# 3000 Miles roadmap

> **สำหรับคุณ (ภาษาไทย):** ไฟล์นี้คือแผนงานให้ Claude รุ่น **Sonnet** ทำต่อทีละขั้น
> (Opus ออกแบบเกม วางแผน และเตรียมรายการคำ 3,000 คำไว้ให้แล้ว)
> 1. ดับเบิลคลิก `claude-sonnet.bat` ในโฟลเดอร์นี้ จะเปิด Claude Code รุ่น Sonnet ในโฟลเดอร์โปรเจกต์ให้เลย
> 2. วาง prompt ในหัวข้อ "Prompt สำหรับเริ่ม session" ด้านล่าง (ใช้ prompt เดิมได้ทุกครั้ง)
> 3. ทำ **1 ขั้นต่อ 1 session** เสร็จแล้วพิมพ์ `/clear` หรือปิดหน้าต่าง ก่อนเริ่มขั้นถัดไป จะประหยัด token ที่สุด
> 4. ขั้นที่ขึ้นต้นด้วย **C** คือเขียนความหมายไทย + ประโยคตัวอย่าง ทำวันไหนก็ได้หลัง Step 1
>    ถ้าอยากทำขั้นเจาะจง พิมพ์เช่น `ทำ C3 ตาม docs/ROADMAP.md`
> 5. ถ้าติดปัญหาเดิมซ้ำ 2 รอบ Sonnet จะหยุดบอก ตอนนั้นค่อยพิมพ์ `/model opus` แก้เฉพาะจุดนั้นแล้วสลับกลับ
>
> **แผนปรับใหม่ให้ท้าทายขึ้น (Opus, 2026-09-25):** เวอร์ชันแรกง่ายไป เพราะเห็นคำตอบก่อนถูกถาม
> ปุ่ม "รู้จักคำนี้แล้ว" ให้ไมล์ฟรี ตัวเลือกหลอกเดาง่าย และไม่มีอะไรให้ลุ้น แผนใหม่คือ
> - **Step 5** ถามก่อนสอน: คำใหม่ถามก่อนเลย (มีปุ่ม "ไม่รู้จักคำนี้") ตอบถูกแล้วต้องพิมพ์คำนั้นได้ถึงจะได้ไมล์
>   ตอบผิดค่อยเปิดการ์ดสอน แล้วพิมพ์เองอีกรอบ
> - **Step 6** คำถามยากขึ้น: ตัวเลือกหน้าตาคล้ายกัน (band / bank / hand) พิมพ์เป็นหลักตั้งแต่กล่อง 2
>   โจทย์ฟังแล้วพิมพ์ คำใบ้สั้นลงเมื่อจำได้แม่นขึ้น
> - **Step 7** คะแนน คอมโบ (ตอบถูกติดกันได้ตัวคูณ) แถบความเร็ว และดาว 1–3 ดวงต่อช่วง
> - **Step 9** ด่านตรวจทุกเมือง: สอบพิมพ์ 15 คำ ถูก 80% ถึงได้โปสการ์ด สอบได้วันละครั้ง
> - คำศัพท์ระดับ A2 / B1 / B2 มาก่อน A1 ที่เหลือ หลังทำ C1 แล้วให้ตั้ง **เริ่มจากระดับ** ที่หน้าแรกเป็น A2 หรือ B1
>
> **ปรับแผนรอบสอง (Opus, 2026-09-25): จำกัดคำใหม่ แต่ไม่จำกัดการเล่น**
> - คำใหม่ทุกคำต้องกลับมาทวนอีก 5–8 ครั้ง ถ้าเรียน 100 คำในวันเดียว คำทวนจะเพิ่มเป็นสองเท่าไปอีกสองสัปดาห์
>   ตอนนี้ครบเป้าแล้วกด **ขับเพิ่ม** ได้อีก 1 ช่วงต่อวัน (คำใหม่ 10 คำ) จากเดิมที่ได้ถึง 100 คำ (แก้โค้ดแล้ว)
> - **Highway Rush** (ตอบเร็ว 60 วินาที ไม่เพิ่มคำใหม่ ไม่กระทบตารางทวน) ย้ายมาทำต่อจาก Step 7
>   เปิดให้เล่นได้ไม่จำกัดหลังขับครบแผนของวัน
> - คำใหม่ต่อวันตั้งไว้ 10 หรือ 15 คำพอ เกินนั้นแทบไม่ถึงเร็วขึ้น เพราะคำทวนจะค้างเกิน 100 คำบ่อย
>
> **ทดสอบหลายวันโดยไม่แตะเซฟจริง:** เปิดหน้าต่างไม่ระบุตัวตน (Ctrl+Shift+N) แล้วเข้า
> `http://localhost:5320/?test&today=20721` (20721 คือ 25 ก.ย. 2569) เปลี่ยนเลขเพื่อข้ามวัน ปิดหน้าต่างแล้วข้อมูลทดสอบหายเอง
>
> เล่นได้ตอนนี้เลย (ดับเบิลคลิก `start.bat`) · ลงมือถือแบบติดตั้งได้หลัง Step 11

## Status

- [x] **Step 0.** Game design, plan, word list (3000 words, 30 batches). Done with Opus on 2026-09-25.
- [x] **Step 1.** Content tools + pilot batch a1-01 → [steps/01-content-tools.md](steps/01-content-tools.md)
- [x] **Step 2.** Game engine: pure modules + tests → [steps/02-engine.md](steps/02-engine.md)
- [x] **Step 3.** App shell: server, fonts, styles, storage, home, UI check → [steps/03-app-shell.md](steps/03-app-shell.md)
- [x] **Step 4.** The drive: first playable version → [steps/04-drive.md](steps/04-drive.md)
- [x] **Plan change.** A harder game: DESIGN §1, §3–§10 rewritten, steps 5–15 re-planned. Done with Opus on 2026-09-25.
- [x] **Step 5.** Road test: ask before teaching, no free miles, start level → [steps/05-road-test.md](steps/05-road-test.md)
- [x] **C1.** Content a2-01, b1-01, b2-01 → [CONTENT-GUIDE.md](CONTENT-GUIDE.md)
- [x] **Plan change 2.** Limit new words, not play: one ขับเพิ่ม leg a day (code done), Highway Rush moved up to follow Step 7. Done with Opus on 2026-09-25.
- [x] **Step 6.** Harder questions: look-alike options, typing, dictation, short hints → [steps/06-harder-questions.md](steps/06-harder-questions.md)
- [x] **Step 7.** Score, combo, stars → [steps/07-score.md](steps/07-score.md)
- [x] **Step 12.** Highway Rush: 60-second arcade after the day's plan, three strikes (moved up; the number stays) → [steps/12-highway-rush.md](steps/12-highway-rush.md)
- [x] **C2.** Content a2-02, b1-02, b2-02
- [x] **Step 8.** Road trip: route, map, postcards, fuel gauge, streak → [steps/08-road-trip.md](steps/08-road-trip.md)
- [x] **Step 9.** Checkpoints: an exam at every city → [steps/09-checkpoints.md](steps/09-checkpoints.md)
- [x] **C3.** Content a2-03, b1-03, b2-03
- [x] **Step 10.** Word list, word detail, settings, backup → [steps/10-words-settings.md](steps/10-words-settings.md)
- [x] **Step 11.** Install on the phone: PWA, offline, deploy → [steps/11-pwa-deploy.md](steps/11-pwa-deploy.md)
- [ ] **C4.** Content a2-04, b1-04, b2-04
- [ ] **C5.** Content a2-05, b1-05, b2-05
- [ ] **C6.** Content a2-06, b1-06, b2-06
- [ ] **Step 13.** Say it: speaking question type (optional) → [steps/13-say-it.md](steps/13-say-it.md)
- [ ] **C7.** Content a2-07, a2-08, b1-07
- [ ] **C8.** Content a1-02 … a1-05
- [ ] **C9.** Content a1-06 … a1-09
- [ ] **Step 14.** Fast Lane: skip a level you already know → [steps/14-fast-lane.md](steps/14-fast-lane.md)
- [ ] **Step 15.** Fix reported words + portfolio polish → [steps/15-polish.md](steps/15-polish.md)

## Prompt สำหรับเริ่ม session

Open Claude Code in this folder with Sonnet (`claude-sonnet.bat`, or `claude --model sonnet`)
and paste:

```
ทำเกม 3000 Miles ต่อ: อ่าน docs/ROADMAP.md แล้วทำขั้นถัดไปที่ยังไม่ติ๊กในหัวข้อ Status
ทำแค่ขั้นเดียว ตาม Definition of done ใน CLAUDE.md แล้วสรุปสั้นๆ เป็นภาษาไทย
```

## How to work in every session

1. `CLAUDE.md` is already loaded. Find the first unticked item in Status (or the one the
   user named). Read **only** its step file and the files listed under "Read first".
   For a C-step read only `docs/CONTENT-GUIDE.md`.
2. `git status`: if there are changes you didn't make, ask the user before touching them.
3. Do that one item. `docs/DESIGN.md` describes the finished game, so it is ahead of the
   code: build only what your step file asks for. Something broken outside the item → one
   line in the Log, unless it blocks the item. Don't start the next item, even with context
   left.
4. Verify with the Definition of done in `CLAUDE.md`.
5. C-steps only change `public/data/`: no version bump, but tell the user to upload `public` again (docs/DEPLOY.md).
   Tick the item here and add one Log line: date, what was done, deviations from the step
   file, numbers (tests, words with content).
6. Commit. Report to the user in Thai: what changed, how to try it, what they must do.

Token economy:
- Don't explore beyond the listed files. Use Grep for one name instead of reading a whole
  file. Prefer Edit over rewriting a file; don't re-read a file you just wrote.
- While iterating on the UI run only the scenes you changed (`ONLY=drive npm run ui`); run
  the full check once at the end, and look only at the screenshots of screens you changed.
- If the same problem survives two honest attempts, stop and tell the user. They may switch
  to a bigger model for that one problem.
- A step that turns out too big: finish a coherent part, commit, log what is left, and tell
  the user the step continues next session (keep it unticked).

## Log

- 2026-09-26: Step 11. `public/img/icon.svg` + `tools/make-icons.mjs` (PNGs: 192, 512, maskable, apple-touch, favicon), `manifest.webmanifest`, `sw.js` (precache `FILES`, cache first, `data/*.json` network first, old caches deleted, `skipWaiting` message), registration + update toast (`toast` got an optional action button) in `main.js`, version 0.2.0, `test/pwa.test.mjs` (140 tests pass), ui-check scene `pwa` (installs the worker, reloads offline, manifest and icons load); `JS errors: none`. Settings shows whether storage is persistent. `docs/DEPLOY.md` (Thai). Deviations: persistence is read with `navigator.storage.persisted()` when settings opens, not stored in settings; the deploy itself is left to the user (no account touched), Netlify is the documented path.
- 2026-09-26: Step 10. New pure `wordlist.js` (`filterWords/chipCounts/nextReviewText`), `plan.withNewPerDay`, `version.js`; store `exportData/importData/reset`; router passes `query`; screens `#/words` (search, level + status chips in the hash query via replaceState, pages of 100), `#/word/<id>` (detail, box gauge, next review, flag with note), `#/settings` (pace + time line, start level, voice/rate/autoplay/sound/theme, backup, restore, reset, about); `components/wordrow.js` links words on results, postcards, checkpoint and Rush missed lists and the mini card to `#/word/<id>`; home lost the temporary selects and links to words + settings. ui-check: scenes `words word settings backup`, three screens in `mobile`/`dark`/`light`; `JS errors: none`. 137 tests pass. Deviations: the start-level tip links to settings; the word page back link uses history.back() so the list keeps its filters.
- 2026-09-26: C3. `content/{a2-03,b1-03,b2-03}.json` (300 words, `npm run check` 0 errors 0 warnings each); `build:data` → 1000 words (A1 100, A2 300, B1 300, B2 300); 128 tests pass. No deviations.
- 2026-09-26: Step 9. New pure `checkpoint.js` (`cleared/openCheckpoint/canTry/examSize/examWords/examItems/examAnswer/examResult/passMark/recordTry/mapMiles`) + `test/checkpoint.test.mjs` and a store test (128 tests pass); `checkpoints: {}` and `exam: null` in the state; screen `#/checkpoint/<id>` (intro, exam with a saved `state.exam` that survives a reload, end with stars, missed words, postcard button), `components/stars.js`; `results.js` shows "ถึงด่านตรวจ <city> แล้ว" + เข้าด่าน (`unlockReached` removed); home: CHECKPOINT sign with the barrier stripe, เข้าด่าน or ลองใหม่พรุ่งนี้; map: barrier on the open checkpoint, the car waits (`mapMiles`), small stars on tiles. ui-check: new scene `checkpoint` (13/15 pass, reload mid-exam, 11/15 fail, map), `arrive` updated, intro and question in `mobile` and `dark`; `JS errors: none`. Deviations: the postcard is unlocked (`state.stops[id]`) when the pass is saved, not when รับโปสการ์ด is tapped, so leaving the end screen never strands a passed checkpoint; results show the open checkpoint on every leg while one is open, not only the leg that crossed it.
- 2026-09-26: Step 8. `public/data/route.json` (`{ total, stops[16] }`), `progress.newlyReached`, `test/route.test.mjs` (117 tests pass); `odometer().set(value, { animate })`, new `components/gauge.js`; screens `#/map` and `#/postcard/<id>`; `main.js` loads `app.route` and calls `rollover` when a day's plan is made; home: NEXT STOP sign, gauge + plan line, streak with P signs, flat tires, map link; results: odometer rolls via `.set`, `fillTank` + toast when the tank first fills, `unlockReached` (in `results.js`, the one place Step 9 changes) saves `state.stops`, plays `sfx.stop()` and shows a postcard button per new stop. ui-check: scenes `map postcard arrive streak`, map/postcard/home in `mobile` and `dark`; `JS errors: none`. Deviations: the drive top bar has a mile chip, not an odometer, so it stays as is; `unlockReached` also unlocks older stops passed before Step 8; New York's back only mentions Journey to America (no link, no URL yet).
- 2026-09-26: C2. `content/{a2-02,b1-02,b2-02}.json` (300 words, `npm run check` 0 errors 0 warnings each); `build:data` → 700 words (A1 100, A2 200, B1 200, B2 200); 113 tests pass. No deviations.
- 2026-09-26: Step 12. New pure `arcade.js` (`arcadeOpen/arcadeUnlocked/arcadePool/weightedPick/boxWeight/arcadeType/nextSpeed/scoreFor/strikesLeft/newRun/answerRun/runOver/runSummary`) + `test/arcade.test.mjs`; screen `#/arcade` (countdown, 60 s run, cones, road speed, end screen with missed words, `state.arcade` best + last 20 runs); `questionView` kind `rush` (no mini card, no button); `icons.cone`; home: #day-done + primary #rush-btn, else #rush-link (best score) or #rush-locked; results: primary Highway Rush when no leg is offered; test hook `__app.endRun()`. ui-check: scene `arcade`, `done` extended, arcade shot in `mobile`/`dark`; `JS errors: none`. 113 tests pass. Deviations: none; the top bar stays visible on the end screen; a tap on the countdown number also skips it.
- 2026-09-26: Step 7. New pure `score.js` (`POINTS`, `speedFactor`, `comboMultiplier`, `scoreAnswer`, `legStars`, `updateRecords`) + `test/score.test.mjs`; `records` in `freshState`/`normalizeState`, `plan.score`, `leg.score`. Drive: answer timing, leg score with +P, combo chip from 3 (`sfx.combo`), speed bar (question option `speedBar`, drive only, hidden with reduced motion); `lastLeg` gets `score/stars/bestCombo/newCombo/newDay`; results show score, stars (`icons.star/starEmpty`), best combo, records; home shows `#score-line`. ui-check: new scene `score` (combo chip and speed bar at 360px, reduced motion) + score checks in `drive`; `JS errors: none`. 103 tests pass. Deviations: a wrong re-ask is neutral too (combo stays), per the step file; the combo chip sits in the lane's info row under the lane, not in the bar itself.
- 2026-09-26: Step 6. `text.editDistance/shortHint`; `quiz`: DESIGN §4 table (box 1 = word/listen, meaning only as a probe; `dictation` needs a voice; `exam` row), `lookAlike`, look-alike tier in `pickDistractors` (max 2, closest first), `makeQuestion(..., { hint })`, `synonymOf`; `plan`: every item has `hint` (review short from box 4, confirm short, check full, re-asks copy it). New `components/question.js` (prompt, options/input, feedback, synonym retry, dictation); `drive.js` keeps the leg flow. ui-check: `types` shows all 7 types, look-alike and short-hint checks, new scene `synonym`; `JS errors: none`. 89 tests pass. Deviations: a look-alike beyond 2 is used only when nothing else is left; by the §4 formula quiet/quite (distance 2, length 5) is not a look-alike; the results screen and `#/card` are unchanged.
- 2026-09-25: Plan change 2 (Opus). The player drove extra legs until the cap of 100 new
  words a day and had nothing left to play. A 500-day simulation with `srs.js` +
  `makeDayPlan`: above ~15 new words a day the 100-review cap blocks new words on many days
  (20 a day: 46–73 of the first 180 days) and gets there barely sooner; a 100-word day
  doubles the reviews for two weeks. DESIGN §1 rule 9 (limit new words, not play), §5 leg
  step 2 (one ขับเพิ่ม leg a day: `newCap = newTarget + 10`, none on a backlog day), §7
  home / results / `#/arcade`, §9. Code: `plan.newCap` / `newLeft` replace `DAY_NEW_CAP`;
  home shows the `#day-done` note instead of the main button when nothing is left; results
  use `newLeft`; ui-check scene `done`; 83 tests pass, `JS errors: none`. Step 12 (Highway
  Rush) moved up after Step 7: opens after the day's plan, its pool skips words due and not
  graded today, missed words without links until Step 10, no version bump. Steps 08 and 10
  updated to match (Step 10's time line per pace comes from the simulation).
- 2026-09-25: C1. `content/{a2-01,b1-01,b2-01}.json` (300 words, `npm run check` 0 errors 0 warnings each); `build:data` → 400 words (A1 100, A2 100, B1 100, B2 100); 81 tests pass. Start level B1 now lists 100 words. No deviations.
- 2026-09-25: Step 5. `quiz.allowedTypes` takes `probe|confirm|check`; `plan.js` rewritten around probe / confirm / check / meet (`CHECK_GAP` 4, `CONFIRM_GAP` 6, `EXTRA_NEW` 10, `LEG_NEW_CAP`, `needsExtraNew`, `extraNewWord` removed, `leg.v = 2`, new event `skip`); `summary.levelTip`; drive: probe with ไม่รู้จักคำนี้ (key 0), "เรียนคำนี้" after a wrong probe, one-button Meet card, old legs without `v: 2` dropped; results: tip + `taught + known` in `canContinue`; home: temporary เริ่มจากระดับ select. ui-check `playLeg` rewritten (probe right/skip/wrong, confirm mile), `resume` and `home` extended; `JS errors: none`. 81 tests pass. Deviations: gap is counted as "items between" (like re-asks), so a check is 4 items after its meet, not 3; the confirm still has the full letter hint until Step 6. Only a1-01 has content, so start level B1 lists 0 words until C1.
- 2026-09-25: Plan change (Opus). The user played Step 4 and found it too easy. Causes
  found in the code: the Meet card showed the answer 3 items before the only question;
  "รู้จักคำนี้แล้ว" asked Thai → English right after showing both (a free mile); random
  same-level distractors (band: วงดนตรี / เดือนเมษายน / สนามบิน); no typing before box 4;
  only A1 content; no stakes. DESIGN rewritten: §1 rules 1, 3, 5, 7, 8; §3 known word and
  checkpoint answers; §4 probe / confirm / check, new ladder with `dictation`, short
  hints, look-alike distractors, synonym retry, speed bar; §5 new-word flow, known words
  count toward `newTarget`, extra legs 10 new words; §6 checkpoints and score; §7–§10 to
  match. New step files 05 road test, 06 harder questions, 07 score, 09 checkpoints; old
  05–11 renumbered to 08, 10, 11, 14 (Fast Lane, after C9), 12, 13, 15 and updated (Fast
  Lane right answers give box 2, not a mile; Highway Rush has three strikes). Content order:
  A2/B1/B2 first (C1–C7), the rest of A1 last (C8–C9).
- 2026-09-25: Step 4. `public/js/screens/{drive,results}.js`, `public/js/summary.js` (pure: `legSummary`, `tankFill`, `tankText`, `queueIds`) + `test/summary.test.mjs`; `screens/placeholder.js` removed; home only treats a saved leg of today as "ขับต่อ". `app.hooks` (set by the drive) backs `__app.item()/question()`. Leg keeps an extra `ids` array for the results word list. UI check scenes `drive` (whole leg, results, reload), `types` (all six question types at 390x844), `resume`, plus a question and results in `mobile`/`dark`; `JS errors: none`. 76 tests pass. Deviations: results odometer rolls with a plain wheel transition (a 9 to 0 wheel scrolls back up); tank is text only. Only the 100 words of a1-01 are playable.
- 2026-09-25: Step 3. `tools/{serve,get-fonts}.mjs`, `start.bat`, fonts (latin+thai, OFL) in `public/fonts`, `public/{index.html,css/app.css}`, `js/{ui,icons,speech,sfx,store,main}.js`, `screens/{home,card,placeholder}.js`, `components/{wordcard,odometer}.js`, `tools/ui-check.mjs` (scenes home card mobile dark light; `JS errors: none`), `test/store.test.mjs` (72 tests pass). Deviations: `app.say(text, {rate})`/`app.stopSay`/`app.hasVoice()`/`app.ensurePlan()` added to `app`; changing newPerDay on home also updates today's plan while it has no progress; `img/favicon.svg` added (avoids a 404); extra `light` UI scene.
- 2026-09-25: Step 2. `public/js/{rng,day,srs,text,quiz,plan,progress}.js` + `test/engine.test.mjs` (67 tests pass, no DOM/storage/Date.now in the modules). API as in the step file, plus: `extraNewWord({plan,cards,byId,order,leg,rnd})` (adds the extra new word after a right "I know this", updates `shown`/`newCount`); `recordAnswer` only updates cards/plan/leg.stats, so call `legReduce` with the same answer afterwards; `introOrder` sorts by hash(seed:id) so the order stays stable as content grows; `byId` may be an object or a Map; `progress` route args accept an array or `{stops}`; gapOnly new-word check and "know" are `gap`; letterHint hides digits too.
- 2026-09-25: Step 1. `tools/lib/{words,forms,check}.mjs`, `tools/check-content.mjs`,
  `tools/build-data.mjs`; pilot `content/a1-01.json` (100 words, 0 errors, 0 warnings);
  `public/data/words.json` built (100 words). 13 tests pass. No deviations. Waiting for the
  user to skim a1-01 for style before C1.
- 2026-09-25: Step 0 (Opus). Design in `docs/DESIGN.md`, content rules in
  `docs/CONTENT-GUIDE.md`, step files 1–11. `data/oxford3000.json` built by
  `tools/build-wordlist.mjs` from OUP's free American Oxford 3000 PDFs: 3000 words (A1 900,
  A2 800, B1 700, B2 600), 30 batches of 100, cross-checked against the by-level PDF (the two
  PDFs disagree on 8 entries; decisions in `FIXES`). `test/wordlist.test.mjs` guards the list.
