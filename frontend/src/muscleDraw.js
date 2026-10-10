// Drawing helpers for the muscular exercise figure: tapered limbs, a shaped torso, patches for the trained muscles.
// Pure functions that return path strings and points, so they are testable in node. The figure itself lives in exerciseAnim.jsx.

export const OUT = "#0a0b0d";
// near side, far side and trained muscle: light edge, body colour, shadow edge
export const SKIN = { lit: "#d3d8de", mid: "#929aa4", dark: "#4a5059" };
export const SKIN_FAR = { lit: "#a0a7af", mid: "#6a7079", dark: "#383c43" };
export const RED = { lit: "#ff8d8d", mid: "#e3262e", dark: "#7d0c12" };

const f1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => f1(p[0]) + " " + f1(p[1]);

export function unit(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

// normal of the limb that faces up (the lit side)
export function litNormal(a, b) {
  const u = unit(a, b);
  const n = [-u[1], u[0]];
  return n[1] > 0 ? [-n[0], -n[1]] : n;
}

// tapered limb from a to b: half widths wa (start), wm (belly, at the fraction `at`), wb (end), round ends
export function limbPath(a, b, wa, wm, wb, at = 0.5) {
  const u = unit(a, b);
  const n = [-u[1], u[0]];
  const m = [a[0] + (b[0] - a[0]) * at, a[1] + (b[1] - a[1]) * at];
  const A1 = [a[0] + n[0] * wa, a[1] + n[1] * wa];
  const A2 = [a[0] - n[0] * wa, a[1] - n[1] * wa];
  const B1 = [b[0] + n[0] * wb, b[1] + n[1] * wb];
  const B2 = [b[0] - n[0] * wb, b[1] - n[1] * wb];
  // control point so that the edge swells to the belly width in the middle
  const c1 = [2 * (m[0] + n[0] * wm) - (A1[0] + B1[0]) / 2, 2 * (m[1] + n[1] * wm) - (A1[1] + B1[1]) / 2];
  const c2 = [2 * (m[0] - n[0] * wm) - (A2[0] + B2[0]) / 2, 2 * (m[1] - n[1] * wm) - (A2[1] + B2[1]) / 2];
  return "M" + pt(A1) + "Q" + pt(c1) + " " + pt(B1) + "A" + f1(wb) + " " + f1(wb) + " 0 0 0 " + pt(B2) + "Q" + pt(c2) + " " + pt(A2) + "A" + f1(wa) + " " + f1(wa) + " 0 0 0 " + pt(A1) + "Z";
}

// closed smooth curve through the points (Catmull-Rom turned into Beziers)
export function smoothClosed(pts, tension = 0.5) {
  const n = pts.length;
  if (n < 3) return "";
  let d = "M" + pt(pts[0]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += "C" + pt(c1) + " " + pt(c2) + " " + pt(p2);
  }
  return d + "Z";
}

// torso outline per body type in local coordinates: u from hip (0) to shoulder (1), v from the back (-) to the front (+)
const TORSO = {
  male: {
    back: [[0, -7.4], [0.18, -7.6], [0.45, -8.0], [0.72, -9.0], [0.92, -8.4], [1.03, -5.0]],
    front: [[1.03, 4.2], [0.9, 9.4], [0.74, 11.0], [0.55, 9.4], [0.36, 7.4], [0.16, 7.6], [0, 7.0]],
  },
  neutral: {
    back: [[0, -6.9], [0.18, -6.9], [0.45, -7.1], [0.72, -8.1], [0.92, -7.5], [1.03, -4.5]],
    front: [[1.03, 3.8], [0.9, 8.4], [0.74, 9.8], [0.55, 8.2], [0.36, 6.6], [0.16, 7.0], [0, 6.5]],
  },
  female: {
    back: [[0, -7.4], [0.12, -7.0], [0.42, -5.2], [0.72, -5.8], [0.92, -5.6], [1.03, -3.8]],
    front: [[1.03, 3.0], [0.9, 6.4], [0.76, 8.6], [0.58, 6.6], [0.38, 4.8], [0.16, 6.0], [0, 6.2]],
  },
};
// patches (local coordinates) that colour the trained part of the torso
const PATCH = {
  chest: [[0.6, 1.8], [0.6, 5.4], [0.76, 8.0], [0.93, 6.6], [0.95, 3.0], [0.8, 1.6]],
  back: [[0.42, -0.8], [0.5, -5.4], [0.74, -7.2], [0.95, -6.2], [0.92, -2.2], [0.7, -0.6]],
  lowback: [[0.04, -1], [0.04, -5.6], [0.28, -6.0], [0.42, -4.4], [0.38, -1]],
  abs: [[0.08, 1.6], [0.08, 5.6], [0.34, 6.0], [0.54, 5.4], [0.54, 1.6]],
};

const place = (H, t, f, u, v, L) => [H[0] + t[0] * L * u + f[0] * v, H[1] + t[1] * L * u + f[1] * v];

// j: joints (hip, sh, front); returns { outline, patches: {chest, back, lowback, abs}, lit: [x, y] direction to the front }
export function torsoShape(j, style = "neutral") {
  const T = TORSO[style] || TORSO.neutral;
  const H = j.hip;
  const S = j.sh;
  const L = Math.hypot(S[0] - H[0], S[1] - H[1]) || 1;
  const t = [(S[0] - H[0]) / L, (S[1] - H[1]) / L];
  const f = j.front || [1, 0];
  const to = (list) => list.map(([u, v]) => place(H, t, f, u, v, L));
  const outline = smoothClosed(to(T.back.concat(T.front)), 0.55);
  const patches = {};
  Object.keys(PATCH).forEach((k) => (patches[k] = smoothClosed(to(PATCH[k]), 0.6)));
  return { outline, patches, t, f, L };
}

// body widths per type: [start, belly, end, belly position]
export const WIDTHS = {
  male: { arm: [6.6, 6.2, 4.3, 0.45], fore: [4.5, 4.9, 3.0, 0.3], thigh: [9.8, 8.8, 5.8, 0.35], shin: [6.0, 6.5, 3.6, 0.3], foot: [3.8, 3.5, 2.5, 0.4], head: [7.6, 9.2], neck: [4.2, 3.6], delt: [7.4, 6.8, 5.2, 0.5] },
  neutral: { arm: [5.6, 5.3, 3.9, 0.45], fore: [4.0, 4.4, 2.8, 0.3], thigh: [8.8, 7.9, 5.3, 0.35], shin: [5.5, 5.9, 3.4, 0.3], foot: [3.5, 3.2, 2.4, 0.4], head: [7.3, 8.9], neck: [3.8, 3.3], delt: [6.6, 6.1, 4.6, 0.5] },
  female: { arm: [4.7, 4.5, 3.4, 0.45], fore: [3.5, 3.8, 2.4, 0.3], thigh: [10.0, 8.2, 5.2, 0.3], shin: [5.2, 5.6, 3.2, 0.3], foot: [3.3, 3.0, 2.2, 0.4], head: [7.0, 8.6], neck: [3.3, 2.9], delt: [5.6, 5.2, 4.0, 0.5] },
};
