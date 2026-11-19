// Film 1 sets — Hiroshima street (intact + ruined), city panorama, train interior + steam train, Nagasaki office, memorial.
import * as T from 'three';
import { Builder, M, rng, GLSL_NOISE, canvasTex, type V3 } from '../core.ts';

const WOOD = '#3a281b', WOOD2 = '#5b3d27', SLAT = '#4a3020', PLASTER = '#e6dfcf', PLASTER2 = '#d9cfbb', TILE = '#454a52', TILE2 = '#3a3e45', DUST = '#8a7a66';
export function grimeMat(rough = .85, extra = '') {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: rough });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\n' + GLSL_NOISE)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float g = fbm(vWP.xz * .9 + vWP.y * .6) * .6 + n2(vec2(vWP.x + vWP.z, vWP.y) * 7.) * .4; diffuseColor.rgb *= .82 + .3 * g;
        diffuseColor.rgb *= 1. - .25 * smoothstep(.6, 0., vWP.y) * (1. - g); ${extra}`);
  };
  m.customProgramCacheKey = () => 'ywgrime' + extra.length; return m;
}

/** Two-storey Hiroshima machiya facing +z (street side), width w, depth d. */
function machiya(b: Builder, o: V3, w: number, d: number, R: () => number, ruined = 0) {
  const [ox, oy, oz] = o; const h1 = 2.7, h2 = 2.3 + R() * .5; const roofH = 1.3; const tilt = ruined ? (R() - .5) * .5 : 0; const drop = ruined ? 1.5 + R() * 2 : 0;
  const P = (x: number, y: number, z: number): V3 => [ox + x, oy + y, oz + z];
  // ground floor posts + lattice
  if (!ruined || R() < .6) {
    for (const x of [-w / 2 + .1, w / 2 - .1]) b.box(.2, h1, .2, P(x, h1 / 2, -.1), WOOD);
    for (let x = -w / 2 + .25; x < w / 2 - .2; x += .09) if (!(ruined && R() < .4)) b.box(.035, h1 - .4, .05, P(x, (h1 - .4) / 2 + .2, -.05), SLAT);
    b.box(w, .18, .25, P(0, h1 - .1, -.1), WOOD); b.box(w * .3, 1.2, .04, P(-w * .2, h1 - .75, .05), R() < .5 ? '#1f2a44' : '#5a2a22');   // noren curtain
  }
  b.box(w - .1, h1, d - .4, P(0, h1 / 2, -d / 2 - .1), PLASTER2);            // body
  // hisashi (small tiled roof over the street)
  if (!ruined) { b.box(w + .2, .1, 1.0, P(0, h1 + .25, .35), TILE, [.35, 0, 0]); for (let x = -w / 2; x < w / 2; x += .28) b.cyl(.06, .06, 1.0, P(x, h1 + .3, .33), TILE2, 6, [Math.PI / 2 + .35, 0, 0]); }
  // upper floor
  const y2 = h1 + .2 - drop * .6;
  if (ruined < 1 || R() < .5) {
    b.box(w - .3, h2, d - .9, P(0, y2 + h2 / 2, -d / 2 - .1), PLASTER, [tilt * .3, 0, tilt * .2]);
    for (let i = 0; i < Math.max(1, Math.floor(w / 2.2)); i++) { const x = -w / 2 + 1.2 + i * 2.2; b.box(1.1, .55, .06, P(x, y2 + h2 * .55, -.37), '#2a1d14'); for (let k = 0; k < 7; k++) b.box(.04, .55, .08, P(x - .48 + k * .16, y2 + h2 * .55, -.35), PLASTER); }
  }
  // gable roof, ridge parallel to the street, tiled
  const ry = y2 + h2 - drop * .4; const half = (d - .4) / 2 + .7;
  for (const s of [-1, 1]) {
    const ang = Math.atan2(roofH, half); const cz = -d / 2 - .1 + s * half / 2;
    b.box(w + 1.0, .14, Math.hypot(half, roofH) + .1, P(0, ry + roofH / 2, cz), TILE, [s * ang + tilt, 0, tilt * .4]);
    if (!ruined) for (let x = -w / 2 - .4; x < w / 2 + .5; x += .3) b.cyl(.07, .07, Math.hypot(half, roofH), P(x, ry + roofH / 2 + .07, cz), TILE2, 6, [Math.PI / 2 + s * ang, 0, 0]);
  }
  b.cyl(.14, .14, w + 1.1, P(0, ry + roofH + .05, -d / 2 - .1), '#2f3238', 8, [0, 0, Math.PI / 2]);
  if (ruined) for (let i = 0; i < 9; i++) b.box(.3 + R() * 1.4, .15 + R() * .3, .2 + R(), P((R() - .5) * w, .15, R() * 1.5 - .5), R() < .5 ? WOOD2 : TILE, [R(), R() * 3, R()]);
}
export function street(ruined: boolean) {
  const b = new Builder(); const R = rng(ruined ? 811 : 811);   // same seed: ruins match the intact houses
  for (const side of [-1, 1]) {
    let z = 18; while (z > -95) { const w = 4.2 + R() * 2.2, d = 8 + R() * 3;
      const g = new Builder(); machiya(g, [0, 0, 0], w, d, rng(Math.round(z * 7 + side * 31)), ruined ? 1 : 0);
      b.add(g.geo(), new T.Matrix4().makeRotationY(side > 0 ? -Math.PI / 2 : Math.PI / 2).setPosition(side * 5.6, 0, z - w / 2), "#fff"); z -= w + .15; }
  }
  // utility poles + tram rails + kerbs
  for (let z = 15; z > -95; z -= 14) for (const s of [-1, 1]) { b.cyl(.12, .15, 8.5, [s * 4.9, 4.25, z], '#4b3a2a', 8, ruined && s > 0 ? [0, 0, .5] : [0, 0, 0]); b.box(1.6, .1, .1, [s * 4.9, 7.6, z], '#4b3a2a'); }
  for (const x of [-.75, .75]) b.box(.08, .06, 120, [x, .03, -38], '#7a7570');
  for (const s of [-1, 1]) b.box(.3, .15, 120, [s * 5.4, .075, -38], '#8f8a80');
  const mesh = b.mesh(grimeMat()); mesh.name = ruined ? 'ruins' : 'street';
  // wires
  const lp: number[] = []; for (let z = 15; z > -81; z -= 14) for (const s of [-1, 1]) for (const dx of [-.6, .6]) { const x = s * 4.9 + dx; for (let k = 0; k < 8; k++) { const a = k / 8, c = (k + 1) / 8; lp.push(x, 7.6 - Math.sin(a * Math.PI) * .5, z - a * 14, x, 7.6 - Math.sin(c * Math.PI) * .5, z - c * 14); } }
  const wires = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(lp, 3)), new T.LineBasicMaterial({ color: '#222' }));
  const grp = new T.Group(); grp.add(mesh); if (!ruined) grp.add(wires);
  // road surface
  const road = new T.Mesh(new T.PlaneGeometry(11, 130), groundMat(ruined ? '#8d8070' : '#a49680', 1.3)); road.rotation.x = -Math.PI / 2; road.position.set(0, .005, -38); road.receiveShadow = true; grp.add(road);
  return grp;
}
export function groundMat(color: string, scale = 1) {
  const m = new T.MeshStandardMaterial({ color, roughness: .95 });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;\n' + GLSL_NOISE).replace('#include <map_fragment>', `#include <map_fragment>\n float g = fbm(vWP.xz * ${(.35 * scale).toFixed(3)}) * .7 + n2(vWP.xz * ${(6 * scale).toFixed(2)}) * .3; diffuseColor.rgb *= .78 + .38 * g;`); };
  m.customProgramCacheKey = () => 'ywground' + scale; return m;
}
export function tram() {
  const b = new Builder(); b.box(2.3, 2.6, 11, [0, 1.65, 0], '#5d7a54'); b.box(2.32, .9, 11.02, [0, .75, 0], '#2f3f2c'); b.box(2.34, .12, 11.04, [0, 2.2, 0], '#d9cfaa');
  for (let i = 0; i < 9; i++) b.box(2.36, .8, .9, [0, 2.0, -4.4 + i * 1.1], '#1d2a33');
  b.box(2.0, .3, 10.4, [0, 3.05, 0], '#3e4e3a'); b.cyl(.03, .03, 2.4, [0, 4.1, -2], '#222', 6, [-.6, 0, 0]);
  for (const z of [-3.5, 3.5]) for (const x of [-.75, .75]) b.cyl(.38, .38, .12, [x, .38, z], '#1b1b1b', 14, [0, 0, Math.PI / 2]);
  return b.mesh(grimeMat(.7));
}
/** Hiroshima panorama: river delta texture + instanced low houses + the domed Industrial Promotion Hall + mountains. */
export function city() {
  const grp = new T.Group();
  const tex = canvasTex(2048, 2048, g => {
    g.fillStyle = '#8d8a7c'; g.fillRect(0, 0, 2048, 2048); const R = rng(4);
    for (let i = 0; i < 9000; i++) { const x = R() * 2048, y = R() * 2048; g.fillStyle = ['#5c5f66', '#6a6d72', '#4d5056', '#7a756a', '#8a8070'][(R() * 5) | 0]; g.fillRect(x, y, 6 + R() * 12, 6 + R() * 10); }
    g.strokeStyle = '#3f6f86'; g.lineCap = 'round';
    for (const [w, pts] of [[90, [[300, 0], [420, 700], [380, 1300], [520, 2048]]], [70, [[900, 0], [860, 800], [980, 1400], [920, 2048]]], [80, [[1500, 0], [1420, 900], [1560, 1500], [1500, 2048]]], [60, [[420, 700], [700, 760], [860, 800]]]] as [number, number[][]][]) {
      g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
    g.fillStyle = '#5d7c4a'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R() * 2048, R() * 2048, 10 + R() * 30, 0, 7); g.fill(); }
  });
  const ground = new T.Mesh(new T.PlaneGeometry(3000, 3000), new T.MeshStandardMaterial({ map: tex, roughness: .95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  const R = rng(7); const g = new Builder(); g.box(1, 1, 1, [0, .5, 0], '#fff'); g.add(prism(1, .55, 1), M([0, 1, 0]), '#fff');
  const im = new T.InstancedMesh(g.geo(), new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), 5000); const m = new T.Matrix4(); let n = 0; const c = new T.Color();
  for (let i = 0; i < 20000 && n < 5000; i++) { const x = (R() - .5) * 1500, z = (R() - .5) * 1500; const u = (x / 3000 + .5) * 2048, v = (z / 3000 + .5) * 2048;
    if (Math.abs(u - (400 + v * .05)) < 70 || Math.abs(u - 900) < 70 || Math.abs(u - 1480) < 70) continue;   // keep rivers clear (approx)
    const s = 4 + R() * 6; m.compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.round(R() * 2) * Math.PI / 2 + (R() - .5) * .1), new T.Vector3(s, 3 + R() * 4, s * (1 + R()))); im.setMatrixAt(n, m); im.setColorAt(n++, c.set(['#4d5157', '#5a5e64', '#6b6155', '#4a4038'][(R() * 4) | 0])); }
  im.count = n; im.castShadow = true; im.receiveShadow = true; grp.add(im);
  // Industrial Promotion Hall (brick, copper dome) by the river
  const h = new Builder(); h.box(38, 12, 16, [0, 6, 0], '#b89c78'); h.box(14, 18, 14, [0, 9, 0], '#c4a983'); h.add(new T.SphereGeometry(7, 24, 12, 0, 6.29, 0, 1.57), M([0, 18, 0], [0, 0, 0], [1, 1.15, 1]), '#5f8f7a');
  const hall = h.mesh(grimeMat()); hall.position.set(-180, 0, 120); grp.add(hall);
  // mountains ring
  const mg = new Builder(); const RM = rng(9); for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 1300 + RM() * 300; mg.add(new T.ConeGeometry(220 + RM() * 200, 180 + RM() * 260, 7), M([Math.cos(a) * r, 80, Math.sin(a) * r]), RM() < .5 ? '#4f6a52' : '#5d7660'); }
  grp.add(mg.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
  return grp;
}
export function prism(w: number, h: number, d: number) { const s = new T.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0); return g; }

