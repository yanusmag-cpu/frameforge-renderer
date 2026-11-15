// FrameForge 3D film engine for the Brazil heist: sets, lighting presets, section cut, particles, actors, post.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { dressMaterials, BULB } from './materials.ts';
import { Actor, type ActorState } from './actor.ts';
import { Post, DEFAULT_GRADE, type Grade } from './post.ts';

export type V3 = [number, number, number];
export type Light = {
  sky: [string, string]; sun: { dir: V3; color: string; int: number; shadow?: number; focus?: V3; size?: number };
  hemi: [string, string, number]; amb: [string, number]; fog: [string, number]; env: number;
  points?: { pos: V3; color: string; int: number; dist: number; shadow?: boolean }[];
  sunGlow?: number; stars?: number;
};
export type PropState = { name: string; pos: V3; rot?: V3; scale?: number | V3; hidden?: boolean };
export type Emitter =
  | { kind: 'motes'; box: [V3, V3]; n: number; seed: number; color: string; size: number; t: number; alpha?: number }
  | { kind: 'debris'; at: V3; t: number; n: number; seed: number; spread: number; up: number; floor: number; size: number; color: string; dir?: V3; grav?: number }
  | { kind: 'sparks'; at: V3; t: number; n: number; seed: number; speed: number; color?: string }
  | { kind: 'puff'; at: V3; t: number; n: number; seed: number; spread: number; rise: number; size: number; color: string; alpha: number; dur?: number };
export type Frame = {
  cam: { pos: V3; look: V3; fov: number; roll?: number };
  light: Light; cut?: number | null; bulbs?: number;
  show?: Record<string, boolean>;            // KEEP / FRONT visibility
  xform?: Record<string, { pos?: V3; rot?: V3; scale?: number }>;
  props?: PropState[]; actors?: ActorState[]; fx?: Emitter[];
  overlay?: string; grade?: Partial<Grade>; slab?: number;   // slab x-ray opacity
  floorCracks?: number; t: number;
  digX?: number; tunnelWall?: boolean; vaultWall?: boolean; sign?: 0 | 1; rebarGlow?: number; beam?: { at: V3; dir: V3; k: number };
};

const SOFT = (() => { let t: T.Texture | null = null; return () => {
  if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); t = new T.CanvasTexture(c); return t; }; })();
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

