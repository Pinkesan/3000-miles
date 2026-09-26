import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { hashSeed, makeRng, shuffle, pick, sample } from '../public/js/rng.js';
import { dayNumber, dayToDate, daysBetween } from '../public/js/day.js';
import * as srs from '../public/js/srs.js';
import * as text from '../public/js/text.js';
import * as quiz from '../public/js/quiz.js';
import * as plan from '../public/js/plan.js';
import * as progress from '../public/js/progress.js';

// ---- fixtures ---------------------------------------------------------------------------

const THS = ['แมว', 'สุนัข', 'บ้าน', 'รถยนต์', 'ต้นไม้', 'หนังสือ', 'โต๊ะ', 'เก้าอี้', 'ปลา', 'นก', 'ดอกไม้', 'ภูเขา'];
const WORDS = THS.map((th, i) => ({
  id: `w${i}`, w: `word${i}`, lv: i < 8 ? 'A1' : 'A2', pos: [['n', 'A1']], p: 'n',
  th, ex: `This is a [word${i}] here.`, exTh: 'ประโยค',
}));
const BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));
const CAPS = { canListen: true };
const TODAY = 20500;

const card = (o = {}) => ({ b: 1, d: TODAY, g: TODAY - 1, n: 1, r: 1, l: 0, ...o });

// ---- rng --------------------------------------------------------------------------------

test('rng: same seed gives the same sequence, values in [0, 1)', () => {
  const a = makeRng('x');
  const b = makeRng('x');
  const seqA = [a(), a(), a(), a()];
  assert.deepEqual(seqA, [b(), b(), b(), b()]);
  assert.ok(seqA.every((v) => v >= 0 && v < 1));
  assert.notDeepEqual(seqA, [makeRng('y')(), 0, 0, 0]);
  assert.equal(makeRng(5)(), makeRng(5)());
  assert.equal(hashSeed('abc'), hashSeed('abc'));
  assert.notEqual(hashSeed('abc'), hashSeed('abd'));
});

test('rng: shuffle, pick and sample keep their elements and do not mutate', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const s = shuffle(arr, makeRng(1));
  assert.deepEqual([...s].sort(), arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(arr.includes(pick(arr, makeRng(2))));
  const sm = sample(arr, 3, makeRng(3));
  assert.equal(sm.length, 3);
  assert.equal(new Set(sm).size, 3);
});

// ---- day --------------------------------------------------------------------------------

test('day: 03:59 belongs to the day before, 04:00 to the new day', () => {
  const before = dayNumber(new Date(2026, 8, 25, 3, 59));
  const after = dayNumber(new Date(2026, 8, 25, 4, 0));
  assert.equal(after - before, 1);
  assert.equal(after, Date.UTC(2026, 8, 25) / 86400000);
});

test('day: month end and year end', () => {
  const d = (y, m, dd, h) => dayNumber(new Date(y, m, dd, h));
  assert.equal(d(2026, 9, 1, 2), d(2026, 8, 30, 12));
  assert.equal(d(2027, 0, 1, 3), d(2026, 11, 31, 23));
  assert.equal(d(2027, 0, 1, 4) - d(2026, 11, 31, 4), 1);
});

test('day: dayToDate and daysBetween', () => {
  const day = dayNumber(new Date(2026, 8, 25, 12));
  const date = dayToDate(day);
  assert.equal(date.getDate(), 25);
  assert.equal(date.getHours(), 12);
  assert.equal(daysBetween(day, day + 5), 5);
});

// ---- srs --------------------------------------------------------------------------------

test('srs: correct answers climb with the right intervals; box 8 stays 8', () => {
  let c = card({ b: 1 });
  for (const box of [2, 3, 4, 5, 6, 7, 8]) {
    c = srs.gradeCard(c, true, TODAY, 0).card;
    assert.equal(c.b, box);
    assert.equal(c.d, TODAY + srs.INTERVAL[box]);
  }
  const top = srs.gradeCard(c, true, TODAY + 1, 0).card;
  assert.equal(top.b, 8);
  assert.equal(top.d, TODAY + 1 + 120);
});

test('srs: a wrong answer from box 1, 3, 5, 8 gives 1, 1, 3, 3 and is due tomorrow', () => {
  for (const [from, to] of [[1, 1], [3, 1], [5, 3], [8, 3]]) {
    const r = srs.gradeCard(card({ b: from }), false, TODAY, 0).card;
    assert.equal(r.b, to);
    assert.equal(r.d, TODAY + 1);
    assert.equal(srs.lapseBox(from), to);
  }
});

test('srs: counters and lapses', () => {
  const wrong = srs.gradeCard(card({ b: 4, n: 5, r: 4, l: 1 }), false, TODAY, 0).card;
  assert.equal(wrong.n, 6);
  assert.equal(wrong.r, 4);
  assert.equal(wrong.l, 2);
  assert.equal(wrong.g, TODAY);
  const early = srs.gradeCard(card({ b: 2 }), false, TODAY, 0).card;
  assert.equal(early.l, 0);
});

test('srs: the first time a card reaches box 3 it gets a mile, and keeps it', () => {
  const up = srs.gradeCard(card({ b: 2 }), true, TODAY, 41);
  assert.equal(up.mile, 42);
  assert.equal(up.card.m, 42);
  assert.equal(up.card.md, TODAY);
  const lapsed = srs.gradeCard(up.card, false, TODAY + 4, 100).card;
  assert.equal(lapsed.m, 42);
  const back = srs.gradeCard({ ...lapsed, b: 2 }, true, TODAY + 5, 100);
  assert.equal(back.mile, null);
  assert.equal(back.card.m, 42);
});

test('srs: f is set on a wrong mile word and cleared by the next right answer', () => {
  const mile = card({ b: 4, m: 7, md: TODAY - 9 });
  const flat = srs.gradeCard(mile, false, TODAY, 50).card;
  assert.equal(flat.f, 1);
  const fixed = srs.gradeCard(flat, true, TODAY + 1, 50).card;
  assert.equal('f' in fixed, false);
  const notMile = srs.gradeCard(card({ b: 2 }), false, TODAY, 0).card;
  assert.equal('f' in notMile, false);
});

test('srs: grading does not mutate the input', () => {
  const c = card({ b: 2 });
  const copy = { ...c };
  srs.gradeCard(c, true, TODAY, 0);
  assert.deepEqual(c, copy);
});

test('srs: teachCard and knowCard', () => {
  assert.deepEqual(srs.teachCard(TODAY, true), { b: 1, d: TODAY + 1, g: TODAY, n: 1, r: 1, l: 0 });
  assert.equal(srs.teachCard(TODAY, false).r, 0);
  assert.deepEqual(srs.knowCard(TODAY, 9), {
    b: 3, d: TODAY + 4, g: TODAY, n: 1, r: 1, l: 0, m: 10, md: TODAY, k: 1,
  });
});

