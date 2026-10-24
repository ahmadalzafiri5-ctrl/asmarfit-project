// Konto-System für ASFIT: E-Mail-Registrierung/-Login plus "Weiter mit Google/Apple".
// Postgres (Render, DATABASE_URL) hält nur das Nötigste: E-Mail, Name, Passwort-Hash,
// Premium-Status. Die Fitness-Daten bleiben weiterhin lokal auf dem Gerät.
// JWTs (HS256, Secret in AUTH_JWT_SECRET) laufen 180 Tage; die App erneuert bei jedem Start.
import pg from "pg";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, createRemoteJWKSet, decodeJwt } from "jose";

const DATABASE_URL = process.env.DATABASE_URL || "";
const JWT_SECRET = process.env.AUTH_JWT_SECRET || "";
const GOOGLE_CLIENT_IDS = (process.env.GOOGLE_CLIENT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
const APPLE_CLIENT_IDS = (process.env.APPLE_CLIENT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);

export const authEnabled = () => Boolean(DATABASE_URL && JWT_SECRET);

export const pool = DATABASE_URL
  ? new pg.Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes("render.com") ? { rejectUnauthorized: false } : undefined, max: 5 })
  : null;

export async function initAuthDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    pw_hash TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    google_sub TEXT UNIQUE,
    apple_sub TEXT UNIQUE,
    premium_plan TEXT,
    premium_until TIMESTAMPTZ,
    premium_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_customer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  // Google-Play-Kauf-Token des Nutzers (für die erneute Prüfung beim App-Start, siehe playBilling.js)
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS play_token TEXT");
  // Geräte, auf denen die Gratis-Testphase schon einmal lief: verhindert, dass man mit einem
  // neuen Konto auf demselben Gerät noch einmal gratis testet (siehe billing.js).
  await pool.query(`CREATE TABLE IF NOT EXISTS trial_devices (
    device_id TEXT PRIMARY KEY,
    user_id INTEGER,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

const secretKey = () => new TextEncoder().encode(JWT_SECRET);
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 160;

async function signToken(userId) {
  return new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("180d").sign(secretKey());
}

// Der Teil des Nutzers, den die App sehen darf (nie der Passwort-Hash)
function publicUser(row) {
  const until = row.premium_until ? new Date(row.premium_until).getTime() : null;
  const active = Boolean(row.premium_plan && until && until > Date.now());
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    provider: row.provider,
    premium: active ? { plan: row.premium_plan, renews: until, cancelled: row.premium_cancelled } : null,
  };
}

async function userById(id) {
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
  return r.rows[0] || null;
}

// Bearer-Token prüfen; hängt req.userId an. Für Routen, die ein Konto verlangen.
export async function requireAuth(req, res, next) {
  try {
    if (!authEnabled()) return res.status(503).json({ error: "auth_disabled" });
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!m) return res.status(401).json({ error: "no_token" });
    const { payload } = await jwtVerify(m[1], secretKey(), { algorithms: ["HS256"] });
    req.userId = Number(payload.uid);
    if (!req.userId) return res.status(401).json({ error: "bad_token" });
    next();
  } catch {
    res.status(401).json({ error: "bad_token" });
  }
}

// Einfache Bremse gegen Passwort-Raten: pro IP höchstens 20 Auth-Versuche je 10 Minuten
const attempts = new Map();
function tooMany(ip) {
  const now = Date.now();
  const a = attempts.get(ip) || [];
  const fresh = a.filter((t) => now - t < 10 * 60 * 1000);
  fresh.push(now);
  attempts.set(ip, fresh);
  if (attempts.size > 5000) attempts.clear(); // Speicher-Schutz
  return fresh.length > 20;
}

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export function mountAuth(app) {
  // Was ist konfiguriert? Die App blendet Google/Apple-Knöpfe danach ein oder aus.
  app.get("/api/auth/config", (_req, res) =>
    res.json({ enabled: authEnabled(), google: GOOGLE_CLIENT_IDS.length > 0, apple: APPLE_CLIENT_IDS.length > 0, googleClientId: GOOGLE_CLIENT_IDS[0] || null })
  );

  if (!authEnabled()) return;

  app.post("/api/auth/register", async (req, res) => {
    try {
      if (tooMany(req.ip)) return res.status(429).json({ error: "too_many" });
      const email = normEmail(req.body && req.body.email);
      const password = String((req.body && req.body.password) || "");
      const name = String((req.body && req.body.name) || "").slice(0, 60);
      if (!validEmail(email)) return res.status(400).json({ error: "bad_email" });
      if (password.length < 8 || password.length > 200) return res.status(400).json({ error: "weak_password" });
      const hash = await bcrypt.hash(password, 11);
      const r = await pool.query(
        "INSERT INTO users (email, name, pw_hash, provider) VALUES ($1,$2,$3,'email') ON CONFLICT (email) DO NOTHING RETURNING *",
        [email, name, hash]
      );
      if (!r.rows[0]) return res.status(409).json({ error: "email_taken" });
      res.json({ token: await signToken(r.rows[0].id), user: publicUser(r.rows[0]) });
    } catch (e) {
      console.error("register:", e.message);
      res.status(500).json({ error: "server" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      if (tooMany(req.ip)) return res.status(429).json({ error: "too_many" });
      const email = normEmail(req.body && req.body.email);
      const password = String((req.body && req.body.password) || "");
      const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
      const u = r.rows[0];
      if (!u || !u.pw_hash || !(await bcrypt.compare(password, u.pw_hash))) return res.status(401).json({ error: "wrong_login" });
      res.json({ token: await signToken(u.id), user: publicUser(u) });
    } catch (e) {
      console.error("login:", e.message);
      res.status(500).json({ error: "server" });
    }
  });

  // "Weiter mit Google": die App schickt das ID-Token von Google Identity Services;
  // hier wird Signatur + Zielgruppe (unsere Client-ID) geprüft, dann Konto angelegt/gefunden.
  app.post("/api/auth/google", async (req, res) => {
    try {
      if (!GOOGLE_CLIENT_IDS.length) return res.status(503).json({ error: "not_configured" });
      if (tooMany(req.ip)) return res.status(429).json({ error: "too_many" });
      const idToken = String((req.body && req.body.idToken) || "");
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, { issuer: ["https://accounts.google.com", "accounts.google.com"], audience: GOOGLE_CLIENT_IDS });
      const email = normEmail(payload.email);
      if (!validEmail(email) || payload.email_verified === false) return res.status(401).json({ error: "bad_google" });
      const r = await pool.query(
        `INSERT INTO users (email, name, provider, google_sub) VALUES ($1,$2,'google',$3)
         ON CONFLICT (email) DO UPDATE SET google_sub=COALESCE(users.google_sub, EXCLUDED.google_sub), name=CASE WHEN users.name='' THEN EXCLUDED.name ELSE users.name END
         RETURNING *`,
        [email, String(payload.name || "").slice(0, 60), String(payload.sub)]
      );
      res.json({ token: await signToken(r.rows[0].id), user: publicUser(r.rows[0]) });
    } catch (e) {
      console.error("google:", e.message);
      res.status(401).json({ error: "bad_google" });
    }
  });

  // "Weiter mit Apple": gleiche Idee mit Apples identityToken
  app.post("/api/auth/apple", async (req, res) => {
    try {
      if (!APPLE_CLIENT_IDS.length) return res.status(503).json({ error: "not_configured" });
      if (tooMany(req.ip)) return res.status(429).json({ error: "too_many" });
      const idToken = String((req.body && req.body.identityToken) || "");
      const { payload } = await jwtVerify(idToken, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience: APPLE_CLIENT_IDS });
      // Apple liefert die E-Mail nur beim allerersten Login mit; danach identifiziert "sub"
      const sub = String(payload.sub);
      const email = normEmail(payload.email || (req.body && req.body.email) || "");
      const bySub = await pool.query("SELECT * FROM users WHERE apple_sub=$1", [sub]);
      let u = bySub.rows[0];
      if (!u) {
        if (!validEmail(email)) return res.status(401).json({ error: "bad_apple" });
        const name = String((req.body && req.body.name) || "").slice(0, 60);
        const r = await pool.query(
          `INSERT INTO users (email, name, provider, apple_sub) VALUES ($1,$2,'apple',$3)
           ON CONFLICT (email) DO UPDATE SET apple_sub=COALESCE(users.apple_sub, EXCLUDED.apple_sub)
           RETURNING *`,
          [email, name, sub]
        );
        u = r.rows[0];
      }
      res.json({ token: await signToken(u.id), user: publicUser(u) });
    } catch (e) {
      console.error("apple:", e.message);
      res.status(401).json({ error: "bad_apple" });
    }
  });

  // Aktueller Stand (inkl. Premium vom Server) — die App ruft das beim Start auf
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const u = await userById(req.userId);
    if (!u) return res.status(401).json({ error: "gone" });
    res.json({ user: publicUser(u) });
  });

  // Konto löschen (von Apple fürs Review verlangt; auch sonst richtig so)
  app.delete("/api/auth/account", requireAuth, async (req, res) => {
    await pool.query("DELETE FROM users WHERE id=$1", [req.userId]);
    res.json({ ok: true });
  });
}
