// Lake Nyos — 42.4 s timeline keyed to the word timestamps of the narration (timing map kept in the private repo).
// Opens in a dark hut before dawn; ends sinking into the dark water of the lake → loops back to the dark hut.
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Frame3 } from './engine3.ts';
import { pose, P, F, gesture, camPath, drift, add3, inOut, mix, outBack, talk, type PoseIn } from '../brazil/anim.ts';
import { walkPose, type Pose, type Look } from '../ff2d/rig.ts';
import { svg, pop, chip } from '../brazil/overlay.ts';
import { H, WL, valleyX } from './terrain.ts';

export const FPS = 30, DURATION = 42.4, FRAMES = Math.round(DURATION * FPS);
const k01 = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

// ---------------------------------------------------------------------------------------------- original cast for the setting
const HERO: Look = { outfit: 'jacket', color: '#c9772f', pants: '#4a3a2a', shoe: '#3a2a1e', hairStyle: 'crop', hair: '#1a1410' };
const WOMAN: Look = { outfit: 'dress', color: '#2f6db0', pants: '#2f6db0', shoe: '#5a3a26', hairStyle: 'bun', hair: '#1a1410' };
const ELDER: Look = { outfit: 'jacket', color: '#6b4f8a', pants: '#3a3430', shoe: '#2a2018', hairStyle: 'fringe', hair: '#d8d8d8', beard: 'full', beardColor: '#e2e2e2' };
const YOUTH: Look = { outfit: 'hoodie', color: '#3e8a52', pants: '#2c3a5a', shoe: '#e9e6df', hairStyle: 'curlyTop', hair: '#1a1410' };

// ---------------------------------------------------------------------------------------------- places
const HX = -2, HZ = 252, Y0 = H(HX, HZ) + .05;                          // hero house floor
const ground = (x: number, z: number): V3 => [x, H(x, z), z];
// ---------------------------------------------------------------------------------------------- light rigs
const DAWN = (o: Partial<Light> = {}): Light => ({ sky: ['#5f7aa6', '#e9c2a6'], sun: { dir: [-.75, .2, .45], color: '#ffc39a', int: 2.3, focus: [-12, 4, 262], size: 60 }, hemi: ['#b9c8e6', '#5a4a3a', .75], amb: ['#ffffff', .1],
  fog: ['#c9cbd2', .006], env: .8, sunGlow: 1.0, ...o });
const DAY = (o: Partial<Light> = {}): Light => ({ sky: ['#3f78c8', '#cfe3f2'], sun: { dir: [-.45, .7, .5], color: '#fff1d8', int: 3.2, focus: [0, 20, 60], size: 220 }, hemi: ['#cfe3ff', '#5a5030', .7], amb: ['#ffffff', .08],
  fog: ['#bcd3e6', .0016], env: 1, sunGlow: .8, ...o });
const NIGHT = (o: Partial<Light> = {}): Light => ({ sky: ['#0a1430', '#2a3f6e'], sun: { dir: [.4, .55, -.6], color: '#a9c0ff', int: 1.5, focus: [0, 20, 40], size: 200 }, hemi: ['#5470b8', '#18120c', 1.0], amb: ['#8090c0', .12],
  fog: ['#14203e', .0035], env: .4, sunGlow: 0, stars: 1, ...o });
const UNDER = (o: Partial<Light> = {}): Light => ({ sky: ['#1d6a74', '#0b3a42'], sun: { dir: [-.3, .9, .2], color: '#bfeee8', int: 1.4, focus: [0, 0, 0], size: 80 }, hemi: ['#6fc6c4', '#0a2a30', 1.2], amb: ['#7fd0d0', .2],
  fog: ['#1a5c64', .026], env: .3, sunGlow: 0, ...o });
