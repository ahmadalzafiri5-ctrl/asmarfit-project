// Apple-App-Store-Abos für die iOS-App: Die App kauft über StoreKit (In-App-Kauf) und schickt die
// Transaktions-ID hierher. Der Server fragt die Transaktion direkt bei Apple ab (App Store Server API)
// und schreibt den Premium-Status in die users-Tabelle — die App vertraut also nie sich selbst.
//
// Nötige Umgebungsvariablen (erst dann sind die Routen aktiv):
//   APPLE_IAP_KEY_ID      Schlüssel-ID des In-App-Purchase-Keys (App Store Connect → Nutzer und Zugriff
//                         → Integrationen → In-App-Kauf → Schlüssel erzeugen)
//   APPLE_IAP_ISSUER_ID   Issuer-ID derselben Seite
//   APPLE_IAP_KEY_P8      kompletter Inhalt der .p8-Datei (mehrzeilig, inkl. BEGIN/END-Zeilen)
//   APPLE_BUNDLE_ID       optional, Standard com.asfit.app
//
// Produkt-IDs in App Store Connect: asfit_premium_monthly, asfit_premium_yearly (Abos),
// asfit_ai_pack (Verbrauchsartikel — gleiche ID wie bei Google Play).
import { importPKCS8, SignJWT, decodeJwt } from "jose";
import { pool, requireAuth, authEnabled } from "./auth.js";
import { grantPack, AI_PACK } from "./aiQuota.js";
import { notifyAdmin } from "./notify.js";

const BID = process.env.APPLE_BUNDLE_ID || "com.asfit.app";
const KEY_ID = process.env.APPLE_IAP_KEY_ID || "";
const ISSUER = process.env.APPLE_IAP_ISSUER_ID || "";
const P8 = (process.env.APPLE_IAP_KEY_P8 || "").replace(/\\n/g, "\n");
export const appleBillingEnabled = () => Boolean(KEY_ID && ISSUER && P8 && authEnabled());

// Kurzlebiges ES256-JWT für die App Store Server API (~10 min gecacht)
let cached = { until: 0, token: "" };
async function appleJwt() {
  if (cached.until > Date.now()) return cached.token;
  const key = await importPKCS8(P8, "ES256");
  const jwt = await new SignJWT({ bid: BID })
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID, typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience("appstoreconnect-v1")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
  cached = { until: Date.now() + 10 * 60 * 1000, token: jwt };
  return jwt;
}

// Produktion zuerst, bei "nicht gefunden" die Sandbox (TestFlight-Käufe laufen dort)
const HOSTS = ["https://api.storekit.itunes.apple.com", "https://api.storekit-sandbox.itunes.apple.com"];
async function appleGet(path) {
  const jwt = await appleJwt();
  let last = null;
  for (const host of HOSTS) {
    const r = await fetch(host + path, { headers: { authorization: "Bearer " + jwt } });
    if (r.ok) return r.json();
    last = r;
    if (r.status !== 404) break; // nur "nicht gefunden" rechtfertigt den Sandbox-Versuch
  }
  const txt = last ? await last.text().catch(() => "") : "";
  const err = new Error("apple_" + (last ? last.status : 0) + " " + txt.replace(/\s+/g, " ").slice(0, 300));
  err.status = last ? last.status : 0;
  throw err;
}

// Apples signierte Antworten (JWS) kommen direkt von Apple über TLS — der Inhalt wird hier nur
// entpackt und auf unsere Bundle-ID geprüft.
const claims = (jws) => {
  try {
    return decodeJwt(jws);
  } catch {
    return null;
  }
};

const planOf = (productId) => (/year/i.test(String(productId || "")) ? "yearly" : "monthly");

// Transaktion bei Apple nachschlagen und den Premium-Status in die users-Tabelle schreiben.
async function verifyAndApply(userId, transactionId) {
  let info;
  try {
    info = await appleGet("/inApps/v1/transactions/" + encodeURIComponent(transactionId));
  } catch (e) {
    if (e.status === 404 || e.status === 400 || e.status === 401) return { error: "invalid_transaction" };
    throw e;
  }
  const tx = claims(info && info.signedTransactionInfo);
  if (!tx || tx.bundleId !== BID) return { error: "invalid_transaction" };
  if (tx.type && tx.type !== "Auto-Renewable Subscription") return { error: "not_subscription" };
  const plan = planOf(tx.productId);
  const until = Number(tx.expiresDate) || 0;
  const otid = String(tx.originalTransactionId || transactionId).slice(0, 100);
  const active = !tx.revocationDate && until > Date.now();
  if (active) {
    const before = await pool.query("SELECT id, email, premium_plan FROM users WHERE id=$1", [userId]);
    await pool.query("UPDATE users SET premium_plan=$1, premium_until=to_timestamp($2/1000.0), premium_cancelled=FALSE, apple_otid=$3 WHERE id=$4", [plan, until, otid, userId]);
    const b = before.rows[0];
    if (b && !b.premium_plan) notifyAdmin("premium_new", { id: b.id, email: b.email, plan, until, trial: tx.offerType === 1, source: "apple" });
    return { premium: { plan, renews: until, cancelled: false, trial: tx.offerType === 1 } };
  }
  await pool.query("UPDATE users SET premium_plan=NULL, premium_until=NULL, premium_cancelled=FALSE WHERE id=$1 AND apple_otid=$2", [userId, otid]);
  return { premium: null };
}

