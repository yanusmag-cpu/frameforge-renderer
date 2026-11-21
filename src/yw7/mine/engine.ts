// YunoWorld v7 · Film 1 "The Bird That Could Save an Entire Mine" — environment engine.
// A British coal-mine roadway (c. 1900–1950s): rock tunnel with displaced walls, coal seams and wet floor; timber sets every
// 2.4 m with lagging boards and wedges; rails on sleepers; riveted coal tubs; hanging safety lamps; tools, brattice cloth,
// water barrel; a working coal face; the brass canary cage (wire dome, perch, door) and the rescue-team resuscitator box
// (glass front, round door, oxygen cylinder and valve). Warm lamp light against blue-grey shadow.
import * as T from 'three';
import { Core, Builder, M, rng, canvasTex, clamp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, rockTex, dirtTex, metalTex, boxes, cyls, glowMat, rockify, type V7Frame } from '../kit7.ts';

export type BirdState = 'perch' | 'chirp' | 'pant' | 'sway' | 'fall' | 'down' | 'revive';
export type MineFrame = V7Frame & {
  cage?: { pos: V3; rotY?: number; swing?: number; scale?: number; door?: number };          // brass wire cage
  box?: { pos: V3; rotY?: number; door?: number; valve?: number; o2?: number; scale?: number }; // resuscitator
  bird?: { state: BirdState; k?: number; inBox?: boolean };
  lampsOn?: number; dust?: number; extra?: Light[]; haldane?: boolean;
};
export const FACE_Z = -46;
// ------------------------------------------------------------------ bird art (2D cut-out, YunoWorld ink style)
function birdTex(state: BirdState) { return canvasTex(512, 512, g => {
  g.clearRect(0, 0, 512, 512); g.lineJoin = 'round'; g.lineCap = 'round'; const INK = '#1d1410';
  g.save(); g.translate(256, 300);
  const rot = state === 'down' ? -1.45 : state === 'fall' ? -.6 : state === 'sway' ? -.18 : 0; g.rotate(rot);
  const body = g.createLinearGradient(-90, -120, 90, 80); body.addColorStop(0, '#fff07a'); body.addColorStop(.55, '#ffd23a'); body.addColorStop(1, '#e8a21a');
  // tail
  g.fillStyle = '#e9b52a'; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(-60, 20); g.quadraticCurveTo(-150, 60, -170, 110); g.quadraticCurveTo(-120, 100, -40, 56); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = '#b88214'; g.lineWidth = 4; for (const k of [0, 1]) { g.beginPath(); g.moveTo(-70, 40 + k * 10); g.quadraticCurveTo(-120, 70 + k * 12, -150, 100 + k * 6); g.stroke(); }
  // body
  g.fillStyle = body; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.ellipse(0, 0, 100, 82, -.35, 0, 7); g.fill(); g.stroke();
  // belly highlight
  g.fillStyle = 'rgba(255,250,210,.7)'; g.beginPath(); g.ellipse(30, 30, 50, 36, -.4, 0, 7); g.fill();
  // head
  g.fillStyle = body; g.beginPath(); g.arc(70, -86, 62, 0, 7); g.fill(); g.lineWidth = 10; g.stroke();
  // wing with feather layers
  g.fillStyle = '#f2c02a'; g.lineWidth = 8; g.beginPath(); g.moveTo(-60, -20); g.quadraticCurveTo(10, -50, 50, 0); g.quadraticCurveTo(10, 60, -70, 50); g.quadraticCurveTo(-90, 20, -60, -20); g.fill(); g.stroke();
  g.strokeStyle = '#c8901a'; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-50 + k * 8, 10 + k * 12); g.quadraticCurveTo(-10, 0 + k * 14, 30, 6 + k * 10); g.stroke(); }
  // beak
  g.fillStyle = '#ff9a3a'; g.strokeStyle = INK; g.lineWidth = 7;
  if (state === 'chirp' || state === 'pant' || state === 'revive') { g.beginPath(); g.moveTo(118, -100); g.lineTo(160, -96); g.lineTo(122, -84); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(120, -80); g.lineTo(152, -66); g.lineTo(118, -70); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(118, -96); g.lineTo(162, -84); g.lineTo(118, -74); g.closePath(); g.fill(); g.stroke(); }
  // eye
  if (state === 'down') { g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(74, -100); g.lineTo(100, -84); g.moveTo(100, -100); g.lineTo(74, -84); g.stroke(); }
  else { const wide = state === 'fall' || state === 'sway'; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(86, -96, wide ? 22 : 18, wide ? 24 : 20, 0, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(state === 'sway' ? 82 : 90, state === 'sway' ? -90 : -96, wide ? 7 : 11, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(93, -100, 4, 0, 7); g.fill();
    if (state === 'pant' || state === 'sway') { g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.moveTo(64, -122); g.lineTo(104, -128); g.stroke(); } }
  g.fillStyle = 'rgba(255,120,90,.45)'; g.beginPath(); g.ellipse(108, -66, 14, 9, 0, 0, 7); g.fill();
  // legs
  if (state !== 'down') { g.strokeStyle = '#d87a3a'; g.lineWidth = 8; g.beginPath(); g.moveTo(-10, 78); g.lineTo(-18, 120); g.moveTo(20, 74); g.lineTo(20, 120); g.moveTo(-30, 120); g.lineTo(-4, 120); g.moveTo(8, 120); g.lineTo(34, 120); g.stroke(); }
  g.restore();
  if (state === 'chirp' || state === 'revive') { g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 6; g.font = '900 72px Arial'; g.strokeText('♪', 400, 120); g.fillText('♪', 400, 120); }
}, true); }

