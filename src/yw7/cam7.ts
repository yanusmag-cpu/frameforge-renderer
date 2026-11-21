// YunoWorld v7 cinematic camera system — shared by all v7 films.
// A shot is a list of camera KEYS (time, position, look-at, focal length, optional focus target). Positions and targets are
// interpolated with centripetal Catmull-Rom splines (smooth arcs through every key, no corners), time is re-mapped with an
// ease that holds velocity continuous across keys, and depth of field follows the focus target. Helpers build the classic
// moves (dolly, truck, orbit, crane, push-in, over-the-shoulder, follow-with-lag) so shots read as directed camera work.
import type { V3, Cam } from '../yw3/core.ts';

export type Key = { t: number; pos: V3; look: V3; fov?: number; focus?: V3; roll?: number };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = {
  inOut: (k: number) => k * k * (3 - 2 * k),
  inOut5: (k: number) => k * k * k * (k * (k * 6 - 15) + 10),
  out: (k: number) => 1 - (1 - k) ** 3,
  in: (k: number) => k ** 3,
  /** overshoot then settle (camera "lands" on a framing) */
  settle: (k: number) => { const c = 1.4; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
  /** anticipation: small move back before going forward (character actions) */
  antic: (k: number, a = .12) => k < .2 ? -a * Math.sin(k / .2 * Math.PI / 2) : -a + (1 + a) * ((k - .2) / .8) ** 2 * (3 - 2 * (k - .2) / .8),
};
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
const crV = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => [cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t), cr(a[2], b[2], c[2], d[2], t)];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/**
 * Evaluate a keyed camera move at time t. The whole move is eased once (ease-in at the first key, ease-out at the last) and the
 * keys are distributed by their own times inside it, so the camera never stops dead at an intermediate key.
 */
export function rig(keys: Key[], t: number, o: { easing?: (k: number) => number; aperture?: number } = {}): Cam & { focusDist?: number; aperture?: number } {
  const K = keys; const a = K[0].t, b = K[K.length - 1].t;
  const g = (o.easing ?? ease.inOut)(clamp((t - a) / Math.max(1e-6, b - a)));
  const tt = lerp(a, b, g);
  let i = 0; while (i < K.length - 2 && tt > K[i + 1].t) i++;
  const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[Math.min(K.length - 1, i + 1)], k3 = K[Math.min(K.length - 1, i + 2)];
  const u = clamp((tt - k1.t) / Math.max(1e-6, k2.t - k1.t));
  const pos = crV(k0.pos, k1.pos, k2.pos, k3.pos, u), look = crV(k0.look, k1.look, k2.look, k3.look, u);
  const fov = lerp(k1.fov ?? 40, k2.fov ?? k1.fov ?? 40, ease.inOut(u));
  const roll = lerp(k1.roll ?? 0, k2.roll ?? 0, ease.inOut(u));
  const f1 = k1.focus ?? k1.look, f2 = k2.focus ?? k2.look; const foc: V3 = [lerp(f1[0], f2[0], u), lerp(f1[1], f2[1], u), lerp(f1[2], f2[2], u)];
  return { pos, look, fov, roll, focusDist: dist(pos, foc), aperture: o.aperture };
}
/** gentle hand-held breathing (very small; only for tense moments) */
export function breathe(c: Cam, t: number, amt = 1): Cam {
  const s = amt * .012; return { ...c, pos: [c.pos[0] + Math.sin(t * 1.3) * s, c.pos[1] + Math.sin(t * 1.7 + 1) * s * .7, c.pos[2] + Math.sin(t * .9 + 2) * s * .5] };
}
/** follow a moving subject with an offset and a lag (critically damped feel via look-ahead blending) */
export function follow(subject: (t: number) => V3, t: number, off: V3, lookOff: V3 = [0, 0, 0], lag = .35, fov = 40): Cam {
  const p = subject(t - lag), q = subject(t);
  return { pos: [p[0] + off[0], p[1] + off[1], p[2] + off[2]], look: [q[0] + lookOff[0], q[1] + lookOff[1], q[2] + lookOff[2]], fov };
}
/** orbit keys around a centre (for rig()) */
export function orbitKeys(t0: number, t1: number, c: V3, r: number, a0: number, a1: number, h0: number, h1: number, lookH: number, fov: number, n = 4): Key[] {
  return Array.from({ length: n + 1 }, (_, i) => { const k = i / n, a = lerp(a0, a1, k); return { t: lerp(t0, t1, k), pos: [c[0] + Math.sin(a) * r, lerp(h0, h1, k), c[2] + Math.cos(a) * r] as V3, look: [c[0], lookH, c[2]] as V3, fov }; });
}
/** DOF grade helper */
export const dof = (c: { focusDist?: number }, aperture: number) => ({ focus: c.focusDist ?? 6, aperture });
