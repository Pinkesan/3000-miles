// One question: prompt, options or input, feedback (DESIGN §4). Used by the drive now, and by
// checkpoints (Step 9) and Highway Rush (Step 12) later. The view never grades: it calls
// onAnswer(response) and the screen calls paint(correct, response) with the result.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { POS_LABEL, blankGap, plain, posList } from '../text.js';
import { synonymOf } from '../quiz.js';
import { exampleLine } from './wordcard.js';

const CHEERS = ['ถูกต้อง', 'เยี่ยม', 'แม่นมาก'];
export const AUTO_TYPES = ['meaning', 'word', 'listen'];
export const posLabel = (w) => POS_LABEL[w.p]?.en ?? posList(w);
const firstForm = (w) => w.w.split(', ')[0];
const isGap = (q) => q.type === 'gap' || q.type === 'gapType';
const speaker = (label, onclick) =>
  h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, html: icons.speaker, onclick });

// Right answers to these types move on by themselves after 900 ms.
export const advancesAlone = (q, correct) => correct && AUTO_TYPES.includes(q.type);

export function miniCard(app, word) {
  return h('div', { class: 'minicard' },
    h('div', { class: 'mc-head' },
      en(word.w, { class: 'mc-w' }), en(posLabel(word), { class: 'mc-pos' }), th(word.th, { class: 'mc-th' }),
      speaker('ฟังเสียงคำศัพท์', () => app.say(firstForm(word)))),
    word.ex ? h('p', { class: 'mc-ex' }, exampleLine(word.ex)) : null,
  );
}

