// Anatomy chart: a shaded front and back body in the style of a muscle atlas. Every muscle is its own shape (left half
// drawn, the right half is the mirror image), so a muscle can glow red (main), blue (helper) or take any heat colour.
// Pure string output, so it is testable in node and the React side only hands the markup to the page.

export const VIEW_W = 200;
export const VIEW_H = 400;

// rounded rectangle as a path (for the ab blocks)
const rr = (x, y, w, h, r = 3) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

// the drawing is made in "tall" coordinates; the trunk and the arms are squeezed and the legs stretched at render time,
// so the legs get their natural length (crotch at half of the height)
const UP = 'transform="translate(0 52) scale(1 0.82) translate(0 -52)"';
const LO = 'transform="translate(0 206) scale(1 1.1) translate(0 -236)"';

// body parts without a muscle name (drawn first, muscles lie on top)
const BASE_UP = [
  "M100 52H92Q78 60 62 66Q56 72 58 90Q62 112 66 130Q72 156 74 176Q72 198 68 218Q76 234 100 242Z", // torso
  "M58 64Q44 66 41 86Q39 112 41 134Q41 148 43 156Q38 180 35 208Q33 222 33 230L47 232Q53 206 57 182Q61 162 61 152Q65 130 65 102Q65 80 62 68Z", // arm
  "M33 228Q28 240 32 252Q38 260 45 252Q49 240 47 230Z", // hand
];
const BASE_LO = [
  "M62 226Q54 262 60 298Q60 314 66 324Q63 352 66 384L86 384Q90 352 90 324Q96 314 98 298Q102 262 100 236Z", // leg
  "M64 384Q62 398 68 404Q80 408 92 402Q90 392 86 384Z", // foot
];
const NECK = "M91 40V56H109V40Z";
const HEAD = { cx: 100, cy: 23, rx: 15, ry: 20 };

