// YunoWorld v3 · Film 2 engine — the Great Molasses Flood, Boston North End, 15 Jan 1919.
// One set: Commercial Street running along -x from the waterfront tank (x≈+150), red-brick blocks, the Atlantic Avenue elevated
// railway on steel bents, cobbles, lamps, wagons and barrels; the harbour, wharf and a training ship to the north-east.
// The molasses is a radial heightfield wave from the tank: thick rolling lip, glossy amber-brown, slow folds, sticky drag.
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, canvasTex, clamp, type YFrame, type V3 } from '../../yw3/core.ts';

export const TANK: V3 = [150, 0, 0]; export const TANK_R = 13.7, TANK_H = 15.2;   // 90 ft wide, 50 ft tall
export type MFrame = YFrame & {
  mired?: number;                    // the stuck wagon + hat shot
  sky?: { top: string; hor: string; sun: V3 };
  wave?: { R: number; H?: number; settle?: number; vis?: number; stiff?: number };   // front radius from the tank (m), lip height
  tank?: { burst: number; leak?: number; crack?: number };
  el?: number;                       // elevated-railway span damage 0..1
  house?: number;                    // wooden building shoved off its foundation 0..1
  props?: number;                    // wagons / barrels pushed along 0..1
};
const std = (o: T.MeshStandardMaterialParameters = {}) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .78, ...o });