/** 1940s passenger carriage interior, looking along -z; windows on ±x. */
export function carriage() {
  const b = new Builder(); const L = 16, W = 2.8, H = 2.6;
  b.box(W, .1, L, [0, 0, 0], '#5a4632'); b.box(W, .1, L, [0, H, 0], '#c9bc9a');
  for (const s of [-1, 1]) { b.box(.1, .85, L, [s * W / 2, .45, 0], '#4a3423'); b.box(.1, .5, L, [s * W / 2, H - .25, 0], '#4a3423');
    for (let z = -L / 2 + .9; z < L / 2; z += 1.8) { b.box(.12, 1.3, .25, [s * W / 2, 1.5, z - .9], '#3d2a1c'); }
    for (let z = -L / 2 + 1.2; z < L / 2 - .5; z += 1.8) { b.box(.95, .45, .5, [s * .8, .45, z], '#6b4f35'); b.box(.95, .8, .12, [s * .8, .9, z + .3], '#6b4f35'); b.box(.95, .1, .4, [s * .8, .7, z], '#2d4a3a'); }
    b.box(.3, .05, L, [s * (W / 2 - .3), 2.15, 0], '#3d2a1c'); }
  for (let z = -L / 2; z < L / 2; z += 1.2) b.cyl(.015, .015, W, [0, 2.3, z], '#999', 6, [0, 0, Math.PI / 2]);
  return b.mesh(grimeMat(.75));
}
export function windowScroll() {   // countryside seen through the windows (scrolls)
  const tex = canvasTex(2048, 256, g => { const sky = g.createLinearGradient(0, 0, 0, 120); sky.addColorStop(0, '#e9d3a8'); sky.addColorStop(1, '#f2e3c4'); g.fillStyle = sky; g.fillRect(0, 0, 2048, 256);
    const R = rng(3); g.fillStyle = '#6d8a5f'; g.beginPath(); g.moveTo(0, 130); for (let x = 0; x <= 2048; x += 32) g.lineTo(x, 110 - Math.sin(x * .004) * 30 - R() * 10); g.lineTo(2048, 256); g.lineTo(0, 256); g.fill();
    g.fillStyle = '#87a35f'; g.fillRect(0, 165, 2048, 91); for (let x = 0; x < 2048; x += 40) { g.fillStyle = R() < .5 ? '#7f9c58' : '#93ad66'; g.fillRect(x, 165, 38, 91); }
    for (let i = 0; i < 40; i++) { g.fillStyle = '#4e6b43'; const x = R() * 2048; g.beginPath(); g.arc(x, 160, 10 + R() * 14, 0, 7); g.fill(); }
    for (let i = 0; i < 24; i++) { const x = R() * 2048; g.fillStyle = '#3a3a3a'; g.fillRect(x, 0, 3, 170); } });
  const m = new T.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }); return m;
}
export function locomotive() {
  const b = new Builder(); b.cyl(1.05, 1.05, 8, [0, 2.2, 0], '#191a1d', 20, [Math.PI / 2, 0, 0]); b.box(2.6, 2.4, 3, [0, 2.6, 4.8], '#1d1e21'); b.box(2.8, .15, 3.4, [0, 3.85, 4.8], '#121314');
  b.cyl(.35, .45, 1.2, [0, 3.7, -3], '#151517', 14); b.cyl(.45, .45, .6, [0, 3.4, -.5], '#1a1a1c', 14); b.box(2.9, .3, 11, [0, .9, .6], '#2a2a2c'); b.box(2.5, .2, .3, [0, .7, -4.6], '#7a1a14');
  for (const z of [-2.5, -.6, 1.3, 3.2]) for (const x of [-1.15, 1.15]) b.cyl(.78, .78, .14, [x, .8, z], '#28292b', 18, [0, 0, Math.PI / 2]);
  b.cyl(.25, .25, .1, [0, 2.2, -4.05], '#e9d48c', 14, [Math.PI / 2, 0, 0]);
  const loco = b.mesh(grimeMat(.45)); const car = new Builder(); car.box(2.8, 2.8, 15, [0, 2.0, 0], '#4a3a2c'); for (let z = -6.5; z < 7; z += 1.6) for (const x of [-1.41, 1.41]) car.box(.02, .9, 1.0, [x, 2.4, z], '#20262a');
  car.box(3, .2, 15.4, [0, 3.45, 0], '#2a2420'); for (const z of [-5, 5]) for (const x of [-1.1, 1.1]) car.cyl(.5, .5, .12, [x, .5, z], '#1d1d1d', 14, [0, 0, Math.PI / 2]);
  const carM = car.mesh(grimeMat(.7)); const grp = new T.Group(); grp.add(loco); for (let i = 0; i < 3; i++) { const c = carM.clone(); c.position.z = 14 + i * 15.6; grp.add(c); }
  return grp;
}
export function countryside() {
  const grp = new T.Group(); const ground = new T.Mesh(new T.PlaneGeometry(2000, 2000, 100, 100), groundMat('#7f9b57', .3));
  const p = ground.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = Math.abs(x); p.setZ(i, d < 30 ? 0 : Math.pow((d - 30) / 300, 1.6) * 120 * (.7 + .3 * Math.sin(y * .01))); }
  ground.geometry.computeVertexNormals(); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; grp.add(ground);
  const b = new Builder(); b.box(8, 1.2, 2000, [0, .6, 0], '#6d6253'); for (const x of [-.75, .75]) b.box(.08, .08, 2000, [x, 1.24, 0], '#555'); grp.add(b.mesh(grimeMat()));
  const R = rng(12); const tg = new Builder(); tg.cyl(.15, .2, 2, [0, 1, 0], '#4a3a2a', 6); tg.add(new T.IcosahedronGeometry(1.6, 1), M([0, 3, 0]), '#3e5e33');
  const im = new T.InstancedMesh(tg.geo(), new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: .9 }), 500); const m = new T.Matrix4();
  for (let i = 0; i < 500; i++) { const x = (R() < .5 ? -1 : 1) * (12 + R() * 120), z = (R() - .5) * 1600; const s = .8 + R() * 1.2; m.compose(new T.Vector3(x, 0, z), new T.Quaternion(), new T.Vector3(s, s, s)); im.setMatrixAt(i, m); }
  im.castShadow = true; grp.add(im); return grp;
}
/** Mitsubishi office in Nagasaki — drafting desks, big windows facing the hills (window wall at z = -4). */
export function office() {
  const b = new Builder(); const W = 10, D = 8, H = 3.3;
  b.box(W, .1, D, [0, 0, 0], '#6a523a'); b.box(W, .1, D, [0, H, 0], '#d8d0bd'); b.box(W, H, .2, [0, H / 2, D / 2], '#cfc6b0'); for (const s of [-1, 1]) b.box(.2, H, D, [s * W / 2, H / 2, 0], '#cfc6b0');
  b.box(W, .9, .25, [0, .45, -D / 2], '#bdb39b'); b.box(W, .5, .25, [0, H - .25, -D / 2], '#bdb39b'); for (let x = -W / 2; x <= W / 2; x += 1.25) b.box(.14, H, .3, [x, H / 2, -D / 2], '#5a4632');
  for (let x = -W / 2 + .62; x < W / 2; x += 1.25) b.box(.04, H - 1.4, .05, [x, H / 2 + .2, -D / 2], '#5a4632');
  for (const [x, z] of [[-2.8, -1.4], [0, -1.6], [2.8, -1.4], [-2.8, 1.4], [2.8, 1.6]]) { b.box(1.6, .06, .9, [x, .95, z], '#7a5a3a'); for (const dx of [-.7, .7]) for (const dz of [-.35, .35]) b.box(.06, .92, .06, [x + dx, .46, z + dz], '#4a3423'); b.box(1.2, .02, .8, [x, 1.0, z], '#ece6d2'); }
  b.box(1.4, .06, 1.0, [0, 1.25, 1.2], '#8a6a48', [-.35, 0, 0]); b.box(2.2, 1.9, .5, [-4.3, .95, 2.8], '#5a4632');
  for (let i = 0; i < 6; i++) b.box(.35, .25, .02, [-4.3 + (i % 3) * .5 - .5, 1.3 + Math.floor(i / 3) * .4, 2.54], '#e9e2cc');
  return b.mesh(grimeMat(.8));
}
export function glassPanes() { const m = new T.MeshStandardMaterial({ color: '#cfe2ea', roughness: .05, metalness: .1, transparent: true, opacity: .25 }); const g = new T.Group();
  for (let x = -5 + .62; x < 5; x += 1.25) { const p = new T.Mesh(new T.PlaneGeometry(1.1, 1.9), m); p.position.set(x, 1.85, -3.9); g.add(p); } return g; }
