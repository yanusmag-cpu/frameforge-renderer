// "Why GTA 6 took 13 years" — 61.1 s timeline keyed to the word timestamps of the two narration parts (part 2 starts at 29.79 s).
import type { V3, Light, PropState } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Frame4, CaseId } from './engine4.ts';
import { CAST, pose, P, F, gesture, talk, camPath, drift, add3, inOut, mix, outBack } from '../brazil/anim.ts';
import { UNIT } from '../brazil/actor.ts';
import { walkPose, type Pose, type Look } from '../ff2d/rig.ts';
import { type V2 } from '../ff2d/motion.ts';
import { svg, pop, chip, calendar } from '../brazil/overlay.ts';
import { MOUTH } from './mouth.ts';

export const FPS = 30, DURATION = 61.1, FRAMES = Math.round(DURATION * FPS);
const k01 = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
let AUDIO_T = 0;
const mouth = () => { const i = Math.round(AUDIO_T * FPS); return i >= 0 && i < MOUTH.length ? +MOUTH[i] / 9 : 0; };
const SX = 2005, STG = 2100;

// ---------------------------------------------------------------------------------------------- looks
const HOST = CAST.host;
const DEV: Look[] = [
  { outfit: 'hoodie', color: '#4b5563', pants: '#1f2937', hairStyle: 'crop', hair: '#2a1d14', glasses: true },
  { outfit: 'jacket', color: '#2f6db0', pants: '#2a2a2a', hairStyle: 'bun', hair: '#5a3a26' },
  { outfit: 'hoodie', color: '#2bb6a0', pants: '#2c3a5a', hairStyle: 'curlyTop', hair: '#1a1410', beard: 'stubble' },
  { outfit: 'vest', color: '#3a3a40', inner: '#e9e6df', pants: '#3a3430', hairStyle: 'sidepart', hair: '#6b4a2b', glasses: 'heavy' },
];
const PED: Look[] = [
  { outfit: 'dress', color: '#f472b6', pants: '#f472b6', hairStyle: 'bun', hair: '#2a1d14' }, { outfit: 'jacket', color: '#2bd1c4', pants: '#f2f2f2', hairStyle: 'crop', hair: '#1a1410' },
  { outfit: 'hoodie', color: '#ffb347', pants: '#2c3a5a', hairStyle: 'curlyTop', hair: '#1a1410' }, { outfit: 'suit', color: '#e9e6df', pants: '#e9e6df', tie: '#2f6db0', hairStyle: 'slick', hair: '#1d1b20' },
  { outfit: 'dress', color: '#7a6cff', pants: '#7a6cff', hairStyle: 'fringe', hair: '#c9a46a' }, { outfit: 'vest', color: '#ff5a7a', inner: '#ffffff', pants: '#1f2937', hat: 'cap', hair: '#ff5a7a' },
  { outfit: 'jacket', color: '#4fd36a', pants: '#3a3430', hairStyle: 'sidepart', hair: '#3b2a20', glasses: true }, { outfit: 'hoodie', color: '#e5e7eb', pants: '#2a6fb0', hairStyle: 'bun', hair: '#1a1410' },
];

// ---------------------------------------------------------------------------------------------- light rigs
const GOLDEN = (focus: V3, size = 60, o: Partial<Light> = {}): Light => ({ sky: ['#3d7fd6', '#ffc79a'], sun: { dir: [-.5, .45, -.75], color: '#ffd7a6', int: 3.6, focus, size }, hemi: ['#bcd8ff', '#6a5a46', .75], amb: ['#ffffff', .08],
  fog: ['#f3c9a8', .0022], env: 1.1, sunGlow: 1.2, ...o });
const FLAT = (focus: V3): Light => ({ sky: ['#9aa6b2', '#c9cdd2'], sun: { dir: [0, 1, 0], color: '#ffffff', int: .25, focus, size: 60, shadow: 0 }, hemi: ['#ffffff', '#8a8a8a', 1.2], amb: ['#ffffff', .25], fog: ['#c9cdd2', .002], env: .4, sunGlow: 0 });
const STAGE = (o: Partial<Light> = {}): Light => ({ sky: ['#05060c', '#11142a'], sun: { dir: [.2, 1, .3], color: '#ffffff', int: .3, focus: [STG, 0, 0], size: 14, shadow: 0 }, hemi: ['#3a3f66', '#05050a', .35], amb: ['#ffffff', .03],
  fog: ['#07080f', .02], env: .6, sunGlow: 0, points: [{ pos: [STG - 7, 6, 4], color: '#ff6ad5', int: 60, dist: 16 }, { pos: [STG + 7, 6, 4], color: '#3df2ff', int: 60, dist: 16 }, { pos: [STG, 7, 6], color: '#ffffff', int: 70, dist: 18, shadow: true }], ...o });
const OFFICE = (o: Partial<Light> = {}): Light => ({ sky: ['#1b2433', '#2d3a50'], sun: { dir: [.3, 1, .4], color: '#ffffff', int: .2, focus: [SX, 0, 0], size: 24, shadow: 0 }, hemi: ['#c9d6ff', '#3a3028', .55], amb: ['#ffffff', .08],
  fog: ['#1a1f2b', .012], env: .6, sunGlow: 0,
  points: [{ pos: [SX - 9, 3.6, -2], color: '#ffe2b8', int: 26, dist: 14, shadow: true }, { pos: [SX + 6, 3.6, 4], color: '#ffe2b8', int: 22, dist: 14 }, { pos: [SX, 2.6, -13], color: '#7fd8ff', int: 16, dist: 10 }, { pos: [SX, 3.2, 12.6], color: '#fff2d8', int: 18, dist: 8 }], ...o });

