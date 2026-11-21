// YunoWorld v7 environment kit — reusable procedural textures, instanced props, light presets and the v7 frame type.
import * as T from 'three';
import { canvasTex, rng, type YFrame, type V3 } from '../yw3/core.ts';

export type V7Frame = YFrame & { set: string; t: number };
/** wood planks/beams: long grain, knots, edge wear */
export function woodTex(base = '#7a5634', seed = 1, w = 256, h = 1024) {
  return canvasTex(w, h, g => { const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const x = R() * w; g.strokeStyle = `rgba(${30 + R() * 40},${18 + R() * 25},${8 + R() * 12},${.18 + R() * .25})`; g.lineWidth = 1 + R() * 3; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * .01 + i) * 3 + (R() - .5) * 2, y); g.stroke(); }
    for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h; g.strokeStyle = 'rgba(40,22,10,.55)'; for (let k = 0; k < 4; k++) { g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 4 + k * 4, 10 + k * 8, 0, 0, 7); g.stroke(); } }
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(.15, 'rgba(0,0,0,0)'); gr.addColorStop(.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}
/** rock face with strata and coal seams */
export function rockTex(seed = 2, coal = .35) {
  return canvasTex(1024, 1024, g => { const R = rng(seed); g.fillStyle = '#4a4650'; g.fillRect(0, 0, 1024, 1024);
    for (let b = 0; b < 9; b++) { const y = b * 120 + R() * 40; const dark = R() < coal; g.fillStyle = dark ? 'rgba(18,16,22,.85)' : `rgba(${80 + R() * 40},${70 + R() * 35},${66 + R() * 30},.45)`; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * .01 + b) * 14 + R() * 8); for (let x = 1024; x >= 0; x -= 64) g.lineTo(x, y + 40 + R() * 30 + Math.sin(x * .013 + b) * 10); g.fill(); }
    for (let i = 0; i < 2600; i++) { const x = R() * 1024, y = R() * 1024, s = 2 + R() * 16; const v = 40 + R() * 70; g.fillStyle = `rgba(${v},${v * .95},${v * 1.05},${.25 + R() * .35})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * .3); g.lineTo(x + s * .4, y + s); g.fill(); }
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(210,220,255,.5)'; g.fillRect(R() * 1024, R() * 1024, 2, 2); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(10,8,12,.6)'; g.lineWidth = 2; const x = R() * 1024, y = R() * 1024; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) g.lineTo(x + (R() - .5) * 80, y + k * 20 + R() * 20); g.stroke(); } });
}
export function dirtTex(seed = 3, base = '#4a3e34') {
  return canvasTex(1024, 1024, g => { const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 3500; i++) { const x = R() * 1024, y = R() * 1024, s = 2 + R() * 9; g.fillStyle = R() > .6 ? `rgba(20,18,20,${.3 + R() * .4})` : `rgba(${110 + R() * 50},${90 + R() * 40},${70 + R() * 30},${.15 + R() * .25})`; g.beginPath(); g.ellipse(x, y, s, s * .6, R() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 8; i++) { const x = R() * 1024, y = R() * 1024; const gr = g.createRadialGradient(x, y, 0, x, y, 60 + R() * 60); gr.addColorStop(0, 'rgba(20,24,34,.6)'); gr.addColorStop(1, 'rgba(20,24,34,0)'); g.fillStyle = gr; g.fillRect(x - 130, y - 130, 260, 260); } });
}
export function brickTex(base = '#8a4a36', seed = 4, mortar = '#c8b8a0') {
  return canvasTex(512, 512, g => { const R = rng(seed); g.fillStyle = mortar; g.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) { const x = c * 64 + (r % 2) * 32, y = r * 32; const k = .82 + R() * .3; const col = new T.Color(base).multiplyScalar(k); g.fillStyle = `#${col.getHexString()}`; g.fillRect(x + 2, y + 2, 60, 28);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x + 2, y + 24, 60, 6); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${R() * .15})`; g.fillRect(R() * 512, R() * 512, 3, 3); } });
}
export function clapTex(base = '#d8ccb0', seed = 5, trim = '#5a6a7a') {
  return canvasTex(512, 512, g => { const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 24) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, y + 20, 512, 4); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y, 512, 3); }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(80,60,40,${R() * .08})`; g.fillRect(R() * 512, R() * 512, 30, 2); } void trim; });
}
export function metalTex(base = '#6a6e74', seed = 6) {
  return canvasTex(256, 256, g => { const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${R() > .5 ? '120,70,40' : '20,20,24'},${R() * .2})`; g.beginPath(); g.ellipse(R() * 256, R() * 256, 4 + R() * 16, 2 + R() * 8, R() * 3, 0, 7); g.fill(); }
    for (let x = 12; x < 256; x += 40) for (let y = 12; y < 256; y += 40) { g.fillStyle = 'rgba(30,30,34,.7)'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); g.fillStyle = 'rgba(200,200,210,.4)'; g.beginPath(); g.arc(x - 1, y - 1, 1.3, 0, 7); g.fill(); } });
}
/** instanced textured boxes (beams, planks, sleepers…) */
export function boxes(parent: T.Object3D, mat: T.Material, items: { p: V3; s: V3; r?: V3 }[]) {
  const im = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, items.length); const m = new T.Matrix4(), q = new T.Quaternion();
  items.forEach((it, i) => { q.setFromEuler(new T.Euler(...(it.r ?? [0, 0, 0]))); m.compose(new T.Vector3(...it.p), q, new T.Vector3(...it.s)); im.setMatrixAt(i, m); });
  im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
}
export function cyls(parent: T.Object3D, mat: T.Material, items: { p: V3; r: number; h: number; rot?: V3 }[], seg = 12, taper = 1) {
  const im = new T.InstancedMesh(new T.CylinderGeometry(taper, 1, 1, seg), mat, items.length); const m = new T.Matrix4(), q = new T.Quaternion();
  items.forEach((it, i) => { q.setFromEuler(new T.Euler(...(it.rot ?? [0, 0, 0]))); m.compose(new T.Vector3(...it.p), q, new T.Vector3(it.r, it.h, it.r)); im.setMatrixAt(i, m); });
  im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
}
/** bright emissive material (glows through the bloom pass) */
export const glowMat = (c: string) => new T.MeshBasicMaterial({ color: c, toneMapped: false });
/** displace a geometry's vertices along normals with cheap value noise (organic rock) */
export function rockify(g: T.BufferGeometry, amp: number, freq: number, seed = 1) {
  const p = g.attributes.position, nrm = g.attributes.normal; const h = (x: number, y: number, z: number) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453; return s - Math.floor(s); };
  const vn = (x: number, y: number, z: number) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi; const s = (t: number) => t * t * (3 - 2 * t);
    let v = 0; for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) v += h(xi + a, yi + b, zi + c) * (a ? s(xf) : 1 - s(xf)) * (b ? s(yf) : 1 - s(yf)) * (c ? s(zf) : 1 - s(zf)); return v; };
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const d = (vn(x * freq, y * freq, z * freq) - .5) * amp + (vn(x * freq * 3.1, y * freq * 3.1, z * freq * 3.1) - .5) * amp * .35;
    p.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d); }
  g.computeVertexNormals(); return g;
}
