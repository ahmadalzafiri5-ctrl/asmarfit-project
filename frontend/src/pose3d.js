// Lifts the 2D joints of an exercise scene into a 3D body: tapered limbs, ellipsoid muscle bellies, torso, head and the equipment.
// Pure functions without any 3D library, so they run (and are tested) in node. stage3d.js draws the result with three.js.
// World: x forward (side view) or to the right (front view), y up with the floor at 0, z towards the camera.

export const X0 = 120; // the 2D scenes are centred on x = 120

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// the "front" of a limb: the body's front direction turned by the same angle that takes "straight down" to the limb axis
function limbFront(f, axis, d0 = [0, -1]) {
  const u = [axis[0], axis[1]];
  const ul = Math.hypot(u[0], u[1]);
  if (ul < 1e-6) return f;
  const ux = u[0] / ul;
  const uy = u[1] / ul;
  const ang = Math.atan2(d0[0] * uy - d0[1] * ux, d0[0] * ux + d0[1] * uy);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return [f[0] * c - f[1] * s, f[0] * s + f[1] * c, f[2]];
}

// j: solved 2D joints (side or front view); B: body numbers (BODY[style]); W: widths (WIDTHS[style]); FLOOR: y of the floor line
export function liftPose(j, style, B, W, FLOOR, hairStyle) {
  const front = j.view === "front";
  const zs = B.sw * 0.95;
  const zh = Math.max(7, B.hw);
  const P = (p, z = 0) => [p[0] - X0, FLOOR - p[1], z];
  let sN, sF, eN, eF, hN, hF, hipN, hipF, kN, kF, aN, aF, tN, tF, f3;
  if (!front) {
    sN = P(j.sh, zs); sF = P(j.sh, -zs);
    eN = P(j.elbow, zs); eF = P(j.elbow2, -zs);
    hN = P(j.hand, zs); hF = P(j.hand2, -zs);
    hipN = P(j.hip, zh); hipF = P(j.hip, -zh);
    kN = P(j.knee, zh); kF = P(j.knee2, -zh);
    aN = P(j.ankle, zh); aF = P(j.ankle2, -zh);
    tN = P(j.toe, zh); tF = P(j.toe2, -zh);
    f3 = norm([j.front[0], -j.front[1], 0]);
  } else {
    sN = P(j.shR); sF = P(j.shL);
    eN = P(j.elbowR); eF = P(j.elbowL);
    hN = P(j.handR); hF = P(j.handL);
    hipN = P(j.hipR); hipF = P(j.hipL);
    kN = P(j.kneeR); kF = P(j.kneeL);
    aN = P(j.ankleR); aF = P(j.ankleL);
    tN = P(j.toeR, 5); tF = P(j.toeL, 5);
    f3 = [0, 0, 1];
  }
  const H = P(j.hip);
  const S = P(j.sh);
  const Hd = P(j.head);
  const rUp = W.arm[1] * 0.95;
  const rFo = W.fore[1] * 0.9;
  const rTh = W.thigh[1] * 0.95;
  const rSh = W.shin[1] * 0.9;

  const limbs = [];
  const balls = [];
  const blobs = [];
  const lm = (id, a, b, ra, rb) => limbs.push({ id, a, b, ra, rb });
  lm("neck", S, Hd, 3.7, 3.2);
  [["N", sN, eN, hN, hipN, kN, aN, tN], ["F", sF, eF, hF, hipF, kF, aF, tF]].forEach(([k, s, e, h, hp, kn, an, tn]) => {
    lm("up" + k, s, e, rUp, rUp * 0.78);
    lm("fo" + k, e, h, rFo * 1.05, rFo * 0.7);
    lm("th" + k, hp, kn, rTh, rTh * 0.64);
    lm("sh" + k, kn, an, rSh, rSh * 0.55);
    lm("ft" + k, an, tn, 3.4, 2.6);
    balls.push({ id: "hand" + k, c: h, r: 3.7 });
    balls.push({ id: "heel" + k, c: an, r: 3.5 });
  });

  // trunk: chest, waist and pelvis as ellipsoids along the line hip -> shoulder
  const L = len(sub(S, H)) || 1;
  const ax = norm(sub(S, H));
  const chestRx = B.sw * 0.86;
  const waistRx = B.hw * 0.95 + 3.5;
  const pelvRx = B.hw * 1.25 + 2.5;
  const chestRz = B.torso * 0.62;
  const waistRz = B.torso * 0.5;
  const pelvRz = B.torso * 0.55;
  const bl = (id, muscle, c, y, z, r) => blobs.push({ id, muscle, c, y: norm(y), z: norm(z), r });
  bl("chest", null, lerp3(H, S, 0.72), ax, f3, [chestRx, L * 0.34, chestRz]);
  bl("waist", null, lerp3(H, S, 0.4), ax, f3, [waistRx, L * 0.3, waistRz]);
  bl("pelvis", null, lerp3(H, S, 0.07), ax, f3, [pelvRx, L * 0.24, pelvRz]);
  const hr = W.head;
  const hax = norm(sub(Hd, S));
  bl("head", null, Hd, hax, f3, [hr[0] * 0.95, hr[1], hr[0] * 1.05]);
  bl("hair-cap", "hair", add(add(Hd, mul(hax, 2.6)), mul(f3, -1.6)), hax, f3, [hr[0] * 1.02, hr[1] * 0.9, hr[0] * 1.04]);
  const tail = hairStyle === "tail" || style === "female";
  bl("nose", null, add(add(Hd, mul(f3, hr[0] * 1.05 + 0.6)), mul(hax, -1.5)), hax, f3, [1.7, 2.3, 1.9]);
  bl("hair-t1", tail ? "hair" : null, add(add(Hd, mul(f3, -(hr[0] + 2.5))), mul(hax, 0.5)), hax, f3, tail ? [3.2, 4.8, 3.2] : [0.01, 0.01, 0.01]);
  bl("hair-t2", tail ? "hair" : null, add(add(Hd, mul(f3, -(hr[0] + 5))), mul(hax, -6)), hax, f3, tail ? [2.8, 5.4, 2.8] : [0.01, 0.01, 0.01]);

  // muscle bellies
  const d0 = [-ax[0], -ax[1]];
  const lateralOf = (a, b, n) => norm(cross(norm(sub(b, a)), n));
  [["N", 1, sN, eN, hN, hipN, kN, aN], ["F", -1, sF, eF, hF, hipF, kF, aF]].forEach(([k, sg, s, e, h, hp, kn, an]) => {
    const uAx = norm(sub(e, s));
    const uN = limbFront(f3, uAx, d0);
    bl("biceps" + k, "biceps", add(lerp3(s, e, 0.45), mul(uN, rUp * 0.55)), uAx, uN, [rUp * 0.78, 6.2, rUp * 0.6]);
    bl("triceps" + k, "triceps", add(lerp3(s, e, 0.4), mul(uN, -rUp * 0.5)), uAx, uN, [rUp * 0.82, 7.6, rUp * 0.62]);
    const fAx = norm(sub(h, e));
    const fN = limbFront(f3, fAx, d0);
    bl("forearm" + k, "forearms", add(lerp3(e, h, 0.3), mul(fN, rFo * 0.15)), fAx, fN, [rFo * 0.8, 7.5, rFo * 0.78]);
    bl("delt" + k, "shoulders", s, uAx, uN, [rUp * 1.22, rUp * 1.3, rUp * 1.2]);
    const tAx = norm(sub(kn, hp));
    const tN = limbFront(f3, tAx, d0);
    bl("quad" + k, "quads", add(lerp3(hp, kn, 0.42), mul(tN, rTh * 0.5)), tAx, tN, [rTh * 0.8, 14.5, rTh * 0.62]);
    bl("ham" + k, "hamstrings", add(lerp3(hp, kn, 0.45), mul(tN, -rTh * 0.5)), tAx, tN, [rTh * 0.8, 13.5, rTh * 0.6]);
    const inward = front ? [-sg, 0, 0] : [0, 0, -sg];
    bl("adductor" + k, "adductors", add(lerp3(hp, kn, 0.5), mul(inward, rTh * 0.55)), tAx, tN, [rTh * 0.5, 12, rTh * 0.55]);
    const cAx = norm(sub(an, kn));
    const cN = limbFront(f3, cAx, d0);
    bl("calf" + k, "calves", add(lerp3(kn, an, 0.28), mul(cN, -rSh * 0.55)), cAx, cN, [rSh * 0.78, 9.5, rSh * 0.7]);
    const lat = front ? [sg, 0, 0] : [0, 0, sg];
    bl("glute" + k, "glutes", add(add(hp, mul(f3, -6.5)), mul(ax, 3)), ax, f3, [7.2, 7.6, 7.0]);
    bl("pec" + k, "chest", add(add(lerp3(H, S, 0.74), mul(f3, chestRz * 0.8)), mul(lat, chestRx * 0.5)), ax, f3, [chestRx * 0.52, 8.4, 3.8]);
    bl("lat" + k, "lats", add(add(lerp3(H, S, 0.56), mul(f3, -chestRz * 0.7)), mul(lat, chestRx * 0.72)), ax, f3, [chestRx * 0.34, 13, 3.2]);
    bl("oblique" + k, "obliques", add(lerp3(H, S, 0.4), mul(lat, waistRx * 0.92)), ax, f3, [3.6, 9.5, waistRz * 0.8]);
  });
  bl("trap", "traps", add(lerp3(H, S, 0.94), mul(f3, -chestRz * 0.55)), ax, f3, [chestRx * 0.8, 6.5, 3.6]);
  bl("lowback", "lower_back", add(lerp3(H, S, 0.24), mul(f3, -waistRz * 0.8)), ax, f3, [waistRx * 0.55, 9, 3.0]);
  [0.2, 0.36, 0.52].forEach((t, i) => bl("abs" + i, "abs", add(lerp3(H, S, t), mul(f3, waistRz * 0.85)), ax, f3, [waistRx * 0.42, 4.6, 2.6]));

  return { view: front ? "front" : "side", limbs, balls, blobs, f3, zs, zh, hands: { N: hN, F: hF }, fist: front ? null : { N: P(j.fist, zs), F: P(j.fist2, -zs) } };
}

