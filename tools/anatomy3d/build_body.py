# Builds an anatomical 3D body (muscle atlas look) from signed distance primitives, meshes it and bakes per vertex:
# muscle label (ids as in anatomy.js), border distance, distance to the next head of the same muscle, fibre direction, AO.
# Units: cm. y up (floor 0), z forward, x to the person's left. Left half is defined, right half is mirrored.
import numpy as np, json, sys
from skimage.measure import marching_cubes
import pyfqmr

LABELS = ["skin", "chest", "shoulders", "biceps", "triceps", "forearms", "abs", "obliques", "traps", "lats",
          "lower_back", "glutes", "quads", "hamstrings", "adductors", "calves", "hair", "tendon"]
L = {n: i for i, n in enumerate(LABELS)}

def nrm(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v)

def frame(axis, fwd=(0, 0, 1)):
    yv = nrm(axis); f = np.asarray(fwd, float)
    zv = nrm(f - yv * np.dot(f, yv)); xv = np.cross(yv, zv)
    return np.stack([xv, yv, zv])

PRIMS = []  # (kind, label, k, params)

def ell(label, c, r, axis=(0, 1, 0), fwd=(0, 0, 1), k=None, fib=None):
    R = frame(axis, fwd)
    PRIMS.append(("e", label, k, dict(c=np.asarray(c, float), r=np.asarray(r, float), R=R, fib=nrm(fib) if fib is not None else R[1])))

def cap(label, a, b, ra, rb, k=None, fib=None):
    a = np.asarray(a, float); b = np.asarray(b, float)
    PRIMS.append(("c", label, k, dict(a=a, b=b, ra=ra, rb=rb, fib=nrm(fib) if fib is not None else nrm(b - a))))

def lerp(a, b, t): return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * t

def limb_ell(label, a, b, t, off, r, fwd=(0, 0, 1), k=None, fib=None):
    ax = np.asarray(b, float) - np.asarray(a, float)
    R = frame(ax, fwd)
    c = lerp(a, b, t) + R[0] * off[0] + R[2] * off[1]
    ell(label, c, r, ax, fwd, k, fib)

# ---------- skeleton landmarks (left side) ----------
SH = (18.6, 146.0, -0.5)
EL = (26.0, 118.0, -3.0)
WR = (30.8, 94.0, 0.5)
HAND = (32.6, 84.0, 1.8)
HIP = (9.6, 93.0, 0.0)
KN = (10.6, 51.0, 1.8)
AN = (11.4, 8.5, -2.5)

KB = 4.0   # blend of the base body
KM = 1.8   # blend of muscles

