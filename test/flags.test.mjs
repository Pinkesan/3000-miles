import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flaggedRows, formatRows } from '../tools/flags.mjs';

const base = [
  { id: 'a', w: 'a', batch: 'a1-01' },
  { id: 'bank', w: 'bank', batch: 'a1-01' },
  { id: 'zoo', w: 'zoo', batch: 'a1-02' },
];
const content = new Map([['bank', { id: 'bank', th: 'ธนาคาร', ex: 'The [bank] is closed.' }]]);
const backup = { app: '3000-miles', data: { flags: { zoo: { day: 1, note: 'typo' }, bank: { day: 2, note: '' } } } };

test('flags: rows follow batch and list order', () => {
  const rows = flaggedRows(backup, base, content);
  assert.deepEqual(rows.map((r) => r.id), ['bank', 'zoo']);
  assert.equal(rows[1].th, ''); // no content yet
});

test('flags: output groups by batch', () => {
  const text = formatRows(flaggedRows(backup, base, content));
  assert.equal(text, '# a1-01\na1-01 | bank | bank | ธนาคาร | The [bank] is closed. | \n# a1-02\na1-02 | zoo | zoo |  |  | typo');
});

test('flags: rejects other files', () => {
  assert.throws(() => flaggedRows({ app: 'x' }, base, content), /not a 3000 Miles backup/);
});
