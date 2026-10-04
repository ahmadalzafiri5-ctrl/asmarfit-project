// Which exercises are shown first for whom. The choice made in onboarding (female / male / diverse) decides:
// women see the glute and hip-focused work but not the typical men's mass-building extras, men the other way round,
// diverse sees everything. Everything not listed here is shown to everybody.
// "All exercises" in the library switches the filter off, so nothing is ever locked away.
export const FEMALE_FOCUS = [
  "hip_thrust", "glute_bridge", "single_leg_thrust", "cable_kickback", "donkey_kick", "fire_hydrant",
  "clamshell", "frog_pump", "curtsy_lunge", "good_morning_glute", "abductor", "adductor",
];
export const MALE_FOCUS = [
  "decline_bench", "close_grip_bench", "jm_press", "svend_press", "skullcrusher", "preacher", "spider_curl",
  "concentration_curl", "zottman_curl", "wrist_curl", "barbell_shrug", "db_shrug", "upright_row", "farmers_walk",
  "power_clean", "snatch", "clean_jerk", "clean_press", "handstand_pushup",
];

export function visibleFor(key, gender) {
  if (gender === "female") return !MALE_FOCUS.includes(key);
  if (gender === "male") return !FEMALE_FOCUS.includes(key);
  return true;
}
