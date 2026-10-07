// Guided short workouts: fixed circuits with work / rest intervals, no equipment (a chair for two moves
// of the 7-minute circuit). Pure functions, no UI. Exercise keys are the ones of the exercise library.
export const READY_SEC = 10;

export const QUICK_PRESETS = [
  { key: "seven", emoji: "⚡", met: 7, work: 30, rest: 10, rounds: 1, chair: true, exercises: ["jumping_jacks", "wall_sit", "pushup", "crunch", "step_up", "squat", "bench_dip", "plank", "mountain_climber", "reverse_lunge", "diamond_pushup", "side_plank"] },
  { key: "hiit", emoji: "🔥", met: 8.5, work: 40, rest: 20, rounds: 2, chair: false, exercises: ["burpees", "jump_squat", "mountain_climber", "jumping_jacks", "pushup", "bicycle_crunch"] },
  { key: "core", emoji: "🎯", met: 4.5, work: 40, rest: 15, rounds: 1, chair: false, exercises: ["crunch", "bicycle_crunch", "plank", "lying_leg_raise", "side_plank", "mountain_climber"] },
  { key: "legs", emoji: "🦵", met: 6, work: 40, rest: 20, rounds: 2, chair: false, exercises: ["squat", "reverse_lunge", "glute_bridge", "jump_squat", "wall_sit"] },
];

export const presetByKey = (key) => QUICK_PRESETS.find((p) => p.key === key) || null;

// the list of steps: get ready, then work / rest in turns (no rest after the last move).
// A "rest" step carries the key of the NEXT move so the screen can show what comes.
export function buildTimeline(preset, readySec = READY_SEC) {
  const list = [];
  for (let r = 0; r < preset.rounds; r++) for (const k of preset.exercises) list.push(k);
  const out = [{ kind: "ready", sec: readySec, key: list[0] }];
  list.forEach((key, i) => {
    out.push({ kind: "work", sec: preset.work, key, n: i + 1, of: list.length });
    if (i < list.length - 1) out.push({ kind: "rest", sec: preset.rest, key: list[i + 1] });
  });
  return out;
}

export const totalSec = (tl) => tl.reduce((s, x) => s + x.sec, 0);
export const moveCount = (preset) => preset.exercises.length * preset.rounds;
// minutes shown on the cards, rounded
export const presetMinutes = (preset) => Math.round(totalSec(buildTimeline(preset)) / 60);

// where we are after `elapsed` seconds
export function locate(tl, elapsed) {
  let acc = 0;
  for (let i = 0; i < tl.length; i++) {
    if (elapsed < acc + tl[i].sec) return { i, seg: tl[i], into: elapsed - acc, left: acc + tl[i].sec - elapsed, done: false };
    acc += tl[i].sec;
  }
  const last = tl.length - 1;
  return { i: last, seg: tl[last], into: tl[last].sec, left: 0, done: true };
}

// seconds from the start of the step with index i
export const startOf = (tl, i) => tl.slice(0, i).reduce((s, x) => s + x.sec, 0);

// minutes that count as training (the "get ready" countdown does not)
export const activeMinutes = (elapsed, readySec = READY_SEC) => Math.max(0, elapsed - readySec) / 60;
