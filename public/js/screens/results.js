// #/results: summary of the last leg (DESIGN §7). The gauge and postcards come in Step 8.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { odometer } from '../components/odometer.js';
import { newLeft } from '../plan.js';
import { gradedToday } from '../srs.js';
import { legSummary, tankText, levelTip } from '../summary.js';
import * as sfx from '../sfx.js';

const stat = (value, label) =>
  h('div', { class: 'stat' }, en(String(value), { class: 'stat-n' }), th(label, { class: 'stat-l' }));

export function render(root, app) {
  const { store, byId } = app;
  const last = store.state.lastLeg;
  if (!last) {
    location.replace('#/');
    return null;
  }
  const today = app.today();
  const { cards } = store.state;
  const plan = store.state.days[today];
  const sum = legSummary(last);

  const odo = odometer(sum.startMiles);
  let timer = 0;
  if (sum.gained > 0) {
    // roll the wheels to the new total after the first paint
    timer = setTimeout(() => {
      const digits = String(sum.endMiles).padStart(4, '0').slice(-4);
      odo.querySelectorAll('.wheel').forEach((w, i) => w.style.setProperty('--d', digits[i]));
      odo.setAttribute('aria-label', `${sum.endMiles} ไมล์`);
      sfx.mile();
    }, 250);
  }

  // What can still be driven today? After the plan: one ขับเพิ่ม leg (DESIGN §5).
  const wordsLeft = !!plan && newLeft(plan, cards, app.order);
  const planDone = !!plan && plan.done >= plan.goal;
  const reviewsLeft = !!plan && plan.due.some((id) => cards[id] && !gradedToday(cards[id], today));
  const canContinue = !planDone && (reviewsLeft || (plan.taught + plan.known < plan.newTarget && wordsLeft));
  const canExtra = planDone && wordsLeft;

  const tip = plan ? levelTip(plan, app.settings.startLevel) : null;
  const words = last.ids.map((id) => byId.get(id)).filter(Boolean);
  setChildren(
    root,
    h('h1', { class: 'results-title' }, th('จบช่วงนี้แล้ว')),
    last.stars
      ? h('div', { class: 'score-hero' },
          en((last.score ?? 0).toLocaleString('en-US'), { class: 'score-big', id: 'leg-score' }),
          th('คะแนน', { class: 'stat-l' }),
          h('div', { class: 'stars', id: 'leg-stars', role: 'img', 'aria-label': `${last.stars} ดาว` },
            [1, 2, 3].map((n) => h('span', { class: n > last.stars ? 'star-empty' : '', html: n > last.stars ? icons.starEmpty : icons.star }))),
          (last.bestCombo ?? 0) >= 2 ? th(`ติดกันสูงสุด ${last.bestCombo}`, { class: 'stat-l' }) : null,
          last.newCombo ? th(`สถิติใหม่: ติดกัน ${last.bestCombo} ครั้ง`, { class: 'record-line' }) : null,
          last.newDay ? th(`สถิติใหม่: คะแนนวันนี้ ${(store.state.days[today]?.score ?? 0).toLocaleString('en-US')}`, { class: 'record-line' }) : null,
        )
      : null,
    odo,
    sum.gained > 0
      ? h('p', { class: 'gain', id: 'gain' }, en(`+${sum.gained}`), th(' ไมล์'))
      : h('p', { class: 'gain gain-none', id: 'gain' }, th('ช่วงนี้ยังไม่ได้ไมล์เพิ่ม ไมล์ได้เมื่อจำคำนั้นได้ในสามวันต่างกัน')),
    h('div', { class: 'stats' },
      stat(sum.pct == null ? '-' : `${sum.pct}%`, 'ตอบถูก'),
      stat(sum.taught, 'สอนคำใหม่'),
      stat(sum.known, 'รู้อยู่แล้ว'),
      stat(sum.reviewed, 'ทวน'),
    ),
    plan ? h('p', { class: 'today-line', id: 'tank-line' }, th(tankText(plan))) : null,
    tip
      ? h('p', { class: 'today-line level-tip', id: 'level-tip' },
          th(`คำใหม่วันนี้รู้อยู่แล้ว ${tip.known} จาก ${tip.total} คำ ลองเริ่มจากระดับที่สูงขึ้น `),
          h('a', { href: '#/' }, th('เปลี่ยนได้ที่หน้าแรก')))
      : null,
    h('div', { class: 'results-actions' },
      canContinue ? h('a', { class: 'btn btn-primary btn-main', href: '#/drive', id: 'again-btn' }, th('ขับต่อ')) : null,
      canExtra ? h('a', { class: 'btn btn-primary btn-main', href: '#/drive', id: 'again-btn' }, th('ขับเพิ่ม')) : null,
      h('a', { class: `btn ${canContinue || canExtra ? 'btn-secondary' : 'btn-primary btn-main'}`, href: '#/', id: 'home-btn' }, th('กลับหน้าแรก')),
    ),
    words.length
      ? h('section', { class: 'leg-words' },
          h('h2', {}, th('คำในช่วงนี้')),
          h('ul', {}, words.map((w) => h('li', {}, en(w.w, { class: 'lw-w' }), th(w.th, { class: 'lw-th muted' })))))
      : null,
  );
  return { destroy() { clearTimeout(timer); } };
}
