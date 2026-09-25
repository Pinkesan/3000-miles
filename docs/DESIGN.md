# 3000 Miles: game design

The rules in this file are the spec. Step files point to sections (§). If code and this
file disagree, fix the code, or ask the user before changing a rule.

## §1 Concept

Learn the 3,000 words of **The Oxford 3000 (American English)** by driving across the USA,
from New York to Santa Monica Pier. **Every word you really learn is one mile.**

- Player: a Thai university student (around A2–B1) preparing for Work and Travel USA 2027.
  Plays 10–15 minutes a day, mostly on a phone, sometimes on a laptop. UI in Thai, words in
  American English.
- Companion to *Journey to America* (`Desktop\ผลงาน\06-j1-quest`): that game ends at
  the airport (JFK), this road trip starts in New York.
- Learning rules the game is built on. Don't break them:
  1. **Retrieval, not rereading.** After the first meeting, every contact with a word is a question.
  2. **Spacing.** Leitner boxes with growing intervals (§3). Only the first answer of the day counts.
  3. **Desirable difficulty.** The question type gets harder as the word gets stronger (§4).
  4. **Context and sound.** Every word has an example sentence with a Thai translation and is spoken by TTS.
  5. **Honest progress.** A mile = a word answered correctly on three separate days (box 3).
     The odometer never goes down; a forgotten mile word becomes a *flat tire* to fix.
  6. **Reviews before new words.** A big review backlog stops new words for the day.
  7. **Known words go fast.** "รู้จักคำนี้แล้ว" on a new word gives a harder check instead of a lesson.

## §2 Words and content data

- `data/oxford3000.json` (built by `tools/build-wordlist.mjs` from OUP's free PDFs; never
  edit by hand). 3000 entries, ordered by level then alphabet:
  `{ "id", "w", "lv", "pos": [[code, level], ...], "sense"?, "batch" }`.
  A1 900, A2 800, B1 700, B2 600; 30 batches of 100 (`a1-01` … `a1-09`, `a2-01` … `b2-06`).
  - `id`: unique, lowercase ASCII and dashes. Words that share a spelling: `bank-money` /
    `bank-river`, `can-1` / `can-2`, `may` / `may-month`, `it` / `it-tech`, …
  - `w`: the word as printed (`a, an`, `T-shirt`, `o'clock`, `May`, `IT`), without
    homograph numbers or sense labels. It is what the player sees, hears and types.
  - `lv`: the lowest level among its POS. `sense`: OUP's sense label or our hint.
  - POS codes: `n v adj adv prep pron det conj exclam num modal aux art inf`.
- `content/<batch>.json`: written by Claude per `docs/CONTENT-GUIDE.md`:
  `{ "id", "p", "th", "ex", "exTh", "other"?, "e"?, "alt"?, "gapOnly"? }`.
  `p` = the POS this entry teaches; `ex` marks the word with `[brackets]`.
- `public/data/words.json`: built by `tools/build-data.mjs`; the only word file the
  browser loads: `{ "v": 1, "total": 3000, "levels": {"A1": 900, …}, "count": n, "words": [...] }`.
  A word = base fields (`id, w, lv, pos, sense?`) + content fields. Only words that have
  content are included, in base order. The route length is always `total` (3000).
- POS labels. Questions show the English label; the word detail also shows the Thai name.

| code | label | Thai | code | label | Thai |
|---|---|---|---|---|---|
| n | n. | คำนาม | conj | conj. | คำเชื่อม |
| v | v. | คำกริยา | exclam | exclam. | คำอุทาน |
| adj | adj. | คำคุณศัพท์ | num | number | ตัวเลข |
| adv | adv. | คำกริยาวิเศษณ์ | modal | modal v. | กริยาช่วย (modal) |
| prep | prep. | คำบุพบท | aux | aux. v. | กริยาช่วย |
| pron | pron. | คำสรรพนาม | art | article | คำนำหน้านาม |
| det | det. | คำกำหนดนาม | inf | to + verb | to หน้ากริยา |

## §3 Word state and spaced repetition

