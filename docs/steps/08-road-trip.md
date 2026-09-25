# Step 8. Road trip: route, map, postcards, fuel gauge, streak

**Goal.** The progress layer of DESIGN §6: the odometer roll, the next-stop sign, the fuel
gauge, the streak with rest stops, flat tires, the route map and the postcards. This is
what makes it feel like a trip. Step 9 puts a checkpoint exam at every stop; until then,
reaching a stop unlocks its postcard. Keep that unlock in one small function (for example
`unlockReached` in `results.js`) so Step 9 can change it in one place.

**Read first.** DESIGN §6, §7 (home, results, map, postcard), §8, §9;
`public/js/progress.js` (API), `public/js/screens/home.js`, `public/js/screens/results.js`,
`public/js/main.js`, the odometer part of `public/css/app.css`, `tools/ui-check.mjs`
(scene list only).

## Tasks

1. `public/data/route.json`: the 16 stops from the DESIGN §6 table:
   `{ id, at, city, state, fact, factTh, color }`, `color` rotating
   `sign, sunset, sky, desert`. A test checks: 16 stops, `at` strictly increasing, first 0,
   last equals `total` (3000), every field present.
2. `main.js` loads `route.json` into `app.route`. When today's plan is created, call
   `rollover(streak, today)` and save.
3. `public/js/components/odometer.js`: `odometer(value)` → element with `.set(value,
   { animate })`; 4 wheels (DESIGN §8), rolls on increase; instant with reduced motion.
   Replace the static odometer on home, drive top bar and results.
4. `public/js/components/gauge.js`: fuel gauge SVG for `tank(plan)` (E / ½ / F, needle).
5. Home (DESIGN §7): guide sign `NEXT STOP` · city · miles to go (`at − miles`; after the
   last stop: "ถึงซานตาโมนิกาแล้ว!"); the gauge with today's line; the streak
   ("ขับต่อเนื่อง N วัน", best, P signs for rests); flat tires line when `countFlat > 0`
   ("ยางแบน N คำ ทวนให้ถูกแล้วจะหายเอง"); link to the map.
6. When the tank first becomes full today: `fillTank`, save, toast "เติมน้ำมันเต็มถังแล้ว
   วันนี้ขับครบ" (on the results screen).
7. Results: the odometer rolls from `startMiles` to `endMiles`; `reachedStops(route,
   startMiles, endMiles)` → `unlockReached`: save `state.stops[id] = today`, play
   `sfx.stop()`, and show a postcard button per new stop ("ถึง<city>แล้ว! ได้โปสการ์ดใบใหม่").
   Place it with the score and stars of Step 7 so the screen still reads top to bottom.
8. `public/js/screens/map.js` (`#/map`): the vertical road (New York top, Santa Monica
   bottom) drawn with CSS/SVG: the 16 stops as mile markers (`at` numbers); reached stops
   show a small postcard tile (tap → postcard); the next stop shows a guide sign with the
   miles to go; later stops are muted; the car at `carFraction(route, miles)`. Scroll the
   car into view on open (no smooth scroll with reduced motion).
9. `public/js/screens/postcard.js` (`#/postcard/<id>`): a stop not in `state.stops` →
   `#/map` (New York is always unlocked). Front:
   "Greetings from" + the city in big block letters, colored by `color` (DESIGN §8, no
   photos). Back: `fact` + 🔊, `factTh`, then "คำที่ได้ในช่วงนี้" = up to 12 words from
   `stopWords` (w + th) and the total count. A flip-in when it opens (300 ms; none with
   reduced motion). For New York (at 0): a welcome card that links to Journey to America's
   story ("ผ่าน ตม. ที่ JFK มาแล้ว ต่อไปคือขับข้ามอเมริกา").
10. `tools/ui-check.mjs` scenes (seed `state` in localStorage before load, using real ids
    from `words.json`):
    - `map`: miles = min(600, words with content): the map with the car past Cleveland.
    - `postcard`: miles 95 and `stops.philadelphia` set → open `#/postcard/philadelphia`.
    - `arrive`: miles 89 and one due review in box 2 (its next right answer makes the 90th
      mile): play the leg; the results must show the Philadelphia postcard button.
    - `streak`: seed `{ cur: 6, best: 9, last: today − 1, rests: 1 }` and today's plan with
      one due word and `newTarget: 0`; play that one-word leg → the tank fills → home shows
      7 days and 2 P signs.
    - `mobile` and `dark`: add map and postcard.
11. Tests for any new pure helper.

## Done when

- `npm test` and `npm run ui` pass; map and postcard screenshots look good at 390×844
  and 1366×768 in both themes; the odometer roll works (check a mid-animation screenshot
  or the final value).
