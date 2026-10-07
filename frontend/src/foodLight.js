// Food traffic light: colour by energy density (kcal per 100 g / 100 ml), like the common
// "calorie density" model: green < 100, yellow 100-240, orange > 240. It says how much energy
// a food packs per bite, not whether it is healthy. Pure functions, no UI.
export const LIGHT_COLORS = { green: "#3FBF7F", yellow: "#F2C14E", orange: "#F2853F" };
export const LIGHT_KEYS = ["green", "yellow", "orange"];

export function lightFor(kcalPer100) {
  const k = Number(kcalPer100);
  if (kcalPer100 === null || kcalPer100 === undefined || kcalPer100 === "" || !Number.isFinite(k) || k < 0) return null;
  if (k < 100) return "green";
  if (k <= 240) return "yellow";
  return "orange";
}

// kcal per 100 g/ml of a search result (per100) or a logged item (kcal and grams)
export function densityOf(item) {
  if (!item) return null;
  if (item.per100 && item.per100.kcal !== null && item.per100.kcal !== undefined && Number.isFinite(Number(item.per100.kcal))) return Number(item.per100.kcal);
  const g = Number(item.grams);
  const k = Number(item.kcal);
  if (g > 0 && Number.isFinite(k) && k >= 0) return (k / g) * 100;
  return null;
}

export const lightOf = (item) => lightFor(densityOf(item));

// how the kcal of a list of foods split over the colours; items without a known amount count as "unknown"
export function lightShares(items) {
  const out = { green: 0, yellow: 0, orange: 0, unknown: 0, total: 0 };
  for (const it of items || []) {
    const kcal = Math.max(0, Number(it && it.kcal) || 0);
    const l = lightOf(it);
    out[l || "unknown"] += kcal;
    out.total += kcal;
  }
  return out;
}
