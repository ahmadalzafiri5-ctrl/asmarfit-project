# Puts the muscle map of build_body.py onto the Rodin mesh: every Rodin vertex is moved into the canonical body
# (skeleton based: limbs by their bone, torso and head by width/depth profiles), labelled there, and the result is
# baked onto the Rodin geometry. Output: body.bin/body.json in the same format the viewer reads (uv scale 200).
import numpy as np, json, sys
from scipy.sparse import coo_matrix
import build_body as B

V = np.load("rodin-mesh-V.npy"); T = np.load("rodin-mesh-T.npy")
n = len(V)

# ---------- vertex normals ----------
fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
N = np.zeros_like(V)
for k in range(3): np.add.at(N, T[:, k], fn)
N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12

# ---------- skeletons (left side; the right side uses |x|) ----------
R = dict(SH=(19.5, 143.0, -3.0), EL=(32.2, 112.0, 1.5), WR=(33.6, 96.0, 6.0), HAND=(30.2, 85.0, 7.2),
         HIP=(11.0, 92.0, -1.0), KN=(16.3, 50.0, -2.5), AN=(21.6, 11.0, -5.0), TOE=(23.0, 2.5, 8.0))
M = dict(SH=B.SH, EL=B.EL, WR=B.WR, HAND=B.HAND, HIP=B.HIP, KN=B.KN, AN=B.AN, TOE=(12.5, 2.5, 12.0))
# bones: (a, b, rodin radius at a, at b, mine radius at a, at b)
BONES = [("SH", "EL", 6.5, 5.0, 5.2, 4.0), ("EL", "WR", 5.0, 3.6, 4.0, 2.8), ("WR", "HAND", 4.5, 4.5, 3.5, 3.5),
         ("HIP", "KN", 10.5, 6.5, 8.5, 5.5), ("KN", "AN", 6.0, 3.6, 4.8, 3.0), ("AN", "TOE", 4.5, 3.5, 4.0, 3.0)]

# torso / head profiles: y -> (half width, z min, z max)
YS = np.arange(95, 180, 5)
PR = np.array([(16.8, -15.3, 8.6), (15.6, -13.4, 10.2), (15.2, -10.1, 11.3), (14.8, -9.6, 12.8), (14.7, -10.1, 12.4),
               (16.4, -12.5, 13.3), (18.6, -14.2, 12.3), (21.0, -14.9, 12.1), (21.0, -16.5, 12.8), (21.0, -16.7, 10.4),
               (20.9, -15.8, 6.2), (13.0, -13.5, 3.4), (9.0, -9.6, 10.7), (7.8, -7.7, 11.4), (10.6, -8.6, 13.1),
               (10.0, -9.6, 12.0), (9.5, -8.6, 12.0)])
PM = np.array([(17.5, -10.4, 9.0), (17.0, -10.8, 8.7), (12.1, -11.0, 8.7), (13.0, -10.9, 8.4), (15.2, -10.8, 8.9),
               (17.3, -11.0, 9.2), (20.0, -11.5, 9.7), (20.0, -11.4, 10.2), (19.5, -11.1, 10.1), (19.5, -11.2, 9.2),
               (19.5, -10.8, 6.2), (13.0, -6.2, 5.2), (9.7, -5.6, 6.6), (7.1, -6.6, 9.0), (8.2, -8.4, 10.2),
               (7.2, -8.4, 9.2), (5.3, -6.1, 7.0)])
def prof(P, y):
    return [np.interp(y, YS, P[:, i]) for i in range(3)]

def frame_of(a, b):
    return B.frame(np.subtract(b, a), (0, 0, 1))

