// FrameForge 2D engine — stylised world geography (coarse, hand-simplified coastlines [lon, lat]) + projections.
import { noise1, type V2 } from './motion.ts';

export const LAND: Record<string, V2[]> = {
  northAmerica: [[-168, 65], [-162, 70], [-140, 70], [-125, 70], [-110, 73], [-95, 72], [-85, 70], [-80, 63], [-90, 58], [-82, 52], [-78, 58], [-70, 60], [-62, 58], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-74, 40], [-76, 35], [-81, 31], [-80, 26], [-82, 28], [-84, 30], [-90, 29], [-97, 27], [-97, 22], [-94, 18], [-88, 21], [-87, 16], [-83, 15], [-83, 10], [-79, 9], [-78, 7], [-82, 8], [-86, 12], [-92, 14], [-97, 16], [-105, 20], [-110, 24], [-112, 29], [-110, 23], [-115, 30], [-118, 34], [-122, 37], [-124, 42], [-124, 48], [-130, 54], [-135, 58], [-146, 60], [-153, 58], [-160, 56], [-165, 60]],
  greenland: [[-55, 60], [-45, 60], [-38, 65], [-22, 70], [-18, 77], [-20, 82], [-40, 84], [-60, 82], [-70, 78], [-58, 75], [-54, 70], [-52, 65]],
  southAmerica: [[-78, 7], [-72, 12], [-62, 11], [-52, 5], [-35, -5], [-39, -15], [-41, -22], [-48, -26], [-53, -34], [-58, -39], [-65, -42], [-66, -48], [-69, -52], [-73, -53], [-75, -48], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, 0]],
  europe: [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [9, 57], [12, 56], [18, 59], [17, 63], [22, 66], [25, 71], [31, 70], [40, 68], [44, 66], [55, 68], [60, 69], [60, 55], [50, 47], [42, 45], [37, 46], [30, 46], [29, 41], [26, 40], [23, 36], [20, 40], [16, 38], [18, 40], [13, 44], [12, 45], [10, 44], [7, 43], [3, 43], [0, 39], [-5, 36]],
  uk: [[-5, 50], [1, 51], [2, 53], [-2, 56], [-4, 59], [-6, 57], [-3, 54], [-5, 52]],
  africa: [[-17, 21], [-16, 28], [-10, 31], [-6, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [35, 28], [43, 12], [51, 12], [50, 2], [41, -2], [40, -10], [40, -16], [35, -24], [33, -28], [27, -34], [19, -35], [17, -29], [12, -18], [13, -11], [9, -1], [9, 4], [5, 6], [-3, 5], [-8, 4], [-13, 8], [-17, 14]],
  madagascar: [[44, -16], [50, -15], [48, -25], [44, -24]],
  asia: [[60, 55], [60, 69], [70, 73], [80, 73], [100, 77], [113, 74], [130, 71], [150, 71], [160, 70], [180, 68], [180, 65], [170, 60], [163, 58], [160, 54], [156, 51], [156, 57], [142, 59], [137, 54], [141, 48], [135, 43], [130, 42], [129, 35], [127, 38], [125, 40], [121, 39], [119, 35], [122, 30], [120, 26], [116, 22], [109, 21], [106, 18], [109, 12], [105, 9], [101, 13], [100, 7], [103, 1], [99, 8], [98, 16], [94, 17], [91, 22], [87, 21], [80, 15], [77, 8], [73, 17], [72, 21], [67, 24], [61, 25], [57, 26], [56, 24], [52, 24], [50, 27], [48, 30], [44, 29], [51, 23], [55, 22], [59, 22], [57, 18], [52, 16], [43, 13], [42, 16], [39, 21], [35, 28], [34, 32], [36, 36], [27, 37], [26, 40], [29, 41], [41, 41], [42, 45], [50, 47]],
  japan: [[130, 31], [135, 34], [140, 35], [142, 40], [142, 45], [140, 43], [139, 38], [136, 36], [131, 34]],
  indonesia: [[95, 5], [104, -2], [106, -6], [114, -8], [120, -9], [125, -8], [118, -5], [116, 0], [118, 6], [110, 2], [103, 2], [100, 1]],
  borneoPng: [[131, -1], [141, -3], [150, -6], [147, -10], [141, -9], [134, -4]],
  australia: [[114, -22], [114, -34], [117, -35], [123, -34], [131, -31], [138, -35], [141, -38], [148, -38], [150, -37], [153, -31], [153, -25], [146, -19], [142, -11], [141, -17], [136, -12], [130, -12], [126, -14], [122, -18]],
  newZealand: [[172, -34], [178, -38], [174, -41], [171, -45], [167, -46], [172, -41]],
  antarctica: [[-180, -72], [-120, -73], [-60, -64], [0, -70], [60, -67], [120, -66], [180, -72], [180, -90], [-180, -90]],
};

