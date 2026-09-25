# Step 1. Content tools + pilot batch a1-01

**Goal.** The content pipeline works end to end, and the first 100 words have content the
user has looked at. After this step, content sessions (C1–C8) can run on their own.

**Read first.** `docs/CONTENT-GUIDE.md` (all of it: it is the spec for the checker),
`docs/DESIGN.md` §2, the first lines of `data/oxford3000.json`. Nothing else is needed.

## Tasks

1. `tools/lib/words.mjs`
   - `loadBase()` → the array from `data/oxford3000.json` (read once, cached).
   - `byId()` → `Map`; `batchNames()` → the 30 names in order; `batchWords(name)` → entries.
2. `tools/lib/forms.mjs`
   - `IRREGULAR`: `{ base: [forms...] }` for every irregular word **in the list**: verbs
     (be: am is are was were been being; have: has had; do: does did done; go: goes went
     gone; say: said; … check every verb in `data/oxford3000.json` against your knowledge of
     irregular verbs), plurals (child children, man men, woman women, person people, foot
     feet, tooth teeth, mouse mice, knife knives, life lives, wife wives, leaf leaves, half
     halves, shelf shelves, thief thieves), comparatives (good better best, bad worse worst,
     far farther further farthest furthest, little less least, many/much more most, well
     better best).
   - `forms(w)` → `Set` of lowercase forms, rules in CONTENT-GUIDE "What the checker checks"
     item 6. Be generous with regular variants (both `visited` and `visitted` may be in the
     set; the check only needs to accept real forms).
   - `knownWords(base)` → `Set` of every form of every word in the list, for the vocabulary
     warning. Tokenizing a sentence for that warning: split on spaces, strip punctuation,
     split contractions (`don't` → do + not, `I'm` → i + am, `it's` → it + is, `we'll`,
     `they've`, `she'd`, `can't` → can + not, `won't` → will + not), skip numbers and
     capitalized words that are not the first word.
3. `tools/lib/check.mjs`: `checkBatch(name, entries, base)` → `{ errors: string[],
   warnings: string[] }`, messages like `a1-02 cannot: p "v" is not one of modal`. All rules
   from CONTENT-GUIDE "What the checker checks" (errors 1–9 and the three warnings).
   `parseBatchFile(text)` → entries or throws a readable JSON error (with the line number).
4. `tools/check-content.mjs` (CLI)
   - no args: status per batch in one line each (`a1-01  100/100  ok`, `a1-02  missing`,
     `a2-03  57/100  3 errors`), totals per level, and `next: a1-02`. Exit 0.
   - `--todo <batch>`: `id | w | pos:lv,pos:lv | sense` per word.
   - `<batch> [<batch>...]` or `--all`: validate; print errors, then warnings (prefix
     `warn`); a last line `a1-02: 0 errors, 2 warnings`. Exit 1 when there are errors.
   - Output stays short: no stack traces for content problems.
5. `tools/build-data.mjs`: check every content file (abort with exit 1 on any error), then
   write `public/data/words.json` per DESIGN §2: base order; keys in the order `id w lv pos
   sense p th ex exTh other e alt gapOnly` (skip missing ones); the `words` array written
   one word per line. Print the count per level.
6. Pilot: write `content/a1-01.json` (100 words) following CONTENT-GUIDE. Run the checker
   until it is clean, then `npm run build:data`.
7. Tests `test/content.test.mjs`:
   - `forms`: go→went, be→was, child→children, stop→stopped, make→making, big→bigger,
     happy→happier, lie→lying, study→studied, "have to"→"had to", "a, an"→"an",
     "T-shirt"→"t-shirts", "o'clock"→"o'clock".
   - `checkBatch`: a good entry passes; one bad entry per error rule 1–9 is caught (build
     the entries in the test; don't read content files); warnings appear for an easy
     sentence with two unknown words.
   - `knownWords`: contains "children", "went", "stopped"; the tokenizer handles "don't".
   - `words.json` (if it exists): every word has `id w lv pos p th ex exTh`.

## Done when

- `npm test` passes; `npm run check -- a1-01` shows 0 errors; `npm run build:data` writes
  100 words.
- Report to the user in Thai with 10 random a1-01 entries as a small table (word | th |
  ex) and ask them to skim `content/a1-01.json`: they are a native Thai speaker. If they
  want a different style (shorter meanings, other kinds of sentences, more or fewer
  emoji), update `docs/CONTENT-GUIDE.md` and a1-01 before C1.
