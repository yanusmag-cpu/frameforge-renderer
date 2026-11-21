// YunoWorld v4 · Film 2 — "Why Soldiers Must Stop Marching on Bridges" (Broughton, 12 April 1831). 60 s, cut to the narration.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { fallPose, swimPose, sitPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, rng, type V3, type Cam, type ActorState, type Sprite } from '../../yw3/core.ts';
import { SET, SPAN, DECK_Y, deckY, type GFrame, type SetName } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, GRADE, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.bridge; const F = 'bridge';
const RIFLE: Look = { outfit: 'uniform', color: '#1f3d2c', pants: '#18281f', hat: 'shako', hair: '#151515', badge: true };
const OFFICER: Look = { ...RIFLE, color: '#24442f', hat: 'shako', beard: 'moustache', beardColor: '#2a1a10', tie: '#c9a24a' };
const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515' };
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
const EVE = { sky: { top: '#3a5fc0', hor: '#ffc08a', sun: [-.6, .22, -.75] as V3 }, hemi: { sky: '#b8b8ff', ground: '#5a6a48', i: 1.0 }, fog: { color: '#e8c8a8', density: .0035 } };
const SUN = (focus: V3, size: number, i = 3.4) => ({ dir: [-.55, .35, .7] as V3, color: '#ffcf90', i, focus: W('river', focus), size });
const STEP = 1.9;                                   // steps per second (quick march)
const bounce = (t: number, amp: number): GFrame['deck'] => ({ amp, phase: Math.PI * STEP * t });
/** The column: ranks of four, all in step (or out of step), riding the deck. */
function column(t: number, deck: GFrame['deck'], x0: number, ranks: number, o: { inStep?: boolean; look?: number; fear?: number; dir?: number } = {}): ActorState[] {
  const out: ActorState[] = []; const dir = o.dir ?? 1; const R = rng(4);
  for (let r = 0; r < ranks; r++) for (let f = 0; f < 4; f++) { const x = x0 - r * 1.35 * dir, z = -1.8 + f * 1.2; const ph = o.inStep === false ? R() * 3 : 0; const dist = (t * STEP + ph) * .7;
    const lookDown = o.look && r === 0 && f === 2 ? o.look : 0;
    out.push(act(`s${r}_${f}`, r === 0 && f === 0 ? OFFICER : RIFLE, 'river', [x, deckY(x, deck), z], { ...walkPose(dist, dir), headTilt: lookDown * .35, headLift: -lookDown * .05, handB: [.55, -1.75], shapeB: 'hold' } as Pose,
      lookDown > .3 ? expr('worried', 'fear', o.fear ?? 0) : EXPR.focused, t, { rim: '#ffcf90' })); }
  return out; }
type S = { a: number; b: number; f: (t: number) => GFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => GFrame) => SH.push({ a, b, f });

// 1 — HOOK: in perfect step… the deck starts to bounce; one rifleman looks down
shot(0, C[1], t => { const k = kk(t, 0, C[1]); const amp = lerp(.04, .42, ss(.5, C[1], t)); const deck = bounce(t, amp); const x0 = -12 + t * 1.3;
  return { t, set: 'river', ...EVE, sun: SUN([x0, DECK_Y, 0], 30), cam: cam('river', [x0 - 3.5 + k * 2, DECK_Y + 1.3 + amp * .3, 8.2], [x0 - 1, DECK_Y + 1.4, 0], lerp(46, 38, k), { roll: Math.sin(t * Math.PI * STEP) * amp * .02 }),
    deck, actors: column(t, deck, x0, 4, { look: ss(2.4, 3.0, t), fear: ss(3, 4, t) }), shake: amp * .05, grade: { ...GRADE, fade: (1 - ss(0, .4, t)) * .5 }, overlay: captions(F, t) }; });
// 2 — every step, the deck dips… low on the planks as the column comes at us
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const deck = bounce(t, .55); const x0 = -4 + (t - C[1]) * 1.3;
  return { t, set: 'river', ...EVE, sun: SUN([x0, DECK_Y, 0], 30), cam: cam('river', [x0 + 6.5 - k, deckY(x0 + 6.5, deck) + .5, .6], [x0, DECK_Y + 1.2, 0], 50), deck, actors: column(t, deck, x0, 4), shake: .02, grade: GRADE, overlay: captions(F, t) }; });
