// Short WebAudio tones. The AudioContext is created on the first user gesture.
let ctx = null;
let enabled = true;

export const setSound = (on) => { enabled = !!on; };

function audio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// notes: [frequency Hz, start s, length s]
function play(notes, type = 'sine', gain = 0.12) {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  for (const [freq, at, len] of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + at;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + len + 0.02);
  }
}

export const right = () => play([[660, 0, 0.12], [880, 0.09, 0.18]]);
export const wrong = () => play([[220, 0, 0.22]], 'triangle', 0.14);
export const mile = () => play([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.22]]);
export const stop = () => play([[392, 0, 0.14], [523, 0.14, 0.14], [659, 0.28, 0.14], [784, 0.42, 0.4]]);
