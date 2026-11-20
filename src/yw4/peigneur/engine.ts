// YunoWorld v3 · Film 1 engine — Lake Peigneur, Louisiana, 20 Nov 1980.
// Sets (separate origins): lake (shallow teal lake + whirlpool funnel shader, barge drilling rig, barges, tug, Jefferson Island
// with live oaks and the garden house, Delcambre canal waterfall), xsec (cutaway block: lake over the salt dome and mine
// levels, drill string, flooding rooms, dissolving pillars), mine (a 100 x 80 ft salt room with pillars, lamps, water).
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, lerp, canvasTex, type YFrame, type V3 } from '../../yw3/core.ts';

export const SET = { lake: [0, 0, 0], xsec: [9000, 0, 0], mine: [-9000, 0, 0] } as const;
export type SetName = keyof typeof SET;
export const CANAL_A = 1.95;   // bearing of the Delcambre canal / waterfall from the crater centre (rad)
export const SHORE: V3 = [40, 2.5, 668];  // spot on the south bank where the crews watch
export type PFrame = YFrame & {
  set: SetName;
  sky?: { top: string; hor: string; sun: V3 };
  lake?: { level?: number; swirl?: number; r0?: number; depth?: number; foam?: number; phase?: number };
  rig?: { tilt?: number; sink?: number; drill?: number; yaw?: number; gone?: boolean };
  barges?: number;                       // 0..1 how far the barges have been dragged into the funnel
  tug?: number; trees?: number;          // likewise for the tugboat and the shoreline trees
  fall?: number;                         // canal waterfall strength 0..1
  xs?: { drill?: number; flood?: number; pillars?: number; crater?: number; label?: number; cam?: number };
  mineWater?: number; lampFlicker?: number;
};
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .75, ...o });

