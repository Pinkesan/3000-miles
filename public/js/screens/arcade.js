// #/arcade: Highway Rush, a 60-second run with three strikes (DESIGN §7, Step 12).
// A run only reads the cards: it never grades or saves them. It saves the best score and the last runs.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { makeQuestion, isCorrect } from '../quiz.js';
import {
  arcadeOpen, arcadePool, weightedPick, boxWeight, arcadeType, newRun, answerRun, runOver, runSummary,
  strikesLeft, RUN_SECONDS, STRIKES,
} from '../arcade.js';
import * as sfx from '../sfx.js';
import { questionView } from '../components/question.js';
import { wordItem } from '../components/wordrow.js';

let runNo = 0; // so every run of a session draws a different seed

export function render(root, app) {
  const { store, byId } = app;
  const today = app.today();
  if (!arcadeOpen(store.state.cards, store.state.days[today])) {
    location.replace('#/');
    return null;
  }

  let destroyed = false;
  let phase = 'idle'; // count | run | end
  let timer = 0;
  let tick = 0;
  let run = null;
  let cur = null;
  let rnd = null;
  let pool = [];
  let t0 = 0;
  let last = null;

  const road = h('div', { class: 'road', 'aria-hidden': 'true' }, h('span', { class: 'lane-car', style: { '--p': 0.2 }, html: icons.car }));
  const speedEl = en('40', { class: 'rush-speed' });
  const scoreEl = en('0', { class: 'rush-score' });
  const timeEl = en(String(RUN_SECONDS), { class: 'rush-time-n' });
  const timeBar = h('div', { class: 'rush-time', 'aria-hidden': 'true' }, h('i'));
  const cones = h('div', { class: 'cones', role: 'img', 'aria-label': `เหลือ ${STRIKES} ครั้ง` },
    Array.from({ length: STRIKES }, () => h('span', { class: 'cone', html: icons.cone })));
  const bar = h('header', { class: 'drive-bar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'กลับหน้าแรก', title: 'กลับหน้าแรก', html: icons.x, onclick: () => { location.hash = '#/'; } }),
    h('div', { class: 'lane-wrap' }, road,
      h('div', { class: 'lane-info' }, speedEl, en(' mph'), scoreEl, timeEl, en('s')), timeBar),
    cones,
  );
  const stage = h('div', { class: 'stage' });
  setChildren(root, bar, stage);

  const elapsed = () => performance.now() - t0;

  function updateHud() {
    const left = Math.max(0, RUN_SECONDS - elapsed() / 1000);
    speedEl.textContent = String(run.speed);
    scoreEl.textContent = run.score.toLocaleString('en-US');
    timeEl.textContent = String(Math.ceil(left));
    timeBar.firstChild.style.transform = `scaleX(${left / RUN_SECONDS})`;
    road.style.setProperty('--dur', `${(60 / run.speed).toFixed(2)}s`);
    const left3 = strikesLeft(run.wrong);
    cones.setAttribute('aria-label', `เหลือ ${left3} ครั้ง`);
    [...cones.children].forEach((c, i) => c.classList.toggle('cone-down', i >= left3));
  }

  function countdown() {
    phase = 'count';
    run = newRun();
    t0 = performance.now();
    updateHud();
    let n = 3;
    const go = () => {
      clearTimeout(timer);
      if (destroyed || phase !== 'count') return;
      if (n === 0) return start();
      setChildren(stage, h('button', { class: 'countdown', type: 'button', id: 'countdown', onclick: () => { n = 0; go(); }, 'aria-label': `เริ่มใน ${n}` }, en(String(n))));
      n -= 1;
      timer = setTimeout(go, 800);
    };
    go();
  }

  function start() {
    pool = arcadePool(app.words, store.state.cards, today);
    if (!pool.length) {
      phase = 'end';
      setChildren(stage, h('p', { class: 'empty-note' }, th('ตอนนี้ยังไม่มีคำให้เล่น ทวนคำค้างก่อนนะ')),
        h('a', { class: 'btn btn-primary', href: '#/' }, th('กลับหน้าแรก')));
      return;
    }
    phase = 'run';
    rnd = app.rnd(`rush:${today}:${runNo++}`);
    run = newRun();
    last = null;
    t0 = performance.now();
    updateHud();
    tick = setInterval(() => {
      if (phase !== 'run') return;
      updateHud();
      if (elapsed() >= RUN_SECONDS * 1000) end();
    }, 100);
    next();
  }

  function next() {
    if (destroyed || phase !== 'run') return;
    const choices = pool.length > 1 ? pool.filter((w) => w.id !== last) : pool;
    const word = weightedPick(choices, (w) => boxWeight(store.state.cards[w.id]), rnd);
    last = word.id;
    const type = arcadeType(app.hasVoice(), rnd);
    const q = makeQuestion(word, type, app.words, rnd, { hint: 'short' });
    cur = { q, word, answered: false };
    cur.view = questionView(app, q, { tag: 'ตอบเร็ว', kind: 'rush', onAnswer: answer });
    setChildren(stage, cur.view.el);
    cur.view.start();
  }

  function answer(response) {
    if (phase !== 'run' || !cur || cur.answered) return;
    cur.answered = true;
    const correct = isCorrect(cur.q, response);
    run = answerRun(run, { id: cur.q.id, correct });
    if (correct) sfx.right(); else sfx.wrong();
    cur.view.paint(correct, response);
    updateHud();
    if (runOver(run, elapsed())) timer = setTimeout(end, 600);
    else timer = setTimeout(next, correct ? 350 : 600);
  }

  function end() {
    if (destroyed || phase !== 'run') return;
    phase = 'end';
    clearInterval(tick);
    clearTimeout(timer);
    app.stopSay();
    const res = runSummary(store.state.arcade, run, today);
    store.update((s) => { s.arcade = res.arcade; });
    updateHud();
    if (res.isBest) sfx.stop();
    const missed = run.missed.map((id) => byId.get(id)).filter(Boolean);
    setChildren(stage,
      h('h1', { class: 'results-title' }, en('Highway Rush')),
      h('div', { class: 'score-hero' },
        en(run.score.toLocaleString('en-US'), { class: 'score-big', id: 'rush-score' }),
        th('คะแนน', { class: 'stat-l' }),
        res.isBest ? th('สถิติใหม่!', { class: 'record-line', id: 'rush-best-new' }) : null,
        th(`สถิติสูงสุด ${res.arcade.best.toLocaleString('en-US')}`, { class: 'stat-l', id: 'rush-best' }),
      ),
      h('div', { class: 'stats stats-2' },
        h('div', { class: 'stat' }, en(String(run.right), { class: 'stat-n' }), th('ตอบถูก', { class: 'stat-l' })),
        h('div', { class: 'stat' }, en(String(run.wrong), { class: 'stat-n' }), th('ตอบผิด', { class: 'stat-l' })),
      ),
      h('div', { class: 'results-actions' },
        h('button', { class: 'btn btn-primary btn-main', type: 'button', id: 'again-btn', onclick: countdown }, th('เล่นอีกครั้ง')),
        h('a', { class: 'btn btn-secondary', href: '#/', id: 'home-btn' }, th('กลับหน้าแรก')),
      ),
      missed.length
        ? h('section', { class: 'leg-words', id: 'rush-missed' },
            h('h2', {}, th('คำที่ตอบผิด')),
            h('ul', {}, missed.map((w) => wordItem(w))))
        : null,
    );
    window.scrollTo(0, 0);
    document.getElementById('again-btn')?.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (destroyed || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { location.hash = '#/'; return; }
    if (phase === 'count' && e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timer);
      start();
    } else if (phase === 'run' && /^[1-4]$/.test(e.key) && cur?.q.options && !cur.answered) {
      const o = cur.q.options[Number(e.key) - 1];
      if (o) answer(o.id);
    } else if (phase === 'run' && e.key === ' ' && cur && !cur.answered) {
      const t = cur.q.type;
      if (t === 'meaning' || t === 'listen') { e.preventDefault(); cur.view.replay(); }
    }
  }
  document.addEventListener('keydown', onKey);
  app.hooks = { item: () => (cur ? { key: cur.q.id, kind: 'rush' } : null), question: () => cur?.q ?? null, endRun: end };

  countdown();
  return {
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener('keydown', onKey);
      app.hooks = null;
    },
  };
}
