// YunoWorld v3 · Film 3 — "The Man Whose Bedroom Disappeared" (Seffner, Florida, 28 Feb 2013). 60 s, cut to the narration cues.
// A real tragedy: Jeff Bush is never shown falling or escaping. The cold open is the viewer's own "imagine" moment and cuts to black.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { runPose, lyingPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState } from '../../yw3/core.ts';
import { SET, HOLE, type SFrame, type SetName } from './engine.ts';
import { CUES } from '../cues.ts';
import { card, chip, endCard } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.sinkhole;
const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515' };
const JEREMY: Look = { outfit: 'jacket', color: '#5d6b78', pants: '#2b3a55', inner: '#d9d4c8', hairStyle: 'crop', hair: '#3a2a1a', beard: 'goatee', beardColor: '#3a2a1a' };
const DEPUTY: Look = { outfit: 'uniform', color: '#3f5a3a', pants: '#3f5a3a', hat: 'officer', hair: '#2a2a2a', badge: true, radio: true };
const CREW: Look = { outfit: 'coat', color: '#2a2f38', pants: '#2a2f38', hat: 'helmet', hiVis: true, hair: '#2a2a2a' };
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
const NIGHT = { night: { moon: [-.4, .5, -.75] as V3 }, hemi: { sky: '#6a7ad0', ground: '#2a2a3a', i: 1.0 }, fog: { color: '#1a2140', density: .009 } };
const MOON = (focus: V3, size: number, i = 2.4) => ({ dir: [.45, .55, .7] as V3, color: '#a9bcff', i, focus, size });
const VIVID = { sat: 1.18, contrast: 1.12, bloom: .3, bloomTh: 1.1, vignette: .34, exposure: 1.05 };
const INSIDE = { hemi: { sky: '#6a6a8a', ground: '#2a2220', i: .55 }, fog: { color: '#120e14', density: .02 } };
const HALL: V3 = [-1.5, 2.4, 1.6];                  // hallway ceiling light
function dust(at: V3, n: number, k: number, seed: number, S: Sprite[], size = 1, col: [number, number, number] = [.62, .54, .44]) { const R = rng(seed); for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * size * 2;
  S.push({ p: W('home', [at[0] + Math.cos(a) * r, at[1] + R() * size, at[2] + Math.sin(a) * r]), s: size * (.8 + R() * 1.2), rot: R() * 6, c: col, a: .4 * k, kind: 0, seed: R(), age: .2 + R() * .6 }); } }

type S = { a: number; b: number; f: (t: number) => SFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => SFrame) => SH.push({ a, b, f });
const END_A = C[1] - .35;
// A — cold open: asleep, lamp glowing… a rumble, the lamp rattles, cracks race across the floor — the floor drops — CUT TO BLACK
shot(0, C[1], t => { const k = kk(t, 0, END_A); const rum = ss(1.3, 2.0, t); const crack = ss(2.0, 3.4, t); const col = ss(3.5, END_A, t) * .3; const wake = ss(2.4, 3.0, t);
  const S: Sprite[] = []; if (crack > 0) dust([HOLE[0], .1, HOLE[2]], 10, crack, Math.floor(t * 10), S, .5); if (col > 0) dust([HOLE[0], .2, HOLE[2]], 22, 1, Math.floor(t * 14) + 3, S, 1);
  return { t, set: 'home', ...NIGHT, ...INSIDE, sun: MOON(W('home', HOLE), 8, .9), cam: cam('home', [lerp(-3.0, -3.6, k), lerp(1.75, 1.55, k), lerp(-1.9, -2.6, k)], [-6.2, .95, -4.6], lerp(48, 40, k), { roll: rum * Math.sin(t * 30) * .006 }),
    room: { shake: rum + col * 3, crack, collapse: col, lamp: 1 - ss(3.2, 3.5, t) * (Math.sin(t * 40) * .5 + .5) }, sprites: S, shake: rum * .02 + col * .12,
    actors: [act('sleeper', HERO, 'home', [-6.2, .98, -3.65], lyingPose(wake * .6), wake < .5 ? { ...EXPR.calm, eyeOpen: 0, smile: .1 } : expr('confused', 'terrified', ss(3, 3.6, t)), t, { roll: -Math.PI / 2, contact: 0, shadow: false })],
    lights: [{ p: W('home', [-3, 2, -5.9]), c: [.5, .6, 1], i: 1.2, d: 6 }], grade: { ...VIVID, fade: Math.max((1 - ss(0, .5, t)) * .6, ss(END_A - .05, END_A, t)) } }; });
