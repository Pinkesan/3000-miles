// #/settings: pace, voice, sound, theme, backup, reset, about (DESIGN §7, §10, §11).
import { h, setChildren, th, en, toast, confirmBox } from '../ui.js';
import { icons } from '../icons.js';
import { withNewPerDay } from '../plan.js';
import { canListen, englishVoices, loadVoices } from '../speech.js';
import { VERSION } from '../version.js';

const PER_DAY = [5, 10, 15, 20, 30];
// Rough daily time after a month at each pace (DESIGN §1 rule 9, from the 2026-09-25 simulation).
const PACE_TEXT = {
  5: 'ประมาณ 5–10 นาทีต่อวัน',
  10: 'ประมาณ 15 นาทีต่อวัน',
  15: 'ประมาณ 20 นาทีต่อวัน',
  20: 'ประมาณ 20 นาทีต่อวัน แต่คำทวนจะค้างเกิน 100 บ่อย หลายวันจะไม่มีคำใหม่',
  30: 'ประมาณ 20 นาทีต่อวัน แต่คำทวนจะค้างเกิน 100 บ่อย หลายวันจะไม่มีคำใหม่',
};
const RATES = [0.8, 0.9, 1.0];
const THEMES = [['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']];
const ONOFF = [[true, 'เปิด'], [false, 'ปิด']];

const section = (title, ...children) => h('section', { class: 'set-group' }, h('h2', {}, th(title)), children);
const field = (id, label, control) => h('label', { class: 'field', for: id }, th(label), control);