State per word: `state.cards[id]`. No entry = a new word.

```
{ "b": 3,       // box 1..8
  "d": 20512,   // due day (day numbers: §5)
  "g": 20508,   // day of the last graded answer
  "n": 4,       // graded answers
  "r": 3,       // correct graded answers
  "l": 0,       // lapses: wrong answers while b >= 3
  "m": 125,     // mile number (1..3000), set when it first reached box 3; never removed
  "md": 20508,  // day it became a mile
  "f": 1,       // flat tire: a mile word whose last graded answer was wrong (absent otherwise)
  "k": 1 }      // came in through "I know this" or Fast Lane (absent otherwise)
```

- `INTERVAL = [0, 1, 2, 4, 7, 14, 30, 60, 120]`: days until due after **entering** box b.
- **Correct** (graded): `b = min(8, b + 1)`, `d = today + INTERVAL[b]`, delete `f`.
  If `b >= 3` and there is no `m`: `m = miles + 1`, `md = today` (a new mile).
- **Wrong** (graded): if `b >= 3` then `l += 1`; if `m` then `f = 1`;
  `b = max(1, min(b - 2, 3))`; `d = today + 1`.
- Every graded answer: `n += 1`, `r += 1` when correct, `g = today`.
- **Graded once a day.** Only the first answer to a word on a day changes its state
  (`g !== today`). Later answers that day (re-asks, extra legs) are practice.
- **Taught new word** (Meet card, then a check question later in the leg): after the check,
  `{ b: 1, d: today + 1, g: today, n: 1, r: correct ? 1 : 0, l: 0 }`, whatever the answer.
- **"I know this"** (a `word` question right after the Meet card): correct →
  `{ b: 3, d: today + 4, g: today, n: 1, r: 1, l: 0, m: miles + 1, md: today, k: 1 }`
  (a mile at once). Wrong → the taught path (Meet card again, then the check).
- Status, used by the UI and filters:

| status | rule | Thai |
|---|---|---|
| new | no card | ยังไม่เริ่ม |
| learning | no `m` | กำลังจำ |
| flat | `f` | ยางแบน |
| mile | `m`, no `f`, `b < 6` | ได้ไมล์แล้ว |
| mastered | `m`, no `f`, `b >= 6` | ขึ้นใจ |

- `miles` = number of cards with `m`. It only goes up.

## §4 Question types

`meet` (a lesson, not graded) and six graded types.

| box before answering | types to pick from |
|---|---|
| new word, check after the Meet card | meaning |
| new word, "I know this" | word |
| 1 | meaning, listen |
| 2 | word, listen |
| 3 | gap, word |
| 4 | gap, spell |
| 5–8 | spell, gapType |

- Drop types that can't be made: `listen` needs TTS with an English voice; `gap` and
  `gapType` need `ex`. If nothing is left, use `meaning`.
- `gapOnly` words: box 0–3 → `gap`; box 4+ → `gapType` (also for the new-word check).
- Pick one allowed type at random (leg RNG) when the item is created. Re-asks keep the type.

| type | prompt | answer |
|---|---|---|
| meaning | the English word + POS label; spoken when shown (autoplay setting) | 4 Thai options (`th`) |
| listen | only a big 🔊 button + POS label; spoken at once; each replay alternates rate 0.75 / normal | 4 Thai options |
| word | `th` + POS label | 4 English options (`w`) |
| gap | `ex` with the bracketed part replaced by `_____`, `exTh` under it | 4 English options (`w` of target and distractors) |
| spell | `th` + POS label + letter hint `b _ _ _ _ _` | typed; matches `w`, any `alt`; `a, an` accepts `a` and `an` |
| gapType | like gap + letter hint of the bracketed text | typed; matches the bracketed text |

- `norm(s)` for typed answers: lowercase, trim, curly quotes to straight, collapse spaces,
  drop a trailing `.`. Letter hint: the first character, then `_` for every other letter;
  spaces, hyphens and apostrophes stay: `banana` → `b _ _ _ _ _`, `T-shirt` → `T-_ _ _ _ _`,
  `ice cream` → `i _ _   _ _ _ _ _`.
