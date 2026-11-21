// YunoWorld v7 · Film 2 "Why trains used explosives to prevent crashes" — environment engine.
// A Victorian/Edwardian British main line in fog: ballasted track (rails, chairs, sleepers), a semaphore signal with lamp,
// a brick signal box, the fogman's hut and brazier, telegraph poles and wires, hedges, fields, a stone overbridge, and a
// detailed procedural 4-4-0 tender locomotive (boiler bands, smokebox door, chimney, dome, cab, spoked driving wheels with
// moving coupling and connecting rods, buffers, lamps, tender coal). Railway detonators (fog signals) sit on the railhead.
import * as T from 'three';
import { Core, Builder, M, rng, canvasTex, clamp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, brickTex, boxes, cyls, glowMat, rockify, type V7Frame } from '../kit7.ts';

export type Det = { x: number; z: number; burst?: number };          // detonator on a rail (burst: seconds since it fired, <0 = not yet)
export type RailFrame = V7Frame & {
  loco?: { x: number; speed?: number; steam?: number; brake?: number; lamps?: number };
  dets?: Det[]; arm?: number; lampCol?: 'red' | 'green'; fogK?: number; brazier?: number; coin?: boolean; clip?: number; tin?: boolean;
  extra?: Light[];
};
export const RAIL_Z = .717, GAUGE = 1.435;
const spokeTex = canvasTex(256, 256, g => { g.clearRect(0, 0, 256, 256); g.fillStyle = '#1c2a22'; g.strokeStyle = '#141414';
  g.beginPath(); g.arc(128, 128, 124, 0, 7); g.arc(128, 128, 104, 0, 7, true); g.fill('evenodd'); g.lineWidth = 12; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 22, 128 + Math.sin(a) * 22); g.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108); g.strokeStyle = '#1f4a32'; g.stroke(); }
  g.fillStyle = '#1f4a32'; g.beginPath(); g.arc(128, 128, 28, 0, 7); g.fill(); g.fillStyle = '#c8c8c0'; g.beginPath(); g.arc(128, 128, 9, 0, 7); g.fill();
  g.fillStyle = '#1f4a32'; g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 100, 2.2, 3.2); g.fill(); // balance weight
  g.strokeStyle = '#d8b040'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke(); }, true);
