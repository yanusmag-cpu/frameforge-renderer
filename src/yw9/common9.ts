// Shared helpers for the v9 films: character construction, walk cycle, timing helpers and the frame dispatcher.
import { STAND, idle, type Pose } from '../ff2d/rig.ts';
import { expr } from '../ff2d/face.ts';
import { clamp, type V3, type ActorState } from '../yw3/core.ts';
import type { T7Look } from '../yw7/toon7.ts';
import type { Frame9 } from './engine9.ts';
import { captions } from './ui9.ts';

export const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
export const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1400, seed: id.length * 7 + 1, rim: '#ffe0b0', rimSide: 1, ...o });
export const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** alternating planted steps; the caller advances the actor at `speed` m/s so the planted foot doesn't slide */
export const walk = (t: number, sp = 1) => { const p = t * 5.2 * sp; return { footA: [-.2 + Math.sin(p) * .22, -.08 + Math.max(0, Math.cos(p)) * .1] as [number, number], footB: [.2 - Math.sin(p) * .22, -.08 + Math.max(0, -Math.cos(p)) * .1] as [number, number], crouch: Math.abs(Math.sin(p)) * .04 }; };
export type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
export function dispatcher(film: string, shots: Shot[], fps = 30) {
  return (frame: number): Frame9 => {
    const t = frame / fps; let s = shots[0];
    for (const sh of shots) if (t >= sh.t0 - 1e-6) s = sh;
    const k = clamp((t - s.t0) / Math.max(.001, s.t1 - s.t0));
    const F = s.f(t, k) as Frame9;
    return { ...F, t, overlay: (F.overlay ?? '') + captions(film, t) } as Frame9;
  };
}
/** a full-width title card that lands on the final reveal */
export const bigTitle = (a: string, b: string, k: number, col = '#ffd23f', top = 520) => k <= .001 ? '' :
  `<div style="position:absolute;left:0;width:1080px;top:${top - 30 * k}px;text-align:center;opacity:${k};font-family:Inter;font-weight:900;font-size:96px;line-height:1.05;color:#fff;-webkit-text-stroke:9px #141018;paint-order:stroke fill;text-shadow:0 10px 36px rgba(0,0,0,.45)">${a}<br><span style="color:${col}">${b}</span></div>`;
