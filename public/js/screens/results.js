// #/results: summary of the last leg (DESIGN §7). The gauge and postcards come in Step 5.
import { h, setChildren, th, en } from '../ui.js';
import { odometer } from '../components/odometer.js';
import { DAY_NEW_CAP, nextNew } from '../plan.js';
import { gradedToday } from '../srs.js';
import { legSummary, tankText } from '../summary.js';
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

  // What can still be driven today?
  const newLeft = !!plan && plan.shown.length < DAY_NEW_CAP && nextNew(app.order, cards, plan, 1).length > 0;
  const planDone = !!plan && plan.done >= plan.goal;
  const reviewsLeft = !!plan && plan.due.some((id) => cards[id] && !gradedToday(cards[id], today));
  const canContinue = !planDone && (reviewsLeft || (plan.taught < plan.newTarget && newLeft));
  const canExtra = planDone && newLeft;

  const words = last.ids.map((id) => byId.get(id)).filter(Boolean);
  setChildren(
    root,
    h('h1', { class: 'results-title' }, th('จบช่วงนี้แล้ว')),
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