// B — establishing: quiet Florida street at night, the blue house
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]);
  return { t, set: 'home', ...NIGHT, sun: MOON(W('home', [0, 0, 0]), 30), cam: cam('home', [lerp(16, 10, k), lerp(9, 4, k), lerp(26, 22, k)], [-2, 1.6, 0], 44),
    room: { tv: .6 }, grade: { ...VIVID, fade: 1 - ss(C[1], C[1] + .7, t) }, overlay: card('SEFFNER, FLORIDA', '28 FEBRUARY 2013 · ~11 PM', ss(C[1] + .5, C[1] + 1, t) * (1 - ss(C[2] - .4, C[2], t))) }; });
// C — inside, getting ready for bed… a crash; dust blows out of the bedroom doorway
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]); const T1 = C[2] + 1.7; const hit = ss(T1, T1 + .15, t); const walk = Math.min(t - C[2], 1.7) * .9; const S: Sprite[] = [];
  if (t > T1) dust([-3.95, 1, .1], 18, 1 - ss(T1 + 1.5, C[3], t) * .5, Math.floor(t * 12), S, .8);
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [lerp(4.2, 3.8, k), 1.6, 1.4], [-4, 1.3, 1.0], 46), room: { collapse: 1 }, sprites: S, shake: hit * .1 * (1 - ss(T1 + .4, T1 + 1.2, t)),
    lights: [{ p: W('home', HALL), c: [1, .8, .55], i: 9, d: 9 }],
    actors: [act('jeremy', JEREMY, 'home', [lerp(1.6, .2, walk / 1.6), 0, 1.5], t < T1 ? walkPose(walk * 1.4, -1) : pose({ turn: -.6, headTurn: -.3, headLift: .08 * hit, handA: [-.7, -.8], handB: [.6, -.7], shapeA: 'open', shapeB: 'open' }, t, .4), t < T1 ? EXPR.tired : EXPR.shocked, t, { rim: '#ffcf8a' })],
    grade: VIVID }; });
// D — he runs to his brother's room… the room is gone
shot(C[3], C[3] + (C[4] - C[3]) * .5, t => { const k = kk(t, C[3], C[3] + (C[4] - C[3]) * .5); const x = lerp(.2, -3.4, k);
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [x + 2.6, 1.5, 1.7], [x - 1, 1.1, .6], 50), room: { collapse: 1 }, lights: [{ p: W('home', HALL), c: [1, .8, .55], i: 9, d: 9 }],
    actors: [act('jeremy', JEREMY, 'home', [x, 0, 1.1], runPose((t - C[3]) * 5, -1, { fear: .8 }), EXPR.terrified, t, { rim: '#ffcf8a' })], grade: VIVID }; });
shot(C[3] + (C[4] - C[3]) * .5, C[4], t => { const S: Sprite[] = []; dust([HOLE[0], -.5, HOLE[2]], 16, .8, Math.floor(t * 8), S, 1.4);
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [-4.6, 1.5, -1.9], [-3.9, 1.45, -.1], 44), room: { collapse: 1 }, sprites: S,
    lights: [{ p: W('home', HALL), c: [1, .8, .55], i: 9, d: 9 }], actors: [act('jeremy', JEREMY, 'home', [-3.9, 0, .25], pose({ turn: -.1, headLift: .06, handA: [-.75, -1.25], handB: [.8, -1.7], shapeA: 'open', shapeB: 'open', lean: .05 }, t, .3), EXPR.terrified, t, { rim: '#ffcf8a' })],
    grade: VIVID }; });
// E — looking straight down into the hole: ~30 ft across
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]); const S: Sprite[] = []; dust([HOLE[0], -3, HOLE[2]], 4, .35, Math.floor(t * 7), S, 1.2);
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [HOLE[0] + .5, lerp(2.5, 2.2, k), HOLE[2] + 1.6], [HOLE[0], -6, HOLE[2] - .2], lerp(70, 64, k)), room: { collapse: 1 }, sprites: S,
    lights: [{ p: W('home', [-3.9, 2.2, .5]), c: [1, .8, .55], i: 8, d: 10 }, { p: W('home', [HOLE[0], 1.2, HOLE[2]]), c: [.6, .7, 1], i: 2, d: 8 }],
    grade: VIVID, overlay: chip('A HOLE ~30 FT ACROSS', 540, 1320, ss(C[4] + .6, C[4] + 1, t)) }; });
