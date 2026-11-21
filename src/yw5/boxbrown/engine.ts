// YunoWorld v4 · Film 1 engine — Henry "Box" Brown, Richmond → Philadelphia, 1849.
// Sets: depot (Adams Express freight room: brick, timber trusses, sun shafts, crates, barrels, sacks, scale, desk, open doors to a street),
// cut (studio cutaway of the crate: dark backdrop, rim light, air-hole light beams), map (tilt-shift diorama of the route with a moving
// wagon / train / steamboat / ferry), office (Philadelphia anti-slavery office: panelling, wallpaper, books, window light, rug).
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, type YFrame, type V3 } from '../../yw3/core.ts';

export const SET = { depot: [0, 0, 0], cut: [5000, 0, 0], map: [-5000, 0, 0], office: [0, 0, 6000] } as const;
export type SetName = keyof typeof SET;
export const CRATE = { L: .91, W: .61, H: .79 };             // 3 ft x 2 ft x 2.6 ft
const ROUTE_CURVE = new T.CatmullRomCurve3(([[-30, 0, 250], [-20, 0, 205], [-34, 0, 150], [-10, 0, 95], [20, 0, 40], [40, 0, -20], [58, 0, -80], [70, 0, -140], [84, 0, -200], [96, 0, -250]] as V3[]).map(p => new T.Vector3(p[0], .6, p[2])));
export const routeAt = (k: number): V3 => { const p = ROUTE_CURVE.getPointAt(Math.min(1, Math.max(0, k))); return [p.x, p.y, p.z]; };
export const LEG = [0, .08, .34, .42, .64, .74, .94, 1];       // wagon, rail, steamboat, wagon, rail, ferry, rail, wagon (fractions of the route)
export type BFrame = YFrame & {
  set: SetName; sky?: { top: string; hor: string; sun: V3 };
  crate?: { pos?: V3; rot?: V3; jiggle?: number; lid?: number; cutaway?: number; scale?: number };
  journey?: number;                           // 0..1 position along the route on the map
  shafts?: number; doorStreet?: number; coins?: number;
};
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...o });
function planks(base = '#8a5a34', seed = 1, w = 512) { const R = rng(seed); return canvasTex(w, w, g => { for (let y = 0; y < w; y += 32) { const v = R() * 40 - 20; const c = new T.Color(base).offsetHSL(0, 0, v / 400);
  g.fillStyle = '#' + c.getHexString(); g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(40,20,10,.55)'; g.fillRect(0, y + 30, w, 2); for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(60,30,12,${.05 + R() * .1})`; g.fillRect(R() * w, y + 4 + R() * 24, 30 + R() * 140, 1.5); }
  const x = R() * w; g.fillStyle = 'rgba(50,25,10,.6)'; g.fillRect(x, y, 2, 30); g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(x + 10, y + 16, 2.4, 0, 7); g.arc(x - 10, y + 16, 2.4, 0, 7); g.fill(); } }); }
function bricks(base = '#a4523a', seed = 2) { const R = rng(seed); return canvasTex(512, 512, g => { g.fillStyle = '#cdbda6'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < 512; x += 32) { const c = new T.Color(base).offsetHSL((R() - .5) * .03, 0, (R() - .5) * .14); g.fillStyle = '#' + c.getHexString(); g.fillRect(x + 1, y + 1, 30, 14); } }); }
function crateTex(face: 'side' | 'top' | 'end') { return canvasTex(512, 512, g => { const P = planks('#b98a52', face.length + 3, 512).image as HTMLCanvasElement; g.drawImage(P, 0, 0);
  g.strokeStyle = '#5a3a1e'; g.lineWidth = 22; g.strokeRect(11, 11, 490, 490);
  g.fillStyle = 'rgba(30,20,14,.9)'; g.font = '900 54px Georgia, serif'; g.textAlign = 'center';
  if (face === 'top') { g.fillText('THIS SIDE UP', 256, 200); g.fillText('WITH CARE', 256, 270); g.font = '900 34px Georgia, serif'; g.fillText('▲  ▲  ▲', 256, 340); }
  if (face === 'side') { g.font = '900 46px Georgia, serif'; g.fillText('DRY GOODS', 256, 220); g.font = '700 30px Georgia, serif'; g.fillText('PHILADELPHIA', 256, 280); g.fillText('ADAMS EXPRESS', 256, 330); }
  if (face === 'end') for (const [x, y] of [[190, 150], [256, 130], [322, 150]]) { g.fillStyle = '#100a06'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); } }); }

