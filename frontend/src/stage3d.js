// The 3D stage of the exercise player: draws a lifted pose (pose3d.js) with three.js, lights it, and lets the user turn the view.
// Loaded on demand (dynamic import), so the three.js code is not part of the first download.
import * as THREE from "three";
import { liftPose, liftEquipment, posePoints, v3sub, v3norm, v3cross, v3dot, v3mul } from "./pose3d.js";

const COLORS = { body: 0x9aa2ad, bodyDark: 0x6d747e, red: 0xe3262e, hair: 0x2a2d33, pad: 0x3d424a, metal: 0xaab3be, plate: 0x30353c };

// env: { sceneAt, BODY, WIDTHS, FLOOR } from the player; opts: { onReady }
export function createStage(host, env) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: !!(typeof window !== "undefined" && window.__asfitTest) });
  renderer.setPixelRatio(Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab";
  canvas.setAttribute("data-stage3d", "1");
  host.appendChild(canvas);

  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 240 / 170, 1, 3000);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x2a2e35, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(90, 170, 150);
  sc.add(key);
  const rim = new THREE.DirectionalLight(0x7aa8ff, 0.55);
  rim.position.set(-140, 90, -110);
  sc.add(rim);

  const mats = {
    body: new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.55, metalness: 0.04 }),
    red: new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.42, metalness: 0.04, emissive: 0x3a0306 }),
    hair: new THREE.MeshStandardMaterial({ color: COLORS.hair, roughness: 0.7 }),
    pad: new THREE.MeshStandardMaterial({ color: COLORS.pad, roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.32, metalness: 0.7 }),
    plate: new THREE.MeshStandardMaterial({ color: COLORS.plate, roughness: 0.5, metalness: 0.2 }),
  };
  // ground shadow: a soft dark disc
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, "rgba(0,0,0,0.55)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.2;
  sc.add(shadow);
  const grid = new THREE.GridHelper(400, 20, 0x2b3037, 0x1c2025);
  grid.position.y = 0;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  sc.add(grid);

  const state = { scene: null, style: "neutral", hot: new Set(), items: null, equip: [], center: new THREE.Vector3(0, 60, 0), dist: 300, u: 0, az: 0, drag: 0, t0: performance.now(), disposed: false };
  const group = new THREE.Group();
  sc.add(group);
  const geos = [];
  const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
  geos.push(sphereGeo);
  const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const tmpM = new THREE.Matrix4();

  function clearItems() {
    while (group.children.length) {
      const c = group.children[0];
      group.remove(c);
    }
    geos.slice(1).forEach((g) => g.dispose());
    geos.length = 1;
    state.items = null;
    state.equip = [];
  }

  function matFor(muscle) {
    if (muscle === "hair") return mats.hair;
    return muscle && state.hot.has(muscle) ? mats.red : mats.body;
  }

  // build the meshes for the first pose (the counts stay the same for the whole scene)
  function build(pose, equipment) {
    const limbs = pose.limbs.map((l) => {
      const g = new THREE.CylinderGeometry(l.rb, l.ra, 1, 14, 1, false);
      geos.push(g);
      const cyl = new THREE.Mesh(g, mats.body);
      const sa = new THREE.Mesh(sphereGeo, mats.body);
      const sb = new THREE.Mesh(sphereGeo, mats.body);
      group.add(cyl, sa, sb);
      return { cyl, sa, sb, ra: l.ra, rb: l.rb };
    });
    const balls = pose.balls.map(() => {
      const m = new THREE.Mesh(sphereGeo, mats.body);
      group.add(m);
      return m;
    });
    const blobs = pose.blobs.map((b) => {
      const m = new THREE.Mesh(sphereGeo, matFor(b.muscle));
      m.matrixAutoUpdate = false;
      group.add(m);
      return { mesh: m, muscle: b.muscle };
    });
    state.items = { limbs, balls, blobs };
    state.equip = equipment.map((e) => makeEquip(e));
  }

  function makeEquip(e) {
    const slot = { kind: e.kind, mesh: null };
    if (e.kind === "box") {
      slot.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), e.mat === "pad" ? mats.pad : mats.metal);
    } else if (e.kind === "cyl") {
      const g = new THREE.CylinderGeometry(1, 1, 1, 10);
      slot.mesh = new THREE.Mesh(g, e.mat === "pad" ? mats.pad : mats.metal);
    } else if (e.kind === "disc") {
      const g = new THREE.CylinderGeometry(1, 1, 1, 28);
      if (e.axis === "z") g.rotateX(Math.PI / 2);
      else g.rotateZ(Math.PI / 2);
      slot.mesh = new THREE.Mesh(g, mats.plate);
    } else if (e.kind === "torus") {
      const g = new THREE.TorusGeometry(1, Math.max(0.05, e.tube / Math.max(0.5, e.r)), 10, 24);
      slot.mesh = new THREE.Mesh(g, mats.metal);
    } else if (e.kind === "ball") {
      slot.mesh = new THREE.Mesh(sphereGeo, mats.plate);
    }
    if (slot.mesh) {
      if (slot.mesh.geometry !== sphereGeo) geos.push(slot.mesh.geometry);
      group.add(slot.mesh);
    }
    return slot;
  }

  function placeLimb(it, a, b) {
    const A = v(a);
    const B = v(b);
    const d = B.clone().sub(A);
    const l = Math.max(0.001, d.length());
    it.cyl.position.copy(A).add(B).multiplyScalar(0.5);
    it.cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    it.cyl.scale.set(1, l, 1);
    it.sa.position.copy(A);
    it.sa.scale.setScalar(it.ra);
    it.sb.position.copy(B);
    it.sb.scale.setScalar(it.rb);
  }

  function placeBlob(it, b) {
    const y = v3norm(b.y);
    let z = b.z;
    z = v3norm(v3sub(z, v3mul(y, v3dot(y, z))));
    if (!isFinite(z[0])) z = [0, 0, 1];
    const x = v3norm(v3cross(y, z));
    tmpM.makeBasis(v(x), v(y), v(z));
    tmpM.scale(new THREE.Vector3(b.r[0], b.r[1], b.r[2]));
    tmpM.setPosition(b.c[0], b.c[1], b.c[2]);
    it.mesh.matrix.copy(tmpM);
    it.mesh.matrixWorldNeedsUpdate = true;
  }

  function placeEquip(slot, e) {
    const m = slot.mesh;
    if (!m) return;
    if (e.kind !== slot.kind) {
      m.visible = false;
      return;
    }
    m.visible = true;
    if (e.kind === "box") {
      m.position.set(e.c[0], e.c[1], e.c[2]);
      m.rotation.set(0, 0, e.rotZ || 0);
      m.scale.set(e.size[0], e.size[1], e.size[2]);
    } else if (e.kind === "cyl") {
      const A = v(e.a);
      const B = v(e.b);
      const d = B.clone().sub(A);
      const l = Math.max(0.001, d.length());
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      m.scale.set(e.r, l, e.r);
    } else if (e.kind === "disc") {
      m.position.set(e.c[0], e.c[1], e.c[2]);
      m.scale.set(e.r, e.thick, e.r);
      if (e.axis === "z") m.scale.set(e.r, e.r, e.thick);
      else m.scale.set(e.thick, e.r, e.r);
    } else if (e.kind === "torus") {
      m.position.set(e.c[0], e.c[1], e.c[2]);
      m.scale.setScalar(e.r);
    } else if (e.kind === "ball") {
      m.position.set(e.c[0], e.c[1], e.c[2]);
      m.scale.setScalar(e.r);
    }
  }

  function lift(u) {
    const { j } = env.sceneAt(state.scene, u, state.style);
    const B = env.BODY[state.style] || env.BODY.neutral;
    const W = env.WIDTHS[state.style] || env.WIDTHS.neutral;
    const pose = liftPose(j, state.style, B, W, env.FLOOR);
    const equipment = liftEquipment(state.scene, j, env.FLOOR, pose);
    return { pose, equipment };
  }

  function render() {
    if (state.disposed || !state.scene) return;
    const t = (performance.now() - state.t0) / 1000;
    const sway = Math.sin(t * 0.55) * 11;
    const az = ((26 + sway + state.drag) * Math.PI) / 180;
    const el = (13 * Math.PI) / 180;
    const d = state.dist;
    camera.position.set(state.center.x + Math.sin(az) * Math.cos(el) * d, state.center.y + Math.sin(el) * d, state.center.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(state.center);
    renderer.render(sc, camera);
  }

  function frame(u) {
    if (state.disposed || !state.scene) return;
    state.u = u;
    const { pose, equipment } = lift(u);
    if (!state.items) build(pose, equipment);
    const it = state.items;
    pose.limbs.forEach((l, i) => placeLimb(it.limbs[i], l.a, l.b));
    pose.balls.forEach((b, i) => {
      it.balls[i].position.set(b.c[0], b.c[1], b.c[2]);
      it.balls[i].scale.setScalar(b.r);
    });
    pose.blobs.forEach((b, i) => placeBlob(it.blobs[i], b));
    equipment.forEach((e, i) => state.equip[i] && placeEquip(state.equip[i], e));
    render();
  }

  // frame the whole movement: sample the loop for the bounding sphere
  function fit() {
    const pts = [];
    for (let i = 0; i < 24; i++) {
      const { pose, equipment } = lift(i / 24);
      posePoints(pose, equipment).forEach((p) => pts.push(p));
    }
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    pts.forEach((p) => {
      if (![0, 1, 2].every((k) => isFinite(p[k]))) return;
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
      z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
    });
    y0 = Math.min(y0, 0);
    state.center.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const r = Math.max(30, Math.hypot(x1 - x0, y1 - y0, Math.min(z1 - z0, 46)) / 2 + 8);
    const fov = (camera.fov * Math.PI) / 180;
    // the picture is wider than tall: the vertical field decides
    state.dist = (r / Math.sin(fov / 2)) * 0.82;
    shadow.scale.set(r * 1.7, r * 1.7, 1);
    shadow.position.x = state.center.x;
    shadow.position.z = state.center.z;
    grid.position.x = Math.round(state.center.x / 20) * 20;
    grid.position.z = Math.round(state.center.z / 20) * 20;
    camera.near = Math.max(1, state.dist - r * 3);
    camera.far = state.dist + r * 6;
    camera.updateProjectionMatrix();
  }

  function load(scene, primary, style) {
    clearItems();
    state.scene = scene;
    state.style = style || "neutral";
    state.hot = new Set(primary || []);
    fit();
    frame(state.u || 0);
  }

  // drag to turn the view
  let down = null;
  let moved = 0;
  const onDown = (e) => {
    down = { x: e.clientX, d: state.drag };
    moved = 0;
    canvas.style.cursor = "grabbing";
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not every browser captures */
    }
  };
  const onMove = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    moved = Math.max(moved, Math.abs(dx));
    state.drag = down.d + dx * 0.6;
    render();
  };
  const onUp = () => {
    down = null;
    canvas.style.cursor = "grab";
  };
  // a drag must not count as a tap on the stage (which pauses the animation)
  const onClickCapture = (e) => {
    if (moved > 4) {
      e.stopPropagation();
      e.preventDefault();
      moved = 0;
    }
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  host.addEventListener("click", onClickCapture, true);

  function resize() {
    const w = Math.max(10, host.clientWidth);
    const h = Math.max(10, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);
  resize();

  function dispose() {
    state.disposed = true;
    if (ro) ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    host.removeEventListener("click", onClickCapture, true);
    clearItems();
    geos.forEach((g) => g.dispose());
    Object.values(mats).forEach((m) => m.dispose());
    shadowTex.dispose();
    shadow.geometry.dispose();
    shadow.material.dispose();
    grid.geometry.dispose();
    grid.material.dispose();
    renderer.dispose();
    try {
      renderer.forceContextLoss();
    } catch {
      /* already gone */
    }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }

  return { load, frame, resize, dispose, canvas, get drag() { return state.drag; }, setDrag(d) { state.drag = d; render(); } };
}
