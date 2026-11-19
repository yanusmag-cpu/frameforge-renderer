// 2D overlay layer (1080×1920 space): speech bubbles, map tags, arrows, titles. Empire History Z house style.
import { clamp, easeOut } from './geo.ts';

const F = "font-family:Inter,sans-serif;";
export const pop = (t: number, a: number, b: number, inD = .18, outD = .14) => { if (t < a || t > b) return 0; const i = clamp((t - a) / inD), o = clamp((b - t) / outD); return Math.min(easeOut(i) * (1 + .12 * Math.sin(Math.min(1, i) * Math.PI)), o); };

/** Comic speech bubble with tail aimed at the speaker (sx, sy). Box centred at (cx, cy). */
export function bubble(text: string, cx: number, cy: number, sx: number, sy: number, k: number, who: 'gb' | 'zz', size = 62) {
  if (k <= 0) return '';
  const lines = text.split('\n'); const w = Math.min(900, Math.max(...lines.map(l => l.length)) * size * .62 + 90), h = lines.length * size * 1.12 + 70;
  const x0 = clamp(cx - w / 2, 50, 1030 - w), y0 = cy - h / 2;
  const ax = clamp(sx, x0 + 60, x0 + w - 60); const tipX = clamp(sx, 40, 1040), tipY = clamp(sy, y0 + h + 40, 1880);
  const accent = who === 'gb' ? '#1b3d8f' : '#c4161c';
  const tail = `<path d="M${ax - 34},${y0 + h - 6} L${tipX},${tipY} L${ax + 34},${y0 + h - 6} Z" fill="#fff" stroke="#0b0b0b" stroke-width="10" stroke-linejoin="round"/>`;
  const box = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="44" fill="#fff" stroke="#0b0b0b" stroke-width="10"/>`;
  const cover = `<rect x="${ax - 30}" y="${y0 + h - 16}" width="60" height="14" fill="#fff"/>`;
  const strip = `<rect x="${x0 + 22}" y="${y0 + 14}" width="${w - 44}" height="9" rx="4" fill="${accent}"/>`;
  const txt = lines.map((l, i) => `<text x="${x0 + w / 2}" y="${y0 + 46 + size * .86 + i * size * 1.12}" text-anchor="middle" font-size="${size}" font-weight="900" fill="#0d0d0d" style="${F}letter-spacing:-1px">${l}</text>`).join('');
  const s = .6 + .4 * k;
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0;overflow:visible"><g opacity="${Math.min(1, k * 1.5)}" transform="translate(${tipX},${tipY}) scale(${s}) translate(${-tipX},${-tipY})" filter="url(#sh)">
    <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-opacity=".35"/></filter></defs>${tail}${box}${cover}${strip}${txt}</g></svg>`;
}
/** Map tag: pill with flag swatch, pointer line to (x, y). */
export function tag(text: string, x: number, y: number, side: 'gb' | 'zz' | 'place' | 'water', k: number, dx = 0, dy = -70, size = 30) {
  if (k <= 0) return ''; const bg = side === 'gb' ? '#13306e' : side === 'zz' ? '#b3141b' : side === 'water' ? 'transparent' : '#f3ead6'; const fg = side === 'place' ? '#2a2016' : side === 'water' ? '#e6f6ff' : '#fff';
  const w = text.length * size * .64 + (side === 'water' ? 0 : 40); const tx = clamp(x + dx, w / 2 + 20, 1060 - w / 2), ty = y + dy;
  if (side === 'water') return `<div style="position:absolute;left:${tx - w / 2}px;top:${ty - size}px;width:${w}px;text-align:center;${F}font-weight:700;font-style:italic;font-size:${size}px;letter-spacing:${size * .35}px;color:${fg};opacity:${k * .85};text-shadow:0 2px 8px rgba(0,30,60,.6)">${text}</div>`;
  const swatch = side === 'gb' ? `<span style="display:inline-block;width:${size * .9}px;height:${size * .55}px;margin-right:10px;vertical-align:middle;background:linear-gradient(#fff 0 0) center/100% 22% no-repeat,linear-gradient(#fff 0 0) center/22% 100% no-repeat,#c8102e;border:2px solid #fff;border-radius:3px"></span>` : side === 'zz' ? `<span style="display:inline-block;width:${size * .9}px;height:${size * .55}px;margin-right:10px;vertical-align:middle;background:#d81e24;border:2px solid #fff;border-radius:3px"></span>` : '';
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0;opacity:${k}"><line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${side === 'place' ? '#2a2016' : bg}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="7" fill="${side === 'place' ? '#2a2016' : bg}" stroke="#fff" stroke-width="3"/></svg>
  <div style="position:absolute;left:${tx}px;top:${ty}px;transform:translate(-50%,-50%) scale(${.7 + .3 * k});white-space:nowrap;${F}font-weight:900;font-size:${size}px;color:${fg};background:${bg};padding:${size * .28}px ${size * .5}px;border-radius:${size}px;border:3px solid ${side === 'place' ? '#2a2016' : '#fff'};box-shadow:0 6px 16px rgba(0,0,0,.35)">${swatch}${text}</div>`;
}
/** Animated dashed arrow along screen points. */
export function arrow(pts: [number, number][], color: string, k: number, width = 16) {
  if (k <= 0 || pts.length < 2) return '';
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const shown = len * clamp(k);
  // arrow head at the reached point
  let acc = 0, hp = pts[0], ang = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + l >= shown) { const f = (shown - acc) / l; hp = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); break; } acc += l; hp = pts[i]; ang = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]); }
  const hs = width * 2.4; const a1 = ang + 2.6, a2 = ang - 2.6;
  return `<svg width="1080" height="1920" style="position:absolute;left:0;top:0"><path d="${d}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="${width + 10}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${shown} 99999"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${shown} 99999"/>
    <path d="M${hp[0] + Math.cos(ang) * hs * .5},${hp[1] + Math.sin(ang) * hs * .5} L${hp[0] + Math.cos(a1) * hs},${hp[1] + Math.sin(a1) * hs} L${hp[0] + Math.cos(a2) * hs},${hp[1] + Math.sin(a2) * hs} Z" fill="${color}" stroke="rgba(0,0,0,.45)" stroke-width="5"/></svg>`;
}
export function title(text: string, y: number, size: number, k: number, color = '#fff', glow = '#d4a63a', track = 0) {
  if (k <= 0) return ''; const s = .55 + .45 * easeOut(k);
  return `<div style="position:absolute;left:0;top:${y}px;width:1080px;text-align:center;transform:translateY(-50%) scale(${s});opacity:${Math.min(1, k * 1.6)};${F}font-weight:900;font-size:${size}px;letter-spacing:${track}px;color:${color};
    -webkit-text-stroke:${size * .06}px #0b0b0b;paint-order:stroke fill;text-shadow:0 ${size * .08}px 0 #0b0b0b,0 0 ${size * .5}px ${glow}88,0 ${size * .12}px ${size * .3}px rgba(0,0,0,.6)">${text}</div>`;
}
export function plate(text: string, sub: string, y: number, k: number) {
  if (k <= 0) return '';
  return `<div style="position:absolute;left:50%;top:${y}px;transform:translate(-50%,-50%) scale(${.8 + .2 * k});opacity:${k};${F}text-align:center;background:rgba(14,18,28,.78);border:3px solid #d4a63a;border-radius:18px;padding:16px 34px;box-shadow:0 10px 30px rgba(0,0,0,.4)">
    <div style="font-weight:900;font-size:52px;letter-spacing:6px;color:#f5e6c0">${text}</div><div style="font-weight:700;font-size:36px;letter-spacing:4px;color:#d4a63a;margin-top:4px">${sub}</div></div>`;
}
export function versus(k: number, y: number, k2 = 1) {
  if (k <= 0) return '';
  const cell = (n: string, l: string, bg: string) => `<div style="flex:1;background:${bg};border:4px solid #fff;border-radius:18px;padding:12px 8px;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,.4)"><div style="font-weight:900;font-size:66px;color:#fff;line-height:1">${n}</div><div style="font-weight:900;font-size:25px;color:#fff;letter-spacing:2px">${l}</div></div>`;
  return `<div style="position:absolute;left:90px;width:900px;top:${y}px;display:flex;gap:26px;align-items:center;${F}opacity:${k};transform:scale(${.85 + .15 * k})">${cell('5', 'BRITISH WARSHIPS', '#13306e')}<div style="font-weight:900;font-size:46px;color:#fff;-webkit-text-stroke:3px #000;paint-order:stroke fill;opacity:${k2}">VS</div><div style="flex:1;opacity:${k2};transform:scale(${.8 + .2 * k2})">${cell('1', 'ROYAL YACHT', '#b3141b')}</div></div>`;
}
export function clockBadge(min: number, k: number) {
  if (k <= 0) return ''; const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return `<div style="position:absolute;right:70px;top:250px;opacity:${k};${F}font-weight:900;font-size:44px;color:#fff;background:rgba(14,18,28,.8);border:3px solid #d4a63a;border-radius:16px;padding:8px 22px">${h}:${String(m).padStart(2, '0')} AM</div>`;
}