# ---------- base body (generic muscle / bone, not selectable) ----------
ell("skin", (0, 167.5, 0.4), (7.3, 10.2, 9.0), k=KB)                      # cranium
ell("skin", (0, 159.6, 2.6), (5.5, 5.0, 6.0), k=KB)                       # jaw
ell("skin", (0, 165.2, 8.6), (1.1, 2.3, 1.5), axis=(0, 1, 0.35), k=1.0)   # nose
ell("skin", (7.1, 165.2, 0.0), (1.1, 3.0, 2.0), k=1.0)                    # ear
cap("skin", (0, 148, -1.0), (0, 159.5, 0.0), 5.4, 4.9, k=KB)              # neck
cap("skin", (5.6, 161.5, -0.5), (1.6, 148.0, 4.4), 1.3, 1.2, k=1.8)        # sternocleidomastoid
ell("skin", (0, 128.5, -0.4), (14.4, 18.0, 10.2), k=KB)                   # rib cage
ell("skin", (0, 109.0, -0.4), (11.0, 11.0, 8.2), k=KB)                    # waist
ell("skin", (0, 95.5, -0.6), (14.0, 9.5, 9.6), k=KB)                      # pelvis
cap("skin", (6, 144, -1.0), SH, 4.4, 4.6, k=KB)                           # shoulder girdle
cap("skin", SH, EL, 4.6, 3.5, k=KB)                                       # humerus
cap("skin", EL, WR, 3.4, 2.3, k=KB)                                       # forearm core
ell("skin", lerp(WR, HAND, 0.5), (3.8, 5.6, 2.4), axis=np.subtract(HAND, WR), fwd=(1, 0, 0.25), k=1.8)   # fist
limb_ell("skin", WR, HAND, 0.42, (3.3, -0.3), (1.3, 3.0, 1.3), fwd=(1, 0, 0.25), k=1.0)                    # thumb
cap("skin", HIP, KN, 8.0, 5.2, k=KB)                                      # femur core
cap("skin", KN, AN, 4.5, 2.7, k=KB)                                       # shank core
ell("skin", (12.1, 3.0, 4.2), (4.1, 10.0, 2.6), axis=(0.08, -0.12, 1), fwd=(0, 1, 0), k=2.5)  # foot
ell("skin", (11.8, 4.6, 0.5), (3.2, 5.0, 2.8), axis=(0, 0.4, 1), fwd=(0, 1, 0), k=2.0)
ell("skin", (11.4, 6.0, -3.2), (2.9, 4.0, 3.2), k=2.0)                   # heel
limb_ell("skin", KN, AN, 0.32, (1.6, 2.6), (2.3, 11.0, 2.0), k=1.6)       # tibialis anterior
# sartorius: thin strip from the front of the hip across to the inner knee
cap("skin", (12.6, 92.0, 7.4), (8.8, 73.0, 7.4), 1.5, 1.5, k=1.2)
cap("skin", (8.8, 73.0, 7.4), (6.4, 55.0, 2.6), 1.5, 1.4, k=1.2)
# tensor fasciae latae
ell("skin", (13.6, 88.0, 3.2), (2.0, 5.0, 1.8), axis=(0.2, 1, 0), k=1.4)

# ---------- muscles ----------
# chest: fibres run from the sternum to the arm
ell("chest", (8.2, 131.8, 7.0), (9.6, 6.6, 2.7), axis=(0.18, 1, 0), fwd=(0.15, 0, 1), k=KM, fib=(1, 0.35, -0.1))
ell("chest", (7.0, 137.6, 6.6), (9.2, 4.6, 2.4), axis=(0.4, 1, 0), fwd=(0.1, 0, 1), k=KM, fib=(1, -0.12, -0.1))
cap("chest", (13.0, 134.0, 5.8), (18.0, 137.5, 3.0), 2.6, 2.0, k=KM, fib=(1, 0.2, -0.3))
# shoulders: deltoid with three heads, fibres along the arm
limb_ell("shoulders", SH, EL, 0.18, (0.6, 3.8), (4.2, 9.0, 3.4), k=KM)
limb_ell("shoulders", SH, EL, 0.18, (3.9, 0.0), (4.3, 9.4, 4.3), k=KM)
limb_ell("shoulders", SH, EL, 0.18, (0.8, -3.8), (4.0, 8.8, 3.4), k=KM)
ell("shoulders", (19.4, 145.8, -0.3), (5.4, 4.0, 5.4), k=KM, fib=(0.3, -1, 0))
# biceps + brachialis
limb_ell("biceps", SH, EL, 0.58, (0.0, 3.4), (3.8, 9.2, 3.9), k=KM)
limb_ell("biceps", SH, EL, 0.80, (1.9, 1.9), (2.5, 5.0, 2.4), k=KM)
# triceps: long and lateral head
limb_ell("triceps", SH, EL, 0.50, (-0.6, -3.6), (3.8, 11.5, 3.9), k=KM)
limb_ell("triceps", SH, EL, 0.42, (2.7, -2.2), (2.9, 9.5, 3.2), k=KM)
# forearms
limb_ell("forearms", EL, WR, 0.30, (-1.4, 1.4), (2.9, 9.0, 2.9), k=KM)
limb_ell("forearms", EL, WR, 0.30, (1.6, -0.9), (2.9, 9.0, 2.9), k=KM)
limb_ell("forearms", EL, WR, 0.15, (2.3, 1.6), (2.3, 6.5, 2.4), k=KM)
# abs: rectus abdominis, three pairs + lower part, vertical fibres
for y in (120.0, 113.5, 107.0):
    ell("abs", (3.6, y, 8.0 - (120 - y) * 0.03), (3.4, 3.2, 1.15), k=1.1)
