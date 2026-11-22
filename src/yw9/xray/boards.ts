// X-ray film: sets/props, the shop posters and signs, and the fluoroscope's glowing green view of the foot bones.
import type { SetSpec, ScreenF } from '../engine9.ts';
export const XRAY_SETS: SetSpec[] = [{ name: 'shop', glb: 'shop.glb' }, { name: 'street', glb: 'street.glb' }, { name: 'state', glb: 'state.glb' }];
export const XRAY_PROPS = [{ id: 'scope', glb: 'scope.glb' }, { id: 'viewer', glb: 'viewer.glb' }];
export function xrayBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height; const bg = String(g.fillStyle).toLowerCase();
  if (tag === 'sign') { g.fillStyle = '#ffd890'; g.font = '900 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ffb040'; g.shadowBlur = 16; g.fillText('SHOES • X-RAY FITTING', W / 2, H / 2 + 4); g.shadowBlur = 0; }
  if (tag === 'map') {   // two original 1950s-style posters: a happy shoe, and a smiling foot-and-shoe "scientific fit"
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.9)'; g.textAlign = 'center';
    g.font = '900 120px Inter, Arial'; g.fillText(bg === '#c43d33' ? 'NEW!' : 'FIT', W / 2, 150);
    g.fillStyle = '#f6efe0'; g.beginPath(); g.ellipse(W / 2, H * .55, 300, 110, -.15, 0, 7); g.fill(); g.fillStyle = bg; g.beginPath(); g.ellipse(W / 2 - 60, H * .5, 120, 40, -.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.font = '800 60px Inter, Arial'; g.fillText(bg === '#c43d33' ? 'SPRING STYLES' : 'SCIENTIFIC FITTING', W / 2, H - 60);
  }
}
/** what you saw in the viewer: green phosphor, the dark outline of the shoe, and the bones of both feet with wiggling toes.
 *  s.dx = toe wiggle phase, s.zoom = how bright the screen glows, s.lock = 1 shows the shoe outline */
export function xrayScreen(g: CanvasRenderingContext2D, s: ScreenF, W: number) {
  const gl = s.zoom ?? 1; const bgr = g.createRadialGradient(W / 2, W / 2, 30, W / 2, W / 2, W * .7);
  bgr.addColorStop(0, `rgba(${80 * gl},${210 * gl},${120 * gl},1)`); bgr.addColorStop(1, `rgba(${10 * gl},${70 * gl},${40 * gl},1)`); g.fillStyle = bgr; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 400; i++) { const x = (i * 97.3 + s.t * 300) % W, y = (i * 57.1 + s.t * 170) % W; g.fillStyle = `rgba(200,255,210,${.05 + (i % 5) * .02})`; g.fillRect(x, y, 2, 2); }
  for (const side of [-1, 1]) {
    const cx = W / 2 + side * 110;
    if (s.lock) { g.fillStyle = 'rgba(10,50,25,.55)'; g.beginPath(); g.ellipse(cx, W * .52, 82, 225, side * .05, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(30,110,60,.55)'; g.beginPath(); g.ellipse(cx, W * .55, 66, 200, side * .05, 0, 7); g.fill();     // flesh
    g.fillStyle = 'rgba(225,255,230,.95)'; g.strokeStyle = 'rgba(240,255,240,.9)'; g.lineCap = 'round';
    g.beginPath(); g.ellipse(cx + side * 6, W * .84, 34, 48, 0, 0, 7); g.fill();                                           // heel
    g.beginPath(); g.ellipse(cx, W * .7, 40, 34, 0, 0, 7); g.fill();                                                         // ankle bones
    for (let m = 0; m < 5; m++) {
      const bx = cx + side * (m - 2) * 21, by0 = W * .64, by1 = W * .38 - Math.abs(m - 1.5) * 6, wig = Math.sin(s.dx * 6 + m * .7) * 8;
      g.lineWidth = m === 0 ? 16 : 11; g.beginPath(); g.moveTo(cx + side * (m - 2) * 9, by0); g.lineTo(bx, by1); g.stroke();
      const segs = m === 0 ? 2 : 3; let px = bx, py = by1 - 8;
      for (let k = 0; k < segs; k++) { const nx = px + side * (m - 2) * 2 + wig * (k + 1) * .5, ny = py - (m === 0 ? 30 : 22); g.lineWidth = m === 0 ? 14 : 9; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny - 6; }
    }
  }
  const vg = g.createRadialGradient(W / 2, W / 2, W * .25, W / 2, W / 2, W * .7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,15,5,.7)'); g.fillStyle = vg; g.fillRect(0, 0, W, W);
}
