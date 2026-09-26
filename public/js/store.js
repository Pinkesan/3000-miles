// Saved state in localStorage (DESIGN §10). Memory fallback when storage is unavailable.
export const KEY = 'miles3000.v1';
export const APP = '3000-miles';

export const DEFAULT_SETTINGS = {
  newPerDay: 10, voice: '', rate: 0.9, autoplay: true, sound: true, theme: 'auto',
};

const CHOICES = {
  newPerDay: [5, 10, 15, 20, 30],
  theme: ['auto', 'light', 'dark'],
};

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const num = (x, fallback) => (Number.isFinite(x) ? x : fallback);

export function freshState() {
  return {
    v: 1,
    settings: { ...DEFAULT_SETTINGS },
    cards: {},
    days: {},
    leg: null,
    lastLeg: null,
    streak: { cur: 0, best: 0, last: null, rests: 0 },
    stops: {},
    checkpoints: {},
    exam: null,
    records: { combo: 0, day: 0, dayOn: null },
    flags: {},
    arcade: { best: 0, runs: [] },
  };
}

function normalizeSettings(s) {
  const d = DEFAULT_SETTINGS;
  const src = isObj(s) ? s : {};
  const pick = (key) => (CHOICES[key].includes(src[key]) ? src[key] : d[key]);
  return {
    newPerDay: pick('newPerDay'),
    theme: pick('theme'),
    voice: typeof src.voice === 'string' ? src.voice : d.voice,
    rate: Number.isFinite(src.rate) && src.rate >= 0.5 && src.rate <= 1.5 ? src.rate : d.rate,
    autoplay: typeof src.autoplay === 'boolean' ? src.autoplay : d.autoplay,
    sound: typeof src.sound === 'boolean' ? src.sound : d.sound,
  };
}

// Junk becomes a fresh state; a partial save gets the missing parts. Never throws.
export function normalizeState(saved) {
  const f = freshState();
  if (!isObj(saved)) return f;
  const st = isObj(saved.streak) ? saved.streak : {};
  const arcade = isObj(saved.arcade) ? saved.arcade : {};
  const rec = isObj(saved.records) ? saved.records : {};
  return {
    v: 1,
    settings: normalizeSettings(saved.settings),
    cards: isObj(saved.cards) ? saved.cards : f.cards,
    days: isObj(saved.days) ? saved.days : f.days,
    leg: isObj(saved.leg) ? saved.leg : null,
    lastLeg: isObj(saved.lastLeg) ? saved.lastLeg : null,
    streak: {
      cur: num(st.cur, 0), best: num(st.best, 0), last: Number.isFinite(st.last) ? st.last : null, rests: num(st.rests, 0),
    },
    stops: isObj(saved.stops) ? saved.stops : f.stops,
    checkpoints: isObj(saved.checkpoints) ? saved.checkpoints : f.checkpoints,
    exam: isObj(saved.exam) ? saved.exam : null,
    records: { combo: num(rec.combo, 0), day: num(rec.day, 0), dayOn: Number.isFinite(rec.dayOn) ? rec.dayOn : null },
    flags: isObj(saved.flags) ? saved.flags : f.flags,
    arcade: { best: num(arcade.best, 0), runs: Array.isArray(arcade.runs) ? arcade.runs : [] },
  };
}

export function createStore(storage) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage ?? null; } catch { storage = null; }
  }
  let raw = null;
  try { raw = storage?.getItem(KEY) ?? null; } catch { storage = null; }
  let saved = null;
  try { saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
  const store = {
    state: normalizeState(saved),
    persistent: !!storage,
    save() {
      try { storage?.setItem(KEY, JSON.stringify(store.state)); } catch { /* full or blocked: keep playing in memory */ }
    },
    update(fn) {
      fn(store.state);
      store.save();
    },
    // DESIGN §10: a backup is the whole state in a small envelope.
    exportData(now = new Date()) {
      return { app: APP, v: 1, exportedAt: now.toISOString(), data: store.state };
    },
    // Replaces the whole state (no merge). Throws on a file that is not one of our backups.
    importData(text) {
      let file;
      try { file = JSON.parse(text); } catch { throw new Error('not json'); }
      if (!isObj(file) || file.app !== APP || !isObj(file.data)) throw new Error('not a 3000 Miles backup');
      store.state = normalizeState(file.data);
      store.save();
    },
    reset() {
      store.state = freshState();
      store.save();
    },
  };
  return store;
}