ell("abs", (3.3, 99.5, 7.6), (3.3, 6.0, 1.1), k=1.1)
ell("abs", (0, 110.0, 7.3), (2.4, 15.0, 0.9), k=1.0)
# obliques (fibres down and forward) + serratus
ell("obliques", (9.0, 107.5, 3.2), (2.6, 8.5, 3.4), axis=(-0.2, 1, 0), fwd=(0.5, 0, 1), k=KM, fib=(0.55, 1, -0.35))
for i, (y, x) in enumerate(((125.0, 11.8), (121.0, 12.4), (117.0, 12.6))):
    ell("obliques", (x - 0.6, y, 4.4 - i * 0.5), (2.1, 1.5, 1.0), axis=(-0.4, 1, 0), k=1.8, fib=(1, 0.35, 0.2))
# traps
cap("traps", (3.4, 155.0, -2.6), (17.0, 147.4, -1.8), 2.8, 2.2, k=KM)
ell("traps", (5.2, 140.0, -8.6), (7.0, 9.0, 2.6), axis=(-0.15, 1, 0), fwd=(0, 0, -1), k=KM, fib=(1, 0.1, 0))
ell("traps", (3.0, 128.0, -9.3), (3.6, 9.0, 2.0), axis=(0.35, 1, 0), fwd=(0, 0, -1), k=KM, fib=(0.6, 1, 0))
# lats: fan toward the armpit
ell("lats", (10.8, 122.0, -6.2), (7.0, 13.0, 3.0), axis=(0.32, 1, 0), fwd=(0.4, 0, -1), k=KM, fib=(0.75, 1, 0.1))
ell("lats", (15.4, 131.0, -3.2), (3.9, 6.0, 4.4), axis=(0.25, 1, 0), k=KM)
ell("lats", (9.5, 114.0, -7.2), (5.0, 6.0, 2.6), axis=(0.5, 1, 0), fwd=(0.3, 0, -1), k=KM, fib=(0.8, 1, 0))
# lower back
cap("lower_back", (3.3, 98.5, -8.0), (3.3, 121.0, -8.2), 2.7, 2.6, k=KM)
ell("lower_back", (3.4, 106.0, -8.2), (2.9, 6.5, 2.2), k=KM)
# glutes: fibres from the sacrum down and out to the femur
ell("glutes", (7.8, 91.5, -5.4), (7.6, 8.8, 5.2), axis=(-0.2, 1, 0), k=KM, fib=(1, -0.7, 0))
ell("glutes", (13.2, 97.5, -2.4), (4.2, 4.8, 4.6), k=KM, fib=(0.3, -1, 0))
# quads
limb_ell("quads", HIP, KN, 0.47, (0.2, 4.9), (3.8, 17.0, 3.4), k=KM)
limb_ell("quads", HIP, KN, 0.50, (4.4, 1.4), (4.1, 17.5, 4.5), k=KM)
limb_ell("quads", HIP, KN, 0.80, (-3.3, 2.6), (3.7, 7.0, 3.7), k=KM)
# adductors
limb_ell("adductors", HIP, KN, 0.30, (-4.4, 0.4), (3.8, 13.0, 4.6), k=KM, fib=(0.35, -1, 0))
# hamstrings
limb_ell("hamstrings", HIP, KN, 0.50, (1.9, -4.6), (3.3, 15.5, 3.4), k=KM)
limb_ell("hamstrings", HIP, KN, 0.50, (-2.0, -4.4), (3.3, 15.5, 3.3), k=KM)
# calves
limb_ell("calves", KN, AN, 0.27, (1.7, -3.6), (2.9, 8.5, 3.0), k=KM)
limb_ell("calves", KN, AN, 0.25, (-1.9, -3.4), (3.1, 9.0, 3.2), k=KM)
limb_ell("calves", KN, AN, 0.52, (0.0, -2.2), (3.6, 9.0, 2.5), k=KM)
cap("calves", lerp(KN, AN, 0.6) + np.array([0, 0, -2.0]), np.asarray(AN) + np.array([0, 2.5, -3.0]), 2.0, 1.4, k=1.6)

