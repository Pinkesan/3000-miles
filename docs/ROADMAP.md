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
> เล่นได้ครั้งแรกหลัง Step 4 (ดับเบิลคลิก `start.bat`) · ลงมือถือแบบติดตั้งได้หลัง Step 7

## Status

- [x] **Step 0.** Game design, plan, word list (3000 words, 30 batches). Done with Opus on 2026-09-25.
- [x] **Step 1.** Content tools + pilot batch a1-01 → [steps/01-content-tools.md](steps/01-content-tools.md)
- [x] **Step 2.** Game engine: pure modules + tests → [steps/02-engine.md](steps/02-engine.md)
- [x] **Step 3.** App shell: server, fonts, styles, storage, home, UI check → [steps/03-app-shell.md](steps/03-app-shell.md)
- [ ] **Step 4.** The drive: first playable version → [steps/04-drive.md](steps/04-drive.md)
- [ ] **C1.** Content a1-02 … a1-05 → [CONTENT-GUIDE.md](CONTENT-GUIDE.md)
- [ ] **C2.** Content a1-06 … a1-09
- [ ] **Step 5.** Road trip: route, map, postcards, fuel gauge, streak → [steps/05-road-trip.md](steps/05-road-trip.md)
- [ ] **Step 6.** Word list, word detail, settings, backup → [steps/06-words-settings.md](steps/06-words-settings.md)
- [ ] **Step 7.** Install on the phone: PWA, offline, deploy → [steps/07-pwa-deploy.md](steps/07-pwa-deploy.md)
- [ ] **C3.** Content a2-01 … a2-04
- [ ] **C4.** Content a2-05 … a2-08
- [ ] **Step 8.** Fast Lane: skip a level you already know → [steps/08-fast-lane.md](steps/08-fast-lane.md)
- [ ] **C5.** Content b1-01 … b1-04
- [ ] **C6.** Content b1-05 … b1-07
- [ ] **Step 9.** Highway Rush: 60-second arcade → [steps/09-highway-rush.md](steps/09-highway-rush.md)
- [ ] **C7.** Content b2-01 … b2-03
- [ ] **C8.** Content b2-04 … b2-06
- [ ] **Step 10.** Say it: speaking question type (optional) → [steps/10-say-it.md](steps/10-say-it.md)
- [ ] **Step 11.** Fix reported words + portfolio polish → [steps/11-polish.md](steps/11-polish.md)

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
3. Do that one item. Something broken outside it → one line in the Log, unless it blocks
   the item. Don't start the next item, even with context left.
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

- 2026-09-25: Step 3. `tools/{serve,get-fonts}.mjs`, `start.bat`, fonts (latin+thai, OFL) in `public/fonts`, `public/{index.html,css/app.css}`, `js/{ui,icons,speech,sfx,store,main}.js`, `screens/{home,card,placeholder}.js`, `components/{wordcard,odometer}.js`, `tools/ui-check.mjs` (scenes home card mobile dark light; `JS errors: none`), `test/store.test.mjs` (77 tests pass). Deviations: `app.say(text, {rate})`/`app.stopSay`/`app.hasVoice()`/`app.ensurePlan()` added to `app`; changing newPerDay on home also updates today's plan while it has no progress; `img/favicon.svg` added (avoids a 404); extra `light` UI scene.
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
