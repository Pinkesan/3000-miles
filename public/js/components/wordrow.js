// A word in a list that opens its detail page (#/word/<id>).
import { h, th, en } from '../ui.js';

export const wordItem = (w) =>
  h('li', {}, h('a', { class: 'lw-link', href: `#/word/${encodeURIComponent(w.id)}` },
    en(w.w, { class: 'lw-w' }), th(w.th, { class: 'lw-th muted' })));

// 8 ticks, filled up to box b (DESIGN §3).
export const boxGauge = (b = 0, { big = false } = {}) =>
  h('span', { class: `box-gauge${big ? ' box-gauge-big' : ''}`, role: 'img', 'aria-label': `กล่อง ${b} จาก 8` },
    Array.from({ length: 8 }, (_, i) => h('i', { class: i < b ? 'on' : '' })));
