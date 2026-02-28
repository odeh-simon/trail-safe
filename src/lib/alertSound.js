/**
 * Plays an SOS alert sound using Web Audio API.
 * No external files needed — works offline.
 * Call from a user gesture context or on first user interaction to unlock audio.
 */
export function playSOSAlert() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playBeep = (startTime, frequency = 880, duration = 0.2) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.5, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playBeep(now, 880, 0.15);
    playBeep(now + 0.2, 880, 0.15);
    playBeep(now + 0.4, 1100, 0.3);
  } catch (err) {
    console.warn("SOS alert sound failed:", err);
  }
}
