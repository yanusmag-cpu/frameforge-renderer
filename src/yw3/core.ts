// YunoWorld "three shorts" core: renderer, post grade, sun/hemi/fill lights, fog, env map, VFX sprites and the
// original flat FrameForge stickman cut-outs (ff2d rig via brazil Actor). Each film adds its own world on top.
import * as T from 'three';
import { Post, DEFAULT_GRADE, type Grade } from '../brazil/post.ts';
import { Actor, type ActorState } from '../brazil/actor.ts';
import { Sprites, type Sprite } from '../ehz/fx.ts';

export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov: number; up?: V3; roll?: number; near?: number; far?: number };
export type Light = { p: V3; c: [number, number, number]; i: number; d?: number };
export type YFrame = {
  t: number; cam: Cam; actors?: ActorState[]; grade?: Partial<Grade>; overlay?: string;
  sun?: { dir: V3; color: string; i: number; focus: V3; size: number; shadow?: boolean };
  hemi?: { sky: string; ground: string; i: number }; fill?: { color: string; i: number };
  fog?: { color: string; density: number }; bg?: string;
  sprites?: Sprite[]; lights?: Light[]; shake?: number; [k: string]: unknown;
};
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (k: number) => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const kk = (t: number, a: number, b: number) => ease((t - a) / (b - a));
export const mv = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const rng = (s: number) => () => { s = (s * 16807 + 11) % 2147483647; return (s - 1) / 2147483646; };
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const GLSL_NOISE = `
float h12(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),u.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 17.1; a *= .5; } return s; }`;

/** Vertex-coloured mesh builder. */
export class Builder {
  pos: number[] = []; nor: number[] = []; col: number[] = [];
  add(g: T.BufferGeometry, m: T.Matrix4, color: string | T.Color) {
    const gg = g.index ? g.toNonIndexed() : g.clone(); gg.applyMatrix4(m); if (!gg.getAttribute('normal')) gg.computeVertexNormals();
    const c = color instanceof T.Color ? color : new T.Color(color); const p = gg.getAttribute('position'), n = gg.getAttribute('normal'), vc = gg.getAttribute('color');
    for (let i = 0; i < p.count; i++) { this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nor.push(n.getX(i), n.getY(i), n.getZ(i)); if (vc) this.col.push(vc.getX(i) * c.r, vc.getY(i) * c.g, vc.getZ(i) * c.b); else this.col.push(c.r, c.g, c.b); }
    return this;
  }
  box(w: number, h: number, d: number, at: V3, color: string, rot: V3 = [0, 0, 0]) { return this.add(new T.BoxGeometry(w, h, d), M(at, rot), color); }
  cyl(rt: number, rb: number, h: number, at: V3, color: string, seg = 12, rot: V3 = [0, 0, 0]) { return this.add(new T.CylinderGeometry(rt, rb, h, seg), M(at, rot), color); }
  geo() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3)); g.computeBoundingSphere(); return g; }
  mesh(mat?: T.Material) { const m = new T.Mesh(this.geo(), mat ?? new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); m.castShadow = true; m.receiveShadow = true; return m; }
}
export const M = (at: V3, rot: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) => new T.Matrix4().compose(new T.Vector3(...at), new T.Quaternion().setFromEuler(new T.Euler(...rot)), new T.Vector3(...s));
export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