test('srs: status for all five cases, isDue, gradedToday, counts', () => {
  assert.equal(srs.status(undefined), 'new');
  assert.equal(srs.status(card()), 'learning');
  assert.equal(srs.status(card({ b: 4, m: 1, f: 1 })), 'flat');
  assert.equal(srs.status(card({ b: 5, m: 1 })), 'mile');
  assert.equal(srs.status(card({ b: 6, m: 1 })), 'mastered');
  assert.equal(srs.isDue(card({ d: TODAY }), TODAY), true);
  assert.equal(srs.isDue(card({ d: TODAY + 1 }), TODAY), false);
  assert.equal(srs.gradedToday(card({ g: TODAY }), TODAY), true);
  assert.equal(srs.gradedToday(card(), TODAY), false);
  const cards = { a: card({ m: 1 }), b: card({ m: 2, f: 1 }), c: card() };
  assert.equal(srs.countMiles(cards), 2);
  assert.equal(srs.countFlat(cards), 1);
});

// ---- text -------------------------------------------------------------------------------

test('text: norm', () => {
  assert.equal(text.norm('  Ice   Cream. '), 'ice cream');
  assert.equal(text.norm('o’clock'), "o'clock");
  assert.equal(text.norm(''), '');
});

test('text: glossOverlap', () => {
  assert.equal(text.glossOverlap('ใหญ่', 'ใหญ่มาก'), true);
  assert.equal(text.glossOverlap('ใจ', 'ใจดี'), false);
  assert.equal(text.glossOverlap('ตอบ, ตอบกลับ', 'ตอบ'), true);
  assert.equal(text.glossOverlap('แมว', 'สุนัข'), false);
  assert.deepEqual(text.glosses('a, b'), ['a', 'b']);
});

test('text: parseGap, blankGap, plain', () => {
  assert.deepEqual(text.parseGap('I [like] it.'), { before: 'I ', target: 'like', after: ' it.' });
  assert.equal(text.blankGap('I [like] it.'), 'I _____ it.');
  assert.equal(text.blankGap('I [like] it.', '...'), 'I ... it.');
  assert.equal(text.plain('I [like] it.'), 'I like it.');
  assert.throws(() => text.parseGap('No brackets'));
  assert.throws(() => text.parseGap('[Two] [gaps]'));
});

test('text: letterHint', () => {
  assert.equal(text.letterHint('banana'), 'b _ _ _ _ _');
  assert.equal(text.letterHint('T-shirt'), 'T-_ _ _ _ _');
  assert.equal(text.letterHint('ice cream'), 'i _ _   _ _ _ _ _');
  assert.equal(text.letterHint("o'clock"), "o'_ _ _ _ _");
});

test('text: acceptedSpellings and typedCorrect', () => {
  assert.deepEqual(text.acceptedSpellings({ w: 'a, an' }), ['a', 'an']);
  const okay = text.acceptedSpellings({ w: 'OK', alt: ['okay'] });
  assert.deepEqual(okay, ['ok', 'okay']);
  assert.equal(text.typedCorrect(' Okay. ', okay), true);
  assert.equal(text.typedCorrect('', okay), false);
  assert.equal(text.typedCorrect('no', okay), false);
});

test('text: POS labels', () => {
  assert.equal(text.POS_LABEL.n.en, 'n.');
  assert.equal(text.POS_LABEL.modal.th, 'กริยาช่วย (modal)');
  assert.equal(text.posList({ pos: [['n', 'A1'], ['v', 'A1'], ['n', 'A2']] }), 'n., v.');
});

// ---- quiz -------------------------------------------------------------------------------

test('quiz: allowedTypes follows the table in DESIGN §4', () => {
  const w = WORDS[0];
  const t = (box, caps = CAPS) => quiz.allowedTypes(box, w, caps);
  assert.deepEqual(t('probe'), ['meaning']);
  assert.deepEqual(t('confirm'), ['spell']);
  assert.deepEqual(t('check'), ['spell']);
  assert.deepEqual(t(1), ['word', 'listen']);
  assert.deepEqual(t(2), ['gap', 'spell', 'dictation']);
  assert.deepEqual(t(3), ['spell', 'gapType', 'dictation']);
  assert.deepEqual(t(4), ['gapType', 'dictation']);
  for (const box of [5, 6, 7, 8]) assert.deepEqual(t(box), ['gapType', 'spell', 'dictation']);
  assert.deepEqual(t('exam'), ['spell', 'gapType', 'dictation']);
});

test('quiz: listen and dictation are dropped without a voice, gap without an example', () => {
  const w = WORDS[0];
  const mute = { canListen: false };
  assert.deepEqual(quiz.allowedTypes(1, w, mute), ['word']);
  assert.deepEqual(quiz.allowedTypes(2, w, mute), ['gap', 'spell']);
  assert.deepEqual(quiz.allowedTypes(4, w, mute), ['gapType']);
  const noEx = { ...w, ex: undefined };
  assert.deepEqual(quiz.allowedTypes(1, noEx, CAPS), ['word', 'listen']);
  assert.deepEqual(quiz.allowedTypes(2, noEx, CAPS), ['spell', 'dictation']);
  assert.deepEqual(quiz.allowedTypes(3, noEx, CAPS), ['spell', 'dictation']);
  assert.deepEqual(quiz.allowedTypes(5, noEx, CAPS), ['spell', 'dictation']);
  // nothing left: spell (word in box 1)
  assert.deepEqual(quiz.allowedTypes(4, noEx, mute), ['spell']);
  assert.deepEqual(quiz.allowedTypes(1, noEx, mute), ['word']);
});

test('quiz: gapOnly words are asked as gap, then gapType', () => {
  const w = { ...WORDS[0], gapOnly: true };
  for (const box of ['probe', 1]) assert.deepEqual(quiz.allowedTypes(box, w, CAPS), ['gap']);
  for (const box of ['confirm', 'check', 2, 3, 4, 5, 8, 'exam']) assert.deepEqual(quiz.allowedTypes(box, w, CAPS), ['gapType']);
});

test('quiz: chooseType picks an allowed type, deterministically', () => {
  const a = quiz.chooseType(3, WORDS[0], CAPS, makeRng(4));
  assert.ok(['spell', 'gapType', 'dictation'].includes(a));
  assert.equal(a, quiz.chooseType(3, WORDS[0], CAPS, makeRng(4)));
});

