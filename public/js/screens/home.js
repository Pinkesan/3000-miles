// #/ Home (DESIGN §7).
import { h, setChildren, th, en, thaiDay } from '../ui.js';
import { icons } from '../icons.js';
import { countMiles, countFlat } from '../srs.js';
import { nextStop } from '../progress.js';
import { openCheckpoint, canTry } from '../checkpoint.js';
import { tankFill, tankText } from '../summary.js';
import { odometer } from '../components/odometer.js';
import { gauge } from '../components/gauge.js';
import { newLeft } from '../plan.js';
import { arcadeOpen, arcadeUnlocked } from '../arcade.js';

// Rests are small P (parking) signs, at most 2.
const restSigns = (n) => n > 0
  ? h('span', { class: 'rests', id: 'rests', role: 'img', 'aria-label': `จุดพัก ${n}` },
      Array.from({ length: n }, () => h('span', { class: 'p-sign', lang: 'en' }, 'P')))
  : null;

export function render(root, app) {
  const { store } = app;
  const today = app.today();
  const plan = store.state.days[today];
  const miles = countMiles(store.state.cards);
  const ready = app.words.length;

  const planLine = plan.dueTotal > plan.due.length
    ? `วันนี้: ทวนคำค้างให้หมดก่อน (ค้าง ${plan.dueTotal} คำ)`
    : `วันนี้: ทวน ${plan.due.length} คำ · คำใหม่ ${plan.newTarget} คำ`;

  const next = nextStop(app.route, miles);
  const gate = openCheckpoint(app.route, miles, store.state.checkpoints, store.state.stops);
  const gateTried = gate && !canTry(store.state.checkpoints[gate.id], today);
  const { streak } = store.state;
  const flat = countFlat(store.state.cards);
  const hasLeg = store.state.leg?.day === today;
  const planDone = plan.goal > 0 && plan.done >= plan.goal;
  // after the plan and its one ขับเพิ่ม leg, nothing is left to drive today (DESIGN §5)
  const dayDone = planDone && !hasLeg && !newLeft(plan, store.state.cards, app.order);
  const rushOpen = arcadeOpen(store.state.cards, plan);
  const rushUnlocked = arcadeUnlocked(store.state.cards);
  const rushBest = store.state.arcade.best;
  const mainLabel = hasLeg ? 'ขับต่อ' : planDone ? 'ขับเพิ่ม' : plan.legs > 0 ? 'ขับต่อ' : 'ออกเดินทาง';

  setChildren(
    root,
    h('header', { class: 'home-head' }, en('3000 Miles', { class: 'brand' }), th(thaiDay(today), { class: 'muted' })),
    odometer(miles),
    gate
      ? h('div', { class: 'sign sign-checkpoint', id: 'next-stop' },
          h('span', { class: 'sign-small', lang: 'en' }, 'CHECKPOINT'),
          h('span', { class: 'sign-big', lang: 'en' }, gate.city),
          th('สอบผ่านเพื่อไปต่อ', { class: 'sign-small' }))
      : next
      ? h('div', { class: 'sign', lang: 'en', id: 'next-stop' },
          h('span', { class: 'sign-small' }, 'NEXT STOP'),
          h('span', { class: 'sign-big' }, next.city),
          h('span', { class: 'sign-small' }, `${(next.at - miles).toLocaleString('en-US')} miles to go`),
        )
      : h('div', { class: 'sign', id: 'next-stop' }, th('ถึงซานตาโมนิกาแล้ว!', { class: 'sign-big' })),
    h('div', { class: 'tank-row' },
      gauge(tankFill(plan)),
      h('div', { class: 'tank-text' },
        h('p', { class: 'today-line', id: 'plan-line' }, th(planLine)),
        h('p', { class: 'muted', id: 'tank-line' }, th(tankText(plan))),
      ),
    ),
    h('p', { class: 'today-line streak-line', id: 'streak-line' },
      th(`ขับต่อเนื่อง ${streak.cur} วัน`),
      streak.best > 0 ? th(` · สูงสุด ${streak.best} วัน`, { class: 'muted' }) : null,
      restSigns(streak.rests),
    ),
    flat > 0
      ? h('p', { class: 'today-line', id: 'flat-line' }, th(`ยางแบน ${flat} คำ ทวนให้ถูกแล้วจะหายเอง`))
      : null,
    (plan.score ?? 0) > 0 || store.state.records.day > 0
      ? h('p', { class: 'today-line', id: 'score-line' },
          th(`คะแนนวันนี้ ${(plan.score ?? 0).toLocaleString('en-US')} · สถิติ ${store.state.records.day.toLocaleString('en-US')}`))
      : null,
    dayDone
      ? h('div', { class: 'day-done', id: 'day-done', lang: 'th' },
          h('p', { class: 'day-done-title' }, 'วันนี้ขับครบแล้ว พรุ่งนี้มาขับต่อ'),
          h('p', { class: 'muted' }, 'เรียนทีละน้อยทุกวัน จำได้นานกว่าเรียนรวดเดียว'))
      : h('a', { class: 'btn btn-primary btn-main', href: '#/drive', id: 'main-btn' }, th(mainLabel)),
    gate
      ? gateTried
        ? th('ลองใหม่พรุ่งนี้', { class: 'muted center', id: 'gate-tomorrow' })
        : h('a', { class: 'btn btn-secondary', href: `#/checkpoint/${gate.id}`, id: 'gate-btn' }, th('เข้าด่าน'))
      : null,
    dayDone && rushOpen
      ? h('a', { class: 'btn btn-primary btn-main', href: '#/arcade', id: 'rush-btn', lang: 'en' }, 'Highway Rush')
      : null,
    !(dayDone && rushOpen) && rushUnlocked
      ? rushOpen
        ? h('a', { class: 'btn btn-secondary', href: '#/arcade', id: 'rush-link' }, en('Highway Rush'), rushBest ? th(` · สถิติ ${rushBest.toLocaleString('en-US')}`) : null)
        : h('p', { class: 'muted', id: 'rush-locked' }, en('Highway Rush'), th(' · เปิดเมื่อขับครบแผนวันนี้'))
      : null,
    h('a', { class: 'btn btn-secondary', href: '#/map', id: 'map-link' }, h('span', { html: icons.map }), th('แผนที่ทริป')),
    h('div', { class: 'home-links' },
      h('a', { class: 'btn btn-secondary', href: '#/words', id: 'words-link' }, th('คลังคำศัพท์')),
      h('a', { class: 'btn btn-secondary', href: '#/settings', id: 'settings-link' }, th('ตั้งค่า'))),
    ready < app.total
      ? h('p', { class: 'muted ready', id: 'ready' }, th('คำที่พร้อมเล่น '), en(`${ready}/${app.total}`))
      : null,
  );
}