const INSIDE = (k: number): Light => ({ sky: ['#6f86ad', '#d9b6a0'], sun: { dir: [-.95, .28, .1], color: '#ffd3ac', int: 2.2 * k, focus: [HX, Y0, HZ], size: 8 }, hemi: ['#8ea2c8', '#3a2a20', .35 + .35 * k], amb: ['#ffffff', .08],
  fog: ['#c9cbd2', .006], env: .5, sunGlow: 0, points: [{ pos: [HX - 3.0, Y0 + 1.6, HZ], color: '#cfdcff', int: 7 * k, dist: 8, shadow: true }, { pos: [HX + 1.2, Y0 + 2.2, HZ + 1.2], color: '#ffd9b0', int: 2.5, dist: 6 }] });

type Shot = { t0: number; t1: number; name: string; f: (t: number) => Frame3 };
const S: Shot[] = [];
const shot = (name: string, t0: number, t1: number, f: Shot['f']) => S.push({ name, t0, t1, f });
const xMark = (x: number, y: number, label: string, t: number, t0: number) => {
  const k = outBack(k01(t, t0, t0 + .3), 1.8); if (k <= 0) return '';
  const s = k01(t, t0 + .18, t0 + .42);
  return `<g transform="translate(${x} ${y}) scale(${k})" filter="url(#sh)"><text y="18" text-anchor="middle" font-size="64" font-weight="900" fill="#fff" stroke="#111" stroke-width="10" paint-order="stroke">${label}</text>
    <path d="M-${190 * s} -40 L${190 * s} 30" stroke="#ff4636" stroke-width="16" stroke-linecap="round"/></g>`;
};
const hero = (o: Partial<ActorState> & { pose: Pose; face: ActorState['face']; pos: V3; t: number }): ActorState => ({ id: 'hero', look: HERO, seed: 11, res: 1536, ...o });
const crouchSit = (t: number, o: PoseIn = {}) => pose(t, 11, { crouch: .95, lean: .12, footA: [-.35, -.02], footB: [.5, -.02], arms: [[-.55, -1.6], [.6, -1.55]], ...o });

// ============================================================================================== 1. WAKING UP (0 – 2.35)
shot('wake', 0, 2.35, (t) => {
  const bx = HX + 1.6, bz = HZ - .6, top = Y0 + .6;      // bed (long axis along z), head toward -z
  const c = camPath(t, 0, 2.35, [{ p: [HX - 1.4, Y0 + 1.15, HZ - .4], l: [bx, Y0 + .7, bz], f: 50 }, { p: [HX - 1.2, Y0 + 1.25, HZ - .3], l: [bx - .3, Y0 + .95, bz + .2], f: 46 }], x => x);
  const sit = inOut(k01(t, .95, 1.55)), stand = inOut(k01(t, 1.6, 2.0)), walk = k01(t, 1.95, 2.35);
  const roll = mix(Math.PI / 2, 0, sit);
  let p: Pose = pose(t, 11, { turn: -.9, arms: [[-.2, -1.9], [.3, -2.0]], headTilt: .1 });
  if (sit > 0) p = P(p, crouchSit(t, { turn: -.6, headTurn: -.3 }), sit);
  if (stand > 0) p = P(p, pose(t, 11, { turn: -.75, headTurn: -.5 }), stand);
  if (walk > 0) p = walkPose(walk * .9 / .4167, -1, { step: .95 });
  const eyes = k01(t, .7, .85);
  const face = { ...(eyes < 1 ? { ...F('calm'), lidTop: 1 - eyes, lidLow: .1 } : F('curious', 'suspicious', k01(t, 1.3, 1.8))), gx: -.6 * sit };
  const lying: V3 = [bx + .45, top, bz + .95];         // feet at the foot of the bed; figure lies along the bed toward -z
  const seated: V3 = [bx - .45, Y0, bz + .2];
  const pos: V3 = walk > 0 ? [seated[0] - walk * .9, Y0, seated[2]] : sit < 1 ? [mix(lying[0], seated[0], sit), mix(lying[1], Y0, sit), mix(lying[2], seated[2], sit)] : seated;
  return { t, cam: c, light: INSIDE(k01(t, .1, 1.6) * .7 + .3), cut: null, actors: [hero({ pose: p, face, pos, t, roll: walk > 0 ? 0 : roll * (1 - sit), contact: sit, shadow: sit > .5, tint: [.92, .95, 1.05] })],
    fx: [{ kind: 'motes', box: [[HX - 2.5, Y0 + .3, HZ - 2], [HX + 2.5, Y0 + 2.4, HZ + 2]], n: 70, seed: 3, color: '#ffe6c8', size: .02, t, alpha: .5 }],
    lantern: 0, grade: { exposure: mix(.15, 1, k01(t, 0, .7)), gain: [.97, .99, 1.06], vignette: .6 } };
});

