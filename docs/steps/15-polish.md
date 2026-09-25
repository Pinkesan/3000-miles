# Step 15. Fix reported words + portfolio polish

**Goal.** Close the loop on content quality (words the player flagged while playing) and
make the project presentable as a portfolio piece.

**Read first.** DESIGN §10 (flags), §11; `README.md`; `tools/lib/check.mjs` (API only).

## Tasks

1. `tools/flags.mjs <backup.json>`: reads a backup file made in settings, prints each
   flagged word as `batch | id | w | th | ex | note`, grouped by batch. Add a short section
   to `docs/CONTENT-GUIDE.md`: "Fixing flagged words" (run the tool, fix each entry with
   Edit, run the checker for those batches, build, commit `Fix: flagged words`), and a
   prompt for it in `docs/ROADMAP.md`.
2. Home or settings: a small "คำที่แจ้งไว้ N คำ" line linking to `#/words?flag=1`
   (add the filter).
3. README (English): what it is, a short GIF or 3 screenshots from `.shots/` copied into
   `docs/img/`, how it teaches (the rules of DESIGN §1 in plain words), how it was built
   (plain ES modules, no build step, tests, headless Chrome checks, content pipeline with a
   checker), credits (DESIGN §11). Don't use Thai words for "online game" or anything that
   sounds like gambling (see CLAUDE.md rule on GitHub).
4. Performance check on a 4× CPU slowdown (`Emulation.setCPUThrottlingRate` in a ui-check
   scene): home under 1.5 s after load, a question renders under 100 ms. If `words.json`
   is the bottleneck, split it per level and load the other levels after the first screen.
   The look-alike search (edit distance against every loaded word) is the other likely
   cost: cache each word's look-alike ids the first time they are needed.
5. A last copy pass over all Thai UI strings against DESIGN §9 (one list in the report).
6. Ask the user whether to publish the repo on GitHub (it contains nothing private, but
   check the account state first, see Step 11) and whether to link it from the portfolio
   (`Desktop\ผลงาน\00-portfolio-เล่มเดิม`). Don't push without a yes.

## Done when

`npm test` and `npm run ui` pass; version bumped; README renders well on GitHub (check the
image paths).