export class Core {
  r: T.WebGLRenderer; scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 9 / 16, .05, 5000); post: Post;
  sun = new T.DirectionalLight('#fff', 3); hemi = new T.HemisphereLight('#bcd', '#875', 1); fill = new T.DirectionalLight('#fff', 0);
  pts: T.PointLight[] = []; env: T.Texture; sprites: Sprites; actors = new Map<string, Actor>();
  constructor(public canvasEl: HTMLCanvasElement, public w: number, public h: number, envTop = '#9fbfe8', envBot = '#6a5a48') {
    this.r = new T.WebGLRenderer({ canvas: canvasEl, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(1); this.r.setSize(w, h, false); this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap; this.r.outputColorSpace = T.LinearSRGBColorSpace;
    this.post = new Post(this.r, w, h);
    const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ side: T.BackSide, uniforms: { a: { value: new T.Color(envTop) }, b: { value: new T.Color(envBot) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 a, b; varying vec3 vD; void main(){ gl_FragColor = vec4(mix(b, a, smoothstep(-.2,.6,vD.y)) + vec3(1.5) * smoothstep(.9,.99,dot(vD, normalize(vec3(.4,.8,.3)))), 1.); }' })));
    this.env = new T.PMREMGenerator(this.r).fromScene(es, 0).texture;
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .03; this.sun.shadow.radius = 2;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.fill, this.fill.target);
    for (let i = 0; i < 6; i++) { const p = new T.PointLight('#fff', 0, 10, 2); this.pts.push(p); this.scene.add(p); }
    this.scene.fog = new T.FogExp2('#ccd', 0);
    this.sprites = new Sprites(this.scene);
  }
  /** Camera, lights, fog, actors and sprites from the frame; call world updates before. */
  async frameBase(F: YFrame) {
    const c = F.cam; this.cam.position.set(...c.pos); this.cam.up.set(...(c.up ?? [0, 1, 0])); this.cam.lookAt(...c.look); if (c.roll) this.cam.rotateZ(c.roll);
    const sh = F.shake ?? 0; if (sh) { this.cam.translateX(Math.sin(F.t * 83) * sh * .6 + Math.sin(F.t * 41) * sh * .4); this.cam.translateY(Math.cos(F.t * 71) * sh * .5); }
    this.cam.fov = c.fov; this.cam.near = c.near ?? .05; this.cam.far = c.far ?? 5000; this.cam.aspect = this.w / this.h; this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    const s = F.sun; if (s) { const d = new T.Vector3(...s.dir).normalize(); const f = new T.Vector3(...s.focus); this.sun.position.copy(f).addScaledVector(d, Math.max(40, s.size * 3)); this.sun.target.position.copy(f); this.sun.target.updateMatrixWorld();
      this.sun.color.set(s.color); this.sun.intensity = s.i; this.sun.castShadow = s.shadow ?? true; const sc = this.sun.shadow.camera; sc.left = -s.size; sc.right = s.size; sc.top = s.size; sc.bottom = -s.size; sc.near = .5; sc.far = s.size * 8 + 80; sc.updateProjectionMatrix(); }
    else this.sun.intensity = 0;
    const hm = F.hemi; if (hm) { this.hemi.color.set(hm.sky); this.hemi.groundColor.set(hm.ground); this.hemi.intensity = hm.i; } else this.hemi.intensity = 0;
    const fl = F.fill; if (fl) { this.fill.color.set(fl.color); this.fill.intensity = fl.i; this.fill.position.copy(this.cam.position); this.fill.target.position.set(...c.look); this.fill.target.updateMatrixWorld(); } else this.fill.intensity = 0;
    const fog = this.scene.fog as T.FogExp2; if (F.fog) { fog.color.set(F.fog.color); fog.density = F.fog.density; } else fog.density = 0;
    if (F.bg) this.scene.background = new T.Color(F.bg);
    const Ls = (F.lights ?? []).slice().sort((a, b) => b.i - a.i);
    this.pts.forEach((p, i) => { const L = Ls[i]; if (!L || L.i < .01) { p.visible = false; return; } p.visible = true; p.position.set(...L.p); p.color.setRGB(...L.c); p.intensity = L.i; p.distance = L.d ?? 10; });
    const seen = new Set<string>();
    for (const a of F.actors ?? []) { let ac = this.actors.get(a.id); if (!ac) { ac = new Actor(this.scene, a.id); this.actors.set(a.id, ac); } await ac.update(a, this.cam); seen.add(a.id); }
    for (const [k, a] of this.actors) if (!seen.has(k)) a.hide();
    this.sprites.list = F.sprites ?? []; this.sprites.commit(this.cam);
  }
  draw(F: YFrame, frame: number) { this.post.render(this.scene, this.cam, { ...DEFAULT_GRADE, bloom: .25, bloomTh: 1.5, vignette: .28, grain: .03, ...(F.grade ?? {}) }, frame); }
}
export type { Sprite, ActorState };