// ============================================================================================== 2. THE WINDOW (2.35 – 3.9)
shot('window', 2.35, 3.9, (t) => {
  // seen from outside: the shutter swings open and he peers out at the silent village
  const wx = HX - 2.6;
  const c = camPath(t, 2.35, 3.9, [{ p: [wx - 3.4, Y0 + 1.55, HZ + 1.6], l: [wx, Y0 + 1.45, HZ], f: 40 }, { p: [wx - 2.5, Y0 + 1.55, HZ + 1.1], l: [wx, Y0 + 1.5, HZ], f: 36 }], x => x);
  const open = inOut(k01(t, 2.45, 2.85)), lean = inOut(k01(t, 2.75, 3.1)), look = Math.sin((t - 3.0) * 4) * k01(t, 3.0, 3.3) * (1 - k01(t, 3.55, 3.75)), turn = k01(t, 3.6, 3.9);
  let p: Pose = pose(t, 11, { turn: -.35, arms: [[-.95, -2.9], [.35, -1.8]], shapeA: 'open' });
  p = P(p, pose(t, 11, { turn: -.2, lean: .12, headTurn: .45 * look, arms: [[-.75, -2.3], [.7, -2.3]], shapeA: 'open', shapeB: 'open' }), lean);
  if (turn > 0) p = P(p, pose(t, 11, { turn: .6, headTurn: .4, arms: [[-.4, -1.8], [.4, -1.8]] }), turn);
  const face = turn > .3 ? F('concern', 'fear', turn) : lean > .3 ? { ...F('suspicious', 'confused', k01(t, 3.2, 3.5)), gx: .7 * look } : F('curious');
  return { t, cam: { ...c, pos: add3(c.pos, drift(t, .006)) }, light: DAWN(), cut: null, xform: { Shutter: { rot: [0, -1.9 * open, 0] } },
    actors: [hero({ pose: p, face, pos: [HX - 2.05, Y0, HZ + .05], t, tint: [.95, .97, 1.05] })],
    fx: [{ kind: 'motes', box: [[wx - 4, Y0 + .5, HZ - 3], [wx, Y0 + 3, HZ + 3]], n: 60, seed: 4, color: '#fff0d8', size: .03, t, alpha: .4 }],
    wind: .35, grade: { gain: [1.0, .99, 1.04], vignette: .5 } };
});

