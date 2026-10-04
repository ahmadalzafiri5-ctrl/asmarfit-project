// Shoulders and arms.
import { FL, rel, cap, L, C, R, box, backPad, benchFlat, ZOUT } from "./sceneKit.js";

export function addShoulders(S) {
  const UP = cap("Über den Kopf drücken", "Zurück zu den Schultern", "Press overhead", "Back to the shoulders");

  // overhead press, standing (barbell)
  S.ohp = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 12, -2), ep: [0.6, 1] },
      { plant: [120, 145], leg: [0, 0], torso: -3, hand: rel("sh", 3, -54), ep: [0.6, 1] },
    ],
    eq: [],
    held: "plate",
    ms: 3300,
    cap: UP,
    vb: ZOUT,
  };
  // seated dumbbell / Arnold / machine press
  function seatedPress({ held = "db", a, eq = [], lab = UP }) {
    const base = { hip: [114, 114], torso: -3, foot: [150, 145], kp: [0, -1] };
    return {
      kf: [
        { ...base, hand: a, ep: [0.2, 1] },
        { ...base, hand: rel("sh", 3, -54), ep: [0.2, 1] },
      ],
      eq: [L([98, 122], [132, 122], 7, "pad"), L([115, 126], [115, FL], 3), backPad(-3, 11), ...eq],
      held,
      ms: 3300,
      cap: lab,
      vb: ZOUT,
    };
  }
  S.press_db = seatedPress({ a: rel("sh", 9, -4) });
  S.press_arnold = seatedPress({ a: rel("sh", 18, -10), lab: cap("Drehen und über den Kopf drücken", "Zurückdrehen", "Rotate and press overhead", "Rotate back") });
  S.press_machine_shoulder = seatedPress({ held: "none", a: rel("sh", 9, -4), eq: [C("hand", 5, "mach", { w: 2.5 })] });

  // push press: dip with the knees, drive the bar overhead
  S.press_push = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 12, -2), ep: [0.6, 1] },
      { plant: [120, 145], leg: [34, -20], torso: 5, hand: rel("sh", 12, -2), ep: [0.6, 1] },
      { plant: [120, 145], leg: [0, 0], torso: -3, hand: rel("sh", 3, -54), ep: [0.6, 1] },
    ],
    eq: [],
    held: "plate",
    ms: 3600,
    cap: cap("Kurz in die Knie, dann explosiv drücken", "Zurück zu den Schultern", "Dip, then drive overhead", "Back to the shoulders"),
    vb: ZOUT,
  };

  // landmine press: the bar is anchored on the floor
  S.press_landmine = {
    kf: [
      { plant: [120, 145], leg: [8, -6], torso: 4, hand: rel("sh", 20, 4), ep: [0.2, 1] },
      { plant: [120, 145], leg: [0, 0], torso: -2, hand: rel("sh", 38, -42), ep: [0.2, 1] },
    ],
    eq: [L([40, 146], "hand", 3), C([40, 146], 4)],
    held: "db",
    ms: 3200,
    cap: cap("Schräg nach oben drücken", "Zurück zur Schulter", "Press up and forward", "Back to the shoulder"),
    vb: ZOUT,
  };

  // upright row
  S.row_upright = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 8, 52), ep: [0.2, -0.8] },
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 12, 12), ep: [0.3, -1] },
    ],
    eq: [],
    held: "plate",
    ms: 3000,
    cap: cap("Ellbogen hoch, Stange zum Kinn", "Langsam senken", "Elbows up, bar to the chin", "Lower slowly"),
  };

  // front raise
  S.raise_front = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [4, 4] },
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [88, 88] },
    ],
    eq: [],
    held: "db",
    ms: 3000,
    cap: cap("Arme bis Schulterhöhe heben", "Langsam senken", "Raise to shoulder height", "Lower slowly"),
  };

  // lateral raises (front view)
  S.raise_lateral = {
    view: "front",
    kf: [
      { armL: [6, 6], armR: [6, 6] },
      { armL: [86, 80], armR: [86, 80] },
    ],
    eq: [],
    held: "db",
    ms: 3000,
    cap: cap("Seitlich bis Schulterhöhe heben", "Langsam senken", "Raise out to the sides", "Lower slowly"),
  };
  S.raise_lateral_cable = {
    view: "front",
    kf: [
      { armL: [4, 4], armR: [10, 10] },
      { armL: [4, 4], armR: [86, 80] },
    ],
    eq: [L("handR", [200, 140], 2, "mach", { o: 0.8 }), C([200, 140], 5), L([200, 140], [200, FL], 3)],
    held: "grip",
    ms: 3000,
    cap: cap("Seitlich bis Schulterhöhe heben", "Langsam senken", "Raise out to the side", "Lower slowly"),
  };

  // face pull at a high cable
  S.facepull = {
    kf: [
      { plant: [120, 145], leg: [4, -4], torso: -4, hand: rel("sh", 54, 4), ep: [0, 1] },
      { plant: [120, 145], leg: [4, -4], torso: -4, hand: rel("sh", 12, -6), ep: [-0.2, -1] },
    ],
    eq: [L("hand", [212, 36], 2, "mach", { o: 0.8 }), C([212, 36], 5), L([212, 36], [212, FL], 3)],
    held: "grip",
    ms: 3200,
    cap: cap("Zum Gesicht ziehen, Ellbogen hoch", "Arme strecken", "Pull to the face, elbows high", "Extend the arms"),
  };

  // rear-delt movements (front view, torso bent forward so it looks short)
  S.reardelt = {
    view: "front",
    kf: [
      { tk: 0.35, hy: 82, legL: [10, 10], legR: [10, 10], armL: [4, 4], armR: [4, 4] },
      { tk: 0.35, hy: 82, legL: [10, 10], legR: [10, 10], armL: [86, 82], armR: [86, 82] },
    ],
    eq: [],
    held: "db",
    ms: 3000,
    cap: cap("Arme zur Seite heben", "Langsam senken", "Raise the arms out to the sides", "Lower slowly"),
  };
  S.reardelt_cable = {
    view: "front",
    kf: [
      { handL: [128, 52], handR: [112, 52] },
      { handL: [62, 46], handR: [178, 46] },
    ],
    eq: [L("handL", [212, 10], 2, "mach", { o: 0.8 }), L("handR", [28, 10], 2, "mach", { o: 0.8 }), C([212, 10], 5), C([28, 10], 5), L([212, 10], [212, FL], 3), L([28, 10], [28, FL], 3)],
    held: "grip",
    ms: 3200,
    cap: cap("Arme weit öffnen", "Kontrolliert zurück", "Open the arms wide", "Back with control"),
  };
  S.reardelt_machine = {
    view: "front",
    kf: [
      { hy: 108, legL: [0, 0, 0.12, 1], legR: [0, 0, 0.12, 1], handL: [114, 78], handR: [126, 78] },
      { hy: 108, legL: [0, 0, 0.12, 1], legR: [0, 0, 0.12, 1], handL: [52, 60], handR: [188, 60] },
    ],
    eq: [L([98, 118], [142, 118], 9, "pad"), L([120, 122], [120, FL], 3), L([40, 54], [40, 80], 8, "pad"), L([200, 54], [200, 80], 8, "pad")],
    held: "none",
    ms: 3400,
    cap: cap("Arme nach hinten öffnen", "Kontrolliert zurück", "Open the arms backwards", "Back with control"),
  };

  // Y raise: arms travel up into a Y
  S.raise_y = {
    view: "front",
    kf: [
      { armL: [14, 14], armR: [14, 14] },
      { armL: [150, 150], armR: [150, 150] },
    ],
    eq: [],
    held: "none",
    ms: 3000,
    cap: cap("Arme im Y nach oben heben", "Langsam senken", "Raise the arms into a Y", "Lower slowly"),
    vb: ZOUT,
  };
  // band pull-apart
  S.pullapart = {
    view: "front",
    kf: [
      { handL: [112, 50], handR: [128, 50] },
      { handL: [58, 46], handR: [182, 46] },
    ],
    eq: [L("handL", "handR", 2.5, "mach")],
    held: "grip",
    ms: 2800,
    cap: cap("Band auseinanderziehen", "Langsam zurück", "Pull the band apart", "Back slowly"),
  };
  // external rotation with a dumbbell, elbow at the side
  S.rotation_external = {
    view: "front",
    kf: [
      { armL: [4, 4], armR: [8, 62, 1, 0.35] },
      { armL: [4, 4], armR: [8, 92, 1, 1] },
    ],
    eq: [],
    held: "db",
    ms: 3000,
    cap: cap("Unterarm nach außen drehen", "Langsam zurück", "Rotate the forearm outward", "Back slowly"),
  };

  /* ------------------------------------------------------- arms */
  const CURL = cap("Hochcurlen", "Langsam senken", "Curl up", "Lower slowly");
  S.curl = { kf: [{ plant: [120, 145], leg: [0, 0], torso: 0, arm: [-3, -3] }, { plant: [120, 145], leg: [0, 0], torso: 0, arm: [8, 150] }], eq: [], held: "plate", ms: 3000, cap: CURL };
  S.curl_db = { ...S.curl, held: "db" };
  S.curl_cable = { ...S.curl, held: "grip", eq: [L("hand", [176, 146], 2, "mach", { o: 0.8 }), C([176, 146], 5)] };
  // incline curl: reclined, the arms hang behind the body
  {
    const base = { hip: [114, 122], torso: -38, foot: [148, 146], kp: [0.2, -1] };
    S.curl_incline = {
      kf: [{ ...base, arm: [-3, -3] }, { ...base, arm: [-2, 140] }],
      eq: [backPad(-38, 11), L([98, 132], [130, 132], 7, "pad"), L([114, 136], [114, FL], 3), L([84, 110], [74, FL], 3)],
      held: "db",
      ms: 3200,
      cap: CURL,
    };
  }
  // concentration curl: elbow braced on the inner thigh
  {
    const base = { hip: [106, 120], torso: 50, foot: [146, 146], kp: [0.3, -1] };
    S.curl_concentration = { kf: [{ ...base, arm: [6, 6] }, { ...base, arm: [6, 152] }], eq: [L([88, 130], [120, 130], 7, "pad"), L([104, 134], [104, FL], 3)], held: "db", ms: 3200, cap: CURL };
  }
  // spider curl: chest on an inclined pad, the arms hang straight down
  {
    const base = { hip: [98, 104], torso: 38, foot: [80, 146], kp: [1, 0.1] };
    S.curl_spider = { kf: [{ ...base, arm: [2, 2] }, { ...base, arm: [2, 150] }], eq: [backPad(38, -12), L([112, 110], [128, FL], 3), L([96, 116], [84, FL], 3)], held: "db", ms: 3200, cap: CURL };
  }
  // preacher curl: the upper arm lies on an angled pad
  {
    const base = { hip: [96, 118], torso: -6, foot: [136, 146], kp: [0.3, -1] };
    S.curl_preacher = {
      kf: [{ ...base, arm: [38, 38] }, { ...base, arm: [38, 160] }],
      eq: [L((j) => [j.sh[0] + 4, j.sh[1] + 8], (j) => [j.sh[0] + 38, j.sh[1] + 50], 9, "pad"), L((j) => [j.sh[0] + 20, j.sh[1] + 38], (j) => [j.sh[0] + 14, FL], 3), L([84, 126], [112, 126], 7, "pad"), L([98, 130], [98, FL], 3)],
      held: "plate",
      ms: 3200,
      cap: CURL,
    };
  }
  // wrist curl: forearms rest on the thighs, only the wrist moves
  {
    const base = { hip: [100, 120], torso: 24, foot: [140, 146], kp: [0.3, -1], hand: (j) => [j.hip[0] + 40, j.hip[1] - 12], ep: [0.4, -1] };
    S.curl_wrist = { kf: [{ ...base, wr: -40 }, { ...base, wr: 45 }], eq: [L([86, 130], [118, 130], 7, "pad"), L([102, 134], [102, FL], 3)], held: "db", ms: 2600, cap: cap("Handgelenk nach oben beugen", "Langsam senken", "Curl the wrist up", "Lower slowly") };
  }

  // triceps
  S.pushdown = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [3, 90] },
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [3, 3] },
    ],
    eq: [L("hand", [160, 4], 2, "mach", { o: 0.8 }), C([160, 4], 5), L([160, 4], [160, FL], 3)],
    held: "grip",
    ms: 2800,
    cap: cap("Arme nach unten strecken", "Langsam zurück", "Push down until straight", "Back slowly"),
  };
  {
    const base = { hip: [152, 106], torso: -90, head: 12, foot: [172, 144], kp: [0.3, -1] };
    S.skullcrusher = {
      kf: [{ ...base, arm: [180, 180] }, { ...base, arm: [195, 262] }],
      eq: benchFlat(70, 170, 112.5),
      held: "plate",
      ms: 3400,
      cap: cap("Gewicht zur Stirn senken", "Arme strecken", "Lower the weight to the forehead", "Extend the arms"),
      vb: [-5, -8, 250],
    };
  }
  S.extension_overhead = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [180, 180] },
      { plant: [120, 145], leg: [0, 0], torso: 0, arm: [178, 310] },
    ],
    eq: [],
    held: "db",
    ms: 3400,
    cap: cap("Hinter den Kopf senken", "Arme nach oben strecken", "Lower behind the head", "Extend overhead"),
    vb: ZOUT,
  };
  {
    const base = { hip: [100, 84], torso: 66, foot: [121, 145], kp: [1, 0] };
    S.kickback = {
      kf: [{ ...base, arm: [-70, 0] }, { ...base, arm: [-70, -70] }],
      eq: [],
      held: "db",
      ms: 3000,
      cap: cap("Unterarm nach hinten strecken", "Langsam beugen", "Extend the forearm backwards", "Bend slowly"),
    };
  }
}