function brickTex(base: string, trim: string, win: string, seed: number) {
  const R = rng(seed);
  return canvasTex(512, 512, g => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 8) for (let x = (y / 8) % 2 ? 0 : 12; x < 512; x += 24) { const v = R() * 30 - 15; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 220 : 0},${v > 0 ? 200 : 0},${Math.abs(v) / 160})`; g.fillRect(x, y, 22, 6); }
    g.fillStyle = trim; g.fillRect(0, 0, 512, 22); g.fillRect(0, 250, 512, 10);                                   // cornice + string course
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = 40 + c * 120, y = 60 + r * 230;
      g.fillStyle = trim; g.fillRect(x - 8, y - 10, 76, 150); g.fillStyle = win; g.fillRect(x, y, 60, 130);
      g.fillStyle = 'rgba(255,240,200,.25)'; g.fillRect(x + 4, y + 4, 24, 58); g.fillStyle = trim; g.fillRect(x + 28, y, 4, 130); g.fillRect(x, y + 62, 60, 4); }
  });
}
function cobbles() { return canvasTex(1024, 1024, g => { g.fillStyle = '#5b5148'; g.fillRect(0, 0, 1024, 1024); const R = rng(4);
  for (let y = 0; y < 1024; y += 22) for (let x = (y / 22) % 2 ? 0 : 18; x < 1024; x += 36) { const v = 90 + R() * 70; g.fillStyle = `rgb(${v + 20},${v + 8},${v - 6})`; g.beginPath(); g.ellipse(x + 17, y + 10, 16, 9, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(x + 13, y + 6, 8, 3, 0, 0, 7); g.fill(); } }); }
function uvScale(g: T.BufferGeometry, sx: number, sy: number) { const uv = g.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return g; }

export class MolassesEngine extends Core {
  skyU: Record<string, T.IUniform>; sky: T.Mesh; waveU: Record<string, T.IUniform>; wave: T.Mesh;
  mired: T.Mesh; tank: T.Mesh; tankU: Record<string, T.IUniform>; panels: { m: T.Mesh; dir: T.Vector3; spin: T.Vector3 }[] = []; elSpan: T.Group; house: T.Group; props: { m: T.Object3D; home: V3 }[] = [];
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#9cc7f0', '#7a6a58'); this.scene.environment = this.env;
    this.skyU = { top: { value: new T.Color('#2f7ad6') }, hor: { value: new T.Color('#f3dcb6') }, sun: { value: new T.Vector3(.3, .35, -.88).normalize() }, t: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(2500, 48, 24), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; uniform float t; varying vec3 vD; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vD); vec3 c = mix(hor, top, pow(smoothstep(-.02, .5, d.y), .65)); float s = max(dot(d, sun), 0.); c += vec3(1., .86, .62) * (pow(s, 700.) * 16. + pow(s, 10.) * .3);
          vec2 uv = d.xz / max(d.y, .07); float cl = smoothstep(.52, .8, fbm(uv * 1.1 + vec2(t * .01, 0.))) * smoothstep(.02, .3, d.y); c = mix(c, vec3(1., .97, .93), cl * .85); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    const R = rng(19);
    // ground: cobbled Commercial Street + sidewalks, waterfront apron, harbour water
    const cob = cobbles(); cob.repeat.set(30, 3);
    const road = new T.Mesh(new T.PlaneGeometry(420, 16), new T.MeshStandardMaterial({ map: cob, roughness: .7 })); road.rotation.x = -Math.PI / 2; road.position.set(-60, .01, 0); road.receiveShadow = true; this.scene.add(road);
    const g = new Builder(); g.box(420, .3, 5, [-60, .15, 10.5], '#9a8f84'); g.box(420, .3, 5, [-60, .15, -10.5], '#9a8f84'); g.box(220, .4, 120, [190, -.05, 40], '#7d7266'); g.box(1400, .2, 1400, [-60, -.2, 0], '#6f6559');
    for (let x = -260; x < 140; x += 22) for (const z of [9, -9]) { g.cyl(.12, .14, 4.4, [x, 2.2, z], '#1f2a24', 8); g.box(.6, .7, .6, [x, 4.6, z], '#f4d79a'); }   // gas lamps
    this.scene.add(g.mesh(std()));
    const harbour = new T.Mesh(new T.PlaneGeometry(1600, 900), new T.MeshStandardMaterial({ color: '#2d6f8f', roughness: .12, metalness: .3 })); harbour.rotation.x = -Math.PI / 2; harbour.position.set(300, -1.2, 600); this.scene.add(harbour);
    // brick blocks both sides (varied heights, colours, shopfronts with awnings)
    const pal: [string, string, string][] = [['#9c3b2a', '#e9dcc4', '#2c3a4a'], ['#b0553a', '#f1e6cf', '#24323f'], ['#7f3426', '#d8c9a8', '#2a3542'], ['#c27a4a', '#efe3c8', '#1f2c38'], ['#5f6f4a', '#e8dcc0', '#28343f'], ['#8a4b6a', '#efe0d0', '#26303c']];
    const roofM = new T.MeshStandardMaterial({ color: '#4a4440', roughness: .9 }); const mats = pal.map((p, i) => brickTex(p[0], p[1], p[2], i + 3)).map(t => { const m = new T.MeshStandardMaterial({ map: t, roughness: .85 }); return [m, m, roofM, roofM, m, m]; });
    const aw = new Builder();
    for (const side of [1, -1]) { let x = side > 0 ? 92 : 96; while (x > -270) { const w = 10 + R() * 12, h = 11 + Math.floor(R() * 4) * 3.4, d = 14; const mi = Math.floor(R() * mats.length);
        const geo = uvScale(new T.BoxGeometry(w, h, d), w / 9, h / 9); const b = new T.Mesh(geo, mats[mi]); b.position.set(x - w / 2, h / 2, side * (13 + d / 2)); b.castShadow = b.receiveShadow = true; this.scene.add(b);
        aw.box(w - 1, .15, 2.4, [x - w / 2, 3.8, side * 12.2], ['#c8382c', '#2f6f4a', '#e0b23c', '#2f5c9a', '#f1ece0'][Math.floor(R() * 5)], [side * .25, 0, 0]);
        aw.box(w - .6, 3.2, .2, [x - w / 2, 1.7, side * 12.95], '#3a2b20'); x -= w + .3; } }
    this.scene.add(aw.mesh(std({ roughness: .9 })));
    // the wooden building near the tank (pushed off its foundation), firehouse-red
    this.house = new T.Group(); { const hb = new Builder(); hb.box(12, 8, 10, [0, 4, 0], '#b8402e'); hb.add(new T.ConeGeometry(9, 4, 4), M([0, 10, 0], [0, Math.PI / 4, 0], [1, 1, .8]), '#4a3a30');
      for (let i = 0; i < 3; i++) hb.box(1.6, 2.2, .1, [-3.5 + i * 3.5, 5.6, 5.05], '#f1e6cf'); hb.box(3.6, 3.4, .1, [0, 1.7, 5.05], '#2a2a2a'); this.house.add(hb.mesh(std())); }
    this.house.position.set(112, 0, 26); this.scene.add(this.house);
    // Atlantic Avenue elevated railway: steel bents + girders + deck along the street (z = 0)
    const el = new Builder(); const elM = std({ roughness: .55, metalness: .1 }); this.elSpan = new T.Group();
    for (let x = -260; x <= 130; x += 15) { const tgt = x >= 85 && x <= 115 ? null : el; for (const z of [-3.5, 3.5]) (tgt ?? new Builder()).box(.7, 7, .7, [x, 3.5, z], '#46705a'); if (tgt) tgt.box(.6, .9, 8, [x, 7.2, 0], '#46705a'); }
    for (const z of [-3.2, 3.2]) { el.box(175, 1.3, .5, [-172, 7.9, z], '#46705a'); el.box(25, 1.3, .5, [122, 7.9, z], '#46705a'); }
    el.box(175, .3, 7.5, [-172, 8.65, 0], '#3c3c38'); el.box(25, .3, 7.5, [122, 8.65, 0], '#3c3c38'); this.scene.add(el.mesh(elM));
    { const sp = new Builder(); for (const z of [-3.2, 3.2]) sp.box(30, 1.3, .5, [0, 0, z], '#46705a'); sp.box(30, .3, 7.5, [0, .75, 0], '#3c3c38'); for (const x of [-15, 0, 15]) for (const z of [-3.5, 3.5]) sp.box(.7, 7, .7, [x, -4.4, z], '#46705a');
      for (let i = 0; i < 10; i++) sp.box(.15, .15, 7.6, [-13.5 + i * 3, .95, 0], '#5a4632'); this.elSpan.add(sp.mesh(elM)); this.elSpan.position.set(100, 7.9, 0); this.scene.add(this.elSpan); }
    // harbour: wharf, freight sheds, a three-masted training ship, Copp's Hill behind
    const hb = new Builder(); hb.box(160, 2, 30, [220, .8, 95], '#7a5a3c'); hb.box(60, 9, 22, [250, 5, 60], '#c9b48e'); hb.box(40, 8, 20, [180, 4, 70], '#9c3b2a');
    hb.box(70, 7, 12, [300, 1.5, 150], '#1f2a36'); hb.box(66, 2, 11, [300, 5.5, 150], '#e8e2d4'); for (const x of [278, 300, 322]) { hb.cyl(.5, .7, 34, [x, 22, 150], '#5a4632', 8); for (let k = 0; k < 3; k++) hb.box(14 - k * 3, 6, .2, [x, 12 + k * 8, 150], '#f4efe2'); }
    hb.add(new T.SphereGeometry(140, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M([-40, -60, -260], [0, 0, 0], [1.6, .55, 1]), '#5f8a42');
    this.scene.add(hb.mesh(std()));
    // the tank: riveted steel, painted brown, leak streaks (uniform), plus burst panels
    this.tankU = { leak: { value: 0 }, crack: { value: 0 } };
    const tankTex = canvasTex(1024, 512, c => { c.fillStyle = '#6a4027'; c.fillRect(0, 0, 1024, 512); for (let y = 0; y < 512; y += 85) { c.fillStyle = '#4e2d1b'; c.fillRect(0, y, 1024, 4); for (let x = 4; x < 1024; x += 10) { c.fillStyle = '#8a5a3a'; c.beginPath(); c.arc(x, y + 9, 2.2, 0, 7); c.fill(); } }
      for (let x = 0; x < 1024; x += 128) { c.fillStyle = '#4e2d1b'; c.fillRect(x, 0, 4, 512); } for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(30,14,6,.35)'; const x = (i * 137) % 1024; c.fillRect(x, 0, 3 + i % 5, 120 + (i * 53) % 380); } });
    const tm = new T.MeshStandardMaterial({ map: tankTex, roughness: .55, metalness: .35 });
    tm.onBeforeCompile = sh => { sh.uniforms.leak = this.tankU.leak; sh.uniforms.crack = this.tankU.crack; sh.fragmentShader = 'uniform float leak, crack;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float st = step(.82, fract(vMapUv.x * 23.)) * smoothstep(1., .2, vMapUv.y) * leak; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.12, .05, .02), st * .8);
      float cr = crack * step(abs(fract(vMapUv.y * 6.) - .5), .02) * step(.5, fract(vMapUv.x * 3. + vMapUv.y)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .6, .2), cr);`); };
    this.tank = new T.Mesh(new T.CylinderGeometry(TANK_R, TANK_R, TANK_H, 48), tm); this.tank.position.set(TANK[0], TANK_H / 2, TANK[2]); this.tank.castShadow = this.tank.receiveShadow = true; this.scene.add(this.tank);
    const roof = new T.Mesh(new T.ConeGeometry(TANK_R + .3, 2.2, 48), tm); roof.position.y = TANK_H / 2 + 1.1; this.tank.add(roof);
    for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI * 2; const m = new T.Mesh(new T.CylinderGeometry(TANK_R, TANK_R, TANK_H * (.5 + R() * .5), 6, 1, true, a0, Math.PI * 2 / 10), new T.MeshStandardMaterial({ map: tankTex, roughness: .75, metalness: .05, side: T.DoubleSide, color: '#b08070' }));
      m.visible = false; this.scene.add(m); this.panels.push({ m, dir: new T.Vector3(Math.sin(a0 + .3), .35 + R() * .4, Math.cos(a0 + .3)), spin: new T.Vector3(R() - .5, R() - .5, R() - .5) }); }
    // props: wagons, barrels, crates (pushed by the wave)
    for (let i = 0; i < 22; i++) { const pb = new Builder(); const kind = i % 3;
      if (kind === 0) { pb.box(3.4, 1.2, 1.8, [0, 1.3, 0], '#7a4a2a'); for (const x of [-1.2, 1.2]) for (const z of [-1, 1]) pb.cyl(.6, .6, .12, [x, .6, z], '#3a2a1c', 12, [Math.PI / 2, 0, 0]); pb.box(1.2, .9, 1.4, [-.5, 2.3, 0], '#d8c9a8'); }
      else if (kind === 1) pb.cyl(.45, .45, 1.1, [0, .55, 0], '#8a5a32', 12); else pb.box(1, 1, 1, [0, .5, 0], '#b58a54');
      const m = pb.mesh(std()); const home: V3 = [60 - R() * 300, 0, (R() - .5) * 16]; m.position.set(...home); m.rotation.y = R() * 6; this.scene.add(m); this.props.push({ m, home }); }
    // a wagon mired to the axles, a hat on the surface (no people shown)
    { const mb = new Builder(); mb.box(3.6, 1.3, 1.9, [0, 1.2, 0], '#6a3f22'); mb.box(3.8, .2, 2.1, [0, 1.9, 0], '#4a2c18'); for (const x of [-1.3, 1.3]) for (const z of [-1.05, 1.05]) mb.cyl(.75, .75, .12, [x, .7, z], '#3a2a1c', 14, [Math.PI / 2, 0, 0]);
      mb.box(.8, .9, .8, [.6, 2.4, 0], '#c9a26b'); mb.cyl(.32, .32, .9, [-.8, 2.4, .2], '#8a5a32', 10); mb.cyl(.36, .42, .14, [2.6, .05, 2.2], '#2a2a2a', 14); mb.cyl(.22, .24, .2, [2.6, .2, 2.2], '#2a2a2a', 14);
      this.mired = mb.mesh(std()); this.mired.position.set(30, -.9, 4); this.mired.rotation.set(.08, .5, -.12); this.scene.add(this.mired); }
    // molasses wave: radial heightfield around the tank (polar grid, dense near the front)
    this.waveU = { R: { value: 0 }, H: { value: 8 }, settle: { value: 0 }, t: { value: 0 }, sunDir: { value: this.skyU.sun.value }, camP: { value: new T.Vector3() }, vis: { value: 1 }, stiff: { value: 0 },
      fogC: { value: new T.Color('#e8d8c0') }, fogD: { value: .002 }, skyTop: { value: this.skyU.top.value }, skyHor: { value: this.skyU.hor.value } };
    const pos: number[] = [], idx: number[] = []; const rings = 420, seg = 520, A0 = Math.PI * .42, A1 = Math.PI * 1.58;   // sector facing the street (-x)
    for (let i = 0; i <= rings; i++) { const r = 2 + 520 * Math.pow(i / rings, 1.25); for (let j = 0; j <= seg; j++) { const a = A0 + (A1 - A0) * j / seg; pos.push(TANK[0] + Math.cos(a) * r, 0, TANK[2] + Math.sin(a) * r); } }
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); wg.setIndex(idx);
    this.wave = new T.Mesh(wg, new T.ShaderMaterial({ uniforms: this.waveU, transparent: true,
      vertexShader: `uniform float R, H, settle, t; varying vec3 vW; varying float vD, vH; ${GLSL_NOISE}
        float hgt(vec2 p){ vec2 q = p - vec2(${TANK[0].toFixed(1)}, ${TANK[2].toFixed(1)}); float r = length(q); float d = R - r;     // distance behind the front
          if (d < -.5) return -1.;
          float body = mix(H * .55, 1.6, smoothstep(0., R * .9 + 1., d)) * mix(1., .35, settle);                        // thick near the front, thinner behind
          float lip = H * .55 * exp(-pow((d - 8.) / 5., 2.)) * (1. - settle * .8);                                  // rolling bulge at the front
          float front = pow(smoothstep(-.5, 11., d), .8) * (.85 + .3 * fbm(q * .12 + t * .2));
          float fold = (fbm(q * .06 + t * .08) - .5) * 1.6 + (fbm(q * .21 - t * .15) - .5) * .7 + exp(-pow((d - 5.) / 6., 2.)) * (fbm(vec2(atan(q.y, q.x) * 30., t * .6)) - .5) * H * .5;
          return max(.02, (body + lip) * front + fold * front * (1. - settle * .6)); }
        varying vec3 vN; void main(){ vec3 p = position; float h = hgt(p.xz); float e = .6; float hx = hgt(p.xz + vec2(e, 0.)), hz = hgt(p.xz + vec2(0., e)); vN = normalize(vec3(h - max(hx, 0.), e, h - max(hz, 0.)));
          vD = R - length(p.xz - vec2(${TANK[0].toFixed(1)}, ${TANK[2].toFixed(1)})); vH = h; p.y = h; vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float t, vis, stiff, fogD; uniform vec3 sunDir, camP, fogC, skyTop, skyHor; varying vec3 vW, vN; varying float vD, vH; ${GLSL_NOISE}
        void main(){ if (vH < 0. || vD < -.4) discard;
          vec3 n = normalize(vN);
          vec2 q = vW.xz; float st = fbm(vec2((length(q - vec2(${TANK[0].toFixed(1)}, ${TANK[2].toFixed(1)})) - t * mix(9., .3, stiff)) * .35, atan(q.y, q.x - ${TANK[0].toFixed(1)}) * 60.));
          float bump = fbm(q * 1.3 + vec2(t * .3, 0.)); n = normalize(n + vec3((st - .5) * .35 + (bump - .5) * .25, 0., (fbm(q * .7 - t * .1) - .5) * .3));
          vec3 V = normalize(camP - vW); float fr = .04 + .96 * pow(1. - max(dot(n, V), 0.), 5.);
          float thin = smoothstep(.5, .05, vH) * smoothstep(6., 1., vD) * .6;                                                                        // thin edges glow amber (light passing through)
          vec3 base = mix(vec3(.055, .026, .011), vec3(.42, .19, .05), clamp(thin + st * .08, 0., 1.));
          vec3 col = base * (.35 + .75 * max(dot(n, sunDir), 0.));
          vec3 Rf = reflect(-V, n); col = mix(col, mix(skyHor, skyTop, smoothstep(0., .6, Rf.y)) * .3, fr * .3);
          col += vec3(1., .86, .66) * pow(max(dot(Rf, sunDir), 0.), 160.) * 2.4 + vec3(1., .9, .7) * pow(max(dot(Rf, sunDir), 0.), 12.) * .12;
          col = mix(col, col * vec3(.8, .85, 1.), stiff * .4);
          float d = length(camP - vW); col = mix(col, fogC, 1. - exp(-pow(d * fogD, 2.)));
          gl_FragColor = vec4(col, vis); }` }));
    this.wave.frustumCulled = false; this.scene.add(this.wave);
  }
  async render(F: MFrame, frame: number) {
    const s = F.sky; if (s) { this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.sun.value.set(...s.sun).normalize(); }
    this.skyU.t.value = F.t; this.waveU.t.value = F.t;
    const w = F.wave; this.wave.visible = !!w && w.R > .1; if (w) { this.waveU.R.value = w.R; this.waveU.H.value = w.H ?? 8; this.waveU.settle.value = w.settle ?? 0; this.waveU.vis.value = w.vis ?? 1; this.waveU.stiff.value = w.stiff ?? 0; }
    if (F.fog) { this.waveU.fogC.value.set(F.fog.color); this.waveU.fogD.value = F.fog.density * .8; }
    this.waveU.camP.value.set(...F.cam.pos);
    const tk = F.tank ?? { burst: 0 }; this.tankU.leak.value = tk.leak ?? 0; this.tankU.crack.value = tk.crack ?? 0; const b = clamp(tk.burst);
    this.tank.visible = b < .02; this.panels.forEach((p, i) => { p.m.visible = b >= .02; if (!p.m.visible) return; const k = b * (1 + i % 3 * .2);
      p.m.position.set(TANK[0] + p.dir.x * k * 40, TANK_H / 2 + p.dir.y * k * 22 - k * k * 20, TANK[2] + p.dir.z * k * 40); p.m.position.y = Math.max(1, p.m.position.y); p.m.rotation.set(p.spin.x * k * 4, p.spin.y * k * 3, p.spin.z * k * 4); });
    this.mired.visible = (F.mired ?? 0) > 0; const e = F.el ?? 0; this.elSpan.rotation.set(e * .18, 0, -e * .12); this.elSpan.position.set(100, 7.9 - e * 3.2, e * 2.5);
    const hs = F.house ?? 0; this.house.position.set(112 - hs * 9, 0, 26 + hs * 2); this.house.rotation.set(0, hs * .35, hs * .08);
    const R = w?.R ?? 0; this.props.forEach(p => { const dx = p.home[0] - TANK[0], dz = p.home[2] - TANK[2]; const r = Math.hypot(dx, dz); const k = clamp((R - r) / 40) * (F.props ?? 0);
      p.m.position.set(p.home[0] - k * 26, k * 1.6, p.home[2] + Math.sin(r) * k * 3); p.m.rotation.z = k * 1.2 * Math.sin(r * 3); });
    await this.frameBase(F); this.sky.position.copy(this.cam.position);
    this.draw(F, frame);
  }
}
