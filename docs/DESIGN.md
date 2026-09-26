# 3000 Miles: game design

The rules in this file are the spec. Step files point to sections (§). If code and this
file disagree, fix the code, or ask the user before changing a rule.

## §1 Concept

Learn the 3,000 words of **The Oxford 3000 (American English)** by driving across the USA,
from New York to Santa Monica Pier. **Every word you really learn is one mile.**

- Player: a Thai university student (around A2–B1) preparing for Work and Travel USA 2027.
  Plays 10–15 minutes a day, mostly on a phone, sometimes on a laptop. UI in Thai, words in
  American English. Knows most A1 words and wants a challenge: a question that can be
  answered without thinking is wasted time. (The first playable version, Step 4, was too
  easy: the answer was on screen three cards before the question, "รู้จักคำนี้แล้ว" gave
  free miles, the options were unrelated words, and nothing was at stake. Rules 1, 3, 5, 7
  and 8 were rewritten on 2026-09-25. Rule 9 was added the same day, after the player drove
  extra legs until the old cap of 100 new words a day and had nothing left to play. Rule 10
  was added on 2026-09-26: the player asked for one level at a time instead of a start-level
  setting and a level skip.)
- Companion to *Journey to America* (`Desktop\ผลงาน\06-j1-quest`): that game ends at
  the airport (JFK), this road trip starts in New York.
- Learning rules the game is built on. Don't break them:
  1. **Test before teaching.** A new word is asked before it is shown (a *probe*, §5). The
     lesson (Meet card) only follows a miss: trying first makes the lesson stick. After
     that, every contact with a word is a question.
  2. **Spacing.** Leitner boxes with growing intervals (§3). Only the first answer of the day counts.
  3. **Desirable difficulty.** Typing starts on the first day, and questions get harder as
     the word gets stronger: look-alike options, listening, shorter hints (§4).
  4. **Context and sound.** Every word has an example sentence with a Thai translation and is spoken by TTS.
  5. **Honest progress.** A mile = a word answered correctly on three separate days (box 3),
     or a word the player already knew: recognized cold, then typed from its Thai meaning
     (§3). The odometer never goes down; a forgotten mile word becomes a *flat tire* to fix.
  6. **Reviews before new words.** A big review backlog stops new words for the day.
  7. **Known words go fast.** A right probe skips the lesson; one typed answer proves it.
  8. **Stakes, not punishment.** Score, combo, stars and a checkpoint exam at every city
     (§6) make each answer count. A bad answer can cost points, stars or a day's wait,
     never miles.
  9. **Limit new words, not play.** Every new word brings 5–8 reviews over the next months.
     Simulated with the game's own `srs.js` (2026-09-25): 100 new words in one day doubles
     the daily reviews for two weeks, and above about 15 new words a day the review cap
     (§5) blocks new words on many days without getting there much sooner. So new words
     are capped per day (the plan plus one extra leg, §5). Play that adds no new words and
     never touches cards (Highway Rush, after the day's plan) has no limit.
  10. **One level at a time.** New words come in level order, A1 → A2 → B1 → B2. There is
     no start-level setting and no way to skip a level: known words already go fast (rule 7,
     two right answers and they are miles). Simulated with the game's own `plan.js` +
     `srs.js` (2026-09-26, 240 days at 10 new words a day, a player who knows 85/60/35/20% of
     A1/A2/B1/B2 words; stronger and weaker players point the same way): the order barely
     changes the miles (2,362, against 2,382 when starting at B1), but it decides what is
     still missing when time runs out (B2, instead of 600 A2 words), gives more miles early
     (known A1 words are miles at once), fewer reviews (62 a day against 70), and a road
     that gets harder going west: A1 ≈ New York to Chicago, A2 ≈ on to Oklahoma, B1 ≈ on to
     Flagstaff, B2 ≈ Grand Canyon to Santa Monica.

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
  "k": 1 }      // known before any lesson: probe + confirm (absent otherwise)
