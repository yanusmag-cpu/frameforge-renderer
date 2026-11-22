// Pigeon film: which Blender sets/props to load, and the hand-drawn pictures on its chalkboard, map board and signposts.
import type { SetSpec } from '../engine9.ts';
import { rng } from '../../yw3/core.ts';
export const PIGEON_SETS: SetSpec[] = [
  { name: 'lab', glb: 'lab.glb' }, { name: 'war', glb: 'war.glb' }, { name: 'range', glb: 'range.glb', grass: 'range-grass.json' },
  { name: 'coast', glb: 'coast.glb', grass: 'coast-grass.json' }, { name: 'street', glb: 'street.glb', grass: 'street-grass.json' }, { name: 'navy', glb: 'navy.glb' }];
export const PIGEON_PROPS = [{ id: 'cone', glb: 'cone.glb' }, { id: 'glider', glb: 'glider.glb' }];
export function pigeonBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height;
  if (tag === 'board') {   // chalk diagram: the nose cone, a pigeon, the screen and arrows (no real documents copied)
    g.strokeStyle = 'rgba(240,240,230,.85)'; g.fillStyle = 'rgba(240,240,230,.85)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(80, 330); g.lineTo(520, 330); g.quadraticCurveTo(700, 300, 760, 270); g.quadraticCurveTo(700, 240, 520, 210); g.lineTo(80, 210); g.closePath(); g.stroke();
    for (const x of [200, 330, 450]) { g.beginPath(); g.moveTo(x, 210); g.lineTo(x, 330); g.stroke(); }
    g.beginPath(); g.ellipse(620, 270, 22, 22, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(265, 280, 42, 26, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(305, 255, 16, 0, 7); g.stroke(); g.beginPath(); g.moveTo(320, 255); g.lineTo(338, 260); g.stroke();
    g.setLineDash([12, 10]); g.beginPath(); g.moveTo(600, 270); g.lineTo(470, 270); g.stroke(); g.setLineDash([]);
    g.font = 'bold 44px Georgia, serif'; g.fillText('PECK = STEER', 560, 430); g.fillText('x3', 120, 170);
    g.beginPath(); g.moveTo(540, 420); g.lineTo(470, 345); g.stroke(); g.beginPath(); g.moveTo(470, 345); g.lineTo(476, 370); g.moveTo(470, 345); g.lineTo(494, 352); g.stroke();
    const R = rng(12); g.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 40; i++) g.fillRect(R() * W, R() * H, 80 + R() * 200, 18);
  }
  if (tag === 'map') {     // stylised ocean chart with convoy routes and pins (fictional, not a real document)
    g.fillStyle = '#8fc0cf'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8dcb8'; const land = (pts: number[][]) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); g.strokeStyle = '#8a7a5a'; g.lineWidth = 3; g.stroke(); };
    land([[0, 60], [210, 40], [300, 120], [260, 260], [320, 420], [200, 560], [0, 560]]); land([[640, 0], [1024, 0], [1024, 380], [900, 330], [820, 220], [700, 160]]); land([[760, 560], [880, 450], [1024, 470], [1024, 560]]);
    g.strokeStyle = 'rgba(40,60,80,.25)'; g.lineWidth = 2; for (let x = 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#b8342a'; g.lineWidth = 6; g.setLineDash([18, 12]); g.beginPath(); g.moveTo(300, 300); g.bezierCurveTo(480, 260, 560, 300, 760, 230); g.stroke(); g.setLineDash([]);
    for (const [x, y] of [[300, 300], [760, 230], [520, 280], [600, 380]]) { g.fillStyle = '#c0302a'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3, y - 3, 4, 0, 7); g.fill(); }
  }
  if (tag === 'sign') {    // signpost arm: arrow + a fictional town name
    g.fillStyle = '#1e2a3a'; g.font = 'bold 64px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TOWN  ➜', W / 2, H / 2);
  }
}
