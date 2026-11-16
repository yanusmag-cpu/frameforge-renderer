// Shared terrain height field — identical to the function in scripts/nyos/build-assets.py (used to place actors, cameras, gas flow).
export const WL = 20;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixf = (a: number, b: number, t: number) => a + (b - a) * t;
export const valleyX = (z: number) => 16 * Math.sin(z / 47) - 6 * Math.sin(z / 19) * smooth(150, 230, z);
export function H(x: number, z: number): number {
  const r = Math.hypot(x, z), ang = Math.atan2(z, x);
  let base = r < 92 ? WL - 27 * (1 - (r / 92) ** 2) ** .85 : r < 128 ? WL + 27 * smooth(92, 128, r) : 47 - 27 * (1 - Math.exp(-(r - 128) / 85));
  const rimb = Math.exp(-(((r - 120) / 26) ** 2));
  base += (Math.sin(ang * 5 + .4) * 3.2 + Math.sin(ang * 11 + 1) * 1.6) * rimb;
  base += 75 * smooth(250, 400, r) * (.55 + .45 * Math.sin(ang * 3 + .5)) + 22 * smooth(170, 330, r) * (.5 + .5 * Math.sin(ang * 7 - .7));
  base += (1.4 * Math.sin(x * .093 + z * .061) + .9 * Math.sin(x * .047 - z * .121) + .5 * Math.sin(x * .21 + z * .17)) * smooth(88, 104, r);
  const w = mixf(13, 68, smooth(118, 235, z)); const g = Math.exp(-(((x - valleyX(z)) / w) ** 2)) * smooth(84, 112, z);
  const target = mixf(WL + 2.2, 3, smooth(112, 238, z)) + .7 * Math.sin(x * .13) * smooth(200, 240, z) + .5 * Math.sin(z * .2 + x * .05);
  return mixf(base, target, g);
}
export const LANES: [number, number][][] = [[[-60, 300], [-38, 284], [-20, 270], [-8, 262], [6, 256], [22, 250], [40, 246]], [[-20, 270], [-24, 252], [-28, 236], [-22, 214], [-10, 190], [4, 160], [6, 135], [2, 108], [-6, 94]],
  [[-8, 262], [-6, 280], [-4, 300]], [[6, 256], [14, 274], [26, 286]]];
