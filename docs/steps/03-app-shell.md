# Step 3. App shell: server, fonts, styles, storage, home, UI check

**Goal.** The app boots in the browser with the real data and design tokens, shows the home
screen and a word card preview, and has a UI check that runs by itself. The drive comes in
Step 4.

**Read first.** DESIGN §7 (home row), §8, §9, §10. Copy and adapt these files from
*Journey to America* (read-only, don't edit that project):
- `C:\Users\Pinke\Desktop\ผลงาน\06-j1-quest\public\js\ui.js` (all of it)
- `C:\Users\Pinke\Desktop\ผลงาน\06-j1-quest\public\js\speech.js` (only `loadVoices`,
  `englishVoices`, `pickVoice`, `speak`, `stopSpeaking`, `canSpeak`; not the recognition part)
- `C:\Users\Pinke\Desktop\ผลงาน\06-j1-quest\tools\ui-check.mjs` (lines 1–130: the Chrome /
  CDP harness and the speech stub; not the scenes)

## Tasks

1. `tools/serve.mjs`: `export function createServer({ root })` (Node `http`, static files
   from `public/`, `/` → `index.html`, MIME types for html js mjs css json svg png ico woff2
   webmanifest txt, `Cache-Control: no-store`, 404 for unknown paths, refuse `..`).
   CLI: `node tools/serve.mjs [--open] [--port N]` (also env `PORT`), default **5320**;
   prints the local URL and the LAN URLs (`http://192.168.x.x:5320`, for a phone on the same
   Wi-Fi); `--open` opens the browser (`cmd /c start "" <url>` on Windows).
2. `start.bat` (ASCII only): `cd /d "%~dp0"`, check that `node` exists (message + pause if
   not), `node tools\serve.mjs --open`, `pause`.
3. `tools/get-fonts.mjs`: GET
   `https://fonts.googleapis.com/css2?family=Overpass:ital,wght@0,400;0,600;0,800;1,700&family=Overpass+Mono:wght@600&family=Anuphan:wght@400;600&display=swap`
   with a desktop Chrome User-Agent (so the CSS lists woff2), keep only the `latin` and
   `thai` subset blocks (the `/* latin */` comments), download each woff2 to
   `public/fonts/<family>-<weight>[-italic]-<subset>.woff2`, write `public/css/fonts.css`
   with local URLs and the original `unicode-range`s, and save each family's license from
   `https://raw.githubusercontent.com/google/fonts/main/ofl/<overpass|overpassmono|anuphan>/OFL.txt`
   as `public/fonts/OFL-<family>.txt`. Run it once and commit the files.
4. `public/index.html`: `lang="th"`, viewport with `viewport-fit=cover`, `theme-color`,
   `css/fonts.css` + `css/app.css`, `<main id="app">`, `<script type="module"
   src="js/main.js">`. No external URLs anywhere in `public/`.
5. `public/css/app.css`: tokens for both themes (DESIGN §8, `data-theme` on `<html>`;
   `auto` = media query), base styles, `[hidden] { display: none !important; }`, and the
   components needed now: buttons, guide sign, odometer (static digits), word card, toast,
   confirm dialog, focus rings. Mobile first, one column, `max-width: 560px`.
6. `public/js/ui.js` (adapted copy: `h`, `setChildren`, `th`, `en`, `toast`, `confirmBox`,
   `setTitle`; add `thaiDay(day)` = Thai date text for a day number), `public/js/icons.js`
   (inline SVG strings: speaker, car, gear, book, map, check, x, back, fuel, flag),
   `public/js/speech.js` (adapted copy + `hasEnglishVoice()`; rate and voice come from
   settings), `public/js/sfx.js` (WebAudio `right()`, `wrong()`, `mile()`, `stop()` as short
   tones; `AudioContext` created on the first user gesture; silent when `settings.sound` is
   off).
7. `public/js/store.js` (DESIGN §10): `KEY = 'miles3000.v1'`, `freshState()`,
   `normalizeState(saved)`, `createStore()` → `{ state, save(), update(fn) }`; memory
   fallback when `localStorage` is missing or throws. Backup/restore come in Step 6.
8. `public/js/main.js`: boot = fetch `data/words.json`, build `app = { words, byId, order,
   total, levels, store, today(), rnd(seedTail), settings }`, make today's plan if missing
   (`makeDayPlan`), apply the theme, then a hash router: `#/` home, `#/drive` and
   `#/results` (placeholders until Step 4), `#/card/<id>` (Meet card preview, useful for
   design and tests); unknown → `#/`. Screens follow the CLAUDE.md render contract.
   Test mode when the URL has `?test`: `?seed=<s>` fixes randomness, `?today=<n>` fixes the
   day, auto-advance delays are 0, and `window.__app = { app, question: () => null,
   item: () => null }` (Step 4 fills these in).
9. `public/js/screens/home.js`: DESIGN §7 home, without the parts that need Step 5
   (next-stop sign shows "จุดหมาย: Santa Monica · 3,000 ไมล์" for now; no gauge yet: show
   today's plan as text): odometer, today's line (DESIGN §9), the main button (goes to
   `#/drive`), "คำที่พร้อมเล่น N/3000" while content is incomplete, a newPerDay select
   (5/10/15/20/30, saved in settings; the full settings screen comes in Step 6).
10. `public/js/components/wordcard.js`: the Meet card from DESIGN §4 (used by `#/card/<id>`
    now and by the drive in Step 4): 🔊 buttons speak the word and the plain sentence.
11. `tools/ui-check.mjs`: the harness from Journey to America, changed:
    - it starts `createServer` on port 0 itself and closes it at the end (no separate server);
    - BASE = `http://127.0.0.1:<port>/?test&seed=1&today=20500`;
    - the speech stub also returns one fake voice
      `{ name: 'Test Voice', lang: 'en-US', voiceURI: 'test', localService: true, default: true }`;
    - `ONLY=` scenes: `home` (fresh state), `card` (`#/card/<first id>` and a word with
      `other` and `e`), `mobile` (390×844: home + card; fail if
      `document.documentElement.scrollWidth > innerWidth`), `dark`
      (`Emulation.setEmulatedMedia` with `prefers-color-scheme: dark`: home + card);
    - screenshots `.shots/NN-name.png`; the last line is `JS errors: none` or the list, and
      the exit code is 1 when there are errors.
12. `package.json` already has `start`, `ui`. Tests: `test/store.test.mjs`
    (`normalizeState`: junk → fresh; a partial save gets the missing parts; unknown
    settings values fall back to defaults).

## Done when

- `npm test` and `npm run ui` pass; the home and card screenshots look right in both themes
  at 390×844 and 1366×768 (fonts loaded: Latin in Overpass, Thai in Anuphan).
- The user can run `start.bat` and see the home screen at http://localhost:5320.
