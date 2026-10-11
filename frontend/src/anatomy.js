// Muscle ids of the app and the groups of the muscle rank. The body itself is the 3D figure in anatomy3d.js,
// whose model labels every vertex with one of these ids.

// every muscle id the body knows
export const MUSCLE_IDS = ["shoulders", "chest", "traps", "biceps", "forearms", "obliques", "abs", "quads", "adductors", "calves", "lats", "lower_back", "triceps", "glutes", "hamstrings"];

// muscles that are only visible from one side decide which view a single picture shows
const FRONT_ONLY = ["chest", "biceps", "abs", "obliques", "quads", "adductors"];
const BACK_ONLY = ["traps", "lats", "triceps", "lower_back", "glutes", "hamstrings"];

// "front" | "back": the side on which the main muscles are best seen
export function viewFor(primary = [], secondary = []) {
  const score = (list, w) => list.reduce((a, m) => a + (FRONT_ONLY.includes(m) ? w : BACK_ONLY.includes(m) ? -w : 0), 0);
  const s = score(primary, 2) + score(secondary, 1);
  if (s !== 0) return s > 0 ? "front" : "back";
  if (primary.includes("calves")) return "back";
  return "front";
}

// the groups of the muscle rank (Symmetry-style): which muscles belong to which body group
export const RANK_GROUPS = [
  { key: "chest", muscles: ["chest"] },
  { key: "back", muscles: ["lats", "traps", "lower_back"] },
  { key: "shoulders", muscles: ["shoulders"] },
  { key: "arms", muscles: ["biceps", "triceps", "forearms"] },
  { key: "core", muscles: ["abs", "obliques"] },
  { key: "legs", muscles: ["quads", "hamstrings", "adductors", "calves"] },
  { key: "glutes", muscles: ["glutes"] },
];
