// Key poses and equipment for the animated exercise demos (engine: exerciseAnim.jsx).
// Angles: limbs are measured from "straight down", positive swings forward (right); torso from "straight up".
// A scene ping-pongs between its key poses; the first half of the loop is cap[0], the way back is cap[1].
import { addChest } from "./scenesChest.js";
import { addBack } from "./scenesBack.js";
import { addLegs } from "./scenesLegs.js";
import { addShoulders } from "./scenesShoulders.js";
import { addCore } from "./scenesCore.js";
import { addMove } from "./scenesMove.js";

export const S = {};
addChest(S);
addBack(S);
addLegs(S);
addShoulders(S);
addCore(S);
addMove(S);

// exercise key -> scene (several exercises share a movement; the caption and muscles still come from the exercise)
const MAP = {
  // chest
  bench: "bench", incline_db: "bench_incline_db", cable_fly: "fly_cable", pushup: "pushup", dips: "dip", decline_bench: "bench_decline", incline_bench: "bench_incline", dumbbell_bench: "bench_db",
  machine_chest_press: "press_machine", pec_deck: "pec_deck", db_fly: "fly_db", low_cable_fly: "fly_cable_low", high_cable_fly: "fly_cable_high", svend_press: "svend", floor_press: "press_floor",
  diamond_pushup: "pushup_diamond", incline_pushup: "pushup_incline", decline_pushup: "pushup_decline", machine_dip: "dip",
  // back
  deadlift: "deadlift", row: "row", latpull: "pulldown", pullup: "pullup", seatedrow: "row_cable", tbarrow: "row_tbar", pendlay_row: "row_pendlay", db_row: "row_db", chest_supported_row: "row_chest",
  wide_cable_row: "row_cable", machine_row: "row_cable", inverted_row: "row_inverted", chinup: "pullup", wide_pullup: "pullup", neutral_pulldown: "pulldown", close_pulldown: "pulldown",
  straight_arm_pulldown: "pulldown_straight", rack_pull: "deadlift_rack", sumo_deadlift: "deadlift_sumo", trapbar_deadlift: "deadlift_trap", good_morning: "good_morning", back_extension: "back_extension",
  barbell_shrug: "shrug", db_shrug: "shrug", meadows_row: "row_tbar", db_pullover: "pullover", hyperextension: "back_extension",
  // legs
  squat: "squat", legpress: "legpress", rdl: "rdl", legcurl: "legcurl_lying", legext: "legext", lunge: "lunge", calfraise: "calf", front_squat: "squat_front", goblet_squat: "squat_goblet",
  bulgarian_split: "split_bulgarian", hack_squat: "squat_hack", smith_squat: "squat_smith", reverse_lunge: "lunge_reverse", step_up: "stepup", db_rdl: "rdl_db", stiff_leg_dl: "rdl_stiff",
  seated_legcurl: "legcurl_seated", lying_legcurl: "legcurl_lying", nordic_curl: "curl_nordic", seated_calf: "calf_seated", legpress_calf: "legpress_calf", adductor: "adductor", abductor: "abductor",
  wall_sit: "wall_sit", pistol_squat: "squat_pistol", jump_squat: "jump_squat", box_jump: "box_jump", sissy_squat: "squat_sissy", side_lunge: "lunge_side",
  // shoulders
  ohp: "ohp", latraise: "raise_lateral", facepull: "facepull", reardelt: "reardelt", db_shoulder_press: "press_db", arnold_press: "press_arnold", machine_shoulder_press: "press_machine_shoulder",
  push_press: "press_push", cable_lateral: "raise_lateral_cable", front_raise: "raise_front", upright_row: "row_upright", rear_delt_cable: "reardelt_cable", reverse_pecdeck: "reardelt_machine",
  pike_pushup: "pushup_pike", handstand_pushup: "pushup_pike", landmine_press: "press_landmine", y_raise: "raise_y", band_pullapart: "pullapart", db_external_rotation: "rotation_external",
  // arms
  curl: "curl", hammer: "curl_db", pushdown: "pushdown", skullcrusher: "skullcrusher", preacher: "curl_preacher", ez_curl: "curl", incline_curl: "curl_incline", concentration_curl: "curl_concentration",
  cable_curl: "curl_cable", spider_curl: "curl_spider", reverse_curl: "curl", zottman_curl: "curl_db", wrist_curl: "curl_wrist", overhead_ext: "extension_overhead", rope_pushdown: "pushdown",
  tricep_kickback: "kickback", bench_dip: "dip_bench", close_grip_bench: "bench_close", jm_press: "bench_close", farmers_walk: "carry_farmer",
  // core
  plank: "plank", hanginglegraise: "hang_legraise", cablecrunch: "crunch_cable", russiantwist: "twist", crunch: "crunch", bicycle_crunch: "crunch_bicycle", lying_leg_raise: "legraise_lying",
  side_plank: "plank_side", ab_wheel: "abwheel", mountain_climber: "climber", dead_bug: "deadbug", bird_dog: "birddog", pallof_press: "pallof", woodchop: "woodchop", v_up: "vup", situp: "situp",
  decline_situp: "situp_decline", hollow_hold: "hollow", flutter_kicks: "flutter", toes_to_bar: "hang_toestobar", l_sit: "lsit", suitcase_carry: "carry_suitcase", cable_crunch_kneel: "crunch_cable",
  // glutes
  hip_thrust: "hipthrust", glute_bridge: "bridge", single_leg_thrust: "bridge_single", cable_kickback: "kickback_cable", donkey_kick: "donkey", fire_hydrant: "hydrant", clamshell: "clamshell",
  frog_pump: "bridge", curtsy_lunge: "lunge_curtsy", kb_swing: "kbswing", good_morning_glute: "bandwalk",
  // cardio
  running: "run", treadmill: "treadmill", cycling: "cycling", rowing_machine: "rowing", elliptical: "elliptical", stair_climber: "stairs", jump_rope: "jumprope", swimming: "swim", walking: "walk",
  hiking: "hike", hiit: "burpee", burpees: "burpee", jumping_jacks: "jacks", battle_ropes: "ropes", sled_push: "sled", boxing: "boxing", assault_bike: "assaultbike",
  // full body
  power_clean: "clean", snatch: "snatch", clean_jerk: "cleanjerk", thruster: "thruster", turkish_getup: "getup", clean_press: "cleanjerk", medball_slam: "slam", man_maker: "manmaker",
  bear_crawl: "bearcrawl", kb_clean: "kbclean",
};
export const EX_SCENE = MAP;
export const sceneFor = (key) => (MAP[key] ? S[MAP[key]] || null : null);
