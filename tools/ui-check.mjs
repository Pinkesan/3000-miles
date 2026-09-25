// UI smoke test: drives headless Chrome through the app, saves screenshots to .shots/ and
// reports JS errors. Starts its own server (port 0), so the game server on 5320 is left alone.
//   npm run ui
//   ONLY=home,card npm run ui   (scenes: home card drive types synonym score arcade map postcard arrive streak resume done mobile dark light)   (Git Bash)   PowerShell: $env:ONLY='home'; npm run ui
// Option: CHROME=path/to/chrome.exe
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './serve.mjs';
import { lookAlike } from '../public/js/quiz.js';
import { glossOverlap } from '../public/js/text.js';

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

// 14 reviews due today in boxes 1..8, so every question type shows up in one leg (seed 1).
function reviewCards() {
  const boxes = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 7, 8];
  const cards = {};
  boxes.forEach((b, i) => {
    cards[words[i].id] = { b, d: 20500, g: 20490, n: 3, r: 3, l: 0, ...(b >= 3 ? { m: i + 1, md: 20495 } : {}) };
  });
  return cards;
}

// 60 cards met on earlier days (not due) and a finished plan for today: Highway Rush is open.
const rushState = (planDone = true) => ({
  cards: Object.fromEntries(words.slice(0, 60).map((w, i) => [w.id, { b: 1 + (i % 4), d: 20501 + i, g: 20499, n: 2, r: 2, l: 0 }])),
  days: { 20500: { day: 20500, due: [], dueTotal: 0, newTarget: 10, goal: 10, done: planDone ? 10 : 4, taught: 10, known: 0,
    right: 10, wrong: 0, miles: 0, legs: 1, shown: [] } },
});
const pressEnter = () => evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))`);
// opens a run: skips the countdown with Enter
const startRush = async () => {
  await setHash('#/arcade');
  await waitFor(`!!document.querySelector('#countdown')`);
  await pressEnter();
  await waitFor(`!!__app.question()`);
};
// answers one Highway Rush question (right or wrong) and waits for the next one
const rushAnswer = async (right, { last = false } = {}) => {
  await waitFor(`!!__app.question() && !document.querySelector('.opt:disabled')`);
  const q = JSON.parse(await evaluate(`JSON.stringify(__app.question())`));
  const id = right ? q.id : q.options.find((o) => o.id !== q.id).id;
  await evaluate(`document.querySelector('.opt[data-id=${JSON.stringify(id)}]').click()`);
  if (!last) await waitFor(`__app.question()?.id !== ${JSON.stringify(q.id)}`);
};

const route = JSON.parse(readFileSync(path.join(ROOT, 'public/data/route.json'), 'utf8'));
// n words with a mile each, not due (the map and the postcards)
const milesCards = (n) => Object.fromEntries(words.slice(0, n).map((w, i) =>
  [w.id, { b: 3, d: 20510, g: 20499, n: 3, r: 3, l: 0, m: i + 1, md: 20495 }]));
// a plan whose only work is one due review
const onePlan = (id) => ({ 20500: { day: 20500, due: [id], dueTotal: 1, newTarget: 0, goal: 1, done: 0, taught: 0, known: 0,
  right: 0, wrong: 0, miles: 0, legs: 0, shown: [], score: 0 } });
// miles = min(600, words with content), the stops up to there unlocked
const TRIP = Math.min(600, words.length);
const tripState = () => ({
  cards: milesCards(TRIP),
  stops: Object.fromEntries(route.stops.filter((s) => s.at > 0 && s.at <= TRIP).map((s) => [s.id, 20495])),
});
const noScroll = () => evaluate(`document.documentElement.scrollWidth <= innerWidth`);

const fakeLastLeg = () => ({
  day: 20500, stats: { right: 8, wrong: 2, taught: 4, known: 1, reviewed: 5, miles: 2 }, startMiles: 10, endMiles: 12,
  ids: words.slice(0, 9).map((w) => w.id),
});

// Plays the leg like a player: clicks and types. Probes: right, skip, wrong, then right / skip
// alternating; the 2nd typed answer is wrong, everything else is right. Shoots each question type
// the first time it appears. Returns the types seen.
async function playLeg({ prefix = '', stopAtQuestion = false } = {}) {
  const seen = new Set();
  let probes = 0;
  let typed = 0;
  let expectMeet = null;
  const shots = new Set();
  const shotOnce = async (name) => {
    if (shots.has(name)) return;
    shots.add(name);
    await shot(`${prefix}${name}`);
  };
  for (let guard = 0; guard < 200; guard++) {
    await waitFor(`!!__app.item() || location.hash === '#/results'`);
    if (await evaluate(`location.hash === '#/results'`)) return seen;
    const { item, q } = JSON.parse(await evaluate(`JSON.stringify({ item: __app.item(), q: __app.question() })`));
    if (expectMeet) {
      check(item.kind === 'meet' && item.id === expectMeet, `drive: the Meet card follows a skipped or wrong probe (got ${item.kind})`);
      expectMeet = null;
    }
    if (item.kind === 'meet') {
      await shotOnce('drive-meet');
      check(await evaluate(`document.querySelectorAll('.wc-actions button').length === 1`), 'drive: the Meet card has one button');
      await evaluate(`document.querySelector('.wc-actions .btn-primary').click()`);
    } else {
      if ((q.type === 'word' || q.type === 'gap') && item.kind !== 'probe') {
        const target = words.find((w) => w.id === q.id);
        const canAlike = words.some((x) => x.id !== target.id && x.w.toLowerCase() !== target.w.toLowerCase()
          && lookAlike(target, x) && !glossOverlap(x.th, target.th));
        const alike = q.options.filter((o) => o.id !== q.id && lookAlike(target, words.find((w) => w.id === o.id))).length;
        if (canAlike) check(alike >= 1, `${prefix}drive ${q.type}: no look-alike option for ${target.w}`);
        check(alike <= 2 || !canAlike, `${prefix}drive ${q.type}: more than 2 look-alikes for ${target.w}`);
        if (canAlike) await shotOnce('drive-lookalike');
      }
      if (q.hint && q.hint.includes('…')) await shotOnce('drive-short-hint');
      if (q.type === 'dictation') {
        check(await evaluate(`!!document.querySelector('.listen-btn') && !document.querySelector('.q-hint') && document.activeElement === document.querySelector('.answer-input')`),
          `${prefix}drive dictation: 🔊 button, no hint, input focused`);
      }
      if (!seen.has(q.type)) {
        seen.add(q.type);
        await shotOnce(`drive-${q.type}`);
        check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), `${prefix}drive ${q.type}: horizontal scroll`);
      }
      if (stopAtQuestion) return seen;
      let wrong = false;
      if (item.kind === 'probe') {
        probes += 1;
        await shotOnce('drive-probe');
        check(await evaluate(`!!document.querySelector('.btn-skip')`), 'drive: a probe has the skip button');
        if (probes === 2 || (probes > 3 && probes % 2 === 1)) {
          await evaluate(`document.querySelector('.btn-skip').click()`);
          expectMeet = item.id;
          await waitFor(`__app.item()?.key !== ${JSON.stringify(item.key)}`);
          continue;
        }
        wrong = probes === 3;
      } else {
        check(await evaluate(`!document.querySelector('.btn-skip')`), `drive ${item.kind}: only probes have the skip button`);
        if (!q.options) {
          typed += 1;
          wrong = typed === 2;
        }
      }
      if (q.options) {
        const id = wrong ? q.options.find((o) => o.id !== q.id).id : q.id;
        await evaluate(`document.querySelector('.opt[data-id=${JSON.stringify(id)}]').click()`);
      } else {
        await evaluate(`document.querySelector('.answer-input').focus()`);
        await send('Input.insertText', { text: wrong ? 'zzz' : q.accept[0] });
        await evaluate(`document.querySelector('.answer-form button').click()`);
      }
      check(await evaluate(`document.querySelector('.feedback').children.length > 0`), `drive ${q.type}: feedback shown`);
      if (item.kind === 'confirm' && !wrong) {
        check(await evaluate(`!document.querySelector('.chip-plus').hidden`), 'drive: +1 mile shown after a right confirm');
        await shotOnce('drive-confirm');
      }
      if (wrong && item.kind === 'probe') {
        expectMeet = item.id;
        check(await evaluate(`!!document.querySelector('.fb-wrong') && !document.querySelector('.minicard')`), 'drive: a wrong probe shows the answer without a mini card');
        check(await evaluate(`document.querySelector('.btn-next').textContent.includes('เรียนคำนี้')`), 'drive: a wrong probe offers เรียนคำนี้');
        await shotOnce('drive-probe-wrong');
      } else if (wrong) {
        check(await evaluate(`!!document.querySelector('.fb-wrong') && !!document.querySelector('.minicard')`), 'drive: wrong feedback with mini card');
        await shotOnce('drive-wrong');
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
    // start level is saved, and changes the intro order
    await evaluate(`(() => { const s = document.querySelector('#start-level'); s.value = 'B1'; s.dispatchEvent(new Event('change')); })()`);
    check(await evaluate(`JSON.parse(localStorage.getItem('miles3000.v1')).settings.startLevel === 'B1'`), 'home: startLevel saved');
    check(await evaluate(`document.querySelector('#start-level').value === 'B1'`), 'home: start level select keeps B1');
    await evaluate(`(() => { const s = document.querySelector('#start-level'); s.value = 'A1'; s.dispatchEvent(new Event('change')); })()`);
    check(await evaluate(`JSON.parse(localStorage.getItem('miles3000.v1')).settings.startLevel === 'A1'`), 'home: startLevel back to A1');
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
    check(seen.has('meaning') && seen.has('spell') && !seen.has('word'), `drive: day one shows meaning and spell, not word (saw ${[...seen]})`);
    check(await evaluate(`location.hash === '#/results'`), 'drive: leg ends on results');
    const saved = JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`));
    check(saved.leg === null && saved.lastLeg && Object.keys(saved.cards).length > 0, 'drive: cards and lastLeg saved, leg cleared');
    check(await evaluate(`!!document.querySelector('#gain') && !!document.querySelector('.stats') && !!document.querySelector('#home-btn')`), 'results: shown');
    check(saved.lastLeg.score > 0 && saved.lastLeg.stars >= 1 && saved.lastLeg.stars <= 3, `score: lastLeg has a score and 1-3 stars (${saved.lastLeg.score}, ${saved.lastLeg.stars})`);
    check(saved.days[Object.keys(saved.days)[0]].score === saved.lastLeg.score && saved.records.day === saved.lastLeg.score, 'score: plan.score and records.day match the leg');
    check(await evaluate(`Number(document.querySelector('#leg-score').textContent.replace(/,/g, '')) > 0 && document.querySelectorAll('#leg-stars svg').length === 3`), 'score: results show the score and three stars');
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
    // reviews in every box: all seven question types, at phone size
    await viewport(390, 844, true);
    await loadWith({ cards: reviewCards() });
    await setHash('#/drive');
    const seen = await playLeg({ prefix: 'm-' });
    for (const t of ['meaning', 'listen', 'word', 'gap', 'spell', 'gapType', 'dictation']) check(seen.has(t), `types: ${t} never appeared (saw ${[...seen]})`);
    await viewport(1366, 768);
  }

  if (want('synonym')) {
    // bicycle asked for จักรยาน: typing the synonym bike is not graded, one more try
    const bicycle = words.find((w) => w.w === 'bicycle');
    const bike = words.find((w) => w.w === 'bike');
    check(!!bicycle && !!bike, 'synonym: a1-01 has bike and bicycle');
    if (bicycle && bike) {
      const card = { b: 5, d: 20500, g: 20490, n: 3, r: 3, l: 0, m: 1, md: 20495 };
      const leg = {
        v: 2, day: 20500, done: 0, reasks: {}, newCount: 0, startMiles: 1, ids: [bicycle.id],
        stats: { right: 0, wrong: 0, taught: 0, known: 0, reviewed: 0, miles: 0 },
        queue: [{ key: 'review-bicycle', id: bicycle.id, kind: 'review', type: 'spell', hint: 'short' }],
      };
      await viewport(390, 844, true);
      await loadWith({ cards: { [bicycle.id]: card }, leg });
      await setHash('#/drive');
      await waitFor(`!!__app.item()`);
      const type = async (text) => {
        await evaluate(`document.querySelector('.answer-input').focus()`);
        await send('Input.insertText', { text });
        await evaluate(`document.querySelector('.answer-form button').click()`);
      };
      check(await evaluate(`document.querySelector('.q-hint').textContent === 'b…'`), 'synonym: short hint b…');
      await type(bike.w);
      check(await evaluate(`!!document.querySelector('.fb-retry') && !document.querySelector('.fb-msg')`), 'synonym: retry message, no verdict');
      check(await evaluate(`document.querySelector('.answer-input').value === '' && !document.querySelector('.answer-input').disabled`), 'synonym: input cleared and open');
      const kept = JSON.parse(await evaluate(`localStorage.getItem(${JSON.stringify(KEY)})`)).cards[bicycle.id];
      check(kept.b === 5 && kept.g === 20490, 'synonym: the card is unchanged');
      await shot('m-drive-synonym');
      await type(bicycle.w);
      check(await evaluate(`!!document.querySelector('.fb-right')`), 'synonym: the right word is right');
      await viewport(1366, 768);
    }
  }

  if (want('score')) {
    // five right answers in a row: the combo chip; the speed bar exists on multiple choice
    await viewport(360, 740, true);
    await loadWith({ cards: reviewCards() });
    await setHash('#/drive');
    const answerRight = async () => {
      await waitFor(`!!__app.item() && !!__app.question()`);
      const { item, q } = JSON.parse(await evaluate(`JSON.stringify({ item: __app.item(), q: __app.question() })`));
      if (q.options) await evaluate(`document.querySelector('.opt[data-id=${JSON.stringify(q.id)}]').click()`);
      else {
        await evaluate(`document.querySelector('.answer-input').focus()`);
        await send('Input.insertText', { text: q.accept[0] });
        await evaluate(`document.querySelector('.answer-form button').click()`);
      }
      if (await evaluate(`!!document.querySelector('.btn-next')`)) await evaluate(`document.querySelector('.btn-next').click()`);
      await waitFor(`__app.item()?.key !== ${JSON.stringify(item.key)}`);
    };
    for (let i = 0; i < 5; i++) await answerRight();
    check(await evaluate(`!document.querySelector('.combo-chip').hidden && document.querySelector('.combo-chip').textContent.includes('5') && document.querySelector('.combo-chip').textContent.includes('1.5')`), 'score: combo chip shows ติดกัน 5 ×1.5');
    check(await evaluate(`Number(document.querySelector('.leg-score').textContent.replace(/,/g, '')) > 0`), 'score: the leg score is shown');
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'score: horizontal scroll with a combo at 360px');
    check(await evaluate(`document.querySelector('.lane').getBoundingClientRect().width >= 120`), 'score: the lane keeps 120px at 360px');
    await shot('drive-combo');
    // speed bar on the first multiple-choice question, then hidden with reduced motion
    for (let i = 0; i < 12 && !(await evaluate(`!!__app.question()?.options`)); i++) await answerRight();
    if (await evaluate(`!!__app.question()?.options`)) {
      check(await evaluate(`!!document.querySelector('.speed-bar') && getComputedStyle(document.querySelector('.speed-bar')).display !== 'none'`), 'score: the speed bar shows on multiple choice');
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      check(await evaluate(`getComputedStyle(document.querySelector('.speed-bar')).display === 'none'`), 'score: the speed bar is hidden with reduced motion');
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    } else errors.push('check failed: score: no multiple-choice question found');
    await viewport(1366, 768);
  }

  if (want('arcade')) {
    const savedCards = () => evaluate(`JSON.stringify(JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).cards)`);
    const savedRuns = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).arcade.runs.length`);
    await loadWith(rushState(false));
    check(await evaluate(`!!document.querySelector('#rush-locked') && !document.querySelector('#rush-link, #rush-btn')`), 'arcade: home says it opens after the day plan');
    await setHash('#/arcade');
    check(await evaluate(`location.hash === '#/'`), 'arcade: closed before the plan is done, goes home');

    await loadWith(rushState());
    check(await evaluate(`!!document.querySelector('#rush-link, #rush-btn')`), 'arcade: home links to Highway Rush when open');
    const cardsBefore = await savedCards();
    await setHash('#/arcade');
    await waitFor(`!!document.querySelector('#countdown')`);
    await shot('arcade-countdown');
    await pressEnter();
    await waitFor(`!!__app.question()`);
    for (let i = 0; i < 10; i++) await rushAnswer(i !== 3 && i !== 7);
    check(await evaluate(`document.querySelectorAll('.cone-down').length === 2`), 'arcade: two wrong answers, two cones down');
    check(await evaluate(`!document.querySelector('.btn-next') && !document.querySelector('.minicard')`), 'arcade: no next button or mini card');
    check(await evaluate(`Number(document.querySelector('.rush-speed').textContent) > 40`), 'arcade: speed goes up');
    await shot('arcade-run');
    await evaluate(`__app.endRun()`);
    await waitFor(`!!document.querySelector('#rush-score')`);
    check(await evaluate(`Number(document.querySelector('#rush-score').textContent.replace(/,/g, '')) > 0`), 'arcade: the run has a score');
    check(await evaluate(`document.querySelectorAll('#rush-missed li').length === 2`), 'arcade: two missed words are listed');
    check((await savedRuns()) === 1, 'arcade: the run is saved');
    check((await savedCards()) === cardsBefore, 'arcade: cards are untouched after a run');
    await shot('arcade-end');
    // a second run: three wrong answers end it by themselves
    await evaluate(`document.querySelector('#again-btn').click()`);
    await waitFor(`!!document.querySelector('#countdown')`);
    await pressEnter();
    await waitFor(`!!__app.question()`);
    await rushAnswer(true);
    await rushAnswer(false);
    await rushAnswer(false);
    await rushAnswer(false, { last: true });
    await waitFor(`!!document.querySelector('#rush-score')`);
    check((await savedRuns()) === 2, 'arcade: the third strike ends the run');
    check((await savedCards()) === cardsBefore, 'arcade: cards are untouched after two runs');
    await viewport(360, 740, true);
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'arcade: horizontal scroll on the end screen at 360px');
    await evaluate(`document.querySelector('#again-btn').click()`);
    await waitFor(`!!document.querySelector('#countdown')`);
    await pressEnter();
    await waitFor(`!!__app.question()`);
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'arcade: horizontal scroll in a run at 360px');
    await viewport(1366, 768);
  }

  if (want('map')) {
    await loadWith(tripState());
    const nextStop = route.stops.find((s) => s.at > TRIP);
    check(await evaluate(`document.querySelector('#next-stop').textContent.includes(${JSON.stringify(nextStop.city)}) && document.querySelector('#next-stop').textContent.includes('${nextStop.at - TRIP} miles to go')`), 'map: home shows the next stop and the miles to go');
    check(await evaluate(`!!document.querySelector('.gauge svg') && !!document.querySelector('#streak-line') && !!document.querySelector('#map-link')`), 'map: home has the gauge, streak and map link');
    await setHash('#/map');
    check(await evaluate(`document.querySelectorAll('.map-row').length === 16`), 'map: 16 stops');
    check(await evaluate(`!!document.querySelector('#tile-new-york') && !!document.querySelector('#tile-cleveland') && !document.querySelector('#tile-chicago')`), 'map: reached stops are tiles, later ones are not');
    check(await evaluate(`document.querySelector('#map-next').textContent.includes(${JSON.stringify(nextStop.city)})`), 'map: the next stop has a guide sign');
    await sleep(1200);
    check(await evaluate(`(() => { const r = document.querySelector('#map-car').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`), 'map: the car is scrolled into view');
    check(await noScroll(), 'map: horizontal scroll');
    await shot('map');
    await evaluate(`document.querySelector('#tile-cleveland').click()`);
    await waitFor(`location.hash === '#/postcard/cleveland'`);
  }

  if (want('postcard')) {
    await loadWith({ cards: milesCards(95), stops: { philadelphia: 20495 } });
    await setHash('#/postcard/philadelphia');
    check(await evaluate(`document.querySelector('#postcard-front').textContent.includes('Greetings from') && document.querySelector('#postcard-front').textContent.includes('Philadelphia')`), 'postcard: front says Greetings from Philadelphia');
    check(await evaluate(`document.querySelectorAll('#pc-words li').length === 12`), 'postcard: 12 words listed');
    check(await evaluate(`document.querySelector('#postcard-back').textContent.includes('(90 คำ)')`), 'postcard: the word count is shown');
    await sleep(400);
    await shot('postcard');
    await setHash('#/postcard/washington');
    check(await evaluate(`location.hash === '#/map'`), 'postcard: a locked stop goes to the map');
    await setHash('#/postcard/new-york');
    check(await evaluate(`document.querySelector('#postcard-front').textContent.includes('New York') && document.querySelector('#postcard-back').textContent.includes('JFK')`), 'postcard: New York is always open, with a welcome');
    await shot('postcard-new-york');
  }

  if (want('arrive')) {
    // mile 89 done; one due review in box 2: its right answer is mile 90, Philadelphia
    const due = words[89];
    await loadWith({ cards: { ...milesCards(89), [due.id]: { b: 2, d: 20500, g: 20490, n: 3, r: 3, l: 0 } }, days: onePlan(due.id) });
    await setHash('#/drive');
    await playLeg();
    await waitFor(`!!document.querySelector('#stop-philadelphia')`);
    check(await evaluate(`document.querySelector('#stop-philadelphia').textContent.includes('Philadelphia')`), 'arrive: results show the Philadelphia postcard button');
    check(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).stops.philadelphia === 20500`), 'arrive: the postcard is unlocked and saved');
    await sleep(1400);
    check(await evaluate(`document.querySelector('.odometer').getAttribute('aria-label') === '90 ไมล์' && document.querySelectorAll('.wheel')[3].style.getPropertyValue('--d') === '0'`), 'arrive: the odometer rolled to 90');
    await shot('arrive');
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(pageReady);
    check(await evaluate(`!!document.querySelector('#stop-philadelphia')`), 'arrive: the postcard button is still there after a reload');
    await evaluate(`document.querySelector('#stop-philadelphia').click()`);
    await waitFor(`location.hash === '#/postcard/philadelphia'`);
  }

  if (want('streak')) {
    // day 7 of a streak: the tank fills, home shows 7 days and 2 P signs
    const due = words[0];
    await loadWith({
      cards: { [due.id]: { b: 2, d: 20500, g: 20490, n: 3, r: 3, l: 0 } }, days: onePlan(due.id),
      streak: { cur: 6, best: 9, last: 20499, rests: 1 },
    });
    await setHash('#/drive');
    await playLeg();
    await waitFor(`!!document.querySelector('.toast')`);
    check(await evaluate(`document.querySelector('.toast').textContent.includes('เติมน้ำมันเต็มถังแล้ว')`), 'streak: the full tank toast');
    const streak = JSON.parse(await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).streak)`));
    check(streak.cur === 7 && streak.best === 9 && streak.last === 20500 && streak.rests === 2, `streak: 7 days, 2 rests (${JSON.stringify(streak)})`);
    await setHash('#/');
    check(await evaluate(`document.querySelector('#streak-line').textContent.includes('7 วัน') && document.querySelectorAll('#rests .p-sign').length === 2`), 'streak: home shows 7 days and 2 P signs');
    await shot('streak');
  }

  if (want('resume')) {
    await freshLoad();
    await setHash('#/drive');
    // probe right, probe skip, reload: the leg continues at the same item
    await waitFor(`!!__app.item()`);
    let item = JSON.parse(await evaluate(`JSON.stringify({ item: __app.item(), q: __app.question() })`));
    await evaluate(`document.querySelector('.opt[data-id=${JSON.stringify(item.q.id)}]').click()`);
    await waitFor(`__app.item()?.key !== ${JSON.stringify(item.item.key)}`);
    item = JSON.parse(await evaluate(`JSON.stringify({ item: __app.item() })`));
    await evaluate(`document.querySelector('.btn-skip').click()`);
    await waitFor(`__app.item()?.key !== ${JSON.stringify(item.item.key)}`);
    check((await evaluate(`__app.item().kind`)) === 'meet', 'resume: the Meet card follows the skip');
    const before = await evaluate(`__app.item().key`);
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(`!!document.querySelector('.screen') && !!__app.item()`);
    check((await evaluate(`__app.item().key`)) === before, 'resume: the leg continues at the same item');
    check(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).leg.queue.length > 0`), 'resume: saved leg');
    // a saved leg without v: 2 is dropped and a new leg starts
    await setHash('#/');
    await evaluate(`(() => { const s = JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})); delete s.leg.v; localStorage.setItem(${JSON.stringify(KEY)}, JSON.stringify(s)); })()`);
    await evaluate(`location.reload()`).catch(() => {});
    await sleep(300);
    await waitFor(pageReady);
    await setHash('#/drive');
    await waitFor(`!!__app.item()`);
    check(await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).leg.v === 2`), 'resume: an old leg is replaced by a v2 leg');
    check(await evaluate(`__app.item().kind === 'probe'`), 'resume: the new leg starts with a probe');
  }

  if (want('done')) {
    // plan done: one ขับเพิ่ม leg of 10 new words, then nothing is left today (DESIGN §5)
    const dayWith = (ids) => ({
      cards: Object.fromEntries(ids.map((id) => [id, { b: 1, d: 20501, g: 20500, n: 1, r: 1, l: 0 }])),
      days: { 20500: { day: 20500, due: [], dueTotal: 0, newTarget: 10, goal: 10, done: 10, taught: ids.length, known: 0,
        right: ids.length, wrong: 0, miles: 0, legs: ids.length / 10, shown: ids } },
    });
    await loadWith(dayWith(words.slice(0, 10).map((w) => w.id)));
    check(await evaluate(`document.querySelector('#main-btn')?.textContent === 'ขับเพิ่ม'`), 'done: plan done, the extra leg is offered');
    const full = dayWith(words.slice(0, 20).map((w) => w.id));
    // 25 more words met on earlier days: 45 cards, so Highway Rush is unlocked
    for (const w of words.slice(20, 45)) full.cards[w.id] = { b: 1, d: 20510, g: 20499, n: 1, r: 1, l: 0 };
    await loadWith({ ...full, lastLeg: fakeLastLeg() });
    check(await evaluate(`!document.querySelector('#main-btn') && !!document.querySelector('#day-done')`), 'done: after the extra leg, home has no main button');
    check(await evaluate(`document.querySelector('#rush-btn')?.classList.contains('btn-primary')`), 'done: home offers Highway Rush as the primary button');
    await shot('home-done');
    await setHash('#/results');
    check(await evaluate(`!document.querySelector('#again-btn') && !!document.querySelector('#home-btn')`), 'done: results offer no more legs');
    check(await evaluate(`document.querySelector('#rush-btn')?.classList.contains('btn-primary') && document.querySelector('#home-btn').classList.contains('btn-secondary')`), 'done: results offer Highway Rush as the primary button');
    await viewport(390, 844, true);
    await setHash('#/');
    await shot('mobile-home-done');
    check(!(await evaluate(`document.documentElement.scrollWidth > innerWidth`)), 'mobile home done: horizontal scroll');
    await viewport(1366, 768);
    await freshLoad(); // the next scenes expect a normal home
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
    await loadWith(rushState());
    await startRush();
    await rushAnswer(true);
    await shot('mobile-arcade');
    await loadWith(tripState());
    for (const [name, hash] of [['home-trip', '#/'], ['map', '#/map'], ['postcard', '#/postcard/cleveland']]) {
      await setHash(hash);
      await sleep(900);
      await shot(`mobile-${name}`);
      check(await noScroll(), `mobile ${name}: horizontal scroll`);
    }
    await viewport(360, 740, true);
    for (const hash of ['#/', '#/map', '#/postcard/cleveland']) {
      await setHash(hash);
      check(await noScroll(), `mobile 360px ${hash}: horizontal scroll`);
    }
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
    await loadWith(rushState());
    await startRush();
    await rushAnswer(true);
    await shot('dark-arcade');
    await loadWith(tripState());
    for (const [name, hash] of [['home-trip', '#/'], ['map', '#/map'], ['postcard', '#/postcard/cleveland']]) {
      await setHash(hash);
      await sleep(900);
      await shot(`dark-${name}`);
    }
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