// 3 — establishing: the Irwell, Manchester's mills, a five-year-old iron chain bridge, ~70 riflemen four abreast
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]); const deck = bounce(t, .4); const x0 = 2 + (t - C[2]) * 1.3;
  return { t, set: 'river', ...EVE, sun: SUN([0, 0, 0], 70), cam: cam('river', [lerp(-30, -18, k), lerp(26, 20, k), lerp(46, 40, k)], [2, DECK_Y, 0], 44), deck, actors: column(t, deck, x0, 6),
    grade: GRADE, overlay: chip('ENGLAND · 1831', 260, ss(C[2] + .2, C[2] + .5, t)) + chip('~70 RIFLEMEN · 4 ABREAST', 370, ss(C[2] + 1.6, C[2] + 1.9, t), '#5fd16f') + captions(F, t) }; });
// 4 — a crack: the stay bolt snaps; the west end drops into the river
shot(C[3], C[4], t => { const T1 = wt('bridge', 'crack', 1, C[3] + .9) - .08; const snap = ss(T1, T1 + .15, t); const drop = ss(T1 + .2, T1 + 1.3, t); const deck: GFrame['deck'] = { ...bounce(t, .45 * (1 - drop)), drop, snap };
  const S: Sprite[] = []; if (t > T1 && t < T1 + .4) for (let i = 0; i < 12; i++) S.push({ p: W('river', [-SPAN / 2 - 4.2 + (i - 6) * .05, DECK_Y + 2.1, 3]), s: .3, rot: 0, c: [1.8, 1.3, .7], a: .9, kind: 2, seed: i, age: 0 });
  if (drop > .6) { const R = rng(Math.floor(t * 10)); for (let i = 0; i < 26; i++) S.push({ p: W('river', [-14 + R() * 12, .4 + R() * 2, (R() - .5) * 8]), s: 2 + R() * 2, rot: R() * 6, c: [.92, .96, 1], a: .55, kind: 3, seed: R(), age: R() * .5 }); }
  const x0 = -8 + (T1 - C[2]) * 0; const men = column(t, deck, x0, 5).map((a, i) => { const x = a.pos[0]; const u = (x + SPAN / 2) / SPAN; if (drop < .3 || u > .55) return a; const k = ss(T1 + .3 + (i % 5) * .05, T1 + 1.3, t);
    return { ...a, pos: [x - k * 1.5, lerp(a.pos[1], .3, k * k), a.pos[2]] as V3, pose: fallPose(t * 3 + i, i % 2 ? 1 : -1), face: EXPR.terrified }; });
  const pre = t < T1 + .1;
  return { t, set: 'river', ...EVE, sun: SUN([-10, 3, 0], 50), cam: pre ? cam('river', [-SPAN / 2 - 2.6, DECK_Y + 2.6, 5.4], [-SPAN / 2 - 4.2, DECK_Y + 2.1, 3], 34) : cam('river', [lerp(-6, -4, kk(t, T1, C[4])), lerp(14, 11, kk(t, T1, C[4])), 34], [-12, 3, 0], 46),
    deck, actors: pre ? [] : men, sprites: S, shake: snap * .3 + drop * .2 * (1 - ss(T1 + 1.3, T1 + 2.4, t)), grade: { ...GRADE, flash: snap * (1 - ss(T1 + .15, T1 + .4, t)) * .4 }, overlay: captions(F, t) }; });
// 5 — the question: how can walking break iron? (men swimming for the bank under the hanging deck)
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]); const deck: GFrame['deck'] = { drop: 1, snap: 1 }; const R = rng(8);
  const swim: ActorState[] = []; for (let i = 0; i < 7; i++) swim.push(act('w' + i, RIFLE, 'river', [-16 + R() * 10, -.35, -6 + R() * 10 + (t - C[4]) * .6], swimPose(t + i, { speed: .8 }), EXPR.exhausted, t, { contact: 0, shadow: false }));
  return { t, set: 'river', ...EVE, sun: SUN([-12, 0, 0], 40), cam: cam('river', [lerp(-4, -6, k), 4, 22], [-13, 2.5, 0], 46), deck, actors: swim, grade: { ...GRADE, sat: 1.08 },
    overlay: card('HOW?', '', ss(C[4] + .3, C[4] + .6, t), 330) + captions(F, t) }; });
