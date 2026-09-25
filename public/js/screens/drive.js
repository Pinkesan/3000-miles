// #/drive: one leg of the trip (DESIGN §4, §5, §7). Every answer is saved at once.
import { h, setChildren, th, en, confirmBox } from '../ui.js';
import { icons } from '../icons.js';
import { makeRng } from '../rng.js';
import { POS_LABEL, blankGap, plain, posList } from '../text.js';
import { makeQuestion, isCorrect } from '../quiz.js';
import { buildLeg, legCurrent, legProgress, legReduce, recordAnswer, extraNewWord } from '../plan.js';
import { countMiles } from '../srs.js';
import { queueIds } from '../summary.js';
import * as sfx from '../sfx.js';
import { wordCard, exampleLine } from '../components/wordcard.js';

const CHEERS = ['ถูกต้อง', 'เยี่ยม', 'แม่นมาก'];
const AUTO_TYPES = ['meaning', 'word', 'listen'];
const posLabel = (w) => POS_LABEL[w.p]?.en ?? posList(w);
const firstForm = (w) => w.w.split(', ')[0];
const speaker = (label, onclick) =>
  h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, html: icons.speaker, onclick });

export function render(root, app) {
  const { store, byId } = app;
  const today = app.today();
  let destroyed = false;
  let exiting = false;
  let timer = 0;
  let cur = null;

  let leg = store.state.leg?.day === today ? store.state.leg : null;
  if (!leg && store.state.leg) store.update((s) => { s.leg = null; });
  if (!leg) {
    const plan = app.ensurePlan();
    const built = buildLeg({
      plan, cards: store.state.cards, byId, order: app.order, today, extra: plan.done >= plan.goal,
      rnd: app.rnd(`${today}:leg${plan.legs}`), caps: { canListen: app.hasVoice() },
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
  const chipNum = en('', { class: 'chip-num' });
  const plus = th('+1 ไมล์', { class: 'chip-plus', hidden: true });
  const bar = h('header', { class: 'drive-bar' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'ออกจากช่วงนี้', title: 'ออกจากช่วงนี้', html: icons.x, onclick: exit }),
    h('div', { class: 'lane-wrap' }, lane, count),
    h('span', { class: 'mile-chip' }, chipNum, en(' mi'), plus),
  );
  const stage = h('div', { class: 'stage' });
  setChildren(root, bar, stage);

  function updateBar() {
    const total = leg.done + leg.queue.length;
    lane.style.setProperty('--p', String(legProgress(leg)));
    count.textContent = `${leg.done} / ${total}`;
    chipNum.textContent = String(countMiles(store.state.cards));
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
      s.lastLeg = { day: today, stats: leg.stats, startMiles: leg.startMiles, endMiles: countMiles(s.cards), ids: leg.ids };
      s.leg = null;
    });
    location.hash = '#/results';
  }

  function show() {
    if (destroyed) return;
    clearTimeout(timer);
    const item = legCurrent(leg);
    if (!item) return finish();
    const word = byId.get(item.id);
    if (!word) {
      leg = { ...leg, queue: leg.queue.slice(1) };
      store.update((s) => { s.leg = leg; });
      return show();
    }
    cur = { item, word, q: null, answered: false, advanced: false, replays: 0 };
    updateBar();
    window.scrollTo(0, 0);
    if (item.kind === 'meet') showMeet(word);
    else showQuestion(item, word);
  }

  function showMeet(word) {
    const meet = (know) => {
      leg = legReduce(leg, { type: 'meet', know });
      store.update((s) => { s.leg = leg; });
      show();
    };
    setChildren(stage,
      h('p', { class: 'stage-tag' }, th('คำใหม่')),
      wordCard(app, word, { onLearned: () => meet(false), onKnow: () => meet(true) }),
    );
    if (app.settings.autoplay) app.say(firstForm(word));
  }

  function showQuestion(item, word) {
    const q = makeQuestion(word, item.type, app.words, makeRng(`${today}:${item.key}`));
    cur.q = q;
    const pos = h('p', { class: 'q-pos', lang: 'en' }, posLabel(word));
    const typed = !q.options;
    const hasGap = q.type === 'gap' || q.type === 'gapType';
    const prompt = [];
    if (q.type === 'meaning') prompt.push(en(word.w, { class: 'q-word' }), pos);
    else if (q.type === 'listen') {
      prompt.push(h('button', { class: 'listen-btn', type: 'button', 'aria-label': 'ฟังเสียง', html: icons.speaker, onclick: replay }), pos);
    } else if (hasGap) {
      prompt.push(h('p', { class: 'q-sentence', lang: 'en' }, blankGap(word.ex)));
      if (word.exTh) prompt.push(th(word.exTh, { class: 'q-sentence-th' }));
    } else prompt.push(th(word.th, { class: 'q-th' }), pos);
    if (typed) prompt.push(h('p', { class: 'q-hint', lang: 'en', 'aria-label': `${q.hint.replace(/ /g, '').length} ตัวอักษร` }, q.hint));

    let control;
    if (typed) {
      cur.input = h('input', {
        class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off',
        spellcheck: 'false', lang: 'en', enterkeyhint: 'done', 'aria-label': 'พิมพ์คำตอบ',
      });
      control = cur.form = h('form', {
        class: 'answer-form',
        onsubmit: (e) => { e.preventDefault(); if (!cur.answered && cur.input.value.trim()) answer(cur.input.value); },
      }, cur.input, h('button', { class: 'btn btn-primary', type: 'submit' }, th('ตรวจคำตอบ')));
    } else {
      const lang = q.type === 'word' || q.type === 'gap' ? 'en' : 'th';
      control = cur.list = h('ol', { class: 'options' }, q.options.map((o, i) =>
        h('li', {}, h('button', { class: 'opt', type: 'button', dataset: { id: o.id }, onclick: () => answer(o.id) },
          h('span', { class: 'opt-n', 'aria-hidden': 'true' }, i + 1),
          h('span', { class: 'opt-label', lang }, o.label)))));
    }
    cur.fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    setChildren(stage,
      h('p', { class: 'stage-tag' }, th(item.kind === 'reask' ? 'ลองอีกครั้ง' : item.kind === 'know' ? 'เช็กว่ารู้จักจริง' : 'คำถาม')),
      h('div', { class: `prompt prompt-${q.type}` }, prompt), control, cur.fb);

    if (q.type === 'listen') app.say(firstForm(word));
    else if (q.type === 'meaning' && app.settings.autoplay) app.say(firstForm(word));
    if (typed) cur.input.focus({ preventScroll: true });
  }

  function replay() {
    if (!cur) return;
    if (cur.q?.type === 'listen') {
      cur.replays += 1;
      app.say(firstForm(cur.word), { rate: cur.replays % 2 ? 0.75 : undefined });
    } else app.say(firstForm(cur.word));
  }

  function answer(response) {
    if (!cur || cur.answered || !cur.q) return;
    cur.answered = true;
    const { item, q } = cur;
    const correct = isCorrect(q, response);
    const res = recordAnswer({ cards: store.state.cards, plan: store.state.days[today], leg, today, item, correct });
    let nextLeg = legReduce(res.leg, { type: 'answer', correct });
    let nextPlan = res.plan;
    if (item.kind === 'know' && correct) {
      const more = extraNewWord({
        plan: nextPlan, cards: res.cards, byId, order: app.order, leg: nextLeg,
        rnd: app.rnd(`${today}:extra${nextPlan.shown.length}`),
      });
      if (more) {
        nextPlan = more.plan;
        nextLeg = { ...more.leg, ids: [...new Set([...nextLeg.ids, ...more.leg.queue.map((x) => x.id)])] };
      }
    }
    leg = nextLeg;
    store.update((s) => { s.cards = res.cards; s.days[today] = nextPlan; s.leg = leg; });

    if (res.mile) {
      sfx.mile();
      chipNum.textContent = String(countMiles(store.state.cards));
      plus.hidden = false;
      setTimeout(() => { plus.hidden = true; }, 1800);
    } else if (correct) sfx.right();
    else sfx.wrong();

    paintFeedback(correct, response);
    if (correct && AUTO_TYPES.includes(q.type)) timer = setTimeout(advance, 900);
  }

  function paintFeedback(correct, response) {
    const { q, word } = cur;
    const isGap = q.type === 'gap' || q.type === 'gapType';
    let answerText;
    let answerLang = 'en';
    if (q.options) {
      const right = q.options.find((o) => o.id === q.id);
      answerText = right.label;
      answerLang = q.type === 'word' || q.type === 'gap' ? 'en' : 'th';
      for (const btn of cur.list.querySelectorAll('.opt')) {
        btn.disabled = true;
        const isRight = btn.dataset.id === q.id;
        if (isRight || btn.dataset.id === response) {
          btn.classList.add(isRight ? 'opt-right' : 'opt-wrong');
          btn.append(h('span', { class: 'opt-mark', html: isRight ? icons.check : icons.x }));
        }
      }
    } else {
      answerText = q.accept[0];
      cur.input.disabled = true;
      cur.input.classList.add(correct ? 'is-right' : 'is-wrong');
      cur.form.querySelector('button').disabled = true;
    }

    const parts = [
      correct
        ? h('p', { class: 'fb-msg fb-right' }, h('span', { html: icons.check }), th(CHEERS[leg.done % CHEERS.length]))
        : h('p', { class: 'fb-msg fb-wrong' }, h('span', { html: icons.x }), th('ยังไม่ใช่ คำตอบคือ '), h('b', { lang: answerLang }, answerText)),
    ];
    if (!correct) parts.push(miniCard(word));
    else if (isGap) parts.push(h('p', { class: 'fb-sentence' }, exampleLine(word.ex)));
    else if (q.type === 'listen') parts.push(en(word.w, { class: 'fb-word' }));
    if (!(correct && AUTO_TYPES.includes(q.type))) {
      parts.push(h('button', { class: 'btn btn-primary btn-next', type: 'button', onclick: advance }, th('ต่อไป')));
    }
    setChildren(cur.fb, parts);

    if (isGap) app.say(plain(word.ex));
    else if (!['meaning', 'listen'].includes(q.type)) app.say(firstForm(word));
    cur.fb.querySelector('.btn-next')?.focus({ preventScroll: true });
  }

  function miniCard(word) {
    return h('div', { class: 'minicard' },
      h('div', { class: 'mc-head' },
        en(word.w, { class: 'mc-w' }), en(posLabel(word), { class: 'mc-pos' }), th(word.th, { class: 'mc-th' }),
        speaker('ฟังเสียงคำศัพท์', () => app.say(firstForm(word)))),
      word.ex ? h('p', { class: 'mc-ex' }, exampleLine(word.ex)) : null,
    );
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
    if (e.key === ' ') {
      const t = cur.q?.type;
      if (cur.item.kind === 'meet' || cur.answered || t === 'meaning' || t === 'listen') { e.preventDefault(); replay(); }
    } else if (/^[1-4]$/.test(e.key) && cur.q?.options && !cur.answered) {
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
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      app.hooks = null;
    },
  };
}