// muscles, per view: id (null = not named), d = outline, l = fibre lines (stroke only), g = "l" when it belongs to the legs
const FRONT = [
  { id: null, d: "M99 200Q86 198 76 206Q72 220 78 236Q90 246 99 248Z", l: "M92 206Q84 220 86 238" },
  { id: "shoulders", d: "M62 62Q48 60 42 76Q38 94 44 110Q48 122 54 124Q58 110 60 98Q66 82 66 70Z", l: "M56 68Q48 90 50 116M50 64Q43 86 46 108" },
  { id: "chest", d: "M100 68Q86 64 72 68Q64 74 64 88Q64 102 72 110Q84 118 100 110Z", l: "M99 78Q86 79 71 84M99 90Q86 92 69 96M99 101Q87 104 73 106" },
  { id: "traps", d: "M99 54L92 54Q80 60 66 64Q62 66 64 69Q76 66 90 64L99 62Z", l: "" },
  { id: null, d: "M93 40Q95 52 99 62Q98 50 99 40Z", l: "" },
  { id: "biceps", d: "M46 116Q42 134 46 152Q52 156 58 152Q62 134 60 114Q52 110 46 116Z", l: "M52 118Q50 136 52 152" },
  { id: "forearms", d: "M44 156Q40 182 38 208Q40 221 46 223Q52 196 58 164Q60 156 54 154Z", l: "M49 162Q45 188 43 214" },
  { id: "obliques", d: "M90 124Q84 120 76 114Q70 132 72 156Q74 180 80 202Q86 198 90 194Q86 160 90 124Z", l: "M86 130L78 150M88 150L80 172M88 172L82 190" },
  { id: "obliques", d: "M64 106L74 112L72 120L63 114ZM64 118L74 124L72 132L64 126ZM66 130L75 136L74 143L67 139Z", l: "" },
  { id: "abs", d: rr(91.5, 114, 8, 14) + rr(91.5, 130, 8, 14) + rr(91.5, 146, 8, 16) + rr(91.5, 164, 8, 16) + rr(92.5, 182, 7, 14), l: "" },
  { id: "quads", g: "l", d: "M62 244Q56 276 64 306Q70 312 76 306Q78 272 78 240Q70 232 62 244Z", l: "M68 252Q64 278 68 304" },
  { id: "quads", g: "l", d: "M78 238Q76 270 77 304Q82 312 88 304Q89 270 90 242Q84 232 78 238Z", l: "M83 246Q81 270 82 300" },
  { id: "quads", g: "l", d: "M90 252Q96 268 95 290Q92 308 87 308Q87 280 89 254Z", l: "" },
  { id: "adductors", g: "l", d: "M99 236Q100 270 96 292Q95 270 91 250Q94 240 99 236Z", l: "" },
  { id: null, g: "l", d: "M68 308Q80 318 94 308Q94 326 80 328Q66 326 68 308Z", l: "" }, // knee
  { id: "calves", g: "l", d: "M68 328Q64 356 70 384L80 384Q82 356 80 328Z", l: "" },
  { id: "calves", g: "l", d: "M82 328Q96 354 88 380L82 380Q83 356 81 330Z", l: "" },
];
const BACK = [
  { id: "lats", d: "M64 104Q58 130 70 156Q80 174 98 182L98 146Q88 134 86 112Q76 100 64 104Z", l: "M96 152Q84 142 74 130M96 166Q82 158 70 146M92 178Q78 172 68 158" },
  { id: "shoulders", d: "M62 62Q48 60 42 76Q38 94 44 110Q48 122 54 124Q58 110 60 98Q66 82 66 70Z", l: "M56 68Q48 90 50 116M50 64Q43 86 46 108" },
  { id: null, d: "M66 80Q74 86 82 98Q74 104 66 100Q64 90 66 80Z", l: "" }, // infraspinatus / teres
  { id: "traps", d: "M100 46Q90 52 76 58Q68 62 62 68Q72 80 82 98Q92 118 100 140Z", l: "M98 70Q86 80 74 92M98 90Q88 100 82 112M98 112Q92 124 90 134" },
  { id: "lower_back", d: "M92 142Q86 164 88 188Q94 196 99 196L99 146Z", l: "M95 148Q92 168 94 190" },
  { id: "triceps", d: "M46 112Q42 132 46 152Q52 156 60 152Q64 132 62 110Q54 104 46 112Z", l: "M54 116Q52 134 54 150" },
  { id: "forearms", d: "M44 156Q40 182 38 208Q40 221 46 223Q52 196 58 164Q60 156 54 154Z", l: "M49 162Q45 188 43 214" },
  { id: "glutes", d: "M99 194Q82 188 70 198Q60 214 70 234Q84 246 99 240Z", l: "M96 202Q82 200 72 212M96 216Q82 218 74 228" },
  { id: "hamstrings", g: "l", d: "M62 244Q56 276 64 308Q72 314 78 306Q78 272 80 240Q70 236 62 244Z", l: "M70 252Q68 282 72 304" },
  { id: "hamstrings", g: "l", d: "M82 240Q90 272 88 308Q94 312 98 302Q101 272 99 240Z", l: "M92 250Q94 280 92 304" },
  { id: "calves", g: "l", d: "M66 326Q58 350 68 376Q76 386 82 378Q84 350 82 326Z", l: "M74 334Q72 356 76 376" },
  { id: "calves", g: "l", d: "M84 326Q100 350 94 376Q88 386 82 378Q82 350 82 326Z", l: "M90 334Q92 356 88 376" },
  { id: null, g: "l", d: "M68 378Q72 396 80 396Q88 396 96 378Z", l: "" }, // soleus
];

export const PARTS = { front: FRONT, back: BACK };

// muscles that are only visible from one side decide which view a single picture shows
const FRONT_ONLY = ["chest", "biceps", "abs", "obliques", "quads", "adductors"];
const BACK_ONLY = ["traps", "lats", "triceps", "lower_back", "glutes", "hamstrings"];

// "front" | "back": the side on which the main muscles are best seen
export function viewFor(primary = [], secondary = []) {
  const score = (list, w) => list.reduce((a, m) => a + (FRONT_ONLY.includes(m) ? w : BACK_ONLY.includes(m) ? -w : 0), 0);
  const s = score(primary, 2) + score(secondary, 1);
  if (s !== 0) return s > 0 ? "front" : "back";
  if (primary.includes("calves")) return "back";
  return "front";
}

const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (c, to, k) => {
  const a = hex(c);
  const b = hex(to);
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
};

export const SECONDARY = "#4A8DF6";
export const PRIMARY = "#E3262E";
export const NEUTRAL = "#8E949D";

