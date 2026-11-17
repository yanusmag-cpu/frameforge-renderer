// YunoWorld animation-quality test — "The Firefighter Who Started Another Fire". 30.0 s / 900 frames, no dialogue, no music.
// Story told in action: wildfire approaching → crew at the prepared control line → main firefighter lights a controlled burnout with a
// drip torch (second firefighter surprised) → burnout removes the fuel between line and fire (overhead) → the main front stalls and lies
// down at the black band while its flanks keep burning (one tactic, not magic) → second firefighter understands; aerial pull-back.
import * as T from 'three';
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Pose } from '../ff2d/rig.ts';
import type { Frame9 } from './engine9.ts';
import { pose, P, F, camPath, add3, inOut, mix, gesture, type CamKey } from '../brazil/anim.ts';
import { walkPose, HERO } from '../ff2d/rig.ts';
import { clamp, noise1, smooth } from '../ff2d/motion.ts';
import { UNIT } from '../brazil/actor.ts';
import { CAST, type ToonLook, type Held } from '../ff2d/toon.ts';
import type { Face } from '../ff2d/face.ts';
import { H, IG } from './fronts.ts';

export const FPS = 30, DURATION = 30, FRAMES = 900;
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const kk = (t: number, a: number, b: number) => inOut(k01(t, a, b));
const cp = (t: number, t0: number, t1: number, keys: CamKey[], e = inOut) => camPath(t, t0, t1, keys, e);
type Cam = { pos: V3; look: V3; fov: number };
const hand = (c: Cam, t: number, a: number): Cam => ({ ...c, pos: add3(c.pos, [noise1(t * .9, 1) * a, noise1(t * .8, 2) * a * .6, noise1(t * .7, 3) * a * .5]), look: add3(c.look, [noise1(t * .6, 4) * a, noise1(t * .7, 5) * a * .5, 0]) });
const LA = CAST.ffMain as ToonLook, LB = CAST.ffSecond as ToonLook;
const SC = .86;   // cut-out scale → firefighters ≈ 1.8 m
const sy = (l: ToonLook) => (l.leg + l.torso) / 3.05, sxF = (l: ToonLook) => 1 + l.belly * .12 + (l.shoulder - .5) * .4;
const Hm = (l: ToonLook, x: number, y: number): [number, number] => [x / (UNIT * SC) / sxF(l), -y / (UNIT * SC) / sy(l)];
const g = (x: number, z: number): V3 => [x, H(x, z), z];
type Act = { id: string; L: ToonLook; pose: Pose; pos: V3; t: number; face?: Face; heldA?: Held; heldB?: Held; torchLit?: number; heldAng?: number; res?: number; tint?: [number, number, number]; seed?: number };
const actor = (a: Act): ActorState => ({ id: a.id, look: HERO, toon: a.L, pose: a.pose, pos: a.pos, t: a.t, face: a.face ?? F('neutral'), heldA: a.heldA, heldB: a.heldB,
  toonOpts: { torchLit: a.torchLit, heldAng: a.heldAng }, scale: SC, res: a.res ?? 1400, tint: a.tint ?? TINT, seed: a.seed ?? 3, contact: .85, lean: .2 } as ActorState);
const TINT: [number, number, number] = [.94, .85, .76];
/** walk with planted feet; dist in metres */
const walk = (l: ToonLook, dist: number, dir: number, o: { turn?: number; carryB?: [number, number] } = {}) => walkPose(dist / (UNIT * SC * sy(l)), dir, { step: .6, turn: o.turn, carryB: o.carryB });

// ---------------------------------------------------------------------------------------------------------------- light
const FIRE = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#4f6a8e', '#e89a5a'], sun: { dir: [-.55, .3, -.78], color: '#ffb36e', int: 3.4, focus, size: 40 },
  hemi: ['#7d97c0', '#4a3a2c', .75], amb: ['#9fb4d6', .12], fog: ['#c08a62', .0065], env: .6, sunGlow: 1.6, ...o });
const GRADE = { exposure: .98, bloom: .3, bloomTh: 1.25, sat: 1.06, contrast: 1.1, lift: [.0, .012, .035] as [number, number, number], gain: [1.05, .99, .93] as [number, number, number], vignette: .4, grain: .025 };

