# Step 7. Install on the phone: PWA, offline, deploy

**Goal.** The game can be installed on a phone's home screen, works offline, updates
itself, and is online at an HTTPS address the user chose.

**Read first.** DESIGN §8 (colors), §10 (persist); `public/index.html`, `public/js/main.js`,
`public/js/version.js`, `tools/ui-check.mjs` (harness part), `package.json`.

## Tasks

1. Icons: `public/img/icon.svg` (a green guide sign with "3000" and a small road stripe;
   content inside the maskable safe zone, 80% circle). `tools/make-icons.mjs` renders PNGs
   with headless Chrome (reuse the harness: open a data URL page with the SVG at the exact
   size, `Page.captureScreenshot` with `omitBackground` where needed): `icon-192.png`,
   `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180) and
   `favicon.png` (32). Commit the PNGs.
2. `public/manifest.webmanifest`: name and short_name "3000 Miles", `lang: "th"`,
   `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `background_color` and
   `theme_color` from the dark tokens, the icons (maskable marked). Link it and the apple
   touch icon in `index.html` (+ `apple-mobile-web-app-capable`, status bar style).
3. `public/sw.js`: `CACHE = '3000-miles-' + VERSION` (same version as `version.js`; a test
   checks it). Precache the app shell: a `FILES` list in `sw.js`; a test fails when a file
   in `public/` is neither in `FILES` nor in a short exclude list. Cache first for precached
   files; `data/*.json` network first with the cache as fallback; delete old caches on
   `activate`. Register in `main.js` except in test mode.
4. Update flow: a waiting worker → toast "มีเวอร์ชันใหม่" with **อัปเดต** → `postMessage
   ('skipWaiting')` → reload on `controllerchange`. Bump the version (package.json,
   version.js, sw.js) in every step that changes `public/` from now on (add this rule to
   CLAUDE.md "Definition of done").
5. `navigator.storage?.persist?.()` on the first run (store the result in settings to
   show in the settings screen: "ข้อมูลถูกเก็บแบบถาวร" or the iPhone hint).
6. `tools/ui-check.mjs` scene `pwa`: open BASE **without** `?test`, wait for
   `navigator.serviceWorker.ready`, then `Network.emulateNetworkConditions` offline, reload,
   and check home renders with the odometer; the manifest parses and every icon URL loads.
7. Deploy. **Ask the user** which host before doing anything with accounts:
   - Netlify (recommended: free HTTPS, drag and drop the `public` folder at
     https://app.netlify.com/drop, then claim the site with a free account) or Cloudflare
     Pages (upload `public`).
   - GitHub Pages only if the user's account is visible:
     `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/users/Pinkesan` must print
     200 (the account was hidden by a spam flag before). The repo would have to be public.
   - The user logs in and uploads; never ask for or type their password. Write the steps
     for the chosen host in `docs/DEPLOY.md` (Thai, short), including how to publish an
     update after later steps (upload `public` again).
   - After deploy: open the URL on the phone, "Add to Home Screen", play once offline.

## Done when

- `npm test` and `npm run ui` pass (including `pwa`); Chrome DevTools' Application panel
  shows the manifest and a working service worker (check through the ui-check scene, not
  by hand).
- The user has the HTTPS link, or `docs/DEPLOY.md` tells them exactly what to click.
