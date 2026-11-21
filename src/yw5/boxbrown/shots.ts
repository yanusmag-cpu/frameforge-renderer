// YunoWorld v4 · Film 1 — "The Man Who Mailed Himself in a Box" (Henry "Box" Brown, 29–30 March 1849). 60 s, cut to the narration.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { sitPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, type V3, type Cam, type ActorState, type Sprite } from '../../yw3/core.ts';
import { SET, routeAt, type BFrame, type SetName } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, GRADE, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.boxbrown; const F = 'boxbrown';
const WORKER: Look = { outfit: 'vest', color: '#c8322c', inner: '#efe6d2', pants: '#3a3a46', hat: 'cap', hair: '#2a2420' };
const PORTER: Look = { outfit: 'jacket', color: '#4a5a6a', inner: '#e0d6c0', pants: '#2e2e36', hat: 'cap', hair: '#3a2a1a' };
const PORTER2: Look = { outfit: 'vest', color: '#6a4a2a', inner: '#e8dcc4', pants: '#3a3a3a', hat: 'brimmed', hair: '#4a3020', beard: 'stubble' };
const HENRY: Look = { outfit: 'coat', color: '#2f3d66', inner: '#ece4d2', pants: '#262630', hairStyle: 'crop', hair: '#17110c' };
const SMITH: Look = { outfit: 'vest', color: '#7a6a4a', inner: '#ece4d2', pants: '#3a3a3a', hat: 'brimmed', hair: '#6a4a2a', beard: 'full', beardColor: '#6a4a2a' };
const COMMITTEE: Look[] = [{ outfit: 'suit', color: '#2a2a32', pants: '#2a2a32', inner: '#f2efe6', tie: '#1a1a1a', hairStyle: 'sidepart', hair: '#3a2a1a', glasses: true, beard: 'full', beardColor: '#3a2a1a' },
  { outfit: 'suit', color: '#4a3a2a', pants: '#3a3028', inner: '#f2efe6', tie: '#1a1a1a', hairStyle: 'crop', hair: '#17110c', beard: 'moustache', beardColor: '#17110c' },
  { outfit: 'coat', color: '#3a4a3a', pants: '#2a2a2a', inner: '#f2efe6', hat: 'tophat', hair: '#2a2a2a' }, { outfit: 'suit', color: '#5a4a5a', pants: '#2a2a32', inner: '#f2efe6', hairStyle: 'slick', hair: '#8a6a4a', beard: 'goatee' }];
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
const DAY = { sky: { top: '#3f7fd0', hor: '#ffd7a0', sun: [.4, .45, .8] as V3 }, hemi: { sky: '#b8c8ff', ground: '#7a5a48', i: .95 }, fog: { color: '#d8b890', density: .012 } };
const SUN = (s: SetName, focus: V3, size: number, i = 3.2) => ({ dir: [.25, .55, .8] as V3, color: '#ffd59a', i, focus: W(s, focus), size });
const LAMPS: { p: V3; c: [number, number, number]; i: number; d: number }[] = [-8, -2, 4, 10].map(z => ({ p: W('depot', [-11.2, 5.6, z]), c: [1, .78, .45] as [number, number, number], i: 10, d: 12 }));
const CUT = { hemi: { sky: '#8a7ac8', ground: '#2a2440', i: .8 }, fog: { color: '#2a2440', density: .01 }, bg: '#2a2440' };
// Henry curled inside the crate (cutaway studio): a tight seated pose, scaled to fit 3 ft x 2.6 ft
const curled = (t: number, strain = 0): Pose => ({ ...sitPose(1, 1), ...idle(t, 4, .25), crouch: .95, lean: .5 + strain * .05, headTilt: .35, headLift: -.1 });
const henryIn = (t: number, flip = 0, strain = 0, face = EXPR.focused): ActorState => {
  const up = flip > .5; return act('henry', HENRY, 'cut', up ? [-.02, .72, .02] : [-.02, .04, .02], curled(t, strain), face, t, { scale: .43, roll: up ? Math.PI : 0, contact: 0, shadow: false, rim: '#ffd9a0' }); };
type S = { a: number; b: number; f: (t: number) => BFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => BFrame) => SH.push({ a, b, f });