export class MineEngine extends Core {
  G = new T.Group(); lamps: V3[] = []; cage = new T.Group(); cageDoor = new T.Group(); box = new T.Group(); boxDoor = new T.Group(); valve!: T.Mesh; o2!: T.Mesh;
  bird: T.Mesh; birdTex: Record<BirdState, T.Texture>; lampGlows: T.Mesh[] = [];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#1a1c2a', '#141418'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G; const R = rng(5);
    // ---- tunnel shell: arched profile extruded along -z, displaced into rock, UV-mapped for the strata texture
    const prof: [number, number][] = []; const ctrl: [number, number][] = [[2.15, -.05], [2.35, 1.0], [2.2, 2.2], [1.6, 3.0], [.7, 3.35], [0, 3.42]];
    const full = [...ctrl, ...ctrl.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])];
    for (let i = 0; i < full.length - 1; i++) for (let k = 0; k < 4; k++) { const a = full[i], b = full[i + 1], u = k / 4; prof.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } prof.push(full[full.length - 1]);
    const Z0 = 10, Z1 = -64, step = .3, nz = Math.round((Z0 - Z1) / step);
    const pos: number[] = [], uv: number[] = [], idx: number[] = []; let acc = 0; const plen = [0]; for (let i = 1; i < prof.length; i++) { acc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]); plen.push(acc); }
    for (let j = 0; j <= nz; j++) { const z = Z0 - j * step; for (let i = 0; i < prof.length; i++) { pos.push(prof[i][0], prof[i][1], z); uv.push(plen[i] / 3, z / 3); } }
    const W = prof.length; for (let j = 0; j < nz; j++) for (let i = 0; i < W - 1; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
    rockify(tg, .55, 1.1, 3);
    const rock = rockTex(7, .4); rock.repeat.set(1, 1);
    const shell = new T.Mesh(tg, new T.MeshStandardMaterial({ map: rock, roughness: .6, metalness: .05, side: T.DoubleSide, color: '#e6dcd4' })); shell.receiveShadow = true; shell.castShadow = true; G.add(shell);
    const floorG = new T.PlaneGeometry(4.6, Z0 - Z1, 24, 300); floorG.rotateX(-Math.PI / 2); floorG.translate(0, 0, (Z0 + Z1) / 2);
    { const p = floorG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.abs(x) > 1.0 ? (Math.abs(x) - 1) * .12 + Math.sin(z * 1.7 + x * 3) * .03 : -.02 + Math.sin(z * 3.1) * .01); } floorG.computeVertexNormals(); }
    const dirt = dirtTex(4); dirt.repeat.set(2, 30);
    const floor = new T.Mesh(floorG, new T.MeshStandardMaterial({ map: dirt, roughness: .55, metalness: .05 })); floor.receiveShadow = true; G.add(floor);
    // ---- timber sets with lagging and wedges
    const wood = new T.MeshStandardMaterial({ map: woodTex('#8a6238', 2), roughness: .85 }); const wood2 = new T.MeshStandardMaterial({ map: woodTex('#6e4c2c', 9), roughness: .9 });
    const legs: { p: V3; r: number; h: number; rot?: V3 }[] = [], caps: { p: V3; s: V3; r?: V3 }[] = [], lag: { p: V3; s: V3; r?: V3 }[] = [];
    for (let z = 8; z > Z1 + 4; z -= 2.4) { const j = (R() - .5) * .05;
      for (const sx of [-1, 1]) legs.push({ p: [sx * 1.85, 1.38, z + j], r: .14, h: 2.8, rot: [(R() - .5) * .04, 0, sx * .07] });
      caps.push({ p: [0, 2.82, z], s: [4.3, .28, .3], r: [0, 0, (R() - .5) * .03] });
      for (let k = 0; k < 7; k++) lag.push({ p: [-1.6 + k * .53, 3.0, z - 1.2], s: [.16, .06, 2.3], r: [0, 0, (R() - .5) * .1] });
      if (R() > .4) caps.push({ p: [-1.62, 2.64, z + .02], s: [.2, .14, .34] }); }
    cyls(G, wood, legs, 9, .88); boxes(G, wood, caps); boxes(G, wood2, lag);
    // ---- rails + sleepers
    const sleepers: { p: V3; s: V3; r?: V3 }[] = []; for (let z = 9; z > Z1; z -= .65) sleepers.push({ p: [0, .05, z], s: [1.7, .1, .24], r: [0, (R() - .5) * .05, 0] }); boxes(G, wood2, sleepers);
    const steel = new T.MeshStandardMaterial({ color: '#8a8a90', roughness: .35, metalness: .85 }); boxes(G, steel, [-.56, .56].map(x => ({ p: [x, .14, (Z0 + Z1) / 2] as V3, s: [.07, .1, Z0 - Z1] as V3 })));
    // ---- coal tubs (riveted steel, banded, spoked wheels, heaped coal)
    const tubM = new T.MeshStandardMaterial({ map: metalTex('#5a5c60', 3), roughness: .55, metalness: .6 }); const coalM = new T.MeshStandardMaterial({ color: '#16151a', roughness: .35, metalness: .2, flatShading: true });
    const tubs: V3[] = [[0, 0, -14], [0, 0, -16.2], [0, 0, -30]];
    for (const [x, , z] of tubs) { const t = new T.Group(); t.position.set(x, 0, z); G.add(t);
      const body = new T.Mesh(new T.CylinderGeometry(.82, .7, .78, 4, 1, true), tubM); body.rotation.y = Math.PI / 4; body.scale.set(1, 1, 1.5); body.position.y = .82; body.castShadow = true; t.add(body);
      const bot = new T.Mesh(new T.BoxGeometry(.98, .06, 1.48), tubM); bot.position.y = .44; t.add(bot);
      for (const yy of [.58, 1.18]) { const band = new T.Mesh(new T.TorusGeometry(.62, .03, 4, 4), steel); band.rotation.set(Math.PI / 2, 0, Math.PI / 4); band.scale.set(1, 1.5, 1); band.position.y = yy; t.add(band); }
      const heap = rockify(new T.SphereGeometry(.62, 14, 10, 0, 6.28, 0, Math.PI / 2), .25, 4, z); const hm = new T.Mesh(heap, coalM); hm.scale.set(1, .5, 1.45); hm.position.y = 1.14; t.add(hm);
      for (const wx of [-.48, .48]) for (const wz of [-.45, .45]) { const wh = new T.Mesh(new T.CylinderGeometry(.21, .21, .08, 18), new T.MeshStandardMaterial({ map: canvasTex(128, 128, g => { g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#141416'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke(); g.lineWidth = 7; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(k) * 52, 64 + Math.sin(k) * 52); g.stroke(); } }), roughness: .5, metalness: .6 }));
        wh.rotation.z = Math.PI / 2; wh.position.set(wx * 1.1, .21, wz); t.add(wh); } }
    // ---- hanging safety lamps (brass + glass glow)
    const brass = new T.MeshStandardMaterial({ color: '#9a7434', roughness: .5, metalness: .65, envMapIntensity: .5 });
    for (let z = 6.8; z > Z1 + 6; z -= 4.8) { const p: V3 = [1.25, 2.28, z]; this.lamps.push(p);
      const top = new T.Mesh(new T.ConeGeometry(.09, .12, 10), brass); top.position.set(p[0], p[1] + .2, p[2]); G.add(top);
      const gl = new T.Mesh(new T.CylinderGeometry(.065, .065, .17, 10), glowMat('#ffcf7a')); gl.position.set(...p); G.add(gl); this.lampGlows.push(gl);
      const bot = new T.Mesh(new T.CylinderGeometry(.09, .1, .08, 10), brass); bot.position.set(p[0], p[1] - .12, p[2]); G.add(bot);
      const wire = new T.Mesh(new T.CylinderGeometry(.006, .006, .34, 4), steel); wire.position.set(p[0], p[1] + .42, p[2]); G.add(wire); }
    // ---- dressing: tools, barrel, brattice cloth, ventilation door, signboard, cables, props
    const b = new Builder();
    for (const [z, k] of [[3.5, 0], [-9, 1], [-21, 0], [-38, 1]] as const) { b.cyl(.025, .03, 1.3, [-1.7, .65, z], '#7a5a32', 6, [0, 0, .25]); b.box(.42, .08, .05, [-1.55, 1.28, z], '#5a5e64', [0, 0, .25]); if (k) { b.cyl(.025, .03, 1.2, [-1.6, .6, z + .4], '#7a5a32', 6, [0, 0, .3]); b.box(.24, .03, .3, [-1.43, 1.15, z + .4], '#6a6e74', [0, 0, .3]); } }
    b.cyl(.32, .3, .8, [1.7, .4, 1.4], '#6a4a2a', 14); b.add(new T.TorusGeometry(.32, .025, 4, 18), M([1.7, .2, 1.4], [Math.PI / 2, 0, 0]), '#3a3a3a'); b.add(new T.TorusGeometry(.32, .025, 4, 18), M([1.7, .62, 1.4], [Math.PI / 2, 0, 0]), '#3a3a3a');
    for (let i = 0; i < 6; i++) b.add(new T.DodecahedronGeometry(.18 + R() * .2, 0), M([(R() > .5 ? 1 : -1) * (1.6 + R() * .3), .1, -R() * 50], [R(), R(), R()], [1, .6, 1]), '#2a2830');
    G.add(b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: .2 })));
    const brat = new T.Mesh(new T.PlaneGeometry(1.4, 2.4, 6, 10), new T.MeshStandardMaterial({ map: canvasTex(256, 384, g => { g.fillStyle = '#8a7a5a'; g.fillRect(0, 0, 256, 384); const R2 = rng(2); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,24,16,${R2() * .2})`; g.fillRect(R2() * 256, R2() * 384, 2 + R2() * 20, 2); } for (let x = 0; x < 256; x += 6) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, 0, 2, 384); } }), side: T.DoubleSide, roughness: .95 }));
    { const p = brat.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * .05 + Math.sin(p.getY(i) * 2) * .03); brat.geometry.computeVertexNormals(); }
    brat.position.set(-1.35, 1.4, -24); brat.rotation.y = Math.PI / 2; brat.castShadow = true; G.add(brat);
    const sign = new T.Mesh(new T.PlaneGeometry(.9, .5), new T.MeshStandardMaterial({ map: canvasTex(360, 200, g => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 360, 200); g.strokeStyle = '#2a1e14'; g.lineWidth = 10; g.strokeRect(6, 6, 348, 188); g.fillStyle = '#8a1a14'; g.font = '900 54px Georgia'; g.textAlign = 'center'; g.fillText('NO NAKED', 180, 86); g.fillText('LIGHTS', 180, 150); }), roughness: .8 }));
    sign.position.set(-1.92, 1.9, 5); sign.rotation.y = Math.PI / 2 - .12; G.add(sign);
    const cable = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => new T.Vector3(1.95, 2.45 - Math.abs(Math.sin(i * .9)) * .12, 8 - i * 2.4))), 200, .025, 5), new T.MeshStandardMaterial({ color: '#1a1a1a', roughness: .5 })); G.add(cable);
    boxes(G, wood2, [{ p: [-.2, .5, -18.6], s: [.62, 1.0, .5] }, { p: [-.2, 1.01, -18.6], s: [.68, .04, .56] }]);   // upturned crate (rescue box rests here)
    // coal face
    const face = new T.Mesh(rockify(new T.PlaneGeometry(4.6, 3.5, 40, 30), .35, 2.4, 9), new T.MeshStandardMaterial({ color: '#202026', roughness: .28, metalness: .35, map: rockTex(11, .85) })); face.position.set(0, 1.7, FACE_Z); face.receiveShadow = true; G.add(face);
    // shaft-bottom glow far behind the camera side
    const glow = new T.Mesh(new T.PlaneGeometry(4.6, 3.4), glowMat('#ffe2b0')); glow.position.set(0, 1.7, Z0 - .2); glow.rotation.y = Math.PI; G.add(glow);
    // ---- brass canary cage (wire dome)
    { const c = this.cage, wireM = brass; const base = new T.Mesh(new T.CylinderGeometry(.17, .18, .04, 24), brass); base.position.y = .02; c.add(base);
      const bars = 18; for (let i = 0; i < bars; i++) { const a = i / bars * Math.PI * 2; const curve = new T.CatmullRomCurve3([0, .1, .2, .28, .34, .38].map((y, k) => { const r = .165 * Math.cos(Math.max(0, (y - .2)) / .2 * 1.3 * (k > 3 ? 1 : .6)); return new T.Vector3(Math.cos(a) * Math.max(.02, k < 4 ? .165 : r), y + .04, Math.sin(a) * Math.max(.02, k < 4 ? .165 : r)); }));
        const bar = new T.Mesh(new T.TubeGeometry(curve, 10, .005, 4), wireM); c.add(bar); }
      for (const y of [.08, .22]) { const ring = new T.Mesh(new T.TorusGeometry(.165, .007, 4, 32), brass); ring.rotation.x = Math.PI / 2; ring.position.y = y; c.add(ring); }
      const hook = new T.Mesh(new T.TorusGeometry(.04, .008, 6, 16), brass); hook.position.y = .45; c.add(hook);
      const perch = new T.Mesh(new T.CylinderGeometry(.006, .006, .3, 6), new T.MeshStandardMaterial({ color: '#8a5a2e' })); perch.rotation.z = Math.PI / 2; perch.position.y = .12; c.add(perch);
      const dish = new T.Mesh(new T.CylinderGeometry(.04, .03, .025, 12), new T.MeshStandardMaterial({ color: '#e8e0d0' })); dish.position.set(.08, .055, .06); c.add(dish);
      this.cageDoor.add(new T.Mesh(new T.PlaneGeometry(.1, .12), new T.MeshStandardMaterial({ map: canvasTex(64, 64, g => { g.strokeStyle = '#c09040'; g.lineWidth = 4; for (let x = 4; x < 64; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); } g.strokeRect(2, 2, 60, 60); }), transparent: true, alphaTest: .3, side: T.DoubleSide, metalness: .8, roughness: .3 })));
      this.cageDoor.children[0].position.x = .05; (this.cageDoor.children[0] as T.Mesh).scale.setScalar(.8); ((this.cageDoor.children[0] as T.Mesh).material as T.MeshStandardMaterial).color.set('#7a5a2a'); this.cageDoor.position.set(-.05, .1, .167); c.add(this.cageDoor);
      this.scene.add(c); }
    // ---- resuscitator box (aluminium, glass front, round door, O2 cylinder + valve)
    { const bx = this.box; const alu = new T.MeshStandardMaterial({ color: '#a8acb4', roughness: .45, metalness: .6, map: metalTex('#a8acb4', 8), envMapIntensity: .5 });
      const shellB = new Builder(); const W2 = .3, H2 = .32, D2 = .18;
      for (const [x, y, z, sx, sy, sz] of [[0, 0, 0, W2, .015, D2], [0, H2, 0, W2, .015, D2], [-W2 / 2, H2 / 2, 0, .015, H2, D2], [W2 / 2, H2 / 2, 0, .015, H2, D2], [0, H2 / 2, -D2 / 2, W2, H2, .015]] as const) shellB.box(sx, sy, sz, [x, y, z], z < -.05 ? '#5a5e66' : '#c8ccd4');
      const sm = shellB.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .55 })); bx.add(sm);
      const gl = new T.Mesh(new T.PlaneGeometry(W2 - .02, H2 - .02), new T.MeshPhysicalMaterial({ color: '#dff0ff', roughness: .05, transmission: 0, transparent: true, opacity: .16, metalness: 0 })); gl.position.set(0, H2 / 2, D2 / 2 + .001); bx.add(gl);
      const ring = new T.Mesh(new T.TorusGeometry(.055, .009, 8, 24), alu); const grill = new T.Mesh(new T.CircleGeometry(.05, 20), new T.MeshStandardMaterial({ map: canvasTex(64, 64, g => { g.strokeStyle = '#9aa0aa'; g.lineWidth = 3; for (let i = 0; i < 64; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }, false), transparent: true, alphaTest: .3, metalness: .7 }));
      ring.position.x = .055; grill.position.x = .055; this.boxDoor.add(ring, grill); this.boxDoor.rotation.y = Math.PI / 2; this.boxDoor.position.set(W2 / 2 + .002, .16, -.06); bx.add(this.boxDoor);
      const cylM = new T.MeshStandardMaterial({ color: '#2a2e36', roughness: .3, metalness: .6 }); const cyl = new T.Mesh(new T.CapsuleGeometry(.035, .2, 6, 14), cylM); cyl.rotation.z = Math.PI / 2; cyl.position.set(0, H2 + .05, -.03); bx.add(cyl);
      const band = new T.Mesh<T.BufferGeometry, T.Material>(new T.CylinderGeometry(.037, .037, .03, 14), glowMat('#e8e8e8')); band.material = new T.MeshStandardMaterial({ color: '#e8e8e8' }); band.rotation.z = Math.PI / 2; band.position.set(.06, H2 + .05, -.03); bx.add(band);
      this.valve = new T.Mesh(new T.CylinderGeometry(.024, .024, .012, 14), new T.MeshStandardMaterial({ color: '#c8322c', metalness: .4, roughness: .4 })); this.valve.position.set(-.15, H2 + .09, -.03); bx.add(this.valve);
      const pipe = new T.Mesh(new T.CylinderGeometry(.006, .006, .08, 6), alu); pipe.position.set(-.13, H2 + .03, -.03); bx.add(pipe);
      const handle = new T.Mesh(new T.TorusGeometry(.06, .01, 6, 16, Math.PI), alu); handle.position.set(0, H2 + .1, .02); bx.add(handle);
      const perch = new T.Mesh(new T.CylinderGeometry(.005, .005, W2 - .04, 6), new T.MeshStandardMaterial({ color: '#8a5a2e' })); perch.rotation.z = Math.PI / 2; perch.position.y = .1; bx.add(perch);
      this.o2 = new T.Mesh(new T.BoxGeometry(W2 - .03, H2 - .03, D2 - .03), new T.MeshBasicMaterial({ color: '#9fe0ff', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); this.o2.position.y = H2 / 2; bx.add(this.o2);
      this.scene.add(bx); }
    this.birdTex = Object.fromEntries((['perch', 'chirp', 'pant', 'sway', 'fall', 'down', 'revive'] as BirdState[]).map(s => [s, birdTex(s)])) as unknown as Record<BirdState, T.Texture>;
    this.bird = new T.Mesh(new T.PlaneGeometry(.2, .2), new T.MeshBasicMaterial({ map: this.birdTex.perch, transparent: true, alphaTest: .35, toneMapped: true })); this.scene.add(this.bird);
  }
  async render(F: MineFrame, frame: number) {
    const c = F.cage; this.cage.visible = !!c; const bx = F.box; this.box.visible = !!bx;
    if (c) { this.cage.position.set(...c.pos); this.cage.rotation.set(Math.sin(F.t * 1.6) * (c.swing ?? .03), c.rotY ?? 0, Math.cos(F.t * 1.3) * (c.swing ?? .03)); this.cage.scale.setScalar(c.scale ?? 1); this.cageDoor.rotation.y = -(c.door ?? 0) * 1.6; }
    if (bx) { this.box.position.set(...bx.pos); this.box.rotation.set(0, bx.rotY ?? 0, 0); this.box.scale.setScalar(bx.scale ?? 1); this.boxDoor.rotation.y = Math.PI / 2 + clamp(bx.door ?? 1) * 1.5; this.valve.rotation.y = clamp(bx.valve ?? 0) * 4; (this.o2.material as T.MeshBasicMaterial).opacity = clamp(bx.o2 ?? 0) * (.08 + .03 * Math.sin(F.t * 9)); }
    // bird: lives in whichever cage is shown
    const b = F.bird ?? { state: 'perch' as BirdState }; const k = clamp(b.k ?? 0); const host = b.inBox && bx ? this.box : this.cage; this.bird.visible = (b.inBox ? !!bx : !!c);
    const bm = this.bird.material as T.MeshBasicMaterial; if (bm.map !== this.birdTex[b.state]) { bm.map = this.birdTex[b.state]; bm.needsUpdate = true; }
    host.updateMatrixWorld(); const sc = host.scale.x; const hop = b.state === 'chirp' || b.state === 'revive' ? Math.abs(Math.sin(F.t * 7)) * .012 : 0; const pant = b.state === 'pant' ? Math.sin(F.t * 24) * .005 : 0;
    const ly = b.state === 'down' ? .04 : b.state === 'fall' ? .14 - k * .1 : (b.inBox ? .19 : .21) + hop + pant;
    const lp = new T.Vector3(-.01, ly, b.inBox ? .03 : 0).applyMatrix4(host.matrixWorld); this.bird.position.copy(lp); this.bird.scale.set(sc * (1 + pant * 3), sc * (1 - pant * 2), sc);
    this.bird.quaternion.copy(this.cam.quaternion); this.bird.rotateZ(b.state === 'sway' ? Math.sin(F.t * 9) * .32 * (.4 + k) : 0);
    // lights: nearest lamps to camera + frame extras; dust motes in lamp light
    const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])]; const cz = F.cam.pos[2]; const on = F.lampsOn ?? 1;
    [...this.lamps].sort((a, q) => Math.abs(a[2] - cz) - Math.abs(q[2] - cz)).slice(0, 4).forEach(p => L.push({ p: [p[0], p[1] - .1, p[2]], c: [1, .7, .38], i: 16 * on, d: 11 }));
    this.lampGlows.forEach(g => { (g.material as T.MeshBasicMaterial).color.set(on > .5 ? '#ffcf7a' : '#3a3020'); });
    const S: Sprite[] = [...(F.sprites ?? [])]; const du = F.dust ?? .6; if (du > 0) { const R = rng(4); for (let i = 0; i < 50; i++) { const a = (F.t * .05 + R()) % 1; S.push({ p: [(R() - .5) * 3.4 + Math.sin(F.t * .3 + i) * .2, .3 + R() * 2.6 + Math.sin(F.t * .2 + i) * .1, cz - 1 - R() * 8], s: .02 + R() * .02, rot: 0, c: [1.2, 1, .8], a: du * .45 * Math.sin(a * Math.PI), kind: 2, seed: i, age: 0 }); } }
    if (bx && (bx.o2 ?? 0) > .05) { const R = rng(Math.floor(F.t * 20)); for (let i = 0; i < 12; i++) S.push({ p: [bx.pos[0] + (R() - .5) * .25, bx.pos[1] + .05 + R() * .28, bx.pos[2] + (R() - .5) * .12], s: .015 + R() * .02, rot: 0, c: [.8, 1, 1.4], a: .6 * (bx.o2 ?? 0), kind: 2, seed: R(), age: 0 }); }
    await this.frameBase({ ...F, lights: L, sprites: S }); this.draw(F, frame);
  }
}
