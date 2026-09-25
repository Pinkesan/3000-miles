// The Meet card (DESIGN §4): a word to learn. Used by #/card/<id> now and by the drive in Step 4.
import { h, th } from '../ui.js';
import { icons } from '../icons.js';
import { POS_LABEL, parseGap, plain, posList } from '../text.js';

const speakerButton = (label, onclick) =>
  h('button', { class: 'icon-btn', type: 'button', 'aria-label': label, title: label, html: icons.speaker, onclick });

// The example sentence with the bracketed part highlighted.
export function exampleLine(ex) {
  const { before, target, after } = parseGap(ex);
  return h('span', { lang: 'en' }, before, h('mark', {}, target), after);
}

// opts: { onKnow, onLearned } add the two buttons; without them it is a preview.
export function wordCard(app, word, { onLearned, onKnow } = {}) {
  const sayWord = () => app.say(word.w.split(', ')[0]);
  const senses = (word.other || []).map(([p, t]) =>
    h('li', {}, h('span', { class: 'pos' }, POS_LABEL[p]?.en ?? p), ' ', th(t)),
  );
  return h(
    'article',
    { class: 'wordcard', dataset: { id: word.id } },
    h('div', { class: 'wc-top' },
      word.e ? h('span', { class: 'wc-emoji', 'aria-hidden': 'true' }, word.e) : null,
      h('div', { class: 'wc-word' },
        h('h1', { class: 'wc-w', lang: 'en' }, word.w),
        speakerButton('ฟังเสียงคำศัพท์', sayWord),
      ),
    ),
    h('p', { class: 'wc-pos' }, posList(word), ' · ', word.lv),
    h('p', { class: 'wc-th' }, th(word.th)),
    senses.length ? h('ul', { class: 'wc-other' }, senses) : null,
    word.ex
      ? h('div', { class: 'wc-ex' },
          h('div', { class: 'wc-ex-row' },
            h('p', { class: 'wc-ex-en' }, exampleLine(word.ex)),
            speakerButton('ฟังประโยคตัวอย่าง', () => app.say(plain(word.ex))),
          ),
          word.exTh ? h('p', { class: 'wc-ex-th' }, th(word.exTh)) : null,
        )
      : null,
    onLearned || onKnow
      ? h('div', { class: 'wc-actions' },
          onLearned ? h('button', { class: 'btn btn-primary', type: 'button', onclick: onLearned }, th('จำแล้ว')) : null,
          onKnow ? h('button', { class: 'btn btn-secondary', type: 'button', onclick: onKnow }, th('รู้จักคำนี้แล้ว')) : null,
        )
      : null,
  );
}
