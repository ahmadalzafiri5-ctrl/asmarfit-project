// Liest die Kontaktangaben (E-Mail, Telefon, Website) aus dem Google-Play-Eintrag.
// Legt dafür einen Bearbeitungsentwurf an und verwirft ihn danach wieder (nichts wird geändert).
// Aufruf: PLAY_SA_JSON_FILE=<pfad> node tools/play-contact.mjs
import fs from "fs";
import crypto from "crypto";

const SA = JSON.parse(fs.readFileSync(process.env.PLAY_SA_JSON_FILE, "utf8"));
const PKG = "com.asfit.app";
const b64u = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = b64u({ alg: "RS256", typ: "JWT" }) + "." + b64u({ iss: SA.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(SA.private_key).toString("base64url");
const tok = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + unsigned + "." + sig })).json();
const H = { authorization: "Bearer " + tok.access_token, "content-type": "application/json" };
const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;
const edit = await (await fetch(API + "/edits", { method: "POST", headers: H, body: "{}" })).json();
const details = await (await fetch(API + "/edits/" + edit.id + "/details", { headers: H })).json();
await fetch(API + "/edits/" + edit.id, { method: "DELETE", headers: H });
console.log(JSON.stringify({ contactEmail: details.contactEmail, contactPhone: details.contactPhone, contactWebsite: details.contactWebsite, defaultLanguage: details.defaultLanguage }, null, 1));