/** Shallow lake surface with a growing, spinning funnel. Lit in-shader (sun + sky reflection) for a rich, glossy look. */
function lakeMat(U: Record<string, T.IUniform>) {
  return new T.ShaderMaterial({ uniforms: U, transparent: false,
    vertexShader: `uniform float t, swirl, r0, depth, level; varying vec3 vW; varying float vR, vA, vF;
      void main(){ vec3 p = position; float r = length(p.xz); float f = depth / (1. + pow(r / max(r0, .1), 2.));
        float a = atan(p.z, p.x);
        p.y = level - f + sin(a * 3. + t * 2. - r * .05) * .15 * smoothstep(r0 * 4., r0, r) * swirl;
        vR = r; vA = a; vF = f / max(depth, .01); vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float t, swirl, r0, foam, fogD, phase; uniform vec3 sunDir, skyHor, skyTop, fogC, camP; varying vec3 vW; varying float vR, vA, vF; ${GLSL_NOISE}
      void main(){
        float spin = min(phase, 6.) * 1.6 / (vR / max(r0, .1) + .35) * exp(-vR / (r0 * 5.));   // faster near the throat, still far out
        float a = vA + spin; vec2 q = vec2(cos(a), sin(a)) * vR;
        float n1 = fbm(q * .05 + t * .05), n2 = fbm(q * .21 - t * .1);
        vec3 nrm = normalize(vec3((n1 - .5) * .5 + (n2 - .5) * .35 + vF * cos(vA) * 1.2, 1., (n2 - .5) * .5 + vF * sin(vA) * 1.2));
        vec3 V = normalize(camP - vW); float fr = .03 + .97 * pow(1. - max(dot(nrm, V), 0.), 5.);
        vec3 R = reflect(-V, nrm); vec3 sky = mix(skyHor, skyTop, smoothstep(0., .6, R.y));
        vec3 deep = mix(vec3(.05, .32, .36), vec3(.02, .12, .16), vF); vec3 shallow = vec3(.16, .52, .46);
        vec3 col = mix(shallow, deep, smoothstep(.0, .5, vF) * .8 + .2 * n1);
        col *= .55 + .55 * max(dot(nrm, sunDir), 0.);
        col = mix(col, sky, fr * .75);
        col += vec3(1., .85, .6) * pow(max(dot(R, sunDir), 0.), 220.) * 3.;
        // spiral foam lanes on the funnel wall + churn at the throat
        float lanes = smoothstep(.62, .95, sin(a * 7. + log(vR + 1.) * 9. - t * 3.) * .5 + .5 + (n2 - .5) * .6);
        float fz = foam * (smoothstep(r0 * 2.6, r0 * .8, vR) * lanes * .9 + smoothstep(r0 * 1.2, 0., vR) * .8);
        col = mix(col, vec3(.92, .96, .95), clamp(fz, 0., 1.));
        float d = length(camP - vW); col = mix(col, fogC, 1. - exp(-pow(d * fogD, 2.)));
        gl_FragColor = vec4(col, 1.); }` });
}
function polarDisk(R: number, rings: number, seg: number) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= rings; i++) { const r = R * Math.pow(i / rings, 2.2); for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}
/** Lake basin: crater at the drill hole, shallow bed, banks, flat Louisiana land with grass and soil colours. */
function basin() {
  const pos: number[] = [], col: number[] = [], idx: number[] = []; const rings = 150, seg = 160; const c = new T.Color();
  const y = (r: number, a: number) => r < 150 ? -58 + 55 * Math.pow(r / 150, 4) : r < 600 ? -3.2 + Math.sin(a * 5 + r * .02) * .25 : r < 690 ? -3.2 + 5.7 * ((r - 600) / 90) ** 1.3 : 2.5 + Math.sin(a * 7) * .4 + Math.cos(r * .01) * .3;
  for (let i = 0; i <= rings; i++) { const r = 3000 * Math.pow(i / rings, 2); for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2; pos.push(Math.cos(a) * r, y(r, a), Math.sin(a) * r);
    if (r < 150) c.set('#4a3a2c').lerp(new T.Color('#6b5640'), r / 150); else if (r < 640) c.set('#5c4a36').lerp(new T.Color('#4a5a3a'), Math.max(0, (r - 520) / 120)); else if (r < 700) c.set('#c2a46e'); else c.set('#6f9a3e').lerp(new T.Color('#86a84a'), (Math.sin(a * 9 + r * .004) * .5 + .5) * .6);
    col.push(c.r, c.g, c.b); } }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, cc = a + seg, d = b + seg; idx.push(a, b, cc, b, d, cc); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .05 })); m.receiveShadow = true; return m;
}
/** Barge-mounted 1980 drilling rig: deck barge, lattice derrick, drawworks house, pipe rack, crew quarters. */
function rig() {
  const b = new Builder(), m = new Builder();
  b.box(44, 3.2, 16, [0, 1.0, 0], '#8b4a2b'); b.box(44.4, .5, 16.4, [0, 2.75, 0], '#5c5c58');               // hull + deck
  for (const x of [-21.5, 21.5]) for (let z = -7.5; z <= 7.5; z += 1.5) b.box(.12, 1.1, .12, [x, 3.5, z], '#e8c22c');
  for (let x = -21; x <= 21; x += 1.5) for (const z of [-7.9, 7.9]) b.box(.12, 1.1, .12, [x, 3.5, z], '#e8c22c');
  b.box(43, .1, .1, [0, 4.05, -7.9], '#e8c22c'); b.box(43, .1, .1, [0, 4.05, 7.9], '#e8c22c');
  b.box(12, 5, 9, [-14, 5.5, 0], '#f1efe6'); b.box(12.4, .4, 9.4, [-14, 8.2, 0], '#c93a2c');                 // crew quarters
  for (let i = 0; i < 4; i++) b.box(1.6, 1, .1, [-18 + i * 2.8, 6, 4.55], '#2c5a7a');
  b.box(7, 4, 6, [2, 5, -4], '#d9d4c6'); b.box(4, 3, 3, [9, 4.5, 5], '#3f6f8f');                              // drawworks, generator
  for (let i = 0; i < 9; i++) b.cyl(.25, .25, 18, [12 + (i % 3) * .6, 3.4 + Math.floor(i / 3) * .55, -5], '#9a9a90', 8, [0, 0, Math.PI / 2]); // pipe rack
  b.box(8, 1.4, 8, [6, 3.7, 1], '#6b6b66');                                                                     // drill floor
  // lattice derrick (red & white bands), 36 m
  const H = 36; for (let k = 0; k < 4; k++) { const sx = k % 2 ? 1 : -1, sz = k < 2 ? 1 : -1;
    const g = new T.CylinderGeometry(.22, .22, H, 6); const p0 = new T.Vector3(6 + sx * 3.4, 4.4, 1 + sz * 3.4), p1 = new T.Vector3(6 + sx * .6, 4.4 + H, 1 + sz * .6);
    const mid = p0.clone().add(p1).multiplyScalar(.5), dir = p1.clone().sub(p0).normalize(); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
    m.add(g, new T.Matrix4().compose(mid, q, new T.Vector3(1, 1, 1)), '#f4f2ea'); }
  for (let i = 0; i < 12; i++) { const y = 4.4 + i * 3, w = 3.4 - (3.4 - .6) * (i / 12); const c = i % 2 ? '#d23a2a' : '#f4f2ea';
    for (const [x, z, ry] of [[0, w, 0], [0, -w, 0], [w, 0, Math.PI / 2], [-w, 0, Math.PI / 2]] as const) { m.box(w * 2, .16, .16, [6 + x, y, 1 + z], c, [0, ry, 0]); m.box(Math.hypot(w * 2, 3), .1, .1, [6 + x, y + 1.5, 1 + z], c, [0, ry, Math.atan2(3, w * 2) * (i % 2 ? 1 : -1)]); } }
  m.box(2.2, 1.2, 2.2, [6, 4.4 + H + .4, 1], '#d23a2a');                                                       // crown block
  const g = new T.Group(); g.add(b.mesh(std({ roughness: .6, metalness: .15 }))); g.add(m.mesh(std({ roughness: .45, metalness: .35 })));
  const pipe = new T.Mesh(new T.CylinderGeometry(.18, .18, 60, 8), new T.MeshStandardMaterial({ color: '#555', metalness: .6, roughness: .4 })); pipe.position.set(6, -24, 1); pipe.name = 'string'; g.add(pipe);
  return g;
}
function barge(R: () => number) { const b = new Builder(); const c = ['#3d6a4b', '#7d3a24', '#2f4f6f'][Math.floor(R() * 3)];
  b.box(18, 2, 7, [0, .6, 0], c); b.box(18.2, .3, 7.2, [0, 1.65, 0], '#3a3a36');
  for (let i = 0; i < 5; i++) b.box(2.4, 1.5 + R(), 2.4, [-6 + i * 3, 2.4, (R() - .5) * 2], ['#c9a26b', '#a7b3b9', '#c56b3b'][i % 3]); return b.mesh(std()); }
