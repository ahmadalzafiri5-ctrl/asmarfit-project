// Stripe-Zahlungen für ASFIT Premium (Web-Version): Checkout mit Karte (Visa,
// Mastercard, ...), Apple Pay und Google Pay; Karten werden beim Abo automatisch
// für die Folgezahlungen gespeichert. "Zahlungsmittel verwalten / Karte speichern"
// und "Abo ändern/kündigen" laufen über das Stripe-Kundenportal.
// In den Store-Apps (Android/iOS) läuft Premium stattdessen über Google Play / App Store.
//
// Nötige Umgebungsvariablen (erst dann sind die Routen aktiv):
//   STRIPE_SECRET_KEY        sk_live_... oder sk_test_...
//   STRIPE_PRICE_MONTHLY     price_... (CHF 6.90 / Monat)
//   STRIPE_PRICE_YEARLY      price_... (CHF 49.90 / Jahr)
//   STRIPE_WEBHOOK_SECRET    whsec_... (Webhook-Endpunkt /api/billing/webhook)
//   FRONTEND_URL             z.B. https://asmarfit-project.onrender.com
import Stripe from "stripe";
import { pool, requireAuth, authEnabled } from "./auth.js";

const KEY = process.env.STRIPE_SECRET_KEY || "";
const PRICE = { monthly: process.env.STRIPE_PRICE_MONTHLY || "", yearly: process.env.STRIPE_PRICE_YEARLY || "" };
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://asmarfit-project.onrender.com").replace(/\/$/, "");

const stripe = KEY ? new Stripe(KEY) : null;
export const billingEnabled = () => Boolean(stripe && PRICE.monthly && PRICE.yearly && authEnabled());

async function getOrCreateCustomer(userId) {
  const r = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
  const u = r.rows[0];
  if (!u) throw new Error("no_user");
  if (u.stripe_customer) return u.stripe_customer;
  const c = await stripe.customers.create({ email: u.email, name: u.name || undefined, metadata: { asfit_user: String(u.id) } });
  await pool.query("UPDATE users SET stripe_customer=$1 WHERE id=$2", [c.id, u.id]);
  return c.id;
}

// Premium-Status aus einem Stripe-Abo in die users-Tabelle schreiben
async function applySubscription(sub) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items && sub.items.data && sub.items.data[0];
  const priceId = item && item.price && item.price.id;
  const plan = priceId === PRICE.yearly ? "yearly" : "monthly";
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const until = (item && item.current_period_end ? item.current_period_end : sub.current_period_end || 0) * 1000;
  if (active) {
    await pool.query("UPDATE users SET premium_plan=$1, premium_until=to_timestamp($2/1000.0), premium_cancelled=$3 WHERE stripe_customer=$4", [
      plan,
      until,
      Boolean(sub.cancel_at_period_end),
      customer,
    ]);
  } else {
    await pool.query("UPDATE users SET premium_plan=NULL, premium_until=NULL, premium_cancelled=FALSE WHERE stripe_customer=$1", [customer]);
  }
}

// Der Webhook braucht den ROHEN Body (Signaturprüfung) und wird darum in
// server.js VOR express.json() eingehängt.
export function billingWebhook() {
  return async (req, res) => {
    if (!stripe || !WEBHOOK_SECRET) return res.status(503).end();
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], WEBHOOK_SECRET);
    } catch (e) {
      return res.status(400).send("bad signature");
    }
    try {
      if (event.type === "checkout.session.completed") {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await applySubscription(sub);
        }
      } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        await applySubscription(event.data.object);
      }
      res.json({ received: true });
    } catch (e) {
      console.error("webhook:", e.message);
      res.status(500).end();
    }
  };
}

export function mountBilling(app) {
  app.get("/api/billing/config", (_req, res) => res.json({ enabled: billingEnabled() }));
  if (!billingEnabled()) return;

  // Abo abschliessen: Stripe-Checkout (Karte, Apple Pay, Google Pay; Karte wird
  // für die Verlängerung automatisch gespeichert). Erstes Abo: 3 Tage gratis.
  app.post("/api/billing/checkout", requireAuth, async (req, res) => {
    try {
      const plan = req.body && req.body.plan === "monthly" ? "monthly" : "yearly";
      const customer = await getOrCreateCustomer(req.userId);
      // 3 Tage gratis (CHF 0.00 heute) bei beiden Plänen — aber nur beim allerersten
      // Abo dieses Kunden, sonst könnte man die Testphase durch Neuabschluss wiederholen.
      const prev = await stripe.subscriptions.list({ customer, status: "all", limit: 1 });
      const firstSub = prev.data.length === 0;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer,
        line_items: [{ price: PRICE[plan], quantity: 1 }],
        subscription_data: firstSub ? { trial_period_days: 3 } : undefined,
        allow_promotion_codes: true,
        success_url: FRONTEND_URL + "/#billing=success",
        cancel_url: FRONTEND_URL + "/#billing=cancel",
      });
      res.json({ url: session.url });
    } catch (e) {
      console.error("checkout:", e.message);
      res.status(500).json({ error: "server" });
    }
  });

  // Kundenportal: Karte speichern/ändern, Rechnungen, Abo ändern oder kündigen
  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const customer = await getOrCreateCustomer(req.userId);
      const session = await stripe.billingPortal.sessions.create({ customer, return_url: FRONTEND_URL + "/#billing=back" });
      res.json({ url: session.url });
    } catch (e) {
      console.error("portal:", e.message);
      res.status(500).json({ error: "server" });
    }
  });
}