ax = np.abs(V[:, 0]); sx = np.sign(V[:, 0] + 1e-9)
Pl = np.stack([ax, V[:, 1], V[:, 2]], 1)
cands = []
# torso candidate
hw, z0, z1 = prof(PR, V[:, 1]); cz = (z0 + z1) / 2; hd = (z1 - z0) / 2
dt = np.sqrt((ax / hw) ** 2 + ((V[:, 2] - cz) / hd) ** 2) - 1.0
dt = np.where(V[:, 1] > 86, dt, 1e9)
cands.append(dt)
bone_t = []
for a, b, ra, rb, ma, mb in BONES:
    A = np.asarray(R[a], float); Bb = np.asarray(R[b], float); ba = Bb - A
    t = np.clip(((Pl - A) @ ba) / (ba @ ba), 0, 1)
    d = np.linalg.norm(Pl - (A + t[:, None] * ba), axis=1)
    r = ra + (rb - ra) * t
    cands.append(d / r - 1.0); bone_t.append(t)
C = np.stack(cands); which = np.argmin(C, 0)
print("assignment", np.bincount(which, minlength=len(cands)))

Q = np.zeros_like(V)
# torso mapping
mt = which == 0
y = V[mt, 1]
hwm, z0m, z1m = prof(PM, y); czm = (z0m + z1m) / 2; hdm = (z1m - z0m) / 2
yq = np.where(y < 150, y, 150 + (y - 150) * (27.7 / 30.0))
Q[mt, 0] = V[mt, 0] * (hwm / hw[mt])
Q[mt, 1] = yq
Q[mt, 2] = czm + (V[mt, 2] - cz[mt]) * (hdm / hd[mt])
# limb mapping
for i, (a, b, ra, rb, ma, mb) in enumerate(BONES):
    m = which == i + 1
    if not m.any(): continue
    t = bone_t[i][m]
    A = np.asarray(R[a], float); Bb = np.asarray(R[b], float)
    Am = np.asarray(M[a], float); Bm = np.asarray(M[b], float)
    Fr = frame_of(A, Bb); Fm = frame_of(Am, Bm)
    q = Pl[m] - (A + t[:, None] * (Bb - A))
    loc = q @ Fr.T
    s = (ma + (mb - ma) * t) / (ra + (rb - ra) * t)
    loc[:, 0] *= s; loc[:, 2] *= s; loc[:, 1] = 0
    Q[m] = Am + t[:, None] * (Bm - Am) + loc @ Fm
    Q[m, 0] *= sx[m]
# normals into the canonical space: good enough to keep them as they are
NQ = N.copy()

# ---------- label in the canonical body ----------
D, lab, src = B.all_dists(Q)
D = np.stack(D); lab = np.array(lab)
order = np.argsort(D, axis=0); best = order[0]; cols = np.arange(n)
labv = lab[best]; d1 = D[best, cols]
Dm = D.copy(); Dm[lab[:, None] == labv[None, :]] = 1e9
edge = np.clip((Dm.min(0) - d1) / 2.0, 0, 1)
d1b = D[order[1], cols]
inner = np.where(lab[order[1]] == labv, np.clip((d1b - d1) / 0.7, 0, 1), 1.0)
fu = np.zeros(n); fv = np.zeros(n); Qm = B.mirrored(Q)
for bi in np.unique(best):
    sel = best == bi; pi, mir = src[bi]
    u_, v_ = B.fibre_uv((Qm if mir else Q)[sel], B.PRIMS[pi]); fu[sel] = u_; fv[sel] = v_

