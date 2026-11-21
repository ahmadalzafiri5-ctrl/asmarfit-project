// Baut public/voice/manifest.json aus den tatsaechlich vorhandenen Dateien neu auf —
// damit die App in JEDER Sprache weiss, welche Clips es gibt (statt Geraete-Stimme).
import { readdirSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = new URL("../public/voice/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const out = {};
for (const lang of readdirSync(ROOT)) {
  const dir = join(ROOT, lang);
  if (!statSync(dir).isDirectory()) continue;
  const ids = readdirSync(dir).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)).sort();
  if (ids.length) out[lang] = ids;
}
writeFileSync(join(ROOT, "manifest.json"), JSON.stringify(out, null, 1) + "\n");
console.log("manifest.json:", Object.keys(out).map((l) => l + ":" + out[l].length).join(" "));