# ---------- evaluation ----------
def is_mid(kind, p):
    return (kind == "e" and abs(p["c"][0]) < 1e-6) or (kind == "c" and abs(p["a"][0]) < 1e-6 and abs(p["b"][0]) < 1e-6)

def prim_dist(kind, p, P):
    if kind == "e":
        q = (P - p["c"]) @ p["R"].T
        r = p["r"]
        k0 = np.linalg.norm(q / r, axis=1)
        k1 = np.linalg.norm(q / (r * r), axis=1)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
    a, b, ra, rb = p["a"], p["b"], p["ra"], p["rb"]
    ba = b - a; l2 = ba @ ba
    h = np.clip(((P - a) @ ba) / l2, 0, 1)
    return np.linalg.norm(P - a - h[:, None] * ba, axis=1) - (ra + (rb - ra) * h)

def mirrored(P):
    Q = P.copy(); Q[:, 0] = -Q[:, 0]; return Q

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)

def all_dists(P):
    D, lab, src = [], [], []
    Pm = mirrored(P)
    for i, (kind, label, k, p) in enumerate(PRIMS):
        D.append(prim_dist(kind, p, P)); lab.append(L[label]); src.append((i, False))
        if not is_mid(kind, p):
            D.append(prim_dist(kind, p, Pm)); lab.append(L[label]); src.append((i, True))
    return D, lab, src

BACK = {"traps", "lats", "lower_back", "glutes", "hamstrings", "calves", "triceps"}
SPACING = 0.36  # cm between fibre lines

def fibre_uv(P, prim):
    """u: stripe coordinate around the fibre axis (whole number of stripes per turn), v: cm along the fibre"""
    kind, label, k, p = prim
    d = p["fib"]
    c = p["c"] if kind == "e" else (p["a"] + p["b"]) / 2
    rr = float(np.mean(p["r"])) if kind == "e" else (p["ra"] + p["rb"]) / 2 + 0.5
    seam = np.array([0, 0, 1.0]) if label in BACK else np.array([0, 0, -1.0])
    if abs(seam @ d) > 0.9: seam = np.array([1.0, 0, 0])
    e1 = nrm(seam - d * (seam @ d)); e2 = np.cross(d, e1)
    q = P - c
    ang = np.arctan2(q @ e2, q @ e1)  # seam (+-pi) faces away from the viewer side
    n = max(8, round(2 * np.pi * rr / SPACING))
    return ang / (2 * np.pi) * n, q @ d

def field(P):
    d = None
    Pm = mirrored(P)
    for pass_skin in (True, False):
        for kind, label, k, p in PRIMS:
            if (label == "skin") != pass_skin: continue
            for Q in ((P,) if is_mid(kind, p) else (P, Pm)):
                di = prim_dist(kind, p, Q)
                d = di if d is None else smin(d, di, k)
    return d

