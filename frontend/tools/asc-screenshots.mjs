// Lädt iPhone-Screenshots über die App Store Connect API in die offene App-Store-Version (en-US).
// Ersetzt vorhandene Bilder desselben Gerätetyps. Schlüssel wird aus der Datei gelesen, nie ausgegeben.
// Aufruf: node tools/asc-screenshots.mjs <ordner-mit-png> [displayType=APP_IPHONE_67]
import fs from "fs";
import path from "path";
import crypto from "crypto";

const KEY_FILE = "C:/Users/StartKlar/Downloads/asfit-keys/AuthKey_86D3V624UQ.p8";
const KEY_ID = "86D3V624UQ";
const ISSUER = "23fe3417-7673-4b56-a861-bdf3b143af13";
const APP_ID = "6837000916";
const [dir, displayType = "APP_IPHONE_67"] = process.argv.slice(2);

const b64u = (b) => Buffer.from(b).toString("base64url");
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1100, aud: "appstoreconnect-v1" }));
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key: fs.readFileSync(KEY_FILE), dsaEncoding: "ieee-p1363" });
  return head + "." + body + "." + b64u(sig);
}
const API = "https://api.appstoreconnect.apple.com/v1";
async function asc(method, url, body) {
  const r = await fetch(url.startsWith("http") ? url : API + url, {
    method,
    headers: { authorization: "Bearer " + jwt(), "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(method + " " + url + " -> " + r.status + " " + t.slice(0, 400));
  return t ? JSON.parse(t) : {};
}

const versions = await asc("GET", `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`);
const v = versions.data.find((x) => ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"].includes(x.attributes.appStoreState)) || versions.data[0];
console.log("Version:", v.attributes.versionString, v.attributes.appStoreState);
const locs = await asc("GET", `/appStoreVersions/${v.id}/appStoreVersionLocalizations`);
const loc = locs.data.find((l) => l.attributes.locale === "en-US") || locs.data[0];
console.log("Lokalisierung:", loc.attributes.locale);

const sets = await asc("GET", `/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`);
let set = sets.data.find((s) => s.attributes.screenshotDisplayType === displayType);
if (set) {
  const old = await asc("GET", `/appScreenshotSets/${set.id}/appScreenshots?limit=50`);
  for (const s of old.data) await asc("DELETE", `/appScreenshots/${s.id}`);
  console.log("Alte Bilder entfernt:", old.data.length);
} else {
  set = (await asc("POST", "/appScreenshotSets", { data: { type: "appScreenshotSets", attributes: { screenshotDisplayType: displayType }, relationships: { appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: loc.id } } } } })).data;
  console.log("Neuer Satz:", displayType);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  const res = (await asc("POST", "/appScreenshots", { data: { type: "appScreenshots", attributes: { fileName: f, fileSize: buf.length }, relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set.id } } } } })).data;
  for (const op of res.attributes.uploadOperations) {
    const part = buf.subarray(op.offset, op.offset + op.length);
    const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
    const r = await fetch(op.url, { method: op.method, headers, body: part });
    if (!r.ok) throw new Error("Upload-Teil fehlgeschlagen " + r.status);
  }
  const md5 = crypto.createHash("md5").update(buf).digest("hex");
  await asc("PATCH", `/appScreenshots/${res.id}`, { data: { type: "appScreenshots", id: res.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
  console.log("✓", f);
}
console.log("FERTIG:", files.length, "Bilder hochgeladen.");
