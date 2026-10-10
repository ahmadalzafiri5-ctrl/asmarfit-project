// Muscle ranks: how much each body group was trained in the last 30 days, as a rank from bronze to diamond.
// Points: every logged set counts 1 for a group whose main muscle it trains and 0.5 when the group only helps.
import { RANK_GROUPS } from "./anatomy.js";

export const RANK_DAYS = 30;

// tiers: the first point count that reaches the tier
export const TIERS = [
  { key: "none", min: 0, color: "#454A52" },
  { key: "bronze", min: 1, color: "#C98A57" },
  { key: "silver", min: 6, color: "#C7D0DA" },
  { key: "gold", min: 15, color: "#E0B341" },
  { key: "platin", min: 30, color: "#58D3CE" },
  { key: "emerald", min: 50, color: "#37C872" },
  { key: "diamond", min: 80, color: "#5AB8FF" },
];

// musclesOf(exerciseKey) -> { primary: [], secondary: [] } | null ; history: [{ dateISO, sets: [{ exerciseKey }] }]
export function rankPoints(history = [], musclesOf, nowMs = Date.now(), days = RANK_DAYS) {
  const out = {};
  RANK_GROUPS.forEach((g) => (out[g.key] = 0));
  const from = nowMs - days * 86400000;
  (history || []).forEach((w) => {
    const ts = new Date(w.dateISO).getTime();
    if (!isFinite(ts) || ts < from || ts > nowMs + 86400000) return;
    (w.sets || []).forEach((s) => {
      const m = musclesOf(s.exerciseKey);
      if (!m) return;
      RANK_GROUPS.forEach((g) => {
        if (g.muscles.some((id) => (m.primary || []).includes(id))) out[g.key] += 1;
        else if (g.muscles.some((id) => (m.secondary || []).includes(id))) out[g.key] += 0.5;
      });
    });
  });
  return out;
}

// { index, tier, next, into, need, frac } for a point count; frac = progress to the next tier (1 at the top)
export function tierFor(points) {
  let index = 0;
  TIERS.forEach((t, i) => {
    if (points >= t.min) index = i;
  });
  const tier = TIERS[index];
  const next = TIERS[index + 1] || null;
  if (!next) return { index, tier, next: null, into: points - tier.min, need: 0, frac: 1 };
  const span = next.min - tier.min;
  return { index, tier, next, into: points - tier.min, need: Math.ceil(next.min - points), frac: Math.max(0, Math.min(1, (points - tier.min) / span)) };
}

// colour per muscle id for the heat picture of the body
export function heatFor(points) {
  const heat = {};
  RANK_GROUPS.forEach((g) => {
    const c = tierFor(points[g.key] || 0).tier.color;
    g.muscles.forEach((id) => (heat[id] = c));
  });
  return heat;
}
