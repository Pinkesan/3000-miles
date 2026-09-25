// Tiny DOM helpers. User text always goes in as text nodes; `html` is only
// used for the game's own artwork and icons.
import { dayToDate } from './day.js';

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, v);
        else el.style[prop] = v;
      }
    }
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Like el.replaceChildren(), but skips null/false (which the DOM would print as "null").
export function setChildren(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((c) => c != null && c !== false));
}

export const th = (text, props = {}) => h('span', { lang: 'th', ...props }, text);
export const en = (text, props = {}) => h('span', { lang: 'en', ...props }, text);

export function toast(message, kind = 'info', ms = 4500) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const item = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status', lang: 'th' }, message);
  box.append(item);
  setTimeout(() => {
    item.classList.add('toast-out');
    setTimeout(() => item.remove(), 400);
  }, ms);
}

// In-page confirm box (never window.confirm, which blocks the page).
export function confirmBox({ title, body = '', ok = 'ตกลง', cancel = 'ยกเลิก', danger = false }) {
  return new Promise((resolve) => {
    const dialog = h(
      'dialog',
      { class: 'confirm', 'aria-labelledby': 'confirm-title', lang: 'th' },
      h('h2', { id: 'confirm-title' }, title),
      body ? h('p', {}, body) : null,
      h(
        'div',
        { class: 'confirm-actions' },
        h('button', { class: 'btn btn-quiet', value: 'no', onclick: () => close(false) }, cancel),
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, value: 'yes', onclick: () => close(true) }, ok),
      ),
    );
    const close = (answer) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(false);
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

// Thai date text for a day number, e.g. "25 ก.ย. 2569".
export const thaiDay = (day) =>
  dayToDate(day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export function setTitle(text) {
  document.title = text ? `${text} | 3000 Miles` : '3000 Miles';
}
