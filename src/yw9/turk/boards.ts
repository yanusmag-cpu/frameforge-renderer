// Turk film: sets/props to load, and the painted pictures (palace landscapes, theatre backdrop, the office wall screen).
import type { SetSpec } from '../engine9.ts';
export const TURK_SETS: SetSpec[] = [{ name: 'palace', glb: 'palace.glb' }, { name: 'theatre', glb: 'theatre.glb' }, { name: 'museum', glb: 'museum.glb' }, { name: 'room', glb: 'room.glb' }, { name: 'office', glb: 'office.glb' }];
export const TURK_PROPS = [{ id: 'turk', glb: 'turk.glb' }, { id: 'candle', glb: 'candle.glb' }];
export function turkBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height;
  if (tag === 'map') {   // painted landscape: sky, hills, a river and a little town (original)
    const sk = g.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, '#6f9fd0'); sk.addColorStop(.6, '#f2d8a8'); sk.addColorStop(1, '#e8c088'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6f8f5a'; g.beginPath(); g.moveTo(0, H * .62); g.bezierCurveTo(W * .3, H * .45, W * .6, H * .7, W, H * .52); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#4f7046'; g.beginPath(); g.moveTo(0, H * .78); g.bezierCurveTo(W * .4, H * .62, W * .7, H * .85, W, H * .72); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = '#9fc8e0'; g.lineWidth = 14; g.beginPath(); g.moveTo(W * .1, H); g.bezierCurveTo(W * .4, H * .8, W * .5, H * .75, W * .8, H * .66); g.stroke();
    for (let i = 0; i < 9; i++) { const x = W * .55 + i * 22, h = 30 + (i * 37 % 40); g.fillStyle = i % 2 ? '#c8b090' : '#b89878'; g.fillRect(x, H * .58 - h, 18, h); g.fillStyle = '#7a3a2a'; g.beginPath(); g.moveTo(x - 2, H * .58 - h); g.lineTo(x + 9, H * .58 - h - 12); g.lineTo(x + 20, H * .58 - h); g.fill(); }
  }
  if (tag === 'board') {  // the modern wall screen: glowing "AI"
    const gr = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .6); gr.addColorStop(0, '#16324e'); gr.addColorStop(1, '#070d18'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(90,180,255,.35)'; g.lineWidth = 3; for (let i = 0; i < 18; i++) { const y = 40 + i * 28; g.beginPath(); g.moveTo(0, y); g.lineTo(W * .22, y); g.lineTo(W * .26, y + 14); g.stroke(); g.beginPath(); g.moveTo(W, y); g.lineTo(W * .78, y); g.lineTo(W * .74, y - 14); g.stroke(); }
    g.font = '900 300px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#5ab0ff'; g.shadowBlur = 40; g.fillStyle = '#e8f4ff'; g.fillText('AI', W / 2, H / 2 + 10);
    g.shadowBlur = 0; g.font = '700 34px Inter, Arial, sans-serif'; g.fillStyle = '#9fd0ff'; g.fillText('TASK COMPLETE ✓', W / 2, H * .86);
  }
}
