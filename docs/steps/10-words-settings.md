# Step 10. Word list, word detail, settings, backup

**Goal.** The player can browse and search all words with their status, open any word,
report a wrong meaning, change settings, and back up / restore progress as a file.

**Read first.** DESIGN §2 (POS table), §3 (status table), §7 (words, word, settings),
§9, §10, §11; `public/js/store.js`, `public/js/screens/home.js`, `public/js/main.js`,
`public/js/components/wordcard.js`, `public/js/speech.js`.

## Tasks

1. `public/js/screens/words.js` (`#/words`, title "คลังคำศัพท์")
   - Search box: English text matches the start of `w` (case-insensitive); Thai text
     matches anywhere in `th`; 150 ms debounce.
   - Filter chips: level (ทั้งหมด A1 A2 B1 B2) and status (all five from DESIGN §3), with
     counts. Keep the filters in the hash query (`#/words?lv=A1&st=flat&q=ban`) so the back
     button returns to the same list.
   - Rows: `w`, POS labels, `th` (one line, ellipsis), a small box gauge (8 ticks). Pages of
     100 with **แสดงเพิ่ม**; a count line "แสดง 100 จาก 873 คำ".
2. `public/js/screens/word.js` (`#/word/<id>`): the word card (reuse the component) plus
   POS list with levels and Thai POS names, `sense`, box gauge with the status name,
   numbers (answered / right / lapses), next review in Thai ("พรุ่งนี้", "อีก 5 วัน",
   "ถึงกำหนดแล้ว"), mile number if any, and **แจ้งข้อมูลผิด**: toggles
   `state.flags[id] = { day, note }` with an optional short note field. Unknown id → `#/words`.
3. Links: words on results, postcards, the checkpoint's missed words, Highway Rush's
   missed words and the wrong-answer mini card open `#/word/<id>`.
4. `public/js/screens/settings.js` (`#/settings`):
   - คำใหม่ต่อวัน 5/10/15/20/30 with a rough time line from the 2026-09-25 simulation
     (DESIGN §1 rule 9), counting the reviews each pace brings after a month: 5 "ประมาณ
     5–10 นาทีต่อวัน", 10 "ประมาณ 15 นาที", 15 "ประมาณ 20 นาที", 20 and 30 "ประมาณ 20
     นาที แต่คำทวนจะค้างเกิน 100 บ่อย หลายวันจะไม่มีคำใหม่". Changing it updates today's plan:
     `newTarget = max(taught + known, value)` unless the plan was capped (more than 100
     due), and recompute `goal`.
   - ระดับเริ่มต้น A1/A2/B1/B2 with the word counts, as on home in Step 5 (sets
     `app.order` at once; the next leg uses it). The results start-level tip now links here.
   - เสียง: select from `englishVoices`, a test button that says "Welcome to the road
     trip"; ความเร็วเสียง 0.8 / 0.9 / 1.0; เล่นเสียงอัตโนมัติ on/off; เสียงเอฟเฟกต์ on/off;
     ธีม auto / สว่าง / มืด (applies at once).
   - ข้อมูลในเครื่อง: **สำรองข้อมูลเป็นไฟล์** (download via Blob + `<a download>`),
     **กู้คืนจากไฟล์** (file input → `file.text()` → confirmBox → `importData`; a bad file →
     toast error), the iPhone hint from DESIGN §10, **เริ่มใหม่ทั้งหมด** (confirmBox, danger).
   - เกี่ยวกับเกม: DESIGN §11 text, version from `package.json` (copy it into
     `public/js/version.js`; a test checks they match).
   - Remove the temporary selects (คำใหม่ต่อวัน, เริ่มจากระดับ) from home and move their
     ui-check steps to the `settings` scene; home links to คลังคำศัพท์ and ตั้งค่า.
5. `store.js`: `exportData()` / `importData(text)` (DESIGN §10).
6. Tests (`test/store.test.mjs`): export → import round trip gives the same state; wrong
   `app` or broken JSON throws; import normalizes a partial file; the settings change of
   newPerDay recomputes the plan as described (put that logic in a pure helper in `plan.js`).
7. `tools/ui-check.mjs` scenes: `words` (search "ban", then filter A1 + status), `word`
   (a word with `other`; toggle the flag), `settings` (change theme to dark and back;
   newPerDay), `backup` (call `exportData`/`importData` through `evaluate` and compare), and
   add the three screens to `mobile` and `dark`.

## Done when

- `npm test` and `npm run ui` pass; the list stays fast with 3000 rows (only 100 rendered
  at a time); screenshots look right on both widths and themes.
