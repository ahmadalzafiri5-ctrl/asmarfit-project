// Weist einen BEREITS hochgeladenen versionCode einem Track zu (ohne erneuten Upload).
// Aufruf: node play-set-track.mjs <versionCode> <track> [versionshinweis]
// Schlüssel: PLAY_SA_JSON_FILE wie bei play-upload.mjs.
import fs from "fs";
import crypto from "crypto";

const [vc, track = "internal", notesText = ""] = process.argv.slice(2);
const keyFile = process.env.PLAY_SA_JSON_FILE;
const PKG = "com.asfit.app";
if (!vc) throw new Error("versionCode fehlt");
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
const jfetch = async (url, opt = {}) => {
  const r = await fetch(url, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(url.split("?")[0].slice(-60) + " -> " + r.status + " " + text.slice(0, 400));
  return text ? JSON.parse(text) : {};
};

const edit = await jfetch(API + "/edits", { method: "POST", body: "{}", headers: { "content-type": "application/json" } });
console.log("Edit:", edit.id);
const notes = notesText ? [{ language: "en-US", text: notesText }] : [];
await jfetch(API + "/edits/" + edit.id + "/tracks/" + track, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ track, releases: [{ status: "completed", versionCodes: [String(vc)], releaseNotes: notes }] }),
});
console.log("Track", track, "->", vc);
await jfetch(API + "/edits/" + edit.id + ":commit?changesNotSentForReview=false", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("FERTIG: versionCode", vc, "auf Track \"" + track + "\" gesetzt.");
