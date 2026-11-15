// Crisp vector motion-graphics layer (1080x1920 SVG) — amounts, titles, measurements, stamps. Inter font.
import * as T from 'three';
import { clamp, inOut, outBack, mix } from '../ff2d/motion.ts';
import type { V3 } from './engine.ts';
export const W = 1080, H = 1920;
const RED = '#e5322d';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const shadow = `<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter>
<filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
export const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;font-family:Inter,sans-serif"><defs>${shadow}</defs>${body}</svg>`;
/** text that pops in with overshoot then holds; k = 0..1 visibility */
export function pop(text: string, x: number, y: number, size: number, t: number, t0: number, o: { color?: string; weight?: number; out?: number; anchor?: string; stroke?: boolean; dur?: number; track?: number } = {}) {
  const k = clamp((t - t0) / (o.dur ?? .35)); if (k <= 0) return ''; const s = outBack(k, 2.2) * (o.out ? 1 - clamp((t - o.out) / .25) * .3 : 1);
  const a = Math.min(1, k * 3) * (o.out ? 1 - clamp((t - o.out) / .25) : 1); if (a <= 0) return '';
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${a}" filter="url(#sh)"><text text-anchor="${o.anchor ?? 'middle'}" font-size="${size}" font-weight="${o.weight ?? 900}" letter-spacing="${o.track ?? 0}"
    fill="${o.color ?? '#fff'}" ${o.stroke === false ? '' : `stroke="#000" stroke-width="${size * .08}" paint-order="stroke" stroke-linejoin="round"`}>${esc(text)}</text></g>`;
}
/** big money counter with rolling digits */
export function money(v: number, x: number, y: number, size: number, alpha = 1, prefix = '$', color = '#ffd34d') {
  const s = prefix + Math.round(v).toLocaleString('en-US');
  return `<g opacity="${alpha}" filter="url(#sh)"><text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="900" fill="${color}" stroke="#2a1600" stroke-width="${size * .09}" paint-order="stroke" stroke-linejoin="round" letter-spacing="-2">${s}</text></g>`;
}
/** label chip with a red accent bar */
export function chip(text: string, x: number, y: number, size: number, t: number, t0: number, out = 99, anchor: 'start' | 'middle' = 'start') {
  const k = inOut(clamp((t - t0) / .3)) * (1 - clamp((t - out) / .25)); if (k <= 0) return '';
  const w = text.length * size * .62 + size * 1.1; const x0 = anchor === 'middle' ? x - w / 2 : x;
  return `<g opacity="${k}" transform="translate(${(1 - k) * -30} 0)" filter="url(#sh)"><rect x="${x0}" y="${y - size * 1.05}" width="${w * k}" height="${size * 1.45}" rx="${size * .18}" fill="#0d0f14" fill-opacity=".82"/>
    <rect x="${x0}" y="${y - size * 1.05}" width="${size * .22}" height="${size * 1.45}" fill="${RED}"/><text x="${x0 + size * .55}" y="${y}" font-size="${size}" font-weight="800" fill="#fff" letter-spacing="1">${esc(text)}</text></g>`;
}
export type Proj = (p: V3) => [number, number, number];
export function projector(pos: V3, look: V3, fov: number): Proj {
  const c = new T.PerspectiveCamera(fov, W / H, .05, 600); c.position.set(...pos); c.lookAt(...look); c.updateMatrixWorld(); c.updateProjectionMatrix();
  return p => { const v = new T.Vector3(...p).project(c); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H, v.z]; };
}
/** measuring line between two world points with end ticks and a counter label */
export function measure(pr: Proj, a: V3, b: V3, k: number, label: string, o: { color?: string; size?: number; side?: number } = {}) {
  if (k <= 0) return ''; const A = pr(a), B0 = pr(b); const B = [mix(A[0], B0[0], k), mix(A[1], B0[1], k)];
  const col = o.color ?? '#fff'; const dx = B0[0] - A[0], dy = B0[1] - A[1], L = Math.hypot(dx, dy) || 1; const nx = -dy / L * 22 * (o.side ?? 1), ny = dx / L * 22 * (o.side ?? 1);
  const mid = [(A[0] + B[0]) / 2 + nx * 2.6, (A[1] + B[1]) / 2 + ny * 2.6];
  return `<g filter="url(#sh)"><path d="M${A[0] + nx} ${A[1] + ny} L${A[0] - nx} ${A[1] - ny} M${A[0]} ${A[1]} L${B[0]} ${B[1]}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>
    ${k >= 1 ? `<path d="M${B0[0] + nx} ${B0[1] + ny} L${B0[0] - nx} ${B0[1] - ny}" stroke="${col}" stroke-width="7" stroke-linecap="round"/>` : `<circle cx="${B[0]}" cy="${B[1]}" r="11" fill="${RED}" stroke="#fff" stroke-width="4"/>`}
    <text x="${mid[0]}" y="${mid[1] + (o.size ?? 64) * .35}" text-anchor="middle" font-size="${o.size ?? 64}" font-weight="900" fill="#fff" stroke="#000" stroke-width="${(o.size ?? 64) * .09}" paint-order="stroke">${esc(label)}</text></g>`;
}
/** stamp that slams in (scale from big, slight rotation) */
export function stamp(text: string, x: number, y: number, size: number, t: number, t0: number, color = RED, rot = -6, out = 99) {
  const k = clamp((t - t0) / .18); if (k <= 0) return ''; const a = 1 - clamp((t - out) / .25); if (a <= 0) return '';
  const s = mix(2.4, 1, inOut(k)) * (1 + Math.max(0, .06 - (t - t0 - .18) * .3)); const w = text.length * size * .66 + size;
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" opacity="${Math.min(1, k * 2) * a}" filter="url(#sh)"><rect x="${-w / 2}" y="${-size * .95}" width="${w}" height="${size * 1.4}" rx="10" fill="none" stroke="${color}" stroke-width="${size * .12}"/>
    <text text-anchor="middle" y="${size * .1}" font-size="${size}" font-weight="900" fill="${color}" letter-spacing="2">${esc(text)}</text></g>`;
}
export function pin(pr: Proj, p: V3, text: string, t: number, t0: number, color = RED) {
  const k = outBack(clamp((t - t0) / .4), 1.8); if (k <= 0) return ''; const [x, y] = pr(p);
  return `<g transform="translate(${x} ${y}) scale(${k})" filter="url(#sh)"><path d="M0 0 C-14 -30 -40 -44 -40 -78 A40 40 0 1 1 40 -78 C40 -44 14 -30 0 0Z" fill="${color}" stroke="#fff" stroke-width="6"/><circle cy="-80" r="15" fill="#fff"/>
    <g transform="translate(0 -150)"><rect x="${-text.length * 17 - 24}" y="-44" width="${text.length * 34 + 48}" height="62" rx="14" fill="#0d0f14" fill-opacity=".85"/><text text-anchor="middle" font-size="38" font-weight="800" fill="#fff">${esc(text)}</text></g></g>`;
}
/** calendar page flip (months) */
export function calendar(x: number, y: number, label: string, sub: string, flip: number, alpha = 1) {
  const sy = Math.abs(Math.cos(flip * Math.PI)); return `<g transform="translate(${x} ${y})" opacity="${alpha}" filter="url(#sh)">
    <rect x="-130" y="-120" width="260" height="250" rx="22" fill="#fff"/><rect x="-130" y="-120" width="260" height="70" rx="22" fill="${RED}"/><rect x="-130" y="-70" width="260" height="20" fill="${RED}"/>
    <g transform="scale(1 ${sy})"><text y="-66" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" letter-spacing="3">${esc(sub)}</text><text y="70" text-anchor="middle" font-size="96" font-weight="900" fill="#14161b">${esc(label)}</text></g>
    <circle cx="-70" cy="-122" r="12" fill="#333"/><circle cx="70" cy="-122" r="12" fill="#333"/></g>`;
}
/** analogue clock face for the weekend time-lapse */
export function clock(x: number, y: number, hours: number, label: string, alpha = 1) {
  const a = hours / 12 * Math.PI * 2, b = hours * Math.PI * 2;
  return `<g transform="translate(${x} ${y})" opacity="${alpha}" filter="url(#sh)"><circle r="120" fill="#fff" stroke="#14161b" stroke-width="12"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M0 -102 V-86" stroke="#14161b" stroke-width="${i % 3 ? 5 : 10}" transform="rotate(${i * 30})"/>`).join('')}
    <path d="M0 0 L${Math.sin(a) * 58} ${-Math.cos(a) * 58}" stroke="#14161b" stroke-width="14" stroke-linecap="round"/><path d="M0 0 L${Math.sin(b) * 88} ${-Math.cos(b) * 88}" stroke="${RED}" stroke-width="8" stroke-linecap="round"/><circle r="12" fill="#14161b"/>
    <g transform="translate(0 200)"><rect x="-190" y="-50" width="380" height="72" rx="16" fill="#0d0f14" fill-opacity=".85"/><text text-anchor="middle" font-size="44" font-weight="900" fill="#fff" letter-spacing="2">${esc(label)}</text></g></g>`;
}
export function gunIcon(x: number, y: number, s: number, strike: number, alpha = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${alpha}" filter="url(#sh)"><circle r="150" fill="#0d0f14" fill-opacity=".55" stroke="#fff" stroke-width="10"/>
    <path d="M-95 -38 H70 L82 -52 H96 V-14 H40 L30 6 H8 L-2 -14 H-30 L-48 70 Q-50 80 -60 80 H-92 Q-104 80 -100 68 L-78 -10 H-95Z" fill="#fff"/>
    ${strike > 0 ? `<path d="M-106 -106 L${-106 + 212 * strike} ${-106 + 212 * strike}" stroke="${RED}" stroke-width="26" stroke-linecap="round"/>` : ''}</g>`;
}
export function rewind(t: number, k: number) {
  if (k <= 0) return ''; const lines = Array.from({ length: 9 }, (_, i) => { const y = ((i * 233 + t * 2900) % H); return `<rect x="0" y="${y}" width="${W}" height="${6 + (i % 3) * 5}" fill="#fff" opacity="${.08 + (i % 4) * .04}"/>`; }).join('');
  return `<g opacity="${k}">${lines}<g filter="url(#sh)"><path d="M380 900 L480 840 V960Z M480 900 L580 840 V960Z" fill="#fff"/><text x="600" y="935" font-size="90" font-weight="900" fill="#fff">2005</text></g></g>`;
}