```

- `INTERVAL = [0, 1, 2, 4, 7, 14, 30, 60, 120]`: days until due after **entering** box b.
- **Correct** (graded): `b = min(8, b + 1)`, `d = today + INTERVAL[b]`, delete `f`.
  If `b >= 3` and there is no `m`: `m = miles + 1`, `md = today` (a new mile).
- **Wrong** (graded): if `b >= 3` then `l += 1`; if `m` then `f = 1`;
  `b = max(1, min(b - 2, 3))`; `d = today + 1`.
- Every graded answer: `n += 1`, `r += 1` when correct, `g = today`.
- **Graded once a day.** Only the first answer to a word on a day changes its state
  (`g !== today`). Later answers that day (re-asks, extra legs) are practice.
- **Taught new word** (a missed probe, the Meet card, then a `check` question later in the
  leg): after the check, `{ b: 1, d: today + 1, g: today, n: 1, r: correct ? 1 : 0, l: 0 }`,
  whatever the answer. A wrong `confirm` (below) also makes a taught word (`r: 0`).
- **Known word** (a right probe, then a right `confirm` later in the leg):
  `{ b: 3, d: today + 4, g: today, n: 1, r: 1, l: 0, m: miles + 1, md: today, k: 1 }`
  (a mile at once: it was recognized before any lesson and typed from its Thai meaning).
- **Checkpoint answers** (§6): a wrong answer to a word not graded today is graded like a
  review (`gradeCard(card, false, …)`: box down, a mile word gets a flat tire); a right
  answer changes nothing (no early promotion). Words graded earlier today: practice.
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

Item kinds (§5): `probe` (a new word, asked before any lesson), `meet` (the lesson, not
graded), `check` (after the Meet card), `confirm` (after a right probe), `review`, `reask`,
and `exam` (a checkpoint question, §6). Seven question types.

| item, or box before answering | types to pick from | letter hint |
|---|---|---|
| probe | meaning | – |
| confirm | spell | short |
| check | spell | full |
| 1 | word, listen | – |
| 2 | gap, spell, dictation | full |
| 3 | spell, gapType, dictation | full |
| 4 | gapType, dictation, say | short |
| 5–8 | gapType, spell, dictation, say | short |
| exam | spell, gapType, dictation | short |

- `meaning` only appears as a probe. Typing starts on day one (the check or the confirm)
  and is the main diet from box 2.
- `say` (Step 13) only exists when the setting โหมดพูด is on and the browser can listen
  (`canListen()`); never in an `exam`. Without those it is dropped like the types below.
- Drop types that can't be made: `listen` and `dictation` need TTS with an English voice;
  `gap` and `gapType` need `ex`. If nothing is left, use `spell` (`word` in box 1).
- `gapOnly` words: `gap` in the multiple-choice rows (probe, box 1), `gapType` in all others.
- Pick one allowed type at random (leg RNG) when the item is created. The item keeps its
  type and its hint (`item.hint`: `'full'` or `'short'`); re-asks copy both.

| type | prompt | answer |
|---|---|---|
| meaning | the English word + POS label; spoken when shown (autoplay setting) | 4 Thai options (`th`) |
| listen | only a big 🔊 button + POS label; spoken at once; each replay alternates rate 0.75 / normal | 4 Thai options |
| word | `th` + POS label | 4 English options (`w`) |
| gap | `ex` with the bracketed part replaced by `_____`, `exTh` under it | 4 English options (`w` of target and distractors) |
| spell | `th` + POS label + letter hint | typed; matches `w`, any `alt`; `a, an` accepts `a` and `an` |
| gapType | like gap + letter hint of the bracketed text | typed; matches the bracketed text |
| say | `th` + POS label + a big mic button (Space also starts/stops); no hint | spoken, en-US, 5 alternatives: right when any one, after `norm`, equals an accepted spelling or contains it as a whole word. A miss shows what was heard and allows one more try; a second miss or a mic error turns the question into `spell` (full or short hint as the item says), graded as usual |
| dictation | a big 🔊 button + POS label + `th` small and muted; spoken at once; replays like listen; no letter hint | typed; like spell |

- `norm(s)` for typed answers: lowercase, trim, curly quotes to straight, collapse spaces,
  drop a trailing `.`.
- **Letter hints.** Full: the first character, then `_` for every other letter; spaces,
  hyphens and apostrophes stay: `banana` → `b _ _ _ _ _`, `T-shirt` → `T-_ _ _ _ _`,
  `ice cream` → `i _ _   _ _ _ _ _`. Short: the first character of each space-separated
  part + `…`: `banana` → `b…`, `ice cream` → `i… c…`, `T-shirt` → `T…`. The first letter
  always stays: it rules out synonyms (Thai ใหญ่ could be *big* or *large*).
- Inputs: `autocomplete=off autocapitalize=off autocorrect=off spellcheck=false lang=en
  enterkeyhint=done`.
- **Distractors** (3 per MCQ): other loaded words. **Look-alikes first:** up to 2 words
  whose `w` (lowercase, the part before the first `", "`) looks like the target's: edit
  distance (Levenshtein) ≤ max(1, ⌊longer length / 3⌋), or the same first 4+ letters;
  closest first, ties in random order. band → bank, bend, hand; quiet → quite, quit;
  accept → except. They make the player read the whole word; in `meaning` and `listen`
  their Thai meanings become the wrong options. Then, until there are three: same `p` and
  same `lv` → same `p` → any. Always skip (look-alikes too): the target; words with the
  same `w` (case-insensitive; e.g. the other *bank*); words whose `th` overlaps the target's;
  a label that is already an option. **Gloss overlap:** split `th` on `", "`; two words
  overlap when any pair of glosses is equal, or one contains the other and the shorter one
  has at least 3 characters. Options are shuffled.
- **Feedback.** Correct: the option turns green with ✓, a short sound, the word is spoken
  (if it wasn't just spoken). `meaning`, `word`, `listen` advance by themselves after 900 ms;
  the others wait for **ต่อไป**. Wrong: the chosen option red ✗, the right one green, a mini
  word card (w, POS, th, example with the word highlighted, 🔊) and **ต่อไป**. After a gap
  question, show the full sentence with the bracketed part highlighted and speak it.
  `dictation`: right → show the word; wrong → the mini card.
- **Probe.** A `meaning` question (`gap` for `gapOnly`) with a secondary full-width button
  **ไม่รู้จักคำนี้** under the options. Right: as any right answer. Wrong: the chosen option
  red ✗, the right one green, "ยังไม่ใช่ คำตอบคือ …", no mini card, and the primary button
  **เรียนคำนี้**, which opens the Meet card. **ไม่รู้จักคำนี้**: no ✓/✗, the Meet card at once.
- **Synonym retry.** A wrong typed answer (`spell`, `gapType`) that equals, after `norm`, the
  `w` or an `alt` of another loaded word whose `th` overlaps the target's (typing *bike*
  when *bicycle* is asked for จักรยาน) is not graded: "ความหมายใกล้เคียง แต่ยังไม่ใช่คำที่
  ต้องการ ลองอีกครั้ง", the input is cleared, one more try. Once per question.
- **Speed bar** (drive only, multiple-choice types): a thin bar under the prompt that
  empties in 6 s. Answering while it runs earns the speed bonus (§6). It never ends the
  question.
- **Stage tags** above the question: probe "คำใหม่ รู้จักไหม", meet "คำใหม่", confirm
  "เช็กว่ารู้จริง", check and review "คำถาม", reask "ลองอีกครั้ง", exam "ด่านตรวจ".
- **Keyboard:** 1–4 pick an option, 0 = ไม่รู้จักคำนี้ on a probe, Enter submits or
  continues, Space replays the sound (not while typing), Esc asks to leave the leg.
- **Meet card:** `w` (large) + 🔊, POS labels, emoji `e`, `th`, `other` senses, `ex` with
  the word highlighted + `exTh` + 🔊 for the sentence. One button: **จำแล้ว** (primary);
  the check question comes 4 items later. There is no "I know this": the probe already asked.

## §5 Days, plans, drives and legs

- **Day number:** `dayNumber(date, rolloverHour = 4)`: the local calendar date of
  `date − 4 h`, as `Date.UTC(y, m, d) / 86400000`. Playing at 1 a.m. counts for the day before.
- **Intro order of new words:** one level at a time, A1, A2, B1, B2 (§1 rule 10); inside a
  level, a seeded shuffle (seed `"3000-miles"`) of the base order. Only words with content
  and no card: while a level's content isn't all written, the next level's words come after
  the ones that exist, and new content of a lower level comes first again. So content is
  written in level order (CONTENT-GUIDE).
- **Day plan** `state.days[today]`, made the first time the game opens on a day (a snapshot):
  - `due`: ids with `d <= today`, sorted by `d` then `b`, at most **100** (the rest wait).
  - `newTarget`: `settings.newPerDay` (5/10/15/20/30, default 10); **0** when more than
    100 words were due that morning (home says: ทวนคำค้างให้หมดก่อน).
  - `goal = due.length + newTarget`; counters start at 0: `done` (+1 for each planned due
    word graded today, +1 for each new word resolved, taught or known, while
    `taught + known <= newTarget`), `taught`, `known`, `right`, `wrong` (first answers:
    probes, checks, confirms, reviews; not re-asks, not ไม่รู้จักคำนี้), `miles`, `legs`,
    `score` (§6); `shown` = ids of new words shown today.
- **Leg** = up to **20** words, saved in `state.leg` (with `v: 2`; a saved leg without it
  comes from an older version and is dropped) so it survives a reload or a closed app
  (dropped when the day changes):
  1. Reviews first: planned due words not graded today, at most 14.
  2. Fill up to 20 with new words (intro order, not in `shown`) while
     `taught + known + new in this leg < newTarget`. After the goal is reached, **one**
     **ขับเพิ่ม** leg takes up to 10 more new words (`EXTRA_NEW`), and that is all for the
     day: at most `newCap(plan)` = `newTarget + 10` new words are shown a day, and none
     extra on a backlog day (`newTarget` 0). `newLeft(plan, cards, order)` tells home and
     results whether a new word can still be shown (§1 rule 9).
  3. Order: two reviews, one new word, two reviews, one new word, …, then the rest.
     A new word enters as one `probe` item.
- **New word flow** (rule 1 of §1):
  - right probe → its `confirm` item 6 items later (or last);
  - wrong probe, or ไม่รู้จักคำนี้ → the Meet card next, then its `check` item 4 items
    after the Meet card (or last);
  - right confirm → a known word, wrong confirm → a taught word (§3). Both count toward
    `newTarget`: a player who knows many of the words finishes the day sooner.
- **In a leg:** a wrong answer puts the same word, same type and hint back 3 items later
  (or last), at most 2 re-asks per word per leg. A probe is never re-asked: the lesson follows.
- Leaving mid-leg keeps everything already answered; **ขับต่อ** resumes the saved leg.
- The leg ends when no items are left → results (`state.lastLeg` keeps the summary).

## §6 Progress: odometer, tank, streak, route, checkpoints, score

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

- Reaching a stop (miles cross `at`) opens its checkpoint; passing the checkpoint unlocks
  its postcard: `state.stops[id] = day`. New York's postcard is unlocked from the start.
  "Words from this part of the trip" = cards with `m` in `(previous stop's at, this at]`.

### Checkpoints (ด่านตรวจ)

Every stop after New York has an exam: the boss of that part of the trip.
- It opens when `miles >= at`. Home offers the first open checkpoint in route order that
  isn't cleared (passed, or its postcard was unlocked before checkpoints existed).
- Exam: 15 words sampled (seed: day + stop id) from that stop's words (fewer if the part
  has fewer). Santa Monica, the finale: 30 from all mile words. Types and hints from the
  `exam` row of §4. No re-asks and no speed bar; after each answer ✓/✗, and the answer on
  a miss.
