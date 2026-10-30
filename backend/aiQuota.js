// Monatliches KI-Kontingent pro Konto (im Premium-Abo inklusive) und zusätzliche KI-Pakete zum Nachkaufen.
// Jede KI-Route zählt hier mit (Coach, Foto-Scan, Rezepte, Wochenplan, Prognose). Ist das Monatskontingent
// aufgebraucht, wird Guthaben aus gekauften Paketen verbraucht; ist auch das leer, antwortet die Route mit
// 429 { error: "ai_quota" } und die App bietet das Paket an.
//
// Speicher: Postgres (users-Datenbank) für Konten; ohne Datenbank oder ohne Token zählt ein Map im Prozess.
// Umgebungsvariablen (alle optional):
//   AI_QUOTA_JSON          z.B. {"coach":60,"photo":40,"recipe":10,"plan":4,"potential":2}
//   AI_PACK_PRODUCT        Produkt-ID des Pakets in Play/Stripe (Standard asfit_ai_pack)
//   AI_PACK_CHF            Anzeigepreis (Standard 2.90)
//   AI_PACK_DAYS           Gültigkeit eines Pakets in Tagen (Standard 60)
//   AI_PACK_CREDITS_JSON   Inhalt eines Pakets, z.B. {"coach":100,"photo":50,"recipe":10,"plan":2,"potential":1}
//   AI_PACK_DEV=1          Test-Route POST /api/ai/pack/dev schaltet ein Paket ohne Kauf frei (nie in Produktion)
import { pool, authEnabled, optionalUserId } from "./auth.js";

export const AI_KINDS = ["coach", "photo", "recipe", "plan", "potential"];
const parseJson = (s, fallback) => {
  if (!s) return fallback;
  try {
    return { ...fallback, ...JSON.parse(s) };
  } catch {
    console.error("KI-Kontingent: ungültiges JSON in der Umgebung, Standardwerte bleiben");
    return fallback;
  }
};
export const AI_QUOTA = parseJson(process.env.AI_QUOTA_JSON, { coach: 60, photo: 40, recipe: 10, plan: 4, potential: 2 });
export const AI_PACK = {
  id: process.env.AI_PACK_PRODUCT || "asfit_ai_pack",
  chf: process.env.AI_PACK_CHF || "2.90",
  days: Number(process.env.AI_PACK_DAYS) || 60,
  credits: parseJson(process.env.AI_PACK_CREDITS_JSON, { coach: 100, photo: 50, recipe: 10, plan: 2, potential: 1 }),
};
export const monthKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 7);

// Prozess-Speicher: Schlüssel -> { month, used: {kind: n}, packs: [{ref, source, boughtAt, expiresAt, credits}] }
const mem = new Map();
function memEntry(key, now) {
  let e = mem.get(key);
  if (!e || e.month !== monthKey(now)) {
    e = { month: monthKey(now), used: {}, packs: (e && e.packs) || [] };
    mem.set(key, e);
  }
  if (mem.size > 20000) mem.clear(); // Speicher-Schutz
  return e;
}
const useDb = (key) => authEnabled() && key.startsWith("u:");

