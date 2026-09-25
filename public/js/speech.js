// Browser speech: speechSynthesis only (the game never listens).
const synth = globalThis.speechSynthesis || null;

export const canSpeak = () => !!synth;

const wordsIn = (t) => (String(t).match(/\S+/g) || []).length;
const estimateMs = (text, rate = 1) => 600 + (wordsIn(text) / (2.6 * rate)) * 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let voiceList = null;
export function loadVoices() {
  if (!synth) return Promise.resolve([]);
  if (voiceList) return voiceList;
  voiceList = new Promise((resolve) => {
    const now = synth.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(synth.getVoices());
    synth.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  }).then((list) => {
    if (!list.length) voiceList = null; // try again next time
    return list;
  });
  return voiceList;
}

const FEMALE = /female|zira|aria|jenny|samantha|susan|hazel|heera|karen|moira|tessa|victoria|allison|\bava\b|joanna|salli|kimberly|google us english/i;
const MALE = /\bmale\b|david|mark|\bguy\b|alex|daniel|fred|\btom\b|aaron|george|james|ryan|christopher|eric|roger/i;

export function englishVoices(list) {
  return list.filter((v) => /^en([-_]|$)/i.test(v.lang));
}

export const hasEnglishVoice = (list) => englishVoices(list).length > 0;

export function pickVoice(list, want = {}, override = '') {
  if (override) {
    const chosen = list.find((v) => v.name === override);
    if (chosen) return chosen;
  }
  const en = englishVoices(list);
  const us = en.filter((v) => /^en[-_]us/i.test(v.lang));
  for (const name of want.prefer || []) {
    const v = us.find((x) => x.name.includes(name)) || en.find((x) => x.name.includes(name));
    if (v) return v;
  }
  const yes = want.gender === 'male' ? MALE : FEMALE;
  const no = want.gender === 'male' ? FEMALE : MALE;
  return us.find((v) => yes.test(v.name) && !no.test(v.name)) || us[0] || en[0] || null;
}

// Speaking one sentence at a time avoids Chrome cutting long speech off.
function sentences(text) {
  const parts = String(text).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [String(text)];
  const out = [];
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    if (out.length && wordsIn(p) < 3) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out;
}

let token = 0;
export function speak(text, { voice = null, rate = 1, onstart } = {}) {
  const mine = ++token;
  if (!synth) {
    onstart?.();
    return { done: wait(estimateMs(text, rate)), cancel() {} };
  }
  synth.cancel();
  let cancelled = false;
  const chunks = sentences(text);
  const done = new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (cancelled || mine !== token || i >= chunks.length) return resolve();
      const u = new SpeechSynthesisUtterance(chunks[i]);
      const first = i === 0;
      i += 1;
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'en-US';
      }
      u.rate = rate;
      let finished = false;
      let guard = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(guard);
        next();
      };
      u.onend = finish;
      u.onerror = finish;
      if (first) u.onstart = () => onstart?.();
      // Chrome occasionally never fires onend; don't let the game hang on it.
      guard = setTimeout(finish, estimateMs(u.text, rate) + 5000);
      synth.speak(u);
    };
    next();
  });
  return {
    done,
    cancel() {
      cancelled = true;
      if (mine === token) synth.cancel();
    },
  };
}

export function stopSpeaking() {
  token += 1;
  synth?.cancel();
}
