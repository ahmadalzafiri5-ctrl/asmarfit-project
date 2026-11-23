// Nimmt ein Land aus dem Verkauf: App, Abos und In-App-Kauf (Standard: CHN = Festlandchina).
// Aufruf: node tools/asc-remove-territory.mjs [CHN]
import { asc } from "./asc.mjs";

const T = process.argv[2] || "CHN";
const APP = "6837000916";
const SUBS = ["6837811147", "6837812247"];
const IAP = "6837812940";
const err = (r) => (r.status >= 300 ? " FEHLER " + r.status + " " + JSON.stringify(r.json.errors || r.json).slice(0, 300) : " ok");

// App: Verfügbarkeit je Land über territoryAvailabilities
const av = await asc("GET", `/apps/${APP}/appAvailabilityV2`);
if (av.status >= 300) console.log("App-Verfügbarkeit lesen:" + err(av));
else {
  let next = `/v2/appAvailabilities/${av.json.data.id}/territoryAvailabilities?limit=200&include=territory`;
  let done = false;
  while (next && !done) {
    const page = await asc("GET", next);
    for (const ta of page.json.data) {
      if (ta.relationships.territory.data.id === T) {
        const r = await asc("PATCH", `/territoryAvailabilities/${ta.id}`, { data: { type: "territoryAvailabilities", id: ta.id, attributes: { available: false } } });
        console.log("App ohne " + T + ":" + err(r));
        done = true;
      }
    }
    next = page.json.links && page.json.links.next;
  }
  if (!done) console.log("App: " + T + " nicht in der Liste gefunden");
}

// Alle Länder ausser T
const all = [];
let tn = "/territories?limit=200";
while (tn) {
  const p = await asc("GET", tn);
  all.push(...p.json.data.map((x) => x.id));
  tn = p.json.links && p.json.links.next;
}
const terr = all.filter((id) => id !== T).map((id) => ({ type: "territories", id }));

for (const id of SUBS) {
  const r = await asc("POST", "/subscriptionAvailabilities", { data: { type: "subscriptionAvailabilities", attributes: { availableInNewTerritories: true }, relationships: { subscription: { data: { type: "subscriptions", id } }, availableTerritories: { data: terr } } } });
  console.log("Abo " + id + " ohne " + T + " (" + terr.length + " Länder):" + err(r));
}
const r = await asc("POST", "/inAppPurchaseAvailabilities", { data: { type: "inAppPurchaseAvailabilities", attributes: { availableInNewTerritories: true }, relationships: { inAppPurchase: { data: { type: "inAppPurchases", id: IAP } }, availableTerritories: { data: terr } } } });
console.log("KI-Paket ohne " + T + ":" + err(r));
