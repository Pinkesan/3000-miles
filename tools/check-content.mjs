// Content status and validation. See docs/CONTENT-GUIDE.md.
//   node tools/check-content.mjs                status of every batch
//   node tools/check-content.mjs --todo a1-02   the words of a batch to write
//   node tools/check-content.mjs a1-02 [...]    validate (or --all)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadBase, batchNames, batchWords } from './lib/words.mjs';
import { checkBatch, parseBatchFile } from './lib/check.mjs';

const base = loadBase();
const names = batchNames();
const file = name => join(ROOT, 'content', `${name}.json`);

function load(name) {
  if (!existsSync(file(name))) return null;
  return parseBatchFile(readFileSync(file(name), 'utf8'));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function status() {
  const levels = {};
  let next = null;
  for (const name of names) {
    let line;
    let count = 0;
    let complete = false;
    try {
      const entries = load(name);
      if (!entries) {
        line = 'missing';
      } else {
        count = entries.length;
        const { errors } = checkBatch(name, entries, base, { allowMissing: true });
        complete = count === 100 && errors.length === 0;
        line = errors.length ? `${errors.length} errors` : count === 100 ? 'ok' : 'partial';
        line = `${String(count).padStart(3)}/100  ${line}`;
      }
    } catch (err) {
      line = `unreadable (${err.message})`;
    }
    console.log(`${name}  ${line}`);
    const lv = name.slice(0, 2).toUpperCase();
    levels[lv] ??= { done: 0, total: 0 };
    levels[lv].total += 100;
    if (complete) levels[lv].done += 100;
    if (!complete) next ??= name;
  }
  console.log('');
  for (const [lv, { done, total }] of Object.entries(levels)) console.log(`${lv}  ${done}/${total}`);
  console.log(`next: ${next ?? 'none, all batches are done'}`);
}

function todo(name) {
  if (!names.includes(name)) fail(`unknown batch "${name}"`);
  for (const w of batchWords(name)) {
    const pos = w.pos.map(p => p.join(':')).join(',');
    console.log(`${w.id} | ${w.w} | ${pos} | ${w.sense ?? ''}`);
  }
}

function validate(list) {
  let failed = false;
  for (const name of list) {
    if (!names.includes(name)) fail(`unknown batch "${name}"`);
    let entries;
    try {
      entries = load(name);
    } catch (err) {
      console.log(`${name}: ${err.message}`);
      failed = true;
      continue;
    }
    if (!entries) {
      console.log(`${name}: no file content/${name}.json`);
      failed = true;
      continue;
    }
    const { errors, warnings } = checkBatch(name, entries, base);
    for (const e of errors) console.log(e);
    for (const w of warnings) console.log(`warn ${w}`);
    console.log(`${name}: ${errors.length} errors, ${warnings.length} warnings`);
    if (errors.length) failed = true;
  }
  if (failed) process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) status();
else if (args[0] === '--todo') todo(args[1]);
else if (args[0] === '--all') validate(names.filter(n => existsSync(file(n))));
else validate(args);
