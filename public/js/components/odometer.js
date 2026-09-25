// Odometer: black wheels, each a column of 0-9 moved with transform (DESIGN §8).
// `.set(value, { animate })` rolls the wheels; reduced motion is handled in CSS (no transition).
import { h } from '../ui.js';

export function odometer(miles, digits = 4) {
  const strips = [];
  const wheels = Array.from({ length: digits }, () => {
    const strip = h('span', { class: 'wheel-strip' }, ...Array.from({ length: 10 }, (_, i) => h('span', {}, i)));
    strips.push(strip);
    return h('span', { class: 'wheel' }, strip);
  });
  const el = h('div', { class: 'odometer', role: 'img', lang: 'en' },
    h('span', { class: 'wheels' }, wheels),
    h('span', { class: 'odo-unit' }, 'MILES'),
  );
  el.set = (value, { animate = true } = {}) => {
    const n = Math.max(0, Math.floor(value));
    const text = String(n).padStart(digits, '0').slice(-digits);
    wheels.forEach((w, i) => {
      if (!animate) strips[i].style.transition = 'none';
      w.style.setProperty('--d', text[i]);
    });
    if (!animate) {
      void el.offsetWidth; // apply the jump before the transition comes back
      strips.forEach((s) => { s.style.transition = ''; });
    }
    el.setAttribute('aria-label', `${n} ไมล์`);
  };
  el.set(miles, { animate: false });
  return el;
}
