// #/checkpoint/<id>: the exam at a city (DESIGN §6, §7). Every answer is saved at once.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { makeRng } from '../rng.js';
import { makeQuestion, isCorrect } from '../quiz.js';
import { countMiles } from '../srs.js';
import {
  canTry, cleared, examAnswer, examItems, examResult, examWords, openCheckpoint, passMark, recordTry,
} from '../checkpoint.js';
import * as sfx from '../sfx.js';
import { questionView } from '../components/question.js';
import { starsRow } from '../components/stars.js';
import { wordItem } from '../components/wordrow.js';

export function render(root, app, params) {
  const { store, byId, route } = app;
  const today = app.today();
  const id = params.args[0];
  const stop = route.stops.find((s) => s.id === id);
  const open = openCheckpoint(route, countMiles(store.state.cards), store.state.checkpoints, store.state.stops);
  if (!stop || stop.at === 0 || !((open && open.id === id) || cleared(id, store.state.checkpoints, store.state.stops))) {
    location.replace('#/');
    return null;
  }

  let destroyed = false;
  let cur = null;
  // an unfinished exam of an earlier day is dropped (its answers are saved already)
  if (store.state.exam && store.state.exam.day !== today) store.update((s) => { s.exam = null; });
  const resumable = () => store.state.exam?.day === today && store.state.exam.stopId === id;

  const back = h('a', { class: 'btn btn-quiet back', href: '#/' }, h('span', { html: icons.back }), th('กลับ'));
  const stage = h('div', { class: 'stage' });
  setChildren(root, back, stage);

  const checkpointSign = () => h('div', { class: 'sign sign-checkpoint', lang: 'en' },
    h('span', { class: 'sign-small' }, 'CHECKPOINT'),
    h('span', { class: 'sign-big' }, stop.city),
    h('span', { class: 'sign-small' }, `MILE ${stop.at.toLocaleString('en-US')}`));

  function intro() {
    cur = null;
    const cp = store.state.checkpoints[id];
    const size = examWords(store.state.cards, route, id, makeRng('size')).length;
    const tried = !canTry(cp, today);
    setChildren(stage,
      checkpointSign(),
      size
        ? h('p', { class: 'today-line', id: 'exam-info' }, th(`${size} คำ · ผ่าน ${passMark(size)} คำขึ้นไป · สอบได้วันละครั้ง`))
        : h('p', { class: 'today-line', id: 'exam-info' }, th('ยังไม่มีคำในช่วงนี้ให้สอบ')),
      cp?.best ? h('div', { class: 'best-stars' }, th('ดาวที่ดีที่สุด', { class: 'stat-l' }), starsRow(cp.best, { id: 'best-stars' })) : null,
      h('div', { class: 'results-actions' },
        h('button', { class: 'btn btn-primary btn-main', type: 'button', id: 'exam-start', disabled: tried || !size, onclick: begin }, th('เริ่มสอบ')),
        tried ? th('ลองใหม่พรุ่งนี้', { class: 'muted center', id: 'exam-tomorrow' }) : null),
    );
  }

  function begin() {
    if (!canTry(store.state.checkpoints[id], today) || resumable()) return resumeOrShow();
    const ids = examWords(store.state.cards, route, id, app.rnd(`exam:${today}:${id}`));
    const items = examItems(ids, byId, { canListen: app.hasVoice() }, app.rnd(`examtypes:${today}:${id}`));
    if (!items.length) return intro();
    store.update((s) => { s.exam = { day: today, stopId: id, items, done: 0, right: 0, missed: [] }; });
    show();
  }

  function resumeOrShow() {
    if (resumable()) show();
    else intro();
  }

  function show() {
    if (destroyed) return;
    const exam = store.state.exam;
    const item = exam.items[exam.done];
    if (!item) return finish();
    const word = byId.get(item.id);
    if (!word) {
      // a word that vanished from the data: skip it without counting
      store.update((s) => { s.exam = { ...s.exam, items: s.exam.items.filter((it) => it.id !== item.id) }; });
      return show();
    }
    const q = makeQuestion(word, item.type, app.words, makeRng(`${today}:${item.key}`), { hint: item.hint ?? 'short' });
    cur = { item, q, answered: false, advanced: false, view: null };
    window.scrollTo(0, 0);
    cur.view = questionView(app, q, {
      tag: `ด่านตรวจ ${exam.done + 1} / ${exam.items.length}`,
      kind: 'exam',
      cheer: exam.done,
      onAnswer: answer,
      onNext: advance,
    });
    setChildren(stage, cur.view.el);
    cur.view.start();
  }

  function answer(response) {
    if (!cur || cur.answered) return;
    cur.answered = true;
    const correct = isCorrect(cur.q, response);
    const res = examAnswer(store.state.cards, cur.item.id, correct, today, countMiles(store.state.cards));
    store.update((s) => {
      s.cards = res.cards;
      s.exam = {
        ...s.exam,
        done: s.exam.done + 1,
        right: s.exam.right + (correct ? 1 : 0),
        missed: correct ? s.exam.missed : [...s.exam.missed, cur.item.id],
      };
    });
    if (correct) sfx.right(); else sfx.wrong();
    cur.view.paint(correct, response);
  }

  function advance() {
    if (!cur || !cur.answered || cur.advanced) return;
    cur.advanced = true;
    show();
  }

  function finish() {
    cur = null;
    app.stopSay();
    const exam = store.state.exam;
    const total = exam.items.length;
    const result = examResult(exam.right, total);
    const firstPass = result.passed && store.state.stops[id] == null;
    store.update((s) => {
      s.checkpoints[id] = recordTry(s.checkpoints[id], result, today);
      if (firstPass) s.stops[id] = today; // the postcard is earned now, whichever button comes next
      s.exam = null;
    });
    if (firstPass) sfx.stop();
    const missed = exam.missed.map((mid) => byId.get(mid)).filter(Boolean);
    const need = passMark(total);
    setChildren(stage,
      h('h1', { class: 'results-title' }, en(stop.city)),
      h('div', { class: 'score-hero' },
        en(`${exam.right} / ${total}`, { class: 'score-big', id: 'exam-score' }),
        result.passed ? starsRow(result.stars, { id: 'exam-stars' }) : null,
        result.passed
          ? th(firstPass ? 'ผ่านด่านแล้ว! ได้โปสการ์ดใบใหม่' : 'ผ่านด่านอีกครั้ง', { class: 'record-line', id: 'exam-pass' })
          : th(`ยังไม่ผ่าน ต้องได้ ${need} จาก ${total} ลองใหม่พรุ่งนี้`, { class: 'exam-fail', id: 'exam-fail' }),
      ),
      h('div', { class: 'results-actions' },
        firstPass ? h('a', { class: 'btn btn-primary btn-main', href: `#/postcard/${id}`, id: 'get-postcard' }, th('รับโปสการ์ด')) : null,
        h('a', { class: `btn ${firstPass ? 'btn-secondary' : 'btn-primary btn-main'}`, href: '#/', id: 'home-btn' }, th('กลับหน้าแรก'))),
      missed.length
        ? h('section', { class: 'leg-words', id: 'exam-missed' },
            h('h2', {}, th('คำที่ตอบผิด')),
            h('ul', {}, missed.map((w) => wordItem(w))))
        : null,
    );
    window.scrollTo(0, 0);
  }

  function onKey(e) {
    if (destroyed || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (!cur) return;
    if (e.key === 'Enter' && cur.answered) { e.preventDefault(); advance(); }
    else if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && cur.answered) { e.preventDefault(); cur.view.replay(); }
  }
  document.addEventListener('keydown', onKey);
  app.hooks = { item: () => cur?.item ?? null, question: () => cur?.q ?? null };

  if (resumable()) show();
  else intro();
  return {
    destroy() {
      destroyed = true;
      document.removeEventListener('keydown', onKey);
      app.hooks = null;
    },
  };
}