- Pass: at least 80% right. Stars: 100% ★★★, ≥ 90% ★★, a pass ★.
- One try per checkpoint per day; a try counts when the exam is finished. A passed
  checkpoint can be tried again for more stars (`best` never goes down).
- Word state: §3 Checkpoint answers (a miss is graded wrong, a right answer changes nothing).
- Until it is passed, the car on the map waits at the city limits (the map uses
  `min(miles, at)` of the open checkpoint). The odometer keeps counting.
- State: `state.checkpoints[id] = { best: 0–3, passed: day | null, last: day, tries }`;
  `state.exam` keeps today's unfinished exam (dropped when the day changes).

### Score, combo and stars

Per leg, in `score.js`. None of it touches word state.
- A right answer earns `POINTS[type] × speed × combo multiplier`, rounded. `POINTS`:
  meaning 10, listen 10, word 10, gap 15, spell 20, gapType 25, dictation 25.
- Speed (multiple-choice types; time from the question shown to the answer): ≤ 3 s ×1.5,
  ≤ 6 s ×1.2, slower ×1. Typed types ×1.
- Combo = right answers in a row in this leg, this one included. Multiplier: 5+ ×1.5,
  10+ ×2, 20+ ×3. A wrong answer sets it to 0. Re-asks and ไม่รู้จักคำนี้ are neutral: no
  points, the combo stays (admitting "I don't know" is never worse than a guess).
