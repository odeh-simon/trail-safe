let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

/**
 * Call this from a user gesture to unlock the audio context.
 * Called by AuthProvider on first click/touch.
 */
export function unlockAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  } catch (err) {
    console.warn("unlockAudioContext failed:", err);
  }
}

/**
 * Plays a three-beep SOS alert sound.
 * Works offline — uses Web Audio API synthesis, no files needed.
 * Requires prior call to unlockAudioContext() from a user gesture.
 */
export function playSOSAlert() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().then(() => _playBeeps(ctx));
      return;
    }

    _playBeeps(ctx);
  } catch (err) {
    console.warn("playSOSAlert failed:", err);
  }
}

function _playBeeps(ctx) {
  const beep = (startTime, freq, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.6, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  };

  const now = ctx.currentTime;
  beep(now, 880, 0.15);
  beep(now + 0.2, 880, 0.15);
  beep(now + 0.4, 1100, 0.35);
}
