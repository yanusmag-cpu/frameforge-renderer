// YunoWorld v9 engine: Blender-built sets (GLB) dressed with procedural surfaces, instanced swaying grass + flowers on
// vertex-coloured terrain, painterly sky with clouds, animated sea with sun glint, volumetric window light shafts with
// dust motes, tinted SSAO + soft shadows + bloom/DOF/ACES grade (post9), and the Ink/pigeon cut-out cast (Core actors).
// Shots pass a Frame9 each frame: which set is live, prop transforms and animated nodes ('anim:*' parts from Blender).
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Core, rng, canvasTex, type V3, type YFrame } from '../yw3/core.ts';
import { Post9, type Grade9 } from './post9.ts';
import { surface, fitUV } from './surfaces9.ts';

export type NodeOv = { vis?: boolean; pos?: V3; rot?: V3; scale?: number; op?: number; glow?: number };
export type PropF = { id: string; pos: V3; rot?: V3; scale?: number; nodes?: Record<string, NodeOv>; vis?: boolean };
export type Beam = { p: V3; dir: V3; w: number; h: number; len: number; c: [number, number, number]; i: number };
export type Sky = { top: string; mid: string; bot: string; sun?: V3; sunC?: string; clouds?: number; cloudC?: string };
export type ScreenF = { dx: number; dy: number; zoom?: number; pecks?: number; t: number; lock?: number };
export type Frame9 = YFrame & { set: string; also?: string[]; props?: PropF[]; sky?: Sky; sea?: { c1: string; c2: string; i?: number };
  beams?: Beam[]; dust?: { box: [V3, V3]; i: number }; screen?: ScreenF; wind?: number; grade?: Partial<Grade9>;
  hideNodes?: Record<string, boolean>; signText?: string[]; setNodes?: Record<string, NodeOv> };
export type SetSpec = { name: string; glb: string; grass?: string; special?: Record<string, (mesh: T.Mesh) => T.Material> };

const BLADE = (() => {   // one grass clump: 4 curved tapered blades (12 tris), colour gradient root -> tip
  const pos: number[] = [], col: number[] = [], idx: number[] = []; const R = rng(5);
  for (let b = 0; b < 4; b++) {
    const a = b * 1.57 + R() * .6, lean = .15 + R() * .25, h = .2 + R() * .12, w = .022 + R() * .01; const o = pos.length / 3;
    const ox = Math.cos(a) * .03, oz = Math.sin(a) * .03, dx = Math.cos(a + 1.57), dz = Math.sin(a + 1.57);
    for (let i = 0; i <= 3; i++) {
      const k = i / 3, y = h * k, ww = w * (1 - k * .92), bend = lean * k * k * h;
      pos.push(ox + Math.cos(a) * bend - dx * ww, y, oz + Math.sin(a) * bend - dz * ww, ox + Math.cos(a) * bend + dx * ww, y, oz + Math.sin(a) * bend + dz * ww);
      const c = .5 + k * .75; col.push(c * .85, c, c * .8, c * .85, c, c * .8);
      if (i < 3) idx.push(o + i * 2, o + i * 2 + 1, o + i * 2 + 3, o + i * 2, o + i * 2 + 3, o + i * 2 + 2);
    }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.getAttribute('normal') as T.BufferAttribute; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);   // soft, sky-facing shading like a lawn
  return g;
})();

