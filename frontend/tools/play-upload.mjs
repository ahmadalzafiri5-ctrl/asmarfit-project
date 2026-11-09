// Lädt ein signiertes App-Bundle (.aab) über die Google Play Developer API hoch und setzt es
// als Release-Entwurf auf einen Track. Läuft komplett lokal; der Schlüssel verlässt den Rechner nicht.
//
// Aufruf:  node play-upload.mjs <pfad-zur.aab> <track: internal|production> [versionshinweis]
// Schlüssel: Umgebungsvariable PLAY_SA_JSON_FILE zeigt auf die Service-Konto-JSON-Datei.
// Das Service-Konto braucht in der Play Console die Berechtigungen "Apps in Test-Tracks
// veröffentlichen" (internal) bzw. "Produktionsversionen veröffentlichen" (production).
import fs from "fs";
import crypto from "crypto";

const [aabPath, track = "internal", notesText = ""] = process.argv.slice(2);
const keyFile = process.env.PLAY_SA_JSON_FILE;
const PKG = "com.asfit.app";
if (!aabPath || !fs.existsSync(aabPath)) throw new Error("AAB-Datei fehlt: " + aabPath);
if (!keyFile || !fs.existsSync(keyFile)) throw new Error("PLAY_SA_JSON_FILE zeigt auf keine Datei");
const SA = JSON.parse(fs.readFileSync(keyFile, "utf8"));

// OAuth-Token mit dem Service-Konto holen (RS256-JWT, wie backend/playBilling.js)
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
  if (!r.ok) throw new Error(url.split("?")[0].slice(-60) + " -> " + r.status + " " + text.slice(0, 400));
  return text ? JSON.parse(text) : {};
};

// 1) Edit eröffnen
const edit = await jfetch(API + "/edits", { method: "POST", body: "{}" , headers: { "content-type": "application/json" }});
console.log("Edit:", edit.id);

// 2) Bundle hochladen
const data = fs.readFileSync(aabPath);
console.log("Lade hoch:", aabPath, (data.length / 1e6).toFixed(1), "MB ...");
const bundle = await jfetch(UP + "/edits/" + edit.id + "/bundles?uploadType=media", {
  method: "POST",
  headers: { "content-type": "application/octet-stream" },
  body: data,
});
console.log("Hochgeladen: versionCode", bundle.versionCode);

// 3) Track setzen (Entwurf, vollständiger Rollout bei Freigabe)
const notes = notesText ? [{ language: "de-DE", text: notesText }] : [];
await jfetch(API + "/edits/" + edit.id + "/tracks/" + track, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ track, releases: [{ status: "completed", versionCodes: [String(bundle.versionCode)], releaseNotes: notes }] }),
});
console.log("Track", track, "gesetzt (Rollout: vollständig)");

// 4) Edit einreichen
await jfetch(API + "/edits/" + edit.id + ":commit?changesNotSentForReview=false", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("FERTIG: Release eingereicht auf Track \"" + track + "\".");
