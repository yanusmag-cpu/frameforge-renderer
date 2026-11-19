// Film 3 — "The Prisoners Who Escaped Using Fake Heads" (Alcatraz, 11 June 1962). 60 s.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { climbPose, crawlPose, runPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState, type Light } from '../core.ts';
import { SET, type CFrame, type SetName } from './engine.ts';

export const FPS = 30, FRAMES = 1800;
export const NARR = [0.3, 5.2, 11.4, 15.9, 20.6, 26.8, 29.6, 34.4, 37.0, 42.0, 47.5, 51.3, 55.6];
const GUARD: Look = { outfit: 'uniform', color: '#2c3647', pants: '#232a36', hat: 'officer', hair: '#1c2433', badge: true };
const MORRIS: Look = { outfit: 'jacket', color: '#9fb5cc', pants: '#3b4658', hairStyle: 'crop', hair: '#2a2420', inner: '#c9d6e2' };
const JOHN: Look = { ...MORRIS, hairStyle: 'slick', hair: '#5a3d26' };
const CLAR: Look = { ...MORRIS, hairStyle: 'fringe', hair: '#6b4a2e', color: '#a8bcd0' };
const CX = 6 * 1.55 + 1.55 / 2;                     // Morris's cell centre (x), bars at z = 0
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1): Pose => ({ ...STAND, ...idle(t, 7, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
const NIGHT = { hemi: { sky: '#5a6c94', ground: '#24262c', i: 1.1 }, fog: { color: '#141a26', density: .02 } };
const MOON = { sky: { top: '#060a16', hor: '#2a3854', moon: [.4, .25, -.9] as V3 }, water: { moon: [.4, .25, -.9] as V3 } };
const BLOCK_LIGHTS = (extra: Light[] = []): Light[] => [{ p: W('block', [4, 5.5, 4]), c: [1, .78, .5], i: 30, d: 16 }, { p: W('block', [18, 5.5, 4]), c: [1, .78, .5], i: 30, d: 16 }, { p: W('block', [CX, 3, 3]), c: [.8, .85, 1], i: 14, d: 10 }, ...extra];
function beamSprites(from: V3, to: V3, S: Sprite[], a = .12) { for (let i = 0; i <= 14; i++) { const k = i / 14; S.push({ p: [lerp(from[0], to[0], k), lerp(from[1], to[1], k), lerp(from[2], to[2], k)], s: .15 + k * .9, rot: 0, c: [1, .92, .7], a: a * (1 - k * .5), kind: 2, seed: 0, age: 0 }); } S.push({ p: to, s: .9, rot: 0, c: [1.2, 1.1, .8], a: .55, kind: 2, seed: 0, age: 0 }); }
const cap = (a: string, b: string, t: number, t0: number, t1: number, top = 300) => { const k = ss(t0, t0 + .4, t) * (1 - ss(t1 - .4, t1, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:50%;top:${top}px;transform:translate(-50%,0) scale(${.9 + .1 * k});opacity:${k};font-family:Inter;text-align:center;background:rgba(6,8,14,.66);border-left:8px solid #d8262b;padding:18px 34px;border-radius:8px;white-space:nowrap">
  <div style="font-weight:900;font-size:50px;letter-spacing:3px;color:#fff">${a}</div>${b ? `<div style="font-weight:700;font-size:30px;letter-spacing:3px;color:#ffd23f;margin-top:4px">${b}</div>` : ''}</div>`; };
const label = (txt: string, x: number, y: number, k: number) => k <= 0 ? '' : `<div style="position:absolute;left:${x}px;top:${y}px;opacity:${k};transform:scale(${.8 + .2 * k});font-family:Inter;font-weight:900;font-size:34px;color:#111;background:#ffd23f;padding:6px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.5)">${txt}</div>`;

type S = { a: number; b: number; f: (t: number) => CFrame };
const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => CFrame) => SH.push({ a, b, f });

// 0 — hook: a guard checks a "sleeping" prisoner… the head is fake
shot(0, 5.2, t => { const walk = Math.min(t, 1.6); const gx = CX + 3.6 - walk * 1.5; const stop = ss(1.5, 1.9, t); const k = kk(t, 2.6, 4.2);
  const hand: V3 = [gx - .25, 1.25, 1.0]; const target: V3 = [CX - .35, .74, -2.2]; const S: Sprite[] = []; if (t > 1.8) beamSprites(W('block', hand), W('block', target), S, .045);
  const c = t < 2.6 ? cam('block', [CX + 2.8, 1.55, 3.6], [CX, 1.1, -.6], 42) : cam('block', [lerp(CX + .3, CX + .1, k), lerp(1.5, 1.25, k), lerp(1.4, -.4, k)], [CX - .35, .66, -2.0], lerp(42, 34, k));
  const p = stop < 1 ? walkPose(walk * 1.4, -1, {}) : pose({ turn: -.6, handA: [-.75, -2.0], shapeA: 'hold' }, t, .3);
  return { t, set: 'block', cam: c, ...NIGHT, fog: { color: '#141a26', density: .015 }, hemi: { sky: '#4a5a80', ground: '#1a1c22', i: 1.0 }, lights: BLOCK_LIGHTS([{ p: W('block', [CX - .2, 1.2, -1.5]), c: [1, .9, .7], i: t > 1.8 ? 3 : 0, d: 3 }]), sprites: S,
    actors: [act('guard', GUARD, 'block', [gx, 0, 1.1], p, expr('neutral', 'suspicious', ss(2, 2.6, t)), t)], grade: { fade: (1 - ss(0, .4, t)) * .35, vignette: .4 }, overlay: hookTitle(t) }; });
function hookTitle(t: number) { const k = ss(3.2, 3.6, t) * (1 - ss(4.8, 5.2, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:0;width:1080px;top:340px;text-align:center;opacity:${k};transform:scale(${1.2 - .2 * k});font-family:Inter;font-weight:900;font-size:120px;color:#ffd23f;-webkit-text-stroke:6px #111;paint-order:stroke fill;text-shadow:0 8px 30px rgba(0,0,0,.8)">FAKE.</div>`; }
// 1 — Alcatraz at night, then the cellblock
shot(5.2, 8.6, t => { const k = kk(t, 5.2, 8.6);
  return { t, set: 'island', cam: cam('island', [lerp(-300, -250, k), lerp(55, 48, k), lerp(330, 270, k)], [0, 28, 0], 40), beam: t * .9, ...NIGHT, fog: { color: '#18202e', density: .0012 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 2.6, focus: W('island', [0, 20, 0]), size: 220 }, overlay: cap('11 JUNE 1962', 'ALCATRAZ · SAN FRANCISCO BAY', t, 5.4, 8.6, 280) }; });
shot(8.6, 11.4, t => { const k = kk(t, 8.6, 11.4);
  return { t, set: 'block', cam: cam('block', [lerp(23, 21, k), lerp(3.2, 2.8, k), lerp(8.5, 7.5, k)], [9, 2.6, -1], 50), ...NIGHT, fog: { color: '#1a2030', density: .012 }, lights: BLOCK_LIGHTS() }; });
// 2 — the dummy head close-up, with its materials
shot(11.4, 15.9, t => { const k = kk(t, 11.4, 15.9); const S: Sprite[] = []; beamSprites(W('block', [CX + .4, 1.4, .8]), W('block', [CX - .35, .74, -2.2]), S, .03);
  const ov = label('SOAP', 120, 560, ss(12.6, 12.9, t)) + label('TOILET PAPER', 560, 700, ss(13.1, 13.4, t)) + label('REAL HUMAN HAIR', 240, 1180, ss(13.6, 13.9, t));
  return { t, set: 'block', cam: cam('block', [lerp(CX + .45, CX + .3, k), lerp(1.25, 1.15, k), lerp(-1.0, -1.2, k)], [CX - .35, .7, -2.1], lerp(40, 36, k)), ...NIGHT, fog: { color: '#141a26', density: .01 }, sprites: S,
    lights: BLOCK_LIGHTS([{ p: W('block', [CX - .1, 1.2, -1.6]), c: [1, .9, .72], i: 1.6, d: 3 }]), overlay: ov }; });
// 3 — the three men: months of digging
shot(15.9, 18.3, t => { const k = kk(t, 15.9, 18.3);
  const tag = (n: string, x: number, a: number) => label(n, x, 1220, ss(a, a + .3, t));
  return { t, set: 'block', cam: cam('block', [CX, 1.4, lerp(5.6, 5.0, k)], [CX, 1.1, .4], 44), ...NIGHT, fog: { color: '#141a26', density: .01 }, lights: BLOCK_LIGHTS([{ p: W('block', [CX, 2.2, 2]), c: [1, .8, .55], i: 5, d: 6 }]),
    actors: [act('john', JOHN, 'block', [CX - .8, 0, .9], pose({ turn: .25 }, t, .5), EXPR.determined, t), act('morris', MORRIS, 'block', [CX, 0, 1.1], pose({ turn: 0 }, t, .5), EXPR.calculating, t), act('clar', CLAR, 'block', [CX + .8, 0, .9], pose({ turn: -.25 }, t, .5), EXPR.focused, t)],
    overlay: tag('FRANK MORRIS', 340, 16.2) + tag('JOHN ANGLIN', 40, 16.6) + tag('CLARENCE ANGLIN', 600, 17.0) }; });
shot(18.3, 20.6, t => { const scrape = Math.sin(t * 14) * .08;
  return { t, set: 'block', hole: ss(18.3, 20.6, t) * .25, cam: cam('block', [CX - .55, 1.35, -.3], [CX + .3, .55, -2.4], 50), ...NIGHT, fog: { color: '#141a26', density: .01 }, lights: BLOCK_LIGHTS([{ p: W('block', [CX + .1, 1.6, -1.4]), c: [1, .85, .6], i: 4, d: 3 }]),
    actors: [act('morris', MORRIS, 'block', [CX + .15, 0, -2.25], { ...STAND, crouch: .85, kneeUp: true, turn: .7, back: 0, lean: .2, handB: [.75 + scrape, -.95], handA: [.4, -1.0], shapeB: 'hold', footA: [-.35, -.08], footB: [.3, -.08] }, EXPR.focused, t)] }; });
// 4 — spoons and a drill made from a vacuum motor: the vent opening widens
shot(20.6, 26.8, t => { const k = kk(t, 20.6, 26.8); const hole = ss(20.6, 25.8, t); const S: Sprite[] = []; const R = rng(Math.floor(t * 12));
  for (let i = 0; i < 10; i++) S.push({ p: W('block', [CX + .45 + (R() - .5) * .3, .32 + (R() - .5) * .3, -2.66 + R() * .1]), s: .012 + R() * .015, rot: R() * 6, c: [.6, .58, .54], a: .45, kind: 0, seed: R(), age: .1 });
  const drill = t > 23.4; const hx = .9 + Math.sin(t * (drill ? 40 : 14)) * (drill ? .02 : .08);
  return { t, set: 'block', hole, cam: cam('block', [lerp(CX + .1, CX + .3, k), lerp(.6, .5, k), lerp(-1.6, -1.9, k)], [CX + .45, .33, -2.74], 38), ...NIGHT, fog: { color: '#141a26', density: .006 }, sprites: S, lights: BLOCK_LIGHTS([{ p: W('block', [CX + .2, 1.0, -1.9]), c: [1, .85, .6], i: 3, d: 2.5 }]),
    actors: [act('morris', MORRIS, 'block', [CX - .25, 0, -2.0], { ...STAND, crouch: .85, kneeUp: true, turn: .8, lean: .25, handB: [hx, -.75], handA: [.5, -.8], shapeB: 'hold', footA: [-.35, -.08], footB: [.3, -.08] }, expr('focused', 'determined', k), t)],
    overlay: cap(drill ? 'VACUUM-MOTOR DRILL' : 'SHARPENED SPOONS', '', t, drill ? 23.5 : 20.9, drill ? 26.6 : 23.3, 300) }; });
// 5 — painted fake grilles hide the holes (the guard's beam passes over it)
shot(26.8, 29.6, t => { const S: Sprite[] = []; const sweep = lerp(-.8, .8, ss(27.4, 29.0, t)); beamSprites(W('block', [CX + 1.2, 1.4, .9]), W('block', [CX + .45 + sweep, .33, -2.7]), S, .08);
  return { t, set: 'block', hole: 1, fake: 1, cam: cam('block', [CX + .3, .55, -1.75], [CX + .45, .33, -2.74], 36), ...NIGHT, fog: { color: '#141a26', density: .006 }, sprites: S,
    lights: BLOCK_LIGHTS([{ p: W('block', [CX + .45 + sweep, .5, -2.5]), c: [1, .9, .7], i: 4, d: 2 }]), overlay: label('PAINTED CARDBOARD', 300, 1200, ss(27.2, 27.5, t)) }; });
// 6 — into the utility corridor, up the pipes
shot(29.6, 31.6, t => { const k = kk(t, 29.6, 31.6); const out = ss(29.7, 31.2, t);
  return { t, set: 'utility', cam: cam('utility', [lerp(3.4, 3.0, k), 1.1, -.1], [0, .5, .2], 46), hemi: { sky: '#5a6280', ground: '#1e1e24', i: .9 }, fog: { color: '#0e1016', density: .03 },
    lights: [{ p: W('utility', [1.2, 1.6, 0]), c: [1, .85, .6], i: 12, d: 6 }],
    actors: [act('morris', MORRIS, 'utility', [-.6 + out * 1.6, 0, .1], crawlPose((t - 29.6) * 1.6, 1), EXPR.focused, t)] }; });
shot(31.6, 34.4, t => { const k = kk(t, 31.6, 34.4); const y1 = (t - 31.6) * 1.9;
  return { t, set: 'utility', cam: cam('utility', [3.6, lerp(2.0, 4.0, k), .1], [0, lerp(3.2, 5.6, k), -.2], 50), hemi: { sky: '#5a6280', ground: '#1e1e24', i: .9 }, fog: { color: '#0e1016', density: .02 },
    lights: [{ p: W('utility', [0, 8.6, 0]), c: [.6, .7, .9], i: 20, d: 8 }, { p: W('utility', [1.2, y1 + 1.5, 0]), c: [1, .85, .6], i: 12, d: 5 }],
    actors: [act('morris', MORRIS, 'utility', [0, y1 + 1.2, -.3], climbPose(y1 * 1.6), EXPR.determined, t), act('john', JOHN, 'utility', [-.15, Math.max(0, y1 - .5), -.3], climbPose(y1 * 1.6 + 1), EXPR.focused, t), act('clar', CLAR, 'utility', [.15, Math.max(0, y1 - 2.4), -.3], climbPose(y1 * 1.6 + 2), EXPR.fear, t)] }; });
// 7 — across the roof and down to the water's edge
shot(34.4, 37.0, t => { const k = kk(t, 34.4, 37.0); const run = (t - 34.4) * 3.4;
  const r = (id: string, L: Look, dx: number, dz: number) => act(id, L, 'island', [-40 + run + dx, 44, 14 + dz], runPose(run * 1.3 + dx, 1, { fear: .4 }), EXPR.determined, t, { scale: 1.6 });
  return { t, set: 'island', cam: cam('island', [lerp(-30, -26, k), lerp(46.8, 46.4, k), lerp(25, 24, k)], [-38 + run * .8, 45.6, 14], 48), beam: t * .9, ...NIGHT, fog: { color: '#18202e', density: .004 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 3, focus: W('island', [-35, 44, 6]), size: 30 }, actors: [r('morris', MORRIS, 0, 0), r('john', JOHN, -2.5, 1.2), r('clar', CLAR, -5, -1)] }; });
// 8 — the raft of more than fifty raincoats, inflated on the shore
shot(37.0, 42.0, t => { const k = kk(t, 37.0, 42.0); const inf = ss(37.6, 40.8, t); const raftP: V3 = W('island', [0, -1, 150]);
  const pump = Math.sin(t * 6) * .12;
  return { t, set: 'island', cam: cam('island', [lerp(5.5, 4.6, k), lerp(1.9, 1.6, k), lerp(155, 154, k)], [0, .2, 147.5], 44), beam: t * .9, ...NIGHT, fog: { color: '#18202e', density: .012 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 3, focus: raftP, size: 6 }, raft: { pos: raftP, k: .15 + .85 * inf, yaw: .3 },
    actors: [act('morris', MORRIS, 'island', [-1.1, 0, 146.6], { ...STAND, crouch: .7, kneeUp: true, handA: [.6, -1.0 + pump], handB: [.9, -1.0 - pump], shapeA: 'hold', shapeB: 'hold', footA: [-.35, -.08], footB: [.3, -.08], turn: .5 }, EXPR.focused, t),
      act('john', JOHN, 'island', [1.2, 0, 146.4], pose({ turn: -.4, handA: [-.6, -1.4] }, t, .6), EXPR.nervous, t), act('clar', CLAR, 'island', [.3, 0, 145.6], pose({ turn: .1, headTurn: -.5 }, t, .6), EXPR.worried, t)],
    overlay: cap('50+ RAINCOATS', 'GLUED AND STITCHED INTO A RAFT', t, 37.4, 41.8, 300) }; });
// 9 — around 10 p.m. they push off into the cold, black water
shot(42.0, 44.8, t => { const k = kk(t, 42.0, 44.8); const z = 151 + (t - 42) * 1.2; const pad = Math.sin(t * 3);
  const sit = (id: string, L: Look, dx: number, dz: number) => act(id, L, 'island', [dx, -.75, z + dz], { ...STAND, crouch: .8, kneeUp: true, handA: [-.7, -1.2 + pad * .3], handB: [.7, -1.2 - pad * .3], shapeA: 'hold', shapeB: 'hold', footA: [-.3, -.08], footB: [.3, -.08] }, EXPR.focused, t);
  return { t, set: 'island', cam: cam('island', [lerp(-6, -4.5, k), lerp(1.2, .9, k), z + lerp(6, 4.5, k)], [0, .2, z - 2], 44), beam: t * .9, ...NIGHT, fog: { color: '#18202e', density: .012 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 2.6, focus: W('island', [0, 0, z]), size: 8 }, raft: { pos: W('island', [0, -1, z]), k: 1, yaw: .1 },
    actors: [sit('morris', MORRIS, -.25, -.4), sit('john', JOHN, .25, .2), sit('clar', CLAR, -.1, .7)], overlay: cap('≈ 10:00 PM', '', t, 42.2, 44.6, 300) }; });
shot(44.8, 47.5, t => { const k = kk(t, 44.8, 47.5); const z = 0 - (t - 44.8) * 1.0;
  return { t, set: 'bay', cam: cam('bay', [lerp(6, 10, k), lerp(3, 6, k), z + lerp(9, 16, k)], [0, .4, z], 40), beam: t * .9, hemi: { sky: '#4a5a80', ground: '#0a0c10', i: .8 }, fog: { color: '#1a2230', density: .006 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 2.6, focus: W('bay', [0, 0, z]), size: 10 }, raft: { pos: W('bay', [0, 0, z]), k: 1, yaw: .2 },
    actors: (['morris', 'john', 'clar'] as const).map((id, i) => act(id, [MORRIS, JOHN, CLAR][i], 'bay', [(i - 1) * .3, .25, z + (i - 1) * .4], { ...STAND, crouch: .8, kneeUp: true, handA: [-.7, -1.2], handB: [.7, -1.2], shapeA: 'hold', shapeB: 'hold' }, EXPR.worried, t)) }; });
// 10 — morning: the guards find only dummies (the head rolls to the floor), alarm
shot(47.5, 51.3, t => { const k = kk(t, 47.5, 51.3); const poke = ss(48.6, 49.0, t); const fall = ss(49.0, 49.7, t);
  const head = { roll: fall * 2.4, off: [fall * .25, -fall * .6 + Math.sin(fall * Math.PI) * .1, fall * .5] as V3 };
  return { t, set: 'block', head, alarm: ss(49.6, 50, t), cam: cam('block', [lerp(CX - .55, CX - .6, k), lerp(1.95, 1.85, k), lerp(-.1, -.2, k)], [CX + .05, .7, -1.9], 62), hemi: { sky: '#8aa0c0', ground: '#3a3a3a', i: 1.1 }, fog: { color: '#6d7888', density: .015 },
    lights: [{ p: W('block', [CX, 2.2, -1]), c: [.9, .95, 1], i: 6, d: 6 }],
    actors: [act('guard', GUARD, 'block', [CX + .38, 0, -1.35], pose({ turn: -.7, handA: [-.95 - poke * .3, -1.25 + poke * .3], shapeA: 'point' }, t, .3), poke > .5 ? expr('shocked', 'terror', fall * .6) : EXPR.suspicious, t)],
    overlay: cap('7:00 AM', '12 JUNE 1962', t, 47.7, 49.6, 300) }; });
// 11 — no bodies were ever found (a lone paddle on grey water)
shot(51.3, 55.6, t => { const k = kk(t, 51.3, 55.6);
  return { t, set: 'bay', cam: cam('bay', [lerp(3, 2.2, k), lerp(1.4, 1.1, k), lerp(5, 4, k)], [0, .1, 0], 42), hemi: { sky: '#7d8796', ground: '#2a2e33', i: 1.0 }, fog: { color: '#7d8590', density: .03 }, sky: { top: '#6c7684', hor: '#9aa2ac', stars: 0, moon: [0, -1, 0] }, water: { moon: [.2, .5, -.8], dark: .2 },
    sun: { dir: [.2, .5, -.8], color: '#c8ccd2', i: .6, focus: W('bay', [0, 0, 0]), size: 6 }, paddle: W('bay', [0, .02, 0]), overlay: cap('NO BODIES FOUND', '', t, 51.6, 55.4, 300) }; });
// 12 — the mystery: fog swallows the raft
shot(55.6, 60.01, t => { const k = kk(t, 55.6, 60); const z = -20 - (t - 55.6) * .8;
  return { t, set: 'bay', cam: cam('bay', [0, lerp(2, 3, k), z + lerp(14, 22, k)], [0, 1, z - 20], 40), beam: t * .9, hemi: { sky: '#4a5a80', ground: '#0a0c10', i: .8 }, fog: { color: '#1a2230', density: .015 + k * .05 }, ...MOON,
    sun: { dir: [-.5, .5, .7], color: '#b4c8ec', i: 2.4, focus: W('bay', [0, 0, z]), size: 10 }, raft: { pos: W('bay', [0, 0, z]), k: 1, yaw: .2 },
    actors: (['morris', 'john', 'clar'] as const).map((id, i) => act(id, [MORRIS, JOHN, CLAR][i], 'bay', [(i - 1) * .3, .25, z + (i - 1) * .4], { ...STAND, crouch: .8, kneeUp: true, handA: [-.7, -1.2], handB: [.7, -1.2], shapeA: 'hold', shapeB: 'hold', back: 1 }, EXPR.neutral, t)),
    grade: { fade: ss(59.3, 60, t) }, overlay: ending(t) }; });
function ending(t: number) { const k = ss(55.9, 56.6, t); if (k <= 0) return '';
  return `<div style="position:absolute;left:0;width:1080px;top:300px;text-align:center;opacity:${k};font-family:Inter;color:#fff;text-shadow:0 6px 20px rgba(0,0,0,.8)">
  <div style="font-weight:900;font-size:60px;line-height:1.15">FRANK MORRIS<br>JOHN ANGLIN<br>CLARENCE ANGLIN</div><div style="width:220px;height:6px;background:#d8262b;margin:22px auto"></div>
  <div style="font-weight:900;font-size:56px;color:#ffd23f;letter-spacing:4px">FATE UNKNOWN</div></div>`; }
export function frameAt(n: number): CFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