// ============================================================================================== 3. THE DOOR (3.9 – 5.4)
shot('door', 3.9, 5.4, (t) => {
  const dx = HX + .7, dz = HZ + 2.1;
  const c = camPath(t, 3.9, 5.4, [{ p: [dx + 1.6, Y0 + 1.45, dz + 4.4], l: [dx, Y0 + 1.2, dz], f: 42 }, { p: [dx + .9, Y0 + 1.55, dz + 2.6], l: [dx - .1, Y0 + 1.55, dz + .6], f: 36 }], inOut);
  const open = inOut(k01(t, 3.95, 4.35)), out = k01(t, 4.15, 4.65), look = gesture(t, 4.45, .25), shock = k01(t, 4.7, 4.95);
  let p: Pose = out < 1 ? { ...walkPose(out * .9 / .4167, 1, { step: .9 }), handA: [-.7, -2.5] } : pose(t, 11, { turn: .1, headTurn: -.5 * look, arms: [[-.4, -1.8], [.6, -2.0]] });
  if (shock > 0) p = P(p, pose(t, 11, { turn: 0, lean: -.1, headLift: .1, arms: [[-.85, -2.75], [.85, -2.7]], shapeA: 'open', shapeB: 'open' }), shock);
  const face = shock > 0 ? F('shocked', 'terror', shock * .4) : look > .2 ? F('confused') : F('worried');
  return { t, cam: c, light: DAWN(), cut: null, xform: { 'House door': { rot: [0, 1.6 * open, 0] } }, wind: .4,
    actors: [hero({ pose: p, face, pos: [dx, H(dx, dz + .2 + out * .9), dz - .3 + out * 1.1], t })],
    fx: [{ kind: 'motes', box: [[dx - 8, Y0, dz], [dx + 8, Y0 + 4, dz + 10]], n: 80, seed: 5, color: '#fff2e0', size: .05, t, alpha: .3 }],
    overlay: svg(pop('DEAD', 540, 1540, 120, t, 4.75, { color: '#fff' })), grade: { gain: [1.0, .99, 1.03], vignette: .45, sat: .9 } };
});

// ============================================================================================== 4. NO EXPLOSION. NO GUNSHOTS. NOT EVEN A SCREAM. (5.4 – 9.3)
const stillLife = () => [{ name: 'Basket', pos: [-9.3, H(-9.3, 263.6) + .02, 263.6] as V3, rot: [Math.PI / 2 - .2, .4, 0] as V3 }, { name: 'Bicycle', pos: [-15.5, H(-15.5, 266.2) + .03, 266.2] as V3, rot: [Math.PI / 2, 0, .6] as V3 },
  { name: 'Hoe', pos: [-6.5, H(-6.5, 259) + .03, 259] as V3, rot: [0, 0, Math.PI / 2] as V3 }];
shot('silence', 5.4, 9.3, (t) => {
  const e = (x: number, z: number, dy: number): V3 => [x, H(x, z) + dy, z];
  const c = camPath(t, 5.4, 9.3, [{ p: e(-2.5, 258.5, 1.75), l: e(-16, 268, 1.4), f: 46 }, { p: e(-6, 262, 1.7), l: e(-16, 270, 1.4), f: 44 }, { p: e(-9, 265.5, 1.65), l: e(-11.6, 270.5, 1.3), f: 40 }], inOut);
  const call = gesture(t, 8.3, .45);
  const hp = P(walkPose(Math.min(t - 5.4, 2.6) * 1.05 / .4167, 1, { step: .95 }), pose(t, 11, { turn: -.2, headLift: .15, arms: [[-.45, -3.55], [.45, -3.55]], shapeA: 'open', shapeB: 'open' }), call);
  const hx = mix(-11.6, -11.2, k01(t, 5.4, 8.0));
  return { t, cam: { ...c, pos: add3(c.pos, drift(t, .02)) }, light: DAWN(), cut: null, props: stillLife(), wind: .45,
    actors: [hero({ pose: hp, face: call > .2 ? talk(F('fear'), .9 * call) : F('worried', 'confused', k01(t, 6.6, 7.4)), pos: [hx, H(hx, 270.5), 270.5 - Math.min(t - 5.4, 2.6) * .0], t })],
    fx: [{ kind: 'motes', box: [[-30, 3, 250], [10, 9, 285]], n: 200, seed: 6, color: '#f6efe6', size: .12, t, alpha: .22 }],
    overlay: svg(xMark(540, 380, 'EXPLOSION', t, 5.6) + xMark(540, 520, 'GUNSHOTS', t, 7.05) + pop('NOT EVEN A SCREAM', 540, 1560, 70, t, 8.0, { color: '#fff' })),
    grade: { gain: [1.0, .99, 1.03], vignette: .45, sat: .88 } };
});