// 1 — HOOK: a busy freight room; a crate jolts; the porter freezes, listens, edges closer
shot(0, C[1], t => { const k = kk(t, 0, C[1]); const j = ss(.6, .7, t) * (1 - ss(1.1, 1.4, t)) + ss(2.6, 2.7, t) * (1 - ss(3.0, 3.3, t)); const stop = ss(.75, 1.0, t); const near = ss(3.2, C[1], t);
  const wx = lerp(-1.2, -.5, near) + (1 - stop) * (t * .8 - .7); const S: Sprite[] = [];
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [0, 0, 6], 22), cam: cam('depot', [lerp(1.6, .9, k), lerp(1.5, 1.1, k), lerp(2.2, 3.9, k)], [lerp(-.5, -.2, k), lerp(1.0, .6, k), 6.5], lerp(46, 38, k), { roll: Math.sin(t * .6) * .004 }),
    crate: { pos: [0, 0, 5.8], rot: [0, .2, 0], jiggle: j }, shafts: .16, doorStreet: 0, lights: LAMPS, sprites: S,
    actors: [act('w', WORKER, 'depot', [wx, 0, 7.4], stop < .5 ? walkPose(t * 1.4, 1) : pose({ turn: .2, headTurn: .35, headTilt: .12 * stop, lean: .08 * near, handA: [-.6, -.8], handB: [.95, -1.15], shapeB: 'open', back: 0 }, t, .4), stop < .5 ? EXPR.neutral : expr('confused', 'shocked', ss(2.6, 2.9, t)), t, { rim: '#ffd59a' }),
      act('p2', PORTER, 'depot', [4.5 - t * .8, 0, 12], walkPose(t * 1.2, -1), EXPR.neutral, t)],
    grade: { ...GRADE, fade: (1 - ss(0, .4, t)) * .5 }, overlay: captions(F, t) }; });
// 2 — the box vs the man: 3 ft long, he is 5 ft 8 (studio cutaway, side by side → he folds himself in)
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const into = ss(C[1] + 1.4, C[2] - .2, t);
  return { t, set: 'cut', ...CUT, sun: { dir: [.4, .6, .7], color: '#ffd9a8', i: 2.6, focus: W('cut', [0, .5, 0]), size: 5 }, cam: cam('cut', [lerp(.4, .7, k), lerp(1.1, .8, k), lerp(5.2, 3.2, k)], [lerp(-.55, -.1, k), lerp(.85, .45, k), 0], 40), crate: {},
    lights: [{ p: W('cut', [-2, 2.5, 2]), c: [.6, .55, 1], i: 6, d: 8 }],
    actors: [into < .5 ? act('henry', HENRY, 'cut', [-1.15, 0, .2], pose({ turn: .35, headTurn: .2, handA: [-.5, -.9], handB: [.6, -1.0] }, t, .5), EXPR.determined, t, { rim: '#ffd9a0' }) : henryIn(t)],
    grade: GRADE, overlay: chip('BOX: 3 FT LONG', 260, ss(C[1] + .2, C[1] + .5, t)) + chip('HIM: 5 FT 8', 370, ss(C[1] + 1.0, C[1] + 1.3, t), '#ff8a5a') + captions(F, t) }; });
// 3 — inside: a little water, a few holes for air (light needles through the dark)
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]);
  return { t, set: 'cut', ...CUT, sun: { dir: [.4, .6, .7], color: '#ffd9a8', i: 1.4, focus: W('cut', [0, .4, 0]), size: 4 }, cam: cam('cut', [lerp(.9, .55, k), lerp(.55, .45, k), lerp(1.4, 1.05, k)], [.05, .4, 0], 44), crate: {},
    lights: [{ p: W('cut', [.4, .6, 0]), c: [1, .85, .55], i: 1.2, d: 2 }], actors: [henryIn(t, 0, 0, EXPR.calm)], grade: { ...GRADE, vignette: .4 },
    overlay: chip('A LITTLE WATER · A FEW AIR HOLES', 280, ss(C[2] + .3, C[2] + .6, t)) + captions(F, t) }; });
// 4 — the label: THIS SIDE UP, WITH CARE (glide over the lid in warm light)
shot(C[3], C[4], t => { const k = kk(t, C[3], C[4]);
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [0, 0, 5.8], 8), cam: cam('depot', [lerp(-.6, .5, k), lerp(1.45, 1.3, k), lerp(6.4, 6.3, k)], [lerp(-.15, .1, k), .78, 5.8], 34), crate: { pos: [0, 0, 5.8], rot: [0, .2, 0] }, lights: LAMPS, shafts: .18,
    grade: GRADE, overlay: captions(F, t) }; });
