// 3D anatomy figure: one sculpted body mesh (public/anatomy-body.bin), every vertex knows its muscle (same ids as anatomy.js).
// Muscles are coloured per state (1 main = red, 2 helper = blue, 3 picked) or by a heat colour per muscle; a horizontal drag turns
// the body. Loaded on demand (dynamic import), so three.js and the model are not part of the first download.
import * as THREE from "three";

export const LABELS = ["skin", "chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats",
  "lower_back", "glutes", "quads", "hamstrings", "adductors", "calves", "hair", "tendon"];

export function decodeBody(buf, meta) {
  const n = meta.nv, f = meta.nf;
  const p4 = (x) => x + ((4 - (x % 4)) % 4);
  let o = 0;
  const pos16 = new Int16Array(buf, o, n * 3); o += p4(n * 6);
  const nrm8 = new Int8Array(buf, o, n * 3); o += p4(n * 3);
  const uv16 = new Int16Array(buf, o, n * 2); o += p4(n * 4);
  const att = new Uint8Array(buf, o, n * 4); o += p4(n * 4);
  const idx = meta.idx32 ? new Uint32Array(buf, o, f * 3) : new Uint16Array(buf, o, f * 3);
  // expanded to one vertex per triangle corner: each corner carries the three muscle ids of its triangle and a
  // barycentric weight, so colours blend smoothly across a border and never through an unrelated muscle id
  const m = f * 3;
  const pos = new Float32Array(m * 3), nor = new Float32Array(m * 3), lab3 = new Float32Array(m * 3), bary = new Float32Array(m * 3), score = new Float32Array(m * 3), fuv = new Float32Array(m * 2);
  const ed = new Float32Array(m), inn = new Float32Array(m), ao = new Float32Array(m);
  for (let t = 0; t < f; t++) {
    const ia = idx[t * 3], ib = idx[t * 3 + 1], ic = idx[t * 3 + 2];
    const la = att[ia * 4], lb = att[ib * 4], lc = att[ic * 4];
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k], o3 = (t * 3 + k) * 3, o1 = t * 3 + k;
      pos[o3] = pos16[v * 3] / 100; pos[o3 + 1] = pos16[v * 3 + 1] / 100; pos[o3 + 2] = pos16[v * 3 + 2] / 100;
      nor[o3] = nrm8[v * 3] / 127; nor[o3 + 1] = nrm8[v * 3 + 1] / 127; nor[o3 + 2] = nrm8[v * 3 + 2] / 127;
      fuv[o1 * 2] = uv16[v * 2] / (meta.uv === 200 ? 200 : 400); fuv[o1 * 2 + 1] = uv16[v * 2 + 1] / 100;
      lab3[o3] = la; lab3[o3 + 1] = lb; lab3[o3 + 2] = lc;
      bary[o3 + k] = 1;
      // signed border distance of this corner for each label slot of the triangle (duplicate slots always lose)
      const lv = att[v * 4], e = att[v * 4 + 1] / 255;
      const slots = [la, lb, lc];
      for (let q = 0; q < 3; q++) {
        const dup = (q === 1 && lb === la) || (q === 2 && (lc === la || lc === lb));
        score[o3 + q] = dup ? -2 : slots[q] === lv ? e : -e;
      }
      ed[o1] = att[v * 4 + 1] / 255; inn[o1] = att[v * 4 + 2] / 255; ao[o1] = att[v * 4 + 3] / 255;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("aLab", new THREE.BufferAttribute(lab3, 3));
  g.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  g.setAttribute("aScore", new THREE.BufferAttribute(score, 3));
  g.setAttribute("aFib", new THREE.BufferAttribute(fuv, 2));
  g.setAttribute("aEdge", new THREE.BufferAttribute(ed, 1));
  g.setAttribute("aInner", new THREE.BufferAttribute(inn, 1));
  g.setAttribute("aAO", new THREE.BufferAttribute(ao, 1));
  g.computeBoundingSphere();
  return g;
}

// atlas look: natural muscle colours; when muscles are marked, the others turn pale so the marked ones stand out
export const LOOKS = {
  atlas: { muscle: 0xd9a194, deep: 0xd59d90, tendon: 0xf1ebe2, dim: 0xe2d2ce, dimDeep: 0xe0d0cb, primary: 0xe0262b, secondary: 0x4a8df6, select: 0xf59e0b, groove: 0.38, floor: 0xcfd3d8 },
};

