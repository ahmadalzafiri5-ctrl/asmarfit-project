// Fast-food catalog served to the app (GET /api/fastfood/catalog).
//
// Sources, merged at startup:
//   catalog/chains/*.json   one file per chain: { id, name, emoji, color, type, region, src, items: [row, ...] }
//   catalog/import/*.csv    optional extra tables: restaurant,item,item_de,kcal,protein,carbs,fat,category,region,max,weight
// Row format (same as the app's bundled menus): [id, nameDe, nameEn, category, kcal, protein, carbs, fat, max?, weight?]
//
// New chains / items only need a new file here and a redeploy of the backend — the app picks them up on the
// next start of the fast-food screen, no app update needed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CATALOG_DIR = path.join(HERE, "catalog");

export const CATS = ["main", "starter", "salad", "side", "extra", "dessert", "drink"];
const REGIONS = ["EU", "US", "world"];
const SRCS = ["estimate", "dataset", "import"];
const TYPES = ["burger", "chicken", "sandwich", "pizza", "doner", "mexican", "asian", "cafe", "world"];

/* ---------- small helpers ---------- */

// RFC 4180: quoted fields, "" inside quotes is a literal quote, newlines inside quotes allowed
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  const s = String(text || "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

export const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const num = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (s === "" || /^na$/i.test(s)) return NaN;
  return Number(s);
};
const r1 = (x) => Math.round(x * 10) / 10;

// the item name decides the shelf; `saladFlag` is the data set's own flag when it has one
export function inferCategory(name, saladFlag = false) {
  const n = String(name || "").toLowerCase();
  if (saladFlag || /\bsalad\b(?!\s*(sandwich|flatbread|wrap|sub))/.test(n)) return "salad";
  if (/\b(shake|malt|sundae|cone|blizzard|cookie|brownie|pie|cake|churro|cinnamon|twists?|ice cream|parfait|dessert|donut|doughnut|turnover|flan|frosty|mcflurry|float|cheesecake|pudding|banana split|misty)\b/.test(n)) return "dessert";
  if (/\b(soda|cola|coke|sprite|lemonade|iced tea|sweet tea|coffee|latte|mocha|milk|juice|smoothie|slush|freeze|water|punch|refresher|cappuccino|espresso)\b/.test(n)) return "drink";
  if (/\b(mc)?(nuggets?|tenders?|strips?|popcorn|wings?|bites|poppers|fingers)\b/.test(n) && !/\b(sandwich|wrap|burger|basket|dinner|salad|sub)\b/.test(n)) return "starter";
  if (/\b(fries|tots|onion rings|rings|hash browns?|chips|slaw|mashed|beans|rice|cheese curds|breadsticks|mozzarella sticks|sauce|dip|side)\b/.test(n) && !/\b(sandwich|wrap|burger|bowl|burrito|taco)\b/.test(n)) return "side";
  return "main";
}

// how many of an item fit in one order (max) and how much of the "main budget" one unit uses (w)
export function limitsFor(cat, kcal) {
  if (cat !== "main") return {};
  if (kcal <= 150) return { max: 4, w: 0.35 };
  if (kcal <= 250) return { max: 3, w: 0.6 };
  if (kcal <= 350) return { max: 3, w: 0.75 };
  if (kcal <= 650) return {};
  return { max: 1 };
}

// macros and calories must roughly agree, otherwise the row is a typo in the source and we drop it
export function plausible(kcal, p, c, f) {
  if (![kcal, p, c, f].every(Number.isFinite)) return false;
  if (kcal < 0 || kcal > 4000 || p < 0 || c < 0 || f < 0 || p > 300 || c > 500 || f > 300) return false;
  const calc = p * 4 + c * 4 + f * 9;
  return Math.abs(calc - kcal) <= 0.3 * Math.max(kcal, calc) + 45;
}

function cleanRow(r, seen) {
  if (!Array.isArray(r) || r.length < 8) return null;
  const [id0, de, en, cat, kcal, p, c, f, max, w] = r;
  const idBase = slug(id0) || slug(en);
  if (!idBase || typeof de !== "string" || typeof en !== "string" || !CATS.includes(cat)) return null;
  const k = Number(kcal);
  const P = Number(p);
  const C = Number(c);
  const F = Number(f);
  if (![k, P, C, F].every(Number.isFinite) || k < 0 || k > 4000 || P < 0 || C < 0 || F < 0 || P > 300 || C > 500 || F > 300) return null;
  let id = idBase.slice(0, 40);
  for (let n = 2; seen.has(id); n++) id = idBase.slice(0, 36) + "_" + n;
  seen.add(id);
  const out = [id, de.slice(0, 90), en.slice(0, 90), cat, Math.round(k), r1(P), r1(C), r1(F)];
  const M = Number(max);
  const W = Number(w);
  const hasM = Number.isFinite(M) && M >= 1 && M <= 9;
  const hasW = Number.isFinite(W) && W > 0.1 && W <= 2;
  if (hasM || hasW) out.push(hasM ? Math.round(M) : 2); // the weight sits after max, so max needs its default then
  if (hasW) out.push(W);
  return out;
}