function select(id, options, value, onChange) {
  const el = h('select', { id, class: 'select' },
    options.map(([v, label]) => h('option', { value: String(v), selected: String(v) === String(value) }, label)));
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

export function render(root, app) {
  const { store } = app;
  const today = app.today();
  let destroyed = false;

  const set = (fn) => { store.update((s) => fn(s.settings, s)); };

  const paceNote = h('p', { class: 'muted', id: 'pace-note' });
  const persistNote = h('p', { class: 'muted', id: 'persist-note', lang: 'th' });
  navigator.storage?.persisted?.().then((ok) => {
    if (!destroyed) persistNote.textContent = ok ? 'ข้อมูลถูกเก็บแบบถาวร' : 'เบราว์เซอร์ยังไม่รับรองว่าเก็บข้อมูลถาวร ถ้าใช้ iPhone ให้เพิ่มเกมไปที่หน้าจอโฮมแล้วเปิดจากไอคอน';
  }).catch(() => {});
  const paintPace = () => setChildren(paceNote, th(PACE_TEXT[app.settings.newPerDay]));
  const pace = select('new-per-day', PER_DAY.map((n) => [n, `${n} คำ`]), app.settings.newPerDay, (v) => {
    set((st, s) => {
      st.newPerDay = Number(v);
      if (s.days[today]) s.days[today] = withNewPerDay(s.days[today], st.newPerDay);
    });
    paintPace();
  });
  paintPace();

  const voice = h('select', { id: 'voice', class: 'select' });
  const paintVoices = (list) => {
    const en_ = englishVoices(list);
    setChildren(voice,
      h('option', { value: '', selected: !app.settings.voice }, 'อัตโนมัติ'),
      en_.map((v) => h('option', { value: v.name, selected: v.name === app.settings.voice }, `${v.name} (${v.lang})`)));
  };
  paintVoices(app.voices());
  loadVoices().then((list) => { if (!destroyed) paintVoices(list); });
  voice.addEventListener('change', () => set((st) => { st.voice = voice.value; }));
  const testVoice = h('button', { class: 'btn btn-secondary', id: 'voice-test', type: 'button' },
    h('span', { html: icons.speaker }), th('ทดลองฟัง'));
  testVoice.addEventListener('click', () => app.say('Welcome to the road trip'));

  // Say it: hidden when the browser can't listen; the first time it is turned on, say where the audio goes
  const sayField = canListen()
    ? [field('say-mode', 'โหมดพูด (พูดคำตอบแทนการพิมพ์)', select('say-mode', ONOFF, app.settings.sayMode, async (v) => {
      const el = document.getElementById('say-mode');
      if (v === 'true' && !app.settings.sayNotice) {
        const ok = await confirmBox({
          title: 'เปิดโหมดพูด?',
          body: 'Chrome และ Edge จะส่งเสียงที่คุณพูดไปให้บริการรู้จำเสียงของผู้พัฒนาเบราว์เซอร์ (Google หรือ Microsoft) เพื่อแปลงเป็นข้อความ เกมนี้ไม่เก็บเสียงไว้ ถ้าไม่ต้องการให้ปิดโหมดนี้',
          ok: 'เปิด', cancel: 'ไม่เปิด',
        });
        if (!ok) { if (el) el.value = 'false'; return; }
        set((st) => { st.sayNotice = true; });
      }
      set((st) => { st.sayMode = v === 'true'; });
    })),
    h('p', { class: 'muted', id: 'say-note' }, th('ใช้กับคำที่จำได้แม่นแล้ว พูดไม่ผ่านสองครั้งจะให้พิมพ์แทน ไม่เสียคำ'))]
    : null;

  const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'restore-file', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    let text;
    try { text = await f.text(); } catch { toast('อ่านไฟล์ไม่ได้', 'error'); return; }
    try {
      const probe = JSON.parse(text);
      if (probe?.app !== '3000-miles') throw new Error('wrong app');
    } catch {
      toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของ 3000 Miles', 'error');
      return;
    }
    const ok = await confirmBox({
      title: 'กู้คืนจากไฟล์?', body: 'ความก้าวหน้าตอนนี้ในเครื่องจะถูกแทนที่ด้วยข้อมูลในไฟล์', ok: 'กู้คืน', danger: true,
    });
    if (!ok || destroyed) return;
    try {
      store.importData(text);
    } catch {
      toast('ไฟล์นี้ใช้ไม่ได้', 'error');
      return;
    }
    afterReplace();
    toast('กู้คืนข้อมูลแล้ว', 'ok');
  });

  function afterReplace() {
    app.applySettings();
    location.hash = '#/';
  }

  function download() {
    const data = store.exportData();
    const name = `3000-miles-${data.exportedAt.slice(0, 10)}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('บันทึกไฟล์สำรองแล้ว', 'ok');
  }

  async function reset() {
    const ok = await confirmBox({
      title: 'เริ่มใหม่ทั้งหมด?', body: 'ไมล์ โปสการ์ด และสถิติทั้งหมดในเครื่องจะหายและกู้คืนไม่ได้ (สำรองไฟล์ไว้ก่อนได้)',
      ok: 'เริ่มใหม่', danger: true,
    });
    if (!ok || destroyed) return;
    store.reset();
    afterReplace();
    toast('เริ่มใหม่แล้ว', 'ok');
  }

  setChildren(
    root,
    h('a', { class: 'btn btn-quiet back', href: '#/' }, h('span', { html: icons.back }), th('กลับ')),
    h('h1', { class: 'results-title' }, th('ตั้งค่า')),
    section('การเรียน',
      field('new-per-day', 'คำใหม่ต่อวัน', pace), paceNote,
      h('p', { class: 'muted', id: 'level-note' }, th('คำใหม่มาทีละระดับ A1, A2, B1 แล้ว B2 คำที่รู้อยู่แล้วจะผ่านไปเร็ว'))),
    section('เสียง',
      field('voice', 'เสียงอ่าน', voice),
      testVoice,
      field('rate', 'ความเร็วเสียง', select('rate', RATES.map((r) => [r, r.toFixed(1)]), app.settings.rate, (v) => set((st) => { st.rate = Number(v); }))),
      field('autoplay', 'เล่นเสียงอัตโนมัติ', select('autoplay', ONOFF, app.settings.autoplay, (v) => set((st) => { st.autoplay = v === 'true'; }))),
      sayField,
      field('sound', 'เสียงเอฟเฟกต์', select('sound', ONOFF, app.settings.sound, (v) => { set((st) => { st.sound = v === 'true'; }); app.applySettings(); }))),
    section('หน้าตา',
      field('theme', 'ธีม', select('theme', THEMES, app.settings.theme, (v) => { set((st) => { st.theme = v; }); app.applySettings(); }))),
    section('ข้อมูลในเครื่อง',
      h('p', { class: 'muted' }, th('ความก้าวหน้าเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้ ถ้าใช้ iPhone ให้กด แชร์ > เพิ่มไปยังหน้าจอโฮม แล้วเปิดเกมจากไอคอนนั้น เพราะ Safari อาจล้างข้อมูลของเว็บที่ไม่ได้เปิดเกิน 7 วัน และสำรองข้อมูลเป็นไฟล์ไว้เป็นระยะ')),
      persistNote,
      h('button', { class: 'btn btn-secondary', id: 'backup-btn', type: 'button', onclick: download }, th('สำรองข้อมูลเป็นไฟล์')),
      h('button', { class: 'btn btn-secondary', id: 'restore-btn', type: 'button', onclick: () => file.click() }, th('กู้คืนจากไฟล์')),
      file,
      h('button', { class: 'btn btn-danger', id: 'reset-btn', type: 'button', onclick: reset }, th('เริ่มใหม่ทั้งหมด'))),
    section('เกี่ยวกับเกม',
      h('p', { class: 'about', lang: 'en', id: 'about' },
        'Word list: The Oxford 3000™ (American English) © Oxford University Press. This is a personal learning project, not affiliated with or endorsed by Oxford University Press. Thai meanings, example sentences and translations were written for this project. Fonts: Overpass, Overpass Mono, Anuphan (SIL Open Font License).'),
      h('p', { class: 'muted', id: 'version' }, en(`3000 Miles v${VERSION}`))),
  );
  return { destroy() { destroyed = true; app.stopSay(); } };
}
