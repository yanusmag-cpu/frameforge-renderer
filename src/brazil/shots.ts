// The Fortaleza heist (2005) — 58 s timeline. Every shot is keyed to the measured narration (production/brazil-heist/timing.json).
import type { Frame, Light, V3, Emitter, PropState } from './engine.ts';
import type { ActorState } from './actor.ts';
import { CAST, pose, P, F, gesture, walkFront, talk, camPath, drift, add3, clamp, inOut, mix, outBack } from './anim.ts';
import { walkPose, type Pose } from '../ff2d/rig.ts';
import { type V2 } from '../ff2d/motion.ts';
import { svg, pop, money, chip, projector, measure, stamp, pin, calendar, clock, gunIcon, rewind } from './overlay.ts';
import { MOUTH } from './mouth.ts';

export const FPS = 30, DURATION = 56.0, FRAMES = Math.round(DURATION * FPS);
const TF = -5.82, TZ = .95, VF = -2.98, HOST_Z = 8.5;
let AUDIO_T = 0;
const mouth = () => { const i = Math.round(AUDIO_T * FPS); return i >= 0 && i < MOUTH.length ? +MOUTH[i] / 9 : 0; };
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

// ---------------------------------------------------------------------------------------------- lighting presets
const DAY = (focus: V3, size = 30, o: Partial<Light> = {}): Light => ({ sky: ['#2a78d4', '#9fcbea'], sun: { dir: [-.55, .78, .62], color: '#fff0d6', int: 3.1, focus, size },
  hemi: ['#cfe6ff', '#a0805a', 1.05], amb: ['#ffffff', .1], fog: ['#d3e4ee', .0042], env: 1, sunGlow: .8, ...o });
const GOLD = (focus: V3, size = 26): Light => ({ sky: ['#2c4f86', '#f6b26b'], sun: { dir: [-.85, .32, .55], color: '#ffb066', int: 3.6, focus, size },
  hemi: ['#8fa6d8', '#6a4428', .75], amb: ['#ffd6a8', .08], fog: ['#e9b689', .006], env: 1.1, sunGlow: 1.4 });
const NIGHT = (focus: V3, lamps: V3[] = []): Light => ({ sky: ['#050b1d', '#18294a'], sun: { dir: [.3, .8, .45], color: '#9fb5ff', int: .35, focus, size: 30 },
  hemi: ['#30457a', '#1a1410', .32], amb: ['#7080b0', .05], fog: ['#101a30', .008], env: .35, sunGlow: 0, stars: .9,
  points: lamps.map(p => ({ pos: p, color: '#ffb46a', int: 90, dist: 22 })) });
const bulbX = (x: number) => 4.4 + Math.round((x - 4.4) / 4) * 4;
const TUNNEL = (fx: number, n = 4, o: { int?: number; maxX?: number; extra?: Light['points'] } = {}): Light => {
  const pts: NonNullable<Light['points']> = []; const c = bulbX(fx);
  for (let i = 0; i < 9 && pts.length < n; i++) { const x = c + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * 4; if (x < 4 || x > (o.maxX ?? 80)) continue; pts.push({ pos: [x, -4.5, .85], color: '#ffb260', int: (o.int ?? 5), dist: 7, shadow: pts.length === 0 }); }
  return { sky: ['#000000', '#000000'], sun: { dir: [0, 1, 0], color: '#000', int: 0, shadow: 0 }, hemi: ['#6b5236', '#24160c', .22], amb: ['#ffcf9a', .04],
    fog: ['#22160d', .035], env: .25, sunGlow: 0, points: [...pts, ...(o.extra ?? [])].slice(0, 6) };
};
const VAULT = (on = 1, extra: Light['points'] = []): Light => ({ sky: ['#000', '#000'], sun: { dir: [0, 1, 0], color: '#000', int: 0, shadow: 0 }, hemi: ['#cfe0ff', '#30343c', .5 * on + .03], amb: ['#bcd0ff', .04 * on + .01],
  fog: ['#141a22', .02], env: .7 * on + .1, sunGlow: 0,
  points: [...(extra ?? []), ...(on > 0 ? [{ pos: [75.7, -.85, -2.05] as V3, color: '#dfeaff', int: 9 * on, dist: 9, shadow: true }, { pos: [81.7, -.85, -2.05] as V3, color: '#dfeaff', int: 8 * on, dist: 9 }, { pos: [78.7, -.85, -.2] as V3, color: '#dfeaff', int: 5 * on, dist: 7 }] : [])].slice(0, 6) });
const STUDIO = (open: number, focus: V3): Light => {
  const g = GOLD(focus, 22);
  return { ...g, sun: { ...g.sun, int: g.sun.int * open, shadow: open > .1 ? 1 : 0 }, hemi: [g.hemi[0], g.hemi[1], mix(.15, g.hemi[2], open)], fog: ['#1a1f2e', mix(.03, .006, open)],
    points: [{ pos: [76.4, 2.6, 11.0], color: '#fff1e2', int: 26, dist: 14, shadow: true }, { pos: [79.9, 2.4, 7.7], color: '#ff5a48', int: 7, dist: 3.2 }, { pos: [76.1, 2.2, 7.7], color: '#ff6a50', int: 5, dist: 3.2 }, { pos: [78, 3.6, 6.4], color: '#4a6cff', int: 9 * (1 - open), dist: 6 },
      { pos: [78, 2.4, 5.6], color: '#ffc26b', int: 40 * open, dist: 9 }] };
};
const LAMPS: V3[] = [[2, 7.2, .5], [16, 7.2, .5], [-12, 7.2, .5], [30, 7.2, .5]];

// ---------------------------------------------------------------------------------------------- 2D props drawn in rig space (outlined, flat — same style as the characters)
const O = 'stroke="#111" stroke-width=".045" stroke-linejoin="round"';
function pickaxe(g: V2, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang); const e: V2 = [g[0] + c * 1.55, g[1] + s * 1.55], b: V2 = [g[0] - c * .35, g[1] - s * .35];
  const n: V2 = [-s, c]; const h1: V2 = [e[0] + n[0] * .62 - c * .08, e[1] + n[1] * .62 - s * .08], h2: V2 = [e[0] - n[0] * .62 - c * .08, e[1] - n[1] * .62 - s * .08];
  return `<path d="M${b[0]} ${b[1]} L${e[0]} ${e[1]}" stroke="#111" stroke-width=".16" stroke-linecap="round"/><path d="M${b[0]} ${b[1]} L${e[0]} ${e[1]}" stroke="#a0703f" stroke-width=".09" stroke-linecap="round"/>
  <path d="M${h1[0]} ${h1[1]} Q${e[0] + c * .14} ${e[1] + s * .14} ${h2[0]} ${h2[1]} Q${e[0] - c * .02} ${e[1] - s * .02} ${h1[0]} ${h1[1]}Z" fill="#9aa3ad" ${O}/>`;
}
function shovel(g: V2, ang: number) {
  const c = Math.cos(ang), s = Math.sin(ang); const e: V2 = [g[0] + c * 1.2, g[1] + s * 1.2], b: V2 = [g[0] - c * .55, g[1] - s * .55]; const n: V2 = [-s, c];
  return `<path d="M${b[0]} ${b[1]} L${e[0]} ${e[1]}" stroke="#111" stroke-width=".14" stroke-linecap="round"/><path d="M${b[0]} ${b[1]} L${e[0]} ${e[1]}" stroke="#a0703f" stroke-width=".07" stroke-linecap="round"/>
  <path d="M${e[0] + n[0] * .2} ${e[1] + n[1] * .2} L${e[0] + c * .45 + n[0] * .17} ${e[1] + s * .45 + n[1] * .17} Q${e[0] + c * .62} ${e[1] + s * .62} ${e[0] + c * .45 - n[0] * .17} ${e[1] + s * .45 - n[1] * .17} L${e[0] - n[0] * .2} ${e[1] - n[1] * .2}Z" fill="#8f98a3" ${O}/>`;
}
const brick = (c: V2, rot = 0, s = 1) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot}) scale(${s})"><rect x="-.5" y="-.32" width="1" height=".64" rx=".06" fill="#7f9cc0" ${O}/><rect x="-.5" y="-.32" width="1" height=".64" rx=".06" fill="url(#nb)" opacity=".0"/>
  <path d="M-.5 -.1 H.5 M-.5 .1 H.5" stroke="#5d7aa0" stroke-width=".03"/><rect x="-.08" y="-.32" width=".16" height=".64" fill="#f1ede2" ${O}/><text x=".27" y=".08" font-size=".22" font-weight="900" text-anchor="middle" fill="#2a3e5c" font-family="Inter,sans-serif">50</text></g>`;
const bag = (c: V2, rot = 0, s = 1) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot}) scale(${s})"><path d="M-.5 -.18 Q-.55 .32 -.05 .34 L.08 .34 Q.56 .32 .5 -.18 Q.3 -.34 0 -.33 Q-.3 -.34 -.5 -.18Z" fill="#2f4a33" ${O}/>
  <path d="M-.22 -.3 Q-.12 -.58 .14 -.3" fill="none" stroke="#111" stroke-width=".08"/><path d="M-.2 -.3 Q-.12 -.52 .12 -.3" fill="none" stroke="#3d6142" stroke-width=".035"/>
  <path d="M-.48 .02 Q0 .1 .48 .02" fill="none" stroke="#1d3020" stroke-width=".03"/><text x="0" y=".2" font-size=".3" font-weight="900" text-anchor="middle" fill="#e8d36a" stroke="#111" stroke-width=".02" font-family="Inter,sans-serif">R$</text></g>`;
const keySvg = (c: V2) => `<g transform="translate(${c[0]} ${c[1]})"><circle r=".09" fill="none" stroke="#111" stroke-width=".07"/><circle r=".09" fill="none" stroke="#e3b341" stroke-width=".035"/><path d="M.08 0 H.3 V.08 M.22 0 V.07" stroke="#111" stroke-width=".07" fill="none"/><path d="M.08 0 H.3 V.08 M.22 0 V.07" stroke="#e3b341" stroke-width=".035" fill="none"/></g>`;
const cupSvg = (c: V2, rot = 0) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot})"><path d="M-.13 -.22 H.13 L.1 .12 H-.1Z" fill="#fff" ${O}/><rect x="-.14" y="-.27" width=".28" height=".07" rx=".02" fill="#5a3a22" ${O}/><path d="M-.12 -.05 H.11" stroke="#c8261f" stroke-width=".05"/></g>`;
const turfSvg = (c: V2, w = .9) => `<g transform="translate(${c[0]} ${c[1]})"><rect x="${-w / 2}" y="-.12" width="${w}" height=".18" fill="#6b4a2a" ${O}/>${Array.from({ length: 16 }, (_, i) => `<path d="M${-w / 2 + .03 + i * (w - .06) / 15} -.1 l${(i % 3 - 1) * .03} -.2" stroke="#2e8a3a" stroke-width=".05" stroke-linecap="round"/>`).join('')}<rect x="${-w / 2}" y="-.16" width="${w}" height=".06" fill="#38a446"/></g>`;
const torchSvg = (c: V2, ang: number) => { const x = Math.cos(ang), y = Math.sin(ang); return `<path d="M${c[0] - x * .2} ${c[1] - y * .2} L${c[0] + x * .25} ${c[1] + y * .25}" stroke="#111" stroke-width=".17" stroke-linecap="round"/><path d="M${c[0] - x * .2} ${c[1] - y * .2} L${c[0] + x * .25} ${c[1] + y * .25}" stroke="#ffcb3d" stroke-width=".09" stroke-linecap="round"/>`; };
const zzz = (t: number) => [0, 1, 2].map(i => { const k = ((t * .7 + i / 3) % 1); return `<text x="${.45 + k * .6}" y="${-4.3 - k * 1.2}" font-size="${.3 + k * .25}" font-weight="900" fill="#fff" stroke="#111" stroke-width=".04" paint-order="stroke" opacity="${Math.sin(k * Math.PI)}" font-family="Inter,sans-serif">Z</text>`; }).join('');
const sweat = (x: number, y: number, k: number) => k > 0 ? `<path d="M${x} ${y} q.1 .16 0 .24 q-.1 -.08 0 -.24Z" fill="#9fd4ff" ${O} opacity="${k}"/>` : '';

