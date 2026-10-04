// Core and glutes.
import { FL, rel, cap, L, C, R, box, benchFlat, ZOUT, ZLOW } from "./sceneKit.js";

export function addCore(S) {
  const HOLD = (de, en) => ({ de: [de], en: [en] });
  const lie = { hip: [152, 141.5], head: 12, foot: [176, 144], kp: [0.3, -1] };
  const behindHead = (j) => [j.head[0] + 5, j.head[1] - 7];

  // crunch / sit-up
  S.crunch = {
    kf: [
      { ...lie, torso: -90, hand: behindHead, ep: [-0.5, -1] },
      { ...lie, torso: -62, head: 22, hand: behindHead, ep: [-0.5, -1] },
    ],
    eq: [],
    held: "none",
    ms: 2600,
    cap: cap("Oberkörper einrollen", "Langsam ablegen", "Curl the upper body up", "Lower slowly"),
    vb: ZLOW,
  };
  S.situp = {
    kf: [
      { ...lie, torso: -90, hand: behindHead, ep: [-0.5, -1] },
      { ...lie, torso: -12, head: 8, hand: behindHead, ep: [-0.5, -1] },
    ],
    eq: [],
    held: "none",
    ms: 3000,
    cap: cap("Ganz aufrichten", "Langsam ablegen", "Sit all the way up", "Lower slowly"),
    vb: ZLOW,
  };
  {
    const base = { hip: [154, 112], foot: [182, 98], kp: [0.5, -1], head: 10 };
    S.situp_decline = {
      kf: [
        { ...base, torso: -112, hand: behindHead, ep: [-0.5, -1] },
        { ...base, torso: -18, hand: behindHead, ep: [-0.5, -1] },
      ],
      eq: [L([60, 138], [168, 118], 8, "pad"), L([78, 144], [78, FL], 3), L([158, 124], [158, FL], 3), L([176, 100], [188, 104], 5, "pad")],
      held: "none",
      ms: 3000,
      cap: cap("Aufrichten", "Langsam ablegen", "Sit up", "Lower slowly"),
      vb: [20, 10, 200],
    };
  }

  // bicycle crunch: opposite elbow and knee meet
  {
    const base = { hip: [152, 141.5], torso: -68, head: 20, hand: behindHead, ep: [-0.5, -1], kp: [0.4, -1], kp2: [0.4, -1] };
    S.crunch_bicycle = {
      kf: [
        { ...base, foot: [218, 140], foot2: (j) => [j.hip[0] + 30, j.hip[1] - 26] },
        { ...base, foot: (j) => [j.hip[0] + 30, j.hip[1] - 26], foot2: [218, 140] },
      ],
      eq: [],
      held: "none",
      ms: 2400,
      cap: cap("Ellbogen zum Gegenknie", "Seite wechseln", "Elbow to the opposite knee", "Switch sides"),
      vb: ZLOW,
    };
  }

  // legs raised from the floor
  {
    const base = { hip: [150, 141.5], torso: -90, head: 12, hand: (j) => [j.sh[0] + 52, j.sh[1] + 1], ep: [0, 1], kp: [0, -1] };
    S.legraise_lying = { kf: [{ ...base, foot: [216, 141] }, { ...base, foot: (j) => [j.hip[0] + 2, j.hip[1] - 68] }], eq: [], held: "none", ms: 3200, cap: cap("Beine senkrecht heben", "Langsam senken", "Raise the legs straight up", "Lower slowly"), vb: ZLOW };
    S.flutter = {
      kf: [
        { ...base, foot: (j) => [j.hip[0] + 64, j.hip[1] - 26], foot2: (j) => [j.hip[0] + 68, j.hip[1] - 8] },
        { ...base, foot: (j) => [j.hip[0] + 68, j.hip[1] - 8], foot2: (j) => [j.hip[0] + 64, j.hip[1] - 26] },
      ],
      eq: [],
      held: "none",
      ms: 1100,
      hold: 0.02,
      cap: HOLD("Beine abwechselnd auf und ab", "Alternate the legs up and down"),
      vb: ZLOW,
    };
    S.vup = {
      kf: [
        { ...base, hand: (j) => [j.sh[0] - 56, 144], foot: [216, 141] },
        { ...base, torso: -30, head: 10, hand: (j) => [j.ankle[0] - 10, j.ankle[1] - 4], foot: (j) => [j.hip[0] + 50, j.hip[1] - 46] },
      ],
      eq: [],
      held: "none",
      ms: 3000,
      cap: cap("Hände zu den Füßen, V bilden", "Langsam ablegen", "Reach for the feet and make a V", "Lower slowly"),
      vb: ZLOW,
    };
    S.hollow = {
      kf: [
        { ...base, hand: (j) => [j.sh[0] - 56, 144], foot: [216, 141] },
        { ...base, torso: -80, head: 18, hand: (j) => [j.sh[0] - 54, j.sh[1] - 10], foot: (j) => [j.hip[0] + 66, j.hip[1] - 20] },
      ],
      eq: [],
      held: "none",
      ms: 3200,
      hold: 0.3,
      cap: cap("Banane: Rücken am Boden, Beine und Schultern heben, halten", "Ablegen", "Banana shape: lower back down, lift legs and shoulders, hold", "Lower down"),
      vb: ZLOW,
    };
    // dead bug: opposite arm and leg lower toward the floor
    const tab = (j) => [j.hip[0] + 34, j.hip[1] - 34];
    S.deadbug = {
      kf: [
        { ...base, hand: (j) => [j.sh[0] - 56, 142], hand2: (j) => [j.sh[0] + 2, j.sh[1] - 54], foot: [214, 130], foot2: tab },
        { ...base, hand: (j) => [j.sh[0] + 2, j.sh[1] - 54], hand2: (j) => [j.sh[0] - 56, 142], foot: tab, foot2: [214, 130] },
      ],
      eq: [],
      held: "none",
      ms: 3200,
      cap: cap("Gegenarm und Gegenbein senken", "Seite wechseln", "Lower the opposite arm and leg", "Switch sides"),
      vb: ZLOW,
    };
  }

  // plank (hold) on the forearms
  {
    const pl = (f) => ({ plant: [42, 141], leg: [-f, -f], torso: f, toe: 25, arm: [0, 90] });
    S.plank = { kf: [pl(76), pl(78)], eq: [], held: "none", ms: 3200, hold: 0.2, cap: HOLD("Halten: Körper bildet eine gerade Linie", "Hold: keep the body in one straight line"), vb: ZLOW };
  }
  // side plank (front view): hips dip and rise
  S.plank_side = {
    view: "front",
    kf: [
      { cx: 110, hy: 126, lean: 73, footL: [46, 146], footR: [48, 146], armR: [0, 0, 1, 0.3], armL: [176, 176] },
      { cx: 110, hy: 138, lean: 59, footL: [46, 146], footR: [48, 146], armR: [0, 0, 1, 0.3], armL: [176, 176] },
    ],
    eq: [],
    held: "none",
    ms: 3200,
    cap: cap("Hüfte hochdrücken, Körper in einer Linie", "Hüfte kurz absenken", "Lift the hips, one straight line", "Dip the hips slightly"),
    vb: [10, 10, 220],
  };
  // mountain climber: knees driven toward the chest in a push-up position
  {
    const base = { hip: [108, 110], torso: 63, hand: [152, 145], ep: [-1, 0.3], toe: 30, toe2: 30, kp: [1, -0.6], kp2: [1, -0.6] };
    const out = [48, 140];
    const tuck = (j) => [j.hip[0] + 30, j.hip[1] + 20];
    S.climber = { kf: [{ ...base, foot: out, foot2: tuck }, { ...base, foot: tuck, foot2: out }], eq: [], held: "none", ms: 1200, hold: 0.02, cap: HOLD("Knie abwechselnd zur Brust ziehen", "Alternate the knees to the chest"), vb: ZLOW };
  }
  // bird dog: opposite arm and leg reach out
  {
    const base = { hip: [97, 109], torso: 66, kp: [1, 0.5], kp2: [1, 0.5], toe: 90 };
    const handFloor = [135, 146];
    S.birddog = {
      kf: [
        { ...base, hand: handFloor, hand2: [141, 146], foot: [62, 143], foot2: [64, 143], ep: [0, 1] },
        { ...base, hand: handFloor, hand2: (j) => [j.sh[0] + 56, j.sh[1] - 10], foot: (j) => [j.hip[0] - 66, j.hip[1] - 4], foot2: [64, 143], ep: [0, 1] },
      ],
      eq: [],
      held: "none",
      ms: 3400,
      hold: 0.25,
      cap: cap("Gegenarm und Gegenbein strecken", "Zurück in den Vierfüßlerstand", "Reach the opposite arm and leg out", "Back to all fours"),
      vb: ZLOW,
    };
  }
  // ab wheel rollout from the knees
  S.abwheel = {
    kf: [
      { hip: [92, 112], torso: 22, leg: [0, -90], hand: (j) => [j.sh[0] + 12, 140], ep: [0.3, 1] },
      { hip: [140.8, 131.6], torso: 78, leg: [-65, -90], hand: [204, 141], ep: [0.3, 1] },
    ],
    eq: [],
    held: "ball",
    ms: 3600,
    cap: cap("Langsam nach vorn rollen", "Zurückziehen", "Roll out slowly", "Pull back"),
  };

  // hanging work (zoomed out, bar overhead)
  {
    const bar = [L([128, -24], [172, -24], 4), L([172, -24], [172, FL], 3), C([128, -24], 3.5, "mach", { fill: "var(--c-dim)" })];
    const hang = (leg, torso = -3) => ({ sh: [124, 31], torso, hand: [128, -24], leg, ep: [-0.4, 1] });
    S.hang_legraise = { kf: [hang([4, 4]), hang([92, 92], -10)], eq: bar, held: "none", ms: 3400, cap: cap("Beine bis zur Waagrechten heben", "Langsam senken", "Raise the legs to horizontal", "Lower slowly"), vb: ZOUT };
    S.hang_toestobar = { kf: [hang([4, 4]), hang([150, 156], -16)], eq: bar, held: "none", ms: 3600, cap: cap("Füße zur Stange heben", "Kontrolliert senken", "Lift the feet to the bar", "Lower with control"), vb: ZOUT };
  }
  // L-sit between two supports
  S.lsit = {
    kf: [
      { sh: [128, 92], torso: 0, hand: [128, 146], leg: [95, 50], ep: [0, 1] },
      { sh: [128, 92], torso: 0, hand: [128, 146], leg: [90, 90], ep: [0, 1] },
    ],
    eq: [L([118, 140], [138, 140], 5, "pad")],
    held: "none",
    ms: 3200,
    hold: 0.3,
    cap: cap("Beine gestreckt anheben und halten", "Absetzen", "Lift the legs straight and hold", "Set down"),
    vb: ZLOW,
  };

  // kneeling cable crunch
  S.crunch_cable = {
    kf: [
      { hip: [112, 112], torso: 12, leg: [0, -90], hand: (j) => [j.head[0] + 6, j.head[1] + 8], ep: [-0.5, -1] },
      { hip: [112, 112], torso: 82, leg: [0, -90], hand: (j) => [j.head[0] + 6, j.head[1] + 8], ep: [-0.5, -1] },
    ],
    eq: [L("hand", [134, 8], 2, "mach", { o: 0.8 }), C([134, 8], 5), L([134, 8], [134, 60], 3)],
    held: "grip",
    ms: 3000,
    cap: cap("Wirbelsäule nach unten einrollen", "Langsam aufrichten", "Curl the spine down", "Rise slowly"),
  };
  // russian twist (front view): the weight travels from side to side
  S.twist = {
    view: "front",
    kf: [
      { hy: 118, tk: 0.9, lean: -14, legL: [8, 0, 0.35, 0.8], legR: [8, 0, 0.35, 0.8], handL: [74, 100], handR: [88, 112] },
      { hy: 118, tk: 0.9, lean: 14, legL: [8, 0, 0.35, 0.8], legR: [8, 0, 0.35, 0.8], handL: [152, 112], handR: [166, 100] },
    ],
    eq: [C((j) => [(j.handL[0] + j.handR[0]) / 2, (j.handL[1] + j.handR[1]) / 2], 8, "plate", { w: 2, fill: "var(--c-dim)", front: true })],
    held: "none",
    ms: 2200,
    cap: cap("Oberkörper zur Seite drehen", "Zur anderen Seite", "Rotate to one side", "Rotate to the other side"),
  };
  // Pallof press and woodchop at the cable
  S.pallof = {
    kf: [
      { plant: [120, 145], leg: [10, -8], torso: 0, hand: rel("sh", 16, 16), ep: [-0.2, 1] },
      { plant: [120, 145], leg: [10, -8], torso: 0, hand: rel("sh", 56, 10), ep: [-0.2, 1] },
    ],
    eq: [L("hand", [26, 100], 2, "mach", { o: 0.8 }), C([26, 100], 5), L([26, 100], [26, FL], 3)],
    held: "grip",
    ms: 3400,
    hold: 0.2,
    cap: cap("Arme gegen den Zug nach vorn strecken", "Zurück zur Brust", "Press out against the pull", "Back to the chest"),
  };
  S.woodchop = {
    kf: [
      { plant: [120, 145], leg: [16, -12], torso: -8, hand: rel("sh", -20, -30), ep: [0, 1] },
      { plant: [120, 145], leg: [16, -12], torso: 30, hand: rel("sh", 34, 26), ep: [0, 1] },
    ],
    eq: [L("hand", [26, 6], 2, "mach", { o: 0.8 }), C([26, 6], 5), L([26, 6], [26, FL], 3)],
    held: "grip",
    ms: 3000,
    cap: cap("Diagonal nach unten ziehen", "Kontrolliert zurück", "Chop diagonally downward", "Return with control"),
  };

  /* ------------------------------------------------------- glutes */
  // hip thrust with the shoulders on a bench
  S.hipthrust = {
    kf: [
      { sh: [90, 108], torso: -45, head: -8, foot: [150, 144], kp: [0.3, -1], hand: (j) => [j.hip[0] - 4, j.hip[1] - 2], ep: [0.3, 1] },
      { sh: [90, 108], torso: -92, head: -8, foot: [150, 144], kp: [0.3, -1], hand: (j) => [j.hip[0] - 4, j.hip[1] - 2], ep: [0.3, 1] },
    ],
    eq: [L([62, 122], [108, 122], 8, "pad"), L([72, 127], [72, FL], 3), L([98, 127], [98, FL], 3)],
    held: "plate",
    ms: 3200,
    hold: 0.2,
    cap: cap("Hüfte hochdrücken, Gesäß anspannen", "Kontrolliert senken", "Drive the hips up and squeeze", "Lower with control"),
    vb: ZLOW,
  };
  // glute bridge on the floor
  {
    const base = { sh: [84, 141.5], head: 12, foot: [152, 144], kp: [0.3, -1], hand: (j) => [j.sh[0] + 52, j.sh[1] + 2], ep: [0, 1] };
    S.bridge = { kf: [{ ...base, torso: -90 }, { ...base, torso: -115 }], eq: [], held: "none", ms: 3000, hold: 0.2, cap: cap("Hüfte anheben, Gesäß anspannen", "Langsam senken", "Lift the hips and squeeze", "Lower slowly"), vb: ZLOW };
    S.bridge_single = {
      kf: [{ ...base, torso: -90, foot2: (j) => [j.hip[0] + 28, j.hip[1] - 24] }, { ...base, torso: -115, foot2: (j) => [j.hip[0] + 62, j.hip[1] - 28] }],
      eq: [],
      held: "none",
      ms: 3200,
      hold: 0.2,
      cap: cap("Hüfte anheben, ein Bein gestreckt", "Langsam senken", "Lift the hips, one leg straight", "Lower slowly"),
      vb: ZLOW,
    };
  }
  // cable glute kickback, holding a support
  S.kickback_cable = {
    kf: [
      { hip: [120, 80], torso: 14, foot2: [112, 145], kp2: [1, 0], leg: [2, 2], hand: [176, 84], ep: [0, 1] },
      { hip: [120, 80], torso: 22, foot2: [112, 145], kp2: [1, 0], leg: [-44, -50], hand: [176, 84], ep: [0, 1] },
    ],
    eq: [L([176, 60], [176, FL], 4), L("ankle", [200, 140], 2, "mach", { o: 0.8 }), C([200, 140], 5)],
    held: "none",
    ms: 3000,
    cap: cap("Bein nach hinten strecken", "Langsam zurück", "Kick the leg back", "Return slowly"),
  };
  // quadruped glute work
  {
    const base = { hip: [97, 109], torso: 66, hand: [135, 146], hand2: [141, 146], ep: [0, 1], leg2: [0, -90] };
    S.donkey = { kf: [{ ...base, leg: [0, -90] }, { ...base, leg: [-90, -180] }], eq: [], held: "none", ms: 2800, cap: cap("Fuß zur Decke drücken", "Langsam zurück", "Press the foot to the ceiling", "Return slowly"), vb: ZLOW };
    S.hydrant = { kf: [{ ...base, leg: [0, -90] }, { ...base, leg: [-52, -96] }], eq: [], held: "none", ms: 2800, cap: cap("Knie seitlich anheben", "Langsam zurück", "Lift the knee out to the side", "Return slowly"), vb: ZLOW };
  }
  // clamshell: lying on the side, the top knee opens (seen from the front)
  S.clamshell = {
    kf: [
      { hip: [124, 138], torso: 90, head: -6, leg: [-20, -95, 0.55, 0.6], leg2: [-24, -100, 0.55, 0.6], hand: [168, 128], ep: [0, 1] },
      { hip: [124, 138], torso: 90, head: -6, leg: [-125, -165, 0.55, 0.6], leg2: [-24, -100, 0.55, 0.6], hand: [168, 128], ep: [0, 1] },
    ],
    eq: [],
    held: "none",
    ms: 2800,
    cap: cap("Oberes Knie öffnen, Füße bleiben zusammen", "Langsam schließen", "Open the top knee, feet stay together", "Close slowly"),
    vb: ZLOW,
  };
  // kettlebell swing
  S.kbswing = {
    kf: [
      { hip: [100, 83], torso: 68, foot: [122, 145], kp: [1, 0], hand: [120, 112], ep: [0, 1] },
      { hip: [121, 77.5], torso: 0, foot: [122, 145], kp: [1, 0], hand: rel("sh", 54, 6), ep: [0, 1] },
    ],
    eq: [],
    held: "kb",
    ms: 2200,
    hold: 0.04,
    cap: cap("Hüfte explosiv nach vorn, Kugelhantel schwingt hoch", "Zwischen die Beine zurück", "Snap the hips forward, the bell swings up", "Back between the legs"),
  };
  // banded side steps (front view)
  S.bandwalk = {
    view: "front",
    kf: [
      { hy: 84, legL: [8, 14], legR: [8, 14] },
      { hy: 84, legL: [8, 14], legR: [40, 22] },
    ],
    eq: [L("ankleL", "ankleR", 3, "mach"), L("kneeL", "kneeR", 2.5, "mach", { o: 0.7 })],
    held: "none",
    ms: 2200,
    cap: cap("Seitlich gegen das Band treten", "Zurück zur Mitte", "Step sideways against the band", "Back to the middle"),
  };
}