// ============================================================================================== 5. CAMEROON, 1986 (9.3 – 13.4)
shot('cameroon', 9.3, 13.4, (t) => {
  const c = camPath(t, 9.3, 13.4, [{ p: [-60, 46, 320], l: [-10, 22, 150], f: 50 }, { p: [-55, 70, 230], l: [0, 20, 20], f: 48 }, { p: [-30, 92, 175], l: [0, 18, -10], f: 46 }], inOut);
  return { t, cam: c, light: DAY(), cut: null, wind: .8, water: { calm: 1 },
    fx: [{ kind: 'motes', box: [[-120, 40, -60], [120, 90, 260]], n: 60, seed: 7, color: '#ffffff', size: 2.5, t, alpha: .12 }],
    overlay: svg(chip('CAMEROON, WEST AFRICA', 70, 170, 42, t, 10.9) + pop('1986', 540, 1540, 150, t, 12.2, { color: '#fff' }) + pop('LAKE NYOS', 540, 380, 64, t, 11.9, { color: '#ffd34d' })),
    grade: { gain: [1.03, 1.0, .97], bloom: .4 } };
});

// ============================================================================================== 6. ONE NIGHT… THE LAKE (13.4 – 17.6)
shot('night-lake', 13.4, 17.6, (t) => {
  const c = camPath(t, 13.4, 17.6, [{ p: [66, 23.2, 64], l: [-6, 21.5, 4], f: 44 }, { p: [62, 23.6, 60], l: [-6, 23.5, 4], f: 44 }], x => x);
  const b = 1 - (1 - k01(t, 15.05, 16.9)) ** 2; const sh = (t > 15.5 ? Math.sin(t * 40) * .03 * k01(t, 15.5, 16) : 0);
  return { t, cam: { ...c, pos: add3(c.pos, [0, sh, 0]) }, light: NIGHT({ points: [{ pos: [-6, 24, 4], color: '#cfe8ff', int: 120 * b, dist: 60 }] }), cut: null, wind: .5,
    water: { boil: b * .9, boilT: t, calm: 1 + b * 2 }, bubbles: { k: b * .25, t, rise: 1 },
    fx: [{ kind: 'puff', at: [-6, WL + 1, 4], t: Math.max(0, t - 15.4), n: Math.round(70 * b), seed: 8, spread: 22, rise: 26, size: 8, color: '#d9e6ee', alpha: .25, dur: 6 },
      { kind: 'motes', box: [[-30, 21, -20], [40, 40, 90]], n: 40, seed: 9, color: '#cfe0ff', size: .4, t, alpha: .15 }],
    overlay: svg(pop('SUDDENLY…', 540, 1560, 84, t, 15.05, { color: '#fff' })), grade: { exposure: 1.1, gain: [.95, .98, 1.08], vignette: .5, bloom: .55 } };
});

// ============================================================================================== 7. NOT LAVA. NOT SMOKE. (17.6 – 20.85)
shot('not-lava', 17.6, 20.85, (t) => {
  const a = mix(.9, .35, k01(t, 17.6, 20.85)); const c = { pos: [-6 + Math.cos(a) * 70, 34, 4 + Math.sin(a) * 70] as V3, look: [-6, 26, 4] as V3, fov: 46 };
  return { t, cam: c, light: NIGHT({ points: [{ pos: [-6, 26, 4], color: '#cfe8ff', int: 160, dist: 70 }] }), cut: null, wind: .7,
    water: { boil: .9, boilT: t, calm: 3 }, bubbles: { k: .25, t, rise: 1 },
    fx: [{ kind: 'puff', at: [-6, WL + 1, 4], t: t - 15.4, n: 90, seed: 8, spread: 26, rise: 32, size: 9, color: '#d9e6ee', alpha: .22, dur: 7 },
      { kind: 'puff', at: [-6, WL + 1, 4], t: (t - 17.6) % 2.5, n: 40, seed: 10, spread: 10, rise: 18, size: 6, color: '#eef6fa', alpha: .3, dur: 2.5 }],
    overlay: svg(xMark(540, 380, 'LAVA', t, 18.3) + xMark(540, 520, 'POISON SMOKE', t, 20.0)), grade: { exposure: 1.1, gain: [.95, .98, 1.08], vignette: .5, bloom: .55 } };
});

