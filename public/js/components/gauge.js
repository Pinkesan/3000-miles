// Fuel gauge: a small semicircle, E / ½ / F, the needle goes from -90° to 90° (DESIGN §8).
import { h } from '../ui.js';

export function gauge(fill) {
  const f = Math.min(1, Math.max(0, fill));
  const deg = Math.round(-90 + 180 * f);
  const svg = `<svg viewBox="0 0 120 80" width="120" height="80" aria-hidden="true">
    <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="var(--line)" stroke-width="8" stroke-linecap="round"/>
    <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="var(--lane)" stroke-width="8" stroke-linecap="round"
      pathLength="100" stroke-dasharray="${Math.round(f * 100)} 100"/>
    <g transform="rotate(${deg} 60 62)"><path d="M60 62 L60 24" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/></g>
    <circle cx="60" cy="62" r="6" fill="var(--text)"/>
    <text x="8" y="78" font-size="12" font-weight="800" fill="currentColor" font-family="Overpass, sans-serif">E</text>
    <text x="56" y="14" font-size="12" font-weight="800" fill="currentColor" font-family="Overpass, sans-serif">½</text>
    <text x="106" y="78" font-size="12" font-weight="800" fill="currentColor" font-family="Overpass, sans-serif">F</text>
  </svg>`;
  return h('div', { class: 'gauge', role: 'img', 'aria-label': `ถังน้ำมัน ${Math.round(f * 100)}%`, html: svg });
}