- Inputs: `autocomplete=off autocapitalize=off autocorrect=off spellcheck=false lang=en
  enterkeyhint=done`.
- **Distractors** (3 per MCQ): other loaded words, preferring in this order until there are
  three: same `p` and same `lv` → same `p` → any. Always skip: the target; words with the
  same `w` (case-insensitive; e.g. the other *bank*); words whose `th` overlaps the target's;
  a label that is already an option. **Gloss overlap:** split `th` on `", "`; two words
  overlap when any pair of glosses is equal, or one contains the other and the shorter one
  has at least 3 characters. Options are shuffled.
- **Feedback.** Correct: the option turns green with ✓, a short sound, the word is spoken
  (if it wasn't just spoken). `meaning`, `word`, `listen` advance by themselves after 900 ms;
  the others wait for **ต่อไป**. Wrong: the chosen option red ✗, the right one green, a mini
  word card (w, POS, th, example with the word highlighted, 🔊) and **ต่อไป**. After a gap
  question, show the full sentence with the bracketed part highlighted and speak it.
- **Keyboard:** 1–4 pick an option, Enter submits or continues, Space replays the sound
  (not while typing), Esc asks to leave the leg.
- **Meet card:** `w` (large) + 🔊, POS labels, emoji `e`, `th`, `other` senses, `ex` with
  the word highlighted + `exTh` + 🔊 for the sentence. Buttons: **จำแล้ว** (primary; the
  check question comes a few cards later) and **รู้จักคำนี้แล้ว** (secondary; asks a `word`
  question at once).

## §5 Days, plans, drives and legs

- **Day number:** `dayNumber(date, rolloverHour = 4)`: the local calendar date of
  `date − 4 h`, as `Date.UTC(y, m, d) / 86400000`. Playing at 1 a.m. counts for the day before.
- **Intro order of new words:** levels from `settings.startLevel` up to B2, then the lower
  levels; inside a level, a seeded shuffle (seed `"3000-miles"`) of the base order. Only
  words with content and no card.
- **Day plan** `state.days[today]`, made the first time the game opens on a day (a snapshot):
  - `due`: ids with `d <= today`, sorted by `d` then `b`, at most **100** (the rest wait).
  - `newTarget`: `settings.newPerDay` (5/10/15/20/30, default 10); **0** when more than
    100 words were due that morning (home says: ทวนคำค้างให้หมดก่อน).
  - `goal = due.length + newTarget`; counters start at 0: `done` (+1 for each planned due
    word graded today, +1 for each new word taught while `taught < newTarget`), `taught`,
    `known`, `right`, `wrong`, `miles`, `legs`; `shown` = ids of new words shown today.
- **Leg** = up to **20** words, saved in `state.leg` so it survives a reload or a closed app
  (dropped when the day changes):
  1. Reviews first: planned due words not graded today, at most 14.
  2. Fill up to 20 with new words (intro order, not in `shown`) while
     `taught + new in this leg < newTarget`. After the goal is reached, **ขับเพิ่ม** legs
     take new words only (up to 20), until 100 new words were shown today.
  3. Order: two reviews, one new word, two reviews, one new word, …, then the rest.
     A new word = a `meet` item; its `check` item goes 3 items later (or last).
- **In a leg:** a wrong answer puts the same word, same type, back 3 items later (or last),
  at most 2 re-asks per word per leg. "I know this" replaces the word's pending check with an
  immediate `word` question; if it is right and the plan still needs new words, one more new
  word is added at the end of the leg (at most 40 new words shown per leg).
- Leaving mid-leg keeps everything already answered; **ขับต่อ** resumes the saved leg.
- The leg ends when no items are left → results (`state.lastLeg` keeps the summary).

## §6 Progress: odometer, tank, streak, route

- **Odometer:** `miles` as 4 mechanical wheels + "miles". It rolls up when miles increase
  (the one loud moment; instant with reduced motion).
- **Tank** (daily goal): `min(1, done / goal)`; `goal = 0` → full after any leg.
- **Streak** `state.streak = { cur, best, last, rests }` (days on the road):
  - When the tank first becomes full on day t: if `last === t` nothing; if `last === t − 1`
    then `cur += 1`, else `cur = 1`; `last = t`; `best = max(best, cur)`; each time `cur` hits
    a multiple of 7, `rests = min(2, rests + 1)`.
  - When a new day's plan is made (day t) and `last` isn't null: `missed = t − 1 − last`.
    If `missed > 0`: if `rests >= missed` then `rests -= missed` and `last = t − 1` (streak
    kept), else `cur = 0`.
  - Rests are shown as small **P** (parking) signs, at most 2.
- **Flat tires:** count of cards with `f`. Home shows them; they come back as normal reviews.
- **Route** `public/data/route.json`: 16 stops. `at` = miles needed. `color` rotates
  `sign, sunset, sky, desert`. Facts are short A2 English, checked on 2026-09-25.

| id | at | city, state | fact | factTh |
|---|---|---|---|---|
| new-york | 0 | New York, NY | Your road trip starts here. More than eight million people live in New York City. | ทริปของคุณเริ่มที่นี่ นิวยอร์กมีคนอาศัยอยู่มากกว่าแปดล้านคน |
| philadelphia | 90 | Philadelphia, PA | The Liberty Bell is in this city. It has a famous crack. | ระฆังแห่งเสรีภาพอยู่ในเมืองนี้ และมีรอยร้าวที่มีชื่อเสียง |
| washington | 215 | Washington, DC | The President lives and works in the White House here. | ประธานาธิบดีอาศัยและทำงานที่ทำเนียบขาวในเมืองนี้ |
| pittsburgh | 440 | Pittsburgh, PA | Pittsburgh has more than 400 bridges. | พิตต์สเบิร์กมีสะพานมากกว่า 400 แห่ง |
| cleveland | 565 | Cleveland, OH | Cleveland is on Lake Erie. It has a big museum of rock and roll. | คลีฟแลนด์อยู่ริมทะเลสาบอีรี และมีพิพิธภัณฑ์ดนตรีร็อกแอนด์โรลขนาดใหญ่ |
| chicago | 880 | Chicago, IL | Route 66 starts here. Chicago is on Lake Michigan. | ถนนสาย 66 เริ่มต้นที่นี่ ชิคาโกอยู่ริมทะเลสาบมิชิแกน |
| st-louis | 1155 | St. Louis, MO | The Gateway Arch is 630 feet tall, the tallest arch in the world. | ประตูโค้งเกตเวย์สูง 630 ฟุต เป็นซุ้มโค้งที่สูงที่สุดในโลก |
| tulsa | 1520 | Tulsa, OK | Tulsa was once called the Oil Capital of the World. | ทัลซาเคยถูกเรียกว่าเมืองหลวงแห่งน้ำมันของโลก |
| oklahoma-city | 1615 | Oklahoma City, OK | Oklahoma City is the capital of Oklahoma. | โอคลาโฮมาซิตีเป็นเมืองหลวงของรัฐโอคลาโฮมา |
| amarillo | 1855 | Amarillo, TX | Amarillo means "yellow" in Spanish. | Amarillo ในภาษาสเปนแปลว่า "สีเหลือง" |
| albuquerque | 2120 | Albuquerque, NM | Every October, hundreds of hot air balloons fly here. | ทุกเดือนตุลาคม บอลลูนลมร้อนหลายร้อยลูกลอยขึ้นฟ้าที่นี่ |
| flagstaff | 2415 | Flagstaff, AZ | Flagstaff keeps its night sky dark, so you can see many stars. | แฟลกสแตฟดูแลให้ท้องฟ้ายามค่ำมืดสนิท จึงมองเห็นดาวได้มากมาย |
| grand-canyon | 2485 | Grand Canyon, AZ | The Grand Canyon is about 277 miles long and over a mile deep. | แกรนด์แคนยอนยาวประมาณ 277 ไมล์ และลึกกว่าหนึ่งไมล์ |
| las-vegas | 2740 | Las Vegas, NV | Las Vegas is in the desert. It gets very little rain. | ลาสเวกัสอยู่กลางทะเลทราย ฝนตกน้อยมาก |
| los-angeles | 2985 | Los Angeles, CA | Los Angeles is the second largest city in the United States. | ลอสแอนเจลิสเป็นเมืองใหญ่อันดับสองของสหรัฐอเมริกา |
| santa-monica | 3000 | Santa Monica, CA | This is the end of Route 66, next to the Pacific Ocean. | ที่นี่คือจุดสิ้นสุดของถนนสาย 66 ติดกับมหาสมุทรแปซิฟิก |

- Reaching a stop (miles cross `at`) unlocks its postcard: `state.stops[id] = day`.
  "Words from this part of the trip" = cards with `m` in `(previous stop's at, this at]`.

## §7 Screens (hash routes)

| route | what |
|---|---|
| `#/` | Home: odometer; guide sign NEXT STOP · city · miles to go; fuel gauge + today's plan line; main button (**ออกเดินทาง** first leg / **ขับต่อ** saved leg or plan not done / **ขับเพิ่ม** plan done); streak + P signs; flat tires; links to map, words, settings (later: Fast Lane, Highway Rush). While content is incomplete: "คำที่พร้อมเล่น 900/3000". |
| `#/drive` | The leg: top bar (exit, lane with a car that moves by answered/total), then the Meet card or question, feedback panel. |
| `#/results` | Leg summary: correct %, miles gained (odometer rolls), taught / known / reviewed, tank, buttons ขับต่อ/ขับเพิ่ม and กลับหน้าแรก; a new postcard if a stop was reached. |
| `#/map` | Vertical road from New York (top) to Santa Monica (bottom), stops as mile markers, reached stops as postcard tiles, the car at the current position. |
| `#/postcard/<id>` | Front: "Greetings from" + city in big block letters. Back: fact EN + TH (🔊), words earned on that part of the trip. |
| `#/words` | Word list: search (English prefix or Thai text), filters by level and status, pages of 100. |
| `#/word/<id>` | Word detail: everything about the word, box gauge 0–8, stats, next review, report a problem. |
| `#/settings` | New words per day, start level, voice + test, speech rate, autoplay, sound, theme, backup/restore, reset, about. |
| later | `#/fastlane`, `#/arcade` (Steps 8–9). |

## §8 Visual design

Mood: a night drive on an American highway. Road paint, green guide signs, an old
mechanical odometer. Calm screens; one loud moment (the odometer roll, the postcard).

- **Tokens** (top of `public/css/app.css`). Theme = setting `auto | light | dark`
  (`auto` follows `prefers-color-scheme`; apply with `data-theme` on `<html>`).

| token | dark (night drive) | light (day road) |
|---|---|---|
| --bg | #15171b | #eef1ee |
| --surface | #1f2329 | #ffffff |
| --surface-2 | #2a2f37 | #f4f6f4 |
| --line | #3a404a | #d5dbd6 |
| --text | #eceae4 | #16191d |
| --muted | #a3a7ad | #5d646c |
| --sign | #0e6b4f | #0b6146 |
| --lane | #f2c230 | #d9a400 |
| --ok | #3fb67a | #1f8f57 |
| --bad | #e5484d | #c9353a |
| --accent | #e8773a | #cf5f25 |

  Postcard colors: sign `#0e6b4f`, sunset `#e8773a`, sky `#2f7fc1`, desert `#b5533c`.
- **Fonts** (self-hosted, SIL OFL): Overpass 400/600/800 + italic 700 (Latin UI; looks like
  highway signs), Overpass Mono 600 (odometer, numbers), Anuphan 400/600 (Thai).
  `font-family: "Overpass", "Anuphan", system-ui, sans-serif` so Thai falls back to Anuphan.
- **Components**
  - Guide sign: `--sign` background, white text (Overpass 800), radius 10px, a thin white
    inner border (inset box-shadow).
  - Mile marker: small vertical green post with a white number.
  - Odometer: black wheels (`#0b0c0e`), white digits (Overpass Mono); each wheel is a
    column of 0–9 moved with `transform`, 900 ms ease-out; reduced motion = no transition.
  - Fuel gauge: small semicircle SVG, E / ½ / F, needle from −90° to 90°.
  - Leg lane: dark road strip with yellow dashes and a small car SVG.
  - Buttons: primary = `--lane` background with dark text (road paint), radius 12px,
    min-height 52px; secondary = outline. MCQ options: full-width, number badge 1–4.
  - Postcard: 3:2, thick white border; "Greetings from" in Overpass italic; the city in big
    block letters with a colored fill and a dark outline. No photos.
  - Icons: inline SVG in `public/js/icons.js`. No icon fonts.
- **Layout:** one column, `max-width: 560px`, 16px side padding, touch targets ≥ 48px.
  Check 390×844 (main), 1366×768, no horizontal scroll at 360px.
- **Motion:** only the odometer roll, the postcard flip-in (300 ms) and the car on the leg
  lane. `prefers-reduced-motion: reduce` → none.
- **Avoid:** cream backgrounds, grids of identical cards, purple/blue gradients, glass
  effects, emoji in UI chrome (emoji only as word pictures `e`), "→" in button text,
  all-caps sentences, decorative entrance animations.

## §9 Copy (Thai UI)

- Friendly and short. Address the player as คุณ. No ครับ/ค่ะ/ผม/ดิฉัน. Game terms can stay
  English where natural (miles, NEXT STOP on signs).
- Words: ไมล์, จุดแวะ, ขับ, ช่วง (leg), ถังน้ำมัน, ยางแบน, จุดพัก (rest), คลังคำศัพท์ (word list).
- Buttons: ออกเดินทาง, ขับต่อ, ขับเพิ่ม, จำแล้ว, รู้จักคำนี้แล้ว, ต่อไป, ตรวจคำตอบ, กลับหน้าแรก.
- Feedback: correct → one of ถูกต้อง / เยี่ยม / แม่นมาก; wrong → ยังไม่ใช่ คำตอบคือ …
- Examples: "วันนี้: ทวน 24 คำ · คำใหม่ 10 คำ", "เติมน้ำมันเต็มถังแล้ว วันนี้ขับครบ",
  "ยางแบน 3 คำ ทวนให้ถูกแล้วจะหายเอง", "ถึงชิคาโกแล้ว! ได้โปสการ์ดใบใหม่".

## §10 Storage and backup

localStorage key `miles3000.v1`:

```
{ "v": 1,
  "settings": { "newPerDay": 10, "startLevel": "A1", "voice": "", "rate": 0.9,
                "autoplay": true, "sound": true, "theme": "auto" },
  "cards": { "<id>": { …§3 } },
  "days": { "<day>": { …§5 plan } },
  "leg": null,
  "lastLeg": null,
  "streak": { "cur": 0, "best": 0, "last": null, "rests": 0 },
  "stops": { "<stopId>": <day> },
  "flags": { "<id>": { "day": <day>, "note": "" } },
  "arcade": { "best": 0, "runs": [] } }
```

- `normalizeState(saved)` fills anything missing; old saves must keep working. Never change
  the key; add fields instead.
- Save after every graded answer. Keep `days` for 400 days; drop the `due`/`shown` arrays
  of past days.
- Backup: `exportData()` → `{ "app": "3000-miles", "v": 1, "exportedAt", "data" }`, file
  `3000-miles-YYYY-MM-DD.json`. `importData(text)` checks `app`, replaces the whole state
  (no merge) after `normalizeState`.
- On the first run call `navigator.storage?.persist?.()`. Settings tells iPhone users to add
  the game to the Home Screen (Safari may clear data of sites not visited for 7 days) and to
  back up now and then.

## §11 Credits

README and the about card in settings:

> Word list: The Oxford 3000™ (American English) © Oxford University Press. This is a
> personal learning project, not affiliated with or endorsed by Oxford University Press.
> Thai meanings, example sentences and translations were written for this project.
> Fonts: Overpass, Overpass Mono, Anuphan (SIL Open Font License).
