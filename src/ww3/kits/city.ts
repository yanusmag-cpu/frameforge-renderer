// City kit: layered skyline with live windows, sirens, horizon flash, mushroom cloud, shock front, blackout cascade, fires, haze.
import { beacon, mushroom, particles, puff, shockRing, smokeColumn } from '../../ff2d/fx.ts';
import { clamp, hash, inCubic, mix, outCubic, range, type V2 } from '../../ff2d/motion.ts';
import { type Cam, glow, H, layer, lin, rad, W } from '../../ff2d/stage.ts';

const n = (x: number) => +x.toFixed(1);
export type Sky = 'night' | 'dawn' | 'ash' | 'dusk' | 'grey';
const SKY: Record<Sky, [string, string, string]> = {
  night: ['#060b1d', '#17264d', '#34467a'], dawn: ['#3b4a63', '#a0896f', '#e3b483'], ash: ['#4b4a48', '#6d6a63', '#8d877b'],
  dusk: ['#1a1426', '#6b3a3a', '#d0723f'], grey: ['#5b636e', '#7d848c', '#9aa0a5'],
};
export type CityOpts = {
  sky: Sky; cam: Cam; lit?: number; ground?: number;
  blackout?: { t0: number; dur: number };          // windows switch off left→right in district steps
  sirens?: number; flash?: { t0: number; x: number }; cloud?: { t0: number; x: number; sc: number };
  shock?: { t0: number; x: number }; fires?: { x: number; y: number; s: number }[]; smoke?: number; haze?: number;
  restore?: { t0: number; dur: number }; ruins?: number; poles?: boolean; searchlights?: number; stars?: number; ash?: number;
};

function windowsOf(x: number, w: number, top: number, base: number, seed: number, t: number, litFrac: number, off: (x: number) => boolean, warm: string) {
  let s = '';
  for (let wy = top + 10; wy < base - 8; wy += 15) for (let wx = x + 6; wx < x + w - 8; wx += 12) {
    const r = hash(wx * .131 + wy * .717 + seed);
    if (r > litFrac || off(wx)) continue;
    const fl = hash(Math.floor(t * .4 + r * 11) + wx) > .03 ? 1 : .25;
    s += `<rect x="${n(wx)}" y="${n(wy)}" width="6" height="8" fill="${r < litFrac * .3 ? '#ffe9b8' : warm}" opacity="${n((.55 + r * .45) * fl)}"/>`;
  }
  return s;
}

/** One skyline band. depth 0 (far) .. 2 (near). */
function band(seed: number, depth: number, base: number, t: number, o: CityOpts, x0 = -500, x1 = 2500) {
  const col = ['#1a2442', '#141c34', '#0d1324'][depth], hmax = [260, 360, 480][depth];
  const day = o.sky === 'dawn' || o.sky === 'grey' || o.sky === 'ash';
  const fill = day ? ['#5c6470', '#454b55', '#30343b'][depth] : col;
  let s = '', x = x0, i = 0;
  const offAt = (wx: number) => {
    let off = false;
    if (o.blackout) { const k = range(t, o.blackout.t0, o.blackout.t0 + o.blackout.dur); off = Math.floor((wx + 500) / 380) / 8 < k * 1.05; }
    if (o.restore && off) { const k = range(t, o.restore.t0, o.restore.t0 + o.restore.dur); if (Math.floor((wx + 500) / 380) % 3 === 0 && k > Math.floor((wx + 500) / 380) / 8) off = false; }
    return off;
  };
  while (x < x1) {
    const w = 50 + hash(i * 3 + seed) * (70 + depth * 30), bh = hmax * (.3 + hash(i * 7 + seed) * .7) * (1 - (o.ruins ?? 0) * hash(i * 5 + seed) * .55);
    const top = base - bh;
    if ((o.ruins ?? 0) > .3 && hash(i + seed * 9) > .5) {
      s += `<path d="M${n(x)} ${n(base)} L${n(x)} ${n(top + 30)} L${n(x + w * .3)} ${n(top + 10)} L${n(x + w * .45)} ${n(top + 50)} L${n(x + w * .7)} ${n(top)} L${n(x + w)} ${n(top + 40)} L${n(x + w)} ${n(base)}Z" fill="${fill}"/>`;
    } else {
      s += `<rect x="${n(x)}" y="${n(top)}" width="${n(w)}" height="${n(bh + 400)}" fill="${fill}"/>`;
      if (hash(i * 13 + seed) > .7) s += `<rect x="${n(x + w * .4)}" y="${n(top - 30)}" width="4" height="30" fill="${fill}"/>` + (day ? '' : `<circle cx="${n(x + w * .4 + 2)}" cy="${n(top - 32)}" r="3" fill="#ff4b3a" opacity="${Math.sin(t * 3 + i) > .3 ? 1 : .15}"/>`);
    }
    if (!day) s += windowsOf(x, w, top, base, seed + i, t, (o.lit ?? .35) * (depth === 2 ? 1 : .8), offAt, depth === 0 ? '#e7b765' : '#f5c46a');
    x += w + 3 + hash(i * 11 + seed) * 8; i++;
  }
  return s;
}

