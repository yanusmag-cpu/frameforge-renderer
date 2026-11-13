// FrameForge 2D engine — pure, deterministic motion helpers (absolute time in seconds).
export type V2 = [number, number];
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const inOut = (x: number) => { const t = clamp(x); return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
export const outCubic = (x: number) => 1 - (1 - clamp(x)) ** 3;
export const inCubic = (x: number) => clamp(x) ** 3;
/** ease-out with overshoot (follow-through) */
export const outBack = (x: number, s = 1.7) => { const t = clamp(x) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
/** anticipation: dips below 0 before travelling to 1 */
export const inBack = (x: number, s = 1.7) => { const t = clamp(x); return (s + 1) * t * t * t - s * t * t; };
/** damped settle: 0→1 with decaying wobble (secondary motion) */
export const settle = (x: number, freq = 2.2, damp = 5) => { const t = Math.max(0, x); return 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * 2 * t); };
export const range = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise1 = (x: number, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1; };

export type Ease = (x: number) => number;
export type Key = [number, number, Ease?];
/** keyframe track: [time, value, easeIntoThisKey] */
export function track(t: number, keys: Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) { const [t0, v0] = keys[i - 1]; return mix(v0, v1, (e ?? inOut)((t - t0) / (t1 - t0))); }
  }
  return keys[keys.length - 1][1];
}

/** Blend any numeric record (poses, faces, cameras). Non-numeric fields come from the nearer side. */
export function blend<T>(a: T, b: T, k: number): T {
  if (typeof a === 'number' && typeof b === 'number') return mix(a, b, k) as T;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => blend(x, b[i], k)) as T;
  if (a && b && typeof a === 'object') {
    const o: Record<string, unknown> = {};
    for (const key of new Set([...Object.keys(a as object), ...Object.keys(b as object)])) {
      const va = (a as Record<string, unknown>)[key], vb = (b as Record<string, unknown>)[key];
      o[key] = va === undefined ? vb : vb === undefined ? va : blend(va, vb, k);
    }
    return o as T;
  }
  return (k < .5 ? a : b);
}
/** state machine of poses over time: each entry holds from its time, blending over `dur` with ease */
export function poseTrack<T>(t: number, keys: { t: number; v: T; dur?: number; ease?: Ease }[]): T {
  let cur = keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t < k.t) break;
    const d = k.dur ?? .35;
    cur = blend(cur, k.v, (k.ease ?? inOut)((t - k.t) / d));
  }
  return cur;
}

/** 2-bone IK in 2D. Returns joint position. bend = +1/-1 chooses the elbow/knee side. */
export function ik2(a: V2, target: V2, l1: number, l2: number, bend: number): { mid: V2; end: V2 } {
  let dx = target[0] - a[0], dy = target[1] - a[1];
  let d = Math.hypot(dx, dy);
  const max = (l1 + l2) * .999, min = Math.abs(l1 - l2) + 1e-4;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < min) { const s = min / Math.max(d, 1e-6); dx *= s; dy *= s; d = min; }
  const ang = Math.atan2(dy, dx);
  const c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a1 = ang + bend * Math.acos(c);
  const mid: V2 = [a[0] + Math.cos(a1) * l1, a[1] + Math.sin(a1) * l1];
  return { mid, end: [a[0] + dx, a[1] + dy] };
}

/**
 * Natural blink scheduler: blinks every ~2.4–5.2 s (seeded), occasional double blink.
 * Returns lid closure 0..1. Fast close (70 ms), slower open (110 ms).
 */
export function blink(t: number, seed: number): number {
  let n = Math.floor(t / 3.6) - 1, best = 0;
  for (let i = n; i < n + 3; i++) {
    const s0 = i * 3.6 + hash(i * 7 + seed) * 2.4;
    for (const off of hash(i * 13 + seed) > .78 ? [0, .32] : [0]) {
      const d = t - (s0 + off);
      if (d >= 0 && d < .07) best = Math.max(best, d / .07);
      else if (d >= .07 && d < .18) best = Math.max(best, 1 - (d - .07) / .11);
    }
  }
  return best;
}
/** micro-saccades: held gaze offsets that jump every ~0.6–1.8 s */
export function saccade(t: number, seed: number, amp = .18): V2 {
  const i = Math.floor(t / 1.1 + hash(seed) * 3), k = range(t / 1.1 + hash(seed) * 3 - i, 0, .06);
  const p = (j: number): V2 => [(hash(j * 3.1 + seed) * 2 - 1) * amp, (hash(j * 5.7 + seed) * 2 - 1) * amp * .5];
  const a = p(i - 1), b = p(i);
  return [mix(a[0], b[0], k), mix(a[1], b[1], k)];
}

/**
 * Foot-planted walk along x (dir ±1). Returns body offset, hip bob and ground foot targets.
 * dist = distance travelled so far (units). Feet never slide while planted.
 */
export function walk(dist: number, step = .62) {
  const cyc = dist / (2 * step);
  const foot = (off: number) => {
    const ph = cyc + off, n = Math.floor(ph), u = ph - n;
    const plant = (m: number) => (m - off) * 2 * step + step * .55;
    if (u < .6) return { x: plant(n), lift: 0, u };
    const s = (u - .6) / .4;
    return { x: mix(plant(n), plant(n + 1), inOut(s)), lift: Math.sin(Math.PI * s) * .2, u };
  };
  const L = foot(0), R = foot(.5);
  return { bob: -.035 * Math.cos(cyc * Math.PI * 4), L, R, swing: Math.sin(cyc * Math.PI * 2) };
}
