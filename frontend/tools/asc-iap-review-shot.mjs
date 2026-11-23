// Lädt den Prüf-Screenshot (Bezahl-Bildschirm) an die Abos und den In-App-Kauf.
// Aufruf: node tools/asc-iap-review-shot.mjs <bild.png>
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { asc } from "./asc.mjs";

const file = process.argv[2];
const buf = fs.readFileSync(file);
const md5 = crypto.createHash("md5").update(buf).digest("hex");
const targets = [
  { kind: "subscriptionAppStoreReviewScreenshots", rel: "subscription", relType: "subscriptions", id: "6837811147", label: "Monats-Abo" },
  { kind: "subscriptionAppStoreReviewScreenshots", rel: "subscription", relType: "subscriptions", id: "6837812247", label: "Jahres-Abo" },
  { kind: "inAppPurchaseAppStoreReviewScreenshots", rel: "inAppPurchaseV2", relType: "inAppPurchases", id: "6837812940", label: "KI-Paket" },
];
for (const t of targets) {
  const c = await asc("POST", "/" + t.kind, { data: { type: t.kind, attributes: { fileName: path.basename(file), fileSize: buf.length }, relationships: { [t.rel]: { data: { type: t.relType, id: t.id } } } } });
  if (c.status >= 300) { console.log(t.label, "Anlegen fehlgeschlagen", c.status, JSON.stringify(c.json.errors).slice(0, 300)); continue; }
  const d = c.json.data;
  for (const op of d.attributes.uploadOperations) {
    const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
    const r = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
    if (!r.ok) throw new Error(t.label + " Upload " + r.status);
  }
  const p = await asc("PATCH", "/" + t.kind + "/" + d.id, { data: { type: t.kind, id: d.id, attributes: { uploaded: true, sourceFileChecksum: md5 } } });
  console.log(t.label, p.status < 300 ? "✓ hochgeladen" : "Abschluss fehlgeschlagen " + p.status + " " + JSON.stringify(p.json.errors).slice(0, 300));
}
