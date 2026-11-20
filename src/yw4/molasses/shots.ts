// YunoWorld v3 · Film 2 — "The Day a City Was Flooded With Molasses" (Boston, 15 Jan 1919). 60 s, cut to the narration cues.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { runPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState } from '../../yw3/core.ts';
import { TANK, TANK_H, type MFrame } from './engine.ts';
import { CUES } from '../cues.ts';
import { card, chip, endCard, hookWord } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.molasses;
const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515', hat: 'cap', hair: '#3a2a20' };
const COATS: Look[] = [{ outfit: 'coat', color: '#3c4a6a', pants: '#2a2a30', hat: 'cap', hair: '#2a2420' }, { outfit: 'coat', color: '#6a4a3a', pants: '#2b2b2b', hairStyle: 'sidepart', hair: '#3a2a20', beard: 'moustache' },
  { outfit: 'dress', color: '#2f5c6a', pants: '#2b2b2b', hairStyle: 'bun', hair: '#5a3a26' }, { outfit: 'vest', color: '#7a5a3a', pants: '#333', inner: '#e8e0d0', hat: 'cap', hair: '#6a4a2a' }];
const SAILOR: Look = { outfit: 'uniform', color: '#f2f0ea', pants: '#f2f0ea', hat: 'cap', hair: '#2a2420' };
const POLICE: Look = { outfit: 'uniform', color: '#1f2c4a', pants: '#1f2c4a', hat: 'officer', badge: true, hair: '#1a1a1a' };
const NURSE: Look = { outfit: 'dress', color: '#f4f2ee', pants: '#2b2b2b', hairStyle: 'bun', hair: '#5a3a26', streak: '#d8262b' };
const cam = (pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos, look, fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos, t, res: 1024, ...o });
const SD: V3 = [-.5, .72, -.48];
const NOON = { sky: { top: '#2a76d6', hor: '#f4dfbd', sun: SD }, hemi: { sky: '#d6e8ff', ground: '#a08a6a', i: 1.5 }, fill: { color: '#ffe6c4', i: .5 }, fog: { color: '#eadbc4', density: .0006 } };
const SUN = (focus: V3, size: number, i = 3.4) => ({ dir: SD, color: '#fff0d6', i, focus, size });
const VIVID = { sat: 1.18, contrast: 1.12, bloom: .2, bloomTh: 1.5, vignette: .26, exposure: .97 };
const speed = 15.6;                              // ~35 mph in m/s
const T0 = C[5] + 1.3;                           // moment the tank fails (inside the "rivets popping" line)
const Rw = (t: number) => Math.max(0, (t - T0) * speed * (1 - .35 * ss(T0, T0 + 14, t)) + 2);   // front radius
// story-time remap for the cold-open: the hook shows the wave at the street corner where the hero walks
function goo(at: V3, n: number, k: number, seed: number, S: Sprite[], size = 1.2) { const R = rng(seed); for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * size * 2.5;
  S.push({ p: [at[0] + Math.cos(a) * r, at[1] + R() * size * 2, at[2] + Math.sin(a) * r], s: size * (.25 + R() * .45), rot: R() * 6, c: [.32, .13, .03], a: .85 * k, kind: 3, seed: R(), age: R() * .3 }); } }
const crowd = (t: number, x0: number, n: number, flee = 0): ActorState[] => { const R = rng(7); const out: ActorState[] = [];
  for (let i = 0; i < n; i++) { const z = (R() - .5) * 14, x = x0 - R() * 60, dir = R() < .5 ? -1 : 1; const d = t * 1.3 + i * 3;
    out.push(act('p' + i, COATS[i % 4], [flee ? x - flee * (t * 5.5) : x + dir * (d % 10) * .2, 0, z], flee ? runPose(t * 5.5 + i, -1, { fear: 1 }) : walkPose(d, dir), flee ? EXPR.terrified : EXPR.neutral, t, { scale: 1 })); }
  return out; };

type S = { a: number; b: number; f: (t: number) => MFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => MFrame) => SH.push({ a, b, f });

