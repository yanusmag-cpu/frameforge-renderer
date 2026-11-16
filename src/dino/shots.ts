// "What if you were raised by dinosaurs?" — 60.0 s / 1800 frames. Every beat is keyed to the narration's word timestamps
// (narration placed at +0.2 s; part 2 starts at 29.36 s). Visual events never run ahead of the words that describe them.
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Frame5 } from './engine5.ts';
import type { CreatureState } from './creatures.ts';
import { pose, P, F, gesture, camPath, add3, inOut, mix, type CamKey } from '../brazil/anim.ts';
import { walkPose, type Pose } from '../ff2d/rig.ts';
import { runPose, runBob, jumpPose, sitPose, lyingPose, stumblePose, hidePose } from '../ff2d/moves.ts';
import { blink, noise1, smooth, clamp } from '../ff2d/motion.ts';
import { UNIT } from '../brazil/actor.ts';
import { svg, pop } from '../brazil/overlay.ts';

export const FPS = 30, DURATION = 60, FRAMES = 1800;
let ENG: { H: (x: number, z: number) => number } | null = null; export const bindEngine = (e: typeof ENG) => { ENG = e; };
const H = (x: number, z: number) => ENG ? ENG.H(x, z) : 0;
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const HERO = { outfit: 'hoodie' as const, color: '#d8262b', pants: '#151515' };
const g3 = (x: number, z: number, dy = 0): V3 => [x, H(x, z) + dy, z];
const zc = (x: number) => 82 + 10 * Math.sin(x / 47) + 5 * Math.sin(x / 19 + 1);
const xs = (z: number) => -52 + 14 * Math.sin(z / 38);
const xr = (z: number) => 20 * Math.sin((z - 90) / 95) + 7 * Math.sin(z / 31);
// places
const CL: V3 = [0, 0, -30];                         // clearing (the nest)
const OX = 14, OZ = zc(14), OY = 1.25;              // overlook outcrop top
const IMPACT: V3 = [40, -45, 560];                  // far beyond the valley
const LOG_A = [-42, -58], LOG_B = [-22, -50];
const logTop = (s: number): V3 => { const x = mix(LOG_A[0], LOG_B[0], s), z = mix(LOG_A[1], LOG_B[1], s); return [x, Math.max(H(x, z), H(x + 1, z), H(x, z + 1)) + 1.93 - .15 * s, z]; };

// ---------------------------------------------------------------------------------------------- light identities
type L3 = [string, string, number];
const FOREST = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#6e9ed6', '#f2dcb4'], sun: { dir: [-.42, .62, .45], color: '#ffd8a0', int: 3.6, focus, size: 26 }, hemi: ['#b9d4f2', '#3d4a22', .7] as L3, amb: ['#fff6e0', .06],
  fog: ['#c9d2b6', .0065], env: .7, sunGlow: 1, ...o });
const DAWN = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#5c8cc8', '#ffd2a0'], sun: { dir: [-.55, .28, .78], color: '#ffc58a', int: 3.4, focus, size: 120 }, hemi: ['#a9c6ec', '#3e4428', .65] as L3, amb: ['#ffffff', .05],
  fog: ['#e8d2b4', .0016], env: .7, sunGlow: 1.4, ...o });
const DUSK = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#3d5f9a', '#ffb070'], sun: { dir: [.25, .16, .96], color: '#ffae62', int: 3.2, focus, size: 20 }, hemi: ['#8fa6d0', '#3a2c20', .55] as L3, amb: ['#ffe2c0', .05],
  fog: ['#f0b886', .0008], env: .6, sunGlow: 1.6, ...o });
const STORM = (focus: V3, flash = 0): Light => ({ sky: ['#2c3440', '#4a525c'], sun: { dir: [-.3, .8, .4], color: '#c8d4e0', int: .5 + flash * 6, focus, size: 24 }, hemi: ['#6a7888', '#20241c', .55 + flash * 1.2] as L3, amb: ['#c0ccdc', .08 + flash * .4],
  fog: ['#4a525a', .014], env: .5, sunGlow: 0 });
const FIRE = (focus: V3, heat: number, o: Partial<Light> = {}): Light => ({ sky: ['#2a1c22', '#c4542a'], sun: { dir: [.08, .14, .99], color: '#ff7a36', int: 2.2 + heat * 2.5, focus, size: 24 }, hemi: ['#7a4a40', '#2a1810', .45] as L3, amb: ['#ff9a60', .06 + heat * .05],
  fog: ['#8a4a30', .0009], env: .5, sunGlow: .3, ...o });
const ASH = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#3a3434', '#6a5a50'], sun: { dir: [-.3, .5, .8], color: '#c9a080', int: .9, focus, size: 24 }, hemi: ['#8a827c', '#3a3430', .95] as L3, amb: ['#d0c0b0', .16],
  fog: ['#5a524c', .012], env: .4, sunGlow: .2, ...o });

// ---------------------------------------------------------------------------------------------- characters
const hero = (o: Partial<ActorState> & { pose: Pose; pos: V3; t: number; face?: ActorState['face'] }): ActorState => ({ id: 'hero', look: HERO, seed: 1, res: 1536, face: F('curious'), ...o });
const sdir = (cam: { pos: V3; look: V3 }, a: V3, b: V3) => { const fx = cam.look[0] - cam.pos[0], fz = cam.look[2] - cam.pos[2]; const rx = -fz, rz = fx; return Math.sign((b[0] - a[0]) * -rx + (b[2] - a[2]) * -rz) || 1; };
const mblink = (t: number, seed: number) => blink(t, seed) > .5 ? 1 : 0;
const MOM = (t: number, o: Partial<CreatureState> = {}): CreatureState => ({ id: 'mom', kind: 'raptor', pos: [0, 0, 0], yaw: 0, t, blink: mblink(t, 7), breathe: 1, ...o });
const KID = (i: number, t: number, o: Partial<CreatureState> = {}): CreatureState => ({ id: 'kid' + i, kind: 'raptor', pos: [0, 0, 0], yaw: 0, t, scale: .36 + i * .03, tint: ['#f0e2c8', '#d9c4a4', '#e8d0b0'][i % 3], blink: mblink(t, 20 + i), ...o });
/** walk a creature along a polyline at speed (m/s); stride in metres; returns position, yaw and gait */
function follow(path: V3[], t: number, t0: number, speed: number, stride: number, ground = true) {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[2] - path[i][2])); const total = segs.reduce((a, b) => a + b, 0);
  let d = clamp(Math.max(0, t - t0) * speed, 0, total); const moving = (t - t0) * speed < total && t > t0; const dist = d; let i = 0;
  while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
  const a = path[i], b = path[i + 1]; const k = segs[i] ? d / segs[i] : 0; const x = mix(a[0], b[0], k), z = mix(a[2], b[2], k);
  return { pos: [x, ground ? H(x, z) : mix(a[1], b[1], k), z] as V3, yaw: Math.atan2(b[0] - a[0], b[2] - a[2]), gait: moving ? { phase: dist * .62 / stride, stride } : undefined, dist, moving };
}
const shake = (cam: { pos: V3; look: V3; fov: number }, t: number, amt: number) => amt <= 0 ? cam : { ...cam, pos: add3(cam.pos, [noise1(t * 18, 1) * amt, noise1(t * 21, 2) * amt, noise1(t * 17, 3) * amt]), look: add3(cam.look, [noise1(t * 16, 4) * amt * .6, noise1(t * 19, 5) * amt * .6, 0]) };
const cp = (t: number, t0: number, t1: number, keys: CamKey[], e = inOut) => camPath(t, t0, t1, keys, e);