/** swing cycle for digging: anticipation (raise) → fast strike → recoil. returns phase info */
function swing(t: number, period: number, off = 0) {
  const u = (((t + off) / period) % 1 + 1) % 1; // 0..1
  const raise = u < .55 ? inOut(u / .55) : 1 - inOut((u - .55) / .18);
  const hit = u >= .73 && u < .78; const sinceHit = (u - .73) * period; return { raise: clamp(raise), hit, sinceHit, cycle: Math.floor((t + off) / period), u };
}
function digPose(t: number, seed: number, sw: ReturnType<typeof swing>, dir = 1, up = false): { p: Pose; tool: string } {
  const r = sw.raise; const ang = up ? mix(-.15, -1.45, 1 - r) * 1 : mix(.35, -2.4, r); // handle angle (rad, screen); dir mirrors
  const sh: V2 = [.0, -2.95]; const ga = up ? -1.2 + r * .9 : mix(.9, -2.3, r), gr = up ? .95 : mix(.95, 1.12, r); const grip: V2 = [sh[0] + Math.cos(ga) * gr, sh[1] + Math.sin(ga) * gr];
  const g2: V2 = [grip[0] - Math.cos(ang) * .3, grip[1] - Math.sin(ang) * .3];
  const p = pose(t, seed, { turn: .85 * dir, lean: mix(.18, -.08, r) * dir, crouch: mix(.32, .12, r) + (up ? .05 : 0), headTilt: mix(.12, -.08, r) * dir,
    handA: [g2[0] * dir, g2[1]], handB: [grip[0] * dir, grip[1]], footA: [-.38 * dir, -.08], footB: [.42 * dir, -.08], kneeDir: dir, frontA: r > .45 && !up ? 0 : 1, frontB: 1 }, .4);
  const a = dir > 0 ? (up ? mix(-.1, -1.5, 1 - r) : ang) : Math.PI - (up ? mix(-.1, -1.5, 1 - r) : ang);
  return { p, tool: pickaxe([grip[0] * dir, grip[1]], up ? (dir > 0 ? -1.45 + (1 - r) * 0 - r * .2 : Math.PI + 1.45) : a) };
}
function carryPose(d: number, dir: number, lift = 0): Pose {
  const w = walkPose(d / .4167, dir, { step: 1.15, carryB: [.62 * dir, -2.25 - lift] }); return { ...w, handA: [.45 * dir, -2.25 - lift], frontA: 1, frontB: 1, shapeA: 'hold', shapeB: 'hold' } as Pose;
}

type Shot = { t0: number; t1: number; name: string; f: (t: number, l: number) => Frame };
const S: Shot[] = [];
const shot = (name: string, t0: number, t1: number, f: Shot['f']) => S.push({ name, t0, t1, f });

// ============================================================================================== 1–3 PRESENTER (studio opens onto the bank)
const studioOpen = (t: number) => inOut(k01(t, 1.0, 1.85));
function host(t: number): ActorState {
  const sp = mouth(); let p: Pose; let face = F('calm');
  const g1 = gesture(t, 1.12, .42), g2 = gesture(t, 2.75, .4), g3 = gesture(t, 4.25, .35), g4 = gesture(t, 5.05, .3), g5 = gesture(t, 5.72, .35);
  const base = pose(t, 3, { turn: 0, lean: -.03, arms: [[-.24, -2.15], [.24, -2.12]], shapeA: 'fist', shapeB: 'fist', headTilt: .04 });
  const wide = pose(t, 3, { turn: 0, lean: .02, headLift: .04, arms: [[-1.12, -2.72], [1.12, -2.7]], shapeA: 'open', shapeB: 'open' });
  const thumb = pose(t, 3, { turn: .22, headTurn: .35, headTilt: -.1, arms: [[-.5, -1.8], [1.18, -3.55]], shapeA: 'fist', shapeB: 'point' });
  const one = pose(t, 3, { turn: -.05, headTilt: .08, arms: [[-.45, -1.75], [.85, -3.35]], shapeA: 'fist', shapeB: 'point' });
  const gun = pose(t, 3, { turn: -.2, lean: -.05, headTilt: -.1, arms: [[-.45, -1.75], [1.15, -2.95]], shapeA: 'fist', shapeB: 'point' });
  const wave = pose(t, 3, { turn: 0, headTurn: Math.sin(t * 18) * .18 * (1 - k01(t, 6.0, 6.35)), arms: [[-.45, -1.75], [.75, -3.05]], shapeA: 'fist', shapeB: 'open' });
  p = base;
  if (t < 4.1) { p = P(base, wide, g1); p = P(p, thumb, g2); }
  else { p = P(wide, one, g3); p = P(p, gun, g4); p = P(p, wave, g5); }
  if (t < 1.05) face = F('curious', 'smug', k01(t, .2, .9));
  else if (t < 2.7) face = F('shocked', 'happy', k01(t, 1.6, 2.4));
  else if (t < 4.1) face = { ...F('smug'), gx: .7 * (1 - k01(t, 3.5, 3.9)), gy: -.2 };
  else face = t < 5.6 ? F('curious', 'smug', k01(t, 4.6, 5.2)) : F('smug', 'happy', k01(t, 5.8, 6.2));
  face = talk(face, sp);
  return { id: 'host', look: CAST.host, pose: p, face, pos: [78, .08, HOST_Z], t, seed: 3, res: 2048, rim: '#ff7058', rimSide: 1, tint: [1, 1, 1], lean: .2, shadow: true };
}
function hookFrame(t: number, cam: { pos: V3; look: V3; fov: number }, grade: Frame['grade'], overlay: string): Frame {
  const o = studioOpen(t);
  return { t, cam, light: STUDIO(o, [78, 0, 4]), cut: 12.6,
    show: { 'Studio L': true, 'Studio R': true, 'Studio floor': true, 'Hook cash': true },
    xform: { 'Studio L': { pos: [-o * 5.8, 0, 1.5] }, 'Studio R': { pos: [o * 5.8, 0, 1.5] }, 'Studio floor': { pos: [0, 0, 1.5] } },
    actors: [host(t)], grade: { exposure: mix(1.05, 1.0, o), bloom: .4, lift: [.02, .01, .03], gain: [1.04, 1.0, .96], ...grade },
    fx: [{ kind: 'motes', box: [[74, .2, 2], [82, 4.5, 6]], n: 90 * o | 0, seed: 1, color: '#ffd38a', size: .05, t, alpha: .5 }],
    overlay };
}
shot('host-open', 0, 1.0, (t) => {
  const c = camPath(t, 0, 1.0, [{ p: [78, 1.52, 10.7], l: [78, 1.45, HOST_Z], f: 30 }, { p: [78, 1.5, 10.25], l: [78, 1.46, HOST_Z], f: 28 }], x => x);
  return hookFrame(t, { pos: add3(c.pos, drift(t, .006)), look: c.look, fov: c.fov }, {}, '');
});
shot('host-70m', 1.0, 4.1, (t) => {
  const c = camPath(t, 1.0, 4.1, [{ p: [78, 1.5, 10.25], l: [78, 1.46, HOST_Z], f: 28 }, { p: [78, 2.1, 12.9], l: [78, 2.1, 5.5], f: 36 }, { p: [78.7, 2.7, 14.6], l: [78, 2.9, 2.5], f: 40 }], x => 1 - (1 - x) ** 2.4);
  const v = 7e7 * (1 - (1 - k01(t, 1.05, 2.3)) ** 3);
  const ov = svg(money(v, 540, 360, 128, k01(t, 1.0, 1.15)));
  return hookFrame(t, { pos: add3(c.pos, drift(t, .01)), look: c.look, fov: c.fov }, { flash: Math.max(0, .35 - (t - 1.0) * 1.4) }, ov);
});
shot('host-gun', 4.1, 6.4, (t) => {
  const c = camPath(t, 4.1, 6.4, [{ p: [76.6, 1.3, 11.6], l: [78, 1.55, HOST_Z], f: 34 }, { p: [76.9, 1.32, 11.2], l: [78, 1.6, HOST_Z], f: 32 }], x => x);
  const strike = inOut(k01(t, 5.62, 5.9)); const ov = svg(t > 5.15 ? gunIcon(800, 520, outBack(k01(t, 5.15, 5.4), 2), strike, 1 - k01(t, 6.15, 6.35)) : '');
  return hookFrame(t, { pos: c.pos, look: c.look, fov: c.fov }, { whip: Math.max(0, (t - 6.22) * 4), whipDir: [1, 0] }, ov);
});

