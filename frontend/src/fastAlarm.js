// Alarm for the fasting timer: what to schedule as local notifications (Android app), which alarms are due while the
// app is open, and a calendar file with an alarm (the way to get a real alarm on the iPhone web app). Pure functions, no UI.
export const FAST_NOTIF_END = 5;
export const FAST_NOTIF_SOON = 6;
export const SOON_MS = 60 * 60000;
export const DEFAULT_ALARM = { end: true, soon: false };

export const alarmCfg = (fast) => ({ ...DEFAULT_ALARM, ...((fast && fast.alarm) || {}) });
export const fastEndMs = (active) => active.start + active.hours * 3600000;

// notifications to schedule for a running fast (past times are skipped)
export function fastAlarmPlan(active, cfg, now) {
  if (!active || !(active.hours > 0)) return [];
  const end = fastEndMs(active);
  const out = [];
  if (cfg.end && end > now + 5000) out.push({ id: FAST_NOTIF_END, at: end, kind: "end" });
  if (cfg.soon && end - SOON_MS > now + 5000) out.push({ id: FAST_NOTIF_SOON, at: end - SOON_MS, kind: "soon" });
  return out;
}

// alarms that are due right now and were not rung yet. `fired` remembers what already rang for the fast with this start.
export function fastAlarmsDue(active, cfg, fired, now) {
  if (!active || !(active.hours > 0)) return [];
  const end = fastEndMs(active);
  const done = fired && fired.start === active.start ? fired : {};
  const out = [];
  if (cfg.soon && !done.soon && !done.end && now >= end - SOON_MS && now < end) out.push("soon");
  if (cfg.end && !done.end && now >= end) out.push("end");
  return out;
}

// marks the rung alarms as done (an alarm for the end also settles "one hour before")
export function markFired(active, fired, rung) {
  const base = fired && fired.start === active.start ? { ...fired } : { start: active.start };
  rung.forEach((k) => {
    base[k] = true;
    if (k === "end") base.soon = true;
  });
  return base;
}

const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// a calendar entry at the end of the fast with an alarm (and one an hour before if wanted)
export function icsForFast(active, cfg, texts) {
  const end = fastEndMs(active);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ASFIT//Fasting//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:asfit-fast-" + active.start + "@asfit",
    "DTSTAMP:" + icsDate(Date.now()),
    "DTSTART:" + icsDate(end),
    "DTEND:" + icsDate(end + 15 * 60000),
    "SUMMARY:" + icsText(texts.title),
    "DESCRIPTION:" + icsText(texts.body),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + icsText(texts.title),
    "TRIGGER:PT0S",
    "END:VALARM",
  ];
  if (cfg.soon) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(texts.soon), "TRIGGER:-PT60M", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