// Abo-Status anhand der gespeicherten Original-Transaktion auffrischen (Verlängerung, Kündigung).
async function refreshApple(userId, otid) {
  let st;
  try {
    st = await appleGet("/inApps/v1/subscriptions/" + encodeURIComponent(otid));
  } catch (e) {
    if (e.status === 404 || e.status === 400 || e.status === 401) return { premium: null };
    throw e;
  }
  let best = null;
  for (const group of st.data || []) {
    for (const lt of group.lastTransactions || []) {
      const tx = claims(lt.signedTransactionInfo);
      if (!tx) continue;
      if (!best || Number(tx.expiresDate || 0) > Number(best.tx.expiresDate || 0)) best = { tx, status: lt.status, renewal: claims(lt.signedRenewalInfo) };
    }
  }
  if (!best) return { premium: null };
  const until = Number(best.tx.expiresDate) || 0;
  const activeStates = [1, 4]; // 1 = aktiv, 4 = Kulanzfrist (Zahlungsproblem, Zugang bleibt)
  const active = activeStates.includes(Number(best.status)) && until > Date.now();
  const plan = planOf(best.tx.productId);
  const cancelled = best.renewal ? Number(best.renewal.autoRenewStatus) === 0 : false;
  if (active) {
    await pool.query("UPDATE users SET premium_plan=$1, premium_until=to_timestamp($2/1000.0), premium_cancelled=$3 WHERE id=$4", [plan, until, cancelled, userId]);
    return { premium: { plan, renews: until, cancelled } };
  }
  await pool.query("UPDATE users SET premium_plan=NULL, premium_until=NULL, premium_cancelled=FALSE WHERE id=$1 AND apple_otid=$2", [userId, otid]);
  return { premium: null };
}

export function mountAppleBilling(app) {
  app.get("/api/billing/apple/config", (_req, res) => res.json({ enabled: appleBillingEnabled() }));
  if (!appleBillingEnabled()) return;

  // Nach dem Kauf in der App: Transaktion prüfen, Premium freischalten
  app.post("/api/billing/apple/verify", requireAuth, async (req, res) => {
    const txId = String((req.body && req.body.transactionId) || "").replace(/[^\w.-]/g, "").slice(0, 100);
    if (!txId) return res.status(400).json({ error: "bad_transaction" });
    try {
      const out = await verifyAndApply(req.userId, txId);
      if (out.error) return res.status(422).json(out);
      res.json(out);
    } catch (e) {
      console.error("Apple verify:", e.message);
      res.status(502).json({ error: "upstream_error" });
    }
  });

  // KI-Paket (Einmalkauf, verbrauchbar): Transaktion prüfen und Guthaben gutschreiben
  app.post("/api/billing/apple/verify-pack", requireAuth, async (req, res) => {
    const txId = String((req.body && req.body.transactionId) || "").replace(/[^\w.-]/g, "").slice(0, 100);
    if (!txId) return res.status(400).json({ error: "bad_transaction" });
    try {
      let info;
      try {
        info = await appleGet("/inApps/v1/transactions/" + encodeURIComponent(txId));
      } catch (e) {
        if (e.status === 404 || e.status === 400 || e.status === 401) return res.status(422).json({ error: "invalid_transaction" });
        throw e;
      }
      const tx = claims(info && info.signedTransactionInfo);
      if (!tx || tx.bundleId !== BID || tx.revocationDate) return res.status(422).json({ error: "invalid_transaction" });
      if (!/ai_pack/i.test(String(tx.productId || ""))) return res.status(422).json({ error: "wrong_product" });
      // Doppelte Gutschrift verhindert grantPack selbst über die eindeutige Kauf-Referenz
      const usage = await grantPack("u:" + req.userId, "apple:" + (tx.transactionId || txId), "apple");
      pool
        .query("SELECT email FROM users WHERE id=$1", [req.userId])
        .then((q) => notifyAdmin("pack_new", { id: req.userId, email: q.rows[0] && q.rows[0].email, source: "apple" }))
        .catch((e) => console.error("notify:", e.message));
      res.json(usage);
    } catch (e) {
      console.error("Apple verify-pack:", e.message);
      res.status(502).json({ error: "upstream_error" });
    }
  });

  // Beim App-Start: gespeichertes Abo erneut prüfen, damit der Status aktuell bleibt
  app.post("/api/billing/apple/refresh", requireAuth, async (req, res) => {
    try {
      const r = await pool.query("SELECT apple_otid FROM users WHERE id=$1", [req.userId]);
      const otid = r.rows[0] && r.rows[0].apple_otid;
      if (!otid) return res.json({ premium: undefined });
      const out = await refreshApple(req.userId, otid);
      res.json(out);
    } catch (e) {
      console.error("Apple refresh:", e.message);
      res.status(502).json({ error: "upstream_error" });
    }
  });
}
