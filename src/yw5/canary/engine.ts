// YunoWorld v4 · Film 3 engine — canaries and the oxygen resuscitator cage (UK coal mines, 1896 → 1986).
// Sets: mine (timbered roadway: coal walls with glints, roof bars, rails, tubs, hanging lamps, haze), pithead (Welsh valley at dusk:
// winding tower, engine house, chimney, terraces). Props: the aluminium resuscitator cage (glass front, round door with grille, perch,
// oxygen cylinder + valve on top) and a 2D canary cut-out in the YunoWorld cartoon style (perched / panting / wobbling / fallen / singing).
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, type YFrame, type V3 } from '../../yw3/core.ts';

export const SET = { mine: [0, 0, 0], pithead: [5000, 0, 0] } as const;
export type SetName = keyof typeof SET;
export type BirdState = 'perch' | 'pant' | 'wobble' | 'down' | 'sing';
export type KFrame = YFrame & {
  set: SetName; sky?: { top: string; hor: string; sun: V3 };
  cage?: { pos: V3; rotY?: number; door?: number; valve?: number; o2?: number; carried?: boolean; scale?: number; plain?: boolean };
  bird?: { state: BirdState; k?: number };       // k: wobble / fall / revive progress
  co?: number;                                     // carbon monoxide "x-ray" haze 0..1
};
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...o });
/** 2D canary drawn like the stickman: thick dark outline, round shapes, expressive eye. */
function birdTex(state: BirdState) { return canvasTex(256, 256, g => {
  g.clearRect(0, 0, 256, 256); g.lineWidth = 9; g.strokeStyle = '#1a1410'; g.lineJoin = 'round'; g.lineCap = 'round';
  const down = state === 'down'; g.save(); if (down) { g.translate(128, 170); g.rotate(-1.35); g.translate(-128, -150); }
  g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(70, 150); g.quadraticCurveTo(36, 176, 46, 196); g.quadraticCurveTo(80, 186, 96, 162); g.closePath(); g.fill(); g.stroke();       // tail
  g.beginPath(); g.ellipse(128, 140, 58, 50, -.2, 0, 7); g.fill(); g.stroke();                                                                                                           // body
  g.beginPath(); g.arc(168, 92, 36, 0, 7); g.fill(); g.stroke();                                                                                                                           // head
  g.fillStyle = '#f4b81f'; g.beginPath(); g.ellipse(118, 146, 34, 22, -.5, 0, 7); g.fill(); g.stroke();                                                                                   // wing
  g.fillStyle = '#ff9a2a'; g.beginPath(); g.moveTo(200, 88); g.lineTo(232, 98); g.lineTo(200, 106); g.closePath(); g.fill(); g.stroke();                                                   // beak
  if (state === 'sing') { g.beginPath(); g.moveTo(200, 98); g.lineTo(226, 112); g.stroke(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(176, 84, 12, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1a1410'; if (down) { g.beginPath(); g.moveTo(168, 84); g.lineTo(184, 84); g.stroke(); } else { g.beginPath(); g.arc(state === 'wobble' ? 174 : 179, state === 'wobble' ? 88 : 84, 5.5, 0, 7); g.fill(); }
  if (state === 'pant') { g.beginPath(); g.arc(214, 108, 4, 0, 7); g.fill(); }
  g.strokeStyle = '#ff9a2a'; g.lineWidth = 6; if (!down) { g.beginPath(); g.moveTo(118, 186); g.lineTo(114, 210); g.moveTo(140, 186); g.lineTo(140, 210); g.stroke(); }
  g.restore();
  if (state === 'sing') { g.fillStyle = '#ffffff'; g.font = '900 40px Arial'; g.fillText('♪', 214, 50); g.fillText('♫', 176, 34); }
}, false); }

export class CanaryEngine extends Core {
  groups: Record<SetName, T.Group>; skyU: Record<string, T.IUniform>; sky: T.Mesh; cage: T.Group; door: T.Group; valve: T.Mesh; bird: T.Mesh; birdTex: Record<BirdState, T.Texture>;
  o2: T.Mesh; tank: T.Object3D[] = []; lamps: V3[] = [];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#3a3a6a', '#2a2430'); this.scene.environment = this.env;
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(...SET[n] as unknown as V3); this.scene.add(g); return g; };
    this.groups = { mine: mk('mine'), pithead: mk('pithead') };
    this.skyU = { top: { value: new T.Color('#2a3a7a') }, hor: { value: new T.Color('#ff9a6a') }, sun: { value: new T.Vector3(-.7, .1, -.7).normalize() } };
    this.sky = new T.Mesh(new T.SphereGeometry(900, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; varying vec3 vD; ${GLSL_NOISE} void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.05, .5, d.y), .6)); float s = max(dot(d, sun), 0.); c += vec3(1., .7, .45) * (pow(s, 300.) * 8. + pow(s, 5.) * .35);
        float cl = smoothstep(.5, .8, fbm(d.xz / max(d.y, .07))) * smoothstep(0., .3, d.y); c = mix(c, mix(vec3(.95, .6, .55), top, .4), cl * .6); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    // ---------- mine roadway (runs along -z from the shaft bottom at z = 8)
    const Mn = this.groups.mine;
    const coal = canvasTex(512, 512, g => { g.fillStyle = '#1f1d24'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 1400; i++) { const v = 28 + (i * 37) % 40; g.fillStyle = `rgb(${v},${v},${v + 10})`; g.beginPath(); const x = (i * 389) % 512, y = (i * 211) % 512; g.moveTo(x, y); g.lineTo(x + 18, y + 4); g.lineTo(x + 8, y + 16); g.fill(); }
      for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(200,210,255,.55)'; g.fillRect((i * 97) % 512, (i * 151) % 512, 2, 2); } }); coal.repeat.set(10, 2);
    const cm = new T.MeshStandardMaterial({ map: coal, roughness: .35, metalness: .15 });
    for (const sx of [1]) { const w = new T.Mesh(new T.PlaneGeometry(80, 3.4), cm); w.position.set(sx * 2.1, 1.7, -30); w.rotation.y = -sx * Math.PI / 2; w.receiveShadow = true; Mn.add(w); }
    const roof = new T.Mesh(new T.PlaneGeometry(4.2, 80), new T.MeshStandardMaterial({ color: '#3a3438', roughness: .9 })); roof.rotation.x = Math.PI / 2; roof.position.set(0, 3.3, -30); Mn.add(roof);
    const floor = new T.Mesh(new T.PlaneGeometry(4.2, 80), new T.MeshStandardMaterial({ color: '#3a3330', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -30); floor.receiveShadow = true; Mn.add(floor);
    const tb = new Builder();
    for (let z = 6; z > -70; z -= 2.2) { for (const sx of [1]) tb.cyl(.13, .15, 3.3, [sx * 1.9, 1.65, z], '#8a6a44', 8, [0, 0, sx * .06]); tb.box(4.2, .26, .3, [0, 3.2, z], '#7a5a38'); tb.box(.5, .18, .32, [1.6, 3.0, z], '#6a4a2c'); }
    for (let z = 6; z > -70; z -= 1.6) tb.box(.5, .35 + ((z * 7.3) % 1 + 1) % 1 * .5, 1.7, [-2.25, 3.1, z], '#1e1b22');
    for (let z = 7; z > -70; z -= .7) tb.box(1.6, .08, .22, [0, .04, z], '#5a4632');
    for (const x of [-.55, .55]) tb.box(.07, .1, 78, [x, .12, -31], '#7a7a82');
    for (let i = 0; i < 4; i++) { const z = -10 - i * 2.4; tb.box(1.3, .8, 1.8, [0, .75, z], '#4a4a52'); tb.box(1.2, .25, 1.7, [0, 1.2, z], '#151515'); for (const x of [-.5, .5]) for (const dz of [-.6, .6]) tb.cyl(.2, .2, .1, [x, .22, z + dz], '#2a2a2a', 10, [0, 0, Math.PI / 2]); }
    for (let i = 0; i < 9; i++) { const z = 4 - i * 7; tb.box(.04, .4, .04, [1.4, 2.95, z], '#2a2a2a'); tb.box(.22, .3, .22, [1.4, 2.6, z], '#ffcf7a'); this.lamps.push([1.4, 2.6, z]); }
    tb.box(.8, 1.2, .6, [1.5, .6, 2], '#6a4a2c'); tb.cyl(.06, .06, 1.4, [1.3, .7, 3], '#8a6a44', 6, [0, 0, -.5]); tb.box(.5, .12, .14, [1.0, 1.35, 3], '#5a5a5a');   // tool box, pick
    Mn.add(tb.mesh(std({ roughness: .8 }))); Mn.rotation.y = Math.PI / 2;   // roadway runs along world x: shaft bottom at x = +9, face at x = -70; back wall at z = -2.1
    this.lamps = this.lamps.map(([x, y, z]) => [z, y, -x] as V3);
    const shaftGlow = new T.Mesh(new T.PlaneGeometry(4.2, 3.4), new T.MeshBasicMaterial({ color: '#ffe6b8', toneMapped: false })); shaftGlow.position.set(0, 1.7, 9); shaftGlow.rotation.y = Math.PI; Mn.add(shaftGlow);
    // ---------- pithead (Welsh valley, dusk)
    const P = this.groups.pithead; const pb = new Builder(); pb.box(600, 2, 600, [0, -1, 0], '#4a6a3a');
    for (const [x, z, s] of [[-140, -200, 140], [160, -220, 160], [0, -320, 180]] as const) pb.add(new T.SphereGeometry(s, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M([x, -20, z], [0, 0, 0], [1.2, .5, 1]), '#5a7a42');
    for (let i = 0; i < 4; i++) { const h = 22; pb.cyl(.5, .5, h, [-6 + (i % 2) * 12, h / 2, -40 + Math.floor(i / 2) * 8], '#2a2a32', 6, [Math.floor(i / 2) ? .18 : -.18, 0, 0]); }
    pb.box(13, .6, 9, [0, 22, -36], '#2a2a32'); pb.cyl(4, 4, .5, [0, 24.5, -36], '#3a3a42', 24, [Math.PI / 2, 0, 0]); pb.cyl(.4, .4, 9, [0, 24.5, -36], '#3a3a42', 8, [Math.PI / 2, 0, 0]);
    pb.box(18, 10, 12, [20, 5, -60], '#8a4a32'); pb.add(new T.ConeGeometry(13, 5, 4), M([20, 12.5, -60], [0, Math.PI / 4, 0], [1, 1, .7]), '#3a3a42'); pb.cyl(1.4, 2, 34, [32, 17, -66], '#7a3a2a', 10);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { const x = -110 + i * 9, z = -90 - r * 22, y = r * 6; pb.box(8.6, 6, 7, [x, y + 3, z], ['#8a8a8a', '#7a7268', '#9a8a7a'][(i + r) % 3]); pb.add(new T.ConeGeometry(6.4, 2.6, 4), M([x, y + 7.2, z], [0, Math.PI / 4, 0], [1, 1, .8]), '#3a3a48');
      pb.box(1.2, 1.4, .1, [x - 2, y + 2.4, z + 3.55], '#ffcf7a'); }
    P.add(pb.mesh(std({ roughness: .9, flatShading: true })));
    // ---------- resuscitator cage
    this.cage = new T.Group(); const alu = new T.MeshStandardMaterial({ color: '#c9ced6', roughness: .3, metalness: .85 }); const glass = new T.MeshStandardMaterial({ color: '#cfe6ff', roughness: .05, metalness: .1, transparent: true, opacity: .1, depthWrite: false });
    { const cb = new Builder(); const W2 = .26, H2 = .29, D2 = .14;
      for (const [x, y, z, sx, sy, sz] of [[0, -.001, 0, W2, .012, D2], [0, H2, 0, W2, .012, D2], [-W2 / 2, H2 / 2, 0, .012, H2, D2], [0, H2 / 2, -D2 / 2, W2, H2, .012]] as const) cb.box(sx, sy, sz, [x, y, z], y < .01 ? '#7a7f88' : '#aab0b8');
      for (const [x, y] of [[-W2 / 2, 0], [W2 / 2, 0], [-W2 / 2, H2], [W2 / 2, H2]]) cb.box(.016, .016, D2 + .01, [x, y, 0], '#9aa0aa');
      cb.cyl(.004, .004, W2 - .04, [0, .09, 0], '#8a6a44', 6, [0, 0, Math.PI / 2]);                                                                         // perch
      cb.box(.12, .012, .02, [0, H2 + .07, 0], '#7a7a82'); cb.box(.01, .07, .02, [-.06, H2 + .035, 0], '#7a7a82'); cb.box(.01, .07, .02, [.06, H2 + .035, 0], '#7a7a82');   // handle
      const m = cb.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: .6, envMapIntensity: .35 })); m.castShadow = true; this.cage.add(m); }
    const gl = new T.Mesh(new T.PlaneGeometry(.26, .29), glass); gl.position.set(0, .145, .071); this.cage.add(gl);
    this.door = new T.Group(); { const ring = new T.Mesh(new T.TorusGeometry(.055, .008, 8, 24), alu); const grill = new T.Mesh(new T.CircleGeometry(.05, 20), new T.MeshStandardMaterial({ map: canvasTex(64, 64, g => { g.strokeStyle = '#9aa0aa'; g.lineWidth = 3; for (let i = 0; i < 64; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }, false), transparent: true, metalness: .7, roughness: .3 }));
      ring.position.x = .055; grill.position.x = .055; this.door.add(ring, grill); this.door.rotation.y = Math.PI / 2; this.door.position.set(.131, .15, -.05); this.cage.add(this.door); }
    const cyl = new T.Mesh(new T.CylinderGeometry(.03, .03, .2, 16), new T.MeshStandardMaterial({ color: '#1c1c22', roughness: .35, metalness: .5 })); cyl.rotation.z = Math.PI / 2; cyl.position.set(0, .33, -.03); this.cage.add(cyl);
    const cap = new T.Mesh(new T.SphereGeometry(.03, 12, 8), cyl.material); cap.position.set(.1, .33, -.03); this.cage.add(cap);
    this.valve = new T.Mesh(new T.CylinderGeometry(.018, .018, .01, 12), new T.MeshStandardMaterial({ color: '#c8322c', metalness: .5, roughness: .4 })); this.valve.position.set(-.115, .36, -.03); this.cage.add(this.valve);
    const pipe = new T.Mesh(new T.CylinderGeometry(.005, .005, .06, 6), alu); pipe.position.set(-.1, .3, -.03); this.cage.add(pipe); this.tank = [cyl, cap, this.valve, pipe];
    this.birdTex = { perch: birdTex('perch'), pant: birdTex('pant'), wobble: birdTex('wobble'), down: birdTex('down'), sing: birdTex('sing') };
    this.bird = new T.Mesh(new T.PlaneGeometry(.17, .17), new T.MeshBasicMaterial({ map: this.birdTex.perch, transparent: true, alphaTest: .4, toneMapped: false })); this.cage.add(this.bird);
    this.o2 = new T.Mesh(new T.BoxGeometry(.24, .27, .12), new T.MeshBasicMaterial({ color: '#9fe0ff', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); this.o2.position.set(0, .145, 0); this.cage.add(this.o2);
    this.scene.add(this.cage);
  }
  async render(F: KFrame, frame: number) {
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); } this.sky.visible = F.set === 'pithead';
    const c = F.cage; this.cage.visible = !!c; if (c) { this.cage.position.set(...c.pos); this.cage.rotation.set(0, c.rotY ?? 0, c.carried ? Math.sin(F.t * 3.4) * .04 : 0); this.cage.scale.setScalar(c.scale ?? 1); this.tank.forEach(o => { o.visible = !c.plain; });
      this.door.rotation.y = Math.PI / 2 + clamp(c.door ?? 1) * 1.5;
      this.valve.rotation.y = clamp(c.valve ?? 0) * 3; (this.o2.material as T.MeshBasicMaterial).opacity = clamp(c.o2 ?? 0) * (.07 + .03 * Math.sin(F.t * 9)); }
    const b = F.bird ?? { state: 'perch' as BirdState }; const k = clamp(b.k ?? 0); const bm = this.bird.material as T.MeshBasicMaterial; bm.map = this.birdTex[b.state]; bm.needsUpdate = true;
    const hop = b.state === 'sing' ? Math.abs(Math.sin(F.t * 6)) * .01 : 0; const pant = b.state === 'pant' ? Math.sin(F.t * 22) * .006 : 0;
    this.bird.position.set(-.01, b.state === 'down' ? .05 : .16 + hop + pant, .02); this.bird.rotation.set(0, 0, b.state === 'wobble' ? Math.sin(F.t * 11) * .25 * k : 0);
    this.bird.scale.set(1 + pant * 3, 1 - pant * 2, 1);
    const L = [...(F.lights ?? [])]; if (F.set === 'mine') { const cp = F.cam.pos; const near = [...this.lamps].sort((a, z) => Math.abs(a[0] - cp[0]) - Math.abs(z[0] - cp[0])).slice(0, 3); for (const p of near) L.push({ p, c: [1, .72, .4], i: 7, d: 9 }); }
    const S = [...(F.sprites ?? [])]; const cx = F.cam.pos[0]; const co = clamp(F.co ?? 0); if (co > 0) { const R = rng(Math.floor(F.t * 6)); for (let i = 0; i < 40; i++) { const z = cx + 4 - R() * 22; S.push({ p: [z + Math.sin(F.t * .5 + i) * .5, .4 + R() * 2.6, (R() - .5) * 3.6], s: 1.6 + R() * 1.6, rot: R() * 6, c: [1.0, .25, .3], a: .22 * co, kind: 0, seed: R(), age: .3 + R() * .4 }); } }
    if (c && (c.o2 ?? 0) > .05) { const R = rng(Math.floor(F.t * 20)); for (let i = 0; i < 10; i++) S.push({ p: [c.pos[0] + (R() - .5) * .2, c.pos[1] + .05 + R() * .25, c.pos[2] + (R() - .5) * .1], s: .02 + R() * .03, rot: 0, c: [.7, .95, 1.3], a: .6 * (c.o2 ?? 0), kind: 2, seed: R(), age: 0 }); }
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