test('quiz: distractors skip the target, same spelling and overlapping glosses', () => {
  const target = { id: 'bank-money', w: 'bank', lv: 'A1', p: 'n', th: 'ธนาคาร' };
  const pool = [
    target,
    { id: 'bank-river', w: 'bank', lv: 'A1', p: 'n', th: 'ริมฝั่ง' },
    { id: 'big-bank', w: 'Bank2', lv: 'A1', p: 'n', th: 'ธนาคารใหญ่' },
    { id: 'cat', w: 'cat', lv: 'A1', p: 'n', th: 'แมว' },
    { id: 'dog', w: 'dog', lv: 'A1', p: 'n', th: 'สุนัข' },
    { id: 'run', w: 'run', lv: 'A1', p: 'v', th: 'วิ่ง' },
    { id: 'red', w: 'red', lv: 'A2', p: 'adj', th: 'สีแดง' },
    { id: 'red2', w: 'scarlet', lv: 'A2', p: 'adj', th: 'สีแดง' },
  ];
  const d = quiz.pickDistractors(target, pool, 3, makeRng(1));
  assert.equal(d.length, 3);
  const ids = d.map((x) => x.id);
  for (const bad of ['bank-money', 'bank-river', 'big-bank']) assert.ok(!ids.includes(bad));
  assert.ok(ids.includes('cat') && ids.includes('dog'));
  // same p and lv first, then other POS: the third one is not a noun
  assert.ok(['run', 'red', 'red2'].includes(ids[2]));
  const th = d.map((x) => x.th);
  assert.equal(new Set(th).size, 3);
});

test('quiz: makeQuestion builds options, hints and answers', () => {
  const w = WORDS[3];
  const mq = quiz.makeQuestion(w, 'meaning', WORDS, makeRng(1));
  assert.equal(mq.options.length, 4);
  assert.ok(mq.options.some((o) => o.id === w.id && o.label === w.th));
  const wq = quiz.makeQuestion(w, 'word', WORDS, makeRng(1));
  assert.ok(wq.options.some((o) => o.id === w.id && o.label === w.w));
  const gq = quiz.makeQuestion(w, 'gap', WORDS, makeRng(1));
  assert.deepEqual(gq.gap, { before: 'This is a ', target: 'word3', after: ' here.' });
  assert.ok(gq.options.some((o) => o.label === w.w));
  const lq = quiz.makeQuestion(w, 'listen', WORDS, makeRng(1));
  assert.ok(lq.options.every((o) => THS.includes(o.label)));
  const sq = quiz.makeQuestion(w, 'spell', WORDS, makeRng(1));
  assert.deepEqual(sq.accept, ['word3']);
  assert.equal(sq.hint, 'w _ _ _ _');
  const tq = quiz.makeQuestion(w, 'gapType', WORDS, makeRng(1));
  assert.deepEqual(tq.accept, ['word3']);
  assert.equal(tq.hint, 'w _ _ _ _');
  assert.equal(new Set(mq.options.map((o) => o.id)).size, 4);
});

test('quiz: isCorrect for options and typed answers', () => {
  const w = WORDS[3];
  const mq = quiz.makeQuestion(w, 'meaning', WORDS, makeRng(1));
  assert.equal(quiz.isCorrect(mq, w.id), true);
  assert.equal(quiz.isCorrect(mq, 'w0'), false);
  const sq = quiz.makeQuestion(w, 'spell', WORDS, makeRng(1));
  assert.equal(quiz.isCorrect(sq, ' WORD3 '), true);
  assert.equal(quiz.isCorrect(sq, 'word'), false);
});

test('text: editDistance and shortHint', () => {
  assert.equal(text.editDistance('band', 'bank'), 1);
  assert.equal(text.editDistance('quiet', 'quite'), 2);
  assert.equal(text.editDistance('accept', 'except'), 2);
  assert.equal(text.editDistance('', 'abc'), 3);
  assert.equal(text.editDistance('same', 'same'), 0);
  assert.equal(text.shortHint('banana'), 'b…');
  assert.equal(text.shortHint('ice cream'), 'i… c…');
  assert.equal(text.shortHint('T-shirt'), 'T…');
});

const mk = (id, w, th, more = {}) => ({ id, w, th, lv: 'A1', p: 'n', ...more });
const LOOK_POOL = [
  mk('band', 'band', 'วงดนตรี'), mk('bank', 'bank', 'ธนาคาร'), mk('bend', 'bend', 'โค้ง'),
  mk('hand', 'hand', 'มือ'), mk('apple', 'apple', 'แอปเปิล'), mk('river', 'river', 'แม่น้ำ'),
  mk('tree', 'tree', 'ต้นไม้'), mk('road', 'road', 'ถนน'),
];

test('quiz: lookAlike compares first forms', () => {
  assert.equal(quiz.lookAlike(LOOK_POOL[0], LOOK_POOL[1]), true);
  assert.equal(quiz.lookAlike(LOOK_POOL[0], LOOK_POOL[4]), false);
  assert.equal(quiz.lookAlike(mk('a', 'accept', 'x'), mk('b', 'acceptable', 'y')), true); // same first 4 letters
  assert.equal(quiz.lookAlike(mk('a', 'quiet', 'x'), mk('b', 'quiz', 'y')), false); // distance 2 > 1
  assert.equal(quiz.lookAlike(mk('a', 'tree', 'x'), mk('b', 'tree', 'y')), false);
  assert.equal(quiz.lookAlike(mk('a', 'big, large', 'x'), mk('b', 'bag', 'y')), true); // first form only
});

test('quiz: look-alikes come first, at most 2, and the old tiers fill up', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const d = quiz.pickDistractors(LOOK_POOL[0], LOOK_POOL, 3, makeRng(seed));
    assert.equal(d.length, 3);
    assert.equal(d.filter((x) => ['bank', 'bend', 'hand'].includes(x.id)).length, 2);
    assert.equal(new Set(d.map((x) => x.th)).size, 3);
  }
  // closest first: the distance-1 words are always in, a distance-2 one never beats them
  const pool = [
    mk('t', 'stone', 'หิน'), mk('a', 'stove', 'เตา'), mk('b', 'store', 'ร้าน'), mk('c', 'stonework', 'งานหิน'),
    mk('z', 'zebra', 'ม้าลาย'), mk('y', 'yacht', 'เรือยอชท์'),
  ];
  for (let seed = 1; seed <= 10; seed++) {
    const d = quiz.pickDistractors(pool[0], pool, 3, makeRng(seed));
    assert.equal(d.length, 3);
    assert.ok(d.some((x) => x.id === 'a') && d.some((x) => x.id === 'b'));
  }
  // a look-alike whose gloss overlaps is skipped
  const pool2 = [
    mk('t', 'band', 'วงดนตรี'), mk('u', 'bank', 'วงดนตรีเล็ก'), mk('v', 'cat', 'แมว'),
    mk('w', 'dog', 'สุนัข'), mk('x', 'sun', 'ดวงอาทิตย์'),
  ];
  const d2 = quiz.pickDistractors(pool2[0], pool2, 3, makeRng(1));
  assert.ok(!d2.some((x) => x.id === 'u'));
  // no look-alikes at all: the old tiers fill everything
  assert.equal(quiz.pickDistractors(LOOK_POOL[4], LOOK_POOL, 3, makeRng(1)).length, 3);
});

