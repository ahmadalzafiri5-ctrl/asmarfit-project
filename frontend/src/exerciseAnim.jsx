// Animated exercise demos: a side-view mannequin that is moved between key poses.
// Everything is drawn as SVG from bone lengths and angles, so it works offline and needs no images or videos.
// The scenes (key poses + equipment) live in exerciseScenes.js; this file is the engine and the player.
import { useEffect, useRef, useState } from "react";

// ----- bones (viewBox is 240 x 170, the floor is y = 148, the figure looks to the right) -----
export const FLOOR = 148;
const LT = 42; // torso: hip -> shoulder
const LU = 29; // upper arm
const LF = 26; // forearm
const LTH = 34; // thigh
const LS = 34; // shin
const NECK = 14;
const HEAD_R = 9;
const FOOT = 12;

const rad = (d) => (d * Math.PI) / 180;
// limbs: angle measured from "straight down", positive swings forward (to the right)
const dl = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
// torso/head: angle measured from "straight up", positive leans forward
const du = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))];
const add = (p, v, l = 1) => [p[0] + v[0] * l, p[1] + v[1] * l];
const lerp = (a, b, s) => a + (b - a) * s;
const lerpV = (a, b, s) => [lerp(a[0], b[0], s), lerp(a[1], b[1], s)];
const lerpK = (a, b, s) => [lerp(a[0], b[0], s), lerp(a[1], b[1], s), lerp(a[2] === undefined ? 1 : a[2], b[2] === undefined ? 1 : b[2], s), lerp(a[3] === undefined ? 1 : a[3], b[3] === undefined ? 1 : b[3], s)];

// two-bone inverse kinematics: returns the middle joint (knee/elbow) and the reachable end point
function ik(root, target, l1, l2, pref) {
  let dx = target[0] - root[0];
  let dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const maxd = l1 + l2 - 0.02;
  const mind = Math.abs(l1 - l2) + 0.5;
  const dd = Math.min(maxd, Math.max(mind, d));
  dx = (dx / d) * dd;
  dy = (dy / d) * dd;
  d = dd;
  const end = [root[0] + dx, root[1] + dy];
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d;
  const uy = dy / d;
  const mx = root[0] + ux * a;
  const my = root[1] + uy * a;
  const c1 = [mx - uy * h, my + ux * h];
  const c2 = [mx + uy * h, my - ux * h];
  const dot = (c) => (c[0] - mx) * pref[0] + (c[1] - my) * pref[1];
  return { mid: dot(c1) >= dot(c2) ? c1 : c2, end };
}

const isFn = (v) => typeof v === "function";
const ease = (s) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, s)));
const easeHold = (s, h = 0.1) => ease((s - h) / (1 - 2 * h));

// reads a point: [x, y], a joint name, or a function of the joints
function pt(spec, j) {
  if (!spec) return null;
  if (typeof spec === "string") return j[spec];
  if (isFn(spec)) return spec(j);
  return spec;
}

const SCALARS = ["torso", "head", "toe", "toe2", "wr"];
const VECS = ["hip", "sh", "plant", "kp", "ep", "kp2", "ep2"];
const PAIRS = ["leg", "leg2", "arm", "arm2"];
const TARGETS = ["foot", "foot2", "hand", "hand2"];

