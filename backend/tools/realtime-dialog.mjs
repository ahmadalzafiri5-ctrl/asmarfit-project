// Dialog-Test fürs Live-Onboarding ohne Mikrofon: schickt Nutzer-Sätze als Text und protokolliert,
// was die KI sagt und welche Werkzeuge (set_field / set_language / finish) sie aufruft.
// Verhält sich wie die App: Werkzeug-Ergebnisse zurückschicken, nach response.done weiter.
// Aufruf: node tools/realtime-dialog.mjs en "Satz 1" "Satz 2" ...
const lang = process.argv[2] || "en";
const turns = process.argv.slice(3);
const r = await fetch("https://asmarfit-backend.onrender.com/api/ai/realtime-session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ lang, caps: ["set_language"] }),
});
const j = await r.json().catch(() => ({}));
if (!j.client_secret) {
  console.log("Ticket fehlgeschlagen:", r.status, JSON.stringify(j));
  process.exit(1);
}
const ws = new WebSocket("wss://api.openai.com/v1/realtime?model=" + encodeURIComponent(j.model), ["realtime", "openai-insecure-api-key." + j.client_secret]);
const send = (o) => ws.send(JSON.stringify(o));
let text = "";
let needReply = false;
let turn = -1;
const fields = {};
const end = (m) => {
  console.log(m);
  console.log("FELDER:", JSON.stringify(fields));
  try { ws.close(); } catch {}
  process.exit(0);
};
setTimeout(() => end("TIMEOUT"), 120000);
const nextTurn = () => {
  turn++;
  if (turn >= turns.length) return end("ENDE der Sätze");
  console.log("\nNUTZER: " + turns[turn]);
  send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: turns[turn] }] } });
  send({ type: "response.create", response: { output_modalities: ["text"] } });
};
ws.onopen = () => send({ type: "response.create", response: { output_modalities: ["text"] } });
ws.onmessage = (m) => {
  let ev;
  try { ev = JSON.parse(m.data); } catch { return; }
  if (ev.type === "error") console.log("FEHLER:", JSON.stringify(ev.error));
  if (ev.type === "response.output_text.delta") text += ev.delta || "";
  if (ev.type === "response.output_item.done" && ev.item && ev.item.type === "function_call") {
    let a = {};
    try { a = JSON.parse(ev.item.arguments || "{}"); } catch {}
    console.log("  WERKZEUG " + ev.item.name + " " + JSON.stringify(a));
    if (ev.item.name === "set_field") fields[a.field] = a.value;
    if (ev.item.name === "set_language" && j.instructionsTemplate) {
      send({ type: "session.update", session: { type: "realtime", instructions: j.instructionsTemplate.split("{{LANG}}").join(a.language) } });
    }
    send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.item.call_id, output: JSON.stringify({ ok: true }) } });
    needReply = true;
    if (ev.item.name === "finish") end("FINISH aufgerufen");
  }
  if (ev.type === "response.done") {
    if (text) console.log("KI: " + text.trim());
    text = "";
    if (needReply) {
      needReply = false;
      send({ type: "response.create", response: { output_modalities: ["text"] } });
    } else nextTurn();
  }
};
