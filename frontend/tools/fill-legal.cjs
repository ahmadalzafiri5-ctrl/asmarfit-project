// Traegt die Angaben aus frontend/legal.json in Impressum, Datenschutz und Nutzungsbedingungen (DE + EN) ein.
//   node tools/fill-legal.cjs          -> ersetzt die Platzhalter
//   node tools/fill-legal.cjs --check  -> zeigt nur, welche Platzhalter noch offen sind
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
const check = process.argv.includes("--check");
const cfgPath = path.join(ROOT, "legal.json");
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch (e) {
  if (!check) {
    console.log("legal.json fehlt oder ist kein gueltiges JSON: " + cfgPath);
    process.exit(1);
  }
}
const v = (k) => String(cfg[k] || "").trim();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const zipCity = [v("plz"), v("ort")].filter(Boolean).join(" ");
const MAP = {
  "[Vor- und Nachname bzw. Firmenname]": v("name"),
  "[First and last name, or company name]": v("name"),
  "[Name der verantwortlichen Person]": v("verantwortlich") || v("name"),
  "[Name of the responsible person]": v("verantwortlich") || v("name"),
  "[Vollständiger Name]": v("name"),
  "[Full name]": v("name"),
  "[Name/Firma einfügen]": v("name"),
  "[insert name/company]": v("name"),
  "[Straße, Hausnummer]": v("strasse"),
  "[Street, number]": v("strasse"),
  "[PLZ, Ort]": zipCity,
  "[Postal code, city]": zipCity,
  "[PLZ, Ort, Land]": [zipCity, v("land")].filter(Boolean).join(", "),
  "[Postal code, city, country]": [zipCity, v("land_en") || v("land")].filter(Boolean).join(", "),
  "[Land]": v("land"),
  "[Country]": v("land_en") || v("land"),
  "[Land/Kanton einfügen]": v("gerichtsstand") || v("land"),
  "[insert country/state]": v("gerichtsstand_en") || v("land_en") || v("land"),
  "[deine E-Mail-Adresse]": v("email"),
  "[E-Mail-Adresse]": v("email"),
  "[your email address]": v("email"),
  "[Email address]": v("email"),
  "[email address]": v("email"),
  "[Telefonnummer]": v("telefon"),
  "[phone number]": v("telefon"),
  "[DATUM EINTRAGEN]": v("datum"),
  "[ENTER DATE]": v("datum_en") || v("datum"),
};
let open = 0;
for (const f of ["impressum.html", "privacypolicy.html", "terms.html"]) {
  const p = path.join(PUB, f);
  let s = fs.readFileSync(p, "utf8");
  let n = 0;
  for (const [ph, val] of Object.entries(MAP)) {
    if (!s.includes(ph)) continue;
    if (!val) continue;
    s = s.split(ph).join(esc(val));
    n++;
  }
  const left = [...new Set((s.match(/\[[^\]\n]{3,60}\]/g) || []).filter((m) => MAP[m] !== undefined))];
  open += left.length;
  if (!check) {
    fs.writeFileSync(p, s);
    console.log(f + ": " + n + " Platzhalter ersetzt" + (left.length ? ", offen: " + left.join(" ") : ""));
  } else console.log(f + ": " + (left.length ? "offen: " + left.join(" ") : "alles ausgefuellt"));
}
if (open) {
  console.log("\nNoch " + open + " offene Stellen. Felder in legal.json: name, verantwortlich, strasse, plz, ort, land, land_en, gerichtsstand, email, telefon, datum, datum_en");
  process.exit(check ? 2 : 0);
}
console.log("\nAlle Platzhalter sind ausgefuellt.");