// F — Jeremy goes in after him, digging, calling his brother's name
shot(C[5], C[6], t => { const k = kk(t, C[5], C[6]); const dig = Math.sin(t * 7); const p: V3 = [-3.75, 0, .15]; const S: Sprite[] = []; dust([p[0] - .4, -.6, p[2] - 1.2], 4, .4, Math.floor(t * 9), S, .5);
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [lerp(-6.4, -6.0, k), .4, lerp(-3.4, -3.0, k)], [p[0], -.1, p[2]], 46), room: { collapse: 1 }, sprites: S,
    lights: [{ p: W('home', [-3.9, 2.2, .5]), c: [1, .8, .55], i: 9, d: 10 }],
    actors: [act('jeremy', JEREMY, 'home', p, pose({ turn: -.5, crouch: .85, kneeUp: true, lean: -.45, handA: [-.95, -.15 + dig * .25], handB: [-.6, -.25 - dig * .25], shapeA: 'open', shapeB: 'open', footA: [-.3, -.08], footB: [.35, -.08], headLift: ss(C[5] + 1.5, C[5] + 1.8, t) * .1 }, t, .5), k > .4 ? EXPR.crying : EXPR.terrified, t, { rim: '#ffcf8a' })],
    shake: .015, grade: VIVID }; });
// G — the floor keeps collapsing; a deputy reaches in and pulls him out
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const pull = ss(C[6] + 1.6, C[6] + 2.8, t); const S: Sprite[] = []; dust([-3.6, -.3, -1.0], 14, 1, Math.floor(t * 10), S, .8);
  const jp: V3 = [lerp(-3.75, -3.7, pull), 0, lerp(.15, .8, pull)];
  return { t, set: 'home', ...NIGHT, ...INSIDE, cam: cam('home', [lerp(-1.4, -1.8, k), 1.4, lerp(1.9, 2.2, k)], [-3.7, .4, -.3], 50), room: { collapse: 1 }, sprites: S, shake: .03,
    lights: [{ p: W('home', [-3.9, 2.2, .5]), c: [1, .8, .55], i: 9, d: 10 }, { p: W('home', [-3, 1.2, 1.4]), c: [.9, .95, 1], i: 6 * ss(C[6], C[6] + .4, t), d: 6 }],
    actors: [act('jeremy', JEREMY, 'home', jp, pose({ turn: .3, crouch: .7 * (1 - pull), lean: .15, handA: [.8, -1.8], shapeA: 'open', handB: [-.4, -.9] }, t, .5), EXPR.crying, t, { rim: '#ffcf8a' }),
      act('deputy', DEPUTY, 'home', [lerp(-2.7, -3.1, k), 0, lerp(.9, 1.2, pull)], pose({ turn: -.5, lean: -.25 * (1 - pull), handA: [-.95, -1.6], handB: [-.7, -1.1], shapeA: 'hold', shapeB: 'hold' }, t, .4, 9), EXPR.determined, t, { rim: '#cfe0ff' })],
    grade: VIVID }; });
// H — "so how does the ground just… vanish?" — the camera sinks through the lawn into the ground
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]);
  return { t, set: 'xsec', cam: cam('xsec', [lerp(30, 0, k), lerp(30, -60, k), lerp(90, 300, k)], [0, lerp(0, -110, k), 0], lerp(48, 42, k)), xs: {}, bg: '#0a1020',
    hemi: { sky: '#b8c8ff', ground: '#3a3020', i: 1.2 }, sun: MOON(W('xsec', [0, 0, 0]), 120, 1.4), grade: VIVID }; });