// A — hook: a sunny lunchtime walk; a metallic crack; he turns… a brown wave fills the street
shot(0, C[1], t => { const turn = ss(1.9, 2.5, t); const walk = Math.min(t, 2.1) * 1.35; const x = -20 - walk; const hx: V3 = [x, 0, 7.2];
  const R = lerp(0, 168, ss(2.3, C[1], t)) ;                                                           // the wave arrives from the tank end
  const cP: V3 = turn < .5 ? [x - 4.2, 1.7, 11.5] : [lerp(x - 4.2, x - 3, turn), lerp(1.7, 1.2, turn), lerp(11.5, 9.5, turn)];
  return { t, ...NOON, sun: SUN(hx, 40), cam: cam(cP, [lerp(x - 1, x + 6, turn), lerp(1.6, 3.4, turn), lerp(7.2, 4, turn)], lerp(40, 46, turn), { roll: turn * .02 }),
    wave: { R, H: 8 }, props: 1, actors: [act('hero', HERO, hx, turn < .4 ? walkPose(walk, -1) : pose({ turn: .55, headTurn: .5, headLift: .06 * turn, handA: [-.65, -.75], handB: [.75, -.6], shapeA: 'open', shapeB: 'open', lean: -.05 }, t, .4), turn < .4 ? EXPR.happy : expr('surprise', 'terror', ss(2.5, 3.4, t)), t, { rim: '#ffe7c0', rimSide: 1 }),
      ...crowd(t, -10, 6, ss(2.8, 3.4, t))], shake: ss(1.9, 2.1, t) * (1 - ss(2.1, 2.6, t)) * .06 + ss(3.4, C[1], t) * .05, grade: { ...VIVID, fade: (1 - ss(0, .45, t)) * .5 } }; });
// B — "It's not water. It's molasses." the glossy lip rolls straight at the lens
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const R = 158 + (t - C[1]) * 6; const S: Sprite[] = []; goo([TANK[0] - R + 1, 6, 0], 22, 1, Math.floor(t * 12), S, 1.4);
  return { t, ...NOON, sun: SUN([-10, 0, 0], 40), cam: cam([TANK[0] - R - lerp(9, 6, k), lerp(2.2, 3.6, k), lerp(-3, -2, k)], [TANK[0] - R + 6, 5, 0], 54, { roll: -.03 }), wave: { R, H: 9 }, props: 1, sprites: S, shake: .05,
    grade: { ...VIVID, sat: 1.25 }, overlay: hookWord('MOLASSES', ss(C[1] + .7, C[1] + 1.0, t), '#e9a13b') }; });
// C — SMASH CUT to the flashback: an ordinary, sunny North End lunchtime; the giant tank by the harbour
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]);
  return { t, ...NOON, sun: SUN([60, 0, 0], 260, 3.4), cam: cam([lerp(-80, -40, k), lerp(70, 58, k), lerp(-130, -110, k)], [90, 6, 10], 44), wave: { R: 0 },
    actors: crowd(t, -10, 10), grade: { ...VIVID, flash: (1 - ss(C[2], C[2] + .18, t)) * .9 }, overlay: card('BOSTON', 'NORTH END · 15 JANUARY 1919', ss(C[2] + .2, C[2] + .7, t) * (1 - ss(C[3] - .4, C[3], t))) }; });
// D — the tank: 50 ft tall, 2.3 million US gallons (low angle, slow push)
shot(C[3], C[4], t => { const k = kk(t, C[3], C[4]);
  return { t, ...NOON, sun: SUN(TANK, 80), cam: cam([TANK[0] - lerp(44, 36, k), lerp(1.8, 2.6, k), TANK[2] - lerp(4, 2, k)], [TANK[0], lerp(9, 11, k), TANK[2]], 50), wave: { R: 0 }, tank: { burst: 0, leak: .3 },
    actors: crowd(t, 120, 4), grade: VIVID, overlay: chip('50 FT TALL · 90 FT WIDE', 540, 1180, ss(C[3] + .4, C[3] + .8, t)) + chip('2.3 MILLION US GALLONS', 540, 1290, ss(C[3] + 1.4, C[3] + 1.8, t), '#e9a13b') }; });
// E — it leaked; painted brown to hide the streaks (close on the seams)
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]);
  return { t, ...NOON, sun: SUN(TANK, 60), cam: cam([TANK[0] - 28, lerp(3, 6, k), TANK[2] + lerp(-14, -10, k)], [TANK[0] - 11, lerp(5, 8, k), TANK[2] - 6], 34), wave: { R: 0 }, tank: { burst: 0, leak: ss(C[4], C[4] + 1.5, t) },
    grade: VIVID, overlay: chip('LEAKS · PAINTED BROWN TO HIDE THEM', 540, 1250, ss(C[4] + .8, C[4] + 1.2, t), '#e9a13b') }; });
