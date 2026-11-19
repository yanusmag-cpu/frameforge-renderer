// Film 2 — "The Man Who Fell From the Stratosphere" (Felix Baumgartner, 14 Oct 2012). 60 s.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState } from '../core.ts';
import type { SFrame } from './engine.ts';

export const FPS = 30, FRAMES = 1800;
export const NARR = [0.2, 4.65, 8.5, 13.3, 19.1, 22.3, 25.6, 27.3, 33.2, 36.3, 38.95, 41.3, 46.3, 49.4, 55.0];
const T_JUMP = 26.0, T_CHUTE = 44.6, T_LAND = 47.9;
const FELIX: Look = { outfit: 'jumpsuit', color: '#eceae3', pants: '#e2dfd6', shoe: '#2a2a2a', hat: 'pressure', glasses: false, radio: true };
const SUN: V3 = [.55, .32, -.55];
const pose = (p: Partial<Pose>, t = 0, amt = 1): Pose => ({ ...STAND, ...idle(t, 5, amt), ...p });
const felix = (pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id: 'felix', look: FELIX, pose: p, face, pos, t, res: 1024, ...o });
const LIGHT = (focus: V3, size = 8, i = 3.4) => ({ sun: { dir: SUN, color: '#fff6ea', i, focus, size }, hemi: { sky: '#6f8fc0', ground: '#7a6a58', i: .55 }, fill: { color: '#cfe0ff', i: .35 } });