// the figure for one moment: s is 0..1 between key poses a and b
export function solvePose(a, b, s) {
  const p = {};
  const mix = (k, f) => {
    const x = a[k];
    if (x === undefined) return;
    const y = b[k] === undefined ? x : b[k];
    p[k] = f(x, y);
  };
  SCALARS.forEach((k) => mix(k, (x, y) => lerp(x, y, s)));
  VECS.forEach((k) => mix(k, (x, y) => lerpV(x, y, s)));
  PAIRS.forEach((k) => mix(k, (x, y) => lerpK(x, y, s)));
  const torso = p.torso || 0;
  const tv = du(torso);
  const j = { torso, front: du(torso + 90) };
  let hip;
  let sh;
  if (p.hip) {
    hip = p.hip;
    sh = add(hip, tv, LT);
  } else if (p.sh) {
    sh = p.sh;
    hip = add(sh, tv, -LT);
  } else if (p.plant && p.leg) {
    const knee = add(p.plant, dl(p.leg[1]), -LS);
    hip = add(knee, dl(p.leg[0]), -LTH);
    sh = add(hip, tv, LT);
  } else {
    hip = [120, 77];
    sh = add(hip, tv, LT);
  }
  j.hip = hip;
  j.sh = sh;
  j.head = add(sh, du(torso + (p.head || 0)), NECK);
  // a target that may be a point, a joint name or a function of the joints solved so far
  const target = (name, fallback) => {
    const x = a[name] === undefined ? fallback : a[name];
    const y = b[name] === undefined ? x : b[name];
    const v0 = pt(x, j);
    const v1 = pt(y, j);
    return v0 && v1 ? lerpV(v0, v1, s) : v0 || v1 || null;
  };
  // legs
  let l1;
  let l2;
  if (p.leg) {
    const fk = (ang) => {
      const knee = add(hip, dl(ang[0]), LTH * (ang[2] === undefined ? 1 : ang[2]));
      return { knee, ankle: add(knee, dl(ang[1]), LS * (ang[3] === undefined ? 1 : ang[3])) };
    };
    l1 = fk(p.leg);
    if (!p.leg2 && a.foot2 !== undefined) {
      // the near leg swings (FK), the far leg stays planted on its target
      const f2 = target("foot2", null);
      const r2 = ik(hip, f2, LTH, LS, p.kp2 || [1, 0]);
      l2 = { knee: r2.mid, ankle: r2.end };
    } else {
      l2 = fk(p.leg2 || [p.leg[0] - 5, p.leg[1] - 5, p.leg[2], p.leg[3]]);
    }
  } else {
    const f1 = target("foot", [hip[0], FLOOR - 4]);
    const r1 = ik(hip, f1, LTH, LS, p.kp || [1, 0]);
    l1 = { knee: r1.mid, ankle: r1.end };
    const f2 = target("foot2", null) || [l1.ankle[0] - 7, l1.ankle[1]];
    const r2 = ik(hip, f2, LTH, LS, p.kp2 || p.kp || [1, 0]);
    l2 = { knee: r2.mid, ankle: r2.end };
  }
  j.knee = l1.knee;
  j.ankle = l1.ankle;
  j.knee2 = l2.knee;
  j.ankle2 = l2.ankle;
  const toe = p.toe === undefined ? 90 : p.toe;
  const toe2 = p.toe2 === undefined ? toe : p.toe2;
  j.toe = add(j.ankle, dl(toe), FOOT);
  j.toe2 = add(j.ankle2, dl(toe2), FOOT);
  // arms
  let a1;
  let a2;
  if (p.arm) {
    const fk = (ang) => {
      const elbow = add(sh, dl(ang[0]), LU * (ang[2] === undefined ? 1 : ang[2]));
      return { elbow, hand: add(elbow, dl(ang[1]), LF * (ang[3] === undefined ? 1 : ang[3])) };
    };
    a1 = fk(p.arm);
    a2 = fk(p.arm2 || [p.arm[0] - 4, p.arm[1] - 4, p.arm[2], p.arm[3]]);
  } else {
    const h1 = target("hand", [sh[0], sh[1] + LU + LF]);
    const r1 = ik(sh, h1, LU, LF, p.ep || [-0.3, 1]);
    a1 = { elbow: r1.mid, hand: r1.end };
    j.hand = a1.hand;
    const h2 = target("hand2", null) || [a1.hand[0] - 4, a1.hand[1] - 1];
    const r2 = ik(sh, h2, LU, LF, p.ep2 || p.ep || [-0.3, 1]);
    a2 = { elbow: r2.mid, hand: r2.end };
  }
  j.elbow = a1.elbow;
  j.hand = a1.hand;
  j.elbow2 = a2.elbow;
  j.hand2 = a2.hand;
  const fore = (Math.atan2(a1.hand[0] - a1.elbow[0], a1.hand[1] - a1.elbow[1]) * 180) / Math.PI;
  j.fist = p.wr === undefined ? a1.hand : add(a1.hand, dl(fore + p.wr), 8);
  j.fist2 = p.wr === undefined ? a2.hand : add(a2.hand, dl(fore + p.wr), 8);
  return j;
}