// ============================================================================================== 8. INVISIBLE CARBON DIOXIDE — beneath the surface (20.85 – 24.7)
shot('co2', 20.85, 24.7, (t) => {
  const dive = inOut(k01(t, 20.85, 21.9));
  const c = camPath(t, 20.85, 24.7, [{ p: [10, WL + 3, 40], l: [-2, WL - 4, 6], f: 50 }, { p: [8, WL - 2.5, 34], l: [-4, WL - 10, 4], f: 54 }, { p: [4, WL - 7, 30], l: [-6, WL - 9, 2], f: 56 }, { p: [2, WL - 6, 26], l: [-6, WL - 4, 2], f: 58 }], inOut);
  const under = c.pos[1] < WL ? 1 : 0; const lift = inOut(k01(t, 22.0, 24.7));
  return { t, cam: c, light: under ? UNDER() : NIGHT(), cut: null, under: under * mix(.6, 1, dive), wind: .4,
    water: { boil: .6 * (1 - lift * .5), boilT: t, calm: 2 }, co2: { k: 1, lift }, bubbles: { k: .6 + lift * .4, t, rise: .6 + lift * .4 },
    fx: [{ kind: 'motes', box: [[-30, -4, -20], [30, WL - .5, 40]], n: 260, seed: 11, color: '#bfeee8', size: .08, t, alpha: .5 * under }],
    overlay: svg(chip('CO₂ (made visible here — it is invisible)', 70, 170, 34, t, 21.1) + pop('INVISIBLE', 540, 1440, 80, t, 22.6, { color: '#9fe3ff' }) + pop('CARBON DIOXIDE', 540, 1560, 84, t, 23.35, { color: '#fff' })),
    grade: { gain: [.92, 1.0, 1.06], bloom: .5, vignette: .55 } };
});

// ============================================================================================== 9. DOWN THE VALLEYS (24.7 – 28.95)
shot('valley', 24.7, 28.95, (t) => {
  const front = (k01(t, 24.75, 28.95) ** .85) * 175;
  const fz = 92 + front; const c = camPath(t, 24.7, 28.95, [{ p: [60, 70, 70], l: [0, 22, 120], f: 50 }, { p: [55, 52, 150], l: [valleyX(190), 10, 205], f: 50 }, { p: [40, 36, 205], l: [valleyX(250), 5, 262], f: 50 }], inOut);
  void fz;
  return { t, cam: c, light: NIGHT(), cut: null, wind: .6, water: { boil: .2, boilT: t, calm: 1.5 },
    gas: { front, k: .9, t: t - 24.7, lake: 1 },
    overlay: svg(pop('RUSHED DOWN THE VALLEYS', 540, 380, 58, t, 25.1, { color: '#fff' }) + chip('HEAVIER THAN AIR · PUSHES THE AIR AWAY', 540, 1560, 32, t, 27.1, 99, 'middle')),
    grade: { exposure: 1.15, gain: [.95, .99, 1.08], vignette: .5 } };
});

