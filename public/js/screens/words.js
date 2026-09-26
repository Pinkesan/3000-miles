// #/words: search and browse every word (DESIGN §7). Filters live in the hash query so back returns here.
import { h, setChildren, th, en } from '../ui.js';
import { icons } from '../icons.js';
import { status } from '../srs.js';
import { posList } from '../text.js';
import { LEVELS, PAGE, STATUSES, STATUS_TH, chipCounts, filterWords } from '../wordlist.js';
import { boxGauge } from '../components/wordrow.js';

export function render(root, app, { query }) {
  const { cards } = app.store.state;
  const f = {
    q: query.get('q') || '',
    lv: LEVELS.includes(query.get('lv')) ? query.get('lv') : '',
    st: STATUSES.includes(query.get('st')) ? query.get('st') : '',
  };
  let shown = PAGE;
  let timer = 0;

  // replaceState: the hash changes without a route change, and back still lands on this list
  function remember() {
    const p = new URLSearchParams();
    for (const k of ['lv', 'st', 'q']) if (f[k]) p.set(k, f[k]);
    const qs = p.toString();
    history.replaceState(null, '', `#/words${qs ? `?${qs}` : ''}`);
  }

  const input = h('input', {
    class: 'search', id: 'search', type: 'search', value: f.q, autocomplete: 'off', autocapitalize: 'off',
    spellcheck: 'false', placeholder: 'ค้นหา: คำอังกฤษ หรือความหมายไทย', 'aria-label': 'ค้นหาคำศัพท์',
  });
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { f.q = input.value; shown = PAGE; remember(); paint(); }, 150);
  });
  const levelChips = h('div', { class: 'chips', id: 'level-chips', role: 'group', 'aria-label': 'ระดับ' });
  const statusChips = h('div', { class: 'chips', id: 'status-chips', role: 'group', 'aria-label': 'สถานะ' });
  const countLine = h('p', { class: 'muted', id: 'count-line' });
  const list = h('ul', { class: 'word-rows', id: 'word-rows' });
  const more = h('button', { class: 'btn btn-secondary', id: 'more-btn', type: 'button' }, th('แสดงเพิ่ม'));
  more.addEventListener('click', () => { shown += PAGE; paint(); });

  const chip = (key, value, label, count) =>
    h('button', {
      class: `chip${f[key] === value ? ' chip-on' : ''}`, type: 'button', 'aria-pressed': f[key] === value ? 'true' : 'false',
      dataset: { key, value },
      onclick: () => { f[key] = value; shown = PAGE; remember(); paint(); },
    }, label, ' ', en(String(count), { class: 'chip-n' }));

  function paint() {
    const counts = chipCounts(app.words, cards, f);
    setChildren(levelChips,
      chip('lv', '', th('ทั้งหมด'), counts.allLevels),
      LEVELS.map((lv) => chip('lv', lv, en(lv), counts.levels[lv])));
    setChildren(statusChips,
      chip('st', '', th('ทุกสถานะ'), counts.allStatuses),
      STATUSES.map((s) => chip('st', s, th(STATUS_TH[s]), counts.statuses[s])));
    const rows = filterWords(app.words, cards, f);
    const part = rows.slice(0, shown);
    setChildren(countLine, th(rows.length ? `แสดง ${part.length} จาก ${rows.length} คำ` : 'ไม่พบคำที่ตรงกัน'));
    setChildren(list, part.map((w) => {
      const c = cards[w.id];
      return h('li', {},
        h('a', { class: 'word-row', href: `#/word/${encodeURIComponent(w.id)}`, dataset: { st: status(c) } },
          h('span', { class: 'wr-top' }, en(w.w, { class: 'lw-w' }), en(posList(w), { class: 'wr-pos' }), boxGauge(c?.b ?? 0)),
          th(w.th, { class: 'wr-th muted' })));
    }));
    more.hidden = rows.length <= part.length;
  }

  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/' }, h('span', { html: icons.back }), th('กลับ')),
    h('h1', { class: 'results-title' }, th('คลังคำศัพท์')),
    input, levelChips, statusChips, countLine, list, more,
  );
  paint();
  return { destroy() { clearTimeout(timer); } };
}
