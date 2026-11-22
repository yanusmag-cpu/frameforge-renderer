// YunoWorld v9 surfaces: every Blender material is named "<surface>|<hex>". Here each surface gets a hand-designed
// procedural colour map + matching normal map (bricks with recessed mortar, cobbles with domes, wood grain, flagstones,
// grass detail, woven fabric, brushed metal...), multiplied by the per-piece vertex colours baked in Blender.
// Textures are 512 px per metre (box UVs in metres), cached per (surface, colour).
import * as T from 'three';
import { rng } from '../yw3/core.ts';

type Draw = { col: HTMLCanvasElement; hgt: HTMLCanvasElement };
const cache = new Map<string, { map: T.Texture; nrm: T.Texture | null }>();
const hex = (h: string) => { const c = new T.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };  // sRGB 0..255
const css = (c: number[], k = 1, a = 1) => `rgba(${Math.max(0, Math.min(255, c[0] * k)) | 0},${Math.max(0, Math.min(255, c[1] * k)) | 0},${Math.max(0, Math.min(255, c[2] * k)) | 0},${a})`;
const mk = (w = 512, h = 512) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/** height canvas (grey) -> tangent-space normal map */
function normalFrom(hc: HTMLCanvasElement, strength = 2.0) {
  const w = hc.width, h = hc.height, src = hc.getContext('2d')!.getImageData(0, 0, w, h).data; const out = mk(w, h); const g = out.getContext('2d')!; const img = g.createImageData(w, h);
  const H = (x: number, y: number) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength; const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4; img.data[i] = (-dx / l * .5 + .5) * 255; img.data[i + 1] = (dy / l * .5 + .5) * 255; img.data[i + 2] = (1 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return out;
}
function noiseFill(g: CanvasRenderingContext2D, w: number, h: number, base: number[], n: number, amp: number, sz: [number, number], seed: number, alpha = .5) {
  const R = rng(seed); for (let i = 0; i < n; i++) { const k = 1 + (R() - .5) * amp; g.fillStyle = css(base, k, alpha * R()); const s = sz[0] + R() * (sz[1] - sz[0]); g.fillRect(R() * w, R() * h, s, s * (.6 + R() * .8)); }
}

const SURF: Record<string, (b: number[], seed: number) => Draw> = {
  brick(b, seed) {   // running bond, 0.32 x 0.12 m bricks, recessed light mortar, chipped edges, soot/variation
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    const mortar = [Math.min(255, b[0] * .5 + 120), Math.min(255, b[1] * .5 + 112), Math.min(255, b[2] * .5 + 98)];
    g.fillStyle = css(mortar); g.fillRect(0, 0, 512, 512); q.fillStyle = '#333'; q.fillRect(0, 0, 512, 512);
    const bw = 512 / 3.2 * 1.0, bh = 512 / 8;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) {
      const x = c * bw + (r % 2) * bw / 2 + 3, y = r * bh + 3, w = bw - 7, hh = bh - 7; const k = .82 + R() * .34; const hue = (R() - .5) * 18;
      g.fillStyle = css([b[0] * k + hue, b[1] * k, b[2] * k - hue * .5]); g.beginPath(); g.roundRect(x, y, w, hh, 4); g.fill();
      for (let i = 0; i < 26; i++) { g.fillStyle = css(b, .7 + R() * .6, .25); g.fillRect(x + R() * w, y + R() * hh, 2 + R() * 7, 1 + R() * 3); }
      const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.14)'); g.fillStyle = gr; g.fillRect(x, y, w, hh);
      q.fillStyle = `rgb(${200 + R() * 40 | 0},${200 | 0},200)`; q.beginPath(); q.roundRect(x + 1, y + 1, w - 2, hh - 2, 5); q.fill();
      if (R() < .25) { g.fillStyle = css(mortar, .95); g.beginPath(); g.arc(x + (R() < .5 ? 0 : w), y + R() * hh, 3 + R() * 5, 0, 7); g.fill(); }
    }
    return { col, hgt };
  },
  plank(b, seed) {   // long grain along u, growth rings, knots, satin sheen variation
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#888'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 180; i++) { const y = R() * 512; const k = .72 + R() * .45; g.strokeStyle = css(b, k, .35 + R() * .35); g.lineWidth = .8 + R() * 2.4; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * .012 + i) * 2.5 + (R() - .5) * 1.5); g.stroke();
      q.strokeStyle = `rgba(${k > 1 ? 160 : 100},${k > 1 ? 160 : 100},${k > 1 ? 160 : 100},.5)`; q.lineWidth = g.lineWidth; q.beginPath(); q.moveTo(0, y); for (let x = 0; x <= 512; x += 32) q.lineTo(x, y + Math.sin(x * .012 + i) * 2.5); q.stroke(); }
    for (let i = 0; i < 3; i++) { const x = R() * 512, y = R() * 512; for (let k = 0; k < 5; k++) { g.strokeStyle = css(b, .5, .5); g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, 12 + k * 7, 4 + k * 3, 0, 0, 7); g.stroke(); } g.fillStyle = css(b, .4, .8); g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 7); g.fill(); }
    return { col, hgt };
  },
  bark(b, seed) {
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#777'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 160; i++) { const x = R() * 512; const k = .6 + R() * .6; g.strokeStyle = css(b, k, .6); g.lineWidth = 2 + R() * 6; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 40) g.lineTo(x + Math.sin(y * .02 + i) * 6, y); g.stroke();
      q.strokeStyle = k > 1 ? '#aaa' : '#444'; q.lineWidth = g.lineWidth; q.beginPath(); q.moveTo(x, 0); for (let y = 0; y <= 512; y += 40) q.lineTo(x + Math.sin(y * .02 + i) * 6, y); q.stroke(); }
    return { col, hgt };
  },
  stone(b, seed) {   // mottled stone with speckle, faint veins and edge wear
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#808080'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) { const k = .82 + R() * .36; g.fillStyle = css(b, k, .35); const r = 10 + R() * 50; g.beginPath(); g.arc(R() * 512, R() * 512, r, 0, 7); g.fill(); q.fillStyle = `rgba(${k * 128 | 0},${k * 128 | 0},${k * 128 | 0},.3)`; q.beginPath(); q.arc(R() * 512, R() * 512, r, 0, 7); q.fill(); }
    noiseFill(g, 512, 512, b, 4000, .8, [1, 3], seed + 1, .5);
    for (let i = 0; i < 6; i++) { g.strokeStyle = css(b, .6, .35); g.lineWidth = 1; g.beginPath(); let x = R() * 512, y = R() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (R() - .5) * 60; y += (R() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
    return { col, hgt };
  },
  cobble(b, seed) {  // rounded setts in offset rows (0.18 x 0.13 m), dark joints with grit, domed height
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b, .45); g.fillRect(0, 0, 512, 512); q.fillStyle = '#111'; q.fillRect(0, 0, 512, 512);
    const sw = 512 / 5.5, sh = 512 / 7.5;
    for (let r = 0; r < 8; r++) for (let c = -1; c < 7; c++) {
      const x = c * sw + (r % 2) * sw * .5 + R() * 6, y = r * sh + R() * 4, w = sw - 7 - R() * 8, hh = sh - 7 - R() * 6; const k = .75 + R() * .5;
      g.fillStyle = css(b, k); g.beginPath(); g.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, (R() - .5) * .3, 0, 7); g.fill();
      const gr = g.createRadialGradient(x + w * .35, y + hh * .3, 2, x + w / 2, y + hh / 2, w * .6); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = gr; g.fill();
      const gq = q.createRadialGradient(x + w / 2, y + hh / 2, 1, x + w / 2, y + hh / 2, w * .55); gq.addColorStop(0, '#fff'); gq.addColorStop(.75, '#999'); gq.addColorStop(1, '#222'); q.fillStyle = gq; q.beginPath(); q.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, 0, 0, 7); q.fill();
    }
    noiseFill(g, 512, 512, b, 3000, .9, [1, 2.5], seed + 3, .4);
    return { col, hgt };
  },
  ice(b, seed) {     // clear cold ice: cyan depth mottling, white fracture lines, frosty speckle
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#808080'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) { g.fillStyle = css(b, .85 + R() * .3, .25); g.beginPath(); g.arc(R() * 512, R() * 512, 20 + R() * 70, 0, 7); g.fill(); }
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(255,255,255,${.35 + R() * .4})`; q.strokeStyle = '#333'; g.lineWidth = q.lineWidth = 1 + R() * 2; let x = R() * 512, y = R() * 512; g.beginPath(); q.beginPath(); g.moveTo(x, y); q.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += (R() - .5) * 90; y += (R() - .5) * 90; g.lineTo(x, y); q.lineTo(x, y); } g.stroke(); q.stroke(); }
    noiseFill(g, 512, 512, [255, 255, 255], 2500, .2, [1, 2.5], seed + 4, .35);
    return { col, hgt };
  },
  pykrete(b, seed) { // frozen wood pulp: beige-grey ice packed with short fibres
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#808080'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const x = R() * 512, y = R() * 512, a = R() * 3.14, l = 4 + R() * 12; g.strokeStyle = `rgba(${130 + R() * 60},${95 + R() * 40},${50 + R() * 30},.65)`; g.lineWidth = 1 + R() * 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); q.strokeStyle = '#aaa'; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); }
    noiseFill(g, 512, 512, [240, 248, 252], 1500, .2, [2, 6], seed + 1, .25);
    return { col, hgt };
  },
  pave(b, seed) {    // flagstone paving slabs (0.6 m), dark joints, per-slab tone, worn speckle
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b, .55); g.fillRect(0, 0, 512, 512); q.fillStyle = '#222'; q.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 2; r++) for (let c = -1; c < 3; c++) { const x = c * 256 + (r % 2) * 128 + 3, y = r * 256 + 3; const k = .85 + R() * .25;
      g.fillStyle = css(b, k); g.fillRect(x, y, 250, 250); q.fillStyle = '#bbb'; q.fillRect(x + 2, y + 2, 246, 246); }
    noiseFill(g, 512, 512, b, 3500, .5, [1, 4], seed + 2, .35);
    return { col, hgt };
  },
  tile(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!; g.fillStyle = css(b); g.fillRect(0, 0, 256, 256); noiseFill(g, 256, 256, b, 900, .2, [1, 3], seed, .4); hgt.getContext('2d')!.fillStyle = '#888'; hgt.getContext('2d')!.fillRect(0, 0, 256, 256); return { col, hgt }; },
  plaster(b, seed) {
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = css(b); g.fillRect(0, 0, 512, 512); q.fillStyle = '#808080'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 420; i++) { const k = .9 + R() * .18; const r = 8 + R() * 60; const x = R() * 512, y = R() * 512; g.fillStyle = css(b, k, .18); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); q.fillStyle = `rgba(${k * 140 | 0},${k * 140 | 0},${k * 140 | 0},.2)`; q.beginPath(); q.arc(x, y, r, 0, 7); q.fill(); }
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(255,255,255,.04)'); gr.addColorStop(1, 'rgba(60,40,20,.08)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    return { col, hgt };
  },
  roof(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!; const R = rng(seed); g.fillStyle = css(b); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) { g.fillStyle = css(b, .85 + R() * .3, .5); g.fillRect(i * 22 + R() * 4, 0, 20, 256); } noiseFill(g, 256, 256, b, 800, .6, [1, 3], seed, .4); hgt.getContext('2d')!.fillStyle = '#888'; hgt.getContext('2d')!.fillRect(0, 0, 256, 256); return { col, hgt }; },
  metal(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!; const R = rng(seed); g.fillStyle = css(b); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 300; i++) { g.fillStyle = css(b, .9 + R() * .2, .4); g.fillRect(0, R() * 256, 256, .7); } noiseFill(g, 256, 256, b, 200, .5, [2, 6], seed, .25); hgt.getContext('2d')!.fillStyle = '#888'; hgt.getContext('2d')!.fillRect(0, 0, 256, 256); return { col, hgt }; },
  fabric(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; g.fillStyle = css(b); g.fillRect(0, 0, 256, 256); q.fillStyle = '#777'; q.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 4) { g.fillStyle = css(b, .9, .5); g.fillRect(0, i, 256, 1.5); g.fillRect(i, 0, 1.5, 256); q.fillStyle = '#aaa'; q.fillRect(0, i, 256, 2); } noiseFill(g, 256, 256, b, 500, .3, [1, 4], seed, .3); return { col, hgt }; },
  paper(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!; g.fillStyle = css(b); g.fillRect(0, 0, 256, 256); noiseFill(g, 256, 256, b, 400, .1, [1, 3], seed, .3);
    g.fillStyle = 'rgba(40,40,60,.35)'; for (let y = 30; y < 240; y += 14) g.fillRect(24, y, 120 + (y * 7 % 80), 2); hgt.getContext('2d')!.fillStyle = '#888'; hgt.getContext('2d')!.fillRect(0, 0, 256, 256); return { col, hgt }; },
  leaf(b, seed) { const col = mk(256, 256), hgt = mk(256, 256); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed); g.fillStyle = css(b); g.fillRect(0, 0, 256, 256); q.fillStyle = '#777'; q.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 520; i++) { const x = R() * 256, y = R() * 256, k = .75 + R() * .5; g.fillStyle = css(b, k, .7); g.beginPath(); g.ellipse(x, y, 5 + R() * 6, 3 + R() * 3, R() * 3, 0, 7); g.fill(); q.fillStyle = k > 1 ? '#bbb' : '#444'; q.beginPath(); q.ellipse(x, y, 5, 3, R() * 3, 0, 7); q.fill(); }
    return { col, hgt }; },
  terrain(b, seed) {  // grass detail on vertex-coloured ground: thousands of short blades, soil specks, clover dots
    void b;
    const col = mk(), hgt = mk(); const g = col.getContext('2d')!, q = hgt.getContext('2d')!; const R = rng(seed);
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 512, 512); q.fillStyle = '#777'; q.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const x = R() * 512, y = R() * 512, k = 150 + R() * 105; g.strokeStyle = `rgba(${k},${k + 12},${k * .9},.75)`; g.lineWidth = 1 + R() * 1.6; const a = -Math.PI / 2 + (R() - .5) * .9, l = 5 + R() * 11;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); q.strokeStyle = k > 200 ? '#bbb' : '#555'; q.lineWidth = g.lineWidth; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); q.stroke(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${90 + R() * 40},${70 + R() * 30},${50 + R() * 20},.35)`; g.fillRect(R() * 512, R() * 512, 2 + R() * 3, 2 + R() * 3); }
    return { col, hgt };
  },
  paint(b, seed) { const col = mk(128, 128), hgt = mk(128, 128); const g = col.getContext('2d')!; g.fillStyle = css(b); g.fillRect(0, 0, 128, 128); noiseFill(g, 128, 128, b, 160, .12, [2, 8], seed, .3); hgt.getContext('2d')!.fillStyle = '#888'; hgt.getContext('2d')!.fillRect(0, 0, 128, 128); return { col, hgt }; },
};
SURF.brass = SURF.metal; SURF.rubber = SURF.paint; SURF.snow = SURF.plaster;
const ROUGH: Record<string, number> = { ice: .18, pykrete: .6, snow: .95, pave: .85, brick: .92, plank: .58, bark: .9, stone: .82, cobble: .78, tile: .22, plaster: .93, roof: .8, metal: .38, brass: .3, fabric: .95, paper: .9, leaf: .85, terrain: .95, paint: .52, rubber: .85 };
const METAL: Record<string, number> = { metal: .45, brass: .75 };
const NRM: Record<string, number> = { ice: 1.2, pykrete: 1.4, pave: 2.0, brick: 2.6, plank: 1.2, bark: 2.5, stone: 1.6, cobble: 3.2, plaster: .8, fabric: 1.0, leaf: 1.4, terrain: 1.6 };
const SCALE: Record<string, number> = { terrain: .5, leaf: 1.5, tile: 1, roof: 1, paint: 1 };