// ============================================================================================== 4–8 2005 FORTALEZA: crew, the rented shop, the cover business
const streetLife = (t: number, extra: ActorState[] = []): ActorState[] => {
  const ws: ActorState[] = [];
  const peds: [string, number, number, number, number][] = [['walkerA', -16, 40, 12.0, 1.25], ['walkerB', 30, -20, 11.6, 1.1], ['walkerC', -26, 30, .8, 1.3], ['walkerD', 24, -24, 12.3, 1.2]];
  peds.forEach(([who, x0, x1, z, sp], i) => {
    const dir = Math.sign(x1 - x0); const d = ((t * sp + i * 7) % Math.abs(x1 - x0)); const x = x0 + dir * d;
    ws.push({ id: 'ped' + i, look: CAST[who], pose: walkPose(d / .4167, dir, { step: 1.15 }), face: F('calm'), pos: [x, z > 10 ? .15 : .15, z], t, seed: 10 + i, res: 512, lean: .4 });
  });
  return [...ws, ...extra];
};
shot('rewind-2005', 6.4, 8.05, (t, l) => {
  const c = camPath(t, 6.4, 8.05, [{ p: [-26, 19, 7.5], l: [6, 2, -2], f: 42 }, { p: [-17, 8.5, 6.8], l: [4, 2.6, -1], f: 40 }], x => 1 - (1 - x) ** 2);
  const ov = svg(rewind(t, 1 - k01(t, 6.55, 6.85)) + chip('FORTALEZA, BRAZIL', 90, 1560, 54, t, 6.95) + pop('2005', 540, 1720, 150, t, 6.85, { color: '#ffd34d' }));
  return { t, cam: { pos: c.pos, look: c.look, fov: c.fov }, light: DAY([5, 0, 0], 45), cut: null, sign: 0, actors: streetLife(t), overlay: ov,
    xform: { 'Parked car C': { pos: [-(t - 6.4) * 9, 0, 0] } },
    grade: { whip: Math.max(0, .5 - l * 1.4), whipDir: [-1, 0], flash: Math.max(0, .4 - l * 1.6), sat: mix(.3, 1.12, k01(l, 0, .5)), gain: [1.03, 1.0, .95] } };
});
const crewWalk = (t: number, t0: number) => {
  const order: [string, number, number, number][] = [['bira', 0, 0, 1.0], ['marcos', -.9, -.7, .7], ['tiago', -1.1, .55, 1.25], ['claudio', -2.1, -.35, .55], ['junior', -2.3, .9, 1.35]];
  return order.map(([who, dx, dz, z], i) => {
    const d = (t - t0) * 1.15; const x = -12.5 + d + dx; const pz = .15;
    const ph = d / .62 + i * .3; const p = walkFront(ph * .62, {}); p.turn = .32; p.headTurn = -.15;
    return { id: who, look: CAST[who], pose: p, face: who === 'bira' ? F('determined', 'smug', .4) : F('focused'), pos: [x, pz, z + dz * .2] as V3, t, seed: i + 20, res: 768, lean: .3 } as ActorState;
  });
};
shot('crew', 8.05, 9.5, (t) => {
  const c = camPath(t, 8.05, 9.5, [{ p: [-5.6, 1.25, 3.0], l: [-11.5, 1.45, .9], f: 40 }, { p: [-6.0, 1.3, 2.8], l: [-11, 1.5, .9], f: 38 }], x => x);
  return { t, cam: { pos: add3(c.pos, drift(t, .02, 4)), look: c.look, fov: c.fov }, light: DAY([-9, 0, 1], 18), cut: null, sign: 0, actors: crewWalk(t, 8.05),
    grade: { gain: [1.03, 1.0, .95] }, overlay: svg(chip('THE CREW', 90, 1640, 50, t, 8.3, 9.35)) };
});
shot('rent', 9.5, 11.05, (t) => {
  const c = camPath(t, 9.5, 11.05, [{ p: [-.7, 2.25, 8.2], l: [-.5, 2.45, .8], f: 42 }, { p: [-.6, 2.25, 7.6], l: [-.45, 2.5, .8], f: 42 }], x => x);
  const give = gesture(t, 10.05, .35), take = gesture(t, 10.45, .3), shake = k01(t, 10.6, 11.05);
  const lp = P(pose(t, 5, { turn: .8, arms: [[.4, -1.7], [.55, -1.75]] }), pose(t, 5, { turn: .8, lean: .05, arms: [[.3, -1.7], [1.05, -2.35]], shapeB: 'hold' }), give);
  const bp = P(pose(t, 6, { turn: -.8, arms: [[-.5, -1.7], [-.4, -1.7]] }), pose(t, 6, { turn: -.8, lean: -.05, arms: [[-1.0, -2.32], [-.45, -1.7]], shapeA: 'hold' }), take);
  const bob = Math.sin(shake * Math.PI * 6) * .08 * (1 - shake);
  lp.handB = [lp.handB[0], lp.handB[1] + bob]; bp.handA = [bp.handA[0], bp.handA[1] + bob];
  const keyAtLandlord = t < 10.55;
  return { t, cam: { pos: c.pos, look: c.look, fov: c.fov }, light: DAY([0, 0, 1], 14), cut: null, sign: 0,
    actors: [{ id: 'landlord', look: CAST.landlord, pose: lp, face: F('happy', 'calm', k01(t, 10.8, 11)), pos: [.55, .15, 1.2], t, seed: 5, res: 1024, extra: keyAtLandlord && give > .2 ? keySvg([lp.handB[0] + .12, lp.handB[1]]) : '' },
      { id: 'bira', look: CAST.bira, pose: bp, face: F('calm', 'smug', k01(t, 10.4, 10.8)), pos: [-.55, .15, 1.2], t, seed: 6, res: 1024, extra: !keyAtLandlord ? keySvg([bp.handA[0] - .12, bp.handA[1]]) : '' }],
    grade: { gain: [1.03, 1.0, .95] }, overlay: svg(chip('RENTED: A SMALL SHOP', 90, 1640, 50, t, 9.75, 11.0)) };
});
shot('near-bank', 11.05, 12.1, (t) => {
  const c = camPath(t, 11.05, 12.1, [{ p: [.2, 2.25, 7.6], l: [0, 2.5, .8], f: 42 }, { p: [3, 4.5, 8.5], l: [30, 3, -2], f: 36 }, { p: [8, 7.5, 9.5], l: [66, 5, -4], f: 32 }], x => inOut(x));
  const pr = projector(c.pos, c.look, c.fov);
  return { t, cam: c, light: DAY([30, 0, 0], 50), cut: null, sign: 0, actors: streetLife(t),
    overlay: svg(pin(pr, [0, 5.6, 0], 'THE SHOP', t, 11.3) + pin(pr, [78, 15.8, -3], 'CENTRAL BANK', t, 11.55)), grade: { gain: [1.03, 1.0, .95] } };
});
shot('fake-front', 12.1, 13.05, (t) => {
  const c = camPath(t, 12.1, 13.05, [{ p: [-6.2, 2.4, 10.4], l: [.6, 2.9, 0], f: 42 }, { p: [-5.6, 2.45, 9.6], l: [.6, 3.0, 0], f: 40 }], x => x);
  const g = gesture(t, 12.35, .5);
  const cp = P(pose(t, 8, { turn: .7, crouch: .25, lean: .25, arms: [[.6, -1.25], [.85, -1.3]], shapeA: 'hold', shapeB: 'hold' }), pose(t, 8, { turn: .3, arms: [[-.5, -1.7], [.7, -3.0]], shapeB: 'open' }), g);
  return { t, cam: c, light: DAY([0, 0, 0], 14), cut: 12.6, sign: 1, actors: [{ id: 'claudio', look: CAST.claudio, pose: cp, face: F('happy'), pos: [-2.1, .15, 1.0], t, seed: 8, res: 1024 }, ...streetLife(t)],
    fx: [{ kind: 'motes', box: [[-4, .5, -1], [4, 3, 1.5]], n: 30, seed: 3, color: '#ffffff', size: .04, t, alpha: .35 }],
    grade: { gain: [1.03, 1.0, .95] } };
});
shot('grass', 13.05, 15.0, (t) => {
  const c = camPath(t, 13.05, 15.0, [{ p: [-.7, 1.85, -1.5], l: [.4, 1.45, -6.6], f: 34 }, { p: [-.3, 1.8, -2.1], l: [.5, 1.5, -6.6], f: 32 }], x => x);
  const show = gesture(t, 13.25, .45), thumbs = gesture(t, 14.1, .3);
  const cp = P(pose(t, 9, { turn: -.1, arms: [[-.5, -1.85], [.5, -1.85]] }), pose(t, 9, { turn: .05, lean: -.04, arms: [[-.62, -2.55], [.62, -2.55]], shapeA: 'hold', shapeB: 'hold' }), show);
  const cp2 = P(cp, pose(t, 9, { turn: .05, arms: [[-.5, -2.5], [.7, -3.0]], shapeA: 'hold', shapeB: 'fist' }), thumbs);
  const turfAt: V2 = [(cp2.handA[0] + (thumbs > .5 ? cp2.handA[0] + 1.0 : cp2.handB[0])) / 2, cp2.handA[1] - .05];
  const cust = pose(t, 11, { turn: -.3, back: 1, headTilt: Math.sin(t * 5) * .05 * k01(t, 14.2, 14.4), arms: [[-.5, -1.7], [.5, -1.72]] });
  return { t, cam: c, light: { ...DAY([0, 0, -5], 12), hemi: ['#fff6e6', '#b09070', 1.25], points: [{ pos: [.5, 2.7, -5], color: '#f4fbff', int: 14, dist: 9, shadow: true }, { pos: [-2.2, 2.7, -3], color: '#f4fbff', int: 6, dist: 7 }] },
    cut: null, sign: 1,
    actors: [{ id: 'claudio', look: CAST.claudio, pose: cp2, face: F('happy', 'laugh', thumbs * .6), pos: [.55, .2, -7.0], t, seed: 9, res: 1024, extra: show > .1 ? turfSvg(turfAt, 1.1) : '' },
      { id: 'customer', look: CAST.customer, pose: cust, face: F('calm'), pos: [-.4, .2, -4.75], t, seed: 11, res: 1024 }],
    props: [{ name: 'Grass roll', pos: [1.5, 1.42, -6.05], rot: [0, 0, 0], scale: [1, 1, .6] }],
    grade: { gain: [1.04, 1.0, .96] } };
});