// 5 — the porters swing it onto the cart… upside down
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]); const flip = ss(C[4] + .2, C[4] + 1.4, t);
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [0, 0, 6], 14), cam: cam('depot', [lerp(3.2, 2.8, k), 1.5, lerp(8.6, 8.2, k)], [0, .9, 6], 42), crate: { pos: [0, .2 + Math.sin(flip * Math.PI) * .7, 6], rot: [flip * Math.PI, .2, 0] }, lights: LAMPS,
    actors: [act('a', PORTER, 'depot', [-.9, 0, 6.3], pose({ turn: .6, lean: .25 - flip * .3, crouch: .3 * (1 - flip), handA: [.6, -1.2 + flip * .6], handB: [.9, -1.0 + flip * .6], shapeA: 'hold', shapeB: 'hold' }, t, .3), EXPR.neutral, t),
      act('b', PORTER2, 'depot', [.95, 0, 6.3], pose({ turn: -.6, lean: -.25 + flip * .3, crouch: .3 * (1 - flip), handA: [-.9, -1.0 + flip * .6], handB: [-.6, -1.2 + flip * .6], shapeA: 'hold', shapeB: 'hold' }, t, .3, 7), EXPR.tired, t)],
    shake: ss(C[4] + 1.3, C[4] + 1.45, t) * .06, grade: GRADE, overlay: chip('TURNED UPSIDE DOWN · TWICE', 260, ss(C[4] + 1.2, C[4] + 1.5, t), '#ff5a4a') + captions(F, t) }; });
// 6 — inside, on his head for an hour and a half; silent strain (no injury shown)
shot(C[5], C[6], t => { const k = kk(t, C[5], C[6]); const strain = ss(C[5] + 1, C[6] - 1, t);
  return { t, set: 'cut', ...CUT, sun: { dir: [.4, .6, .7], color: '#ffb8a0', i: 1.3, focus: W('cut', [0, .4, 0]), size: 4 }, cam: cam('cut', [lerp(.75, .5, k), lerp(.4, .5, k), lerp(1.5, 1.15, k)], [0, .4, 0], 46, { roll: Math.PI }), crate: {},
    lights: [{ p: W('cut', [.4, .4, 0]), c: [1, .5, .4], i: 1.4 + strain, d: 2 }], actors: [henryIn(t, 0, strain, expr('focused', 'fear', strain))],
    grade: { ...GRADE, vignette: .4 + strain * .25, gain: [1.08, .96, .92] }, overlay: chip('1½ HOURS UPSIDE DOWN', 260, ss(C[5] + .3, C[5] + .6, t), '#ff5a4a') + chip('NOT A SOUND', 370, ss(C[6] - 2.2, C[6] - 1.9, t), '#ffd23f') + captions(F, t) }; });
// 7 — two workers tip it onto its side… and sit on it
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const tip = ss(C[6] + .1, C[6] + 1.0, t); const SAT = wt('boxbrown', 'sat', 1, C[6] + 1.8); const sit = ss(SAT - .7, SAT + .1, t);
  const crate: BFrame['crate'] = { pos: [0, 0, 6], rot: [Math.PI * (1 - tip * .5), .2, 0] };
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [0, 0, 6], 14), cam: cam('depot', [lerp(2.6, 2.3, k), 1.35, lerp(8.4, 8.0, k)], [0, .7, 6], 42), crate, lights: LAMPS,
    actors: [act('a', PORTER, 'depot', [lerp(-.9, -.25, sit), sit * .63, 6.25], sit > .5 ? { ...sitPose(1), ...idle(t, 2, .3) } : pose({ turn: .6, lean: .2, handA: [.7, -1], handB: [.9, -1], shapeA: 'hold', shapeB: 'hold' }, t, .3), EXPR.tired, t),
      act('b', PORTER2, 'depot', [lerp(.95, .3, sit), sit * .63, 6.25], sit > .5 ? { ...sitPose(-1), ...idle(t, 6, .3), handB: [-.4, -.5] } : pose({ turn: -.6, lean: -.2, handA: [-.9, -1], handB: [-.7, -1], shapeA: 'hold', shapeB: 'hold' }, t, .3, 7), EXPR.happy, t)],
    grade: GRADE, overlay: captions(F, t) }; });
// 8 — the question: why would a man mail himself? (slow push on the air holes)
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]);
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [0, 0, 6], 8), cam: cam('depot', [lerp(-1.3, -.95, k), lerp(.75, .6, k), lerp(6.5, 6.2, k)], [-.45, .58, 5.95], lerp(38, 26, k)), crate: { pos: [0, 0, 6], rot: [0, 0, 0] }, lights: LAMPS,
    grade: { ...GRADE, vignette: .38 }, overlay: card('WHY?', '', ss(C[7] + .5, C[7] + .8, t) * (1 - ss(C[8] - .3, C[8], t)), 330) + captions(F, t) }; });
