// #/ Home (DESIGN §7). The gauge, streak and route come in Step 8.
import { h, setChildren, th, en, thaiDay } from '../ui.js';
import { countMiles } from '../srs.js';
import { odometer } from '../components/odometer.js';
import { introOrder, newLeft } from '../plan.js';

const PER_DAY = [5, 10, 15, 20, 30];
const LEVELS = ['A1', 'A2', 'B1', 'B2'];

export function render(root, app) {
  const { store } = app;
  const today = app.today();
  const plan = store.state.days[today];
  const miles = countMiles(store.state.cards);
  const ready = app.words.length;

  const planLine = plan.dueTotal > plan.due.length
    ? `วันนี้: ทวนคำค้างให้หมดก่อน (ค้าง ${plan.dueTotal} คำ)`
    : `วันนี้: ทวน ${plan.due.length} คำ · คำใหม่ ${plan.newTarget} คำ`;

  const hasLeg = store.state.leg?.day === today;
  const planDone = plan.goal > 0 && plan.done >= plan.goal;
  // after the plan and its one ขับเพิ่ม leg, nothing is left to drive today (DESIGN §5)
  const dayDone = planDone && !hasLeg && !newLeft(plan, store.state.cards, app.order);
  const mainLabel = hasLeg ? 'ขับต่อ' : planDone ? 'ขับเพิ่ม' : plan.legs > 0 ? 'ขับต่อ' : 'ออกเดินทาง';

  const select = h('select', { id: 'new-per-day', class: 'select' },
    PER_DAY.map((n) => h('option', { value: n, selected: n === app.settings.newPerDay }, `${n} คำ`)),
  );
  select.addEventListener('change', () => {
    store.update((s) => {
      s.settings.newPerDay = Number(select.value);
      // Today's plan is a snapshot: only a day without any progress takes the new number.
      const p = s.days[today];
      if (p && p.legs === 0 && p.done === 0) {
        p.newTarget = p.dueTotal > p.due.length ? 0 : s.settings.newPerDay;
        p.goal = p.due.length + p.newTarget;
      }
    });
    render(root, app);
  });

  // temporary: Step 10 moves both selects to settings
  const levelSelect = h('select', { id: 'start-level', class: 'select' },
    LEVELS.map((lv) => h('option', { value: lv, selected: lv === app.settings.startLevel },
      `${lv} · ${app.words.filter((w) => w.lv === lv).length} คำ`)),
  );
  levelSelect.addEventListener('change', () => {
    store.update((s) => { s.settings.startLevel = levelSelect.value; });
    app.order = introOrder(app.words, levelSelect.value);
    render(root, app);
  });

  setChildren(
    root,
    h('header', { class: 'home-head' }, en('3000 Miles', { class: 'brand' }), th(thaiDay(today), { class: 'muted' })),
    odometer(miles),
    h('div', { class: 'sign', lang: 'en' },
      h('span', { class: 'sign-small' }, 'NEXT STOP'),
      h('span', { class: 'sign-big' }, 'Santa Monica'),
      h('span', { class: 'sign-small' }, '3,000 miles to go'),
    ),
    h('p', { class: 'today-line' }, th('จุดหมาย: Santa Monica · 3,000 ไมล์')),
    h('p', { class: 'today-line', id: 'plan-line' }, th(planLine)),
    (plan.score ?? 0) > 0 || store.state.records.day > 0
      ? h('p', { class: 'today-line', id: 'score-line' },
          th(`คะแนนวันนี้ ${(plan.score ?? 0).toLocaleString('en-US')} · สถิติ ${store.state.records.day.toLocaleString('en-US')}`))
      : null,
    dayDone
      ? h('div', { class: 'day-done', id: 'day-done', lang: 'th' },
          h('p', { class: 'day-done-title' }, 'วันนี้ขับครบแล้ว พรุ่งนี้มาขับต่อ'),
          h('p', { class: 'muted' }, 'เรียนทีละน้อยทุกวัน จำได้นานกว่าเรียนรวดเดียว'))
      : h('a', { class: 'btn btn-primary btn-main', href: '#/drive', id: 'main-btn' }, th(mainLabel)),
    ready < app.total
      ? h('p', { class: 'muted ready', id: 'ready' }, th('คำที่พร้อมเล่น '), en(`${ready}/${app.total}`))
      : null,
    h('label', { class: 'field', for: 'new-per-day' }, th('คำใหม่ต่อวัน'), select),
    h('label', { class: 'field', for: 'start-level' }, th('เริ่มจากระดับ'), levelSelect),
  );
}
