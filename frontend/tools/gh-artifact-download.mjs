// Lädt ein GitHub-Actions-Artefakt herunter — die Anmeldung kommt aus dem lokalen
// Git-Credential-Speicher (git credential fill) und wird NIE ausgegeben.
// Aufruf: node gh-artifact-download.mjs <run-nummer-oder-run-id> <artefakt-name> <zielordner>
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, createWriteStream } from "fs";
import { join } from "path";

const [runArg, artName, outDir] = process.argv.slice(2);
if (!runArg || !artName || !outDir) {
  console.error("Aufruf: node gh-artifact-download.mjs <run-id> <artefakt-name> <zielordner>");
  process.exit(1);
}
const REPO = "ahmadalzafiri5-ctrl/asmarfit-project";

// Token still aus dem Credential-Helper holen (stdout bleibt im Skript)
const cred = execSync("git credential fill", { input: "protocol=https\nhost=github.com\n\n", encoding: "utf8" });
const token = (cred.match(/^password=(.+)$/m) || [])[1];
if (!token) {
  console.error("Kein GitHub-Token im Credential-Speicher gefunden.");
  process.exit(1);
}
const H = { authorization: "Bearer " + token, accept: "application/vnd.github+json", "user-agent": "asfit-tools" };

// Artefakt des Laufs finden
const runId = runArg;
const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs/${runId}/artifacts`, { headers: H });
if (!r.ok) {
  console.error("Artefakt-Liste fehlgeschlagen:", r.status);
  process.exit(1);
}
const arts = (await r.json()).artifacts || [];
const art = arts.find((a) => a.name === artName);
if (!art) {
  console.error("Artefakt nicht gefunden. Vorhanden:", arts.map((a) => a.name).join(", ") || "(keine)");
  process.exit(1);
}
console.log("Artefakt:", art.name, "| Größe:", Math.round(art.size_in_bytes / 1e6) + " MB", "| digest:", art.digest || "(keiner)");

mkdirSync(outDir, { recursive: true });
const zipPath = join(outDir, artName + ".zip");
const dl = await fetch(art.archive_download_url, { headers: { authorization: H.authorization, "user-agent": H["user-agent"] } });
if (!dl.ok) {
  console.error("Download fehlgeschlagen:", dl.status);
  process.exit(1);
}
writeFileSync(zipPath, Buffer.from(await dl.arrayBuffer()));
console.log("Gespeichert:", zipPath);
if (art.digest) console.log("ERWARTETER-DIGEST:", art.digest);