type Shot = { t0: number; t1: number; name: string; f: (t: number) => Frame4 };
const S: Shot[] = [];
const shot = (name: string, t0: number, t1: number, f: Shot['f']) => S.push({ name, t0, t1, f });
type Cam = { pos: V3; look: V3; fov: number };
/** world position of a rig point (hand) on a camera-facing actor */
function rigWorld(cam: Cam, pos: V3, p: V2, fwd = .06): V3 {
  let fx = cam.pos[0] - pos[0], fz = cam.pos[2] - pos[2]; const l = Math.hypot(fx, fz) || 1; fx /= l; fz /= l;
  return [pos[0] + fz * p[0] * UNIT + fx * fwd, pos[1] - p[1] * UNIT, pos[2] - fx * p[0] * UNIT + fz * fwd];
}
const faceCam = (cam: Cam, at: V3): [number, number, number] => [0, Math.atan2(cam.pos[0] - at[0], cam.pos[2] - at[2]), 0];
const host = (o: Partial<ActorState> & { pose: Pose; face: ActorState['face']; pos: V3; t: number }): ActorState => ({ id: 'host', look: HOST, seed: 3, res: 2048, ...o, face: talk(o.face, mouth()) });

// ---------------------------------------------------------------------------------------------- traffic & crowds
const MODELS = ['Car sedan red', 'Car taxi red', 'Car suv black', 'Car sedan white', 'Car sports yellow', 'Car sedan teal', 'Car suv white', 'Car sports red', 'Car sedan black', 'Car suv teal'];
function lane(t: number, n: number, o: { axis: 'x' | 'z'; c: number; dir: 1 | -1; from: number; to: number; v: number; gap: number; y?: number; stop?: { at: number; red: [number, number] }; seed: number }): PropState[] {
  const out: PropState[] = []; const L = o.to - o.from;
  for (let i = 0; i < n; i++) {
    let s = ((i * o.gap + o.v * t + o.seed * 7) % L + L) % L;               // distance travelled along the lane
    if (o.stop) {                                                             // queue at the stop line while the light is red
      const line = (o.stop.at - o.from) * o.dir; const [r0, r1] = o.stop.red;
      const tq = Math.min(Math.max(t, r0), r1);
      const sAt = ((i * o.gap + o.v * tq + o.seed * 7) % L + L) % L;
      if (t > r0 && t < r1 + 2) {
        const qslot = line - 2 - ((i * 997) % 3) * 0;
        const ahead = Math.floor(Math.max(0, line - sAt) / o.gap);
        const hold = line - 6 - ahead * 6.5;
        if (sAt < line && sAt > line - 60) { const rel = t < r1 ? 1 : Math.max(0, 1 - (t - r1) * .5); s = mix(s, Math.min(sAt + (t - r0) * o.v, hold), rel); }
        void qslot;
      }
    }
    const p = o.from + s * o.dir;
    const pos: V3 = o.axis === 'x' ? [p, o.y ?? .3, o.c] : [o.c, o.y ?? .3, p];
    const yaw = o.axis === 'x' ? (o.dir > 0 ? 0 : Math.PI) : (o.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    out.push({ name: MODELS[(i * 3 + o.seed) % MODELS.length], pos, rot: [0, yaw, 0] });
  }
  return out;
}
const cityTraffic = (t: number, red: [number, number] = [-9, -8]): PropState[] => [
  ...lane(t, 9, { axis: 'x', c: 42.5, dir: 1, from: -200, to: 200, v: 11, gap: 44, stop: { at: -10, red }, seed: 1 }),
  ...lane(t, 9, { axis: 'x', c: 37.5, dir: -1, from: 200, to: -200, v: 10, gap: 44, stop: { at: 10, red }, seed: 2 }),
  ...lane(t, 5, { axis: 'z', c: 3, dir: 1, from: -4, to: 260, v: 9, gap: 52, seed: 3 }), ...lane(t, 5, { axis: 'z', c: -3, dir: -1, from: 260, to: -4, v: 9, gap: 52, seed: 4 }),
  ...lane(t, 10, { axis: 'x', c: -10, dir: 1, from: -250, to: 220, v: 12, gap: 47, seed: 5 }), ...lane(t, 10, { axis: 'x', c: -6, dir: -1, from: 220, to: -250, v: 11, gap: 47, seed: 6 }),
  ...lane(t, 6, { axis: 'x', c: 82.5, dir: 1, from: -200, to: 200, v: 12, gap: 66, seed: 7 }), ...lane(t, 6, { axis: 'x', c: 77.5, dir: -1, from: 200, to: -200, v: 12, gap: 66, seed: 8 }),
  ...lane(t, 10, { axis: 'x', c: 124, dir: 1, from: 210, to: 700, v: 22, gap: 48, y: 12.1, seed: 9 }), ...lane(t, 10, { axis: 'x', c: 116, dir: -1, from: 700, to: 210, v: 21, gap: 48, y: 12.1, seed: 10 }),
];
function crowd(t: number, n: number, z: number, dir: 1 | -1, x0: number, x1: number, seed: number, res = 512): ActorState[] {
  const out: ActorState[] = []; const L = x1 - x0;
  for (let i = 0; i < n; i++) {
    const v = 1.15 + ((i * 37 + seed) % 10) * .04, ph = (i * 11.3 + seed * 3) % L; const s = ((ph + v * t) % L + L) % L;
    const x = dir > 0 ? x0 + s : x1 - s; const zz = z + ((i * 7) % 5 - 2) * .45;
    const d = v * t + i * 2.3;
    out.push({ id: `ped${seed}_${i}`, look: PED[(i + seed) % PED.length], pose: walkPose(d / .4167, dir, { step: .9 }), face: F(['calm', 'happy', 'curious', 'amused'][(i + seed) % 4] as 'calm'), pos: [x, .45, zz], t, seed: 100 + i + seed * 10, res });
  }
  return out;
}

// ============================================================================================== 1. THE HOOK — GTA V case, 2013 (0 – 2.6)
const stageBase = (t: number, o: Partial<Frame4> = {}): Frame4 => ({ t, cam: { pos: [STG, 1.6, 6], look: [STG, 1.4, 0], fov: 40 }, light: STAGE(), cut: null,
  fx: [{ kind: 'motes', box: [[STG - 6, .2, -4], [STG + 6, 5, 6]], n: 120, seed: 1, color: '#bfe8ff', size: .03, t, alpha: .45 }], grade: { bloom: .6, vignette: .5, gain: [1.02, 1, 1.04] }, ...o });
shot('hook', 0, 2.6, (t) => {
  const hp: V3 = [STG, 0, 1.5];
  const cam = camPath(t, 0, 2.6, [{ p: [STG + .9, 1.75, 5.2], l: [STG + .1, 1.5, 1.5], f: 42 }, { p: [STG + .35, 1.62, 3.3], l: [STG + .25, 1.5, 1.6], f: 34 }], x => 1 - (1 - x) ** 2);
  const hand: V2 = [.55, -2.75];
  const p = pose(t, 3, { turn: .15, arms: [[-.5, -2.0], hand], shapeA: 'fist', shapeB: 'hold' });
  const c = rigWorld(cam, hp, hand, .1);
  return stageBase(t, { cam, actors: [host({ pose: p, face: t < 1.2 ? F('confident') : F('smug'), pos: hp, t })],
    cases: [{ id: 'v', pos: [c[0], c[1] + .04, c[2]], rot: [-.05, faceCam(cam, c)[1] + Math.sin(t * 2) * .12, .04], scale: 2.4 }],
    overlay: svg(pop('GTA V', 540, 330, 92, t, .1, { color: '#fff' }) + pop('2013', 540, 1550, 170, t, 1.22, { color: '#ffd34d' })) });
});

// ============================================================================================== 2. CALENDAR FLIPS 2013 → 2026 (2.6 – 4.6)
shot('calendar', 2.6, 4.6, (t) => {
  const hp: V3 = [STG, 0, 1.5]; const shake = k01(t, 4.45, 4.6);
  const cam = camPath(t, 2.6, 4.6, [{ p: [STG + .35, 1.62, 3.3], l: [STG + .25, 1.5, 1.6], f: 34 }, { p: [STG + .1, 1.65, 3.9], l: [STG, 1.5, 1.5], f: 40 }], x => x);
  const hand: V2 = [.55, -2.75];
  const sh = pose(t, 3, { turn: 0, lean: -.1, headLift: .08, arms: [[-.9, -2.7], hand], shapeA: 'open', shapeB: 'hold' });
  const p = P(pose(t, 3, { turn: .1, arms: [[-.5, -2.0], hand], shapeA: 'fist', shapeB: 'hold' }), sh, k01(t, 4.3, 4.6));
  const c = rigWorld(cam, hp, hand, .1);
  const fl = k01(t, 2.7, 4.4); const yr = 2013 + Math.floor(fl * 13.99); const flip = (fl * 13.99) % 1;
  return stageBase(t, { cam: { ...cam, pos: add3(cam.pos, [Math.sin(t * 61) * .02 * shake, Math.sin(t * 47) * .02 * shake, 0]) },
    actors: [host({ pose: p, face: t < 4.3 ? F('curious', 'surprise', k01(t, 3.5, 4.3)) : F('shocked'), pos: hp, t })],
    cases: [{ id: 'v', pos: [c[0], c[1] + .04, c[2]], rot: [-.05, faceCam(cam, c)[1], .04], scale: 2.4 }],
    overlay: svg(`<g transform="translate(540 420) scale(1.5)"><g transform="translate(-540 -420)">${calendar(540, 420, String(yr), yr >= 2026 ? 'STILL WAITING' : 'YEARS GO BY', flip)}</g></g>` + pop('OVER A DECADE?!', 540, 1560, 84, t, 4.55, { color: '#ff5a48' })),
    grade: { bloom: .6, vignette: .5, gain: [1.02, 1, 1.04] } });
});

// ============================================================================================== 3. GTA VI REVEAL → INTO THE WORLD (4.6 – 8.4)
shot('reveal', 4.6, 8.4, (t) => {
  const whip = k01(t, 4.6, 4.95); const dive = inOut(k01(t, 7.85, 8.4));
  const cam0 = camPath(t, 4.95, 7.85, [{ p: [STG + 7 + 2.6, 1.6, 4.6], l: [STG + 7, 1.55, 0], f: 34 }, { p: [STG + 7 + .9, 1.5, 3.1], l: [STG + 7, 1.6, 0], f: 30 }], x => x);
  const cam = { pos: add3(cam0.pos, [-(1 - whip) * 6, 0, 0]), look: add3(cam0.look, [-(1 - whip) * 6, 0, 0]), fov: cam0.fov };
  const casePos: V3 = [STG + 7, 1.62, 0]; const spin = (1 - outBack(k01(t, 4.75, 5.8), 1.4)) * Math.PI * 2 + Math.sin(t * 1.4) * .14;
  const finalCam = dive > 0 ? { pos: [mix(cam.pos[0], casePos[0], dive * .92), mix(cam.pos[1], casePos[1], dive * .92), mix(cam.pos[2], casePos[2] + .1, dive * .97)] as V3, look: casePos, fov: mix(30, 22, dive) } : cam;
  const hp: V3 = [STG + 5.6, 0, 1.2];
  const amaze = pose(t, 3, { turn: .6, lean: -.08, arms: [[-1.0, -3.5], [1.0, -3.5]], shapeA: 'open', shapeB: 'open' });
  return stageBase(t, { cam: finalCam, light: STAGE({ points: [{ pos: [STG + 7, 5, 3], color: '#ff6ad5', int: 70, dist: 14 }, { pos: [STG + 9, 3, 2], color: '#3df2ff', int: 50, dist: 12 }, { pos: [STG + 7, 7, 6], color: '#ffffff', int: 50, dist: 16, shadow: true }] }),
    actors: [host({ pose: P(pose(t, 3, { turn: .6, arms: [[-.4, -1.8], [.5, -1.9]] }), amaze, gesture(t, 5.6, .5) * (1 - k01(t, 7.4, 7.8))), face: F('surprise'), pos: hp, t })],
    cases: [{ id: 'vi', pos: casePos, rot: [0, spin, 0], scale: 4 }],
    fx: [{ kind: 'motes', box: [[STG + 4, .2, -2], [STG + 10, 4, 3]], n: 160, seed: 2, color: '#ffb0e8', size: .03, t, alpha: .6 }],
    overlay: svg(pop('GTA VI', 540, 330, 100, t, 5.2, { color: '#ff7ad9', out: 7.7 }) + pop('NOT JUST ANOTHER GAME', 540, 1560, 62, t, 6.95, { color: '#fff', out: 7.9 })
      + (dive > .55 ? `<rect width="1080" height="1920" fill="#fff" opacity="${k01(dive, .55, 1)}"/>` : '')),
    grade: { bloom: .7, vignette: .45, gain: [1.04, 1, 1.05] } });
});

// ============================================================================================== 4. THE ENORMOUS WORLD — from the rooftop (8.4 – 10.7)
shot('rooftop', 8.4, 10.7, (t) => {
  const Y = 44.6; const hp: V3 = [60, Y, 10.2];
  const cam = camPath(t, 8.4, 10.7, [{ p: [59, Y + 1.9, 5.5], l: [66, Y - 4, 60], f: 46 }, { p: [57.5, Y + 5, 3], l: [75, Y - 12, 110], f: 52 }, { p: [54, Y + 14, -4], l: [90, 8, 150], f: 58 }], inOut);
  const look = gesture(t, 8.9, .5);
  const p = P(pose(t, 3, { back: 1, turn: -.15, arms: [[-.45, -1.8], [.45, -1.8]] }), pose(t, 3, { back: 1, turn: -.3, headTurn: -.4, arms: [[-.4, -1.8], [-1.0, -3.3]], shapeB: 'point' }), look);
  const flash = 1 - k01(t, 8.4, 8.7);
  return { t, cam, light: GOLDEN([55, Y, 0], 70), cut: null, wind: 1.2, props: cityTraffic(t),
    actors: [host({ pose: p, face: F('surprise'), pos: hp, t, res: 1536 })],
    overlay: svg((flash > 0 ? `<rect width="1080" height="1920" fill="#fff" opacity="${flash}"/>` : '') + pop('AN ENORMOUS WORLD', 540, 330, 70, t, 9.0, { color: '#fff' })),
    grade: { bloom: .5, gain: [1.04, 1.0, .96], sat: 1.08 } };
});

// ============================================================================================== 5. AERIAL: VICE CITY STREETS → BEACHES (10.7 – 13.35)
shot('aerial', 10.7, 13.35, (t) => {
  const cam = camPath(t, 10.7, 13.35, [{ p: [80, 60, 30], l: [0, 0, -10], f: 52 }, { p: [10, 34, -2], l: [-60, 0, -20], f: 50 }, { p: [-60, 22, -38], l: [-130, 0, -24], f: 50 }], inOut);
  return { t, cam, light: GOLDEN([-40, 0, -10], 120), cut: null, wind: 1.2, props: [...cityTraffic(t), { name: 'Boat', pos: [-40 + t * 3, 0, -90], rot: [0, 0, 0] }, { name: 'Boat', pos: [60 - t * 2.4, 0, -130], rot: [0, Math.PI, 0] }],
    overlay: svg(pop('VICE CITY STREETS', 540, 330, 66, t, 10.95, { color: '#fff', out: 12.2 }) + pop('MASSIVE BEACHES', 540, 330, 66, t, 12.35, { color: '#ffd34d' })),
    grade: { bloom: .45, gain: [1.04, 1.0, .96], sat: 1.1 } };
});
// ============================================================================================== 6. SWAMPS → HIGHWAYS (13.35 – 14.5)
shot('swamp', 13.35, 13.85, (t) => {
  const cam = camPath(t, 13.35, 13.85, [{ p: [-300, 14, 160], l: [-380, 0, 220], f: 50 }, { p: [-310, 12, 175], l: [-390, 0, 235], f: 50 }], x => x);
  return { t, cam, light: GOLDEN([-360, 0, 200], 120), cut: null, wind: 1, overlay: svg(pop('SWAMPS', 540, 330, 76, t, 13.38, { color: '#9fe39f' })), grade: { gain: [1.0, 1.02, .96], sat: 1.05 } };
});
shot('highway', 13.85, 14.55, (t) => {
  const cam = camPath(t, 13.85, 14.55, [{ p: [300, 30, 150], l: [380, 10, 120], f: 50 }, { p: [330, 26, 148], l: [420, 10, 120], f: 50 }], x => x);
  return { t, cam, light: GOLDEN([400, 10, 120], 120), cut: null, wind: 1, props: cityTraffic(t), overlay: svg(pop('HIGHWAYS', 540, 330, 76, t, 13.88, { color: '#fff' })), grade: { gain: [1.03, 1.0, .97], sat: 1.06 } };
});
// ============================================================================================== 7. BUILDINGS PACKED WITH DETAIL (14.55 – 16.72)
shot('detail', 14.55, 16.72, (t) => {
  const cam = camPath(t, 14.55, 16.72, [{ p: [-48, 9, -16], l: [-36, 7, 5], f: 44 }, { p: [-28, 5.2, -15.5], l: [-22, 5.4, 4], f: 40 }, { p: [-14, 3.4, -14.5], l: [-12, 4.2, 4], f: 38 }], inOut);
  return { t, cam, light: GOLDEN([-25, 0, 0], 40), cut: null, wind: 1.2, props: cityTraffic(t), actors: crowd(t, 8, -2.5, 1, -60, 0, 1, 384),
    overlay: svg(pop('INSANE DETAIL', 540, 1560, 80, t, 15.7, { color: '#ffd34d' })), grade: { bloom: .5, gain: [1.04, 1.0, .96], sat: 1.1 } };
});

// ============================================================================================== 8. STREET LEVEL — crowds, traffic, reactions (16.72 – 22.95)
shot('street', 16.72, 22.95, (t) => {
  const red: [number, number] = [20.45, 24];
  const signal: Frame4['signal'] = t < 20.0 ? 'green' : t < 20.45 ? 'amber' : 'red';
  const cam = t < 19.9 ? camPath(t, 16.72, 19.9, [{ p: [-30, 1.6, 48.6], l: [-14, 1.4, 42], f: 46 }, { p: [-24.5, 1.55, 48.6], l: [-10, 1.4, 42], f: 44 }], x => x)
    : t < 21.7 ? camPath(t, 19.9, 21.7, [{ p: [-15, 1.0, 30], l: [0, 1.3, 40], f: 42 }, { p: [-14, 1.1, 30.5], l: [0, 1.2, 41], f: 40 }], x => x)
      : camPath(t, 21.7, 22.95, [{ p: [-6.5, 1.6, 48.7], l: [-2.5, 1.2, 40], f: 40 }, { p: [-6.2, 1.55, 48.5], l: [-2.5, 1.2, 40], f: 36 }], x => x);
  // host strolls along the shop fronts, examining everything
  const hd = Math.min(t - 16.72, 4.2) * 1.0; const hx = -22 + hd;
  let hp: Pose = hd < 4.2 ? walkPose(hd / .4167, 1, { step: .95 }) : pose(t, 3, { turn: .3, headTurn: .2, arms: [[-.4, -1.8], [.5, -2.0]] });
  hp = { ...hp, headTurn: Math.sin(t * 1.3) * .4 } as Pose;
  const react = gesture(t, 22.1, .3);
  if (react > 0) hp = P(hp, pose(t, 3, { turn: -.3, lean: -.15, headLift: .08, arms: [[-1.0, -2.8], [.9, -2.6]], shapeA: 'open', shapeB: 'open' }), react);
  // pedestrians: sidewalk flows + a group crossing on the zebra while the avenue is red, one startled by a horn
  const crossers: ActorState[] = [0, 1, 2, 3].map(i => { const d = Math.max(0, t - 20.8 - i * .25) * 1.25; const z = 32.6 + d; return { id: 'cross' + i, look: PED[(i + 3) % PED.length], pose: walkPose(d / .4167, 1, { step: .9 }), face: F('calm'), pos: [-2.6 + i * .9, d > 0 && z < 47 ? .3 : .45, Math.min(z, 47.5)] as V3, t, seed: 300 + i, res: 768 }; });
  const startle = gesture(t, 22.13, .35);
  const jumper: ActorState = { id: 'jumper', look: PED[5], pose: P(walkPose(Math.max(0, t - 21.1) * 1.1 / .4167, 1, { step: .9 }), pose(t, 301, { turn: -.4, lean: -.18, headLift: .1, arms: [[-.9, -3.0], [.8, -3.2]], shapeA: 'open', shapeB: 'open' }), startle), face: startle > .2 ? F('shocked') : F('calm'), pos: [-.6, .32 + startle * .25, Math.min(33 + Math.max(0, t - 21.1) * 1.1, 37.4)], t, seed: 305, res: 768 };
  return { t, cam, light: GOLDEN([-8, 0, 44], 40), cut: null, wind: 1.2, signal, props: cityTraffic(t, red),
    actors: [host({ pose: hp, face: react > .2 ? F('surprise') : F('curious', 'happy', k01(t, 18, 19.4)), pos: [hx, .45, 47.2], t, res: 1536 }),
      ...crowd(t, 7, 47.8, -1, -40, 40, 2, 512), ...crowd(t, 6, 32.4, 1, -40, 40, 3, 512), ...(t > 20.6 ? crossers : []), ...(t > 21.0 ? [jumper] : [])],
    fx: [{ kind: 'motes', box: [[-30, .5, 30], [10, 6, 54]], n: 80, seed: 4, color: '#fff3d8', size: .04, t, alpha: .35 }],
    overlay: svg(pop('CROWDS', 540, 330, 70, t, 17.2, { color: '#fff', out: 19.8 }) + pop('PEDESTRIANS', 540, 330, 66, t, 20.0, { color: '#fff', out: 20.75 }) + pop('TRAFFIC', 540, 330, 70, t, 20.8, { color: '#ffd34d', out: 21.6 }) + pop('REACTIONS', 540, 330, 70, t, 22.1, { color: '#ff7ad9' })),
    grade: { bloom: .45, gain: [1.04, 1.0, .96], sat: 1.08 } };
});

// ============================================================================================== 9. "HERE'S SOMETHING MOST PEOPLE DON'T REALIZE" (22.95 – 25.55)
shot('realize', 22.95, 25.55, (t) => {
  const hp: V3 = [-14.5, .45, 47.2];
  const cam = camPath(t, 22.95, 25.55, [{ p: [-13.2, 1.55, 44.0], l: [-14.5, 1.4, 47.2], f: 36 }, { p: [-13.7, 1.5, 45.1], l: [-14.5, 1.42, 47.2], f: 32 }], x => x);
  const lean = inOut(k01(t, 23.4, 23.9));
  const p = P(pose(t, 3, { turn: -.1, arms: [[-.4, -1.8], [.4, -1.8]] }), pose(t, 3, { turn: -.2, lean: .1, headTilt: -.15, arms: [[-.5, -1.9], [.35, -3.55]], shapeB: 'point' }), lean);
  return { t, cam, light: GOLDEN([-14, 0, 44], 30), cut: null, wind: 1.2, signal: 'red', props: cityTraffic(t, [20.45, 40]),
    actors: [host({ pose: p, face: t < 24 ? F('thinking') : F('suspicious', 'smirk', k01(t, 24.3, 24.9)), pos: hp, t }), ...crowd(t, 5, 48.2, -1, -40, 40, 5, 384)],
    overlay: svg(pop('MOST PEOPLE DON’T REALIZE…', 540, 1560, 56, t, 24.0, { color: '#fff' })), grade: { gain: [1.04, 1.0, .96], vignette: .45 } };
});

// ============================================================================================== 10. THE STUDIO: NOT 13 YEARS ON GTA VI (25.55 – 29.79)
const devs = (t: number, monitors = 0): ActorState[] => {
  const out: ActorState[] = [];
  [[0, 1], [2, 0], [3, 1], [1, 2], [4, 2], [2, 3], [5, 1], [0, 3]].forEach(([c, r], i) => {
    const x = SX - 15 + c * 6, z = -9 + r * 5 + .72; const type = gesture(t, 1 + (i * .77) % 3, .3) * 0 + (Math.sin(t * 17 + i) > 0 ? 1 : 0);
    out.push({ id: 'dev' + i, look: DEV[i % DEV.length], pose: pose(t, 400 + i, { back: 1, turn: .1 * (i % 3 - 1), crouch: .9, lean: .12, footA: [-.3, -.02], footB: [.45, -.02], arms: [[-.32, -2.55 + type * .04], [.32, -2.55 + (1 - type) * .04]] }),
      face: F('focused'), pos: [x, 0, z], t, seed: 400 + i, res: 512, tint: [1, .98, .96] });
  });
  void monitors; return out;
};
shot('studio', 25.55, 29.79, (t) => {
  const whip = 1 - k01(t, 25.55, 25.85);
  const cam = camPath(t, 25.55, 29.79, [{ p: [SX + 16, 2.6, 12], l: [SX - 6, 1.4, -4], f: 50 }, { p: [SX + 6, 2.2, 10], l: [SX - 14, 2.2, 0], f: 48 }, { p: [SX - 10, 2.3, 6], l: [SX - 20, 2.4, 0], f: 48 }], inOut);
  return { t, cam: { ...cam, look: add3(cam.look, [whip * 8, 0, 0]) }, light: OFFICE(), cut: null, actors: devs(t), timeline: k01(t, 28.1, 29.6) * 2.1, monitors: .1,
    wall: { mode: 'dev', k: .2, t }, fx: [{ kind: 'motes', box: [[SX - 18, .3, -12], [SX + 18, 4, 12]], n: 120, seed: 6, color: '#fff2d8', size: .02, t, alpha: .35 }],
    overlay: svg(chip('ROCKSTAR WASN’T ONLY MAKING GTA VI', 540, 1560, 36, t, 26.3, 99, 'middle') + pop('13 YEARS?', 540, 330, 86, t, 28.55, { color: '#ffd34d' })),
    grade: { bloom: .45, vignette: .45, gain: [1.0, 1.0, 1.03] } };
});

// ============================================================================================== 11. RED DEAD REDEMPTION 2 — 2018 (29.79 – 35.5)
shot('rdr2', 29.79, 35.5, (t) => {
  const walkK = k01(t, 29.8, 32.2); const hx = mix(SX - 6, SX - 1.6, walkK);
  const cam = camPath(t, 29.79, 35.5, [{ p: [SX - 6.5, 1.7, 6.5], l: [SX - 3, 1.4, 13], f: 46 }, { p: [SX - 2.4, 1.6, 9.2], l: [SX + .2, 1.45, 13.3], f: 40 }, { p: [SX + .6, 1.45, 11.1], l: [SX, 1.4, 13.3], f: 34 }], inOut);
  const point = gesture(t, 32.4, .4) * (1 - k01(t, 33.9, 34.3));
  let p: Pose = walkK < 1 ? walkPose(walkK * 4.4 / .4167, 1, { step: .95 }) : pose(t, 3, { turn: .5, headTurn: .3, arms: [[-.4, -1.8], [.5, -1.9]] });
  if (point > 0) p = P(p, pose(t, 3, { turn: .5, headTurn: .4, arms: [[-.4, -1.8], [1.05, -3.0]], shapeB: 'point' }), point);
  const spin = Math.sin((t - 31) * .9) * .5;
  return { t, cam, light: OFFICE({ points: [{ pos: [SX, 3.1, 12.4], color: '#ffd9a8', int: 30, dist: 6, shadow: true }, { pos: [SX - 9, 3.6, -2], color: '#ffe2b8', int: 20, dist: 14 }, { pos: [SX, 2.6, -13], color: '#7fd8ff', int: 12, dist: 10 }] }), cut: null,
    actors: [host({ pose: p, face: point > .2 ? F('happy') : F('curious'), pos: [hx, 0, 11.6], t }), ...devs(t).slice(4)],
    cases: [{ id: 'v', pos: [SX - 2.6, 1.36, 13.3], rot: [0, Math.PI + .25, 0], scale: 1.6 }, { id: 'rdr', pos: [SX, 1.36 + k01(t, 32.3, 32.8) * .12, 13.3], rot: [0, Math.PI + spin, 0], scale: 1.6 }], timeline: 1 + k01(t, 34.5, 35.3),
    overlay: svg(pop('RED DEAD REDEMPTION 2', 540, 330, 58, t, 32.45, { color: '#ff5a48' }) + pop('2018', 540, 1560, 150, t, 34.65, { color: '#fff' })), grade: { bloom: .5, vignette: .45, gain: [1.03, 1.0, 1.0] } };
});

// ============================================================================================== 12. GTA ONLINE KEPT GETTING UPDATES (35.5 – 38.1)
shot('online', 35.5, 38.1, (t) => {
  const cam = camPath(t, 35.5, 38.1, [{ p: [SX + 1, 1.5, 1.5], l: [SX, 2.6, -14], f: 54 }, { p: [SX + .5, 1.8, -1.5], l: [SX, 2.7, -14], f: 54 }], x => x);
  const p = pose(t, 3, { back: 1, turn: .15, headLift: .12, arms: [[-.6, -2.6], [.55, -2.3]], shapeA: 'open' });
  return { t, cam, light: OFFICE(), cut: null, actors: [host({ pose: p, face: F('happy'), pos: [SX - 1.4, 0, -6.5], t, res: 1024 }), ...devs(t).slice(0, 3)], wall: { mode: 'updates', k: k01(t, 35.6, 37.8), t },
    overlay: svg(pop('ONLINE KEPT GETTING UPDATES', 540, 1560, 52, t, 36.1, { color: '#3df2ff' })), grade: { bloom: .55, vignette: .45 } };
});

// ============================================================================================== 13. A MASSIVE TECHNICAL CHALLENGE — montage (38.1 – 46.0)
shot('challenge', 38.1, 41.1, (t) => {
  const c0 = SX - 9, z0 = -4 + .72;
  const cam = camPath(t, 38.1, 41.1, [{ p: [c0 + 1.4, 1.35, z0 + .6], l: [c0, 1.15, z0 - 1], f: 40 }, { p: [c0 + .5, 1.3, z0 + .25], l: [c0, 1.13, z0 - 1], f: 34 }], x => x);
  return { t, cam, light: OFFICE(), cut: null, actors: devs(t), monitors: k01(t, 38.5, 40.6) * .45, wall: { mode: 'dev', k: .3, t },
    overlay: svg(pop('A MASSIVE TECHNICAL CHALLENGE', 540, 330, 54, t, 39.5, { color: '#fff' })), grade: { bloom: .5, vignette: .5 } };
});
shot('build-world', 41.1, 43.95, (t) => {
  const cam = camPath(t, 41.1, 43.95, [{ p: [-34, 10, 46], l: [-4, 2, 40], f: 48 }, { p: [-26, 8, 45.5], l: [2, 2, 40], f: 46 }], x => x);
  const clay = t < 41.6 ? 1 : 0; const lit = t < 42.9 ? 0 : 1;
  const flash = Math.max(1 - k01(t, 41.6, 41.85), 1 - k01(t, 42.9, 43.15)) * (t > 41.6 ? 1 : 0);
  return { t, cam, light: lit ? GOLDEN([-8, 0, 44], 60) : FLAT([-8, 0, 44]), clay, cut: null, wind: 1, props: cityTraffic(t), actors: crowd(t, 6, 47.8, -1, -40, 40, 7, 384),
    overlay: svg(pop(clay ? 'BLOCKOUT' : lit ? 'ADVANCED GRAPHICS' : 'DETAILED ENVIRONMENTS', 540, 330, 60, t, clay ? 41.1 : lit ? 42.9 : 41.6, { color: lit ? '#ffd34d' : '#fff' }) + (flash > 0 ? `<rect width="1080" height="1920" fill="#fff" opacity="${flash * .8}"/>` : '')),
    grade: { bloom: lit ? .5 : .1, gain: [1.03, 1.0, .98] } };
});
shot('test-polish', 43.95, 46.0, (t) => {
  const c0 = SX + 3, z0 = -4 + .72;
  const cam = t < 44.85 ? camPath(t, 43.95, 44.85, [{ p: [SX, 6, 9], l: [SX - 3, 0, -4], f: 54 }, { p: [SX + 1, 5.2, 7], l: [SX - 2, 0, -4], f: 52 }], x => x)
    : camPath(t, 44.85, 46.0, [{ p: [c0 + 1.3, 1.35, z0 + .55], l: [c0 + .43, 1.13, z0 - 1], f: 34 }, { p: [c0 + .9, 1.3, z0 + .35], l: [c0 + .43, 1.13, z0 - 1], f: 30 }], x => x);
  const host1: ActorState[] = t < 44.85 ? [host({ pose: pose(t, 3, { turn: .3, arms: [[-.5, -2.4], [.6, -2.4]], shapeA: 'open', shapeB: 'open' }), face: F('surprise'), pos: [SX - 2, 0, 1.5], t, res: 1024 })] : [];
  return { t, cam, light: OFFICE(), cut: null, actors: [...devs(t), ...host1], monitors: t < 45.42 ? .4 : .8, wall: { mode: 'dev', k: k01(t, 43.95, 45.6), t },
    overlay: svg(pop('AN ENORMOUS WORLD TO TEST', 540, 330, 52, t, 43.98, { color: '#fff', out: 45.3 }) + pop('…AND POLISH', 540, 330, 66, t, 45.45, { color: '#4fd36a' })), grade: { bloom: .5, vignette: .45 } };
});

// ============================================================================================== 14. DELAYED → NOVEMBER 19, 2026 (46.0 – 53.3)
shot('delay', 46.0, 53.3, (t) => {
  const cam = camPath(t, 46.0, 53.3, [{ p: [SX + 3, 1.5, 2.5], l: [SX, 2.6, -14], f: 56 }, { p: [SX + 1.5, 1.6, 0], l: [SX, 2.7, -14], f: 54 }, { p: [SX + 4.5, 1.4, -7.5], l: [SX + 1, 1.3, -10], f: 40 }], x => inOut(x));
  const shock = gesture(t, 47.2, .3) * (1 - k01(t, 48.4, 48.8));
  let p = pose(t, 3, { turn: .35, headTurn: -.3, headLift: .1, arms: [[-.4, -1.8], [.45, -1.8]] });
  if (shock > 0) p = P(p, pose(t, 3, { turn: .2, lean: -.15, headLift: .1, arms: [[-1.0, -3.3], [1.0, -3.3]], shapeA: 'open', shapeB: 'open' }), shock);
  p = P(p, pose(t, 3, { turn: .5, arms: [[-.4, -1.8], [.9, -3.1]], shapeB: 'point' }), gesture(t, 49.7, .4) * (1 - k01(t, 51.2, 51.6)));
  const polish = k01(t, 51.5, 53.2);
  const spark = polish > 0 ? [0, 1, 2, 3, 4].map(i => { const a = (t * 2 + i * 1.3) % 1; return `<g transform="translate(${400 + i * 70} ${1250 - a * 120}) scale(${1 - a})"><path d="M0 -26 L6 -6 L26 0 L6 6 L0 26 L-6 6 L-26 0 L-6 -6Z" fill="#fff6c4" opacity="${1 - a}"/></g>`; }).join('') : '';
  return { t, cam, light: OFFICE(), cut: null, actors: [host({ pose: p, face: shock > .2 ? F('shocked') : t > 49.6 ? F('happy', 'relief', k01(t, 50.5, 51.2)) : F('curious'), pos: [SX + 1.2, 0, -6.2], t, res: 1536 }), ...devs(t).slice(0, 4)],
    wall: { mode: 'delay', k: k01(t, 46.3, 50.9), t }, monitors: .8,
    overlay: svg(pop('DELAYED', 540, 330, 100, t, 47.2, { color: '#ff5a48', out: 49.5 }) + pop('NOVEMBER 19, 2026', 540, 330, 74, t, 49.7, { color: '#4fd36a' }) + pop('MORE TIME TO POLISH', 540, 1560, 56, t, 51.6, { color: '#fff' }) + spark),
    grade: { bloom: .55, vignette: .45 } };
});

// ============================================================================================== 15. THE SURPRISING ENDING (53.3 – 61.1)
shot('finale', 53.3, DURATION, (t) => {
  const cam = camPath(t, 53.3, 60.1, [{ p: [STG, 2.4, 11.5], l: [STG, 1.9, 0], f: 40 }, { p: [STG, 2.25, 11], l: [STG, 1.92, 0], f: 40 }, { p: [STG, 2.2, 10.6], l: [STG, 1.95, 0], f: 40 }], x => x);
  const zoom = inOut(k01(t, 60.1, 61.05));
  const cam2 = zoom > 0 ? { pos: [mix(cam.pos[0], STG + 1.7, zoom), mix(cam.pos[1], 2.35, zoom), mix(cam.pos[2], 3.2, zoom)] as V3, look: [mix(cam.look[0], STG + 1.7, zoom), mix(cam.look[1], 2.35, zoom), 0] as V3, fov: mix(40, 32, zoom) } : cam;
  const point = gesture(t, 57.9, .4);
  const hp: V3 = [STG + .75, 0, 5.4];
  const p = P(pose(t, 3, { turn: .5, arms: [[-.4, -1.8], [.4, -1.8]] }), pose(t, 3, { turn: .55, headLift: .12, arms: [[-1.05, -3.6], [.4, -1.8]], shapeA: 'point' }), point);
  const cases: { id: CaseId; pos: V3; rot: V3; scale: number }[] = (['v', 'rdr', 'vi'] as CaseId[]).map((id, i) => ({ id, pos: [STG + (i - 1) * 1.7, 2.35 + Math.sin(t * 1.2 + i) * .04, 0] as V3, rot: [0, Math.sin(t * .6 + i) * .25, 0] as V3, scale: 6.5 }));
  const proj = (q: V3): V2 => {   // pinhole projection for a camera looking down -z with pitch only
    const pit = Math.atan2(cam.look[1] - cam.pos[1], cam.pos[2] - cam.look[2]); const dx = q[0] - cam.pos[0], dy = q[1] - cam.pos[1], dz = cam.pos[2] - q[2];
    const y = dy * Math.cos(pit) - dz * Math.sin(pit), z = dz * Math.cos(pit) + dy * Math.sin(pit); const f = 960 / Math.tan(cam.fov * Math.PI / 360);
    return [540 + dx / z * f, 960 - y / z * f]; };
  const ly = proj([STG, 2.35 - .72, 0])[1] + 50, off = proj([STG + 1.7, 2.35, 0])[0] - 540;
  const lbl = (s: string, x: number, t0: number, col: string) => zoom > 0 ? '' : pop(s, x, ly, 44, t, t0, { color: col });
  return stageBase(t, { cam: cam2, light: STAGE({ points: [{ pos: [STG - 2.4, 4, 3], color: '#ffb347', int: 35, dist: 9 }, { pos: [STG, 4, 3], color: '#ff5a48', int: 35, dist: 9 }, { pos: [STG + 2.4, 4, 3], color: '#ff6ad5', int: 40, dist: 9 }, { pos: [STG - 2, 6, 9], color: '#ffffff', int: 70, dist: 20, shadow: true }] }),
    cases, actors: [host({ pose: p, face: t < 55 ? F('smug') : point > .2 ? F('confident') : F('happy'), pos: hp, t, res: 1536 })],
    overlay: svg(lbl('2013', 540 - off, 53.6, '#ffb347') + lbl('2018', 540, 53.8, '#ff5a48') + lbl('2026', 540 + off, 54.0, '#ff7ad9')
      + pop('13 YEARS BETWEEN GAMES', 540, 300, 64, t, 55.1, { color: '#fff' }) + pop('NOT 13 YEARS OF', 420, 1330, 60, t, 57.25, { color: '#ffd34d' }) + pop('FULL DEVELOPMENT', 420, 1410, 60, t, 59.2, { color: '#ffd34d' })),
    grade: { bloom: .65, vignette: .5, gain: [1.03, 1.0, 1.04] } });
});

export const SHOTS = S;
export function frameAt(frame: number): Frame4 {
  const t = Math.min(frame, FRAMES - 1) / FPS; AUDIO_T = t;
  const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
void drift;
