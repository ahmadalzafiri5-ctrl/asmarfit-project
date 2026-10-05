// Plans which reminders to send and when. Pure functions (no browser, no Capacitor), so they can be tested on their own.
// The installed Android app schedules the result as local notifications; the web version shows "due now" in the app.

export const NOTIF_DEFAULTS = {
  breakfast: { on: false, time: "08:00" },
  lunch: { on: true, time: "12:30" },
  dinner: { on: false, time: "18:30" },
  water: { on: false, every: 3, from: "09:00", to: "20:00" },
  weigh: { on: true, time: "08:00" },
  train: { on: false, time: "17:30" },
  missed: { on: false, time: "20:00" },
  streak: { on: true, time: "20:30" },
  intake: { on: true, time: "09:00" },
  comeback: { on: true },
  days: [1, 3, 5], // training days, 0 = Sunday
};

export const NOTIF_KINDS = ["breakfast", "lunch", "dinner", "water", "weigh", "train", "missed", "streak", "intake", "comeback"];

// merges saved settings over the defaults (older saves may miss keys)
export function normalizeNotif(saved) {
  const out = {};
  Object.keys(NOTIF_DEFAULTS).forEach((k) => {
    const d = NOTIF_DEFAULTS[k];
    out[k] = Array.isArray(d) ? (Array.isArray(saved && saved[k]) ? saved[k] : d) : { ...d, ...((saved && saved[k]) || {}) };
  });
  return out;
}

// settings from the old three-switch version: food -> lunch, weigh, train
export function legacyNotif(rem, times) {
  if (!rem) return normalizeNotif(null);
  const base = normalizeNotif(null);
  base.lunch = { on: !!rem.food, time: (times && times.food) || "12:30" };
  base.weigh = { on: !!rem.weigh, time: (times && times.weigh) || "08:00" };
  base.train = { on: !!rem.train, time: (times && times.train) || "17:30" };
  return base;
}

const TX = {
  de: {
    breakfast: ["Zeit fürs Frühstück 🍳 Trag ein, was du isst.", "Guten Morgen! Vergiss das Frühstück nicht im Tagebuch 🌅"],
    lunch: ["Zeit fürs Mittagessen 🍽️ Trag es gleich ein.", "Mahlzeit! Trag dein Essen ein, solange du dich erinnerst 🥗"],
    dinner: ["Zeit fürs Abendessen 🍝 Trag es danach ein.", "Hunger? Nach dem Essen kurz eintragen 🍲"],
    water: ["Trink ein Glas Wasser 💧", "Ausreichend Wasser hilft dir beim Training und bei der Konzentration 💧", "Wasser-Pause! Ein paar Schlucke jetzt 🥤"],
    weigh: ["Wiege dich und trag dein Gewicht ein ⚖️", "Kurz auf die Waage, dann bleibt dein Verlauf aktuell ⚖️"],
    train: ["Heute ist Trainingstag 💪 Bist du bereit?", "Zeit fürs Training! Dein Körper wartet 🏋️"],
    missed: ["Training verpasst? 🏋️ Es ist noch Zeit für eine kurze Einheit.", "Du hast heute noch nicht trainiert. Schon 20 Minuten zählen 💪"],
    streakRisk: "Deine Serie von {n} Tagen ist in Gefahr! 🔥 Trag noch eine Mahlzeit ein.",
    streak: "Trag heute noch eine Mahlzeit ein, damit deine Serie weiterläuft 🔥",
    intake: "{name} ist heute fällig 💊",
    comeback: "Wir vermissen dich 👋 Schau kurz rein und trag deinen Tag ein.",
  },
  en: {
    breakfast: ["Breakfast time 🍳 Log what you eat.", "Good morning! Don't forget to log breakfast 🌅"],
    lunch: ["Lunch time 🍽️ Log it right away.", "Enjoy your meal! Log it while you remember 🥗"],
    dinner: ["Dinner time 🍝 Log it afterwards.", "Hungry? Log your food after you eat 🍲"],
    water: ["Have a glass of water 💧", "Enough water helps your training and your focus 💧", "Water break! A few sips now 🥤"],
    weigh: ["Step on the scale and log your weight ⚖️", "A quick weigh-in keeps your progress up to date ⚖️"],
    train: ["It's a training day 💪 Ready?", "Time to train! Your body is waiting 🏋️"],
    missed: ["Missed your workout? 🏋️ There's still time for a short session.", "You haven't trained today. Even 20 minutes count 💪"],
    streakRisk: "Your {n}-day streak is at risk! 🔥 Log one more meal.",
    streak: "Log a meal today to keep your streak going 🔥",
    intake: "{name} is due today 💊",
    comeback: "We miss you 👋 Pop in and log your day.",
  },
};