// ---------------------------------------------------------------------------------------------- herds & flyers (valley life)
function herd(t: number, fade = 0): CreatureState[] {
  return [0, 1, 2, 3].map(i => { const z = 200 + i * 16 + (i % 2) * 6; const x0 = xr(z) + 18 + i * 8; const x = x0 - (t % 30) * 1.4; return { id: 'sauro' + i, kind: 'sauro' as const, pos: [x, H(x, z), z] as V3, yaw: -Math.PI / 2 + .1, t: t + i, gait: { phase: t * 1.4 * .62 / 2.6 + i * .3, stride: 2.6 }, neck: [Math.sin(t * .3 + i) * .15 - .1, Math.sin(t * .2 + i) * .2] as [number, number], scale: (.8 + i * .08) * (1 - fade * .02), tint: fade > 0 ? '#9a8a80' : undefined }; });
}
function flock(t: number, center: V3, n: number, r: number, kind: 'ptero' | 'bird' = 'ptero', scale = 1): CreatureState[] {
  return Array.from({ length: n }, (_, i) => { const a = t * (.18 + i * .02) + i * 2.1; const p: V3 = [center[0] + Math.cos(a) * r * (1 + i * .15), center[1] + Math.sin(t * .5 + i) * 3 + i * 4, center[2] + Math.sin(a) * r * .6];
    return { id: kind + 'f' + i, kind, pos: p, yaw: a + Math.PI, t, flap: i % 2 ? t * 1.2 + i : undefined, scale, lean: .1 } as CreatureState; });
}
// ---------------------------------------------------------------------------------------------- overlays
const sub = (s: string, t: number, t0: number, out = 99, y = 1530, size = 58, color = '#fff') => pop(s, 540, y, size, t, t0, { color, out });
const title = (s: string, t: number, t0: number, out: number, y = 330, size = 74, color = '#ffd34d') => pop(s, 540, y, size, t, t0, { color, out });
function yucatanMap(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .4) * (1 - k01(t, out, out + .3)); if (k <= 0) return '';
  const pulse = (t - t0) % 1; return `<g transform="translate(140 1180) scale(${.9 + .1 * k})" opacity="${k}" filter="url(#sh)">
    <rect x="0" y="0" width="800" height="440" rx="26" fill="#0c1a26" opacity=".86" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>
    <path d="M40 120 C120 90 210 70 300 96 C340 108 360 150 330 190 C300 240 330 300 380 330 C420 356 470 360 520 340 L560 300 C600 260 660 250 700 270 L760 280 L760 420 L40 420 Z" fill="#c9b48a" opacity=".92"/>
    <path d="M520 340 C540 300 560 250 600 230 C640 214 690 222 720 250 C730 280 700 300 660 300 C620 300 590 320 560 300" fill="#d8c49a"/>
    <text x="400" y="62" text-anchor="middle" font-size="40" font-weight="900" fill="#fff">GULF OF MEXICO (TODAY)</text>
    <circle cx="610" cy="262" r="${14 + pulse * 46}" fill="none" stroke="#ff5a2a" stroke-width="6" opacity="${1 - pulse}"/><circle cx="610" cy="262" r="12" fill="#ff5a2a"/>
    <text x="610" y="210" text-anchor="middle" font-size="34" font-weight="900" fill="#ffd34d">YUCATÁN PENINSULA</text></g>`;
}
function foodChain(t: number, t0: number, brk: number, out: number) {
  const k = k01(t, t0, t0 + .4) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; const b = k01(t, brk, brk + .5);
  const items = ['SUN', 'PLANTS', 'PLANT-EATERS', 'PREDATORS']; let g = '';
  items.forEach((s, i) => { const x = 140 + i * 267; const dim = i === 0 ? b * .6 : b * (.3 + i * .15);
    g += `<g opacity="${1 - dim}"><rect x="${x - 120}" y="0" width="240" height="84" rx="20" fill="${i === 0 ? '#ffb347' : '#1e2a20'}" stroke="#fff" stroke-width="3"/><text x="${x}" y="56" text-anchor="middle" font-size="${s.length > 8 ? 26 : 34}" font-weight="900" fill="${i === 0 ? '#2a1600' : '#fff'}">${s}</text></g>`;
    if (i < 3) g += `<path d="M${x + 124} 42 h22" stroke="#fff" stroke-width="7" stroke-linecap="round"/>${b > .1 ? `<path d="M${x + 122} 20 l26 44 M${x + 148} 20 l-26 44" stroke="#ff4a3a" stroke-width="8" stroke-linecap="round" opacity="${b}"/>` : ''}`; });
  return `<g transform="translate(0 1480)" opacity="${k}" filter="url(#sh)">${g}</g>`;
}
function extinction(t: number, t0: number, gone: number, out: number) {
  const k = k01(t, t0, t0 + .4) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; const pct = Math.round(75 * k01(t, t0, t0 + 1.2)); const g = k01(t, gone, gone + .8);
  let icons = ''; for (let i = 0; i < 20; i++) { const x = 190 + (i % 10) * 78, y = 1290 + Math.floor(i / 10) * 92; const dead = i % 4 !== 3; const a = dead ? 1 - g * .82 : 1;
    icons += `<g transform="translate(${x} ${y})" opacity="${a}"><path d="M-26 10 C-18 -14 10 -18 22 -6 L34 -10 L30 0 C28 14 4 18 -10 14 L-22 26 L-18 12 Z" fill="${dead && g > .5 ? '#6a5a50' : '#ffd34d'}"/></g>`; }
  return `<g opacity="${k}" filter="url(#sh)">${pop(pct + '%', 540, 1210, 150, t, t0, { color: '#ff5a3a' })}${icons}<text x="540" y="1520" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">OF SPECIES VANISHED</text></g>`;
}

// ============================================================================================== shots
type Shot = { t0: number; t1: number; f: (t: number) => Frame5 };
const S: Shot[] = []; const shot = (t0: number, t1: number, f: Shot['f']) => S.push({ t0, t1, f });

