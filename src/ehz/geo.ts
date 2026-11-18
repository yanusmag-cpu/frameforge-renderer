// Empire History Z — shared maths, coastline, geometry helpers and flag textures.
import * as T from 'three';

export type V3 = [number, number, number];
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (k: number) => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const easeOut = (k: number) => 1 - Math.pow(1 - clamp(k), 3);
export const rng = (s: number) => () => { s = (s * 16807 + 11) % 2147483647; return (s - 1) / 2147483646; };
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const vnoise = (x: number, z: number) => {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const h = (a: number, b: number) => hash(a * 57 + b * 113);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
};

// 1 unit = 10 m. North = -z, east = +x. Sea lies west of Zanzibar Town.
export const shoreX = (z: number) => -17 * Math.exp(-(((z - 52) / 15) ** 2)) + 16 * ss(-26, -75, z) + 1.3 * Math.sin(z * .19 + 1) + .6 * Math.sin(z * .47 + 2) - 3.4 * Math.exp(-(((z - 1) / 13) ** 2));
export const groundH = (x: number, z: number) => {
  const d = x - shoreX(z);
  if (d < 0) return Math.max(-3.6, -.22 + d * (.035 + .05 * ss(-4, -30, d))) - .25 * vnoise(x * .15, z * .15) * ss(-2, -10, d);
  if (d < 2.2) return lerp(-.22, .3, ss(0, 2.2, d));
  return .3 + .45 * ss(14, 45, d) + .25 * (vnoise(x * .06, z * .06) - .5) * ss(10, 30, d);
};
export const GLSL_GROUND = `
float hsh(vec2 p){ return fract(sin(dot(p, vec2(57., 113.)) * 1.) * 43758.5453); }
float h1(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  float a = h1(i.x*57.+i.y*113.), b = h1((i.x+1.)*57.+i.y*113.), c = h1(i.x*57.+(i.y+1.)*113.), d = h1((i.x+1.)*57.+(i.y+1.)*113.);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y); }
float shoreX(float z){ return -17.*exp(-pow((z-52.)/15.,2.)) + 16.*smoothstep(-26.,-75.,z) + 1.3*sin(z*.19+1.) + .6*sin(z*.47+2.) - 3.4*exp(-pow((z-1.)/13.,2.)); }
float groundH(vec2 p){ float d = p.x - shoreX(p.y);
  if (d < 0.) return max(-3.6, -.22 + d*(.035 + .05*smoothstep(-4.,-30.,d))) - .25*vn(p*.15)*smoothstep(-2.,-10.,d);
  if (d < 2.2) return mix(-.22, .3, smoothstep(0., 2.2, d));
  return .3 + .45*smoothstep(14.,45.,d) + .25*(vn(p*.06)-.5)*smoothstep(10.,30.,d); }
`;

// ---- geometry building with vertex colours -------------------------------------------------
export class Builder {
  pos: number[] = []; nor: number[] = []; col: number[] = [];
  add(g: T.BufferGeometry, m: T.Matrix4, color: string | T.Color) {
    const gg = g.index ? g.toNonIndexed() : g; gg.applyMatrix4(m); if (!gg.getAttribute('normal')) gg.computeVertexNormals();
    const c = color instanceof T.Color ? color : new T.Color(color);
    const p = gg.getAttribute('position'), n = gg.getAttribute('normal'); const vc = gg.getAttribute('color');
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      if (vc) this.col.push(vc.getX(i) * c.r, vc.getY(i) * c.g, vc.getZ(i) * c.b); else this.col.push(c.r, c.g, c.b);
    }
    return this;
  }
  box(w: number, h: number, d: number, at: V3, color: string, rot: V3 = [0, 0, 0]) { return this.add(new T.BoxGeometry(w, h, d), M(at, rot), color); }
  cyl(rt: number, rb: number, h: number, at: V3, color: string, seg = 12, rot: V3 = [0, 0, 0]) { return this.add(new T.CylinderGeometry(rt, rb, h, seg), M(at, rot), color); }
  geo() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3)); g.computeBoundingSphere(); return g; }
  mesh(mat: T.Material) { const m = new T.Mesh(this.geo(), mat); m.castShadow = true; m.receiveShadow = true; return m; }
}
export const M = (at: V3, rot: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) => new T.Matrix4().compose(new T.Vector3(...at), new T.Quaternion().setFromEuler(new T.Euler(...rot)), new T.Vector3(...s));
export const linColor = (hex: string) => new T.Color(hex);

// ---- flags (canvas) ----------------------------------------------------------------------------
export function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }
/** Union Flag drawn into box (x,y,w,h) — correct 1801 pattern with counterchanged saltire. */
export function unionJack(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y); g.scale(w / 60, h / 30);
  g.fillStyle = '#012169'; g.fillRect(0, 0, 60, 30);
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(60, 30); g.moveTo(60, 0); g.lineTo(0, 30); g.stroke();
  g.save(); g.beginPath();
  for (const tri of [[30, 15, 60, 15, 60, 30], [30, 15, 30, 30, 0, 30], [30, 15, 0, 15, 0, 0], [30, 15, 30, 0, 60, 0]]) { g.moveTo(tri[0], tri[1]); g.lineTo(tri[2], tri[3]); g.lineTo(tri[4], tri[5]); g.closePath(); }
  g.clip(); g.strokeStyle = '#C8102E'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(60, 30); g.moveTo(60, 0); g.lineTo(0, 30); g.stroke(); g.restore();
  g.fillStyle = '#fff'; g.fillRect(25, 0, 10, 30); g.fillRect(0, 10, 60, 10);
  g.fillStyle = '#C8102E'; g.fillRect(27, 0, 6, 30); g.fillRect(0, 12, 60, 6);
  g.restore();
}
export function flagTex(kind: 'union' | 'ensign' | 'red', w = 512) {
  const h = w / 2; const [c, g] = canvas(w, h);
  if (kind === 'red') { g.fillStyle = '#c4161c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, w * .04, h); }
  else if (kind === 'union') unionJack(g, 0, 0, w, h);
  else { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#C8102E'; g.fillRect(w * .5 - h * .1, 0, h * .2, h); g.fillRect(0, h * .4, w, h * .2); unionJack(g, 0, 0, w * .5, h * .5); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
