// Erzeugt die Sprach-Clips der Kurz-Workouts mit ElevenLabs (höchste Qualität,
// eleven_multilingual_v2 — EINE natürliche Stimme in allen Sprachen).
//
// Aufruf (im Ordner frontend/):   node tools/make-voice-clips.mjs fr it es tr
//   oder alle 6 Sprachen neu:     node tools/make-voice-clips.mjs de en fr it es tr
// Der ElevenLabs-API-Schlüssel wird beim Start abgefragt (einfügen + Enter),
// er wird NIE gespeichert. Optional andere Stimme: VOICE_ID=<id> davor setzen.
//
// Schreibt public/voice/<lang>/<id>.mp3 und aktualisiert public/voice/manifest.json.
import { createInterface } from "readline";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "voice");
const VOICE_ID = process.env.VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // "Adam" — kräftige, natürliche Trainer-Stimme
const MODEL = "eleven_multilingual_v2";

// Satz-Vorlagen = exakt die Texte, die die App anzeigt/spricht (quickSay* je Sprache)
const T = {
  de: { ready: "Mach dich bereit. Zuerst: {name}", work: "{name}. Los!", rest: "Pause. Als Nächstes: {name}", half: "Halbzeit", done: "Geschafft. Gut gemacht!" },
  en: { ready: "Get ready. First: {name}", work: "{name}. Go!", rest: "Rest. Next: {name}", half: "Halfway", done: "Done. Well done!" },
  fr: { ready: "Prépare-toi. D'abord : {name}", work: "{name}. Go !", rest: "Repos. Suivant : {name}", half: "Mi-parcours", done: "Terminé. Bien joué !" },
  it: { ready: "Preparati. Per primo: {name}", work: "{name}. Via!", rest: "Recupero. Prossimo: {name}", half: "Metà", done: "Fatto. Ben fatto!" },
  es: { ready: "Prepárate. Primero: {name}", work: "{name}. ¡Ya!", rest: "Descanso. Siguiente: {name}", half: "Mitad", done: "Hecho. ¡Bien hecho!" },
  tr: { ready: "Hazırlan. İlk: {name}", work: "{name}. Başla!", rest: "Dinlen. Sıradaki: {name}", half: "Yarısı bitti", done: "Bitti. Aferin!" },
};

// Übungsnamen: Deutsch für de, sonst die englischen Namen (so zeigt es auch die App an)
const NAMES = {
  bench_dip: { de: "Dips an der Bank", en: "Bench Dip" },
  bicycle_crunch: { de: "Fahrrad-Crunch", en: "Bicycle Crunch" },
  burpees: { de: "Burpees", en: "Burpees" },
  crunch: { de: "Crunch", en: "Crunch" },
  diamond_pushup: { de: "Diamant-Liegestütz", en: "Diamond Push-Up" },
  glute_bridge: { de: "Glute Bridge", en: "Glute Bridge" },
  jump_squat: { de: "Sprungkniebeuge", en: "Jump Squat" },
  jumping_jacks: { de: "Hampelmann", en: "Jumping Jacks" },
  lying_leg_raise: { de: "Beinheben liegend", en: "Lying Leg Raise" },
  mountain_climber: { de: "Bergsteiger", en: "Mountain Climber" },
  plank: { de: "Unterarmstütz", en: "Plank" },
  pushup: { de: "Liegestütz", en: "Push-Up" },
  reverse_lunge: { de: "Ausfallschritt rückwärts", en: "Reverse Lunge" },
  side_plank: { de: "Seitstütz", en: "Side Plank" },
  squat: { de: "Kniebeuge", en: "Squat" },
  step_up: { de: "Step-Up", en: "Step-Up" },
  wall_sit: { de: "Wandsitzen", en: "Wall Sit" },
};
const READY_KEYS = ["burpees", "crunch", "jumping_jacks", "squat"]; // erste Übung je Preset

const langs = process.argv.slice(2).filter((l) => T[l]);
if (!langs.length) {
  console.log("Nutzung: node tools/make-voice-clips.mjs fr it es tr   (oder: de en fr it es tr)");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const key = await new Promise((res) => rl.question("ElevenLabs-API-Schluessel einfuegen: ", (a) => res(a.trim())));
rl.close();
if (key.length < 20) {
  console.error("Kein gueltiger Schluessel — Abbruch.");
  process.exit(1);
}

async function tts(text, out) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.35 } }),
  });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text()).slice(0, 200));
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

const manifestPath = join(OUT, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

for (const lang of langs) {
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  const name = (k) => (lang === "de" ? NAMES[k].de : NAMES[k].en);
  const jobs = [
    ...Object.keys(NAMES).flatMap((k) => [
      { id: "work_" + k, text: T[lang].work.replace("{name}", name(k)) },
      { id: "rest_" + k, text: T[lang].rest.replace("{name}", name(k)) },
    ]),
    ...READY_KEYS.map((k) => ({ id: "ready_" + k, text: T[lang].ready.replace("{name}", name(k)) })),
    { id: "half", text: T[lang].half },
    { id: "done", text: T[lang].done },
  ];
  const ids = [];
  for (const j of jobs) {
    const out = join(dir, j.id + ".mp3");
    process.stdout.write(lang + "/" + j.id + " ... ");
    try {
      await tts(j.text, out);
      ids.push(j.id);
      console.log("ok");
    } catch (e) {
      console.log("FEHLER: " + e.message);
    }
    await new Promise((r) => setTimeout(r, 350)); // sanft bleiben (Rate-Limit)
  }
  manifest[lang] = ids.sort();
  writeFileSync(manifestPath, JSON.stringify(manifest));
  console.log(lang + ": " + ids.length + "/" + jobs.length + " Clips fertig");
}
console.log("Manifest aktualisiert:", manifestPath);