// ============================================================================================== 9–11 UNDERNEATH: the cutaway reveal, digging, 80 m
const cutSweep = (t: number) => mix(14, 1.52, inOut(k01(t, 15.2, 16.35)));
shot('underneath', 15.0, 17.4, (t) => {
  const c = camPath(t, 15.0, 17.4, [{ p: [.5, 1.8, 11.5], l: [.5, 2.0, 0], f: 42 }, { p: [1.0, -.5, 12.8], l: [2.0, -1.8, 0], f: 46 }, { p: [3.2, -2.6, 11.4], l: [5.2, -3.3, 0], f: 46 }], x => inOut(x));
  const y = mix(-2.2, TF + .05, inOut(k01(t, 15.6, 17.3))); const ph = (t - 15.6) * 3.2;
  const climb = pose(t, 30, { turn: 0, back: 1, crouch: .1, arms: [[-.35, -3.4 - Math.max(0, Math.sin(ph)) * .3], [.35, -3.4 - Math.max(0, -Math.sin(ph)) * .3]], footA: [-.2, -.1 - Math.max(0, -Math.sin(ph)) * .3], footB: [.2, -.1 - Math.max(0, Math.sin(ph)) * .3] });
  return { t, cam: c, light: { ...DAY([5, -2, 0], 22), points: TUNNEL(6, 2).points }, cut: cutSweep(t), bulbs: 30, digX: 30, sign: 1,
    actors: [{ id: 'junior', look: CAST.junior, pose: climb, face: F('focused'), pos: [2.55, y, -.95], t, seed: 30, res: 768, contact: 0, tint: [.95, .82, .65] },
      { id: 'marcos', look: CAST.marcos, pose: digPose(t, 31, swing(t, .9), 1).p, extra: digPose(t, 31, swing(t, .9), 1).tool, face: F('focused'), pos: [8.4, TF, TZ], t, seed: 31, res: 768, tint: [1, .85, .62] }],
    grade: { gain: [1.04, 1.0, .94], vignette: .38 } };
});
shot('digging', 17.4, 19.4, (t) => {
  const c = camPath(t, 17.4, 19.4, [{ p: [30.75, -4.62, 1.3], l: [26.5, -5.05, .78], f: 52 }, { p: [30.7, -4.66, 1.28], l: [26.4, -5.1, .8], f: 50 }], x => x);
  const sw = swing(t, .95); const dg = digPose(t, 31, sw, 1);
  const sw2 = swing(t, 1.3, .4); const shov = pose(t, 32, { turn: -.55, crouch: mix(.35, .1, sw2.raise), lean: -mix(.3, 0, sw2.raise), arms: [[-mix(.9, .3, sw2.raise), mix(-1.3, -2.4, sw2.raise)], [-mix(.4, .1, sw2.raise), mix(-1.9, -2.7, sw2.raise)]] });
  const shh = gesture(t, 17.85, .3) * (1 - k01(t, 18.9, 19.2));
  const tp = P(shov, pose(t, 32, { turn: .15, headTurn: .1, arms: [[-.45, -1.75], [.1, -3.32]], shapeB: 'point' }), shh);
  const fx: Emitter[] = [{ kind: 'motes', box: [[25, -5.8, .5], [31, -4.2, 1.5]], n: 70, seed: 5, color: '#ffcf8a', size: .025, t, alpha: .45 }];
  if (sw.sinceHit >= 0) fx.push({ kind: 'debris', at: [30.6, -5.2, .8], t: (sw.u - .73) * .95, n: 14, seed: sw.cycle + 5, spread: .9, up: 2.0, floor: TF, size: .06, color: '#7a5233', dir: [-1.4, 0, 0] },
    { kind: 'puff', at: [30.5, -5.3, .8], t: (sw.u - .73) * .95, n: 10, seed: sw.cycle + 9, spread: .5, rise: .5, size: .5, color: '#9b7a58', alpha: .3 });
  return { t, cam: { pos: add3(c.pos, drift(t, .008, 2)), look: c.look, fov: c.fov }, light: TUNNEL(28.4, 3, { maxX: 31 }), cut: null, tunnelWall: true, bulbs: 31, digX: 31,
    actors: [{ id: 'marcos', look: CAST.marcos, pose: { ...dg.p, turn: .6 }, face: F('focused', 'determined', .5), pos: [29.65, TF, 1.12], t, seed: 31, res: 1536, extra: dg.tool + sweat(.25, -3.9, .8), tint: [1, .9, .74] },
      { id: 'tiago', look: CAST.tiago, pose: tp, face: shh > .3 ? { ...F('smug'), gx: 0, mOpen: 0, mO: .3 } : F('focused'), pos: [27.6, TF, .68], t, seed: 32, res: 1024, extra: shh < .3 ? shovel([tp.handA[0], tp.handA[1]], 2.2) : '', tint: [1, .88, .7] }],
    props: [{ name: 'Wheelbarrow', pos: [26.2, TF, .9], rot: [0, Math.PI, 0] }, { name: 'Bucket', pos: [28.7, TF, 1.25] }],
    fx, grade: { gain: [1.08, .98, .86], lift: [.03, .015, 0], vignette: .45, bloom: .2, exposure: .9 } };
});
shot('eighty-metres', 19.4, 22.7, (t) => {
  const c = camPath(t, 19.4, 22.7, [{ p: [-1.5, -3.0, 3.7], l: [30, -4.7, .7], f: 50 }, { p: [21, -2.85, 3.5], l: [54, -4.6, .7], f: 48 }, { p: [45, -2.6, 3.4], l: [80, -4.4, .7], f: 46 }], x => inOut(x));
  const pr = projector(c.pos, c.look, c.fov); const m = inOut(k01(t, 19.5, 20.55)); const metres = Math.round(m * 78);
  const ov = svg(measure(pr, [Math.max(2.2, c.pos[0] + 5), -3.85, 1.6], [Math.max(Math.max(2.2, c.pos[0] + 5) + .1, 2.2 + 76.2 * m), -3.85, 1.6], 1, metres + ' M', { size: 66, side: -1 }) + stamp('≈ 80 METRES LONG', 540, 1580, 78, t, 20.3, '#ffd34d', -4));
  return { t, cam: c, light: { ...DAY([40, -3, 0], 60), hemi: ['#cfe6ff', '#a0805a', .95] }, cut: 1.52, bulbs: mix(2, 79.5, m), sign: 1,
    actors: [{ id: 'marcos', look: CAST.marcos, pose: digPose(t, 31, swing(t, .9), 1).p, extra: digPose(t, 31, swing(t, .9), 1).tool, face: F('focused'), pos: [76.6, TF, TZ], t, seed: 31, res: 512, tint: [1, .88, .7] },
      { id: 'tiago', look: CAST.tiago, pose: carryPose((t - 19) * 1.0, -1), face: F('focused'), pos: [44 - (t - 19.4) * 1.0, TF, TZ], t, seed: 32, res: 512, extra: brick([-.0, -2.4]), tint: [1, .88, .7] }],
    grade: { gain: [1.03, 1.0, .95] }, overlay: ov };
});

