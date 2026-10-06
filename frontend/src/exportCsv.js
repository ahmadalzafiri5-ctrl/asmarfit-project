// Export of the user's own data as tables (CSV) for Excel / Numbers / Sheets. German Excel wants ";" and a decimal comma,
// everything else "," and a decimal point; the BOM makes Excel read umlauts correctly. Pure functions.
const HEAD = {
  de: {
    food: ["Datum", "Mahlzeit", "Lebensmittel", "Menge", "Einheit", "kcal", "Eiweiß g", "Kohlenhydrate g", "Fett g", "Ballaststoffe g", "Zucker g", "Salz g"],
    body: ["Datum", "Messwert", "Wert", "Einheit"],
    workouts: ["Datum", "Dauer min", "Übung", "Satz", "Gewicht kg", "Wiederholungen", "Minuten"],
  },
  en: {
    food: ["Date", "Meal", "Food", "Amount", "Unit", "kcal", "Protein g", "Carbs g", "Fat g", "Fiber g", "Sugar g", "Salt g"],
    body: ["Date", "Measure", "Value", "Unit"],
    workouts: ["Date", "Duration min", "Exercise", "Set", "Weight kg", "Reps", "Minutes"],
  },
};
const MEAL = { de: { breakfast: "Frühstück", lunch: "Mittag", dinner: "Abend", snacks: "Snacks" }, en: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" } };
const MEASURE = { de: { weight: "Gewicht", waist: "Taille", chest: "Brust", hips: "Hüfte", arm: "Oberarm", thigh: "Oberschenkel", fat: "Körperfett" }, en: { weight: "Weight", waist: "Waist", chest: "Chest", hips: "Hips", arm: "Upper arm", thigh: "Thigh", fat: "Body fat" } };

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const day = (iso) => new Date(iso).toLocaleDateString("sv");

export function toCsv(header, rows, lang = "de") {
  const sep = lang === "de" ? ";" : ",";
  const cell = (v) => {
    let s = v === null || v === undefined ? "" : typeof v === "number" ? String(r2(v)) : String(v);
    if (typeof v === "number" && lang === "de") s = s.replace(".", ",");
    // a leading = + - @ would be run as a formula by spreadsheet programs: neutralise text cells
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /["\n\r]/.test(s) || s.includes(sep) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(sep)).join("\r\n") + "\r\n";
}

// daily: archived days { "YYYY-MM-DD": { meals } }, todayKey/todayMeals: the live day
export function foodRows(daily, todayKey, todayMeals, lang = "de") {
  const all = { ...(daily || {}) };
  if (todayKey && todayMeals) all[todayKey] = { ...(all[todayKey] || {}), meals: todayMeals };
  const rows = [];
  for (const d of Object.keys(all).sort()) {
    const meals = (all[d] && all[d].meals) || {};
    for (const m of ["breakfast", "lunch", "dinner", "snacks"]) {
      for (const it of Array.isArray(meals[m]) ? meals[m] : []) {
        rows.push([d, MEAL[lang][m], String(it.name || ""), it.grams != null ? it.grams : "", it.unit || "", r2(it.kcal), r2(it.protein), r2(it.carbs), r2(it.fat), r2(it.fiber), r2(it.sugar), r2(it.salt)]);
      }
    }
  }
  return rows;
}

export function bodyRows(weightLog, measures, lang = "de") {
  const rows = [];
  for (const w of weightLog || []) rows.push([day(w.dateISO), MEASURE[lang].weight, Number(w.kg), "kg", w.dateISO]);
  for (const m of measures || []) rows.push([day(m.dateISO), MEASURE[lang][m.key] || m.key, Number(m.value), m.key === "fat" ? "%" : "cm", m.dateISO]);
  return rows.sort((a, b) => a[4].localeCompare(b[4])).map((r) => r.slice(0, 4));
}

export function workoutRows(workoutHistory, exerciseName = (k) => k) {
  const rows = [];
  for (const w of workoutHistory || []) {
    const d = day(w.dateISO);
    const mins = w.durationSec ? Math.round(w.durationSec / 60) : "";
    const count = {};
    for (const s of w.sets || []) {
      count[s.exerciseKey] = (count[s.exerciseKey] || 0) + 1;
      rows.push([d, mins, exerciseName(s.exerciseKey), count[s.exerciseKey], Number(s.weight), Number(s.reps), ""]);
    }
    for (const c of w.cardio || []) rows.push([d, mins, exerciseName(c.key || c.exerciseKey), "", "", "", Number(c.minutes) || ""]);
  }
  return rows;
}

export const csvHeader = (kind, lang = "de") => HEAD[lang][kind];