// 6 — "you see": a bridge is a bit like a swing (our narrator stickman explains)
shot(C[5], C[6], t => { const k = kk(t, C[5], C[6]); const a = Math.sin(t * 2.6) * .12;
  return { t, set: 'demo', hemi: { sky: '#c8b8ff', ground: '#3a3060', i: 1.0 }, fog: { color: '#3a3060', density: .01 }, bg: '#3a3060', sun: { dir: [.5, .7, .6], color: '#ffd9a0', i: 3, focus: W('demo', [0, 2, 0]), size: 8 },
    cam: cam('demo', [lerp(2.2, 1.6, k), 2.4, lerp(8.5, 7.5, k)], [0, 2.1, 0], 42), swing: { angle: a },
    actors: [act('hero', HERO, 'demo', [-2.6, 0, .8], pose({ turn: .4, handA: [-.6, -.9], handB: [1.0, -1.6], shapeB: 'point' }, t, .6), EXPR.excited, t, { rim: '#ffd9a0' })], grade: GRADE, overlay: captions(F, t) }; });
// 7 — random pushes do little; pushes on the beat build a huge swing
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const mid = (C[6] + C[7]) / 2; const tt = t - C[6];
  const rnd = Math.sin(tt * 2.6) * .1 + Math.sin(tt * 4.1 + 1) * .05; const grow = ss(mid, C[7], t); const ang = t < mid ? rnd : Math.sin((t - mid) * 2.6) * lerp(.15, 1.05, grow);
  const pushK = t < mid ? Math.max(0, Math.sin(tt * 3.7)) : Math.max(0, -Math.cos((t - mid) * 2.6)) * (Math.sin((t - mid) * 2.6) < 0 ? 1 : 0);
  return { t, set: 'demo', hemi: { sky: '#c8b8ff', ground: '#3a3060', i: 1.0 }, fog: { color: '#3a3060', density: .01 }, bg: '#3a3060', sun: { dir: [.5, .7, .6], color: '#ffd9a0', i: 3, focus: W('demo', [0, 2, 0]), size: 8 },
    cam: cam('demo', [lerp(1.4, 0, k), 2.4, lerp(8, 9.5, k)], [0, 2, 0], 46), swing: { angle: ang },
    actors: [act('hero', HERO, 'demo', [-1.25, 0, .3], pose({ turn: .6, lean: .25 * pushK, handA: [.9 + .3 * pushK, -1.3], handB: [1.0 + .3 * pushK, -1.2], shapeA: 'open', shapeB: 'open' }, t, .3), t < mid ? EXPR.confused : expr('focused', 'excited', grow), t, { rim: '#ffd9a0' })],
    grade: GRADE, overlay: chip(t < mid ? 'RANDOM PUSHES → TINY SWING' : 'SAME BEAT → BIGGER & BIGGER', 260, 1, t < mid ? '#9aa0b8' : '#ffd23f') + captions(F, t) }; });
// 8 — seventy men, one beat: footfall rings pulse with the deck
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]); const amp = lerp(.3, .6, k); const deck = bounce(t, amp); const x0 = -6 + (t - C[7]) * 1.3; const beat = Math.abs(Math.sin(Math.PI * STEP * t));
  const S: Sprite[] = []; for (let f = 0; f < 4; f++) S.push({ p: W('river', [x0, deckY(x0, deck) + .05, -1.8 + f * 1.2]), s: .9 + (1 - beat) * 1.2, rot: 0, c: [1.4, 1.1, .5], a: .5 * (1 - beat), kind: 4, seed: f, age: 0 });
  return { t, set: 'river', ...EVE, sun: SUN([0, DECK_Y, 0], 40), cam: cam('river', [lerp(-2, 2, k), DECK_Y + 7, 22], [0, DECK_Y + .5, 0], 46), deck, actors: column(t, deck, x0, 5), sprites: S, shake: amp * .03,
    grade: GRADE, overlay: chip('ONE BEAT → ONE PUSH', 260, ss(C[7] + .2, C[7] + .5, t)) + captions(F, t) }; });
