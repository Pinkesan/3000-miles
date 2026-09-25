// #/results: summary of the last leg (DESIGN §7). The checkpoint button comes in Step 9.
import { h, setChildren, th, en, toast } from '../ui.js';
import { fillTank, newlyReached, reachedStops } from '../progress.js';
import { icons } from '../icons.js';
import { odometer } from '../components/odometer.js';
import { newLeft } from '../plan.js';
import { arcadeOpen } from '../arcade.js';
import { gradedToday } from '../srs.js';
import { legSummary, tankText, tankFill, levelTip } from '../summary.js';
import * as sfx from '../sfx.js';

// Reaching a stop unlocks its postcard. Step 9 puts a checkpoint exam here instead: change only this.
// Returns the stops to show as new: those crossed by this leg (start, end] plus any older ones
// that were never unlocked (saves from before Step 8).
function unlockReached(app, endMiles, startMiles) {
  const { store, route } = app;
  const today = app.today();
  const fresh = newlyReached(route, endMiles, store.state.stops);
  const shown = new Set(reachedStops(route, startMiles, endMiles).map((s) => s.id));
  if (fresh.length) {
    store.update((s) => { for (const st of fresh) s.stops[st.id] = today; });
    sfx.stop();
    fresh.forEach((s) => shown.add(s.id));
  }
  return route.stops.filter((s) => shown.has(s.id));
}

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
      odo.set(sum.endMiles);
      sfx.mile();
    }, 250);
  }

  // The tank is full for the first time today: the streak grows (DESIGN §6).
  if (plan && tankFill(plan) >= 1 && store.state.streak.last !== today) {
    store.update((s) => { s.streak = fillTank(s.streak, today); });
    toast('เติมน้ำมันเต็มถังแล้ว วันนี้ขับครบ', 'ok');
  }
  const stops = unlockReached(app, sum.endMiles, sum.startMiles);

  // What can still be driven today? After the plan: one ขับเพิ่ม leg (DESIGN §5).
  const wordsLeft = !!plan && newLeft(plan, cards, app.order);
  const planDone = !!plan && plan.done >= plan.goal;
  const reviewsLeft = !!plan && plan.due.some((id) => cards[id] && !gradedToday(cards[id], today));
  const canContinue = !planDone && (reviewsLeft || (plan.taught + plan.known < plan.newTarget && wordsLeft));
  const canExtra = planDone && wordsLeft;

  const canRush = !canContinue && !canExtra && arcadeOpen(cards, plan);
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
    stops.map((s) =>
      h('a', { class: 'stop-reached', href: `#/postcard/${s.id}`, id: `stop-${s.id}` },
        h('span', { class: 'stop-reached-t' }, th('ถึง '), en(s.city), th(' แล้ว! ได้โปสการ์ดใบใหม่')),
        h('span', { class: 'btn btn-primary' }, th('ดูโปสการ์ด')))),
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
      canRush ? h('a', { class: 'btn btn-primary btn-main', href: '#/arcade', id: 'rush-btn', lang: 'en' }, 'Highway Rush') : null,
      h('a', { class: `btn ${canContinue || canExtra || canRush ? 'btn-secondary' : 'btn-primary btn-main'}`, href: '#/', id: 'home-btn' }, th('กลับหน้าแรก')),
    ),
    words.length
      ? h('section', { class: 'leg-words' },
          h('h2', {}, th('คำในช่วงนี้')),
          h('ul', {}, words.map((w) => h('li', {}, en(w.w, { class: 'lw-w' }), th(w.th, { class: 'lw-th muted' })))))
      : null,
  );
  return { destroy() { clearTimeout(timer); } };
}
