// Cardio, carries and full-body movements.
import { FL, rel, cap, L, C, R, box, ZOUT } from "./sceneKit.js";

const ext = (leg) => 34 * Math.cos((leg[0] * Math.PI) / 180) + 34 * Math.cos((leg[1] * Math.PI) / 180); // how far the ankle hangs below the hip

export function addMove(S) {
  const LOOP = (de, en) => ({ de: [de], en: [en] });

  // gait cycles: four key poses that loop; the hip height follows the stance leg so the foot meets the ground
  function gait({ poses, lean = 8, flight = 0, ms = 900, held = "none", scroll = 1, extra = [], vb }) {
    const kf = poses.map((p) => {
      const hipY = 145 - Math.max(ext(p.n), ext(p.f)) - flight * (p.fl || 0);
      return { hip: [120, hipY], torso: lean, leg: p.n, leg2: p.f, arm: p.an, arm2: p.af };
    });
    return { kf, loop: true, eq: extra, held, ms, scroll, hold: 0, cap: null, vb };
  }
  S.run = {
    ...gait({
      lean: 9,
      flight: 5,
      ms: 800,
      poses: [
        { n: [40, 10], f: [-38, -92], an: [-50, 36], af: [48, 108], fl: 0 },
        { n: [10, -22], f: [34, -112], an: [-4, 78], af: [-4, 78], fl: 1 },
        { n: [-38, -92], f: [40, 10], an: [48, 108], af: [-50, 36], fl: 0 },
        { n: [34, -112], f: [10, -22], an: [-4, 78], af: [-4, 78], fl: 1 },
      ],
    }),
    cap: LOOP("Aufrecht laufen, Arme locker mitschwingen", "Run tall, let the arms swing"),
  };
  S.treadmill = { ...S.run, ms: 950, eq: [L([20, 150], [220, 150], 6, "pad"), L([30, 150], [34, 152], 3), L([196, 60], [206, 150], 4), L([196, 60], [150, 60], 3)] };
  const walkPoses = [
    { n: [24, 18], f: [-20, -30], an: [-22, -8], af: [22, 14] },
    { n: [2, 0], f: [14, -24], an: [0, 4], af: [0, 4] },
    { n: [-20, -30], f: [24, 18], an: [22, 14], af: [-22, -8] },
    { n: [14, -24], f: [2, 0], an: [0, 4], af: [0, 4] },
  ];
  S.walk = { ...gait({ poses: walkPoses, lean: 3, ms: 1400 }), cap: LOOP("Aufrecht gehen, Fuß über die Ferse abrollen", "Walk tall and roll through the foot") };
  S.hike = {
    ...gait({ poses: walkPoses, lean: 12, ms: 1500, extra: [R((j) => [j.sh[0] - 12, j.sh[1] + 16], 14, 26, "mach", { rx: 4, fill: "var(--c-border)" }), L((j) => [j.sh[0] - 22, j.sh[1] - 4], (j) => [j.sh[0] - 22, j.sh[1] + 40], 2, "mach", { o: 0.6 })] }),
    cap: LOOP("Mit Rucksack bergauf, Oberkörper leicht nach vorn", "Uphill with a pack, lean slightly forward"),
  };
  {
    const carry = (arm) => walkPoses.map((p) => ({ ...p, an: arm, af: arm }));
    S.carry_farmer = { ...gait({ poses: carry([-2, -2]), lean: 0, ms: 1500, held: "db" }), cap: LOOP("Schwere Gewichte tragen, aufrecht bleiben", "Carry heavy weights and stay tall") };
    S.carry_suitcase = { ...gait({ poses: carry([-2, -2]), lean: 0, ms: 1500, held: "db" }), cap: LOOP("Gewicht auf einer Seite tragen, nicht zur Seite kippen", "Carry on one side and do not lean") };
  }

  // cycling (also the assault bike)
  {
    const wheel = (x) => C([x, 122], 26, "mach", { w: 3 });
    const frame = [wheel(68), wheel(178), L([122, 119], [108, 86], 4), L([108, 86], [160, 84], 4), L([160, 84], [178, 122], 4), L([122, 119], [68, 122], 3), L([160, 84], [156, 74], 4), L([104, 86], [116, 86], 6, "pad"), C([122, 119], 3, "mach", { fill: "var(--c-dim)" })];
    const kf = Array.from({ length: 8 }, (_, i) => {
      const t = (i * Math.PI) / 4;
      return { hip: [108, 78], torso: 48, foot: [122 + 17 * Math.cos(t), 119 + 17 * Math.sin(t)], foot2: [122 - 17 * Math.cos(t), 119 - 17 * Math.sin(t)], kp: [1, 0], kp2: [1, 0], hand: [157, 74], ep: [-0.2, 1], toe: 80 };
    });
    S.cycling = { kf, loop: true, eq: frame, held: "none", ms: 1300, hold: 0, scroll: 1.5, cap: LOOP("Rund treten, Oberkörper ruhig halten", "Pedal in smooth circles") };
    const kf2 = Array.from({ length: 8 }, (_, i) => {
      const t = (i * Math.PI) / 4;
      return { hip: [112, 80], torso: 12, foot: [128 + 17 * Math.cos(t), 120 + 17 * Math.sin(t)], foot2: [128 - 17 * Math.cos(t), 120 - 17 * Math.sin(t)], kp: [1, 0], kp2: [1, 0], hand: [150 + 10 * Math.cos(t + Math.PI), 66 + 12 * Math.sin(t + Math.PI)], hand2: [150 - 10 * Math.cos(t + Math.PI), 66 - 12 * Math.sin(t + Math.PI)], ep: [-0.2, 1], toe: 80 };
    });
    S.assaultbike = {
      kf: kf2,
      loop: true,
      eq: [C([156, 112], 28, "mach", { w: 3 }), L([128, 120], [108, 90], 4), L([156, 112], [158, 56], 4), L([156, 56], [146, 50], 4), L([104, 90], [118, 90], 6, "pad"), L([108, 90], [128, 120], 3)],
      held: "none",
      ms: 1200,
      hold: 0,
      cap: LOOP("Arme und Beine gleichzeitig arbeiten lassen", "Push and pull with arms and legs together"),
    };
  }

  // rowing machine
  S.rowing = {
    kf: [
      { hip: [158, 126], torso: 24, foot: [198, 124], kp: [0, -1], hand: rel("sh", 54, 14), ep: [0, 1] },
      { hip: [124, 126], torso: -24, foot: [198, 124], kp: [0, -1], hand: rel("sh", 14, 18), ep: [-1, 0.2] },
    ],
    eq: [L([40, 138], [226, 138], 4, "mach"), L((j) => [j.hip[0] - 10, j.hip[1] + 10], (j) => [j.hip[0] + 10, j.hip[1] + 10], 7, "pad"), L([204, 98], [200, 132], 6, "pad"), L("hand", [222, 124], 2, "mach", { o: 0.8 }), C([224, 118], 14, "mach", { w: 3 })],
    held: "grip",
    ms: 3000,
    cap: cap("Beine strecken, dann zurücklehnen, dann Arme ziehen", "Arme, Oberkörper, Beine wieder nach vorn", "Legs, then lean back, then pull the arms", "Arms, torso, legs forward again"),
  };

  // elliptical trainer
  {
    const kf = Array.from({ length: 8 }, (_, i) => {
      const t = (i * Math.PI) / 4;
      return { hip: [120, 80], torso: 4, foot: [120 + 22 * Math.cos(t), 139 + 6 * Math.sin(t)], foot2: [120 - 22 * Math.cos(t), 139 - 6 * Math.sin(t)], kp: [1, 0], kp2: [1, 0], hand: [150 + 12 * Math.cos(t + Math.PI), 66 + 8 * Math.sin(t + Math.PI)], hand2: [150 - 12 * Math.cos(t + Math.PI), 66 - 8 * Math.sin(t + Math.PI)], ep: [-0.2, 1] };
    });
    S.elliptical = { kf, loop: true, eq: [L([70, 146], [200, 146], 5, "pad"), L([164, 50], [164, 146], 4), C([164, 50], 4)], held: "none", ms: 1500, hold: 0, cap: LOOP("Gleichmäßig gleiten, aufrecht bleiben", "Glide smoothly and stay upright") };
  }
  // stair climber
  S.stairs = {
    kf: [
      { hip: [120, 76], torso: 8, foot: [118, 141], foot2: [128, 117], kp: [1, 0], kp2: [1, 0], hand: [154, 72], ep: [-0.2, 1] },
      { hip: [120, 70], torso: 8, foot: [128, 117], foot2: [118, 141], kp: [1, 0], kp2: [1, 0], hand: [154, 72], ep: [-0.2, 1] },
    ],
    eq: [box(100, 142, 40, 6), box(108, 118, 40, 6), L([156, 50], [156, 100], 4), C([156, 50], 3)],
    held: "none",
    ms: 1400,
    hold: 0.05,
    cap: LOOP("Abwechselnd Stufen steigen, nicht auf dem Handlauf abstützen", "Climb step by step, do not lean on the rails"),
  };
  // jump rope: the rope passes under the feet when the feet are in the air
  S.jumprope = {
    kf: [
      { plant: [120, 134], leg: [0, 0], torso: 0, toe: 45, hand: rel("sh", 22, 26), hand2: rel("sh", 18, 26), ep: [-0.6, 1] },
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 22, 26), hand2: rel("sh", 18, 26), ep: [-0.6, 1] },
    ],
    eq: [
      L("hand", (j) => [120 + 52 * Math.sin(2 * Math.PI * j.u), 76 + 72 * Math.cos(2 * Math.PI * j.u)], 2.2, "mach"),
      L("hand2", (j) => [120 + 52 * Math.sin(2 * Math.PI * j.u), 76 + 72 * Math.cos(2 * Math.PI * j.u)], 2.2, "mach"),
    ],
    held: "none",
    ms: 800,
    hold: 0,
    cap: LOOP("Kleine Sprünge, Handgelenke drehen das Seil", "Small hops, the wrists turn the rope"),
    vb: ZOUT,
  };
  // front crawl: the arms turn around the shoulders, the legs flutter
  {
    const water = R([120, 130], 320, 44, "mach", { fill: "rgba(80,150,230,0.26)", sw: 0, front: true, rx: 0, nb: true });
    const base = { hip: [96, 104], torso: 90, head: -10 };
    S.swim = {
      kf: [
        { ...base, arm: [90, 100], arm2: [-90, -92], leg: [-84, -96], leg2: [-96, -84] },
        { ...base, arm: [0, 10], arm2: [-180, -182], leg: [-96, -84], leg2: [-84, -96] },
        { ...base, arm: [-90, -80], arm2: [-270, -272], leg: [-84, -96], leg2: [-96, -84] },
        { ...base, arm: [-180, -170], arm2: [-360, -362], leg: [-96, -84], leg2: [-84, -96] },
      ],
      loop: true,
      unwrap: -360,
      eq: [water],
      held: "none",
      ms: 2400,
      hold: 0,
      cap: LOOP("Arme abwechselnd durchziehen, Beine kicken locker", "Alternate the arm pulls, flutter the legs"),
      vb: [0, 40, 230],
    };
  }
  // battle ropes
  S.ropes = {
    kf: [
      { plant: [120, 145], leg: [42, -26], torso: 22, arm: [40, 38], arm2: [-6, -6] },
      { plant: [120, 145], leg: [42, -26], torso: 22, arm: [-6, -6], arm2: [40, 38] },
    ],
    eq: [L("hand", [214, 110], 3, "mach", { o: 0.8 }), L("hand2", [214, 110], 3, "mach", { o: 0.8 }), C([214, 110], 5)],
    held: "none",
    ms: 900,
    hold: 0,
    cap: LOOP("Arme abwechselnd schnell auf und ab", "Alternate the arms fast, up and down"),
  };
  // sled push
  {
    const mk = (f, f2) => ({ hip: [100, 88], torso: 54, foot: f, foot2: f2, kp: [1, 0], kp2: [1, 0], hand: [160, 70], ep: [-0.3, 1], toe: 40 });
    S.sled = {
      kf: [mk([76, 142], [122, 138]), mk([122, 138], [76, 142])],
      eq: [box(172, 104, 56, 36), L([160, 70], [178, 106], 4), L([172, 140], [228, 140], 5, "pad")],
      held: "none",
      ms: 1200,
      hold: 0.05,
      scroll: 1,
      cap: LOOP("Tief bleiben und kraftvoll schieben", "Stay low and drive hard"),
    };
  }
  // shadow boxing
  {
    const stance = { hip: [118, 80], torso: 6, foot: [138, 145], foot2: [98, 145], kp: [1, 0], kp2: [1, 0] };
    S.boxing = {
      kf: [
        { ...stance, hand: rel("sh", 58, 0), hand2: rel("sh", 20, -8), ep: [0, 1], ep2: [0.4, 1] },
        { ...stance, hand: rel("sh", 20, -8), hand2: rel("sh", 58, 0), ep: [0.4, 1], ep2: [0, 1] },
      ],
      eq: [],
      held: "ball",
      ms: 900,
      hold: 0.05,
      cap: LOOP("Gerade Schläge abwechselnd, Deckung oben halten", "Straight punches in turn, keep the guard up"),
    };
  }
  // burpee: stand, squat, plank, squat, jump
  {
    const stand = { hip: [120, 77.5], torso: 0, foot: [122, 145], foot2: [118, 145], kp: [1, 0], hand: rel("sh", 2, 54), ep: [0, 1], toe: 90 };
    const down = { hip: [106, 114], torso: 52, foot: [122, 145], foot2: [118, 145], kp: [1, 0], hand: [152, 146], ep: [0, 1], toe: 90 };
    const plank = { hip: [108, 110], torso: 63, foot: [48, 140], foot2: [46, 140], kp: [1, 0], hand: [152, 145], ep: [-1, 0.3], toe: 25 };
    const jump = { hip: [120, 62], torso: 0, foot: [120, 130], foot2: [116, 130], kp: [1, 0], hand: rel("sh", 4, -52), ep: [0, 1], toe: 45 };
    S.burpee = { kf: [stand, down, plank, down, jump], loop: true, eq: [], held: "none", ms: 3200, hold: 0.06, cap: LOOP("Runter, Plank, Liegestütz, hochspringen", "Down, plank, push-up, jump up"), vb: ZOUT };
  }
  // jumping jacks (front view)
  S.jacks = {
    view: "front",
    kf: [
      { hy: 77, armL: [8, 8], armR: [8, 8], legL: [4, 4], legR: [4, 4] },
      { hy: 70, armL: [160, 160], armR: [160, 160], legL: [26, 26], legR: [26, 26] },
    ],
    eq: [],
    held: "none",
    ms: 1000,
    hold: 0.05,
    cap: LOOP("Springen: Arme hoch und Beine auseinander", "Jump: arms up and legs apart"),
    vb: ZOUT,
  };

  /* ------------------------------------------------------- full body */
  // power clean / hang clean: pull from the floor, catch the bar on the shoulders
  {
    const A = { sh: [135, 80], torso: 55, foot: [122, 145], kp: [1, 0], hand: [127, 135], ep: [0, 1], toe: 90 };
    const B = { sh: [122, 34], torso: -4, foot: [122, 141], kp: [1, 0], hand: [128, 90], ep: [0, 1], toe: 50 };
    const Cc = { sh: [116, 62], torso: 8, foot: [122, 145], kp: [1, 0], hand: rel("sh", 14, -2), ep: [0.7, 1], toe: 90 };
    S.clean = { kf: [A, B, Cc], eq: [], held: "plate", ms: 3600, cap: cap("Explosiv ziehen, unter der Stange abtauchen", "Stange kontrolliert ablegen", "Pull explosively and drop under the bar", "Lower the bar with control"), vb: ZOUT };
    S.cleanjerk = {
      kf: [A, { ...Cc, sh: [120, 40], torso: 0, hand: rel("sh", 14, -2) }, { sh: [118, 60], torso: -2, foot: [122, 145], kp: [1, 0], hand: rel("sh", 3, -54), ep: [0.6, 1], toe: 90 }],
      eq: [],
      held: "plate",
      ms: 4200,
      cap: cap("Zur Schulter reißen, dann über den Kopf drücken", "Zurück zur Schulter und ablegen", "Clean to the shoulders, then press overhead", "Back to the shoulders and down"),
      vb: ZOUT,
    };
    S.snatch = {
      kf: [{ ...A, hand: [124, 135] }, { ...B, hand: [126, 88] }, { sh: [112, 66], torso: 12, foot: [124, 145], kp: [1, 0], hand: rel("sh", 12, -56), ep: [0.3, 1], toe: 90 }],
      eq: [],
      held: "plate",
      ms: 4000,
      cap: cap("Vom Boden in einem Zug über den Kopf", "Kontrolliert wieder ablegen", "From the floor to overhead in one move", "Lower with control"),
      vb: ZOUT,
    };
    S.kbclean = {
      kf: [{ hip: [100, 83], torso: 68, foot: [122, 145], kp: [1, 0], hand: [120, 112], ep: [0, 1] }, { hip: [121, 77.5], torso: 0, foot: [122, 145], kp: [1, 0], hand: rel("sh", 12, 10), ep: [0.7, 1] }],
      eq: [],
      held: "kb",
      ms: 2600,
      cap: cap("Hüfte strecken, Kugelhantel zur Schulter führen", "Zwischen die Beine zurück", "Extend the hips, rack the bell on the shoulder", "Back between the legs"),
    };
  }
  // thruster: squat with the bar on the shoulders, drive up and press overhead
  S.thruster = {
    kf: [
      { plant: [118, 145], leg: [92, -30], torso: 28, hand: rel("sh", 12, -4), ep: [0.8, -0.6] },
      { plant: [118, 145], leg: [0, 0], torso: -3, hand: rel("sh", 3, -54), ep: [0.6, 1] },
    ],
    eq: [],
    held: "plate",
    ms: 3200,
    cap: cap("Aufstehen und die Stange über den Kopf drücken", "Zurück in die Hocke", "Stand up and press the bar overhead", "Back into the squat"),
    vb: ZOUT,
  };
  // Turkish get-up (the weight stays above the shoulder)
  {
    const up = (j) => [j.sh[0] + 4, j.sh[1] - 54];
    S.getup = {
      kf: [
        { hip: [152, 141.5], torso: -90, head: 12, foot: [176, 144], kp: [0.3, -1], foot2: [172, 144], hand: up, hand2: (j) => [j.sh[0] + 30, 146], ep: [0, 1], ep2: [-0.4, -1] },
        { hip: [150, 141.5], torso: -52, head: 8, foot: [176, 144], kp: [0.3, -1], foot2: [172, 144], hand: up, hand2: (j) => [j.sh[0] - 10, 146], ep: [0, 1], ep2: [-0.4, -1] },
        { hip: [140, 141], torso: -12, head: 4, foot: [170, 144], kp: [0.3, -1], foot2: [172, 144], hand: up, hand2: (j) => [j.hip[0] - 26, 146], ep: [0, 1], ep2: [-0.4, -1] },
        { hip: [122, 77.5], torso: 0, foot: [124, 145], kp: [1, 0], foot2: [116, 145], hand: up, hand2: rel("sh", 4, 54), ep: [0, 1] },
      ],
      eq: [],
      held: "kb",
      ms: 5200,
      cap: cap("Schritt für Schritt aufstehen, Blick zum Gewicht", "Genauso wieder hinlegen", "Rise step by step, eyes on the weight", "Lie back down the same way"),
      vb: ZOUT,
    };
  }
  // medicine ball slam
  S.slam = {
    kf: [
      { plant: [120, 145], leg: [8, -6], torso: -4, hand: rel("sh", 6, -54), ep: [0, 1] },
      { plant: [120, 145], leg: [30, -20], torso: 62, hand: [150, 138], ep: [0, 1] },
    ],
    eq: [],
    held: "ball",
    ms: 1600,
    hold: 0.05,
    cap: cap("Ball mit voller Kraft auf den Boden schmettern", "Aufheben und wieder über den Kopf", "Slam the ball down with full force", "Pick it up and back overhead"),
    vb: ZOUT,
  };
  // bear crawl
  {
    const mk = (hn, hf, fn, ff) => ({ hip: [98, 102], torso: 78, hand: hn, hand2: hf, foot: fn, foot2: ff, kp: [1, 0], kp2: [1, 0], ep: [-0.3, 1], toe: 60 });
    S.bearcrawl = {
      kf: [mk([152, 146], [128, 146], [74, 146], [104, 146]), mk([128, 146], [152, 146], [104, 146], [74, 146])],
      eq: [],
      held: "none",
      ms: 1600,
      hold: 0.05,
      scroll: 0.5,
      cap: LOOP("Gegenüberliegende Hand und Fuß bewegen, Knie knapp über dem Boden", "Move the opposite hand and foot, knees just above the floor"),
    };
  }
  // man maker: dumbbell burpee with a row (shown as a burpee)
  S.manmaker = { ...S.burpee, held: "db", cap: LOOP("Burpee mit Rudern und Überkopfdrücken", "Burpee with a row and an overhead press") };
}