// 9 — what investigators found: a badly forged bolt; marching hastened its failure
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]); const sn = ss(C[8] + 2, C[8] + 2.4, t);
  return { t, set: 'river', ...EVE, sun: SUN([-SPAN / 2 - 4, DECK_Y, 3], 6, 2.8), cam: cam('river', [-SPAN / 2 - lerp(2.2, 2.9, k), DECK_Y + 2.5, lerp(5.6, 5.0, k)], [-SPAN / 2 - 4.2, DECK_Y + 2.1, 3], 30), deck: { snap: sn },
    lights: [{ p: W('river', [-SPAN / 2 - 3, DECK_Y + 3, 5]), c: [1, .85, .6], i: 6, d: 6 }], grade: { ...GRADE, vignette: .38 },
    overlay: chip('BADLY FORGED BOLT', 260, ss(C[8] + .3, C[8] + .6, t), '#ff5a4a') + chip('MARCHING SPED UP ITS FAILURE', 370, ss(C[8] + 3, C[8] + 3.3, t)) + captions(F, t) }; });
// 10 — no one killed, twenty injured: on the bank, soaked and hurt, helping each other
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const bank = (x: number, z: number): V3 => [x, 4.0, z];
  const men = [act('b0', RIFLE, 'river', bank(-14, 20.5), { ...sitPose(1), ...idle(t, 2, .4), handA: [-.4, -.9] }, EXPR.exhausted, t), act('b1', OFFICER, 'river', bank(-12.6, 20.2), pose({ turn: -.5, lean: .2, handA: [-.9, -1.0], shapeA: 'open' }, t, .4), EXPR.concern, t),
    act('b2', RIFLE, 'river', bank(-11.4, 21), { ...sitPose(-1), ...idle(t, 5, .4), handB: [.5, -1.2] }, EXPR.tired, t), act('b3', RIFLE, 'river', bank(-15.6, 21.4), pose({ turn: .4, handB: [.6, -.9] }, t, .4, 8), EXPR.relief, t)];
  return { t, set: 'river', ...EVE, sun: SUN([-13, 3, 20], 14), cam: cam('river', [lerp(-9.6, -10.2, k), 5.6, lerp(14.2, 15.2, k)], [-13.2, 4.9, 20.8], 44), deck: { drop: 1, snap: 1 }, actors: men,
    grade: GRADE, overlay: chip('0 KILLED', 260, ss(C[9] + .2, C[9] + .5, t), '#5fd16f') + chip('20 INJURED', 370, ss(C[9] + 1.3, C[9] + 1.6, t), '#ff8a5a') + captions(F, t) }; });
// 11 — the order: crossing a bridge? break step (rebuilt bridge, deck calm, feet out of step)
shot(C[10], C[11], t => { const k = kk(t, C[10], C[11]); const x0 = -8 + (t - C[10]) * 1.2; const BK = wt('bridge', 'break', 2, C[10] + 3); const shout = ss(BK - .35, BK, t);
  const men = column(t, {}, x0, 4, { inStep: false }); men.push(act('off', OFFICER, 'river', [x0 + 2.8, DECK_Y, 2.7], pose({ turn: -.6, handA: [-.9, -1.8], shapeA: 'point', headLift: .06 * shout }, t, .4), shout > .3 ? EXPR.shout : EXPR.determined, t, { rim: '#ffcf90' }));
  return { t, set: 'river', ...EVE, sun: SUN([x0, DECK_Y, 0], 30), cam: cam('river', [x0 + 5.5, DECK_Y + 1.6, lerp(8.5, 7.5, k)], [x0, DECK_Y + 1.2, 0], 44), deck: {}, actors: men, grade: GRADE,
    overlay: card('BREAK STEP!', '', shout * (1 - ss(C[11] - .3, C[11], t)), 330) + captions(F, t) }; });
// 12 — today: the signs are still there (loop: the column crosses again — out of step)
shot(C[11], 60.01, t => { const k = kk(t, C[11], 60); const x0 = 4 + (t - C[11]) * 1.2;
  return { t, set: 'river', ...EVE, sun: SUN([SPAN / 2 + 3, DECK_Y + 2, 3], 10), cam: cam('river', [lerp(SPAN / 2 + 6.5, SPAN / 2 + 8, k), DECK_Y + 2.4, lerp(7.6, 9, k)], [SPAN / 2 + 2.6, DECK_Y + 1.9, 2.6], 40), deck: {},
    actors: column(t, {}, x0, 3, { inStep: false }), sign: 1, grade: { ...GRADE, fade: ss(59.3, 60, t) }, overlay: captions(F, t) }; });

export function frameAt(n: number): GFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
