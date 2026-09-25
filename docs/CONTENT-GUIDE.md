# Content guide (Thai meanings and example sentences)

Every word needs a Thai meaning, one example sentence and its Thai translation. Claude
writes them in batches of 100 (`content/a1-01.json` … `content/b2-06.json`). The player is
a Thai student going to live and work in the US: prefer everyday American situations
(work shifts, customers, stores, food, travel, apartments, friends, school).

## Workflow for one batch

1. `npm run check -- --todo a2-03` prints the batch: `id | word | pos:level | sense`.
2. Write `content/a2-03.json` with **one Write call**: a JSON array, **one entry per
   line**, same order as `--todo`, all 100 ids.
3. `npm run check -- a2-03` and fix every error with Edit on that line (never rewrite the
   whole file to fix one entry). Fix warnings when they point at a real problem.
4. Next batch. At the end of the session: `npm run build:data`, `npm test`, tick the C-step
   in `docs/ROADMAP.md`, add a Log line, commit `C3: content a2-01..a2-04`.

Token rules for content sessions: don't read code, DESIGN.md or other batches (to keep a
word family consistent, `grep` for the related id only). Don't paste entries into the chat
and don't print a file after writing it.

## Entry format

```json
{"id":"answer","p":"v","th":"ตอบ","ex":"Can you [answer] my question?","exTh":"คุณช่วยตอบคำถามของฉันได้ไหม","other":[["n","คำตอบ"]]}
```

| key | required | rule |
|---|---|---|
| `id` | yes | from `--todo` |
| `p` | yes | the POS this entry teaches: one of the word's codes. Pick the most useful everyday sense, usually a POS at the word's own level. `th`, `ex` and the question label all use it. |
| `th` | yes | Thai meaning(s) for `p`: 1–3 glosses joined by `", "`, most common first (the first one is what the player remembers), at most 45 characters. Natural modern Thai a student would say ("เช็ก", "แอป" are fine). No English letters, no ครับ/ค่ะ. Parentheses only for a function word or a US-only meaning. |
| `ex` | yes | one natural American English sentence, 5–12 words, using the word in sense `p`. Mark the word with `[ ]` exactly once; the bracketed text is the exact form used: `[went]`, `[children]`, `[bigger]`, `[According to]`. Other words simple (A1–A2; at most one word outside the Oxford 3000). American spelling. Capital letter first; ends with `.` `?` or `!`; plain ASCII (straight quotes). |
| `exTh` | yes | natural Thai translation of the whole sentence (meaning, not word by word). ฉัน for I, คุณ for you, เขา/เธอ for he/she. No ครับ/ค่ะ. |
| `other` | no | up to 2 other POS of the same word as `[code, thai]` when the Thai is clearly different and useful. Skip when it would be the same Thai. |
| `e` | no | one emoji only when it clearly shows the word (mostly concrete nouns). Never for abstract words. When unsure, leave it out. |
| `alt` | no | other spellings accepted when typing: OK `["okay"]`, all right `["alright"]`, T-shirt `["t shirt","tshirt"]`. Not British spellings. |
| `gapOnly` | no | `true` only for words that can't be quizzed as a translation: `a, an`, `the`. They are asked as gap-fill only. |

### Thai meaning by POS

- n. → Thai noun: decision "การตัดสินใจ", happiness "ความสุข".
- v. → Thai verb, no การ: decide "ตัดสินใจ".
- adj. → bare Thai adjective: expensive "แพง", boring "น่าเบื่อ".
- adv. → quickly "อย่างรวดเร็ว", always "เสมอ", almost "เกือบ".
- prep./conj./pron./det. → the usual Thai word: in "ใน", because "เพราะ", which "อันไหน, ซึ่ง".
- modal v. → must "ต้อง", should "ควร", might "อาจจะ".
- number → "แปด (8)". Months and days → "เดือนสิงหาคม", "วันจันทร์".
- `--todo` shows `sense` for words that share a spelling (bank-river "river", can-2
  "metal container", lie-1 "be flat, rest"). Write that meaning only.
- US-only everyday meanings are worth adding: fall (n.) "ฤดูใบไม้ร่วง (อเมริกัน)",
  check (n.) "บิลค่าอาหาร (อเมริกัน)".
- Keep a word family consistent inside a batch (act / action / active / activity).

## Good entries

