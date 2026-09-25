import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { forms, knownWords, tokenize } from '../tools/lib/forms.mjs';
import { checkBatch, parseBatchFile } from '../tools/lib/check.mjs';
import { ROOT, loadBase, batchNames, batchWords } from '../tools/lib/words.mjs';
import { join } from 'node:path';

test('forms: irregular and regular inflections', () => {
  const cases = [
    ['go', 'went'], ['be', 'was'], ['child', 'children'], ['stop', 'stopped'],
    ['make', 'making'], ['big', 'bigger'], ['happy', 'happier'], ['lie', 'lying'],
    ['study', 'studied'], ['have to', 'had to'], ['a, an', 'an'],
    ['T-shirt', 't-shirts'], ["o'clock", "o'clock"], ['visit', 'visited'],
  ];
  for (const [w, f] of cases) assert.ok(forms(w).has(f), `${w} -> ${f}`);
});

test('words: base list helpers', () => {
  assert.equal(loadBase().length, 3000);
  assert.equal(batchNames().length, 30);
  assert.equal(batchWords('a1-01').length, 100);
});

// One good entry for the word "answer" (batch a1-01), and a copy with changes.
const base = loadBase();
const good = { id: 'answer', p: 'v', th: 'ตอบ', ex: 'Can you [answer] my question?', exTh: 'คุณช่วยตอบคำถามของฉันได้ไหม' };
const run = patch => {
  const entry = { ...good, ...patch };
  for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
  return checkBatch('a1-01', [entry], base, { allowMissing: true });
};

test('checkBatch: a good entry passes', () => {
  const { errors, warnings } = run({});
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('checkBatch: each error rule is caught', () => {
  const bad = {
    'unknown key': { colour: 'x' },
    'missing exTh': { exTh: undefined },
    'id not in batch': { id: 'zebra' },
    'p not a POS of the word': { p: 'modal' },
    'th without Thai': { th: 'answer' },
    'th with Latin': { th: 'ตอบ answer' },
    'th too long': { th: 'ก'.repeat(46) },
    'th with semicolon': { th: 'ตอบ; ตอบกลับ' },
    'ex without bracket': { ex: 'Can you answer my question?' },
    'ex two brackets': { ex: 'Can [you] [answer] my question?' },
    'ex wrong form': { ex: 'Can you [reply] to my question?' },
    'ex too short': { ex: '[Answer] me.' },
    'ex lowercase start': { ex: 'can you [answer] my question?' },
    'ex no end mark': { ex: 'Can you [answer] my question' },
    'ex not ASCII': { ex: 'Can you [answer] my question’s?' },
    'exTh without Thai': { exTh: 'Can you answer' },
    'exTh polite particle': { exTh: 'ตอบได้ไหมครับ' },
    'other too many': { other: [['n', 'ก'], ['n', 'ข'], ['n', 'ค']] },
    'other same as p': { other: [['v', 'ตอบ']] },
    'e not emoji': { e: 'ab' },
    'alt empty': { alt: [] },
    'gapOnly false': { gapOnly: false },
  };
  for (const [what, patch] of Object.entries(bad)) {
    assert.ok(run(patch).errors.length > 0, what);
  }
  const dup = checkBatch('a1-01', [{ ...good }, { ...good }], base, { allowMissing: true });
  assert.ok(dup.errors.some(e => e.includes('duplicate')));
  const missing = checkBatch('a1-01', [{ ...good }], base);
  assert.ok(missing.errors.some(e => e.includes('99 ids missing')));
  assert.ok(checkBatch('a1-01', {}, base).errors.length > 0);
});

test('checkBatch: irregular form in the sentence is accepted', () => {
  const go = { id: 'be', p: 'v', th: 'เป็น', ex: 'They [were] happy to see us.', exTh: 'พวกเขาดีใจที่ได้เจอเรา' };
  assert.deepEqual(checkBatch('a1-01', [go], base, { allowMissing: true }).errors, []);
});

test('checkBatch: warnings', () => {
  const easy = run({ ex: 'The [answer] confused zebras and giraffes.' });
  assert.ok(easy.warnings.some(w => w.includes('outside the list')));
  const many = run({ th: 'ตอบ, ตอบกลับ, แก้ไข, ตอบรับ' });
  assert.ok(many.warnings.some(w => w.includes('3 glosses')));
  const same = checkBatch('a1-01', [good, { id: 'ask', p: 'v', th: 'ตอบ', ex: 'Please [ask] me anything.', exTh: 'ถามอะไรก็ได้' }], base, { allowMissing: true });
  assert.ok(same.warnings.some(w => w.includes('same th')));
});

test('parseBatchFile: readable error with the line number', () => {
  assert.equal(parseBatchFile('[\n{"id":"a"},\n{"id":"b"}\n]').length, 2);
  assert.throws(() => parseBatchFile('[\n{"id":"a"},\n{"id":"b"\n]'), /line 3/);
});

test('knownWords and tokenize', () => {
  const known = knownWords(base);
  for (const w of ['children', 'went', 'stopped', 'answer', 'ice', 'cream']) assert.ok(known.has(w), w);
  assert.deepEqual(tokenize("I don't know."), ['i', 'do', 'not', 'know']);
  assert.deepEqual(tokenize("It's 5 o'clock in Boston."), ['it', 'is', "o'clock", 'in']);
  assert.deepEqual(tokenize("They can't go, we'll stay."), ['they', 'can', 'not', 'go', 'we', 'will', 'stay']);
});

test('words.json (if built): every word has its content', () => {
  const path = join(ROOT, 'public', 'data', 'words.json');
  if (!existsSync(path)) return;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(data.total, 3000);
  assert.equal(data.count, data.words.length);
  for (const w of data.words) {
    for (const k of ['id', 'w', 'lv', 'pos', 'p', 'th', 'ex', 'exTh']) assert.ok(w[k], `${w.id}.${k}`);
  }
});