// mission data (14 Oct 2012): real elapsed freefall seconds tau from film time
const tau = (t: number) => t < T_JUMP ? 0 : t < 32.5 ? (t - T_JUMP) / 6.5 * 34 : t < 34.5 ? 34 + (t - 32.5) * 8 : t < T_CHUTE ? 50 + (t - 34.5) / (T_CHUTE - 34.5) * 209 : 259;
const speed = (s: number) => s < 50 ? (s < 34 ? s / 34 * 1085 : 1085 + (s - 34) / 16 * 272.6) : Math.max(175, 1357.6 * Math.exp(-(s - 50) / 75) + 160 * (1 - Math.exp(-(s - 50) / 75)));
const altM = (s: number) => s <= 0 ? 38969 : s < 50 ? 38969 - 4.9 * .82 * s * s : Math.max(2500, 28900 - (s - 50) * 126);
function hud(t: number, alt: number, sp?: number) {
  const mach = sp ? sp / 1086 : 0; const warn = t > 33.3 && t < 38.9 && Math.floor(t * 4) % 2 === 0;
  return `<div style="position:absolute;left:60px;top:250px;font-family:Inter;color:#e8f6ff;font-weight:700;font-size:30px;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,.7)">
    <div style="font-size:22px;color:#8fd0ff">ALTITUDE</div><div style="font-weight:900;font-size:56px">${Math.round(alt).toLocaleString('en-US')} m</div>
    ${sp !== undefined ? `<div style="font-size:22px;color:#8fd0ff;margin-top:10px">SPEED</div><div style="font-weight:900;font-size:56px">${Math.round(sp).toLocaleString('en-US')} km/h</div><div style="font-weight:900;font-size:40px;color:${mach >= 1 ? '#ffd23f' : '#e8f6ff'}">MACH ${mach.toFixed(2)}</div>` : ''}
    ${warn ? '<div style="margin-top:14px;display:inline-block;background:#d8262b;color:#fff;padding:6px 16px;border-radius:6px;font-weight:900">⟳ FLAT SPIN</div>' : ''}</div>`;
}
const card = (a: string, b: string, t: number, t0: number, t1: number, top = 300) => { const k = ss(t0, t0 + .4, t) * (1 - ss(t1 - .4, t1, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:50%;top:${top}px;transform:translate(-50%,0) scale(${.9 + .1 * k});opacity:${k};font-family:Inter;text-align:center;background:rgba(6,10,20,.62);border-left:8px solid #d8262b;padding:18px 34px;border-radius:8px">
  <div style="font-weight:900;font-size:50px;letter-spacing:3px;color:#fff">${a}</div>${b ? `<div style="font-weight:700;font-size:30px;letter-spacing:3px;color:#ffd23f;margin-top:4px">${b}</div>` : ''}</div>`; };

type S = { a: number; b: number; f: (t: number) => SFrame };
const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => SFrame) => SH.push({ a, b, f });
const CAP: V3 = [0, 0, 0]; const STEP: V3 = [0, .6, 1.6];

// 0 — hook: a tiny figure on a ledge, 39 km above Earth
shot(0, 4.6, t => { const k = kk(t, 0, 4.6);
  const cam: Cam = { pos: [lerp(14, 8, k), lerp(-3, -1, k), lerp(16, 10, k)], look: [0, -.2, 1.4], fov: 40, roll: .05 };
  return { t, alt: 38.97, cam, ...LIGHT([0, 0, 0]), capsule: { pos: CAP, door: 1 }, balloon: { pos: [0, 40, 0], s: 120, k: 1 },
    actors: [felix(STEP, pose({ turn: .5, handA: [-.55, -1.75], handB: [.6, -1.8] }, t, .3), EXPR.focused, t)],
    grade: { fade: clamp(1 - t / .35) * .6 }, overlay: title(t) }; });
function title(t: number) { const k = ss(.9, 1.5, t) * (1 - ss(4.1, 4.6, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:0;width:1080px;top:320px;text-align:center;opacity:${k};font-family:Inter;font-weight:900;color:#fff;font-size:72px;line-height:1.05;-webkit-text-stroke:5px #111;paint-order:stroke fill;text-shadow:0 8px 24px rgba(0,0,0,.6)">THE MAN WHO JUMPED<br>FROM THE <span style="color:#ffd23f">STRATOSPHERE</span></div>`; }
// 1 — launch at dawn, Roswell
shot(4.6, 8.5, t => { const k = kk(t, 4.6, 8.5); const lift = ss(5.4, 8.5, t) * 22;
  const cam: Cam = { pos: [lerp(-30, -24, k), 1.7, lerp(60, 52, k)], look: [0, 22 + lift * .6, 0], fov: 46 };
  return { t, alt: 1.1, cam, ground: true, sunDir: [.8, .12, -.3], sun: { dir: [.8, .12, -.3], color: '#ffc58f', i: 3, focus: [0, 0, 0], size: 60 }, hemi: { sky: '#8aa5d0', ground: '#8a6f55', i: .9 },
    balloon: { pos: [0, 12 + lift, 0], s: 60, k: 0 }, capsule: { pos: [0, lift, 0], door: 0 }, overlay: card('14 OCTOBER 2012', 'ROSWELL, NEW MEXICO', t, 4.8, 8.5) }; });
// 2 — the capsule beneath a giant helium balloon, climbing through cloud
shot(8.5, 13.3, t => { const k = kk(t, 8.5, 13.3); const S: Sprite[] = []; const R = rng(3);
  for (let i = 0; i < 40; i++) { const y = ((R() * 120 - (t - 8.5) * 18) % 120 + 120) % 120 - 70; S.push({ p: [(R() - .5) * 60, y, (R() - .5) * 60 - 10], s: 12 + R() * 14, rot: R() * 6, c: [1, 1, 1], a: .6, kind: 0, seed: R(), age: .2 }); }
  const cam: Cam = { pos: [lerp(9, 7, k), lerp(-2.5, -1.5, k), lerp(9, 7, k)], look: [0, 3 + k * 6, 0], fov: 44 };
  return { t, alt: lerp(6, 14, k), cam, ...LIGHT([0, 0, 0], 10), capsule: { pos: CAP, door: 0 }, balloon: { pos: [0, 30, 0], s: 95, k: .55 }, sprites: S, overlay: hud(t, lerp(6000, 14000, k)) }; });
// 3 — over two hours of climbing: tiny capsule, darkening sky
shot(13.3, 19.1, t => { const k = kk(t, 13.3, 19.1); const alt = lerp(14, 36, k);
  const cam: Cam = { pos: [lerp(-140, -90, k), lerp(-60, -30, k), lerp(160, 120, k)], look: [0, 40, 0], fov: 42 };
  return { t, alt, cam, ...LIGHT([0, 0, 0], 60), capsule: { pos: CAP, door: 0 }, balloon: { pos: [0, 40, 0], s: lerp(100, 120, k), k: lerp(.6, 1, k) }, overlay: hud(t, alt * 1000) + card('OVER 2 HOURS', 'OF CLIMBING', t, 13.6, 18.8, 1320) }; });
// 4 — the sky turns black; the horizon curves
shot(19.1, 22.3, t => { const k = kk(t, 19.1, 22.3);
  const cam: Cam = { pos: [lerp(3, 2.4, k), 1.4, lerp(5.5, 5.0, k)], look: [lerp(-30, -50, k), -12, 60], fov: 50 };
  return { t, alt: 38.97, cam, ...LIGHT([0, 0, 0]), capsule: { pos: CAP, door: 0 }, balloon: { pos: [0, 40, 0], s: 120, k: 1 }, overlay: hud(t, 38969) }; });
// 5 — he opens the door and steps onto the ledge (camera behind: the drop below)
shot(22.3, 25.6, t => { const k = kk(t, 22.3, 25.6); const door = ss(22.4, 23.3, t); const step = ss(23.4, 24.6, t);
  const pos: V3 = [0, .6, lerp(.9, 1.6, step)]; const p = step < 1 && step > 0 ? { ...walkPose((t - 23.4) * 1.0, 1), back: 1, turn: 0 } as Pose : pose({ back: 1, handA: [-.62, -1.95], handB: [.62, -1.95], shapeA: 'hold', shapeB: 'hold' }, t, .2);
  const cam: Cam = { pos: [lerp(6.8, 5.6, k), lerp(2.6, 2.2, k), lerp(6.4, 5.4, k)], look: [0, .9, 1.3], fov: 40 };
  return { t, alt: 38.97, cam, ...LIGHT([0, 0, 0], 6), capsule: { pos: CAP, door }, actors: [felix(pos, p, EXPR.focused, t)], overlay: hud(t, 38969) }; });
// 6 — he lets go
shot(25.6, 27.3, t => { const fall = Math.max(0, t - T_JUMP); const lean = ss(25.7, T_JUMP, t);
  const y = .6 - 4.9 * fall * fall; const pos: V3 = [0, y, 1.6 + fall * 1.2];
  const p: Pose = fall > 0 ? pose({ lean: .3 + fall, handA: [-1.1, -2.4], handB: [1.1, -2.4], shapeA: 'open', shapeB: 'open', footA: [-.35, -.3], footB: [.35, -.3] }, t, 0) : pose({ back: 1, lean: .35 * lean, crouch: .15 * lean, handA: [-.7, -1.9], handB: [.7, -1.9] }, t, .1);
  const cam: Cam = { pos: [4.6, 3.0, 5.6], look: [0, lerp(.6, -5, ss(26.0, 27.3, t)), lerp(1.8, 2.8, ss(26.0, 27.3, t))], fov: 46 };
  return { t, alt: 38.97, cam, ...LIGHT([0, 0, 0], 8), capsule: { pos: CAP, door: 1 }, actors: [felix(pos, p, EXPR.determined, t, { roll: fall > 0 ? -Math.PI / 2 * ss(T_JUMP, 26.6, t) : 0, lean: 0 })], overlay: hud(t, altM(tau(t))) }; });
// 7 — freefall in near-vacuum: falling faster and faster; Mach 1
function streaks(t: number, n: number, v: number, S: Sprite[], seed: number, a = .5) { const R = rng(seed); for (let i = 0; i < n; i++) { const y = ((R() * 40 + t * v) % 40) - 20; S.push({ p: [(R() - .5) * 14, y, (R() - .5) * 14], s: .05, rot: 0, c: [1, 1, 1], a, kind: 2, seed: 0, age: 0 }); } }
/** feet position so that a cut-out rolled by r stays centred on c (camera right = +x, up = +y) */
const centred = (c: V3, r: number): V3 => [c[0] + .9 * Math.sin(r), c[1] - .9 * Math.cos(r), c[2]];
const skydive = (t: number, arms = 1): Pose => pose({ lean: 0, handA: [-.95, -2.35 + Math.sin(t * 7) * .04 * arms], handB: [.95, -2.35 + Math.cos(t * 6) * .04 * arms], shapeA: 'open', shapeB: 'open', footA: [-.4, -.2], footB: [.4, -.2], kneeUp: true }, t, .1);
shot(27.3, 33.2, t => { const k = kk(t, 27.3, 33.2); const S: Sprite[] = []; streaks(t, 60, 2 + k * 30, S, 7, .35 + k * .35);
  const sp = speed(tau(t)); const machHit = ss(32.35, 32.5, t) * (1 - ss(32.6, 33.2, t));
  for (let i = 0; i < 24 && machHit > 0; i++) { const a = i / 24 * 6.28; S.push({ p: [Math.cos(a) * 1.3, .4, Math.sin(a) * 1.3], s: .6, rot: 0, c: [.8, .9, 1.2], a: machHit * .6, kind: 4, seed: 0, age: 0 }); }
  const cam: Cam = { pos: [0, lerp(.9, .6, k), lerp(4.2, 3.4, k)], look: [0, -.2, 0], fov: 44 };
  return { t, alt: altM(tau(t)) / 1000, cam, ...LIGHT([0, 0, 0], 4), actors: [felix(centred([0, 0, 0], -1.35), skydive(t), expr('focused', 'determined', k), t, { lean: 0, roll: -1.35 })], sprites: S, overlay: hud(t, altM(tau(t)), sp),
    grade: { whip: .08 + k * .14, whipDir: [0, 1], flash: machHit * .25 }, shake: .01 + k * .02 }; });
// 8 — the flat spin
shot(33.2, 38.95, t => { const k = kk(t, 33.2, 38.95); const S: Sprite[] = []; streaks(t, 60, 30, S, 9, .6); const spin = Math.pow(ss(33.3, 36.3, t), 1.4) * 7 * (1 - ss(38.3, 38.95, t));
  const ang = (t - 33.2) * (1.2 + spin); const cam: Cam = { pos: [0, .7, 3.6], look: [0, -.2, 0], fov: 46, roll: Math.sin(ang * .7) * .25 };
  return { t, alt: altM(tau(t)) / 1000, cam, ...LIGHT([0, 0, 0], 4), actors: [felix([0, 0, 0], pose({ lean: 0, handA: [-.7 + Math.sin(t * 9) * .2, -2.0], handB: [.9, -1.7 + Math.cos(t * 8) * .2], shapeA: 'open', shapeB: 'open', footA: [-.5, -.3], footB: [.2, -.1], kneeUp: true }, t, 0), expr('fear', 'terror', ss(35.5, 37, t)), t, { lean: 0, roll: -1.35 + ang, pos: centred([0, 0, 0], -1.35 + ang) })],
    sprites: S, overlay: hud(t, altM(tau(t)), speed(tau(t))), grade: { whip: .1 + spin * .015, whipDir: [Math.cos(ang), Math.sin(ang)], vignette: .45 + k * .2 }, shake: .03 }; });
// 9 — he fights it and stabilises
shot(38.95, 41.3, t => { const k = kk(t, 38.95, 41.3); const S: Sprite[] = []; streaks(t, 50, 18, S, 11, .4);
  const cam: Cam = { pos: [0, .8, lerp(3.6, 4.2, k)], look: [0, -.2, 0], fov: 44 };
  return { t, alt: altM(tau(t)) / 1000, cam, ...LIGHT([0, 0, 0], 4), actors: [felix([0, 0, 0], skydive(t), expr('determined', 'relief', ss(40, 41, t)), t, { lean: 0, roll: -1.35 + (1 - ss(38.95, 39.6, t)) * .6, pos: centred([0, 0, 0], -1.35 + (1 - ss(38.95, 39.6, t)) * .6) })], sprites: S, overlay: hud(t, altM(tau(t)), speed(tau(t))), grade: { whip: .15 * (1 - k) } }; });
// 10 — lower, thicker air; clouds; the parachute opens
shot(41.3, 46.3, t => { const S: Sprite[] = []; const R = rng(13); const open = ss(T_CHUTE, T_CHUTE + .7, t);
  for (let i = 0; i < 30; i++) { const y = ((R() * 200 + (t - 41.3) * (40 - open * 34)) % 200) - 150; S.push({ p: [(R() - .5) * 120, y, (R() - .5) * 120], s: 18 + R() * 20, rot: R() * 6, c: [1, 1, 1], a: .5, kind: 0, seed: R(), age: .2 }); }
  const cam: Cam = open > 0 ? { pos: [6, -7 + open * 1, 7], look: [0, 3 * open, 0], fov: 50 } : { pos: [0, .8, 4.0], look: [0, -.2, 0], fov: 44 };
  const p = open > 0 ? pose({ handA: [-.55, -2.6], handB: [.55, -2.6], shapeA: 'hold', shapeB: 'hold', footA: [-.15, -.05], footB: [.15, -.05] }, t, .2) : skydive(t);
  return { t, alt: altM(tau(t)) / 1000, cam, ...LIGHT([0, 0, 0], 12), chute: open > 0 ? { pos: [0, 0, 0], k: open } : undefined, sprites: S,
    actors: [felix([0, 0, 0], p, open > 0 ? expr('relief', 'happy', ss(45.5, 46.2, t)) : EXPR.focused, t, { lean: 0, roll: open > 0 ? 0 : -1.35, pos: open > 0 ? [0, 0, 0] : centred([0, 0, 0], -1.35) })], overlay: hud(t, altM(tau(t)), open > 0 ? lerp(speed(259), 18, open) : speed(tau(t))) + card('4 MIN 19 S', 'OF FREEFALL', t, 44.8, 46.3, 1320), shake: open * (1 - ss(45.2, 46, t)) * .08 }; });
// 11 — touchdown in the desert: on his feet, then down on his knees, fists up
shot(46.3, 49.4, t => { const k = kk(t, 46.3, 49.4); const h = Math.max(0, (T_LAND - t) * 4.5); const runK = ss(T_LAND, T_LAND + .6, t); const kneel = ss(48.6, 49.1, t);
  const pos: V3 = [runK * 1.6, h, 0]; let p: Pose = pose({ handA: [-.55, -2.6], handB: [.55, -2.6], shapeA: 'hold', shapeB: 'hold' }, t, .2);
  if (t > T_LAND) p = kneel > 0 ? { ...STAND, crouch: .95 * kneel, kneeUp: false, footA: [-.4, -.08], footB: [.35, -.08], handA: [-.55, -2.5 * kneel - .8 * (1 - kneel)], handB: [.55, -2.5 * kneel - .8 * (1 - kneel)], shapeA: 'fist', shapeB: 'fist' } : walkPose((t - T_LAND) * 2.4, 1);
  const cam: Cam = { pos: [lerp(-9, -6, k), lerp(2.5, 1.4, k), lerp(9, 6, k)], look: [1, .8 + h * .7, 0], fov: 44 };
  return { t, alt: 1.1, cam, ground: true, sunDir: [.6, .45, -.4], sun: { dir: [.6, .45, -.4], color: '#fff2dc', i: 3.4, focus: [0, 0, 0], size: 14 }, hemi: { sky: '#8fb2e0', ground: '#9a7e5e', i: .9 },
    chute: { pos: [pos[0] - runK * 1.2, pos[1], pos[2]], k: 1 - ss(T_LAND + .1, 48.6, t) * .75, lie: ss(T_LAND + .1, 48.8, t) * 1.3 }, actors: [felix(pos, p, kneel > .5 ? EXPR.excited : EXPR.focused, t)] }; });
// 12 — the record: stats
shot(49.4, 55.0, t => { const k = kk(t, 49.4, 55.0); const cam: Cam = { pos: [Math.cos(.6 + k * .9) * 6, lerp(1.2, 1.8, k), Math.sin(.6 + k * .9) * 6 + .2], look: [1.6, 1.1, 0], fov: 40 };
  const p: Pose = { ...STAND, crouch: .95, footA: [-.4, -.08], footB: [.35, -.08], handA: [-.55, -2.5 + Math.sin(t * 3) * .05], handB: [.55, -2.5], shapeA: 'fist', shapeB: 'fist' };
  const stat = (n: string, l: string, a: number, y: number) => { const kk2 = ss(a, a + .35, t); return kk2 <= 0 ? '' : `<div style="position:absolute;left:50%;top:${y}px;transform:translate(-50%,0) scale(${.85 + .15 * kk2});opacity:${kk2};font-family:Inter;text-align:center;background:rgba(6,10,20,.7);border:3px solid #ffd23f;border-radius:14px;padding:10px 30px;min-width:620px"><div style="font-weight:900;font-size:58px;color:#fff">${n}</div><div style="font-weight:700;font-size:26px;letter-spacing:3px;color:#ffd23f">${l}</div></div>`; };
  return { t, alt: 1.1, cam, ground: true, sunDir: [.6, .45, -.4], sun: { dir: [.6, .45, -.4], color: '#fff2dc', i: 3.4, focus: [1, 0, 0], size: 10 }, hemi: { sky: '#8fb2e0', ground: '#9a7e5e', i: .9 },
    chute: { pos: [-1.5, 0, -2], k: .25, lie: 1.3, yaw: .6 }, actors: [felix([1.6, 0, 0], p, EXPR.excited, t)],
    overlay: stat('MACH 1.25', '1,357.6 KM/H TOP SPEED', 49.6, 250) + stat('38,969 M', 'EXIT ALTITUDE', 51.0, 420) + stat('4:19', 'MINUTES OF FREEFALL', 52.4, 590) }; });
// 13 — final line
shot(55.0, 60.01, t => { const k = kk(t, 55, 60); const cam: Cam = { pos: [lerp(-14, -40, k), lerp(4, 22, k), lerp(16, 46, k)], look: [1, 1, 0], fov: 40 };
  const p: Pose = pose({ handA: [-.4, -2.6], handB: [.5, -1.7], shapeA: 'fist' }, t, .3);
  const nk = ss(55.4, 56.2, t);
  return { t, alt: 1.1, cam, ground: true, sunDir: [.6, .35, -.4], sun: { dir: [.6, .35, -.4], color: '#ffe8c8', i: 3.2, focus: [0, 0, 0], size: 30 }, hemi: { sky: '#8fb2e0', ground: '#9a7e5e', i: .9 },
    chute: { pos: [-1.5, 0, -2], k: .25, lie: 1.3, yaw: .6 }, actors: [felix([1.6, 0, 0], p, EXPR.happy, t)], grade: { fade: ss(59.4, 60, t) },
    overlay: nk <= 0 ? '' : `<div style="position:absolute;left:0;width:1080px;top:320px;text-align:center;opacity:${nk};font-family:Inter;color:#fff;text-shadow:0 6px 20px rgba(0,0,0,.7)"><div style="font-weight:900;font-size:88px;line-height:1">FELIX<br>BAUMGARTNER</div><div style="width:220px;height:6px;background:#d8262b;margin:22px auto"></div><div style="font-weight:700;font-size:32px;letter-spacing:2px;color:#ffd23f">FIRST PERSON TO BREAK THE<br>SOUND BARRIER IN FREEFALL</div></div>` }; });

export function frameAt(n: number): SFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
