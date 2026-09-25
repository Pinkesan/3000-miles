// Drive and results screens arrive in Step 4.
import { h, setChildren, th } from '../ui.js';

export function render(root) {
  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/' }, th('กลับหน้าแรก')),
    h('p', { class: 'muted', lang: 'th' }, 'หน้านี้ยังไม่เปิด จะมาในขั้นถัดไป'),
  );
}
