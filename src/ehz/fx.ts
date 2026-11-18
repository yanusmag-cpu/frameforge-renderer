// VFX: instanced billboards (lit smoke, fire, flash, white water, shock rings), debris and shell tracers.
import * as T from 'three';
import { rng, groundH, clamp, ss, type V3 } from './geo.ts';
import { SHOTS, FIRES, type Shot } from './timeline.ts';

export const WIND: V3 = [-.32, 0, -.2];
const MAXS = 6000;
export type Sprite = { p: V3; s: number; rot: number; c: [number, number, number]; a: number; kind: number; seed: number; age: number; glow?: number };
export type FlashLight = { p: V3; c: [number, number, number]; i: number };

export class Sprites {
  geo = new T.InstancedBufferGeometry(); mesh: T.Mesh; list: Sprite[] = [];
  aP = new Float32Array(MAXS * 3); aC = new Float32Array(MAXS * 4); aS = new Float32Array(MAXS * 4);   // size, rot, kind, seed ; age+glow in aX
  aX = new Float32Array(MAXS * 2);
  u = { sunV: { value: new T.Vector3() }, shade: { value: new T.Color('#5d5f6e') }, warm: { value: new T.Color('#ff9a4a') } };
  constructor(scene: T.Scene) {
    const q = new T.PlaneGeometry(1, 1); this.geo.index = q.index; this.geo.setAttribute('position', q.getAttribute('position')); this.geo.setAttribute('uv', q.getAttribute('uv'));
    this.geo.setAttribute('iP', new T.InstancedBufferAttribute(this.aP, 3)); this.geo.setAttribute('iC', new T.InstancedBufferAttribute(this.aC, 4)); this.geo.setAttribute('iS', new T.InstancedBufferAttribute(this.aS, 4)); this.geo.setAttribute('iX', new T.InstancedBufferAttribute(this.aX, 2));
    const m = new T.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
      vertexShader: `attribute vec3 iP; attribute vec4 iC; attribute vec4 iS; attribute vec2 iX; varying vec2 vUv; varying vec4 vC; varying vec4 vS; varying vec2 vX; varying float vDist;
        void main(){ vUv = uv; vC = iC; vS = iS; vX = iX; vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]); vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float c = cos(iS.y), s = sin(iS.y); vec2 p = mat2(c, s, -s, c) * position.xy * iS.x; vec3 w = iP + R * p.x + U * p.y; vec4 vp = viewMatrix * vec4(w, 1.); vDist = -vp.z; gl_Position = projectionMatrix * vp; }`,
      fragmentShader: `uniform vec3 sunV, shade, warm; varying vec2 vUv; varying vec4 vC; varying vec4 vS; varying vec2 vX; varying float vDist;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
        float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.07 + 13.3; a *= .5; } return s; }
        void main(){ vec2 q = vUv * 2. - 1.; float r = length(q); float k = vS.z, sd = vS.w, age = vX.x, glow = vX.y; vec3 col = vC.rgb; float A = vC.a; vec4 o = vec4(0.);
          if (k < .5) {        // lit smoke puff
            float n = fbm(q * 1.8 + sd * 7.31 + age * .6); float e = r + (n - .5) * .85 + age * .22; float sh = 1. - smoothstep(.55, .98, e); if (sh <= .001) discard;
            vec3 nr = normalize(vec3(q + (vec2(fbm(q * 3. + sd), fbm(q * 3. - sd)) - .5) * .9, sqrt(max(.05, 1. - r * r))));
            float l = clamp(dot(nr, sunV) * .55 + .55, 0., 1.); vec3 c = col * mix(shade, vec3(1.25), l) + warm * glow * (1. - q.y * .5) * .9;
            float a = sh * A; o = vec4(c * a, a);
          } else if (k < 1.5) { // fire
            float n = fbm(q * 2.4 + vec2(0., -age * 3.) + sd * 5.); float e = r + (n - .5) * .9 - q.y * .15; float sh = 1. - smoothstep(.25, .9, e); if (sh <= .001) discard;
            float core = 1. - smoothstep(.0, .55, e); vec3 c = mix(vec3(1., .32, .05), vec3(1.2, .95, .55), core) * (1.4 + core * 2.5) * col;
            o = vec4(c * sh * A, sh * A * .25);
          } else if (k < 2.5) { // flash / star / tracer core
            float rays = pow(abs(cos(atan(q.y, q.x) * 3. + sd * 6.)), 18.) * (1. - smoothstep(0., 1., r)) * .9; float g = exp(-r * r * 9.) * 2.2 + rays + exp(-r * 3.5) * .4;
            o = vec4(col * g * A, 0.);
          } else if (k < 3.5) { // white water spray
            float n = fbm(q * 2.5 + sd * 9.1); float e = r + (n - .5) * .8; float sh = 1. - smoothstep(.45, .9, e); if (sh <= .001) discard;
            vec3 c = col * (.85 + .35 * clamp(dot(normalize(vec3(q, .6)), sunV), 0., 1.)); o = vec4(c * sh * A, sh * A);
          } else {             // shock ring
            float band = exp(-pow((r - .82) * 12., 2.)); o = vec4(col * band * A, band * A * .2);
          }
          gl_FragColor = o * smoothstep(.5, 1.8, vDist / max(vS.x, .2)); }` });
    this.mesh = new T.Mesh(this.geo, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 10; scene.add(this.mesh);
  }
  commit(cam: T.Camera) {
    const cp = cam.position; this.list.sort((a, b) => ((b.p[0] - cp.x) ** 2 + (b.p[1] - cp.y) ** 2 + (b.p[2] - cp.z) ** 2) - ((a.p[0] - cp.x) ** 2 + (a.p[1] - cp.y) ** 2 + (a.p[2] - cp.z) ** 2));
    const n = Math.min(MAXS, this.list.length);
    for (let i = 0; i < n; i++) { const s = this.list[i]; this.aP.set(s.p, i * 3); this.aC.set([s.c[0], s.c[1], s.c[2], s.a], i * 4); this.aS.set([s.s, s.rot, s.kind, s.seed], i * 4); this.aX.set([s.age, s.glow ?? 0], i * 2); }
    this.geo.instanceCount = n; for (const k of ['iP', 'iC', 'iS', 'iX']) (this.geo.getAttribute(k) as T.InstancedBufferAttribute).needsUpdate = true;
    const sv = new T.Vector3(.5, .7, -.4).normalize().transformDirection(cam.matrixWorldInverse); this.u.sunV.value.copy(sv);
  }
}