test('quiz: makeQuestion hints and dictation', () => {
  const w = WORDS[3];
  assert.equal(quiz.makeQuestion(w, 'spell', WORDS, makeRng(1), { hint: 'short' }).hint, 'w…');
  assert.equal(quiz.makeQuestion(w, 'spell', WORDS, makeRng(1), { hint: 'full' }).hint, 'w _ _ _ _');
  assert.equal(quiz.makeQuestion(w, 'gapType', WORDS, makeRng(1), { hint: 'short' }).hint, 'w…');
  const dq = quiz.makeQuestion(w, 'dictation', WORDS, makeRng(1), { hint: 'short' });
  assert.deepEqual(dq.accept, ['word3']);
  assert.equal(dq.hint, null);
  assert.equal(dq.options, undefined);
  assert.equal(quiz.isCorrect(dq, ' Word3 '), true);
  assert.equal(quiz.isCorrect(dq, 'word'), false);
});

test('quiz: synonymOf finds another word with an overlapping meaning', () => {
  const pool = [
    mk('bike', 'bike', 'รถจักรยาน'), mk('bicycle', 'bicycle', 'จักรยาน'), mk('cat', 'cat', 'แมว'),
    mk('okay', 'OK', 'ตกลง', { alt: ['okay'] }),
  ];
  const target = pool[1];
  assert.equal(quiz.synonymOf('Bike', target, pool)?.id, 'bike');
  assert.equal(quiz.synonymOf('cat', target, pool), null);
  assert.equal(quiz.synonymOf('bycicle', target, pool), null);
  assert.equal(quiz.synonymOf('bicycle', target, pool), null);
  assert.equal(quiz.synonymOf('', target, pool), null);
});

// ---- plan -------------------------------------------------------------------------------

const SETTINGS = { newPerDay: 10 };

test('plan: introOrder goes one level at a time and is stable for a seed', () => {
  const order = plan.introOrder(WORDS);
  assert.equal(order.length, WORDS.length);
  assert.ok(order.slice(0, 8).every((id) => BY_ID[id].lv === 'A1'));
  assert.ok(order.slice(8).every((id) => BY_ID[id].lv === 'A2'));
  assert.deepEqual(order, plan.introOrder(WORDS));
  assert.notDeepEqual(order, plan.introOrder(WORDS, 'other-seed'));
  // the order of a subset agrees with the full order
  const subset = WORDS.filter((w) => w.id !== 'w2');
  assert.deepEqual(plan.introOrder(subset), order.filter((id) => id !== 'w2'));
  // the level order doesn't depend on the input order
  const mixed = [{ id: 'z', lv: 'B2' }, { id: 'y', lv: 'B1' }, { id: 'x', lv: 'A2' }, { id: 'w', lv: 'A1' }];
  assert.deepEqual(plan.introOrder(mixed), ['w', 'x', 'y', 'z']);
});

test('plan: currentLevel follows the next new word, then waits for content', () => {
  const levels = { A1: 900, A2: 800, B1: 700, B2: 600 };
  const order = plan.introOrder(WORDS);
  assert.deepEqual(plan.currentLevel(order, {}, BY_ID, levels), { lv: 'A1', met: 0, total: 900 });
  const a1 = Object.fromEntries(order.slice(0, 3).map((id) => [id, card()]));
  assert.deepEqual(plan.currentLevel(order, a1, BY_ID, levels), { lv: 'A1', met: 3, total: 900 });
  // the A1 words with content are all met: new words come from A2 (the rest of A1 has no content yet)
  const allA1 = Object.fromEntries(order.slice(0, 8).map((id) => [id, card()]));
  assert.deepEqual(plan.currentLevel(order, allA1, new Map(Object.entries(BY_ID)), levels), { lv: 'A2', met: 0, total: 800 });
  // every word with content is met: the first level that isn't complete
  const all = Object.fromEntries(order.map((id) => [id, card()]));
  assert.deepEqual(plan.currentLevel(order, all, BY_ID, levels), { lv: 'A1', met: 8, total: 900 });
  assert.equal(plan.currentLevel(order, all, BY_ID, { A1: 8, A2: 4, B1: 0, B2: 0 }), null, 'every level complete');
  // cards of words without content don't count
  assert.deepEqual(plan.currentLevel(order, { gone: card() }, BY_ID, levels), { lv: 'A1', met: 0, total: 900 });
});

test('plan: makeDayPlan sorts due words and caps them at 100', () => {
  const cards = {
    a: card({ d: TODAY - 1, b: 4 }),
    b: card({ d: TODAY - 1, b: 2 }),
    c: card({ d: TODAY - 3, b: 5 }),
    z: card({ d: TODAY + 1 }),
  };
  const p = plan.makeDayPlan(cards, TODAY, SETTINGS);
  assert.deepEqual(p.due, ['c', 'b', 'a']);
  assert.equal(p.newTarget, 10);
  assert.equal(p.goal, 13);
  assert.equal(p.day, TODAY);
  assert.deepEqual([p.done, p.taught, p.known, p.right, p.wrong, p.miles, p.legs, p.shown], [0, 0, 0, 0, 0, 0, 0, []]);

  const many = {};
  for (let i = 0; i < 130; i++) many[`x${i}`] = card({ d: TODAY - 1 });
  const big = plan.makeDayPlan(many, TODAY, SETTINGS);
  assert.equal(big.due.length, 100);
  assert.equal(big.dueTotal, 130);
  assert.equal(big.newTarget, 0);
  assert.equal(big.goal, 100);
  const exactly = {};
  for (let i = 0; i < 100; i++) exactly[`x${i}`] = card({ d: TODAY - 1 });
  assert.equal(plan.makeDayPlan(exactly, TODAY, SETTINGS).newTarget, 10);
});

function reviewFixture(nDue, newPerDay = 10) {
  const cards = {};
  const words = [];
  for (let i = 0; i < nDue; i++) {
    const id = `r${i}`;
    words.push({ ...WORDS[0], id, w: `rev${i}`, th: `คำ${i}` });
    cards[id] = card({ d: TODAY - 1, b: 1 + (i % 2) });
  }
  const fresh = [];
  for (let i = 0; i < 60; i++) fresh.push({ ...WORDS[0], id: `n${i}`, w: `new${i}`, th: `ใหม่${i}` });
  const all = [...words, ...fresh];
  const byId = Object.fromEntries(all.map((w) => [w.id, w]));
  const order = fresh.map((w) => w.id);
  const p = plan.makeDayPlan(cards, TODAY, { newPerDay });
  return { cards, byId, order, p, all };
}