// ----- front view: shoulders and hips have width, limbs swing outward (angles from straight down, outward is positive) -----
export function solveFront(a, b, s, style) {
  const SW = (BODY[style] || BODY.neutral).sw;
  const HW = (BODY[style] || BODY.neutral).hw;
  const p = {};
  const mixN = (k) => {
    const x = a[k];
    if (x === undefined) return;
    const y = b[k] === undefined ? x : b[k];
    p[k] = Array.isArray(x) ? (k.startsWith("hand") || k.startsWith("foot") ? lerpV(x, y, s) : lerpK(x, y, s)) : lerp(x, y, s);
  };
  ["cx", "hy", "lean", "tk", "shrug", "head", "armL", "armR", "legL", "legR", "handL", "handR", "footL", "footR"].forEach(mixN);
  const tk = p.tk === undefined ? 1 : p.tk;
  const lean = p.lean || 0;
  const hip = [p.cx === undefined ? 120 : p.cx, p.hy === undefined ? 77 : p.hy];
  const sh = add(hip, du(lean), LT * tk);
  const shrug = p.shrug || 0;
  const j = { front: null, view: "front", hip, sh, torso: lean };
  j.head = add(sh, du(lean + (p.head || 0)), NECK * (0.5 + 0.5 * tk));
  j.shL = [sh[0] - SW, sh[1] - shrug];
  j.shR = [sh[0] + SW, sh[1] - shrug];
  j.hipL = [hip[0] - HW, hip[1]];
  j.hipR = [hip[0] + HW, hip[1]];
  const dirOut = (side, ang) => (side < 0 ? [-Math.sin(rad(ang)), Math.cos(rad(ang))] : [Math.sin(rad(ang)), Math.cos(rad(ang))]);
  const limb = (root, ang, l1, l2, side) => {
    const k1 = ang[2] === undefined ? 1 : ang[2];
    const k2 = ang[3] === undefined ? 1 : ang[3];
    const mid = add(root, dirOut(side, ang[0]), l1 * k1);
    return { mid, end: add(mid, dirOut(side, ang[1]), l2 * k2) };
  };
  const arm = (name, root, side, tgtName) => {
    if (p[name]) return limb(root, p[name], LU, LF, side);
    if (a[tgtName] !== undefined) {
      const x = a[tgtName];
      const y = b[tgtName] === undefined ? x : b[tgtName];
      const t = lerpV(pt(x, j), pt(y, j), s);
      const r = ik(root, t, LU, LF, [side * 0.8, 1]);
      return { mid: r.mid, end: r.end };
    }
    return limb(root, [4, 4], LU, LF, side);
  };
  const leg = (name, root, side, tgtName) => {
    if (p[name]) return limb(root, p[name], LTH, LS, side);
    if (a[tgtName] !== undefined) {
      const x = a[tgtName];
      const y = b[tgtName] === undefined ? x : b[tgtName];
      const t = lerpV(pt(x, j), pt(y, j), s);
      const r = ik(root, t, LTH, LS, [side * 0.3, 0.2]);
      return { mid: r.mid, end: r.end };
    }
    return limb(root, [2, 2], LTH, LS, side);
  };
  const aL = arm("armL", j.shL, -1, "handL");
  const aR = arm("armR", j.shR, 1, "handR");
  const lL = leg("legL", j.hipL, -1, "footL");
  const lR = leg("legR", j.hipR, 1, "footR");
  j.elbowL = aL.mid; j.handL = aL.end; j.elbowR = aR.mid; j.handR = aR.end;
  j.kneeL = lL.mid; j.ankleL = lL.end; j.kneeR = lR.mid; j.ankleR = lR.end;
  j.toeL = [j.ankleL[0] - 8, j.ankleL[1] + 1];
  j.toeR = [j.ankleR[0] + 8, j.ankleR[1] + 1];
  j.hand = j.handR; j.hand2 = j.handL; j.elbow = j.elbowR; j.knee = j.kneeR; j.ankle = j.ankleR;
  return j;
}

// ----- timeline: ping-pong through the key poses (or loop through them when scene.loop) -----
export function sceneAt(scene, u, style) {
  const kf = scene.kf;
  const n = kf.length;
  const segs = scene.loop ? n : (n - 1) * 2;
  const x = (u % 1) * segs;
  let i = Math.min(segs - 1, Math.floor(x));
  const s0 = x - i;
  let from;
  let to;
  if (scene.loop) {
    from = i;
    to = (i + 1) % n;
  } else if (i < n - 1) {
    from = i;
    to = i + 1;
  } else {
    from = 2 * (n - 1) - i;
    to = from - 1;
  }
  const s = easeHold(s0, scene.hold === undefined ? 0.1 : scene.hold);
  let target = kf[to];
  // endless rotations (swimming arms): the way back to the first pose continues the turn instead of unwinding it
  if (scene.loop && scene.unwrap && to === 0 && from === n - 1) {
    const sh = (v) => (v ? [v[0] + scene.unwrap, v[1] + scene.unwrap, v[2], v[3]] : v);
    target = { ...target, arm: sh(target.arm), arm2: sh(target.arm2) };
  }
  const j = (scene.view === "front" ? solveFront : solvePose)(kf[from], target, s, style);
  j.u = (u % 1 + 1) % 1;
  return { j, seg: i, segs };
}

