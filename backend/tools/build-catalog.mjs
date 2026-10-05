// One-off / re-runnable generator for backend/catalog/chains/*.json
//   node tools/build-catalog.mjs
// 1. exports the menus bundled in the app (frontend/src/fastfood*.js) — estimates for Europe / Switzerland and the US chains
// 2. converts the public US data set catalog/source/fastfood_calories.csv (8 chains, nutrition tables of the chains,
//    TidyTuesday 2018) — rows whose calories and macros do not add up, or without protein, are dropped
// Afterwards the JSON files are the master data: edit them or drop extra tables into catalog/import/*.csv.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CATALOG_DIR, cleanChain, inferCategory, limitsFor, parseCsv, plausible } from "../catalog.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(HERE, "..", "..", "frontend", "src", "fastfood.js");
const OUT = path.join(CATALOG_DIR, "chains");
fs.mkdirSync(OUT, { recursive: true });

const { CHAINS } = await import(pathToFileURL(FRONT).href);

const EU = new Set(["mcd", "bk", "kfc", "sub", "dom", "ph", "doner"]);
const regionOf = (id) => (EU.has(id) ? "EU" : id.startsWith("g_") ? "world" : "US");

const write = (c) => {
  const clean = cleanChain(c);
  if (!clean) throw new Error("ungültig: " + c.id);
  const { items, ...head } = clean;
  const text = "{\n" + Object.entries(head).map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + ',\n  "items": [\n' + items.map((r) => "    " + JSON.stringify(r)).join(",\n") + "\n  ]\n}\n";
  fs.writeFileSync(path.join(OUT, clean.id + ".json"), text);
  return clean;
};

/* 1. bundled menus */
const bundled = new Map(CHAINS.map((c) => [c.id, c]));
const written = new Map();
CHAINS.forEach((c, i) => {
  written.set(c.id, write({ ...c, pos: i, region: regionOf(c.id), src: "estimate", items: c.items.map((r) => r.map((x) => (x === undefined ? null : x))) }));
});

/* 2. US data set */
const META = {
  Mcdonalds: { id: "mcd_us", name: "McDonald's (USA)", emoji: "🍔", color: "#FFC72C", type: "burger" },
  "Burger King": { id: "bk_us", name: "Burger King (USA)", emoji: "👑", color: "#F5A623", type: "burger" },
  Subway: { id: "sub_us", name: "Subway (USA)", emoji: "🥖", color: "#009743", type: "sandwich" },
  "Taco Bell": { id: "tacobell" },
  "Chick Fil-A": { id: "cfa" },
  Arbys: { id: "arbys" },
  Sonic: { id: "sonic", name: "Sonic Drive-In", emoji: "🥤", color: "#0072CE", type: "burger" },
  "Dairy Queen": { id: "dq", name: "Dairy Queen", emoji: "🍦", color: "#E31837", type: "burger" },
};
const rows = parseCsv(fs.readFileSync(path.join(CATALOG_DIR, "source", "fastfood_calories.csv"), "utf8"));
const head = rows[0].map((h) => h.trim());
const ix = (n) => head.indexOf(n);
const byChain = new Map();
let dropped = 0;
for (const r of rows.slice(1)) {
  const meta = META[r[ix("restaurant")]];
  if (!meta) continue;
  const name = r[ix("item")].replace(/[®™©]/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
  const n = (k) => {
    const v = String(r[ix(k)] ?? "").trim();
    return v === "" || /^na$/i.test(v) ? NaN : Number(v);
  };
  const kcal = n("calories");
  const p = n("protein");
  const c = n("total_carb");
  const f = n("total_fat");
  if (!name || !plausible(kcal, p, c, f)) {
    dropped++;
    continue;
  }
  const cat = inferCategory(name, r[ix("salad")] === "Salad");
  const lim = limitsFor(cat, kcal);
  if (!byChain.has(meta.id)) byChain.set(meta.id, { meta, items: [] });
  byChain.get(meta.id).items.push([name, name, name, cat, kcal, p, c, f, lim.max, lim.w]);
}
for (const { meta, items } of byChain.values()) {
  const old = bundled.get(meta.id); // Taco Bell / Chick-fil-A / Arby's: same chain, now with the full table
  const posOf = (id) => CHAINS.findIndex((x) => x.id === id);
  const pos = old ? posOf(old.id) : meta.id.endsWith("_us") ? posOf(meta.id.replace("_us", "")) + 0.5 : 200 + written.size;
  const dataset = write({ ...(old ? { id: old.id, name: old.name, emoji: old.emoji, color: old.color, type: old.type } : meta), pos, region: "US", src: "dataset", items });
  written.set(dataset.id, dataset);
}

const all = [...written.values()];
console.log("Ketten:", all.length, "Artikel:", all.reduce((s, c) => s + c.items.length, 0), "verworfene Datensatz-Zeilen:", dropped);
for (const c of all.filter((x) => x.src === "dataset")) {
  const cnt = {};
  c.items.forEach((r) => (cnt[r[3]] = (cnt[r[3]] || 0) + 1));
  console.log(" ", c.id.padEnd(9), String(c.items.length).padStart(3), JSON.stringify(cnt));
}