function tug() { const b = new Builder(); b.box(12, 2.2, 5, [0, .8, 0], '#c22f2a'); b.box(12.2, .3, 5.2, [0, 1.95, 0], '#222');
  b.box(5, 3, 3.6, [-1, 3.6, 0], '#f2efe8'); b.box(3.4, 1.6, 3, [-1, 5.9, 0], '#f2efe8'); b.cyl(.5, .5, 2.4, [1.5, 6, 0], '#111', 10);
  for (let i = 0; i < 3; i++) b.box(.8, .7, .1, [-2.4 + i * 1.3, 4, 1.82], '#244a68'); return b.mesh(std({ roughness: .5 })); }
/** Live oaks with Spanish moss: chunky canopy clusters + trunks. */
function oaks(n: number, R: () => number, place: (i: number) => V3) {
  const g = new T.Group(); const can = new Builder(), tr = new Builder(), moss = new Builder();
  for (let i = 0; i < n; i++) { const [x, y, z] = place(i); const s = 6 + R() * 6;
    tr.cyl(.5 * s / 8, .9 * s / 8, s * .7, [x, y + s * .35, z], '#4a3626', 7);
    for (let k = 0; k < 7; k++) { const a = R() * 6.28, r = R() * s * .8; can.add(new T.IcosahedronGeometry(s * (.45 + R() * .3), 1), M([x + Math.cos(a) * r, y + s * (.75 + R() * .35), z + Math.sin(a) * r], [R(), R(), R()], [1.2, .7, 1.1]), ['#3f7a2e', '#4f8f35', '#2f6326', '#5c9a3a'][k % 4]); }
    for (let k = 0; k < 4; k++) { const a = R() * 6.28, r = s * .6; moss.add(new T.ConeGeometry(.5, 2.2, 5), M([x + Math.cos(a) * r, y + s * .55, z + Math.sin(a) * r], [Math.PI, 0, 0]), '#9aa58a'); } }
  g.add(can.mesh(std({ roughness: .9, flatShading: true }))); g.add(tr.mesh(std({ roughness: 1 }))); g.add(moss.mesh(std({ roughness: 1, flatShading: true }))); return g;
}
function plantationHouse() { const b = new Builder();
  b.box(22, 9, 14, [0, 4.5, 0], '#f3eee2'); b.box(23, .6, 15, [0, 9.2, 0], '#e9e2d0');
  b.add(new T.ConeGeometry(15, 7, 4), M([0, 13, 0], [0, Math.PI / 4, 0], [1, 1, .66]), '#9a3b2e');
  for (let i = 0; i < 8; i++) b.cyl(.35, .35, 8.6, [-10 + i * 2.85, 4.3, 7.6], '#ffffff', 10);
  for (let i = 0; i < 6; i++) for (const y of [2.5, 6.5]) b.box(1.4, 2.2, .1, [-8 + i * 3.2, y, 7.05], '#355d6e');
  b.box(3, 12, 3, [7, 6, -3], '#efe8d8'); b.add(new T.ConeGeometry(2.6, 3, 4), M([7, 13.5, -3], [0, Math.PI / 4, 0]), '#9a3b2e');
  return b.mesh(std({ roughness: .7 })); }
