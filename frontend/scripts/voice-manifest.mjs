// Lists the recorded voice clips (public/voice/<lang>/<id>.mp3) in public/voice/manifest.json, so the app knows which lines have a
// recorded voice and which are spoken by the phone's own voice. Runs before every dev start / build; add a clip and it is picked up.
import { readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const root = new URL("../public/voice/", import.meta.url);
const manifest = {};
for (const lang of ["de", "en"]) {
  const dir = new URL(lang + "/", root);
  manifest[lang] = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".mp3"))
        .map((f) => f.slice(0, -4))
        .sort()
    : [];
}
if (!existsSync(root)) mkdirSync(root, { recursive: true });
writeFileSync(new URL("manifest.json", root), JSON.stringify(manifest) + "\n");
console.log("voice manifest: " + manifest.de.length + " de, " + manifest.en.length + " en");