export function hills(color = '#5b7553') {   // Nagasaki valley hills seen from the office + harbour plane
  const grp = new T.Group(); const g = new T.PlaneGeometry(3000, 2000, 120, 80); const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const d = -y; p.setZ(i, Math.max(0, (Math.sin(x * .004) * .5 + .7) * 260 * Math.pow(Math.max(0, d - 200) / 900, 1.3) + Math.sin(x * .013 + y * .01) * 20 * Math.max(0, (d - 300) / 800))); }
  g.computeVertexNormals(); const m = new T.Mesh(g, groundMat(color, .2)); m.rotation.x = -Math.PI / 2; m.position.z = -200; m.receiveShadow = true; grp.add(m);
  const R = rng(21); const hb = new Builder(); hb.box(1, 1, 1, [0, .5, 0], '#fff'); hb.add(prism(1, .5, 1), M([0, 1, 0]), '#fff');
  const im = new T.InstancedMesh(hb.geo(), new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), 2500); const mm = new T.Matrix4(); const c = new T.Color(); let n = 0;
  for (let i = 0; i < 2500; i++) { const x = (R() - .5) * 1400, z = -180 - R() * 700; const s = 5 + R() * 6; mm.compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), R() * 3), new T.Vector3(s, 3 + R() * 3, s)); im.setMatrixAt(n, mm); im.setColorAt(n++, c.set(R() < .5 ? '#4b4f55' : '#6b6155')); }
  im.count = n; grp.add(im); return grp;
}
/** Lantern-lit river for the memorial ending. */
export function lanternRiver() {
  const grp = new T.Group(); const water = new T.Mesh(new T.PlaneGeometry(400, 60), new T.MeshStandardMaterial({ color: '#16233a', roughness: .3, metalness: 0, emissive: '#3a2e48', emissiveIntensity: .7 })); water.rotation.x = -Math.PI / 2; grp.add(water);
  const bank = new T.Mesh(new T.PlaneGeometry(400, 40), groundMat('#3f4a3c', .5)); bank.rotation.x = -Math.PI / 2; bank.position.set(0, .3, 40); bank.receiveShadow = true; grp.add(bank);
  const lb = new Builder(); lb.box(.32, .3, .32, [0, .2, 0], '#ffd9a0'); lb.box(.36, .05, .36, [0, .06, 0], '#5a3a22');
  const lm = new T.InstancedMesh(lb.geo(), new T.MeshStandardMaterial({ vertexColors: true, emissive: '#ff9a40', emissiveIntensity: 2.2 }), 120); grp.add(lm); grp.userData.lanterns = lm;
  return grp;
}
export { DUST };