// ============================================================================================== 12 MONTHS PASS (time-lapse)
shot('months', 22.7, 25.35, (t, l) => {
  const ph = l / 2.65; const day = (Math.sin(ph * Math.PI * 4 - Math.PI / 2) + 1) / 2; // two day/night cycles
  const sunA = ph * Math.PI * 4; const d = DAY([1, 0, 0], 22); const n = NIGHT([1, 0, 0], LAMPS);
  const L: Light = { ...d, sky: day > .5 ? d.sky : n.sky, sun: { ...d.sun, dir: [Math.cos(sunA) * .7, Math.max(.15, Math.abs(Math.sin(sunA))), .5], int: mix(.3, 3.1, 1 - day) },
    hemi: [d.hemi[0], d.hemi[1], mix(1.05, .3, day)], fog: [day > .5 ? n.fog[0] : d.fog[0], .005], points: day > .5 ? n.points : [], stars: day, env: mix(1, .3, day) };
  L.sky = [mixC(d.sky[0], n.sky[0], day), mixC(d.sky[1], n.sky[1], day)];
  const c = { pos: [-1.6, 1.6, 12.4] as V3, look: [.3, 2.6, 0] as V3, fov: 44 };
  const months = ['MAY', 'JUN', 'JUL', 'AUG']; const mi = Math.min(3, Math.floor(ph * 4)); const flip = (ph * 4) % 1;
  const cop = walkPose(((t - 23.2) * 1.2) / .4167, 1, { step: 1.15 }); const copX = -8 + Math.max(0, t - 23.2) * 1.2;
  const glance = k01(t, 24.2, 24.5) * (1 - k01(t, 24.9, 25.2));
  cop.headTurn = glance * -.9;
  return { t, cam: c, light: L, cut: null, sign: 1,
    xform: { 'Police car': { pos: [Math.max(0, t - 23.4) * 26, 0, 0] } }, show: { 'Police car': t > 23.4 && t < 25.3 },
    actors: [...streetLife(t * 3), { id: 'cop', look: CAST.cop, pose: cop, face: glance > .5 ? F('curious') : F('calm'), pos: [copX, .15, 1.6], t, seed: 40, res: 768 },
      { id: 'claudio', look: CAST.claudio, pose: pose(t, 41, { turn: -.2, arms: [[-.5, -1.7], [.75 + Math.sin(t * 14) * .12 * glance, -3.4]], shapeB: 'open' }), face: F('happy'), pos: [1.6, .2, -.6], t, seed: 41, res: 768 }],
    overlay: svg(calendar(540, 360, months[mi], '2005', flip > .85 ? (flip - .85) / .15 * .5 : 0)),
    grade: { gain: [1.03, 1.0, .97], exposure: mix(1, 1.25, day) } };
});
function mixC(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = [16, 8, 0].map(s => Math.round(mix((pa >> s) & 255, (pb >> s) & 255, k)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ============================================================================================== 13–17 THE PROBLEM: concrete
shot('reached', 25.35, 27.85, (t) => {
  const c = camPath(t, 25.35, 27.85, [{ p: [78.5, -5.3, 1.28], l: [74.4, -4.6, .78], f: 50 }, { p: [78.45, -5.35, 1.26], l: [74.5, -4.55, .8], f: 47 }], x => x);
  const sw = swing(t, .85); const up = t > 26.35; const strike = t > 26.86;
  const dg = up ? digPose(t, 31, { ...sw, raise: strike ? 0 : inOut(k01(t, 26.35, 26.86)) }, 1, true) : digPose(t, 31, sw, 1);
  const recoil = strike ? Math.exp(-(t - 26.86) * 6) : 0;
  dg.p.headLift += recoil * .1; dg.p.lean -= recoil * .1;
  const fx: Emitter[] = [{ kind: 'motes', box: [[74, -5.8, .5], [78.6, -4.2, 1.5]], n: 50, seed: 8, color: '#ffcf8a', size: .03, t, alpha: .45 }];
  if (strike) fx.push({ kind: 'sparks', at: [76.85, -4.12, 1.0], t: t - 26.86, n: 40, seed: 3, speed: 3.5 }, { kind: 'puff', at: [76.8, -4.2, 1.0], t: t - 26.86, n: 14, seed: 4, spread: .4, rise: -.3, size: .5, color: '#a8a39a', alpha: .35 });
  const bface = strike ? F('shocked', 'worried', k01(t, 27.2, 27.7)) : F('focused');
  return { t, cam: { pos: add3(c.pos, strike ? [Math.sin(t * 60) * .02 * recoil, 0, 0] : [0, 0, 0]), look: c.look, fov: c.fov }, light: TUNNEL(76, 3, { maxX: 79, extra: strike ? [{ pos: [76.85, -4.3, 1.1], color: '#ffb060', int: 18 * recoil, dist: 4 }] : [] }), cut: null, tunnelWall: true, bulbs: 79,
    actors: [{ id: 'marcos', look: CAST.marcos, pose: { ...dg.p, turn: .55 }, face: bface, pos: [76.15, TF, 1.12], t, seed: 31, res: 1536, extra: dg.tool, tint: [1, .88, .7] },
      { id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: .7, crouch: .2, lean: .1, arms: [[.4, -2.0], [.9, -2.9]], shapeB: 'hold', headTilt: strike ? -.25 : 0 }), face: strike ? F('shocked') : F('focused'), pos: [74.7, TF, .66], t, seed: 33, res: 1024, extra: torchSvg([.9, -2.9], -.5), tint: [1, .88, .7] }],
    fx, grade: { gain: [1.08, .98, .86], vignette: .45, flash: strike ? recoil * .25 : 0 } };
});
shot('problem', 27.85, 29.2, (t) => {
  const c = camPath(t, 27.85, 29.2, [{ p: [78.35, -5.5, 1.3], l: [76.6, -4.35, .85], f: 46 }, { p: [78.3, -5.52, 1.28], l: [76.7, -4.3, .85], f: 44 }], x => x);
  return { t, cam: c, light: TUNNEL(73, 2, { maxX: 75, extra: [{ pos: [77.0, -4.9, 1.3], color: '#fff1c8', int: 3, dist: 3 }] }), cut: null, tunnelWall: true, bulbs: 79,
    actors: [{ id: 'marcos', look: CAST.marcos, pose: pose(t, 31, { turn: .4, headTilt: -.35, headLift: .05, arms: [[-.5, -1.7], [.3, -2.4]] }), face: { ...F('worried'), gy: -.9, gx: .3 }, pos: [77.3, TF, .72], t, seed: 31, res: 1536, extra: sweat(.32, -3.95, 1), tint: [1, .9, .74] },
      { id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: .5, headTilt: -.4, arms: [[-.5, -1.7], [.7, -3.3]], shapeB: 'hold' }), face: { ...F('worried', 'fear', k01(t, 28.4, 29)), gy: -.9, gx: .4 }, pos: [76.5, TF, 1.12], t, seed: 33, res: 1536, extra: torchSvg([.7, -3.3], -1.2), tint: [1, .9, .74] }],
    grade: { gain: [1.06, .98, .9], vignette: .5, exposure: .78 } };
});
shot('vault-slab', 29.2, 32.05, (t) => {
  const c = camPath(t, 29.2, 32.05, [{ p: [78.1, -2.4, 9.4], l: [78.1, -3.1, 0], f: 36 }, { p: [78.1, -2.55, 8.4], l: [78.1, -3.25, 0], f: 36 }], x => x);
  const pr = projector(c.pos, c.look, c.fov); const m = inOut(k01(t, 30.35, 31.2));
  return { t, cam: c, light: { ...VAULT(.9, [{ pos: [77.2, -4.6, 1.2], color: '#ffb260', int: 6, dist: 6 }, { pos: [78.1, -3.4, 5.5], color: '#e8eef8', int: 14, dist: 12 }]), hemi: ['#cfe0ff', '#30343c', .4] }, cut: 1.52, bulbs: 79,
    actors: [{ id: 'marcos', look: CAST.marcos, pose: pose(t, 31, { turn: .3, headTilt: -.3 }), face: { ...F('worried'), gy: -.8 }, pos: [77.6, TF, TZ], t, seed: 31, res: 512, tint: [1, .88, .7] },
      { id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: .5, headTilt: -.35 }), face: { ...F('worried'), gy: -.8 }, pos: [76.7, TF, TZ - .1], t, seed: 33, res: 512, tint: [1, .88, .7] }],
    overlay: svg(measure(pr, [76.9, -4.1, 1.62], [76.9, -3.0, 1.62], m, m > .95 ? '1+ METRE' : (m * 1.1).toFixed(1) + ' M', { size: 54, side: 1 })),
    grade: { gain: [.98, 1.0, 1.04] } };
});
shot('reinforced', 32.05, 34.2, (t) => {
  const c = camPath(t, 32.05, 34.2, [{ p: [79.6, -3.0, 6.4], l: [78.0, -3.5, 0], f: 34 }, { p: [79.1, -3.1, 5.6], l: [77.9, -3.55, 0], f: 33 }], x => x);
  const xr = inOut(k01(t, 32.2, 32.75));
  return { t, cam: c, light: VAULT(.7, [{ pos: [78, -3.6, 2.5], color: '#ff8a40', int: 3 * xr, dist: 5 }, { pos: [78.6, -3.3, 6.0], color: '#e8eef8', int: 12, dist: 12 }]), cut: 1.52, bulbs: 79, slab: xr, rebarGlow: xr,
    overlay: svg(stamp('REINFORCED CONCRETE', 540, 1520, 66, t, 32.35, '#ff7a2a', -3)), grade: { gain: [1.0, .98, 1.02], bloom: .45 } };
});
shot('break-through', 34.2, 36.0, (t) => {
  const c = camPath(t, 34.2, 36.0, [{ p: [81.2, -2.45, .7], l: [78.1, -2.9, .8], f: 44 }, { p: [80.9, -2.4, .75], l: [78.1, -2.8, .8], f: 42 }], x => x);
  const bt = 35.15, broke = t >= bt, cr = inOut(k01(t, 34.4, 35.1));
  const rumble = t < bt ? Math.sin(t * 70) * .006 * cr : Math.exp(-(t - bt) * 5) * Math.sin(t * 60) * .03;
  const fx: Emitter[] = [];
  if (broke) fx.push({ kind: 'debris', at: [78.1, -3.0, .85], t: t - bt, n: 40, seed: 11, spread: 1.2, up: 4.2, floor: VF, size: .1, color: '#9a978f' },
    { kind: 'puff', at: [78.1, -2.9, .85], t: t - bt, n: 26, seed: 12, spread: .9, rise: 1.4, size: 1.0, color: '#b7b2a8', alpha: .4, dur: 3 },
    { kind: 'motes', box: [[77.4, -2.95, .3], [78.8, -.7, 1.4]], n: 120, seed: 13, color: '#ffd9a0', size: .03, t, alpha: .6 });
  return { t, cam: { pos: add3(c.pos, [rumble, rumble * .5, 0]), look: c.look, fov: c.fov }, light: VAULT(.38, broke ? [{ pos: [78.1, -3.5, .85], color: '#ffb468', int: 22, dist: 6, shadow: true }] : []), cut: null, vaultWall: true,
    floorCracks: broke ? 0 : cr, show: { 'Floor plug': !broke }, beam: broke ? { at: [78.1, -3.6, .85], dir: [0, 3.2, 0], k: k01(t, bt, bt + .3) } : undefined, fx,
    grade: { flash: broke ? Math.max(0, .45 - (t - bt) * 2) : 0, bloom: .7, gain: [1.02, 1.0, 1.02], vignette: .5 } };
});