// opts: { tag, kind ('probe' shows no mini card), canSkip, speedBar (drive only), onAnswer, onSkip, onNext, cheer }
export function questionView(app, q, { tag, kind, canSkip = false, speedBar = false, onAnswer, onSkip, onNext, cheer = 0 }) {
  const { word } = q;
  const typed = !q.options;
  const state = { replays: 0, retried: false, input: null, form: null, list: null };
  const pos = h('p', { class: 'q-pos', lang: 'en' }, posLabel(word));

  const prompt = [];
  if (q.type === 'meaning') prompt.push(en(word.w, { class: 'q-word' }), pos);
  else if (q.type === 'listen' || q.type === 'dictation') {
    prompt.push(h('button', { class: 'listen-btn', type: 'button', 'aria-label': 'ฟังเสียง', html: icons.speaker, onclick: replay }), pos);
    if (q.type === 'dictation') prompt.push(th(word.th, { class: 'q-th-muted' }));
  } else if (isGap(q)) {
    prompt.push(h('p', { class: 'q-sentence', lang: 'en' }, blankGap(word.ex)));
    if (word.exTh) prompt.push(th(word.exTh, { class: 'q-sentence-th' }));
  } else prompt.push(th(word.th, { class: 'q-th' }), pos);
  if (q.hint) {
    const label = q.hint.includes('…') ? `คำใบ้ ${q.hint}` : `${q.hint.replace(/ /g, '').length} ตัวอักษร`;
    prompt.push(h('p', { class: 'q-hint', lang: 'en', 'aria-label': label }, q.hint));
  }

  let control;
  if (typed) {
    state.input = h('input', {
      class: 'answer-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off',
      spellcheck: 'false', lang: 'en', enterkeyhint: 'done', 'aria-label': 'พิมพ์คำตอบ',
    });
    control = state.form = h('form', { class: 'answer-form', onsubmit: submit },
      state.input, h('button', { class: 'btn btn-primary', type: 'submit' }, th('ตรวจคำตอบ')));
  } else {
    const lang = q.type === 'word' || q.type === 'gap' ? 'en' : 'th';
    control = state.list = h('ol', { class: 'options' }, q.options.map((o, i) =>
      h('li', {}, h('button', { class: 'opt', type: 'button', dataset: { id: o.id }, onclick: () => onAnswer(o.id) },
        h('span', { class: 'opt-n', 'aria-hidden': 'true' }, i + 1),
        h('span', { class: 'opt-label', lang }, o.label)))));
  }
  const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const skip = canSkip
    ? h('button', { class: 'btn btn-secondary btn-skip', type: 'button', onclick: () => onSkip?.() }, th('ไม่รู้จักคำนี้'))
    : null;
  // the speed bonus only exists for multiple choice (DESIGN §6); the bar drains over 6 s
  const speed = speedBar && !typed ? h('div', { class: 'speed-bar', 'aria-hidden': 'true' }, h('i')) : null;
  const el = h('div', { class: 'question' },
    h('p', { class: 'stage-tag' }, th(tag)),
    h('div', { class: `prompt prompt-${q.type}` }, prompt), speed, control, skip, fb);

  function submit(e) {
    e.preventDefault();
    const value = state.input.value;
    if (state.input.disabled || !value.trim()) return;
    // a synonym is not graded: one more try (DESIGN §4)
    if (!state.retried && (q.type === 'spell' || q.type === 'gapType') && synonymOf(value, word, app.words)) {
      state.retried = true;
      state.input.value = '';
      setChildren(fb, h('p', { class: 'fb-retry' }, th('ความหมายใกล้เคียง แต่ยังไม่ใช่คำที่ต้องการ ลองอีกครั้ง')));
      state.input.focus({ preventScroll: true });
      return;
    }
    onAnswer(value);
  }

  // listen and dictation alternate slow / normal speed
  function replay() {
    if (q.type === 'listen' || q.type === 'dictation') {
      state.replays += 1;
      app.say(firstForm(word), { rate: state.replays % 2 ? 0.75 : undefined });
    } else app.say(firstForm(word));
  }

  // sound on show, and focus the input
  function start() {
    if (q.type === 'listen' || q.type === 'dictation') app.say(firstForm(word));
    else if (q.type === 'meaning' && app.settings.autoplay) app.say(firstForm(word));
    focus();
  }

  function focus() {
    state.input?.focus({ preventScroll: true });
  }

  function paint(correct, response) {
    let answerText;
    let answerLang = 'en';
    if (skip) skip.disabled = true;
    speed?.classList.add('speed-stop');
    if (q.options) {
      const right = q.options.find((o) => o.id === q.id);
      answerText = right.label;
      answerLang = q.type === 'word' || q.type === 'gap' ? 'en' : 'th';
      for (const btn of state.list.querySelectorAll('.opt')) {
        btn.disabled = true;
        const isRight = btn.dataset.id === q.id;
        if (isRight || btn.dataset.id === response) {
          btn.classList.add(isRight ? 'opt-right' : 'opt-wrong');
          btn.append(h('span', { class: 'opt-mark', html: isRight ? icons.check : icons.x }));
        }
      }
    } else {
      answerText = q.accept[0];
      state.input.disabled = true;
      state.input.classList.add(correct ? 'is-right' : 'is-wrong');
      state.form.querySelector('button').disabled = true;
    }

    const parts = [
      correct
        ? h('p', { class: 'fb-msg fb-right' }, h('span', { html: icons.check }), th(CHEERS[cheer % CHEERS.length]))
        : h('p', { class: 'fb-msg fb-wrong' }, h('span', { html: icons.x }), th('ยังไม่ใช่ คำตอบคือ '), h('b', { lang: answerLang }, answerText)),
    ];
    const probe = kind === 'probe';
    if (!correct && !probe) parts.push(miniCard(app, word));
    else if (isGap(q)) parts.push(h('p', { class: 'fb-sentence' }, exampleLine(word.ex)));
    else if (q.type === 'listen' || q.type === 'dictation') parts.push(en(word.w, { class: 'fb-word' }));
    if (!advancesAlone(q, correct)) {
      parts.push(h('button', { class: 'btn btn-primary btn-next', type: 'button', onclick: () => onNext?.() }, th(!correct && probe ? 'เรียนคำนี้' : 'ต่อไป')));
    }
    setChildren(fb, parts);

    if (isGap(q)) app.say(plain(word.ex));
    else if (!['meaning', 'listen', 'dictation'].includes(q.type)) app.say(firstForm(word));
    fb.querySelector('.btn-next')?.focus({ preventScroll: true });
  }

  return { el, paint, replay, start, focus, skip };
}
