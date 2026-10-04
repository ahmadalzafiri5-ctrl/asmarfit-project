// Legs: squats, presses, lunges, curls, calves, jumps.
import { FL, rel, cap, L, C, R, box, backPad, ZOUT } from "./sceneKit.js";

export function addLegs(S) {
  const SQ = cap("Hinsetzen", "Aufstehen", "Sit down", "Stand up");

  function squat({ hands, held = "none", lean = 40, depth = [92, -30], ep, ms = 3400, eq = [], lab }) {
    const A = { plant: [118, 145], leg: [0, 0], torso: 3, hand: hands, ep };
    const B = { plant: [118, 145], leg: depth, torso: lean, hand: hands, ep };
    return { kf: [A, B], eq, held, ms, cap: lab || SQ };
  }
  S.squat = squat({ hands: rel("sh", -3, -4), held: "plate", ep: [-1, 0.2], lean: 42 });
  S.squat_front = squat({ hands: rel("sh", 10, -4), held: "plate", ep: [0.8, -0.6], lean: 28 });
  S.squat_goblet = squat({ hands: rel("sh", 14, 14), held: "db", ep: [0.2, 1], lean: 30 });
  S.squat_smith = squat({ hands: rel("sh", -3, -4), held: "plate", ep: [-1, 0.2], lean: 32, depth: [92, -30], eq: [L([98, 8], [98, FL], 3), L([150, 8], [150, FL], 3)] });

  // hack squat machine: back against an inclined pad
  S.squat_hack = {
    kf: [
      { plant: [140, 145], leg: [0, 0], torso: -12, hand: rel("sh", 8, 16), ep: [0, 1] },
      { plant: [140, 145], leg: [90, -38], torso: -12, hand: rel("sh", 8, 16), ep: [0, 1] },
    ],
    eq: [backPad(-12, 11), L([112, 150], [78, 24], 4, "mach", { o: 0.7 }), L([150, 150], [118, 24], 4, "mach", { o: 0.7 })],
    held: "none",
    ms: 3400,
    cap: SQ,
  };

  // leg press: seated and reclined, the platform moves away
  {
    const base = { hip: [92, 126], torso: -50, kp: [0.4, -1], hand: rel("sh", 14, 16), ep: [0.3, 1], toe: 75 };
    S.legpress = {
      kf: [
        { ...base, foot: [128, 102] },
        { ...base, foot: [160, 92] },
      ],
      eq: [backPad(-50, 11), L([78, 137], [112, 137], 7, "pad"), L([95, 141], [95, FL], 3), L([112, FL], [214, 98], 3, "mach", { o: 0.6 }), L((j) => [j.ankle[0] + 7, j.ankle[1] - 26], (j) => [j.ankle[0] + 15, j.ankle[1] + 24], 7, "pad")],
      held: "none",
      ms: 3400,
      cap: cap("Wegdrücken", "Kontrolliert zurück", "Push away", "Return with control"),
    };
    S.legpress_calf = {
      kf: [
        { ...base, foot: [156, 96], toe: 100 },
        { ...base, foot: [161, 93], toe: 45 },
      ],
      eq: S.legpress.eq,
      held: "none",
      ms: 2400,
      cap: cap("Auf die Zehen drücken", "Fersen senken", "Push up on the toes", "Lower the heels"),
    };
  }

  // leg curls
  {
    const prone = (foot) => ({ hip: [104, 106], torso: 88, head: -8, foot, kp: [0, 1], hand: rel("sh", 14, 10), ep: [0.5, 1] });
    S.legcurl_lying = {
      kf: [prone([38, 105]), prone((j) => [j.hip[0] - 34, j.hip[1] - 38])],
      eq: [L([30, 116.5], [146, 116.5], 7, "pad"), L([44, 121], [44, FL], 3), L([132, 121], [132, FL], 3), C("ankle", 5, "pad", { fill: "var(--c-border)" })],
      held: "none",
      ms: 3000,
      cap: cap("Fersen zum Gesäß ziehen", "Langsam strecken", "Heels to the glutes", "Extend slowly"),
      vb: [10, 50, 220],
    };
    const seat = (leg) => ({ hip: [100, 120], torso: -6, leg, hand: rel("hip", 8, -4), ep: [0.3, 1] });
    const seatEq = [L([88, 126], [114, 126], 7, "pad"), L([101, 130], [101, FL], 3), L([84, 118], [88, 72], 8, "pad"), L([118, 106], [138, 106], 6, "pad"), C("ankle", 5, "pad", { fill: "var(--c-border)" })];
    S.legcurl_seated = { kf: [seat([90, 90]), seat([90, -6])], eq: seatEq, held: "none", ms: 3000, cap: cap("Fersen unter den Sitz ziehen", "Langsam strecken", "Heels under the seat", "Extend slowly") };
    S.legext = { kf: [seat([90, 0]), seat([90, 90])], eq: seatEq, held: "none", ms: 3000, cap: cap("Beine strecken", "Langsam beugen", "Extend the legs", "Bend slowly") };
  }

  // lunges
  function lunge({ lab, held = "none", ms = 3600 }) {
    const A = { hip: [120, 77.5], torso: 0, foot: [124, 145], kp: [1, 0], foot2: [116, 145] };
    const B = { hip: [118, 104], torso: 5, foot: [152, 145], kp: [1, 0], foot2: [80, 136], toe2: 40, kp2: [0, 1] };
    return { kf: [A, B], eq: [], held, ms, cap: lab || cap("Großer Schritt, absenken", "Zurück in den Stand", "Big step, lower down", "Back to standing") };
  }
  S.lunge = lunge({ held: "db" });
  S.lunge_reverse = lunge({ held: "db", lab: cap("Schritt zurück, absenken", "Zurück in den Stand", "Step back, lower down", "Back to standing") });
  S.lunge_curtsy = lunge({ lab: cap("Bein hinter dem anderen kreuzen", "Zurück in den Stand", "Cross one leg behind", "Back to standing") });
  S.lunge_side = {
    view: "front",
    kf: [
      { legL: [3, 3], legR: [3, 3] },
      { hy: 92, legL: [58, 4], legR: [40, 40] },
    ],
    eq: [],
    held: "none",
    ms: 3400,
    cap: cap("Zur Seite ausfallen", "Zurück in die Mitte", "Step out to the side", "Back to the middle"),
  };
  // Bulgarian split squat: the back foot rests on a bench
  {
    const mk = (hip) => ({ hip, torso: 8, foot: [146, 145], kp: [1, 0], foot2: [66, 108], toe2: 40, kp2: [0, 1] });
    S.split_bulgarian = { kf: [mk([122, 82]), mk([120, 106])], eq: [L([36, 112], [84, 112], 7, "pad"), L([46, 116], [46, FL], 3), L([74, 116], [74, FL], 3)], held: "db", ms: 3500, cap: SQ };
  }
  // step-up onto a box
  {
    S.stepup = {
      kf: [
        { hip: [130, 80], torso: 6, foot: [154, 108], kp: [1, 0], foot2: [118, 145] },
        { hip: [152, 40], torso: 0, foot: [154, 108], kp: [1, 0], foot2: [160, 112] },
      ],
      eq: [box(134, 111, 62, 37)],
      held: "db",
      ms: 3400,
      cap: cap("Auf die Box steigen", "Kontrolliert absteigen", "Step up onto the box", "Step down with control"),
      vb: ZOUT,
    };
  }

  // calves
  S.calf = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0 },
      { plant: [120, 137], leg: [0, 0], torso: 0, toe: 40 },
    ],
    eq: [],
    held: "db",
    ms: 2400,
    cap: cap("Auf die Zehenspitzen", "Fersen senken", "Up on the toes", "Lower the heels"),
  };
  {
    const mk = (foot, toe) => ({ hip: [100, 112], torso: 0, foot, kp: [1, -1], toe, hand: rel("hip", 14, -2), ep: [0.2, 1] });
    S.calf_seated = {
      kf: [mk((j) => [j.hip[0] + 34, j.hip[1] + 34], 90), mk((j) => [j.hip[0] + 34, j.hip[1] + 27], 40)],
      eq: [L((j) => [j.hip[0] - 12, j.hip[1] + 9], (j) => [j.hip[0] + 12, j.hip[1] + 9], 7, "pad"), L((j) => [j.hip[0], j.hip[1] + 14], (j) => [j.hip[0], FL], 3), L((j) => [j.hip[0] + 24, j.hip[1] - 9], (j) => [j.hip[0] + 46, j.hip[1] - 9], 8, "pad")],
      held: "none",
      ms: 2400,
      cap: cap("Fersen anheben", "Fersen senken", "Raise the heels", "Lower the heels"),
    };
  }

  // adductor / abductor machines (front view, seated)
  {
    const mk = (a, k) => ({ hy: 108, legL: [a, 0, k, 1], legR: [a, 0, k, 1], handL: [86, 96], handR: [154, 96] });
    const eq = [L([100, 118], [140, 118], 9, "pad"), L([120, 122], [120, FL], 3), C("kneeL", 5, "pad", { fill: "var(--c-border)" }), C("kneeR", 5, "pad", { fill: "var(--c-border)" })];
    S.adductor = { view: "front", kf: [mk(80, 0.85), mk(16, 0.6)], eq, held: "none", ms: 3000, cap: cap("Beine zusammendrücken", "Kontrolliert öffnen", "Squeeze the legs together", "Open with control") };
    S.abductor = { view: "front", kf: [mk(16, 0.6), mk(80, 0.85)], eq, held: "none", ms: 3000, cap: cap("Beine nach außen drücken", "Kontrolliert schließen", "Push the legs apart", "Close with control") };
  }

  // wall sit: slide down, then hold
  S.wall_sit = {
    kf: [
      { plant: [150, 145], leg: [0, 0], torso: 0, hand: (j) => [j.sh[0] + 6, j.sh[1] + 54] },
      { plant: [150, 145], leg: [90, 0], torso: 0, hand: (j) => [j.knee[0] - 10, j.knee[1] - 6], ep: [0.2, 1] },
    ],
    eq: [L([103, 4], [103, FL], 5, "pad")],
    held: "none",
    ms: 4200,
    hold: 0.3,
    cap: cap("Am Wand hinuntergleiten, dann halten", "Wieder aufstehen", "Slide down the wall, then hold", "Stand back up"),
  };

  // pistol squat: one leg, the other stays out in front
  {
    const A = { hip: [120, 77.5], torso: 0, foot: [124, 145], kp: [1, 0], foot2: (j) => [j.hip[0] + 22, j.hip[1] + 44], hand: rel("sh", 52, 4), ep: [0, 1] };
    const B = { hip: [100, 112], torso: 40, foot: [124, 145], kp: [1, 0], foot2: (j) => [j.hip[0] + 66, j.hip[1] - 2], hand: rel("sh", 54, 2), ep: [0, 1] };
    S.squat_pistol = { kf: [A, B], eq: [], held: "none", ms: 3800, cap: cap("Auf einem Bein absenken", "Aufstehen", "Lower on one leg", "Stand up") };
  }

  // jumps (zoomed out)
  {
    const A = { plant: [118, 145], leg: [78, -28], torso: 34, arm: [-45, -45] };
    const B = { plant: [118, 124], leg: [0, 0], torso: 0, toe: 45, arm: [140, 140] };
    S.jump_squat = { kf: [A, B], eq: [], held: "none", ms: 2200, hold: 0.04, cap: cap("Explosiv abspringen", "Weich landen", "Jump explosively", "Land softly"), vb: ZOUT };
    S.box_jump = {
      kf: [
        { plant: [94, 145], leg: [80, -28], torso: 36, arm: [-45, -45] },
        { plant: [128, 92], leg: [75, -50], torso: 20, arm: [60, 60] },
        { plant: [160, 111], leg: [0, 0], torso: 0, arm: [5, 5] },
      ],
      eq: [box(136, 114, 62, 34)],
      held: "none",
      ms: 3200,
      cap: cap("Auf die Box springen", "Zurück absteigen", "Jump onto the box", "Step back down"),
      vb: ZOUT,
    };
  }

  // sissy squat: knees travel far forward, the torso leans back
  S.squat_sissy = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: [168, 84], ep: [0.3, 1] },
      { plant: [120, 138], leg: [60, -55], torso: -35, toe: 45, hand: [168, 84], ep: [0.3, 1] },
    ],
    eq: [L([172, 60], [172, FL], 4)],
    held: "none",
    ms: 3400,
    cap: cap("Knie nach vorn schieben", "Zurück aufrichten", "Push the knees forward", "Come back up"),
  };

  // nordic hamstring curl: kneeling, the body falls forward in one line
  S.curl_nordic = {
    kf: [
      { hip: [108, 112], torso: 0, leg: [0, -90], hand: rel("sh", 14, 22), ep: [0.3, 1] },
      { hip: [140.8, 131.6], torso: 65, leg: [-65, -90], hand: [204, 145], ep: [0.2, 1] },
    ],
    eq: [L([62, 139], [88, 139], 8, "pad")],
    held: "none",
    ms: 4000,
    cap: cap("Langsam nach vorn fallen lassen", "Mit den Händen abfangen und hochkommen", "Lower yourself forward slowly", "Catch with your hands and come back"),
  };
}