def seg_dist(P, a, b):
    a = np.asarray(a, float); b = np.asarray(b, float); ba = b - a
    h = np.clip(((P - a) @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(P - a - h[:, None] * ba, axis=1)

def tendon_sdf(P, N, skip=()):
    """negative inside a tendon/aponeurosis area (white in the atlas look)"""
    ax = np.abs(P[:, 0]); y = P[:, 1]; z = P[:, 2]
    nx = N[:, 0] * np.sign(P[:, 0] + 1e-9); nz = N[:, 2]
    Pl = np.stack([ax, y, z], 1)
    S = []
    class _S(list):
        tag = None
        def append(self, a):
            if self.tag not in skip: list.append(self, a)
    S = _S()
    S.tag = "alba"
    # linea alba + sternum line
    S.append(np.maximum.reduce([ax - (0.8 + 0.25 * np.clip((128 - y) / 25, 0, 1)), 96.5 - y, y - 142.0, 2.0 - z]))
    S.tag = "ablines"
    # tendinous lines between the ab blocks
    for yi in (116.75, 110.25, 103.6):
        S.append(np.maximum.reduce([np.abs(y - yi) - 0.35, ax - 6.6, 4.0 - z]))
    S.tag = "inguinal"
    # inguinal V
    Pxy = np.stack([ax, y, np.zeros_like(y)], 1)
    S.append(np.maximum(seg_dist(Pxy, (12.8, 99.5, 0), (2.2, 87.5, 0)) - 0.75, 3.5 - z))
    S.tag = "limbs"
    # hands (from just above the wrist) and feet incl. ankle band
    wr = np.asarray(WR); hd = nrm(np.subtract(HAND, WR))
    S.append(np.maximum.reduce([-(((Pl - wr) @ hd) + 1.6), 22.0 - ax, 70.0 - y]))
    S.append(y - 10.8)
    # knee: patella + patellar tendon
    kn = np.asarray(KN)
    S.append(np.linalg.norm(Pl - (kn + np.array([0.0, 2.0, 4.6])), axis=1) - 3.7)
    S.append(seg_dist(Pl, kn + np.array([0.0, 0.0, 4.4]), kn + np.array([-0.2, -7.0, 3.4])) - 1.9)
    # strips on the limbs, placed by the angle around the bone (arc length in cm from the strip centre)
    def band(a_, b_, d2, hw):
        a_ = np.asarray(a_, float); b_ = np.asarray(b_, float); ba = b_ - a_
        t = np.clip(((Pl - a_) @ ba) / (ba @ ba), 0, 1)
        q = Pl - (a_ + t[:, None] * ba)
        r = np.hypot(q[:, 0], q[:, 2])
        ang = np.arctan2(q[:, 0] * d2[1] - q[:, 2] * d2[0], q[:, 0] * d2[0] + q[:, 2] * d2[1])
        return np.abs(ang) * r - hw
    S.append(np.maximum.reduce([band(KN, AN, nrm([-0.45, 1.0]), 1.15 + np.clip((y - 30) / 30, 0, 0.5)), 13.0 - y, y - 44.0]))
    S.append(np.maximum.reduce([band(KN, AN, nrm([0.0, -1.0]), 1.1), 9.0 - y, y - 20.0]))
    S.tag = "itb"
    S.append(np.maximum.reduce([band(HIP, KN, nrm([1.0, 0.12]), 1.3 + 0.5 * np.clip((70 - y) / 14, 0, 1)), 56.0 - y, y - 84.0]))
    S.tag = "scalp"
    # scalp on top of the head
    S.append(np.maximum(172.0 - y + np.maximum(0, z - 2) * 0.6, 155 - y))
    return np.minimum.reduce(S)

if __name__ == "__main__":
    h = float(sys.argv[1]) if len(sys.argv) > 1 else 0.6
    target = int(sys.argv[2]) if len(sys.argv) > 2 else 110000
    xs = np.arange(-42, 42 + h, h); ys = np.arange(-1, 182 + h, h); zs = np.arange(-17, 20 + h, h)
    print("grid", len(xs), len(ys), len(zs))
    G = np.empty((len(xs), len(ys), len(zs)), np.float32)
    X, Z = np.meshgrid(xs, zs, indexing="ij")
    for j, y in enumerate(ys):
        P = np.stack([X.ravel(), np.full(X.size, y), Z.ravel()], 1)
        G[:, j, :] = field(P).reshape(X.shape)
    G[:, ys < 0.0, :] = np.maximum(G[:, ys < 0.0, :], 0.01)
    verts, faces, _, _ = marching_cubes(G, 0.0, spacing=(h, h, h))
    verts += np.array([xs[0], ys[0], zs[0]])
    print("raw", len(verts), len(faces))
    s = pyfqmr.Simplify(); s.setMesh(verts, faces)
    s.simplify_mesh(target_count=target, aggressiveness=5, preserve_border=False, verbose=False)
    verts, faces, _ = s.getMesh()
    verts = verts.astype(np.float64); faces = faces.astype(np.int64)
    print("simplified", len(verts), len(faces))
    e = 0.05
    def grad(P):
        g = np.zeros_like(P)
        for a in range(3):
            o = np.zeros(3); o[a] = e
            g[:, a] = (field(P + o) - field(P - o)) / (2 * e)
        return g
    for _ in range(2):
        g = grad(verts); f = field(verts)
        verts = verts - g * (f / np.maximum((g * g).sum(1), 1e-9))[:, None]
    nrmv = grad(verts); nrmv /= np.linalg.norm(nrmv, axis=1, keepdims=True)
    D, lab, src = all_dists(verts)
    D = np.stack(D); lab = np.array(lab)
    order = np.argsort(D, axis=0)
    best = order[0]; cols = np.arange(D.shape[1])
    labv = lab[best]
    d1 = D[best, cols]
    Dm = D.copy(); Dm[lab[:, None] == labv[None, :]] = 1e9
    edge = np.clip((Dm.min(0) - d1) / 2.0, 0, 1)
    d1b = D[order[1], cols]
    inner = np.where(lab[order[1]] == labv, np.clip((d1b - d1) / 0.7, 0, 1), 1.0)
    fu = np.zeros(len(verts)); fv = np.zeros(len(verts))
    Vm = mirrored(verts)
    for bi in np.unique(best):
        sel = best == bi
        pi, mir = src[bi]
        u_, v_ = fibre_uv((Vm if mir else verts)[sel], PRIMS[pi])
        fu[sel] = u_; fv[sel] = v_
    ts = tendon_sdf(verts, nrmv)
    inT = ts < 0
    labv = np.where(inT, L["tendon"], labv)
    edge = np.where(inT, np.clip(-ts / 2.0, 0, 1), np.minimum(edge, np.clip(ts / 2.0, 0, 1)))
    inner = np.where(inT, 1.0, inner)
    ao = np.zeros(len(verts))
    for i, dist in enumerate((1.0, 2.2, 4.0, 7.0)):
        f = field(verts + nrmv * dist)
        ao += (dist - np.minimum(f, dist)) / dist * (0.5 ** i)
    ao = np.clip(1 - ao * 0.55, 0, 1)
    pos = np.round(verts * 100).astype(np.int16)
    nq = np.round(nrmv * 127).astype(np.int8)
    fq = np.stack([np.round(fu * 400), np.round(fv * 100)], 1).clip(-32767, 32767).astype(np.int16)
    attr = np.stack([labv.astype(np.uint8), (edge * 255).astype(np.uint8), (inner * 255).astype(np.uint8), (ao * 255).astype(np.uint8)], 1)
    idx = faces.astype(np.uint16 if len(verts) < 65536 else np.uint32)
    pad4 = lambda b: b + b"\0" * ((-len(b)) % 4)
    blob = pad4(pos.tobytes()) + pad4(nq.tobytes()) + pad4(fq.tobytes()) + pad4(attr.astype(np.uint8).tobytes()) + idx.tobytes()
    open("body.bin", "wb").write(blob)
    json.dump({"nv": len(verts), "nf": len(faces), "idx32": bool(len(verts) >= 65536), "labels": LABELS, "uv": True}, open("body.json", "w"))
    print("bytes", len(blob), "labels", np.bincount(labv, minlength=len(LABELS)))
