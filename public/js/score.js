// Score, combo and stars (DESIGN §6). Pure: no DOM, storage or clock; `ms` is a parameter.
// None of it touches word state (DESIGN §1 rule 8).

export const POINTS = { meaning: 10, listen: 10, word: 10, gap: 15, spell: 20, gapType: 25, dictation: 25 };
const TYPED = new Set(['spell', 'gapType', 'dictation']);

// Only multiple-choice questions get a speed bonus.
export function speedFactor(type, ms) {
  if (TYPED.has(type) || !Number.isFinite(ms)) return 1;
  if (ms <= 3000) return 1.5;
  if (ms <= 6000) return 1.2;
  return 1;
}

export function comboMultiplier(combo) {
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1.5;
  return 1;
}

// s = { score, combo, bestCombo }. Re-asks and skips ("ไม่รู้จักคำนี้") are neutral: no
// points, the combo stays. A wrong answer sets the combo to 0.
export function scoreAnswer(s, { type, kind, correct, skipped = false, ms }) {
  const base = { score: s.score ?? 0, combo: s.combo ?? 0, bestCombo: s.bestCombo ?? 0 };
  if (skipped || kind === 'reask') return { ...base, points: 0 };
  if (!correct) return { ...base, combo: 0, points: 0 };
  const combo = base.combo + 1;
  const points = Math.round((POINTS[type] ?? 10) * speedFactor(type, ms) * comboMultiplier(combo));
  return { score: base.score + points, combo, bestCombo: Math.max(base.bestCombo, combo), points };
}

export function legStars({ right, wrong }) {
  const total = right + wrong;
  if (total === 0) return null;
  const pct = right / total;
  if (pct >= 0.95) return 3;
  if (pct >= 0.8) return 2;
  return 1;
}

// records = { combo, day, dayOn }
export function updateRecords(records, { combo, dayScore, today }) {
  const r = { combo: records?.combo ?? 0, day: records?.day ?? 0, dayOn: records?.dayOn ?? null };
  const newCombo = combo > r.combo;
  const newDay = dayScore > r.day;
  return {
    records: {
      combo: newCombo ? combo : r.combo,
      day: newDay ? dayScore : r.day,
      dayOn: newDay ? today : r.dayOn,
    },
    newCombo,
    newDay,
  };
}