test('plan: leg order is R R P R R P, probes only, no checks at build time', () => {
  const f = reviewFixture(6, 3);
  const { leg, plan: p2 } = plan.buildLeg({
    plan: f.p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS,
  });
  const kinds = leg.queue.map((x) => x.kind);
  assert.deepEqual(kinds.slice(0, 6), ['review', 'review', 'probe', 'review', 'review', 'probe']);
  assert.equal(leg.queue.length, 6 + 3);
  assert.ok(!kinds.includes('meet') && !kinds.includes('check'));
  assert.equal(leg.v, 2);
  const probe = leg.queue.find((x) => x.kind === 'probe');
  assert.deepEqual([probe.type, probe.confirmType, probe.checkType], ['meaning', 'spell', 'spell']);
  assert.equal(leg.newCount, 3);
  assert.deepEqual(p2.shown, ['n0', 'n1', 'n2']);
  assert.equal(p2.legs, 1);
  assert.equal(f.p.legs, 0, 'input plan untouched');
  assert.equal(new Set(leg.queue.map((x) => x.key)).size, leg.queue.length);
});

test('plan: items carry a hint: full below box 4, short from box 4; confirm short, check full, re-asks copy it', () => {
  const f = reviewFixture(4, 2);
  f.cards.r0 = { ...f.cards.r0, b: 1 };
  f.cards.r1 = { ...f.cards.r1, b: 3 };
  f.cards.r2 = { ...f.cards.r2, b: 4 };
  f.cards.r3 = { ...f.cards.r3, b: 7 };
  const p = plan.makeDayPlan(f.cards, TODAY, { newPerDay: 2 });
  const { leg } = plan.buildLeg({ plan: p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  const hints = Object.fromEntries(leg.queue.filter((x) => x.kind === 'review').map((x) => [x.id, x.hint]));
  assert.deepEqual(hints, { r0: 'full', r1: 'full', r2: 'short', r3: 'short' });
  // right probe -> confirm (short); wrong probe -> check (full)
  const probe = { key: 'probe-n0', id: 'n0', kind: 'probe', type: 'meaning', confirmType: 'spell', checkType: 'spell' };
  const right = plan.legReduce({ ...leg, queue: [probe] }, { type: 'answer', correct: true });
  assert.equal(right.queue.find((x) => x.kind === 'confirm').hint, 'short');
  const wrong = plan.legReduce({ ...leg, queue: [probe] }, { type: 'answer', correct: false });
  assert.equal(wrong.queue.find((x) => x.kind === 'check').hint, 'full');
  // a re-ask copies the hint; an old item without one is re-asked with 'full'
  const shortItem = { key: 'review-r2', id: 'r2', kind: 'review', type: 'spell', hint: 'short' };
  const again = plan.legReduce({ ...leg, queue: [shortItem] }, { type: 'answer', correct: false });
  assert.equal(again.queue[0].kind, 'reask');
  assert.equal(again.queue[0].hint, 'short');
  const { hint, ...old } = shortItem;
  assert.equal(plan.legReduce({ ...leg, queue: [old] }, { type: 'answer', correct: false }).queue[0].hint, 'full');
});

test('plan: a leg has at most 20 items with 14 reviews first, and skips words graded today', () => {
  const f = reviewFixture(30, 10);
  f.cards.r0 = { ...f.cards.r0, g: TODAY };
  const { leg } = plan.buildLeg({
    plan: f.p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS,
  });
  const reviews = leg.queue.filter((x) => x.kind === 'review');
  const metas = leg.queue.filter((x) => x.kind === 'probe');
  assert.equal(reviews.length, 14);
  assert.ok(!reviews.some((x) => x.id === 'r0'));
  assert.equal(metas.length, 6);
  assert.equal(reviews.length + metas.length, plan.LEG_SIZE);
});

test('plan: the leg picks the first new words in intro order and never repeats shown words', () => {
  const f = reviewFixture(0, 5);
  const first = plan.buildLeg({ plan: f.p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  assert.deepEqual(first.plan.shown, ['n0', 'n1', 'n2', 'n3', 'n4']);
  assert.deepEqual(plan.nextNew(f.order, f.cards, first.plan, 2), ['n5', 'n6']);
  assert.deepEqual(plan.nextNew(f.order, f.cards, first.plan, 2, new Set(['n5'])), ['n6', 'n7']);
  const withCard = { ...f.cards, n5: card() };
  assert.deepEqual(plan.nextNew(f.order, withCard, first.plan, 1), ['n6']);
});

test('plan: one extra leg a day takes 10 new words only, then no more (newCap)', () => {
  const f = reviewFixture(3, 5);
  const done = { ...f.p, taught: 5, shown: f.order.slice(0, 5) };
  assert.equal(plan.newCap(done), 5 + plan.EXTRA_NEW);
  assert.ok(plan.newLeft(done, f.cards, f.order));
  const { leg, plan: p2 } = plan.buildLeg({
    plan: done, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS, extra: true,
  });
  assert.ok(leg.queue.every((x) => x.kind === 'probe'));
  assert.equal(leg.newCount, plan.EXTRA_NEW);
  assert.equal(p2.shown.length, 15);
  // the extra leg used the day's room: a second one gets no new words
  assert.ok(!plan.newLeft(p2, f.cards, f.order));
  const again = plan.buildLeg({
    plan: p2, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS, extra: true,
  });
  assert.equal(again.leg.queue.length, 0);
  // only the room that is left
  const part = plan.buildLeg({
    plan: { ...done, shown: f.order.slice(0, 12) }, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS, extra: true,
  });
  assert.equal(part.leg.newCount, 3);
});

test('plan: no extra new words on a backlog day', () => {
  const f = reviewFixture(130, 5);
  assert.equal(f.p.newTarget, 0);
  const done = { ...f.p, done: f.p.goal };
  assert.equal(plan.newCap(done), 0);
  assert.ok(!plan.newLeft(done, f.cards, f.order));
  const { leg } = plan.buildLeg({
    plan: done, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS, extra: true,
  });
  assert.equal(leg.queue.length, 0);
});

test('plan: newLeft is false when every word was already introduced', () => {
  const f = reviewFixture(0, 5);
  const few = f.order.slice(0, 3);
  assert.ok(plan.newLeft({ ...f.p, shown: few.slice(0, 2) }, f.cards, few));
  assert.ok(!plan.newLeft({ ...f.p, shown: few }, f.cards, few));
  assert.ok(!plan.newLeft(f.p, { ...f.cards, n0: card(), n1: card(), n2: card() }, few));
});

test('plan: known words count toward newTarget and stop new words', () => {
  const f = reviewFixture(0, 5);
  const p = { ...f.p, taught: 2, known: 3 };
  const none = plan.buildLeg({ plan: p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  assert.equal(none.leg.queue.length, 0);
  const some = plan.buildLeg({ plan: { ...p, known: 1 }, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  assert.equal(some.leg.newCount, 2);
});

test('plan: no new words when the target is reached in a normal leg', () => {
  const f = reviewFixture(2, 5);
  const p = { ...f.p, taught: 5 };
  const { leg } = plan.buildLeg({ plan: p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  assert.ok(leg.queue.every((x) => x.kind === 'review'));
});

function twoWordLeg() {
  const f = reviewFixture(0, 2);
  const built = plan.buildLeg({ plan: f.p, cards: f.cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(1), caps: CAPS });
  return { ...f, ...built };
}

test('plan: legCurrent and legProgress', () => {
  const { leg } = twoWordLeg();
  assert.equal(plan.legCurrent(leg).kind, 'probe');
  assert.equal(plan.legProgress(leg), 0);
  const r = plan.legReduce({ ...leg, queue: [{ kind: 'meet', id: 'n0' }, ...leg.queue] }, { type: 'meet' });
  assert.equal(r.queue.length, leg.queue.length);
  assert.equal(r.done, 0);
  assert.equal(leg.queue.length, 2, 'input untouched');
  assert.equal(plan.legCurrent({ ...leg, queue: [] }), null);
  assert.equal(plan.legProgress({ done: 3, queue: [1, 2, 3, 4, 5, 6, 7] }), 0.3);
});

test('plan: a wrong answer is re-asked 3 items later, at most twice', () => {
  const item = (id, kind = 'review', type = 'meaning') => ({ key: `${kind}-${id}`, id, kind, type });
  let leg = {
    queue: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => item(id)),
    done: 0, reasks: {}, newCount: 0, stats: {},
  };
  leg = plan.legReduce(leg, { type: 'answer', correct: false });
  assert.deepEqual(leg.queue.map((x) => x.id), ['b', 'c', 'd', 'a', 'e', 'f']);
  assert.equal(leg.queue[3].kind, 'reask');
  assert.equal(leg.queue[3].type, 'meaning');
  assert.equal(leg.done, 1);
  for (const id of ['b', 'c', 'd']) leg = plan.legReduce(leg, { type: 'answer', correct: true });
  leg = plan.legReduce(leg, { type: 'answer', correct: false }); // a again (2nd re-ask)
  assert.equal(leg.reasks.a, 2);
  assert.deepEqual(leg.queue.map((x) => x.id), ['e', 'f', 'a']);
  leg = plan.legReduce(leg, { type: 'answer', correct: true });
  leg = plan.legReduce(leg, { type: 'answer', correct: true });
  leg = plan.legReduce(leg, { type: 'answer', correct: false }); // 3rd wrong: no more re-asks
  assert.deepEqual(leg.queue, []);
  assert.equal(plan.legProgress(leg), 1);
});

test('plan: a re-ask with fewer than 3 items left goes last', () => {
  const item = (id) => ({ key: id, id, kind: 'review', type: 'word' });
  const leg = plan.legReduce({ queue: [item('a'), item('b')], done: 0, reasks: {}, newCount: 0 }, { type: 'answer', correct: false });
  assert.deepEqual(leg.queue.map((x) => x.id), ['b', 'a']);
});

const filler = (n) => Array.from({ length: n }, (_, i) => ({ key: `f${i}`, id: `f${i}`, kind: 'review', type: 'word' }));
const probeItem = { key: 'probe-n0', id: 'n0', kind: 'probe', type: 'meaning', confirmType: 'spell', checkType: 'spell' };
const legOf = (queue) => ({ queue, done: 0, reasks: {}, newCount: 0, stats: {} });

test('plan: a right probe puts its confirm 6 items later, or last in a short queue', () => {
  const long = plan.legReduce(legOf([probeItem, ...filler(9)]), { type: 'answer', correct: true });
  assert.equal(long.queue.findIndex((x) => x.kind === 'confirm'), plan.CONFIRM_GAP);
  assert.equal(long.queue[plan.CONFIRM_GAP].type, 'spell');
  assert.equal(long.done, 1);
  const short = plan.legReduce(legOf([probeItem, ...filler(2)]), { type: 'answer', correct: true });
  assert.equal(short.queue.at(-1).kind, 'confirm');
  assert.ok(!short.queue.some((x) => x.kind === 'meet'));
});

test('plan: a wrong probe and a skip put the meet first and the check 4 items after it', () => {
  for (const event of [{ type: 'answer', correct: false }, { type: 'skip' }]) {
    const leg = plan.legReduce(legOf([probeItem, ...filler(9)]), event);
    assert.equal(leg.queue[0].kind, 'meet');
    assert.equal(leg.queue[0].id, 'n0');
    assert.equal(leg.queue.findIndex((x) => x.kind === 'check'), 1 + plan.CHECK_GAP);
    assert.equal(leg.done, 1);
    assert.ok(!leg.queue.some((x) => x.kind === 'reask'), 'a probe is never re-asked');
    assert.deepEqual(leg.reasks, {});
    const short = plan.legReduce(legOf([probeItem, ...filler(1)]), event);
    assert.equal(short.queue.at(-1).kind, 'check');
    // dropping the meet leaves the check 4 items away
    const dropped = plan.legReduce(leg, { type: 'meet' });
    assert.equal(dropped.queue.findIndex((x) => x.kind === 'check'), plan.CHECK_GAP);
    assert.equal(dropped.done, 1);
  }
});

test('plan: skip only works on a probe', () => {
  const leg = legOf(filler(3));
  assert.equal(plan.legReduce(leg, { type: 'skip' }), leg);
});

test('plan: right confirm is a mile and a known word', () => {
  const f = twoWordLeg();
  const item = { key: 'confirm-n0', id: 'n0', kind: 'confirm', type: 'spell' };
  const rec = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg: f.leg, today: TODAY, item, correct: true });
  assert.equal(rec.graded, true);
  assert.equal(rec.mile, 1);
  assert.equal(rec.cards.n0.m, 1);
  assert.equal(rec.cards.n0.k, 1);
  assert.equal(rec.cards.n0.b, 3);
  assert.deepEqual([rec.plan.known, rec.plan.taught, rec.plan.miles, rec.plan.right, rec.plan.done], [1, 0, 1, 1, 1]);
  assert.deepEqual([rec.leg.stats.known, rec.leg.stats.miles], [1, 1]);
});

test('plan: wrong confirm is a taught word in box 1, then a re-ask', () => {
  const f = twoWordLeg();
  const item = { key: 'confirm-n0', id: 'n0', kind: 'confirm', type: 'spell' };
  const leg = { ...legOf([item, ...filler(5)]), stats: f.leg.stats };
  const rec = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg, today: TODAY, item, correct: false });
  assert.equal(rec.mile, null);
  assert.deepEqual(rec.cards.n0, srs.teachCard(TODAY, false));
  assert.deepEqual([rec.plan.taught, rec.plan.known, rec.plan.wrong, rec.plan.done], [1, 0, 1, 1]);
  const next = plan.legReduce(leg, { type: 'answer', correct: false });
  assert.equal(next.queue[plan.REASK_GAP].kind, 'reask');
  const again = plan.recordAnswer({ cards: rec.cards, plan: rec.plan, leg: rec.leg, today: TODAY, item: { ...item, kind: 'reask' }, correct: true });
  assert.equal(again.cards, rec.cards);
});

test('plan: a probe answer changes no card, but counts right / wrong', () => {
  const f = twoWordLeg();
  const right = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg: f.leg, today: TODAY, item: probeItem, correct: true });
  assert.equal(right.cards, f.cards);
  assert.equal(right.graded, false);
  assert.deepEqual([right.plan.right, right.plan.wrong, right.plan.done, right.leg.stats.right], [1, 0, 0, 1]);
  const wrong = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg: f.leg, today: TODAY, item: probeItem, correct: false });
  assert.equal(wrong.cards, f.cards);
  assert.deepEqual([wrong.plan.wrong, wrong.leg.stats.wrong], [1, 1]);
  assert.equal(f.plan.right, 0, 'input plan untouched');
});

test('plan: gapOnly words get gap, then gapType', () => {
  const words = [{ ...WORDS[0], id: 'the', w: 'the', gapOnly: true }];
  const byId = { the: words[0] };
  const p = plan.makeDayPlan({}, TODAY, { newPerDay: 1 });
  const { leg } = plan.buildLeg({ plan: p, cards: {}, byId, order: ['the'], today: TODAY, rnd: makeRng(1), caps: CAPS });
  assert.deepEqual([leg.queue[0].type, leg.queue[0].confirmType, leg.queue[0].checkType], ['gap', 'gapType', 'gapType']);
});

test('plan: recordAnswer for a taught word (check) sets the card and counts done', () => {
  const f = twoWordLeg();
  const item = { key: 'check-n0', id: 'n0', kind: 'check', type: 'meaning' };
  const right = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg: f.leg, today: TODAY, item, correct: true });
  assert.deepEqual(right.cards.n0, srs.teachCard(TODAY, true));
  assert.equal(right.plan.taught, 1);
  assert.equal(right.plan.done, 1);
  assert.equal(right.plan.right, 1);
  assert.equal(right.leg.stats.taught, 1);
  const wrong = plan.recordAnswer({ cards: f.cards, plan: f.plan, leg: f.leg, today: TODAY, item, correct: false });
  assert.equal(wrong.cards.n0.b, 1);
  assert.equal(wrong.cards.n0.r, 0);
  assert.equal(wrong.plan.wrong, 1);
  assert.equal(f.plan.taught, 0, 'input plan untouched');
  // words taught beyond newTarget no longer add to done
  const over = plan.recordAnswer({ cards: f.cards, plan: { ...f.plan, taught: 2 }, leg: f.leg, today: TODAY, item, correct: true });
  assert.equal(over.plan.taught, 3);
  assert.equal(over.plan.done, 0);
});

