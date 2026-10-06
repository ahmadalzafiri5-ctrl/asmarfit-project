// Ready-made training plans for people who do not want to build one from scratch. Keys are exercise keys of the library.
export const PLAN_TEMPLATES = [
  {
    id: "full3",
    de: { name: "Ganzkörper · 3 Tage", sub: "Einsteiger: jeden zweiten Tag, alle Muskeln" },
    en: { name: "Full body · 3 days", sub: "Beginner: every other day, all muscles" },
    days: [
      { de: "Tag A", en: "Day A", keys: ["squat", "bench", "row", "ohp", "plank"] },
      { de: "Tag B", en: "Day B", keys: ["rdl", "incline_db", "latpull", "db_shoulder_press", "cablecrunch"] },
      { de: "Tag C", en: "Day C", keys: ["legpress", "dips", "seatedrow", "facepull", "lying_leg_raise"] },
    ],
  },
  {
    id: "ppl",
    de: { name: "Push / Pull / Beine · 3 Tage", sub: "Fortgeschrittener: Drücken, Ziehen, Beine" },
    en: { name: "Push / Pull / Legs · 3 days", sub: "Intermediate: push, pull, legs" },
    days: [
      { de: "Push", en: "Push", keys: ["bench", "incline_db", "ohp", "latraise", "pushdown", "overhead_ext"] },
      { de: "Pull", en: "Pull", keys: ["row", "latpull", "seatedrow", "facepull", "curl", "hammer"] },
      { de: "Beine", en: "Legs", keys: ["squat", "rdl", "legpress", "legcurl", "calfraise", "plank"] },
    ],
  },
  {
    id: "upperlower",
    de: { name: "Oberkörper / Unterkörper · 4 Tage", sub: "Mittelstufe: 4 Trainingstage pro Woche" },
    en: { name: "Upper / Lower · 4 days", sub: "Intermediate: 4 training days a week" },
    days: [
      { de: "Oberkörper A", en: "Upper A", keys: ["bench", "row", "ohp", "latpull", "curl", "pushdown"] },
      { de: "Unterkörper A", en: "Lower A", keys: ["squat", "rdl", "legext", "legcurl", "calfraise"] },
      { de: "Oberkörper B", en: "Upper B", keys: ["incline_db", "seatedrow", "db_shoulder_press", "pullup", "hammer", "skullcrusher"] },
      { de: "Unterkörper B", en: "Lower B", keys: ["deadlift", "legpress", "lunge", "hip_thrust", "seated_calf"] },
    ],
  },
  {
    id: "home3",
    de: { name: "Zuhause ohne Geräte · 3 Tage", sub: "Nur mit dem eigenen Körpergewicht" },
    en: { name: "Home, no equipment · 3 days", sub: "Bodyweight only" },
    days: [
      { de: "Tag A", en: "Day A", keys: ["pushup", "bulgarian_split", "glute_bridge", "plank", "burpees"] },
      { de: "Tag B", en: "Day B", keys: ["pike_pushup", "reverse_lunge", "bench_dip", "bird_dog", "mountain_climber"] },
      { de: "Tag C", en: "Day C", keys: ["diamond_pushup", "jump_squat", "single_leg_thrust", "side_plank", "jumping_jacks"] },
    ],
  },
  {
    id: "glutes3",
    de: { name: "Beine & Po · 3 Tage", sub: "Schwerpunkt Unterkörper und Gesäß" },
    en: { name: "Legs & glutes · 3 days", sub: "Focus on lower body and glutes" },
    days: [
      { de: "Tag A", en: "Day A", keys: ["hip_thrust", "bulgarian_split", "rdl", "abductor", "cable_kickback"] },
      { de: "Tag B", en: "Day B", keys: ["squat", "step_up", "glute_bridge", "legcurl", "donkey_kick"] },
      { de: "Tag C", en: "Day C", keys: ["legpress", "curtsy_lunge", "single_leg_thrust", "adductor", "fire_hydrant"] },
    ],
  },
];

// template -> the { name, days } shape the plan builder works with (exercise objects come from the library)
export function buildFromTemplate(tpl, lang, library) {
  const byKey = new Map(library.map((e) => [e.key, e]));
  const base = Date.now();
  const l = lang === "de" ? "de" : "en";
  return {
    name: tpl[l].name,
    days: tpl.days.map((d, i) => ({ id: base + i, name: d[l], exercises: d.keys.map((k) => byKey.get(k)).filter(Boolean).map((e) => ({ ...e })) })),
  };
}
