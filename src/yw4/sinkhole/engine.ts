// YunoWorld v3 · Film 3 engine — the Seffner sinkhole, Florida, 28 Feb 2013 (night).
// Sets: home (blue one-storey 1970s house with a real interior — hallway and the back bedroom — lawn, palms, oaks, the street,
// neighbours, emergency vehicles), xsec (portrait cutaway: lawn, sand, clay, limestone; rain seeping, a cavity growing, cover collapse).
// The bedroom floor is a grid of slab tiles that crack and drop into a 30-ft pit; furniture and the outer walls follow.
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, type YFrame, type V3 } from '../../yw3/core.ts';

export const SET = { home: [0, 0, 0], xsec: [6000, 0, 0] } as const;
export type SetName = keyof typeof SET;
export const HOLE: V3 = [-5.6, 0, -2.6]; export const HOLE_R = 4.6;
export type SFrame = YFrame & {
  set: SetName; night?: { moon: V3 };
  room?: { shake?: number; crack?: number; collapse?: number; lamp?: number; tv?: number };
  sirens?: number; vehicles?: boolean; demolished?: boolean; fence?: boolean; reopen?: number;
  xs?: { rain?: number; cavity?: number; collapse?: number };
};
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...o });

function siding() { return canvasTex(512, 512, g => { g.fillStyle = '#6f9cc4'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 24) { g.fillStyle = 'rgba(20,40,70,.35)'; g.fillRect(0, y, 512, 3); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + 3, 512, 4); } }); }
function paint(c: string) { return canvasTex(256, 256, g => { g.fillStyle = c; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${(i % 7) * .006})`; g.fillRect((i * 97) % 256, (i * 61) % 256, 3, 3); } }); }
function carpet() { return canvasTex(512, 512, g => { g.fillStyle = '#8a6a5a'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { const v = 100 + (i * 37) % 60; g.fillStyle = `rgba(${v + 40},${v + 10},${v},.25)`; g.fillRect((i * 389) % 512, (i * 211) % 512, 2, 2); } }); }
function crackTex() { return canvasTex(1024, 1024, g => { g.clearRect(0, 0, 1024, 1024); g.strokeStyle = 'rgba(15,10,8,.95)'; g.lineCap = 'round'; const R = rng(9);
  const branch = (x: number, y: number, a: number, w: number, n: number) => { g.lineWidth = w; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < n; i++) { a += (R() - .5) * .7; x += Math.cos(a) * 22; y += Math.sin(a) * 22; g.lineTo(x, y); if (R() < .12 && w > 1.5) branch(x, y, a + (R() - .5) * 2, w * .6, n - i); } g.stroke(); };
  for (let i = 0; i < 9; i++) branch(512, 512, i / 9 * 6.28, 7, 22); }, false); }

export class SinkholeEngine extends Core {
  groups: Record<SetName, T.Group>; skyU: Record<string, T.IUniform>; sky: T.Mesh;
  tiles: { m: T.Mesh; r: number; home: T.Vector3; spin: T.Vector3 }[] = []; falling: { o: T.Object3D; r: number; home: T.Vector3; rot: T.Euler; spin: T.Vector3 }[] = [];
  crack: T.Mesh; pit: T.Group; lampLight: V3; lampShade: T.Mesh; tvScreen: T.Mesh; houseG: T.Group; vehicles: T.Group; bars: T.Mesh[] = []; fence: T.Group; memorial: T.Group; reopenM: T.Mesh;
  xs: { cavity: T.Mesh; funnel: T.Mesh; mini: T.Group };
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#2a3a66', '#1a1a22'); this.scene.environment = this.env;
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(SET[n][0], SET[n][1], SET[n][2]); this.scene.add(g); return g; };
    this.groups = { home: mk('home'), xsec: mk('xsec') };
    this.skyU = { moon: { value: new T.Vector3(-.4, .5, -.75).normalize() }, t: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(1500, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 moon; uniform float t; varying vec3 vD; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vD); vec3 c = mix(vec3(.10, .14, .30), vec3(.015, .025, .08), smoothstep(-.05, .6, d.y)); c += vec3(.25, .12, .2) * exp(-max(d.y, 0.) * 9.) * .5;
          float st = step(.9975, h12(floor(d.xz / max(d.y, .1) * 140.))) * smoothstep(.05, .3, d.y); c += st * .9;
          float m = max(dot(d, normalize(moon)), 0.); c += vec3(.9, .95, 1.) * (smoothstep(.9994, .9997, m) * 3. + pow(m, 60.) * .15);
          vec2 uv = d.xz / max(d.y, .08); c = mix(c, vec3(.18, .22, .36), smoothstep(.55, .85, fbm(uv * .8 + t * .01)) * .5 * smoothstep(0., .3, d.y)); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    const H = this.groups.home; const R = rng(41);
    // ground: lawn, driveway, street, sidewalks
    const lawn = canvasTex(512, 512, g => { g.fillStyle = '#3f6a2c'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${40 + i % 50},${90 + i % 70},${30 + i % 30},.5)`; g.fillRect((i * 389) % 512, (i * 211) % 512, 2, 5); } }); 
    const lsh = new T.Shape([new T.Vector2(-200, -200), new T.Vector2(200, -200), new T.Vector2(200, 200), new T.Vector2(-200, 200)]); const hp = new T.Path(); hp.absarc(HOLE[0], -HOLE[2], HOLE_R - .05, 0, Math.PI * 2, true); lsh.holes.push(hp);
    lawn.repeat.set(.1, .1); const gr = new T.Mesh(new T.ShapeGeometry(lsh, 48), new T.MeshStandardMaterial({ map: lawn, roughness: .95 })); gr.rotation.x = -Math.PI / 2; gr.receiveShadow = true; H.add(gr);
    const gb = new Builder(); gb.box(400, .06, 8, [0, .03, 14], '#3a3a3e'); gb.box(400, .08, 1.6, [0, .04, 9.4], '#a8a49a'); gb.box(4.5, .07, 5, [5, .035, 6.3], '#8e8a82'); gb.box(.8, .07, 5, [-2, .035, 6.3], '#9a968c');
    for (let i = 0; i < 40; i++) gb.box(.1, .07, 1.6, [-200 + i * 10, .07, 14], '#e8d26a');
    H.add(gb.mesh(std()));
    // the house (1970s ranch, blue siding, hip roof) — real interior walls, hallway, back bedroom
    this.houseG = new T.Group(); H.add(this.houseG);
    const sid = siding(); sid.repeat.set(4, 1); const ext = new T.MeshStandardMaterial({ map: sid, roughness: .8 }); const intM = new T.MeshStandardMaterial({ map: paint('#e9dcc4'), roughness: .9 });
    const wallMats = [ext, ext, intM, intM, ext, intM];
    const outMats = (at: V3, w: number, d: number) => { const m: T.Material[] = [intM, intM, intM, intM, intM, intM]; if (w > d) { if (at[2] > 0) m[4] = ext; else m[5] = ext; } else { if (at[0] > 0) m[0] = ext; else m[1] = ext; } return m; };
    const wall = (w: number, h: number, d: number, at: V3, mats: T.Material | T.Material[] = intM) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mats === wallMats ? outMats(at, w, d) : mats); m.position.set(...at); m.castShadow = m.receiveShadow = true; this.houseG.add(m); return m; };
    const Hh = 2.7, X0 = -9, X1 = 7, Z0 = -6, Z1 = 4;     // footprint 16 x 10 m
    const front: [number, number][] = [[X0, -3.5], [-2, 1.2], [2.2, 4.4], [5.6, X1]]; for (const [a, b] of front) wall(b - a, Hh, .2, [(a + b) / 2, Hh / 2, Z1], wallMats);
    for (const [a, b] of [[-3.5, -2], [1.2, 2.2], [4.4, 5.6]]) { wall(b - a, .9, .2, [(a + b) / 2, .45, Z1], wallMats); wall(b - a, .5, .2, [(a + b) / 2, Hh - .25, Z1], wallMats); }   // window sills/heads (front)
    const backWalls: T.Mesh[] = [];
    backWalls.push(wall(1.6, Hh, .2, [X0 + .8, Hh / 2, Z0], wallMats), wall(.9, .9, .2, [-6.95, .45, Z0], wallMats), wall(.9, .5, .2, [-6.95, Hh - .25, Z0], wallMats), wall(4.9, Hh, .2, [-4.05, Hh / 2, Z0], wallMats));
    wall(X1 + 1.6, Hh, .2, [(X1 - 1.6) / 2, Hh / 2, Z0], wallMats);
    backWalls.push(wall(.2, Hh, Z1 - Z0, [X0, Hh / 2, (Z0 + Z1) / 2], wallMats)); wall(.2, Hh, Z1 - Z0, [X1, Hh / 2, (Z0 + Z1) / 2], wallMats);
    wall(.15, Hh, 5.8, [-1.5, Hh / 2, Z0 + 2.9]);                            // bedroom east wall
    wall(4.6, Hh, .15, [-6.7, Hh / 2, -.2]); wall(1.3, Hh, .15, [-2.2, Hh / 2, -.2]); wall(.9, .6, .15, [-3.95, Hh - .3, -.2]);   // bedroom/hall wall with door gap at x -4.4..-3.5
    wall(8.5, Hh, .15, [2.75, Hh / 2, -.2]); wall(.15, Hh, 4.2, [X0 + 4, Hh / 2, 1.9]);
    const ceil = new T.Mesh(new T.BoxGeometry(X1 - X0, .1, Z1 - Z0), new T.MeshStandardMaterial({ color: '#efe6d6', roughness: 1 })); ceil.position.set((X0 + X1) / 2, Hh, (Z0 + Z1) / 2); this.houseG.add(ceil);
    const rb = new Builder(); rb.add(new T.ConeGeometry(11.6, 2.6, 4, 1), M([(X0 + X1) / 2, Hh + 1.35, (Z0 + Z1) / 2], [0, Math.PI / 4, 0], [1, 1, .64]), '#4a4038'); rb.box(X1 - X0 + 1, .15, Z1 - Z0 + 1, [(X0 + X1) / 2, Hh + .05, (Z0 + Z1) / 2], '#e8e2d6');
    const roof = rb.mesh(std({ roughness: .9 })); this.houseG.add(roof);
    const flo = new T.Mesh(new T.PlaneGeometry(8.5, Z1 - Z0), new T.MeshStandardMaterial({ map: paint('#b9a58a'), roughness: .6 })); flo.rotation.x = -Math.PI / 2; flo.position.set(2.75, .02, (Z0 + Z1) / 2); this.houseG.add(flo);
    const hallF = new T.Mesh(new T.PlaneGeometry(9, 4.2), new T.MeshStandardMaterial({ map: paint('#a68a6a'), roughness: .5 })); hallF.rotation.x = -Math.PI / 2; hallF.position.set(-4.5, .021, 1.9); this.houseG.add(hallF);
    const win = new T.MeshStandardMaterial({ color: '#ffcf86', emissive: '#ffb860', emissiveIntensity: .9 });
    for (const x of [-2.75, 1.7, 5]) { const m = new T.Mesh(new T.PlaneGeometry(1.4, 1.2), win); m.position.set(x, 1.5, Z1 + .11); this.houseG.add(m); }
    const door = new Builder(); door.box(1, 2.1, .08, [-.3, 1.05, Z1 + .1], '#f2efe8'); door.box(2, .1, 1.4, [-.3, 2.7, Z1 + .7], '#e8e2d6'); door.box(.3, .3, .3, [.5, 2.2, Z1 + .2], '#ffd88a'); this.houseG.add(door.mesh(std({ emissive: '#000' })));
    // bedroom contents: carpet tiles (falling), bed, nightstand + lamp, dresser + TV, ceiling fan, window blinds, posters
    const cm = new T.MeshStandardMaterial({ map: carpet(), roughness: 1 }); const ts = .62;
    for (let x = X0 + .1; x < -1.6; x += ts) for (let z = Z0 + .1; z < -.25; z += ts) { const m = new T.Mesh(new T.BoxGeometry(ts - .01, .14, ts - .01), cm); m.position.set(x + ts / 2, -.05, z + ts / 2); m.receiveShadow = true; this.houseG.add(m);
      this.tiles.push({ m, r: Math.hypot(x - HOLE[0], z - HOLE[2]), home: m.position.clone(), spin: new T.Vector3(R() - .5, R() - .5, R() - .5) }); }
    this.crack = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false })); this.crack.rotation.x = -Math.PI / 2; this.crack.position.set(HOLE[0], .03, HOLE[2]); this.houseG.add(this.crack);
    const fall = (b: Builder, at: V3, r: number) => { const o = b.mesh(std()); o.position.set(...at); this.houseG.add(o); this.falling.push({ o, r, home: o.position.clone(), rot: o.rotation.clone(), spin: new T.Vector3(R() - .5, R() - .5, R() - .5) }); return o; };
    { const b = new Builder(); b.box(1.7, .35, 2.1, [0, .35, 0], '#5a3a2a'); b.box(1.62, .25, 2.0, [0, .65, 0], '#f4f1ea'); b.box(1.66, .14, 1.4, [0, .82, .25], '#3a5a8a'); b.box(1.5, .14, .45, [0, .82, -.72], '#ffffff'); b.box(1.8, 1.0, .1, [0, .6, -1.08], '#5a3a2a'); fall(b, [-6.2, 0, -4.6], 1.3); }
    { const b = new Builder(); b.box(.5, .55, .45, [0, .28, 0], '#6a4a32'); b.cyl(.06, .1, .35, [0, .73, 0], '#c9b28a'); fall(b, [-7.5, 0, -5.5], 2.4); }
    { const b = new Builder(); b.box(1.6, .9, .5, [0, .45, 0], '#7a5638'); b.box(1.1, .65, .08, [0, 1.25, 0], '#121418'); fall(b, [-4.3, 0, -5.6], 3.2); }
    this.lampShade = new T.Mesh(new T.CylinderGeometry(.14, .2, .24, 16, 1, true), new T.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffc070', emissiveIntensity: 1.6, side: T.DoubleSide }));
    this.lampShade.position.set(0, 1.0, 0); this.falling[1].o.add(this.lampShade); this.lampLight = [-7.5, 1.05, -5.4];
    this.tvScreen = new T.Mesh(new T.PlaneGeometry(1.0, .56), new T.MeshBasicMaterial({ color: '#5a8ad8' })); this.tvScreen.position.set(0, 1.25, .05); this.falling[2].o.add(this.tvScreen);
    { const b = new Builder(); b.cyl(.04, .04, .3, [0, -.15, 0], '#ddd', 6); for (let i = 0; i < 4; i++) b.box(.9, .02, .16, [Math.cos(i * 1.57) * .45, -.3, Math.sin(i * 1.57) * .45], '#7a5a3a', [0, -i * 1.57, 0]); fall(b, [-5.6, Hh - .02, -3.0], 2.0); }
    { const b = new Builder(); for (let i = 0; i < 12; i++) b.box(.86, .03, .05, [0, .4 + i * .07, 0], '#f2efe6'); fall(b, [-6.95, .9, Z0 + .14], 4); }
    { const b = new Builder(); b.box(.6, .8, .02, [0, 0, 0], '#2a6aa8'); b.box(.5, .3, .03, [0, .1, 0], '#f2c23a'); fall(b, [-3.2, 1.6, Z0 + .13], 3.6); }
    // the pit (dark sand walls, black depth)
    this.pit = new T.Group(); { const pm = new T.MeshStandardMaterial({ map: canvasTex(512, 512, g => { g.fillStyle = '#5a4630'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 40; i++) { g.fillStyle = ['#6b5236', '#4a3826', '#7a6040'][i % 3]; g.fillRect(0, i * 13, 512, 8 + i % 6); } }), roughness: 1, side: T.BackSide });
      const wallP = new T.Mesh(new T.CylinderGeometry(HOLE_R, HOLE_R * .55, 14, 32, 6, true), pm); wallP.position.y = -7.1; this.pit.add(wallP);
      const bot = new T.Mesh(new T.CircleGeometry(HOLE_R * .6, 24), new T.MeshBasicMaterial({ color: '#050302' })); bot.rotation.x = -Math.PI / 2; bot.position.y = -14; this.pit.add(bot); }
    this.pit.position.set(...HOLE); this.houseG.add(this.pit); this.backWalls = backWalls; backWalls.forEach(w => { w.userData.y = w.position.y; });
    // yard: palms, a live oak, shrubs, mailbox, car, streetlights, neighbours
    const yb = new Builder(); const palm = (x: number, z: number, h: number) => { for (let i = 0; i < 8; i++) yb.cyl(.22, .26, h / 8, [x + Math.sin(i * .3) * .2, h / 16 + i * h / 8, z], '#7a6a52', 8);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; yb.add(new T.ConeGeometry(.35, 3.2, 4), M([x + Math.cos(a) * 1.3, h + .1, z + Math.sin(a) * 1.3], [Math.sin(a) * 1.7, 0, -Math.cos(a) * 1.7]), '#3f7a32'); } };
    palm(-11, 7, 7); palm(9.5, 6, 6); palm(13, -3, 8);
    for (let i = 0; i < 9; i++) yb.add(new T.IcosahedronGeometry(2.2 + R(), 1), M([-16 + R() * 3, 5 + R() * 2, -9 + R() * 3]), '#2f5a26'); yb.cyl(.5, .8, 6, [-15, 3, -8], '#4a3a2a', 8);
    for (let i = 0; i < 14; i++) yb.add(new T.IcosahedronGeometry(.6 + R() * .3, 1), M([X0 + 1 + i * 1.1, .5, Z1 + .9]), ['#3a6a2c', '#4a7a32'][i % 2]);
    yb.box(.2, 1.1, .2, [6.5, .55, 9.8], '#ddd'); yb.box(.5, .3, .25, [6.5, 1.2, 9.8], '#2a2a2a');
    yb.box(4.4, .9, 1.9, [5, .75, 6], '#7a2a2a'); yb.box(2.4, .7, 1.7, [4.8, 1.5, 6], '#22303a'); for (const x of [3.6, 6.4]) for (const z of [5.1, 6.9]) yb.cyl(.35, .35, .25, [x, .35, z], '#111', 12, [Math.PI / 2, 0, 0]);
    for (const x of [-30, 20]) { yb.cyl(.1, .14, 7, [x, 3.5, 10.6], '#555', 8); yb.box(1.6, .15, .3, [x - .7, 7, 10.6], '#555'); }
    for (const [x, c] of [[-26, '#d8c9a6'], [24, '#c9d8b6'], [-48, '#e0b6a6']] as const) { yb.box(13, 2.8, 9, [x, 1.4, -1], c); yb.add(new T.ConeGeometry(9.4, 2.2, 4), M([x, 3.9, -1], [0, Math.PI / 4, 0], [1, 1, .7]), '#4a4038'); yb.box(1.2, 1.1, .05, [x - 2, 1.5, 3.53], '#ffcf86'); }
    H.add(yb.mesh(std({ roughness: .85 })));
    this.lamps = [[-30.7, 6.9, 10.6], [19.3, 6.9, 10.6]];
    // emergency vehicles (fire engine, sheriff SUVs, ambulance) with light bars
    this.vehicles = new T.Group(); const vb = new Builder();
    const truck = (x: number, z: number, body: string, stripe: string, L: number, Hh2: number, rot = 0) => { vb.box(L, Hh2, 2.4, [x, Hh2 / 2 + .5, z], body, [0, rot, 0]); vb.box(L + .02, .25, 2.42, [x, Hh2 * .55 + .5, z], stripe, [0, rot, 0]);
      for (const dx of [-L * .35, L * .35]) for (const dz of [-1.1, 1.1]) vb.cyl(.5, .5, .3, [x + dx * Math.cos(rot), .5, z + dz - dx * Math.sin(rot)], '#111', 12, [Math.PI / 2, 0, 0]);
      for (const s of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(.5, .2, .4), new T.MeshBasicMaterial({ color: s < 0 ? '#ff2a2a' : '#2a6aff' })); m.position.set(x + s * .35, Hh2 + .65, z); this.vehicles.add(m); this.bars.push(m); } };
    truck(-4, 14.5, '#c8201c', '#f2efe6', 9, 2.6); truck(8, 14.2, '#f2f2ee', '#2f6a3a', 4.6, 1.4); truck(-15, 13.8, '#f2f2ee', '#2f6a3a', 4.6, 1.4, .2); truck(16, 15, '#f4f4f0', '#d8261c', 6, 2.2);
    vb.box(22, .04, .04, [-1.5, .9, 8.8], '#f2d22a'); for (let i = 0; i < 6; i++) vb.cyl(.05, .05, 1, [-12 + i * 4.2, .5, 8.8], '#f2d22a', 6);
    this.vehicles.add(vb.mesh(std({ roughness: .5 }))); H.add(this.vehicles);
    // after: fenced lot, memorial marker
    this.fence = new T.Group(); { const fb = new Builder(); for (let i = 0; i <= 24; i++) { const a = i / 24 * 6.28; fb.cyl(.04, .04, 1.9, [HOLE[0] + Math.cos(a) * 11, .95, HOLE[2] + Math.sin(a) * 8], '#9aa0a6', 6); }
      const ring = new T.Mesh(new T.CylinderGeometry(1, 1, 1.7, 48, 1, true), new T.MeshStandardMaterial({ map: canvasTex(256, 256, g => { g.strokeStyle = 'rgba(200,205,210,.9)'; g.lineWidth = 2; for (let i = -256; i < 512; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); } }), transparent: true, side: T.DoubleSide, roughness: .5, metalness: .5 }));
      (ring.material as T.MeshStandardMaterial).map!.repeat.set(30, 1); ring.scale.set(11, 1, 8); ring.position.set(HOLE[0], .95, HOLE[2]); this.fence.add(ring, fb.mesh(std({ metalness: .5, roughness: .4 }))); }
    H.add(this.fence);
    this.memorial = new T.Group(); { const mb = new Builder(); mb.box(.9, .12, .6, [0, .06, 0], '#6a6a66'); for (let i = 0; i < 8; i++) mb.add(new T.IcosahedronGeometry(.25, 1), M([Math.cos(i) * .7, .2, Math.sin(i) * .5]), ['#3f7a32', '#d8384a', '#f2c23a'][i % 3]); this.memorial.add(mb.mesh(std())); this.memorial.position.set(HOLE[0] + 2, 0, 9); H.add(this.memorial); }
    this.reopenM = new T.Mesh(new T.CircleGeometry(3, 40), new T.MeshStandardMaterial({ color: '#2a1e14', roughness: 1 })); this.reopenM.rotation.x = -Math.PI / 2; this.reopenM.position.set(HOLE[0], .03, HOLE[2]); H.add(this.reopenM);
    // ---- cross-section (portrait block 120 x 220)
    const X = this.groups.xsec; const W = 120, HH = 220;
    const tex = canvasTex(1024, 2048, g => { const L: [number, number, string][] = [[0, 30, '#4f8a34'], [30, 520, '#e2c27a'], [520, 900, '#b5723f'], [900, 2048, '#d9d1bc']];
      for (const [a, b, c] of L) { g.fillStyle = c; g.fillRect(0, a, 1024, b - a); }
      for (let i = 0; i < 3000; i++) { const y = 30 + (i * 151) % 860; g.fillStyle = y < 520 ? 'rgba(160,120,60,.25)' : 'rgba(90,50,20,.2)'; g.fillRect((i * 389) % 1024, y, 4, 3); }
      for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(150,140,120,.35)'; g.beginPath(); g.arc((i * 263) % 1024, 950 + (i * 131) % 1080, 6 + i % 12, 0, 7); g.fill(); }
      for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgba(120,110,95,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 1000 + i * 110); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, 1000 + i * 110 + Math.sin(x * .01 + i) * 10); g.stroke(); }
      g.font = '900 40px Inter, Arial'; g.fillStyle = 'rgba(30,20,10,.75)'; g.fillText('SAND', 40, 300); g.fillText('CLAY', 40, 720); g.fillStyle = 'rgba(60,55,45,.8)'; g.fillText('LIMESTONE', 40, 1950); });
    const blk = new T.Mesh(new T.BoxGeometry(W, HH, 40), [new T.MeshStandardMaterial({ color: '#c9b48a' }), new T.MeshStandardMaterial({ color: '#c9b48a' }), new T.MeshStandardMaterial({ color: '#4f8a34' }), new T.MeshStandardMaterial({ color: '#3a3020' }), new T.MeshBasicMaterial({ map: tex }), new T.MeshStandardMaterial({ color: '#3a3020' })]);
    blk.position.set(0, -HH / 2, 0); X.add(blk);
    const cav = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: '#141018' })); X.add(cav);
    const fun = new T.Mesh(new T.ShapeGeometry(new T.Shape([new T.Vector2(-1, 0), new T.Vector2(1, 0), new T.Vector2(.25, -1), new T.Vector2(-.25, -1)])), new T.MeshBasicMaterial({ color: '#141018' })); X.add(fun);
    const mini = new T.Group(); { const b = new Builder(); b.box(16, 4, 10, [0, 2, 0], '#6f9cc4'); b.add(new T.ConeGeometry(11, 4, 4), M([0, 6, 0], [0, Math.PI / 4, 0], [1, 1, .65]), '#4a4038'); b.box(2, 1.6, .1, [-4, 2, 5.05], '#ffcf86'); b.box(2, 1.6, .1, [4, 2, 5.05], '#ffcf86');
      mini.add(b.mesh(std())); } mini.scale.setScalar(.8); mini.position.set(0, 0, 22); X.add(mini);
    this.xs = { cavity: cav, funnel: fun, mini };
  }
  backWalls: T.Mesh[] = []; lamps: V3[] = [];
  async render(F: SFrame, frame: number) {
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    this.sky.visible = F.set === 'home'; this.skyU.t.value = F.t; if (F.night) this.skyU.moon.value.set(...F.night.moon).normalize();
    const rm = F.room ?? {}; const c = clamp(rm.collapse ?? 0); const sh = rm.shake ?? 0;
    this.tiles.forEach(tl => { const k = clamp((c * 1.6 - tl.r / HOLE_R * .9) * 2.2); const inHole = tl.r < HOLE_R + .3; const kk2 = inHole ? k : 0;
      tl.m.position.set(tl.home.x, tl.home.y - kk2 * kk2 * 9 + (sh ? Math.sin(F.t * 60 + tl.r * 9) * sh * .012 : 0), tl.home.z); tl.m.rotation.set(tl.spin.x * kk2 * 2, 0, tl.spin.z * kk2 * 2); tl.m.visible = kk2 < .98; });
    this.falling.forEach(f => { const k = clamp((c * 1.6 - f.r / HOLE_R * .9) * 1.8); f.o.position.set(f.home.x + Math.sin(F.t * 40 + f.r) * sh * .01, f.home.y - k * k * 10, f.home.z); f.o.rotation.set(f.rot.x + f.spin.x * k * 1.5, f.rot.y + f.spin.y * k, f.rot.z + f.spin.z * k * 1.5); f.o.visible = k < .98; });
    this.backWalls.forEach((w, i) => { const k = clamp((c - .55) * 3 - i * .1); w.rotation.set(k * .5, 0, -k * .3); w.position.y = (w.userData.y as number) - k * k * 6; w.visible = k < .97; });
    (this.crack.material as T.MeshBasicMaterial).opacity = clamp(rm.crack ?? 0) * (1 - clamp(c * 3)); this.crack.scale.setScalar(.3 + .7 * clamp(rm.crack ?? 0));
    this.pit.visible = c > .01 && !F.demolished; const lamp = (rm.lamp ?? 1) * (1 - clamp(c * 2)); (this.lampShade.material as T.MeshStandardMaterial).emissiveIntensity = 1.6 * lamp;
    (this.tvScreen.material as T.MeshBasicMaterial).color.setRGB(.3 * (rm.tv ?? 0), .45 * (rm.tv ?? 0), .8 * (rm.tv ?? 0));
    this.houseG.visible = !F.demolished; this.vehicles.visible = !!F.vehicles; this.fence.visible = this.memorial.visible = !!F.fence;
    const sir = F.sirens ?? 0; this.bars.forEach((b, i) => { const on = Math.sin(F.t * 14 + i * 1.7) > 0; (b.material as T.MeshBasicMaterial).color.setRGB(...((i % 2 ? [.2, .45, 1.6] : [1.8, .15, .15]).map(v => on ? v * sir + .05 : .08) as [number, number, number])); });
    this.reopenM.visible = (F.reopen ?? 0) > .01; this.reopenM.scale.setScalar(Math.max(.01, F.reopen ?? 0));
    const xs = F.xs ?? {}; if (F.set === 'xsec') { const cv = clamp(xs.cavity ?? 0), co = clamp(xs.collapse ?? 0);
      this.xs.cavity.scale.set(4 + cv * 26, 3 + cv * 14, 1); this.xs.cavity.position.set(0, -125 + cv * 4, 20.2);
      this.xs.funnel.visible = co > .01; this.xs.funnel.scale.set(10 + co * 14, 120 * co + .01, 1); this.xs.funnel.position.set(0, 0, 20.25);
      this.xs.mini.position.set(0, -co * 38, 22); this.xs.mini.rotation.set(co * .4, 0, co * .5); }
    // lamp light (bedroom) & street lights & sirens through the point lights
    const L = [...(F.lights ?? [])];
    if (F.set === 'home' && !F.demolished && lamp > .02) L.push({ p: this.lampLight, c: [1, .72, .4], i: 6 * lamp, d: 7 });
    if (sir > 0) for (let i = 0; i < 2; i++) { const on = Math.sin(F.t * 14 + i * 1.7) > 0; L.push({ p: [-4 + i * 12, 3.5, 13], c: i ? [.2, .4, 1] : [1, .1, .1], i: on ? 40 * sir : 2, d: 30 }); }
    if (F.set === 'home') for (const p of this.lamps) L.push({ p, c: [1, .78, .45], i: 25, d: 22 });
    await this.frameBase({ ...F, lights: L }); this.sky.position.copy(this.cam.position);
    this.draw(F, frame);
  }
}
