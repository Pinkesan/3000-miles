// Odometer: black wheels, each a column of 0-9 moved with transform (DESIGN §8).
// Static digits for now; the roll animation comes with the results screen.
import { h } from '../ui.js';

export function odometer(miles, digits = 4) {
  const text = String(Math.max(0, Math.floor(miles))).padStart(digits, '0').slice(-digits);
  const wheels = [...text].map((d) =>
    h('span', { class: 'wheel', style: { '--d': d } },
      h('span', { class: 'wheel-strip' }, ...Array.from({ length: 10 }, (_, i) => h('span', {}, i))),
    ),
  );
  return h('div', { class: 'odometer', role: 'img', 'aria-label': `${Math.floor(miles)} ไมล์`, lang: 'en' },
    h('span', { class: 'wheels' }, wheels),
    h('span', { class: 'odo-unit' }, 'MILES'),
  );
}
