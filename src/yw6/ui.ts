// YunoWorld v6 overlays (1080x1920): word-synced captions, top fact chips, title + end cards. Safe from the Shorts UI.
import { WORDS } from './words.ts';
const SH = 'text-shadow:0 6px 22px rgba(0,0,0,.55)';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** 1–2 words at a time, bold white with a dark outline, popping on each word (timed by Whisper word stamps). */
export function captions(film: string, t: number, hide = false): string {
  if (hide) return ''; const W = WORDS[film] ?? []; let i = -1;
  for (let k = 0; k < W.length; k++) { if (W[k][0] <= t + .02) i = k; else break; }
  if (i < 0 || t > W[i][1] + .45) return '';
  const g = i - (i % 2); const words = W.slice(g, Math.min(g + 2, W.length)).filter(w => w[0] <= t + .02);
  const k = Math.min(1, (t - W[i][0]) / .09);
  const html = words.map((w, j) => { const big = /^[A-Z0-9]/.test(w[2]) && w[2].length > 3 || /\d/.test(w[2]); const hot = j === words.length - 1;
    return `<span style="color:${big ? '#ffd23f' : '#fff'};display:inline-block;transform:scale(${hot ? .86 + .14 * k : 1})">${esc(w[2].toUpperCase())}</span>`; }).join(' ');
  return `<div style="position:absolute;left:60px;right:60px;top:1250px;text-align:center;font-family:Inter;font-weight:900;font-size:78px;line-height:1.05;letter-spacing:1px;-webkit-text-stroke:9px #121212;paint-order:stroke fill;${SH}">${html}</div>`;
}
/** Fact chip near the top of the frame. */
export const chip = (txt: string, y: number, k: number, col = '#ffd23f') => k <= .001 ? '' :
  `<div style="position:absolute;left:540px;top:${y}px;transform:translate(-50%,0) scale(${.85 + .15 * k});opacity:${k};font-family:Inter;font-weight:900;font-size:40px;letter-spacing:1px;color:#fff;white-space:nowrap;
   background:rgba(16,14,30,.62);border-left:10px solid ${col};padding:14px 28px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3)">${txt}</div>`;
export const card = (a: string, b: string, k: number, top = 300) => k <= .001 ? '' :
  `<div style="position:absolute;left:0;width:1080px;top:${top}px;text-align:center;opacity:${k};transform:translateY(${(1 - k) * 26}px);font-family:Inter;${SH}">
   <div style="font-weight:900;font-size:86px;color:#fff;line-height:1.02;padding:0 50px">${a}</div>
   <div style="width:${180 * k}px;height:8px;background:#ffd23f;margin:20px auto;border-radius:4px"></div>
   <div style="font-weight:800;font-size:40px;letter-spacing:4px;color:#ffe7a8;padding:0 60px">${b}</div></div>`;
/** Warm key / cool purple-blue shadows (never crushed black). */
export const GRADE = { sat: 1.16, contrast: 1.08, bloom: .2, bloomTh: 1.45, vignette: .24, exposure: 1.0, lift: [.035, .03, .075] as [number, number, number], gain: [1.04, 1.0, .95] as [number, number, number] };
/** Start time of the n-th (1-based) narrated occurrence of a word — used to land visual beats exactly on the spoken word. */
export function wt(film: string, word: string, n = 1, fallback = 0): number {
  let c = 0; for (const w of WORDS[film] ?? []) if (w[2].toLowerCase().replace(/[^a-z0-9']/g, '') === word && ++c === n) return w[0];
  return fallback;
}
