// Erzeugt die Sprach-Clips mit ElevenLabs — Stimme "Jonas Falk" (natürlich, realistisch).
// Ersetzt die vorhandenen Dateien in public/voice/<sprache>/ 1:1, die App braucht keine Änderung.
//
// Schluessel: --clip liest den ElevenLabs-API-Key aus der Zwischenablage (elevenlabs.io → Profil → API Keys → Copy).
// Aufruf:  node tools/make-voice-eleven.mjs --clip                 alle Clips, alle 16 Sprachen
//          node tools/make-voice-eleven.mjs --clip --wk            nur Workout-Ansagen (ready/work/rest/half/done)
//          node tools/make-voice-eleven.mjs --clip --ob            nur Onboarding-Clips (ob_*)
//          node tools/make-voice-eleven.mjs --clip --langs de,en   nur diese Sprachen
//          node tools/make-voice-eleven.mjs --clip --only work_squat --langs de   ein einzelner Clip
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
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
const onlyFlag = process.argv.indexOf("--only");
const ONLY = onlyFlag > -1 ? process.argv[onlyFlag + 1] : null;

// Alle Texte kommen 1:1 aus make-voice-openai.mjs (eine Quelle, keine Abweichungen)
const srcTxt = readFileSync(new URL("./make-voice-openai.mjs", import.meta.url), "utf8");
const grab = (name) => {
  const m = srcTxt.match(new RegExp("const " + name + " = (\\{[\\s\\S]*?\\n\\}|\\[[^\\]]*\\]);"));
  if (!m) {
    console.error(name + "-Block in make-voice-openai.mjs nicht gefunden.");
    process.exit(1);
  }
  return new Function("return (" + m[1] + ");")();
};
const OB = grab("OB");
const T = grab("T");
const NAMES = grab("NAMES");
const READY_KEYS = grab("READY_KEYS");

// Grobe Kostenschau vorab (multilingual v2 ≈ 1 Credit pro Zeichen)
let chars = 0;

let okCount = 0;
let failCount = 0;
for (const lang of LANGS) {
  if (!T[lang]) {
    console.error("Unbekannte Sprache:", lang);
    continue;
  }
  mkdirSync(join(ROOT, lang), { recursive: true });
  const name = (k) => NAMES[k][lang] || NAMES[k].en;
  let jobs = [
    ...Object.keys(NAMES).flatMap((k) => [
      { id: "work_" + k, text: T[lang].work.replace("{name}", name(k)) },
      { id: "rest_" + k, text: T[lang].rest.replace("{name}", name(k)) },
    ]),
    ...READY_KEYS.map((k) => ({ id: "ready_" + k, text: T[lang].ready.replace("{name}", name(k)) })),
    { id: "half", text: T[lang].half },
    { id: "done", text: T[lang].done },
    ...(OB[lang] ? Object.entries(OB[lang]).map(([id, text]) => ({ id, text })) : []),
  ];
  if (ONLY) jobs = jobs.filter((j) => j.id === ONLY);
  if (process.argv.includes("--ob")) jobs = jobs.filter((j) => j.id.startsWith("ob_"));
  if (process.argv.includes("--wk")) jobs = jobs.filter((j) => !j.id.startsWith("ob_"));
  for (const j of jobs) {
    chars += j.text.length;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: j.text,
        model_id: MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.05 },
      }),
    });
    if (!r.ok) {
      failCount++;
      console.error(lang + "/" + j.id, "FEHLER", r.status, (await r.text()).slice(0, 180));
      if (r.status === 401 || r.status === 402) process.exit(1); // Key falsch oder Guthaben leer: sofort stoppen
      continue;
    }
    writeFileSync(join(ROOT, lang, j.id + ".mp3"), Buffer.from(await r.arrayBuffer()));
    okCount++;
    console.log(lang + "/" + j.id, "... ok");
  }
  console.log("—", lang, "fertig");
}
console.log("FERTIG:", okCount, "Clips erzeugt, " + failCount + " Fehler (Stimme: Jonas Falk, ~" + chars + " Zeichen/Credits).");
