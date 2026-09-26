// Word list helpers (DESIGN §3, §7). Pure: no DOM, storage or clock.
import { status } from './srs.js';

export const STATUSES = ['new', 'learning', 'flat', 'mile', 'mastered'];
export const STATUS_TH = {
  new: 'ยังไม่เริ่ม', learning: 'กำลังจำ', flat: 'ยางแบน', mile: 'ได้ไมล์แล้ว', mastered: 'ขึ้นใจ',
};
export const LEVELS = ['A1', 'A2', 'B1', 'B2'];
export const PAGE = 100;

const THAI = /[฀-๿]/;

// English text matches the start of the word; Thai text matches anywhere in the meaning.
export function matchesQuery(word, q) {
  const t = String(q || '').trim().toLowerCase();
  if (!t) return true;
  return THAI.test(t) ? (word.th || '').toLowerCase().includes(t) : word.w.toLowerCase().startsWith(t);
}

// filters: { q, lv, st } (lv and st empty = all). Keeps the order of `words`.
export function filterWords(words, cards, { q = '', lv = '', st = '' } = {}) {
  return words.filter((w) => (!lv || w.lv === lv) && (!st || status(cards[w.id]) === st) && matchesQuery(w, q));
}

// Chip counts: each chip counts the words that pass the other filters.
export function chipCounts(words, cards, { q = '', lv = '', st = '' } = {}) {
  const levels = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  const statuses = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let allLevels = 0;
  let allStatuses = 0;
  for (const w of words) {
    if (!matchesQuery(w, q)) continue;
    const s = status(cards[w.id]);
    if (!st || s === st) { levels[w.lv] = (levels[w.lv] || 0) + 1; allLevels++; }
    if (!lv || w.lv === lv) { statuses[s]++; allStatuses++; }
  }
  return { levels, statuses, allLevels, allStatuses };
}

// "พรุ่งนี้", "อีก 5 วัน", "ถึงกำหนดแล้ว"; empty for a new word.
export function nextReviewText(card, today) {
  if (!card) return '';
  const days = card.d - today;
  if (days <= 0) return 'ถึงกำหนดแล้ว';
  return days === 1 ? 'พรุ่งนี้' : `อีก ${days} วัน`;
}
