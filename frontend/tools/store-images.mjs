// Ersetzt die Play-Store-Telefon-Screenshots (en-US) über die Developer API.
// Aufruf: PLAY_SA_JSON_FILE=<sa.json> node store-images.mjs <ordner> <datei1.png> <datei2.png> ...
// Reihenfolge der Dateien = Reihenfolge im Store.
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PKG = "com.asfit.app";
const [dir, ...files] = process.argv.slice(2);
if (!dir || files.length === 0) throw new Error("Aufruf: node store-images.mjs <ordner> <datei...>");

const keyFile = process.env.PLAY_SA_JSON_FILE;
if (!keyFile || !fs.existsSync(keyFile)) throw new Error("PLAY_SA_JSON_FILE zeigt auf keine Datei");
const SA = JSON.parse(fs.readFileSync(keyFile, "utf8"));

const b64u = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = b64u({ alg: "RS256", typ: "JWT" }) + "." + b64u({
  iss: SA.client_email,
  scope: "https://www.googleapis.com/auth/androidpublisher",
  aud: "https://oauth2.googleapis.com/token",
  iat: now,
  exp: now + 3600,
});
const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(SA.private_key).toString("base64url");
const tr = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + unsigned + "." + sig,
});
if (!tr.ok) throw new Error("OAuth: " + tr.status + " " + (await tr.text()));
const { access_token } = await tr.json();
const H = { authorization: "Bearer " + access_token };
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const UP = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/" + PKG;
const jfetch = async (url, opt = {}) => {
  const r = await fetch(url, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(url.split("?")[0].slice(-70) + " -> " + r.status + " " + text.slice(0, 300));
  return text ? JSON.parse(text) : {};
};

const edit = await jfetch(API + "/edits", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
console.log("Edit:", edit.id);

await jfetch(API + "/edits/" + edit.id + "/listings/en-US/phoneScreenshots", { method: "DELETE" });
console.log("Alte Telefon-Screenshots entfernt");

for (const f of files) {
  const p = path.join(dir, f);
  const img = fs.readFileSync(p);
  const r = await jfetch(UP + "/edits/" + edit.id + "/listings/en-US/phoneScreenshots?uploadType=media", {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: img,
  });
  console.log("Hochgeladen:", f, "->", r.image && r.image.id ? r.image.id.slice(0, 12) : "ok");
}

await jfetch(API + "/edits/" + edit.id + ":commit?changesNotSentForReview=false", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("FERTIG: Store-Screenshots (en-US) aktualisiert und eingereicht.");