// ---------------------------------------------------------------------------------------------------------------- blocking
const A0: V3 = g(3.6, .7), B0: V3 = g(6.1, 1.7);
/** main firefighter's x while lighting: his torch spout leads the ignition point by design */
const xIgn = (t: number) => IG.x0 - IG.speed * Math.max(0, t - IG.t0);
const xA = (t: number) => t < IG.t0 ? 3.6 : Math.max(IG.x1, xIgn(t)) + .55;

type Shot = { t0: number; t1: number; f: (t: number) => Frame9 };
/** rel: camera heights given above local ground (close coverage on uneven terrain) */
const base = (t: number, cam0: Cam, o: Partial<Frame9> & { rel?: boolean } = {}): Frame9 => {
  const cam = o.rel ? { ...cam0, pos: [cam0.pos[0], cam0.pos[1] + H(cam0.pos[0], cam0.pos[2]), cam0.pos[2]] as V3, look: [cam0.look[0], cam0.look[1] + H(cam0.look[0], cam0.look[2]), cam0.look[2]] as V3 } : cam0;
  return { t, fireT: t, cam, light: FIRE([cam.look[0], 0, cam.look[2]]), grade: { ...GRADE, ...(o.grade ?? {}) }, ...o } as Frame9;
};
const truck = { name: 'Engine', pos: g(14.5, 9.5), rot: [0, Math.PI / 2 + .25, 0] as V3 };

// main firefighter pose & props through the sequence (shared by every camera so continuity holds)
function mainFF(t: number): { act: ActorState; torch: T.Vector3 | null } {
  const heldB: Held | undefined = 'driptorch';
  let pz: Pose, face: Face = F('determined'), heldA: Held | undefined, lit = 0, ang = 0, pos = A0;
  if (t < 6.3) {   // watches the wildfire (back to camera), weight shifts
    pz = pose(t, 2, { back: 1, turn: 0, headTurn: Math.sin(t * .7) * .15, arms: [Hm(LA, -.38, .82), Hm(LA, .42, .8)], shapeA: 'fist', shapeB: 'hold' }); face = F('focused');
  } else if (t < 7.3) {   // turns to the unburned fuel by the line
    const k = kk(t, 6.3, 7.1);
    pz = P(pose(t, 2, { back: 1, turn: 0, arms: [Hm(LA, -.38, .82), Hm(LA, .42, .8)], shapeB: 'hold' }), pose(t, 2, { turn: -.55, headTurn: -.2, arms: [Hm(LA, -.35, .85), Hm(LA, .45, .8)], shapeB: 'hold' }), k);
    face = F('focused', 'determined', k);
  } else if (t < 10.6) {   // prepares the drip torch: lift, flip spout, light the wick with a fusee
    const lift = kk(t, 7.3, 7.9), light = gesture(t, 8.6, .45); lit = k01(t, 9.05, 9.35);
    pz = pose(t, 2, { turn: -.45, headTurn: light > 0 ? .25 : 0, headTilt: .08 * lift, lean: .03 * lift,
      arms: [light > 0 || (t > 8.3 && t < 9.4) ? Hm(LA, .32, mix(1.0, 1.08, light)) : Hm(LA, -.35, .85), Hm(LA, mix(.42, .36, lift), mix(.8, 1.0, lift))], shapeA: t > 8.3 && t < 9.4 ? 'hold' : 'fist', shapeB: 'hold', bendA: -1 });
    heldA = t > 8.3 && t < 9.45 ? 'fusee' : undefined; ang = mix(0, -25, lift); face = t < 9.3 ? F('focused') : F('determined', 'confident', k01(t, 9.3, 9.8));
  } else if (t < 15.6) {   // walks the line, tipping the torch: drips of burning fuel ignite the fuel bed
    const x = xA(t), d = 3.6 - x; pos = g(x, .55); const going = t < IG.t0 + (IG.x0 - IG.x1) / IG.speed;
    pz = going ? { ...walk(LA, d, -1, { turn: -.75 }), handB: Hm(LA, -.5, .95), bendB: -1, shapeB: 'hold' } : pose(t, 2, { turn: -.6, arms: [Hm(LA, -.35, .85), Hm(LA, -.4, .95)], shapeB: 'hold', bendB: -1 });
    lit = 1; ang = 30; face = F('focused', 'determined', .5);
  } else {   // after: steps back to the crew, watching his burn
    pos = g(4.4, .7); pz = pose(t, 2, { turn: -.35, arms: [Hm(LA, -.35, .85), Hm(LA, .42, .8)], shapeB: 'hold' }); lit = Math.max(0, 1 - k01(t, 15.6, 16.2)); face = F('calm', 'confident', .6);
  }
  const torch = lit > 0 ? new T.Vector3(pos[0] - .7, pos[1] + .5, pos[2] - .5) : null;
  return { act: actor({ id: 'A', L: LA, pose: pz, pos, t, face, heldA, heldB, torchLit: lit, heldAng: ang, res: 1500 }), torch };
}
function secondFF(t: number, o: { face?: Face; pz?: Pose } = {}): ActorState {
  return actor({ id: 'B', L: LB, pos: B0, t, seed: 9, face: o.face ?? F('curious'), pose: o.pz ?? pose(t, 9, { turn: -.4, arms: [Hm(LB, -.36, .8), Hm(LB, .36, .8)], shapeA: 'fist', shapeB: 'fist' }), res: 1500 });
}

