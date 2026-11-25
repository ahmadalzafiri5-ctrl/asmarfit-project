// Rauchtest fürs Live-Sprach-Onboarding: holt ein Ticket vom Server (wie die App) und lässt den Coach
// seinen ersten Satz erzeugen. Zeigt Fehler von OpenAI (z. B. Guthaben/Quota) direkt an.
// Aufruf: node tools/realtime-smoke.mjs [lang] [mitWerkzeug=1]
const lang = process.argv[2] || "en";
const caps = process.argv[3] === "0" ? [] : ["set_language"];
const r = await fetch("https://asmarfit-backend.onrender.com/api/ai/realtime-session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ lang, caps }),
});
const j = await r.json().catch(() => ({}));
console.log("Ticket:", r.status, j.client_secret ? "ok" : JSON.stringify(j));
if (!j.client_secret) process.exit(1);

const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=" + encodeURIComponent(j.model), ["realtime", "openai-insecure-api-key." + j.client_secret]);
let text = "";
const done = (msg) => {
  console.log(msg);
  try { ws.close(); } catch {}
  process.exit(0);
};
setTimeout(() => done("TIMEOUT nach 25 s — kein Abschluss. Bisher: " + text.slice(0, 200)), 25000);
ws.onopen = () => {
  console.log("WebSocket offen");
  // Nur Text anfordern, damit der Test ohne Lautsprecher auskommt
  ws.send(JSON.stringify({ type: "response.create", response: { output_modalities: ["text"] } }));
};
ws.onerror = (e) => done("WebSocket-Fehler: " + (e.message || e.type));
ws.onmessage = (m) => {
  let ev;
  try { ev = JSON.parse(m.data); } catch { return; }
  if (ev.type === "error") done("OpenAI-FEHLER: " + JSON.stringify(ev.error));
  if (ev.type === "response.output_text.delta" || ev.type === "response.text.delta") text += ev.delta || "";
  if (ev.type === "response.done") {
    const st = ev.response && ev.response.status;
    const det = ev.response && ev.response.status_details;
    done("Antwort fertig (" + st + (det ? " " + JSON.stringify(det) : "") + "): " + (text || "(kein Text)"));
  }
};
