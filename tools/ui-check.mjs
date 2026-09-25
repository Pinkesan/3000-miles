// UI smoke test: drives headless Chrome through the app, saves screenshots to .shots/ and
// reports JS errors. Starts its own server (port 0), so the game server on 5320 is left alone.
//   npm run ui
//   ONLY=home,card npm run ui   (scenes: home card drive types resume mobile dark light)   (Git Bash)   PowerShell: $env:ONLY='home'; npm run ui
// Option: CHROME=path/to/chrome.exe
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './serve.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME =
  process.env.CHROME ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Chrome not found. Set CHROME=path/to/chrome');

const server = createServer({ root: path.join(ROOT, 'public') });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/?test&seed=1&today=20500`;

const OUT = path.join(ROOT, '.shots');
const PORT = 9333 + Math.floor(Math.random() * 400);
mkdirSync(OUT, { recursive: true });
const profileDir = path.join(OUT, 'chrome-profile');
rmSync(profileDir, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--window-size=1366,900',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  'about:blank',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch {}
  await sleep(200);
}
if (!target) throw new Error('chrome did not start');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nextId = 1;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    if (msg.params.type === 'error' || msg.params.type === 'warning') errors.push(`console.${msg.params.type}: ${text}`);
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    errors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
let shotNo = 0;
async function shot(name) {
  await sleep(300);
  const m = await send('Page.getLayoutMetrics');
  const clip = { x: 0, y: 0, width: Math.ceil(m.cssContentSize.width), height: Math.ceil(m.cssContentSize.height), scale: 1 };
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
  const file = `${String(++shotNo).padStart(2, '0')}-${name}.png`;
  writeFileSync(path.join(OUT, file), Buffer.from(r.data, 'base64'));
  console.log('shot', file);
}
async function waitFor(expr, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(expr).catch(() => false)) return true;
    await sleep(100);
  }
  throw new Error(`timeout waiting for ${expr}`);
}
const viewport = (width, height, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
const setHash = async (hash) => {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`);
  await sleep(300);
};
async function freshLoad() {
  await send('Page.navigate', { url: BASE });
  await waitFor(`!!document.querySelector('.screen') && document.fonts.status === 'loaded'`);
  await evaluate(`localStorage.clear(); location.reload()`).catch(() => {});
  await sleep(300);
  await waitFor(`!!document.querySelector('.screen') && document.fonts.status === 'loaded'`);
}
function check(cond, message) {
  if (!cond) errors.push(`check failed: ${message}`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
// Speech stub: each sentence "takes" 300 ms and there is one fake English voice.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
    const s = window.speechSynthesis; if (!s) return;
    s.speak = (u) => setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(new Event('end')), 300); }, 20);
    s.cancel = () => {};
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    s.getVoices = () => [{ name: 'Test Voice', lang: 'en-US', voiceURI: 'test', localService: true, default: true }];
  })();`,
});

const only = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (k) => !only.length || only.includes(k);

const words = JSON.parse(readFileSync(path.join(ROOT, 'public/data/words.json'), 'utf8')).words;
const firstId = words[0].id;
const rich = words.find((w) => w.other && w.e) || words.find((w) => w.other) || words[1];

const KEY = 'miles3000.v1';
const pageReady = `!!document.querySelector('.screen') && document.fonts.status === 'loaded'`;

// Fresh storage, then a saved state written before the app loads.
async function loadWith(partial = {}) {
  await freshLoad();
  await evaluate(`localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify({ v: 1, ...partial }))})`);
  await send('Page.navigate', { url: BASE });
  await waitFor(pageReady);
}

// 14 reviews due today in boxes 1..8, so every question type shows up in one leg.
function reviewCards() {
  const boxes = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8];
  const cards = {};
  boxes.forEach((b, i) => {
    cards[words[i].id] = { b, d: 20500, g: 20490, n: 3, r: 3, l: 0, ...(b >= 3 ? { m: i + 1, md: 20495 } : {}) };
  });
  return cards;
}

const fakeLastLeg = () => ({
  day: 20500, stats: { right: 8, wrong: 2, taught: 4, known: 1, reviewed: 5, miles: 2 }, startMiles: 10, endMiles: 12,
  ids: words.slice(0, 9).map((w) => w.id),
});

// Plays the leg like a player: clicks and types. The 3rd meet is "I know this"; the 2nd graded
// answer is wrong. Shoots each question type the first time it appears. Returns the types seen.
async function playLeg({ prefix = '', stopAtQuestion = false } = {}) {
  const seen = new Set();
  let meets = 0;
  let graded = 0;
  let wrongShot = false;
  for (let guard = 0; guard < 200; guard++) {
    await waitFor(`!!__app.item() || location.hash === '#/results'`);
    if (await evaluate(`location.hash === '#/results'`)) return seen;
    const { item, q } = JSON.parse(await evaluate(`JSON.stringify({ item: __app.item(), q: __app.question() })`));
    if (item.kind === 'meet') {
      meets += 1;
      if (meets === 1) await shot(`${prefix}drive-meet`);
      const know = meets === 3;
      await evaluate(`document.querySelector('.wc-actions .${know ? 'btn-secondary' : 'btn-primary'}').click()`);
    } else {
      if (!seen.has(q.type)) {
        seen.add(q.type);
        await shot(`${prefix}drive-${q.type}`);
        check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), `${prefix}drive ${q.type}: horizontal scroll`);
      }
      if (stopAtQuestion) return seen;
      graded += 1;
      const wrong = graded === 2;
      if (q.options) {
        const id = wrong ? q.options.find((o) => o.id !== q.id).id : q.id;
        await evaluate(`document.querySelector('.opt[data-id=${JSON.stringify(id)}]').click()`);
      } else {
        await evaluate(`document.querySelector('.answer-input').focus()`);
        await send('Input.insertText', { text: wrong ? 'zzz' : q.accept[0] });
        await evaluate(`document.querySelector('.answer-form button').click()`);
      }
      check(await evaluate(`document.querySelector('.feedback').children.length > 0`), `drive ${q.type}: feedback shown`);
      if (item.kind === 'know' && !wrong) {
        check(await evaluate(`!document.querySelector('.chip-plus').hidden`), 'drive: +1 mile shown after a right "I know this"');
      }
      if (wrong && !wrongShot) {
        wrongShot = true;
        check(await evaluate(`!!document.querySelector('.fb-wrong') && !!document.querySelector('.minicard')`), 'drive: wrong feedback with mini card');
        await shot(`${prefix}drive-wrong`);
      }
      if (await evaluate(`!!document.querySelector('.btn-next')`)) await evaluate(`document.querySelector('.btn-next').click()`);
    }
    await waitFor(`__app.item()?.key !== ${JSON.stringify(item.key)}`);
  }
  throw new Error('leg did not finish');
}

// A missing-font check: the fonts the design promises must be loaded, not fallbacks.
const fontsOk = () =>
  evaluate(`Promise.all([
    document.fonts.load('800 20px Overpass'), document.fonts.load('400 20px Anuphan', 'ก'),
    document.fonts.load('600 20px "Overpass Mono"')
  ]).then((r) => r.every((x) => x.length > 0))`);

try {
  await viewport(1366, 768);
  await freshLoad();
  check(await fontsOk(), 'Overpass / Anuphan / Overpass Mono did not load');

  if (want('home')) {
    await setHash('#/');
    check(await evaluate(`!!document.querySelector('.odometer') && !!document.querySelector('#main-btn')`), 'home: odometer and main button');
    check(await evaluate(`document.querySelector('#ready')?.textContent.includes('/3000')`), 'home: ready count');
    await shot('home');
    // changing new words per day is saved
    await evaluate(`(() => { const s = document.querySelector('#new-per-day'); s.value = '15'; s.dispatchEvent(new Event('change')); })()`);
    check(await evaluate(`JSON.parse(localStorage.getItem('miles3000.v1')).settings.newPerDay === 15`), 'home: newPerDay saved');
    check(await evaluate(`document.querySelector('#plan-line').textContent.includes('คำใหม่ 15')`), 'home: plan line follows newPerDay');
    await evaluate(`(() => { const s = document.querySelector('#new-per-day'); s.value = '10'; s.dispatchEvent(new Event('change')); })()`);
  }

  if (want('card')) {
    await setHash(`#/card/${firstId}`);
    check(await evaluate(`!!document.querySelector('.wordcard .wc-w')`), 'card: word card shown');
    await shot('card');
    await setHash(`#/card/${rich.id}`);
    check(await evaluate(`!!document.querySelector('.wc-other') === ${!!rich.other}`), 'card: other senses');
    await shot('card-rich');
    await evaluate(`document.querySelector('.wc-ex .icon-btn').click()`);
    await setHash('#/nowhere');
    check(await evaluate(`location.hash === '#/'`), 'router: unknown route goes home');
  }

  if (want('drive') || want('results')) {
    // day one: only new words. Play the whole leg.
    await freshLoad();
    await setHash('#/drive');
    const seen = await playLeg();
    check(seen.has('meaning') && seen.has('word'), `drive: day one shows meaning and word (saw ${[...seen]})`);
    check(await evaluate(`location.hash === '#/results'`), 'drive: leg ends on results');
    const saved = JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`));
    check(saved.leg === null && saved.lastLeg && Object.keys(saved.cards).length > 0, 'drive: cards and lastLeg saved, leg cleared');
    check(await evaluate(`!!document.querySelector('#gain') && !!document.querySelector('.stats') && !!document.querySelector('#home-btn')`), 'results: shown');
    await sleep(1200);
    await shot('results');
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(pageReady);
    check(await evaluate(`location.hash === '#/results' && !!document.querySelector('#gain')`), 'results: still shown after reload');
    await evaluate(`localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify({ ...JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})), lastLeg: null }))`);
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(pageReady);
    check(await evaluate(`location.hash === '#/'`), 'results: no lastLeg goes home');
  }

  if (want('drive') || want('types')) {
    // reviews in every box: all six question types, at phone size
    await viewport(390, 844, true);
    await loadWith({ cards: reviewCards() });
    await setHash('#/drive');
    const seen = await playLeg({ prefix: 'm-' });
    for (const t of ['meaning', 'listen', 'word', 'gap', 'spell', 'gapType']) check(seen.has(t), `types: ${t} never appeared (saw ${[...seen]})`);
    await viewport(1366, 768);
  }

  if (want('resume')) {
    await freshLoad();
    await setHash('#/drive');
    for (let i = 0; i < 2; i++) {
      await waitFor(`!!__app.item()`);
      const item = JSON.parse(await evaluate(`JSON.stringify(__app.item())`));
      await evaluate(`document.querySelector('.wc-actions .btn-primary').click()`);
      await waitFor(`__app.item()?.key !== ${JSON.stringify(item.key)}`);
    }
    const before = await evaluate(`__app.item().key`);
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(`!!document.querySelector('.screen') && !!__app.item()`);
    check((await evaluate(`__app.item().key`)) === before, 'resume: the leg continues at the same item');
    check(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).leg.queue.length > 0`), 'resume: saved leg');
  }

  if (want('mobile')) {
    await viewport(390, 844, true);
    for (const [name, hash] of [['home', '#/'], ['card', `#/card/${rich.id}`]]) {
      await setHash(hash);
      await shot(`mobile-${name}`);
      const wide = await evaluate(`document.documentElement.scrollWidth > innerWidth`);
      check(!wide, `mobile ${name}: horizontal scroll`);
    }
    await loadWith({ cards: reviewCards(), lastLeg: fakeLastLeg() });
    await setHash('#/drive');
    await playLeg({ prefix: 'mobile-', stopAtQuestion: true });
    await setHash('#/results');
    await sleep(1200);
    await shot('mobile-results');
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'mobile results: horizontal scroll');
    await viewport(360, 740, true);
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'mobile 360px: horizontal scroll');
    await viewport(1366, 768);
  }

  if (want('dark')) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    await viewport(390, 844, true);
    for (const [name, hash] of [['home', '#/'], ['card', `#/card/${rich.id}`]]) {
      await setHash(hash);
      check(await evaluate(`getComputedStyle(document.body).backgroundColor === 'rgb(21, 23, 27)'`), `dark ${name}: dark background`);
      await shot(`dark-${name}`);
    }
    await loadWith({ cards: reviewCards(), lastLeg: fakeLastLeg() });
    await setHash('#/drive');
    await playLeg({ prefix: 'dark-', stopAtQuestion: true });
    await setHash('#/results');
    await sleep(1200);
    await shot('dark-results');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await viewport(1366, 768);
  }
  if (want('light')) {
    await evaluate(`document.documentElement.dataset.theme = 'light'`);
    await viewport(390, 844, true);
    for (const [name, hash] of [['home', '#/'], ['card', `#/card/${rich.id}`]]) {
      await setHash(hash);
      check(await evaluate(`getComputedStyle(document.body).backgroundColor === 'rgb(238, 241, 238)'`), `light ${name}: light background`);
      await shot(`light-${name}`);
    }
    await evaluate(`document.documentElement.dataset.theme = 'auto'`);
    await viewport(1366, 768);
  }
} catch (err) {
  errors.push(`harness: ${err.message}`);
}

ws.close();
chrome.kill();
server.close();
console.log(errors.length ? `JS errors:\n${errors.map((e) => `  - ${e}`).join('\n')}` : 'JS errors: none');
process.exit(errors.length ? 1 : 0);