// ============================================================================================== 18–21 INSIDE THE VAULT
shot('emerge', 36.0, 37.55, (t) => {
  const c = camPath(t, 36.0, 37.55, [{ p: [79.8, -2.62, 1.3], l: [78.1, -2.35, .75], f: 42 }, { p: [79.65, -2.55, 1.25], l: [78.1, -2.25, .75], f: 40 }], x => x);
  const rise = inOut(k01(t, 36.05, 36.9)); const y = mix(-5.1, -3.42, rise);
  const look = Math.sin(k01(t, 36.9, 37.55) * Math.PI) * .6;
  return { t, cam: c, light: VAULT(.4, [{ pos: [78.1, -3.6, .85], color: '#ffb468', int: 10, dist: 5 }, { pos: [77.4, -2.2, -1.2], color: '#fff3d0', int: 8, dist: 6 }]), cut: null, vaultWall: true, show: { 'Floor plug': false },
    actors: [{ id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: -.35 + look * .5, headTurn: look * .6, arms: [[-.95, -2.05], [.95, -2.05]], shapeA: 'open', shapeB: 'open' }), face: F('focused', 'curious', k01(t, 36.8, 37.2)), pos: [78.1, y, .85], t, seed: 33, res: 1536, contact: 0, tint: [.92, .9, .95] }],
    beam: { at: [77.6, -2.25, .8], dir: [-1.6, .2, -2.2], k: k01(t, 36.9, 37.1) },
    fx: [{ kind: 'motes', box: [[77.2, -2.95, -.5], [79, -.8, 1.4]], n: 90, seed: 14, color: '#ffe0b0', size: .03, t, alpha: .5 }], grade: { gain: [1.0, 1.0, 1.04], vignette: .5 } };
});
shot('unbelievable', 37.55, 38.45, (t) => {
  const c = camPath(t, 37.55, 38.45, [{ p: [79.6, -1.45, 1.3], l: [74.5, -2.3, -.4], f: 46 }, { p: [79.8, -1.2, 1.35], l: [74.5, -2.2, -.7], f: 50 }], x => x);
  const lights = inOut(k01(t, 37.62, 37.92));
  const glints: Emitter = { kind: 'motes', box: [[73, -2.9, -3.6], [83, -1.4, .2]], n: 70, seed: 15, color: '#fff6d0', size: .05, t: t * 3, alpha: .8 * lights };
  return { t, cam: c, light: VAULT(.35 + lights * .65, [{ pos: [78.1, -3.6, .85], color: '#ffb468', int: 6, dist: 5 }]), cut: null, vaultWall: true, show: { 'Floor plug': false },
    actors: [{ id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: -.6, back: 1, arms: [[-.95, -2.05], [.95, -2.05]], shapeA: 'open', shapeB: 'open' }), face: F('shocked'), pos: [78.1, -3.42, .85], t, seed: 33, res: 1024, contact: 0, tint: [.95, .95, 1] }],
    fx: [glints], grade: { bloom: .5, gain: [1.0, 1.0, 1.05], exposure: mix(.85, 1.08, lights) } };
});
shot('unbelievable-face', 38.45, 39.45, (t) => {
  const c = camPath(t, 38.45, 39.45, [{ p: [76.75, -1.95, 1.08], l: [78.25, -1.9, .8], f: 36 }, { p: [76.85, -1.95, 1.06], l: [78.25, -1.88, .8], f: 33 }], x => x);
  const glints: Emitter = { kind: 'motes', box: [[76, -2.9, -1], [80, -1.0, 1.4]], n: 40, seed: 25, color: '#fff6d0', size: .035, t: t * 3, alpha: .7 };
  return { t, cam: c, light: VAULT(1, [{ pos: [76.9, -1.6, .2], color: '#fff3d8', int: 8, dist: 4 }]), cut: null, vaultWall: true, show: { 'Floor plug': false },
    actors: [{ id: 'bira', look: CAST.bira, pose: pose(t, 33, { turn: -.35, arms: [[-.95, -2.05], [.95, -2.05]], shapeA: 'open', shapeB: 'open', headLift: .04 * gesture(t, 38.8, .3) }), face: F('shocked', 'laugh', k01(t, 38.75, 39.15)), pos: [78.1, -3.42, .85], t, seed: 33, res: 2048, contact: 0, tint: [.97, .97, 1] }],
    fx: [glints], grade: { bloom: .5, gain: [1.0, 1.0, 1.05] } };
});
const palletsLeft = (t: number) => Math.round(mix(10, 2, inOut(k01(t, 39.8, 42.0))));
const palletShow = (n: number) => Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['Pallet ' + i, i < n]));
shot('weekend', 39.45, 42.05, (t) => {
  const c = camPath(t, 39.45, 42.05, [{ p: [82.3, -1.7, 1.35], l: [77.3, -2.3, -.3], f: 44 }, { p: [81.9, -1.75, 1.38], l: [77.3, -2.35, -.25], f: 42 }], x => x);
  const fast = t * 2.2; const cyc = (fast % 1);
  const lift = Math.sin(cyc * Math.PI * 2);
  const tiago = pose(fast, 34, { turn: .5, crouch: .25 - lift * .2, lean: .25 - lift * .2, arms: [[.6 + lift * .2, -1.6 - (lift + 1) * .4], [.95 + lift * .2, -1.6 - (lift + 1) * .4]], shapeA: 'hold', shapeB: 'hold' });
  const junior = pose(fast, 35, { turn: -.4, crouch: .6, lean: .45, arms: [[-.8 - lift * .2, -1.1 - (1 - lift) * .3], [-.4 - lift * .2, -1.05 - (1 - lift) * .3]], shapeA: 'hold', shapeB: 'hold' });
  const hours = mix(2, 47, k01(t, 39.6, 42.0)); const day = hours < 24 ? 'SATURDAY' : 'SUNDAY';
  return { t, cam: c, light: VAULT(1), cut: null, vaultWall: true, show: { 'Floor plug': false, ...palletShow(palletsLeft(t)) },
    actors: [{ id: 'tiago', look: CAST.tiago, pose: tiago, face: F('focused'), pos: [76.0, VF, -.4], t: fast, seed: 34, res: 1024, extra: bag([(tiago.handA[0] + tiago.handB[0]) / 2, (tiago.handA[1] + tiago.handB[1]) / 2 - .05], 0, .9), tint: [.95, .97, 1] },
      { id: 'junior', look: CAST.junior, pose: junior, face: F('focused'), pos: [78.1, VF, .55], t: fast, seed: 35, res: 1024, extra: lift < 0 ? bag([(junior.handA[0] + junior.handB[0]) / 2, junior.handA[1] - .05], 0, .9) : '', tint: [.95, .97, 1] }],
    overlay: svg(clock(540, 380, hours, day)), grade: { gain: [1.0, 1.0, 1.04], whip: 0 } };
});
shot('tonnes', 42.05, 44.5, (t) => {
  const d = (t - 42.05) * 1.35; const xR = 60 - d, xJ = xR + 2.9, xT = xR + 5.0;
  const c = { pos: [xR - 2.7, -4.62, 1.25] as V3, look: [xR + 2.5, -5.05, .85] as V3, fov: 50 };
  const step = (dd: number, hands: [V2, V2]): Pose => { const p = walkFront(dd, {}); p.turn = -.35; p.handA = hands[0]; p.handB = hands[1]; p.shapeA = p.shapeB = 'hold'; p.lean = -.06; return p; };
  const ren = step(d, [[-.55, -1.75], [.55, -1.8]]); const jun = step(d + .3, [[-.45, -2.15], [.45, -2.2]]); const tia = step(d + .6, [[-.38, -2.95], [.42, -3.2]]);
  const cart: PropState[] = [{ name: 'Cash cart', pos: [xR + 1.25, TF, .85], rot: [0, Math.PI, 0] }, { name: 'Cash cart', pos: [xJ - 1.2, TF, .85], rot: [0, Math.PI, 0] }];
  return { t, cam: c, light: TUNNEL(xR + 1, 4, { int: 6 }), cut: null, tunnelWall: true, bulbs: 80,
    actors: [{ id: 'renato', look: CAST.renato, pose: ren, face: F('determined'), pos: [xR, TF, .9], t, seed: 36, res: 1024, tint: [1, .9, .76] },
      { id: 'junior', look: CAST.junior, pose: jun, face: F('focused'), pos: [xJ, TF, 1.0], t, seed: 35, res: 768, tint: [1, .88, .72] },
      { id: 'tiago', look: CAST.tiago, pose: tia, face: F('focused'), pos: [xT, TF, .85], t, seed: 32, res: 768, extra: bag([.05, -3.25], -8, .95) + bag([-.55, -1.75], 6, .8), tint: [1, .88, .72] }],
    props: cart, fx: [{ kind: 'motes', box: [[xR - 3, -5.8, .5], [xR + 6, -4.2, 1.5]], n: 60, seed: 16, color: '#ffcf8a', size: .025, t, alpha: .45 }],
    overlay: svg(stamp('3.5 TONNES', 540, 330, 120, t, 42.15, '#ffd34d', -4) + pop('OF CASH', 540, 460, 64, t, 42.5, { weight: 900 })),
    grade: { gain: [1.08, .98, .86], vignette: .4 } };
});
shot('no-alarms', 44.5, 45.2, (t) => {
  const c = { pos: [83.05, -1.0, -2.75] as V3, look: [83.66, -.88, -3.66] as V3, fov: 30 };
  const shadowPass = Math.sin((t - 44.5) * 6) > .3;
  return { t, cam: c, light: VAULT(.55, [{ pos: [82.4, -1.5, -2.4], color: shadowPass ? '#556070' : '#dfeaff', int: 3, dist: 4 }]), cut: null, vaultWall: true, show: { ...palletShow(1), 'Floor plug': false },
    overlay: svg(chip('ALARM: SILENT', 540, 1640, 52, t, 44.6, 99, 'middle')), grade: { aperture: 1.6, focus: 1.1, gain: [.98, 1.0, 1.05], vignette: .55 } };
});
shot('no-guards', 45.2, 45.95, (t) => {
  const c = { pos: [76.7, 2.25, -9.7] as V3, look: [72.8, 2.05, -9.25] as V3, fov: 40 };
  const g = pose(t, 50, { turn: .3, crouch: .45, lean: -.3, headTilt: -.45, headLift: -.05, arms: [[-.7, -1.5], [.6, -1.45]], footA: [-.5, -.08], footB: [.7, -.08] });
  return { t, cam: c, light: { ...NIGHT([72, 1, -8]), hemi: ['#30457a', '#1a1410', .28], points: [{ pos: [72.8, 3.0, -7.9], color: '#8fd0b0', int: 6, dist: 5 }, { pos: [74, 5.2, -9], color: '#c8d8ff', int: 4, dist: 7 }] }, cut: null,
    actors: [{ id: 'guard', look: CAST.guard, pose: g, face: { ...F('tired'), eyeOpen: 0, mOpen: .35, mO: .5 }, pos: [72.8, 1.22, -9.25], t, seed: 50, res: 1024, noAuto: true, extra: zzz(t), tint: [.85, .95, .95] }],
    overlay: svg(chip('NO GUARDS', 540, 1640, 52, t, 45.3, 99, 'middle')), grade: { gain: [.95, 1.02, 1.05], vignette: .55 } };
});

// ============================================================================================== 22–23 MONDAY
shot('monday', 45.95, 47.55, (t) => {
  const c = camPath(t, 45.95, 47.55, [{ p: [79.5, 1.5, 9.2], l: [78, 3.2, -3], f: 44 }, { p: [79.3, 1.6, 8.4], l: [78, 3.6, -3], f: 42 }], x => x);
  const walkers = (['clerk', 'clerk2', 'clerk3'] as const).map((w, i) => {
    const d = (t - 45.95) * 1.25 + i * .3; const p = walkFront(d, { away: true }); return { id: w, look: CAST[w], pose: p, face: F('calm'), pos: [76.8 + i * 1.3, .2, 2.0 - d - i * .5] as V3, t, seed: 60 + i, res: 768 } as ActorState;
  });
  return { t, cam: c, light: DAY([78, 0, 0], 25), cut: null, actors: walkers, overlay: svg(t > 47.45 ? `<g transform="translate(540 360) scale(${outBack(k01(t, 47.45, 47.8), 1.8)}) translate(-540 -360)">${calendar(540, 360, 'MON', 'AUGUST 8', 0)}</g>` : ''), grade: { gain: [1.02, 1.0, .98] } };
});
shot('door-opens', 47.55, 48.9, (t) => {
  const c = camPath(t, 47.55, 48.9, [{ p: [80.6, -1.75, .3], l: [72.6, -1.95, -1.3], f: 40 }, { p: [80.1, -1.75, .25], l: [72.6, -1.95, -1.3], f: 38 }], x => x);
  const o = inOut(k01(t, 47.6, 48.5)); const enter = k01(t, 48.3, 48.9);
  const cl = walkPose(enter * .85 / .4167, 1, { step: 1.15 }); cl.handB = [.6, -2.4]; cl.shapeB = 'hold';
  return { t, cam: c, light: VAULT(o, [{ pos: [70, -1.4, -1.4], color: '#fff2d8', int: 30 * o, dist: 9, shadow: true }]), cut: null, vaultWall: true, show: { ...palletShow(0), 'Floor plug': false },
    xform: { 'Vault door': { rot: [0, o * 1.75, 0] } },
    actors: enter > 0 ? [{ id: 'clerk', look: CAST.clerk, pose: cl, face: F('calm', 'curious', enter), pos: [71.6 + enter * .85, VF, -1.4], t, seed: 60, res: 1024, extra: cupSvg([.6, -2.5]), tint: [.9, .92, 1] }] : [],
    fx: [{ kind: 'motes', box: [[72, -2.9, -2.5], [76, -.8, .2]], n: 80 * o | 0, seed: 17, color: '#fff2d8', size: .03, t, alpha: .5 }], grade: { gain: [1.0, 1.0, 1.04], vignette: .5 } };
});
shot('vanished', 48.9, 50.55, (t) => {
  const c = camPath(t, 48.9, 50.55, [{ p: [75.7, -1.55, .4], l: [73.4, -1.55, -1.3], f: 34 }, { p: [75.35, -1.52, .15], l: [73.4, -1.5, -1.3], f: 30 }], x => x);
  const drop = t > 49.35; const dt = t - 49.35;
  const pz = pose(t, 60, { turn: .55, headLift: drop ? .08 : 0, arms: drop ? [[-.9, -3.4], [.95, -3.45]] : [[-.5, -1.7], [.6, -2.4]], shapeA: drop ? 'open' : 'fist', shapeB: drop ? 'open' : 'hold' });
  const cupY = drop ? -2.5 + 9.8 * .5 * Math.min(dt, .32) ** 2 / .4167 : -2.5; const cupX = drop ? .6 + dt * .5 : .6;
  const v = 7e7 * (1 - inOut(k01(t, 49.4, 50.1)));
  const ov = svg(money(v, 540, 360, 120, 1 - k01(t, 50.2, 50.5) * .0) + stamp('VANISHED', 540, 520, 96, t, 49.45, '#e5322d', -5));
  return { t, cam: c, light: VAULT(1, [{ pos: [70, -1.4, -1.4], color: '#fff2d8', int: 26, dist: 9 }]), cut: null, vaultWall: true, show: { ...palletShow(0), 'Floor plug': false },
    xform: { 'Vault door': { rot: [0, 1.75, 0] } },
    actors: [{ id: 'clerk', look: CAST.clerk, pose: pz, face: drop ? F('shocked', 'terror', k01(t, 49.6, 50.0)) : F('curious', 'confused', k01(t, 48.9, 49.3)), pos: [73.4, VF, -1.25], t, seed: 60, res: 1536,
      extra: cupY < -.1 ? cupSvg([cupX, Math.min(cupY, -.15)], drop ? dt * 400 : 0) : '', tint: [.95, .96, 1] },
      ...(t > 49.15 ? [{ id: 'clerk2', look: CAST.clerk2, pose: P(walkPose(k01(t, 49.15, 49.7) * .75 / .4167, 1, { step: 1.15 }), pose(t, 61, { turn: .5, arms: [[-.32, -3.45], [.32, -3.45]], shapeA: 'open', shapeB: 'open', headLift: .05 }), k01(t, 49.6, 49.85)),
        face: t > 49.6 ? F('shocked', 'terror', k01(t, 49.9, 50.2)) : F('curious'), pos: [71.5 + k01(t, 49.15, 49.7) * .75, VF, -1.75] as V3, t, seed: 61, res: 1024, tint: [.92, .94, 1] } as ActorState] : [])],
    fx: drop && dt > .32 ? [{ kind: 'puff', at: [73.6, VF, -1.1], t: dt - .32, n: 8, seed: 18, spread: .3, rise: .05, size: .25, color: '#5a3a22', alpha: .5, dur: 1 }] : [],
    overlay: ov, grade: { gain: [1.0, 1.0, 1.04], vignette: .45 } };
});