- Stars for the leg from its right % (`right`/`wrong` of §5): ≥ 95% ★★★, ≥ 80% ★★, else ★.
- `plan.score` adds up the day's legs. `state.records = { combo, day, dayOn }`: the best
  combo ever and the best day score (with its day). The results screen says สถิติใหม่ when
  one is beaten.

## §7 Screens (hash routes)

| route | what |
|---|---|
| `#/` | Home: odometer; guide sign NEXT STOP · city · miles to go (CHECKPOINT · city with a barrier stripe while a checkpoint is open); fuel gauge + today's plan line + the level line (below); today's score and the records; main button (**ออกเดินทาง** first leg / **ขับต่อ** saved leg or plan not done / **ขับเพิ่ม** plan done and the one extra leg not driven yet); when nothing is left to drive today (`newLeft` false after the plan), a calm note replaces the main button: "วันนี้ขับครบแล้ว พรุ่งนี้มาขับต่อ" + "เรียนทีละน้อยทุกวัน จำได้นานกว่าเรียนรวดเดียว", with a primary **Highway Rush** button under it once unlocked; **เข้าด่าน** while a checkpoint is open and not tried today; streak + P signs; flat tires; links to map, words, settings, Highway Rush (once unlocked: its best score, or "เปิดเมื่อขับครบแผนวันนี้" while the day's plan isn't done). While content is incomplete: "คำที่พร้อมเล่น 900/3000". |
| `#/drive` | The leg: top bar (exit, lane with a car that moves by answered/total, `n / total`, leg score, combo chip, mile chip), then the probe, Meet card or question, feedback panel. |
| `#/results` | Leg summary: score and stars, best combo, records beaten, correct %, miles gained (odometer rolls), taught / known / reviewed, tank, buttons ขับต่อ / ขับเพิ่ม (the one extra leg) / **Highway Rush** (nothing left to drive, once unlocked) and กลับหน้าแรก; "ถึงด่านตรวจ <city> แล้ว" + **เข้าด่าน** if a stop was reached. |
| `#/checkpoint/<id>` | A stop's exam (§6): intro (city, "15 คำ · ผ่าน 12 คำขึ้นไป · สอบได้วันละครั้ง", best stars, **เริ่มสอบ**), the questions, the end (x / n, stars, passed or not, missed words, **รับโปสการ์ด** / **กลับหน้าแรก**). |
| `#/map` | Vertical road from New York (top) to Santa Monica (bottom), stops as mile markers, unlocked stops as postcard tiles with their checkpoint stars, a barrier at the open checkpoint, the car at the current position (it waits at an open checkpoint). |
| `#/postcard/<id>` | Front: "Greetings from" + city in big block letters. Back: fact EN + TH (🔊), words earned on that part of the trip. |
| `#/words` | Word list: search (English prefix or Thai text), filters by level and status, pages of 100. |
| `#/word/<id>` | Word detail: everything about the word, box gauge 0–8, stats, next review, report a problem. |
| `#/settings` | New words per day (+ a note: new words come one level at a time, known words go fast), voice + test, speech rate, autoplay, sound, theme, backup/restore, reset, about. |
| `#/arcade` | Highway Rush (Step 12): a 60-second run with three strikes over words that have a card, except words due today and not graded yet (no early reviews). Opens once 40 words have a card and today's plan is done; then it can be played as often as the player likes. Never touches cards (§1 rule 9). |