const S: Shot[] = [
  // 1 ─ 0–5  through the forest toward the glow; the crew at the prepared control line
  { t0: 0, t1: 5, f: t => {
    const cam = cp(t, 0, 5, [{ p: [2.2, 5.5, 46], l: [2, 9, -60], f: 52 }, { p: [2.4, 3.6, 24], l: [3, 6, -60], f: 50 }, { p: [3.0, 2.15, 9.2], l: [4.5, 2.2, -40], f: 46 }], smooth);
    const m = mainFF(t);
    return base(t, hand(cam, t, .05), { actors: [m.act, secondFF(t, { pz: pose(t, 9, { back: 1, turn: 0, headTurn: .2, arms: [Hm(LB, -.36, .8), Hm(LB, .36, .8)] }) })],
      props: [truck], godrays: 1, grade: { fade: .75 * (1 - k01(t, 0, .7)), focus: 12, aperture: .1 } });
  } },
  // 2 ─ 5–10  he reads the fire, turns to the fuel beside the line, readies and lights the drip torch; she watches
  { t0: 5, t1: 10.0, f: t => {
    const m = mainFF(t);
    const cam = t < 7.2 ? cp(t, 5, 7.2, [{ p: [7.9, 2.3, 4.9], l: [3.0, 1.2, -1.6], f: 42 }, { p: [7.4, 2.2, 4.4], l: [3.2, 1.2, -1.4], f: 39 }])
      : cp(t, 7.2, 10, [{ p: [3.1, 1.5, -3.2], l: [3.6, 1.35, .6], f: 36 }, { p: [3.25, 1.45, -2.6], l: [3.55, 1.3, .6], f: 32 }]);
    const watch = secondFF(t, { face: F('curious', 'suspicious', k01(t, 8.4, 9.2) * .6), pz: t < 7.2 ? pose(t, 9, { back: 1, turn: .2, headTurn: -.3, arms: [Hm(LB, -.36, .8), Hm(LB, .36, .8)] }) : pose(t, 9, { turn: -.35, headTurn: .2, arms: [Hm(LB, -.36, .8), Hm(LB, .36, .8)] }) });
    return base(t, hand(cam, t, .01), { rel: true, actors: [m.act, watch], torch: m.torch, props: [truck], grade: { focus: t < 7.2 ? 5.6 : 3.6, aperture: t < 7.2 ? .3 : .6, exposure: t < 7.2 ? 1.12 : 1 } });
  } },
  // 3 ─ 10–15  the burnout begins: drips ignite a small line of fire; she is startled; push in on the flames consuming the dry fuel
  { t0: 10.0, t1: 15.0, f: t => {
    const m = mainFF(t);
    let cam: Cam, acts: ActorState[];
    if (t < 11.7) { cam = cp(t, 10, 11.7, [{ p: [6.2, 1.55, 4.2], l: [2.0, .7, -2.2], f: 42 }, { p: [5.2, 1.45, 3.8], l: [1.0, .7, -2.2], f: 40 }]); acts = [m.act, secondFF(t)]; }
    else if (t < 13.0) {
      const sh = k01(t, 11.85, 12.05);
      cam = cp(t, 11.7, 13.0, [{ p: [6.3, 1.55, -.9], l: [6.1, 1.5, 1.7], f: 32 }, { p: [6.27, 1.55, -.6], l: [6.1, 1.5, 1.7], f: 29 }]);
      acts = [secondFF(t, { face: F('curious', 'shocked', sh), pz: pose(t, 9, { turn: -.2, headLift: .06 * sh, lean: -.05 * sh, arms: [Hm(LB, mix(-.36, -.25, sh), mix(.8, 1.3, sh)), Hm(LB, mix(.36, .28, sh), mix(.8, 1.25, sh))], shapeA: sh > .5 ? 'open' : 'fist', shapeB: sh > .5 ? 'open' : 'fist', bendA: -1, bendB: -1 }) })];
    } else { const k = kk(t, 13, 15), xa = xA(t); cam = { pos: [xa + mix(1.6, 1.2, k), mix(2.3, 1.7, k), mix(8.6, 6.0, k)], look: [xa + .1, .8, -1.6], fov: mix(48, 42, k) }; acts = [m.act]; }
    return base(t, t < 11.7 || t > 13 ? hand(cam, t, .015) : cam, { rel: true, actors: acts, torch: m.torch, props: [truck], grade: { focus: t < 11.7 ? 4.2 : t < 13 ? 2.4 : 6, aperture: .35, exposure: t > 13 ? .86 : .98 } });
  } },
  // 4 ─ 15–20  overhead: the black band grows from the line toward the wildfire — the fuel is gone
  { t0: 15.0, t1: 20.0, f: t => {
    const cam = cp(t, 15, 20, [{ p: [4, 62, 6], l: [2, 0, -16], f: 50 }, { p: [-3, 70, 4], l: [0, 0, -18], f: 50 }], smooth);
    const m = mainFF(t);
    return base(t, cam, { actors: [m.act, secondFF(t, { face: F('curious', 'worried', .4) })], props: [truck], torch: m.torch, smokeK: .45, embersK: .3, grade: { bloom: .3 } });
  } },
  // 5 ─ 20–25  the main front reaches the burned band and lies down; its flanks still burn
  { t0: 20.0, t1: 25.0, f: t => {
    const cam = cp(t, 20, 25, [{ p: [-40, 5.5, 2], l: [-22, 2.4, -13], f: 44 }, { p: [-37, 4.8, 0], l: [-20, 2.2, -13], f: 42 }], smooth);
    return base(t, hand(cam, t, .03), { props: [truck], grade: { focus: 25, aperture: .15 } });
  } },
  // 6 ─ 25–30  she understands — a grin and a thumbs-up; pull back to the aerial wide and hold
  { t0: 25.0, t1: 30.0, f: t => {
    const und = k01(t, 25.4, 25.9), thumb = kk(t, 26.0, 26.35), nodA = t > 26.4 && t < 27.2 ? Math.sin((t - 26.4) * 12) * .08 : 0;
    const Bp = pose(t, 9, { turn: -.55, headTurn: und > .5 ? -.25 : .3, arms: [Hm(LB, -.36, .8), thumb > 0 ? Hm(LB, mix(.36, .5, thumb), mix(.8, 1.45, thumb)) : Hm(LB, .36, .8)], shapeB: thumb > .5 ? 'thumb' : 'fist', bendB: -1 });
    const Ap = pose(t, 2, { turn: .55, headTilt: nodA, arms: [Hm(LA, -.35, .85), Hm(LA, .42, .8)], shapeB: 'hold' });
    const k1: CamKey = { p: [5.4, 1.75, -5.2], l: [5.15, 1.45, 1.2], f: 40 };
    const cam = t < 26.6 ? cp(t, 25, 26.6, [{ p: [5.3, 1.6, -4.6], l: [5.15, 1.45, 1.2], f: 40 }, k1]) : cp(t, 26.6, 29.2, [k1, { p: [14, 14, 6], l: [-2, 0, -10], f: 46 }, { p: [34, 34, 22], l: [-6, 0, -16], f: 48 }]);
    return base(t, hand(cam, t, .01), { actors: [actor({ id: 'A', L: LA, pose: Ap, pos: g(4.2, .9), t, face: F('happy', 'confident', .5), heldB: 'driptorch', res: 1500 }),
      secondFF(t, { face: und < .5 ? F('curious', 'surprise', .3) : F('happy', 'excited', thumb * .5), pz: Bp })], props: [truck], rel: t < 26.6, smokeK: t < 26.6 ? 1 : .22, embersK: t < 26.6 ? 1 : .25, grade: { focus: t < 26.6 ? 3.6 : 40, aperture: t < 26.6 ? .6 : 0 } });
  } },
];

export function frameAt(frame: number): Frame9 {
  const t = Math.min(frame, FRAMES - 1) / FPS; const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