// ----- drawing -----
const INK = "var(--c-text)";
const DIM = "var(--c-dim)";
const HOT = "#E3262E";

function Eq({ it, j }) {
  const st = (kind) => {
    if (kind === "pad") return { stroke: "var(--c-border)", fill: "var(--c-border)" };
    if (kind === "mach") return { stroke: DIM, fill: "none" };
    if (kind === "plate") return { stroke: INK, fill: "var(--c-dim)" };
    return { stroke: DIM, fill: "none" };
  };
  if (it.t === "L") {
    const a = pt(it.a, j);
    const b = pt(it.b, j);
    if (!a || !b) return null;
    const s = st(it.k);
    return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={s.stroke} strokeWidth={it.w || 3} strokeLinecap="round" strokeDasharray={it.dash} opacity={it.o || 1} />;
  }
  if (it.t === "C") {
    const c = pt(it.c, j);
    if (!c) return null;
    const s = st(it.k);
    return <circle cx={c[0]} cy={c[1]} r={it.r} fill={it.fill || s.fill} stroke={s.stroke} strokeWidth={it.w || 2} opacity={it.o || 1} />;
  }
  if (it.t === "R") {
    const c = pt(it.c, j);
    if (!c) return null;
    const s = st(it.k);
    return <rect x={c[0] - it.w / 2} y={c[1] - it.h / 2} width={it.w} height={it.h} rx={it.rx || 2} fill={it.fill || s.fill} stroke={s.stroke} strokeWidth={it.sw === undefined ? 2 : it.sw} opacity={it.o || 1} />;
  }
  return null;
}