// fill colour per muscle: heat colours (rank map) win over the red / blue highlight
function colourFor(id, { primary, secondary, heat }) {
  if (!id) return null;
  if (heat) return heat[id] || NEUTRAL;
  if (primary.includes(id)) return PRIMARY;
  if (secondary.includes(id)) return SECONDARY;
  return NEUTRAL;
}

const mirrorAttr = ' transform="matrix(-1 0 0 1 200 0)"';
const EDGE = ' stroke="#0a0b0d" stroke-width="0.7" stroke-linejoin="round"';
const twice = (tag) => tag + tag.replace("/>", mirrorAttr + "/>");

// opts: { views: ["front","back"], primary, secondary, heat, uid, animate, gender, accent, label, scan }
export function anatomySvg(opts = {}) {
  const { views = ["front", "back"], primary = [], secondary = [], heat = null, uid = "an", animate = true, gender = "neutral", accent = "#1FD1A2", label = "", scan = true } = opts;
  const state = { primary, secondary, heat };
  const colours = new Set();
  const gid = (c) => uid + "-g" + c.slice(1);
  const body = (view, ox) => {
    let up = "";
    let lo = "";
    const put = (grp, s) => {
      if (grp === "l") lo += s;
      else up += s;
    };
    const fillPath = (grp, d, fill, cls = "") => put(grp, twice(`<path d="${d}" fill="${fill}"${cls ? ` class="${cls}"` : ""}${EDGE}/>`));
    BASE_LO.forEach((d) => fillPath("l", d, `url(#${uid}-base)`));
    BASE_UP.forEach((d) => fillPath("u", d, `url(#${uid}-base)`));
    const hot = [];
    PARTS[view].forEach((p) => {
      const c = colourFor(p.id, state);
      if (!c) {
        fillPath(p.g, p.d, `url(#${uid}-base2)`);
        return;
      }
      colours.add(c);
      fillPath(p.g, p.d, `url(#${gid(c)})`, `${uid}-m`);
      if (p.l) put(p.g, twice(`<path d="${p.l}" fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="0.7" stroke-linecap="round"/>`));
      if (!heat && primary.includes(p.id)) hot.push(p);
    });
    // pulse: the main muscles light up and fade again, like a contraction
    if (animate) hot.forEach((p) => put(p.g, twice(`<path d="${p.d}" fill="#FF7A7A" class="${uid}-pulse" pointer-events="none"/>`)));
    let head = `<path d="${NECK}" fill="url(#${uid}-base)"${EDGE}/><ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" fill="url(#${uid}-base)"${EDGE}/>`;
    if (gender === "female") {
      if (view === "back") head += `<path d="M100 3Q85 5 85 24Q87 12 100 10Q113 12 115 24Q115 5 100 3ZM100 11Q119 22 113 54Q110 64 107 74Q112 52 101 32Z" fill="url(#${uid}-hair)" stroke="#07080a" stroke-width="0.8"/>`;
      else head += `<path d="M85 22Q85 4 100 4Q115 4 115 22Q108 11 100 11Q92 11 85 22Z" fill="url(#${uid}-hair)" stroke="#07080a" stroke-width="0.8"/>`;
    }
    return `<g transform="translate(${ox} 0)"><g ${LO}>${lo}</g><g ${UP}>${up}</g>${head}</g>`;
  };
  const gap = views.length > 1 ? 12 : 0;
  const w = views.length * VIEW_W + (views.length - 1) * gap;
  let content = "";
  views.forEach((v, i) => {
    content += body(v, i * (VIEW_W + gap));
  });
  let defs = `<radialGradient id="${uid}-base" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#5a5f68"/><stop offset="1" stop-color="#2a2d33"/></radialGradient>`;
  defs += `<radialGradient id="${uid}-base2" cx="50%" cy="38%" r="78%"><stop offset="0" stop-color="#d5d9df"/><stop offset="0.55" stop-color="#9097a1"/><stop offset="1" stop-color="#4b5059"/></radialGradient>`;
  defs += `<linearGradient id="${uid}-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6844"/><stop offset="1" stop-color="#3a301f"/></linearGradient>`;
  colours.forEach((c) => {
    defs += `<radialGradient id="${gid(c)}" cx="50%" cy="38%" r="78%"><stop offset="0" stop-color="${mix(c, "#ffffff", c === NEUTRAL ? 0.6 : 0.45)}"/><stop offset="0.55" stop-color="${c === NEUTRAL ? mix(c, "#000000", 0.12) : c}"/><stop offset="1" stop-color="${mix(c, "#000000", 0.55)}"/></radialGradient>`;
  });
  defs += `<linearGradient id="${uid}-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset="0.5" stop-color="${accent}" stop-opacity="0.5"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>`;
  // the scan line only lights the body
  const doScan = animate && scan;
  if (doScan) {
    let clip = "";
    views.forEach((v, i) => {
      clip +=
        `<g transform="translate(${i * (VIEW_W + gap)} 0)"><g ${LO}>` + BASE_LO.map((d) => twice(`<path d="${d}"/>`)).join("") + `</g><g ${UP}>` + BASE_UP.map((d) => twice(`<path d="${d}"/>`)).join("") +
        `</g><ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${HEAD.rx}" ry="${HEAD.ry}"/><path d="${NECK}"/></g>`;
    });
    defs += `<clipPath id="${uid}-clip">${clip}</clipPath>`;
  }
  const css =
    `.${uid}-pulse{opacity:0}` +
    (animate
      ? `@keyframes ${uid}Pulse{0%,100%{opacity:0}50%{opacity:.5}}` +
        (doScan ? `@keyframes ${uid}Scan{0%{transform:translateY(-30px)}100%{transform:translateY(${VIEW_H}px)}}.${uid}-scanline{animation:${uid}Scan 4.2s linear infinite}` : "") +
        `.${uid}-pulse{animation:${uid}Pulse 1.8s ease-in-out infinite}` +
        `@media (prefers-reduced-motion:reduce){.${uid}-pulse{animation:none;opacity:.2}.${uid}-scanline{animation:none;opacity:0}}`
      : "");
  const scanEl = doScan ? `<g clip-path="url(#${uid}-clip)" pointer-events="none"><rect class="${uid}-scanline" x="0" y="0" width="${w}" height="30" fill="url(#${uid}-scan)"/></g>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${VIEW_H}" width="100%" role="img" aria-label="${String(label).replace(/"/g, "")}" data-anatomy="${views.join("+")}"><style>${css}</style><defs>${defs}</defs>${content}${scanEl}</svg>`;
}

