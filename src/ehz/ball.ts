// Countryball rig: glossy sphere with a front-projected flag, procedurally drawn eyes, hat, outline, arm, watch.
import * as T from 'three';
import { Builder, canvas, unionJack, lerp, type V3 } from './geo.ts';

export type Expr = { lid: number; close: number; low: number; px: number; py: number; ps: number; open: number; happy: number };
const E = (lid: number, close: number, low: number, px: number, py: number, ps: number, open = 1, happy = 0): Expr => ({ lid, close, low, px, py, ps, open, happy });
export const EXPR: Record<string, Expr> = {
  neutral: E(0, .12, 0, 0, 0, 1),
  confident: E(.35, .3, .08, .15, 0, .95),
  smug: E(.15, .52, .22, .35, -.1, .85),
  angry: E(.9, .34, .05, 0, -.05, .9),
  threatening: E(1, .44, .16, 0, -.05, .7),
  surprised: E(-.1, 0, 0, 0, 0, .6, 1.18),
  victorious: E(0, 0, 0, 0, 0, 1, 1, 1),
  serious: E(.4, .38, .1, 0, -.05, .9),
  proud: E(.25, .42, 0, .2, .2, .9),
  defiant: E(.75, .3, .06, .2, 0, .9),
  nervous: E(-.55, .16, 0, .45, -.1, .75, 1.02),
  shocked: E(-.2, 0, 0, 0, .05, .42, 1.25),
  frightened: E(-.85, .05, 0, 0, -.1, .5, 1.12),
  exhausted: E(-.45, .58, .12, 0, -.45, .85, .95),
  defeated: E(-.7, .7, .05, 0, -.7, .8, .92),
};
export const mixExpr = (a: Expr, b: Expr, k: number): Expr => ({ lid: lerp(a.lid, b.lid, k), close: lerp(a.close, b.close, k), low: lerp(a.low, b.low, k), px: lerp(a.px, b.px, k), py: lerp(a.py, b.py, k), ps: lerp(a.ps, b.ps, k), open: lerp(a.open, b.open, k), happy: lerp(a.happy, b.happy, k) });

/** Draw both eyes into a 512 canvas representing the ball's front disc ([-1,1]², y up). */
export function drawEyes(g: CanvasRenderingContext2D, e: Expr, S = 512, opts: { sweat?: number; spread?: number; tremble?: number } = {}) {
  g.clearRect(0, 0, S, S);
  const P = (x: number, y: number): [number, number] => [(x * .5 + .5) * S, (.5 - y * .5) * S];
  const lw = S * .022, sp = opts.spread ?? .33;
  for (const s of [-1, 1]) {
    const cx = s * sp, cy = .1, rx = .2 * e.open, ry = .25 * e.open; const [X, Y] = P(cx, cy); const RX = rx * S * .5, RY = ry * S * .5;
    if (e.happy > .5) { // closed happy arcs
      g.strokeStyle = '#111'; g.lineWidth = lw * 1.5; g.lineCap = 'round'; g.beginPath(); g.ellipse(X, Y + RY * .35, RX * .95, RY * .7, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); continue;
    }
    // lid lines in canvas space: top line through (X, yTop) with slope; inner side (toward face centre) is lower when angry
    const yTop = Y - RY + 2 * RY * e.close, slope = e.lid * .75 * -s;   // canvas y grows down; inner = -s direction
    const yLow = Y + RY - 2 * RY * e.low;
    const shape = (inf: number) => {
      g.beginPath(); g.ellipse(X, Y, RX + inf, RY + inf, 0, 0, Math.PI * 2); g.clip();
      g.beginPath(); const x0 = X - RX * 2, x1 = X + RX * 2; g.moveTo(x0, yTop - inf + slope * (x0 - X)); g.lineTo(x1, yTop - inf + slope * (x1 - X)); g.lineTo(x1, Y + RY * 3); g.lineTo(x0, Y + RY * 3); g.closePath(); g.clip();
      g.beginPath(); g.rect(X - RX * 2, Y - RY * 3, RX * 4, yLow + inf - (Y - RY * 3)); g.clip();
    };
    if (e.close > .93) { g.strokeStyle = '#111'; g.lineWidth = lw * 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(X - RX, yTop + slope * -RX); g.lineTo(X + RX, yTop + slope * RX); g.stroke(); continue; }
    g.save(); shape(lw); g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, S, S); g.restore();
    g.save(); shape(0); g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, S, S);
    const tr = opts.tremble ?? 0;
    const pr = RX * .5 * e.ps, ppx = X + e.px * RX * .5 + tr * Math.sin(s * 9.1 + tr * 40) * RX * .06, ppy = Y - e.py * RY * .45;
    g.fillStyle = '#0b0b0b'; g.beginPath(); g.arc(ppx, ppy, pr, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ppx - pr * .35, ppy - pr * .38, pr * .26, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(X - RX, Y - RY, RX * 2, RY * .35);
    g.restore();
  }
  const sw = opts.sweat ?? 0;
  if (sw > 0) { const [X, Y] = P(.62, .45); const r = S * .045; g.globalAlpha = sw; g.fillStyle = '#9fd8ff'; g.strokeStyle = '#0d0d0d'; g.lineWidth = lw * .7;
    g.beginPath(); g.moveTo(X, Y - r * 2.2); g.quadraticCurveTo(X + r * 1.2, Y - r * .2, X, Y + r); g.quadraticCurveTo(X - r * 1.2, Y - r * .2, X, Y - r * 2.2); g.fill(); g.stroke(); g.globalAlpha = 1; }
}

