import fs from "fs";
import draco3d from "draco3d";
const d = fs.readFileSync(process.argv[2]);
const L = d.readUInt32LE(12); const j = JSON.parse(d.subarray(20, 20 + L).toString());
const binStart = 20 + L + 8;
const bv = j.bufferViews[0];
const buf = d.subarray(binStart + (bv.byteOffset || 0), binStart + (bv.byteOffset || 0) + bv.byteLength);
const M = await draco3d.createDecoderModule({});
const dec = new M.Decoder(); const db = new M.DecoderBuffer(); db.Init(new Int8Array(buf.buffer, buf.byteOffset, buf.byteLength), buf.byteLength);
const mesh = new M.Mesh(); const st = dec.DecodeBufferToMesh(db, mesh); if (!st.ok()) throw new Error(st.error_msg());
const nf = mesh.num_faces(), nv = mesh.num_points();
const ia = new M.DracoInt32Array(); const idx = new Uint32Array(nf * 3);
for (let i = 0; i < nf; i++) { dec.GetFaceFromMesh(mesh, i, ia); idx[i*3]=ia.GetValue(0); idx[i*3+1]=ia.GetValue(1); idx[i*3+2]=ia.GetValue(2); }
const ext = j.meshes[0].primitives[0].extensions.KHR_draco_mesh_compression.attributes;
function get(id, n) { const a = dec.GetAttributeByUniqueId(mesh, id); const arr = new M.DracoFloat32Array(); dec.GetAttributeFloatForAllPoints(mesh, a, arr); const o = new Float32Array(nv * n); for (let i = 0; i < nv * n; i++) o[i] = arr.GetValue(i); return o; }
fs.writeFileSync("pos.f32", Buffer.from(get(ext.POSITION, 3).buffer));
fs.writeFileSync("idx.u32", Buffer.from(idx.buffer));
console.log(nv, nf);