- **Level line** (home, under the tank line): "ระดับ A1 · เริ่มแล้ว 120 / 900 คำ" =
  `currentLevel(order, cards, byId, levels)`: the level of the next new word in the intro
  order; once every word with content has a card, the first level that isn't complete (it
  waits for content). The numbers are that level's words with a card / its words in the
  whole list (`words.json` `levels`). Hidden when every level is complete.

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
  - Combo chip: dark like the mile chip, "ติดกัน 7" + the multiplier in `--lane` (×1.5,
    ×2, ×3); hidden below 3 in a row.
  - Speed bar: 4px, `--lane` on `--line`, the width of the prompt; `transform: scaleX(1 → 0)`
    over 6 s, linear; it stops where it is when the player answers.
  - Stars: 3 inline SVG stars, filled `--lane` / empty outline `--line`.
  - Checkpoint: the guide sign with a red-and-white striped bar across its top (a road
    barrier: `repeating-linear-gradient` of `--bad` and white).
  - Traffic cones (Highway Rush strikes): 3 small orange SVG cones; a strike greys one out.
  - Icons: inline SVG in `public/js/icons.js`. No icon fonts.
- **Layout:** one column, `max-width: 560px`, 16px side padding, touch targets ≥ 48px.
  Check 390×844 (main), 1366×768, no horizontal scroll at 360px.