export function flagDisc(kind: 'gb' | 'zz', S = 1024) {
  const [c, g] = canvas(S, S);
  if (kind === 'zz') { const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#d81e24'); gr.addColorStop(1, '#bd141b'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
  else unionJack(g, -S * .5, S * .02, S * 2, S * .96);   // flag spans the whole ball, centre of the cross on the face
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}

const GLSL_N = `float bh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float bn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f); return mix(mix(bh(i),bh(i+vec2(1,0)),u.x), mix(bh(i+vec2(0,1)),bh(i+vec2(1,1)),u.x), u.y); }`;

/** MeshStandardMaterial whose albedo comes from front projection of object-space normals. */
export function ballMaterial(flag: T.Texture, eyes: T.Texture, env: T.Texture | null) {
  const m = new T.MeshStandardMaterial({ color: '#fff', roughness: .32, metalness: 0, envMap: env, envMapIntensity: .55 });
  const u = { flagMap: { value: flag }, eyeMap: { value: eyes }, soot: { value: 0 }, glowEye: { value: .12 } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvON = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vON; uniform sampler2D flagMap, eyeMap; uniform float soot, glowEye; float eyeA;\n${GLSL_N}`)
      .replace('#include <map_fragment>', `vec3 on = normalize(vON); vec2 fu = on.xy * .5 + .5; if (on.z < 0.) fu.x = 1. - fu.x;
        vec3 fl = pow(texture2D(flagMap, fu).rgb, vec3(2.2)); vec4 ey = texture2D(eyeMap, fu); ey.a *= smoothstep(-.05, .2, on.z); ey.rgb = pow(ey.rgb, vec3(2.2)); eyeA = ey.a;
        vec3 cc = mix(fl, ey.rgb, ey.a);
        float sn = bn(on.xy * 5. + on.z * 3.) * .6 + bn(on.xy * 13.) * .4; float sk = soot * smoothstep(.25, .75, sn + soot * .35) * (1. - ey.a * .85);
        cc = mix(cc, cc * vec3(.16, .14, .13), sk);
        diffuseColor.rgb *= cc;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * eyeA * glowEye;');
  };
  m.customProgramCacheKey = () => 'ehzball';
  return { m, u };
}
export function outlineMat(w: number, color = '#0b0b0b') {
  return new T.ShaderMaterial({ side: T.BackSide, uniforms: { w: { value: w }, c: { value: new T.Color(color) } },
    vertexShader: '#include <common>\n#include <skinning_pars_vertex>\nuniform float w; void main(){ vec3 p = position + normal * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }',
    fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.); }' });
}

function capGeo(r: number) {   // Royal Navy officer's peaked cap, 1890s
  const b = new Builder();
  b.cyl(r * .74, r * .62, r * .30, [0, r * .17, 0], '#1a2340', 28);
  b.cyl(r * .76, r * .74, r * .05, [0, r * .33, 0], '#202a4a', 28);
  b.cyl(r * .635, r * .625, r * .1, [0, r * .07, 0], '#c9a043', 28);
  const peak = new T.CylinderGeometry(r * .66, r * .66, r * .035, 24, 1, false, -Math.PI * .5, Math.PI); b.add(peak, new T.Matrix4().compose(new T.Vector3(0, r * .02, r * .14), new T.Quaternion().setFromEuler(new T.Euler(.28, 0, 0)), new T.Vector3(1, 1, .62)), '#0c0c10');
  b.box(r * .2, r * .16, r * .04, [0, r * .19, r * .6], '#e2bc4e');
  b.cyl(r * .05, r * .05, r * .03, [0, r * .19, r * .63], '#f2f2f2', 10, [Math.PI / 2, 0, 0]);
  return b.geo();
}
function turbanGeo(r: number) {
  const b = new Builder(); const W = '#f2ede1', W2 = '#e6dfcf';
  b.add(new T.TorusGeometry(r * .62, r * .2, 12, 32), new T.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, r * .08, 0), W);
  b.add(new T.TorusGeometry(r * .5, r * .19, 12, 32), new T.Matrix4().compose(new T.Vector3(0, r * .28, -.02 * r), new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2 + .12, 0, .05)), new T.Vector3(1, 1, 1)), W2);
  b.add(new T.SphereGeometry(r * .5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T.Matrix4().makeScale(1, .8, 1).setPosition(0, r * .25, 0), W);
  b.add(new T.TorusGeometry(r * .66, r * .07, 8, 40), new T.Matrix4().compose(new T.Vector3(0, r * .17, 0), new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2 - .32, 0, 0)), new T.Vector3(1, 1, 1)), '#cf9f2e');
  b.add(new T.OctahedronGeometry(r * .1), new T.Matrix4().compose(new T.Vector3(0, r * .3, r * .64), new T.Quaternion(), new T.Vector3(1, 1.3, .6)), '#c0141d');
  b.add(new T.ConeGeometry(r * .045, r * .26, 8), new T.Matrix4().compose(new T.Vector3(0, r * .5, r * .56), new T.Quaternion().setFromEuler(new T.Euler(-.35, 0, 0)), new T.Vector3(1, 1, 1)), '#f8f6f0');
  return b.geo();
}