const TITLE = "ASFIT";
const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (ms, n) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const atTime = (dayMs, hhmm) => {
  const [h, m] = String(hhmm || "12:00").split(":").map((x) => parseInt(x, 10) || 0);
  const d = new Date(dayMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const minutes = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
};

// days (as offsets from today, 0 = today) on which a substance is due, assuming each dose is taken on its due day
export function intakeDueOffsets(sub, log, nowMs, horizon) {
  const sc = sub.sched || { type: "needed" };
  if (sc.type === "needed") return [];
  const today = startOfDay(nowMs);
  const mine = (log || []).filter((e) => e.subId === sub.id);
  let last = mine.length ? Math.max(...mine.map((e) => e.ts)) : null;
  const out = [];
  for (let guard = 0; guard < 12; guard++) {
    let due;
    if (sc.type === "interval") due = last == null ? today : addDays(last, Math.max(1, sc.days || 1));
    else {
      const wd = sc.weekdays && sc.weekdays.length ? sc.weekdays : [1];
      due = last == null ? today : addDays(last, 1);
      for (let i = 0; i < 8 && !wd.includes(new Date(due).getDay()); i++) due = addDays(due, 1);
    }
    const off = Math.max(0, Math.round((due - today) / 86400000));
    if (off >= horizon) break;
    out.push(off);
    last = addDays(today, off); // assume it is taken on that day
  }
  return out;
}

// today: { meals: {breakfast, lunch, dinner, snacks} (counts), waterMl, waterGoalMl, workoutToday, weighedToday, foodToday, streak, intake: [{ name, offsets }] }
export function planNotifications({ now, cfg, lang, today, windowDays = 5, max = 60 }) {
  const L = TX[lang === "en" ? "en" : "de"];
  const c = normalizeNotif(cfg);
  const out = [];
  const start = startOfDay(now);
  const push = (at, kind, body) => {
    if (at > now + 30000) out.push({ at, kind, title: TITLE, body });
  };
  for (let d = 0; d < windowDays; d++) {
    const day = addDays(start, d);
    const wd = new Date(day).getDay();
    const isToday = d === 0;
    ["breakfast", "lunch", "dinner"].forEach((slot) => {
      if (!c[slot].on) return;
      if (isToday && today.meals && today.meals[slot] > 0) return;
      push(atTime(day, c[slot].time), slot, pick(L[slot], d));
    });
    if (c.water.on) {
      const goal = today.waterGoalMl || 2500;
      if (!(isToday && today.waterMl >= goal * 0.9)) {
        const every = Math.max(1, Math.min(6, c.water.every || 3));
        for (let m = minutes(c.water.from), i = 0; m <= minutes(c.water.to); m += every * 60, i++) push(atTime(day, String(Math.floor(m / 60)) + ":" + String(m % 60)), "water", pick(L.water, d + i));
      }
    }
    if (c.weigh.on && !(isToday && today.weighedToday)) push(atTime(day, c.weigh.time), "weigh", pick(L.weigh, d));
    const trainDay = c.days.includes(wd);
    if (c.train.on && trainDay && !(isToday && today.workoutToday)) push(atTime(day, c.train.time), "train", pick(L.train, d));
    if (c.missed.on && trainDay && !(isToday && today.workoutToday)) push(atTime(day, c.missed.time), "missed", pick(L.missed, d));
    if (c.streak.on && !(isToday && today.foodToday)) {
      push(atTime(day, c.streak.time), "streak", isToday && today.streak > 0 ? L.streakRisk.replace("{n}", today.streak) : L.streak);
    }
    if (c.intake.on) (today.intake || []).forEach((s) => s.offsets.includes(d) && push(atTime(day, c.intake.time), "intake", L.intake.replace("{name}", s.name)));
  }
  if (c.comeback.on) push(atTime(addDays(start, 3), "18:00"), "comeback", L.comeback);
  out.sort((a, b) => a.at - b.at);
  return out.slice(0, max).map((n, i) => ({ id: 100 + i, ...n, at: new Date(n.at) }));
}

// What is open right now (for the "today" card in the app; also works where no background notification is possible)
export function dueNow({ now, cfg, lang, today }) {
  const c = normalizeNotif(cfg);
  const de = lang !== "en";
  const d = new Date(now);
  const min = d.getHours() * 60 + d.getMinutes();
  const wd = d.getDay();
  const items = [];
  const L = {
    meal: { breakfast: de ? "Frühstück noch nicht eingetragen" : "Breakfast not logged yet", lunch: de ? "Mittagessen noch nicht eingetragen" : "Lunch not logged yet", dinner: de ? "Abendessen noch nicht eingetragen" : "Dinner not logged yet" },
    water: de ? "Wasser: du liegst hinter deinem Ziel" : "Water: you are behind your goal",
    weigh: de ? "Wiegen steht noch an" : "Weigh-in still open",
    train: de ? "Heute ist Trainingstag" : "Today is a training day",
    missed: de ? "Training verpasst? Es ist noch Zeit für eine kurze Einheit" : "Missed your workout? There is still time for a short one",
    streak: de ? "Serie in Gefahr: trag noch eine Mahlzeit ein" : "Streak at risk: log one more meal",
    intake: de ? "fällig" : "due",
  };
  ["breakfast", "lunch", "dinner"].forEach((slot) => {
    if (c[slot].on && min >= minutes(c[slot].time) + 60 && !(today.meals && today.meals[slot] > 0)) items.push({ key: slot, text: L.meal[slot], go: "nutrition" });
  });
  if (c.water.on && min >= 11 * 60) {
    const goal = today.waterGoalMl || 2500;
    const from = minutes(c.water.from);
    const to = Math.max(from + 60, minutes(c.water.to));
    const share = Math.min(1, Math.max(0, (min - from) / (to - from)));
    if (today.waterMl < goal * share * 0.75) items.push({ key: "water", text: L.water, go: "home" });
  }
  if (c.weigh.on && min >= minutes(c.weigh.time) + 120 && !today.weighedToday) items.push({ key: "weigh", text: L.weigh, go: "weigh" });
  const trainDay = c.days.includes(wd);
  if (trainDay && !today.workoutToday) {
    if (c.missed.on && min >= minutes(c.missed.time)) items.push({ key: "missed", text: L.missed, go: "training" });
    else if (c.train.on && min >= minutes(c.train.time)) items.push({ key: "train", text: L.train, go: "training" });
  }
  if (c.streak.on && today.streak > 0 && !today.foodToday && min >= minutes(c.streak.time)) items.push({ key: "streak", text: L.streak, go: "nutrition" });
  if (c.intake.on && min >= minutes(c.intake.time)) (today.intake || []).forEach((s) => s.offsets.includes(0) && items.push({ key: "intake-" + s.name, text: s.name + " " + L.intake, go: "intake" }));
  return items;
}
