// Voice and beeps for the guided workouts (browser speech and a small tone generator). Everything is
// optional: if the phone has no speech voice or blocks audio, the workout simply stays silent.
export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

// The voices come from the phone's speech engine, not from the browser or the app. A robotic sound is the engine's basic
// voice: the app picks the best one installed (natural / enhanced / online voices first, "compact" ones last) and lets the
// user choose another.
const GOOD = /natural|neural|premium|enhanced|erweitert|online|wavenet|siri|studio/i;
const POOR = /compact|eloquence|espeak|robo/i;
const quality = (v) => (GOOD.test(v.name || "") ? 4 : 0) + (v.localService === false ? 2 : 0) - (POOR.test(v.name || "") ? 5 : 0);
const sameLang = (v, lang) => !!v.lang && v.lang.replace("_", "-").toLowerCase().startsWith(lang === "de" ? "de" : "en");

// installed voices for the app language, best first
export function voicesFor(lang) {
  if (!voiceSupported()) return [];
  let all = [];
  try {
    all = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() || [] : [];
  } catch {
    all = [];
  }
  return all.filter((v) => sameLang(v, lang)).sort((a, b) => quality(b) - quality(a) || String(a.name).localeCompare(String(b.name)));
}
export const voiceId = (v) => v.voiceURI || v.name;

// opts: { voiceURI: the user's pick (falls back to the best voice when it is gone), rate: 0.8 .. 1.2 }
export function speak(text, lang, opts = {}) {
  if (!voiceSupported() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = lang === "de" ? "de-DE" : "en-GB";
    const list = voicesFor(lang);
    const v = (opts.voiceURI && list.find((x) => voiceId(x) === opts.voiceURI)) || list[0];
    if (v) {
      u.voice = v;
      if (v.lang) u.lang = v.lang;
    }
    u.rate = Number.isFinite(opts.rate) && opts.rate >= 0.5 && opts.rate <= 2 ? opts.rate : 1;
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