export function createAnatomy3D(host, geometry, opts = {}) {
  const look = { ...LOOKS[opts.look || "atlas"] };
  look.groove = opts.groove ?? 0.12;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.3;
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 10, 2000);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9a9da3, 1.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(120, 260, 260);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-260, 80, 120);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-160, 200, -260);
  scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffffff, 0.6);
  rim2.position.set(220, 120, -200);
  scene.add(rim2);

  // muscle states live in a tiny texture: r = state colour mix, g = glow
  const N = 32;
  const stateData = new Uint8Array(N * 4);
  const stateTex = new THREE.DataTexture(stateData, N, 1, THREE.RGBAFormat);
  stateTex.magFilter = stateTex.minFilter = THREE.NearestFilter;

  const uniforms = { uState: { value: stateTex }, uTime: { value: 0 }, uGroove: { value: look.groove }, uHover: { value: -1 }, uInnerG: { value: opts.innerGroove ?? 0 }, uFibAmp: { value: opts.fibre ?? 0.6 } };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aLab; attribute vec3 aBary; attribute vec3 aScore; varying vec3 vScore; attribute vec2 aFib; varying vec2 vFib; attribute float aEdge; attribute float aInner; attribute float aAO;\nvarying vec3 vLab; varying vec3 vBary; varying float vEdge; varying float vInner; varying float vAO; varying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLab = aLab; vBary = aBary; vScore = aScore; vFib = aFib; vEdge = aEdge; vInner = aInner; vAO = aAO; vObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uState; uniform float uTime; uniform float uGroove; uniform float uHover; uniform float uInnerG; uniform float uFibAmp;\nvarying vec2 vFib; varying vec3 vLab; varying vec3 vBary; varying vec3 vScore; varying float vEdge; varying float vInner; varying float vAO; varying vec3 vObj;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 sc = vScore;
        vec3 aa = max(fwidth(sc), vec3(0.002));
        vec3 w = vec3(
          smoothstep(-aa.x, aa.x, sc.x - max(sc.y, sc.z)),
          smoothstep(-aa.y, aa.y, sc.y - max(sc.x, sc.z)),
          smoothstep(-aa.z, aa.z, sc.z - max(sc.x, sc.y)));
        w /= max(w.x + w.y + w.z, 1e-4);
        vec4 s0 = texture2D(uState, vec2((vLab.x + 0.5) / ${N}.0, 0.5));
        vec4 s1 = texture2D(uState, vec2((vLab.y + 0.5) / ${N}.0, 0.5));
        vec4 s2 = texture2D(uState, vec2((vLab.z + 0.5) / ${N}.0, 0.5));
        vec4 st = s0 * w.x + s1 * w.y + s2 * w.z;
        float mid = sc.x >= sc.y && sc.x >= sc.z ? vLab.x : (sc.y >= sc.z ? vLab.y : vLab.z);
        float top = max(sc.x, max(sc.y, sc.z));
        float second = sc.x + sc.y + sc.z - top - min(sc.x, min(sc.y, sc.z));
        float border = 1.0 - smoothstep(0.0, 0.3 + aa.x, top - second);
        vec3 base = st.rgb;
        // muscle fibres: stripes across the fibre direction on the surface, with a slow wobble so they look organic
        float isTendon = step(16.5, mid);
        float isMuscle = 1.0 - isTendon;
        float u = vFib.x, along = vFib.y;
        float wob = sin(along * 0.45 + u * 0.21) * 0.9 + sin(along * 1.3 + u * 0.05) * 0.3;
        float f1 = sin(6.2832 * u + wob);
        float f2 = sin(6.2832 * u * 2.0 + wob * 1.7 + 1.3);
        float fw = fwidth(u);
        float fadeA = 1.0 - smoothstep(0.18, 0.45, fw);
        float fadeB = 1.0 - smoothstep(0.09, 0.22, fw);
        f1 *= fadeA; f2 *= fadeB;
        float fibre = 0.55 * f1 + 0.45 * f2;
        base *= 1.0 + isMuscle * (0.13 * uFibAmp * fibre) - isMuscle * 0.03 * uFibAmp;
        base = mix(base, min(base * vec3(1.18, 1.12, 1.1), vec3(1.0)), isMuscle * smoothstep(0.5, 1.0, f1) * 0.6);
        base *= 1.0 + isTendon * 0.025 * f2;
        // grooves between muscles and (weaker) between heads of one muscle
        float groove = border;
        float grooveIn = (1.0 - smoothstep(0.0, 1.0, vInner)) * isMuscle * 0.55 * uInnerG;
        base *= 1.0 - uGroove * max(groove, grooveIn);
        base *= mix(0.58, 1.0, vAO);
        // pulse for active muscles (alpha channel = glow)
        float pulse = st.a * (0.75 + 0.25 * sin(uTime * 3.2));
        base += st.rgb * pulse * 0.22 * (1.0 - groove);
        if (abs(mid - uHover) < 0.5) base = mix(base, vec3(1.0), 0.18);
        diffuseColor.rgb = base;`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.07;");
  };
  const mesh = new THREE.Mesh(geometry, mat);
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const center = new THREE.Vector3(0, (bb.min.y + bb.max.y) / 2, 0);
  scene.add(mesh);

  // floor: soft shadow + ring
  const sh = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.1; scene.add(shadow);

  const st = { az: opts.az || 0.35, el: 0.08, dist: 520, auto: opts.autoRotate !== false, drag: null, vel: 0, states: {}, heat: null, t0: performance.now(), raf: 0, dead: false, zoom: 1, focusY: center.y };
  const col = new THREE.Color();

  function paint() {
    const any = Object.values(st.states).some(Boolean) || (!!st.heat && Object.values(st.heat).some((v) => v != null));
    for (let i = 0; i < N; i++) {
      const name = LABELS[i];
      let c, glow = 0;
      if (name === "tendon") c = look.tendon;
      else if (name === "skin" || name === "hair" || !name) c = any ? look.dimDeep : look.deep;
      else {
        const s = st.states[name];
        c = any ? look.dim : look.muscle;
        if (st.heat && st.heat[name] != null) {
          c = new THREE.Color(st.heat[name]).getHex();
        } else if (s === 1) { c = look.primary; glow = 1; }
        else if (s === 2) c = look.secondary;
        else if (s === 3) { c = look.select; glow = 1; }
      }
      col.setHex(c);
      stateData[i * 4] = Math.round(col.r * 255); stateData[i * 4 + 1] = Math.round(col.g * 255); stateData[i * 4 + 2] = Math.round(col.b * 255);
      stateData[i * 4 + 3] = glow ? 255 : 0;
    }
    stateTex.colorSpace = THREE.SRGBColorSpace;
    stateTex.needsUpdate = true;
  }
  paint();

  function resize() {
    const w = host.clientWidth || 300, h = host.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fit body height
    const fitH = 200 / st.zoom;
    const d = fitH / 2 / Math.tan((camera.fov * Math.PI) / 360) / Math.min(1, camera.aspect * 2.1);
    st.dist = d;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  function place() {
    const fy = st.focusY;
    camera.position.set(Math.sin(st.az) * Math.cos(st.el) * st.dist, fy + Math.sin(st.el) * st.dist, Math.cos(st.az) * Math.cos(st.el) * st.dist);
    camera.lookAt(0, fy, 0);
  }

  // pointer: drag turns, tap picks a muscle
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    v2.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit) return null;
    const lab = geometry.attributes.aLab, f = hit.face, p = geometry.attributes.position;
    const loc = mesh.worldToLocal(hit.point.clone());
    let best = 0, bd = 1e9;
    [f.a, f.b, f.c].forEach((vi, k) => { const d = loc.distanceToSquared(new THREE.Vector3(p.getX(vi), p.getY(vi), p.getZ(vi))); if (d < bd) { bd = d; best = k; } });
    const id = Math.round([lab.getX(f.a), lab.getY(f.a), lab.getZ(f.a)][best]);
    const name = LABELS[id];
    return name === "skin" || name === "hair" || name === "tendon" ? null : name;
  }
  canvas.addEventListener("pointerdown", (e) => {
    st.drag = { x: e.clientX, y: e.clientY, az: st.az, el: st.el, moved: 0, t: performance.now(), lx: e.clientX }; st.target = null;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
    st.auto = false;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!st.drag) {
      if (e.pointerType === "mouse") { const m = pick(e); uniforms.uHover.value = m ? LABELS.indexOf(m) : -1; canvas.style.cursor = m ? "pointer" : "grab"; }
      return;
    }
    const dx = e.clientX - st.drag.x, dy = e.clientY - st.drag.y;
    st.drag.moved = Math.max(st.drag.moved, Math.hypot(dx, dy));
    st.vel = (e.clientX - st.drag.lx) * 0.012; st.drag.lx = e.clientX;
    st.az = st.drag.az - dx * 0.012;
  });
  const up = (e) => {
    if (!st.drag) return;
    const tap = st.drag.moved < 6;
    st.drag = null; canvas.style.cursor = "grab";
    if (tap && opts.onPick) opts.onPick(pick(e));
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  function frame(now) {
    if (st.dead) return;
    const t = (now - st.t0) / 1000;
    uniforms.uTime.value = t;
    if (!st.drag) {
      if (st.target != null) {
        const d = Math.atan2(Math.sin(st.target - st.az), Math.cos(st.target - st.az));
        st.az += d * 0.14;
        if (Math.abs(d) < 0.002) { st.az = st.target; st.target = null; }
      } else if (st.auto) st.az += 0.0045;
      else if (Math.abs(st.vel) > 0.0005) { st.az -= st.vel; st.vel *= 0.93; }
    }
    if (st.visible) { place(); renderer.render(scene, camera); }
    st.raf = requestAnimationFrame(frame);
  }
  // only draw while the figure is on screen; no turning by itself when the system asks for less motion
  st.visible = true;
  let io = null;
  if (!opts.manual) {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) st.auto = false;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((es) => es.forEach((e) => (st.visible = e.isIntersecting)));
      io.observe(host);
    }
    st.raf = requestAnimationFrame(frame);
  }

  return {
    // states: { chest: 1, triceps: 2, ... }
    setStates(s) { st.states = { ...s }; st.heat = null; paint(); },
    setHeat(h) { st.heat = h; paint(); },
    setView(az, el = 0.08, smooth = false) { if (smooth) st.target = az; else { st.az = az; st.target = null; } st.el = el; st.auto = false; st.vel = 0; },
    setAuto(on) { st.auto = on; },
    setFocus(zoom = 1, y = center.y) { st.zoom = zoom; st.focusY = y; resize(); },
    setLook(name, bg) { Object.assign(look, LOOKS[name]); uniforms.uGroove.value = look.groove; paint(); },
    renderNow() { place(); renderer.render(scene, camera); },
    dispose() { st.dead = true; cancelAnimationFrame(st.raf); ro.disconnect(); if (io) io.disconnect(); mat.dispose(); stateTex.dispose(); renderer.dispose(); canvas.remove(); },
    canvas,
  };
}

// ---------- loading (once) ----------
let bodyPromise = null;
export function loadBody() {
  if (!bodyPromise) {
    const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
    bodyPromise = Promise.all([fetch(base + "anatomy-body.json").then((r) => r.json()), fetch(base + "anatomy-body.bin").then((r) => r.arrayBuffer())])
      .then(([meta, buf]) => decodeBody(buf, meta))
      .catch((e) => {
        bodyPromise = null;
        throw e;
      });
  }
  return bodyPromise;
}

// ---------- still pictures for the small body icons: one hidden renderer, pictures cached by content ----------
let thumbStage = null;
const thumbCache = new Map();
export async function bodyThumb({ states = {}, view = "front", w = 120, h = 240 } = {}) {
  const key = view + "|" + w + "x" + h + "|" + Object.keys(states).sort().map((k) => k + states[k]).join(",");
  if (thumbCache.has(key)) return thumbCache.get(key);
  const geo = await loadBody();
  if (!thumbStage) {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:" + w + "px;height:" + h + "px;pointer-events:none";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    thumbStage = createAnatomy3D(host, geo, { manual: true, preserve: true, autoRotate: false, groove: 0.12 });
    thumbStage.setFocus(1.08);
  }
  thumbStage.setStates(states);
  thumbStage.setView(view === "back" ? Math.PI : 0, 0.02);
  thumbStage.renderNow();
  const url = thumbStage.canvas.toDataURL("image/png");
  thumbCache.set(key, url);
  return url;
}