test('plan: recordAnswer for reviews grades once a day; a graded word is practice', () => {
  const f = reviewFixture(3, 0);
  const item = { key: 'review-r0', id: 'r0', kind: 'review', type: 'meaning' };
  const leg = { stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 } };
  const first = plan.recordAnswer({ cards: f.cards, plan: f.p, leg, today: TODAY, item, correct: true });
  assert.equal(first.graded, true);
  assert.equal(first.cards.r0.b, f.cards.r0.b + 1);
  assert.equal(first.plan.done, 1);
  assert.equal(first.plan.right, 1);
  assert.equal(first.leg.stats.reviewed, 1);
  const again = plan.recordAnswer({ cards: first.cards, plan: first.plan, leg: first.leg, today: TODAY, item, correct: false });
  assert.equal(again.graded, false);
  assert.equal(again.cards, first.cards);
  assert.equal(again.plan.wrong, 0);
  assert.equal(again.plan.done, 1);
  const reask = plan.recordAnswer({ cards: f.cards, plan: f.p, leg, today: TODAY, item: { ...item, kind: 'reask' }, correct: true });
  assert.equal(reask.graded, false);
  assert.equal(reask.cards, f.cards);
});

test('plan: a review that reaches box 3 is a new mile', () => {
  const cards = { r0: card({ b: 2, d: TODAY - 1 }), r1: card({ m: 1, b: 4 }), r2: card({ m: 2, b: 4 }) };
  const p = plan.makeDayPlan(cards, TODAY, { newPerDay: 0 });
  const leg = { stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 } };
  const item = { key: 'r', id: 'r0', kind: 'review', type: 'word' };
  const r = plan.recordAnswer({ cards, plan: p, leg, today: TODAY, item, correct: true });
  assert.equal(r.mile, 3);
  assert.equal(r.cards.r0.m, 3);
  assert.equal(r.plan.miles, 1);
  assert.equal(r.leg.stats.miles, 1);
});