// every muscle id that appears in the drawing
export const MUSCLE_IDS = [...new Set([...FRONT, ...BACK].map((p) => p.id).filter(Boolean))];

// small icon version (library list, filter bar): the silhouette plus only the lit muscles, flat colours, few elements
const liteCache = new Map();
export function anatomyLite({ view, primary = [], secondary = [], label = "" } = {}) {
  const v = view || viewFor(primary, secondary);
  const key = v + "|" + primary.join(",") + "|" + secondary.join(",");
  let hit = liteCache.get(key);
  if (hit === undefined) {
    let lo = "";
    let up = "";
    BASE_LO.forEach((d) => (lo += twice(`<path d="${d}" fill="#6b717b"/>`)));
    BASE_UP.forEach((d) => (up += twice(`<path d="${d}" fill="#6b717b"/>`)));
    PARTS[v].forEach((p) => {
      const c = p.id && primary.includes(p.id) ? PRIMARY : p.id && secondary.includes(p.id) ? SECONDARY : null;
      if (!c) return;
      const s = twice(`<path d="${p.d}" fill="${c}"/>`);
      if (p.g === "l") lo += s;
      else up += s;
    });
    hit = `<g ${LO}>${lo}</g><g ${UP}>${up}</g><ellipse cx="${HEAD.cx}" cy="${HEAD.cy}" rx="${HEAD.rx}" ry="${HEAD.ry}" fill="#6b717b"/><path d="${NECK}" fill="#6b717b"/>`;
    liteCache.set(key, hit);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 0 160 ${VIEW_H}" width="100%" role="img" aria-label="${String(label).replace(/"/g, "")}" data-anatomy-lite="${v}">${hit}</svg>`;
}

// the groups of the muscle rank (Symmetry-style): which muscles belong to which body group
export const RANK_GROUPS = [
  { key: "chest", muscles: ["chest"] },
  { key: "back", muscles: ["lats", "traps", "lower_back"] },
  { key: "shoulders", muscles: ["shoulders"] },
  { key: "arms", muscles: ["biceps", "triceps", "forearms"] },
  { key: "core", muscles: ["abs", "obliques"] },
  { key: "legs", muscles: ["quads", "hamstrings", "adductors", "calves"] },
  { key: "glutes", muscles: ["glutes"] },
];
