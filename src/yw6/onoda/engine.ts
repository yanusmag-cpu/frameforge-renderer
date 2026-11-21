// YunoWorld v6 · "The Soldier Who Fought On for 29 Years" (Hiroo Onoda, Lubang 1944–1974) — environment engine.
// Sets: jungle (dense layered rainforest clearing with Onoda's bamboo lean-to camp, fire pit, laundry line, tally tree,
// Suzuki's 1974 tent), hill (ridge over the sea: island coastline, clouds, a period aircraft, falling leaflets),
// shop (1974 Japanese bookshop interior). Foliage is instanced alpha cards with wind sway; every texture is drawn here.
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, lerp, type YFrame, type V3, type Sprite, type Light } from '../../yw3/core.ts';

export const SET = { jungle: [0, 0, 0], hill: [600, 0, 0], shop: [-600, 0, 0] } as const;
export type SetName = keyof typeof SET;
/** terrain height of the hill set (local coords) */
export const hillY = (x: number, z: number) => { const y = -z; return Math.exp(-((y + 10) ** 2) / 900) * 14 + Math.sin(x * .05) * 3 - Math.max(0, -y - 40) * .6; };
export type OFrame = YFrame & {
  set: SetName; sky?: { top: string; hor: string; sun: V3; night?: number };
  fire?: number; night?: number; shafts?: number; tally?: number; tent?: number; flag?: number;
  plane?: { pos: V3; yaw: number; bank?: number }; leaflets?: { t: number; center: V3; spread: number; n?: number };
  props?: { rifleRack?: boolean; leaflet?: number; patchCloth?: boolean; flash?: number };
};
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
/** three intersecting vertical cards (0°, 60°, 120°), base at y = 0, uv v = height (for wind) */
function crossGeo() { const P: number[] = [], U: number[] = [], N: number[] = [];
  for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, c = Math.cos(a) * .5, s = Math.sin(a) * .5; const v = [[-c, 0, -s, 0, 0], [c, 0, s, 1, 0], [c, 1, s, 1, 1], [-c, 0, -s, 0, 0], [c, 1, s, 1, 1], [-c, 1, -s, 0, 1]];
    for (const [x, y, z, u, w] of v) { P.push(x, y, z); U.push(u, w); N.push(-Math.sin(a), .25, Math.cos(a)); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); return g; }
// ------------------------------------------------------------------ textures
const leafCluster = (hue: number) => canvasTex(512, 512, g => {
  const R = rng(11 + hue * 100);
  for (let i = 0; i < 70; i++) {
    const x = 60 + R() * 392, y = 60 + R() * 392, a = R() * 6.28, L = 50 + R() * 60, w = L * (.32 + R() * .12);
    const l = 22 + R() * 26 + hue * 6, c = `hsl(${95 + hue * 18 + R() * 30},${45 + R() * 25}%,${l}%)`;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -w, L, 0); g.quadraticCurveTo(L * .5, w, 0, 0); g.fill();
    g.strokeStyle = `hsla(${90 + hue * 18},40%,${l + 14}%,.7)`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(2, 0); g.lineTo(L * .92, 0); g.stroke();
    g.fillStyle = 'rgba(255,255,200,.10)'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * .5, -w, L, 0); g.closePath(); g.fill(); g.restore();
  }
}, true);
const fronds = (kind: 'palm' | 'banana' | 'fern' | 'grass') => canvasTex(512, 512, g => {
  const R = rng(kind.length * 31);
  if (kind === 'palm') { g.strokeStyle = '#6a5a2a'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 500); g.quadraticCurveTo(250, 250, 256, 10); g.stroke();
    for (let i = 0; i < 46; i++) { const y = 480 - i * 10, L = 150 * Math.sin((i / 46) * Math.PI) + 30; for (const s of [-1, 1]) { g.strokeStyle = `hsl(${88 + R() * 20},${48 + R() * 15}%,${26 + R() * 14}%)`; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(256, y); g.quadraticCurveTo(256 + s * L * .5, y - 30, 256 + s * L, y + 20 + R() * 20); g.stroke(); } } }
  if (kind === 'banana') { g.fillStyle = '#3f8a3a'; g.beginPath(); g.moveTo(256, 505); g.bezierCurveTo(60, 380, 70, 80, 256, 8); g.bezierCurveTo(440, 80, 452, 380, 256, 505); g.fill();
    g.fillStyle = '#58a84a'; g.beginPath(); g.moveTo(256, 505); g.bezierCurveTo(150, 380, 160, 80, 256, 8); g.closePath(); g.fill();
    g.strokeStyle = '#c8d870'; g.lineWidth = 7; g.beginPath(); g.moveTo(256, 505); g.lineTo(256, 10); g.stroke(); g.strokeStyle = 'rgba(20,60,20,.5)'; g.lineWidth = 2;
    for (let y = 40; y < 490; y += 12) { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256, y); g.lineTo(256 + s * 170, y - 40); g.stroke(); } }
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9; i++) { const y = 60 + R() * 400, s = R() > .5 ? 1 : -1; g.beginPath(); g.moveTo(256 + s * 200, y); g.lineTo(256 + s * 40, y - 6); g.lineTo(256 + s * 200, y + 10); g.fill(); } }
  if (kind === 'fern') { for (let f = 0; f < 3; f++) { const cx = 256 + (f - 1) * 40; g.strokeStyle = '#3a5a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, 510); g.quadraticCurveTo(cx + (f - 1) * 60, 250, cx + (f - 1) * 120, 30); g.stroke();
    for (let i = 0; i < 30; i++) { const k = i / 30, x = cx + (f - 1) * 120 * k * k, y = 510 - 480 * k, L = 70 * Math.sin(k * Math.PI) + 10; for (const s of [-1, 1]) { g.fillStyle = `hsl(${100 + R() * 25},50%,${24 + R() * 16}%)`; g.beginPath(); g.ellipse(x + s * L * .5, y, L * .5, 7, s * .4, 0, 7); g.fill(); } } } }
  if (kind === 'grass') for (let i = 0; i < 120; i++) { const x = 20 + R() * 472, h = 200 + R() * 300; g.strokeStyle = `hsl(${78 + R() * 30},${40 + R() * 25}%,${26 + R() * 22}%)`; g.lineWidth = 4 + R() * 4; g.beginPath(); g.moveTo(x, 512); g.quadraticCurveTo(x + (R() - .5) * 60, 512 - h * .6, x + (R() - .5) * 120, 512 - h); g.stroke(); }
}, true);
const bark = canvasTex(256, 512, g => { const R = rng(3); g.fillStyle = '#6a5a48'; g.fillRect(0, 0, 256, 512); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${40 + R() * 60},${34 + R() * 40},${26 + R() * 30},.55)`; g.lineWidth = 2 + R() * 5; const x = R() * 256; g.beginPath(); g.moveTo(x, R() * 512); g.lineTo(x + (R() - .5) * 12, R() * 512); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${90 + R() * 40},${120 + R() * 40},${70},.35)`; g.beginPath(); g.ellipse(R() * 256, R() * 512, 6 + R() * 18, 4 + R() * 10, 0, 0, 7); g.fill(); } });
const soil = canvasTex(1024, 1024, g => { const R = rng(5); g.fillStyle = '#5a4630'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const x = R() * 1024, y = R() * 1024, s = 3 + R() * 14; g.fillStyle = R() > .55 ? `hsl(${25 + R() * 20},${35 + R() * 25}%,${18 + R() * 22}%)` : `hsl(${70 + R() * 40},${30 + R() * 25}%,${18 + R() * 16}%)`; g.save(); g.translate(x, y); g.rotate(R() * 6); g.beginPath(); g.ellipse(0, 0, s, s * .45, 0, 0, 7); g.fill(); g.restore(); }
  for (let i = 0; i < 200; i++) { g.strokeStyle = 'rgba(40,28,16,.5)'; g.lineWidth = 2; const x = R() * 1024, y = R() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 40, y + (R() - .5) * 40); g.stroke(); } });