export function cleanChain(c) {
  if (!c || typeof c !== "object") return null;
  const id = slug(c.id);
  const name = String(c.name || "").trim().slice(0, 40);
  if (!id || !name || !Array.isArray(c.items)) return null;
  const seen = new Set();
  const items = c.items.map((r) => cleanRow(r, seen)).filter(Boolean);
  if (!items.length) return null;
  return {
    id,
    name,
    emoji: String(c.emoji || "🍽️").slice(0, 8),
    color: /^#[0-9a-f]{6}$/i.test(c.color || "") ? c.color : "#8A8A8A",
    type: TYPES.includes(c.type) ? c.type : "world",
    region: REGIONS.includes(c.region) ? c.region : "world",
    src: SRCS.includes(c.src) ? c.src : "estimate",
    ...(c.generic ? { generic: true } : {}),
    ...(Number.isFinite(c.pos) ? { pos: c.pos } : {}),
    items,
  };
}

/* ---------- csv import ---------- */

export function chainsFromCsv(text, label = "csv") {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const need = ["restaurant", "item", "kcal", "protein", "carbs", "fat"].map(col);
  if (need.some((i) => i < 0)) {
    console.warn("catalog: " + label + " übersprungen (Spalten fehlen)");
    return [];
  }
  const by = new Map();
  for (const r of rows.slice(1)) {
    const g = (n) => (col(n) >= 0 ? (r[col(n)] || "").trim() : "");
    const restaurant = g("restaurant");
    const item = g("item");
    const kcal = num(g("kcal"));
    const p = num(g("protein"));
    const c = num(g("carbs"));
    const f = num(g("fat"));
    if (!restaurant || !item || !plausible(kcal, p, c, f)) continue;
    const cat = CATS.includes(g("category")) ? g("category") : inferCategory(item);
    const lim = limitsFor(cat, kcal);
    const key = slug(restaurant);
    if (!by.has(key)) by.set(key, { id: key, name: restaurant, region: g("region") || "world", src: "import", items: [] });
    const mx = num(g("max"));
    const wt = num(g("weight"));
    by.get(key).items.push([slug(item), g("item_de") || item, item, cat, kcal, p, c, f, Number.isFinite(mx) ? mx : lim.max, Number.isFinite(wt) ? wt : lim.w]);
  }
  return [...by.values()];
}

/* ---------- loading ---------- */

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.warn("catalog: " + path.basename(file) + " nicht lesbar: " + e.message);
    return null;
  }
}

export function loadCatalog(dir = CATALOG_DIR) {
  const chains = new Map();
  const chainsDir = path.join(dir, "chains");
  if (fs.existsSync(chainsDir)) {
    for (const f of fs.readdirSync(chainsDir).filter((x) => x.endsWith(".json")).sort()) {
      const c = cleanChain(readJson(path.join(chainsDir, f)));
      if (c) chains.set(c.id, c);
      else console.warn("catalog: " + f + " ungültig, übersprungen");
    }
  }
  const importDir = path.join(dir, "import");
  if (fs.existsSync(importDir)) {
    for (const f of fs.readdirSync(importDir).filter((x) => x.endsWith(".csv")).sort()) {
      let text = "";
      try {
        text = fs.readFileSync(path.join(importDir, f), "utf8");
      } catch {
        continue;
      }
      for (const raw of chainsFromCsv(text, f)) {
        const hit = chains.get(raw.id) || [...chains.values()].find((c) => slug(c.name) === raw.id);
        if (hit) {
          const names = new Set(hit.items.map((r) => r[2].toLowerCase()));
          const ids = new Set(hit.items.map((r) => r[0]));
          const add = cleanChain({ ...hit, items: raw.items.filter((r) => !names.has(r[2].toLowerCase())) });
          for (const r of add ? add.items : []) {
            let id = r[0];
            for (let n = 2; ids.has(id); n++) id = r[0].slice(0, 36) + "_" + n;
            ids.add(id);
            hit.items.push([id, ...r.slice(1)]);
          }
        } else {
          const c = cleanChain(raw);
          if (c) chains.set(c.id, c);
        }
      }
    }
  }
  // Europe first, then the US, then world cuisines; inside a region by the "pos" hint (popularity), then by name
  const rank = (c) => REGIONS.indexOf(c.region);
  const list = [...chains.values()].sort((a, b) => rank(a) - rank(b) || (a.pos ?? 999) - (b.pos ?? 999) || a.name.localeCompare(b.name));
  const body = JSON.stringify(list);
  return {
    version: crypto.createHash("sha1").update(body).digest("hex").slice(0, 12),
    chains: list,
    counts: { chains: list.length, items: list.reduce((s, c) => s + c.items.length, 0) },
  };
}