class PointsLayer {
  geo = new T.BufferGeometry(); obj: T.Points; max = 4000;
  pos = new Float32Array(this.max * 3); col = new Float32Array(this.max * 4); siz = new Float32Array(this.max);
  constructor(scene: T.Scene, additive: boolean) {
    this.geo.setAttribute('position', new T.BufferAttribute(this.pos, 3)); this.geo.setAttribute('color', new T.BufferAttribute(this.col, 4)); this.geo.setAttribute('size', new T.BufferAttribute(this.siz, 1));
    const m = new T.ShaderMaterial({ uniforms: { tex: { value: SOFT() }, scale: { value: 1000 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D tex; varying vec4 vC; void main(){ vec4 t = texture2D(tex, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a * t.a); }' });
    this.obj = new T.Points(this.geo, m); this.obj.frustumCulled = false; this.obj.renderOrder = 5; scene.add(this.obj);
  }
  n = 0;
  reset() { this.n = 0; }
  add(p: T.Vector3 | V3, c: T.Color, a: number, s: number) {
    if (this.n >= this.max) return; const i = this.n++;
    const v = Array.isArray(p) ? p : [p.x, p.y, p.z]; this.pos.set(v, i * 3); this.col.set([c.r, c.g, c.b, a], i * 4); this.siz[i] = s;
  }
  commit(h: number) { this.geo.setDrawRange(0, this.n); for (const a of ['position', 'color', 'size']) (this.geo.getAttribute(a) as T.BufferAttribute).needsUpdate = true; (this.obj.material as T.ShaderMaterial).uniforms.scale.value = h * .5; }
}

export class Engine {
  r: T.WebGLRenderer; scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 9 / 16, .05, 600); post: Post;
  sun = new T.DirectionalLight('#fff', 3); hemi = new T.HemisphereLight('#bcd', '#543', 1); amb = new T.AmbientLight('#fff', .2);
  pts: T.PointLight[] = []; sky: T.Mesh; skyU: Record<string, T.IUniform>;
  objs = new Map<string, T.Object3D>(); front: T.Object3D[] = []; actors = new Map<string, Actor>(); props = new Map<string, T.Object3D>();
  cap: T.Mesh; clip = new T.Plane(new T.Vector3(0, 0, -1), 1.52); envTex: T.Texture | null = null;
  voidFloor: T.Mesh; voidWalls: T.Mesh[] = []; dig: T.Mesh; tWall: T.Mesh; vWall: T.Mesh; beam: T.Mesh; signs: [T.Texture, T.Texture] | null = null; signMat: T.MeshStandardMaterial | null = null; rebarMat: T.MeshStandardMaterial | null = null;
  glow: PointsLayer; dust: PointsLayer; debris: T.InstancedMesh; slabMat: T.MeshStandardMaterial | null = null; crack: T.Mesh;
  constructor(public canvas: HTMLCanvasElement, public w: number, public h: number) {
    this.r = new T.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(1); this.r.setSize(w, h, false); this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap; this.r.outputColorSpace = T.LinearSRGBColorSpace;
    this.r.localClippingEnabled = true;
    this.post = new Post(this.r, w, h);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .03; this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.amb);
    for (let i = 0; i < 6; i++) { const p = new T.PointLight('#fff', 0, 10, 2); p.castShadow = i === 0; p.shadow.mapSize.set(1024, 1024); p.shadow.bias = -.002; this.pts.push(p); this.scene.add(p); }
    this.skyU = { top: { value: new T.Color() }, bot: { value: new T.Color() }, sunDir: { value: new T.Vector3(0, 1, 0) }, glow: { value: 0 }, stars: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, bot, sunDir; uniform float glow, stars; varying vec3 vD;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = clamp(vD.y * 1.6 + .08, 0., 1.); vec3 c = mix(bot, top, pow(y, .7));
          float s = max(dot(vD, normalize(sunDir)), 0.); c += vec3(1., .75, .45) * (pow(s, 12.) * .5 + pow(s, 400.) * 3.) * glow;
          vec3 q = floor(vD * 220.); float st = step(.997, h(q)) * stars * smoothstep(0., .3, vD.y); c += st;
          gl_FragColor = vec4(c, 1.); }` }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
    this.glow = new PointsLayer(this.scene, true); this.dust = new PointsLayer(this.scene, false);
    this.debris = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshStandardMaterial({ color: '#8a7a6a', roughness: 1, flatShading: true }), 400);
    this.debris.castShadow = true; this.debris.frustumCulled = false; this.scene.add(this.debris);
    this.cap = new T.Mesh(new T.PlaneGeometry(170, 8.75), new T.MeshStandardMaterial({ color: '#6b4426', roughness: 1 }));
    this.cap.position.set(45, -4.625, 1.52); this.scene.add(this.cap);
    this.voidFloor = new T.Mesh(new T.PlaneGeometry(900, 600), new T.MeshStandardMaterial({ color: '#160e09', roughness: 1 })); this.voidFloor.rotation.x = -Math.PI / 2; this.voidFloor.position.set(40, -9.05, 301.5); this.scene.add(this.voidFloor);
    for (const vx of [131, -41]) { const w = new T.Mesh(new T.PlaneGeometry(600, 12), this.voidFloor.material); w.rotation.y = vx > 0 ? -Math.PI / 2 : Math.PI / 2; w.position.set(vx, -3.0, 301.5); this.voidWalls.push(w); this.scene.add(w); }
    this.crack = new T.Mesh(new T.PlaneGeometry(2.4, 2.4), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    this.dig = new T.Mesh(new T.BoxGeometry(1, 1.84, 1.16)); this.scene.add(this.dig);
    this.tWall = new T.Mesh(new T.PlaneGeometry(77, 1.84)); this.tWall.position.set(40.3, -5.0, 1.5); this.tWall.rotation.y = Math.PI; this.scene.add(this.tWall);
    this.vWall = new T.Mesh(new T.PlaneGeometry(12.6, 2.45)); this.vWall.position.set(78, -1.8, 1.49); this.vWall.rotation.y = Math.PI; this.scene.add(this.vWall);
    this.beam = new T.Mesh(new T.ConeGeometry(1, 1, 32, 1, true), new T.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: .12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    this.beam.geometry.translate(0, -.5, 0); this.scene.add(this.beam);
    this.crack.rotation.x = -Math.PI / 2; this.crack.position.set(78.1, -2.975, .85); this.crack.renderOrder = 3; this.scene.add(this.crack);
  }
  async load(base: string, extra: string[] = []) {
    const loader = new GLTFLoader();
    // environment for reflections: gradient room rendered into a PMREM
    const envScene = new T.Scene(); const es = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ side: T.BackSide,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'varying vec3 vD; void main(){ float y = vD.y; vec3 c = mix(vec3(.25,.22,.2), vec3(.85,.92,1.), smoothstep(-.2,.6,y)); c += vec3(1.1) * smoothstep(.9,.99, dot(vD, normalize(vec3(.4,.8,.3)))); c += vec3(1.2,1.1,1.)*smoothstep(.96,.99,dot(vD, normalize(vec3(-.7,.3,-.5)))); gl_FragColor = vec4(c,1.); }' }));
    envScene.add(es); const pm = new T.PMREMGenerator(this.r); this.envTex = pm.fromScene(envScene, 0).texture;
    for (const f of ['world.glb', 'props.glb', ...extra]) {
      const g = await loader.loadAsync(f.includes('/') ? f : base + f); dressMaterials(g.scene, this.envTex); this.scene.add(g.scene);
      g.scene.traverse(o => {
        if (o.name.startsWith('KEEP_')) { this.objs.set(o.name.slice(5), o); if (f.includes('props')) { this.props.set(o.name.slice(5), o); o.visible = false; } }
        if (o.name.startsWith('FRONT')) this.front.push(o);
      });
    }
    // all scene materials respect the section plane
    this.scene.traverse(o => { const m = (o as T.Mesh).material as T.Material | undefined; if (m && !(m as T.ShaderMaterial).isShaderMaterial) m.clippingPlanes = [this.clip]; });
    (this.voidFloor.material as T.Material).clippingPlanes = [];
    (this.cap.material as T.MeshStandardMaterial).map = ((this.findMat('earth') as T.MeshStandardMaterial)?.map) ?? null;
    const earth = this.findMat('earth'); if (earth) { this.cap.material = earth.clone(); (this.cap.material as T.Material).clippingPlanes = []; (this.cap.material as T.Material).onBeforeCompile = earth.onBeforeCompile; }
    if (earth) { this.dig.material = earth.clone(); (this.dig.material as T.Material).onBeforeCompile = earth.onBeforeCompile; this.tWall.material = this.dig.material; }
    const cw = this.findMat('concrete_paint'); if (cw) this.vWall.material = cw;
    this.slabMat = this.findMat('slab_concrete') as T.MeshStandardMaterial;
    this.signMat = this.findMat('sign_shop') as T.MeshStandardMaterial; this.rebarMat = this.findMat('rebar') as T.MeshStandardMaterial;
    if (this.signMat?.map) { const t0 = rentSign(this.signMat.map); this.signs = [t0, this.signMat.map]; }
    this.crack.material = new T.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0 });
  }
  findMat(name: string) { let f: T.Material | null = null; this.scene.traverse(o => { const m = (o as T.Mesh).material as T.Material; if (!f && m && m.name === name) f = m; }); return f as T.Material | null; }
  obj(n: string) { const o = this.objs.get(n.replace(/ /g, '_')); if (!o) throw new Error('missing object ' + n); return o; }
  private home = new Map<T.Object3D, { p: T.Vector3; r: T.Euler; s: T.Vector3 }>();
  private setLight(L: Light) {
    const sd = new T.Vector3(...L.sun.dir).normalize(); const f = new T.Vector3(...(L.sun.focus ?? [0, 0, 0]));
    this.sun.position.copy(f).addScaledVector(sd, 60); this.sun.target.position.copy(f); this.sun.color.set(L.sun.color); this.sun.intensity = L.sun.int;
    const sz = L.sun.size ?? 30; const c = this.sun.shadow.camera; c.left = -sz; c.right = sz; c.top = sz; c.bottom = -sz; c.near = 1; c.far = 160; c.updateProjectionMatrix();
    this.sun.castShadow = (L.sun.shadow ?? 1) > 0; this.sun.target.updateMatrixWorld();
    this.hemi.color.set(L.hemi[0]); this.hemi.groundColor.set(L.hemi[1]); this.hemi.intensity = L.hemi[2]; this.amb.color.set(L.amb[0]); this.amb.intensity = L.amb[1];
    this.scene.fog = new T.FogExp2(L.fog[0], L.fog[1]);
    this.skyU.top.value.set(L.sky[0]); this.skyU.bot.value.set(L.sky[1]); this.skyU.sunDir.value.copy(sd); this.skyU.glow.value = L.sunGlow ?? 1; this.skyU.stars.value = L.stars ?? 0;
    this.scene.traverse(o => { const m = (o as T.Mesh).material as T.MeshStandardMaterial; if (m && m.envMap) m.envMapIntensity = (m.name.startsWith('glass') ? .8 : .9) * L.env; });
    this.pts.forEach((p, i) => { const d = L.points?.[i]; if (!d) { p.intensity = 0; p.visible = false; return; } p.visible = true; p.position.set(...d.pos); p.color.set(d.color); p.intensity = d.int; p.distance = d.dist; p.castShadow = !!d.shadow; });
  }
  async render(F: Frame, frame: number) {
    this.setLight(F.light);
    // camera
    this.cam.position.set(...F.cam.pos); this.cam.up.set(0, 1, 0); this.cam.lookAt(...F.cam.look); if (F.cam.roll) this.cam.rotateZ(F.cam.roll);
    this.cam.fov = F.cam.fov; this.cam.aspect = this.w / this.h; this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    this.sky.position.copy(this.cam.position);
    // section cut
    const cut = F.cut ?? null; this.clip.constant = cut === null ? 1e6 : cut; this.voidFloor.visible = cut !== null && cut < 3; this.voidWalls.forEach(w => w.visible = this.voidFloor.visible); this.cap.visible = cut !== null && cut > 1.56; this.cap.position.z = (cut ?? 0) - .001;
    for (const o of this.front) o.visible = cut === null || cut > 2.2 || true;
    BULB.revealX.value = F.bulbs ?? 999;
    // KEEP objects: reset to home, then apply
    for (const [, o] of this.objs) {
      if (!this.home.has(o)) this.home.set(o, { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() });
      const h = this.home.get(o)!; o.position.copy(h.p); o.rotation.copy(h.r); o.scale.copy(h.s);
      o.visible = !this.props.has(o.name.slice(5));
    }
    for (const k of ['Studio_L', 'Studio_R', 'Studio_floor', 'Hook_cash', 'Police_car']) { const o = this.objs.get(k); if (o) o.visible = false; }
    for (const [k, v] of Object.entries(F.show ?? {})) { const o = this.objs.get(k.replace(/ /g, '_')); if (o) o.visible = v; }
    for (const [k, x] of Object.entries(F.xform ?? {})) {
      const o = this.obj(k); if (x.pos) o.position.add(new T.Vector3(...x.pos)); if (x.rot) { o.rotation.x += x.rot[0]; o.rotation.y += x.rot[1]; o.rotation.z += x.rot[2]; } if (x.scale !== undefined) o.scale.multiplyScalar(x.scale);
    }
    // prop instances (clones per use)
    this.propPool.forEach(p => p.visible = false); const used = new Map<string, number>();
    for (const p of F.props ?? []) {
      if (p.hidden) continue; const k = used.get(p.name) ?? 0; used.set(p.name, k + 1); const key = p.name + '#' + k;
      let o = this.propPool.get(key); if (!o) { o = this.props.get(p.name.replace(/ /g, '_'))!.clone(); o.visible = true; this.scene.add(o); this.propPool.set(key, o); }
      o.visible = true; o.position.set(...p.pos); o.rotation.set(...(p.rot ?? [0, 0, 0])); if (typeof p.scale === 'number') o.scale.setScalar(p.scale); else if (p.scale) o.scale.set(...p.scale); else o.scale.setScalar(1);
    }
    // slab x-ray + cracks
    if (this.slabMat) { const x = F.slab ?? 0; this.slabMat.transparent = x > 0; this.slabMat.opacity = 1 - x * .82; this.slabMat.depthWrite = x < .5; }
    const dx = F.digX ?? 79; this.dig.visible = dx < 78.6; this.dig.scale.x = 78.62 - dx; this.dig.position.set((dx + 78.62) / 2, -5.0, .95);
    this.tWall.visible = !!F.tunnelWall; this.vWall.visible = !!F.vaultWall;
    if (this.signs && this.signMat) { this.signMat.map = this.signs[F.sign ?? 1]; }
    if (this.rebarMat) { const g = F.rebarGlow ?? 0; this.rebarMat.emissive.set('#ff7a2a'); this.rebarMat.emissiveIntensity = g * 1.1; }
    if (F.beam && F.beam.k > 0) { const b = F.beam; this.beam.visible = true; this.beam.position.set(...b.at); const d = new T.Vector3(...b.dir); const len = d.length(); this.beam.scale.set(len * .32, len, len * .32);
      this.beam.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), d.normalize()); (this.beam.material as T.MeshBasicMaterial).opacity = .14 * b.k; } else this.beam.visible = false;
    (this.crack.material as T.MeshBasicMaterial).opacity = F.floorCracks ?? 0; this.crack.visible = (F.floorCracks ?? 0) > 0;
    // actors
    const seen = new Set<string>();
    for (const a of F.actors ?? []) { let ac = this.actors.get(a.id); if (!ac) { ac = new Actor(this.scene, a.id); this.actors.set(a.id, ac); } await ac.update(a, this.cam); seen.add(a.id); }
    for (const [k, a] of this.actors) if (!seen.has(k)) a.hide();
    this.fx(F.fx ?? []);
    this.post.render(this.scene, this.cam, { ...DEFAULT_GRADE, ...(F.grade ?? {}) }, frame);
  }
  propPool = new Map<string, T.Object3D>();
  actorHand(id: string, which: 'A' | 'B') { const a = this.actors.get(id); if (!a || !a.joints) return null; return a.world(which === 'A' ? a.joints.handA : a.joints.handB); }
  private fx(list: Emitter[]) {
    this.glow.reset(); this.dust.reset(); let di = 0; const m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color();
    for (const e of list) {
      const R = rng(e.seed * 7919 + 13);
      if (e.kind === 'motes') {
        c.set(e.color); const [a, b] = e.box;
        for (let i = 0; i < e.n; i++) {
          const ph = R() * 100; const x = a[0] + (b[0] - a[0]) * ((R() + Math.sin(e.t * .07 + ph) * .02 + e.t * .004 * (R() - .5)) % 1 + 1) % 1;
          const y = a[1] + (b[1] - a[1]) * ((R() + e.t * .012 * (R() + .2)) % 1); const z = a[2] + (b[2] - a[2]) * ((R() + Math.cos(e.t * .05 + ph) * .02) % 1 + 1) % 1;
          const tw = .5 + .5 * Math.sin(e.t * (1 + R() * 2) + ph); this.glow.add([x, y, z], c, (e.alpha ?? .35) * tw, e.size * (.5 + R()));
        }
      } else if (e.kind === 'debris') {
        const g = e.grav ?? 9.8;
        for (let i = 0; i < e.n && di < 400; i++) {
          const ang = R() * Math.PI * 2, sp = e.spread * (.3 + R()), up = e.up * (.4 + R() * .8), dt = Math.max(0, e.t - R() * .08);
          const d = e.dir ?? [0, 0, 0];
          let x = e.at[0] + (Math.cos(ang) * sp + d[0]) * dt, z = e.at[2] + (Math.sin(ang) * sp + d[2]) * dt, y = e.at[1] + (up + d[1]) * dt - .5 * g * dt * dt;
          if (y < e.floor) { // one damped bounce then rest
            const tHit = ((up + d[1]) + Math.sqrt(Math.max(0, (up + d[1]) ** 2 + 2 * g * (e.at[1] - e.floor)))) / g; const after = dt - tHit;
            x = e.at[0] + (Math.cos(ang) * sp + d[0]) * (tHit + Math.min(after, .25) * .4); z = e.at[2] + (Math.sin(ang) * sp + d[2]) * (tHit + Math.min(after, .25) * .4);
            const v2 = (up + d[1] - g * tHit) * -.3; const tb = Math.min(after, Math.max(0, 2 * v2 / g)); y = e.floor + Math.max(0, v2 * tb - .5 * g * tb * tb);
          }
          const s = e.size * (.4 + R() * .9); q.setFromEuler(new T.Euler(R() * 6 + dt * 8 * R(), R() * 6, R() * 6 + dt * 5)); m.compose(new T.Vector3(x, y + s * .5, z), q, new T.Vector3(s, s * (.6 + R() * .5), s));
          this.debris.setMatrixAt(di, m); c.set(e.color).multiplyScalar(.7 + R() * .5); this.debris.setColorAt(di, c); di++;
        }
      } else if (e.kind === 'sparks') {
        c.set(e.color ?? '#ffb347');
        for (let i = 0; i < e.n; i++) {
          const dt = e.t - R() * .05; if (dt < 0 || dt > .6) { R(); R(); R(); continue; }
          const a = R() * Math.PI * 2, el = R() * 1.2 - .2, sp = e.speed * (.4 + R());
          for (let k = 0; k < 4; k++) { const tt = Math.max(0, dt - k * .012); const p: V3 = [e.at[0] + Math.cos(a) * Math.cos(el) * sp * tt, e.at[1] + Math.sin(el) * sp * tt - 4.9 * tt * tt, e.at[2] + Math.sin(a) * Math.cos(el) * sp * tt];
            this.glow.add(p, c, (1 - dt / .6) * (1 - k * .22) * 2, .05 * (1 - k * .15)); }
        }
      } else if (e.kind === 'puff') {
        c.set(e.color); const dur = e.dur ?? 2.5;
        for (let i = 0; i < e.n; i++) {
          const dt = e.t - R() * .15; const a = R() * Math.PI * 2, sp = e.spread * (.3 + R()), k = 1 - Math.exp(-dt * 2.2);
          if (dt < 0) continue; const life = Math.max(0, 1 - dt / dur);
          this.dust.add([e.at[0] + Math.cos(a) * sp * k, e.at[1] + e.rise * k * (.5 + R()), e.at[2] + Math.sin(a) * sp * k], c, e.alpha * life * Math.min(1, dt * 8), e.size * (.6 + R() * .8) * (1 + k * 1.5));
        }
      }
    }
    this.debris.count = di; this.debris.instanceMatrix.needsUpdate = true; if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
    this.glow.commit(this.h / Math.tan(this.cam.fov * Math.PI / 360) * .5); this.dust.commit(this.h / Math.tan(this.cam.fov * Math.PI / 360) * .5);
  }
}
function rentSign(like: T.Texture) {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 180; const g = c.getContext('2d')!;
  g.fillStyle = '#f1efe8'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#c8261f'; g.fillRect(0, 0, c.width, 14); g.fillRect(0, c.height - 14, c.width, 14);
  g.fillStyle = '#c8261f'; g.font = '900 104px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('ALUGA-SE', 520, 128);
  g.fillStyle = '#333'; g.font = '700 46px Inter, sans-serif'; g.fillText('TRATAR NO LOCAL', 1090, 112);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.repeat.copy(like.repeat); t.offset.copy(like.offset); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function crackTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!; const R = rng(77);
  g.strokeStyle = 'rgba(20,18,16,.95)'; g.lineCap = 'round';
  for (let k = 0; k < 14; k++) {
    let x = 256 + (R() - .5) * 60, y = 256 + (R() - .5) * 60; const a0 = R() * Math.PI * 2; g.lineWidth = 3 + R() * 3; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 9; s++) { const a = a0 + (R() - .5) * .9; x += Math.cos(a) * 26; y += Math.sin(a) * 26; g.lineTo(x, y); g.lineWidth *= .85; }
    g.stroke();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
