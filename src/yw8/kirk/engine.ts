// YunoWorld v8 · "Why lock a grave in an iron cage?" — a Scottish kirkyard c.1820 (night and day).
// Stone kirk with tower and lancet windows, boundary dyke and iron gate, a watch-house, bare trees, rows of weathered
// headstones/table tombs/crosses, a fresh grave with an iron MORTSAFE (bars, spear finials, lifting rings), sheerlegs tackle
// with chain and block, a coffin, lanterns, spade, and (off to the east) the classical front of an anatomy school.
import * as T from 'three';
import { Core, rng, canvasTex, clamp, lerp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, brickTex, dirtTex, boxes, cyls, glowMat, rockify, type V7Frame } from '../../yw7/kit7.ts';

export type KirkFrame = V7Frame & {
  night?: number;                                   // 0 day … 1 moonlit night
  cage?: { show?: boolean; lift?: number; pos?: V3; rot?: number; lid?: number };
  tackle?: boolean; dig?: number; mound?: number; coffin?: { show?: boolean; y?: number; open?: number };
  lanterns?: { p: V3; on?: number }[]; spade?: { p: V3; rot?: V3 }; cart?: { x: number; sack?: boolean };
  windows?: number; moon?: number; mist?: number; extra?: Light[];
};
export const GRAVE: V3 = [0, 0, 0], SCHOOL: V3 = [80, 0, 0];
const stoneTex = (base: string, seed: number, lichen = .5) => canvasTex(512, 512, g => { const R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2200; i++) { const v = R(); g.fillStyle = v < .5 ? `rgba(20,22,24,${R() * .12})` : `rgba(230,228,220,${R() * .1})`; g.fillRect(R() * 512, R() * 512, 2 + R() * 6, 2 + R() * 6); }
  for (let i = 0; i < 70 * lichen; i++) { const x = R() * 512, y = R() * 512, r = 6 + R() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = R() < .6 ? '150,160,90' : '200,190,120'; gr.addColorStop(0, `rgba(${c},.45)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(10,10,12,.35)'; g.lineWidth = 1; const x = R() * 512; g.beginPath(); g.moveTo(x, R() * 512); for (let k = 0; k < 4; k++) g.lineTo(x + (R() - .5) * 40, R() * 512); g.stroke(); }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(30,40,20,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
const rubbleTex = (seed: number) => canvasTex(1024, 512, g => { const R = rng(seed); g.fillStyle = '#4a4640'; g.fillRect(0, 0, 1024, 512);
  for (let y = 0; y < 512; y += 30 + R() * 8) for (let x = -20; x < 1024; x += 40 + R() * 50) { const w = 38 + R() * 52, h = 24 + R() * 12, v = 95 + R() * 55; g.fillStyle = `rgb(${v},${v * .97},${v * .92})`;
    g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + w - 2, y + 2 + R() * 3); g.lineTo(x + w - 3, y + h - 2); g.lineTo(x + 2, y + h - 3 - R() * 3); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 3, y + h - 7, w - 6, 4); }
  for (let i = 0; i < 60; i++) { const x = R() * 1024, y = R() * 512, r = 10 + R() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,130,70,.35)'); gr.addColorStop(1, 'rgba(120,130,70,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } });
const textTex = (txt: string, w = 1024, h = 128, col = '#2a2420', bg = '#bdb4a2') => canvasTex(w, h, g => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = col; g.font = `bold ${h * .62}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4); });
const prism = (w: number, h: number, d: number) => { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g; };
export class KirkEngine extends Core {
  G = new T.Group(); cage = new T.Group(); lid!: T.Mesh; tackle = new T.Group(); chain!: T.Mesh; block!: T.Mesh; coffin = new T.Group(); coffinLid!: T.Mesh; pit!: T.Mesh; heap!: T.Mesh; mound!: T.Mesh;
  skyU = { night: { value: 1 }, t: { value: 0 } }; sky!: T.Mesh;
  lanterns: T.Group[] = []; spade = new T.Group(); cart = new T.Group(); sack!: T.Mesh; winMat = glowMat('#ffb860'); moonM!: T.Mesh; mistU = { t: { value: 0 }, a: { value: 0 }, c: { value: new T.Color('#8a96aa') } };
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#8a9ab8', '#4a4a40'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G, R = rng(21);
    // ground with gentle swells, a worn path to the kirk door
    const gg = new T.PlaneGeometry(260, 260, 130, 130); gg.rotateX(-Math.PI / 2); { const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = Math.hypot(x, z); p.setY(i, d < 5 ? 0 : Math.sin(x * .13) * Math.cos(z * .11) * .25 * Math.min(1, (d - 5) / 8)); } gg.computeVertexNormals(); }
    const grass = canvasTex(1024, 1024, g => { const R2 = rng(4); g.fillStyle = '#3e4a2c'; g.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 11000; i++) { g.strokeStyle = `hsl(${68 + R2() * 30},${22 + R2() * 20}%,${16 + R2() * 22}%)`; g.lineWidth = 2; const x = R2() * 1024, y = R2() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R2() - .5) * 6, y - 6 - R2() * 10); g.stroke(); } });
    grass.wrapS = grass.wrapT = T.RepeatWrapping; grass.repeat.set(40, 40);
    const ground = new T.Mesh(gg, new T.MeshStandardMaterial({ map: grass, roughness: .97 })); ground.receiveShadow = true; G.add(ground);
    const dt = dirtTex(7, '#5a4c3c'); dt.wrapS = dt.wrapT = T.RepeatWrapping; dt.repeat.set(1, 8);
    const path = new T.Mesh(new T.PlaneGeometry(1.6, 30), new T.MeshStandardMaterial({ map: dt, roughness: 1 })); path.rotation.x = -Math.PI / 2; path.position.set(-3.2, .02, 0); path.receiveShadow = true; G.add(path);
    // headstones, crosses, table tombs (instanced, tilted with age)
    const stone = new T.MeshStandardMaterial({ map: stoneTex('#8a8880', 3), roughness: .92 }), dark = new T.MeshStandardMaterial({ map: stoneTex('#5e5c58', 5, .9), roughness: .95 });
    const slabs: { p: V3; s: V3; r?: V3 }[] = [], tops: { p: V3; r: number; h: number; rot?: V3 }[] = [], cross: { p: V3; s: V3; r?: V3 }[] = [], tabs: { p: V3; s: V3; r?: V3 }[] = [];
    for (let row = -4; row <= 4; row++) for (let col = -5; col <= 5; col++) {
      const x = col * 2.6 + (R() - .5) * .6, z = row * 3.2 + (R() - .5) * .5; if (Math.abs(x) < 2.2 && Math.abs(z) < 3.2) continue; if (x > -1.5 && x < 7 && z > -1 && z < 8) continue; if (Math.abs(x + 3.2) < 1.3) continue; if (R() < .22) continue;
      const k = R(), tilt: V3 = [(R() - .5) * .14, (R() - .5) * .2, (R() - .5) * .12], w = .55 + R() * .35, h = .7 + R() * .7;
      if (k < .5) { slabs.push({ p: [x, h / 2 - .05, z - 1.2], s: [w, h, .12], r: tilt }); if (R() < .6) tops.push({ p: [x, h - .05, z - 1.2], r: w / 2, h: .12, rot: [Math.PI / 2, 0, 0] }); }
      else if (k < .72) { cross.push({ p: [x, .55, z - 1.2], s: [.14, 1.1, .14], r: tilt }); cross.push({ p: [x, .78, z - 1.2], s: [.55, .13, .13], r: tilt }); cross.push({ p: [x, .05, z - 1.2], s: [.4, .12, .3] }); }
      else { tabs.push({ p: [x, .45, z], s: [1.0, .07, 2.0], r: [0, tilt[1] * .3, 0] }); for (const [dx, dz] of [[-.4, -.85], [.4, -.85], [-.4, .85], [.4, .85]]) tabs.push({ p: [x + dx, .21, z + dz], s: [.12, .42, .12] }); }
    }
    boxes(G, stone, slabs); cyls(G, stone, tops, 16); boxes(G, dark, cross); boxes(G, stone, tabs);
    // the kirk: rubble walls, slate roof, tower with broach spire, lancet windows
    const wallT = rubbleTex(8); wallT.wrapS = wallT.wrapT = T.RepeatWrapping; wallT.repeat.set(4, 2); const wallM = new T.MeshStandardMaterial({ map: wallT, roughness: .95 });
    const slate = new T.MeshStandardMaterial({ color: '#3a3e46', roughness: .7, metalness: .1 });
    const kirk = new T.Group(); kirk.position.set(-6, 0, -16); G.add(kirk);
    boxes(kirk, wallM, [{ p: [0, 3, 0], s: [8, 6, 16] }, { p: [0, 6, -9.5], s: [4.4, 12, 4.4] }]);
    const roof = new T.Mesh(prism(8.8, 4.2, 16.6), slate); roof.position.set(0, 6, 0); roof.castShadow = true; kirk.add(roof);
    const spire = new T.Mesh(new T.ConeGeometry(3.2, 7.5, 4), slate); spire.position.set(0, 15.7, -9.5); spire.rotation.y = Math.PI / 4; spire.castShadow = true; kirk.add(spire);
    const lancet = new T.Shape(); lancet.moveTo(-.45, 0); lancet.lineTo(-.45, 1.6); lancet.quadraticCurveTo(-.45, 2.3, 0, 2.6); lancet.quadraticCurveTo(.45, 2.3, .45, 1.6); lancet.lineTo(.45, 0); const lg = new T.ShapeGeometry(lancet);
    for (const z of [-5, -1.5, 2, 5.5]) for (const s of [-1, 1]) { const m = new T.Mesh(lg, this.winMat); m.position.set(s * 4.02, 2, z); m.rotation.y = s * Math.PI / 2; kirk.add(m); }
    { const m = new T.Mesh(lg, this.winMat); m.position.set(0, 7.5, -7.27); kirk.add(m); }
    const door = new T.Mesh(new T.PlaneGeometry(1.4, 2.4), new T.MeshStandardMaterial({ map: woodTex('#3a2a1e', 3), roughness: .8 })); door.position.set(2.8, 1.2, 8.02); kirk.add(door);
    // boundary dyke + iron gate, watch-house
    const dyke: { p: V3; s: V3 }[] = [{ p: [0, .8, -24], s: [48, 1.6, .6] }, { p: [-24, .8, 0], s: [.6, 1.6, 48] }, { p: [24, .8, 0], s: [.6, 1.6, 48] }, { p: [-13.5, .8, 24], s: [21, 1.6, .6] }, { p: [11, .8, 24], s: [26, 1.6, .6] }];
    boxes(G, wallM, dyke); boxes(G, dark, dyke.map(d => ({ p: [d.p[0], 1.66, d.p[2]] as V3, s: [d.s[0] + .1, .14, d.s[2] + .1] as V3 })));
    const iron = new T.MeshStandardMaterial({ color: '#26252a', roughness: .5, metalness: .7, envMapIntensity: .5 });
    cyls(G, iron, Array.from({ length: 13 }, (_, i) => ({ p: [-3.2 + (i - 6) * .14, .95, 24] as V3, r: .018, h: 1.9 })), 6); boxes(G, iron, [{ p: [-3.2, 1.7, 24], s: [1.9, .05, .05] }, { p: [-3.2, .35, 24], s: [1.9, .05, .05] }]);
    boxes(G, wallM, [{ p: [-4.4, 1.1, 24], s: [.5, 2.2, .7] }, { p: [-2, 1.1, 24], s: [.5, 2.2, .7] }]);
    const wh = new T.Group(); wh.position.set(12, 0, -14); G.add(wh); boxes(wh, wallM, [{ p: [0, 1.4, 0], s: [3.4, 2.8, 3.4] }]); const whr = new T.Mesh(new T.ConeGeometry(2.7, 1.6, 4), slate); whr.position.y = 3.6; whr.rotation.y = Math.PI / 4; whr.castShadow = true; wh.add(whr);
    { const m = new T.Mesh(new T.PlaneGeometry(.6, .7), this.winMat); m.position.set(-1.72, 1.7, .4); m.rotation.y = -Math.PI / 2; wh.add(m); }
    // bare trees (recursive branches)
    const bark = new T.MeshStandardMaterial({ map: woodTex('#2e2822', 9), roughness: 1 }); const br: { p: V3; r: number; h: number; rot?: V3 }[] = [];
    const branch = (o: T.Vector3, dir: T.Vector3, len: number, rad: number, lvl: number) => { const e = o.clone().addScaledVector(dir, len); const mid = o.clone().add(e).multiplyScalar(.5);
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir); const eu = new T.Euler().setFromQuaternion(q); br.push({ p: [mid.x, mid.y, mid.z], r: rad, h: len, rot: [eu.x, eu.y, eu.z] });
      if (lvl > 0) for (let k = 0; k < (lvl > 2 ? 2 : 3); k++) { const d2 = dir.clone().add(new T.Vector3((R() - .5) * 1.4, R() * .5, (R() - .5) * 1.4)).normalize(); branch(e, d2, len * (.62 + R() * .15), rad * .62, lvl - 1); } };
    for (const [x, z] of [[-14, -6], [15, 6], [9, -20], [-18, 14], [19, -10]]) branch(new T.Vector3(x, 0, z), new T.Vector3(0, 1, 0), 4.2, .34, 4);
    cyls(G, bark, br, 7, .7);
    // the fresh grave: mound / open pit / soil heap
    const soil = new T.MeshStandardMaterial({ map: dirtTex(11, '#4a3a2a'), roughness: 1 });
    this.mound = new T.Mesh(rockify(new T.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), .12, 3, 4), soil); this.mound.scale.set(.62, .28, 1.15); this.mound.receiveShadow = this.mound.castShadow = true; G.add(this.mound);
    this.pit = new T.Mesh(new T.CircleGeometry(1, 32), new T.MeshBasicMaterial({ color: '#0c0a08' })); this.pit.rotation.x = -Math.PI / 2; this.pit.position.set(0, .03, -.55); this.pit.scale.set(.5, .7, 1); G.add(this.pit);
    this.heap = new T.Mesh(rockify(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), .15, 2.5, 9), soil); this.heap.position.set(1.4, 0, -.7); this.heap.castShadow = true; G.add(this.heap);
    const hs = new T.Mesh(new T.BoxGeometry(.8, 1.2, .14), stone); hs.position.set(0, .55, -1.55); hs.castShadow = true; G.add(hs); const hst = new T.Mesh(new T.CylinderGeometry(.4, .4, .14, 20), stone); hst.rotation.x = Math.PI / 2; hst.position.set(0, 1.15, -1.55); G.add(hst);
    // MORTSAFE: wrought-iron cage with spear finials and lifting rings (local origin = ground centre)
    const W = 1.15, L = 2.3, H = 1.05; const bars: { p: V3; r: number; h: number }[] = [], tips: { p: V3; r: number; h: number }[] = [];
    for (let x = -W / 2; x <= W / 2 + .01; x += W / 8) for (const z of [-L / 2, L / 2]) { bars.push({ p: [x, H / 2, z], r: .022, h: H }); tips.push({ p: [x, H + .09, z], r: .045, h: .18 }); }
    for (let z = -L / 2 + L / 14; z < L / 2 - .01; z += L / 14) for (const x of [-W / 2, W / 2]) { bars.push({ p: [x, H / 2, z], r: .022, h: H }); tips.push({ p: [x, H + .09, z], r: .045, h: .18 }); }
    cyls(this.cage, iron, bars, 6); cyls(this.cage, iron, tips, 4, 0);
    const rails: { p: V3; s: V3 }[] = []; for (const y of [.06, H * .55, H - .03]) { rails.push({ p: [0, y, -L / 2], s: [W + .06, .06, .05] }, { p: [0, y, L / 2], s: [W + .06, .06, .05] }, { p: [-W / 2, y, 0], s: [.05, .06, L + .06] }, { p: [W / 2, y, 0], s: [.05, .06, L + .06] }); }
    for (let z = -L / 2; z <= L / 2 + .01; z += L / 7) rails.push({ p: [0, H - .03, z], s: [W, .045, .045] }); for (let x = -W / 2; x <= W / 2 + .01; x += W / 4) rails.push({ p: [x, H - .03, 0], s: [.045, .045, L] });
    boxes(this.cage, iron, rails);
    for (const z of [-L / 2 - .06, L / 2 + .06]) { const ring = new T.Mesh(new T.TorusGeometry(.12, .022, 8, 20), iron); ring.position.set(0, H + .02, z); ring.castShadow = true; this.cage.add(ring); }
    this.lid = new T.Mesh(new T.BoxGeometry(W - .05, .06, L - .05), new T.MeshStandardMaterial({ color: '#2e2c2a', roughness: .65, metalness: .6, map: stoneTex('#3a3836', 13, 0) })); this.lid.position.y = .04; this.lid.castShadow = true; this.cage.add(this.lid);
    this.cage.traverse(o => { o.castShadow = true; }); G.add(this.cage);
    // sheerlegs: three poles, block, chain
    const pole = new T.MeshStandardMaterial({ map: woodTex('#6a5a44', 12), roughness: .85 }); const top = new T.Vector3(0, 3.6, 0); const legs: { p: V3; r: number; h: number; rot?: V3 }[] = [];
    for (const [x, z] of [[-1.7, -1.9], [1.7, -1.9], [0, 2.2]]) { const b = new T.Vector3(x, 0, z), d = top.clone().sub(b); const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); const e = new T.Euler().setFromQuaternion(q); const m = b.clone().add(top).multiplyScalar(.5); legs.push({ p: [m.x, m.y, m.z], r: .07, h: d.length(), rot: [e.x, e.y, e.z] }); }
    cyls(this.tackle, pole, legs, 8, .8); this.block = new T.Mesh(new T.BoxGeometry(.2, .32, .14), iron); this.tackle.add(this.block);
    this.chain = new T.Mesh(new T.CylinderGeometry(.025, .025, 1, 6), new T.MeshStandardMaterial({ color: '#5a5650', roughness: .4, metalness: .9, map: canvasTex(16, 64, g => { g.fillStyle = '#6a6660'; g.fillRect(0, 0, 16, 64); g.fillStyle = '#1a1a1a'; for (let y = 0; y < 64; y += 8) g.fillRect(4, y + 2, 8, 4); }) }));
    this.tackle.add(this.chain); this.tackle.traverse(o => { o.castShadow = true; }); G.add(this.tackle);
    // coffin (elongated hexagon) with brass handles
    const cs = new T.Shape(); cs.moveTo(-.24, -.95); cs.lineTo(.24, -.95); cs.lineTo(.33, .45); cs.lineTo(.22, .95); cs.lineTo(-.22, .95); cs.lineTo(-.33, .45); cs.closePath();
    const cw = new T.MeshStandardMaterial({ map: woodTex('#4a3020', 14), roughness: .55 }); const cb = new T.Mesh(new T.ExtrudeGeometry(cs, { depth: .34, bevelEnabled: true, bevelSize: .015, bevelThickness: .015 }), cw); cb.rotation.x = -Math.PI / 2; cb.castShadow = true; this.coffin.add(cb);
    this.coffinLid = new T.Mesh(new T.ExtrudeGeometry(cs, { depth: .05, bevelEnabled: true, bevelSize: .02, bevelThickness: .015 }), cw); this.coffinLid.rotation.x = -Math.PI / 2; this.coffinLid.position.y = .35; this.coffin.add(this.coffinLid);
    cyls(this.coffin, new T.MeshStandardMaterial({ color: '#b89040', metalness: .9, roughness: .3 }), [-.5, 0, .5].flatMap(z => [{ p: [-.32, .2, z] as V3, r: .02, h: .16, rot: [Math.PI / 2, 0, 0] as V3 }, { p: [.32, .2, z] as V3, r: .02, h: .16, rot: [Math.PI / 2, 0, 0] as V3 }]), 6);
    G.add(this.coffin);
    // lanterns (pool) and a wooden spade
    for (let i = 0; i < 4; i++) { const l = new T.Group(); boxes(l, iron, [{ p: [0, .02, 0], s: [.2, .03, .2] }, { p: [0, .32, 0], s: [.22, .04, .22] }, ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ({ p: [a * .09, .17, b * .09] as V3, s: [.02, .3, .02] as V3 }))]);
      const gl = new T.Mesh(new T.CylinderGeometry(.06, .07, .22, 10), glowMat('#ffc070')); gl.position.y = .16; gl.name = 'g'; l.add(gl); const hd = new T.Mesh(new T.TorusGeometry(.07, .01, 6, 12, Math.PI), iron); hd.position.y = .38; l.add(hd); G.add(l); this.lanterns.push(l); }
    boxes(this.spade, pole, [{ p: [0, .55, 0], s: [.04, 1.1, .04] }, { p: [0, 1.1, 0], s: [.16, .04, .04] }]); boxes(this.spade, new T.MeshStandardMaterial({ map: woodTex('#8a7050', 15), roughness: .8 }), [{ p: [0, -.1, 0], s: [.2, .3, .025] }]); G.add(this.spade);
    // handcart with a canvas sack
    const cartW = new T.MeshStandardMaterial({ map: woodTex('#5a4632', 16), roughness: .85 }); boxes(this.cart, cartW, [{ p: [0, .7, 0], s: [1.6, .08, 1.0] }, { p: [0, .85, -.5], s: [1.6, .3, .05] }, { p: [0, .85, .5], s: [1.6, .3, .05] }, { p: [1.3, .72, -.35], s: [1.2, .05, .05] }, { p: [1.3, .72, .35], s: [1.2, .05, .05] }]);
    for (const z of [-.6, .6]) { const wl = new T.Mesh(new T.TorusGeometry(.42, .05, 6, 20), cartW); wl.position.set(-.2, .45, z); this.cart.add(wl); cyls(this.cart, cartW, Array.from({ length: 8 }, (_, k) => ({ p: [-.2, .45, z] as V3, r: .02, h: .8, rot: [0, 0, k / 8 * Math.PI] as V3 })), 5); }
    this.sack = new T.Mesh(rockify(new T.CapsuleGeometry(.28, 1.0, 6, 12), .1, 2.2, 3), new T.MeshStandardMaterial({ color: '#8a7a5c', roughness: 1, map: woodTex('#8a7a5c', 17, 64, 256) })); this.sack.rotation.z = Math.PI / 2; this.sack.position.set(0, 1.0, 0); this.cart.add(this.sack);
    this.cart.traverse(o => { o.castShadow = true; }); G.add(this.cart);
    // the anatomy school (east): ashlar front, steps, columns, pediment, name band, cobbles, a gas-less oil lamp
    const ash = brickTex('#a8a090', 18, '#8a8476'); ash.wrapS = ash.wrapT = T.RepeatWrapping; ash.repeat.set(6, 4); const ashM = new T.MeshStandardMaterial({ map: ash, roughness: .9 });
    const S = new T.Group(); S.position.set(...SCHOOL); G.add(S); boxes(S, ashM, [{ p: [0, 5, -6], s: [22, 10, 6] }, { p: [0, .25, -2.2], s: [9, .5, 2.4] }, { p: [0, .55, -2.6], s: [8, .3, 1.6] }, { p: [0, 8.4, -2.4], s: [9.4, .6, 1.4] }]);
    cyls(S, ashM, [-3.4, -1.15, 1.15, 3.4].map(x => ({ p: [x, 4.4, -2.3] as V3, r: .38, h: 7.6 })), 18, .9);
    const ped = new T.Mesh(prism(9.6, 2.2, 1.4), ashM); ped.position.set(0, 8.7, -2.4); S.add(ped);
    const band = new T.Mesh(new T.PlaneGeometry(7, .5), new T.MeshStandardMaterial({ map: textTex('SCHOOL OF ANATOMY'), roughness: .9 })); band.position.set(0, 8.4, -1.69); S.add(band);
    for (const x of [-8.5, -6, 6, 8.5]) for (const y of [2.6, 6.4]) { const m = new T.Mesh(new T.PlaneGeometry(1.2, 2), this.winMat); m.position.set(x, y, -2.99); S.add(m); }
    const sd = new T.Mesh(new T.PlaneGeometry(1.8, 3.2), new T.MeshStandardMaterial({ map: woodTex('#2a2018', 19), roughness: .7 })); sd.position.set(0, 2.3, -2.98); S.add(sd);
    const cob = canvasTex(512, 512, g => { const R2 = rng(22); g.fillStyle = '#3a3836'; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 32) for (let x = 0; x < 512; x += 40) { const v = 70 + R2() * 50; g.fillStyle = `rgb(${v},${v * .97},${v * .94})`; g.beginPath(); g.ellipse(x + (y / 32 % 2) * 20 + 20, y + 16, 18, 13, 0, 0, 7); g.fill(); } });
    cob.wrapS = cob.wrapT = T.RepeatWrapping; cob.repeat.set(10, 4); const street = new T.Mesh(new T.PlaneGeometry(40, 16), new T.MeshStandardMaterial({ map: cob, roughness: .6 })); street.rotation.x = -Math.PI / 2; street.position.set(SCHOOL[0], .015, 5); street.receiveShadow = true; G.add(street);
    this.sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float night, t; varying vec3 vD; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); }' +
        'float fb(vec2 p){ float v = 0., a = .5; for(int i=0;i<5;i++){ v += a*n(p); p *= 2.1; a *= .5; } return v; }' +
        'void main(){ float y = max(vD.y, 0.); vec2 q = vD.xz / (vD.y + .15) * 1.6 + vec2(t * .01, 0.); float cl = smoothstep(.45, .8, fb(q));' +
        'vec3 day = mix(vec3(.78,.82,.86), vec3(.48,.6,.78), pow(y, .6)); day = mix(day, vec3(.9,.9,.92), cl * .7);' +
        'vec3 nig = mix(vec3(.07,.09,.15), vec3(.02,.03,.07), pow(y, .5)); nig = mix(nig, vec3(.16,.18,.26), cl * .55); float st = step(.997, h(floor(vD.xz * 420. / (vD.y + .2)))) * (1. - cl) * smoothstep(.05,.3,y); nig += st * .8;' +
        'gl_FragColor = vec4(mix(day, nig, night), 1.); }' })); this.sky.renderOrder = -10; G.add(this.sky);
    // moon + low mist
    this.moonM = new T.Mesh(new T.CircleGeometry(9, 40), new T.MeshBasicMaterial({ color: '#e8ecf4', toneMapped: false, fog: false, transparent: true })); this.moonM.position.set(-70, 80, -260); G.add(this.moonM);
    const mist = new T.Mesh(new T.PlaneGeometry(120, 120), new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: this.mistU,
      vertexShader: 'varying vec2 vU; varying vec3 vW; void main(){ vU = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float t, a; uniform vec3 c; varying vec2 vU; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); }' +
        'void main(){ vec2 p = vW.xz * .12 + vec2(t * .05, t * .02); float m = n(p) * .6 + n(p * 2.3) * .4; float e = smoothstep(.0,.25,vU.x)*smoothstep(1.,.75,vU.x)*smoothstep(.0,.25,vU.y)*smoothstep(1.,.75,vU.y); gl_FragColor = vec4(c, a * m * e * .55); }' }));
    mist.rotation.x = -Math.PI / 2; mist.position.y = .35; mist.renderOrder = 5; G.add(mist);
  }
  async render(F: KirkFrame, frame: number) {
    const nt = clamp(F.night ?? 1); const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])]; const S: Sprite[] = [...(F.sprites ?? [])];
    this.winMat.color.setRGB(1.0 * (F.windows ?? nt * .8), .72 * (F.windows ?? nt * .8), .38 * (F.windows ?? nt * .8));
    (this.moonM.material as T.MeshBasicMaterial).opacity = (F.moon ?? nt); this.moonM.lookAt(this.cam.position);
    this.mistU.t.value = F.t; this.skyU.night.value = nt; this.skyU.t.value = F.t; this.mistU.a.value = F.mist ?? nt * .8;
    const cg = F.cage ?? {}; this.cage.visible = cg.show ?? true; const cp = cg.pos ?? GRAVE; this.cage.position.set(cp[0], cp[1] + (cg.lift ?? 0), cp[2]); this.cage.rotation.y = cg.rot ?? 0; this.lid.visible = (cg.lid ?? 0) > 0;
    this.tackle.visible = !!F.tackle; const topY = 3.45; this.block.position.set(cp[0], topY, cp[2]); this.chain.position.set(cp[0], (topY + this.cage.position.y + 1.08) / 2, cp[2]); this.chain.scale.y = Math.max(.05, topY - this.cage.position.y - 1.08);
    const dg = clamp(F.dig ?? 0); this.pit.visible = dg > .01; this.pit.scale.set(.25 + .3 * dg, .35 + .45 * dg, 1); this.heap.visible = dg > .01; this.heap.scale.set(.5 * dg + .1, .35 * dg + .05, .6 * dg + .1);
    this.mound.visible = (F.mound ?? 1) > 0; this.mound.scale.y = .28 * (F.mound ?? 1);
    const cf = F.coffin; this.coffin.visible = !!cf?.show; if (cf) { this.coffin.position.set(GRAVE[0], cf.y ?? -.4, GRAVE[2]); this.coffinLid.position.y = .35 + (cf.open ?? 0) * .4; this.coffinLid.rotation.z = (cf.open ?? 0) * .3; }
    this.lanterns.forEach((l, i) => { const d = F.lanterns?.[i]; l.visible = !!d; if (!d) return; l.position.set(...d.p); const on = d.on ?? 1; ((l.getObjectByName('g') as T.Mesh).material as T.MeshBasicMaterial).color.setRGB(1.6 * on, 1.05 * on, .5 * on);
      const fl = .9 + Math.sin(F.t * 13 + i * 3) * .06 + Math.sin(F.t * 31 + i) * .04; L.push({ p: [d.p[0], d.p[1] + .2, d.p[2]], c: [1, .66, .32], i: 7 * on * fl, d: 9 }); });
    this.spade.visible = !!F.spade; if (F.spade) { this.spade.position.set(...F.spade.p); this.spade.rotation.set(...(F.spade.rot ?? [0, 0, 0])); }
    this.cart.visible = !!F.cart; if (F.cart) { this.cart.position.set(F.cart.x, 0, SCHOOL[2] + 3); this.sack.visible = !!F.cart.sack; }
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
void lerp;