export class BoxBrownEngine extends Core {
  groups: Record<SetName, T.Group>; skyU: Record<string, T.IUniform>; sky: T.Mesh; crate: T.Group; lid: T.Group; crateCut: T.Group; cutLid: T.Group;
  shafts: T.Mesh[] = []; vehicles: Record<string, T.Object3D> = {}; mapCrate: T.Mesh; routeLine: T.Line; routeMat: T.LineDashedMaterial; coins: T.Group; streetWagon: T.Group;
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#a8c8e8', '#6a5a48'); this.scene.environment = this.env;
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(...SET[n] as unknown as V3); this.scene.add(g); return g; };
    this.groups = { depot: mk('depot'), cut: mk('cut'), map: mk('map'), office: mk('office') };
    this.skyU = { top: { value: new T.Color('#3f7fd0') }, hor: { value: new T.Color('#ffd7a0') }, sun: { value: new T.Vector3(.5, .35, .8).normalize() } };
    this.sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; varying vec3 vD; ${GLSL_NOISE} void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.05, .55, d.y), .7)); float s = max(dot(d, sun), 0.); c += vec3(1., .85, .6) * (pow(s, 500.) * 10. + pow(s, 8.) * .3);
        float cl = smoothstep(.55, .8, fbm(d.xz / max(d.y, .08) * 1.2)) * smoothstep(0., .3, d.y); c = mix(c, vec3(1., .96, .9), cl * .7); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    // ---------- crate (shared builder)
    const mkCrate = (cut: boolean) => { const g = new T.Group(); const { L, W, H } = CRATE; const side = new T.MeshStandardMaterial({ map: crateTex('side'), roughness: .85 }), end = new T.MeshStandardMaterial({ map: crateTex('end'), roughness: .85 }), top = new T.MeshStandardMaterial({ map: crateTex('top'), roughness: .85 });
      const inner = new T.MeshStandardMaterial({ map: planks('#6a4426', 7), roughness: .95, side: T.BackSide });
      const box = new T.Mesh(new T.BoxGeometry(L, H, W), [end, end, top, side, side, side]); box.position.y = H / 2; box.castShadow = box.receiveShadow = true;
      if (!cut) g.add(box); else { const sh = new T.Mesh(new T.BoxGeometry(L, H, W), inner); sh.position.y = H / 2; g.add(sh); for (const [sx, sy, sz, x, y, z, mm] of [[L, .03, W, 0, 0, 0, side], [.03, H, W, -L / 2, H / 2, 0, end], [.03, H, W, L / 2, H / 2, 0, end], [L, H, .03, 0, H / 2, -W / 2, side]] as const) { const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), mm); m.position.set(x, y, z); g.add(m); } }
      const lid = new T.Group(); const lm = new T.Mesh(new T.BoxGeometry(L + .02, .035, W + .02), top); lm.position.set(L / 2, 0, 0); lid.add(lm); lid.position.set(-L / 2, H + .017, 0); if (cut) lid.visible = false; g.add(lid); return { g, lid }; };
    { const c = mkCrate(false); this.crate = c.g; this.lid = c.lid; this.scene.add(this.crate); }
    { const c = mkCrate(true); this.crateCut = c.g; this.cutLid = c.lid; this.groups.cut.add(this.crateCut); }
    // ---------- depot (24 x 40 m freight room)
    const D = this.groups.depot; const R = rng(5);
    const brick = bricks(); brick.repeat.set(8, 3); const bm = new T.MeshStandardMaterial({ map: brick, roughness: .9 });
    const fl = planks('#8f6038', 3); fl.repeat.set(10, 16); const floor = new T.Mesh(new T.PlaneGeometry(24, 40), new T.MeshStandardMaterial({ map: fl, roughness: .75 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; D.add(floor);
    for (const [w, h, x, z, ry] of [[40, 9, -12, 0, Math.PI / 2], [40, 9, 12, 0, -Math.PI / 2], [24, 9, 0, -20, 0]] as const) { const m = new T.Mesh(new T.PlaneGeometry(w, h), bm); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; D.add(m); }
    for (const x of [-12, 12]) { const m = new T.Mesh(new T.PlaneGeometry(9, 9), bm); m.position.set(x < 0 ? -7.5 : 7.5, 4.5, 20); m.rotation.y = Math.PI; D.add(m); }   // front wall with big doorway (x -3..3)
    const lint = new T.Mesh(new T.PlaneGeometry(6, 4), bm); lint.position.set(0, 7, 20); lint.rotation.y = Math.PI; D.add(lint);
    const tb = new Builder();
    for (let z = -18; z <= 18; z += 4) { tb.box(24, .35, .35, [0, 8.6, z], '#5a3a22'); tb.box(.25, 2.2, .25, [0, 7.5, z], '#5a3a22'); tb.box(12.5, .25, .25, [-6, 7.9, z], '#5a3a22', [0, 0, .18]); tb.box(12.5, .25, .25, [6, 7.9, z], '#5a3a22', [0, 0, -.18]); }
    for (let x = -10; x <= 10; x += 5) tb.box(.3, 8.6, .3, [x, 4.3, -12], '#6a4426');
    const stack = (x: number, z: number, n: number) => { let y = 0; for (let i = 0; i < n; i++) { const s = .7 + R() * .6; tb.box(s * 1.3, s, s, [x + (R() - .5) * .2, y + s / 2, z + (R() - .5) * .2], ['#b98a52', '#a77a46', '#c49a62', '#94683c'][i % 4], [0, (R() - .5) * .2, 0]); y += s; } };
    for (let i = 0; i < 16; i++) stack(-10 + (i % 4) * 1.6 + (i > 7 ? 15 : 0), -16 + Math.floor(i / 4) % 2 * 2.2 + (i > 7 ? 3 : 0), 1 + (i % 3));
    for (let i = 0; i < 10; i++) { const x = 8 + (i % 3) * .9, z = 6 + Math.floor(i / 3) * .9; tb.cyl(.38, .32, 1.0, [x, .5, z], '#7a4a26', 14); tb.cyl(.4, .4, .05, [x, .2, z], '#3a3a3a', 14); tb.cyl(.4, .4, .05, [x, .8, z], '#3a3a3a', 14); }
    for (let i = 0; i < 8; i++) tb.add(new T.SphereGeometry(.4, 10, 8), M([-9 + (i % 4) * .7, .3, 8 + Math.floor(i / 4) * .6], [0, R(), 0], [1, .65, .8]), '#d8c49a');
    tb.box(1.6, .9, .8, [6.5, .45, -4], '#6a4426'); tb.box(1.7, .06, .9, [6.5, .93, -4], '#4a2e18'); tb.box(.5, .05, .35, [6.3, .98, -4], '#f2ead6'); tb.box(.2, .3, .2, [7, 1.1, -4.2], '#c9a45a');   // desk + ledger + lamp
    tb.box(.9, .1, .9, [-5, .5, 4], '#5a5a5a'); tb.cyl(.05, .05, 1.2, [-5, 1.1, 4], '#3a3a3a', 8); tb.cyl(.35, .35, .05, [-5, 1.7, 4], '#b08a3a', 16);                // platform scale
    tb.box(.08, 1.3, .08, [3.5, .65, 5], '#5a5a5a'); tb.box(.08, 1.3, .08, [4.1, .65, 5], '#5a5a5a'); tb.box(.7, .06, .5, [3.8, .05, 5.25], '#5a5a5a'); tb.cyl(.15, .15, .06, [3.8, .15, 5.6], '#222', 12, [0, 0, Math.PI / 2]);   // hand truck
    for (let i = 0; i < 4; i++) { tb.box(.05, .5, .05, [-11.7, 6 + (i % 2) * .1, -8 + i * 6], '#2a2a2a'); tb.box(.25, .35, .25, [-11.5, 5.6, -8 + i * 6], '#ffcf7a'); }
    D.add(tb.mesh(std({ roughness: .85 })));
    // street beyond the doorway: cobbles, shopfronts, a departing wagon
    const sb = new Builder(); sb.box(60, .1, 30, [0, -.02, 36], '#8a7f70'); sb.box(60, .15, 2.5, [0, .05, 47.5], '#a89c8a');
    for (let i = 0; i < 7; i++) for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { sb.box(1.1, 1.6, .12, [-26.4 + i * 8 + c * 2.4, 2.2 + r * 3, 48.9], '#2a3550'); sb.box(1.4, .15, .2, [-26.4 + i * 8 + c * 2.4, 1.35 + r * 3, 48.85], '#e8dcc4'); }
    for (let i = 0; i < 7; i++) sb.box(7.8, .4, 1.4, [-24 + i * 8, 1.0 + 3.4, 48.4], ['#2f6a4a', '#8a2a2a', '#c9a24a', '#2f4a8a'][i % 4], [-.3, 0, 0]);
    D.add(sb.mesh(std()));
    const sbr = bricks('#b0603f', 8); sbr.repeat.set(2, 2); for (let i = 0; i < 7; i++) { const h = 7 + (i % 3) * 2; const m = new T.Mesh(new T.BoxGeometry(7.6, h, 6), new T.MeshStandardMaterial({ map: sbr, roughness: .9, color: ['#ffffff', '#f0d0c0', '#ffe8d0', '#e0c0b0'][i % 4] })); m.position.set(-24 + i * 8, h / 2, 52); D.add(m); }
    this.streetWagon = new T.Group(); { const wb = new Builder(); wb.box(3.2, .9, 1.6, [0, 1.1, 0], '#7a4a26'); for (const x of [-1.1, 1.1]) for (const z of [-.85, .85]) wb.cyl(.55, .55, .1, [x, .55, z], '#3a2a1a', 14, [Math.PI / 2, 0, 0]); wb.box(2.6, .1, 1.7, [0, 2.6, 0], '#efe6d2'); wb.box(.08, 1.1, .08, [-1.2, 2.05, .8], '#5a3a22'); wb.box(.08, 1.1, .08, [1.2, 2.05, .8], '#5a3a22');
      this.streetWagon.add(wb.mesh(std())); } this.streetWagon.position.set(0, 0, 40); D.add(this.streetWagon);
    for (let i = 0; i < 3; i++) { const sh = new T.Mesh(new T.PlaneGeometry(4.5, 26), new T.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      sh.position.set(-2 + i * 2, 4, 9); sh.rotation.set(-.95, 0, .12 * (i - 1)); this.shafts.push(sh); D.add(sh); }
    this.coins = new T.Group(); { const cb = new Builder(); for (let i = 0; i < 14; i++) cb.cyl(.035, .035, .008, [(i % 5) * .06, .99 + Math.floor(i / 5) * .009, (i % 3) * .05], i % 4 ? '#e2c25a' : '#cfd3d8', 16); this.coins.add(cb.mesh(std({ metalness: .8, roughness: .3 }))); } this.coins.position.set(6.2, 0, -4.1); D.add(this.coins);
    // ---------- cutaway studio
    const Cu = this.groups.cut; const bg = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: '#2a2440', roughness: 1 })); bg.position.set(0, 5, -4); Cu.add(bg);
    const fl2 = new T.Mesh(new T.CircleGeometry(6, 48), new T.MeshStandardMaterial({ color: '#3a3050', roughness: .9 })); fl2.rotation.x = -Math.PI / 2; Cu.add(fl2);
    for (const [x, y] of [[-.18, .62], [0, .66], [.18, .62]]) { const b = new T.Mesh(new T.CylinderGeometry(.012, .05, 1.2, 8, 1, true), new T.MeshBasicMaterial({ color: '#ffe8b0', transparent: true, opacity: .35, blending: T.AdditiveBlending, depthWrite: false })); b.rotation.z = Math.PI / 2 - .25; b.position.set(CRATE.L / 2 - .55, y, x); this.crateCut.add(b); }
    { const wb = new Builder(); wb.add(new T.SphereGeometry(.07, 12, 10), M([.3, .1, .15], [0, 0, 0], [1, .8, 1.2]), '#c9a27a'); this.crateCut.add(wb.mesh(std({ roughness: .5 }))); }   // water bladder
    // ---------- map diorama (portrait route Richmond → Philadelphia)
    const Mp = this.groups.map; const mt = canvasTex(1024, 2048, g => { g.fillStyle = '#9bbf6a'; g.fillRect(0, 0, 1024, 2048); const R2 = rng(9);
      for (let i = 0; i < 260; i++) { g.fillStyle = ['#a8c878', '#8fb35c', '#c2c878', '#b6a46a', '#94b866'][i % 5]; g.save(); g.translate(R2() * 1024, R2() * 2048); g.rotate(R2() * .6 - .3); g.fillRect(-60, -40, 60 + R2() * 90, 40 + R2() * 60); g.restore(); }
      g.strokeStyle = '#3f8fd0'; g.lineCap = 'round'; const river = (pts: number[][], w: number) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); };
      g.fillStyle = '#3f8fd0'; g.beginPath(); g.moveTo(700, 2048); g.bezierCurveTo(760, 1500, 620, 1200, 720, 900); g.bezierCurveTo(760, 760, 820, 700, 900, 640); g.lineTo(1024, 640); g.lineTo(1024, 2048); g.fill();   // Chesapeake
      river([[180, 1930], [330, 1840], [520, 1880], [700, 1800]], 26); river([[200, 1500], [380, 1400], [560, 1460], [720, 1380]], 34);                                  // James, Potomac
      river([[620, 1000], [700, 880], [800, 760]], 30); river([[860, 640], [880, 420], [940, 220], [1000, 0]], 34);                                                  // Susquehanna, Delaware
      g.font = '900 54px Inter, Arial'; g.fillStyle = '#1e1a30'; g.textAlign = 'center';
      for (const [t, x, y] of [['RICHMOND', 260, 1990], ['WASHINGTON', 360, 1360], ['BALTIMORE', 520, 1080], ['PHILADELPHIA', 760, 150]] as const) { g.fillStyle = '#d8262b'; g.beginPath(); g.arc(x, y + 40, 16, 0, 7); g.fill(); g.fillStyle = '#1e1a30'; g.fillText(t, x, y); } });
    const ground = new T.Mesh(new T.BoxGeometry(260, 8, 520), [new T.MeshStandardMaterial({ color: '#6a5a3a' }), new T.MeshStandardMaterial({ color: '#6a5a3a' }), new T.MeshStandardMaterial({ map: mt, roughness: .9 }), new T.MeshStandardMaterial({ color: '#4a3a2a' }), new T.MeshStandardMaterial({ color: '#7a6040' }), new T.MeshStandardMaterial({ color: '#7a6040' })]);
    ground.position.y = -4; ground.receiveShadow = true; Mp.add(ground);
    const trees = new Builder(); for (let i = 0; i < 260; i++) { const x = (R() - .5) * 250, z = (R() - .5) * 510; if (x > 40 && z > -60) continue; const s = 1.5 + R() * 2.5; trees.add(new T.ConeGeometry(s, s * 2.4, 6), M([x, s * 1.2, z]), ['#3f7a32', '#4f8a3a', '#2f6a2a'][i % 3]); }
    for (let i = 0; i < 40; i++) { const [x, z] = [[-25, 248], [-8, 132], [10, 56], [52, -230]][i % 4]; trees.box(2 + R() * 2, 2 + R() * 3, 2 + R() * 2, [x + (R() - .5) * 18, 1.5, z + (R() - .5) * 18], ['#d8c2a0', '#a8664a', '#e8dcc4'][i % 3]); }
    Mp.add(trees.mesh(std({ flatShading: true })));
    const curve = ROUTE_CURVE; this.routeCurve = curve;
    this.routeMat = new T.LineDashedMaterial({ color: '#d8262b', dashSize: 3, gapSize: 2.2, linewidth: 2 }); this.routeLine = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(300)), this.routeMat); this.routeLine.computeLineDistances(); Mp.add(this.routeLine);
    const vb = (f: (b: Builder) => void) => { const b = new Builder(); f(b); const m = b.mesh(std({ roughness: .6 })); m.castShadow = true; Mp.add(m); return m; };
    this.vehicles.wagon = vb(b => { b.box(6, 2, 3, [0, 2, 0], '#8a5a32'); for (const x of [-2, 2]) for (const z of [-1.6, 1.6]) b.cyl(1, 1, .3, [x, 1, z], '#2a1a10', 12, [Math.PI / 2, 0, 0]); b.box(2.6, 2.4, 2.4, [4.6, 2.2, 0], '#6a4a32'); });
    this.vehicles.train = vb(b => { b.cyl(1.4, 1.4, 6, [0, 2.6, 0], '#2a2a32', 14, [0, 0, Math.PI / 2]); b.box(2.6, 3.4, 3, [-3.8, 3, 0], '#5a2a22'); b.cyl(.5, .7, 2, [2.2, 4.6, 0], '#1a1a1a', 10); b.box(7, .6, 3.2, [-.6, 1, 0], '#1a1a1a');
      b.box(8, 3.4, 3.2, [-10, 2.6, 0], '#a8462e'); b.box(8, 3.4, 3.2, [-19, 2.6, 0], '#3f6a8a'); });
    this.vehicles.boat = vb(b => { b.box(18, 2, 5, [0, 1, 0], '#f2efe6'); b.box(12, 2.4, 4, [-1, 3.2, 0], '#e8e2d4'); b.cyl(.5, .5, 5, [2, 6, 0], '#2a2a2a', 10); b.cyl(2.6, 2.6, 1.2, [0, 2, 2.8], '#c22f2a', 16, [Math.PI / 2, 0, 0]); b.cyl(2.6, 2.6, 1.2, [0, 2, -2.8], '#c22f2a', 16, [Math.PI / 2, 0, 0]); });
    this.vehicles.ferry = vb(b => { b.box(12, 1.6, 6, [0, .8, 0], '#6a5a3a'); b.box(4, 2, 3, [3, 2.4, 0], '#e8e2d4'); b.cyl(.35, .35, 3, [3, 4.6, 0], '#2a2a2a', 8); });
    this.mapCrate = new T.Mesh(new T.BoxGeometry(3, 2.4, 2), new T.MeshStandardMaterial({ map: crateTex('side'), roughness: .8, emissive: '#3a2610', emissiveIntensity: .3 })); Mp.add(this.mapCrate);
    // ---------- Philadelphia office
    const O = this.groups.office; const wp = canvasTex(512, 512, g => { g.fillStyle = '#3f6a5a'; g.fillRect(0, 0, 512, 512); g.fillStyle = 'rgba(240,220,170,.25)'; for (let y = 0; y < 512; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < 512; x += 64) { g.beginPath(); g.moveTo(x + 32, y + 8); g.lineTo(x + 44, y + 32); g.lineTo(x + 32, y + 56); g.lineTo(x + 20, y + 32); g.fill(); } }); wp.repeat.set(4, 2);
    const wm = new T.MeshStandardMaterial({ map: wp, roughness: .9 }); const panel = new T.MeshStandardMaterial({ map: planks('#6a3a1e', 11), roughness: .6 });
    const ofl = planks('#7a4a26', 12); ofl.repeat.set(5, 5); const of = new T.Mesh(new T.PlaneGeometry(10, 10), new T.MeshStandardMaterial({ map: ofl, roughness: .6 })); of.rotation.x = -Math.PI / 2; of.receiveShadow = true; O.add(of);
    for (const [x, z, ry] of [[0, -5, 0], [-5, 0, Math.PI / 2], [5, 0, -Math.PI / 2]] as const) { const w2 = new T.Mesh(new T.PlaneGeometry(10, 4), wm); w2.position.set(x, 2.6, z); w2.rotation.y = ry; O.add(w2); const p2 = new T.Mesh(new T.PlaneGeometry(10, 1.2), panel); p2.position.set(x * .999, .6, z * .999); p2.rotation.y = ry; O.add(p2); }
    const ob = new Builder(); ob.box(3, .08, 2, [0, .01, 0], '#8a2a2a'); ob.box(2.6, .06, 1.6, [0, .02, 0], '#c9a25a');
    ob.box(1.8, .08, .9, [2.6, .85, -3.6], '#5a3218'); for (const [x, z] of [[1.8, -3.2], [3.4, -3.2], [1.8, -4], [3.4, -4]]) ob.box(.08, .85, .08, [x, .42, z], '#4a2a12');
    ob.box(.2, .35, .2, [3, 1.06, -3.6], '#c9a45a'); ob.add(new T.SphereGeometry(.12, 10, 8), M([3, 1.3, -3.6]), '#ffe2a8');
    for (let i = 0; i < 4; i++) ob.box(1.6, .05, .35, [-3.6, .5 + i * .55, -4.7], '#5a3218'); for (let i = 0; i < 40; i++) ob.box(.07 + R() * .05, .35 + R() * .1, .25, [-4.3 + (i % 10) * .15, .7 + Math.floor(i / 10) * .55, -4.7], ['#8a2a2a', '#2a4a6a', '#4a6a3a', '#c9a45a', '#5a3a6a'][i % 5]);
    ob.box(1.2, .8, .05, [0, 2.4, -4.95], '#c9a45a'); ob.box(1.05, .65, .06, [0, 2.4, -4.94], '#d8cfb6');
    O.add(ob.mesh(std({ roughness: .7 })));
    const win = new T.Mesh(new T.PlaneGeometry(1.6, 2.2), new T.MeshBasicMaterial({ color: '#ffe8c0' })); win.position.set(4.98, 2.1, 1); win.rotation.y = -Math.PI / 2; O.add(win);
    const os = new T.Mesh(new T.PlaneGeometry(2, 9), new T.MeshBasicMaterial({ color: '#ffe0a8', transparent: true, opacity: .12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide })); os.position.set(2.5, 1.8, 1); os.rotation.set(0, Math.PI / 2, -1.0); O.add(os);
  }
  routeCurve!: T.CatmullRomCurve3;
  async render(F: BFrame, frame: number) {
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); }
    this.sky.visible = F.set === 'map' || (F.set === 'depot' && (F.doorStreet ?? 1) > 0);
    const c = F.crate ?? {}; const base = SET[F.set] as unknown as V3; const cp = c.pos ?? [0, 0, 0]; const j = (c.jiggle ?? 0);
    const tgt = F.set === 'cut' ? this.crateCut : this.crate; this.crate.visible = F.set === 'depot' || F.set === 'office'; this.crateCut.visible = F.set === 'cut';
    tgt.position.set((F.set === 'cut' ? 0 : base[0]) + cp[0] + Math.sin(F.t * 31) * j * .02, (F.set === 'cut' ? 0 : base[1]) + cp[1] + Math.abs(Math.sin(F.t * 23)) * j * .03, (F.set === 'cut' ? 0 : base[2]) + cp[2]);
    const r = c.rot ?? [0, 0, 0]; tgt.rotation.set(r[0], r[1], r[2] + Math.sin(F.t * 27) * j * .03); tgt.scale.setScalar(c.scale ?? 1);
    this.lid.rotation.z = -clamp(c.lid ?? 0) * 1.9;
    this.shafts.forEach((m, i) => { (m.material as T.MeshBasicMaterial).opacity = (F.shafts ?? .14) * (.8 + .2 * Math.sin(F.t * .7 + i)); });
    this.streetWagon.position.x = -2 - (F.doorStreet ?? 0) * 14; this.coins.visible = (F.coins ?? 0) > 0;
    if (F.set === 'map') { const k = clamp(F.journey ?? 0); const p = this.routeCurve.getPointAt(k); const q = this.routeCurve.getTangentAt(k); const ang = Math.atan2(-q.z, q.x);
      let leg = 0; for (let i = 0; i < LEG.length - 1; i++) if (k >= LEG[i]) leg = i; const kind = ['wagon', 'train', 'boat', 'wagon', 'train', 'ferry', 'train', 'wagon'][leg];
      for (const [n, v] of Object.entries(this.vehicles)) { v.visible = n === kind; if (v.visible) { v.position.set(p.x, n === 'boat' || n === 'ferry' ? -.4 : 0, p.z); v.rotation.y = ang; } }
      this.mapCrate.position.set(p.x - Math.cos(ang) * (kind === 'train' ? 10 : 0), kind === 'boat' ? 4.4 : kind === 'ferry' ? 2.8 : 4.2, p.z + Math.sin(ang) * (kind === 'train' ? 10 : 0)); this.mapCrate.rotation.y = ang;
      (this.routeLine.geometry as T.BufferGeometry).setDrawRange(0, Math.floor(300 * k) + 2); }
    await this.frameBase(F); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