// F — rivets pop like gunfire, the seams split and the tank bursts apart
shot(C[5], C[6], t => { const k = kk(t, C[5], C[6]); const S: Sprite[] = []; const R = rng(Math.floor(t * 20)); const pop = ss(C[5], T0, t);
  for (let i = 0; i < 6 * pop; i++) { const a = R() * 6.28, y = R() * TANK_H; S.push({ p: [TANK[0] + Math.cos(a) * 13.9, y, TANK[2] + Math.sin(a) * 13.9], s: .5 + R() * .4, rot: 0, c: [1.6, 1.1, .6], a: .9, kind: 2, seed: R(), age: 0 }); }
  if (t > T0) goo([TANK[0] - 12, 6, 0], 34, 1, Math.floor(t * 14), S, 2.6);
  return { t, ...NOON, sun: SUN(TANK, 90), cam: cam([TANK[0] - lerp(50, 54, k), lerp(4, 7, k), TANK[2] - lerp(5, 6, k)], [TANK[0], 7, TANK[2]], 50), tank: { burst: ss(T0, T0 + 1.8, t), leak: 1, crack: pop }, wave: { R: Rw(t), H: 11 }, props: 1,
    shake: pop * .06 + ss(T0, T0 + .3, t) * .2 * (1 - ss(T0 + .6, T0 + 2, t)), grade: { ...VIVID, flash: ss(T0, T0 + .08, t) * (1 - ss(T0 + .08, T0 + .4, t)) * .5 } }; });
// G — the wave tears down Commercial Street (tracking ahead of it)
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const R = 70 + (t - C[6]) * speed; const fx = TANK[0] - R; const S: Sprite[] = []; goo([fx + 1, 5, 0], 26, 1, Math.floor(t * 12), S, 1.8);
  return { t, ...NOON, sun: SUN([fx, 0, 0], 60), cam: cam([fx - 24, lerp(11, 7, k), lerp(-6.5, -5.5, k)], [fx + 4, 4, 0], 52), wave: { R, H: 8 }, props: 1, sprites: S, el: ss(C[6] + 3, C[7], t) * .6,
    actors: crowd(t, fx - 8, 8, 1).map(a => ({ ...a, pos: [Math.min(a.pos[0], fx - 3), 0, a.pos[2]] as V3 })), shake: .04, grade: VIVID,
    overlay: chip('UP TO 25 FT HIGH', 540, 1180, ss(C[6] + .5, C[6] + .9, t), '#e9a13b') + chip('~35 MPH', 540, 1290, ss(C[6] + 1.6, C[6] + 2, t), '#e9a13b') }; });
// H — buildings crushed, the elevated railway's steel twisted
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]); const S: Sprite[] = []; goo([105, 7, 0], 20, 1, Math.floor(t * 10), S, 2); goo([108, 2, 22], 16, 1, Math.floor(t * 9) + 7, S, 2);
  return { t, ...NOON, sun: SUN([105, 0, -5], 60), cam: cam([lerp(84, 88, k), lerp(3, 4, k), lerp(-6, -5, k)], [110, 6, 14], 52), wave: { R: 120, H: 7, settle: .2 }, el: lerp(.6, 1, k), house: ss(C[7], C[7] + 1.8, t), props: 1, sprites: S, shake: .05, grade: VIVID }; });
// I — "here's what made it so deadly": the cold thickens it like glue (macro on the slowing surface)
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]);
  return { t, ...NOON, sun: SUN([20, 0, 4], 30), cam: cam([lerp(14, 12, k), lerp(4.5, 2.6, k), lerp(9, 7, k)], [20, .6, 2], 36), wave: { R: 150, H: 5, settle: .6 + k * .3, stiff: ss(C[8] + 1, C[9], t) },
    grade: { ...VIVID, sat: 1.1, gain: [.96, 1, 1.06] }, overlay: chip('FREEZING AIR · THICK AS GLUE', 540, 1250, ss(C[8] + 1.6, C[8] + 2, t), '#8fc7ff') }; });
// J — anyone caught couldn't get free: a wagon mired, a hat on the surface, an arm reaching (no injury shown)
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const p: V3 = [32, -.45, 3];
  return { t, ...NOON, sky: { top: '#3a6ab0', hor: '#e9c79c', sun: [.25, .3, -.9] }, sun: SUN(p, 25, 2.6), cam: cam([p[0] + lerp(5, 4, k), 2.2, p[2] + lerp(5.5, 4.6, k)], [p[0], .9, p[2]], 40), wave: { R: 150, H: 5, settle: .92, stiff: 1 },
    actors: [act('stuck', COATS[0], p, pose({ turn: .3, handA: [-.9, -2.0 + Math.sin(t * 2) * .1], handB: [.8, -1.4], shapeA: 'open', shapeB: 'open', lean: .12, headLift: .05 }, t, .3, 6), EXPR.terrified, t, { contact: 0, shadow: false })],
    grade: { ...VIVID, sat: 1.05, vignette: .4 } }; });
