// Animation helpers: cast looks, pose builders (foot-planted walks, gestures with anticipation/follow-through), camera paths.
import { type Look, type Pose, STAND, idle, walkPose } from '../ff2d/rig.ts';
import { type Face, expr, type ExprName } from '../ff2d/face.ts';
import { blend, clamp, inOut, mix, outBack, smooth, type V2 } from '../ff2d/motion.ts';
import type { V3 } from './engine.ts';
export { clamp, inOut, mix, smooth, outBack };

export const CAST: Record<string, Look> = {
  host: { outfit: 'hoodie', color: '#d8262b', pants: '#151515' },
  bira: { outfit: 'hoodie', color: '#2e3136', pants: '#1b1b1d' },                         // crew chief
  marcos: { outfit: 'jacket', color: '#2f5f9e', pants: '#26467a' },                      // tunnel engineer (overalls)
  tiago: { outfit: 'jacket', color: '#2a2c30', pants: '#6b5434', hat: 'cap', hair: '#1c1c1c' },   // logistics
  claudio: { outfit: 'jacket', color: '#d7c7a1', pants: '#3a3a3a', hat: 'cap', hair: '#a88f5e' }, // shopfront / driver
  renato: { outfit: 'uniform', color: '#3c4048', pants: '#2a2c30', hat: 'cap', hair: '#202020' }, // lookout
  junior: { outfit: 'jacket', color: '#45484d', pants: '#2b2b2b', glasses: true },        // support
  landlord: { outfit: 'suit', color: '#b9a57e', pants: '#6d5c3e', tie: '#7a2e2e' },
  customer: { outfit: 'dress', color: '#d4609a', pants: '#d4609a', hat: 'bun', hair: '#3a2416' },
  walkerA: { outfit: 'jacket', color: '#4f8a5b', pants: '#2d3a55' }, walkerB: { outfit: 'dress', color: '#e0a23a', pants: '#e0a23a', hat: 'bun', hair: '#2a1a10' },
  walkerC: { outfit: 'suit', color: '#55606e', pants: '#3a414b', tie: '#2f4f7a' }, walkerD: { outfit: 'jacket', color: '#c95f3b', pants: '#30343a', hat: 'cap', hair: '#e8e2d0' },
  cop: { outfit: 'uniform', color: '#2b3d5c', pants: '#1e2a40', hat: 'officer', hair: '#1e2a40' },
  guard: { outfit: 'uniform', color: '#3a4a6a', pants: '#232b3c', hat: 'cap', hair: '#232b3c' },
  clerk: { outfit: 'suit', color: '#5a6470', pants: '#3b424b', tie: '#8a2b2b' },
  clerk2: { outfit: 'dress', color: '#3f6f8f', pants: '#3f6f8f', hat: 'bun', hair: '#5a3a22' },
  clerk3: { outfit: 'lab', color: '#e9e6df', pants: '#3a3f47', glasses: true },
};
export type PoseIn = Partial<Pose> & { arms?: [V2, V2] };
export function pose(t: number, seed: number, o: PoseIn = {}, amt = 1): Pose {
  const id = idle(t, seed, amt); const p: Pose = { ...STAND, ...id, ...o } as Pose;
  if (o.arms) { p.handA = o.arms[0]; p.handB = o.arms[1]; }
  return p;
}
export const P = (a: Pose, b: Pose, k: number): Pose => blend(a, b, clamp(k));
export const F = (a: ExprName | Face, b?: ExprName | Face, k = 0): Face => expr(a, b, clamp(k));
/** classic gesture timing with anticipation (dip) and follow-through settle: 0→1 */
export function gesture(t: number, t0: number, dur: number) {
  const x = (t - t0) / dur; if (x <= 0) return 0; if (x >= 1.4) return 1;
  return x < 1 ? outBack(x, 1.4) : 1;
}
/** walking along a world direction; returns rig pose + world feet position, feet planted (no sliding). */
export function walkAlong(t: number, t0: number, from: V3, to: V3, speed: number, o: { step?: number; carryB?: V2; screenDir?: number; turn?: number } = {}) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]); const tt = Math.max(0, t - t0);
  const d = Math.min(len, tt * speed); const k = len > 0 ? d / len : 0;
  const pos: V3 = [mix(from[0], to[0], k), mix(from[1], to[1], k), mix(from[2], to[2], k)];
  const dir = o.screenDir ?? Math.sign(to[0] - from[0] || 1);
  const moving = d < len;
  const p = moving ? walkPose(d / (0.4167), dir, { step: o.step, carryB: o.carryB, turn: o.turn }) : { ...STAND, turn: (o.turn ?? .78) * dir };
  return { pose: p, pos, moving, d };
}
/** walking straight toward / away from the camera: alternating knee lift and weight shift, feet stay planted */
export function walkFront(dist: number, o: { step?: number; away?: boolean } = {}): Pose {
  const step = o.step ?? .62; const ph = dist / step * Math.PI; const s = Math.sin(ph), c = Math.cos(ph);
  const liftA = Math.max(0, s) * .22, liftB = Math.max(0, -s) * .22;
  return { ...STAND, turn: 0, back: o.away ? 1 : 0, hipX: c * .05, lean: c * .02, crouch: Math.abs(s) * -.03 + .02,
    footA: [-.19, -.08 - liftA], footB: [.19, -.08 - liftB], handA: [-.5 - s * .04, -1.66 + Math.max(0, s) * .1], handB: [.5 - s * .04, -1.66 + Math.max(0, -s) * .1] };
}
/** talking mouth driven by the narration envelope */
export function talk(face: Face, open: number): Face { return { ...face, mOpen: Math.max(face.mOpen, open * .75), mO: face.mO + open * .15 }; }

// ---------------------------------------------------------------------------------------------- camera
export type CamKey = { p: V3; l: V3; f: number };
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
/** smooth Catmull-Rom camera move through keys over [t0,t1] with eased progress */
export function camPath(t: number, t0: number, t1: number, keys: CamKey[], ease: (x: number) => number = inOut) {
  const u = ease(clamp((t - t0) / (t1 - t0))) * (keys.length - 1); const i = Math.min(keys.length - 2, Math.floor(u)), f = u - i;
  const g = (k: number) => keys[Math.max(0, Math.min(keys.length - 1, k))];
  const v = (sel: (c: CamKey) => V3): V3 => [0, 1, 2].map(j => cr(sel(g(i - 1))[j], sel(g(i))[j], sel(g(i + 1))[j], sel(g(i + 2))[j], f)) as V3;
  return { pos: v(c => c.p), look: v(c => c.l), fov: cr(g(i - 1).f, g(i).f, g(i + 1).f, g(i + 2).f, f) };
}
/** gentle operator drift (not shake): sub-centimetre breathing of a hand-held rig */
export function drift(t: number, amt: number, seed = 1): V3 {
  return [Math.sin(t * .7 + seed) * amt, Math.sin(t * .53 + seed * 2) * amt * .7, Math.cos(t * .61 + seed) * amt * .5];
}
export const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const lerp3 = (a: V3, b: V3, k: number): V3 => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
