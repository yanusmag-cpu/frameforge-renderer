// YunoWorld engine for "The Man Who Sold the Eiffel Tower Twice": FrameForge 3D engine + 1925 Paris surface shaders (canvas textures in metres),
// printed props (ministry letterhead, demolition blueprint, newspapers, posters, signs), window light shafts, haze and steam.
import * as T from 'three';
import { Engine, type Frame } from '../brazil/engine.ts';

export type Frame8 = Frame & {
  shafts?: { k: number; set: 'hotel' | 'station' | 'corridor' };   // volumetric light shafts through windows
  clockMin?: number;                                                 // station clock time (minutes after 12)
  towerTint?: number;
  hideMats?: string[];                                              // hide every mesh using these materials (e.g. the mirror glass)
  glassK?: number;                                                  // carriage window transparency
};

const C = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };
const rnd = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
function tex(c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) {
  const t = new T.CanvasTexture(c); t.flipY = false; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; if (srgb) t.colorSpace = T.SRGBColorSpace; return t;
}
const SERIF = 'Georgia, "Times New Roman", serif';

// ---------------------------------------------------------------------------------------------------------------- surfaces
function cobbles() {   // 1.2 m tile of granite setts in arcs
  const [c, g] = C(512, 512), R = rnd(7); g.fillStyle = '#6a5f52'; g.fillRect(0, 0, 512, 512);
  const n = 11, s = 512 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n + 1; i++) {
    const x = (i + (j % 2) * .5) * s, y = j * s; const v = 128 + R() * 60, wr = R() * 16;
    g.fillStyle = `rgb(${v + wr},${v * .93 + wr * .5},${v * .84})`; const r = 7;
    g.beginPath(); g.roundRect(x - s / 2 + 3, y + 3, s - 6, s - 6, r); g.fill();
    g.fillStyle = 'rgba(255,240,210,.12)'; g.beginPath(); g.roundRect(x - s / 2 + 5, y + 4, s - 12, s * .35, r); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x - s / 2 + 3, y + s - 9, s - 6, 5);
  }
  return tex(c, 1 / 1.2, 1 / 1.2);
}
function slabs(base: string, size: number, line = 'rgba(0,0,0,.18)', seed = 3) {
  const [c, g] = C(512, 512), R = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${R() > .5 ? '255,250,240' : '40,30,20'},${R() * .07})`; g.fillRect(R() * 512, R() * 512, 2 + R() * 6, 2 + R() * 6); }
  g.strokeStyle = line; g.lineWidth = 3; for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(0, k * 256); g.lineTo(512, k * 256); g.stroke(); g.beginPath(); g.moveTo(k * 256 + (k % 2) * 0, 0); g.lineTo(k * 256, 512); g.stroke(); }
  return tex(c, 1 / size, 1 / size);
}
function ashlar(base: string, seed: number) {   // 2 m × 1 m tile: courses of 0.5 m, staggered blocks, soft weathering
  const [c, g] = C(512, 256), R = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${R() > .45 ? '255,250,235' : '70,55,40'},${R() * .06})`; g.fillRect(R() * 512, R() * 256, 1 + R() * 5, 1 + R() * 5); }
  for (let row = 0; row < 2; row++) {
    const y = row * 128, off = row * 128;
    g.fillStyle = 'rgba(80,60,40,.22)'; g.fillRect(0, y, 512, 3);
    for (let x = off; x < 512 + 256; x += 256) { g.fillRect(x % 512, y, 3, 128); }
    const grd = g.createLinearGradient(0, y, 0, y + 128); grd.addColorStop(0, 'rgba(255,255,255,.06)'); grd.addColorStop(1, 'rgba(60,40,20,.06)'); g.fillStyle = grd; g.fillRect(0, y, 512, 128);
  }
  // rain streaks
  for (let i = 0; i < 40; i++) { const x = R() * 512; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(60,50,40,.0)'); gr.addColorStop(1, 'rgba(60,50,40,.07)'); g.fillStyle = gr; g.fillRect(x, 0, 2 + R() * 6, 256); }
  return tex(c, 1 / 2, 1);
}
function rustic() {
  const [c, g] = C(256, 256); g.fillStyle = '#c9b996'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 128) { g.fillStyle = 'rgba(60,45,30,.55)'; g.fillRect(0, y, 256, 9); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y + 9, 256, 4); }
  return tex(c, 1 / 1.0, 1 / 1.0);
}
function zinc() {
  const [c, g] = C(256, 256), R = rnd(9); g.fillStyle = '#6c7682'; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(20,24,30,.45)'; g.fillRect(x, 0, 5, 256); g.fillStyle = 'rgba(220,230,240,.25)'; g.fillRect(x + 5, 0, 3, 256); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${R() * .05})`; g.fillRect(R() * 256, R() * 256, 30, 3); }
  return tex(c, 1 / 2, 1 / 2);
}
function lawn() {
  const [c, g] = C(256, 256), R = rnd(4); g.fillStyle = '#5a7a2c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { const v = R(); g.fillStyle = `rgba(${v > .5 ? '150,180,70' : '40,70,20'},${R() * .25})`; g.fillRect(R() * 256, R() * 256, 1, 3 + R() * 4); }
  return tex(c, 1 / 3, 1 / 3);
}
function gravel() {
  const [c, g] = C(256, 256), R = rnd(5); g.fillStyle = '#b8a582'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) { const v = 120 + R() * 110; g.fillStyle = `rgb(${v},${v * .92},${v * .78})`; g.fillRect(R() * 256, R() * 256, 1 + R() * 3, 1 + R() * 3); }
  return tex(c, 1 / 2, 1 / 2);
}
function parquet() {   // Versailles-like herringbone, 1.6 m tile
  const [c, g] = C(512, 512), R = rnd(11); g.fillStyle = '#6e3e1e'; g.fillRect(0, 0, 512, 512);
  const L = 128, W = 32;
  g.save(); g.translate(256, 256); g.rotate(Math.PI / 4); g.translate(-512, -512);
  for (let y = 0; y < 1024; y += W) for (let x = -L; x < 1024; x += L) {
    const off = ((y / W) % 2) * L / 2; const v = .8 + R() * .35;
    g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(92 * v)},${Math.round(50 * v)})`; g.fillRect(x + off + 1, y + 1, L - 2, W - 2);
    for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(60,30,10,${R() * .2})`; g.fillRect(x + off + R() * L, y + 3 + R() * (W - 6), 20 + R() * 40, 1); }
  }
  g.restore(); return tex(c, 1 / 1.6, 1 / 1.6);
}
function boiserie() {   // 1.4 m × 5.2 m wall panel: dado, tall moulded panel, gilt beads
  const [c, g] = C(256, 952); g.fillStyle = '#efe6d2'; g.fillRect(0, 0, 256, 952);
  const px = (m: number) => m * 183;    // px per metre
  const y = (m: number) => 952 - px(m);
  const panel = (x0: number, y0: number, x1: number, y1: number) => {
    g.strokeStyle = '#c99a48'; g.lineWidth = 5; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(120,100,70,.25)'; g.lineWidth = 3; g.strokeRect(x0 + 9, y0 + 9, x1 - x0 - 18, y1 - y0 - 18);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.strokeRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
  };
  g.fillStyle = '#e4d8bd'; g.fillRect(0, y(.95), 256, px(.95)); g.fillStyle = '#c99a48'; g.fillRect(0, y(.98), 256, 6);
  panel(28, y(.8), 228, y(.2));
  panel(28, y(4.35), 228, y(1.25));
  g.fillStyle = '#c99a48'; g.beginPath(); g.ellipse(128, y(4.15), 34, 14, 0, 0, Math.PI * 2); g.fill();
  return tex(c, 1 / 1.4, 1 / 5.2);
}
function wallpaper() {   // corridor: rose damask stripes above a mahogany-tone dado
  const [c, g] = C(256, 512); g.fillStyle = '#d9b7a2'; g.fillRect(0, 0, 256, 512);
  for (let x = 0; x < 256; x += 64) { g.fillStyle = 'rgba(150,70,60,.18)'; g.fillRect(x, 0, 28, 512); }
  g.fillStyle = 'rgba(150,70,60,.22)'; for (let yy = 30; yy < 512; yy += 80) for (let x = 46; x < 256; x += 64) { g.beginPath(); g.ellipse(x, yy, 9, 16, 0, 0, Math.PI * 2); g.fill(); }
  return tex(c, 1 / 1.0, 1 / 2.0);
}
function runner() {   // red hall carpet with gold borders (u along corridor, v across 1.6 m)
  const [c, g] = C(512, 256); g.fillStyle = '#8e1a22'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#d1a24a'; g.fillRect(0, 14, 512, 10); g.fillRect(0, 232, 512, 10);
  g.fillStyle = '#5e0f16'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 242, 512, 14);
  g.strokeStyle = 'rgba(209,162,74,.55)'; g.lineWidth = 4; for (let x = 0; x < 512; x += 128) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 64, 70); g.lineTo(x + 128, 128); g.lineTo(x + 64, 186); g.closePath(); g.stroke(); }
  const t = tex(c, 1 / 2.0, 1 / 1.6); t.offset.set(0, .5); return t;
}
function shopWindow() {   // 2 m tile: shelves of goods behind glass, warm interior, reflections
  const [c, g] = C(256, 256), R = rnd(17); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#2e241c'); gr.addColorStop(1, '#5a4430'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (const y of [70, 140, 210]) { g.fillStyle = '#7a5a3a'; g.fillRect(0, y, 256, 6);
    for (let x = 4; x < 250;) { const w = 10 + R() * 22, h = 16 + R() * 38; const cols = ['#c9a24a', '#a33a2a', '#e6dcc4', '#3f6a5a', '#8a6a9a', '#d8b47a']; g.fillStyle = cols[Math.floor(R() * cols.length)];
      if (R() > .5) g.fillRect(x, y - h, w, h); else { g.beginPath(); g.ellipse(x + w / 2, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill(); } x += w + 3 + R() * 6; } }
  const rf = g.createLinearGradient(0, 0, 256, 256); rf.addColorStop(0, 'rgba(255,240,220,.0)'); rf.addColorStop(.45, 'rgba(255,240,220,.16)'); rf.addColorStop(.55, 'rgba(255,240,220,.0)'); g.fillStyle = rf; g.fillRect(0, 0, 256, 256);
  return tex(c, 1 / 2.0, 1 / 2.0);
}
function stripes(a: string, b: string) {
  const [c, g] = C(256, 64); g.fillStyle = a; g.fillRect(0, 0, 256, 64); g.fillStyle = b; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 32, 64);
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 54, 256, 10); return tex(c, 1, 1);
}
function railing() {   // wrought iron: balusters + scroll medallions (alpha)
  const [c, g] = C(256, 256); g.clearRect(0, 0, 256, 256); g.strokeStyle = '#111'; g.fillStyle = '#111';
  g.fillRect(0, 0, 256, 14); g.fillRect(0, 238, 256, 10);
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 6, 256);
  g.lineWidth = 6; for (let x = 16; x < 256; x += 64) { g.beginPath(); g.arc(x + 19, 128, 30, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x + 19, 128, 12, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 4; for (let x = 0; x < 256; x += 64) { g.beginPath(); g.moveTo(x, 40); g.quadraticCurveTo(x + 32, 70, x + 64, 40); g.stroke(); g.beginPath(); g.moveTo(x, 210); g.quadraticCurveTo(x + 32, 180, x + 64, 210); g.stroke(); }
  const t = tex(c, 1 / 1.0, 1 / .95); t.offset.set(0, 0); return t;
}

// ---------------------------------------------------------------------------------------------------------------- print & signage
export const SHOPS = ['BOULANGERIE', 'CAFÉ', 'PHARMACIE', 'LIBRAIRIE', 'TABAC', 'CHAPELLERIE', 'FLEURISTE', 'HORLOGERIE', 'ÉPICERIE', 'MODES', 'BRASSERIE', 'PÂTISSERIE'];
function shopAtlas() {
  const [c, g] = C(1024, 16 * 96); const cols = ['#183a2a', '#5a1414', '#1b2a4e', '#141414', '#2a1d14'];
  SHOPS.forEach((s, i) => {
    const y = i * 96; g.fillStyle = cols[i % 5]; g.fillRect(0, y, 1024, 96); g.strokeStyle = '#c99a48'; g.lineWidth = 5; g.strokeRect(10, y + 8, 1004, 80);
    g.fillStyle = '#e6c37a'; g.font = `700 58px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.split('').join(String.fromCharCode(8202)), 512, y + 50);
  });
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function signBoard(text: string, o: { bg: string; fg: string; w?: number; h?: number; font?: string; border?: string; sub?: string }) {
  const W = o.w ?? 1024, H = o.h ?? 128; const [c, g] = C(W, H); g.fillStyle = o.bg; g.fillRect(0, 0, W, H);
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(4, H * .05); g.strokeRect(H * .08, H * .08, W - H * .16, H - H * .16); }
  g.fillStyle = o.fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = o.font ?? `700 ${Math.round(H * .52)}px ${SERIF}`;
  g.fillText(text, W / 2, o.sub ? H * .4 : H * .54);
  if (o.sub) { g.font = `400 ${Math.round(H * .22)}px ${SERIF}`; g.fillText(o.sub, W / 2, H * .78); }
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function flagFR() { const [c, g] = C(192, 128); ['#1f3f8f', '#f4f1ea', '#c8202f'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64, 0, 64, 128); }); const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t; }
function newsFront(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, head: string, sub: string, seed: number, pic: 'tower' | 'plain' = 'plain') {
  const R = rnd(seed);
  g.fillStyle = '#ece4cf'; g.fillRect(x, y, w, h);
  g.fillStyle = '#1b1814'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `900 ${Math.round(w * .11)}px ${SERIF}`; g.fillText(title, x + w / 2, y + h * .1);
  g.fillRect(x + w * .05, y + h * .12, w * .9, h * .006); g.fillRect(x + w * .05, y + h * .135, w * .9, h * .003);
  g.font = `400 ${Math.round(w * .028)}px ${SERIF}`; g.fillText('PARIS — MAI 1925 — 15 CENTIMES', x + w / 2, y + h * .16);
  g.font = `900 ${Math.round(w * .075)}px ${SERIF}`;
  const words = head.split('\n'); words.forEach((l, i) => g.fillText(l, x + w / 2, y + h * (.24 + i * .075)));
  g.font = `italic 400 ${Math.round(w * .042)}px ${SERIF}`; g.fillText(sub, x + w / 2, y + h * (.26 + words.length * .075));
  const py = y + h * (.33 + words.length * .075);
  if (pic === 'tower') {
    g.fillStyle = '#c9bfa6'; g.fillRect(x + w * .08, py, w * .45, h * .34);
    g.strokeStyle = '#3a3328'; g.lineWidth = Math.max(1, w * .006); const bx = x + w * .305, by = py + h * .32, tw = w * .16, th = h * .29;
    g.beginPath(); g.moveTo(bx - tw, by); g.quadraticCurveTo(bx - tw * .25, by - th * .45, bx - tw * .04, by - th); g.lineTo(bx + tw * .04, by - th); g.quadraticCurveTo(bx + tw * .25, by - th * .45, bx + tw, by); g.stroke();
    g.beginPath(); g.moveTo(bx - tw * .55, by - th * .2); g.lineTo(bx + tw * .55, by - th * .2); g.moveTo(bx - tw * .32, by - th * .42); g.lineTo(bx + tw * .32, by - th * .42); g.stroke();
    g.beginPath(); g.arc(bx, by, tw * .55, Math.PI, 0); g.stroke();
    g.fillStyle = '#9a2a20'; g.font = `700 ${Math.round(w * .035)}px ${SERIF}`; g.fillText('ENTRETIEN : 1 MILLION', x + w * .305, py + h * .37);
  } else { g.fillStyle = '#cfc6b0'; g.fillRect(x + w * .08, py, w * .45, h * .3); g.fillStyle = '#9d947f'; g.fillRect(x + w * .14, py + h * .06, w * .2, h * .2); }
  g.fillStyle = 'rgba(40,35,28,.55)';
  for (let col = 0; col < 2; col++) for (let l = 0; l < 26; l++) {
    const lx = col === 0 ? x + w * .58 : x + w * .08, ly = col === 0 ? py + l * h * .018 : py + h * .4 + l * h * .012; if (ly > y + h * .96) continue;
    g.fillRect(lx, ly, (col === 0 ? w * .34 : w * .84) * (.7 + R() * .3), h * .004);
  }
}
function kioskPapers() {   // 8 faces, each covered with hanging front pages
  const [c, g] = C(2048, 512); g.fillStyle = '#1e3a2a'; g.fillRect(0, 0, 2048, 512);
  const T8 = ['LE MATIN', 'LE PETIT PARISIEN', 'LE FIGARO', "L'INTRANSIGEANT", 'LE JOURNAL', 'EXCELSIOR', 'LE TEMPS', 'PARIS-SOIR'];
  const H8 = ['LA TOUR EIFFEL\nCOÛTE TROP CHER', 'LE PRIX\nDU PAIN', 'EXPOSITION DES\nARTS DÉCORATIFS', 'LA TOUR\nEN DANGER ?', 'LE TOUR\nDE FRANCE', 'LES ARTS\nDÉCORATIFS', 'LA CHAMBRE\nVOTE', 'LA TOUR EIFFEL\nRUINEUSE'];
  for (let f = 0; f < 8; f++) for (let k = 0; k < 2; k++) {
    const i = (f * 2 + k) % 8; newsFront(g, f * 256 + 8 + k * 122, 30 + (k % 2) * 30, 116, 210, T8[i], H8[i], '', 40 + f * 3 + k, i === 0 || i === 7 ? 'tower' : 'plain');
    newsFront(g, f * 256 + 8 + k * 122, 270 + (k % 2) * 20, 116, 210, T8[(i + 3) % 8], H8[(i + 5) % 8], '', 80 + f * 5 + k);
  }
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function morrisPosters() {
  const [c, g] = C(2048, 512); const P = [['FOLIES BERGÈRE', '#c8202f', '#f2d27a'], ['EXPOSITION DES ARTS DÉCORATIFS', '#1f3f8f', '#f4ecd8'], ['CIRQUE MEDRANO', '#e2a13a', '#2a1a10'], ['THÉÂTRE DE PARIS', '#2b6b5a', '#f4ecd8'], ['MOULIN ROUGE', '#7a1420', '#f2d27a'], ['CHOCOLAT MENIER', '#e9dcc0', '#7a1420']];
  for (let i = 0; i < 6; i++) {
    const x = i * 341, [t1, bg, fg] = P[i]; g.fillStyle = bg; g.fillRect(x + 4, 0, 333, 512);
    g.fillStyle = fg; g.font = `900 ${t1.length > 16 ? 30 : 44}px ${SERIF}`; g.textAlign = 'center';
    const lines = t1.length > 16 ? t1.split(' DES ').map((s, j) => j ? 'DES ' + s : s) : [t1];
    lines.forEach((l, j) => g.fillText(l, x + 170, 70 + j * 40));
    g.globalAlpha = .55; g.beginPath(); g.arc(x + 170, 280, 90, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.font = `700 30px ${SERIF}`; g.fillText(i === 1 ? 'PARIS 1925' : 'CE SOIR', x + 170, 470);
  }
  const t = tex(c, 1, 1); t.wrapT = T.ClampToEdgeWrapping; return t;
}
function letterhead(seal = true) {   // A4 ministry letter (forged)
  const [c, g] = C(1024, 1448), R = rnd(21); g.fillStyle = '#f5eedb'; g.fillRect(0, 0, 1024, 1448);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(150,120,70,${R() * .04})`; g.fillRect(R() * 1024, R() * 1448, 3, 3); }
  g.fillStyle = '#1d2a55'; g.textAlign = 'center';
  g.font = `700 46px ${SERIF}`; g.fillText('RÉPUBLIQUE FRANÇAISE', 512, 120);
  g.fillStyle = '#c8202f'; g.fillRect(380, 140, 88, 8); g.fillStyle = '#f5eedb'; g.fillRect(468, 140, 88, 8); g.fillStyle = '#1d2a55'; g.fillRect(292, 140, 88, 8); g.fillStyle = '#c8202f'; g.fillRect(556, 140, 88, 8); g.fillStyle = '#1d2a55'; g.fillRect(644, 140, 88, 8);
  g.fillStyle = '#1d2a55'; g.font = `700 36px ${SERIF}`; g.fillText('MINISTÈRE DES POSTES ET TÉLÉGRAPHES', 512, 210);
  g.font = `italic 400 30px ${SERIF}`; g.fillText('Le Directeur Général Adjoint', 512, 256);
  g.textAlign = 'left'; g.font = `400 28px ${SERIF}`; g.fillStyle = '#2a2420'; g.fillText('Paris, le 8 mai 1925', 600, 340);
  g.font = `700 30px ${SERIF}`; g.fillText('CONFIDENTIEL', 110, 410);
  g.fillStyle = 'rgba(30,26,40,.75)';
  for (let l = 0; l < 22; l++) { const w = l % 6 === 5 ? 380 + R() * 200 : 740 + R() * 70; g.fillRect(110, 460 + l * 34, w, 5); }
  // signature + official stamp
  g.strokeStyle = '#1d2a55'; g.lineWidth = 4; g.beginPath(); g.moveTo(600, 1290); g.bezierCurveTo(650, 1200, 690, 1330, 740, 1260); g.bezierCurveTo(780, 1220, 800, 1310, 880, 1250); g.stroke();
  if (seal) { g.strokeStyle = 'rgba(160,30,40,.8)'; g.lineWidth = 6; g.beginPath(); g.arc(300, 1250, 95, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(300, 1250, 70, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(160,30,40,.8)'; g.font = `700 22px ${SERIF}`; g.textAlign = 'center'; g.fillText('P. T. T.', 300, 1258); g.font = `700 15px ${SERIF}`; g.fillText('RÉPUBLIQUE', 300, 1195); g.fillText('FRANÇAISE', 300, 1318); }
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function blueprint() {
  const [c, g] = C(1400, 1000); g.fillStyle = '#1f4a7a'; g.fillRect(0, 0, 1400, 1000);
  g.strokeStyle = 'rgba(200,225,250,.18)'; g.lineWidth = 1; for (let x = 0; x < 1400; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1000); g.stroke(); } for (let y = 0; y < 1000; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(1400, y); g.stroke(); }
  g.strokeStyle = '#e8f2fc'; g.lineWidth = 4; g.strokeRect(30, 30, 1340, 940);
  // tower elevation
  const bx = 520, by = 900, H = 780;
  const hw = (y: number) => Math.max(10, 230 * Math.exp(-y / (H / 3)));
  g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 60; i++) { const y = H * i / 60; g.lineTo(bx - hw(y), by - y); } g.stroke();
  g.beginPath(); for (let i = 0; i <= 60; i++) { const y = H * i / 60; g.lineTo(bx + hw(y), by - y); } g.stroke();
  g.lineWidth = 2; for (let i = 0; i < 26; i++) { const y0 = H * i / 26, y1 = H * (i + 1) / 26; g.beginPath(); g.moveTo(bx - hw(y0), by - y0); g.lineTo(bx + hw(y1), by - y1); g.moveTo(bx + hw(y0), by - y0); g.lineTo(bx - hw(y1), by - y1); g.stroke(); }
  g.beginPath(); g.arc(bx, by, 120, Math.PI, 0); g.stroke();
  for (const yy of [H * .19, H * .385, H * .92]) { g.strokeRect(bx - hw(yy) - 12, by - yy - 10, 2 * hw(yy) + 24, 20); }
  // demolition marks in red pencil
  g.strokeStyle = 'rgba(230,70,55,.95)'; g.lineWidth = 9; g.lineCap = 'round';
  for (const yy of [H * .19, H * .385, H * .62]) { g.beginPath(); g.moveTo(bx - hw(yy) - 60, by - yy + 6); g.lineTo(bx + hw(yy) + 60, by - yy - 6); g.stroke(); }
  g.fillStyle = '#e8f2fc'; g.textAlign = 'left'; g.font = `700 40px ${SERIF}`; g.fillText('TOUR EIFFEL', 860, 120);
  g.font = `700 30px ${SERIF}`; g.fillText('PROJET DE DÉMOLITION', 860, 170);
  g.font = `400 26px ${SERIF}`; ['Hauteur : 300 m', 'Fer puddlé : 7 300 tonnes', 'Vente aux enchères', 'du métal de récupération'].forEach((s, i) => g.fillText(s, 860, 260 + i * 44));
  g.fillStyle = 'rgba(230,70,55,.95)'; g.font = `700 34px ${SERIF}`; g.fillText('CONFIDENTIEL', 860, 480);
  g.strokeStyle = '#e8f2fc'; g.lineWidth = 2; g.strokeRect(850, 760, 470, 170); g.fillStyle = '#e8f2fc'; g.font = `400 22px ${SERIF}`; g.fillText('MINISTÈRE DES POSTES ET TÉLÉGRAPHES', 864, 800); g.fillText('Service des bâtiments — 1925', 864, 836); g.fillText('Échelle 1 : 1000', 864, 872);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function banknote() {
  const [c, g] = C(512, 280); const gr = g.createLinearGradient(0, 0, 512, 280); gr.addColorStop(0, '#c9b7d6'); gr.addColorStop(.5, '#e6d3c0'); gr.addColorStop(1, '#a9b7d6'); g.fillStyle = gr; g.fillRect(0, 0, 512, 280);
  g.strokeStyle = '#4a3a6a'; g.lineWidth = 6; g.strokeRect(12, 12, 488, 256); g.fillStyle = '#3a2a5a'; g.textAlign = 'center'; g.font = `700 30px ${SERIF}`; g.fillText('BANQUE DE FRANCE', 256, 60);
  g.font = `900 70px ${SERIF}`; g.fillText('100', 110, 190); g.fillText('100', 400, 190); g.font = `700 30px ${SERIF}`; g.fillText('CENT FRANCS', 256, 245);
  g.globalAlpha = .4; g.beginPath(); g.ellipse(256, 150, 60, 72, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  const t = tex(c, 1 / .18, 1 / .1); return t;
}
function chequeTex() {
  const [c, g] = C(800, 360); g.fillStyle = '#efe6cc'; g.fillRect(0, 0, 800, 360); g.strokeStyle = '#6a7a5a'; g.lineWidth = 4; g.strokeRect(10, 10, 780, 340);
  g.fillStyle = '#2a3a2a'; g.font = `700 32px ${SERIF}`; g.fillText('CRÉDIT LYONNAIS', 40, 60); g.font = `400 24px ${SERIF}`; g.fillText('Payez contre ce chèque', 40, 120);
  g.strokeStyle = '#1d2a55'; g.lineWidth = 3; g.beginPath(); g.moveTo(330, 125); g.bezierCurveTo(400, 100, 520, 140, 700, 110); g.stroke();
  g.fillStyle = '#1d2a55'; g.font = `italic 700 40px ${SERIF}`; g.fillText('Fr. 70 000', 480, 220); g.font = `italic 400 34px ${SERIF}`; g.fillText('A. Poisson', 520, 310);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function newspaperProp() {
  const [c, g] = C(1100, 760); g.fillStyle = '#e8e0ca'; g.fillRect(0, 0, 1100, 760);
  newsFront(g, 10, 10, 540, 740, 'LE MATIN', 'LA TOUR EIFFEL\nCOÛTE TROP CHER', 'Faudra-t-il la démolir ?', 3, 'tower');
  newsFront(g, 560, 10, 530, 740, 'LE MATIN', 'EXPOSITION\nDES ARTS', 'Succès au Grand Palais', 8);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(546, 0, 8, 760);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function painting(kind: number) {
  const [c, g] = C(512, 512), R = rnd(30 + kind);
  if (kind === 0) {   // landscape: river, poplars, sky
    const s = g.createLinearGradient(0, 0, 0, 300); s.addColorStop(0, '#9fb6c8'); s.addColorStop(1, '#ead6a6'); g.fillStyle = s; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#6b7a46'; g.fillRect(0, 290, 512, 222); g.fillStyle = '#9ab0b8'; g.beginPath(); g.moveTo(0, 380); g.quadraticCurveTo(250, 330, 512, 400); g.lineTo(512, 450); g.quadraticCurveTo(250, 380, 0, 430); g.fill();
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgb(${50 + R() * 30},${70 + R() * 30},${30})`; g.beginPath(); g.ellipse(40 + i * 55, 250, 14, 70, 0, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 1) {   // portrait of a statesman
    g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 512, 512); const gg = g.createRadialGradient(256, 200, 20, 256, 240, 300); gg.addColorStop(0, 'rgba(160,110,70,.6)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#e0b48c'; g.beginPath(); g.ellipse(256, 200, 70, 90, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d8d0c8'; g.beginPath(); g.ellipse(256, 270, 50, 40, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#16141a'; g.beginPath(); g.moveTo(110, 512); g.quadraticCurveTo(140, 320, 256, 310); g.quadraticCurveTo(372, 320, 402, 512); g.fill(); g.fillStyle = '#c8202f'; g.fillRect(300, 380, 20, 30);
  } else {   // still life
    g.fillStyle = '#2e3a2c'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#6a4a2a'; g.fillRect(0, 360, 512, 152);
    const fr = [['#c83a2a', 200, 330, 50], ['#e2b03a', 280, 340, 42], ['#8a2a6a', 330, 330, 38], ['#e2d8c0', 150, 300, 30]] as const;
    for (const [col, x, y, r] of fr) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#c9c0a8'; g.beginPath(); g.moveTo(380, 360); g.lineTo(400, 180); g.lineTo(430, 180); g.lineTo(450, 360); g.fill();
  }
  g.fillStyle = 'rgba(255,240,200,.06)'; for (let i = 0; i < 2000; i++) g.fillRect(R() * 512, R() * 512, 2, 2);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function stationPoster(kind: number) {
  const [c, g] = C(400, 560); const P = [['PARIS — VIENNE', 'par Strasbourg et Munich', '#1f3f8f', '#e9c46a'], ['STRASBOURG', 'Chemins de fer de l’Est', '#7a1420', '#f4ecd8'], ['LES VOSGES', 'Chemins de fer de l’Est', '#2b6b5a', '#f4ecd8']][kind];
  g.fillStyle = P[2]; g.fillRect(0, 0, 400, 560); g.fillStyle = P[3]; g.globalAlpha = .9; g.beginPath(); g.moveTo(0, 400); g.lineTo(140, 240); g.lineTo(230, 330); g.lineTo(300, 220); g.lineTo(400, 380); g.lineTo(400, 560); g.lineTo(0, 560); g.fill(); g.globalAlpha = 1;
  g.beginPath(); g.arc(300, 130, 50, 0, Math.PI * 2); g.fill();
  g.font = `900 40px ${SERIF}`; g.textAlign = 'center'; g.fillText(P[0], 200, 70); g.fillStyle = '#111'; g.font = `400 22px ${SERIF}`; g.fillText(P[1], 200, 530);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function clockFace(min: number) {
  const [c, g] = C(256, 256); g.fillStyle = '#f2ecdc'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#1a1a1a'; g.font = `700 22px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((s, i) => { const a = i / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(s, 128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); });
  const hand = (a: number, l: number, w: number) => { g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * l, 128 + Math.sin(a) * l); g.stroke(); };
  hand((min / 720) * Math.PI * 2 - Math.PI / 2, 55, 8); hand((min % 60) / 60 * Math.PI * 2 - Math.PI / 2, 85, 5);
  const t = tex(c, 1, 1); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}

// ---------------------------------------------------------------------------------------------------------------- engine
export class Engine8 extends Engine {
  shafts: T.Mesh[] = []; byMat = new Map<string, T.Mesh[]>(); clockTex: T.CanvasTexture | null = null; clockMat: T.MeshStandardMaterial | null = null; lastClock = -1;
  async load8(base: string) {
    this.cam.near = .03; this.cam.far = 3000; (this.sky.geometry as T.SphereGeometry).dispose(); this.sky.geometry = new T.SphereGeometry(2600, 32, 16);
    this.sun.shadow.mapSize.set(4096, 4096);
    await this.load(base);
    // multi-material KEEP props load as groups whose child meshes also start with KEEP_: keep only the group as the prop
    for (const [k, o] of [...this.objs]) if (o.parent && o.parent.name.startsWith('KEEP_')) { this.objs.delete(k); this.props.delete(k); o.visible = true; }
    const M: Record<string, () => T.Texture> = {
      cobble: cobbles, glass_shop: shopWindow, pavement: () => slabs('#9d978c', 1.4), kerb: () => slabs('#8e8a84', 1.0, 'rgba(0,0,0,.1)', 8), stone_a: () => ashlar('#dccfb0', 2), stone_b: () => ashlar('#d2c2a0', 5),
      stone_rust: rustic, zinc, lawn, gravel, parquet, boiserie, wallpaper, hall_carpet: runner, rail: railing, platform_stone: () => slabs('#8f8a80', 1.2, 'rgba(0,0,0,.15)', 13),
      awning_red: () => stripes('#b0262a', '#efe6d0'), awning_green: () => stripes('#1f5a3a', '#efe6d0'), awning_blue: () => stripes('#1f3f7a', '#efe6d0'),
      sign_shops: shopAtlas, kiosk_papers: kioskPapers, morris_posters: morrisPosters, paper_letter: () => letterhead(true), paper_letter0: () => letterhead(false), blueprint, banknote, cheque: chequeTex, newspaper: newspaperProp,
      canvas_a: () => painting(0), canvas_b: () => painting(1), canvas_c: () => painting(2), poster_a: () => stationPoster(0), poster_b: () => stationPoster(1), poster_c: () => stationPoster(2),
      flag_fr: flagFR, sign_crillon: () => signBoard('HÔTEL DE CRILLON', { bg: '#141414', fg: '#e6c37a', border: '#c99a48', w: 1024, h: 128 }),
      sign_police: () => signBoard('COMMISSARIAT DE POLICE', { bg: '#1d2a55', fg: '#f4f1ea', border: '#f4f1ea', w: 1024, h: 100 }),
      sign_cafe: () => signBoard('CAFÉ DU CHAMP DE MARS', { bg: '#5a1414', fg: '#e6c37a', border: '#c99a48', w: 2048, h: 100 }),
      sign_journaux: () => signBoard('JOURNAUX', { bg: '#1e3a2a', fg: '#e6c37a', w: 512, h: 96 }),
      sign_rue: () => signBoard('AVENUE RAPP', { bg: '#1f3f8f', fg: '#f4f1ea', border: '#f4f1ea', w: 512, h: 112, sub: '7ᵉ ARRONDISSEMENT' }),
      sign_station: () => signBoard('PARIS-EST', { bg: '#1e2a22', fg: '#e6c37a', border: '#c99a48', w: 1024, h: 100 }),
    };
    const cache = new Map<string, T.Texture>();
    this.scene.traverse(o => {
      const me = o as T.Mesh; if (!me.isMesh) return; const m = me.material as T.MeshStandardMaterial; const n = m.name;
      if (M[n]) { if (!cache.has(n)) cache.set(n, M[n]()); m.map = cache.get(n)!; m.color.set('#ffffff'); m.needsUpdate = true; }
      if (n === 'rail') { m.alphaTest = .5; me.castShadow = true; m.side = T.DoubleSide; }
      if (n === 'leaf') { m.vertexColors = true; m.color.set('#ffffff'); }
      if (n === 'glass_roof') { m.transparent = true; m.opacity = .35; m.depthWrite = false; me.castShadow = false; m.roughness = .1; if (this.envTex) m.envMap = this.envTex; }
      if (n === 'glass_win' || n === 'glass_shop' || n === 'mirror' || n === 'glass_drink' || n === 'crystal') { if (this.envTex) { m.envMap = this.envTex; m.envMapIntensity = n === 'mirror' ? 1.8 : 1.0; } m.metalness = n === 'mirror' ? 1 : .3; if (n === 'mirror') { m.color.set('#e8e2d6'); m.roughness = .08; } }
      if (n === 'glass_shop') { m.envMapIntensity = .35; m.roughness = .12; m.metalness = .1; m.emissive.set('#ffd9a0'); m.emissiveMap = m.map; m.emissiveIntensity = .25; }
      if (n === 'glass_drink') { m.transparent = true; m.opacity = .55; }
      if (n === 'lamp_glass' || n === 'crystal') { me.castShadow = false; m.toneMapped = false; }
      if (n === 'tower_iron') { m.roughness = .65; m.metalness = .35; if (this.envTex) m.envMap = this.envTex; }
      if (n === 'gilt' || n === 'brass' || n === 'trolley_brass') { m.color.set(n === 'gilt' ? '#d6ad55' : '#c99a48'); m.metalness = .55; m.roughness = .32; if (this.envTex) { m.envMap = this.envTex; m.envMapIntensity = 1.3; } }
      if (n === 'clock_face') { this.clockMat = m; }
      if (!this.byMat.has(n)) this.byMat.set(n, []); this.byMat.get(n)!.push(me);
      if (n === 'carriage_window') { m.transparent = true; m.opacity = .28; m.depthWrite = false; me.castShadow = false; m.roughness = .05; if (this.envTex) m.envMap = this.envTex; }
    });
    // light shafts (additive soft quads)
    const sm = new T.ShaderMaterial({ uniforms: { k: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float k; varying vec2 vU; void main(){ float a = smoothstep(0., .25, vU.y) * (1. - smoothstep(.75, 1., vU.y)) * smoothstep(0., .2, vU.x) * (1. - smoothstep(.8, 1., vU.x)); gl_FragColor = vec4(vec3(1., .82, .55) * a * k, 1.); }' });
    const add = (a: T.Vector3, b: T.Vector3, w: number, set: string) => {   // shaft from window point a toward floor point b
      const g = new T.PlaneGeometry(1, 1); const me = new T.Mesh(g, sm.clone()); const mid = a.clone().add(b).multiplyScalar(.5); const d = b.clone().sub(a);
      me.position.copy(mid); me.scale.set(w, d.length(), 1); me.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); me.userData.set = set; me.renderOrder = 7; me.visible = false; this.scene.add(me); this.shafts.push(me);
    };
    for (const cx of [-4.5, 0, 4.5]) for (const k of [-.5, 0, .5]) add(new T.Vector3(1000 + cx + k * .6, 3.6, -5.2), new T.Vector3(1000 + cx + k * .6 + 1.2, 0, -.5), 1.0, 'hotel');
    for (let i = 0; i < 9; i++) add(new T.Vector3(-1003 + i * .9 - 4, 17.4, -20 + i * 6), new T.Vector3(-1000 + i * .9 - 6, .9, -14 + i * 6), 2.4, 'station');
    for (let i = 0; i < 3; i++) add(new T.Vector3(1047, 3.2, -.6 + i * .6), new T.Vector3(1039, 0, -.6 + i * .6), .7, 'corridor');
  }
  async render(F8: Frame8, frame: number) {
    for (const s of this.shafts) { const on = F8.shafts && F8.shafts.set === s.userData.set && F8.shafts.k > 0; s.visible = !!on; if (on) ((s.material as T.ShaderMaterial).uniforms.k.value = F8.shafts!.k * .075); }
    if (this.clockMat && F8.clockMin !== undefined && Math.round(F8.clockMin) !== this.lastClock) { this.lastClock = Math.round(F8.clockMin); this.clockMat.map?.dispose(); this.clockMat.map = clockFace(this.lastClock); this.clockMat.color.set('#fff'); this.clockMat.needsUpdate = true; }
    for (const [k, list] of this.byMat) { const hide = F8.hideMats?.includes(k) ?? false; for (const me of list) if (!me.name.startsWith('KEEP')) me.visible = !hide; }
    await super.render(F8, frame);
  }
}
