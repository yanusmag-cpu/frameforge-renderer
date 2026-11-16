// Full-body action poses for the FrameForge stickman (rig units: 1 = head diameter, y negative = up, feet at y≈-0.08).
// Each returns a Pose; vertical body travel (jump arcs, falls) is applied by the caller to the actor's world position.
import { type Pose, STAND } from './rig.ts';
import { clamp, mix, type V2 } from './motion.ts';

const S = (o: Partial<Pose>): Pose => ({ ...STAND, ...o } as Pose);
const tau = Math.PI * 2;

/** sprint: flight phase, high knees, forward lean, bent pumping arms. dist in rig units travelled. */
export function runPose(dist: number, dir: number, o: { stride?: number; lean?: number; fear?: number } = {}): Pose {
  const st = o.stride ?? 1.05; const ph = dist / (2 * st); const c = ph * tau;
  const foot = (off: number): V2 => {
    const a = c + off; const fx = Math.cos(a) * st * .62 * dir; const lift = Math.max(0, Math.sin(a)) * .62 + Math.max(0, -Math.sin(a)) * .02;
    return [fx, -.08 - lift];
  };
  const pump = Math.sin(c); const lean = (o.lean ?? .2) * dir;
  const fear = o.fear ?? 0;
  const handA: V2 = [dir * (-.15 - pump * .5) * (1 - fear) + fear * -.75, -2.05 + Math.abs(pump) * .25 - fear * .9];
  const handB: V2 = [dir * (.15 + pump * .5) * (1 - fear) + fear * .75, -2.05 + Math.abs(pump) * .25 - fear * .9];
  return S({ turn: .86 * dir, lean, crouch: .12 - Math.abs(Math.cos(c)) * .1, hipX: 0, headLift: -.04, footA: foot(0), footB: foot(Math.PI), handA, handB,
    kneeDir: dir, bendA: -1, bendB: -1, shapeA: 'fist', shapeB: 'fist' });
}
/** height of the body above the ground during a run cycle (flight phase), rig units */
export const runBob = (dist: number, stride = 1.05) => Math.abs(Math.sin(dist / (2 * stride) * tau)) * .12;