```json
{"id":"apple","p":"n","th":"แอปเปิล","ex":"She eats an [apple] every morning.","exTh":"เธอกินแอปเปิลทุกเช้า","e":"🍎"}
{"id":"go","p":"v","th":"ไป","ex":"We [went] to the beach last weekend.","exTh":"เมื่อสุดสัปดาห์ที่แล้วเราไปทะเลกัน"}
{"id":"big","p":"adj","th":"ใหญ่","ex":"Our new apartment is [bigger] than the old one.","exTh":"อพาร์ตเมนต์ใหม่ของเราใหญ่กว่าที่เก่า"}
{"id":"fall","p":"v","th":"ตก, หล่น, ล้ม","ex":"Be careful, don't [fall] on the ice.","exTh":"ระวังนะ อย่าลื่นล้มบนน้ำแข็ง","other":[["n","ฤดูใบไม้ร่วง (อเมริกัน), การหกล้ม"]]}
{"id":"check","p":"v","th":"ตรวจสอบ, เช็ก","ex":"Please [check] your answers before you finish.","exTh":"ช่วยตรวจคำตอบก่อนส่งด้วยนะ","other":[["n","การตรวจสอบ, บิลค่าอาหาร (อเมริกัน)"]]}
{"id":"eight","p":"num","th":"แปด (8)","ex":"The store opens at [eight] in the morning.","exTh":"ร้านเปิดตอนแปดโมงเช้า"}
{"id":"bank-river","p":"n","th":"ริมฝั่งแม่น้ำ, ตลิ่ง","ex":"We had lunch on the [bank] of the river.","exTh":"เรากินข้าวกลางวันกันที่ริมฝั่งแม่น้ำ"}
{"id":"according-to","p":"prep","th":"ตามที่...บอก, อ้างอิงจาก","ex":"[According to] the weather report, it will rain today.","exTh":"ตามพยากรณ์อากาศ วันนี้ฝนจะตก"}
{"id":"a-an","p":"art","th":"หนึ่ง (นำหน้านามทั่วไป)","ex":"I need [an] umbrella today.","exTh":"วันนี้ฉันต้องใช้ร่ม","gapOnly":true}
{"id":"wow","p":"exclam","th":"ว้าว, โอ้โห","ex":"[Wow], this view is amazing!","exTh":"โอ้โห วิวนี้สวยมาก!"}
{"id":"tip","p":"n","th":"ทิป, เงินทิป","ex":"In the US, people leave a [tip] for the waiter.","exTh":"ที่อเมริกา คนจะให้ทิปพนักงานเสิร์ฟ","other":[["v","ให้ทิป"]]}
{"id":"abandon","p":"v","th":"ทิ้ง, ละทิ้ง","ex":"They had to [abandon] the car in the snow.","exTh":"พวกเขาต้องทิ้งรถไว้กลางหิมะ"}
```

## Mistakes to avoid

- decide `"th":"การตัดสินใจ"`: a noun for a verb. Write "ตัดสินใจ".
- `"ex":"The [abandonment] was sad."`: not a form of *abandon*, and says nothing.
- `"ex":"I [decide]."`: too short, no situation.
- `"exTh":"ฉัน ต้อง ทิ้ง รถ"`: word by word. Write Thai people would say.
- Copying a dictionary example. Write your own sentence.
- Real people or brands, and heavy topics (violence, politics, religion). Words like *gun*,
  *war*, *drug* get a short, neutral, factual sentence.

## What the checker checks

Errors (must be fixed):

1. The file is a JSON array of objects; no unknown keys; `id p th ex exTh` present.
2. Each `id` belongs to this batch, once; all 100 ids are there.
3. `p` is one of the word's POS codes.
4. `th`: has Thai letters, no Latin letters outside parentheses, at most 45 characters,
   glosses joined by `", "` (no `;` or `/`).
5. `ex`: exactly one `[...]`; 4–14 words; starts with a capital letter (after an optional
   `[`); ends with `.` `?` or `!`; ASCII only.
6. The bracketed text is a form of the word (case-insensitive): the word itself; -s, -es,
   -ies; -ed, -d, -ied; -ing (also make → making, lie → lying); a doubled last consonant
   (stopped, bigger); -er, -est, -r, -st, -ier, -iest; 's and s'; or an irregular form
   listed in `tools/lib/forms.mjs`. Phrases inflect the first word (has to, had to);
   hyphenated words the last part (T-shirts); `a, an` is a or an. If a correct irregular
   form is missing, add it to `IRREGULAR` with a test; don't weaken the check.
7. `exTh`: has Thai letters, no ครับ / ค่ะ.
8. `other`: at most 2 pairs; each code is one of the word's codes and not `p`; Thai as in 4.
9. `e`: a single emoji. `alt`: non-empty ASCII strings. `gapOnly`: `true`.

Warnings (look at them): more than one word of `ex` outside the Oxford 3000; more than 3
glosses; the same `th` as another entry in the batch.

## Batches per C-step

| step | batches | words |
|---|---|---|
| Step 1 (pilot) | a1-01 | 100 |
| C1 | a2-01 b1-01 b2-01 | 300 |
| C2 | a2-02 b1-02 b2-02 | 300 |
| C3 | a2-03 b1-03 b2-03 | 300 |
| C4 | a2-04 b1-04 b2-04 | 300 |
| C5 | a2-05 b1-05 b2-05 | 300 |
| C6 | a2-06 b1-06 b2-06 | 300 |
| C7 | a2-07 a2-08 b1-07 | 300 |
| C8 | a1-02 a1-03 a1-04 a1-05 | 400 |
| C9 | a1-06 a1-07 a1-08 a1-09 | 400 |

The player knows most A1 words, so A2, B1 and B2 come first, and each step adds words at
all three of those levels (the start-level setting can then point at any of them). Steps
with B-level batches have three batches because those words need more care. Write the
batches in the order of the table. If a session runs long, stop after a finished batch,
log what is left, and let the next session continue the step.
