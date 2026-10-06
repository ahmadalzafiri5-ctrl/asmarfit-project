// Weekly check-in: what the last 7 finished days looked like and, when the data allows it, a careful nudge for the daily
// calorie target (like the weekly check-in of adaptive nutrition apps, but plain and local). Pure functions, no UI.
//   history: { "YYYY-MM-DD": { meals, steps, ... } }   weightLog: [{ dateISO, kg }]   workoutHistory: [{ dateISO }]
const DAY = 86400000;
const dayKey = (ms) => new Date(ms).toLocaleDateString("sv");
const hasFood = (day) => Boolean(day && day.meals && Object.values(day.meals).some((a) => Array.isArray(a) && a.length > 0));
const sum = (meals, field) => Object.values(meals || {}).reduce((t, items) => t + (Array.isArray(items) ? items.reduce((s, it) => s + (Number(it[field]) || 0), 0) : 0), 0);
const r1 = (x) => Math.round(x * 10) / 10;

// weight change per week from a least-squares line through the entries of the last 21 days (null when too thin)
export function weightSlopePerWeek(weightLog, now = Date.now()) {
  const pts = (weightLog || [])
    .map((w) => ({ t: new Date(w.dateISO).getTime(), kg: Number(w.kg) }))
    .filter((p) => Number.isFinite(p.t) && p.kg > 0 && now - p.t <= 21 * DAY && p.t <= now + DAY)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 2 || pts[pts.length - 1].t - pts[0].t < 7 * DAY) return null;
  const x = pts.map((p) => (p.t - pts[0].t) / DAY);
  const y = pts.map((p) => p.kg);
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  const den = x.reduce((s, xi) => s + (xi - mx) ** 2, 0);
  if (!den) return null;
  const slope = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0) / den;
  return r1(slope * 7);
}

const STEP = 150; // kcal per adjustment: small, so one check-in never changes the plan drastically

export function weeklyReview({ history = {}, weightLog = [], workoutHistory = [], profile = {}, now = Date.now() }) {
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const day = history[dayKey(now - i * DAY)];
    if (hasFood(day)) days.push({ kcal: sum(day.meals, "kcal"), protein: sum(day.meals, "protein"), steps: Number(day.steps) || 0 });
  }
  const tracked = days.length;
  const avg = (f) => (tracked ? Math.round(days.reduce((s, d) => s + f(d), 0) / tracked) : 0);
  const kcalGoal = Number(profile.kcalGoal) || 0;
  const proteinTarget = Number(profile.macroTargets && profile.macroTargets.protein) || 0;
  const stepDays = days.filter((d) => d.steps > 0);
  const out = {
    tracked,
    avgKcal: avg((d) => d.kcal),
    avgProtein: avg((d) => d.protein),
    proteinDays: proteinTarget ? days.filter((d) => d.protein >= proteinTarget * 0.9).length : 0,
    avgSteps: stepDays.length ? Math.round(stepDays.reduce((s, d) => s + d.steps, 0) / stepDays.length) : 0,
    workouts: (workoutHistory || []).filter((w) => now - new Date(w.dateISO).getTime() <= 7 * DAY && new Date(w.dateISO).getTime() <= now + DAY).length,
    slopePerWeek: weightSlopePerWeek(weightLog, now),
    kcalGoal,
    suggestion: { type: "ok", delta: 0, group: "keep" },
  };
  const s = out.suggestion;
  if (tracked < 4) return { ...out, suggestion: { type: "needData", delta: 0 } };
  if (kcalGoal && (out.avgKcal < kcalGoal * 0.8 || out.avgKcal > kcalGoal * 1.2)) return { ...out, suggestion: { type: "adherence", delta: 0 } };
  if (out.slopePerWeek === null) return { ...out, suggestion: { type: "needWeight", delta: 0 } };

  const goal = profile.goal;
  const slope = out.slopePerWeek;
  const floor = profile.gender === "female" ? 1200 : 1500;
  let delta = 0;
  let group = "keep";
  if (goal === "cut") {
    group = "cut";
    if (slope > -0.1) delta = -STEP;
    else if (slope < -1.0) delta = STEP;
  } else if (goal === "gain" || goal === "bulk") {
    group = "gain";
    if (slope < 0.05) delta = STEP;
    else if (slope > 0.8) delta = -STEP;
  } else {
    if (slope > 0.4) delta = -100;
    else if (slope < -0.4) delta = 100;
  }
  if (!delta) return { ...out, suggestion: { ...s, group } };
  if (kcalGoal && kcalGoal + delta < floor) return { ...out, suggestion: { type: "floor", delta: 0, group } };
  return { ...out, suggestion: { type: delta < 0 ? "lower" : "raise", delta, group } };
}

// the start card shows up once a week: when there was no check-in yet or the last one is at least 7 days old
export function reviewDue(lastISO, now = Date.now()) {
  if (!lastISO) return true;
  const t = new Date(lastISO + "T12:00:00").getTime();
  return !Number.isFinite(t) || now - t >= 7 * DAY;
}