// ============================================================================================== 10. NO IDEA WHAT WAS HAPPENING (28.95 – 31.95)
shot('confused', 28.95, 31.95, (t) => {
  const c = camPath(t, 28.95, 31.95, [{ p: [-9, 6.2, 275], l: [-14, 5.3, 266], f: 44 }, { p: [-10, 5.9, 273.5], l: [-14.5, 5.3, 266], f: 40 }], x => x);
  const flame = 1 - k01(t, 29.8, 30.6); const dizzy = k01(t, 30.4, 31.2);
  const wp = P(pose(t, 21, { turn: .4, headTurn: -.4 * Math.sin(t * 2.2), arms: [[-.3, -1.8], [.55, -2.6]], shapeB: 'hold' }), pose(t, 21, { turn: .3, lean: .12, headTilt: .25, arms: [[-.55, -3.45], [.55, -2.4]], shapeA: 'open', shapeB: 'hold' }), dizzy);
  const ep = pose(t, 22, { turn: -.5, headTurn: .3 * Math.sin(t * 1.7), crouch: .5 * dizzy, arms: [[-.5, -2.3], [.4, -1.7]] });
  const yp = pose(t, 23, { turn: .2, headTurn: Math.sin(t * 3) * .5, arms: [[-.9, -2.6], [.8, -2.6]], shapeA: 'open', shapeB: 'open' });
  const lantern = `<g transform="translate(.55 -2.4)"><path d="M0 -.1 v-.12" stroke="#111" stroke-width=".03"/><rect x="-.09" y="-.1" width=".18" height=".28" rx=".04" fill="rgba(255,220,150,${.25 + .6 * flame})" stroke="#111" stroke-width=".035"/><ellipse cy=".04" rx="${.03 * flame}" ry="${.06 * flame}" fill="#ffb347"/></g>`;
  return { t, cam: c, light: NIGHT({ points: [{ pos: [-13.2, 6.3, 266.6], color: '#ffb35a', int: 9 * flame, dist: 9, shadow: true }, { pos: [-10, 9, 272], color: '#7d93cc', int: 10, dist: 16 }] }), cut: null, wind: .3,
    gas: { front: 175, k: .55, t: t - 24.7, lake: 0 },
    actors: [{ id: 'woman', look: WOMAN, pose: wp, face: dizzy > .3 ? F('worried', 'sad', dizzy) : F('confused'), pos: ground(-13.6, 266.2), t, seed: 21, res: 1536, extra: lantern, tint: [.8, .85, 1] },
      { id: 'elder', look: ELDER, pose: ep, face: F('suspicious', 'confused', k01(t, 29.5, 30.2)), pos: ground(-16.4, 265.4), t, seed: 22, res: 1024, tint: [.75, .8, 1] },
      { id: 'youth', look: YOUTH, pose: yp, face: F('confused', 'fear', k01(t, 30.5, 31.2)), pos: ground(-11.2, 264.6), t, seed: 23, res: 1024, tint: [.75, .8, 1] }],
    fx: [{ kind: 'puff', at: [-13.2, 6.2, 266.4], t: Math.max(0, t - 30.4), n: flame < 1 ? 6 : 0, seed: 12, spread: .1, rise: .6, size: .25, color: '#aaaaaa', alpha: .4, dur: 1.4 }],
    overlay: svg(pop('NO IDEA', 540, 380, 96, t, 29.65, { color: '#fff' }) + chip('the flame goes out — no oxygen', 540, 1560, 32, t, 30.3, 99, 'middle')),
    grade: { exposure: 1.1 * (1 - k01(t, 31.35, 31.95) * .92), gain: [.95, .98, 1.08], vignette: .55 } };
});

// ============================================================================================== 11. BY MORNING (31.95 – 35.85)
shot('morning', 31.95, 35.85, (t) => {
  const c = camPath(t, 31.95, 35.85, [{ p: [-28, 9, 300], l: [-12, 4, 262], f: 48 }, { p: [-30, 15, 306], l: [-12, 4, 262], f: 48 }], x => x);
  const fade = k01(t, 31.95, 32.6);
  return { t, cam: c, light: DAWN({ fog: ['#d6d4d8', .012], sun: { dir: [-.6, .12, -.55], color: '#ffb98e', int: 1.4, focus: [-12, 4, 262], size: 60 } }), cut: null, wind: .3, props: stillLife(),
    actors: [hero({ pose: pose(t, 11, { turn: .7, headTurn: -.4, arms: [[-.35, -1.75], [.3, -1.75]] }), face: F('sad'), pos: ground(-1.6, 256.4), t, res: 768 })],
    fx: [{ kind: 'motes', box: [[-50, 4, 230], [20, 12, 300]], n: 160, seed: 13, color: '#ffffff', size: 1.4, t, alpha: .12 }],
    overlay: svg(pop('≈ 1,700', 540, 400, 170, t, 33.35, { color: '#fff' }) + pop('PEOPLE', 540, 500, 64, t, 34.45, { color: '#fff' }) + pop('DIED IN ONE NIGHT', 540, 1560, 56, t, 35.3, { color: '#ffd9b0' })),
    grade: { exposure: mix(.08, 1, fade), sat: .78, gain: [1.0, .98, .98], vignette: .5 } };
});