// ============================================================================================== 24–26 PAYOFF
shot('history', 50.55, 52.6, (t) => {
  const c = camPath(t, 50.55, 52.6, [{ p: [94, 2.6, 17], l: [62, -2.5, 0], f: 40 }, { p: [99, 6.5, 24], l: [56, -2.5, 0], f: 40 }], x => x);
  const cops: ActorState[] = [0, 1].map(i => ({ id: 'cop' + i, look: CAST.cop, pose: pose(t, 70 + i, { turn: i ? -.6 : .4 }), face: F('confused'), pos: [72 + i * 4.5, .15, 1.0 + i * .4] as V3, t, seed: 70 + i, res: 512 }));
  return { t, cam: c, light: { ...GOLD([60, -2, 0], 50), points: [{ pos: [74, 1.4, 5.2], color: '#3060ff', int: 30 * (Math.sin(t * 20) > 0 ? 1 : .1), dist: 10 }, { pos: [74, 1.4, 4.8], color: '#ff2020', int: 30 * (Math.sin(t * 20) > 0 ? .1 : 1), dist: 10 }] },
    cut: 1.52, bulbs: 80, show: { 'Police car': true, ...palletShow(0), 'Floor plug': false }, xform: { 'Police car': { pos: [104, 0, 0] } }, actors: cops,
    overlay: svg(pop('THE FORTALEZA HEIST', 540, 300, 84, t, 50.7, { weight: 900 }) + pop('BANCO CENTRAL · 2005', 540, 372, 44, t, 50.9, { weight: 700, color: '#ffd34d', track: 4 }) +
      ''),
    grade: { gain: [1.06, 1.0, .93], bloom: .5 } };
});
function feetShot(t: number, withHost: boolean): Frame {
  const c0 = camPath(t, 52.6, 55.9, [{ p: [41.2, -1.85, 8.6], l: [41.2, -1.95, 0], f: 54 }, { p: [41.5, -1.8, 7.8], l: [41.5, -1.9, 0], f: 54 }], x => x);
  const c = withHost ? camPath(t, 55.9, 57.2, [{ p: c0.pos, l: c0.look, f: c0.fov }, { p: [41.45, .9, 5.4], l: [41.4, 1.0, 1.15], f: 44 }, { p: [41.42, 1.42, 3.3], l: [41.4, 1.43, 1.15], f: 36 }], inOut) : c0;
  const walkers: ActorState[] = ([['walkerA', 1, 0], ['walkerC', -1, 3], ['walkerB', 1, 6], ['walkerD', -1, 9]] as const).map(([w, dir, off], i) => {
    const d = ((t * 1.2 + off) % 16); const x = dir > 0 ? 34 + d : 49 - d;
    return { id: 'feet' + i, look: CAST[w], pose: walkPose(d / .4167, dir, { step: 1.15 }), face: F('calm'), pos: [x, .15, .7] as V3, t, seed: 80 + i, res: 768 };
  });
  const cartX = 49 - (t - 52.6) * 1.3;
  const ren = walkPose((t - 52.6) * 1.3 / .4167, -1, { step: 1.15 }); ren.handA = [-.75, -2.05]; ren.handB = [-.7, -2.0]; ren.shapeA = ren.shapeB = 'hold';
  const acts: ActorState[] = [...walkers, { id: 'renato', look: CAST.renato, pose: ren, face: F('focused'), pos: [cartX, TF, TZ], t, seed: 36, res: 768, tint: [1, .88, .72] }];
  if (withHost) {
    const arrive = k01(t, 54.75, 55.85); const hx = mix(43.2, 41.4, arrive);
    let hp = arrive < 1 ? walkPose(mix(0, 1.8, arrive) / .4167, -1, { step: 1.15 }) : pose(t, 3, { turn: 0 });
    const lookDown = gesture(t, 55.65, .4) * (1 - gesture(t, 56.35, .35)); const point = gesture(t, 56.9, .3);
    if (arrive >= 1) hp = pose(t, 3, { turn: .05, headTilt: lookDown * .35 - point * .05, arms: [[-.5, -1.72], P(pose(t, 3, {}), pose(t, 3, { handB: [.75, -1.0] }), point).handB], shapeB: point > .5 ? 'point' : 'fist' });
    const face = arrive < 1 ? F('calm') : lookDown > .5 ? { ...F('curious'), gy: .95 } : { ...F('smug', 'happy', k01(t, 56.9, 57.4)), browY: .5, browAng: -.25 };
    acts.push({ id: 'host', look: CAST.host, pose: hp, face, pos: [hx, .15, 1.15], t, seed: 3, res: 2048 });
  }
  const dustT = -1;
  return { t, cam: c, light: { ...DAY([41, -2, 0], 16), points: TUNNEL(cartX, 2, { int: 5 }).points, hemi: ['#cfe6ff', '#a0805a', .9] }, cut: 1.52, bulbs: 80, actors: acts,
    props: [{ name: 'Cash cart', pos: [cartX - 1.3, TF, TZ], rot: [0, Math.PI, 0] }],
    fx: withHost && dustT > 0 ? [{ kind: 'puff', at: [41.4, -4.15, TZ], t: dustT, n: 12, seed: 19, spread: .3, rise: -.4, size: .35, color: '#8a6a4a', alpha: .45, dur: 1.4 },
      { kind: 'debris', at: [41.4, -4.15, TZ], t: dustT, n: 8, seed: 20, spread: .3, up: 0, floor: TF, size: .03, color: '#7a5233' }] : [],
    
    grade: { gain: [1.04, 1.0, .95], fade: k01(t, 57.45, 58.0) } };
}
shot('feet', 52.6, 54.75, t => feetShot(t, false));
shot('host-end', 54.75, 58.0, t => feetShot(t, true));

