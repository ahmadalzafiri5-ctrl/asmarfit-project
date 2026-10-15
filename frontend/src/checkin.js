// Schwierigkeits-Check-in & Deload-Empfehlung (pure Logik, keine UI).
// - Nach dem 1. und 2. Kraft-Workout fragt die App "zu leicht / genau richtig / zu schwer"
//   und verschiebt die Vorschläge aus progression.js entsprechend um eine Gewichtsstufe.
// - Stagniert eine Übung über 3+ Sessions (kein höheres Top-Gewicht), wird ein
//   Deload (~-10 %) vorgeschlagen - als Empfehlung, nie erzwungen.
import { weightStep, REP_LOW } from "./progression.js";

const round05 = (x) => Math.round(x * 2) / 2;

/** Anzahl Kraft-Workouts (mit mindestens einem Satz) in der Historie. */
export const strengthWorkoutCount = (history) => (history || []).filter((w) => Array.isArray(w.sets) && w.sets.length > 0).length;

/** Check-in fällig? historyBefore = Historie OHNE das gerade beendete Workout. */
export const checkinDue = (historyBefore, setLog) => Array.isArray(setLog) && setLog.length > 0 && strengthWorkoutCount(historyBefore) < 2;

/** Antwort -> gespeicherter Bias. "easy" heisst: es war zu leicht -> künftig mehr. */
export const biasFor = (answer) => (answer === "easy" ? "harder" : answer === "hard" ? "easier" : null);

/** Vorschlag aus progression.js um den Check-in-Bias verschieben (eine Gewichtsstufe, bzw. ±2 Wdh. bei Körpergewicht). */
export function applyDifficulty(sug, bias, muscle) {
  if (!sug || !bias) return sug;
  const dir = bias === "harder" ? 1 : -1;
  if (sug.weight > 0) return { ...sug, weight: Math.max(0, round05(sug.weight + dir * weightStep(muscle))) };
  return { ...sug, reps: Math.max(1, sug.reps + dir * 2) };
}

/** Top-Gewicht (schwerster Satz) der letzten Sessions einer Übung, älteste zuerst. */
function sessionTops(history, exerciseKey, n) {
  const tops = [];
  for (const w of history || []) {
    const sets = (w.sets || []).filter((s) => s.exerciseKey === exerciseKey && Number(s.weight) > 0);
    if (sets.length) tops.push(Math.max(...sets.map((s) => Number(s.weight))));
  }
  return tops.slice(-n);
}

/** Deload fällig? Mindestens 4 Sessions mit der Übung und in den letzten 3 kein neues Top-Gewicht. */
export function deloadDue(history, exerciseKey) {
  const tops = sessionTops(history, exerciseKey, 4);
  if (tops.length < 4) return false;
  const base = tops[0];
  return tops[1] <= base && tops[2] <= base && tops[3] <= base;
}

/** Deload-Vorschlag: ~10 % unter dem letzten Top-Gewicht, unteres Ende des Wiederholungsbereichs. */
export function deloadSuggestion(history, exerciseKey) {
  const tops = sessionTops(history, exerciseKey, 1);
  if (!tops.length) return null;
  return { weight: round05(tops[0] * 0.9), reps: REP_LOW, kind: "deload" };
}