export class RailEngine extends Core {
  G = new T.Group(); loco = new T.Group(); wheels: T.Mesh[] = []; rods: { m: T.Mesh; side: number; kind: 'couple' | 'con'; base: V3 }[] = []; arm = new T.Group(); sigLamp!: T.Mesh;
  dets: T.Group[] = []; coin!: T.Mesh; brazierPos: V3 = [-7.2, 0, -3.4]; tin!: T.Group; sigPos: V3 = [6, 0, -2.4];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#b8c4cc', '#6a7a5a'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G; const R = rng(9);
    // ground: fields + embankment
    const gg = new T.PlaneGeometry(600, 300, 120, 60); gg.rotateX(-Math.PI / 2); { const p = gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = Math.abs(z); p.setY(i, d < 4 ? 0 : -Math.min(1.4, (d - 4) * .25) + Math.sin(x * .03 + z * .05) * .6 * clamp((d - 12) / 30)); } gg.computeVertexNormals(); }
    const grass = canvasTex(1024, 1024, g => { const R2 = rng(3); g.fillStyle = '#5a7440'; g.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 9000; i++) { g.strokeStyle = `hsl(${70 + R2() * 35},${30 + R2() * 25}%,${22 + R2() * 25}%)`; g.lineWidth = 2; const x = R2() * 1024, y = R2() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R2() - .5) * 6, y - 6 - R2() * 10); g.stroke(); } }); grass.repeat.set(60, 30);
    const ground = new T.Mesh(gg, new T.MeshStandardMaterial({ map: grass, roughness: .95 })); ground.receiveShadow = true; G.add(ground);
    // ballast bed
    const bal = canvasTex(512, 512, g => { const R2 = rng(5); g.fillStyle = '#6a6862'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 4000; i++) { const v = 70 + R2() * 90; g.fillStyle = `rgb(${v},${v * .97},${v * .92})`; g.beginPath(); g.ellipse(R2() * 512, R2() * 512, 3 + R2() * 5, 2 + R2() * 4, R2() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(R2() * 512, R2() * 512, 3, 2); } }); bal.repeat.set(120, 1);
    const bg = new T.BoxGeometry(600, .32, 3.8, 1, 1, 1); const ballast = new T.Mesh(bg, new T.MeshStandardMaterial({ map: bal, roughness: .95 })); ballast.position.y = .0; ballast.receiveShadow = true; G.add(ballast);
    const shoulder = new T.Mesh(new T.CylinderGeometry(.5, .5, 600, 6, 1, false, 0, Math.PI), ballast.material); shoulder.rotation.z = Math.PI / 2; [-1.9, 1.9].forEach(z => { const s = shoulder.clone(); s.position.set(0, -.3, z * 1.1); s.scale.set(1, 1, .7); G.add(s); });
    // sleepers, rails, chairs
    const wood = new T.MeshStandardMaterial({ map: woodTex('#4a3a2c', 4), roughness: .9 });
    const sl: { p: V3; s: V3; r?: V3 }[] = []; for (let x = -200; x < 200; x += .75) sl.push({ p: [x, .2, 0], s: [.26, .14, 2.6], r: [0, (R() - .5) * .03, 0] }); boxes(G, wood, sl);

    const rust = canvasTex(1024, 64, g => { const R2 = rng(8); g.fillStyle = '#6a4030'; g.fillRect(0, 0, 1024, 64); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + R2() * 70},${50 + R2() * 30},${30 + R2() * 20},${.3 + R2() * .4})`; g.fillRect(R2() * 1024, R2() * 64, 2 + R2() * 20, 1 + R2() * 4); } }); rust.repeat.set(200, 1);
    const rustM = new T.MeshStandardMaterial({ map: rust, roughness: .75, metalness: .4 }); const shine = new T.MeshStandardMaterial({ color: '#d8dade', roughness: .15, metalness: 1 });
    for (const z of [-RAIL_Z, RAIL_Z]) { const head = new T.Mesh(new T.BoxGeometry(400, .045, .07), rustM); head.position.set(0, .4, z); head.castShadow = true; G.add(head);
      const top = new T.Mesh(new T.BoxGeometry(400, .008, .05), shine); top.position.set(0, .426, z); G.add(top);
      const web = new T.Mesh(new T.BoxGeometry(400, .1, .022), rustM); web.position.set(0, .33, z); G.add(web); const foot = new T.Mesh(new T.BoxGeometry(400, .02, .13), rustM); foot.position.set(0, .275, z); G.add(foot); }
    const chairs: { p: V3; s: V3 }[] = []; for (let x = -200; x < 200; x += .75) for (const z of [-RAIL_Z, RAIL_Z]) chairs.push({ p: [x, .3, z], s: [.18, .08, .2] }); boxes(G, new T.MeshStandardMaterial({ color: '#3a3836', roughness: .6, metalness: .5 }), chairs);
    // semaphore signal (timber post, ladder, arm, lamp)
    const sp = this.sigPos; const post = new T.Mesh(new T.BoxGeometry(.22, 7.2, .22), new T.MeshStandardMaterial({ map: woodTex('#e8e4dc', 7), roughness: .7 })); post.position.set(sp[0], 3.6, sp[2]); post.castShadow = true; G.add(post);
    const fin = new T.Mesh(new T.ConeGeometry(.2, .45, 4), new T.MeshStandardMaterial({ color: '#c8322c' })); fin.position.set(sp[0], 7.4, sp[2]); G.add(fin);
    const lad = new Builder(); for (const dz of [-.22, .22]) lad.box(.04, 6, .04, [sp[0] + .3, 3, sp[2] + dz], '#5a5048'); for (let y = .4; y < 6; y += .35) lad.box(.03, .03, .44, [sp[0] + .3, y, sp[2]], '#5a5048'); lad.box(.8, .05, .6, [sp[0] + .2, 5.6, sp[2]], '#4a4038'); G.add(lad.mesh());
    const armTex = canvasTex(512, 96, g => { g.fillStyle = '#c8322c'; g.fillRect(0, 0, 512, 96); g.fillStyle = '#f2eee6'; g.fillRect(400, 0, 40, 96); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 90); });
    const armM = new T.Mesh(new T.BoxGeometry(1.5, .26, .04), new T.MeshStandardMaterial({ map: armTex, roughness: .6 })); armM.position.x = -.75; this.arm.add(armM);
    const spect = new T.Mesh(new T.TorusGeometry(.14, .03, 6, 16), new T.MeshStandardMaterial({ color: '#2a2a2a' })); spect.position.set(.2, -.1, 0); this.arm.add(spect);
    this.arm.position.set(sp[0] - .12, 6.4, sp[2] + .16); G.add(this.arm);
    const lampBox = new T.Mesh(new T.BoxGeometry(.24, .32, .24), new T.MeshStandardMaterial({ color: '#2a2a2a', roughness: .5 })); lampBox.position.set(sp[0] + .05, 6.25, sp[2] + .2); G.add(lampBox);
    this.sigLamp = new T.Mesh(new T.CircleGeometry(.08, 16), glowMat('#ff3a2a')); this.sigLamp.position.set(sp[0] + .05, 6.25, sp[2] + .325); G.add(this.sigLamp);
    // signal box (brick base, timber upper with windows, slate roof)
    const sb = new T.Group(); sb.position.set(22, 0, -7); G.add(sb);
    const brick = new T.MeshStandardMaterial({ map: brickTex('#8a4a36', 2), roughness: .85 }); (brick.map as T.Texture).repeat.set(3, 1);
    const base = new T.Mesh(new T.BoxGeometry(6, 2.6, 3.6), brick); base.position.y = 1.3; base.castShadow = base.receiveShadow = true; sb.add(base);
    const upper = new T.Mesh(new T.BoxGeometry(6.2, 2.2, 3.8), new T.MeshStandardMaterial({ map: canvasTex(512, 256, g => { g.fillStyle = '#c8b890'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 6; i++) { g.fillStyle = '#ffdc9a'; g.fillRect(20 + i * 82, 60, 66, 110); g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.strokeRect(20 + i * 82, 60, 66, 110); g.beginPath(); g.moveTo(53 + i * 82, 60); g.lineTo(53 + i * 82, 170); g.moveTo(20 + i * 82, 115); g.lineTo(86 + i * 82, 115); g.stroke(); } g.fillStyle = '#5a3a2a'; g.fillRect(0, 230, 512, 26); }), roughness: .8 }));
    upper.position.y = 3.7; upper.castShadow = true; sb.add(upper);
    const roof = new T.Mesh(new T.CylinderGeometry(.01, 2.6, 1.3, 4, 1), new T.MeshStandardMaterial({ color: '#3a3e46', roughness: .7, flatShading: true })); roof.rotation.y = Math.PI / 4; roof.scale.set(1.75, 1, 1.15); roof.position.y = 5.45; sb.add(roof);
    const sign = new T.Mesh(new T.PlaneGeometry(2.4, .4), new T.MeshStandardMaterial({ map: canvasTex(480, 80, g => { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 480, 80); g.fillStyle = '#f2eee6'; g.font = 'bold 46px Georgia'; g.textAlign = 'center'; g.fillText('HOLLOW LANE', 240, 58); }) })); sign.position.set(0, 2.85, 1.81); sb.add(sign);
    // fogman's hut + brazier
    const hut = new T.Group(); hut.position.set(-9.5, 0, -4.4); G.add(hut);
    const hb = new T.Mesh(new T.BoxGeometry(1.8, 2.0, 1.5), new T.MeshStandardMaterial({ map: woodTex('#4a3a2e', 12), roughness: .9 })); hb.position.y = 1; hb.castShadow = hb.receiveShadow = true; hut.add(hb);
    const hr = new T.Mesh(new T.BoxGeometry(2.1, .1, 1.9), new T.MeshStandardMaterial({ color: '#2a2a2e', roughness: .6 })); hr.position.y = 2.1; hr.rotation.x = .12; hut.add(hr);
    const door = new T.Mesh(new T.PlaneGeometry(.7, 1.6), glowMat('#ffb070')); door.position.set(.3, .8, .76); hut.add(door);
    const br = new Builder(); br.cyl(.28, .22, .5, [this.brazierPos[0], .75, this.brazierPos[2]], '#2a2622', 12); for (let k = 0; k < 3; k++) br.cyl(.025, .025, .8, [this.brazierPos[0] + Math.cos(k * 2.1) * .22, .38, this.brazierPos[2] + Math.sin(k * 2.1) * .22], '#2a2622', 5, [Math.sin(k * 2.1) * .25, 0, -Math.cos(k * 2.1) * .25]);
    br.box(.5, .4, .4, [-8.4, .2, -3.8], '#3a3028'); br.box(.48, .3, .36, [-8.4, .55, -3.8], '#5a4a32');   // stool, detonator box
    G.add(br.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .4 })));
    // telegraph poles + wires, hedges, trees, farmhouse, stone overbridge
    const poles: { p: V3; r: number; h: number }[] = []; const tops: V3[] = []; for (let x = -180; x < 180; x += 30) { poles.push({ p: [x, 4, -6.2], r: .12, h: 8 }); tops.push([x, 7.6, -6.2]); }
    cyls(G, new T.MeshStandardMaterial({ map: woodTex('#5a4a3a', 8), roughness: .9 }), poles, 8, .8);
    const arms: { p: V3; s: V3 }[] = tops.map(p => ({ p, s: [.12, .1, 1.4] })); boxes(G, new T.MeshStandardMaterial({ color: '#4a3a2a' }), arms);
    for (const dz of [-.55, -.2, .2, .55]) { const pts: T.Vector3[] = []; for (let i = 0; i < tops.length - 1; i++) for (let k = 0; k < 6; k++) { const u = k / 6; pts.push(new T.Vector3(tops[i][0] + 30 * u, 7.68 - Math.sin(u * Math.PI) * .5, -6.2 + dz)); }
      G.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), pts.length * 2, .01, 3), new T.MeshBasicMaterial({ color: '#2a2a2a' }))); }
    const hedge = new Builder(); for (let x = -200; x < 200; x += 1.6) for (const z of [-11, 11]) hedge.add(new T.IcosahedronGeometry(1, 1), M([x + R(), .6, z + (R() - .5) * .8], [R(), R(), R()], [1.2, .9 + R() * .4, 1]), R() > .5 ? '#3a5a2a' : '#4a6a32');
    const hm = hedge.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); G.add(hm);
    const trees = new Builder(); for (let i = 0; i < 70; i++) { const x = (R() - .5) * 400, z = (R() > .5 ? 1 : -1) * (16 + R() * 80); trees.cyl(.25, .35, 3, [x, 1.5, z], '#4a3a2a', 6); for (let k = 0; k < 3; k++) trees.add(new T.IcosahedronGeometry(2 + R(), 1), M([x + (R() - .5) * 2, 4 + R() * 2.5, z + (R() - .5) * 2]), R() > .5 ? '#3e5a30' : '#4a6636'); }
    G.add(trees.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })));
    const fh = new T.Group(); fh.position.set(-40, 0, -40); G.add(fh); const fw = new T.Mesh(new T.BoxGeometry(8, 5, 6), brick); fw.position.y = 2.5; fh.add(fw); const fr = new T.Mesh(new T.CylinderGeometry(.01, 5.4, 2.6, 4), new T.MeshStandardMaterial({ color: '#4a4a52', flatShading: true })); fr.rotation.y = Math.PI / 4; fr.scale.set(1.15, 1, .85); fr.position.y = 6.3; fh.add(fr);
    const stone = new T.MeshStandardMaterial({ map: brickTex('#8a8478', 6, '#a8a092'), roughness: .9 }); (stone.map as T.Texture).repeat.set(4, 2);
    const bridge = new T.Group(); bridge.position.set(-70, 0, 0); G.add(bridge);
    for (const dz of [-4.2, 4.2]) { const pier = new T.Mesh(new T.BoxGeometry(3, 6.5, 3), stone); pier.position.set(0, 3.25, dz); pier.castShadow = true; bridge.add(pier); }
    const deck = new T.Mesh(new T.BoxGeometry(3, 1.4, 14), stone); deck.position.y = 7; bridge.add(deck); const arch = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 3, 20, 1, true, 0, Math.PI), stone); arch.rotation.set(Math.PI / 2, Math.PI / 2, 0); arch.position.y = 5.2; bridge.add(arch);
    // detonators (fog signals): tin disc + two lead straps; pool reused per frame
    for (let i = 0; i < 4; i++) { const d = new T.Group(); const disc = new T.Mesh(new T.CylinderGeometry(.045, .045, .022, 18), new T.MeshStandardMaterial({ color: '#c8a23a', roughness: .35, metalness: .7 })); disc.position.y = .047; d.add(disc);
      const lid = new T.Mesh(new T.CircleGeometry(.038, 18), new T.MeshStandardMaterial({ map: canvasTex(64, 64, g => { g.fillStyle = '#9a2a24'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c8b880'; g.beginPath(); g.arc(32, 32, 14, 0, 7); g.fill(); }) })); lid.rotation.x = -Math.PI / 2; lid.position.y = .059; d.add(lid);
      const lead = new T.MeshStandardMaterial({ color: '#7a7c84', roughness: .55, metalness: .5 }); for (const s of [-1, 1]) { const strap = new T.Mesh(new T.BoxGeometry(.028, .05, .006), lead); strap.position.set(0, .022, s * .038); d.add(strap); const tab = new T.Mesh(new T.BoxGeometry(.028, .006, .02), lead); tab.position.set(0, -.003, s * .028); d.add(tab); }
      this.dets.push(d); this.scene.add(d); }
    this.coin = new T.Mesh(new T.CylinderGeometry(.0155, .0155, .002, 24), new T.MeshStandardMaterial({ color: '#b87a3a', roughness: .3, metalness: .9 })); this.scene.add(this.coin);
    this.tin = new T.Group(); { const t = new T.Mesh(new T.BoxGeometry(.22, .12, .14), new T.MeshStandardMaterial({ map: canvasTex(256, 128, g => { g.fillStyle = '#c8a23a'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#2a1a10'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.fillText('FOG SIGNALS', 128, 56); g.font = '18px Georgia'; g.fillText('DETONATORS · 12', 128, 88); }), roughness: .4, metalness: .5 })); this.tin.add(t); } this.scene.add(this.tin);
    this.buildLoco(); this.scene.add(this.loco);
  }
  private buildLoco() {
    const L = this.loco; const green = new T.MeshStandardMaterial({ color: '#1f4a32', roughness: .32, metalness: .35 }); const black = new T.MeshStandardMaterial({ color: '#141616', roughness: .45, metalness: .4 });
    const brass = new T.MeshStandardMaterial({ color: '#c89a3a', roughness: .25, metalness: .9 }); const red = new T.MeshStandardMaterial({ color: '#a8221c', roughness: .4 }); const steel = new T.MeshStandardMaterial({ color: '#b8b8bc', roughness: .25, metalness: .95 });
    const add = (g: T.BufferGeometry, m: T.Material, p: V3, r: V3 = [0, 0, 0]) => { const x = new T.Mesh(g, m); x.position.set(...p); x.rotation.set(...r); x.castShadow = true; x.receiveShadow = true; L.add(x); return x; };
    add(new T.BoxGeometry(9.2, .3, 2.4), black, [0, 1.45, 0]);                                        // running board
    for (const z of [-1.16, 1.16]) add(new T.BoxGeometry(8.8, .5, .06), red, [0, 1.25, z]);           // frames (red lined)
    add(new T.CylinderGeometry(.78, .78, 4.6, 28), green, [.4, 2.35, 0], [0, 0, Math.PI / 2]);           // boiler
    for (let i = 0; i < 5; i++) add(new T.CylinderGeometry(.8, .8, .06, 28), brass, [-1.6 + i * 1.0, 2.35, 0], [0, 0, Math.PI / 2]);
    add(new T.CylinderGeometry(.85, .85, 1.1, 28), black, [3.2, 2.35, 0], [0, 0, Math.PI / 2]);         // smokebox
    add(new T.CylinderGeometry(.74, .74, .08, 28), black, [3.78, 2.35, 0], [0, 0, Math.PI / 2]);        // door
    for (const y of [2.62, 2.08]) add(new T.BoxGeometry(.03, .05, 1.0), steel, [3.83, y, 0]);
    add(new T.CylinderGeometry(.05, .05, .22, 8), steel, [3.86, 2.35, 0], [0, 0, Math.PI / 2]);
    add(new T.CylinderGeometry(.3, .26, 1.0, 20), black, [3.25, 3.55, 0]); add(new T.CylinderGeometry(.36, .3, .14, 20), black, [3.25, 4.08, 0]);   // chimney + lip
    add(new T.CylinderGeometry(.3, .38, .55, 20), brass, [.8, 3.3, 0]); add(new T.SphereGeometry(.3, 20, 10, 0, 6.28, 0, Math.PI / 2), brass, [.8, 3.55, 0]);   // dome
    add(new T.CylinderGeometry(.09, .12, .35, 12), brass, [-1.2, 3.25, 0]); add(new T.CylinderGeometry(.09, .12, .35, 12), brass, [-1.45, 3.25, 0]);   // safety valves
    // cab
    const cabTex = canvasTex(256, 256, g => { g.fillStyle = '#1f4a32'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#d8b040'; g.lineWidth = 4; g.strokeRect(14, 14, 228, 228); g.strokeStyle = '#141414'; g.lineWidth = 2; g.strokeRect(20, 20, 216, 216); });
    const cabM = new T.MeshStandardMaterial({ map: cabTex, roughness: .35, metalness: .3 });
    for (const z of [-1.18, 1.18]) { add(new T.BoxGeometry(2.0, 1.1, .06), cabM, [-2.8, 2.15, z]); add(new T.BoxGeometry(.4, 1.0, .06), cabM, [-2.0, 3.2, z]); add(new T.BoxGeometry(.4, 1.0, .06), cabM, [-3.6, 3.2, z]); }
    add(new T.BoxGeometry(.08, 2.1, 2.42), cabM, [-1.8, 2.65, 0]);
    for (const z of [-.6, .6]) { add(new T.CircleGeometry(.24, 20), new T.MeshStandardMaterial({ color: '#cfe6ff', roughness: .05, metalness: .2, transparent: true, opacity: .45 }), [-1.75, 3.15, z], [0, Math.PI / 2, 0]); add(new T.TorusGeometry(.25, .035, 6, 20), brass, [-1.74, 3.15, z], [0, Math.PI / 2, 0]); }
    add(new T.CylinderGeometry(1.4, 1.4, 2.4, 20, 1, true, -Math.PI * .28, Math.PI * .56), black, [-2.8, 2.6, 0], [Math.PI / 2, 0, Math.PI / 2]);   // curved roof
    // splashers, cylinders, buffers, beam, lamps
    for (const x of [-.9, .9]) for (const z of [-1.0, 1.0]) add(new T.CylinderGeometry(1.02, 1.02, .2, 24, 1, false, 0, Math.PI), green, [x, 1.6, z], [Math.PI / 2, 0, 0]);
    for (const z of [-.95, .95]) add(new T.CylinderGeometry(.32, .32, 1.1, 18), black, [3.2, 1.2, z], [0, 0, Math.PI / 2]);
    add(new T.BoxGeometry(.25, .5, 2.6), red, [4.6, 1.25, 0]);
    for (const z of [-.85, .85]) { add(new T.CylinderGeometry(.1, .1, .4, 12), steel, [4.85, 1.25, z], [0, 0, Math.PI / 2]); add(new T.CylinderGeometry(.22, .22, .06, 18), steel, [5.06, 1.25, z], [0, 0, Math.PI / 2]); }
    for (const z of [-.7, .7]) { add(new T.BoxGeometry(.22, .3, .22), black, [4.6, 1.7, z]); const g = add(new T.CircleGeometry(.08, 14), glowMat('#fff2d0'), [4.72, 1.7, z], [0, Math.PI / 2, 0]); g.name = 'lamp'; }
    // wheels (driving 2 pairs 1.0 m, bogie 2 pairs .5 m) + tender wheels
    const wheel = (x: number, r: number, z: number) => { const m = new T.Mesh(new T.CylinderGeometry(r, r, .14, 28), [new T.MeshStandardMaterial({ color: '#1a1a1a', metalness: .6, roughness: .4 }), new T.MeshStandardMaterial({ map: spokeTex, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .4, metalness: .3 }), new T.MeshStandardMaterial({ map: spokeTex, transparent: true, alphaTest: .4, side: T.DoubleSide })]);
      m.rotation.x = Math.PI / 2; m.position.set(x, r + .37, z); m.castShadow = true; m.userData.r = r; L.add(m); this.wheels.push(m); };
    for (const z of [-.8, .8]) { wheel(-.9, 1.0, z); wheel(.9, 1.0, z); wheel(2.7, .5, z); wheel(3.8, .5, z); }
    for (const side of [-1, 1]) { const rod = new T.Mesh(new T.BoxGeometry(1.95, .09, .05), steel); L.add(rod); this.rods.push({ m: rod, side, kind: 'couple', base: [0, 1.37, side * .92] });
      const con = new T.Mesh(new T.BoxGeometry(2.4, .1, .05), steel); L.add(con); this.rods.push({ m: con, side, kind: 'con', base: [0, 1.37, side * .97] }); }
    // tender
    const tend = new T.Group(); tend.position.set(-6.2, 0, 0); L.add(tend);
    const tb = new T.Mesh(new T.BoxGeometry(4.2, 1.6, 2.4), cabM); tb.position.y = 2.2; tb.castShadow = true; tend.add(tb);
    const coal = new T.Mesh(rockify(new T.SphereGeometry(1.1, 16, 10, 0, 6.28, 0, Math.PI / 2), .25, 3), new T.MeshStandardMaterial({ color: '#141418', roughness: .35, metalness: .2, flatShading: true })); coal.scale.set(1.7, .45, 1); coal.position.y = 3.0; tend.add(coal);
    const tf = new T.Mesh(new T.BoxGeometry(4.4, .3, 2.5), black); tf.position.y = 1.3; tend.add(tf);
    for (const x of [-1.4, 0, 1.4]) for (const z of [-.8, .8]) { const m = new T.Mesh(new T.CylinderGeometry(.55, .55, .14, 22), [black, new T.MeshStandardMaterial({ map: spokeTex, transparent: true, alphaTest: .4 }), new T.MeshStandardMaterial({ map: spokeTex, transparent: true, alphaTest: .4 })]); m.rotation.x = Math.PI / 2; m.position.set(x, .92, z); m.userData.r = .55; tend.add(m); this.wheels.push(m); }
    const plate = new T.Mesh(new T.PlaneGeometry(.9, .32), new T.MeshStandardMaterial({ map: canvasTex(256, 90, g => { g.fillStyle = '#c89a3a'; g.fillRect(0, 0, 256, 90); g.fillStyle = '#7a1a14'; g.fillRect(8, 8, 240, 74); g.fillStyle = '#f2d890'; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.fillText('1867', 128, 62); }), metalness: .5, roughness: .4 })); plate.position.set(.9, 1.85, 1.2); L.add(plate);
  }
  async render(F: RailFrame, frame: number) {
    const lo = F.loco; this.loco.visible = !!lo; const S: Sprite[] = [...(F.sprites ?? [])]; const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])];
    if (lo) { this.loco.position.set(lo.x, 0, 0); const dist = lo.x; for (const w of this.wheels) w.rotation.y = -dist / w.userData.r;
      const ang = -dist / 1.0; for (const r of this.rods) { const cx = Math.cos(ang) * .38, cy = Math.sin(ang) * .38;
        if (r.kind === 'couple') { r.m.position.set(0 + cx, 1.37 + cy, r.side * .92); r.m.rotation.set(0, 0, 0); }
        else { const crank: V3 = [.9 + cx, 1.37 + cy, 0]; const cross: V3 = [3.2, 1.2, 0]; const mx = (crank[0] + cross[0]) / 2, my = (crank[1] + cross[1]) / 2; r.m.position.set(mx, my, r.side * .97); r.m.rotation.z = Math.atan2(cross[1] - crank[1], cross[0] - crank[0]); r.m.scale.x = Math.hypot(cross[0] - crank[0], cross[1] - crank[1]) / 2.4; } }
      // smoke & steam from the chimney (drifts back with speed), cylinder drain cocks, brake sparks
      const st = lo.steam ?? 1, sp = lo.speed ?? 0; const R = rng(5);
      for (let i = 0; i < 26; i++) { const a = ((F.t * .55 + i / 26) % 1); S.push({ p: [lo.x + 3.25 - a * (2 + sp * 1.4) + Math.sin(i) * .3, 4.2 + a * 3.2, Math.cos(i * 1.7) * .5 * a], s: .9 + a * 3.4, rot: i, c: [.82, .82, .84], a: .55 * (1 - a) * st, kind: 0, seed: i, age: a }); }
      for (let i = 0; i < 6; i++) { const a = ((F.t * 1.4 + i / 6) % 1); S.push({ p: [lo.x + 3.4 + a * .5, .6 + a * .3, (i % 2 ? 1 : -1) * (1.2 + a * 1.2)], s: .4 + a * 1.4, rot: i, c: [.95, .95, .98], a: .35 * (1 - a) * st, kind: 0, seed: i + 9, age: a }); }
      const bk = lo.brake ?? 0; if (bk > 0) for (let i = 0; i < 14; i++) { const x = lo.x + [-.9, .9][i % 2] + R() * .3; S.push({ p: [x, .45 + R() * .2, (i % 4 < 2 ? 1 : -1) * RAIL_Z], s: .04 + R() * .05, rot: 0, c: [2.2, 1.3, .5], a: bk, kind: 2, seed: R(), age: 0 }); }
      if ((lo.lamps ?? 1) > 0) for (const z of [-.7, .7]) { L.push({ p: [lo.x + 4.9, 1.7, z], c: [1, .9, .7], i: 6, d: 14 }); S.push({ p: [lo.x + 4.8, 1.7, z], s: 1.4, rot: 0, c: [1.4, 1.25, 1], a: .7, kind: 2, seed: z, age: 0 }); } }
    // detonators: position on railhead, burst = flash + smoke + sparks
    const ds = F.dets ?? []; this.dets.forEach((d, i) => { const D = ds[i]; d.visible = !!D && (D.burst ?? -1) < 0; if (D) d.position.set(D.x, .4, D.z); });
    for (const D of ds) { const b = D.burst ?? -1; if (b < 0 || b > 3) continue; const R = rng(Math.floor(D.x * 100)); const fl = Math.max(0, 1 - b * 6);
      if (fl > 0) { L.push({ p: [D.x, .7, D.z], c: [1, .8, .5], i: 60 * fl, d: 10 }); S.push({ p: [D.x, .55, D.z], s: 1.4 * (1 + b * 4), rot: 0, c: [2.4, 1.8, 1], a: fl, kind: 2, seed: 1, age: 0 }); }
      for (let i = 0; i < 10; i++) { const a = Math.min(1, b / 2.5); S.push({ p: [D.x + (R() - .5) * (.3 + a * 2), .5 + a * (1 + R() * 1.4), D.z + (R() - .5) * (.3 + a * 1.6)], s: .4 + a * 1.8, rot: R() * 6, c: [.7, .68, .66], a: .6 * (1 - a), kind: 0, seed: R(), age: a }); }
      if (b < .5) for (let i = 0; i < 14; i++) { const v = R() * 4; S.push({ p: [D.x + (R() - .5) * v * b * 2, .45 + R() * v * b * 1.2, D.z + (R() - .5) * v * b * 2], s: .04, rot: 0, c: [2.4, 1.4, .5], a: 1 - b * 2, kind: 2, seed: R(), age: 0 }); } }
    // signal arm + lamp
    this.arm.rotation.z = -(F.arm ?? 0) * .7; (this.sigLamp.material as T.MeshBasicMaterial).color.set(F.lampCol === 'green' ? '#4aff8a' : '#ff3a2a'); L.push({ p: [this.sigPos[0] + .05, 6.25, this.sigPos[2] + .5], c: F.lampCol === 'green' ? [.3, 1, .5] : [1, .25, .15], i: 4, d: 6 });
    S.push({ p: [this.sigPos[0] + .05, 6.25, this.sigPos[2] + .4], s: 1.1, rot: 0, c: F.lampCol === 'green' ? [.4, 1.6, .7] : [1.8, .4, .3], a: .8, kind: 2, seed: 2, age: 0 });
    // brazier fire + cold breath handled by shots
    const bz = F.brazier ?? 1; if (bz > 0) { const p = this.brazierPos; const R = rng(Math.floor(F.t * 14)); for (let i = 0; i < 7; i++) S.push({ p: [p[0] + (R() - .5) * .3, 1.05 + R() * .3, p[2] + (R() - .5) * .3], s: .35 + R() * .25, rot: R() * 6, c: [1.8, 1.0, .45], a: .9 * bz, kind: 1, seed: R(), age: R() * .6 });
      L.push({ p: [p[0], 1.3, p[2]], c: [1, .6, .3], i: 10 * bz * (.9 + .1 * Math.sin(F.t * 13)), d: 9 }); }
    this.coin.visible = !!F.coin; if (F.coin && ds[0]) this.coin.position.set(ds[0].x + .13, .437, ds[0].z);
    this.tin.visible = !!F.tin; if (F.tin) this.tin.position.set(-8.4, .76, -3.8);
    // fog density per frame
    await this.frameBase({ ...F, lights: L, sprites: S }); this.draw(F, frame);
  }
}