export function cityScape(t: number, o: CityOpts): string {
  const [a, b, c] = SKY[o.sky], g = o.ground ?? 860;
  let bg = `<defs>${lin('csky' + o.sky, [[0, a], [.6, b], [1, c]])}</defs><rect x="-800" y="-600" width="3500" height="${g + 700}" fill="url(#csky${o.sky})"/>`;
  if (o.stars) for (let i = 0; i < 90; i++) bg += `<circle cx="${n(-300 + hash(i) * 2500)}" cy="${n(-200 + hash(i + 40) * 600)}" r="${n(.8 + hash(i + 9))}" fill="#fff" opacity="${n(o.stars * (.3 + .4 * Math.sin(t * 2 + i)))}"/>`;
  // horizon flash (screen-filling light is added in grade by the shot)
  let fx = '';
  if (o.flash) {
    const lt = t - o.flash.t0;
    if (lt >= 0) {
      const k = Math.exp(-lt * .9);
      fx += `<defs>${rad('hz', [[0, '#ffffff', k], [.25, '#fff1c2', k * .8], [.6, '#ff9a3b', k * .45], [1, '#ff5a1f', 0]])}</defs><ellipse cx="${o.flash.x}" cy="${g - 300}" rx="${n(900 + lt * 60)}" ry="${n(600 + lt * 40)}" fill="url(#hz)" style="mix-blend-mode:screen"/>`;
      fx += `<rect x="-800" y="-600" width="3500" height="${g + 700}" fill="#ff8a3b" opacity="${n(clamp(.25 * (1 - Math.exp(-lt)) * Math.exp(-lt * .05)))}" style="mix-blend-mode:screen"/>`;
    }
  }
  // far band
  let L0 = band(3, 0, g - 120, t, o) + fx;
  if (o.cloud) L0 += mushroom(o.cloud.x, g - 120, t - o.cloud.t0, o.cloud.sc, o.sky === 'night' ? 'night' : 'dusk');
  let L1 = band(17, 1, g - 40, t, o);
  if (o.fires) for (const f of o.fires) { L1 += glow([f.x, f.y], 160 * f.s, '#ff7a2b', .55 + .15 * Math.sin(t * 9 + f.x)) + smokeColumn([f.x, f.y], t, { h: 700 * f.s, w: 120 * f.s, wind: .35, a: .85, seed: f.x }); }
  if (o.smoke) for (let i = 0; i < 4; i++) L1 += smokeColumn([200 + i * 520, g - 80], t, { h: 900, w: 220, wind: .5, a: .7 * o.smoke, seed: 40 + i, rate: .12 });
  if (o.shock) L1 += shockRing([o.shock.x, g - 60], t - o.shock.t0, 900, .08);
  let L2 = band(29, 2, g + 20, t, o);
  L2 += `<rect x="-800" y="${g + 20}" width="3500" height="600" fill="#07090f"/>`;
  // dust wall rushing in after the shock
  if (o.shock && t > o.shock.t0 + .4) {
    const k = range(t, o.shock.t0 + .4, o.shock.t0 + 3.2);
    for (let i = 0; i < 9; i++) L2 += puff(-200 + i * 300, g + 10 - k * 40, 120 + k * 160, 300 + i, '#8a7564', '#4d3e33', inCubic(k) * .75, 6);
  }
  if (o.sirens) for (const [sx, sy] of [[260, g - 300], [1500, g - 360], [930, g - 250]] as V2[]) L2 += beacon([sx, sy], t + sx * .01, '#ff2b2b', 260 * o.sirens, 5);
  if (o.searchlights) for (let i = 0; i < 3; i++) {
    const ang = -Math.PI / 2 + Math.sin(t * .4 + i * 2) * .5, bx = 300 + i * 650;
    L0 += `<path d="M${bx} ${g} L${n(bx + Math.cos(ang - .04) * 1400)} ${n(g + Math.sin(ang - .04) * 1400)} L${n(bx + Math.cos(ang + .04) * 1400)} ${n(g + Math.sin(ang + .04) * 1400)}Z" fill="#cfe3ff" opacity="${.08 * o.searchlights}" style="mix-blend-mode:screen"/>`;
  }
  // foreground civil-defence siren masts (parallax 1.25): rotating horn heads with pulsing red lamps
  let L3 = '';
  if (o.poles) {
    L3 += `<path d="M-600 ${g + 150} L700 ${g + 150} L700 ${g + 135} L2600 ${g + 135} L2600 1800 L-600 1800Z" fill="#06080d" stroke="#111" stroke-width="4"/><path d="M-600 ${g + 168} H700 M700 ${g + 153} H2600" stroke="#1a2030" stroke-width="5"/>`;
    for (const ax of [880, 1180]) L3 += `<rect x="${ax}" y="${g + 70}" width="150" height="66" fill="#0b0e15" stroke="#111" stroke-width="4"/><circle cx="${ax + 45}" cy="${g + 103}" r="22" fill="none" stroke="#1d2433" stroke-width="5"/>`;
  }
  if (o.poles) for (const [px, ph] of [[560, 470], [1430, 540]] as V2[]) {
    const top = g + 120 - ph, rot = Math.sin(t * 2.2 + px) * 25;
    L3 += `<rect x="${px - 9}" y="${top}" width="18" height="${ph + 300}" fill="#05070c" stroke="#111" stroke-width="3"/>`;
    L3 += `<g transform="translate(${px} ${top}) rotate(${n(rot)})"><rect x="-56" y="-26" width="112" height="44" rx="10" fill="#1c2230" stroke="#111" stroke-width="4"/>${[-1, 1].map(sd => `<path d="M${sd * 56} -18 L${sd * 92} -34 L${sd * 92} 26 L${sd * 56} 10Z" fill="#2a3242" stroke="#111" stroke-width="4"/>`).join('')}<circle cy="-40" r="12" fill="#ff2b2b" opacity="${(.4 + .6 * Math.max(0, Math.sin(t * 8 + px))).toFixed(2)}"/></g>`;
    L3 += beacon([px, top - 40], t + px, '#ff2b2b', 300, 8);
    for (let k = 0; k < 3; k++) { const rr = ((t * 1.4 + k / 3) % 1); L3 += `<circle cx="${px}" cy="${top}" r="${n(60 + rr * 420)}" fill="none" stroke="#ff6b5b" stroke-width="3" opacity="${n(.35 * (1 - rr) * (o.sirens ?? 0))}"/>`; }
  }
  let s = layer(o.cam, .55, t, bg + L0) + layer(o.cam, .8, t, L1) + layer(o.cam, 1, t, L2) + (L3 ? layer({ ...o.cam, zoom: o.cam.zoom * 1.1 }, 1.25, t, L3) : '');
  if (o.haze) s += `<rect width="${W}" height="${H}" fill="${o.sky === 'night' ? '#2a3456' : '#9a8e7e'}" opacity="${n(o.haze)}"/>`;
  if (o.ash) s += particles(t, { count: 120, col: '#d9d4c9', size: 2.4, fall: 40, drift: 18, a: .7 * o.ash, seed: 5 });
  return s;
}

/** helper: the blinding flash amount for grade() */
export const flashAmt = (t: number, t0: number) => t < t0 ? 0 : clamp(Math.exp(-(t - t0) * 2.2) * (1 - range(t, t0, t0 + .04) * 0) * outCubic(range(t, t0, t0 + .05)));
export const mixc = mix;
