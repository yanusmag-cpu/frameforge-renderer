// YunoWorld v4 · Film 2 engine — the Broughton Suspension Bridge, River Irwell, 12 April 1831.
// Sets: river (valley, flowing water, stone piers, cast-iron towers, eyebar chains, hangers, a segmented timber deck that can
// oscillate in its first mode and drop at one end; mills and chimneys on the skyline), demo (swing studio for the "you see" beat).
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, type YFrame, type V3 } from '../../yw3/core.ts';

export const SET = { river: [0, 0, 0], demo: [5000, 0, 0] } as const;
export type SetName = keyof typeof SET;
export const SPAN = 44, DECK_Y = 6.2, DECK_W = 5.2;           // deck runs x = -22 … +22 at z ∈ ±2.6
export type GFrame = YFrame & {
  set: SetName; sky?: { top: string; hor: string; sun: V3 };
  deck?: { amp?: number; phase?: number; drop?: number; snap?: number };   // amp (m) of the 1st-mode bounce, phase (rad), drop: west end falls 0..1
  swing?: { angle: number; pusher?: number }; sign?: number;
};
/** Vertical deck displacement at x (m) for the frame's deck state (shared by engine + shots so feet stay on the planks). */
export function deckY(x: number, d: GFrame['deck'] = {}): number {
  const u = (x + SPAN / 2) / SPAN; const bounce = (d.amp ?? 0) * Math.sin(Math.PI * u) * Math.sin(d.phase ?? 0);
  const drop = clamp(d.drop ?? 0); return DECK_Y + bounce - drop * drop * (1 - u) * 7.4;
}
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, ...o });
function stone() { return canvasTex(512, 512, g => { g.fillStyle = '#9a8f7a'; g.fillRect(0, 0, 512, 512); const R = rng(3); for (let y = 0; y < 512; y += 48) for (let x = (y / 48) % 2 ? -40 : 0; x < 512; x += 80) { const v = R() * 30 - 15; g.fillStyle = `rgb(${158 + v},${148 + v},${126 + v})`; g.fillRect(x + 3, y + 3, 74, 42); } }); }

