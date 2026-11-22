// Ice film: Blender sets/props to load, and the hand-drawn plan of the ice ship on Pyke's desk.
import type { SetSpec } from '../engine9.ts';
export const ICE_SETS: SetSpec[] = [{ name: 'hall', glb: 'hall.glb' }, { name: 'study', glb: 'study.glb' }, { name: 'bath', glb: 'bath.glb' },
  { name: 'carrier', glb: 'carrier.glb' }, { name: 'atlantic', glb: 'atlantic.glb' }, { name: 'lake', glb: 'lake.glb' }];
export const ICE_PROPS = [{ id: 'blocks', glb: 'blocks.glb' }, { id: 'uboat', glb: 'uboat.glb' }, { id: 'plane', glb: 'plane.glb' }, { id: 'macro', glb: 'macro.glb' }];
export function iceBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height;
  if (tag === 'board') {   // blueprint of a giant ice ship (fictional sketch)
    g.strokeStyle = 'rgba(235,245,255,.9)'; g.lineWidth = 4; g.strokeRect(20, 20, W - 40, H - 40);
    g.beginPath(); g.moveTo(90, 330); g.lineTo(820, 330); g.quadraticCurveTo(960, 300, 940, 250); g.lineTo(90, 250); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(90, 250); g.lineTo(90, 330); g.stroke(); g.strokeRect(560, 190, 120, 60);
    for (let x = 140; x < 820; x += 60) { g.beginPath(); g.moveTo(x, 255); g.lineTo(x, 325); g.stroke(); }
    g.font = 'bold 40px Georgia, serif'; g.fillStyle = 'rgba(235,245,255,.95)'; g.fillText('ICE + SAWDUST', 110, 120); g.fillText('2000 FT', 380, 420);
    g.setLineDash([10, 8]); g.beginPath(); g.moveTo(90, 390); g.lineTo(940, 390); g.stroke(); g.setLineDash([]);
  }
}