function Held({ kind, p, far }) {
  if (!p || !kind || kind === "none") return null;
  const o = far ? 0.55 : 1;
  if (kind === "plate") {
    if (far) return null;
    return (
      <g opacity={o}>
        <circle cx={p[0]} cy={p[1]} r="12.5" fill="var(--c-dim)" fillOpacity="0.35" stroke={INK} strokeWidth="2.6" />
        <circle cx={p[0]} cy={p[1]} r="3" fill={INK} />
      </g>
    );
  }
  if (kind === "db") {
    return (
      <g opacity={o}>
        <circle cx={p[0]} cy={p[1]} r="6.2" fill="var(--c-dim)" fillOpacity="0.4" stroke={INK} strokeWidth="2" />
        <circle cx={p[0]} cy={p[1]} r="1.8" fill={INK} />
      </g>
    );
  }
  if (kind === "kb") {
    return (
      <g opacity={o}>
        <circle cx={p[0]} cy={p[1] + 5} r="7.5" fill="var(--c-dim)" fillOpacity="0.45" stroke={INK} strokeWidth="2" />
        <path d={"M " + (p[0] - 4) + " " + (p[1] - 1) + " Q " + p[0] + " " + (p[1] - 9) + " " + (p[0] + 4) + " " + (p[1] - 1)} fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "ball") {
    return (
      <g opacity={o}>
        <circle cx={p[0]} cy={p[1]} r="8" fill="var(--c-dim)" fillOpacity="0.4" stroke={INK} strokeWidth="2" />
      </g>
    );
  }
  if (kind === "grip") {
    return <circle cx={p[0]} cy={p[1]} r="3.6" fill="none" stroke={INK} strokeWidth="2" opacity={o} />;
  }
  return null;
}

// which parts of the figure to paint red for the trained muscles
function hotParts(primary) {
  const h = {};
  (primary || []).forEach((m) => {
    if (m === "chest") h.chest = 1;
    else if (m === "lats" || m === "traps") h.back = 1;
    else if (m === "lower_back") h.lowback = 1;
    else if (m === "abs" || m === "obliques") h.abs = 1;
    else if (m === "shoulders") h.delt = 1;
    else if (m === "biceps" || m === "triceps") h.uarm = 1;
    else if (m === "forearms") h.farm = 1;
    else if (m === "quads" || m === "hamstrings" || m === "adductors") h.thigh = 1;
    else if (m === "calves") h.shin = 1;
    else if (m === "glutes") h.glute = 1;
  });
  return h;
}

// body types: bone lengths stay the same, only the build and a few details change
export const BODY = {
  neutral: { torso: 13, up: 7, fo: 6, th: 9, sh: 7, ft: 5.5, sw: 15, hw: 8, trF: 15, shBar: 10 },
  male: { torso: 16, up: 8.6, fo: 7, th: 10.6, sh: 8, ft: 6, sw: 18, hw: 8, trF: 18, shBar: 12 },
  female: { torso: 11, up: 6, fo: 5.2, th: 9.4, sh: 6.2, ft: 5, sw: 12.5, hw: 11, trF: 11, shBar: 8 },
};
const GOLD = "var(--c-gold)";

export function Figure({ scene, j, primary, style = "neutral" }) {
  if (j.view === "front") return <FigureFront scene={scene} j={j} primary={primary} style={style} />;
  const hot = hotParts(primary);
  const B = BODY[style] || BODY.neutral;
  const seg = (a, b, w, color, o = 1) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o} />;
  const along = (t) => [j.hip[0] + (j.sh[0] - j.hip[0]) * t, j.hip[1] + (j.sh[1] - j.hip[1]) * t];
  const off = (p, s) => [p[0] + j.front[0] * s, p[1] + j.front[1] * s];
  const bodyO = 0.92;
  const farO = 0.45;
  const held = scene.held;
  const eq = scene.eq || [];
  const back = eq.filter((e) => !e.front);
  const front = eq.filter((e) => e.front);
  // ponytail: hangs from the back of the head
  const nd = (() => {
    const d = Math.hypot(j.head[0] - j.sh[0], j.head[1] - j.sh[1]) || 1;
    return [(j.head[0] - j.sh[0]) / d, (j.head[1] - j.sh[1]) / d];
  })();
  const at = (b, n) => [j.head[0] - j.front[0] * b + nd[0] * n, j.head[1] - j.front[1] * b + nd[1] * n];
  const tail = style === "female" ? "M" + at(6, 3).join(" ") + " Q" + at(18, 0).join(" ") + " " + at(14, -14).join(" ") : null;
  const bust = style === "female" ? off(along(0.8), 5.4) : null;
  return (
    <g data-fig={style}>
      <line x1="-60" y1={FLOOR + 3} x2="300" y2={FLOOR + 3} stroke="var(--c-border)" strokeWidth="2" strokeLinecap="round" />
      {scene.scroll && <line x1="-60" y1={FLOOR + 3} x2="300" y2={FLOOR + 3} stroke="var(--c-dim)" strokeWidth="2" strokeDasharray="10 14" strokeDashoffset={-(j.u || 0) * 24 * scene.scroll} />}
      {back.map((e, i) => <Eq key={"b" + i} it={e} j={j} />)}
      {/* far arm and leg */}
      {seg(j.sh, j.elbow2, B.up - 1, hot.uarm ? HOT : INK, farO)}
      {seg(j.elbow2, j.hand2, B.fo - 0.5, hot.farm ? HOT : INK, farO)}
      {seg(j.hip, j.knee2, B.th - 1, hot.thigh ? HOT : INK, farO)}
      {seg(j.knee2, j.ankle2, B.sh - 0.5, hot.shin ? HOT : INK, farO)}
      {seg(j.ankle2, j.toe2, B.ft - 0.5, INK, farO)}
      {held && held !== "plate" && <Held kind={held} p={j.fist2} far />}
      {/* torso, head */}
      {tail && <path d={tail} fill="none" stroke={GOLD} strokeWidth="5.5" strokeLinecap="round" />}
      {seg(j.hip, j.sh, B.torso, INK, bodyO)}
      {style === "female" && <circle cx={j.hip[0]} cy={j.hip[1]} r="8.4" fill={INK} opacity={bodyO} />}
      {style === "male" && <circle cx={j.sh[0]} cy={j.sh[1]} r="8.6" fill={INK} opacity={bodyO} />}
      {bust && <circle cx={bust[0]} cy={bust[1]} r="4.4" fill={INK} opacity={bodyO} />}
      {hot.chest && seg(off(along(0.55), B.torso / 3.7), off(along(0.95), B.torso / 3.7), 7, HOT)}
      {hot.back && seg(off(along(0.55), -B.torso / 3.7), off(along(0.95), -B.torso / 3.7), 7, HOT)}
      {hot.lowback && seg(off(along(0.08), -B.torso / 3.7), off(along(0.5), -B.torso / 3.7), 7, HOT)}
      {hot.abs && seg(off(along(0.1), B.torso / 3.7), off(along(0.5), B.torso / 3.7), 7, HOT)}
      {hot.glute && <circle cx={off(j.hip, -3)[0]} cy={off(j.hip, -3)[1]} r="7.5" fill={HOT} />}
      {seg(j.sh, j.head, 5, INK, bodyO)}
      <circle cx={j.head[0]} cy={j.head[1]} r={HEAD_R} fill={INK} opacity={bodyO} />
      {style === "female" && <path d={"M" + at(-1, 8).join(" ") + " Q" + at(8, 11).join(" ") + " " + at(8.5, 1).join(" ")} fill="none" stroke={GOLD} strokeWidth="3.4" strokeLinecap="round" />}
      {/* near leg */}
      {seg(j.hip, j.knee, B.th, hot.thigh ? HOT : INK, bodyO)}
      {seg(j.knee, j.ankle, B.sh, hot.shin ? HOT : INK, bodyO)}
      {seg(j.ankle, j.toe, B.ft, INK, bodyO)}
      {/* near arm */}
      {seg(j.sh, j.elbow, B.up, hot.uarm ? HOT : INK, bodyO)}
      {seg(j.elbow, j.hand, B.fo, hot.farm ? HOT : INK, bodyO)}
      {hot.delt && <circle cx={j.sh[0]} cy={j.sh[1]} r="6.5" fill={HOT} />}
      <circle cx={j.hand[0]} cy={j.hand[1]} r="3.4" fill={INK} opacity={bodyO} />
      {j.fist !== j.hand && seg(j.hand, j.fist, 4, INK, bodyO)}
      {held && <Held kind={held} p={j.fist} />}
      {front.map((e, i) => <Eq key={"f" + i} it={e} j={j} />)}
    </g>
  );
}

