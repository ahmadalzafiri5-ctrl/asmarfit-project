// Google-Play-Abos für die Android-App: Die App kauft über Google Play Billing und schickt den
// Kauf-Token hierher. Der Server prüft den Token direkt bei Google (androidpublisher-API) und
// schreibt den Premium-Status in die users-Tabelle — die App vertraut also nie sich selbst.
//
// Nötige Umgebungsvariable (erst dann ist die Route aktiv):
//   GOOGLE_PLAY_SA_JSON   kompletter JSON-Schlüssel eines Service-Kontos, das in der Play Console
//                         unter "Nutzer und Berechtigungen" Zugriff auf Finanzdaten der App hat
import { importPKCS8, SignJWT } from "jose";
import { pool, requireAuth, authEnabled } from "./auth.js";

const PKG = process.env.ANDROID_PACKAGE || "com.asfit.app";
let SA = null;
try {
  SA = process.env.GOOGLE_PLAY_SA_JSON ? JSON.parse(process.env.GOOGLE_PLAY_SA_JSON) : null;
} catch {
  console.error("GOOGLE_PLAY_SA_JSON ist kein gültiges JSON — Play-Abos bleiben aus.");
}
export const playBillingEnabled = () => Boolean(SA && SA.client_email && SA.private_key && authEnabled());

// Zugriffstoken für die androidpublisher-API (JWT mit dem Service-Konto signieren, ~50 min gecacht)
let cached = { until: 0, token: "" };
async function googleToken() {
  if (cached.until > Date.now()) return cached.token;
  const key = await importPKCS8(SA.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/androidpublisher" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(SA.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + encodeURIComponent(assertion),
  });
  if (!r.ok) throw new Error("google_oauth_" + r.status);
  const j = await r.json();
  cached = { until: Date.now() + 50 * 60 * 1000, token: j.access_token };
  return cached.token;
}

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + PKG;

// Fragt Google nach dem Abo hinter einem Kauf-Token und schreibt den Status in die users-Tabelle.
// Liefert den Premium-Teil für die App oder null (kein aktives Abo).
async function verifyAndApply(userId, token) {
  const at = await googleToken();
  const r = await fetch(API + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(token), { headers: { authorization: "Bearer " + at } });
  if (r.status === 404 || r.status === 400) return { error: "invalid_token" };
  if (!r.ok) throw new Error("google_" + r.status);
  const sub = await r.json();
  const item = (sub.lineItems || [])[0] || {};
  const active = ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"].includes(sub.subscriptionState);
  const until = item.expiryTime ? new Date(item.expiryTime).getTime() : 0;
  const plan = (item.offerDetails && item.offerDetails.basePlanId) === "yearly" ? "yearly" : "monthly";
  const trial = Boolean(item.offerDetails && item.offerDetails.offerId); // Kauf über das Gratis-Test-Angebot
  const cancelled = Boolean(sub.canceledStateContext) || item.autoRenewingPlan?.autoRenewEnabled === false;

  if (active && until > Date.now()) {
    await pool.query("UPDATE users SET premium_plan=$1, premium_until=to_timestamp($2/1000.0), premium_cancelled=$3, play_token=$4 WHERE id=$5", [plan, until, cancelled, token, userId]);
    // Kauf bestätigen, sonst erstattet Google nach 3 Tagen automatisch zurück
    if (sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      const productId = item.productId || "asfit_premium";
      await fetch(API + "/purchases/subscriptions/" + encodeURIComponent(productId) + "/tokens/" + encodeURIComponent(token) + ":acknowledge", {
        method: "POST",
        headers: { authorization: "Bearer " + at, "content-type": "application/json" },
        body: "{}",
      }).catch((e) => console.error("Play acknowledge:", e.message));
    }
    return { premium: { plan, renews: until, cancelled, trial } };
  }
  await pool.query("UPDATE users SET premium_plan=NULL, premium_until=NULL, premium_cancelled=FALSE WHERE id=$1 AND play_token=$2", [userId, token]);
  return { premium: null };
}

export function mountPlayBilling(app) {
  app.get("/api/billing/play/config", (_req, res) => res.json({ enabled: playBillingEnabled() }));
  if (!playBillingEnabled()) return;

  // Nach dem Kauf in der App: Token prüfen, Premium freischalten
  app.post("/api/billing/play/verify", requireAuth, async (req, res) => {
    const token = String((req.body && req.body.token) || "").replace(/[^\w.-]/g, "").slice(0, 300);
    if (token.length < 20) return res.status(400).json({ error: "bad_token" });
    try {
      const out = await verifyAndApply(req.userId, token);
      if (out.error) return res.status(422).json(out);
      res.json(out);
    } catch (e) {
      console.error("Play verify:", e.message);
      res.status(502).json({ error: "upstream_error" });
    }
  });

  // Beim App-Start: gespeicherten Token erneut prüfen (Verlängerung nach der Testphase,
  // Kündigung, Zahlungsproblem) — so bleibt der Premium-Status in der Datenbank aktuell.
  app.post("/api/billing/play/refresh", requireAuth, async (req, res) => {
    try {
      const r = await pool.query("SELECT play_token FROM users WHERE id=$1", [req.userId]);
      const token = r.rows[0] && r.rows[0].play_token;
      if (!token) return res.json({ premium: undefined });
      const out = await verifyAndApply(req.userId, token);
      res.json(out.error ? { premium: null } : out);
    } catch (e) {
      console.error("Play refresh:", e.message);
      res.status(502).json({ error: "upstream_error" });
    }
  });
}
