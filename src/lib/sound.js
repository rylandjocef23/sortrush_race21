let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.08, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export const sfx = {
  correct(streak = 1) {
    const base = Math.min(520 + streak * 24, 920);
    playTone(base, 0.09, 'triangle', 0.09);
  },
  wrong() {
    playTone(170, 0.16, 'sawtooth', 0.08);
    playTone(130, 0.18, 'sawtooth', 0.06, 0.07);
  },
  tick() {
    playTone(440, 0.06, 'sine', 0.06);
  },
  rouletteTick(step = 0) {
    playTone(360 + (step % 2) * 90, 0.045, 'triangle', 0.06);
  },
  go() {
    playTone(660, 0.14, 'triangle', 0.1);
  },
  win() {
    playTone(523.25, 0.14, 'triangle', 0.09, 0);
    playTone(659.25, 0.14, 'triangle', 0.09, 0.09);
    playTone(783.99, 0.24, 'triangle', 0.1, 0.18);
  },
  lose() {
    playTone(320, 0.16, 'sine', 0.07, 0);
    playTone(240, 0.25, 'sine', 0.07, 0.12);
  },
};