function FigureFront({ scene, j, primary, style = "neutral" }) {
  const hot = hotParts(primary);
  const B = BODY[style] || BODY.neutral;
  const seg = (a, b, w, color, o = 1) => <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" opacity={o} />;
  const along = (t) => [j.hip[0] + (j.sh[0] - j.hip[0]) * t, j.hip[1] + (j.sh[1] - j.hip[1]) * t];
  const held = scene.held;
  const back = (scene.eq || []).filter((e) => !e.front);
  const front = (scene.eq || []).filter((e) => e.front);
  const o = 0.92;
  const waist = along(0.45);
  const hourglass = "M" + j.shL.join(" ") + " L" + j.shR.join(" ") + " L" + (waist[0] + 5) + " " + waist[1] + " L" + (j.hipR[0] + 3.5) + " " + j.hipR[1] + " L" + (j.hipL[0] - 3.5) + " " + j.hipL[1] + " L" + (waist[0] - 5) + " " + waist[1] + " Z";
  return (
    <g data-fig={style}>
      <line x1="-60" y1={FLOOR + 3} x2="300" y2={FLOOR + 3} stroke="var(--c-border)" strokeWidth="2" strokeLinecap="round" />
      {scene.scroll && <line x1="-60" y1={FLOOR + 3} x2="300" y2={FLOOR + 3} stroke="var(--c-dim)" strokeWidth="2" strokeDasharray="10 14" strokeDashoffset={-(j.u || 0) * 24 * scene.scroll} />}
      {back.map((e, i) => <Eq key={"b" + i} it={e} j={j} />)}
      {seg(j.hipL, j.kneeL, B.th, hot.thigh ? HOT : INK, o)}
      {seg(j.kneeL, j.ankleL, B.sh, hot.shin ? HOT : INK, o)}
      {seg(j.ankleL, j.toeL, B.ft, INK, o)}
      {seg(j.hipR, j.kneeR, B.th, hot.thigh ? HOT : INK, o)}
      {seg(j.kneeR, j.ankleR, B.sh, hot.shin ? HOT : INK, o)}
      {seg(j.ankleR, j.toeR, B.ft, INK, o)}
      {seg(j.hipL, j.hipR, B.hw + 3, INK, o)}
      {style === "female" ? <path d={hourglass} fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" opacity={o} /> : seg(j.hip, j.sh, B.trF, INK, o)}
      {style !== "female" && seg(j.shL, j.shR, B.shBar, INK, o)}
      {hot.chest && seg(along(0.62), along(0.9), B.trF - 1, HOT)}
      {hot.back && seg(along(0.62), along(0.9), B.trF - 1, HOT)}
      {hot.abs && seg(along(0.12), along(0.5), B.trF - 4, HOT)}
      {hot.lowback && seg(along(0.1), along(0.45), B.trF - 4, HOT)}
      {hot.glute && seg(j.hipL, j.hipR, B.hw + 3, HOT)}
      {style === "female" && (
        <>
          <path d={"M" + (j.head[0] - 7) + " " + (j.head[1] - 2) + " Q" + (j.head[0] - 13) + " " + (j.head[1] + 12) + " " + (j.shL[0] - 1) + " " + (j.shL[1] + 6)} fill="none" stroke={GOLD} strokeWidth="4.2" strokeLinecap="round" />
          <path d={"M" + (j.head[0] + 7) + " " + (j.head[1] - 2) + " Q" + (j.head[0] + 13) + " " + (j.head[1] + 12) + " " + (j.shR[0] + 1) + " " + (j.shR[1] + 6)} fill="none" stroke={GOLD} strokeWidth="4.2" strokeLinecap="round" />
        </>
      )}
      {seg(j.sh, j.head, 5, INK, o)}
      <circle cx={j.head[0]} cy={j.head[1]} r={HEAD_R} fill={INK} opacity={o} />
      {seg(j.shL, j.elbowL, B.up, hot.uarm || hot.delt ? HOT : INK, o)}
      {seg(j.elbowL, j.handL, B.fo, hot.farm ? HOT : INK, o)}
      {seg(j.shR, j.elbowR, B.up, hot.uarm || hot.delt ? HOT : INK, o)}
      {seg(j.elbowR, j.handR, B.fo, hot.farm ? HOT : INK, o)}
      {style === "male" && <circle cx={j.shL[0]} cy={j.shL[1]} r="6.2" fill={INK} opacity={o} />}
      {style === "male" && <circle cx={j.shR[0]} cy={j.shR[1]} r="6.2" fill={INK} opacity={o} />}
      {hot.delt && <circle cx={j.shL[0]} cy={j.shL[1]} r="6.5" fill={HOT} />}
      {hot.delt && <circle cx={j.shR[0]} cy={j.shR[1]} r="6.5" fill={HOT} />}
      <circle cx={j.handL[0]} cy={j.handL[1]} r="3.4" fill={INK} />
      <circle cx={j.handR[0]} cy={j.handR[1]} r="3.4" fill={INK} />
      {held && held !== "plate" && <Held kind={held} p={j.handL} />}
      {held && <Held kind={held} p={j.handR} />}
      {front.map((e, i) => <Eq key={"f" + i} it={e} j={j} />)}
    </g>
  );
}

// The picture is cropped to the movement: sample the loop, take the bounding box of the figure and the equipment.
function sceneBounds(scene) {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  const take = (p, r = 0) => {
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) return;
    x0 = Math.min(x0, p[0] - r);
    x1 = Math.max(x1, p[0] + r);
    y0 = Math.min(y0, p[1] - r);
    y1 = Math.max(y1, p[1] + r);
  };
  for (let i = 0; i < 48; i++) {
    const { j } = sceneAt(scene, i / 48);
    Object.entries(j).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length === 2 && typeof v[0] === "number" && k !== "front") take(v, k === "head" ? HEAD_R : scene.held === "plate" && (k === "hand" || k === "fist") ? 13 : 2);
    });
    (scene.eq || []).forEach((e) => {
      if (e.nb) return;
      if (e.t === "L") {
        take(pt(e.a, j));
        take(pt(e.b, j));
      } else if (e.t === "C") take(pt(e.c, j), e.r);
      else if (e.t === "R") {
        const c = pt(e.c, j);
        if (c) {
          take([c[0] - e.w / 2, c[1] - e.h / 2]);
          take([c[0] + e.w / 2, c[1] + e.h / 2]);
        }
      }
    });
  }
  return [x0, y0, x1, y1];
}
export function autoVb(scene) {
  let [x0, y0, x1, y1] = sceneBounds(scene);
  if (y1 > 118) y1 = Math.max(y1, FLOOR + 6); // keep the floor in view when the figure is near it
  const m = 12;
  x0 -= m;
  x1 += m;
  y0 -= m;
  y1 += m;
  let w = Math.max(170, x1 - x0);
  let h = Math.max(120, y1 - y0);
  if (w / h > 240 / 170) h = (w * 170) / 240;
  else w = (h * 240) / 170;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return [Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w)];
}
export const vbOf = (scene) => {
  if (!scene._vb) scene._vb = autoVb(scene);
  const v = scene._vb;
  return v[0] + " " + v[1] + " " + v[2] + " " + (v[2] * 170) / 240;
};