/** Approximate centroids of the nine nuclear-armed states (for real-data markers only). */
export const NUCLEAR_STATES: { name: string; at: V2 }[] = [
  { name: 'USA', at: [-98, 39] }, { name: 'Russia', at: [90, 61] }, { name: 'China', at: [104, 35] }, { name: 'France', at: [2, 47] },
  { name: 'UK', at: [-2, 53] }, { name: 'India', at: [79, 22] }, { name: 'Pakistan', at: [69, 30] }, { name: 'Israel', at: [35, 31] }, { name: 'North Korea', at: [127, 40] },
];

export const equirect = (w: number, h: number, x0 = 0, y0 = 0) => ([lon, lat]: V2): V2 => [x0 + (lon + 180) / 360 * w, y0 + (90 - lat) / 180 * h];

/** Orthographic projection; returns null for the far side. rot = [lon0, lat0] centre. */
export function ortho(c: V2, R: number, lon0: number, lat0: number) {
  const p0 = lat0 * Math.PI / 180, cp0 = Math.cos(p0), sp0 = Math.sin(p0);
  const f = ([lon, lat]: V2): [number, number, number] => {
    const l = (lon - lon0) * Math.PI / 180, p = lat * Math.PI / 180;
    const x = Math.cos(p) * Math.sin(l), y = cp0 * Math.sin(p) - sp0 * Math.cos(p) * Math.cos(l), z = sp0 * Math.sin(p) + cp0 * Math.cos(p) * Math.cos(l);
    return [c[0] + x * R, c[1] - y * R, z];
  };
  return Object.assign(f, { c, R });
}

/** Densify polygons so orthographic edges stay round. */
export function densify(poly: V2[], step = 3): V2[] {
  const o: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) o.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  return o;
}
const DENSE: Record<string, V2[]> = Object.fromEntries(Object.entries(LAND).map(([k, v]) => [k, densify(v)]));

/** Land paths on an orthographic globe (front hemisphere only, clipped at the limb). */
export function globeLand(proj: ReturnType<typeof ortho>, fill: string, stroke: string, sw: number) {
  let s = '';
  for (const poly of Object.values(DENSE)) {
    const pts = poly.map(proj);
    if (pts.every(p => p[2] < 0)) continue;
    // hidden points are pinned to the limb so partially visible landmasses stay closed shapes
    const [cx, cy] = proj.c, R = proj.R;
    const d = pts.map(([x, y, z], i) => {
      let X = x, Y = y;
      if (z < 0) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; X = cx + dx / l * R; Y = cy + dy / l * R; }
      return `${i ? 'L' : 'M'}${X.toFixed(1)} ${Y.toFixed(1)}`;
    }).join('');
    s += `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  return s;
}
export function flatLand(proj: (p: V2) => V2, fill: string, stroke: string, sw: number) {
  return Object.entries(LAND).filter(([k]) => k !== 'antarctica').map(([, poly]) => `<path d="M${poly.map(p => proj(p).map(v => v.toFixed(1)).join(' ')).join('L')}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`).join('');
}

/** Procedural FICTIONAL continents for the scenario chapters (no real countries implied). */
export function fictionalWorld(seed = 7): { blocA: V2[]; blocB: V2[]; isles: V2[][]; border: V2[] } {
  const blob = (cx: number, cy: number, rx: number, ry: number, s: number, N = 64): V2[] =>
    Array.from({ length: N }, (_, i) => {
      const a = i / N * Math.PI * 2;
      const r = 1 + noise1(a * 2.2, s) * .22 + noise1(a * 6, s + 3) * .08;
      return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r] as V2;
    });
  const blocA = blob(-.42, .02, .4, .3, seed), blocB = blob(.4, -.04, .44, .32, seed + 11);
  const isles = [blob(-.05, .38, .07, .05, seed + 21, 24), blob(.02, -.4, .09, .05, seed + 31, 24), blob(.8, .32, .06, .05, seed + 41, 24), blob(-.85, -.32, .05, .04, seed + 51, 24)];
  const border = Array.from({ length: 9 }, (_, i) => [-.02 + noise1(i * .9, seed) * .02, -.26 + i * .065] as V2);
  return { blocA, blocB, isles, border };
}