export class Engine9 extends Core {
  roots = new Map<string, T.Object3D>(); props = new Map<string, T.Object3D>(); anim = new Map<string, Map<string, T.Object3D[]>>();
  grass = new Map<string, T.Object3D>(); windU = { value: 0 }; sky: T.Mesh; skyU: Record<string, { value: unknown }>;
  sea: T.Mesh; seaU: Record<string, { value: unknown }>; beams: T.Mesh[] = []; dust: T.Points; dustU = { t: { value: 0 }, a: { value: 0 }, px: { value: 1 }, lo: { value: new T.Vector3() }, hi: { value: new T.Vector3() } };
  screenCv = document.createElement('canvas'); screenTex: T.CanvasTexture; signTex: T.CanvasTexture | null = null; loaded = false;
  constructor(cv: HTMLCanvasElement, w: number, h: number, public base: string, public sets: SetSpec[], public propList: { id: string; glb: string }[],
              public boardDraw?: (g: CanvasRenderingContext2D, tag: string) => void, public screenDraw?: (g: CanvasRenderingContext2D, s: ScreenF, W: number) => void) {
    super(cv, w, h, '#a9c6e8', '#6b5e4e');
    (this as unknown as { post: Post9 }).post = new Post9(this.r, w, h);
    this.scene.environment = this.env; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.radius = 3; this.sun.shadow.bias = -.0003;
    // sky dome: three-stop gradient, sun disc + halo, drifting painterly cumulus
    this.skyU = { top: { value: new T.Color('#4f86c6') }, mid: { value: new T.Color('#9cc3e6') }, bot: { value: new T.Color('#f3d9b0') }, sun: { value: new T.Vector3(.4, .5, -.7).normalize() },
      sunC: { value: new T.Color('#fff1c8') }, clouds: { value: .5 }, cloudC: { value: new T.Color('#ffffff') }, t: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(900, 48, 24), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, mid, bot, sun, sunC, cloudC; uniform float clouds, t; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fb(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * n(p); p *= 2.03; a *= .5; } return s; }
        void main(){ vec3 d = normalize(vD); float y = d.y;
          vec3 c = y > .12 ? mix(mid, top, smoothstep(.12, .75, y)) : mix(bot, mid, smoothstep(-.05, .12, y));
          float sd = max(dot(d, normalize(sun)), 0.); c += sunC * (pow(sd, 900.) * 6. + pow(sd, 18.) * .35 + pow(sd, 3.) * .12);
          if (clouds > 0. && y > -.02) { vec2 p = d.xz / (y + .18) * 1.4 + vec2(t * .01, 0.); float k = fb(p) * 1.15 - (1.05 - clouds * .55);
            float m = smoothstep(.0, .35, k) * smoothstep(-.02, .1, y); float lit = .78 + .32 * smoothstep(.0, .6, fb(p + normalize(sun).xz * .08) - fb(p));
            vec3 cc = mix(mix(bot, cloudC, .55) * .92, cloudC * 1.08, lit) + sunC * pow(sd, 6.) * .25; c = mix(c, cc, m * .92); }
          gl_FragColor = vec4(c, 1.); }` }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false; this.scene.add(this.sky);
    // sea: gerstner-ish vertex swell + layered normal noise, fresnel sky reflection, sun glint, soft depth colour
    this.seaU = { t: { value: 0 }, c1: { value: new T.Color('#1d6f8c') }, c2: { value: new T.Color('#5fc1c9') }, sun: this.skyU.sun, sky: this.skyU.mid, sunC: this.skyU.sunC, camP: { value: new T.Vector3() } };
    const sg = new T.PlaneGeometry(1600, 1600, 200, 200); sg.rotateX(-Math.PI / 2);
    this.sea = new T.Mesh(sg, new T.ShaderMaterial({ uniforms: this.seaU, fog: false, side: T.DoubleSide,
      vertexShader: `uniform float t; varying vec3 vW; void main(){ vec3 p = position; p.y += sin(p.x * .08 + t * .9) * .25 + sin(p.z * .11 - t * 1.1) * .2 + sin((p.x + p.z) * .23 + t * 1.7) * .08;
        vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float t; uniform vec3 c1, c2, sun, sky, sunC, camP; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){ vec2 p = vW.xz; float e = .25;
          float a = n(p * .35 + vec2(t * .3, t * .1)) + n(p * .9 - vec2(t * .2, -t * .35)) * .5 + n(p * 2.4 + t * .6) * .25;
          float ax = n((p + vec2(e, 0.)) * .35 + vec2(t * .3, t * .1)) + n((p + vec2(e, 0.)) * .9 - vec2(t * .2, -t * .35)) * .5 + n((p + vec2(e, 0.)) * 2.4 + t * .6) * .25;
          float az = n((p + vec2(0., e)) * .35 + vec2(t * .3, t * .1)) + n((p + vec2(0., e)) * .9 - vec2(t * .2, -t * .35)) * .5 + n((p + vec2(0., e)) * 2.4 + t * .6) * .25;
          vec3 N = normalize(vec3((a - ax) * 1.6, 1., (a - az) * 1.6)); vec3 V = normalize(camP - vW); float fr = pow(1. - max(dot(N, V), 0.), 4.);
          vec3 c = mix(c1, c2, smoothstep(-.2, .9, a - .6) * .6) ; c = mix(c, sky * 1.05, fr * .75);
          vec3 H = normalize(normalize(sun) + V); c += sunC * pow(max(dot(N, H), 0.), 260.) * 3.5;
          c += vec3(1.) * smoothstep(1.35, 1.55, a) * .25;
          float dist = length(camP - vW); c = mix(c, sky, smoothstep(250., 800., dist) * .8);
          gl_FragColor = vec4(c, 1.); }` }));
    this.sea.visible = false; this.scene.add(this.sea);
    // light shafts (additive, soft edges, fade with length) for window/door sunlight
    for (let i = 0; i < 6; i++) {
      const g = new T.BoxGeometry(1, 1, 1); g.translate(0, 0, .5);
      const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { c: { value: new T.Color() }, i: { value: 0 }, t: { value: 0 } },
        vertexShader: 'varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: `uniform vec3 c; uniform float i, t; varying vec3 vL;
          void main(){ float e = smoothstep(.5, .3, abs(vL.x)) * smoothstep(.5, .3, abs(vL.y)); float f = (1. - vL.z) * smoothstep(0., .08, vL.z);
            float s = .75 + .25 * sin(vL.x * 23. + vL.z * 4. + t * .7) * sin(vL.y * 17. - t * .5); gl_FragColor = vec4(c * i * e * f * s * .16, 1.); }` });
      const b = new T.Mesh(g, m); b.visible = false; b.renderOrder = 8; this.beams.push(b); this.scene.add(b);
    }
    // floating dust motes (lit specks drifting through the shafts)
    const N = 420, dp = new Float32Array(N * 3), R = rng(7); for (let i = 0; i < N * 3; i++) dp[i] = R();
    const dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
    this.dust = new T.Points(dg, new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: this.dustU,
      vertexShader: `uniform float t, px; uniform vec3 lo, hi; varying float vA; void main(){ vec3 r = position; vec3 p = lo + (hi - lo) * fract(r + vec3(sin(t * .07 + r.y * 9.) * .02, t * .006 * (r.x + .3), cos(t * .05 + r.z * 7.) * .02));
        vec4 mv = modelViewMatrix * vec4(p, 1.); vA = .35 + .65 * fract(r.x * 13.7 + t * .2); gl_PointSize = clamp(9. * px / -mv.z, .8, 2.6 * px); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float a; varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1., .9, .7) * a * vA * .55 * smoothstep(.5, .1, d), 1.); }` }));
    this.dust.frustumCulled = false; this.dust.visible = false; this.dust.renderOrder = 9; this.scene.add(this.dust);
    this.screenCv.width = 1024; this.screenCv.height = 1024; this.screenTex = new T.CanvasTexture(this.screenCv); this.screenTex.colorSpace = T.SRGBColorSpace;
  }

  private dress(root: T.Object3D, spec?: SetSpec) {
    root.traverse(o => {
      const m = o as T.Mesh; if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const out = mats.map(mt => surface(mt, this.env, (tag, hx, mesh) => {
        const sp = spec?.special?.[tag]; if (sp) return sp(mesh);
        if (tag === 'screen') { fitUV(mesh.geometry); return new T.MeshBasicMaterial({ map: this.screenTex, color: new T.Color(.95, .95, .95), toneMapped: false, name: mt.name }); }
        if (tag === 'board' || tag === 'map' || tag === 'sign') { fitUV(mesh.geometry);
          const c = document.createElement('canvas'); c.width = tag === 'sign' ? 512 : 1024; c.height = tag === 'sign' ? 128 : 560; const g = c.getContext('2d')!; g.fillStyle = hx; g.fillRect(0, 0, c.width, c.height); this.boardDraw?.(g, tag);
          const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8; return new T.MeshStandardMaterial({ map: tx, roughness: .85, name: mt.name }); }
        return null; }, m));
      m.material = Array.isArray(m.material) ? out : out[0];
      if (m.material && (m.material as T.MeshStandardMaterial).name?.startsWith('terrain')) { m.castShadow = false; }
      if ((m.material as T.Material).transparent) { m.castShadow = false; m.renderOrder = 3; }
    });
  }
  private index(id: string, root: T.Object3D) {
    const map = new Map<string, T.Object3D[]>();
    root.traverse(o => { if (!o.name.startsWith('anim-')) return; const k = o.name.slice(5); o.userData.base = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
      const parts = k.split('-'); for (let i = 1; i <= parts.length; i++) { const key = parts.slice(0, i).join('-'); (map.get(key) ?? map.set(key, []).get(key)!).push(o); } });
    this.anim.set(id, map);
  }
  private grassFor(data: { grass: number[][]; flowers: (number | string)[][] }) {
    const G = new T.Group(); const n = data.grass.length;
    const gm = new T.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: T.DoubleSide, envMap: this.env, envMapIntensity: .4 });
    gm.onBeforeCompile = sh => { sh.uniforms.wind = this.windU;
      sh.vertexShader = 'uniform float wind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0., 0., 0., 1.); float k = position.y * 3.2; transformed.x += sin(wind * 1.3 + ip.x * .45 + ip.z * .3) * .05 * k * k; transformed.z += cos(wind * 1.1 + ip.z * .5) * .03 * k * k;`); };
    const im = new T.InstancedMesh(BLADE, gm, n); const M = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
    data.grass.forEach((g, i) => { e.set(0, (g[0] * 13.7 + g[2] * 7.1) % 6.28, 0); q.setFromEuler(e); const s = g[6]; M.compose(new T.Vector3(g[0], g[1] - .01, g[2]), q, new T.Vector3(s, s * (.85 + ((i * 37) % 10) / 25), s)); im.setMatrixAt(i, M);
      c.setRGB(g[3] * 1.0, g[4] * 1.0, g[5] * 1.0); im.setColorAt(i, c); });
    im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false; G.add(im);
    const fl = data.flowers; if (fl.length) {
      const head = new T.IcosahedronGeometry(.045, 0); head.scale(1, .55, 1); head.translate(0, .24, 0);
      const fm = new T.MeshStandardMaterial({ roughness: .6, emissive: new T.Color('#000') });
      const fi = new T.InstancedMesh(head, fm, fl.length); const stem = new T.InstancedMesh(new T.CylinderGeometry(.006, .008, .24, 4).translate(0, .12, 0), new T.MeshStandardMaterial({ color: '#4f8f3a', roughness: .9 }), fl.length);
      fl.forEach((f, i) => { M.makeTranslation(f[0] as number, f[1] as number, f[2] as number); fi.setMatrixAt(i, M); stem.setMatrixAt(i, M); fi.setColorAt(i, c.set(f[3] as string)); });
      fi.receiveShadow = stem.receiveShadow = true; fi.frustumCulled = stem.frustumCulled = false; G.add(fi, stem);
    }
    return G;
  }
  async load() {
    if (this.loaded) return; const L = new GLTFLoader();
    for (const s of this.sets) {
      const g = await L.loadAsync(this.base + s.glb); this.dress(g.scene, s); g.scene.visible = false; this.scene.add(g.scene); this.roots.set(s.name, g.scene); this.index(s.name, g.scene);
      if (s.grass) { const d = await (await fetch(this.base + s.grass)).json(); const gr = this.grassFor(d); gr.visible = false; this.scene.add(gr); this.grass.set(s.name, gr); }
    }
    for (const p of this.propList) { const g = await L.loadAsync(this.base + p.glb); this.dress(g.scene); g.scene.visible = false; this.scene.add(g.scene); this.props.set(p.id, g.scene); this.index(p.id, g.scene); }
    this.loaded = true;
  }
  private applyNodes(id: string, nodes: Record<string, NodeOv> | undefined) {
    const map = this.anim.get(id); if (!map) return;
    for (const os of map.values()) for (const o of os) { const b = o.userData.base; o.position.copy(b.p); o.rotation.copy(b.r); o.scale.copy(b.s); o.visible = true;
      o.traverse(c => { const m = (c as T.Mesh).material as T.MeshStandardMaterial | undefined; if (m?.userData?.own) { m.opacity = m.userData.op0; m.transparent = m.userData.tr0; m.depthWrite = true; } }); }
    if (!nodes) return;
    for (const [k, v] of Object.entries(nodes)) for (const o of map.get(k) ?? []) {
      const b = o.userData.base;
      if (v.vis === false) o.visible = false;
      if (v.pos) o.position.set(b.p.x + v.pos[0], b.p.y + v.pos[1], b.p.z + v.pos[2]);
      if (v.rot) o.rotation.set(b.r.x + v.rot[0], b.r.y + v.rot[1], b.r.z + v.rot[2]);
      if (v.scale !== undefined) o.scale.setScalar(v.scale);
      if (v.op !== undefined) o.traverse(c => { const m = (c as T.Mesh).material as T.MeshStandardMaterial | undefined; if (m && 'opacity' in m) { if (!m.userData.own) { const cl = m.clone(); cl.userData = { own: 1, op0: m.opacity, tr0: m.transparent }; (c as T.Mesh).material = cl; }
        const mm = (c as T.Mesh).material as T.MeshStandardMaterial; mm.transparent = v.op! < .999; mm.opacity = v.op!; mm.depthWrite = v.op! > .6; } });
      if (v.glow !== undefined) o.traverse(c => { const m = (c as T.Mesh).material as T.MeshStandardMaterial | undefined; if (m?.emissive) m.emissiveIntensity = v.glow!; });
    }
  }
  /** the pigeon's view on the nose-cone screen: sea, coastline and the target ship; shifts as the bomb drifts, peck marks */
  private drawScreen(s: ScreenF) {
    const g = this.screenCv.getContext('2d')!, W = 512; const z = s.zoom ?? 1; const R = rng(3); g.setTransform(2, 0, 0, 2, 0, 0);
    g.fillStyle = '#2b7894'; g.fillRect(0, 0, W, W);
    g.save(); g.translate(W / 2 + s.dx * W, W / 2 + s.dy * W); g.scale(z, z);
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(255,255,255,${.08 + R() * .1})`; g.lineWidth = 2; const x = (R() - .5) * W * 2, y = (R() - .5) * W * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 15, y - 6, x + 30 + R() * 20, y); g.stroke(); }
    g.fillStyle = '#5f9e4a'; g.beginPath(); g.moveTo(-W, -W * .9); g.bezierCurveTo(-W * .5, -W * .7, -W * .55, -W * .2, -W * .9, W); g.lineTo(-W * 1.5, W); g.lineTo(-W * 1.5, -W); g.fill();
    g.strokeStyle = '#e8d8a8'; g.lineWidth = 10; g.stroke();
    // target freighter from above
    g.rotate(-.35); g.fillStyle = '#3b4048'; g.beginPath(); g.moveTo(-70, -16); g.lineTo(55, -16); g.quadraticCurveTo(85, 0, 55, 16); g.lineTo(-70, 16); g.closePath(); g.fill();
    g.fillStyle = '#ecebe4'; g.fillRect(-45, -11, 26, 22); g.fillStyle = '#d4a033'; g.beginPath(); g.arc(-30, 0, 6, 0, 7); g.fill(); g.fillStyle = '#5e6a58'; g.fillRect(-5, -9, 20, 18); g.fillRect(25, -9, 18, 18);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-72, 0); g.lineTo(-150, -18); g.moveTo(-72, 6); g.lineTo(-150, 24); g.stroke();
    g.restore();
    // crosshair etched on the screen + peck marks
    g.strokeStyle = 'rgba(20,30,40,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, 40); g.lineTo(W / 2, W - 40); g.moveTo(40, W / 2); g.lineTo(W - 40, W / 2); g.stroke();
    g.beginPath(); g.arc(W / 2, W / 2, 70, 0, 7); g.stroke();
    const pk = s.pecks ?? 0; for (let i = 0; i < pk; i++) { const a = R() * 6.28, r = R() * 40; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(W / 2 + s.dx * W * .4 + Math.cos(a) * r, W / 2 + s.dy * W * .4 + Math.sin(a) * r, 5, 0, 7); g.fill(); }
    if (s.lock) { g.strokeStyle = `rgba(255,210,63,${s.lock})`; g.lineWidth = 8; g.strokeRect(W / 2 - 90, W / 2 - 90, 180, 180); }
    const vg = g.createRadialGradient(W / 2, W / 2, W * .3, W / 2, W / 2, W * .72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,20,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, W);
    this.screenTex.needsUpdate = true;
  }
  async render(F: Frame9, frame: number) {
    await this.load();
    for (const [k, r] of this.roots) { const on = k === F.set || !!F.also?.includes(k); r.visible = on; const gr = this.grass.get(k); if (gr) gr.visible = on; if (on) this.applyNodes(k, (F as Frame9 & { setNodes?: Record<string, NodeOv> }).setNodes); }
    for (const p of this.props.values()) p.visible = false;
    for (const pf of F.props ?? []) { if (!this.props.has(pf.id) && pf.id.includes('#')) { const b = this.props.get(pf.id.split('#')[0]); if (b) { const cl = b.clone(true); this.scene.add(cl); this.props.set(pf.id, cl); this.index(pf.id, cl); } } const p = this.props.get(pf.id); if (!p || pf.vis === false) continue; p.visible = true; p.position.set(...pf.pos); p.rotation.set(...(pf.rot ?? [0, 0, 0])); p.scale.setScalar(pf.scale ?? 1); this.applyNodes(pf.id, pf.nodes); }
    this.windU.value = F.t * (F.wind ?? 1);
    const sk = F.sky; this.sky.visible = !!sk; if (sk) { (this.skyU.top.value as T.Color).set(sk.top); (this.skyU.mid.value as T.Color).set(sk.mid); (this.skyU.bot.value as T.Color).set(sk.bot);
      if (sk.sun) (this.skyU.sun.value as T.Vector3).set(...sk.sun).normalize(); (this.skyU.sunC.value as T.Color).set(sk.sunC ?? '#fff1c8'); this.skyU.clouds.value = sk.clouds ?? .5; (this.skyU.cloudC.value as T.Color).set(sk.cloudC ?? '#ffffff'); this.skyU.t.value = F.t; }
    this.sea.visible = !!F.sea; if (F.sea) { this.seaU.t.value = F.t; (this.seaU.c1.value as T.Color).set(F.sea.c1); (this.seaU.c2.value as T.Color).set(F.sea.c2); }
    this.beams.forEach((b, i) => { const B = F.beams?.[i]; b.visible = !!B; if (!B) return; b.position.set(...B.p); b.lookAt(B.p[0] + B.dir[0], B.p[1] + B.dir[1], B.p[2] + B.dir[2]); b.scale.set(B.w, B.h, B.len);
      const u = (b.material as T.ShaderMaterial).uniforms; (u.c.value as T.Color).setRGB(...B.c); u.i.value = B.i; u.t.value = F.t; });
    this.dust.visible = !!F.dust; this.dustU.px.value = this.h / 1920; if (F.dust) { this.dustU.t.value = F.t; this.dustU.a.value = F.dust.i; this.dustU.lo.value.set(...F.dust.box[0]); this.dustU.hi.value.set(...F.dust.box[1]); }
    if (F.screen) { if (this.screenDraw) { const g = this.screenCv.getContext('2d')!; g.setTransform(2, 0, 0, 2, 0, 0); this.screenDraw(g, F.screen, 512); this.screenTex.needsUpdate = true; } else this.drawScreen(F.screen); }
    await this.frameBase(F); this.sky.position.copy(this.cam.position); (this.seaU.camP.value as T.Vector3).copy(this.cam.position);
    this.draw(F, frame);
  }
}
export { canvasTex };
