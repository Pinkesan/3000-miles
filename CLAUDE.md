# 3000 Miles: notes for Claude

A road-trip vocabulary game: learn the 3000 words of The Oxford 3000 (American English);
every word learned is one mile from New York to Santa Monica. Static web app (PWA), plain
ES modules, no build step, no npm dependencies.

- Plan: `docs/ROADMAP.md`. Do **one item per session**; this project is continued with
  Sonnet to save tokens. Game rules: `docs/DESIGN.md` (the spec, cited as §). Content rules:
  `docs/CONTENT-GUIDE.md`.

## The user

- Writes Thai. Reply in Thai; code, identifiers, commit messages and docs in English.
- Student developer preparing for Work and Travel USA 2027. The game is a portfolio piece
  (`Desktop\ผลงาน\`) and something they will really play every day on a phone.
- Don't assume anyone's pronouns.

## Commands

```
npm test                       # node --test: pure modules + tools; must pass
npm run check                  # content status; `-- a1-02` validates a batch; `-- --todo a1-02` lists its words
npm run build:data             # data/oxford3000.json + content/*.json -> public/data/words.json
npm run ui                     # headless Chrome check; starts its own server; screenshots in .shots/
ONLY=home,drive npm run ui     # only some scenes (Git Bash); PowerShell: $env:ONLY='home'; npm run ui
npm start                      # server for the user: http://localhost:5320 (+ LAN URL for a phone)
```

- `npm run ui` must end with `JS errors: none`. It uses its own port: leave the user's
  server on 5320 alone.
- `node tools/build-wordlist.mjs` rebuilds the base list from OUP's PDFs. Only needed if
  the list itself changes; it needs `pdftotext` (ships with Git for Windows).

## Layout

```
public/                  the whole app, served as static files
  index.html  css/  fonts/  img/
  data/words.json        built; data/route.json
  js/main.js             boot + hash router; screens in js/screens/, pieces in js/components/
  js/{rng,day,srs,text,quiz,plan,progress}.js   pure game logic, tested in test/
  js/{ui,store,speech,sfx,icons}.js
data/oxford3000.json     base list, 3000 words (built; never edit by hand)
content/<batch>.json     Thai meanings + examples, 30 batches of 100 (a1-01 … b2-06)
tools/                   build-wordlist, check-content, build-data, serve, ui-check, …
test/*.test.mjs
```

Some browser code is copied from Journey to America
(`C:\Users\Pinke\Desktop\ผลงาน\06-j1-quest`, read-only for this project): `ui.js`,
parts of `speech.js`, the CDP harness in `tools/ui-check.mjs`.

## Rules that are easy to break

1. Pure modules (`rng day srs text quiz plan progress`, later `fastlane arcade`) never
   touch DOM, storage or `Date.now()`; `today` and `rnd` are parameters; inputs aren't mutated.
2. A screen's `render(root, app, params)` is synchronous and may return `{ destroy() }`;
   async work checks a `destroyed` flag.
3. Never pass `null` to `replaceChildren()`/`append()`: use `h()`/`setChildren()` from
   `ui.js` (they skip null/false). Set CSS custom properties with
   `h(tag, { style: { '--x': v } })`. Keep `[hidden] { display: none !important; }`.
4. No `alert/confirm/prompt`: use `confirmBox()` and `toast()`.
5. Only the first graded answer of a word per day changes its state (`card.g`); re-asks
   are practice. Save the state after every graded answer.
6. All randomness goes through `makeRng(seed)`. `?test&seed=1&today=20500` makes runs
   repeatable; in test mode the app exposes `window.__app` for the UI check.
7. No requests to other sites at runtime (fonts are self-hosted), so the app works offline.
8. Headless Chrome can't open `file://` paths with Thai characters: always go through the
   http server. `.bat`/`.ps1` files stay ASCII and build Thai paths at runtime (`%~dp0`).
9. Content files are hand-written data: fix one entry with Edit; never regenerate or
   reformat a whole batch.
10. GitHub's spam filter hid the user's account after a README used the Thai words for
    "online game". README, commits and repo text are English; don't use Thai words for
    online game or gambling anywhere in the repo.
11. The user's Thai UI copy: address the player as คุณ, no ครับ/ค่ะ/ผม/ดิฉัน (DESIGN §9).

## Definition of done (every item)

- `npm test` passes, with new tests for new pure logic.
- App changed: `npm run ui` → `JS errors: none`; look at the changed screens at 390×844 and
  1366×768.
- Content changed: `npm run check` shows no errors for those batches; `npm run build:data` ran.
- `docs/ROADMAP.md`: tick the item, add one Log line.
- `git add -A` then `git commit -m "Step N: <title>"` (content: `"C3: content a2-01..a2-04"`).
  Push only when the user asks.
- Tell the user in Thai, briefly, what changed and how to try it.