export async function initAiQuotaDb() {
  if (!authEnabled()) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_usage (
    user_key TEXT NOT NULL,
    month TEXT NOT NULL,
    kind TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_key, month, kind)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ai_packs (
    id SERIAL PRIMARY KEY,
    user_key TEXT NOT NULL,
    ref TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    bought_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    credits JSONB NOT NULL
  )`);
  await pool.query("CREATE INDEX IF NOT EXISTS ai_packs_user ON ai_packs (user_key)");
}

async function loadUsed(key, now) {
  if (useDb(key)) {
    const r = await pool.query("SELECT kind, n FROM ai_usage WHERE user_key=$1 AND month=$2", [key, monthKey(now)]);
    const used = {};
    r.rows.forEach((x) => (used[x.kind] = Number(x.n) || 0));
    return used;
  }
  return { ...memEntry(key, now).used };
}
async function loadPacks(key, now) {
  if (useDb(key)) {
    const r = await pool.query("SELECT id, ref, source, bought_at, expires_at, credits FROM ai_packs WHERE user_key=$1 AND expires_at > to_timestamp($2/1000.0) ORDER BY bought_at", [key, now]);
    return r.rows.map((p) => ({ id: p.id, ref: p.ref, source: p.source, boughtAt: new Date(p.bought_at).getTime(), expiresAt: new Date(p.expires_at).getTime(), credits: p.credits || {} }));
  }
  return memEntry(key, now).packs.filter((p) => p.expiresAt > now);
}
async function bumpUsed(key, kind, now) {
  if (useDb(key)) {
    await pool.query("INSERT INTO ai_usage (user_key, month, kind, n) VALUES ($1,$2,$3,1) ON CONFLICT (user_key, month, kind) DO UPDATE SET n = ai_usage.n + 1", [key, monthKey(now), kind]);
  } else {
    const e = memEntry(key, now);
    e.used[kind] = (e.used[kind] || 0) + 1;
  }
}
async function spendCredit(key, pack, kind) {
  const credits = { ...pack.credits, [kind]: (Number(pack.credits[kind]) || 0) - 1 };
  if (useDb(key)) await pool.query("UPDATE ai_packs SET credits=$1 WHERE id=$2", [JSON.stringify(credits), pack.id]);
  else pack.credits = credits;
}

export const creditsOf = (packs) => Object.fromEntries(AI_KINDS.map((k) => [k, packs.reduce((s, p) => s + Math.max(0, Number(p.credits[k]) || 0), 0)]));

// Stand für die App: genutzt / inklusive / Guthaben, plus das Paket-Angebot
export async function getUsage(key, now = Date.now()) {
  const [used, packs] = await Promise.all([loadUsed(key, now), loadPacks(key, now)]);
  return {
    month: monthKey(now),
    used: Object.fromEntries(AI_KINDS.map((k) => [k, used[k] || 0])),
    quota: AI_QUOTA,
    credits: creditsOf(packs),
    packs: packs.map((p) => ({ expiresAt: p.expiresAt, credits: p.credits, source: p.source })),
    pack: AI_PACK,
  };
}

// Eine Nutzung verbuchen: erst das Monatskontingent, dann Guthaben aus dem ältesten Paket.
// Rückgabe { ok, used, limit, credits, fromPack }.
export async function consume(key, kind, now = Date.now()) {
  if (!(kind in AI_QUOTA)) return { ok: true, used: 0, limit: 0, credits: {} }; // ohne Kontingent: unbegrenzt
  const limit = Math.max(0, Number(AI_QUOTA[kind]) || 0);
  const used = (await loadUsed(key, now))[kind] || 0;
  if (used < limit) {
    await bumpUsed(key, kind, now);
    return { ok: true, used: used + 1, limit, credits: creditsOf(await loadPacks(key, now)), fromPack: false };
  }
  const packs = await loadPacks(key, now);
  const pack = packs.find((p) => (Number(p.credits[kind]) || 0) > 0);
  if (!pack) return { ok: false, used, limit, credits: creditsOf(packs) };
  await spendCredit(key, pack, kind);
  return { ok: true, used, limit, credits: creditsOf(await loadPacks(key, now)), fromPack: true };
}

// Ein gekauftes Paket gutschreiben; ref (Bestellnummer / Session) macht den Aufruf wiederholbar ohne Doppelgutschrift
export async function grantPack(key, ref, source, now = Date.now()) {
  const expiresAt = now + AI_PACK.days * 86400000;
  if (useDb(key)) {
    await pool.query("INSERT INTO ai_packs (user_key, ref, source, bought_at, expires_at, credits) VALUES ($1,$2,$3,to_timestamp($4/1000.0),to_timestamp($5/1000.0),$6) ON CONFLICT (ref) DO NOTHING", [
      key,
      ref,
      source,
      now,
      expiresAt,
      JSON.stringify(AI_PACK.credits),
    ]);
  } else {
    const e = memEntry(key, now);
    if (!e.packs.some((p) => p.ref === ref)) e.packs.push({ ref, source, boughtAt: now, expiresAt, credits: { ...AI_PACK.credits } });
  }
  return getUsage(key, now);
}

// Konto aus dem Token, sonst die IP (Vorschau ohne Konto, Tests)
export async function quotaKey(req) {
  const uid = await optionalUserId(req);
  return uid ? "u:" + uid : "ip:" + (req.ip || "?");
}

// Express-Middleware vor einer KI-Route. enabled() = false (z. B. kein API-Schlüssel) lässt die Route ohne Zählung durch,
// damit der eigentliche Fehler (503 not_configured) sichtbar bleibt.
export function aiQuotaGate(kind, enabled = () => true) {
  return async (req, res, next) => {
    if (!enabled()) return next();
    try {
      const key = await quotaKey(req);
      const r = await consume(key, kind);
      if (!r.ok) return res.status(429).json({ error: "ai_quota", kind, used: r.used, limit: r.limit, credits: r.credits, pack: AI_PACK });
      req.aiQuota = { key, kind, ...r };
      next();
    } catch (e) {
      console.error("KI-Kontingent:", e.message);
      next(); // das Zählwerk darf die Funktion nie blockieren
    }
  };
}

export function mountAiQuota(app) {
  app.get("/api/ai/usage", async (req, res) => {
    try {
      res.json(await getUsage(await quotaKey(req)));
    } catch (e) {
      console.error("KI-Kontingent Stand:", e.message);
      res.status(500).json({ error: "server" });
    }
  });
  if (process.env.AI_PACK_DEV === "1") {
    app.post("/api/ai/pack/dev", async (req, res) => {
      try {
        res.json(await grantPack(await quotaKey(req), "dev:" + Date.now() + ":" + Math.random().toString(36).slice(2, 8), "dev"));
      } catch (e) {
        res.status(500).json({ error: "server" });
      }
    });
  }
}