export type BallState = {
  id: string; kind: 'gb' | 'zz'; pos: V3; r: number; yaw: number; pitch?: number; roll?: number; squash?: number;
  expr: Expr; soot?: number; sweat?: number; tremble?: number; hatTilt?: number; hatOff?: V3;
  arm?: { k: number; hand: V3 }; watch?: { time: number; k: number };   // hand in ball-local space (units of r)
  look?: number;
};

export class Ball {
  group = new T.Group(); body: T.Group = new T.Group(); mat: ReturnType<typeof ballMaterial>; eyeC: HTMLCanvasElement; eyeG: CanvasRenderingContext2D; eyeT: T.CanvasTexture; key = '';
  hat: T.Mesh; arm: T.Mesh; hand: T.Mesh; watch: T.Group; watchC: HTMLCanvasElement; watchT: T.CanvasTexture; wKey = -1; chain: T.Line;
  constructor(scene: T.Scene, public kind: 'gb' | 'zz', env: T.Texture | null) {
    const [ec, eg] = canvas(512, 512); this.eyeC = ec; this.eyeG = eg; this.eyeT = new T.CanvasTexture(ec); this.eyeT.colorSpace = T.NoColorSpace; this.eyeT.anisotropy = 8;
    this.mat = ballMaterial(flagDisc(kind), this.eyeT, env);
    const sph = new T.SphereGeometry(1, 64, 48); const s = new T.Mesh(sph, this.mat.m); s.castShadow = true; s.receiveShadow = true;
    const ol = new T.Mesh(sph, outlineMat(.035)); this.body.add(s, ol);
    const hm = new T.MeshStandardMaterial({ vertexColors: true, roughness: .55, envMap: env, envMapIntensity: .4 });
    this.hat = new T.Mesh(kind === 'gb' ? capGeo(1) : turbanGeo(1), hm); this.hat.castShadow = true;
    const hol = new T.Mesh(this.hat.geometry, outlineMat(.03)); this.hat.add(hol);
    this.body.add(this.hat);
    this.arm = new T.Mesh(new T.BufferGeometry(), new T.MeshStandardMaterial({ color: '#141414', roughness: .5 })); this.arm.castShadow = true;
    this.hand = new T.Mesh(new T.SphereGeometry(.15, 20, 14), new T.MeshStandardMaterial({ color: '#f6f6f2', roughness: .45 })); this.hand.add(new T.Mesh(this.hand.geometry, outlineMat(.025)));
    const [wc] = canvas(256, 256); this.watchC = wc; this.watchT = new T.CanvasTexture(wc); this.watchT.colorSpace = T.SRGBColorSpace;
    this.watch = new T.Group();
    const gold = new T.MeshStandardMaterial({ color: '#d9a940', metalness: 1, roughness: .28, envMap: env, envMapIntensity: 1.2 });
    const case_ = new T.Mesh(new T.CylinderGeometry(.3, .3, .07, 40), gold); case_.rotation.x = Math.PI / 2;
    const face = new T.Mesh(new T.CircleGeometry(.26, 40), new T.MeshBasicMaterial({ map: this.watchT, toneMapped: false })); face.position.z = .037;
    const crown = new T.Mesh(new T.CylinderGeometry(.045, .045, .08, 12), gold); crown.position.y = .33;
    const ring = new T.Mesh(new T.TorusGeometry(.06, .015, 8, 16), gold); ring.position.y = .4;
    this.watch.add(case_, face, crown, ring);
    this.chain = new T.Line(new T.BufferGeometry(), new T.LineBasicMaterial({ color: '#c99b38' }));
    this.group.add(this.body, this.arm, this.hand, this.watch, this.chain); scene.add(this.group);
  }
  private drawWatch(time: number) {
    const k = Math.round(time * 60); if (k === this.wKey) return; this.wKey = k; const g = this.watchC.getContext('2d')!; const S = 256, C = S / 2;
    g.fillStyle = '#f7f1e1'; g.fillRect(0, 0, S, S); g.strokeStyle = '#2a2a2a'; g.fillStyle = '#1d1d1d';
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const r0 = i % 5 ? 112 : 100; g.lineWidth = i % 5 ? 2 : 6; g.beginPath(); g.moveTo(C + Math.sin(a) * r0, C - Math.cos(a) * r0); g.lineTo(C + Math.sin(a) * 120, C - Math.cos(a) * 120); g.stroke(); }
    g.font = '700 30px Inter, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'III', 'VI', 'IX'].forEach((t, i) => { const a = i * Math.PI / 2; g.fillText(t, C + Math.sin(a) * 78, C - Math.cos(a) * 78); });
    const hr = time / 60 % 12, mn = time % 60;
    const hand = (a: number, len: number, w: number) => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(C, C); g.lineTo(C + Math.sin(a) * len, C - Math.cos(a) * len); g.stroke(); };
    g.strokeStyle = '#111'; hand(hr / 12 * Math.PI * 2, 58, 9); hand(mn / 60 * Math.PI * 2, 92, 6); g.fillStyle = '#111'; g.beginPath(); g.arc(C, C, 9, 0, 7); g.fill();
    this.watchT.needsUpdate = true;
  }
  update(s: BallState) {
    this.group.visible = true;
    const key = JSON.stringify([s.expr, s.sweat ?? 0, +(s.tremble ?? 0).toFixed(2)]);
    if (key !== this.key) { drawEyes(this.eyeG, s.expr, 512, { sweat: s.sweat, tremble: s.tremble }); this.eyeT.needsUpdate = true; this.key = key; }
    this.mat.u.soot.value = s.soot ?? 0;
    const r = s.r, q = s.squash ?? 0; const sy = 1 + q, sxz = 1 / Math.sqrt(Math.max(.2, sy));
    this.group.position.set(s.pos[0], s.pos[1], s.pos[2]); this.group.rotation.set(0, s.yaw, 0);
    this.body.position.set(0, r * sy, 0); this.body.scale.set(r * sxz, r * sy, r * sxz); this.body.rotation.set(s.pitch ?? 0, 0, s.roll ?? 0);
    const ht = s.hatTilt ?? 0, ho = s.hatOff ?? [0, 0, 0];
    this.hat.position.set(ho[0], .78 + ho[1], ho[2] - .04); this.hat.rotation.set(-.12 + (this.kind === 'gb' ? -.06 : 0), 0, ht);
    // arm
    const a = s.arm;
    if (a && a.k > .01) {
      const sh = new T.Vector3(.86 * r, r * (sy * .95), .25 * r), hd = new T.Vector3(a.hand[0] * r, a.hand[1] * r, a.hand[2] * r).lerp(new T.Vector3(1.05 * r, r * .5, .2 * r), 1 - a.k);
      const mid = sh.clone().lerp(hd, .5).add(new T.Vector3(.25 * r, .15 * r, 0));
      this.arm.geometry.dispose(); this.arm.geometry = new T.TubeGeometry(new T.QuadraticBezierCurve3(sh, mid, hd), 16, .055 * r, 8); this.arm.visible = true;
      this.hand.position.copy(hd); this.hand.scale.setScalar(r); this.hand.visible = true;
    } else { this.arm.visible = false; this.hand.visible = false; }
    const w = s.watch;
    if (w && w.k > .01 && a) {
      this.drawWatch(w.time); this.watch.visible = true; this.watch.scale.setScalar(r * w.k);
      this.watch.position.copy(this.hand.position).add(new T.Vector3(0, -.45 * r * w.k, .12 * r)); this.watch.rotation.set(0, -.15, 0);
      const pts = [this.hand.position.clone(), this.hand.position.clone().lerp(new T.Vector3(.5 * r, .6 * r, .9 * r), .5).add(new T.Vector3(0, -.25 * r, 0)), new T.Vector3(.4 * r, .7 * r, .9 * r)];
      this.chain.geometry.dispose(); this.chain.geometry = new T.BufferGeometry().setFromPoints(new T.CatmullRomCurve3(pts).getPoints(12)); this.chain.visible = true;
    } else { this.watch.visible = false; this.chain.visible = false; }
  }
  hide() { this.group.visible = false; }
}

