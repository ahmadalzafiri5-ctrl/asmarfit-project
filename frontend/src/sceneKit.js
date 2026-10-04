// Small helpers for writing exercise scenes (see exerciseScenes*.js).
export const FL = 148; // floor line
export const rel = (name, dx, dy) => (j) => [j[name][0] + dx, j[name][1] + dy];
export const cap = (da, db, ea, eb) => ({ de: [da, db], en: [ea, eb] });
// equipment: L = line, C = circle, R = rectangle. k = look ("pad" soft pad, "mach" metal outline, "plate")
export const L = (a, b, w = 3, k = "mach", extra) => ({ t: "L", a, b, w, k, ...extra });
export const C = (c, r, k = "mach", extra) => ({ t: "C", c, r, k, ...extra });
export const R = (c, w, h, k = "mach", extra) => ({ t: "R", c, w, h, k, ...extra });
export const benchFlat = (x1, x2, top) => [L([x1, top + 3.5], [x2, top + 3.5], 7, "pad"), L([x1 + 12, top + 8], [x1 + 12, FL], 3), L([x2 - 12, top + 8], [x2 - 12, FL], 3)];
export const box = (x, y, w, h, extra) => R([x + w / 2, y + h / 2], w, h, "mach", { rx: 3, ...extra });
// a pad lying behind a torso that goes from hip to shoulder (th = torso angle)
export const backPad = (th, off = 10) => {
  const f = [Math.cos((th * Math.PI) / 180), Math.sin((th * Math.PI) / 180)];
  return L((j) => [j.hip[0] - f[0] * off, j.hip[1] - f[1] * off], (j) => [j.sh[0] - f[0] * off, j.sh[1] - f[1] * off], 8, "pad");
};
// zoom: [x, y, width]
export const ZOUT = [-20, -42, 280]; // zoomed out: overhead and jumping moves
export const ZLOW = [24, 46, 212]; // zoomed in on the lower area: lying and floor work
export const toDeg = (r) => (r * 180) / Math.PI;
