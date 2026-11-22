// Mail film: sets/props to load, and the painted pictures (May's stamp tag, the depot name board).
import type { SetSpec } from '../engine9.ts';
export const MAIL_SETS: SetSpec[] = [{ name: 'farm', glb: 'farm.glb', grass: 'farm-grass.json' }, { name: 'line', glb: 'line.glb', grass: 'line-grass.json' },
  { name: 'mailcar', glb: 'mailcar.glb' }, { name: 'ohio', glb: 'ohio.glb', grass: 'ohio-grass.json' }, { name: 'office', glb: 'office.glb' }];
export const MAIL_PROPS = [{ id: 'train', glb: 'train.glb' }, { id: 'tag', glb: 'tag.glb' }, { id: 'scale', glb: 'scale.glb' }];
export function mailBoards(g: CanvasRenderingContext2D, tag: string) {
  const W = g.canvas.width, H = g.canvas.height;
  if (tag === 'map') {   // rows of perforated stamps (original designs: a profile medallion, "U.S. POSTAGE", value) + the address
    g.fillStyle = '#efe3c6'; g.fillRect(0, 0, W, H);
    const cols = ['#3f7a4a', '#b8352f', '#3f7a4a', '#2f4f8a', '#b8352f', '#3f7a4a']; const sw = 118, sh = 140;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
      const x = 40 + c * (sw + 14), y = 30 + r * (sh + 14), col = cols[(c + r * 2) % 6];
      g.fillStyle = '#fbf6ea'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x + k * sw / 8, y, 5, 0, 7); g.arc(x + k * sw / 8, y + sh, 5, 0, 7); g.fill(); }
      g.fillStyle = '#fbf6ea'; g.fillRect(x, y, sw, sh); g.fillStyle = col; g.fillRect(x + 8, y + 8, sw - 16, sh - 16);
      g.fillStyle = '#fbf6ea'; g.beginPath(); g.ellipse(x + sw / 2, y + sh * .45, 32, 38, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x + sw / 2 + 4, y + sh * .45, 18, 26, 0, 0, 7); g.fill();
      g.fillStyle = '#fbf6ea'; g.font = '800 15px Inter, Arial'; g.textAlign = 'center'; g.fillText('U.S. POSTAGE', x + sw / 2, y + 26); g.font = '900 26px Inter, Arial'; g.fillText(c % 3 === 1 ? '2¢' : '1¢', x + sw / 2, y + sh - 18);
      g.strokeStyle = 'rgba(40,40,60,.45)'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(x - 10, y + 40 + k * 14); g.bezierCurveTo(x + 30, y + 30 + k * 14, x + 70, y + 50 + k * 14, x + sw + 10, y + 40 + k * 14); } g.stroke();
    }
    g.fillStyle = '#2a2420'; g.font = 'italic 700 40px Georgia, serif'; g.textAlign = 'left'; g.fillText('To Grandma — Lewiston, Idaho', 44, H - 40);
  }
  if (tag === 'sign' && String(g.fillStyle).toLowerCase() === '#e8d8a8') { g.fillStyle = '#5a1a12'; g.font = '900 80px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('U.S. MAIL', W / 2, H / 2 + 4); return; }
  if (tag === 'sign') { g.fillStyle = '#f2e8d4'; g.font = '900 78px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('GRANGEVILLE', W / 2, H / 2 + 4); }
}