/** dress one GLB material in place; returns the replacement material */
export function surface(m: T.Material, env: T.Texture, special: (tag: string, hexc: string, mesh: T.Mesh) => T.Material | null, mesh: T.Mesh): T.Material {
  const [tag, hexc] = (m.name || 'paint|#cccccc').split('|'); const hx = hexc ?? '#cccccc';
  const sp = special(tag, hx, mesh); if (sp) return sp;
  const src = m as T.MeshStandardMaterial;
  if (tag === 'emit') return new T.MeshStandardMaterial({ color: '#000', emissive: new T.Color(hx), emissiveIntensity: Math.max(2, (src.emissiveIntensity ?? 1) * 1.4), roughness: .3, name: m.name });
  if (tag === 'glass') return new T.MeshStandardMaterial({ color: new T.Color(hx), roughness: .04, metalness: 0, transparent: true, opacity: .38, envMap: env, envMapIntensity: 2.2, depthWrite: false, side: T.DoubleSide, name: m.name });
  const key = tag + hx; let tx = cache.get(key);
  if (!tx) {
    const f = SURF[tag] ?? SURF.paint; const seed = [...key].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) >>> 0; const d = f(hex(hx), seed % 9973 + 1);
    const map = new T.CanvasTexture(d.col); map.colorSpace = T.SRGBColorSpace; map.wrapS = map.wrapT = T.RepeatWrapping; map.anisotropy = 8;
    const ns = NRM[tag]; let nrm: T.Texture | null = null;
    if (ns) { nrm = new T.CanvasTexture(normalFrom(d.hgt, ns)); nrm.wrapS = nrm.wrapT = T.RepeatWrapping; nrm.anisotropy = 8; }
    const s = SCALE[tag] ?? 1; map.repeat.set(s, s); if (nrm) nrm.repeat.set(s, s);
    tx = { map, nrm }; cache.set(key, tx);
  }
  const hasCol = !!mesh.geometry.getAttribute('color');
  return new T.MeshStandardMaterial({ map: tx.map, normalMap: tx.nrm ?? undefined, normalScale: new T.Vector2(1, 1), vertexColors: hasCol, roughness: ROUGH[tag] ?? .7, metalness: METAL[tag] ?? 0,
    envMap: env, envMapIntensity: tag === 'metal' || tag === 'brass' ? 1.4 : tag === 'ice' ? 1.6 : .55, side: tag === 'terrain' || tag === 'leaf' ? T.FrontSide : T.DoubleSide, name: m.name });
}

/** remap a mesh's UVs to 0..1 over its own bounds (for boards, maps, signs, screens drawn as one picture) */
export function fitUV(g: T.BufferGeometry) {
  const uv = g.getAttribute('uv') as T.BufferAttribute; if (!uv) return; let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); a = Math.min(a, u); b = Math.max(b, u); c = Math.min(c, v); d = Math.max(d, v); }
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - a) / Math.max(1e-6, b - a), (uv.getY(i) - c) / Math.max(1e-6, d - c)); uv.needsUpdate = true;
}
