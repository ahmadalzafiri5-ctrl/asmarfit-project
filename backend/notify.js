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

// ---------------------------------------------------------------------------
// Willkommens-E-Mail an den KUNDEN nach der Registrierung (professionell, ASFIT-Branding).
// Läuft nur, wenn RESEND_API_KEY gesetzt ist. Absender: MAIL_FROM (eigene Domain, z. B.
// "ASFIT <no-reply@development-info.org>"), sonst NOTIFY_FROM. Fire-and-forget, wirft nie.
const APP_URL = () => env("FRONTEND_URL") || "https://asmarfit-project.onrender.com";
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.asfit.app";

import { welcomeLang } from "./welcomeTexts.js";

export function welcomeHtml(name, lang) {
  const T = welcomeLang(lang);
  const n = name ? String(name).slice(0, 60) : "";
  const gold = "#D4AF37", bg = "#0B0B0A", text = "#1d2126", dim = "#6b7280";
  const mail = env("ADMIN_EMAIL") || "as@development-info.org";
  return `<!doctype html><html lang="${String(lang || "de").slice(0, 2)}"><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${T.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:${bg};padding:32px 40px;" align="center">
    <img src="${APP_URL()}/icon-192.png" width="56" height="56" alt="ASFIT" style="border-radius:14px;display:block;margin:0 auto 12px;">
    <div style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:2px;">ASFIT</div>
    <div style="color:${gold};font-size:12px;letter-spacing:1px;margin-top:4px;">${T.tagline}</div>
  </td></tr>
  <tr><td style="padding:36px 40px 8px;">
    <div style="font-size:20px;font-weight:bold;color:${text};">${T.hello(n)}</div>
    <p style="font-size:14.5px;line-height:1.65;color:${text};margin:14px 0 0;">${T.intro}</p>
  </td></tr>
  <tr><td style="padding:16px 40px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:14px;color:${text};line-height:1.7;">
      <tr><td style="padding:6px 0;">${T.b1}</td></tr>
      <tr><td style="padding:6px 0;">${T.b2}</td></tr>
      <tr><td style="padding:6px 0;">${T.b3}</td></tr>
      <tr><td style="padding:6px 0;">${T.b4}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:28px 40px 8px;" align="center">
    <a href="${PLAY_URL}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 36px;border-radius:12px;">${T.cta}</a>
    <div style="font-size:12px;color:${dim};margin-top:10px;">${T.web} <a href="${APP_URL()}" style="color:${dim};">${APP_URL().replace("https://", "")}</a></div>
  </td></tr>
  <tr><td style="padding:24px 40px 32px;">
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
    <div style="font-size:12px;color:${dim};line-height:1.6;">${T.footer(mail)}</div>
  </td></tr>
</table>
<div style="font-size:11px;color:#9ca3af;margin-top:14px;">© ${new Date().getFullYear()} ASFIT · AsM Development, Schweiz</div>
</td></tr></table></body></html>`;
}

export async function sendWelcomeEmail(user, lang) {
  try {
    const c = config();
    const to = user && user.email;
    if (!c.resendKey || !to) return false;
    const T = welcomeLang(lang);
    const from = env("MAIL_FROM") || c.from;
    await postJson(c.resendBase + "/emails", {
      from,
      to: [to],
      reply_to: env("ADMIN_EMAIL") || undefined,
      subject: T.subject(user.name ? String(user.name).slice(0, 60) : ""),
      html: welcomeHtml(user.name, lang),
      text: T.plain + " App: " + PLAY_URL + " — Web: " + APP_URL(),
    }, { authorization: "Bearer " + c.resendKey });
    return true;
  } catch (e) {
    console.error("notify: welcome", String((e && e.message) || e).slice(0, 200));
    return false;
  }
}