// I — limestone, slightly acidic rainwater, hidden caverns
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]); const S: Sprite[] = []; const R = rng(5);
  for (let i = 0; i < 60; i++) { const ph = (t * .35 + R()) % 1; S.push({ p: W('xsec', [(R() - .5) * 100, -ph * 120 - 5, 21]), s: 3, rot: 0, c: [.4, .75, 1.3], a: .9 * (1 - ph * .6), kind: 2, seed: R(), age: 0 }); }
  return { t, set: 'xsec', cam: cam('xsec', [0, -110, 300], [0, -110, 0], 42), xs: { rain: 1, cavity: lerp(.1, .75, k) }, bg: '#0a1020', sprites: S,
    hemi: { sky: '#b8c8ff', ground: '#3a3020', i: 1.2 }, grade: VIVID,
    overlay: chip('RAINWATER SLOWLY DISSOLVES LIMESTONE', 540, 1500, ss(C[8] + .8, C[8] + 1.2, t), '#5fb8ff') + chip('HIDDEN CAVERN', 540, 1300, ss(C[8] + 2.6, C[8] + 3, t), '#ffd23f') }; });
// J — the soil above holds… until it doesn't (cover collapse; the little house drops)
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const co = ss(C[9] + 1.4, C[10] - .3, t);
  return { t, set: 'xsec', cam: cam('xsec', [lerp(0, 10, k), lerp(-80, -60, k), lerp(300, 270, k)], [0, -70, 0], 42), xs: { cavity: .8, collapse: co }, bg: '#0a1020', shake: co * .3 * (1 - ss(C[10] - .8, C[10], t)),
    hemi: { sky: '#b8c8ff', ground: '#3a3020', i: 1.2 }, grade: VIVID }; });
// K — rescuers search; the ground is too unstable; the search is called off (quiet, wide)
shot(C[10], C[11], t => { const k = kk(t, C[10], C[11]); const crew: ActorState[] = []; const R = rng(3);
  for (let i = 0; i < 5; i++) crew.push(act('cr' + i, i === 4 ? DEPUTY : CREW, 'home', [-8 + i * 2.6 + R(), 0, 6.5 + R() * 2], pose({ turn: -.2 + R() * .4, handA: i % 2 ? [-.7, -1.6] : [-.5, -.9], headTurn: -.3 }, t + i, .6, i + 4), i % 2 ? EXPR.concern : EXPR.sad, t, { rim: '#ff6a6a', rimSide: i % 2 ? 1 : -1 }));
  return { t, set: 'home', ...NIGHT, sun: MOON(W('home', [0, 0, 4]), 30, 1.2), cam: cam('home', [lerp(4, 3, k), lerp(3.2, 2.6, k), lerp(14.5, 13.5, k)], [-4, 1.3, 6.5], 46), room: { collapse: 1 }, vehicles: true, sirens: .9,
    actors: crew, grade: { ...VIVID, sat: 1.1 }, overlay: chip('SEARCH CALLED OFF · GROUND TOO UNSTABLE', 540, 1300, ss(C[10] + .6, C[10] + 1, t), '#ff5a4a') }; });
// L — today: a fenced, empty lot with a memorial… and the ground has opened again, twice
shot(C[11], 60.01, t => { const k = kk(t, C[11], 60); const op = ss(C[11] + 2.4, C[11] + 4.5, t);
  return { t, set: 'home', night: { moon: [-.4, .4, -.8] }, hemi: { sky: '#7a8ad8', ground: '#2a2a3a', i: 1.1 }, fog: { color: '#1a2140', density: .008 }, sun: MOON(W('home', HOLE), 30, 2.6),
    cam: cam('home', [lerp(6, 3, k), lerp(4, 7, k), lerp(13, 10, k)], [HOLE[0] + 1, .3, HOLE[2] + 2], 48), demolished: true, fence: true, reopen: op, room: {},
    lights: [{ p: W('home', [HOLE[0] + 2, 1, 9.5]), c: [1, .75, .45], i: 4, d: 5 }],
    grade: { ...VIVID, fade: ss(59.2, 60, t) },
    overlay: chip('REOPENED · 2015', 540, 1200, ss(C[11] + 2.6, C[11] + 3, t), '#ff5a4a') + chip('REOPENED · 2023', 540, 1310, ss(C[11] + 3.6, C[11] + 4, t), '#ff5a4a') + endCard('IN MEMORY OF JEFF BUSH', 'SEFFNER, FLORIDA · 2013', ss(Math.max(C[11] + 5, 56.5), Math.max(C[11] + 5.6, 57.1), t)) }; });

export function frameAt(n: number): SFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
