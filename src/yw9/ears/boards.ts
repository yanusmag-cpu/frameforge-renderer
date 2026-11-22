// Ears film: sets/props to load, Dr Tucker's chalkboard and his oscillograph screen.
import type { SetSpec, ScreenF } from '../engine9.ts';
export const EARS_SETS: SetSpec[] = [{ name: 'denge', glb: 'denge.glb', grass: 'denge-grass.json' }, { name: 'lab', glb: 'lab.glb' }, { name: 'hut', glb: 'hut.glb' }, { name: 'radar', glb: 'radar.glb' }];
export const EARS_PROPS = [{ id: 'props', glb: 'props.glb' }];
export function earsBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height;
  if (tag === 'board') {   // chalk: a cupped hand behind an ear, and a dish focusing incoming waves onto a microphone
    g.strokeStyle = 'rgba(240,240,230,.9)'; g.fillStyle = 'rgba(240,240,230,.9)'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.ellipse(W * .2, H * .48, 70, 110, 0, -1.2, 3.6); g.stroke(); g.beginPath(); g.arc(W * .2 + 8, H * .5, 34, -1.4, 2.4); g.stroke();
    g.beginPath(); g.moveTo(W * .2 + 70, H * .2); g.quadraticCurveTo(W * .2 + 150, H * .5, W * .2 + 70, H * .8); g.stroke();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(W * .2 - 210 - k * 40, H * .5, 60 + k * 30, -.6, .6); g.stroke(); }
    g.font = '700 40px Georgia, serif'; g.textAlign = 'center'; g.fillText('= concrete!', W * .2 + 40, H * .93);
    g.beginPath(); g.arc(W * .78 + 170, H * .5, 230, 2.3, 3.98); g.lineWidth = 9; g.stroke(); g.lineWidth = 5;
    for (let k = 0; k < 5; k++) { const y = H * .22 + k * H * .14; g.beginPath(); g.moveTo(W * .5, y); g.lineTo(W * .78 - 40 + Math.abs(k - 2) * 12, y); g.lineTo(W * .78 - 60, H * .5); g.stroke(); }
    g.beginPath(); g.arc(W * .78 - 60, H * .5, 12, 0, 7); g.fill(); g.font = '700 34px Georgia, serif'; g.fillText('mic', W * .78 - 60, H * .5 + 54);
    g.font = 'italic 700 46px Georgia, serif'; g.fillText('SOUND MIRROR', W / 2, 64);
  }
}
/** the oscillograph: a glowing green trace that jumps when engines are heard (s.lock = loudness) */
export function earsScreen(g: CanvasRenderingContext2D, s: ScreenF, W: number) {
  g.fillStyle = '#062012'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(120,255,160,.25)'; g.lineWidth = 2;
  for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(0, k * W / 8); g.lineTo(W, k * W / 8); g.moveTo(k * W / 8, 0); g.lineTo(k * W / 8, W); g.stroke(); }
  g.strokeStyle = '#8affb0'; g.lineWidth = 6; g.shadowColor = '#5aff8a'; g.shadowBlur = 18; g.beginPath(); const a = .04 + (s.lock ?? 0) * .32;
  for (let x = 0; x <= W; x += 4) { const u = x / W; const y = W / 2 + Math.sin(u * 40 + s.t * 20) * W * a * Math.sin(u * 3.14) + Math.sin(u * 97 + s.t * 31) * W * .015; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.shadowBlur = 0;
}