// equipment and held items as simple primitives with a fixed count per scene (unused slots have kind "none")
export function liftEquipment(scene, j, FLOOR, pose) {
  const out = [];
  const front = pose.view === "front";
  const zs = pose.zs;
  const val = (spec) => (typeof spec === "function" ? spec(j) : typeof spec === "string" ? j[spec] : spec);
  const P = (p, z = 0) => [p[0] - X0, FLOOR - p[1], z];
  const handsXY = front ? [[j.handR, 0], [j.handL, 0]] : [[j.hand, zs], [j.fist, zs], [j.hand2, -zs], [j.fist2, -zs]];
  const zNear = (p) => {
    for (const [h, z] of handsXY) if (h && Math.hypot(h[0] - p[0], h[1] - p[1]) < 2.5) return z;
    return 0;
  };
  (scene.eq || []).forEach((e) => {
    if (e.t === "L") {
      const a = val(e.a);
      const b = val(e.b);
      if (!a || !b) {
        out.push({ kind: "none" }, { kind: "none" });
        return;
      }
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      if (e.k === "pad") {
        out.push({ kind: "box", mat: "pad", c: P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), size: [Math.hypot(dx, dy) + (e.w || 6) * 0.5, Math.max(3, e.w || 6), 16], rotZ: Math.atan2(-dy, dx) });
        out.push({ kind: "none" });
      } else {
        const r = Math.max(1.1, (e.w || 3) * 0.45);
        const vertical = Math.abs(dx) < 0.3 * Math.abs(dy) && Math.max(a[1], b[1]) >= FLOOR - 3;
        const z = vertical ? 7 : 0;
        out.push({ kind: "cyl", mat: e.k === "pad" ? "pad" : "metal", a: P(a, z), b: P(b, z), r });
        out.push(vertical ? { kind: "cyl", mat: "metal", a: P(a, -7), b: P(b, -7), r } : { kind: "none" });
      }
    } else if (e.t === "C") {
      const c = val(e.c);
      if (!c) {
        out.push({ kind: "none" });
        return;
      }
      const z = zNear(c);
      if (e.fill || e.k === "plate") out.push({ kind: "disc", mat: "plate", c: P(c, z), r: e.r, thick: 2.4, axis: "z" });
      else out.push({ kind: "torus", mat: "metal", c: P(c, z), r: e.r, tube: Math.max(0.8, (e.w || 2) / 2), axis: "z" });
    } else if (e.t === "R") {
      const c = val(e.c);
      if (!c) {
        out.push({ kind: "none" });
        return;
      }
      out.push({ kind: "box", mat: e.k === "pad" ? "pad" : "metal", c: P(c), size: [e.w, e.h, e.k === "pad" ? 16 : 8], rotZ: 0 });
    } else out.push({ kind: "none" });
  });
  // held items: always 6 slots
  const held = [];
  const slot = (o) => held.push(o);
  const kind = scene.held;
  if (kind === "plate") {
    if (front) {
      const a = P(j.handL);
      const b = P(j.handR);
      const mid = lerp3(a, b, 0.5);
      const half = Math.max(8, len(sub(b, a)) / 2 + 14);
      slot({ kind: "cyl", mat: "metal", a: [mid[0] - half, mid[1], mid[2]], b: [mid[0] + half, mid[1], mid[2]], r: 1.3 });
      slot({ kind: "disc", mat: "plate", c: [mid[0] - half + 3, mid[1], mid[2]], r: 11, thick: 3, axis: "x" });
      slot({ kind: "disc", mat: "plate", c: [mid[0] + half - 3, mid[1], mid[2]], r: 11, thick: 3, axis: "x" });
    } else {
      const m = lerp3(P(j.fist, 0), P(j.fist2, 0), 0.5);
      const half = zs + 16;
      slot({ kind: "cyl", mat: "metal", a: [m[0], m[1], -half], b: [m[0], m[1], half], r: 1.3 });
      slot({ kind: "disc", mat: "plate", c: [m[0], m[1], half - 3], r: 11, thick: 3, axis: "z" });
      slot({ kind: "disc", mat: "plate", c: [m[0], m[1], -half + 3], r: 11, thick: 3, axis: "z" });
    }
  } else if (kind === "db" || kind === "kb" || kind === "ball" || kind === "grip") {
    const hs = front ? [P(j.handR), P(j.handL)] : [P(j.fist, zs), P(j.fist2, -zs)];
    hs.forEach((h) => {
      if (kind === "db") {
        slot({ kind: "cyl", mat: "metal", a: [h[0], h[1], h[2] - 6], b: [h[0], h[1], h[2] + 6], r: 1.3 });
        slot({ kind: "ball", mat: "plate", c: [h[0], h[1], h[2] - 6], r: 4.4 });
        slot({ kind: "ball", mat: "plate", c: [h[0], h[1], h[2] + 6], r: 4.4 });
      } else if (kind === "kb") {
        slot({ kind: "ball", mat: "plate", c: [h[0], h[1] - 5, h[2]], r: 7 });
        slot({ kind: "torus", mat: "metal", c: [h[0], h[1] + 2, h[2]], r: 4, tube: 1.2, axis: "z" });
        slot({ kind: "none" });
      } else if (kind === "ball") {
        slot({ kind: "ball", mat: "plate", c: h, r: 8 });
        slot({ kind: "none" });
        slot({ kind: "none" });
      } else {
        slot({ kind: "torus", mat: "metal", c: h, r: 3.6, tube: 0.9, axis: "z" });
        slot({ kind: "none" });
        slot({ kind: "none" });
      }
    });
  }
  while (held.length < 6) held.push({ kind: "none" });
  return out.concat(held.slice(0, 6));
}

// all points of a lifted pose (for the camera framing)
export function posePoints(pose, equipment) {
  const pts = [];
  pose.limbs.forEach((l) => pts.push(l.a, l.b));
  pose.blobs.forEach((b) => pts.push(b.c));
  (equipment || []).forEach((e) => {
    if (e.kind === "cyl") pts.push(e.a, e.b);
    else if (e.c) pts.push(e.c);
  });
  return pts;
}

export { sub as v3sub, add as v3add, mul as v3mul, len as v3len, norm as v3norm, cross as v3cross, dot as v3dot };