test('plan: a review not in plan.due does not add to done', () => {
  const cards = { z: card({ b: 2, d: TODAY + 3 }) };
  const p = plan.makeDayPlan(cards, TODAY, { newPerDay: 0 });
  const leg = { stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 } };
  const r = plan.recordAnswer({ cards, plan: p, leg, today: TODAY, item: { id: 'z', kind: 'review', type: 'word' }, correct: true });
  assert.equal(r.graded, true);
  assert.equal(r.plan.done, 0);
});

// Plays a leg: even-numbered new words are known (probe right), odd ones are not (probe wrong).
function playLeg(leg, cards, p) {
  let mileEvents = 0;
  while (plan.legCurrent(leg)) {
    const item = plan.legCurrent(leg);
    if (item.kind === 'meet') {
      leg = plan.legReduce(leg, { type: 'meet' });
      continue;
    }
    const correct = item.kind !== 'probe' || Number(item.id.slice(1)) % 2 === 0;
    const rec = plan.recordAnswer({ cards, plan: p, leg, today: TODAY, item, correct });
    cards = rec.cards;
    p = rec.plan;
    mileEvents += rec.mile ? 1 : 0;
    leg = plan.legReduce(rec.leg, { type: 'answer', correct });
  }
  return { cards, p, mileEvents };
}

test('plan: a whole day of legs reaches a full tank and never asks a word twice in the plan', () => {
  const f = reviewFixture(0, 10);
  let cards = f.cards;
  let p = f.p;
  let mileEvents = 0;
  for (let n = 0; n < 2; n++) {
    const built = plan.buildLeg({ plan: p, cards, byId: f.byId, order: f.order, today: TODAY, rnd: makeRng(n), caps: CAPS });
    const played = playLeg(built.leg, cards, built.plan);
    cards = played.cards;
    p = played.p;
    mileEvents += played.mileEvents;
  }
  assert.equal(p.taught, 5);
  assert.equal(p.known, 5);
  assert.equal(progress.tank(p), 1);
  assert.equal(Object.keys(cards).length, 10);
  assert.equal(mileEvents, 5);
  assert.equal(p.legs, 2);
  assert.equal(p.shown.length, 10, 'the second leg found nothing left to teach');
});

