// Chest, push-ups, dips.
import { FL, rel, cap, L, C, R, benchFlat, box, backPad, ZOUT, ZLOW } from "./sceneKit.js";

export function addChest(S) {
  // barbell / dumbbell press lying on a flat, incline or decline bench
  function press({ held = "plate", inc = 0, close = false, ms = 3300 }) {
    const th = -90 + inc; // -90 = lying flat, -60 = 30° incline, -105 = decline
    const hipX = 152;
    const hipY = inc > 0 ? 108 - inc * 0.2 : inc < 0 ? 100 : 106;
    const r = (th * Math.PI) / 180;
    const bottom = (j) => [j.sh[0] + 4 + (inc > 0 ? 6 : 0), j.sh[1] - 19 - (inc > 0 ? 4 : 0)];
    const top = (j) => [j.sh[0] + 3 + (inc > 0 ? 12 : 0), j.sh[1] - 54];
    const A = { hip: [hipX, hipY], torso: th, head: 12, foot: [172, inc < 0 ? 128 : 144], kp: [0.3, -1], hand: bottom, ep: close ? [0.1, 1] : [0.5, 1] };
    const B = { ...A, hand: top };
    let eq;
    if (inc > 0) eq = [backPad(th, 11), L([hipX - 14, hipY + 10], [hipX + 18, hipY + 10], 7, "pad"), L([hipX, hipY + 14], [hipX, FL], 3), L([hipX - 24, hipY + 14], [hipX - 34, FL], 3)];
    else if (inc < 0) eq = [backPad(th, 11), L([hipX + 18, hipY + 12], [hipX + 18, FL], 3), L([hipX - 32, hipY + 24], [hipX - 32, FL], 3), L([hipX + 24, 116], [hipX + 24, 134], 5, "pad")];
    else eq = benchFlat(70, 170, 112.5);
    return { kf: [A, B], eq, held, ms, cap: cap("Hochdrücken", "Kontrolliert senken", "Press up", "Lower with control"), vb: [-5, -8, 250] };
  }
  S.bench = press({});
  S.bench_db = press({ held: "db" });
  S.bench_incline = press({ inc: 30 });
  S.bench_incline_db = press({ inc: 30, held: "db" });
  S.bench_decline = press({ inc: -15 });
  S.bench_close = press({ close: true });

  // press lying on the floor: the upper arm stops on the floor
  {
    const A = { hip: [152, 141.5], torso: -90, head: 12, foot: [172, 144], kp: [0.3, -1], hand: (j) => [j.sh[0] + 8, 118], ep: [0.3, 1] };
    const B = { ...A, hand: (j) => [j.sh[0] + 3, j.sh[1] - 54] };
    S.press_floor = { kf: [A, B], eq: [], held: "db", ms: 3300, cap: cap("Hochdrücken", "Bis der Ellbogen den Boden berührt", "Press up", "Until the elbow touches the floor"), vb: [-5, -8, 250] };
  }

  // seated chest press machine
  {
    const A = { hip: [118, 118], torso: -6, foot: [152, 144], kp: [0, -1], hand: (j) => [j.sh[0] + 14, j.sh[1] + 8], ep: [-0.6, 1] };
    const B = { ...A, hand: (j) => [j.sh[0] + 56, j.sh[1] + 4] };
    S.press_machine = {
      kf: [A, B],
      eq: [L([104, 124], [104, 76], 8, "pad"), L([100, 129], [136, 129], 8, "pad"), L([118, 133], [118, FL], 3), L([104, 80], [96, FL], 3), C((j) => j.hand, 5, "mach", { w: 2.5 })],
      held: "none",
      ms: 3300,
      cap: cap("Wegdrücken", "Zurückkommen lassen", "Push away", "Return slowly"),
    };
  }

  // Svend press: two plates pressed together while pushing forward
  S.svend = {
    kf: [
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 17, 12), ep: [-0.2, 1] },
      { plant: [120, 145], leg: [0, 0], torso: 0, hand: rel("sh", 56, 8), ep: [-0.2, 1] },
    ],
    held: "db",
    ms: 3000,
    cap: cap("Nach vorn drücken", "Zurück zur Brust", "Push forward", "Back to the chest"),
  };

  // dumbbell fly lying: the arms swing up in a wide arc (seen from the side, the arc is foreshortened)
  {
    const base = { hip: [152, 106], torso: -90, head: 12, foot: [172, 144], kp: [0.3, -1] };
    S.fly_db = {
      kf: [
        { ...base, arm: [0, 0, 0.35, 0.35] },
        { ...base, arm: [180, 180, 0.2, 0.2] },
        { ...base, arm: [180, 180, 1, 1] },
      ],
      eq: benchFlat(70, 170, 112.5),
      held: "db",
      ms: 3600,
      cap: cap("Arme im Bogen zusammenführen", "Weit öffnen und dehnen", "Bring the arms together in an arc", "Open wide and stretch"),
      vb: [-5, -8, 250],
    };
  }

  // cable flies (front view): hands travel from wide to together
  const cableFly = (A, B, lo = false) => ({
    view: "front",
    kf: [
      { handL: [120 - A[0], A[1]], handR: [120 + A[0], A[1]] },
      { handL: [120 - B[0], B[1]], handR: [120 + B[0], B[1]] },
    ],
    eq: lo
      ? [L("handL", [28, 138], 2, "mach", { o: 0.8 }), L("handR", [212, 138], 2, "mach", { o: 0.8 }), C([28, 138], 5), C([212, 138], 5), L([28, 138], [28, FL], 3), L([212, 138], [212, FL], 3)]
      : [L("handL", [28, 12], 2, "mach", { o: 0.8 }), L("handR", [212, 12], 2, "mach", { o: 0.8 }), C([28, 12], 5), C([212, 12], 5), L([28, 12], [28, FL], 3), L([212, 12], [212, FL], 3)],
    held: "grip",
    ms: 3400,
    cap: cap("Zusammenführen", "Kontrolliert öffnen", "Bring together", "Open with control"),
  });
  S.fly_cable = cableFly([66, 48], [6, 56]);
  S.fly_cable_low = cableFly([60, 104], [6, 30], true);
  S.fly_cable_high = cableFly([62, 28], [6, 98]);
  // pec deck: seated, elbows bent, forearms meet in front
  S.pec_deck = {
    view: "front",
    kf: [
      { hy: 108, legL: [0, 0, 0.12, 1], legR: [0, 0, 0.12, 1], handL: [52, 60], handR: [188, 60] },
      { hy: 108, legL: [0, 0, 0.12, 1], legR: [0, 0, 0.12, 1], handL: [114, 78], handR: [126, 78] },
    ],
    eq: [L([98, 118], [142, 118], 9, "pad"), L([120, 122], [120, FL], 3), L([40, 54], [40, 80], 8, "pad"), L([200, 54], [200, 80], 8, "pad")],
    held: "none",
    ms: 3400,
    cap: cap("Zusammendrücken", "Kontrolliert öffnen", "Squeeze together", "Open with control"),
  };

  // push-up family: the body is one straight line pivoting around the toes (or the hands on a bench)
  function pushup({ handY = 145, handX = 152, ankleY = 140, ankleX = 44, ms = 3200, ep = [-1, 0.3], eq = [], dip = 24, lab }) {
    const LEN = 110;
    const phi = (shY) => Math.acos(Math.max(-1, Math.min(1, (ankleY - shY) / LEN))) * (180 / Math.PI);
    const pose = (shY) => {
      const f = phi(shY);
      return { plant: [ankleX, ankleY], leg: [-f, -f], torso: f, toe: 25, hand: [handX, handY], ep };
    };
    return { kf: [pose(handY - 53), pose(handY - dip)], eq, held: "none", ms, cap: lab || cap("Absenken", "Hochdrücken", "Lower", "Push up"), vb: [20, 30, 200] };
  }
  S.pushup = pushup({});
  S.pushup_diamond = pushup({ ep: [-0.3, 0.9] });
  S.pushup_incline = pushup({ handY: 108, handX: 156, eq: [box(128, 110, 70, 38)], dip: 22 });
  S.pushup_decline = pushup({ ankleY: 107, ankleX: 48, eq: [box(26, 112, 50, 36)], dip: 26 });

  // pike push-up: hips high, the head travels toward the floor between the hands
  {
    const mk = (hip, torso, foot, hand) => ({ hip, torso, foot, kp: [1, 0.1], hand, ep: [-1, 0.3], toe: 30 });
    S.pushup_pike = {
      kf: [mk([88, 80], 117, [58, 144], [134, 145]), mk([98, 98], 108, [58, 144], [134, 145])],
      eq: [],
      held: "none",
      ms: 3200,
      cap: cap("Kopf zum Boden senken", "Wieder hochdrücken", "Lower the head to the floor", "Push back up"),
      vb: [20, 20, 200],
    };
  }

  // dips on parallel bars (also used for the assisted dip machine)
  {
    const bar = [L([108, 90], [150, 90], 4), L([108, 90], [108, FL], 3), C([130, 90], 3.5, "mach", { fill: "var(--c-dim)" })];
    const A = { sh: [128, 36], torso: 8, foot: [100, 118], kp: [1, 0.4], hand: [131, 89], ep: [-1, 0.3] };
    const B = { sh: [132, 68], torso: 24, foot: [96, 138], kp: [1, 0.4], hand: [131, 89], ep: [-1, 0.2] };
    S.dip = { kf: [A, B], eq: bar, held: "none", ms: 3300, cap: cap("Tief absenken", "Hochdrücken", "Lower down", "Push up"), vb: [10, 10, 220] };
  }
  // bench dips: hands on a bench behind the body
  {
    const A = { sh: [102, 56], torso: 0, foot: [152, 145], kp: [0.3, -1], hand: [94, 108], ep: [-1, 0.4] };
    const B = { sh: [102, 86], torso: 4, foot: [152, 145], kp: [0.3, -1], hand: [94, 108], ep: [-1, 0.2] };
    S.dip_bench = { kf: [A, B], eq: [L([60, 111.5], [100, 111.5], 7, "pad"), L([70, 116], [70, FL], 3), L([92, 116], [92, FL], 3)], held: "none", ms: 3200, cap: cap("Absenken", "Hochdrücken", "Lower", "Push up"), vb: [10, 20, 220] };
  }
}
