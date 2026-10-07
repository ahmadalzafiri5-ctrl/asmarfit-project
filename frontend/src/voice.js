// Voice and beeps for the guided workouts (browser speech and a small tone generator). Everything is
// optional: if the phone has no speech voice or blocks audio, the workout simply stays silent.
export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

export function speak(text, lang) {
  if (!voiceSupported() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    const tag = lang === "de" ? "de-DE" : "en-GB";
    u.lang = tag;
    const v = (synth.getVoices ? synth.getVoices() : []).find((x) => x.lang && x.lang.replace("_", "-").toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
    u.rate = 1;
    synth.speak(u);
  } catch {
    /* no voice available */
  }
}

export function stopSpeaking() {
  try {
    if (voiceSupported()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

let audioCtx = null;
// call once from a tap (start button) so phones allow sound later
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* no audio */
  }
}

export function beep(freq = 880, ms = 120) {
  try {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.18;
    o.connect(g);
    g.connect(audioCtx.destination);
    const t0 = audioCtx.currentTime;
    o.start(t0);
    g.gain.setValueAtTime(0.18, t0 + ms / 1000 - 0.03);
    g.gain.linearRampToValueAtTime(0, t0 + ms / 1000);
    o.stop(t0 + ms / 1000 + 0.02);
  } catch {
    /* ignore */
  }
}

// keep the screen on while a workout runs (not every phone supports it)
export async function holdScreen() {
  try {
    if (navigator.wakeLock && navigator.wakeLock.request) return await navigator.wakeLock.request("screen");
  } catch {
    /* denied */
  }
  return null;
}