// 9 — Richmond: his wife and children sold away; he watches the wagon leave (respectful, quiet)
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]); const go = ss(C[8], C[9], t);
  return { t, set: 'depot', ...DAY, sky: { top: '#4a6ab0', hor: '#f0b888', sun: [.4, .2, .8] }, sun: { dir: [.3, .3, .9], color: '#ffb880', i: 3, focus: W('depot', [0, 0, 18]), size: 30 },
    cam: cam('depot', [lerp(-.2, .2, k), 1.6, lerp(15.6, 16.0, k)], [lerp(.5, .2, k), 1.4, 24], 48), doorStreet: go, crate: { pos: [0, -3, 0] }, lights: LAMPS,
    actors: [act('henry', HENRY, 'depot', [.55, 0, 18.4], pose({ back: 1, turn: .1, handA: [-.45, -.6], handB: [.5, -.6], headTurn: -.2 * go, headTilt: .1 }, t, .3), EXPR.sad, t, { rim: '#ffb880' })],
    grade: { ...GRADE, sat: 1.05, vignette: .38 }, overlay: chip('RICHMOND, VIRGINIA', 260, ss(C[8] + .3, C[8] + .7, t)) + captions(F, t) }; });
// 10 — $86, more than half his savings, shipped north as "dry goods"
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const give = ss(C[9] + .4, C[9] + 1.4, t);
  return { t, set: 'depot', ...DAY, sun: SUN('depot', [6.5, 1, -4], 8, 2.2), cam: cam('depot', [lerp(6.5, 6.6, k), 1.6, lerp(.4, 0, k)], [6.5, 1.05, -3.7], 50), crate: { pos: [0, -3, 0] }, coins: 1,
    lights: [...LAMPS, { p: W('depot', [7, 1.4, -4.2]), c: [1, .8, .5], i: 5, d: 4 }],
    actors: [act('henry', HENRY, 'depot', [5.85, 0, -3.1], pose({ turn: .45, handB: [lerp(.5, .95, give), lerp(-.9, -1.15, give)], shapeB: 'open' }, t, .4), EXPR.determined, t, { rim: '#ffd59a' }),
      act('smith', SMITH, 'depot', [7.2, 0, -3.2], pose({ turn: -.45, handA: [-.8, -1.1], shapeA: 'open' }, t, .4, 8), EXPR.concern, t)],
    grade: GRADE, overlay: chip('$86 · MORE THAN HALF HIS SAVINGS', 260, ss(C[9] + .4, C[9] + .7, t)) + chip('SHIPPED AS "DRY GOODS"', 370, ss(C[9] + 2.2, C[9] + 2.5, t), '#ff8a5a') + captions(F, t) }; });
// 11 — the journey: wagon · train · steamboat · ferry · 27 hours (tilt-shift map)
shot(C[10], C[11], t => { const jy = ss(C[10], C[11] - .2, t); const legs = ['WAGON', 'TRAIN', 'STEAMBOAT', 'FERRY'];
  const li = Math.min(3, Math.floor((t - C[10]) / ((C[11] - C[10]) / 4.6)));
  return { t, set: 'map', sky: { top: '#3f7fd0', hor: '#ffd7a0', sun: [.4, .55, .6] }, hemi: { sky: '#c8d8ff', ground: '#6a5a48', i: 1.0 }, fog: { color: '#e8d8b8', density: .0012 }, sun: { dir: [.35, .7, .5], color: '#ffe0b0', i: 3.2, focus: W('map', [20, 0, 0]), size: 300 },
    cam: cam('map', [routeAt(jy)[0] + 40, 62, routeAt(jy)[2] + 70], routeAt(jy), 40), journey: jy,
    grade: { ...GRADE }, overlay: chip(legs[Math.max(0, li)], 260, 1, ['#ffd23f', '#ff8a5a', '#5fb8ff', '#5fd16f'][Math.max(0, li)]) + chip(`${Math.round(jy * 27)} HOURS`, 370, ss(C[10] + .4, C[10] + .7, t), '#ffffff') + captions(F, t) }; });