/** jump: k 0..1 over anticipation (0-.22), push-off (.22-.32), air (.32-.78), landing compression (.78-1). Returns pose + body height (units). */
export function jumpPose(k: number, dir: number, o: { height?: number; dist?: number } = {}): { pose: Pose; y: number; x: number } {
  const H = o.height ?? 1.6; const D = o.dist ?? 0;
  const air = clamp((k - .28) / .5); const y = k < .28 || k > .78 ? 0 : 4 * H * air * (1 - air); const x = D * clamp((k - .26) / .54);
  let p: Pose;
  if (k < .22) { const a = k / .22; p = S({ turn: .6 * dir, crouch: .75 * a, lean: .25 * dir * a, handA: [-dir * .55, -1.2 - a * .1], handB: [-dir * .25, -1.25], footA: [-.25, -.08], footB: [.25, -.08], headLift: -.05 * a }); }
  else if (k < .32) { const a = (k - .22) / .1; p = S({ turn: .7 * dir, crouch: mix(.75, -.25, a), lean: .1 * dir, handA: [dir * .25, mix(-1.2, -4.3, a)], handB: [dir * .55, mix(-1.25, -4.1, a)], footA: [-.15, -.08 - a * .1], footB: [.15, -.08 - a * .2] }); }
  else if (k < .78) { const a = air; const tuck = Math.sin(Math.PI * a);
    p = S({ turn: .8 * dir, crouch: -.2 + tuck * .55, lean: dir * (.1 - .15 * a), handA: [dir * (.35 - a * .5), -4.0 + a * 1.6], handB: [dir * (.65 - a * .4), -3.8 + a * 1.6], footA: [dir * (-.1 + tuck * .45), -.25 - tuck * .75], footB: [dir * (.15 + tuck * .55), -.4 - tuck * .8], kneeDir: dir }); }
  else { const a = (k - .78) / .22; const comp = Math.sin(Math.PI * Math.min(1, a * 1.3)) * (1 - a * .3);
    p = S({ turn: .6 * dir, crouch: .85 * comp, lean: .3 * dir * comp, handA: [-dir * .6 - .2, -1.9 + comp * .5], handB: [dir * .7 + .2, -1.95 + comp * .5], footA: [-.32, -.08], footB: [.32, -.08], headLift: -.08 * comp, shapeA: 'open', shapeB: 'open' }); }
  return { pose: p, y, x };
}
/** crouched low behind cover, hands up by the face */
export function hidePose(dir: number, peek = 0): Pose {
  return S({ turn: .5 * dir, crouch: 1.15, lean: .25 * dir, headLift: -.05 + peek * .15, footA: [-dir * .35, -.08], footB: [dir * .45, -.08], kneeDir: dir, kneeUp: true, handA: [dir * .15, -2.05], handB: [dir * .5, -2.2], shapeA: 'fist', shapeB: 'open' });
}
/** crawl on hands and knees (seen in profile) */
export function crawlPose(dist: number, dir: number): Pose {
  const c = dist / .9 * Math.PI; const s = Math.sin(c);
  return S({ turn: .95 * dir, lean: 1.05 * dir, crouch: 1.75, headLift: .25, headTilt: -.25 * dir,
    handA: [dir * (.95 + s * .25), -.1 - Math.max(0, s) * .18], handB: [dir * (1.15 - s * .25), -.1 - Math.max(0, -s) * .18],
    footA: [-dir * (.75 - s * .2), -.08], footB: [-dir * (.55 + s * .2), -.08], kneeDir: dir, bendA: 1, bendB: 1 });
}
/** climbing hand over hand (seen from behind); dist = height climbed in units */
export function climbPose(dist: number): Pose {
  const c = dist / .8 * Math.PI; const s = Math.sin(c);
  return S({ back: 1, turn: 0, crouch: .25, handA: [-.42, -3.9 - s * .45], handB: [.42, -3.9 + s * .45], footA: [-.32, -.2 + Math.max(0, -s) * -.55], footB: [.32, -.2 + Math.max(0, s) * -.55], shapeA: 'fist', shapeB: 'fist', headLift: .05 });
}
/** swimming / falling body is laid horizontal with ActorState.roll; this is the limb action in the rig frame */
export function swimPose(t: number, o: { stroke?: number; kick?: number; speed?: number } = {}): Pose {
  const sp = o.speed ?? 1.3; const c = t * sp * tau; const k = o.kick ?? 1, st = o.stroke ?? 1;
  const reachA: V2 = [-.25 + Math.cos(c) * .45 * st, -4.1 + Math.sin(c) * .3 * st - (1 - st) * -2.3];
  const reachB: V2 = [.25 + Math.cos(c + Math.PI) * .45 * st, -4.1 + Math.sin(c + Math.PI) * .3 * st - (1 - st) * -2.3];
  return S({ turn: 0, crouch: 0, handA: reachA, handB: reachB, footA: [-.18 + Math.sin(c * 2) * .12 * k, -.05], footB: [.18 - Math.sin(c * 2) * .12 * k, -.05], shapeA: 'open', shapeB: 'open' });
}
/** falling: flailing limbs */
export function fallPose(t: number, dir = 1): Pose {
  const a = Math.sin(t * 13), b = Math.sin(t * 11 + 1);
  return S({ turn: .3 * dir, lean: -.2 * dir, crouch: -.1, headLift: .1, handA: [-.9 + a * .2, -3.6 + b * .4], handB: [.9 - b * .2, -3.5 + a * .4], footA: [-.35 + b * .15, -.35 - a * .2], footB: [.35 - a * .15, -.2 + b * .2], shapeA: 'open', shapeB: 'open' });
}
/** sitting on the ground, knees up; arms hug the knees by 'hug' */
export function sitPose(dir: number, hug = 0, o: Partial<Pose> = {}): Pose {
  return S({ turn: .55 * dir, crouch: 1.55, lean: -.08 * dir, footA: [dir * .7, -.08], footB: [dir * 1.0, -.08], kneeDir: dir, kneeUp: true,
    handA: hug ? [dir * mix(-.35, .5, hug), mix(-.5, -1.25, hug)] : [-dir * .45, -.12], handB: hug ? [dir * mix(.35, .75, hug), mix(-.5, -1.35, hug)] : [dir * .1, -.1], ...o });
}
/** lying on the back (use ActorState.roll = ±PI/2): limbs relaxed, 'wake' bends a knee and lifts an arm */
export function lyingPose(wake = 0): Pose {
  return S({ turn: 0, crouch: 0, handA: [-.62, mix(-1.75, -2.9, wake)], handB: [.55, -1.7], footA: [-.2, mix(-.08, -.6, wake)], footB: [.22, -.08] });
}
/** stumble/knock-back: k 0..1 (hit at 0, off balance, recovered at 1) */
export function stumblePose(k: number, dir: number): Pose {
  const off = Math.sin(Math.PI * clamp(k * 1.4)) * (1 - clamp((k - .6) / .4));
  return S({ turn: .7 * dir, lean: -.45 * dir * off, crouch: .3 * off, headLift: .1 * off, headTilt: .25 * dir * off,
    handA: [-dir * .9 * off - .4, -2.6 - off * .8], handB: [dir * .8 * off + .45, -2.9 - off * .9], footA: [-.45 * off - .2, -.08], footB: [.5 * off * dir + .2, -.08 - off * .3], shapeA: 'open', shapeB: 'open' });
}