// ============================================================================================== 12. THE SCARIEST PART (35.85 – 37.55) — up the valley toward the rim
shot('scariest', 35.85, 37.55, (t) => {
  const c = camPath(t, 35.85, 37.55, [{ p: [-16, 22, 248], l: [valleyX(150), 18, 140], f: 50 }, { p: [-6, 40, 175], l: [0, 24, 60], f: 50 }], inOut);
  return { t, cam: c, light: DAWN({ sky: ['#7d9cc8', '#f2d4ba'], fog: ['#d8dbe2', .006] }), cut: null, wind: .5, water: { rust: .35, calm: .4 }, grade: { sat: .85 } };
});

// ============================================================================================== 13. PEACEFUL AGAIN — and what hides beneath (37.55 – 42.4)
shot('peaceful', 37.55, DURATION, (t) => {
  const c = camPath(t, 37.55, 41.6, [{ p: [10, 40, 130], l: [-4, 20, 20], f: 50 }, { p: [4, 27, 82], l: [-4, 20, 20], f: 50 }, { p: [1, 21.6, 52], l: [-3, 19.6, 20], f: 50 }, { p: [0, 20.6, 40], l: [-2, 18.0, 20], f: 52 }], inOut);
  const sink = inOut(k01(t, 41.0, 42.0)); const cam = sink > 0 ? { pos: [0, mix(20.6, 14.5, sink), mix(40, 34, sink)] as V3, look: [-2, mix(18, 6, sink), 20] as V3, fov: 52 } : c;
  const under = cam.pos[1] < WL;
  return { t, cam, light: under ? UNDER({ fog: ['#0a2a30', mix(.04, .09, sink)] }) : DAWN({ sky: ['#86a4cc', '#f5dcc2'], sun: { dir: [-.4, .2, -.8], color: '#ffd2a8', int: 1.8, focus: [0, 20, 40], size: 160 }, fog: ['#dfe2e8', .004] }),
    cut: null, wind: .3, under: under ? 1 : 0, water: { rust: .3, calm: .35 }, co2: under ? { k: .6, lift: 0 } : undefined, bubbles: under ? { k: .08, t, rise: .5 } : undefined,
    fx: under ? [{ kind: 'motes', box: [[-20, 2, 10], [20, WL - .5, 40]], n: 200, seed: 14, color: '#bfeee8', size: .08, t, alpha: .45 }] : [{ kind: 'motes', box: [[-40, 20.3, 20], [40, 26, 80]], n: 60, seed: 15, color: '#ffffff', size: .9, t, alpha: .15 }],
    overlay: svg(pop('PEACEFUL AGAIN', 540, 380, 70, t, 38.3, { color: '#fff', out: 40.6 }) + pop('…BENEATH IT', 540, 1560, 80, t, 41.25, { color: '#9fe3ff' })),
    grade: { exposure: mix(1, .12, k01(t, 41.75, 42.38)), sat: .9, vignette: .5 } };
});

export const SHOTS = S;
export function frameAt(frame: number): Frame3 {
  const t = Math.min(frame, FRAMES - 1) / FPS;
  const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const F = s.f(t); const [x, y, z] = F.cam.pos; const g = H(x, z) + 1.0;     // never let a camera move sink into the ground
  if (y < g) F.cam = { ...F.cam, pos: [x, g, z] };
  return F;
}
