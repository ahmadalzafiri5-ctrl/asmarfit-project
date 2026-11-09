// Sofort-Benachrichtigung an den Betreiber (App-Inhaber) bei neuem Nutzer, neuem Abo, KI-Paket-Kauf.
// Kanäle (alle optional, jeder nur bei gesetzten Variablen; es gehen alle konfigurierten gleichzeitig raus):
//   Telegram   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   (Bot-Nachricht aufs Handy — der schnellste Weg)
//   E-Mail     RESEND_API_KEY + ADMIN_EMAIL            (Resend, optional NOTIFY_FROM als Absender)
//   Webhook    ADMIN_NOTIFY_URL                        (POST JSON {kind, text, fields, at}, z.B. Slack/Discord/Zapier)
// Für Tests: TELEGRAM_API_BASE / RESEND_API_BASE zeigen auf einen Stub-Server.
//
// Fire-and-forget: notifyAdmin() wartet nie auf die Antwort des Nutzers hinaus, wirft nie und loggt
// Fehler nur mit Präfix "notify:". Timeout 5 s pro Kanal. In den Nachrichten stehen keine Passwörter,
// Hashes, Kauf-Token oder Schlüssel — nur Nutzer-Nr., Name, E-Mail, Plan, Laufzeit, Quelle.

const TIMEOUT_MS = 5000;
const env = (k) => String(process.env[k] || "").trim();

function config() {
  return {
    tgToken: env("TELEGRAM_BOT_TOKEN"),
    tgChat: env("TELEGRAM_CHAT_ID"),
    tgBase: (env("TELEGRAM_API_BASE") || "https://api.telegram.org").replace(/\/$/, ""),
    resendKey: env("RESEND_API_KEY"),
    adminEmail: env("ADMIN_EMAIL"),
    resendBase: (env("RESEND_API_BASE") || "https://api.resend.com").replace(/\/$/, ""),
    from: env("NOTIFY_FROM") || "ASFIT <onboarding@resend.dev>",
    webhook: env("ADMIN_NOTIFY_URL"),
  };
}

// Mindestens ein Kanal eingerichtet?
export function notifyEnabled() {
  const c = config();
  return Boolean((c.tgToken && c.tgChat) || (c.resendKey && c.adminEmail) || c.webhook);
}

const fmtDate = (v) => {
  if (!v) return "";
  const t = typeof v === "number" ? v : new Date(v).getTime();
  return Number.isFinite(t) && t > 0 ? new Date(t).toISOString().slice(0, 10) : String(v);
};
const who = (f) => {
  const parts = [];
  if (f.id != null) parts.push("Nr. " + f.id);
  if (f.email) parts.push(f.email);
  return parts.join(", ");
};

// Kurzer deutscher Text je Ereignis; unbekannte Ereignisse bekommen eine neutrale Zeile.
export function buildMessage(kind, fields = {}) {
  const f = fields || {};
  if (kind === "user_new") {
    const name = f.name ? f.name + " " : "";
    const mail = f.email ? "(" + f.email + ")" : "";
    const via = f.provider ? ", via " + f.provider : "";
    return { subject: "ASFIT: Neuer Nutzer", text: ("🆕 Neuer Nutzer: " + name + mail).trim() + via + (f.id != null ? " — Nr. " + f.id : "") };
  }
  if (kind === "premium_new") {
    const until = f.until ? " bis " + fmtDate(f.until) : "";
    const trial = f.trial ? " (Gratis-Testphase)" : "";
    const src = f.source ? ", Quelle " + f.source : "";
    return { subject: "ASFIT: Neues Abo" + trial, text: "💎 Neues Abo: " + (f.plan || "premium") + until + trial + " — user " + who(f) + src };
  }
  if (kind === "pack_new") {
    const src = f.source ? ", Quelle " + f.source : "";
    return { subject: "ASFIT: KI-Paket gekauft", text: "🧩 KI-Paket gekauft: user " + who(f) + src };
  }
  return { subject: "ASFIT: " + kind, text: "ℹ️ " + kind + (Object.keys(f).length ? " " + JSON.stringify(f) : "") };
}

async function postJson(url, body, headers = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200));
    return true;
  } finally {
    clearTimeout(timer);
  }
}

// Schickt die Nachricht an alle eingerichteten Kanäle. Liefert { sent: [...], failed: [...] } (für Tests);
// wirft nie. Die Aufrufer warten in der Regel nicht darauf (kein await) — die Antwort an den Nutzer geht sofort raus.
export async function notifyAdmin(kind, fields = {}) {
  const c = config();
  const { subject, text } = buildMessage(kind, fields);
  const jobs = [];
  if (c.tgToken && c.tgChat) {
    jobs.push(["telegram", postJson(c.tgBase + "/bot" + c.tgToken + "/sendMessage", { chat_id: c.tgChat, text, disable_web_page_preview: true })]);
  }
  if (c.resendKey && c.adminEmail) {
    jobs.push(["email", postJson(c.resendBase + "/emails", { from: c.from, to: [c.adminEmail], subject, text }, { authorization: "Bearer " + c.resendKey })]);
  }
  if (c.webhook) {
    jobs.push(["webhook", postJson(c.webhook, { kind, text, fields, at: new Date().toISOString() })]);
  }
  const out = { sent: [], failed: [] };
  if (!jobs.length) return out;
  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  results.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status === "fulfilled") out.sent.push(name);
    else {
      out.failed.push(name);
      // nie den Token aus der URL mitloggen
      console.error("notify:", name, kind, String((r.reason && r.reason.message) || r.reason).replace(/bot[^/\s]+/g, "bot***"));
    }
  });
  return out;
}