# ---------- let borders slide into the sculpted grooves ----------
# edge weights: low across concave creases, so label scores diffuse along muscles but not over grooves
e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]); e = np.concatenate([e, e[:, ::-1]])
dv = V[e[:, 1]] - V[e[:, 0]]
conc = np.einsum("ij,ij->i", N[e[:, 0]] - N[e[:, 1]], dv) / (np.linalg.norm(dv, axis=1) ** 2 + 1e-9)  # >0 concave
w = np.exp(-np.clip(conc, 0, None) * 6.0)
W = coo_matrix((w, (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
deg = np.asarray(W.sum(1)).ravel() + 1e-9
L = len(B.LABELS)
S0 = np.zeros((n, L)); S0[cols, labv] = 1.0
S = S0.copy()
for it in range(40):
    S = 0.25 * S0 + 0.75 * (W @ S) / deg[:, None]
lab2 = S.argmax(1)
changed = (lab2 != labv).mean(); print("relabelled", round(changed * 100, 1), "%")
labv = lab2
# border distance from the score margin (smooth, in "edge" units)
srt = np.sort(S, 1); margin = srt[:, -1] - srt[:, -2]
edge = np.clip(margin * 2.2, 0, 1)

# ---------- cavity shading from the real geometry ----------
A1 = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
cnt = np.asarray(A1.sum(1)).ravel()
lap = (A1 @ V) / cnt[:, None] - V
cav = np.einsum("ij,ij->i", lap, N)  # >0 in valleys
for _ in range(2): cav = 0.5 * cav + 0.5 * (A1 @ cav) / cnt
big = (A1 @ ((A1 @ V) / cnt[:, None])) / cnt[:, None] - V
cav2 = np.einsum("ij,ij->i", big, N)
ao = np.clip(1.0 - np.clip(cav, 0, None) / (np.percentile(np.abs(cav), 95) + 1e-9) * 0.45
             - np.clip(cav2, 0, None) / (np.percentile(np.abs(cav2), 95) + 1e-9) * 0.25, 0, 1)

# tendons
ts = B.tendon_sdf(Q, NQ, skip=("alba", "ablines", "inguinal", "itb", "scalp"))
# rules measured on the Rodin body itself, so they sit on its sculpted grooves
X = np.abs(V[:, 0]); Y = V[:, 1]; Z = V[:, 2]
cn = cav / (np.percentile(np.abs(cav), 95) + 1e-9)
rs = [np.maximum.reduce([X - 0.9, 101.0 - Y, Y - 143.0, -Z])]                                   # linea alba + sternum
absreg = np.maximum.reduce([X - 8.5, 104.0 - Y, Y - 127.0, 2.0 - Z])
cs = cn.copy()
for _ in range(2): cs = 0.5 * cs + 0.5 * (A1 @ cs) / cnt
rs.append(np.maximum(absreg, (0.22 - cs) * 6.0))                                                # grooves between the abs
Pxy = np.stack([X, Y, np.zeros_like(Y)], 1)
rs.append(np.maximum(B.seg_dist(Pxy, (14.5, 103.0, 0), (3.5, 85.5, 0)) - 0.9, -Z))               # inguinal V
ts = np.minimum(ts, np.minimum.reduce(rs))
inT = ts < 0
labv = np.where(inT, B.L["tendon"], labv)
edge = np.where(inT, np.clip(-ts / 2.0, 0, 1), np.minimum(edge, np.clip(ts / 2.0, 0, 1)))
inner = np.where(inT, 1.0, inner)

pos = np.round(V * 100).astype(np.int16)
nq = np.round(N * 127).astype(np.int8)
fq = np.stack([np.round(fu * 200), np.round(fv * 100)], 1).clip(-32767, 32767).astype(np.int16)
attr = np.stack([labv.astype(np.uint8), (edge * 255).astype(np.uint8), (inner * 255).astype(np.uint8), (ao * 255).astype(np.uint8)], 1)
idx = T.astype(np.uint32)
pad4 = lambda b: b + b"\0" * ((-len(b)) % 4)
blob = pad4(pos.tobytes()) + pad4(nq.tobytes()) + pad4(fq.tobytes()) + pad4(attr.tobytes()) + idx.tobytes()
open(sys.argv[1] if len(sys.argv) > 1 else "body_r.bin", "wb").write(blob)
json.dump({"nv": n, "nf": len(T), "idx32": True, "labels": B.LABELS, "uv": 200}, open((sys.argv[1] if len(sys.argv) > 1 else "body_r.bin").replace(".bin", ".json"), "w"))
pass
print("bytes", len(blob), np.bincount(labv, minlength=L))