- **Motion:** only the odometer roll, the postcard flip-in (300 ms), the car on the leg
  lane and the speed bar. `prefers-reduced-motion: reduce` → none (the speed bar is hidden;
  the bonus still counts).
- **Avoid:** cream backgrounds, grids of identical cards, purple/blue gradients, glass
  effects, emoji in UI chrome (emoji only as word pictures `e`), "→" in button text,
  all-caps sentences, decorative entrance animations.

## §9 Copy (Thai UI)

- Friendly and short. Address the player as คุณ. No ครับ/ค่ะ/ผม/ดิฉัน. Game terms can stay
  English where natural (miles, NEXT STOP on signs).
- Words: ไมล์, จุดแวะ, ขับ, ช่วง (leg), ถังน้ำมัน, ยางแบน, จุดพัก (rest), คลังคำศัพท์ (word list),
  ด่านตรวจ (checkpoint), คะแนน, ติดกัน (combo), ดาว, สถิติ (record).
- Buttons: ออกเดินทาง, ขับต่อ, ขับเพิ่ม, ไม่รู้จักคำนี้, เรียนคำนี้, จำแล้ว, ต่อไป, ตรวจคำตอบ,
  เข้าด่าน, เริ่มสอบ, รับโปสการ์ด, กลับหน้าแรก.
- Feedback: correct → one of ถูกต้อง / เยี่ยม / แม่นมาก; wrong → ยังไม่ใช่ คำตอบคือ …
- Examples: "วันนี้: ทวน 24 คำ · คำใหม่ 10 คำ", "เติมน้ำมันเต็มถังแล้ว วันนี้ขับครบ",
  "วันนี้ขับครบแล้ว พรุ่งนี้มาขับต่อ", "เปิดเมื่อขับครบแผนวันนี้",
  "ยางแบน 3 คำ ทวนให้ถูกแล้วจะหายเอง", "ถึงชิคาโกแล้ว! ได้โปสการ์ดใบใหม่",
  "ติดกัน 12 · ×2", "สถิติใหม่: ติดกัน 23 ครั้ง", "คะแนนวันนี้ 1,240 · สถิติ 2,380",
  "ถึงด่านตรวจ Philadelphia แล้ว", "ผ่านด่านแล้ว! ได้โปสการ์ดใบใหม่",
  "ยังไม่ผ่าน ต้องได้ 12 จาก 15 ลองใหม่พรุ่งนี้".

## §10 Storage and backup

localStorage key `miles3000.v1`:

```
{ "v": 1,
  "settings": { "newPerDay": 10, "voice": "", "rate": 0.9,
                "autoplay": true, "sound": true, "theme": "auto" },
  "cards": { "<id>": { …§3 } },
  "days": { "<day>": { …§5 plan } },
  "leg": null,
  "lastLeg": null,
  "streak": { "cur": 0, "best": 0, "last": null, "rests": 0 },
  "stops": { "<stopId>": <day> },
  "checkpoints": { "<stopId>": { "best": 2, "passed": 20510, "last": 20512, "tries": 3 } },
  "exam": null,
  "records": { "combo": 0, "day": 0, "dayOn": null },
  "flags": { "<id>": { "day": <day>, "note": "" } },
  "arcade": { "best": 0, "runs": [] } }
```

- `normalizeState(saved)` fills anything missing; old saves must keep working. Never change
  the key; add fields instead. A retired field is dropped: `settings.startLevel` (§1 rule 10).
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
