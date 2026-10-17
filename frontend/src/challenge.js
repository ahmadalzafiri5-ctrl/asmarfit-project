// Wochen-Challenge mit einem Freund (pure Logik): "3 Workouts + 5 getrackte Tage"
// in der laufenden Kalenderwoche (Mo-So). Beide tauschen ihren Stand per Code,
// alles bleibt auf dem Gerät.
import { dayHasFood } from "./streaks.js";

export const CHALLENGE_GOAL = { tr: 3, days: 5 };

/** ISO-Wochen-Schlüssel, z.B. "2026-W42" (Montag als Wochenstart). */
export function isoWeekKey(now = Date.now()) {
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  // Donnerstag derselben ISO-Woche bestimmt das Jahr
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return d.getFullYear() + "-W" + String(week).padStart(2, "0");
}

/** Montag 00:00 der laufenden Woche. */
export function weekStart(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Mein Challenge-Stand der laufenden Woche: Workouts + getrackte Ernährungs-Tage. */
export function myChallengeProgress(workoutHistory, historyMap, now = Date.now()) {
  const start = weekStart(now);
  const tr = (workoutHistory || []).filter((w) => new Date(w.dateISO).getTime() >= start).length;
  let days = 0;
  for (let t = start; t <= now; t += 86400000) {
    const k = new Date(t).toLocaleDateString("sv");
    if (dayHasFood(historyMap && historyMap[k])) days++;
  }
  return { tr: Math.min(tr, 99), days };
}

export const challengeDone = (p, goal = CHALLENGE_GOAL) => p.tr >= goal.tr && p.days >= goal.days;
