// Hilfsskript: schreibt alle Workout-Ansagetexte als JSON (texts-workout.json),
// damit der Kokoro-Generator (Python) sie 1:1 aus make-voice-openai.mjs übernimmt.
import { readFileSync, writeFileSync } from "fs";

const srcTxt = readFileSync(new URL("./make-voice-openai.mjs", import.meta.url), "utf8");
const grab = (name) => {
  const m = srcTxt.match(new RegExp("const " + name + " = (\\{[\\s\\S]*?\\n\\}|\\[[^\\]]*\\]);"));
  if (!m) throw new Error(name + " nicht gefunden");
  return new Function("return (" + m[1] + ");")();
};
const T = grab("T");
const NAMES = grab("NAMES");
const READY_KEYS = grab("READY_KEYS");

const out = {};
for (const lang of Object.keys(T)) {
  const name = (k) => NAMES[k][lang] || NAMES[k].en;
  out[lang] = Object.fromEntries([
    ...Object.keys(NAMES).flatMap((k) => [
      ["work_" + k, T[lang].work.replace("{name}", name(k))],
      ["rest_" + k, T[lang].rest.replace("{name}", name(k))],
    ]),
    ...READY_KEYS.map((k) => ["ready_" + k, T[lang].ready.replace("{name}", name(k))]),
    ["half", T[lang].half],
    ["done", T[lang].done],
  ]);
}
writeFileSync(new URL("./texts-workout.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("texts-workout.json:", Object.keys(out).length, "Sprachen,", Object.values(out).reduce((n, o) => n + Object.keys(o).length, 0), "Clips");