// 1. HOOK — aerial over the Cretaceous valley at dawn (0 – 4.15) “Imagine being raised by dinosaurs 66 million years ago.”
shot(0, 4.15, t => {
  const cam = cp(t, 0, 4.15, [{ p: [70, 46, 250], l: [-30, -30, 90], f: 52 }, { p: [40, 26, 150], l: [-34, -20, 70], f: 50 }, { p: [10, 12, 108], l: [-38, -6, 62], f: 48 }]);
  return { t, cam, light: DAWN([0, -40, 150]), cut: null, wind: .35, sky: { clouds: .42 },
    dinos: [...herd(t - 2).map(d => ({ ...d, pos: [d.pos[0] - 60, H(d.pos[0] - 60, d.pos[2] - 70), d.pos[2] - 70] as V3 })), ...flock(t, [-10, 0, 140], 3, 40)],
    mist: { k: .6, center: [-30, -58, 180], radius: 90, height: 8, color: '#f2e2cc' },
    overlay: svg(title('RAISED BY DINOSAURS', t, .25, 2.0, 300, 78, '#fff') + title('66 MILLION YEARS AGO', t, 2.12, 4.0, 300, 70)),
    grade: { bloom: .45, sat: 1.12, gain: [1.04, 1.0, .95], vignette: .38 } };
});
// 2. WAKE in the steaming forest (4.15 – 5.65) “You wake in a steaming forest…”
shot(4.15, 5.65, t => {
  const p: V3 = g3(-.4, -29.4); const wake = k01(t, 4.35, 4.9); const sit = smooth(k01(t, 4.95, 5.55));
  const cam = cp(t, 4.15, 5.65, [{ p: [-.4 + 1.2, p[1] + 2.6, -28.2], l: [-.4, p[1] + .2, -29.4], f: 40 }, { p: [-.4 + 2.4, p[1] + 1.4, -27.6], l: [-.4, p[1] + .6, -29.4], f: 42 }]);
  const lie = sit < .5;
  const pz: Pose = lie ? lyingPose(wake) : sitPose(-1, 0, { headTurn: -.2 });
  return { t, cam, light: FOREST(CL), cut: null, wind: .25, mist: { k: 1.1, center: [-.4, 0, -29.4], radius: 16, height: 2.2 }, rays: { k: 1, from: [-4, p[1], -32], spread: 12 },
    actors: [hero({ pose: pz, roll: lie ? Math.PI / 2 * (1 - sit * 2) : 0, pos: lie ? add3(p, [0, .2, 0]) : p, t, face: wake < .3 ? F('tired', undefined, 0) : F('confused', 'curious', k01(t, 5.2, 5.6)), res: 2048 })],
    fx: [{ kind: 'motes', box: [[-6, p[1], -34], [6, p[1] + 5, -24]], n: 140, seed: 2, color: '#fff2c8', size: .03, t, alpha: .5 }],
    grade: { bloom: .5, gain: [1.05, 1.0, .92], vignette: .45, aperture: .35, focus: 2.6 } };
});
// 3. "…surrounded by reptiles" — orbit, the hatchlings scurry around him (5.65 – 7.1)
shot(5.65, 7.1, t => {
  const p: V3 = g3(-.4, -29.4);
  const a = mix(-.6, .9, inOut(k01(t, 5.65, 7.1))); const cam = { pos: [p[0] + Math.sin(a) * 4.2, p[1] + 1.3, p[2] + Math.cos(a) * 4.2] as V3, look: add3(p, [0, .7, 0]), fov: 46 };
  const kids = [0, 1, 2].map(i => { const ang = t * (1.4 + i * .3) + i * 2.1; const r = 1.9 + i * .5; const x = p[0] + Math.cos(ang) * r, z = p[2] + Math.sin(ang) * r;
    return KID(i, t, { pos: [x, H(x, z), z], yaw: ang + Math.PI, gait: { phase: t * 3.2 + i, stride: .5 }, neck: [.25, 0], head: [Math.sin(t * 6 + i) * .3, 0, 0] }); });
  const look = Math.sin(t * 2.4) * .8;
  return { t, cam, light: FOREST(CL), cut: null, wind: .25, mist: { k: 1, center: [-.4, 0, -29.4], radius: 18, height: 2.4 }, rays: { k: .9, from: [-4, p[1], -32], spread: 12 },
    dinos: kids, actors: [hero({ pose: sitPose(1, .2 + .3 * k01(t, 6.2, 6.6), { headTurn: look * .6 }), pos: p, t, face: t < 6.2 ? F('confused') : F('worried', 'shocked', k01(t, 6.25, 6.5) * .4), res: 1536 })],
    overlay: svg(sub('SURROUNDED BY REPTILES', t, 6.25, 7.0)), grade: { bloom: .45, gain: [1.05, 1.0, .93], vignette: .42, aperture: .7, focus: 4.2 } };
});
// 4. A curious dinosaur finds you (7.1 – 9.25) — emerges from the ferns, lowers her head, sniffs; he raises a hand
shot(7.1, 9.25, t => {
  const p: V3 = g3(-.4, -29.4); const st = follow([g3(-6.5, -33.5), g3(-3.6, -31.2), g3(-2.3, -30.2)], t, 7.15, 1.6, 1.1);
  const lower = smooth(k01(t, 7.9, 8.6)); const sniff = Math.max(0, Math.sin((t - 8.3) * 18)) * k01(t, 8.3, 8.4) * (1 - k01(t, 9.0, 9.2));
  const mom = MOM(t, { pos: st.pos, yaw: st.yaw + lower * .25, gait: st.gait, neck: [.55 * lower + sniff * .04, .25 * lower], head: [.15 * lower, .1, .1 * lower], crouch: .25 * lower, jaw: sniff * .15, lean: .15 * lower });
  const cam = cp(t, 7.1, 9.25, [{ p: [-1.0, p[1] + 1.35, -23.6], l: [-1.1, p[1] + 1.15, -30.0], f: 52 }, { p: [-.8, p[1] + 1.2, -24.4], l: [-.9, p[1] + 1.1, -29.9], f: 50 }]);
  const reach = gesture(t, 8.55, .5);
  const hp = P(sitPose(-1, 0, { headTurn: -.1, headLift: .05 }), sitPose(-1, 0, { handB: [-.9, -2.2], shapeB: 'open', headLift: .1 }), reach);
  return { t, cam, light: FOREST(CL, { sun: { dir: [-.6, .45, -.3], color: '#ffd29a', int: 3.6, focus: CL, size: 20 } }), cut: null, wind: .25, mist: { k: .8, center: [-2, 0, -31], radius: 14, height: 2 }, rays: { k: 1.1, from: [-5, p[1], -34], spread: 10 },
    dinos: [mom], actors: [hero({ pose: hp, pos: p, t, face: t < 8.1 ? F('shocked', 'terrified', .3) : F('worried', 'curious', k01(t, 8.6, 9.1)), res: 2048 })],
    fx: [{ kind: 'motes', box: [[-5, p[1], -33], [2, p[1] + 3, -27]], n: 120, seed: 3, color: '#fff2c8', size: .025, t, alpha: .5 }],
    overlay: svg(sub('A CURIOUS DINOSAUR FINDS YOU', t, 7.6, 9.1)), grade: { bloom: .5, gain: [1.06, 1.0, .9], vignette: .45, aperture: .4, focus: 4.6 } };
});
// 5. "…in this fictional story protects you like its own" (9.25 – 12.1): nuzzle, then she curls around him as a shadow passes
shot(9.25, 12.1, t => {
  const p: V3 = g3(-.4, -29.4); const curl = smooth(k01(t, 10.3, 11.2));
  const mpos: V3 = add3(g3(-2.3, -30.2), [mix(0, 1.0, curl), 0, mix(0, -.8, curl)]);
  const mom = MOM(t, { pos: mpos, yaw: mix(.95, 1.9, curl), crouch: mix(.25, 1, curl), neck: [mix(.5, -.1, curl), mix(.25, .9, curl)], head: [mix(.2, .1, curl), mix(.1, .5, curl), 0], wrap: curl * .85, wing: curl * .2, tail: [curl * -.6, 0], lean: mix(.15, 0, curl) });
  const kids = [0, 1].map(i => { const fx = p[0] - 1.6 + i * 1.1, fz = p[2] + .9 - i * .3; return KID(i, t, { pos: [fx, H(fx, fz), fz], yaw: 2.8 + i, crouch: k01(t, 10.6, 11.2) * .8, neck: [.2, 0] }); });
  const mid: V3 = [-1.3, p[1] + 1.0, -29.9]; const cam = cp(t, 9.25, 12.1, [{ p: add3(mid, [-1.8, .2, 4.0]), l: mid, f: 42 }, { p: add3(mid, [-2.6, 2.2, 5.6]), l: add3(mid, [0, -.4, 0]), f: 44 }]);
  const touch = k01(t, 9.3, 9.6) * (1 - k01(t, 10.1, 10.4));
  const hp = P(sitPose(-1, 0, { handB: [-.95, -2.0], shapeB: 'open', headTilt: .15 }), sitPose(-1, .7), k01(t, 10.4, 10.9));
  return { t, cam, light: FOREST(CL, { sun: { dir: [-.6, .45, -.3], color: '#ffd29a', int: 3.5, focus: CL, size: 20 } }), cut: null, wind: .25, mist: { k: .8, center: [-1, 0, -30], radius: 15, height: 2 }, rays: { k: 1, from: [-5, p[1], -34], spread: 10 },
    dinos: [mom, ...kids], actors: [hero({ pose: hp, pos: p, t, face: touch > .2 ? F('amazed') : t < 10.6 ? F('happy', 'amazed', .4) : F('happy'), res: 2048 })],
    overlay: svg(pop('FICTIONAL STORY', 540, 300, 44, t, 9.36, { color: '#ffd34d', out: 10.9 }) + sub('PROTECTS YOU LIKE ITS OWN', t, 10.32, 12.0)),
    grade: { bloom: .5, gain: [1.06, 1.0, .9], vignette: .45, aperture: .35, focus: 4.5 } };
});
// 6. "But real dinosaurs weren't all monsters" (12.1 – 14.45): walking together through sunlit ferns, play
shot(12.1, 14.45, t => {
  const path: V3[] = [g3(-6, -12), g3(4, -10), g3(14, -6)]; const m = follow(path, t, 12.0, 1.3, 1.1); const hd = (t - 12.0) * 1.3;
  const hx = mix(-6, 14, clamp(hd / 20.6)) - .2, hz = mix(-12, -6, clamp(hd / 20.6)) + 1.8;
  const cam = cp(t, 12.1, 14.45, [{ p: [m.pos[0] - 1, m.pos[1] + 1.5, m.pos[2] + 7.5], l: [m.pos[0], m.pos[1] + 1.2, m.pos[2]], f: 44 }, { p: [m.pos[0] + .5, m.pos[1] + 1.4, m.pos[2] + 6.8], l: [m.pos[0] + .5, m.pos[1] + 1.1, m.pos[2]], f: 42 }], x => x);
  const kid = follow(path.map(q => add3(q, [-.4, 0, 3.2])), t, 12.0, 1.3, .55);
  return { t, cam, light: FOREST([m.pos[0], m.pos[1], m.pos[2]]), cut: null, wind: .35, rays: { k: .9, from: [m.pos[0] - 4, m.pos[1], m.pos[2] - 6], spread: 14 },
    dinos: [MOM(t, { ...m, neck: [.1, -.2], head: [0, -.25, 0] }), KID(0, t, { ...kid, pos: kid.pos, neck: [.1, 0] })],
    actors: [hero({ pose: walkPose(hd / UNIT, sdir(cam, path[0], path[2])), pos: g3(hx, hz), t, face: F('happy', 'excited', .5 + .5 * Math.sin(t)) })],
    overlay: svg(pop('MONSTERS?', 540, 320, 84, t, 13.6, { color: '#ff5a3a', out: 14.3 }) + (t > 13.92 && t < 14.4 ? `<path d="M330 330 L750 270" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="${k01(t, 13.92, 14.05)}"/>` : '')),
    grade: { bloom: .45, gain: [1.05, 1.0, .93], sat: 1.1 } };
});
// 7. FEATHERED — macro along the spreading wing in backlight (14.45 – 15.75)
shot(14.45, 15.75, t => {
  const mp = g3(14, -6); const spread = smooth(k01(t, 14.6, 15.3));
  const cam = cp(t, 14.45, 15.75, [{ p: add3(mp, [.6, 1.55, 5.2]), l: add3(mp, [.3, 1.45, 0]), f: 46 }, { p: add3(mp, [.5, 1.5, 4.4]), l: add3(mp, [.3, 1.4, 0]), f: 44 }]);
  return { t, cam, light: FOREST(mp, { sun: { dir: [.55, .55, -.62], color: '#ffd8a0', int: 3.8, focus: mp, size: 10 } }), cut: null, wind: .4,
    dinos: [MOM(t, { pos: mp, yaw: Math.PI / 2, wing: spread, neck: [-.1, .3], head: [0, .4, 0] })],
    fx: [{ kind: 'motes', box: [add3(mp, [-1, .5, -1]), add3(mp, [2, 3, 2])], n: 80, seed: 4, color: '#fff0c0', size: .02, t, alpha: .6 }],
    overlay: svg(title('FEATHERED', t, 14.98, 99, 320, 84, '#ffd34d')), grade: { bloom: .55, gain: [1.08, 1.0, .9], vignette: .5, aperture: .45, focus: 1.6 } };
});
// 8. BIRDS ARE THEIR LIVING DESCENDANTS (15.75 – 17.65): a small bird lands; two profiles, one family
shot(15.75, 17.65, t => {
  const mp = g3(14, -6); const land = smooth(k01(t, 15.8, 16.5)); const perch: V3 = g3(mp[0] + 2.75, mp[2] + .1);
  const bird: CreatureState = { id: 'bird', kind: 'bird', pos: [mix(perch[0] + 2.5, perch[0], land), perch[1] - .55 + (1 - land) * 1.8, mix(perch[2] + 1, perch[2], land)], yaw: -Math.PI / 2, t, flap: land < 1 ? t * 7 : undefined, head: [Math.sin(t * 3) * .2, 0, 0], scale: 1.7 };
  const tilt = Math.sin(t * 2.2) * .25 * k01(t, 16.6, 16.9);
  const cam = cp(t, 15.75, 17.65, [{ p: add3(mp, [2.4, 1.0, 7.0]), l: add3(mp, [2.4, .8, 0]), f: 40 }, { p: add3(mp, [2.5, .9, 6.2]), l: add3(mp, [2.5, .75, 0]), f: 40 }], x => x);
  return { t, cam, light: FOREST(mp, { sun: { dir: [.55, .55, -.62], color: '#ffd8a0', int: 3.6, focus: mp, size: 10 } }), cut: null, wind: .3,
    dinos: [MOM(t, { pos: mp, yaw: Math.PI / 2, crouch: .35 * land, neck: [.75 * land, 0], head: [.35 * land, 0, tilt] }), { ...bird, head: [0, 0, tilt] }],
    overlay: svg(sub('BIRDS = LIVING DINOSAURS', t, 15.77, 99, 330, 66, '#ffd34d')), grade: { bloom: .5, gain: [1.06, 1.0, .92], aperture: .4, focus: 3.3 } };
});
// 9. LEARN: run along the great log (17.65 – 18.65) — ref panel 2
shot(17.65, 18.65, t => {
  const s = clamp((t - 17.6) * .26 + .1); const hp = logTop(s); const ms = clamp(s + .14); const mp = logTop(ms);
  const dist = (t - 17.6) * 5.2; const cam = { pos: add3(hp, [1.2, .1, 5.4]), look: add3(hp, [1.0, .95, 0]), fov: 50 };
  const mom = MOM(t, { pos: add3(mp, [0, -.95, 2.1]), yaw: 1.2, gait: { phase: dist * .62 / 1.4, stride: 1.4 }, neck: [.0, -.3], jaw: .3 });
  mom.pos = g3(mp[0] + .4, mp[2] + 2.5); mom.yaw = 1.2;
  return { t, cam, light: FOREST(hp), cut: null, wind: .4, rays: { k: .9, from: add3(hp, [-3, -2, -6]), spread: 14 },
    dinos: [mom], actors: [hero({ pose: runPose(dist / UNIT, 1), pos: add3(hp, [0, runBob(dist / UNIT) * UNIT, 0]), t, face: F('excited'), res: 1536 })],
    fx: [{ kind: 'puff', at: hp, t: (t * 2.6) % 1, n: 4, seed: Math.floor(t * 2.6), spread: .3, rise: .1, size: .25, color: '#c8b088', alpha: .3 }],
    overlay: svg(sub('YOU LEARN…', t, 17.72, 18.6, 330, 62, '#ffd34d')), grade: { bloom: .45, gain: [1.05, 1.0, .93] } };
});
// 10. …to hide from predators (18.65 – 19.25): drop behind the log, a tyrannosaur strides past in the mist
shot(18.65, 19.25, t => {
  const hide = g3(-30, -56.2); const rex = follow([g3(-36, -38), g3(-16, -31)], t, 18.4, 3.4, 3.0);
  const cam = { pos: add3(hide, [.3, 2.6, -3.0]), look: add3(hide, [-1.2, 1.9, 12]), fov: 54 };
  const step = Math.abs(Math.sin((rex.gait?.phase ?? 0) * Math.PI * 2)) ** 8;
  return { t, cam: shake(cam, t, .03 + step * .05), light: FOREST(hide, { fog: ['#c3ccb2', .012] }), cut: null, wind: .3, mist: { k: .5, center: [-30, 0, -36], radius: 18, height: 4 },
    dinos: [{ id: 'rex', kind: 'rex', ...rex, t, jaw: .2 + .2 * Math.sin(t * 3), neck: [.15, .3], head: [0, .2, 0], blink: 0 }, MOM(t, { pos: add3(hide, [1.6, 0, -.6]), yaw: .5, crouch: .75, neck: [-.1, .2], head: [-.1, .4, 0] })],
    actors: [hero({ pose: { ...hidePose(1, Math.max(0, Math.sin(t * 3))), back: 1, turn: 0 }, pos: hide, t, face: F('terrified'), res: 1536 })],
    overlay: svg(sub('HIDE FROM PREDATORS', t, 18.7, 99, 330, 62, '#ff7a5a')), grade: { bloom: .35, gain: [.98, 1.0, 1.02], vignette: .55, sat: .9 } };
});
// 11. …follow footprints (19.25 – 20.7): hopping print to print along the muddy bank
shot(19.25, 20.7, t => {
  const z0 = -98 + 8 * 1.45; const k = (t - 19.25) / 1.45; const zp = z0 + k * 6 * 1.45; const x = xs(zp) + 6.2; const hp = g3(x, zp);
  const hopk = ((t - 19.25) * 2.4) % 1; const jp = jumpPose(hopk, -1, { height: .5 });
  const cam = { pos: g3(x + 2.2, zp - 4.6, 1.9), look: g3(x + .3, zp + 1.5, .5), fov: 46 };
  const mz = zp + 6; const mom = MOM(t, { pos: g3(xs(mz) + 6.2, mz), yaw: .05, gait: { phase: (t - 19) * 1.2 * .62 / 1.4, stride: 1.4 }, neck: [.35, .1] });
  return { t, cam, light: FOREST(hp, { sun: { dir: [-.5, .55, .5], color: '#ffd8a0', int: 3.4, focus: hp, size: 18 } }), cut: null, wind: .3,
    dinos: [mom], actors: [hero({ pose: jp.pose, pos: add3(hp, [0, jp.y * UNIT, 0]), t, face: F('determined', 'happy', .3) })],
    fx: hopk > .8 ? [{ kind: 'puff', at: hp, t: (hopk - .8) * 1.45, n: 6, seed: Math.floor(t * 2.4), spread: .25, rise: .08, size: .2, color: '#5a4630', alpha: .35 }] : [],
    overlay: svg(sub('FOLLOW FOOTPRINTS', t, 19.3, 99, 330, 62, '#ffd34d')), grade: { bloom: .4, gain: [1.04, 1.0, .94] } };
});
// 12. …and survive storms (20.7 – 21.8): rain, lightning, her wing over him
shot(20.7, 21.8, t => {
  const p: V3 = g3(1.0, -31.0); const fl = Math.max(0, 1 - Math.abs(t - 20.92) * 9) + Math.max(0, 1 - Math.abs(t - 21.36) * 7) * .8;
  const cam = cp(t, 20.7, 21.8, [{ p: add3(p, [.2, 1.6, 3.6]), l: add3(p, [-.5, .8, 0]), f: 50 }, { p: add3(p, [.2, 1.5, 3.2]), l: add3(p, [-.5, .8, 0]), f: 48 }]);
  return { t, cam: shake(cam, t, fl * .03), light: STORM(p, fl), cut: null, wind: 1.6, gust: .6, windDir: [.8, .6], rain: 1, flash: fl * .5, sky: { clouds: .95, dim: .3 },
    dinos: [MOM(t, { pos: add3(p, [-1, 0, -.4]), yaw: 1.3, crouch: .8, wrap: .95, wing: .25, neck: [.1, .9], head: [.2, .3, 0], shake: .5 })],
    actors: [hero({ pose: sitPose(1, .9), pos: p, t, face: fl > .3 ? F('terrified') : F('worried'), tint: [.75 + fl, .8 + fl, .9 + fl] })],
    overlay: svg(sub('SURVIVE STORMS', t, 20.77, 99, 330, 62, '#9fd0ff') + (fl > .4 ? `<path d="M${640} 0 L600 180 L660 190 L590 420 L640 430 L560 640" stroke="#eef4ff" stroke-width="10" fill="none" opacity="${fl}" filter="url(#sh)"/>` : '')),
    grade: { bloom: .5, sat: .8, gain: [.9, .95, 1.05], vignette: .55 } };
});
// 13. THE GROUND SHAKES (21.8 – 23.3) — golden evening on the overlook; tremor, birds flee
shot(21.8, 23.3, t => {
  const hp: V3 = [OX - .9, OY, OZ + 4.4]; const tremor = k01(t, 22.25, 22.4) * (1 - k01(t, 23.0, 23.3));
  const cam = cp(t, 21.8, 23.3, [{ p: [OX - 6.5, OY + 2.4, OZ - 2.5], l: [OX + 1, OY + .8, OZ + 6], f: 46 }, { p: [OX - 6, OY + 2.2, OZ - 1.5], l: [OX + 1, OY + .8, OZ + 6], f: 44 }]);
  const jolt = gesture(t, 22.3, .35);
  const birds = flock(t, [OX - 20, 20 + (t - 22.3) * 4, OZ - 30], t > 22.3 ? 4 : 0, 10, 'bird', 1.6);
  return { t, cam: shake(cam, t, tremor * .09), light: DUSK([OX, OY, OZ]), cut: null, wind: .35 + tremor, sky: { clouds: .35 },
    dinos: [MOM(t, { pos: [OX + 1.3, OY, OZ + 3.4], yaw: 0, crouch: 1 - jolt * .7, neck: [mix(.3, -.35, jolt), mix(0, -.5, jolt)], head: [mix(.2, -.2, jolt), 0, 0] }),
      KID(0, t, { pos: [OX - 2.6, OY, OZ + 2.8], yaw: .3, crouch: .8 - jolt * .8 }), KID(1, t, { pos: [OX - 1.7, OY, OZ + 5.9], yaw: -.4, crouch: .8 - jolt * .8 }), ...birds],
    actors: [hero({ pose: P(sitPose(1, .4), sitPose(1, 0, { headLift: .12, handA: [-.9, -2.3], handB: [1.2, -.4], shapeA: 'open' }), jolt), pos: hp, t, face: jolt > .2 ? F('shocked') : F('happy', 'curious', .3) })],
    fx: tremor > 0 ? [{ kind: 'debris', at: [OX, OY + .05, OZ + 4], t: (t - 22.3), n: 30, seed: 9, spread: 1.2, up: 1.2, floor: OY, size: .05, color: '#8a7a68' }] : [],
    overlay: svg(sub('THEN THE GROUND SHAKES', t, 22.3, 23.25)), grade: { bloom: .55, gain: [1.08, .98, .9], sat: 1.1 } };
});
// 14. FAR AWAY, A HUGE ASTEROID (23.3 – 26.6) — tilt up over the valley: the fireball streak (ref panel 3)
const astAt = (t: number): { pos: V3; dir: V3; k: number } => { const a: V3 = [-260, 320, 700]; const b = IMPACT; const k = clamp((t - 22.6) / (30.08 - 22.6)); const e = k * k * .6 + k * .4;
  return { pos: [mix(a[0], b[0], e), mix(a[1], b[1], e), mix(a[2], b[2], e)], dir: [b[0] - a[0], b[1] - a[1], b[2] - a[2]], k: k01(t, 22.6, 23.4) }; };
