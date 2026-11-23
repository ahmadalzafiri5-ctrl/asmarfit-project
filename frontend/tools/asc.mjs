// Kleiner Helfer für die App Store Connect API (Admin-Schlüssel CI4 aus der Datei, wird nie ausgegeben).
// Aufruf: node tools/asc.mjs GET /apps/6837000916/appInfos
//         node tools/asc.mjs PATCH /ageRatingDeclarations/<id> '<json-body>'
import fs from "fs";
import crypto from "crypto";

const KEY_FILE = "C:/Users/StartKlar/Downloads/asfit-keys/AuthKey_86D3V624UQ.p8";
const KEY_ID = "86D3V624UQ";
const ISSUER = "23fe3417-7673-4b56-a861-bdf3b143af13";
const b64u = (b) => Buffer.from(b).toString("base64url");
export function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }));
  const body = b64u(JSON.stringify({ iss: ISSUER, iat: now, exp: now + 1100, aud: "appstoreconnect-v1" }));
  const sig = crypto.sign("sha256", Buffer.from(head + "." + body), { key: fs.readFileSync(KEY_FILE), dsaEncoding: "ieee-p1363" });
  return head + "." + body + "." + b64u(sig);
}
export async function asc(method, url, body) {
  const full = url.startsWith("http") ? url : "https://api.appstoreconnect.apple.com" + (url.startsWith("/v") ? url : "/v1" + url);
  const r = await fetch(full, { method, headers: { authorization: "Bearer " + jwt(), "content-type": "application/json" }, body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined });
  const t = await r.text();
  return { status: r.status, json: t ? JSON.parse(t) : {} };
}
if (process.argv[1] && process.argv[1].endsWith("asc.mjs")) {
  const [method, url, body] = process.argv.slice(2);
  const { status, json } = await asc(method, url, body);
  console.log("HTTP", status);
  console.log(JSON.stringify(json, null, 1).slice(0, 6000));
}