export function frameSvg(scene, u, primary, style) {
  const { j } = sceneAt(scene, u, style);
  return (
    <svg viewBox={vbOf(scene)} width="100%" style={{ display: "block" }} role="img">
      <Figure scene={scene} j={j} primary={primary} style={style} />
    </svg>
  );
}

// the player: loops the scene like a short video (timeline, repetition counter, slow motion, full screen with the written steps)
export function ExerciseAnimation({ scene, primary, lang, labelPause, labelPlay, slow, bodyStyle = "neutral", labelRep = "Rep", labelFull = "Full screen", labelClose = "Close", steps = [], title = "" }) {
  const [u, setU] = useState(0);
  const [paused, setPaused] = useState(() => {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {
      return false;
    }
  });
  const [half, setHalf] = useState(false);
  const [full, setFull] = useState(false);
  const [reps, setReps] = useState(1);
  const raf = useRef(0);
  const clock = useRef({ last: 0, u: 0 });
  useEffect(() => {
    clock.current.u = 0;
    setU(0);
    setReps(1);
  }, [scene]);
  useEffect(() => {
    if (paused) return undefined;
    const loopMs = (scene.ms || 3200) * (half ? 2 : 1);
    const step = (now) => {
      const c = clock.current;
      if (!c.last) c.last = now;
      const dt = now - c.last;
      if (dt >= 30) {
        c.last = now;
        const next = c.u + dt / loopMs;
        if (next >= 1) setReps((r) => (r >= 99 ? 1 : r + 1));
        c.u = next % 1;
        setU(c.u);
      }
      raf.current = requestAnimationFrame(step);
    };
    clock.current.last = 0;
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [paused, half, scene]);
  const { j, seg, segs } = sceneAt(scene, u, bodyStyle);
  const caps = scene.cap && scene.cap[lang === "de" ? "de" : "en"];
  const label = caps ? caps[Math.min(caps.length - 1, Math.floor((seg / segs) * caps.length))] : "";
  const pill = { background: "var(--c-bg)", borderRadius: 999, padding: "3px 10px", fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 700 };
  const stage = (big) => (
    <div onClick={() => setPaused((p) => !p)} style={{ position: "relative", cursor: "pointer", borderRadius: 14, background: "var(--c-raised)", overflow: "hidden" }}>
      <svg viewBox={vbOf(scene)} width="100%" style={{ display: "block" }} role="img" aria-label={label}>
        <Figure scene={scene} j={j} primary={primary} style={bodyStyle} />
      </svg>
      {label && (
        <div data-phase style={{ ...pill, position: "absolute", left: 10, bottom: 14, color: "var(--c-text)", opacity: 0.92, fontSize: big ? 14 : 11.5 }}>
          {label}
        </div>
      )}
      <div data-reps style={{ ...pill, position: "absolute", right: 10, top: 10, color: "var(--c-dim)", opacity: 0.92 }}>
        {labelRep} {reps}
      </div>
      {paused && <div style={{ ...pill, position: "absolute", right: 10, bottom: 14, color: "var(--c-gold)" }}>▶ {labelPlay}</div>}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "var(--c-border)" }}>
        <div data-progress style={{ width: u * 100 + "%", height: "100%", background: "var(--c-gold)" }} />
      </div>
    </div>
  );
  const controls = (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 6 }}>
      <span data-full onClick={() => setFull(true)} style={{ fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--c-gold)", cursor: "pointer", padding: "2px 4px", marginRight: "auto" }}>
        ⤢ {labelFull}
      </span>
      <span onClick={() => setHalf((h) => !h)} style={{ fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: half ? "var(--c-bg)" : "var(--c-gold)", background: half ? "var(--c-gold)" : "transparent", border: "1px solid var(--c-gold)", borderRadius: 999, padding: "2px 10px", cursor: "pointer" }}>
        {slow}
      </span>
      <span onClick={() => setPaused((p) => !p)} style={{ fontFamily: "Sora, sans-serif", fontSize: 11.5, fontWeight: 600, color: "var(--c-gold)", cursor: "pointer", padding: "2px 4px" }}>
        {paused ? "▶ " + labelPlay : "❚❚ " + labelPause}
      </span>
    </div>
  );
  return (
    <div>
      {stage(false)}
      {controls}
      {full && (
        <div data-fullscreen style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--c-bg)", overflowY: "auto", padding: "16px 16px 28px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
              <span data-full-close onClick={() => setFull(false)} style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--c-gold)", cursor: "pointer", padding: "4px 8px" }}>
                ✕ {labelClose}
              </span>
            </div>
            {stage(true)}
            {controls}
            {steps.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontFamily: "Inter, sans-serif", fontSize: 15, color: "var(--c-text)", lineHeight: 1.45 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--c-goldSoft)", color: "var(--c-gold)", fontFamily: "Sora, sans-serif", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
