// A row of 1–3 stars, filled up to `n` (DESIGN §8).
import { h } from '../ui.js';
import { icons } from '../icons.js';

export function starsRow(n, { id, small = false } = {}) {
  return h('div', { class: `stars${small ? ' stars-sm' : ''}`, id, role: 'img', 'aria-label': `${n} ดาว` },
    [1, 2, 3].map((i) => h('span', { class: i > n ? 'star-empty' : '', html: i > n ? icons.starEmpty : icons.star })));
}