export class BridgeEngine extends Core {
  groups: Record<SetName, T.Group>; skyU: Record<string, T.IUniform>; sky: T.Mesh; waterU: Record<string, T.IUniform>;
  segs: T.Mesh[] = []; links: { m: T.Mesh; x: number; side: number; k: number }[] = []; hangers: { m: T.Mesh; x: number; side: number }[] = []; rails: T.Mesh[] = [];
  bolt: T.Group; swing: T.Group; sign: T.Mesh; smoke: V3[] = [];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#a8c0e8', '#5a6a48'); this.scene.environment = this.env;
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(...SET[n] as unknown as V3); this.scene.add(g); return g; };
    this.groups = { river: mk('river'), demo: mk('demo') };
    this.skyU = { top: { value: new T.Color('#3a6ac8') }, hor: { value: new T.Color('#ffc890') }, sun: { value: new T.Vector3(-.6, .22, -.75).normalize() } };
    this.sky = new T.Mesh(new T.SphereGeometry(1400, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; varying vec3 vD; ${GLSL_NOISE} void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.05, .55, d.y), .7)); float s = max(dot(d, sun), 0.); c += vec3(1., .78, .5) * (pow(s, 400.) * 12. + pow(s, 6.) * .4);
        float cl = smoothstep(.5, .8, fbm(d.xz / max(d.y, .07) * 1.1)) * smoothstep(0., .3, d.y); c = mix(c, mix(vec3(1., .9, .8), hor, .3), cl * .75); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    const G = this.groups.river; const R = rng(11);
    // valley: banks, grass, trees, towpath
    const gb = new Builder(); gb.box(400, 4, 300, [0, 2, -170], '#6f9a42'); gb.box(400, 4, 300, [0, 2, 170], '#6f9a42');
    gb.box(400, 3, 10, [0, 1.2, -24], '#8a7a5a'); gb.box(400, 3, 10, [0, 1.2, 24], '#8a7a5a');
    for (let i = 0; i < 140; i++) { const z = (R() < .5 ? -1 : 1) * (32 + R() * 140), x = (R() - .5) * 380, s = 2 + R() * 3; gb.cyl(.3, .45, s, [x, 4 + s / 2, z], '#4a3a2a', 6); gb.add(new T.IcosahedronGeometry(s * .9, 1), M([x, 4 + s * 1.4, z], [0, R() * 6, 0], [1.1, .9, 1.1]), ['#4f8a3a', '#5f9a42', '#3f7a32', '#7a9a3a'][i % 4]); }
    // Manchester mills + chimneys on the skyline (warm brick)
    for (let i = 0; i < 12; i++) { const x = -180 + i * 32 + R() * 10, z = -120 - R() * 60, w = 14 + R() * 12, h = 10 + R() * 12; gb.box(w, h, 10, [x, 4 + h / 2, z], ['#a8583a', '#9a4a32', '#b86a48'][i % 3]);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) gb.box(1.2, 1.6, .2, [x - w / 2 + 2 + c * (w - 4) / 3, 7 + r * 3.4, z + 5.05], '#ffcf8a');
      if (i % 2) { gb.cyl(1.2, 1.8, h + 22, [x + w / 2 - 2, 4 + (h + 22) / 2, z - 2], '#8a3a2a', 10); this.smoke.push([x + w / 2 - 2, 4 + h + 23, z - 2]); } }
    G.add(gb.mesh(std({ roughness: .95, flatShading: true })));
    // water (flowing, reflective)
    this.waterU = { t: { value: 0 }, sunDir: { value: this.skyU.sun.value }, camP: { value: new T.Vector3() }, top: { value: this.skyU.top.value }, hor: { value: this.skyU.hor.value } };
    const water = new T.Mesh(new T.PlaneGeometry(500, 40, 1, 1), new T.ShaderMaterial({ uniforms: this.waterU,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t; uniform vec3 sunDir, camP, top, hor; varying vec3 vW; ${GLSL_NOISE} void main(){ vec2 q = vW.xz; float a = fbm(q * .12 + vec2(t * .35, 0.)), b = fbm(q * .45 + vec2(t * .8, t * .1));
        vec3 n = normalize(vec3((a - .5) * .6 + (b - .5) * .3, 1., (b - .5) * .4)); vec3 V = normalize(camP - vW); float fr = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
        vec3 Rf = reflect(-V, n); vec3 sky = mix(hor, top, smoothstep(0., .5, Rf.y)); vec3 c = mix(vec3(.07, .22, .25), sky * .7, .12 + fr * .45);
        c += vec3(1., .8, .55) * pow(max(dot(Rf, sunDir), 0.), 160.) * 3.; c = mix(c, vec3(.75, .82, .8), smoothstep(.75, .92, b) * .18); gl_FragColor = vec4(c, 1.); }` }));
    water.rotation.x = -Math.PI / 2; water.position.y = .2; G.add(water);
    // stone piers + cast-iron towers each end
    const st = stone(); st.repeat.set(2, 2); const sm = new T.MeshStandardMaterial({ map: st, roughness: .9 });
    for (const sx of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(6, 9, DECK_W + 4), sm); p.position.set(sx * (SPAN / 2 + 3), 1.5, 0); p.castShadow = p.receiveShadow = true; G.add(p);
      const tb = new Builder(); for (const z of [-DECK_W / 2 - .3, DECK_W / 2 + .3]) { tb.cyl(.45, .6, 9, [sx * (SPAN / 2 + 1), DECK_Y + 4.5, z], '#2f3a44', 12); tb.cyl(.75, .75, .5, [sx * (SPAN / 2 + 1), DECK_Y + 9.2, z], '#2f3a44', 12); tb.add(new T.SphereGeometry(.5, 12, 8), M([sx * (SPAN / 2 + 1), DECK_Y + 9.7, z]), '#2f3a44'); }
      tb.box(.5, .5, DECK_W + 1.2, [sx * (SPAN / 2 + 1), DECK_Y + 8.4, 0], '#2f3a44');
      for (const z of [-DECK_W / 2 - .3, DECK_W / 2 + .3]) tb.box(9, .3, .3, [sx * (SPAN / 2 + 5.5), DECK_Y + 4.6, z], '#2f3a44', [0, 0, sx * .9]);   // back-stays to the ground anchors
      G.add(tb.mesh(std({ roughness: .5, metalness: .2 }))); }
    // deck segments (planks + rails), chains (eyebar links on a catenary), hangers
    const plank = canvasTex(256, 256, g => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#8a6a44', '#7a5a38', '#9a7a50'][i % 3]; g.fillRect(i * 16, 0, 15, 256); } }); plank.wrapS = plank.wrapT = T.RepeatWrapping;
    const pm = new T.MeshStandardMaterial({ map: plank, roughness: .85 }); const iron = new T.MeshStandardMaterial({ color: '#2f3a44', roughness: .45, metalness: .3 });
    const N = 22; for (let i = 0; i < N; i++) { const m = new T.Mesh(new T.BoxGeometry(SPAN / N + .02, .35, DECK_W), pm); m.castShadow = m.receiveShadow = true; m.userData.x = -SPAN / 2 + (i + .5) * SPAN / N; this.segs.push(m); G.add(m);
      for (const z of [-DECK_W / 2, DECK_W / 2]) { const r = new T.Mesh(new T.BoxGeometry(SPAN / N + .02, .12, .12), iron); r.userData = { x: m.userData.x, z }; this.rails.push(r); G.add(r); } }
    for (const side of [-1, 1]) for (let i = 0; i <= 60; i++) { const k = i / 60; const m = new T.Mesh(new T.BoxGeometry(SPAN / 60 * 1.06, .22, .12), iron); m.castShadow = true; this.links.push({ m, x: -SPAN / 2 + k * SPAN, side, k }); G.add(m); }
    for (const side of [-1, 1]) for (let i = 1; i < 22; i++) { const m = new T.Mesh(new T.BoxGeometry(.06, 1, .06), iron); this.hangers.push({ m, x: -SPAN / 2 + i * SPAN / 22, side }); G.add(m); }
    // the stay-chain bolt at the west anchor (close-up)
    this.bolt = new T.Group(); { const b = new Builder(); b.box(1.2, .5, .5, [0, 0, 0], '#3a4450'); b.cyl(.13, .13, .9, [0, 0, 0], '#6a6a6a', 14, [Math.PI / 2, 0, 0]); b.cyl(.22, .22, .12, [0, 0, .45], '#5a5a5a', 6, [Math.PI / 2, 0, 0]); this.bolt.add(b.mesh(std({ metalness: .6, roughness: .35 }))); }
    this.bolt.position.set(-SPAN / 2 - 4.2, DECK_Y + 2.1, DECK_W / 2 + .3); G.add(this.bolt);
    // break-step sign at the east end
    const signT = canvasTex(1024, 512, g => { g.fillStyle = '#1f2a24'; g.fillRect(0, 0, 1024, 512); g.strokeStyle = '#e8d8a8'; g.lineWidth = 14; g.strokeRect(20, 20, 984, 472); g.fillStyle = '#efe2b8'; g.textAlign = 'center';
      g.font = '900 64px Georgia, serif'; g.fillText('NOTICE', 512, 120); g.font = '700 54px Georgia, serif'; g.fillText('ALL TROOPS MUST', 512, 230); g.fillText('BREAK STEP', 512, 310); g.fillText('WHEN CROSSING THIS BRIDGE', 512, 390); });
    this.sign = new T.Mesh(new T.PlaneGeometry(3.2, 1.6), new T.MeshStandardMaterial({ map: signT, roughness: .5, metalness: .3 })); this.sign.position.set(SPAN / 2 + 3, DECK_Y + 2.2, DECK_W / 2 + 1.4); this.sign.rotation.y = -.5; G.add(this.sign);
    { const pb = new Builder(); pb.box(.15, 2.2, .15, [SPAN / 2 + 2.2, DECK_Y + 1.1, DECK_W / 2 + 1.8], '#1f2a24'); pb.box(.15, 2.2, .15, [SPAN / 2 + 3.8, DECK_Y + 1.1, DECK_W / 2 + 1.0], '#1f2a24'); G.add(pb.mesh(std())); }
    // demo studio: a swing on an A-frame, warm key, purple backdrop
    const Dm = this.groups.demo; const bg = new T.Mesh(new T.PlaneGeometry(40, 30), new T.MeshStandardMaterial({ color: '#3a3060' })); bg.position.set(0, 8, -6); Dm.add(bg);
    const fl = new T.Mesh(new T.CircleGeometry(12, 48), new T.MeshStandardMaterial({ color: '#4a4070', roughness: .9 })); fl.rotation.x = -Math.PI / 2; Dm.add(fl);
    const af = new Builder(); for (const z of [-1.2, 1.2]) { af.cyl(.09, .09, 4.4, [-1.1, 2.1, z], '#c9a25a', 8, [0, 0, -.27]); af.cyl(.09, .09, 4.4, [1.1, 2.1, z], '#c9a25a', 8, [0, 0, .27]); } af.cyl(.1, .1, 2.8, [0, 4.15, 0], '#c9a25a', 8, [Math.PI / 2, 0, 0]); Dm.add(af.mesh(std({ roughness: .5 })));
    this.swing = new T.Group(); { const sb = new Builder(); for (const z of [-.45, .45]) sb.cyl(.025, .025, 3, [0, -1.5, z], '#e8e2d4', 6); sb.box(.5, .08, 1.1, [0, -3.05, 0], '#d8262b'); this.swing.add(sb.mesh(std())); }
    this.swing.position.set(0, 4.15, 0); Dm.add(this.swing);
  }
  async render(F: GFrame, frame: number) {
    for (const k of Object.keys(this.groups) as SetName[]) this.groups[k].visible = k === F.set;
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); }
    this.sky.visible = F.set === 'river'; this.waterU.t.value = F.t; this.waterU.camP.value.set(...F.cam.pos);
    const d = F.deck ?? {}; const drop = clamp(d.drop ?? 0);
    for (const m of this.segs) { const x = m.userData.x as number; const y0 = deckY(x - .5, d), y1 = deckY(x + .5, d); m.position.set(x, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, 1) + drop * (x < 0 ? .02 : 0); }
    for (const r of this.rails) { const x = r.userData.x as number; const y0 = deckY(x - .5, d), y1 = deckY(x + .5, d); r.position.set(x, (y0 + y1) / 2 + 1.0, r.userData.z as number); r.rotation.z = Math.atan2(y1 - y0, 1); }
    const chainY = (x: number, side: number) => { const u = (x + SPAN / 2) / SPAN; const sag = DECK_Y + 8.4 - 7.2 * Math.sin(Math.PI * u); const slack = side > 0 ? drop : drop * .6; return sag + (deckY(x, d) - DECK_Y) * .55 - slack * slack * (1 - u) * 4; };
    for (const l of this.links) { const x0 = l.x - SPAN / 120, x1 = l.x + SPAN / 120; const y0 = chainY(x0, l.side), y1 = chainY(x1, l.side); l.m.position.set(l.x, (y0 + y1) / 2, l.side * (DECK_W / 2 + .3)); l.m.rotation.z = Math.atan2(y1 - y0, x1 - x0); }
    for (const h of this.hangers) { const top = chainY(h.x, h.side), bot = deckY(h.x, d) + .2; const len = Math.max(.05, top - bot); h.m.scale.y = len; h.m.position.set(h.x, bot + len / 2, h.side * (DECK_W / 2 + .3)); h.m.visible = !(drop > .4 && h.x < -SPAN / 2 + 6); }
    const sn = clamp(d.snap ?? 0); this.bolt.rotation.z = sn * .5; this.bolt.position.y = DECK_Y + 2.1 - sn * sn * 1.2;
    this.sign.visible = (F.sign ?? 1) > 0;
    const sw = F.swing; if (sw) this.swing.rotation.z = sw.angle;
    const S = [...(F.sprites ?? [])]; if (F.set === 'river') { const R = rng(Math.floor(F.t * 4)); for (const p of this.smoke) for (let i = 0; i < 4; i++) { const a = (F.t * .1 + i * .25) % 1; S.push({ p: [p[0] + a * 14, p[1] + a * 16, p[2]], s: 4 + a * 10, rot: R() * 6, c: [.75, .72, .7], a: .35 * (1 - a), kind: 0, seed: i * .3, age: a }); } }
    await this.frameBase({ ...F, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
