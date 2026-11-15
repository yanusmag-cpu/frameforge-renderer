// FrameForge 2D engine — camera, parallax layers, lighting overlays, shared defs. Output: SVG strings.
import { clamp, hash, mix, noise1, type V2 } from './motion.ts';

export const W = 1920, H = 1080;
export type Cam = { x: number; y: number; zoom: number; rot?: number; shake?: number };
const n = (x: number) => +x.toFixed(3);

/** World→screen transform for a layer at parallax depth p (1 = subject plane, <1 farther, >1 foreground). */
export function camT(c: Cam, p = 1, t = 0): string {
  const z = mix(1, c.zoom, p);
  const sh = c.shake ?? 0;
  const sx = sh ? noise1(t * 23, 3) * sh * 14 : 0, sy = sh ? noise1(t * 21, 7) * sh * 10 : 0;
  return `translate(${n(W / 2 + sx)} ${n(H / 2 + sy)}) rotate(${n(c.rot ?? 0)}) scale(${n(z)}) translate(${n(-mix(W / 2, c.x, p))} ${n(-mix(H / 2, c.y, p))})`;
}
export const layer = (c: Cam, p: number, t: number, body: string) => `<g transform="${camT(c, p, t)}">${body}</g>`;

/** linear / radial gradient defs */
export const lin = (id: string, stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`).join('')}</linearGradient>`;
export const rad = (id: string, stops: [number, string, number?][], cx = .5, cy = .5, r = .5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`).join('')}</radialGradient>`;

/** Additive light pool (screen blend) at world position. */
export function glow(p: V2, r: number, color: string, a: number, sy = 1) {
  if (a <= .002) return '';
  const id = 'g' + Math.round(hash(p[0] * .37 + p[1] * .11 + r) * 1e9);
  return `<defs>${rad(id, [[0, color, a], [.35, color, a * .45], [1, color, 0]])}</defs><ellipse cx="${n(p[0])}" cy="${n(p[1])}" rx="${n(r)}" ry="${n(r * sy)}" fill="url(#${id})" style="mix-blend-mode:screen"/>`;
}
/** Full-frame grade: tint (multiply), lift, vignette. Applied in screen space. */
export function grade(o: { tint?: string; tintA?: number; vig?: number; lift?: string; liftA?: number; flash?: number; flashCol?: string }) {
  let s = '';
  if (o.tint && (o.tintA ?? 1) > 0) s += `<rect width="${W}" height="${H}" fill="${o.tint}" opacity="${n(o.tintA ?? 1)}" style="mix-blend-mode:multiply"/>`;
  if (o.lift) s += `<rect width="${W}" height="${H}" fill="${o.lift}" opacity="${n(o.liftA ?? .1)}" style="mix-blend-mode:screen"/>`;
  if (o.vig) s += `<defs>${rad('vig', [[.55, '#000', 0], [1, '#000', o.vig]], .5, .5, .75)}</defs><rect width="${W}" height="${H}" fill="url(#vig)"/>`;
  if (o.flash) s += `<rect width="${W}" height="${H}" fill="${o.flashCol ?? '#fff'}" opacity="${n(clamp(o.flash))}"/>`;
  return s;
}
/** Subtle animated film grain (cheap: pre-made turbulence, offset per frame). */
export function grain(t: number, a = .05) {
  const seed = Math.floor(t * 30) % 9;
  return `<filter id="gr${seed}" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 ${a * 4} 0"/></filter><rect width="${W}" height="${H}" filter="url(#gr${seed})" style="mix-blend-mode:overlay"/>`;
}
export const svgDoc = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${body}</svg>`;
export const txt = (x: number, y: number, s: string, size: number, o: { fill?: string; weight?: number; anchor?: string; ls?: number; font?: string; op?: number } = {}) =>
  `<text x="${n(x)}" y="${n(y)}" font-family="${o.font ?? 'Inter, Arial, sans-serif'}" font-weight="${o.weight ?? 900}" font-size="${size}" fill="${o.fill ?? '#fff'}" text-anchor="${o.anchor ?? 'start'}" letter-spacing="${o.ls ?? 0}" opacity="${o.op ?? 1}">${s}</text>`;
/** Place a character (rig svg in head units) at world point with scale (px per unit). */
export const place = (svg: string, x: number, y: number, s: number, flip = false) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(flip ? -s : s)} ${n(s)})">${svg}</g>`;
