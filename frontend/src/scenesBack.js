// Back, hinge and pulling movements.
import { FL, rel, cap, L, C, R, benchFlat, box, backPad, ZOUT } from "./sceneKit.js";

export function addBack(S) {
  const HINGE_CAP = cap("Aufrichten", "Kontrolliert ablegen", "Stand tall", "Lower with control");

  // deadlift family: shoulders above the bar at the start, standing tall at the end
  function deadlift({ shA = [135, 80], thA = 55, barA = [127, 135], barB = [128, 92], thB = -2, held = "plate", ms = 3500 }) {
    const A = { sh: shA, torso: thA, foot: [122, 145], kp: [1, 0], hand: barA };
    const B = { sh: [121, 35.5], torso: thB, foot: [122, 145], kp: [1, 0], hand: barB };
    return { kf: [A, B], eq: [], held, ms, cap: HINGE_CAP };
  }
  S.deadlift = deadlift({});
  S.deadlift_sumo = deadlift({ shA: [128, 84], thA: 42, barA: [124, 135] });
  S.deadlift_trap = deadlift({ shA: [128, 80], thA: 46, barA: [122, 135], barB: [121, 92] });
  S.deadlift_rack = deadlift({ shA: [131, 54], thA: 38, barA: [127, 106] });

  // Romanian / stiff-leg deadlift and good morning: the hips travel back, the legs stay almost straight
  function hinge({ held = "plate", hipB = [100, 83], thB = 76, handA, handB, ms = 3400, lab }) {
    const A = { hip: [121, 77.5], torso: -2, foot: [122, 145], kp: [1, 0], hand: handA };
    const B = { hip: hipB, torso: thB, foot: [122, 145], kp: [1, 0], hand: handB };
    return { kf: [A, B], eq: [], held, ms, cap: lab || cap("Hüfte nach hinten schieben", "Hüfte nach vorn, aufrichten", "Push the hips back", "Hips forward, stand tall") };
  }
  S.rdl = hinge({ handA: [128, 92], handB: [138, 128] });
  S.rdl_db = hinge({ held: "db", handA: [127, 92], handB: [138, 126] });
  S.rdl_stiff = hinge({ hipB: [96, 80], thB: 82, handA: [128, 92], handB: [136, 126] });
  S.good_morning = hinge({ handA: rel("sh", -3, -4), handB: rel("sh", -3, -4), lab: cap("Oberkörper nach vorn kippen", "Aufrichten", "Tip the torso forward", "Stand back up") });

  // back extension on a 45° bench
  {
    const mk = (th) => ({ hip: [100, 98], torso: th, foot: [52, 144], kp: [0.2, -1], arm: [th < 90 ? 30 : 170, th < 90 ? 30 : 170], toe: 100 });
    S.back_extension = {
      kf: [{ ...mk(128), arm: [140, 140] }, { ...mk(46), arm: [20, 20] }],
      eq: [L([76, 112], [112, 110], 8, "pad"), L([88, 116], [88, FL], 3), L([56, 134], [38, 128], 7, "pad"), L([46, 136], [46, FL], 3)],
      held: "none",
      ms: 3300,
      cap: cap("Oberkörper aufrichten", "Langsam absenken", "Raise the torso", "Lower slowly"),
    };
  }

  // rows
  function row({ hipA = [100, 84], th = 72, handA, ms = 3300, held = "plate", eq = [], lab }) {
    const base = { hip: hipA, torso: th, foot: [121, 145], kp: [1, 0] };
    return {
      kf: [
        { ...base, hand: handA, ep: [0, 1] },
        { ...base, hand: rel("sh", -10, 30), ep: [-1, -0.3] },
      ],
      eq,
      held,
      ms,
      cap: lab || cap("Zum Bauch ziehen", "Kontrolliert strecken", "Pull to the belly", "Extend with control"),
    };
  }
  S.row = row({ handA: rel("sh", 2, 53) });
  S.row_pendlay = row({ hipA: [98, 90], th: 82, handA: [140, 135] });
  S.row_tbar = row({ handA: rel("sh", 2, 53), eq: [L([48, 146], "hand", 3), C([48, 146], 4)] });

  // one-arm dumbbell row with the other hand and knee on a bench
  {
    const base = { hip: [100, 86], torso: 70, foot: [118, 145], kp: [1, 0], foot2: [64, 108], kp2: [0, 1], hand2: [146, 109], ep2: [0.3, 1] };
    S.row_db = {
      kf: [
        { ...base, hand: rel("sh", 2, 55), ep: [0, 1] },
        { ...base, hand: rel("sh", -16, 24), ep: [-1, -0.3] },
      ],
      eq: [L([54, 112], [158, 112], 8, "pad"), L([66, 117], [66, FL], 3), L([146, 117], [146, FL], 3)],
      held: "db",
      ms: 3300,
      cap: cap("Ellbogen zur Hüfte ziehen", "Arm strecken", "Pull the elbow to the hip", "Extend the arm"),
    };
  }

  // chest-supported row: lying on an inclined pad
  {
    const base = { hip: [98, 104], torso: 38, foot: [80, 146], kp: [1, 0.1] };
    S.row_chest = {
      kf: [
        { ...base, hand: rel("sh", 3, 55), ep: [0, 1] },
        { ...base, hand: rel("sh", -8, 30), ep: [-1, -0.2] },
      ],
      eq: [backPad(38, -12), L([112, 110], [128, FL], 3), L([96, 116], [84, FL], 3)],
      held: "db",
      ms: 3300,
      cap: cap("Schulterblätter zusammenziehen", "Arme strecken", "Squeeze the shoulder blades", "Extend the arms"),
    };
  }

  // seated cable row / machine row
  {
    const base = { hip: [96, 124], foot: [158, 130], kp: [0, -1] };
    S.row_cable = {
      kf: [
        { ...base, torso: 18, hand: rel("sh", 56, 14), ep: [0, 1] },
        { ...base, torso: -4, hand: rel("sh", 18, 14), ep: [-1, 0.2] },
      ],
      eq: [L([80, 133], [118, 133], 8, "pad"), L([98, 137], [98, FL], 3), L([162, 100], [162, FL], 4), L("hand", [214, 114], 2, "mach", { o: 0.8 }), C([214, 114], 5)],
      held: "grip",
      ms: 3300,
      cap: cap("Zum Bauch ziehen", "Arme strecken", "Pull to the belly", "Extend the arms"),
    };
  }

  // inverted row under a bar (the body looks to the left here)
  {
    const mk = (hip, th) => ({ hip, torso: th, foot: [172, 144], kp: [1, 0], hand: [70, 88], ep: [0.6, 1], toe: 70 });
    S.row_inverted = {
      kf: [mk([104, 135], -90), mk([108.5, 114], -70)],
      eq: [L([46, 88], [70, 88], 4), L([46, 88], [46, FL], 3), C([70, 88], 3.5, "mach", { fill: "var(--c-dim)" })],
      held: "none",
      ms: 3300,
      cap: cap("Brust zur Stange ziehen", "Arme strecken", "Pull the chest to the bar", "Extend the arms"),
      vb: [10, 40, 220],
    };
  }

  // pull-ups / chin-ups
  {
    const bar = [L([125, 14], [168, 14], 4), L([168, 14], [168, FL], 3), C([125, 14], 3.5, "mach", { fill: "var(--c-dim)" })];
    const pose = (sh, th) => ({ sh, torso: th, hand: [125, 14], foot: rel("hip", -24, 32), kp: [1, 0.2], ep: [-0.4, 1], head: -8 });
    S.pullup = { kf: [pose([123, 70], -3), pose([121, 28], -6)], eq: bar, held: "none", ms: 3600, cap: cap("Kinn über die Stange ziehen", "Kontrolliert ablassen", "Chin over the bar", "Lower with control"), vb: ZOUT };
  }

  // lat pulldown at the machine
  {
    const base = { hip: [112, 126], torso: -8, foot: [152, 146], kp: [0, -1] };
    S.pulldown = {
      kf: [
        { ...base, hand: rel("sh", 30, -52), ep: [-0.3, 1] },
        { ...base, torso: -14, hand: rel("sh", 14, 10), ep: [-0.7, 1] },
      ],
      eq: [L([94, 134], [130, 134], 8, "pad"), L([112, 138], [112, FL], 3), L([132, 108], [152, 104], 7, "pad"), L("hand", [150, 2], 2, "mach", { o: 0.8 }), C([150, 2], 5)],
      held: "grip",
      ms: 3400,
      cap: cap("Zur Brust ziehen", "Arme strecken", "Pull to the chest", "Extend the arms"),
    };
  }

  // straight-arm pulldown (standing at a high cable)
  {
    const base = { plant: [120, 145], leg: [18, -10], torso: 26 };
    S.pulldown_straight = {
      kf: [
        { ...base, hand: rel("sh", 44, -34) },
        { ...base, hand: rel("sh", 10, 54) },
      ],
      eq: [L("hand", [168, 6], 2, "mach", { o: 0.8 }), C([168, 6], 5), L([168, 6], [168, FL], 3)],
      held: "grip",
      ms: 3200,
      cap: cap("Gestreckt nach unten ziehen", "Langsam zurück", "Pull down with straight arms", "Back slowly"),
    };
  }

  // dumbbell pullover across a bench
  {
    const base = { hip: [152, 106], torso: -90, head: 12, foot: [172, 144], kp: [0.3, -1] };
    S.pullover = {
      kf: [
        { ...base, arm: [-100, -100] },
        { ...base, arm: [-180, -180] },
      ],
      eq: benchFlat(70, 170, 112.5),
      held: "db",
      ms: 3400,
      cap: cap("Über den Kopf zurück", "Über die Brust hochziehen", "Back over the head", "Up over the chest"),
      vb: [-5, -8, 250],
    };
  }

  // shrugs (front view)
  S.shrug = {
    view: "front",
    kf: [
      { armL: [4, 4], armR: [4, 4], shrug: 0 },
      { armL: [4, 4], armR: [4, 4], shrug: 8 },
    ],
    eq: [],
    held: "db",
    ms: 2600,
    cap: cap("Schultern hochziehen", "Langsam senken", "Shrug up", "Lower slowly"),
  };
}
