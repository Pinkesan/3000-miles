// Boot + hash router. Screens: render(root, app, params) is synchronous and may return { destroy() }.
import { dayNumber } from './day.js';
import { makeRng } from './rng.js';
import { introOrder, makeDayPlan } from './plan.js';
import { rollover } from './progress.js';
import { createStore } from './store.js';
import { setChildren, h, setTitle, toast } from './ui.js';
import { loadVoices, pickVoice, speak, stopSpeaking } from './speech.js';
import { setSound } from './sfx.js';
import * as home from './screens/home.js';
import * as drive from './screens/drive.js';
import * as results from './screens/results.js';
import * as card from './screens/card.js';
import * as arcade from './screens/arcade.js';
import * as map from './screens/map.js';
import * as postcard from './screens/postcard.js';
import * as checkpoint from './screens/checkpoint.js';
import * as wordsScreen from './screens/words.js';
import * as wordScreen from './screens/word.js';
import * as settings from './screens/settings.js';

const query = new URLSearchParams(location.search);
export const testMode = query.has('test');
const seed = testMode ? query.get('seed') || '1' : String(Date.now());
const fixedToday = testMode && query.has('today') ? Number(query.get('today')) : null;

const ROUTES = {
  home: { screen: home, title: '' },
  drive: { screen: drive, title: 'ขับ' },
  results: { screen: results, title: 'สรุปช่วง' },
  card: { screen: card, title: 'การ์ดคำศัพท์' },
  arcade: { screen: arcade, title: 'Highway Rush' },
  map: { screen: map, title: 'แผนที่' },
  postcard: { screen: postcard, title: 'โปสการ์ด' },
  checkpoint: { screen: checkpoint, title: 'ด่านตรวจ' },
  words: { screen: wordsScreen, title: 'คลังคำศัพท์' },
  word: { screen: wordScreen, title: 'คำศัพท์' },
  settings: { screen: settings, title: 'ตั้งค่า' },
};

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15171b' : '#eef1ee');
}

// Offline support. A new worker waits until the player taps อัปเดต, then the page reloads on controllerchange.
function registerWorker() {
  if (testMode || !('serviceWorker' in navigator)) return;
  const offer = (worker) => toast('มีเวอร์ชันใหม่', 'info', 20000, {
    label: 'อัปเดต',
    onclick: () => worker.postMessage('skipWaiting'),
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
  }).catch(() => {});
}

async function boot() {
  const root = document.getElementById('app');
  let data;
  try {
    const res = await fetch('data/words.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    setChildren(root, h('p', { class: 'boot-error', lang: 'th' }, 'โหลดคำศัพท์ไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง'));
    return;
  }

  let routeData;
  try {
    const res = await fetch('data/route.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    routeData = await res.json();
  } catch {
    setChildren(root, h('p', { class: 'boot-error', lang: 'th' }, 'โหลดเส้นทางไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง'));
    return;
  }

  const store = createStore();
  const words = data.words;
  const byId = new Map(words.map((w) => [w.id, w]));
  const voices = { list: [], picked: null };

  const app = {
    words, byId, total: data.total, levels: data.levels, store, testMode, route: routeData,
    order: introOrder(words),
    get settings() { return store.state.settings; },
    today: () => fixedToday ?? dayNumber(new Date()),
    rnd: (tail = '') => makeRng(`${seed}:${tail}`),
    // Speak English text with the chosen voice; `rate` overrides the setting.
    say(text, { rate } = {}) {
      voices.picked = pickVoice(voices.list, { gender: 'female' }, app.settings.voice);
      return speak(text, { voice: voices.picked, rate: rate ?? app.settings.rate });
    },
    stopSay: stopSpeaking,
    hasVoice: () => voices.list.some((v) => /^en([-_]|$)/i.test(v.lang)),
    voices: () => voices.list,
    applySettings() {
      applyTheme(app.settings.theme);
      setSound(app.settings.sound);
    },
    ensurePlan() {
      const today = app.today();
      const { days, cards } = store.state;
      if (!days[today]) {
        store.update((s) => {
          s.days[today] = makeDayPlan(cards, today, s.settings);
          s.streak = rollover(s.streak, today); // missed days spend rests or end the streak
        });
      }
      return store.state.days[today];
    },
  };

  loadVoices().then((list) => { voices.list = list; });
  app.applySettings();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', app.applySettings);
  navigator.storage?.persist?.().catch(() => {});
  registerWorker();
  app.ensurePlan();

  let current = null;
  function route() {
    const [path, qs = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const [name = '', ...params] = path.split('/');
    const key = name === '' ? 'home' : name;
    const entry = ROUTES[key];
    if (!entry) {
      location.replace('#/');
      return;
    }
    current?.destroy?.();
    stopSpeaking();
    app.ensurePlan();
    setTitle(entry.title);
    window.scrollTo(0, 0);
    root.dataset.route = key;
    const view = h('div', { class: 'screen' });
    setChildren(root, view);
    current = entry.screen.render(view, app, { route: key, args: params.map(decodeURIComponent), query: new URLSearchParams(qs) }) || null;
  }
  addEventListener('hashchange', route);
  route();

  if (testMode) {
    // The drive, arcade and checkpoint screens set app.hooks; the UI check reads the current item and question.
    window.__app = { app, question: () => app.hooks?.question() ?? null, item: () => app.hooks?.item() ?? null, endRun: () => app.hooks?.endRun?.() };
  }
}

boot();