test('plan: smoke test of a whole leg on the real words.json', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/words.json', import.meta.url), 'utf8'));
  const words = data.words;
  const byId = new Map(words.map((w) => [w.id, w]));
  const order = plan.introOrder(words);
  const rnd = makeRng(7);
  let cards = {};
  let p = plan.makeDayPlan(cards, TODAY, { newPerDay: 10 });
  const built = plan.buildLeg({ plan: p, cards, byId, order, today: TODAY, rnd, caps: CAPS });
  let leg = built.leg;
  p = built.plan;
  assert.equal(leg.newCount, 10);
  let guard = 0;
  let n = 0;
  while (plan.legCurrent(leg) && guard++ < 200) {
    const item = plan.legCurrent(leg);
    if (item.kind === 'meet') {
      leg = plan.legReduce(leg, { type: 'meet' });
      continue;
    }
    const word = byId.get(item.id);
    const q = quiz.makeQuestion(word, item.type, words, rnd);
    const wantRight = item.kind !== 'probe' || n++ % 2 === 0;
    const response = wantRight ? (q.options ? item.id : q.accept[0]) : 'zzz';
    const correct = quiz.isCorrect(q, response);
    assert.equal(correct, wantRight);
    const rec = plan.recordAnswer({ cards, plan: p, leg, today: TODAY, item, correct });
    cards = rec.cards;
    p = rec.plan;
    leg = plan.legReduce(rec.leg, { type: 'answer', correct });
  }
  assert.equal(plan.legCurrent(leg), null);
  assert.equal(Object.keys(cards).length, 10);
  assert.equal(p.taught + p.known, 10);
  assert.equal(p.known, 5);
});

// ---- progress ---------------------------------------------------------------------------

test('progress: tank', () => {
  assert.equal(progress.tank({ goal: 20, done: 5, legs: 1 }), 0.25);
  assert.equal(progress.tank({ goal: 20, done: 25, legs: 1 }), 1);
  assert.equal(progress.tank({ goal: 0, done: 0, legs: 0 }), 0);
  assert.equal(progress.tank({ goal: 0, done: 0, legs: 1 }), 1);
});

test('progress: streak +1 on consecutive days, restarts after a gap', () => {
  let s = { cur: 0, best: 0, last: null, rests: 0 };
  s = progress.fillTank(s, 100);
  assert.deepEqual(s, { cur: 1, best: 1, last: 100, rests: 0 });
  assert.deepEqual(progress.fillTank(s, 100), s);
  s = progress.fillTank(s, 101);
  assert.equal(s.cur, 2);
  s = progress.fillTank(s, 105);
  assert.equal(s.cur, 1);
  assert.equal(s.best, 2);
});

test('progress: rests are earned at 7 and capped at 2', () => {
  let s = { cur: 0, best: 0, last: null, rests: 0 };
  for (let d = 1; d <= 7; d++) s = progress.fillTank(s, d);
  assert.equal(s.cur, 7);
  assert.equal(s.rests, 1);
  for (let d = 8; d <= 14; d++) s = progress.fillTank(s, d);
  assert.equal(s.rests, 2);
  for (let d = 15; d <= 21; d++) s = progress.fillTank(s, d);
  assert.equal(s.cur, 21);
  assert.equal(s.rests, 2);
});

test('progress: rollover uses rests for missed days, otherwise resets cur', () => {
  const base = { cur: 5, best: 9, last: 100, rests: 2 };
  assert.deepEqual(progress.rollover(base, 101), base);
  assert.deepEqual(progress.rollover(base, 100), base);
  assert.deepEqual(progress.rollover(base, 102), { cur: 5, best: 9, last: 101, rests: 1 });
  assert.deepEqual(progress.rollover(base, 103), { cur: 5, best: 9, last: 102, rests: 0 });
  assert.deepEqual(progress.rollover(base, 104), { cur: 0, best: 9, last: 100, rests: 2 });
  const fresh = { cur: 0, best: 0, last: null, rests: 0 };
  assert.deepEqual(progress.rollover(fresh, 50), fresh);
  // after a saved streak the next full tank continues it
  const kept = progress.rollover(base, 102);
  assert.equal(progress.fillTank(kept, 102).cur, 6);
});

const ROUTE = [
  { id: 'a', at: 0 }, { id: 'b', at: 100 }, { id: 'c', at: 300 }, { id: 'd', at: 3000 },
];

test('progress: nextStop and lastStop at 0, between stops, at a stop and at 3000', () => {
  assert.equal(progress.nextStop(ROUTE, 0).id, 'b');
  assert.equal(progress.lastStop(ROUTE, 0).id, 'a');
  assert.equal(progress.nextStop(ROUTE, 150).id, 'c');
  assert.equal(progress.lastStop(ROUTE, 150).id, 'b');
  assert.equal(progress.nextStop(ROUTE, 100).id, 'c');
  assert.equal(progress.lastStop(ROUTE, 100).id, 'b');
  assert.equal(progress.nextStop(ROUTE, 3000), null);
  assert.equal(progress.lastStop(ROUTE, 3000).id, 'd');
  assert.equal(progress.nextStop({ stops: ROUTE }, 0).id, 'b');
});

test('progress: reachedStops across two stops', () => {
  assert.deepEqual(progress.reachedStops(ROUTE, 90, 310).map((s) => s.id), ['b', 'c']);
  assert.deepEqual(progress.reachedStops(ROUTE, 100, 101), []);
  assert.deepEqual(progress.reachedStops(ROUTE, 99, 100).map((s) => s.id), ['b']);
  assert.deepEqual(progress.reachedStops(ROUTE, 0, 0), []);
});

test('progress: stopWords covers (previous at, at] sorted by mile', () => {
  const cards = {
    x: { m: 100 }, y: { m: 101 }, z: { m: 50 }, w: { m: 300 }, v: { m: 301 }, u: { b: 1 },
  };
  assert.deepEqual(progress.stopWords(cards, ROUTE, 'b'), ['z', 'x']);
  assert.deepEqual(progress.stopWords(cards, ROUTE, 'c'), ['y', 'w']);
  assert.deepEqual(progress.stopWords(cards, ROUTE, 'a'), []);
  assert.deepEqual(progress.stopWords(cards, ROUTE, 'nope'), []);
});

test('progress: carFraction spreads stops evenly and follows miles inside a segment', () => {
  assert.equal(progress.carFraction(ROUTE, 0), 0);
  assert.equal(progress.carFraction(ROUTE, 3000), 1);
  assert.equal(progress.carFraction(ROUTE, 100), 1 / 3);
  assert.equal(progress.carFraction(ROUTE, 200), (1 + 0.5) / 3);
  assert.equal(progress.carFraction(ROUTE, 50), 0.5 / 3);
});