// ============================================================================================== v2 NEW SHOTS (natural times = film times)
shot('slab-oner', 0.0, 3.95, (t) => {
  // one continuous push from the vault cross-section into the slab: "protected by over a metre of reinforced concrete"
  const F0 = S.find(x => x.name === 'vault-slab')!.f(29.0 + t, t - .2);
  const c = camPath(t, 0, 3.95, [{ p: [78.1, -2.35, 9.6], l: [78.1, -3.05, 0], f: 36 }, { p: [78.15, -2.6, 8.0], l: [78.1, -3.25, 0], f: 36 }, { p: [78.7, -3.05, 6.3], l: [78.0, -3.45, 0], f: 34 }, { p: [78.9, -3.15, 5.4], l: [77.95, -3.55, 0], f: 33 }], inOut);
  const xr = inOut(k01(t, 2.55, 3.1)); const pr = projector(c.pos, c.look, c.fov); const m = inOut(k01(t, 1.35, 2.05)) * (1 - k01(t, 2.5, 2.7));
  return { ...F0, t, cam: c, slab: xr, rebarGlow: xr,
    light: { ...F0.light, points: [...(F0.light.points ?? []).slice(0, 4), { pos: [78.6, -3.3, 6.0], color: '#e8eef8', int: 13, dist: 12 }, { pos: [78, -3.6, 2.5], color: '#ff8a40', int: 3 * xr, dist: 5 }] },
    overlay: svg((m > 0 ? measure(pr, [77.45, -4.1, 1.62], [77.45, -3.0, 1.62], m, m > .95 ? '1+ METRE' : (m * 1.1).toFixed(1) + ' M', { size: 54, side: -1 }) : '') + stamp('REINFORCED CONCRETE', 540, 1520, 66, t, 2.7, '#ff7a2a', -3)),
    grade: { gain: [.99, 1.0, 1.03], bloom: .4 } };
});
shot('cctv-guard', 15.0, 17.15, (t) => {
  const c = camPath(t, 15.0, 17.15, [{ p: [72.8, 2.62, -6.75], l: [72.8, 2.62, -8.28], f: 50 }, { p: [72.85, 2.64, -6.6], l: [72.8, 2.62, -8.28], f: 50 }, { p: [75.5, 2.55, -7.7], l: [73.4, 2.25, -9.1], f: 42 }, { p: [76.7, 2.25, -9.7], l: [72.8, 2.05, -9.25], f: 40 }],
    x => x < .25 ? x * .4 : x < .62 ? .1 + inOut((x - .25) / .37) * .9 : 1);
  const g = pose(t, 50, { turn: .3, crouch: .45, lean: -.3, headTilt: -.45 + Math.sin(t * 1.3) * .03, headLift: -.05, arms: [[-.7, -1.5], [.6, -1.45]], footA: [-.5, -.08], footB: [.7, -.08] });
  return { t, cam: c, light: { ...NIGHT([72, 1, -8]), hemi: ['#30457a', '#1a1410', .28], points: [{ pos: [72.8, 3.0, -7.9], color: '#8fd0b0', int: 6, dist: 5 }, { pos: [74, 5.2, -9], color: '#c8d8ff', int: 4, dist: 7 }] }, cut: null,
    actors: [{ id: 'guard', look: CAST.guard, pose: g, face: { ...F('tired'), eyeOpen: 0, mOpen: .3 + Math.sin(t * 1.3) * .08, mO: .5 }, pos: [72.8, 1.22, -9.25], t, seed: 50, res: 1024, noAuto: true, extra: t > 15.9 ? zzz(t) : '', tint: [.85, .95, .95] }],
    grade: { gain: [.95, 1.02, 1.05], vignette: .55 } };
});
shot('gang-rent-bank', 36.05, 39.55, (t) => {
  const arrive = 37.25;
  const crew: [string, number, number][] = [['bira', -.55, 1.45], ['marcos', -1.45, 2.0], ['tiago', -2.25, 1.65], ['claudio', -3.0, 2.2], ['junior', -3.7, 1.85]];
  const acts: ActorState[] = crew.map(([who, xe, z], i) => {
    const start = xe - 6.3, sp = 6.3 / (arrive - 36.05 + i * .12); const d = Math.min(6.3, Math.max(0, t - 36.05) * sp); const x = start + d;
    const walk = walkPose(d / .4167, 1, { step: 1.15 }); const stand = pose(t, 20 + i, { turn: .8, headTurn: who === 'bira' ? 0 : .1 });
    let p = P(walk, stand, k01(6.3 - d, .35, 0));
    if (who === 'bira') {
      const take = gesture(t, 37.55, .3), shake = k01(t, 37.95, 38.4);
      p = P(p, pose(t, 6, { turn: .8, lean: .05, arms: [[.45, -1.7], [1.0, -2.32]], shapeB: 'hold' }), take);
      p.handB = [p.handB[0], p.handB[1] + Math.sin(shake * Math.PI * 6) * .07 * (1 - shake)];
    }
    return { id: who, look: CAST[who], pose: p, face: who === 'bira' ? F('calm', 'smug', k01(t, 37.7, 38.1)) : F('focused'), pos: [x, .15, z] as V3, t, seed: 20 + i, res: 768, lean: 0,
      extra: who === 'bira' && t > 37.85 ? keySvg([p.handB[0] + .12, p.handB[1]]) : '' };
  });
  const give = gesture(t, 37.4, .35) * (1 - k01(t, 37.85, 38.0)), shake2 = k01(t, 37.95, 38.4);
  const lp = P(pose(t, 5, { turn: -.8, arms: [[-.5, -1.7], [-.4, -1.72]] }), pose(t, 5, { turn: -.8, lean: -.05, arms: [[-1.05, -2.35], [-.45, -1.72]], shapeA: 'hold' }), Math.max(give, shake2 > 0 && shake2 < 1 ? 1 : 0));
  lp.handA = [lp.handA[0], lp.handA[1] + Math.sin(shake2 * Math.PI * 6) * .07 * (1 - shake2)];
  acts.push({ id: 'landlord', look: CAST.landlord, pose: lp, face: F('happy'), pos: [.55, .15, 1.45], t, seed: 5, res: 768, lean: 0, extra: t < 37.85 && give > .2 ? keySvg([lp.handA[0] - .12, lp.handA[1]]) : '' });
  const follow = Math.min(-.3, -6.6 + Math.max(0, t - 36.05) * 5.2);
  const c = t < 38.35 ? camPath(t, 36.05, 38.35, [{ p: [follow + .2, 1.75, 9.4], l: [follow - 1.0, 1.4, 1.4], f: 46 }, { p: [follow + .2, 1.8, 9.2], l: [follow - 1.0, 1.45, 1.4], f: 46 }], x => x)
    : camPath(t, 38.35, 39.55, [{ p: [-.1, 1.8, 9.2], l: [-1.3, 1.45, 1.4], f: 46 }, { p: [3, 4.5, 9.2], l: [28, 3, -2], f: 36 }, { p: [8, 7.5, 9.6], l: [66, 5, -4], f: 32 }], inOut);
  const pr = projector(c.pos, c.look, c.fov);
  return { t, cam: c, light: DAY([0, 0, 1], 18), cut: 12.6, sign: 0, actors: [...acts, ...streetLife(t)],
    overlay: svg(pin(pr, [0, 5.6, 0], 'THE SHOP', t, 38.55) + pin(pr, [78, 15.8, -3], 'CENTRAL BANK', t, 38.8)), grade: { gain: [1.03, 1.0, .95] } };
});
shot('tunnel-track', 45.0, 47.6, (t) => {
  const x = 6 + inOut(k01(t, 45.0, 47.6)) * 16 + (t - 45.0) * .4; const sway = Math.sin(t * 2.1) * .03;
  const c = { pos: [x, -4.78 + sway * .5, .95 + sway] as V3, look: [x + 6, -4.95, .95] as V3, fov: 54 };
  const m = inOut(k01(t, 45.15, 46.2)); const metres = Math.round(m * 78);
  const ren = walkPose((t - 45.0) * 1.2 / .4167, 1, { step: 1.15 }); ren.handA = [.95, -1.55]; ren.handB = [1.0, -1.6]; ren.shapeA = ren.shapeB = 'hold'; ren.lean = .12;
  const jun = walkPose((t - 45.0) * 1.1 / .4167, -1, { step: 1.15 }); jun.handB = [-.55, -1.55]; jun.shapeB = 'hold';
  const sw = swing(t, .95);
  const acts: ActorState[] = [
    { id: 'renato', look: CAST.renato, pose: ren, face: F('focused'), pos: [27.5 + (t - 45.0) * 1.2, TF, .72], t, seed: 36, res: 768, tint: [1, .88, .72] },
    { id: 'junior', look: CAST.junior, pose: jun, face: F('determined'), pos: [33.5 - (t - 45.0) * 1.1, TF, 1.2], t, seed: 35, res: 768, extra: `<g transform="translate(-.55 -1.55)"><path d="M-.18 0 L.18 0 L.14 .34 L-.14 .34Z" fill="#2a5db0" ${O}/></g>`, tint: [1, .88, .72] },
    { id: 'marcos', look: CAST.marcos, pose: digPose(t, 31, sw, 1).p, face: F('focused'), pos: [40.5, TF, .9], t, seed: 31, res: 768, extra: digPose(t, 31, sw, 1).tool, tint: [1, .88, .72] }];
  return { t, cam: c, light: TUNNEL(x + 4, 5, { int: 6 }), cut: null, tunnelWall: true, bulbs: 80, digX: 41.4, actors: acts,
    props: [{ name: 'Wheelbarrow', pos: [28.6 + (t - 45.0) * 1.2, TF, .72], rot: [0, 0, 0] }, { name: 'Bucket', pos: [12.5, TF, 1.3] }, { name: 'Bucket', pos: [17.0, TF, .55] }, { name: 'Shovel', pos: [14.6, TF + .55, .5], rot: [0, 0, .25] }, { name: 'Work lamp', pos: [21.0, -4.25, 1.38] }],
    fx: [{ kind: 'motes', box: [[x, -5.8, .45], [x + 9, -4.2, 1.45]], n: 80, seed: 21, color: '#ffcf8a', size: .025, t, alpha: .5 }],
    overlay: svg(`<g opacity="${k01(t, 45.1, 45.3)}">${money(metres, 540, 330, 150, 1, '', '#ffd34d').replace('</text>', ' M</text>')}</g>` + stamp('≈ 80 METRES LONG', 540, 470, 64, t, 46.2, '#ffd34d', -4)),
    grade: { gain: [1.08, .98, .86], vignette: .42, whip: Math.max(0, .25 - (t - 45.0) * 1.2) } };
});
shot('problem-loop', 52.45, 56.0, (t) => {
  const src = S.find(x => x.name === 'problem')!; const F0 = src.f(Math.min(29.15, 27.85 + (t - 52.45)), Math.min(1.3, t - 52.45));
  const tilt = inOut(k01(t, 54.55, 55.85));
  const a = camPath(t, 52.45, 54.55, [{ p: [78.35, -5.5, 1.3], l: [76.6, -4.35, .85], f: 46 }, { p: [78.3, -5.52, 1.28], l: [76.7, -4.3, .85], f: 44 }], x => x);
  const cam = { pos: [mix(a.pos[0], 77.9, tilt), mix(a.pos[1], -5.0, tilt), mix(a.pos[2], 1.0, tilt)] as V3, look: [mix(a.look[0], 77.0, tilt), mix(a.look[1], -4.1, tilt), mix(a.look[2], .92, tilt)] as V3, fov: mix(a.fov, 40, tilt) };
  return { ...F0, t, cam, grade: { ...(F0.grade ?? {}), exposure: .78 } };
});

export const SHOTS = S;
/** v2 edit: [film start, film end, source shot, source time at film start] — keyed to the measured narration (production/brazil-heist/timing-v2.json). */
export const EDIT: [number, number, string, number][] = [
  [0.00, 3.95, 'slab-oner', 0.0],            // "The vault was protected by over a metre of reinforced concrete"  (1 m bracket on "metre" 1.96, x-ray on "reinforced" 2.6)
  [3.95, 6.30, 'break-through', 33.8],       // "but somehow they broke through"  (tension 4.5–5.3, burst 5.3)
  [6.30, 7.75, 'emerge', 36.0],              // "and what they found inside"
  [7.75, 8.75, 'unbelievable', 37.55],       // lights on the cash
  [8.75, 9.60, 'unbelievable-face', 38.45],  // "was unbelievable"
  [9.60, 12.05, 'weekend', 39.45],           // "Over one weekend, the thieves moved"
  [12.05, 15.00, 'tonnes', 42.05],           // "three and a half tonnes of cash through the tunnel"
  [15.00, 17.15, 'cctv-guard', 15.0],        // "No alarms, no guards stopping them"
  [17.15, 19.40, 'monday', 45.95],           // "and when employees returned on Monday"  (MON card on "Monday" 18.8)
  [19.40, 20.75, 'door-opens', 47.55],       // "nearly seventy million dollars"
  [20.75, 22.80, 'vanished', 48.26],         // "had vanished"  (coffee drops on "vanished" 21.85)
  [22.80, 25.45, 'history', 50.55],          // "One of the biggest bank heists in history"
  [25.45, 28.05, 'feet', 52.6],              // "happened right beneath everyone's feet"
  [28.05, 30.25, 'host-open', -1.2],         // "These thieves stole nearly…"
  [30.25, 32.40, 'host-70m', 1.0],           // "…seventy million dollars from a bank"
  [32.40, 34.45, 'host-gun', 3.8],           // "without using a single gun"
  [34.45, 36.05, 'rewind-2005', 6.4],        // "Back in 2005"
  [36.05, 39.55, 'gang-rent-bank', 36.05],   // "a gang in Brazil rented a building near the Central Bank"
  [39.55, 40.50, 'fake-front', 12.1],        // "They pretended…"
  [40.50, 41.95, 'grass', 13.05],            // "…to sell artificial grass"
  [41.95, 43.45, 'underneath', 15.0],        // "but underneath that building"
  [43.45, 45.00, 'digging', 17.4],           // "they were secretly digging"
  [45.00, 47.60, 'tunnel-track', 45.0],      // "a tunnel almost eighty metres long"
  [47.60, 50.35, 'months', 22.7],            // "For months, nobody suspected a thing"
  [50.35, 52.45, 'reached', 25.21],          // "and when they finally reached the bank"  (pickaxe hits concrete on "bank" 52.0)
  [52.45, 56.00, 'problem-loop', 52.45],     // "there was one massive problem" → tilt up into the concrete (loops to frame 0)
];
export function frameAt(frame: number): Frame {
  const t = frame / FPS; AUDIO_T = t;
  const e = EDIT.find(x => t >= x[0] && t < x[1]) ?? EDIT[EDIT.length - 1];
  const src = S.find(x => x.name === e[2])!; const st = e[3] + (t - e[0]);
  const F0 = src.f(st, st - src.t0); return { ...F0, t: st };
}

// shared with Part 2 (src/brazil2)
export { DAY, GOLD, NIGHT, TUNNEL, VAULT, STUDIO, LAMPS, TF, TZ, VF, HOST_Z, palletShow, shovel, pickaxe, torchSvg, cupSvg, bag, brick, sweat, k01, carryPose };
