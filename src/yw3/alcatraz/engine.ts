// Film 3 engine — Alcatraz 1962: cellblock tiers, Morris's cell (sink, vent, dummy head), utility corridor, roof,
// rocky shore, raincoat raft, and the night bay (moonlit water, fog, city lights, lighthouse beam).
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, type YFrame, type V3 } from '../core.ts';
import { grimeMat, groundMat } from '../atomic/world.ts';

export const SET = { block: [0, 0, 0], island: [5000, 0, 0], utility: [-5000, 0, 0], bay: [0, 0, 6000] } as const;
export type SetName = keyof typeof SET;
export type CFrame = YFrame & { set: SetName; hole?: number; fake?: number; head?: { roll?: number; off?: V3 }; raft?: { pos: V3; k: number; yaw?: number; vis?: boolean };
  beam?: number; water?: { moon: V3; dark?: number }; sky?: { top: string; hor: string; stars?: number; moon?: V3 }; paddle?: V3; alarm?: number };

const CONC = '#8a8a86', CONC2 = '#6f706d', BAR = '#4c5258', PAINT = '#b9bfae';
function cellFront(b: Builder, x0: number, y0: number, w: number, h: number) {   // flat-bar front with door bars
  for (let x = x0 + .06; x < x0 + w; x += .12) b.box(.025, h, .025, [x, y0 + h / 2, 0], BAR);
  for (const y of [.15, .9, 1.8, h - .05]) b.box(w, .06, .05, [x0 + w / 2, y0 + y, 0], BAR);
}
export function cellblock() {
  const b = new Builder(); const N = 14, W = 1.55, D = 2.75, H = 2.45;
  b.box(N * W + 4, .1, 14, [N * W / 2, -.05, 4], '#5d5e5b');                      // Broadway floor
  for (let tier = 0; tier < 3; tier++) { const y0 = tier * (H + .35);
    for (let i = 0; i < N; i++) { const x = i * W; cellFront(b, x + .05, y0, W - .1, H); b.box(.12, H, D, [x, y0 + H / 2, -D / 2], PAINT); }
    b.box(N * W, .35, D + .2, [N * W / 2, y0 + H + .17, -D / 2], CONC);
    if (tier > 0) { b.box(N * W, .12, 1.1, [N * W / 2, y0 - .06, .55], CONC2); for (let x = 0; x < N * W; x += .8) b.box(.04, 1.0, .04, [x, y0 + .5, 1.08], BAR); b.box(N * W, .05, .06, [N * W / 2, y0 + 1.0, 1.08], BAR); }
  }
  b.box(N * W + 4, 10, .3, [N * W / 2, 5, -D - .2], CONC2);                         // back wall (utility corridor behind)
  b.box(N * W + 4, 12, .4, [N * W / 2, 6, 11], '#9a9a93'); for (let x = 1; x < N * W; x += 3) b.box(1.6, 3.4, .2, [x, 7, 10.8], '#1b2430');   // outer wall, tall windows
  b.box(N * W + 4, .3, 14, [N * W / 2, 12.2, 4], '#6d6e6a');
  const m = b.mesh(grimeMat(.85)); const g = new T.Group(); g.add(m);
  // Morris's cell interior (cell 6, ground tier): bed, sink, vent, shelf, accordion
  const c = new Builder(); const cx = 6 * W + W / 2;
  c.box(.75, .32, 1.9, [cx - .35, .32, -1.6], '#5a5048'); c.box(.72, .16, 1.85, [cx - .35, .52, -1.6], '#8a8f9a'); c.box(.6, .12, .35, [cx - .35, .64, -2.3], '#e8e6df');   // cot, blanket, pillow
  c.add(new T.CapsuleGeometry(.2, 1.0, 6, 12), M([cx - .35, .66, -1.45], [Math.PI / 2, 0, 0], [1.2, 1, .7]), '#7d8392');   // the "body" under the blanket
  c.box(.42, .12, .32, [cx + .45, .78, -2.55], '#f2f1ec'); c.cyl(.018, .018, .3, [cx + .62, .6, -2.5], '#6c6c68', 8);       // sink
  c.box(.5, .04, .25, [cx + .35, 1.55, -2.6], '#6b5a44'); c.box(.32, .2, .14, [cx + .3, 1.67, -2.6], '#7a2a1f');       // shelf + accordion
  g.add(c.mesh(grimeMat(.7))); g.userData.cx = cx; return g;
}
export function ventPieces() {   // concrete around the vent (hole widens), the real grille and the painted cardboard fake
  const g = new T.Group();
  const holeMat = new T.MeshBasicMaterial({ color: '#050505' }); const hole = new T.Mesh(new T.PlaneGeometry(1, 1), holeMat); g.add(hole);
  const grille = new Builder(); grille.box(.17, .25, .015, [0, 0, 0], '#6b6f73'); for (let i = 0; i < 6; i++) grille.box(.15, .012, .02, [0, -.1 + i * .04, .006], '#3e4246');
  const gm = grille.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .5 })); g.add(gm);
  const fake = new Builder(); fake.box(.24, .32, .01, [0, 0, 0], '#5d6166'); for (let i = 0; i < 7; i++) fake.box(.2, .015, .015, [0, -.13 + i * .043, .006], '#2f3236');
  const fm = fake.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 })); g.add(fm);
  g.userData = { hole, grille: gm, fake: fm }; return g;
}
export function dummyHead() {   // papier-mâché head: stickman-white with painted closed eyes and real hair
  const tex = canvasTex(512, 512, g => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, 512, 512); g.fillStyle = 'rgba(160,120,90,.15)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    g.strokeStyle = '#2a2420'; g.lineWidth = 7; g.lineCap = 'round'; for (const x of [200, 312]) { g.beginPath(); g.arc(x, 270, 26, .15 * Math.PI, .85 * Math.PI); g.stroke(); }
    g.strokeStyle = '#a8584a'; g.lineWidth = 6; g.beginPath(); g.arc(256, 330, 22, .2 * Math.PI, .8 * Math.PI); g.stroke();
    g.fillStyle = '#3a2a1e'; g.beginPath(); g.ellipse(256, 120, 230, 130, 0, Math.PI, 0); g.fill(); for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(30,20,14,.6)'; g.lineWidth = 2; const x = 40 + Math.random() * 430; g.beginPath(); g.moveTo(x, 40 + Math.random() * 40); g.lineTo(x + (Math.random() - .5) * 20, 150 + Math.random() * 60); g.stroke(); } }, true);
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
  const m = new T.Mesh(new T.SphereGeometry(.13, 32, 24), new T.MeshStandardMaterial({ map: tex, roughness: .8 })); m.castShadow = true;
  const o = new T.Mesh(new T.SphereGeometry(.13, 24, 16), new T.MeshBasicMaterial({ color: '#111', side: T.BackSide })); o.scale.setScalar(1.06); m.add(o); return m;
}
export function utility() {
  const b = new Builder(); const L = 20, Wd = 1.1, H = 9;
  b.box(L, .1, Wd, [0, 0, 0], '#4a4a46'); for (const s of [-1, 1]) b.box(L, H, .2, [0, H / 2, s * (Wd / 2 + .1)], s > 0 ? '#5b5c58' : '#6a6b66');
  const R = rng(4); for (let i = 0; i < 9; i++) { const z = -.35 + (i % 3) * .3; b.cyl(.05 + R() * .04, .05 + R() * .04, H, [-8 + i * 2, H / 2, z], i % 2 ? '#6e4a32' : '#5e6266', 10); }
  for (let y = 1; y < H; y += 1.6) b.cyl(.06, .06, L, [0, y, -.4], '#5b4a3a', 8, [0, 0, Math.PI / 2]);
  for (let x = -9; x < 10; x += 1.5) for (const z of [-.45, .45]) b.box(.05, .05, .2, [x, 3, z], '#333');
  b.box(1.2, .2, 1.2, [0, H, 0], '#3a3a38'); b.box(.6, .02, .6, [0, H - .1, 0], '#0a0a0a');
  // ground-tier cell vents seen from this side
  for (let x = -8; x < 9; x += 1.55) b.box(.2, .28, .02, [x, .7, .5], '#2a2a2a');
  return b.mesh(grimeMat(.8));
}
export function island() {
  const grp = new T.Group(); const rock = new T.Mesh(new T.CylinderGeometry(160, 230, 40, 40, 6), groundMat('#5c5a52', .2)); const p = rock.geometry.getAttribute('position'); const R = rng(8);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > -19) { p.setX(i, p.getX(i) * (1 + (R() - .5) * .1)); p.setZ(i, p.getZ(i) * (.55 + (R() - .5) * .08)); } else p.setZ(i, p.getZ(i) * .6); }
  rock.geometry.computeVertexNormals(); rock.position.y = 0; rock.receiveShadow = true; grp.add(rock);
  const b = new Builder(); b.box(150, 22, 50, [0, 31, 0], '#c9c6bb'); b.box(152, 2, 52, [0, 43, 0], '#8e8c84'); for (let x = -70; x < 72; x += 6) for (const z of [-25.2, 25.2]) b.box(3, 12, .4, [x, 31, z], '#1b2228');
  b.box(16, 18, 16, [-90, 29, 30], '#bdbab0'); b.cyl(3, 3.4, 30, [-60, 35, -40], '#e8e6df', 12); b.cyl(3.8, 3.8, 4, [-60, 52, -40], '#22272b', 12);   // lighthouse
  for (let x = -60; x < 60; x += 12) b.box(4, 3, 4, [x, 45, (x % 24 === 0 ? -8 : 8)], '#7a7870');   // roof ventilators
  b.box(60, 14, 30, [70, 27, 40], '#b8b5aa');
  b.box(16, 1.6, 7, [0, -.8, 145], '#4e4b45'); b.box(9, 1.2, 4, [-11, -.6, 143], '#56534c');   // shore ledge where the raft was launched
  grp.add(b.mesh(grimeMat(.9))); grp.userData.lamp = new T.Vector3(-60, 52, -40);
  // shoreline rocks
  const rb = new Builder(); for (let i = 0; i < 140; i++) { const a = R() * Math.PI * 2; const r = 200 + R() * 40; rb.add(new T.IcosahedronGeometry(2 + R() * 6, 0), M([Math.cos(a) * r, R() * 3 - 2, Math.sin(a) * r * .6]), R() < .5 ? '#4a4844' : '#5c5852'); }
  grp.add(rb.mesh(new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))); return grp;
}
export function raft() {   // raincoat raft: two inflated tubes + deck patches + paddles
  const b = new Builder(); const Y = '#c9a43a', K = '#2a2a24';
  for (const s of [-1, 1]) b.add(new T.CapsuleGeometry(.22, 1.6, 8, 14), M([s * .45, .22, 0], [Math.PI / 2, 0, 0]), s > 0 ? Y : '#b8923a');
  b.box(.75, .06, 1.7, [0, .12, 0], K); for (let i = 0; i < 8; i++) b.box(.24, .065, .3, [(i % 2) * .3 - .15, .13, -.7 + i * .2], i % 3 ? '#3a3a30' : '#8a7a3a');
  for (const s of [-1, 1]) { b.box(.05, .03, 1.1, [s * .7, .55, .1], '#7a5a3a', [.6, 0, s * .4]); b.box(.16, .02, .24, [s * .95, .2, .55], '#7a5a3a', [.6, 0, s * .4]); }
  return b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .05 }));
}
export function bayWater() {
  const U = { uT: { value: 0 }, moon: { value: new T.Vector3(.4, .25, -.9).normalize() }, camPos: { value: new T.Vector3() }, dark: { value: 0 }, fogC: { value: new T.Color('#1a2230') }, fogD: { value: .004 } };
  const m = new T.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, dark, fogD; uniform vec3 moon, camPos, fogC; varying vec3 vW; ${GLSL_NOISE}
      float wh(vec2 p){ return fbm(p * .35 + vec2(uT * .12, uT * .07)) * .6 + fbm(p * 1.3 - vec2(uT * .2, -uT * .15)) * .4; }
      void main(){ vec2 p = vW.xz; float e = .05, h0 = wh(p); vec3 n = normalize(vec3(-(wh(p + vec2(e, 0.)) - h0) / e * .6, 1., -(wh(p + vec2(0., e)) - h0) / e * .6));
        vec3 V = normalize(camPos - vW); vec3 R = reflect(-V, n); float fr = .03 + .97 * pow(1. - max(dot(n, V), 0.), 5.);
        vec3 sky = mix(vec3(.05, .07, .12), vec3(.16, .2, .3), clamp(1. - R.y * 2., 0., 1.)); float s = max(dot(R, moon), 0.);
        vec3 c = vec3(.01, .025, .04) * (1. - dark) + sky * fr * .9 + vec3(.9, .9, .85) * (pow(s, 90.) * 2.2 + pow(s, 12.) * .12) * (1. - dark * .5);
        float fd = length(camPos - vW); c = mix(c, fogC, 1. - exp(-fd * fogD)); gl_FragColor = vec4(c, 1.); }` });
  const mesh = new T.Mesh(new T.PlaneGeometry(6000, 6000), m); mesh.rotation.x = -Math.PI / 2; return { mesh, U };
}
export function skyline() {   // San Francisco lights + Golden Gate on the horizon
  const tex = canvasTex(2048, 256, g => { g.clearRect(0, 0, 2048, 256); const R = rng(17); g.fillStyle = '#0d1018';
    for (let i = 0; i < 160; i++) { const x = 900 + R() * 1100, w = 6 + R() * 14, h = 20 + R() * R() * 110; g.fillRect(x, 230 - h, w, h + 30); }
    g.beginPath(); g.moveTo(0, 230); for (let x = 0; x < 900; x += 40) g.lineTo(x, 210 - Math.sin(x * .006) * 40); g.lineTo(900, 256); g.lineTo(0, 256); g.fill();
    for (let i = 0; i < 1600; i++) { const x = 880 + R() * 1150, y = 120 + R() * 110; g.fillStyle = `rgba(255,${200 + R() * 40},${120 + R() * 60},${.4 + R() * .6})`; g.fillRect(x, y, 2, 2); }
    g.strokeStyle = 'rgba(230,120,70,.9)'; g.lineWidth = 3; for (const x of [260, 520]) { g.beginPath(); g.moveTo(x, 230); g.lineTo(x, 120); g.stroke(); }
    g.lineWidth = 2; g.beginPath(); g.moveTo(140, 200); g.quadraticCurveTo(260, 115, 390, 175); g.quadraticCurveTo(520, 115, 650, 200); g.stroke();
    for (let x = 140; x < 650; x += 10) { g.fillStyle = 'rgba(255,210,140,.9)'; g.fillRect(x, 198 - Math.sin((x - 140) / 510 * Math.PI) * 6, 2, 2); } });
  const m = new T.Mesh(new T.CylinderGeometry(2200, 2200, 220, 64, 1, true, Math.PI * .7, Math.PI * .8), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.BackSide, fog: false, toneMapped: false }));
  (m.material as T.MeshBasicMaterial).map!.wrapS = T.ClampToEdgeWrapping; m.position.y = 90; return m;
}

export class AlcatrazEngine extends Core {
  sets = new Map<string, T.Group>(); vent: T.Group; head: T.Mesh; headBase = new T.Vector3(); raftM: T.Mesh; water: ReturnType<typeof bayWater>; waterIsl: ReturnType<typeof bayWater>; skyU: Record<string, T.IUniform>; sky: T.Mesh;
  beamMesh: T.Mesh; lampPos: T.Vector3; paddle: T.Mesh; alarmL: T.PointLight;
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#4a5878', '#2a2a30');
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(SET[n][0], SET[n][1], SET[n][2]); this.scene.add(g); this.sets.set(n, g); return g; };
    const bl = mk('block'); const cb = cellblock(); bl.add(cb); const cx = cb.userData.cx as number;
    this.vent = ventPieces(); this.vent.position.set(cx + .45, .32, -2.74); bl.add(this.vent);
    this.head = dummyHead(); this.headBase.set(cx - .35, .8, -2.25); this.head.scale.setScalar(1.7); this.head.position.copy(this.headBase); this.head.rotation.set(-1.2, 0, 0); bl.add(this.head);
    this.alarmL = new T.PointLight('#ff2a1a', 0, 30, 1.5); this.alarmL.position.set(cx, 4, 5); bl.add(this.alarmL);
    const ut = mk('utility'); ut.add(utility());
    const isl = mk('island'); const islG = island(); isl.add(islG); this.waterIsl = bayWater(); isl.add(this.waterIsl.mesh); this.waterIsl.mesh.position.y = -1; this.lampPos = islG.userData.lamp as T.Vector3;
    const bay = mk('bay'); this.water = bayWater(); bay.add(this.water.mesh); bay.add(skyline());
    const isl2 = island(); isl2.scale.setScalar(1); isl2.position.set(-60, 0, -700); bay.add(isl2);
    this.raftM = raft(); this.scene.add(this.raftM);
    const pd = new Builder(); pd.box(.05, .03, 1.1, [0, 0, 0], '#7a5a3a'); pd.box(.16, .02, .26, [0, 0, .62], '#7a5a3a'); this.paddle = pd.mesh(); this.scene.add(this.paddle);
    // lighthouse beam (additive cone)
    const cone = new T.ConeGeometry(14, 260, 24, 1, true); cone.translate(0, -130, 0); cone.rotateZ(Math.PI / 2);
    this.beamMesh = new T.Mesh(cone, new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: {},
      vertexShader: 'varying float vX; void main(){ vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'varying float vX; void main(){ gl_FragColor = vec4(vec3(1., .95, .8) * .08 * exp(vX / 110.), 1.); }' }));
    this.scene.add(this.beamMesh);
    this.skyU = { top: { value: new T.Color('#05070d') }, hor: { value: new T.Color('#1a2234') }, stars: { value: .6 }, moon: { value: new T.Vector3(.4, .25, -.9) } };
    this.sky = new T.Mesh(new T.SphereGeometry(4000, 48, 24), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, moon; uniform float stars; varying vec3 vD; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(max(d.y, 0.), .5)); float m = max(dot(d, normalize(moon)), 0.);
          c += vec3(.9, .9, .8) * (smoothstep(.9994, .9997, m) * 3. + pow(m, 40.) * .15); vec2 sp = d.xz / (d.y + .05) * 300.; float st = step(.997, h12(floor(sp))) * smoothstep(.1, .4, d.y);
          c += vec3(st * stars); float cl = smoothstep(.5, .8, fbm(d.xz / (d.y + .2) * 2.)) * smoothstep(0., .3, d.y); c = mix(c, hor * 1.3 + vec3(.04), cl * .5);
          gl_FragColor = vec4(c, 1.); }` }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
  }
  async render(F: CFrame, frame: number) {
    for (const [k, g] of this.sets) g.visible = k === F.set;
    const hole = F.hole ?? 0; const u = this.vent.userData as { hole: T.Mesh; grille: T.Mesh; fake: T.Mesh };
    u.hole.scale.set(.17 + hole * .2, .25 + hole * .2, 1); u.hole.position.z = .005; u.grille.visible = hole < .35; u.grille.position.z = .012; u.fake.visible = (F.fake ?? 0) > .5; u.fake.position.z = .02;
    const h = F.head ?? {}; this.head.position.copy(this.headBase).add(new T.Vector3(...(h.off ?? [0, 0, 0]))); this.head.rotation.set(-1.2 + (h.roll ?? 0), 0, (h.roll ?? 0) * .5);
    const r = F.raft; this.raftM.visible = !!r && (r.vis ?? true); if (r) { this.raftM.position.set(...r.pos); this.raftM.rotation.set(Math.sin(F.t * 1.3) * .04, r.yaw ?? 0, Math.sin(F.t * 1.1) * .05); this.raftM.scale.set(1, Math.max(.15, r.k), 1); }
    this.paddle.visible = !!F.paddle; if (F.paddle) { this.paddle.position.set(...F.paddle); this.paddle.rotation.set(Math.sin(F.t) * .1, .7, Math.sin(F.t * .8) * .1); }
    this.alarmL.intensity = (F.alarm ?? 0) * (Math.sin(F.t * 9) > 0 ? 40 : 4);
    for (const w of [this.water, this.waterIsl]) { w.U.uT.value = F.t; w.U.dark.value = F.water?.dark ?? 0; if (F.water?.moon) w.U.moon.value.set(...F.water.moon).normalize(); if (F.fog) { w.U.fogC.value.set(F.fog.color); w.U.fogD.value = F.fog.density; } }
    const s = F.sky ?? { top: '#05070d', hor: '#1a2234' }; this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.stars.value = s.stars ?? .6; if (s.moon) this.skyU.moon.value.set(...s.moon);
    const bk = F.beam; this.beamMesh.visible = bk !== undefined && (F.set === 'island' || F.set === 'bay');
    if (bk !== undefined) { const lp = F.set === 'island' ? this.lampPos.clone().add(new T.Vector3(...SET.island)) : new T.Vector3(-60 + SET.bay[0], 52, -700 + SET.bay[2]); this.beamMesh.position.copy(lp); this.beamMesh.rotation.set(0, bk, -.05); }
    await this.frameBase(F); this.sky.position.copy(this.cam.position); this.water.U.camPos.value.copy(this.cam.position); this.waterIsl.U.camPos.value.copy(this.cam.position);
    this.draw(F, frame);
  }
}
