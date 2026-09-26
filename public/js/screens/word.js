// #/word/<id>: everything about one word, and a way to report a wrong entry (DESIGN §7).
import { h, setChildren, th, en, toast } from '../ui.js';
import { icons } from '../icons.js';
import { status } from '../srs.js';
import { POS_LABEL } from '../text.js';
import { STATUS_TH, nextReviewText } from '../wordlist.js';
import { wordCard } from '../components/wordcard.js';
import { boxGauge } from '../components/wordrow.js';

const stat = (value, label) =>
  h('div', { class: 'stat' }, en(String(value), { class: 'stat-n' }), th(label, { class: 'stat-l' }));

export function render(root, app, { args }) {
  const word = app.byId.get(args[0]);
  if (!word) {
    location.replace('#/words');
    return null;
  }
  const { store } = app;
  const today = app.today();
  const card = store.state.cards[word.id];
  const st = status(card);
  const flag = store.state.flags[word.id];

  const back = h('a', { class: 'btn btn-quiet back', href: '#/words' }, h('span', { html: icons.back }), th('กลับ'));
  back.addEventListener('click', (e) => {
    if (history.length > 1) { e.preventDefault(); history.back(); } // keeps the list's filters
  });

  const pos = h('ul', { class: 'pos-list', id: 'pos-list' },
    word.pos.map(([code, lv]) =>
      h('li', {}, en(POS_LABEL[code]?.en ?? code, { class: 'pos' }), ' ', en(lv, { class: 'pos-lv' }), ' ', th(POS_LABEL[code]?.th ?? '', { class: 'muted' }))));

  const note = h('input', {
    class: 'search', id: 'flag-note', type: 'text', maxlength: 200, value: flag?.note ?? '', autocomplete: 'off',
    placeholder: 'บอกสั้นๆ ว่าผิดตรงไหน (ไม่ต้องก็ได้)', 'aria-label': 'หมายเหตุ',
  });
  const flagBtn = h('button', { class: 'btn btn-secondary', id: 'flag-btn', type: 'button' });
  const flagState = h('p', { class: 'muted', id: 'flag-state' });
  function paintFlag() {
    const on = !!store.state.flags[word.id];
    setChildren(flagBtn, th(on ? 'ยกเลิกการแจ้ง' : 'แจ้งข้อมูลผิด'));
    setChildren(flagState, th(on ? 'แจ้งไว้แล้ว จะไปแก้ในรอบปรับปรุงเนื้อหา' : 'ความหมายหรือประโยคตัวอย่างไม่ถูก? แจ้งไว้ได้'));
  }
  flagBtn.addEventListener('click', () => {
    const on = !!store.state.flags[word.id];
    store.update((s) => {
      if (on) delete s.flags[word.id];
      else s.flags[word.id] = { day: today, note: note.value.trim() };
    });
    toast(on ? 'ยกเลิกการแจ้งแล้ว' : 'บันทึกการแจ้งแล้ว', 'ok');
    paintFlag();
  });
  note.addEventListener('change', () => {
    if (!store.state.flags[word.id]) return;
    store.update((s) => { s.flags[word.id] = { day: s.flags[word.id].day, note: note.value.trim() }; });
  });
  paintFlag();

  setChildren(
    root,
    back,
    wordCard(app, word),
    h('section', { class: 'word-info' },
      pos,
      word.sense ? h('p', { class: 'muted', id: 'sense' }, th('ความหมายเฉพาะ: '), en(word.sense)) : null,
      h('div', { class: 'status-row', id: 'status-row' },
        th(STATUS_TH[st], { class: `status-tag st-${st}`, id: 'status-name' }),
        boxGauge(card?.b ?? 0, { big: true })),
      card
        ? h('div', { class: 'stats stats-3' },
            stat(card.n ?? 0, 'ตอบแล้ว'), stat(card.r ?? 0, 'ตอบถูก'), stat(card.l ?? 0, 'พลาดหลังจำได้'))
        : null,
      card
        ? h('p', { id: 'review-line' }, th(`ทวนครั้งถัดไป: ${nextReviewText(card, today)}`))
        : h('p', { class: 'muted', id: 'review-line' }, th('ยังไม่เริ่มเรียนคำนี้')),
      card?.m ? h('p', { id: 'mile-line' }, th('ไมล์ที่ '), en(card.m.toLocaleString('en-US'))) : null,
    ),
    h('section', { class: 'word-flag' }, flagState, note, flagBtn),
  );
  return { destroy() { app.stopSay(); } };
}