shot(23.3, 26.6, t => {
  const A = astAt(t); const hp: V3 = [OX - .9, OY, OZ + 4.4];
  const cam = cp(t, 23.3, 26.6, [{ p: [OX - 3.5, OY + 1.4, OZ - .8], l: [OX - 1, OY + 1.2, OZ + 6], f: 48 }, { p: [OX - 4.5, OY + 1.2, OZ - 1.6], l: [OX - 30, 60, OZ + 300], f: 50 }, { p: [OX - 4.2, OY + 1.1, OZ - 1.3], l: [OX - 40, 90, OZ + 400], f: 46 }]);
  const stand = smooth(k01(t, 23.6, 24.3));
  return { t, cam, light: DUSK([OX, OY, OZ]), cut: null, wind: .4, sky: { clouds: .32 }, asteroid: { ...A, size: 12, trail: 420 },
    dinos: [MOM(t, { pos: [OX + 1.3, OY, OZ + 3.4], yaw: -.3, crouch: .2 * (1 - stand), neck: [-.5, .4], head: [-.3, .2, 0] }), KID(0, t, { pos: [OX - 2.6, OY, OZ + 2.8], yaw: -.2, neck: [-.4, 0] }), ...flock(t, [OX - 30, 30, OZ + 60], 2, 20)],
    actors: [hero({ pose: P(sitPose(1, 0, { headLift: .12 }), pose(t, 1, { back: 1, headLift: .15, arms: [[-.5, -1.7], [1.05, -3.6]], shapeB: 'point' }), stand), pos: hp, t, face: F('shocked', 'amazed', .3) })],
    overlay: svg(sub('A HUGE ASTEROID', t, 24.54, 26.5, 330, 70, '#ff9a4a') + sub('RACING TOWARD EARTH', t, 25.3, 26.5, 410, 50)), grade: { bloom: .65, gain: [1.08, .98, .9], sat: 1.1 } };
});
// 15. "Your strange family has no idea what's coming next" (26.6 – 29.36) — silhouettes on the ledge, slow dolly out
shot(26.6, 29.36, t => {
  const A = astAt(t); const hp: V3 = [OX - .9, OY, OZ + 4.4];
  const cam = cp(t, 26.6, 29.36, [{ p: [OX - .3, OY + 1.2, OZ - 3.4], l: [OX, OY + 6, OZ + 40], f: 46 }, { p: [OX - .2, OY + 2.6, OZ - 7.5], l: [OX, OY + 8, OZ + 40], f: 50 }], x => x);
  return { t, cam, light: DUSK([OX, OY, OZ], { sun: { dir: [.15, .1, .99], color: '#ff9a52', int: 2.8, focus: [OX, OY, OZ], size: 16 } }), cut: null, wind: .45, sky: { clouds: .32, red: k01(t, 27, 29.3) * .3 }, asteroid: { ...A, size: 12, trail: 420 },
    dinos: [MOM(t, { pos: [OX + 1.3, OY, OZ + 3.4], yaw: .05, neck: [-.45, .1], head: [-.3, 0, .25 * Math.sin(t * 1.4)] }), KID(0, t, { pos: [OX - 2.4, OY, OZ + 3.4], yaw: .1, neck: [-.3, 0], head: [-.2, 0, .3] }), KID(1, t, { pos: [OX - 1.6, OY, OZ + 5.6], yaw: -.1, neck: [-.4, 0] })],
    actors: [hero({ pose: pose(t, 1, { back: 1, headLift: .1, arms: [[-.45, -1.6], [.45, -1.6]] }), pos: hp, t, face: F('worried') })],
    overlay: svg(sub('NO IDEA WHAT’S COMING', t, 27.36, 29.3)), grade: { bloom: .6, gain: [1.1, .96, .86], vignette: .5 } };
});
// 16. THE ASTEROID STRIKES (29.36 – 32.3) — wide over the valley; flash at 30.08; the Yucatán today
shot(29.36, 32.3, t => {
  const A = astAt(t); const it = t - 30.08; const flash = it >= 0 ? Math.exp(-it * 3.2) : 0;
  const cam = cp(t, 29.36, 32.3, [{ p: [OX - 2, OY + 6, OZ - 6], l: [30, -10, 700], f: 44 }, { p: [OX - 1, OY + 7, OZ - 9], l: [36, 0, 700], f: 46 }]);
  return { t, cam: shake(cam, t, it > 0 && it < 1.5 ? .04 * (1 - it / 1.5) : 0), light: DUSK([OX, OY, OZ], { sun: { dir: [.05, .1, 1], color: '#ffb070', int: 2.6 + flash * 8, focus: [OX, OY, OZ], size: 30 } }), cut: null, wind: .4,
    sky: { clouds: .32, red: .3 + k01(t, 30.1, 32.3) * .3 }, asteroid: it < 0 ? { ...A, size: 7 } : undefined, impact: it >= 0 ? { at: IMPACT, t: it, k: 1 } : undefined,
    dinos: [...herd(t - 28)], overlay: svg(yucatanMap(t, 31.2, 32.2)), grade: { bloom: .7 + flash * .8, flash: flash * .9, gain: [1.1, .95, .85] } };
});
// 17. HEAT, FLAMES, AND DUST (32.3 – 35.2) — the cloud climbs, the fire line spreads, a dust front rolls up the valley
shot(32.3, 35.2, t => {
  const it = t - 30.08; const heat = k01(t, 32.3, 33.0);
  const cam = t < 33.4 ? cp(t, 32.3, 33.4, [{ p: [OX + .3, OY + 1.5, OZ + 7.6], l: [OX - .4, OY + 1.1, OZ + 4.4], f: 36 }, { p: [OX + .4, OY + 1.5, OZ + 7.9], l: [OX - .4, OY + 1.1, OZ + 4.4], f: 34 }], x => x)
    : cp(t, 33.4, 35.2, [{ p: [OX + 4, OY + 9, OZ - 8], l: [40, 30, 700], f: 50 }, { p: [OX + 5, OY + 12, OZ - 12], l: [40, 50, 700], f: 54 }]);
  const close = t < 33.4;
  return { t, cam: shake(cam, t, .02), light: FIRE([OX, OY, OZ], heat), cut: null, wind: .7, windDir: [0, -1], sky: { clouds: .4, red: .65, dim: .1 }, impact: { at: IMPACT, t: it, k: 1 }, embers: close ? .2 : 0,
    dinos: close ? [MOM(t, { pos: [OX + 1.3, OY, OZ + 3.4], yaw: -.2, neck: [-.3, .5], head: [-.1, .3, 0], jaw: .3 })] : [...herd(t - 28)],
    actors: [hero({ pose: pose(t, 1, { turn: -.2, headLift: .05, arms: [[-.6, -2.4], [.6, -2.3]], shapeA: 'open', shapeB: 'open' }), pos: [OX - .9, OY, OZ + 4.4], t, face: F('terrified', 'shocked', .3), tint: [1.25, .85, .65] })],
    overlay: svg(pop('HEAT', 540, 300, 72, t, 32.32, { color: '#ff7a2a' }) + pop('FLAMES', 540, 390, 72, t, 32.73, { color: '#ffb347' }) + pop('DUST', 540, 480, 72, t, 33.46, { color: '#d8c0a0' })),
    grade: { bloom: .8, gain: [1.15, .92, .8], sat: 1.05, vignette: .5 } };
});
// 18. MASS EXTINCTION (35.2 – 39.55) — ash begins to fall; wind whips the forest; she shields him
shot(35.2, 39.55, t => {
  const it = t - 30.08; const hp: V3 = [OX - .9, OY, OZ + 4.4]; const wrap = smooth(k01(t, 36.0, 37.0));
  const cam = cp(t, 35.2, 39.55, [{ p: [OX - 5, OY + 1.4, OZ + 2.2], l: [OX + .2, OY + 1.0, OZ + 4.2], f: 44 }, { p: [OX - 4, OY + 1.2, OZ + 1.4], l: [OX + .2, OY + 1.0, OZ + 4.2], f: 38 }]);
  return { t, cam: shake(cam, t, .015), light: FIRE([OX, OY, OZ], .6, { fog: ['#7a4a34', .006] }), cut: null, wind: 1.4, gust: .8, windDir: [-.3, -1], sky: { clouds: .6, red: .75, dim: .3 + k01(t, 35, 39.5) * .3 }, impact: { at: IMPACT, t: it, k: 1 }, ash: .5 + k01(t, 35.2, 39) * .5, embers: .3,
    dinos: [MOM(t, { pos: [OX + .6, OY, OZ + 3.8], yaw: -.9, crouch: .6, wrap, wing: .3 * wrap, neck: [.1, .9 * wrap], head: [.2, .2, 0], shake: .3 })],
    actors: [hero({ pose: sitPose(1, .8 * wrap), pos: hp, t, face: F('worried', 'sad', k01(t, 37.5, 38.5)), tint: [1.1, .8, .65] })],
    overlay: svg(title('MASS EXTINCTION', t, 36.35, 99, 300, 80, '#ff5a3a') + sub('~66 MILLION YEARS AGO', t, 37.65, 99, 400, 50, '#fff')), grade: { bloom: .6, gain: [1.1, .92, .82], vignette: .55, sat: .9 } };
});
// 19. ~75% OF SPECIES VANISHED (39.55 – 44.3) — sauropods walk into the dust and fade from view
shot(39.55, 44.3, t => {
  const it = t - 30.08; const fade = k01(t, 41.6, 43.6);
  const cam = cp(t, 39.55, 44.3, [{ p: [64, 4, 132], l: [38, -50, 232], f: 44 }, { p: [60, 0, 138], l: [30, -52, 240], f: 42 }], x => x);
  return { t, cam, light: ASH([40, -55, 220], { fog: ['#6a5248', .006 + fade * .01] }), cut: null, wind: .9, windDir: [-1, -.2], sky: { clouds: .7, red: .6, dim: .6 }, impact: { at: IMPACT, t: it, k: .8 }, ash: .8,
    dinos: herd(t - 38, fade).map((d, i) => ({ ...d, tint: '#8a7a70', scale: (d.scale ?? 1) * (1 - fade * (i % 4 === 3 ? 0 : .999)) })),
    overlay: svg(extinction(t, 40.0, 41.62, 44.1) + sub('INCLUDING NON-BIRD DINOSAURS', t, 42.92, 44.2, 330, 52, '#ffd34d')), grade: { bloom: .4, gain: [1.02, .95, .88], sat: .75, vignette: .5 } };
});
// 20. THEY TRY TO ESCAPE (44.3 – 48.45) — sprint through the burning forest, ejecta fall; a blast knocks him down
const MET = [{ t0: 44.6, to: [6, 0, 18] }, { t0: 45.4, to: [-8, 0, 6] }, { t0: 46.1, to: [12, 0, 2] }, { t0: 46.9, to: [-3, 0, -6] }, { t0: 47.55, to: [3.5, 0, -7] }];
shot(44.3, 48.45, t => {
  const path: V3[] = [g3(4, 30), g3(1, 10), g3(-1, -10), g3(-2, -20)]; const run = follow(path, t, 44.3, 5.2, 2.2); const hit = 47.93; const kb = k01(t, hit, hit + 1.0);
  const hrun = follow(path.map(p => add3(p, [1.6, 0, 1.2])), t, 44.3, 5.0 * (t < hit ? 1 : .2), 1);
  const cam = shake({ pos: add3(hrun.pos, [3.2, 1.6, -5.5]), look: add3(hrun.pos, [0, 1, 2]), fov: 48 }, t, .04 + (t > hit && t < hit + .6 ? .12 : 0));
  const it = t - 30.08;
  const meteors = MET.map(m => ({ from: [m.to[0] - 40, 80, m.to[2] + 160] as V3, to: g3(m.to[0], m.to[2]), t: (t - m.t0 + 1.2) / 1.2, size: 1.2 }));
  const fx = MET.filter(m => t > m.t0).flatMap((m, i) => [{ kind: 'puff' as const, at: g3(m.to[0], m.to[2]), t: t - m.t0, n: 40, seed: i + 50, spread: 3, rise: 3, size: 1.6, color: '#5a4a40', alpha: .55, dur: 3 },
    { kind: 'debris' as const, at: g3(m.to[0], m.to[2], .3), t: t - m.t0, n: 26, seed: i + 70, spread: 5, up: 6, floor: H(m.to[0], m.to[2]), size: .25, color: '#5a4030' }, { kind: 'sparks' as const, at: g3(m.to[0], m.to[2], .5), t: t - m.t0, n: 40, seed: i + 90, speed: 9 }]);
  const hpose = t < hit ? runPose(hrun.dist / UNIT, sdir(cam, path[0], path[3]), { fear: .4 }) : stumblePose(kb, sdir(cam, path[0], path[3]));
  return { t, cam, light: FIRE(hrun.pos, .9, { fog: ['#6a3a28', .012], sun: { dir: [.1, .3, .95], color: '#ff6a2a', int: 3, focus: hrun.pos, size: 24 } }), cut: null, wind: 1.5, gust: .8, windDir: [0, -1], sky: { clouds: .8, red: .9, dim: .5 }, impact: { at: IMPACT, t: it, k: .6 }, ash: .6, embers: .8,
    meteors, fx, dinos: [MOM(t, { ...run, neck: [-.1, .3 * Math.sin(t * 3)], jaw: .3 + .2 * Math.sin(t * 8), head: [t > hit + .1 ? -.2 : 0, t > hit + .1 ? 1.2 : 0, 0], wing: .15 }), KID(0, t, { ...follow(path.map(p => add3(p, [-1.2, 0, 2.5])), t, 44.3, 4.8, .9), neck: [0, 0] })],
    actors: [hero({ pose: hpose, pos: add3(hrun.pos, [0, t < hit ? runBob(hrun.dist / UNIT) * UNIT : 0, 0]), t, face: t < hit ? F('terrified') : F('shocked', 'determined', k01(t, hit + .5, hit + 1)), tint: [1.25, .85, .7] })],
    overlay: svg(sub('THEY TRY TO ESCAPE', t, 45.9, 47.8) + sub('THE DANGER GOES BEYOND THE BLAST', t, 47.0, 48.4, 330, 46, '#ffd34d')), grade: { bloom: .7, gain: [1.12, .9, .78], sat: 1.0, vignette: .55, flash: t > hit && t < hit + .25 ? (1 - (t - hit) * 4) * .5 : 0 } };
});
// 21. BLOCKED SUNLIGHT DISRUPTS FOOD CHAINS (48.45 – 50.85) — the sun dims to a disc behind ash; grey ferns, a hungry hatchling
shot(48.45, 50.85, t => {
  const p = g3(1.5, -27.5); const dim = k01(t, 48.5, 49.5);
  const cam = cp(t, 48.45, 50.85, [{ p: add3(p, [1.2, 1.0, 3.2]), l: add3(p, [-3, 9, -18]), f: 50 }, { p: add3(p, [1.0, .7, 2.6]), l: add3(p, [-.2, .35, -.2]), f: 40 }]);
  return { t, cam, light: ASH(p, { sun: { dir: [-.2, .45, -.9], color: '#c8a080', int: 1.2 - dim * .8, focus: p, size: 20 }, sunGlow: 1 - dim * .8 }), cut: null, wind: .4, sky: { clouds: .7, red: .3, dim: .5 + dim * .4 }, ash: .9,
    dinos: [KID(2, t, { pos: p, yaw: -2.4, neck: [.7, 0], head: [.3, Math.sin(t * 2) * .3, 0], jaw: Math.max(0, Math.sin(t * 5)) * .3 })],
    overlay: svg(foodChain(t, 49.2, 49.6, 50.8)), grade: { bloom: .35, sat: .55, gain: [.95, .93, .9], vignette: .55 } };
});
// 22. YOU LOOK UP AT A DARKENING SKY, CLUTCHING THE CREATURE THAT RAISED YOU (50.85 – 54.4)
shot(50.85, 54.4, t => {
  const p = g3(-1.5, -31); const hug = smooth(k01(t, 52.4, 53.2)); const up = smooth(k01(t, 50.95, 51.5)) * (1 - hug);
  const cam = t < 52.4 ? cp(t, 50.85, 52.4, [{ p: add3(p, [.5, .45, 2.4]), l: add3(p, [-.1, 1.5, -.3]), f: 44 }, { p: add3(p, [.6, .35, 2.6]), l: add3(p, [-.6, 6, -4]), f: 50 }])
    : cp(t, 52.4, 54.4, [{ p: add3(p, [3.4, 1.4, 2.6]), l: add3(p, [-.5, 1.0, -.3]), f: 40 }, { p: add3(p, [2.8, 1.3, 2.2]), l: add3(p, [-.5, 1.0, -.3]), f: 38 }]);
  return { t, cam, light: ASH(p, { sun: { dir: [-.2, .5, -.9], color: '#b08060', int: .6, focus: p, size: 16 } }), cut: null, wind: .5, sky: { clouds: .85, red: .4, dim: .85 }, ash: 1,
    dinos: [MOM(t, { pos: add3(p, [-.9, 0, -.7]), yaw: 1.1, crouch: .55 + hug * .25, neck: [.2 + hug * .5, .6 * hug], head: [.1, .5 * hug, -.2 * hug], wrap: hug * .9, wing: .2 * hug })],
    actors: [hero({ pose: P(pose(t, 1, { headLift: .18 * up, arms: [[-.45, -1.6], [.45, -1.6]] }), pose(t, 1, { turn: -.6, lean: -.12, arms: [[-1.1, -2.7], [-.4, -2.5]], shapeA: 'hold', shapeB: 'hold' }), hug), pos: p, t, face: hug > .3 ? F('sad', 'worried', .2) : F('sad', 'worried', .5), res: 2048, tint: [.72, .68, .66] })],
    overlay: svg(sub('A DARKENING SKY', t, 51.72, 52.4)), grade: { bloom: .35, sat: .6, gain: [1.0, .94, .9], vignette: .55, aperture: .3, focus: 3.5 } };
});
// 23. HERE'S THE TWIST (54.4 – 56.55): a small bird hops onto her back
shot(54.4, 56.55, t => {
  const p = g3(-1.5, -31); const mp = add3(p, [-.9, 0, -.7]); const hop = smooth(k01(t, 54.6, 55.3)); const perch: V3 = add3(mp, [0, 1.08, -.3]);
  const bird: CreatureState = { id: 'bird', kind: 'bird', pos: [mix(perch[0] + 2.5, perch[0], hop), perch[1] + Math.sin(Math.PI * hop) * .8, mix(perch[2] - 1, perch[2], hop)], yaw: -1.4, t, flap: hop < 1 ? t * 8 : undefined, head: [Math.sin(t * 4) * .15, 0, Math.sin(t * 2.3) * .3], scale: 1.1 };
  const cam = cp(t, 54.4, 56.55, [{ p: add3(mp, [-2.4, 1.6, -2.2]), l: add3(perch, [.4, -.1, .4]), f: 40 }, { p: add3(mp, [-2.0, 1.5, -1.8]), l: add3(perch, [.4, -.1, .4]), f: 36 }]);
  return { t, cam, light: ASH(p, { sun: { dir: [-.2, .5, -.9], color: '#c09070', int: .9, focus: p, size: 16 } }), cut: null, wind: .4, sky: { clouds: .85, red: .3, dim: .8 }, ash: .6,
    dinos: [MOM(t, { pos: mp, yaw: 1.1, crouch: .75, neck: [.3, .9], head: [.2, .9, -.3 * k01(t, 55.3, 55.8)], wrap: .5 }), bird],
    actors: [hero({ pose: pose(t, 1, { turn: -.4, arms: [[-.8, -2.4], [-.3, -2.2]], shapeA: 'hold' }), pos: p, t, face: F('curious', 'amazed', k01(t, 55.1, 55.6)), tint: [.75, .72, .7] })],
    overlay: svg(title('HERE’S THE TWIST', t, 54.5, 56.4, 300, 72, '#ffd34d')), grade: { bloom: .45, sat: .7, vignette: .55, aperture: .35, focus: 2.6 } };
});
// 24. DINOSAURS NEVER DISAPPEARED ENTIRELY — BIRDS SURVIVED (56.55 – 60.0): the bird climbs through the ash into a first break of sky
shot(56.55, 60.0, t => {
  const p = g3(-1.5, -31); const mp = add3(p, [-.9, 0, -.7]); const perch: V3 = add3(mp, [0, 1.08, -.3]); const fly = smooth(k01(t, 56.6, 59.6));
  const bp: V3 = [perch[0] - fly * 5, perch[1] + fly * 13 + Math.sin(t * 3) * .2, perch[2] + fly * 5];
  const c0 = cp(t, 56.55, 57.4, [{ p: add3(mp, [-2.0, 1.5, -1.8]), l: add3(perch, [.4, -.1, .4]), f: 36 }, { p: add3(mp, [-2.2, 1.4, -2.0]), l: add3(perch, [.2, .3, .2]), f: 40 }]);
  const cam = t < 57.4 ? c0 : { pos: add3(bp, [2.4, -2.8 + fly, -3.0]), look: add3(bp, [-.6, .6 + fly * 1.5, .8]), fov: 46 };
  const clear = k01(t, 57.9, 60);
  return { t, cam, light: ASH(p, { sky: ['#4a5a7a', '#c08a6a'], sun: { dir: [.4, .3, -.85], color: '#ffc890', int: .9 + clear * 1.4, focus: p, size: 30 }, sunGlow: .3 + clear }), cut: null, wind: .4, sky: { clouds: .8 - clear * .3, red: .25 * (1 - clear), dim: .7 * (1 - clear * .75) }, ash: .5 * (1 - clear),
    dinos: [MOM(t, { pos: mp, yaw: 1.1, crouch: .75, neck: [-.3, .6], head: [-.6 * fly, .4, 0], wrap: .4 }), { id: 'bird', kind: 'bird', pos: bp, yaw: -.8, t, flap: fly > 0 ? t * 7 : undefined, lean: -.25, scale: 1.4 }],
    actors: [hero({ pose: pose(t, 1, { turn: -.3, headLift: .2 * fly, arms: [[-.6, -2.2], [.95, -3.3]], shapeB: 'point' }), pos: p, t, face: F('amazed', 'happy', clear), tint: [.75 + clear * .2, .72 + clear * .2, .7 + clear * .2] })],
    overlay: svg(sub('DINOSAURS NEVER DISAPPEARED', t, 55.7, 57.6, 1500, 52) + title('BIRDS SURVIVED', t, 57.93, 99, 330, 96, '#ffd34d')),
    grade: { bloom: .5 + clear * .3, sat: .7 + clear * .45, gain: [1.0 + clear * .06, .96, .92], vignette: .5 } };
});

export const SHOTS = S;
export function frameAt(frame: number): Frame5 {
  const t = Math.min(frame, FRAMES - 1) / FPS; const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
void jumpPose; void mix;