/** Portrait cutaway painted on canvas (1024x2048 ↔ 120 x 220 units): lake-bed sediments, the salt dome, three mine levels. */
export const XS = { W: 120, H: 220, levels: [[880, 560, 870], [1220, 470, 880], [1560, 150, 890]] as [number, number, number][], drillX: 512, shaftX: 840 };
function xsecTex() {
  return canvasTex(1024, 2048, g => {
    const grd = g.createLinearGradient(0, 0, 0, 600); grd.addColorStop(0, '#6b4a2f'); grd.addColorStop(1, '#a8794a'); g.fillStyle = grd; g.fillRect(0, 0, 1024, 2048);
    const bands = ['#7a5434', '#946640', '#b0824f', '#8a5f3a', '#c09060', '#9c7044']; for (let i = 0; i < 18; i++) { g.fillStyle = bands[i % 6]; g.beginPath(); g.moveTo(0, 30 + i * 70); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, 30 + i * 70 + Math.sin(x * .006 + i) * 14); g.lineTo(1024, 2048); g.lineTo(0, 2048); g.fill(); }
    const dg = g.createLinearGradient(0, 520, 0, 2048); dg.addColorStop(0, '#e8cfcf'); dg.addColorStop(1, '#c9a9ae');
    g.fillStyle = dg; g.beginPath(); g.moveTo(40, 2048); g.bezierCurveTo(60, 900, 260, 560, 512, 540); g.bezierCurveTo(764, 560, 964, 900, 984, 2048); g.closePath(); g.fill();
    g.strokeStyle = '#f6e6e6'; g.lineWidth = 10; g.stroke();
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${210 + i % 40},${170 + i % 50},${190 + i % 30},.18)`; const x = 120 + (i * 97) % 780, y = 640 + (i * 151) % 1400; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14, y + 8); g.lineTo(x + 4, y + 22); g.fill(); }
    for (const [y, x0, x1] of XS.levels) { g.fillStyle = '#26324d'; g.fillRect(x0, y, x1 - x0, 130);
      g.fillStyle = 'rgba(255,205,120,.95)'; for (let x = x0 + 25; x < x1; x += 60) { g.beginPath(); g.arc(x, y + 16, 5, 0, 7); g.fill(); } }
    g.fillStyle = '#26324d'; g.fillRect(XS.shaftX - 22, 560, 44, 1130);
    g.font = '900 34px Inter, Arial'; g.fillStyle = 'rgba(255,255,255,.9)'; g.textAlign = 'right'; ['~800 FT', '~1,000 FT', '1,300-FT LEVEL'].forEach((t, i) => g.fillText(t, 990, XS.levels[i][0] + 80));
  });
}
function strataSide() { return canvasTex(256, 512, g => { for (let i = 0; i < 40; i++) { g.fillStyle = ['#8a6a46', '#9d774c', '#7a5c3c', '#a88358'][i % 4]; g.fillRect(0, i * 13, 256, 13); } }); }

export class PeigneurEngine extends Core {
  lakeU: Record<string, T.IUniform>; skyU: Record<string, T.IUniform>; sky: T.Mesh; groups: Record<SetName, T.Group>;
  canal: T.Mesh; rig: T.Group; barges: T.Mesh[] = []; bargeHome: V3[] = []; tug: T.Mesh; trees: T.Group; fallMesh: T.Mesh; fallU: Record<string, T.IUniform>;
  xs: { drill: T.Mesh; floods: T.Mesh[]; pillars: T.Mesh[]; top: T.Mesh; crater: T.Mesh; stream: T.Mesh }; mineWater: T.Mesh; mineLamps: V3[] = [];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#8fc4ef', '#6f8a5a'); this.scene.environment = this.env;
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(SET[n][0], SET[n][1], SET[n][2]); this.scene.add(g); return g; };
    this.groups = { lake: mk('lake'), xsec: mk('xsec'), mine: mk('mine') };
    // sky dome (golden Louisiana morning)
    this.skyU = { top: { value: new T.Color('#3d86d6') }, hor: { value: new T.Color('#f6d7a6') }, sun: { value: new T.Vector3(.5, .3, -.8).normalize() }, t: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(4500, 48, 24), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; uniform float t; varying vec3 vD; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.02, .55, d.y), .7)); float s = max(dot(d, sun), 0.);
          c += vec3(1., .82, .55) * (pow(s, 600.) * 20. + pow(s, 12.) * .35);
          vec2 uv = d.xz / max(d.y, .06); float cl = smoothstep(.5, .78, fbm(uv * .9 + t * .01)) * smoothstep(.0, .25, d.y);
          c = mix(c, mix(vec3(1., .96, .9), hor * 1.05, .3), cl * .8); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    // ---- lake set
    const L = this.groups.lake;
    this.lakeU = { phase: { value: 0 }, t: { value: 0 }, swirl: { value: 0 }, r0: { value: 10 }, depth: { value: 0 }, level: { value: 0 }, foam: { value: 0 }, fogD: { value: .0006 },
      sunDir: { value: new T.Vector3(.5, .3, -.8).normalize() }, skyHor: { value: new T.Color('#f6d7a6') }, skyTop: { value: new T.Color('#3d86d6') }, fogC: { value: new T.Color('#e7d6b8') }, camP: { value: new T.Vector3() } };
    this.fallU = { t: { value: 0 }, k: { value: 0 } };
    const lake = new T.Mesh(polarDisk(660, 200, 200), lakeMat(this.lakeU)); lake.receiveShadow = true; L.add(lake);
    const R = rng(12);
    L.add(basin());
    // shoreline oaks + Jefferson Island (live oaks, the garden house), cypress in the shallows
    const isl = new Builder(); isl.add(new T.CylinderGeometry(110, 130, 8, 40), M([-270, -1.5, -250]), '#5f8a35'); isl.add(new T.CylinderGeometry(130, 142, 2, 40), M([-270, -.4, -250]), '#c9a86e');
    L.add(isl.mesh(std({ roughness: 1 })));
    const house = plantationHouse(); house.position.set(-250, 2.5, -200); house.rotation.y = .6; house.scale.setScalar(.8); L.add(house);
    this.trees = oaks(95, R, i => { if (i < 30) { const a = R() * 6.28, r = 20 + R() * 85; return [-270 + Math.cos(a) * r, 2.5, -250 + Math.sin(a) * r]; }
      const a = i * 2.399, r = 690 + R() * 140; return [Math.cos(a) * r, 2.4, Math.sin(a) * r]; });
    L.add(this.trees);
    const cyp = new Builder(); for (let i = 0; i < 46; i++) { const a = R() * 6.283, r = 600 + R() * 50; const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 9 + R() * 8;
      cyp.cyl(.4, 1.3, h, [x, h / 2 - 2, z], '#5a4632', 6); cyp.add(new T.ConeGeometry(3, h * .8, 7), M([x, h * .85, z]), ['#4c7a3a', '#5b8a3e'][i % 2]); } L.add(cyp.mesh(std({ flatShading: true, roughness: 1 })));
    const shrubs = new Builder(); for (let i = 0; i < 160; i++) { const a = R() * 6.283, r = 700 + R() * 900; shrubs.add(new T.IcosahedronGeometry(6 + R() * 10, 1), M([Math.cos(a) * r, 2.5, Math.sin(a) * r], [0, R() * 6, 0], [1.4, .6, 1.2]), ['#5f8f35', '#6f9a3a', '#4f7a2e'][i % 3]); }
    L.add(shrubs.mesh(std({ roughness: 1, flatShading: true })));
    // Delcambre canal: a channel across the land to the shore, then a stream across the drained bed to the crater rim
    this.canal = new T.Mesh(new T.PlaneGeometry(14, 1200, 1, 40), new T.ShaderMaterial({ uniforms: this.fallU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform float t, k; varying vec2 vU; ${GLSL_NOISE} void main(){ float n = fbm(vec2(vU.x * 4., vU.y * 60. + t * 3.)); vec3 c = mix(vec3(.12, .42, .46), vec3(.85, .93, .92), smoothstep(.55, .8, n));
        gl_FragColor = vec4(c, .92 * smoothstep(0., .15, vU.x) * smoothstep(1., .85, vU.x)); }` }));
    this.canal.rotation.x = -Math.PI / 2; L.add(this.canal);
    this.rig = rig(); L.add(this.rig);
    for (let i = 0; i < 11; i++) { const b = barge(R); const a = .3 + i * .55, r = 80 + (i % 4) * 34; const p: V3 = [Math.cos(a) * r + 40, 0, Math.sin(a) * r * .8 + 20]; b.position.set(...p); b.rotation.y = a + 1.6; this.barges.push(b); this.bargeHome.push(p); L.add(b); }
    this.tug = tug(); L.add(this.tug);
    // canal waterfall (curved sheet into the crater)
    this.fallMesh = new T.Mesh(new T.PlaneGeometry(26, 46, 20, 30), new T.ShaderMaterial({ uniforms: this.fallU, transparent: true, side: T.DoubleSide, depthWrite: false,
      vertexShader: 'uniform float t; varying vec2 vU; void main(){ vU = uv; vec3 p = position; p.z -= pow(1. - uv.y, 2.) * 14.; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }',
      fragmentShader: `uniform float t, k; varying vec2 vU; ${GLSL_NOISE} void main(){ float n = fbm(vec2(vU.x * 9., vU.y * 3. + t * 2.2)); float s = fbm(vec2(vU.x * 30., vU.y * 8. + t * 4.));
        vec3 c = mix(vec3(.2, .5, .5), vec3(.95, .98, .97), smoothstep(.45, .75, n * .6 + s * .5)); float a = k * smoothstep(0., .08, vU.x) * smoothstep(1., .92, vU.x) * (.75 + .25 * n); gl_FragColor = vec4(c, a); }` }));
    L.add(this.fallMesh);
    // ---- cross-section block (portrait), lit softly; the diagram face is unlit so its colours stay exact
    const X = this.groups.xsec; const tex = xsecTex(); const side = strataSide(); const { W: XW, H: XH } = XS;
    const sideM = new T.MeshStandardMaterial({ map: side, roughness: 1 }), dark = new T.MeshStandardMaterial({ color: '#4a3524', roughness: 1 });
    const block = new T.Mesh(new T.BoxGeometry(XW, XH, 40), [sideM, sideM, new T.MeshStandardMaterial({ color: '#5c4630', roughness: 1 }), dark, new T.MeshBasicMaterial({ map: tex }), dark]);
    block.position.set(0, -XH / 2, 0); X.add(block);
    const top = new T.Mesh(new T.BoxGeometry(XW, 6, 40), new T.MeshStandardMaterial({ color: '#2fb2c2', roughness: .1, metalness: .1, transparent: true, opacity: .85, emissive: '#0b4a55', emissiveIntensity: .5 })); top.position.set(0, 3, 0); X.add(top);
    const crater = new T.Mesh(new T.ConeGeometry(24, 30, 40, 1, true), new T.MeshStandardMaterial({ color: '#1f8aa0', roughness: .15, side: T.DoubleSide, emissive: '#0b3a45', emissiveIntensity: .5 })); crater.rotation.x = Math.PI; X.add(crater);
    const drill = new T.Mesh(new T.CylinderGeometry(.8, .8, 1, 10), new T.MeshBasicMaterial({ color: '#ff4a2a' })); X.add(drill);
    const px = (x: number) => (x / 1024 - .5) * XW, py = (y: number) => -y / 2048 * XH;
    const floods: T.Mesh[] = [], pillars: T.Mesh[] = [];
    for (const [y, x0, x1] of XS.levels) { const w = px(x1) - px(x0), hh = 130 / 2048 * XH;
      const f = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: '#33b6e8', transparent: true, opacity: .92 })); f.position.set(px((x0 + x1) / 2), py(y + 65), 20.2); f.userData = { w, hh, x0: px(x0), yb: py(y + 130) }; floods.push(f); X.add(f);
      for (let x = x0 + 70; x < x1 - 40; x += 120) { const pl = new T.Mesh(new T.PlaneGeometry(40 / 1024 * XW, hh), new T.MeshBasicMaterial({ color: '#d9c0c3' })); pl.position.set(px(x + 20), py(y + 65), 20.3); pillars.push(pl); X.add(pl); } }
    const stream = new T.Mesh(new T.PlaneGeometry(1.8, 1), new T.MeshBasicMaterial({ color: '#5fd0f2', transparent: true, opacity: .95 })); X.add(stream);
    this.xs = { drill, floods, pillars, top, crater, stream };
    // ---- mine room (salt walls, pillars, lamps, haul truck) — 30 m wide, 24 m tall
    const Mn = this.groups.mine; const salt = canvasTex(1024, 1024, g => { g.fillStyle = '#d9d3cb'; g.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 2600; i++) { const v = 170 + (i * 53) % 70; g.fillStyle = `rgba(${v},${v - 8},${v - 14},.35)`; g.fillRect((i * 389) % 1024, (i * 211) % 1024, 2 + i % 9, 1 + i % 4); }
      for (let y = 30; y < 1024; y += 64) { g.strokeStyle = 'rgba(120,110,100,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * .02 + y) * 8); g.stroke(); } });
    salt.repeat.set(6, 3);
    const sm = new T.MeshStandardMaterial({ map: salt, roughness: .85, side: T.BackSide });
    const room = new T.Mesh(new T.BoxGeometry(30, 24, 220), sm); room.position.set(0, 12, -80); room.receiveShadow = true; Mn.add(room);
    const pm = new T.MeshStandardMaterial({ map: salt, roughness: .85 }); for (let i = 0; i < 6; i++) for (const x of [-15.5, 15.5]) { const p = new T.Mesh(new T.BoxGeometry(14, 24, 14), pm); p.position.set(x, 12, -12 - i * 36); p.castShadow = p.receiveShadow = true; Mn.add(p); }
    const fl = new T.Mesh(new T.PlaneGeometry(30, 220), new T.MeshStandardMaterial({ color: '#b9b0a3', roughness: .95 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .01, -80); fl.receiveShadow = true; Mn.add(fl);
    const tb = new Builder(); tb.box(4, 2.4, 8, [0, 1.6, 0], '#f0b323'); tb.box(3.6, 1.8, 2.4, [0, 3.4, 2.6], '#f0b323'); for (const x of [-2, 2]) for (const z of [-2.6, 2.6]) tb.cyl(1, 1, .8, [x, 1, z], '#222', 12, [0, 0, Math.PI / 2]);
    const truck = tb.mesh(std({ roughness: .5 })); truck.position.set(7, 0, -40); truck.rotation.y = -.3; Mn.add(truck);
    const lampM = new T.MeshBasicMaterial({ color: '#ffd9a0' }); for (let i = 0; i < 8; i++) { const lp = new T.Mesh(new T.BoxGeometry(.5, .25, 1.4), lampM); lp.position.set(0, 23.5, -6 - i * 26); Mn.add(lp); this.mineLamps.push([SET.mine[0], 22, -6 - i * 26]); }
    this.mineWater = new T.Mesh(new T.PlaneGeometry(30, 220, 1, 1), new T.MeshStandardMaterial({ color: '#2a8fb0', roughness: .05, metalness: .2, transparent: true, opacity: .85 })); this.mineWater.rotation.x = -Math.PI / 2; this.mineWater.position.set(0, .05, -80); Mn.add(this.mineWater);
  }
  async render(F: PFrame, frame: number) {
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); this.lakeU.sunDir.value.copy(this.skyU.sun.value); this.lakeU.skyHor.value.set(s.hor); this.lakeU.skyTop.value.set(s.top); }
    this.skyU.t.value = F.t; this.lakeU.t.value = F.t; this.fallU.t.value = F.t;
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    this.sky.visible = F.set === 'lake';
    const lk = F.lake ?? {}; const U = this.lakeU; U.swirl.value = lk.swirl ?? 0; U.r0.value = lk.r0 ?? 10; U.depth.value = lk.depth ?? 0; U.level.value = lk.level ?? 0; U.foam.value = lk.foam ?? 0; U.phase.value = lk.phase ?? 0;
    if (F.fog) { U.fogC.value.set(F.fog.color); U.fogD.value = F.fog.density * .7; }
    const funnel = (x: number, z: number) => { const r = Math.hypot(x, z); return (lk.level ?? 0) - (lk.depth ?? 0) / (1 + Math.pow(r / Math.max(lk.r0 ?? 10, .1), 2)); };
    const rg = F.rig ?? {}; this.rig.visible = !rg.gone; this.rig.position.set(0, funnel(6, 1) - (rg.sink ?? 0) - .6, 0); this.rig.rotation.set(rg.tilt ?? 0, rg.yaw ?? .25, (rg.tilt ?? 0) * .5);
    (this.rig.getObjectByName('string') as T.Mesh).position.y = -24 - (rg.drill ?? 0) * 6;
    const bk = F.barges ?? 0; this.barges.forEach((b, i) => { const h = this.bargeHome[i]; const k = Math.max(0, Math.min(1, bk * 1.4 - i * .04)); const a0 = Math.atan2(h[2], h[0]), r0 = Math.hypot(h[0], h[2]);
      const a = a0 + k * 3.5, r = r0 * (1 - k * .92); const x = Math.cos(a) * r, z = Math.sin(a) * r; b.position.set(x, funnel(x, z) - k * k * 30, z); b.rotation.set(k * .6, a + 1.6, k * .4); b.visible = k < .99 && !(rg.gone && i > 8); });
    { const k = F.tug ?? 0; const a = 2.4 + k * 3, r = 260 * (1 - k * .9); const x = Math.cos(a) * r, z = Math.sin(a) * r; this.tug.position.set(x, funnel(x, z) - k * k * 25, z); this.tug.rotation.set(k * .5, a + 1.4, 0); this.tug.visible = k < .99; }
    const fk = F.fall ?? 0; this.fallMesh.visible = this.canal.visible = fk > .01; this.fallU.k.value = fk; const ca = CANAL_A;
    this.fallMesh.position.set(Math.cos(ca) * 150, -3 - 23, Math.sin(ca) * 150); this.fallMesh.rotation.set(0, -ca + Math.PI / 2, 0);
    this.canal.position.set(Math.cos(ca) * 750, -1.6, Math.sin(ca) * 750); this.canal.rotation.set(-Math.PI / 2, 0, -ca + Math.PI / 2);
    const xs = F.xs ?? {}; if (F.set === 'xsec') {
      const px = (x: number) => (x / 1024 - .5) * XS.W, py = (y: number) => -y / 2048 * XS.H; const dx = px(XS.drillX);
      const bot = lerp(0, py(XS.levels[2][0] + 40), xs.drill ?? 0); this.xs.drill.scale.set(1, Math.max(.01, -bot), 1); this.xs.drill.position.set(dx, bot / 2, 20.4);
      const fk = xs.flood ?? 0; const order = [2, 1, 0];
      this.xs.floods.forEach((f, i) => { const k = Math.max(0, Math.min(1, fk * 3 - order.indexOf(i))); const ud = f.userData as { w: number; hh: number; x0: number; yb: number }; f.visible = k > 0;
        const hh = ud.hh * Math.max(.08, Math.min(1, k * 1.2)); let l: number, r: number;
        if (i === 2) { const hw = ud.w * Math.min(1, k * 1.6); l = Math.max(ud.x0, dx - hw); r = Math.min(ud.x0 + ud.w, dx + hw); } else { r = ud.x0 + ud.w; l = r - ud.w * Math.min(1, k * 1.6); }
        f.scale.set(Math.max(.01, r - l), hh, 1); f.position.x = (l + r) / 2; f.position.y = ud.yb + hh / 2; });
      const pk = xs.pillars ?? 0; this.xs.pillars.forEach((p, i) => { const k = Math.max(0, Math.min(1, pk * 1.5 - (i % 6) * .08)); p.scale.x = 1 - k * .9; p.visible = k < .97; });
      const sl = -py(XS.levels[2][0]); this.xs.stream.visible = fk > .01; this.xs.stream.scale.y = sl * Math.min(1, fk * 4) + .01; this.xs.stream.position.set(dx, -this.xs.stream.scale.y / 2, 20.35);
      const ck = xs.crater ?? 0; this.xs.crater.visible = ck > .01; this.xs.crater.scale.set(.15 + ck, Math.max(.01, ck), .15 + ck * .6); this.xs.crater.position.set(dx, -15 * ck, 0);
      this.xs.top.scale.y = Math.max(.05, 1 - ck * .9); this.xs.top.position.y = 3 * (1 - ck * .9);
    }
    if (F.set === 'mine') { this.mineWater.position.y = .05 + (F.mineWater ?? 0) * 3; this.mineWater.visible = (F.mineWater ?? 0) > .005; }
    this.lakeU.camP.value.set(...F.cam.pos).sub(this.groups.lake.position);
    await this.frameBase(F); this.sky.position.copy(this.cam.position);
    this.draw(F, frame);
  }
}
