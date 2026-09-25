// #/ Home (DESIGN §7). The gauge, streak and route come in Step 5.
import { h, setChildren, th, en, thaiDay } from '../ui.js';
import { countMiles } from '../srs.js';
import { odometer } from '../components/odometer.js';

const PER_DAY = [5, 10, 15, 20, 30];

export function render(root, app) {
  const { store } = app;
  const today = app.today();
  const plan = store.state.days[today];
  const miles = countMiles(store.state.cards);
  const ready = app.words.length;

  const planLine = plan.dueTotal > plan.due.length
    ? `วันนี้: ทวนคำค้างให้หมดก่อน (ค้าง ${plan.dueTotal} คำ)`
    : `วันนี้: ทวน ${plan.due.length} คำ · คำใหม่ ${plan.newTarget} คำ`;

  const hasLeg = !!store.state.leg;
  const planDone = plan.goal > 0 && plan.done >= plan.goal;
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
    h('a', { class: 'btn btn-primary btn-main', href: '#/drive', id: 'main-btn' }, th(mainLabel)),
    ready < app.total
      ? h('p', { class: 'muted ready', id: 'ready' }, th('คำที่พร้อมเล่น '), en(`${ready}/${app.total}`))
      : null,
    h('label', { class: 'field', for: 'new-per-day' }, th('คำใหม่ต่อวัน'), select),
  );
}