const thatch = canvasTex(512, 256, g => { const R = rng(9); g.clearRect(0, 0, 512, 256); for (let r = 0; r < 6; r++) for (let i = 0; i < 90; i++) { const x = R() * 512, y = r * 40; g.strokeStyle = `hsl(${40 + R() * 15},${35 + R() * 20}%,${30 + R() * 22}%)`; g.lineWidth = 5 + R() * 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 14, y + 70 + R() * 30); g.stroke(); } });
const cloth = (patched: boolean) => canvasTex(256, 256, g => { g.fillStyle = '#74704a'; g.beginPath(); g.moveTo(40, 10); g.lineTo(216, 10); g.lineTo(246, 70); g.lineTo(206, 90); g.lineTo(200, 246); g.lineTo(56, 246); g.lineTo(50, 90); g.lineTo(10, 70); g.closePath(); g.fill(); g.strokeStyle = '#2a2414'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = '#4a4a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 14); g.lineTo(128, 240); g.stroke(); if (patched) { g.fillStyle = '#a89a6a'; g.fillRect(70, 120, 46, 40); g.fillStyle = '#5a6a4a'; g.fillRect(146, 170, 40, 36); g.setLineDash([5, 4]); g.strokeStyle = '#2a2414'; g.strokeRect(70, 120, 46, 40); g.strokeRect(146, 170, 40, 36); } }, true);
export const leafletTex = canvasTex(256, 360, g => { g.fillStyle = '#f2ead2'; g.fillRect(0, 0, 256, 360); g.fillStyle = '#c8322c'; g.beginPath(); g.arc(128, 70, 34, 0, 7); g.fill();
  g.fillStyle = '#2a2018'; for (let r = 0; r < 9; r++) for (let c = 0; c < 7; c++) { if ((r * 7 + c) % 5 === 3) continue; g.fillRect(28 + c * 30 + (r % 2) * 4, 130 + r * 24, 18 + ((r + c) % 3) * 3, 14); } g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.strokeRect(6, 6, 244, 348); }, true);
const books = canvasTex(1024, 512, g => { const R = rng(4); g.fillStyle = '#3a2a1c'; g.fillRect(0, 0, 1024, 512); for (let sh = 0; sh < 4; sh++) { let x = 6; const y0 = sh * 128;
  while (x < 1018) { const w = 12 + R() * 22, h = 70 + R() * 44; g.fillStyle = `hsl(${[0, 20, 35, 120, 200, 215, 30, 350][Math.floor(R() * 8)] + R() * 15},${25 + R() * 30}%,${22 + R() * 30}%)`; g.fillRect(x, y0 + 122 - h, w, h); g.fillStyle = 'rgba(255,240,200,.55)'; g.fillRect(x + 2, y0 + 122 - h + 10, w - 4, 3); g.fillRect(x + 2, y0 + 122 - 18, w - 4, 2); x += w + 1 + (R() > .9 ? 10 : 0); }
  g.fillStyle = '#5a3a22'; g.fillRect(0, y0 + 122, 1024, 6); } });
function sway(mat: T.MeshStandardMaterial, U: { value: number }, amp: number) {
  mat.onBeforeCompile = sh => { sh.uniforms.uT = U; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
    vec3 ip = instanceMatrix[3].xyz;
    #else
    vec3 ip = vec3(0.);
    #endif
    float wv = sin(uT * 1.3 + ip.x * .37 + ip.z * .29) + .5 * sin(uT * 2.7 + ip.z * .8);
    transformed.x += wv * ${amp.toFixed(3)} * uv.y; transformed.z += cos(uT * 1.1 + ip.x) * ${(amp * .6).toFixed(3)} * uv.y;`); };
}
// ------------------------------------------------------------------ engine
export class OnodaEngine extends Core {
  groups: Record<SetName, T.Group>; skyU: Record<string, T.IUniform>; sky: T.Mesh; U = { value: 0 };
  firePos: V3 = W('jungle', [1.2, 0, 1.6]); tallyMarks!: T.Mesh; tent!: T.Group; flag!: T.Mesh; plane: T.Group; prop: T.Mesh; shafts: T.Mesh[] = []; leafletMesh: T.InstancedMesh;
  sea!: T.Mesh; seaU = { value: 0 }; lamp: V3 = W('shop', [0, 3.1, 0]);
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#a8c8e8', '#3a4a2a'); this.scene.environment = this.env; this.sun.shadow.mapSize.set(2048, 2048);
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(...SET[n] as unknown as V3); this.scene.add(g); return g; };
    this.groups = { jungle: mk('jungle'), hill: mk('hill'), shop: mk('shop') };
    this.skyU = { top: { value: new T.Color('#4a7ac8') }, hor: { value: new T.Color('#f8d8a8') }, sun: { value: new T.Vector3(.3, .5, -.8).normalize() }, night: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(1500, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; uniform float night; varying vec3 vD; ${GLSL_NOISE} void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.05, .55, d.y), .55)); float s = max(dot(d, sun), 0.);
        c += vec3(1., .8, .55) * (pow(s, 400.) * 10. + pow(s, 6.) * .4) * (1. - night) + vec3(.9, .95, 1.) * pow(s, 900.) * 6. * night;
        float cl = smoothstep(.45, .78, fbm(d.xz / max(d.y, .06) * 1.4 + 3.)) * smoothstep(.0, .25, d.y); c = mix(c, mix(vec3(1., .95, .9), hor, .3) * (1. - night * .8), cl * .7);
        float st = step(.9985, h12(floor(d.xz / max(d.y, .1) * 220.))) * night * smoothstep(.1, .4, d.y); c += st; gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    this.buildJungle(); this.buildHill(); this.buildShop();
    // plane (period high-wing monoplane, procedural)
    this.plane = new T.Group(); { const b = new Builder(); b.add(new T.CylinderGeometry(.55, .3, 7, 14), M([0, 0, 0], [Math.PI / 2, 0, 0]), '#c8c0a8'); b.box(12, .16, 1.6, [0, .65, .6], '#b8b098'); b.box(4, .1, 1, [0, .25, -3.1], '#b8b098'); b.box(.1, 1.3, 1.1, [0, .8, -3.2], '#b8b098');
      b.add(new T.SphereGeometry(.6, 12, 8), M([0, .25, 1.2], [0, 0, 0], [.9, .7, 1.4]), '#5a7a9a'); b.cyl(.12, .12, 1.2, [-1.2, -.7, .8], '#3a3a3a'); b.cyl(.12, .12, 1.2, [1.2, -.7, .8], '#3a3a3a'); b.cyl(.3, .3, .2, [-1.2, -1.3, .8], '#222', 12, [0, 0, Math.PI / 2]); b.cyl(.3, .3, .2, [1.2, -1.3, .8], '#222', 12, [0, 0, Math.PI / 2]);
      this.plane.add(b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .3 }))); this.prop = new T.Mesh(new T.BoxGeometry(3, .2, .05), new T.MeshStandardMaterial({ color: '#333' })); this.prop.position.z = 3.6; this.plane.add(this.prop); }
    this.scene.add(this.plane);
    this.leafletMesh = new T.InstancedMesh(new T.PlaneGeometry(.21, .3), new T.MeshStandardMaterial({ map: leafletTex, side: T.DoubleSide, roughness: .9 }), 160); this.leafletMesh.castShadow = true; this.leafletMesh.frustumCulled = false; this.scene.add(this.leafletMesh);
  }
  private foliage(parent: T.Object3D, tex: T.Texture, geo: T.BufferGeometry, mats: T.Matrix4[], amp: number, tint = '#ffffff', rough = .75, shadow = true) {
    const m = new T.MeshStandardMaterial({ map: tex, alphaTest: .45, side: T.DoubleSide, roughness: rough, color: tint }); sway(m, this.U, amp);
    const im = new T.InstancedMesh(geo, m, mats.length); mats.forEach((x, i) => im.setMatrixAt(i, x)); im.castShadow = shadow; im.receiveShadow = true; parent.add(im); return im;
  }
  private buildJungle() {
    const G = this.groups.jungle; const R = rng(42);
    const g = new T.PlaneGeometry(140, 140, 140, 140); const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), d = Math.hypot(x, y); const h = d < 16 ? 0 : (Math.sin(x * .13) * Math.cos(y * .11) * 1.4 + Math.sin(x * .41 + y * .3) * .4 + .6) * clamp((d - 16) / 14); pp.setZ(i, h); }
    g.computeVertexNormals(); soil.repeat.set(18, 18); const ground = new T.Mesh(g, new T.MeshStandardMaterial({ map: soil, roughness: .95, color: '#c8b8a0' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
    // trees: trunks with buttress roots and canopy clusters
    const trunks = new Builder(); const canopy: T.Matrix4[] = [], canopy2: T.Matrix4[] = []; const vines: T.Matrix4[] = [];
    const trees: V3[] = []; for (let i = 0; i < 60; i++) { const a = R() * 6.28, d = 9 + R() * 34, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) < 12 && z > -1 && z < 24) continue; trees.push([x, 0, z]); }
    trees.push([-6.5, 0, -6], [6.8, 0, -7.5], [-10.5, 0, -1.5]);
    const trunkMat = new T.MeshStandardMaterial({ map: bark, roughness: .9, color: '#d8c8b0' }); bark.repeat.set(2, 3);
    for (const [x, , z] of trees) { const h = 16 + R() * 14, r = .45 + R() * .5;
      const tr = new T.Mesh(new T.CylinderGeometry(r * .7, r * 1.2, h, 10), trunkMat); tr.position.set(x, h / 2, z); tr.rotation.z = (R() - .5) * .08; tr.castShadow = tr.receiveShadow = true; G.add(tr);
      for (let k = 0; k < 4; k++) { const a = k * 1.57 + R(); trunks.add(new T.BoxGeometry(.18, 1.6, 1.4), M([x + Math.cos(a) * r * 1.2, .7, z + Math.sin(a) * r * 1.2], [0, -a, 0], [1, 1, 1]), '#6a5a46'); }
      for (let k = 0; k < 6; k++) { const s = 4.5 + R() * 4; canopy.push(M([x + (R() - .5) * 7, h - 1 + R() * 4, z + (R() - .5) * 7], [R() * .6, R() * 6.28, R() * .6], [s, s, s])); }
      for (let k = 0; k < 7; k++) { const s = 2.2 + R() * 2.4; canopy2.push(M([x + (R() - .5) * 4, 2.5 + R() * h * .5, z + (R() - .5) * 4], [R() * .4, R() * 6.28, 0], [s, s, s])); }
      if (R() > .45) for (let k = 0; k < 3; k++) vines.push(M([x + (R() - .5) * 2, h * .55, z + (R() - .5) * 2], [0, R() * 6.28, 0], [.6, 8 + R() * 6, 1])); }
    G.add(trunks.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 })));
    const cross = crossGeo();
    this.foliage(G, leafCluster(0), cross, canopy, .12, '#d8f0c0', .75, false); this.foliage(G, leafCluster(1), cross, canopy2, .1, '#c8e8b0');
    // palms around the clearing
    const palmT = new Builder(); const palmF: T.Matrix4[] = [];
    for (let i = 0; i < 24; i++) { const a = R() * 6.28, d = 8 + R() * 22; const x = Math.cos(a) * d, z = Math.sin(a) * d, h = 7 + R() * 6, lean = (R() - .5) * .5; if (Math.abs(x) < 12 && z > -1 && z < 24) continue;
      for (let s = 0; s < 8; s++) { const k0 = s / 8; palmT.cyl(.2, .24, h / 8 + .05, [x + Math.sin(lean) * h * k0 * k0, h * (k0 + .06), z], s % 2 ? '#8a7656' : '#7a684a', 8, [0, 0, -lean * k0 * 2]); }
      const tx = x + Math.sin(lean) * h, ty = h; for (let f = 0; f < 9; f++) { const fa = f / 9 * 6.28 + R(); palmF.push(M([tx, ty, z], [0, fa, 0], [1, 1, 1]).multiply(M([0, 0, 0], [-.9 - R() * .6, 0, 0], [2.4, 4.2, 1]))); } }
    G.add(palmT.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .85 })));
    const frondGeo = new T.PlaneGeometry(1, 1); frondGeo.translate(0, .5, 0); this.foliage(G, fronds('palm'), frondGeo, palmF, .15);
    // understory: bananas, ferns, grass tufts (dense, framing the camp)
    const ban: T.Matrix4[] = [], fern: T.Matrix4[] = [], grass: T.Matrix4[] = [];
    const keep = (x: number, z: number, big: boolean) => Math.hypot(x + 1, z + 1) < (big ? 7.5 : 4.2) || (big && Math.abs(x) < 9 && z > 0 && z < 20);
    for (let i = 0; i < 110; i++) { const a = R() * 6.28, d = 6 + R() * 18; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (keep(x, z, true)) continue; for (let k = 0; k < 6; k++) ban.push(M([x, .2, z], [0, k * 1.05 + R(), 0], [1, 1, 1]).multiply(M([0, 0, 0], [-.35 - R() * .5, 0, 0], [1.3 + R() * .5, 2.6 + R() * 1.2, 1]))); }
    for (let i = 0; i < 300; i++) { const a = R() * 6.28, d = 4.5 + R() * 30; if (keep(Math.cos(a) * d, Math.sin(a) * d, d < 9)) continue; fern.push(M([Math.cos(a) * d, 0, Math.sin(a) * d], [0, R() * 6.28, 0], [1.4 + R(), 1.1 + R() * .8, 1.4 + R()])); }
    for (let i = 0; i < 650; i++) { const a = R() * 6.28, d = 3 + R() * 34; if (keep(Math.cos(a) * d, Math.sin(a) * d, false)) continue; grass.push(M([Math.cos(a) * d, 0, Math.sin(a) * d], [0, R() * 6.28, 0], [.8 + R() * .6, .5 + R() * .5, .8 + R() * .6])); }
    this.foliage(G, fronds('banana'), frondGeo, ban, .1); this.foliage(G, fronds('fern'), cross, fern, .06, '#ffffff', .75, false); this.foliage(G, fronds('grass'), cross, grass, .05, '#e0e8c0', .75, false);
    // hanging vines
    const vineM = new T.MeshStandardMaterial({ color: '#3a5a2a', roughness: .9 }); const vi = new T.InstancedMesh(new T.CylinderGeometry(.03, .04, 1, 5), vineM, vines.length); vines.forEach((m, i) => vi.setMatrixAt(i, m.multiply(M([0, -.5, 0])))); G.add(vi);
    // rocks
    const rk = new Builder(); for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = 4 + R() * 20, s = .3 + R() * 1.1; if (keep(Math.cos(a) * d, Math.sin(a) * d, s > .6)) continue; rk.add(new T.DodecahedronGeometry(s, 0), M([Math.cos(a) * d, s * .3, Math.sin(a) * d], [R(), R(), R()], [1, .6, 1.1]), R() > .5 ? '#7a766a' : '#5a6a52'); }
    G.add(rk.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true })));
    // ---- Onoda's camp: bamboo lean-to, sleeping platform, thatch, fire pit, laundry line, ammo box, gourd, tally tree
    const b = new Builder(); const bam = (x0: V3, x1: V3, r = .07, c = '#a89050') => { const d = new T.Vector3(x1[0] - x0[0], x1[1] - x0[1], x1[2] - x0[2]); const L = d.length(); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      const m = new T.Matrix4().compose(new T.Vector3((x0[0] + x1[0]) / 2, (x0[1] + x1[1]) / 2, (x0[2] + x1[2]) / 2), q, new T.Vector3(1, 1, 1)); b.add(new T.CylinderGeometry(r, r, L, 8), m, c); for (let k = 1; k < L / .5; k++) { const t = k * .5 / L; b.add(new T.TorusGeometry(r, .012, 4, 8), new T.Matrix4().compose(new T.Vector3(lerp(x0[0], x1[0], t), lerp(x0[1], x1[1], t), lerp(x0[2], x1[2], t)), q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0))), new T.Vector3(1, 1, 1)), '#7a6a38'); } };
    const hx = -3.2, hz = -3.4;
    for (const [x, z, h] of [[hx - 1.8, hz - 1.2, 2.6], [hx + 1.8, hz - 1.2, 2.6], [hx - 1.8, hz + 1.4, 1.6], [hx + 1.8, hz + 1.4, 1.6]] as const) bam([x, 0, z], [x, h, z], .08);
    bam([hx - 1.9, 2.55, hz - 1.2], [hx + 1.9, 2.55, hz - 1.2]); bam([hx - 1.9, 1.55, hz + 1.4], [hx + 1.9, 1.55, hz + 1.4]);
    for (let i = 0; i < 5; i++) { const x = hx - 1.7 + i * .85; bam([x, 2.6, hz - 1.3], [x, 1.5, hz + 1.5], .05, '#9a8448'); }
    for (let i = 0; i < 14; i++) bam([hx - 1.7, .55, hz - 1 + i * .17], [hx + 1.7, .55, hz - 1 + i * .17], .045, i % 2 ? '#b8a060' : '#a89050');
    for (const x of [hx - 1.7, hx + 1.7]) bam([x, .55, hz - 1.1], [x, .55, hz + 1.3], .06);
    for (const [x, z] of [[hx - 1.6, hz - 1], [hx + 1.6, hz - 1], [hx - 1.6, hz + 1.2], [hx + 1.6, hz + 1.2]]) bam([x, 0, z], [x, .55, z], .06);
    // fire pit stones + logs, cooking pot on a tripod
    const [fx, , fz] = [1.2, 0, 1.6]; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.28; b.add(new T.DodecahedronGeometry(.16, 0), M([fx + Math.cos(a) * .55, .08, fz + Math.sin(a) * .55], [i, i * 2, 0], [1, .7, 1]), i % 2 ? '#6a6660' : '#7a7468'); }
    for (let i = 0; i < 4; i++) b.cyl(.07, .07, .9, [fx, .1, fz], '#4a3020', 7, [Math.PI / 2, i * .8, 0]);
    for (let i = 0; i < 3; i++) { const a = i * 2.09; bam([fx + Math.cos(a) * .7, 0, fz + Math.sin(a) * .7], [fx, 1.3, fz], .035, '#8a7040'); }
    b.add(new T.SphereGeometry(.24, 12, 8, 0, 6.28, Math.PI * .35, Math.PI * .65), M([fx, .8, fz]), '#2a2a2a');
    b.cyl(.2, .22, 1.8, [-.3, .21, 1.0], '#6a4a2c', 10, [0, .3, Math.PI / 2]);   // log seat by the fire
    // ammo box, gourd, coconut shells, sandals, sewing kit, rifle rack
    b.box(.7, .4, .45, [hx + 2.6, .2, hz + .6], '#5a4a2a'); b.box(.72, .06, .47, [hx + 2.6, .42, hz + .6], '#4a3a20');
    b.add(new T.SphereGeometry(.18, 10, 8), M([hx + 2.4, .62, hz + .6], [0, 0, 0], [1, 1.3, 1]), '#b89a5a');
    for (let i = 0; i < 4; i++) b.add(new T.SphereGeometry(.13, 8, 6, 0, 6.28, 0, Math.PI / 2), M([fx + 1.2 + i * .3, .0, fz - .5 + (i % 2) * .3], [Math.PI, 0, 0]), '#6a4a2a');
    bam([hx + 1.9, 0, hz + 1.9], [hx + 1.9, 1.6, hz + 1.9], .05); bam([hx - 1.9, 0, hz + 2.6], [hx - 1.9, 1.6, hz + 2.6], .05); bam([hx - 1.9, 1.55, hz + 2.6], [hx + 1.9, 1.55, hz + 1.9], .015, '#d8c8a0');
    // Suzuki's 1974 tent (shown via frame.tent)
    G.add(b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .75 })));
    const th = new T.MeshStandardMaterial({ map: thatch, alphaTest: .4, side: T.DoubleSide, roughness: .9 }); thatch.repeat.set(2, 1.5);
    for (let k = 0; k < 3; k++) { const roof = new T.Mesh(new T.PlaneGeometry(4.4, 3.4), th); roof.position.set(hx, 2.15 + k * .04, hz + .1 - k * .03); roof.rotation.set(-Math.PI / 2 + .38, 0, 0); roof.castShadow = roof.receiveShadow = true; G.add(roof); }
    for (const [i, x] of [[0, hx - .7], [1, hx + .6]] as const) { const c = new T.Mesh(new T.PlaneGeometry(.9, .9), new T.MeshStandardMaterial({ map: cloth(i === 1), alphaTest: .4, side: T.DoubleSide, roughness: .95 })); c.position.set(x, 1.12, hz + 2.3 - i * .35); c.rotation.y = -.17; c.castShadow = true; c.name = 'cloth'; G.add(c); }
    // tally tree (marks scratched year after year)
    const tt = new T.Mesh(new T.CylinderGeometry(.55, .7, 12, 14), trunkMat); tt.position.set(3.6, 6, -3.2); tt.castShadow = tt.receiveShadow = true; G.add(tt);
    this.tallyMarks = new T.Mesh(new T.PlaneGeometry(1, 1.4), new T.MeshStandardMaterial({ map: canvasTex(256, 360, () => {}), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); this.tallyMarks.position.set(3.6, 1.6, -2.62); G.add(this.tallyMarks);
    // tent + flag
    this.tent = new T.Group(); { const tb = new Builder(); tb.add(new T.ConeGeometry(1.5, 1.7, 4, 1, true), M([0, .85, 0], [0, Math.PI / 4, 0], [1.3, 1, 1]), '#d86a2a'); tb.cyl(.03, .03, 1.8, [0, .9, 1.3], '#888'); const tm = tb.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: T.DoubleSide })); this.tent.add(tm); }
    this.flag = new T.Mesh(new T.PlaneGeometry(1.2, .8, 8, 4), new T.MeshStandardMaterial({ map: canvasTex(240, 160, x => { x.fillStyle = '#f6f2ea'; x.fillRect(0, 0, 240, 160); x.fillStyle = '#c8202a'; x.beginPath(); x.arc(120, 80, 46, 0, 7); x.fill(); }), side: T.DoubleSide, roughness: .9 }));
    this.flag.position.set(0, 1.55, .25); this.flag.rotation.set(-.6, 0, 0); this.tent.add(this.flag); this.tent.position.set(6.5, 0, 4.2); this.tent.rotation.y = -.7; G.add(this.tent);
    // god-ray shafts
    for (let i = 0; i < 6; i++) { const s = new T.Mesh(new T.CylinderGeometry(.6, 1.8, 24, 12, 1, true), new T.MeshBasicMaterial({ color: '#ffe2a8', transparent: true, opacity: .07, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
      s.position.set(-8 + i * 3.3, 11, -6 + (i % 3) * 3); s.rotation.set(.25, 0, -.35); this.shafts.push(s); G.add(s); }
  }
  private buildHill() {
    const G = this.groups.hill; const R = rng(77);
    const g = new T.PlaneGeometry(400, 400, 160, 160); const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i); const ridge = Math.exp(-((y + 10) ** 2) / 900) * 14 + Math.sin(x * .05) * 3; const h = ridge - Math.max(0, -y - 40) * .6 + Math.sin(x * .3 + y * .2) * .3; pp.setZ(i, h); }
    g.computeVertexNormals(); const gm = new T.MeshStandardMaterial({ map: soil, color: '#7aa860', roughness: .95 }); const ground = new T.Mesh(g, gm); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
    this.sea = new T.Mesh(new T.PlaneGeometry(3000, 3000, 1, 1), new T.ShaderMaterial({ uniforms: { uT: this.seaU, sky: { value: new T.Color('#7ab0e0') } }, fog: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float uT; uniform vec3 sky; varying vec3 vW; ${GLSL_NOISE} void main(){ vec2 p = vW.xz * .02; float n = fbm(p + uT * .02) * .6 + fbm(p * 4. - uT * .05) * .4; vec3 deep = vec3(.05,.28,.45), shallow = vec3(.12,.55,.62);
        float d = length(cameraPosition.xz - vW.xz); vec3 c = mix(shallow, deep, smoothstep(40., 400., d)); c += vec3(1.,.9,.7) * pow(n, 6.) * 1.4; c = mix(c, sky, smoothstep(300., 1400., d)); gl_FragColor = vec4(c, 1.); }` }));
    this.sea.rotation.x = -Math.PI / 2; this.sea.position.set(0, -.5, -200); G.add(this.sea);
    const isl = new Builder(); for (let i = 0; i < 7; i++) isl.add(new T.SphereGeometry(30 + R() * 40, 18, 10, 0, 6.28, 0, Math.PI / 2), M([-300 + i * 110 + R() * 40, -4, -500 - R() * 300], [0, 0, 0], [1.6, .45 + R() * .3, 1]), R() > .5 ? '#5a8a5a' : '#4a7a5a');
    G.add(isl.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    const grass: T.Matrix4[] = [], palms: T.Matrix4[] = []; for (let i = 0; i < 1000; i++) { const x = (R() - .5) * 120, z = -10 + (R() - .5) * 60; if (x > -8 && x < 5 && z > 5 && z < 24) continue; const h = Math.exp(-((-z + 10 - 10) ** 2) / 900) * 0; void h; grass.push(M([x, 0, z], [0, R() * 6.28, 0], [.7 + R() * .5, .35 + R() * .3, .7 + R() * .5])); }
    const gm2 = new T.PlaneGeometry(1, 1); gm2.translate(0, .5, 0);
    // conform grass to terrain via raycast-free height function
    const hAt = hillY;
    grass.forEach(m => { const p = new T.Vector3().setFromMatrixPosition(m); m.setPosition(p.x, hAt(p.x, p.z), p.z); });
    this.foliage(G, fronds('grass'), gm2, grass, .08, '#f0f0b0', .75, false);
    for (let i = 0; i < 22; i++) { const x = (R() - .5) * 160, z = -20 - R() * 40; for (let f = 0; f < 8; f++) palms.push(M([x, hAt(x, z) + 9, z], [0, f * .8 + R(), 0], [1, 1, 1]).multiply(M([0, 0, 0], [-1 - R() * .5, 0, 0], [2.6, 4.4, 1]))); }
    this.foliage(G, fronds('palm'), gm2, palms, .15); const pt = new Builder(); palms.forEach((m, i) => { if (i % 8) return; const p = new T.Vector3().setFromMatrixPosition(m); pt.cyl(.22, .3, 9.2, [p.x, p.y - 4.6, p.z], '#8a7656', 8); }); G.add(pt.mesh());
  }
  private buildShop() {
    const G = this.groups.shop; const b = new Builder();
    b.box(10, .2, 10, [0, -.1, 0], '#7a5a3a'); for (let i = 0; i < 20; i++) b.box(.48, .02, 10, [-4.75 + i * .5, .005, 0], i % 2 ? '#86623e' : '#7a5636');
    b.box(10, 4, .2, [0, 2, -4], '#d8c8a8'); b.box(.2, 4, 10, [-5, 2, 0], '#d0c0a0'); b.box(.2, 4, 10, [5, 2, 0], '#d0c0a0'); b.box(10, .2, 10, [0, 4, 0], '#b8a888');
    for (const [x, z, ry] of [[-2.5, -3.75, 0], [2.5, -3.75, 0], [-4.75, -1.2, Math.PI / 2], [4.75, -1.2, -Math.PI / 2]] as const) { b.box(4.6, 3.6, .55, [x, 1.8, z], '#4a3220', [0, ry, 0]); }
    b.box(2.6, 1.0, .9, [1.6, .5, .8], '#6a4a2a'); b.box(2.7, .08, 1.0, [1.6, 1.04, .8], '#8a6038'); b.box(.5, .3, .4, [2.4, 1.23, .8], '#3a3a3a');
    for (let i = 0; i < 6; i++) b.box(.7 - (i % 2) * .1, .12, .5, [-1.6, .06 + i * .13, 1.2], ['#7a3a2a', '#2a4a6a', '#c8a860', '#3a5a3a'][i % 4], [0, i * .1, 0]);
    for (let i = 0; i < 5; i++) b.box(.6, .1, .45, [.6, 1.13 + i * .11, .8], ['#2a3a5a', '#8a2a2a', '#d8c890'][i % 3], [0, -i * .12, 0]);
    b.cyl(.02, .02, .8, [0, 3.6, 0], '#222'); b.add(new T.ConeGeometry(.45, .35, 16, 1, true), M([0, 3.1, 0]), '#2a5a3a');
    G.add(b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 })));
    const bm = new T.MeshStandardMaterial({ map: books, roughness: .85 });
    for (const [x, z, ry] of [[-2.5, -3.46, 0], [2.5, -3.46, 0], [-4.46, -1.2, Math.PI / 2], [4.46, -1.2, -Math.PI / 2]] as const) { const p = new T.Mesh(new T.PlaneGeometry(4.5, 3.5), bm); p.position.set(x, 1.8, z); p.rotation.y = ry; p.receiveShadow = true; G.add(p); }
    const win = new T.Mesh(new T.PlaneGeometry(2.2, 1.6), new T.MeshBasicMaterial({ color: '#7ab0e8', toneMapped: false })); win.position.set(0, 2.2, -3.89); G.add(win);
    const bulb = new T.Mesh(new T.SphereGeometry(.12, 12, 8), new T.MeshBasicMaterial({ color: '#ffe6b0', toneMapped: false })); bulb.position.set(0, 3.0, 0); G.add(bulb);
    const sign = new T.Mesh(new T.PlaneGeometry(1.2, .5), new T.MeshStandardMaterial({ map: canvasTex(240, 100, x => { x.fillStyle = '#2a1a10'; x.fillRect(0, 0, 240, 100); x.fillStyle = '#f0d8a0'; x.font = 'bold 70px serif'; x.textAlign = 'center'; x.fillText('本', 120, 78); }) })); sign.position.set(0, 3.5, -3.85); G.add(sign);
  }
  async render(F: OFrame, frame: number) {
    this.U.value = F.t; this.seaU.value = F.t;
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); this.skyU.night.value = s.night ?? 0; }
    this.sky.visible = F.set !== 'shop';
    this.shafts.forEach((m, i) => { (m.material as T.MeshBasicMaterial).opacity = (F.shafts ?? .06) * (.7 + .3 * Math.sin(F.t * .4 + i)); });
    this.tent.visible = (F.tent ?? 0) > 0; this.flag.rotation.z = Math.sin(F.t * 2.1) * .06;
    // tally marks
    const tl = Math.round(F.tally ?? 0); const key = 'tally' + tl; const mt = this.tallyMarks.material as T.MeshStandardMaterial;
    if (mt.name !== key) { mt.name = key; mt.map?.dispose(); mt.map = canvasTex(256, 360, g => { g.strokeStyle = 'rgba(240,225,190,.92)'; g.lineWidth = 6; g.lineCap = 'round'; for (let i = 0; i < tl; i++) { const grp = Math.floor(i / 5), j = i % 5, gx = 20 + (grp % 4) * 58, gy = 20 + Math.floor(grp / 4) * 56; g.beginPath(); if (j < 4) { g.moveTo(gx + j * 11, gy); g.lineTo(gx + j * 11 + 2, gy + 44); } else { g.moveTo(gx - 6, gy + 6); g.lineTo(gx + 44, gy + 36); } g.stroke(); } }); mt.needsUpdate = true; }
    // plane
    const pl = F.plane; this.plane.visible = !!pl; if (pl) { this.plane.position.set(...pl.pos); this.plane.rotation.set(0, pl.yaw, pl.bank ?? 0); this.prop.rotation.z = F.t * 60; }
    // leaflets: fluttering fall from a centre (deterministic per index)
    const lf = F.leaflets; const n = lf ? (lf.n ?? 140) : 0; const m4 = new T.Matrix4();
    for (let i = 0; i < 160; i++) { if (i >= n || !lf) { m4.makeScale(0, 0, 0); this.leafletMesh.setMatrixAt(i, m4); continue; }
      const R = rng(i * 13 + 5); const dl = R() * 2.5, tt = Math.max(0, lf.t - dl), x = lf.center[0] + (R() - .5) * lf.spread + Math.sin(tt * 1.7 + i) * .8, z = lf.center[2] + (R() - .5) * lf.spread + Math.cos(tt * 1.3 + i) * .6;
      const y = Math.max(.02, lf.center[1] - tt * (1.1 + R() * .6)); const landed = y <= .02;
      m4.compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(landed ? new T.Euler(-Math.PI / 2, 0, R() * 6) : new T.Euler(Math.sin(tt * 3 + i) * 1.2, tt * 2 + i, Math.cos(tt * 2.6 + i) * .9)), new T.Vector3(1, 1, 1).multiplyScalar(lf.t < dl ? 0 : 1.6));
      this.leafletMesh.setMatrixAt(i, m4); }
    this.leafletMesh.instanceMatrix.needsUpdate = true;
    // fire: flames, embers, light
    const L: Light[] = [...(F.lights ?? [])]; const S: Sprite[] = [...(F.sprites ?? [])];
    const fi = F.fire ?? 0; if (fi > 0 && F.set === 'jungle') { const p = this.firePos; const R = rng(Math.floor(F.t * 14));
      for (let i = 0; i < 9; i++) S.push({ p: [p[0] + (R() - .5) * .35, .15 + R() * .45, p[2] + (R() - .5) * .35], s: (.35 + R() * .3) * fi, rot: R() * 6, c: [1.7, 1.0, .45], a: .9, kind: 1, seed: R(), age: R() * .6 });
      S.push({ p: [p[0], .35, p[2]], s: 2.4 * fi, rot: 0, c: [1.4, .8, .35], a: .5 * fi, kind: 2, seed: .2, age: 0 });
      for (let i = 0; i < 6; i++) { const a = (F.t * .4 + i / 6) % 1; S.push({ p: [p[0] + Math.sin(i * 3 + F.t) * .3 * a, .6 + a * 3.5, p[2] + Math.cos(i * 2) * .3 * a], s: .5 + a * 1.6, rot: i, c: [.55, .52, .5], a: .25 * (1 - a) * fi, kind: 0, seed: i, age: a }); }
      for (let i = 0; i < 10; i++) { const a = (F.t * .7 + i * .13) % 1; S.push({ p: [p[0] + Math.sin(i * 7) * .4 + a * .3, .5 + a * 2.6, p[2] + Math.cos(i * 5) * .4], s: .05, rot: 0, c: [2, 1.1, .4], a: 1 - a, kind: 2, seed: i, age: 0 }); }
      L.push({ p: [p[0], .9, p[2]], c: [1, .62, .3], i: 14 * fi * (.88 + .12 * Math.sin(F.t * 17) * Math.sin(F.t * 7.3)), d: 14 }); }
    const nt = F.night ?? 0; if (nt > .3 && F.set === 'jungle') { const R = rng(3); for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = 3 + R() * 12; S.push({ p: [Math.cos(a) * d + Math.sin(F.t * .5 + i) * .4, .5 + R() * 3 + Math.sin(F.t * .8 + i * 2) * .3, Math.sin(a) * d], s: .07, rot: 0, c: [1.4, 1.8, .6], a: nt * (.5 + .5 * Math.sin(F.t * 3 + i * 1.7)), kind: 2, seed: i, age: 0 }); } }
    if (F.set === 'shop') L.push({ p: this.lamp, c: [1, .78, .5], i: 16, d: 12 });
    if ((F.props?.flash ?? 0) > 0) L.push({ p: [F.cam.look[0], F.cam.look[1] + 1, F.cam.look[2] + 1.5], c: [1, 1, 1], i: 40 * F.props!.flash!, d: 8 });
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