export type MuzzleFn = (s: Shot) => { p: V3; dir: V3 } | null;
const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

/** Builds all sprites, debris and lights for time t. */
export function buildFx(t: number, muzzle: MuzzleFn, opt: { funnels: V3[]; scale?: number; mapMode?: boolean }) {
  const S: Sprite[] = []; const L: FlashLight[] = []; const D: { p: V3; r: V3; s: number; c: string }[] = []; const splashes: { p: V3; t: number; s: number }[] = [];
  const big = opt.mapMode ? 1.6 : 1;
  for (const s of SHOTS) {
    const age = t - s.t; if (age < -.01 || t - s.tHit > 7.5) continue;
    const m = muzzle(s); const R = rng(Math.round(s.t * 1000) + 7);
    // ---- muzzle
    if (m && age >= 0 && age < 6) {
      const bp = s.zz; const fl = clamp(1 - age / .16);
      if (fl > 0) { S.push({ p: add3(m.p, m.dir, .15), s: (bp ? 1.3 : 1.6) * big, rot: R() * 6, c: [1.6, 1.15, .7], a: fl, kind: 2, seed: R(), age: 0 }); S.push({ p: add3(m.p, m.dir, .3), s: .55 * big, rot: R(), c: [1, .8, .5], a: fl, kind: 1, seed: R(), age }); L.push({ p: add3(m.p, m.dir, .3), c: [1, .7, .38], i: 9 * fl }); }
      const n = bp ? 12 : 10;
      for (let i = 0; i < n; i++) { const d = R() * (bp ? 1.6 : 1.1), sp = (.4 + R() * .6); const k = 1 - Math.exp(-age * 4 * sp); const dr = age * .25;
        const p = add3(add3(add3(m.p, m.dir, d * k + .1), WIND, dr), [(R() - .5) * .4 * k, R() * .3 * k + age * .06, (R() - .5) * .4 * k]);
        const life = clamp(1 - age / (bp ? 6 : 4.5)); S.push({ p, s: (.35 + k * (bp ? 1.1 : .8) + age * .16) * big, rot: R() * 6, c: bp ? [.97, .95, .92] : [.88, .88, .9], a: (bp ? .8 : .72) * life * ss(0, .04, age), kind: 0, seed: R(), age: age * .2, glow: Math.exp(-age * 6) * 1.2 }); }
    }
    // ---- projectile in flight
    if (m && t >= s.t && t < s.tHit) {
      const k = (t - s.t) / (s.tHit - s.t); const a = m.p, b = s.target; const dist = Math.hypot(b[0] - a[0], b[2] - a[2]); const hgt = dist * .045;
      const P = (kk: number): V3 => [a[0] + (b[0] - a[0]) * kk, a[1] + (b[1] - a[1]) * kk + Math.sin(kk * Math.PI) * hgt, a[2] + (b[2] - a[2]) * kk];
      S.push({ p: P(k), s: .32 * big, rot: 0, c: [1.5, 1.1, .7], a: 1, kind: 2, seed: .3, age: 0 });
      for (let i = 1; i <= 7; i++) { const kk = Math.max(0, k - i * .018); S.push({ p: P(kk), s: (.22 - i * .02) * big, rot: 0, c: [1.2, .7, .35], a: .8 - i * .1, kind: 2, seed: .1, age: 0 }); }
    }
    // ---- landing
    const ia = t - s.tHit; if (ia < 0 || ia > 7.5) continue;
    if (s.kind === 'water') {
      splashes.push({ p: s.target, t: s.tHit, s: s.zz ? .8 : 1 });
      const n = 26; for (let i = 0; i < n; i++) { const ang = R() * 6.28, rr = R() * .35, v = 2.4 + R() * 2.6, h = Math.max(0, v * ia - 4.9 * ia * ia); const fall = ia > v / 4.9;
        if (h <= 0 && ia > .1) continue; S.push({ p: [s.target[0] + Math.cos(ang) * (rr + ia * .35), h, s.target[2] + Math.sin(ang) * (rr + ia * .35)], s: (.25 + R() * .25 + ia * .3) * big, rot: R() * 6, c: [1, 1, 1], a: (fall ? .7 : .95) * clamp(1 - ia / 1.6), kind: 3, seed: R(), age: ia }); }
      for (let i = 0; i < 6; i++) S.push({ p: [s.target[0] + (R() - .5) * .8, .2 + ia * .3, s.target[2] + (R() - .5) * .8], s: (.6 + ia * .6) * big, rot: R() * 6, c: [.96, .97, 1], a: .35 * clamp(1 - ia / 3), kind: 0, seed: R(), age: ia * .2 });
      continue;
    }
    const p = s.target; const fl = clamp(1 - ia / .14);
    if (fl > 0) S.push({ p: add3(p, [-.25, 0, 0]), s: 2.2 * big, rot: R() * 6, c: [1.7, 1.2, .75], a: fl, kind: 2, seed: R(), age: 0 });
    L.push({ p: add3(p, [-.6, .2, 0]), c: [1, .6, .3], i: 14 * Math.exp(-ia * 5) });
    if (ia < .7) for (let i = 0; i < 7; i++) { const k = ia / .7; S.push({ p: add3(p, [-.3 - R() * .5 * k - k * .2, (R() - .2) * .6 * k + k * .3, (R() - .5) * .8 * k]), s: (.5 + R() * .4 + k * .5) * big, rot: R() * 6, c: [1, .85, .7], a: (1 - k) * .9, kind: 1, seed: R(), age: ia * 2 }); }
    if (ia < .6) S.push({ p: add3(p, [-.2, 0, 0]), s: (.6 + ia * 7) * big, rot: 0, c: [1, .9, .8], a: (1 - ia / .6) * .7, kind: 4, seed: 0, age: 0 });
    const dust: [number, number, number] = s.kind === 'ship' ? [.32, .3, .3] : [.78, .72, .62];
    for (let i = 0; i < 12; i++) { const k = 1 - Math.exp(-ia * 1.8); const sp = .5 + R() * 1.2;
      S.push({ p: add3(add3(p, [-.3 - R() * .9 * k * sp, -.15 + (R() * 1.1 + .2) * k + ia * .12, (R() - .5) * 1.4 * k * sp]), WIND, ia * .3), s: (.45 + k * 1.1 + ia * .15) * big, rot: R() * 6, c: dust, a: .8 * clamp(1 - ia / 7) * ss(0, .05, ia), kind: 0, seed: R(), age: ia * .15, glow: Math.exp(-ia * 2.2) * .8 }); }
    // debris chunks
    const g = 9.8;
    for (let i = 0; i < 16; i++) { const v: V3 = [-1.5 - R() * 2.5, 1 + R() * 3, (R() - .5) * 3.4]; const tt = Math.max(0, ia - R() * .03);
      let x = p[0] + v[0] * tt, y = p[1] + v[1] * tt - .5 * g * tt * tt, z = p[2] + v[2] * tt; const fl0 = s.kind === 'ship' ? 0 : Math.max(groundH(x, z), 0);
      if (y < fl0) { const tHit = (v[1] + Math.sqrt(v[1] * v[1] + 2 * g * (p[1] - fl0))) / g; x = p[0] + v[0] * (tHit + Math.min(tt - tHit, .2) * .3); z = p[2] + v[2] * (tHit + Math.min(tt - tHit, .2) * .3); y = fl0 - (fl0 <= 0.001 ? Math.min(tt - tHit, 1) * .3 : 0);
        if (fl0 <= .001 && tt - tHit < .5 && i % 3 === 0) S.push({ p: [x, .05, z], s: .25 * (1 - (tt - tHit) * 2), rot: R(), c: [1, 1, 1], a: .8, kind: 3, seed: R(), age: 0 }); }
      const sz = (.05 + R() * .09) * (s.kind === 'ship' ? 1.2 : 1); D.push({ p: [x, y + sz * .5, z], r: [R() * 6 + tt * 9, R() * 6, R() * 6 + tt * 7], s: sz, c: s.kind === 'ship' ? (R() < .5 ? '#5a3e28' : '#e9e6dc') : (R() < .7 ? '#e6dcc6' : '#6e4526') });
    }
  }
  // ---- fires + smoke columns
  for (const f of FIRES) {
    const age = t - f.t0; if (age < 0) continue; const R = rng(Math.round(f.at[0] * 100 + f.at[2] * 1000)); const grow = ss(0, 3, age) * f.size;
    const dying = f.at[0] < -10 ? ss(36.5, 38.5, t) : 0;   // Glasgow fire drowns with her
    const fy = f.at[0] < -10 ? f.at[1] - .62 * ss(32.8, 35.6, t) + .3 : f.at[1];
    for (let i = 0; i < 5; i++) { const ph = R() * 6; const fl = .75 + .25 * Math.sin(t * (9 + i) + ph);
      S.push({ p: [f.at[0] - .15 + (R() - .5) * .5 * grow, fy + grow * (.15 + R() * .3), f.at[2] + (R() - .5) * .7 * grow], s: (.35 + R() * .35) * grow * fl * big, rot: R() * .6 - .3, c: [1, .9, .8], a: (1 - dying) * fl, kind: 1, seed: R() + Math.floor(t * 8) * .01, age: t * .5 + ph }); }
    L.push({ p: [f.at[0] - .6, fy + .5, f.at[2]], c: [1, .5, .2], i: 2.2 * grow * (.8 + .2 * Math.sin(t * 13 + f.at[2])) * (1 - dying) });
    const rate = 3.2, life = 7; const n = Math.floor(age * rate);
    for (let j = Math.max(0, n - Math.floor(life * rate)); j <= n; j++) { const R2 = rng(j * 31 + Math.round(f.at[2] * 77)); const a = age - j / rate; if (a < 0) continue; const k = a / life;
      S.push({ p: [f.at[0] + WIND[0] * a * 1.3 + (R2() - .5) * .4, fy + .4 + a * .62 + (R2() - .5) * .2, f.at[2] + WIND[2] * a * 1.3 + (R2() - .5) * .4], s: (.5 + a * .42) * Math.max(.5, grow) * big, rot: R2() * 6, c: [.27, .25, .25], a: .72 * (1 - k) * ss(0, .4, a) * (1 - dying * .7), kind: 0, seed: R2(), age: a * .1, glow: Math.max(0, 1 - a * .6) * .9 }); }
    if (age > .2) for (let i = 0; i < 6; i++) { const R3 = rng(i * 17 + Math.floor((t + i * .37) / 1.3) * 101 + Math.round(f.at[2] * 9)); const ea = ((t + i * .37) % 1.3);
      S.push({ p: [f.at[0] + (R3() - .5) * .6 + WIND[0] * ea, fy + .3 + ea * 1.4, f.at[2] + (R3() - .5) * .6 + WIND[2] * ea], s: .05 * big, rot: 0, c: [1.4, .7, .25], a: (1 - ea / 1.3) * (1 - dying), kind: 2, seed: 0, age: 0 }); }
  }
  // ---- funnel smoke (ships keep steam up)
  for (const fp of opt.funnels) { for (let j = 0; j < 7; j++) { const a = ((t * .9 + j * .55 + fp[2] * .13) % 3.85); const R = rng(j * 13 + Math.round(fp[0] * 10));
    S.push({ p: [fp[0] + WIND[0] * a * 1.6 + (R() - .5) * .1, fp[1] + .1 + a * .28, fp[2] + WIND[2] * a * 1.6], s: (.18 + a * .2) * big, rot: R() * 6, c: [.55, .54, .56], a: .45 * (1 - a / 3.85) * ss(0, .3, a), kind: 0, seed: R(), age: a * .1 }); } }
  return { S, L, D, splashes };
}

/** Screen shake (camera-space amplitude) from nearby blasts. */
export function shake(t: number, cam: V3, k = 1) {
  let a = 0;
  for (const s of SHOTS) { for (const [tt, p] of [[s.tHit, s.target], [s.t, null]] as const) { const age = t - tt; if (age < 0 || age > .6) continue; const d = p ? Math.hypot(p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]) : 30; a += Math.exp(-age * 9) * Math.min(1, 6 / (d + 1)) * (p ? 1 : .2); } }
  a = Math.min(a, 1.2) * k; return [Math.sin(t * 91) * a * .03 + Math.sin(t * 57) * a * .02, Math.cos(t * 83) * a * .028, 0] as V3;
}
