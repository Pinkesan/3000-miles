// #/drive: one leg of the trip (DESIGN §4, §5, §7). Every answer is saved at once.
import { h, setChildren, th, en, confirmBox } from '../ui.js';
import { icons } from '../icons.js';
import { makeRng } from '../rng.js';
import { makeQuestion, isCorrect } from '../quiz.js';
import { buildLeg, legCurrent, legProgress, legReduce, recordAnswer } from '../plan.js';
import { countMiles } from '../srs.js';
import { scoreAnswer, comboMultiplier, legStars, updateRecords } from '../score.js';
import { queueIds } from '../summary.js';
import * as sfx from '../sfx.js';
import { wordCard } from '../components/wordcard.js';
import { canListen } from '../speech.js';
import { questionView, advancesAlone } from '../components/question.js';

const STAGE_TAG = { probe: 'คำใหม่ รู้จักไหม', confirm: 'เช็กว่ารู้จริง', reask: 'ลองอีกครั้ง' };
const firstForm = (w) => w.w.split(', ')[0];

export function render(root, app) {
  const { store, byId } = app;
  const today = app.today();
  let destroyed = false;
  let exiting = false;
  let timer = 0;
  let plusTimer = 0;
  let cur = null;

  // a saved leg without v: 2 comes from an older version: drop it (its answers are saved already)
  let leg = store.state.leg?.day === today && store.state.leg.v === 2 ? store.state.leg : null;
  if (!leg && store.state.leg) store.update((s) => { s.leg = null; });
  if (!leg) {
    const plan = app.ensurePlan();
    const built = buildLeg({
      plan, cards: store.state.cards, byId, order: app.order, today, extra: plan.done >= plan.goal,
      rnd: app.rnd(`${today}:leg${plan.legs}`), caps: { canListen: app.hasVoice(), canSay: app.settings.sayMode && canListen() },
    });
    if (built.leg.queue.length) {
      leg = { ...built.leg, ids: queueIds(built.leg.queue) };
      store.update((s) => { s.days[today] = built.plan; s.leg = leg; });
    }
  }
  if (!leg) {
    setChildren(
      root,
      h('p', { class: 'empty-note' }, th('ตอนนี้ยังไม่มีคำให้ขับ พรุ่งนี้มาขับต่อกันนะ')),
      h('a', { class: 'btn btn-primary', href: '#/' }, th('กลับหน้าแรก')),
    );
    return null;
  }
  if (!leg.ids) leg = { ...leg, ids: queueIds(leg.queue) };

  // top bar
  const lane = h('div', { class: 'lane', 'aria-hidden': 'true' }, h('span', { class: 'lane-car', html: icons.car }));
  const count = h('span', { class: 'lane-count', lang: 'en' });
  const scoreNum = en('0', { class: 'leg-score' });
  const scorePlus = en('', { class: 'score-plus', hidden: true });
  const comboChip = h('span', { class: 'combo-chip', hidden: true });
  const info = h('div', { class: 'lane-info' }, h('span', { class: 'leg-score-wrap' }, scoreNum, scorePlus), comboChip, count);
  const chipNum = en('', { class: 'chip-num' });
  const plus = th('+1 ไมล์', { class: 'chip-plus', hidden: true });
  const bar = h('header', { class: 'drive-bar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ออกจากช่วงนี้', title: 'ออกจากช่วงนี้', html: icons.x, onclick: exit }),
    h('div', { class: 'lane-wrap' }, lane, info),
    h('span', { class: 'mile-chip' }, chipNum, en(' mi'), plus),
  );
  const stage = h('div', { class: 'stage' });
  setChildren(root, bar, stage);

  function updateBar() {
    const total = leg.done + leg.queue.length;
    lane.style.setProperty('--p', String(legProgress(leg)));
    count.textContent = `${leg.done} / ${total}`;
    chipNum.textContent = String(countMiles(store.state.cards));
    const sc = leg.score ?? { score: 0, combo: 0, bestCombo: 0 };
    scoreNum.textContent = sc.score.toLocaleString('en-US');
    comboChip.hidden = sc.combo < 3;
    if (sc.combo >= 3) {
      const m = comboMultiplier(sc.combo);
      setChildren(comboChip, th(`ติดกัน ${sc.combo}`), m > 1 ? h('b', {}, ` ×${m}`) : null);
    }
  }

  async function exit() {
    if (exiting) return;
    exiting = true;
    const ok = await confirmBox({ title: 'ออกจากช่วงนี้?', body: 'คำที่ตอบแล้วบันทึกไว้แล้ว', ok: 'ออก', cancel: 'อยู่ต่อ' });
    exiting = false;
    if (ok && !destroyed) location.hash = '#/';
  }

  function finish() {
    store.update((s) => {
      const sc = leg.score ?? { score: 0, combo: 0, bestCombo: 0 };
      const rec = updateRecords(s.records, { combo: sc.bestCombo, dayScore: s.days[today]?.score ?? 0, today });
      s.records = rec.records;
      s.lastLeg = {
        day: today, stats: leg.stats, startMiles: leg.startMiles, endMiles: countMiles(s.cards), ids: leg.ids,
        score: sc.score, stars: legStars(leg.stats), bestCombo: sc.bestCombo, newCombo: rec.newCombo, newDay: rec.newDay,
      };
      s.leg = null;
    });
    location.hash = '#/results';
  }

  function show() {
    if (destroyed) return;
    clearTimeout(timer);
    cur?.view?.destroy?.();
    const item = legCurrent(leg);
    if (!item) return finish();
    const word = byId.get(item.id);
    if (!word) {
      leg = { ...leg, queue: leg.queue.slice(1) };
      store.update((s) => { s.leg = leg; });
      return show();
    }
    cur = { item, word, q: null, view: null, answered: false, advanced: false, t0: performance.now() };
    updateBar();
    window.scrollTo(0, 0);
    if (item.kind === 'meet') showMeet(word);
    else showQuestion(item, word);
  }

  function showMeet(word) {
    const meet = () => {
      leg = legReduce(leg, { type: 'meet' });
      store.update((s) => { s.leg = leg; });
      show();
    };
    setChildren(stage,
      h('p', { class: 'stage-tag' }, th('คำใหม่')),
      wordCard(app, word, { onLearned: meet }),
    );
    if (app.settings.autoplay) app.say(firstForm(word));
  }

  function showQuestion(item, word) {
    const q = makeQuestion(word, item.type, app.words, makeRng(`${today}:${item.key}`), { hint: item.hint ?? 'full' });
    cur.q = q;
    cur.view = questionView(app, q, {
      tag: STAGE_TAG[item.kind] ?? 'คำถาม',
      kind: item.kind,
      canSkip: item.kind === 'probe',
      speedBar: true,
      cheer: leg.done,
      onAnswer: answer,
      onSkip: skip,
      onNext: advance,
    });
    setChildren(stage, cur.view.el);
    cur.view.start();
  }

  function replay() {
    if (!cur) return;
    if (cur.view) cur.view.replay();
    else app.say(firstForm(cur.word));
  }

  function answer(response) {
    if (!cur || cur.answered || !cur.q) return;
    cur.answered = true;
    const { item, q } = cur;
    const correct = isCorrect(q, response);
    const res = recordAnswer({ cards: store.state.cards, plan: store.state.days[today], leg, today, item, correct });
    const before = leg.score ?? { score: 0, combo: 0, bestCombo: 0 };
    const sc = scoreAnswer(before, { type: item.type, kind: item.kind, correct, ms: performance.now() - cur.t0 });
    leg = { ...legReduce(res.leg, { type: 'answer', correct }), score: { score: sc.score, combo: sc.combo, bestCombo: sc.bestCombo } };
    const plan = { ...res.plan, score: (res.plan.score ?? 0) + sc.points };
    store.update((s) => { s.cards = res.cards; s.days[today] = plan; s.leg = leg; });
    updateBar();
    if (sc.points > 0) {
      scorePlus.textContent = `+${sc.points}`;
      scorePlus.hidden = false;
      clearTimeout(plusTimer);
      plusTimer = setTimeout(() => { scorePlus.hidden = true; }, 900);
      if (comboMultiplier(sc.combo) > comboMultiplier(before.combo)) sfx.combo();
    }

    if (res.mile) {
      sfx.mile();
      chipNum.textContent = String(countMiles(store.state.cards));
      plus.hidden = false;
      setTimeout(() => { plus.hidden = true; }, 1800);
    } else if (correct) sfx.right();
    else sfx.wrong();

    cur.view.paint(correct, response);
    if (advancesAlone(q, correct)) timer = setTimeout(advance, 900);
  }

  // "ไม่รู้จักคำนี้": no answer is graded, the lesson comes at once
  function skip() {
    if (!cur || cur.answered || cur.item.kind !== 'probe') return;
    cur.answered = true;
    cur.advanced = true;
    leg = legReduce(leg, { type: 'skip' });
    store.update((s) => { s.leg = leg; });
    show();
  }

  function advance() {
    if (!cur || !cur.answered || cur.advanced) return;
    cur.advanced = true;
    show();
  }

  function onKey(e) {
    if (destroyed || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') { exit(); return; }
    if (!cur) return;
    if (e.key === 'Enter') {
      if (cur.answered) { e.preventDefault(); advance(); }
      return;
    }
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === ' ' && cur.view?.saying && !cur.answered) {
      if (!(e.target instanceof HTMLButtonElement)) { e.preventDefault(); cur.view.toggleMic(); }
    } else if (e.key === ' ') {
      const t = cur.q?.type;
      if (cur.item.kind === 'meet' || cur.answered || t === 'meaning' || t === 'listen') { e.preventDefault(); replay(); }
    } else if (e.key === '0' && cur.view?.skip && !cur.answered) skip();
    else if (/^[1-4]$/.test(e.key) && cur.q?.options && !cur.answered) {
      const o = cur.q.options[Number(e.key) - 1];
      if (o) answer(o.id);
    }
  }
  document.addEventListener('keydown', onKey);
  app.hooks = { item: () => cur?.item ?? null, question: () => cur?.q ?? null };

  show();
  return {
    destroy() {
      destroyed = true;
      cur?.view?.destroy?.();
      clearTimeout(timer);
      clearTimeout(plusTimer);
      document.removeEventListener('keydown', onKey);
      app.hooks = null;
    },
  };
}
