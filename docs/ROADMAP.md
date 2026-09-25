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
> เล่นได้ตอนนี้เลย (ดับเบิลคลิก `start.bat`) · ลงมือถือแบบติดตั้งได้หลัง Step 11

## Status

- [x] **Step 0.** Game design, plan, word list (3000 words, 30 batches). Done with Opus on 2026-09-25.
- [x] **Step 1.** Content tools + pilot batch a1-01 → [steps/01-content-tools.md](steps/01-content-tools.md)
- [x] **Step 2.** Game engine: pure modules + tests → [steps/02-engine.md](steps/02-engine.md)
- [x] **Step 3.** App shell: server, fonts, styles, storage, home, UI check → [steps/03-app-shell.md](steps/03-app-shell.md)
- [x] **Step 4.** The drive: first playable version → [steps/04-drive.md](steps/04-drive.md)
- [x] **Plan change.** A harder game: DESIGN §1, §3–§10 rewritten, steps 5–15 re-planned. Done with Opus on 2026-09-25.
- [ ] **Step 5.** Road test: ask before teaching, no free miles, start level → [steps/05-road-test.md](steps/05-road-test.md)
- [ ] **C1.** Content a2-01, b1-01, b2-01 → [CONTENT-GUIDE.md](CONTENT-GUIDE.md)
- [ ] **Step 6.** Harder questions: look-alike options, typing, dictation, short hints → [steps/06-harder-questions.md](steps/06-harder-questions.md)
- [ ] **Step 7.** Score, combo, stars → [steps/07-score.md](steps/07-score.md)
- [ ] **C2.** Content a2-02, b1-02, b2-02
- [ ] **Step 8.** Road trip: route, map, postcards, fuel gauge, streak → [steps/08-road-trip.md](steps/08-road-trip.md)
- [ ] **Step 9.** Checkpoints: an exam at every city → [steps/09-checkpoints.md](steps/09-checkpoints.md)
- [ ] **C3.** Content a2-03, b1-03, b2-03
- [ ] **Step 10.** Word list, word detail, settings, backup → [steps/10-words-settings.md](steps/10-words-settings.md)
- [ ] **Step 11.** Install on the phone: PWA, offline, deploy → [steps/11-pwa-deploy.md](steps/11-pwa-deploy.md)
- [ ] **C4.** Content a2-04, b1-04, b2-04
- [ ] **Step 12.** Highway Rush: 60-second arcade, three strikes → [steps/12-highway-rush.md](steps/12-highway-rush.md)
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
5. Tick the item here and add one Log line: date, what was done, deviations from the step
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
