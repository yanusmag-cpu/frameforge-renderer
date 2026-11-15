// Part 2 engine: the Part 1 engine (same look, lights, post) + the Part 2 sets, live sign textures and patrol-car light bars.
import * as T from 'three';
import { Engine, type Frame } from '../brazil/engine.ts';

export type Frame2 = Frame & {
  siren?: number;            // 0..1 strength of the red/blue light bars (flash pattern is driven by time)
  board?: number;            // evidence board progress: 0 = photos only, 1 = strings, >1 = arrest stamps (count = board-1, up to 9)
  screen?: number;           // HQ CRT brightness
};
type Ctx = CanvasRenderingContext2D;
const RECT: Record<string, [number, number, number, number]> = {          // [x0, y0(bottom), W, H] of the sign faces (+z facing)
  sign_board: [402.5, 1.0, 7, 1.6], sign_evidence: [430.8, 2.35, 3, .4], sign_hq: [603.5, 4.4, 11, .8],
};
function face(g: Ctx, x: number, y: number, r: number, hair: string, shirt: string, mood: number) {
  g.fillStyle = shirt; g.beginPath(); g.ellipse(x, y + r * 1.7, r * 1.25, r * .9, 0, Math.PI, 0); g.fill(); g.lineWidth = r * .12; g.strokeStyle = '#111'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
  if (hair) { g.fillStyle = hair; g.beginPath(); g.arc(x, y - r * .1, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.fill(); }
  g.fillStyle = '#111'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * .32, y - r * .05, r * .1, r * .16, 0, 0, 7); g.fill(); }
  g.beginPath(); g.lineWidth = r * .09; g.moveTo(x - r * .3, y + r * .45); g.quadraticCurveTo(x, y + r * (.45 + mood * .2), x + r * .3, y + r * .45); g.stroke();
}
export function drawBoard(g: Ctx, w: number, h: number, k: number) {
  // cork texture
  g.fillStyle = '#b48a55'; g.fillRect(0, 0, w, h); let s = 9;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${r() < .5 ? 60 : 230},${r() < .5 ? 40 : 200},20,${r() * .25})`; g.fillRect(r() * w, r() * h, 2, 2); }
  // city map (left), suspect photos, documents
  g.fillStyle = '#efe9da'; g.fillRect(40, 40, 420, 380); g.strokeStyle = '#c9c0aa'; g.lineWidth = 6;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(40 + i * 52, 40); g.lineTo(60 + i * 46, 420); g.stroke(); g.beginPath(); g.moveTo(40, 60 + i * 42); g.lineTo(460, 50 + i * 44); g.stroke(); }
  g.fillStyle = '#7fb3d9'; g.fillRect(40, 340, 420, 80); g.fillStyle = '#333'; g.font = '700 26px Inter'; g.fillText('FORTALEZA', 60, 395);
  const pins = [[150, 170], [330, 250], [230, 300]];
  const photos: [number, number, string, string][] = [[620, 60, '#1c1c1c', '#2e3136'], [880, 60, '', '#2a2c30'], [1140, 60, '#a88f5e', '#d7c7a1'], [620, 270, '#202020', '#3c4048'], [880, 270, '', '#2f5f9e'], [1140, 270, '', '#45484d'], [1400, 60, '#1c1c1c', '#c95f3b'], [1400, 270, '', '#4f8a5b'], [1660, 60, '', '#55606e']];
  photos.forEach(([x, y, hair, shirt], i) => {
    g.save(); g.translate(x + 100, y + 95); g.rotate(((i * 37) % 7 - 3) * .012); g.fillStyle = '#fbfbf6'; g.fillRect(-100, -95, 200, 190); g.fillStyle = '#d9dde2'; g.fillRect(-88, -84, 176, 140);
    face(g, 0, -22, 34, hair, shirt, -.3); g.fillStyle = '#222'; g.font = '700 22px Inter'; g.textAlign = 'center'; g.fillText('SUSPEITO ' + (i + 1), 0, 82);
    if (k > 1 + i) { g.globalAlpha = Math.min(1, (k - 1 - i) * 3); g.rotate(-.18); g.strokeStyle = '#d42a24'; g.lineWidth = 7; g.strokeRect(-92, -30, 184, 64); g.fillStyle = '#d42a24'; g.font = '900 50px Inter'; g.fillText('PRESO', 0, 18); g.globalAlpha = 1; }
    g.restore();
  });
  // red strings (drawn progressively)
  const ends: [number, number][] = [[720, 80], [980, 80], [1240, 80], [720, 290], [980, 290], [1240, 290], [1500, 80], [1500, 290], [1760, 80]];
  const sk = Math.max(0, Math.min(1, k));
  g.strokeStyle = '#c4161c'; g.lineWidth = 4;
  ends.forEach((e, i) => { const p = pins[i % 3]; const f = Math.max(0, Math.min(1, sk * ends.length - i)); if (f <= 0) return; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] + (e[0] - p[0]) * f, p[1] + (e[1] - p[1]) * f); g.stroke(); });
  for (const p of [...pins, ...ends]) { g.fillStyle = '#e02020'; g.beginPath(); g.arc(p[0], p[1], 9, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(p[0] - 3, p[1] - 3, 3, 0, 7); g.fill(); }
  // case header card
  g.fillStyle = '#fbfbf6'; g.fillRect(1660, 270, 200, 190); g.fillStyle = '#222'; g.font = '900 30px Inter'; g.textAlign = 'center'; g.fillText('CASO', 1760, 320); g.fillText('BANCO', 1760, 360); g.fillText('CENTRAL', 1760, 400); g.font = '700 22px Inter'; g.fillText('AGO 2005', 1760, 440); g.textAlign = 'left';
}
function staticSign(name: string, g: Ctx, w: number, h: number) {
  if (name === 'sign_evidence') { g.fillStyle = '#20324a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '800 64px Inter'; g.textAlign = 'center'; g.fillText('DEPÓSITO DE PROVAS', w / 2, h * .72); }
  if (name === 'sign_hq') { g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#16325c'; g.font = '900 96px Inter'; g.textAlign = 'center'; g.fillText('POLÍCIA FEDERAL', w / 2, h * .62); g.font = '700 34px Inter'; g.fillText('SUPERINTENDÊNCIA REGIONAL · CEARÁ', w / 2, h * .92); }
}
export class Engine2 extends Engine {
  sirens: T.MeshStandardMaterial[] = []; board: { c: HTMLCanvasElement; t: T.CanvasTexture; k: number } | null = null; screens: T.MeshStandardMaterial[] = [];
  async load2(base1: string, base2: string) {
    await this.load(base1, [base2 + 'part2.glb', base2 + 'props2.glb']);
    const seen = new Set<T.Material>();
    this.scene.traverse(o => {
      const m = (o as T.Mesh).material as T.MeshStandardMaterial; if (!m || seen.has(m)) return; seen.add(m);
      if (m.name === 'siren_red' || m.name === 'siren_blue') { m.toneMapped = true; this.sirens.push(m); (o as T.Mesh).castShadow = false; }
      if (m.name === 'sign_polcar') m.color.set('#264d99');
      if (m.name === 'screen') this.screens.push(m);
      const R = RECT[m.name]; if (!R) return;
      const [x, y, W, H] = R; const c = document.createElement('canvas'); c.width = Math.round(W * (m.name === 'sign_board' ? 280 : 200)); c.height = Math.round(H * (m.name === 'sign_board' ? 280 : 200));
      const g = c.getContext('2d')!; if (m.name === 'sign_board') drawBoard(g, c.width, c.height, 0); else staticSign(m.name, g, c.width, c.height);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(1 / W, -1 / H); t.offset.set(-x / W, (1 - y) / H); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
      m.map = t; m.color.set('#ffffff'); m.roughness = .7; m.needsUpdate = true;
      if (m.name === 'sign_board') this.board = { c, t, k: 0 };
    });
  }
  async render(F: Frame2, frame: number) {
    const s = F.siren ?? 0, ph = F.t * 7.5;
    for (const m of this.sirens) { const red = m.name === 'siren_red'; const on = (Math.sin(ph * Math.PI + (red ? 0 : Math.PI)) > 0 ? 1 : .08) * (Math.sin(ph * 4.7) > -.6 ? 1 : .4); m.emissiveIntensity = .4 + s * on * 7; }
    if (this.board && Math.abs((F.board ?? 0) - this.board.k) > .004) { this.board.k = F.board ?? 0; drawBoard(this.board.c.getContext('2d')!, this.board.c.width, this.board.c.height, this.board.k); this.board.t.needsUpdate = true; }
    for (const m of this.screens) m.emissiveIntensity = 1.2 * (F.screen ?? 1);
    return super.render(F, frame);
  }
}
