// "Raised by dinosaurs" engine: FrameForge 3D core + Cretaceous terrain shading, flowing water and waterfall, wind-driven
// instanced vegetation, procedurally posed creatures, a living sky (clouds, sun, asteroid, impact glow, ash dimming) and
// physically-motivated particle systems (mist, god rays, rain, ash, embers, smoke column, shock dust, meteors).
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Engine, type Frame, type V3 } from '../brazil/engine.ts';
import { Creature, type CreatureState, type Kind } from './creatures.ts';

export type Frame5 = Frame & {
  dinos?: CreatureState[];
  wind?: number; windDir?: [number, number]; gust?: number;
  mist?: { k: number; center: V3; radius: number; height?: number; color?: string };
  rays?: { k: number; from: V3; spread?: number; color?: string };
  rain?: number; ash?: number; embers?: number; flash?: number;
  sky?: { clouds?: number; dim?: number; red?: number };          // cloud cover, ash dimming 0..1, red-sky 0..1
  asteroid?: { pos: V3; dir: V3; k: number; size?: number; trail?: number };
  impact?: { at: V3; t: number; k: number };                       // far-field impact: position on the horizon, seconds since impact
  meteors?: { from: V3; to: V3; t: number; size?: number }[];     // t: 0..1 flight progress (>1 = landed)
  splash?: { at: V3; t: number; k: number }[];
};
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
function softTex(kind: 'soft' | 'smoke' | 'drop' | 'feather') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const R = rng(kind.length * 97 + 3);
  if (kind === 'soft') { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  if (kind === 'smoke') for (let i = 0; i < 26; i++) { const x = 64 + (R() - .5) * 46, y = 64 + (R() - .5) * 46, r = 16 + R() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  if (kind === 'drop') { const gr = g.createLinearGradient(64, 0, 64, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(60, 0, 8, 128); }
  if (kind === 'feather') {   // one contour feather: tapering vane, rachis, barbs, a dark band and a pale tip
    c.width = 64; c.height = 256; const h = 256;
    g.clearRect(0, 0, 64, h); g.save(); g.beginPath(); g.moveTo(32, 0); g.bezierCurveTo(4, 40, 2, 170, 32, 256); g.bezierCurveTo(62, 170, 60, 40, 32, 0); g.closePath(); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d9d2c4'); gr.addColorStop(.35, '#ffffff'); gr.addColorStop(.62, '#c8bba8'); gr.addColorStop(.72, '#5a4a3a'); gr.addColorStop(.8, '#e8e0d0'); gr.addColorStop(1, '#f4efe6');
    g.fillStyle = gr; g.fillRect(0, 0, 64, h);
    g.strokeStyle = 'rgba(40,30,20,.35)'; g.lineWidth = 1; for (let y = 6; y < h; y += 5) { g.beginPath(); g.moveTo(32, y); g.lineTo(2, y + 14); g.moveTo(32, y); g.lineTo(62, y + 14); g.stroke(); }
    for (let i = 0; i < 6; i++) { const y = 30 + R() * 200; g.clearRect(R() < .5 ? 0 : 40, y, 24, 3); }
    g.restore(); g.strokeStyle = 'rgba(250,245,235,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 2); g.lineTo(32, 254); g.stroke();
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
class Sprites {
  geo = new T.BufferGeometry(); obj: T.Points; n = 0; pos: Float32Array; col: Float32Array; siz: Float32Array; rot: Float32Array;
  constructor(scene: T.Scene, public max: number, tex: T.Texture, additive: boolean, order: number, fadeNear = 0) {
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.siz = new Float32Array(max); this.rot = new Float32Array(max);
    this.geo.setAttribute('position', new T.BufferAttribute(this.pos, 3)); this.geo.setAttribute('color', new T.BufferAttribute(this.col, 4)); this.geo.setAttribute('size', new T.BufferAttribute(this.siz, 1)); this.geo.setAttribute('rot', new T.BufferAttribute(this.rot, 1));
    const m = new T.ShaderMaterial({ uniforms: { tex: { value: tex }, scale: { value: 1000 }, fogC: { value: new T.Color() }, fogD: { value: 0 } }, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: `attribute float size, rot; attribute vec4 color; varying vec4 vC; varying float vR, vD; uniform float scale;
        void main(){ vC = color; vR = rot; vec4 mv = modelViewMatrix * vec4(position,1.); vD = -mv.z; vC.a *= smoothstep(${fadeNear.toFixed(1)}, ${(fadeNear * 2 + .01).toFixed(2)}, -mv.z); gl_PointSize = min(size * scale / -mv.z, 900.); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tex; uniform vec3 fogC; uniform float fogD; varying vec4 vC; varying float vR, vD;
        void main(){ vec2 c = gl_PointCoord - .5; float s = sin(vR), co = cos(vR); c = mat2(co, -s, s, co) * c; vec4 t = texture2D(tex, c + .5);
          float f = 1. - exp(-fogD*fogD*vD*vD); vec3 col = ${additive ? 'vC.rgb * (1. - f)' : 'mix(vC.rgb, fogC, f)'}; gl_FragColor = vec4(col, vC.a * t.a); }` });
    this.obj = new T.Points(this.geo, m); this.obj.frustumCulled = false; this.obj.renderOrder = order; scene.add(this.obj);
  }
  reset() { this.n = 0; }
  add(x: number, y: number, z: number, c: T.Color, a: number, s: number, r = 0) {
    if (this.n >= this.max || a <= .002) return; const i = this.n++; this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.col[i * 4] = c.r; this.col[i * 4 + 1] = c.g; this.col[i * 4 + 2] = c.b; this.col[i * 4 + 3] = a; this.siz[i] = s; this.rot[i] = r;
  }
  commit(h: number, fog: T.FogExp2 | null) {
    this.geo.setDrawRange(0, this.n); for (const a of ['position', 'color', 'size', 'rot']) (this.geo.getAttribute(a) as T.BufferAttribute).needsUpdate = true;
    const u = (this.obj.material as T.ShaderMaterial).uniforms; u.scale.value = h * .5; if (fog) { u.fogC.value.copy(fog.color); u.fogD.value = fog.density; }
  }
}
const NOISE = `float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ return vn(p)*.5 + vn(p*2.07)*.25 + vn(p*4.13)*.125 + vn(p*8.31)*.0625; }`;
const ZC = `float zc(float x){ return 82. + 10.*sin(x/47.) + 5.*sin(x/19.+1.); } float xs(float z){ return -52. + 14.*sin(z/38.); }`;

export class Engine5 extends Engine {
  hgrid!: { x0: number; z0: number; step: number; nx: number; nz: number; h: number[][] };
  veg: { inst: T.InstancedMesh[]; data: number[][]; sway: number; base: T.Matrix4[]; h: number }[] = [];
  dinoSrc = new Map<Kind, T.Object3D>(); creatures = new Map<string, Creature>();
  U = { time: { value: 0 }, ash: { value: 0 }, wet: { value: 0 }, wind: { value: 0 }, windDir: { value: new T.Vector2(1, 0) } };
  waterU!: Record<string, T.IUniform>; fallU!: Record<string, T.IUniform>;
  mist!: Sprites; smoke!: Sprites; glow2!: Sprites; rainS!: Sprites; ashS!: Sprites;
  ast!: T.Object3D; trail!: T.Mesh; trailU!: Record<string, T.IUniform>; rays: T.Mesh[] = [];
  skyX!: Record<string, T.IUniform>; ring!: T.Mesh;

  H(x: number, z: number) {
    const g = this.hgrid; const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
    const i = Math.max(0, Math.min(g.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(g.nz - 2, Math.floor(fz))); const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const h = g.h; return (h[j][i] * (1 - u) + h[j][i + 1] * u) * (1 - v) + (h[j + 1][i] * (1 - u) + h[j + 1][i + 1] * u) * v;
  }
  async load5(base: string) {
    this.cam.far = 900; (this.sky.geometry as T.SphereGeometry).dispose(); this.sky.geometry = new T.SphereGeometry(800, 48, 24);
    await this.load(base);
    this.hgrid = await (await fetch(base + 'height.json')).json();
    const feather = softTex('feather');
    this.scene.traverse(o => {
      const me = o as T.Mesh; if (!me.isMesh) return; const m = me.material as T.MeshStandardMaterial; if (!m || !m.name) return;
      if (m.name === 'terrain') { me.material = this.terrainMat(); me.receiveShadow = true; me.castShadow = false; }
      else if (m.name === 'river_water') { me.material = this.waterMat(); me.receiveShadow = false; me.castShadow = false; me.renderOrder = 2; }
      else if (m.name === 'waterfall') { me.material = this.fallMat(); me.castShadow = false; me.renderOrder = 3; }
      else this.dress(m);
    });
    this.buildSky(); this.buildAsteroid(); this.buildRays();
    this.mist = new Sprites(this.scene, 2600, softTex('smoke'), false, 6, 4); this.smoke = new Sprites(this.scene, 3200, softTex('smoke'), false, 7);
    this.glow2 = new Sprites(this.scene, 2400, softTex('soft'), true, 8); this.rainS = new Sprites(this.scene, 2200, softTex('drop'), true, 9); this.ashS = new Sprites(this.scene, 2400, softTex('soft'), false, 9);
    await this.buildVeg(base);
    const g = await new GLTFLoader().loadAsync(base + 'dinos.glb');
    g.scene.traverse(o => {
      if (o.name.startsWith('DINO_')) this.dinoSrc.set(o.name.slice(5) as Kind, o);
      const me = o as T.Mesh; if (!me.isMesh) return;
      const ms = (Array.isArray(me.material) ? me.material : [me.material]) as T.MeshStandardMaterial[];
      ms.forEach(m => { this.dress(m); if (m.name === 'feather') { m.map = feather; m.alphaTest = .42; m.side = T.DoubleSide; m.transparent = false; m.color.set('#ffffff'); m.roughness = .8; } });
    });
    for (const [, o] of this.dinoSrc) o.removeFromParent();
  }
  /** shared material dressing: vertex-colour usage, procedural surface detail, wind flutter for foliage */
  private dress(m: T.MeshStandardMaterial) {
    if ((m as unknown as { _dressed?: boolean })._dressed) return; (m as unknown as { _dressed?: boolean })._dressed = true;
    const vc = /skin|feather|bark|mossrock|fern_leaf/.test(m.name); m.vertexColors = vc; if (vc) m.color.set('#ffffff');
    m.side = T.DoubleSide;
    if (m.name === 'dino_eye' || m.name === 'rex_eye') { m.emissive = new T.Color(m.name === 'rex_eye' ? '#3a2000' : '#2a1400'); m.roughness = .05; m.metalness = .1; }
    if (m.name === 'tooth' || m.name === 'claw') m.vertexColors = false;
    const foliage = /fern_leaf|needles|leaves|horsetail/.test(m.name); const detail = /bark|mossrock|needles|leaves|skin|asteroid/.test(m.name);
    if (!foliage && !detail) return;
    const U = this.U; const k = m.name;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        uniform float time, wind; uniform vec2 windDir; varying vec3 vWP2; varying vec3 vOP;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
        vOP = position;
        ${foliage ? `{ float hgt = max(0., position.y); vec4 wp0 = modelMatrix * vec4(position, 1.);
          #ifdef USE_INSTANCING
          wp0 = modelMatrix * instanceMatrix * vec4(position, 1.);
          #endif
          float ph = wp0.x * .13 + wp0.z * .11; float fl = sin(time * 6.5 + ph * 7. + position.x * 9.) * .5 + sin(time * 11.3 + position.z * 13.) * .5;
          float amp = (.012 + .05 * wind) * min(hgt, 3.);
          transformed.xz += windDir * amp * (fl * .6 + wind * .8) ; transformed.y += fl * amp * .25; }` : ''}`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vWP2 = (modelMatrix * vec4(transformed, 1.)).xyz;
        #ifdef USE_INSTANCING
        vWP2 = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
        #endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        uniform float time, ash, wet; varying vec3 vWP2; varying vec3 vOP; ${NOISE}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 q = vWP2; float n = fbm(q.xz * .9 + q.y * .7), n2 = fbm(vOP.xz * 6. + vOP.y * 5.);
          ${k === 'bark' ? 'diffuseColor.rgb *= .62 + .55 * vn(vec2(vOP.y * 1.4, atan(vOP.z, vOP.x) * 9.)) * (.7 + .5 * n2);' : ''}
          ${k === 'mossrock' ? 'diffuseColor.rgb *= .7 + .5 * n * (.6 + .6 * n2);' : ''}
          ${k === 'needles' ? 'diffuseColor.rgb *= .55 + .6 * vn(vec2(vOP.x * 22., vOP.y * 22. + vOP.z * 22.)) * (.6 + .6 * n);' : ''}
          ${k === 'leaves' ? 'diffuseColor.rgb *= .55 + .55 * smoothstep(.25, .8, vn(vOP.xz * 3. + vOP.y * 3.)) * (.7 + .5 * n2); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.3,.45,.12), .2 * n);' : ''}
          ${k.includes('skin') ? 'float sc = vn(vOP.xz * 38. + vOP.y * 31.); diffuseColor.rgb *= .82 + .3 * sc;' : ''}
          ${k === 'asteroid' ? 'diffuseColor.rgb *= .5 + .7 * n2;' : ''}
          ${k === 'fern_leaf' || k === 'horsetail' ? 'diffuseColor.rgb *= .85 + .3 * n;' : ''}
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(.3,.5,.2))) * vec3(.62,.6,.58), ash * .75); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, .25, wet * .7);`);
    };
    m.customProgramCacheKey = () => 'd5' + k;
  }
  private terrainMat() {
    const m = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: 0, side: T.DoubleSide }); m.name = 'terrain_shader'; const U = this.U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; uniform float ash, wet, time; ${NOISE} ${ZC}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        { vec2 q = vWP.xz; float slope = 1. - clamp(abs(vWN.y), 0., 1.); float n = fbm(q*.05), n2 = fbm(q*.55), n3 = fbm(q*3.1), n4 = vn(q*11.);
          // forest floor: needle litter, dark loam, moss mats
          vec3 litter = mix(vec3(.16,.11,.065), vec3(.27,.19,.11), n3) * (.8 + .35*n4);
          vec3 moss = mix(vec3(.1,.19,.05), vec3(.2,.31,.09), n2) * (.85 + .3*n3);
          vec3 c = mix(litter, moss, smoothstep(.42, .68, n2 + (n-.5)*.4));
          // valley floor: fern prairie greens with brown patches
          vec3 vall = mix(vec3(.13,.24,.07), vec3(.25,.32,.11), n) * (.85 + .3*n3);
          c = mix(c, vall, 1. - smoothstep(-45., -30., vWP.y));
          // rock on steep ground + strata on the escarpment
          vec3 rock = mix(vec3(.38,.34,.29), vec3(.55,.5,.43), n2) * (.75 + .35*n3) * (.9 + .12*sin(vWP.y*1.7 + n*4.));
          c = mix(c, rock, smoothstep(.36, .55, slope + (n2-.5)*.2));
          // stream: wet mud banks
          float ds = abs(q.x - xs(q.y)); float bank = (1. - smoothstep(4.5, 9.5, ds)) * step(q.y, zc(q.x));
          vec3 mud = mix(vec3(.2,.15,.1), vec3(.32,.25,.16), n3);
          c = mix(c, mud, bank * .85);
          diffuseColor.rgb = mix(c, vec3(dot(c, vec3(.3,.5,.2))) * vec3(.6,.58,.56), ash * .8); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        { float ds = abs(vWP.x - xs(vWP.z)); roughnessFactor = mix(roughnessFactor, .35, (1. - smoothstep(4.5, 8., ds)) * .8 + wet * .5); }`);
    };
    m.customProgramCacheKey = () => 'terrain5'; return m;
  }
  private waterMat() {
    this.waterU = { time: { value: 0 }, sunDir: { value: new T.Vector3() }, sunCol: { value: new T.Color() }, top: { value: new T.Color() }, bot: { value: new T.Color() }, fogC: { value: new T.Color() }, fogD: { value: 0 }, ash: { value: 0 }, rain: { value: 0 } };
    return new T.ShaderMaterial({ uniforms: this.waterU, transparent: true, side: T.DoubleSide,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 sunDir, sunCol, top, bot, fogC; uniform float fogD, time, ash, rain; varying vec3 vW; ${NOISE} ${ZC}
        void main(){
          vec3 V = normalize(cameraPosition - vW); float valley = step(vW.y, -40.);
          vec2 flow = valley > .5 ? vec2(0., 1.) : vec2(0., 1.);
          vec2 p = vW.xz * .45 - flow * time * (valley > .5 ? .35 : 1.1);
          vec2 d = vec2(fbm(p) - fbm(p + 3.7), fbm(p * 1.3 + 7.1) - fbm(p * 1.3 + 1.9));
          vec3 N = normalize(vec3(d.x, 1., d.y) + vec3(sin(vW.x*3. + time*9.)*rain*.08, 0., cos(vW.z*3.1 - time*8.)*rain*.08));
          float F = .03 + .97*pow(1.-max(dot(V,N),0.), 5.);
          vec3 R = reflect(-V, N); vec3 sky = mix(bot, top, pow(clamp(R.y,0.,1.), .5));
          vec3 body = mix(vec3(.05,.13,.1), vec3(.12,.24,.18), fbm(vW.xz*.2)) * (.5 + .5*max(0., sunDir.y));
          vec3 col = mix(body, sky, F*.9) + sunCol * pow(max(dot(R, normalize(sunDir)), 0.), 160.) * 2.5;
          float foam = smoothstep(.62, .82, fbm(p*2.5)) * .35; col += vec3(.75,.8,.78) * foam;
          col = mix(col, vec3(dot(col, vec3(.3,.5,.2)))*.7, ash*.6);
          float dist = length(cameraPosition - vW); col = mix(col, fogC, 1. - exp(-fogD*fogD*dist*dist));
          gl_FragColor = vec4(col, .88); }` });
  }
  private fallMat() {
    this.fallU = { time: { value: 0 }, fogC: { value: new T.Color() }, fogD: { value: 0 }, light: { value: 1 } };
    return new T.ShaderMaterial({ uniforms: this.fallU, transparent: true, side: T.DoubleSide, depthWrite: false,
      vertexShader: 'varying vec3 vW; varying vec2 vU; void main(){ vU = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float time, fogD, light; uniform vec3 fogC; varying vec3 vW; ${NOISE}
        void main(){ float s = vn(vec2(vW.x * 2.6, vW.y * .12 + time * 2.2)) * .6 + vn(vec2(vW.x * 7.1, vW.y * .35 + time * 3.4)) * .4;
          float edge = smoothstep(.0, .25, s); vec3 col = mix(vec3(.55,.65,.66), vec3(.95,.97,.97), s) * light;
          float dist = length(cameraPosition - vW); col = mix(col, fogC, 1. - exp(-fogD*fogD*dist*dist));
          gl_FragColor = vec4(col, (.45 + .5*s) * edge); }` });
  }
  private buildSky() {
    this.skyX = { top: this.skyU.top, bot: this.skyU.bot, sunDir: this.skyU.sunDir, glow: this.skyU.glow, stars: this.skyU.stars, time: { value: 0 },
      clouds: { value: .4 }, dim: { value: 0 }, red: { value: 0 }, impDir: { value: new T.Vector3(0, 0, 1) }, impK: { value: 0 }, impT: { value: 0 }, flash: { value: 0 } };
    this.sky.material = new T.ShaderMaterial({ uniforms: this.skyX, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, bot, sunDir, impDir; uniform float glow, stars, time, clouds, dim, red, impK, impT, flash; varying vec3 vD; ${NOISE}
        void main(){ float y = clamp(vD.y * 1.5 + .06, 0., 1.); vec3 c = mix(bot, top, pow(y, .65));
          vec3 sd = normalize(sunDir); float s = max(dot(vD, sd), 0.);
          c += vec3(1., .78, .5) * (pow(s, 10.) * .45 + pow(s, 900.) * 6.) * glow * (1. - dim * .85);
          // impact: hot horizon glow + rising column light
          vec3 id = normalize(impDir); float ia = max(dot(normalize(vec3(vD.x, max(vD.y, 0.) * .6, vD.z)), id), 0.);
          c += vec3(1., .45, .12) * pow(ia, 18.) * impK * (2.2 * exp(-impT * .35) + .6) * smoothstep(-.05, .08, vD.y + .04);
          c += vec3(1., .95, .85) * pow(ia, 4.) * impK * 6. * exp(-impT * 4.);
          // clouds: layered fbm on the dome, lit warm toward the sun, darkened by ash
          if (vD.y > -.02) { vec2 p = vD.xz / (vD.y + .18) * 1.6 + vec2(time * .006, time * .003);
            float cl = smoothstep(1. - clouds, 1.25 - clouds * .5, fbm(p) + fbm(p * 2.3) * .35);
            vec3 cc = mix(vec3(.95,.92,.88), vec3(1., .72, .45), pow(s, 3.)) * (1. - dim * .7);
            cc = mix(cc, vec3(.45,.2,.12), red * .7) + vec3(1., .5, .2) * impK * pow(ia, 6.) * .8;
            c = mix(c, cc * (.78 + .3 * fbm(p * 3.)), cl * smoothstep(-.02, .12, vD.y) * .9); }
          c = mix(c, mix(vec3(.28,.25,.24), vec3(.5,.22,.1), red), dim * .8);
          c = mix(c, c * vec3(1.35, .7, .45) + vec3(.25,.05,0.) * red, red * .55);
          c += vec3(.8,.85,1.) * flash;
          gl_FragColor = vec4(c, 1.); }` });
    // shock / dust ring that expands across the valley from the impact direction
    this.ring = new T.Mesh(new T.RingGeometry(.9, 1, 96, 1), new T.MeshBasicMaterial({ color: '#d9b28a', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: true }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.scene.add(this.ring);
  }
  private buildAsteroid() {
    const src = this.props.get('Asteroid'); this.ast = src ? src.clone() : new T.Object3D(); this.ast.visible = false; this.scene.add(this.ast);
    this.ast.traverse(o => { const me = o as T.Mesh; if (me.isMesh) { const m = (me.material as T.MeshStandardMaterial).clone(); m.emissive = new T.Color('#ff5a1a'); m.emissiveIntensity = 1.4; me.material = m; me.castShadow = false; } });
    this.trailU = { k: { value: 0 }, time: { value: 0 } };
    const g = new T.PlaneGeometry(1, 1, 1, 24); g.translate(0, .5, 0);
    this.trail = new T.Mesh(g, new T.ShaderMaterial({ uniforms: this.trailU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float k, time; varying vec2 vU; ${NOISE}
        void main(){ float w = abs(vU.x - .5) * 2.; float along = vU.y; float core = exp(-w*w*(18. + along*30.)) ; float halo = exp(-w*w*3.) * .35;
          float fl = .7 + .5 * vn(vec2(vU.x * 6., along * 18. - time * 9.));
          vec3 col = mix(vec3(1., .95, .8), vec3(1., .42, .1), smoothstep(.0, .35, along)); col = mix(col, vec3(.35,.25,.25), smoothstep(.5, 1., along));
          float a = (core * 1.6 + halo) * (1. - along) * fl * k; gl_FragColor = vec4(col * a, 1.); }` }));
    this.trail.frustumCulled = false; this.trail.renderOrder = 4; this.trail.visible = false; this.scene.add(this.trail);
  }
  private buildRays() {
    const m = new T.ShaderMaterial({ uniforms: { k: { value: 0 }, time: { value: 0 }, col: { value: new T.Color('#ffe2b0') } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: `uniform float k, time; uniform vec3 col; varying vec2 vU; varying float vD;
        void main(){ float a = smoothstep(0., .25, vU.y) * (1. - smoothstep(.55, 1., vU.y)) * (1. - smoothstep(.1, .5, abs(vU.x - .5))); a *= .65 + .35 * sin(time * .6 + vU.x * 7.);
          a *= smoothstep(1., 6., vD); gl_FragColor = vec4(col * a * k * .16, 1.); }` });
    for (let i = 0; i < 10; i++) { const me = new T.Mesh(new T.PlaneGeometry(1, 1), m.clone()); me.visible = false; me.renderOrder = 6; me.frustumCulled = false; this.scene.add(me); this.rays.push(me); }
  }
  private async buildVeg(base: string) {
    const data = await (await fetch(base + 'veg.json')).json() as Record<string, number[][]>;
    const SW: Record<string, number> = { Conifer: .012, ConiferFar: .01, Broadleaf: .02, BroadleafFar: .015, TreeFern: .05, Cycad: .03, Fern: .08, FernBig: .07, Horsetail: .1, MossRock: 0, Flower: .1 };
    for (const [k, list] of Object.entries(data)) {
      const src = this.props.get(k); if (!src || !list.length) continue;
      const meshes: T.Mesh[] = []; src.updateMatrixWorld(true); src.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
      const inst = meshes.map(m => {
        const g = m.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(src.matrixWorld).invert().multiply(m.matrixWorld));
        const mat = m.material as T.MeshStandardMaterial; this.dress(mat);
        const im = new T.InstancedMesh(g, mat, list.length); im.castShadow = !/Fern|Flower|Horsetail|Far/.test(k) || k === 'TreeFern'; im.receiveShadow = true; im.frustumCulled = false; this.scene.add(im); return im;
      });
      const basem = list.map(([x, y, z, s, r]) => new T.Matrix4().compose(new T.Vector3(x, y - .08, z), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(s, s, s)));
      basem.forEach((m, i) => inst.forEach(im => im.setMatrixAt(i, m)));
      this.veg.push({ inst, data: list, sway: SW[k] ?? .02, base: basem, h: k.startsWith('Conifer') ? 30 : k.startsWith('Broadleaf') ? 15 : 1 });
    }
  }
  private sway(t: number, wind: number, dir: [number, number], gust: number) {
    const q = new T.Quaternion(), e = new T.Euler(), r = new T.Matrix4(), mm = new T.Matrix4();
    for (const v of this.veg) {
      if (!v.sway) continue;
      v.data.forEach((d, i) => {
        const ph = d[4] * 3 + d[0] * .05 + d[2] * .04; const osc = Math.sin(t * (1.3 + wind * .8) + ph) * .7 + Math.sin(t * 2.9 + ph * 1.7) * .3;
        const push = (wind * .5 + gust * (1 + .3 * Math.sin(t * 7 + ph))) * v.sway * 3;
        const a = v.sway * (.4 + wind) * osc + push;
        e.set(a * dir[1], 0, -a * dir[0]); q.setFromEuler(e); mm.copy(v.base[i]).multiply(r.makeRotationFromQuaternion(q)); v.inst.forEach(im => im.setMatrixAt(i, mm));
      });
      v.inst.forEach(im => im.instanceMatrix.needsUpdate = true);
    }
  }
  private particles(F: Frame5) {
    const t = F.t; const cp = this.cam.position; const c = new T.Color();
    this.mist.reset(); this.smoke.reset(); this.glow2.reset(); this.rainS.reset(); this.ashS.reset();
    if (F.mist && F.mist.k > 0) {   // low steam drifting between the trees
      const M = F.mist; const R = rng(11); c.set(M.color ?? '#e9efe9');
      for (let i = 0; i < 320; i++) {
        const a = R() * 6.283, r = Math.sqrt(R()) * M.radius; const z = M.center[2] + Math.sin(a) * r; let x = M.center[0] + Math.cos(a) * r + Math.sin(t * .05 + i) * 2 + t * .25;
        const y = this.H(x, z) + .3 + R() * R() * (M.height ?? 4); x += Math.sin(t * .2 + i * 1.7) * .6;
        this.mist.add(x, y, z, c, M.k * (.025 + R() * .035), 3 + R() * 5, R() * 6);
      }
    }
    if (F.rain && F.rain > 0) {   // streaks around the camera
      const R = rng(5); c.setRGB(.7, .75, .8);
      for (let i = 0; i < 1600 * F.rain; i++) { const x = cp.x + (R() - .5) * 30, z = cp.z + (R() - .5) * 30; const fall = (R() * 20 + t * 14) % 20; this.rainS.add(x - fall * .15, cp.y + 10 - fall, z, c, .35, .35, .15); }
    }
    if (F.ash && F.ash > 0) {     // grey flakes tumbling down
      const R = rng(9); c.setRGB(.55, .52, .5);
      for (let i = 0; i < 1800 * F.ash; i++) { const x = cp.x + (R() - .5) * 40, z = cp.z + (R() - .5) * 40; const fall = (R() * 18 + t * (.8 + R())) % 18;
        this.ashS.add(x + Math.sin(t * .9 + i) * .8 + fall * .3, cp.y + 9 - fall, z + Math.cos(t * .7 + i) * .8, c, .55 * F.ash, .06 + R() * .07, R() * 6); }
    }
    if (F.embers && F.embers > 0) {
      const R = rng(21); c.setRGB(1, .45, .1);
      for (let i = 0; i < 500 * F.embers; i++) { const x = cp.x + (R() - .5) * 40, z = cp.z + (R() - .5) * 40; const rise = (R() * 12 + t * (1 + R() * 2)) % 12;
        this.glow2.add(x + Math.sin(t * 2 + i) * .5, cp.y - 4 + rise, z, c, (1 - rise / 12) * F.embers * (.5 + .5 * Math.sin(t * 9 + i)), .05 + R() * .05); }
    }
    if (F.impact && F.impact.k > 0) this.impactCloud(F.impact);
    for (const m of F.meteors ?? []) {
      if (m.t < 0 || m.t > 1) continue; const p = new T.Vector3(...m.from).lerp(new T.Vector3(...m.to), m.t); const d = new T.Vector3(...m.to).sub(new T.Vector3(...m.from)).normalize();
      c.setRGB(1, .55, .2);
      for (let k = 0; k < 26; k++) { const q = p.clone().addScaledVector(d, -k * .9 * (m.size ?? 1)); this.glow2.add(q.x, q.y, q.z, c, (1 - k / 26) * 1.4, (m.size ?? 1) * (1.6 - k * .04)); }
      c.setRGB(.25, .22, .2); for (let k = 2; k < 30; k++) { const q = p.clone().addScaledVector(d, -k * 1.4 * (m.size ?? 1)); this.smoke.add(q.x, q.y + k * .05, q.z, c, .35 * (1 - k / 30), (m.size ?? 1) * (1.5 + k * .12), k); }
    }
    for (const s of F.splash ?? []) {   // water splash: droplets + mist
      if (s.t < 0 || s.t > 2) continue; const R = rng(77); c.setRGB(.85, .92, .95);
      for (let i = 0; i < 120 * s.k; i++) { const a = R() * 6.283, sp = 1 + R() * 2.5, up = 2 + R() * 3; const tt = s.t; const y = s.at[1] + up * tt - 4.9 * tt * tt; if (y < s.at[1]) continue;
        this.glow2.add(s.at[0] + Math.cos(a) * sp * tt, y, s.at[2] + Math.sin(a) * sp * tt, c, .5 * (1 - tt / 2), .05 + R() * .05); }
    }
    const fog = this.scene.fog as T.FogExp2 | null;
    for (const s of [this.mist, this.smoke, this.glow2, this.rainS, this.ashS]) s.commit(this.h / Math.tan(this.cam.fov * Math.PI / 360), fog);
  }
  /** mushroom cloud + fire glow + dust curtain on the horizon, seconds after impact */
  private impactCloud(I: { at: V3; t: number; k: number }) {
    const R = rng(4242); const c = new T.Color(); const t = Math.max(0, I.t); const [ax, ay, az] = I.at; const S = 1;
    // stem + cap: billows rise at ~(fast early, slowing), cap spreads
    const top = 150 * (1 - Math.exp(-t * .45)) * S; const capR = 30 + 70 * (1 - Math.exp(-t * .3));
    for (let i = 0; i < 1500; i++) {
      const u = R(); const cap = R() < .55; let x, y, z, size;
      if (cap) { const a = R() * 6.283, r = Math.sqrt(R()) * capR; x = ax + Math.cos(a) * r; z = az + Math.sin(a) * r * .5; y = ay + top - (R() * 35) * (1 - r / capR * .5); size = 18 + R() * 30; }
      else { const h = u * top; const w = 10 + 22 * (1 - u) * (1 - u) + 6 * u; x = ax + (R() - .5) * w; z = az + (R() - .5) * w * .5; y = ay + h; size = 14 + R() * 20; }
      const roll = Math.sin(t * .5 + i) * 3; const heat = Math.max(0, 1 - (y - ay) / (top + 1)) * Math.exp(-t * .12);
      c.setRGB(.22 + heat * .8, .18 + heat * .3, .16 + heat * .05);
      this.smoke.add(x + roll, y, z, c, I.k * Math.min(1, t * 1.5) * (.35 + R() * .3), size, R() * 6);
      if (heat > .35 && R() < .35) { c.setRGB(1, .45 + R() * .2, .1); this.glow2.add(x, y, z, c, I.k * heat * .5, size * .6); }
    }
    // spreading dust curtain along the horizon
    const spread = 40 + t * 18;
    for (let i = 0; i < 600; i++) { const a = (R() - .5) * 2; const x = ax + a * spread * 4, z = az - Math.abs(a) * spread * .4; const y = ay + R() * R() * 50 * Math.min(1, t * .3);
      c.setRGB(.45, .3, .22); this.smoke.add(x, y, z, c, I.k * Math.min(1, t * .4) * .3, 30 + R() * 40, R() * 6); }
    // fire line on the horizon
    for (let i = 0; i < 260; i++) { const a = (R() - .5) * 2; c.setRGB(1, .4 + R() * .25, .08); this.glow2.add(ax + a * spread * 3.5, ay + R() * 6, az - Math.abs(a) * spread * .3, c, I.k * Math.min(1, t * .6) * (.4 + .4 * Math.sin(t * 7 + i)), 8 + R() * 10); }
  }
  async render(F: Frame5, frame: number) {
    const t = F.t; this.U.time.value = t; this.U.ash.value = F.sky?.dim ?? 0; this.U.wet.value = Math.min(1, (F.rain ?? 0) * 1.5); this.U.wind.value = F.wind ?? .3;
    const wd = F.windDir ?? [1, 0]; this.U.windDir.value.set(wd[0], wd[1]);
    // sky + water uniforms follow the light preset
    const L = F.light; const sd = new T.Vector3(...L.sun.dir).normalize();
    this.skyX.time.value = t; this.skyX.clouds.value = F.sky?.clouds ?? .38; this.skyX.dim.value = F.sky?.dim ?? 0; this.skyX.red.value = F.sky?.red ?? 0; this.skyX.flash.value = F.flash ?? 0;
    if (F.impact) { this.skyX.impDir.value.set(...F.impact.at).sub(this.cam.position).normalize(); this.skyX.impK.value = F.impact.k; this.skyX.impT.value = F.impact.t; } else this.skyX.impK.value = 0;
    if (this.waterU) { const w = this.waterU; w.time.value = t; w.sunDir.value.copy(sd); w.sunCol.value.set(L.sun.color).multiplyScalar(Math.min(1.5, L.sun.int / 2)); w.top.value.set(L.sky[0]); w.bot.value.set(L.sky[1]); w.fogC.value.set(L.fog[0]); w.fogD.value = L.fog[1]; w.ash.value = F.sky?.dim ?? 0; w.rain.value = F.rain ?? 0; }
    if (this.fallU) { this.fallU.time.value = t; this.fallU.fogC.value.set(L.fog[0]); this.fallU.fogD.value = L.fog[1]; this.fallU.light.value = Math.min(1.2, .35 + L.sun.int * .2 + L.hemi[2] * .3); }
    // creatures
    const seen = new Set<string>();
    for (const s of F.dinos ?? []) {
      let c = this.creatures.get(s.id); if (!c) { const src = this.dinoSrc.get(s.kind); if (!src) continue; c = new Creature(src, s.kind, this.scene); this.creatures.set(s.id, c); }
      c.pose(s); seen.add(s.id);
    }
    for (const [k, c] of this.creatures) if (!seen.has(k)) c.setVisible(false);
    // asteroid
    const A = F.asteroid;
    if (A && A.k > 0) {
      this.ast.visible = true; this.ast.position.set(...A.pos); this.ast.scale.setScalar(A.size ?? 6); this.ast.rotation.set(t * .3, t * .2, 0);
      const dir = new T.Vector3(...A.dir).normalize(); const len = (A.trail ?? 140) * (A.size ?? 6) / 6;
      this.trail.visible = true; this.trailU.k.value = A.k; this.trailU.time.value = t;
      // trail ribbon: starts at the head, extends against the flight direction, faces the camera
      const back = dir.clone().negate(); const toCam = this.cam.position.clone().sub(this.ast.position).normalize(); const side = back.clone().cross(toCam).normalize(); const nrm = side.clone().cross(back).normalize();
      const m = new T.Matrix4().makeBasis(side.multiplyScalar((A.size ?? 6) * 3.2), back.multiplyScalar(len), nrm); m.setPosition(this.ast.position); this.trail.matrixAutoUpdate = false; this.trail.matrix.copy(m); this.trail.matrixWorldNeedsUpdate = true;
    } else { this.ast.visible = false; this.trail.visible = false; }
    // god rays: tilted planes along the sun direction around a point
    const Ry = F.rays;
    this.rays.forEach((r, i) => {
      if (!Ry || Ry.k <= 0) { r.visible = false; return; }
      r.visible = true; const R = rng(31 + i * 7); const sp = Ry.spread ?? 10; const p = new T.Vector3(Ry.from[0] + (R() - .5) * sp, Ry.from[1], Ry.from[2] + (R() - .5) * sp);
      const len = 28; const up = sd.clone(); const center = p.clone().addScaledVector(up, len * .5);
      const toCam = this.cam.position.clone().sub(center); const side = up.clone().cross(toCam).normalize(); const n = side.clone().cross(up).normalize();
      const w = 1.2 + R() * 2.4; const m = new T.Matrix4().makeBasis(side.multiplyScalar(w), up.multiplyScalar(len), n); m.setPosition(center); r.matrixAutoUpdate = false; r.matrix.copy(m); r.matrixWorldNeedsUpdate = true;
      const u = (r.material as T.ShaderMaterial).uniforms; u.k.value = Ry.k * (.6 + R() * .6); u.time.value = t + i * 2; u.col.value.set(Ry.color ?? '#ffe2b0');
    });
    // shock-dust ring
    if (F.impact && F.impact.t > 3) { const rr = (F.impact.t - 3) * 40; this.ring.visible = true; this.ring.position.set(F.impact.at[0], -55, F.impact.at[2]); this.ring.scale.setScalar(rr); (this.ring.material as T.MeshBasicMaterial).opacity = .35 * F.impact.k * Math.max(0, 1 - rr / 420); }
    else this.ring.visible = false;
    this.sway(t, F.wind ?? .3, wd, F.gust ?? 0);
    this.cam.position.set(...F.cam.pos); this.cam.fov = F.cam.fov; this.cam.updateProjectionMatrix(); this.particles(F);
    await super.render(F, frame);
  }
}
