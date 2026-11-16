// Voice and beeps for the guided workouts (browser speech and a small tone generator). Everything is
// optional: if the phone has no speech voice or blocks audio, the workout simply stays silent.
export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";

// The voices come from the phone's speech engine, not from the browser or the app. A robotic sound is the engine's basic
// voice: the app picks the best one installed (natural / enhanced / online voices first, "compact" ones last) and lets the
// user choose another.
const GOOD = /natural|neural|premium|enhanced|erweitert|online|wavenet|siri|studio/i;
const POOR = /compact|eloquence|espeak|robo/i;
const quality = (v) => (GOOD.test(v.name || "") ? 4 : 0) + (v.localService === false ? 2 : 0) - (POOR.test(v.name || "") ? 5 : 0);
const sameLang = (v, lang) => {
  const l = String(lang || "en").slice(0, 2).toLowerCase();
  return !!v.lang && v.lang.replace("_", "-").toLowerCase().startsWith(KNOWN_CLIP_LANGS.includes(l) ? l : "en");
};

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

// opts: { voiceURI: the user's pick (falls back to the best voice when it is gone), rate: 0.8 .. 1.2,
//         onEnd: called once speaking finished (or at once when speech is unavailable) }
export function speak(text, lang, opts = {}) {
  if (!voiceSupported() || !text) {
    if (opts.onEnd) opts.onEnd();
    return;
  }
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new window.SpeechSynthesisUtterance(text);
    if (opts.onEnd) {
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          opts.onEnd();
        }
      };
      u.onend = fin;
      u.onerror = fin;
      // Sicherheitsnetz: manche Engines feuern onend nicht zuverlässig
      setTimeout(fin, Math.min(15000, 1800 + text.length * 80));
    }
    u.lang = { de: "de-DE", en: "en-GB", fr: "fr-FR", it: "it-IT", es: "es-ES", tr: "tr-TR", pt: "pt-BR", ru: "ru-RU", pl: "pl-PL", nl: "nl-NL", ar: "ar-SA", hi: "hi-IN", id: "id-ID", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN" }[String(lang || "en").slice(0, 2)] || "en-GB";
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
  stopClip();
  try {
    if (voiceSupported()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// ---- recorded voice clips (made once with ElevenLabs, shipped inside the app: same natural voice on every phone, works offline) ----
// public/voice/manifest.json lists which clips exist per language; a line without a clip is spoken by the phone's own voice instead.
let manifestPromise = null;
const loadManifest = () => manifestPromise || (manifestPromise = fetch("/voice/manifest.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
// Alle 6 App-Sprachen können eigene Clips haben; fehlt die Sprache (noch), fällt
// die Ansage auf die englischen Clips zurück (immer noch menschlich, nie Roboter).
const KNOWN_CLIP_LANGS = ["de", "en", "fr", "it", "es", "tr", "pt", "ru", "pl", "nl", "ar", "hi", "id", "ja", "ko", "zh"];
const langKey = (lang) => {
  const l = String(lang || "").slice(0, 2).toLowerCase();
  return KNOWN_CLIP_LANGS.includes(l) ? l : "en";
};
export const clipUrl = (key, id) => "/voice/" + key + "/" + id + ".mp3";
// in welcher Sprache existiert der Clip? (exakte Sprache → sonst Englisch → sonst keiner)
async function clipLang(lang, id) {
  const m = await loadManifest();
  const k = langKey(lang);
  if (Array.isArray(m[k]) && m[k].includes(id)) return k;
  if (Array.isArray(m.en) && m.en.includes(id)) return "en";
  return null;
}
export async function hasClip(lang, id) {
  return Boolean(await clipLang(lang, id));
}

const decoded = new Map(); // url -> Promise<AudioBuffer | null>
function decodeClip(url) {
  if (!decoded.has(url)) {
    decoded.set(
      url,
      (async () => {
        try {
          if (!audioCtx) return null;
          const r = await fetch(url);
          if (!r.ok) return null;
          const data = await r.arrayBuffer();
          const buf = await new Promise((res, rej) => {
            const p = audioCtx.decodeAudioData(data, res, rej);
            if (p && p.then) p.then(res, rej);
          });
          if (buf) buf.__clip = url;
          return buf || null;
        } catch {
          return null;
        }
      })().then((b) => {
        if (!b) decoded.delete(url); // not cached when it failed, so a later try can work
        return b;
      })
    );
  }
  return decoded.get(url);
}

let playing = null;
let playSeq = 0;
function stopClip() {
  playSeq++; // a clip that is still loading must not start any more
  try {
    if (playing) playing.stop();
  } catch {
    /* already stopped */
  }
  playing = null;
}

// plays the clip; resolves true when the clip is (or was about to be) played, false when there is none or it failed (then speak the text)
// onEnd (optional) fires once the clip finished playing — used by the voice onboarding to open the microphone right after.
export async function playClip(lang, id, onEnd = null) {
  stopClip();
  const my = playSeq;
  try {
    const k = await clipLang(lang, id);
    if (!audioCtx || !k) return false;
    // Nach der Autoplay-Freigabe kann der Kontext noch einen Moment "suspended" sein
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }
    const buf = await decodeClip(clipUrl(k, id));
    if (!buf) return false;
    if (my !== playSeq) return true; // a newer announcement took over while this one was loading
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    playing = src;
    src.onended = () => {
      if (playing === src) playing = null;
      if (onEnd && my === playSeq) onEnd();
    };
    return true;
  } catch {
    return false;
  }
}

// get the next clips ready (download and decode) so they start the moment they are needed
export function preloadClips(lang, ids) {
  ids.forEach((id) => {
    clipLang(lang, id)
      .then((k) => (k ? decodeClip(clipUrl(k, id)) : null))
      .catch(() => {});
  });
}
// only warm the download cache (before any tap, when sound is not unlocked yet)
export function warmClips(lang, ids) {
  ids.forEach((id) => {
    clipLang(lang, id)
      .then((k) => (k ? fetch(clipUrl(k, id)).catch(() => {}) : null))
      .catch(() => {});
  });
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

// Ist die Tonausgabe wirklich freigeschaltet? (Autoplay-Sperre: erst nach einer Berührung)
export function audioReady() {
  return Boolean(audioCtx && audioCtx.state === "running");
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
