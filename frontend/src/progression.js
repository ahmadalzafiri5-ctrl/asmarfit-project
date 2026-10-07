// "What to do today": a plain double-progression suggestion from the last session of an exercise.
// Stay at a weight until every working set reaches the top of the rep range (12), then add weight and start at 8 again.
// Pure function, no UI. lastSets: [{ weight, reps }] of the last workout that contained the exercise.
export const REP_LOW = 8;
export const REP_HIGH = 12;

const round05 = (x) => Math.round(x * 2) / 2;

export function weightStep(muscle) {
  return muscle === "legs" || muscle === "glutes" ? 5 : 2.5;
}

// -> { weight, reps, kind: "up" | "reps" | "hold" } or null when there is nothing to build on
export function suggestNext(lastSets, muscle) {
  const sets = (lastSets || []).map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })).filter((s) => s.reps > 0);
  if (!sets.length) return null;
  const top = Math.max(...sets.map((s) => s.weight));
  const work = sets.filter((s) => s.weight === top); // warm-up sets with less weight are ignored
  const minReps = Math.min(...work.map((s) => s.reps));
  if (top === 0) return { weight: 0, reps: minReps + 1, kind: "reps" }; // bodyweight: one more rep than the weakest set
  if (minReps >= REP_HIGH) return { weight: round05(top + weightStep(muscle)), reps: REP_LOW, kind: "up" };
  if (minReps >= REP_LOW) return { weight: top, reps: minReps + 1, kind: "reps" };
  return { weight: top, reps: Math.min(REP_LOW, minReps + 1), kind: "hold" };
}