// 12 — Philadelphia: the committee gathers; a hatchet pries the lid
shot(C[11], C[12], t => { const k = kk(t, C[11], C[12]); const pry = ss(C[11] + .6, C[12], t) * .25;
  return { t, set: 'office', hemi: { sky: '#c8b8ff', ground: '#6a4a3a', i: .9 }, fog: { color: '#3a2a3a', density: .02 }, sun: { dir: [.95, .5, .2], color: '#ffd59a', i: 2.6, focus: W('office', [0, 0, 0]), size: 6 },
    cam: cam('office', [lerp(.4, .2, k), lerp(1.9, 1.6, k), lerp(4.4, 3.6, k)], [0, .6, 0], 44), crate: { lid: pry },
    lights: [{ p: W('office', [3, 1.4, -3.6]), c: [1, .8, .5], i: 5, d: 6 }],
    actors: COMMITTEE.map((L, i) => act('c' + i, L, 'office', [[-1.1, 0, -.4], [1.15, 0, -.3], [-.7, 0, -1.4], [.8, 0, -1.4]][i] as V3, pose({ turn: [.5, -.5, .3, -.3][i], lean: .12, headTilt: .15, handA: i === 1 ? [-.95, -1.1] : [-.5, -.8], handB: i === 1 ? [-.6, -1.2] : [.5, -.8], shapeA: i === 1 ? 'hold' : 'open' }, t + i, .4, i + 2), EXPR.worried, t, { rim: '#ffd59a' })),
    grade: GRADE, overlay: chip('PHILADELPHIA · 27 HOURS LATER', 260, ss(C[11] + .2, C[11] + .5, t)) + captions(F, t) }; });
// 13 — the lid comes off… and he stands up, free
shot(C[12], C[13], t => { const k = kk(t, C[12], C[13]); const lid = ss(C[12], C[12] + .6, t); const rise = ss(C[12] + .7, C[12] + 2.4, t);
  return { t, set: 'office', hemi: { sky: '#c8b8ff', ground: '#6a4a3a', i: 1.0 }, fog: { color: '#3a2a3a', density: .015 }, sun: { dir: [.95, .5, .2], color: '#ffd59a', i: 3.2, focus: W('office', [0, 0, 0]), size: 6 },
    cam: cam('office', [lerp(.2, .1, k), lerp(1.1, 1.5, k), lerp(3.2, 3.6, k)], [0, lerp(.7, 1.3, rise), 0], 42), crate: { lid: .25 + lid * .75 },
    lights: [{ p: W('office', [0, 2.6, .6]), c: [1, .85, .6], i: 6 * rise, d: 5 }],
    actors: [act('henry', HENRY, 'office', [0, lerp(-.35, .05, rise), 0], rise < .6 ? { ...sitPose(1, .5), crouch: lerp(.9, .3, rise) } : pose({ turn: 0, handA: [-.7, -1.5 - rise * .3], handB: [.7, -1.5 - rise * .3], shapeA: 'open', shapeB: 'open', headLift: .08 }, t, .4),
      rise < .5 ? EXPR.exhausted : expr('relief', 'excited', ss(C[12] + 1.6, C[12] + 2.4, t)), t, { rim: '#ffe0a0', scale: lerp(.75, 1, rise), contact: rise > .8 ? 1 : 0 }),
      ...COMMITTEE.map((L, i) => act('c' + i, L, 'office', [[-1.2, 0, -.2], [1.2, 0, -.2], [-.75, 0, -1.4], [.85, 0, -1.4]][i] as V3, pose({ turn: [.5, -.5, .3, -.3][i], handA: [-.6, -1.6 * rise - .4], handB: [.6, -1.0], shapeA: 'open' }, t + i, .5, i + 2), expr('worried', 'excited', rise), t, { rim: '#ffd59a' }))],
    grade: { ...GRADE, bloom: .3, flash: ss(C[12] + 1.8, C[12] + 2, t) * (1 - ss(C[12] + 2, C[12] + 2.6, t)) * .25 }, overlay: captions(F, t) }; });
// 14 — the name the world remembers
shot(C[13], 60.01, t => { const k = kk(t, C[13], 60);
  return { t, set: 'office', hemi: { sky: '#c8b8ff', ground: '#6a4a3a', i: 1.0 }, fog: { color: '#3a2a3a', density: .015 }, sun: { dir: [.95, .5, .2], color: '#ffd59a', i: 3.2, focus: W('office', [0, 0, 0]), size: 6 },
    cam: cam('office', [lerp(.1, .6, k), lerp(1.4, 1.9, k), lerp(3.4, 5.2, k)], [0, 1.1, 0], 42), crate: { lid: 1 },
    actors: [act('henry', HENRY, 'office', [-.75, 0, .4], pose({ turn: .25, handB: [.6, -.7] }, t, .5), EXPR.confident, t, { rim: '#ffe0a0' })],
    grade: { ...GRADE, fade: ss(59.3, 60, t) }, overlay: card('HENRY "BOX" BROWN', 'RICHMOND → PHILADELPHIA · 1849', ss(C[13] + .9, C[13] + 1.5, t)) + captions(F, t, t > C[13] + 1.0) }; });

export function frameAt(n: number): BFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
