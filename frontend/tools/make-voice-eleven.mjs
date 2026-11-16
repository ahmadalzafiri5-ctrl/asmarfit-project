// Erzeugt die Onboarding-Clips (ob_*) mit ElevenLabs — Stimme "Jonas Falk" in allen 16 Sprachen.
// Schluessel: --clip liest den ElevenLabs-API-Key aus der Zwischenablage (elevenlabs.io → Profil → API Keys → Copy).
// Aufruf:  node tools/make-voice-eleven.mjs --clip [--langs de,en,...]
import { writeFileSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const ROOT = new URL("../public/voice/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const VOICE = "GpMEuRGYD0oLjmn4ptQZ"; // Jonas Falk — Natural, charismatic, young
const MODEL = "eleven_multilingual_v2"; // eine Stimme, 29 Sprachen, stabile Qualität

let key = "";
if (process.argv.includes("--clip")) {
  try {
    key = execSync("powershell -NoProfile -Command Get-Clipboard", { encoding: "utf8" }).trim().split(/\s+/)[0];
  } catch {}
}
if (!key || key.length < 20 || key.startsWith("sk-proj")) {
  console.error("Kein ElevenLabs-Key in der Zwischenablage. elevenlabs.io → Profil → API Keys → Copy, dann neu starten.");
  process.exit(1);
}
console.log("Schluessel uebernommen (..." + key.slice(-4) + ")");

const ALL = ["de", "en", "fr", "it", "es", "tr", "pt", "ru", "pl", "nl", "ar", "hi", "id", "ja", "ko", "zh"];
const flag = process.argv.find((a) => a.startsWith("--langs"));
const LANGS = flag ? (flag.includes("=") ? flag.split("=")[1] : process.argv[process.argv.indexOf(flag) + 1]).split(",") : ALL;

// Die Gespraechszeilen kommen 1:1 aus make-voice-openai.mjs (eine Quelle, keine Abweichungen)
const srcTxt = readFileSync(new URL("./make-voice-openai.mjs", import.meta.url), "utf8");
const obMatch = srcTxt.match(/const OB = \{[\s\S]*?\n\};/);
if (!obMatch) { console.error("OB-Block in make-voice-openai.mjs nicht gefunden."); process.exit(1); }
const OB = new Function(obMatch[0] + " return OB;")();

let okCount = 0;
for (const lang of LANGS) {
  const lines = OB[lang];
  if (!lines) {
    console.error("Unbekannte Sprache:", lang);
    continue;
  }
  for (const [id, text] of Object.entries(lines)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.35, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.07 },
      }),
    });
    if (!r.ok) {
      console.error(lang + "/" + id, "FEHLER", r.status, (await r.text()).slice(0, 180));
      continue;
    }
    writeFileSync(ROOT + lang + "/" + id + ".mp3", Buffer.from(await r.arrayBuffer()));
    okCount++;
    console.log(lang + "/" + id, "... ok");
  }
  console.log("—", lang, "fertig");
}
console.log("FERTIG:", okCount, "Clips erzeugt (Stimme: Jonas Falk).");