// K — sailors, police and Red Cross nurses wade in to help
shot(C[10], C[11], t => { const k = kk(t, C[10], C[11]); const wade = (t - C[10]) * .8; const team: ActorState[] = [
    act('s1', SAILOR, [24 + wade, -.15, 1], walkPose(wade * 1.2, 1, { step: .4 }), EXPR.determined, t), act('s2', SAILOR, [22 + wade, -.15, -1.4], walkPose(wade * 1.2 + 1, 1, { step: .4 }), EXPR.focused, t),
    act('po', POLICE, [25.5 + wade, -.15, 3], pose({ turn: .6, handA: [.9, -1.1], handB: [1.2, -1.2], shapeA: 'hold', shapeB: 'hold', lean: .2 }, t, .5, 2), EXPR.determined, t),
    act('nu', NURSE, [20 + wade * .7, 0, 4], pose({ turn: .5, handB: [.8, -1.5], shapeB: 'open' }, t, .5, 5), EXPR.concern, t)];
  return { t, ...NOON, sky: { top: '#3a6ab0', hor: '#f0c890', sun: [.25, .28, -.9] }, sun: { dir: [.25, .28, -.9], color: '#ffd8a0', i: 3, focus: [24, 0, 1], size: 30 }, cam: cam([lerp(30, 31, k), 2.4, lerp(7.6, 7, k)], [24 + wade, 1.2, 1.5], 46),
    wave: { R: 150, H: 5, settle: .95, stiff: 1 }, props: 1, actors: team, grade: VIVID, overlay: chip('SAILORS · POLICE · RED CROSS', 540, 1260, ss(C[10] + .3, C[10] + .7, t), '#ff5a4a') }; });
// L — the human cost, said plainly (dusk on the ruined street)
shot(C[11], C[12], t => { const k = kk(t, C[11], C[12]);
  return { t, sky: { top: '#2b3f7a', hor: '#f0a070', sun: [.6, .08, -.8] }, hemi: { sky: '#8aa0d0', ground: '#4a3a30', i: .8 }, fog: { color: '#d8a080', density: .002 }, sun: { dir: [-.8, .25, -.2], color: '#ff9a5a', i: 2.8, focus: [60, 0, 0], size: 140 },
    cam: cam([lerp(-30, -20, k), lerp(11, 10, k), lerp(-6, -5, k)], [60, 3, 0], 46), wave: { R: 150, H: 4, settle: 1, stiff: 1 }, el: 1, house: 1, props: 1, tank: { burst: 1 },
    lights: [{ p: [0, 4.6, 9], c: [1, .75, .4], i: 30, d: 18 }, { p: [-22, 4.6, -9], c: [1, .75, .4], i: 30, d: 18 }, { p: [44, 4.6, 9], c: [1, .75, .4], i: 30, d: 18 }],
    grade: { ...VIVID, sat: 1.05, vignette: .4 }, overlay: endCard('21 PEOPLE DIED', 'ABOUT 150 WERE INJURED', ss(C[11] + .3, C[11] + .9, t)) }; });
// M — it sounds unbelievable, but it was real: harbour sunset, end line
shot(C[12], 60.01, t => { const k = kk(t, C[12], 60);
  return { t, sky: { top: '#1f3f8a', hor: '#ffb070', sun: [.7, .06, .7] }, hemi: { sky: '#ffcf9a', ground: '#3a3040', i: .9 }, fog: { color: '#ffb888', density: .0005 }, sun: { dir: [.7, .12, .7], color: '#ffa860', i: 2.8, focus: [200, 0, 80], size: 200 },
    cam: cam([lerp(120, 100, k), lerp(30, 46, k), lerp(-90, -120, k)], [220, 4, 90], 44), wave: { R: 0 }, tank: { burst: 1 }, el: 1, house: 1,
    grade: { ...VIVID, fade: ss(59.2, 60, t) }, overlay: endCard('IT WAS REAL', 'AND IT CHANGED BUILDING SAFETY RULES FOR GOOD', ss(C[12] + 1.2, C[12] + 1.9, t)) }; });

export function frameAt(n: number): MFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