// ---- miniature countryball soldiers (instanced) ------------------------------------------
export type Mini = { pos: V3; yaw: number; hop: number; scared: number; vis: boolean; tilt?: number };
export class MiniArmy {
  body: T.InstancedMesh; hat: T.InstancedMesh; rifle: T.InstancedMesh; outline: T.InstancedMesh; aScared: T.InstancedBufferAttribute;
  constructor(scene: T.Scene, kind: 'gb' | 'zz', public max: number, public r: number, env: T.Texture | null) {
    const [ca, ga] = canvas(256, 256); drawEyes(ga, EXPR.angry, 256, { spread: .3 }); const [cb, gb] = canvas(256, 256); drawEyes(gb, EXPR.frightened, 256, { spread: .3 });
    const tA = new T.CanvasTexture(ca), tB = new T.CanvasTexture(cb);
    const geo = new T.SphereGeometry(1, 24, 16); this.aScared = new T.InstancedBufferAttribute(new Float32Array(max), 1); geo.setAttribute('aScared', this.aScared);
    const m = new T.MeshStandardMaterial({ roughness: .38, envMap: env, envMapIntensity: .4 });
    const flag = flagDisc(kind, 256);
    m.onBeforeCompile = sh => {
      sh.uniforms.flagMap = { value: flag }; sh.uniforms.eA = { value: tA }; sh.uniforms.eB = { value: tB };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aScared; varying float vS; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvON = normal; vS = aScared;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vS; varying vec3 vON; uniform sampler2D flagMap, eA, eB;')
        .replace('#include <map_fragment>', `vec3 on = normalize(vON); vec2 fu = on.xy * .5 + .5; if (on.z < 0.) fu.x = 1. - fu.x;
          vec3 fl = pow(texture2D(flagMap, fu).rgb, vec3(2.2)); vec4 ea = mix(texture2D(eA, fu), texture2D(eB, fu), vS); ea.a *= smoothstep(0., .2, on.z);
          diffuseColor.rgb *= mix(fl, pow(ea.rgb, vec3(2.2)), ea.a);`);
    };
    m.customProgramCacheKey = () => 'ehzmini' + kind;
    this.body = new T.InstancedMesh(geo, m, max); this.body.castShadow = true; this.body.receiveShadow = true;
    this.outline = new T.InstancedMesh(geo, new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'void main(){ vec3 p = position * 1.06; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p,1.); }', fragmentShader: 'void main(){ gl_FragColor = vec4(.04,.04,.04,1.); }' }), max);
    const hb = new Builder();
    if (kind === 'zz') { hb.add(new T.TorusGeometry(.5, .2, 8, 20), new T.Matrix4().makeRotationX(Math.PI / 2).setPosition(0, .78, 0), '#f1ece0'); hb.add(new T.SphereGeometry(.42, 12, 8, 0, 6.29, 0, 1.6), new T.Matrix4().setPosition(0, .82, 0), '#f1ece0'); hb.add(new T.TorusGeometry(.55, .06, 6, 20), new T.Matrix4().makeRotationX(Math.PI / 2 - .3).setPosition(0, .9, 0), '#cf9f2e'); }
    else { hb.cyl(.62, .58, .22, [0, .86, 0], '#f4f4f4', 16); hb.cyl(.68, .68, .04, [0, .76, 0], '#1b2340', 16); }
    this.hat = new T.InstancedMesh(hb.geo(), new T.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), max); this.hat.castShadow = true;
    const rb = new Builder(); rb.box(.09, .09, 1.5, [0, 0, 0], '#4a3020'); rb.box(.07, .07, .5, [0, .02, -.95], '#2a2a2e'); rb.box(.13, .2, .45, [0, -.08, .55], '#5a3a24');
    this.rifle = new T.InstancedMesh(rb.geo(), new T.MeshStandardMaterial({ vertexColors: true, roughness: .5 }), max); this.rifle.castShadow = true;
    for (const o of [this.body, this.outline, this.hat, this.rifle]) { o.frustumCulled = false; o.count = 0; scene.add(o); }
  }
  set(list: Mini[], scale = 1) {
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(); let n = 0; const r = this.r * scale;
    for (const u of list) {
      if (!u.vis || n >= this.max) continue;
      const sq = Math.min(.25, u.hop * 1.5); q.setFromEuler(e.set(0, u.yaw, u.tilt ?? 0));
      const p = new T.Vector3(u.pos[0], u.pos[1] + r * (1 - sq * .5) + u.hop * r * 3, u.pos[2]);
      m.compose(p, q, new T.Vector3(r * (1 + sq * .3), r * (1 - sq * .4), r * (1 + sq * .3))); this.body.setMatrixAt(n, m); this.outline.setMatrixAt(n, m); this.hat.setMatrixAt(n, m);
      const rq = q.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(-.9 + u.scared * .5, 0, .2)));
      m.compose(p.clone().add(new T.Vector3(.85 * r, -.1 * r, .2 * r).applyQuaternion(q)), rq, new T.Vector3(r, r, r)); this.rifle.setMatrixAt(n, m);
      this.aScared.setX(n, u.scared); n++;
    }
    for (const o of [this.body, this.outline, this.hat, this.rifle]) { o.count = n; o.instanceMatrix.needsUpdate = true; }
    this.aScared.needsUpdate = true;
  }
}
