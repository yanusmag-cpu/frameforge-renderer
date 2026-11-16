// "Why GTA 6 took 13 years": the FrameForge 3D engine + ocean, procedural facades (windows per floor), live shop signs,
// animated studio screens (desk monitors, LED wall, timeline wall), traffic-light states, swaying palms, original game-case props, clay-render mode.
import * as T from 'three';
import { Engine, type Frame } from '../brazil/engine.ts';

export type CaseId = 'v' | 'rdr' | 'vi';
export type Frame4 = Frame & {
  signal?: 'red' | 'amber' | 'green';          // traffic lights at the hero crossing
  cases?: { id: CaseId; pos: [number, number, number]; rot?: [number, number, number]; scale?: number }[];
  wall?: { mode: 'updates' | 'dev' | 'delay' | 'off'; k: number; t: number };   // LED wall content + progress
  timeline?: number;                            // studio timeline wall progress 0..3 (2013 → 2018 → 2026 → 'not all GTA 6')
  monitors?: number;                            // 0..1 how far the dev-monitor montage has progressed (bug → fix etc)
  clay?: number;                                // 1 = untextured grey "work in progress" render of the world
  wind?: number;
};
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

// ---------------------------------------------------------------- original case covers (no real artwork or logos)
function cover(id: CaseId): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 540; c.height = 680; const g = c.getContext('2d')!; const W = 540, Hh = 680;
  const grad = (stops: [number, string][]) => { const gr = g.createLinearGradient(0, 0, 0, Hh); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
  const palm = (x: number, y: number, h: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = h * .045; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * .12, y - h * .5, x + h * .05, y - h); g.stroke();
    g.fillStyle = col; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .45; g.beginPath(); g.ellipse(x + h * .05 + Math.cos(a) * h * .22, y - h + Math.sin(a) * h * .12 + h * .06, h * .26, h * .045, a, 0, 7); g.fill(); }
  };
  const skyline = (y: number, col: string, seed: number, tall = 1) => { const R = rng(seed); g.fillStyle = col; let x = -10; while (x < W) { const w = 18 + R() * 40, h = (30 + R() * 140) * tall; g.fillRect(x, y - h, w, h); if (R() > .7) g.fillRect(x + w * .4, y - h - 30, 3, 30); x += w + 2; } };
  if (id === 'v') {           // golden-hour hillside city: sun, skyline, palms, a road sweeping down
    g.fillStyle = grad([[0, '#2b5fa6'], [.45, '#f2a65a'], [.62, '#ffd28a'], [1, '#3a3f5c']]); g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(380, 380, 70, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,200,.25)'; for (let i = 0; i < 6; i++) g.fillRect(0, 300 + i * 22, W, 6);
    skyline(460, '#40365a', 7); skyline(500, '#2c2442', 8, .7);
    g.fillStyle = '#4a6a3a'; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(200, 470, 540, 540); g.lineTo(540, 680); g.lineTo(0, 680); g.fill();
    g.strokeStyle = '#2a2a30'; g.lineWidth = 46; g.beginPath(); g.moveTo(80, 690); g.quadraticCurveTo(260, 560, 520, 540); g.stroke(); g.strokeStyle = '#f0d070'; g.lineWidth = 3; g.setLineDash([16, 14]); g.stroke(); g.setLineDash([]);
    palm(60, 640, 260, '#1d2a22'); palm(470, 660, 200, '#1d2a22');
  } else if (id === 'rdr') {  // western dusk: red sky, mesas, a lone tree and windmill
    g.fillStyle = grad([[0, '#5a1414'], [.4, '#c6421e'], [.62, '#f0a04a'], [1, '#2a120c']]); g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#ffd99a'; g.beginPath(); g.arc(270, 420, 90, 0, 7); g.fill();
    g.fillStyle = '#7a2a18'; g.beginPath(); g.moveTo(0, 470); g.lineTo(60, 400); g.lineTo(170, 400); g.lineTo(200, 470); g.lineTo(330, 470); g.lineTo(360, 380); g.lineTo(500, 380); g.lineTo(540, 450); g.lineTo(540, 680); g.lineTo(0, 680); g.fill();
    g.fillStyle = '#3a140c'; g.fillRect(0, 520, W, 160);
    g.strokeStyle = '#1a0806'; g.lineWidth = 7; g.beginPath(); g.moveTo(110, 600); g.lineTo(110, 520); g.moveTo(110, 545); g.lineTo(80, 515); g.moveTo(110, 555); g.lineTo(140, 525); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(430, 600); g.lineTo(420, 480); g.moveTo(430, 600); g.lineTo(440, 480); g.stroke();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.beginPath(); g.moveTo(430, 478); g.lineTo(430 + Math.cos(a) * 34, 478 + Math.sin(a) * 34); g.stroke(); }
  } else {                    // neon beach at sunset: pink/purple sky, towers glowing, palms, surf
    g.fillStyle = grad([[0, '#3a1e6e'], [.38, '#e0508c'], [.58, '#ff9e6e'], [.7, '#2bb6c4'], [1, '#f3d9a6']]); g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#ffe1a8'; g.beginPath(); g.arc(150, 340, 60, 0, 7); g.fill();
    skyline(470, '#2b1b4a', 11, 1.3); g.fillStyle = 'rgba(255,120,200,.7)'; for (let i = 0; i < 40; i++) { const R = rng(200 + i); g.fillRect(R() * W, 330 + R() * 130, 3, 5); }
    g.fillStyle = '#29a8b6'; g.fillRect(0, 470, W, 70); g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 8; i++) g.fillRect(i * 70, 535 + (i % 2) * 6, 50, 4);
    g.fillStyle = '#f2d8a2'; g.fillRect(0, 540, W, 140);
    palm(70, 640, 330, '#2a1640'); palm(430, 650, 280, '#2a1640'); palm(500, 620, 200, '#3a1e52');
  }
  // generic case band (no logos): plain colour bar with a small original FrameForge mark
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 54); g.fillStyle = '#1d4fb8'; g.fillRect(0, 50, W, 6);
  g.fillStyle = '#1d4fb8'; g.font = '800 26px Inter'; g.fillText('FRAMEFORGE  ARCHIVE', 22, 37);
  return c;
}
function makeCase(id: CaseId): T.Group {
  const W = .135, Hc = .17, D = .015; const grp = new T.Group();
  const art = new T.CanvasTexture(cover(id)); art.colorSpace = T.SRGBColorSpace; art.anisotropy = 8;
  const blue = new T.MeshPhysicalMaterial({ color: '#1f63d6', roughness: .18, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, transmission: 0, transparent: true, opacity: .92 });
  const front = new T.MeshPhysicalMaterial({ map: art, roughness: .25, clearcoat: 1, clearcoatRoughness: .04 });
  const back = new T.MeshPhysicalMaterial({ color: '#1a1d26', roughness: .3, clearcoat: 1 });
  const body = new T.Mesh(new T.BoxGeometry(W, Hc, D, 1, 1, 1), [blue, blue, blue, blue, front, back]); body.castShadow = true; grp.add(body);
  const spine = new T.Mesh(new T.BoxGeometry(.002, Hc * .98, D * .8), new T.MeshStandardMaterial({ color: '#ffffff', roughness: .5 })); spine.position.x = -W / 2 - .001; grp.add(spine);
  // clear plastic wrap sheen
  const wrap = new T.Mesh(new T.PlaneGeometry(W * .99, Hc * .99), new T.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .08, roughness: .05, clearcoat: 1 })); wrap.position.z = D / 2 + .0006; grp.add(wrap);
  return grp;
}

// ---------------------------------------------------------------- shop signs & screens
type Rect = [number, number, number, number, boolean];   // x0, y0, W, H, mirrored (face looks toward -z)
const SX = 2005;
const SIGNS: Record<string, [Rect, string, string, string]> = {
  sign_shop0: [[-32.4, 3.45, 8.2, .8, true], 'SUNSET DINER', '#ffe9b0', '#c2293b'], sign_shop1: [[-20.4, 3.45, 8.2, .8, true], 'PALM CAFÉ', '#ffffff', '#1f8a6a'],
  sign_shop2: [[-10.4, 3.45, 8.2, .8, true], 'OCEAN SURF CO.', '#e9f7ff', '#1764a8'], sign_shop3: [[9.6, 3.45, 8.2, .8, true], 'NEON BEATS', '#ff9be0', '#2a1446'],
  sign_shop4: [[19.6, 3.45, 8.2, .8, true], 'CORAL GELATO', '#4a2a1a', '#ffc4b0'], sign_shop5: [[29.6, 3.45, 8.2, .8, true], 'BAYSIDE PHARMACY', '#ffffff', '#2b8a3e'],
  sign_busad: [[-21.9, .7, 3.8, 1.8, true], 'SUMMER IN THE CITY', '#ffffff', '#e0508c'],
};
function texRect(c: HTMLCanvasElement, r: Rect) {
  const [x, y, W, H, mir] = r; const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  if (mir) { t.repeat.set(-1 / W, -1 / H); t.offset.set((x + W) / W, (1 - y) / H); } else { t.repeat.set(1 / W, -1 / H); t.offset.set(-x / W, (1 - y) / H); }
  t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
function drawSign(c: HTMLCanvasElement, text: string, fg: string, bg: string) {
  const g = c.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = c.height * .62; g.font = `900 ${fs}px Inter`; while (g.measureText(text).width > c.width * .9) { fs *= .92; g.font = `900 ${fs}px Inter`; }
  g.shadowColor = fg; g.shadowBlur = 18; g.fillText(text, c.width / 2, c.height * .54);
}

export class Engine4 extends Engine {
  sea!: T.Mesh; seaU!: Record<string, T.IUniform>; caseObjs: Record<CaseId, T.Group> = {} as Record<CaseId, T.Group>;
  tl: Record<string, T.MeshStandardMaterial> = {}; clayMat = new T.MeshStandardMaterial({ color: '#c9c6c0', roughness: .85 }); clayList: [T.Mesh, T.Material | T.Material[]][] = []; clayOn = false;
  wallC = document.createElement('canvas'); wallT!: T.CanvasTexture; tlC = document.createElement('canvas'); tlT!: T.CanvasTexture; monC = document.createElement('canvas'); monT!: T.CanvasTexture;
  palms: { inst: T.InstancedMesh[]; data: number[][]; base: T.Matrix4[] } | null = null; facade: T.Material[] = [];

  async load4(base: string) {
    await this.load(base);
    // meshes that turn grey in clay mode: everything loaded from world.glb (actors, sky, sea, props stay as they are)
    const propSet = new Set<T.Object3D>(); for (const o of this.props.values()) o.traverse(c => propSet.add(c));
    this.scene.traverse(o => { const m = o as T.Mesh; if (m.isMesh && !propSet.has(m) && !(m.material as T.ShaderMaterial).isShaderMaterial) this.clayList.push([m, m.material]); });
    this.buildSea();
    // facades: windows per floor, computed in the shader from world position (roofs stay plain)
    const seen = new Set<T.Material>();
    this.scene.traverse(o => {
      const m = (o as T.Mesh).material as T.MeshStandardMaterial; if (!m || Array.isArray(m) || seen.has(m)) return; seen.add(m);
      const n = m.name;
      if (n.startsWith('stucco_') || n === 'apartment' || n.startsWith('tower_glass')) this.patchFacade(m, n.startsWith('tower') ? 1 : 0);
      if (n === 'tl_red' || n === 'tl_amber' || n === 'tl_green') { this.tl[n] = m; m.toneMapped = false; }
      if (n.startsWith('neon_')) { m.toneMapped = false; m.emissiveIntensity = 3.5; }
      if (SIGNS[n]) { const [r, text, fg, bg] = SIGNS[n]; const c = document.createElement('canvas'); c.width = Math.round(r[2] * 160); c.height = Math.round(r[3] * 160); drawSign(c, text, fg, bg);
        m.map = texRect(c, r); m.color.set('#ffffff'); m.emissive = new T.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = .35; m.needsUpdate = true; }
      if (n === 'screen_wall') { this.wallC.width = 1800; this.wallC.height = 300; this.wallT = texRect(this.wallC, [SX - 9, 1.2, 18, 3, false]); this.screenMat(m, this.wallT); }
      if (n === 'screen_timeline') { this.tlC.width = 2000; this.tlC.height = 220; const t = new T.CanvasTexture(this.tlC); t.colorSpace = T.SRGBColorSpace; t.repeat.set(1 / 20, -1 / 2.2); t.offset.set(10 / 20, (1 - 1.4) / 2.2); t.wrapS = t.wrapT = T.ClampToEdgeWrapping; this.tlT = t; this.screenMat(m, t); }
      if (n === 'screen') { this.monC.width = 1152; this.monC.height = 164; const t = new T.CanvasTexture(this.monC); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 2.88, -1 / .41); t.offset.set(0, (1 - .925) / .41); this.monT = t; this.screenMat(m, t); }
    });
    for (const id of ['v', 'rdr', 'vi'] as CaseId[]) { const g = makeCase(id); g.visible = false; this.scene.add(g); this.caseObjs[id] = g; }
    await this.buildPalms(base);
  }
  private screenMat(m: T.MeshStandardMaterial, t: T.Texture) { m.map = t; m.emissiveMap = t; m.emissive = new T.Color('#ffffff'); m.emissiveIntensity = 1.1; m.color.set('#000000'); m.toneMapped = false; m.needsUpdate = true; }
  private patchFacade(m: T.MeshStandardMaterial, glass: number) {
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN;\nfloat fh(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        float vert = 1. - step(.6, abs(vWN.y));
        float u = abs(vWN.x) > .5 ? vWP.z : vWP.x; float fy = (vWP.y - .45) / 3.4; float row = floor(fy);
        ${glass ? `
        float mull = step(.93, fract(u / 1.6)) + step(.9, fract(fy));
        float pane = fh(vec2(floor(u / 1.6), row));
        vec3 refl = mix(diffuseColor.rgb*.7, vec3(.85,.92,1.), smoothstep(-20., 180., vWP.y)*.55) * (.85 + .3*pane);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(refl, vec3(.12,.13,.15), clamp(mull,0.,1.)), vert);` : `
        float wx = fract(u / 2.6), wy = fract(fy);
        float win = step(.25, wx) * step(wx, .72) * step(.3, wy) * step(wy, .82) * step(.6, fy);
        float lit = fh(vec2(floor(u / 2.6), row));
        vec3 wc = mix(vec3(.16,.22,.28), vec3(.45,.6,.7), lit*.6);
        diffuseColor.rgb = mix(diffuseColor.rgb, wc, win * vert);
        diffuseColor.rgb *= 1. - .12 * step(.94, wy) * vert;`}`);
    };
    m.needsUpdate = true; this.facade.push(m);
  }
  private buildSea() {
    this.seaU = { time: { value: 0 }, sunDir: { value: new T.Vector3() }, top: { value: new T.Color() }, bot: { value: new T.Color() }, fogC: { value: new T.Color() }, fogD: { value: 0 } };
    const g = new T.PlaneGeometry(4000, 4000, 1, 1); g.rotateX(-Math.PI / 2);
    this.sea = new T.Mesh(g, new T.ShaderMaterial({ uniforms: this.seaU,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float time, fogD; uniform vec3 sunDir, top, bot, fogC; varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec3 V = normalize(cameraPosition - vW); vec2 q = vW.xz;
          vec2 d = vec2(n(q*.35+time*.5)-n(q*.35-time*.4+3.), n(q.yx*.31+time*.45)-n(q*.6+time*.7)) + vec2(n(q*1.7-time), n(q*1.9+time*1.1))*.4 - .2;
          vec3 N = normalize(vec3(d.x*.35, 1., d.y*.35));
          float F = .02 + .98*pow(1.-max(dot(V,N),0.), 5.); vec3 R = reflect(-V,N);
          vec3 sky = mix(bot, top, pow(clamp(R.y,0.,1.), .5));
          float shore = smoothstep(-40., -27., vW.z) * step(vW.x, 222.);
          vec3 body = mix(vec3(.02,.24,.34), vec3(.12,.62,.62), shore*.85);
          vec3 col = mix(body, sky, F*.9) + vec3(1.,.95,.85)*pow(max(dot(R, normalize(sunDir)),0.), 300.)*3.;
          float foam = smoothstep(.55, .9, n(q*vec2(.6,1.6) + vec2(0., time*.9))) * smoothstep(-32., -28.5, vW.z) * smoothstep(-26., -28., vW.z) * step(vW.x, 222.);
          col = mix(col, vec3(.97), foam*.8);
          float dist = length(cameraPosition - vW); col = mix(col, fogC, 1. - exp(-fogD*fogD*dist*dist));
          gl_FragColor = vec4(col, 1.); }` }));
    this.sea.position.y = 0; this.sea.receiveShadow = false; this.scene.add(this.sea);
  }
  private async buildPalms(base: string) {
    const data = await (await fetch(base + 'palms.json')).json() as number[][];
    const src = this.props.get('Palm'); if (!src) return; src.updateMatrixWorld(true); const meshes: T.Mesh[] = []; src.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
    const inst = meshes.map(m => { const g = m.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(src.matrixWorld).invert().multiply(m.matrixWorld)); const im = new T.InstancedMesh(g, m.material, data.length); im.castShadow = true; im.frustumCulled = false; this.scene.add(im); return im; });
    const base4 = data.map(([x, y, z, s, r]) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(s, s, s)));
    this.palms = { inst, data, base: base4 };
  }
  // ---------------------------------------------------------------- per-frame screens
  private drawWall(F: Frame4) {
    const w = F.wall; if (!w || !this.wallT) return; const g = this.wallC.getContext('2d')!; const W = 1800, Hh = 300;
    g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, W, Hh);
    if (w.mode === 'updates') {      // generic "online update" tiles appearing one after another (2013 → 2023)
      const n = Math.floor(w.k * 12.999);
      for (let i = 0; i <= n && i < 12; i++) {
        const x = 30 + (i % 6) * 292, y = 26 + Math.floor(i / 6) * 138, a = Math.min(1, (w.k * 13 - i) * 2);
        g.globalAlpha = a; g.fillStyle = ['#ff5a7a', '#2bd1c4', '#ffb347', '#7a6cff', '#4fd36a', '#ff7ad9'][i % 6]; g.fillRect(x, y, 270, 118);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + 78, 270, 40); g.fillStyle = '#fff'; g.font = '800 30px Inter'; g.fillText('ONLINE UPDATE', x + 14, y + 44); g.font = '700 26px Inter'; g.fillText(String(2013 + Math.min(10, Math.floor(i * 10 / 11))), x + 14, y + 108);
        g.font = '900 52px Inter'; g.fillText(['★', '♦', '▲', '●', '■', '✦'][i % 6], x + 200, y + 66);
      }
      g.globalAlpha = 1;
    } else if (w.mode === 'dev') {   // build progress: wireframe → shaded → lit
      const k = w.k; g.strokeStyle = '#3df2ff'; g.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const x = 80 + i * 190, h = 60 + (i * 53 % 140); g.globalAlpha = 1; if (k > .33) { g.fillStyle = k > .66 ? ['#f7a6c8', '#9fe0d6', '#ffd38a'][i % 3] : '#9a9a9a'; g.fillRect(x, 260 - h, 150, h); } g.strokeRect(x, 260 - h, 150, h); if (k > .66) { g.fillStyle = 'rgba(255,255,255,.55)'; for (let r = 0; r < h / 24 - 1; r++) for (let q = 0; q < 4; q++) g.fillRect(x + 12 + q * 34, 260 - h + 14 + r * 24, 18, 12); } }
      g.fillStyle = '#fff'; g.font = '800 34px Inter'; g.fillText(k < .33 ? 'BLOCKOUT' : k < .66 ? 'MODELLING' : 'LIGHTING + DETAIL', 30, 50);
      g.fillStyle = '#1e2a3a'; g.fillRect(1400, 20, 370, 26); g.fillStyle = '#3df2ff'; g.fillRect(1400, 20, 370 * k, 26);
    } else if (w.mode === 'delay') { // release window history
      const items: [string, number][] = [['FALL 2025', 0], ['MAY 26, 2026', 1], ['NOV 19, 2026', 2]];
      items.forEach(([s, i]) => { const a = Math.min(1, Math.max(0, w.k * 3.2 - i)); if (a <= 0) return; const x = 60 + i * 580;
        g.globalAlpha = a; g.fillStyle = i < 2 ? '#2a1a1e' : '#123222'; g.fillRect(x, 60, 520, 180); g.fillStyle = '#fff'; g.font = '900 64px Inter'; g.fillText(s, x + 30, 175);
        if (i < 2 && w.k * 3.2 - i > 1.0) { g.strokeStyle = '#ff4a4a'; g.lineWidth = 12; g.beginPath(); g.moveTo(x + 20, 210); g.lineTo(x + 500, 90); g.stroke(); }
        if (i === 2 && a >= 1) { g.fillStyle = '#4fd36a'; g.font = '900 48px Inter'; g.fillText('✓ CURRENT DATE', x + 30, 228); } });
      g.globalAlpha = 1;
    }
    this.wallT.needsUpdate = true;
  }
  private drawTimeline(k: number) {
    if (!this.tlT) return; const g = this.tlC.getContext('2d')!; const W = 2000, Hh = 220; g.fillStyle = '#0b0f1a'; g.fillRect(0, 0, W, Hh);
    const X = (y: number) => 120 + (y - 2013) / 13 * 1760;
    g.fillStyle = '#26324a'; g.fillRect(X(2013), 120, X(2026) - X(2013), 14);
    g.fillStyle = '#3df2ff'; g.fillRect(X(2013), 120, (X(2026) - X(2013)) * Math.min(1, k), 14);
    const pts: [number, string, string][] = [[2013, 'GTA V', '#ffb347'], [2018, 'RED DEAD REDEMPTION 2', '#ff5a48'], [2026, 'GTA VI', '#ff7ad9']];
    pts.forEach(([y, s, c], i) => { if (k < i * .9 + .05) return; g.fillStyle = c; g.beginPath(); g.arc(X(y), 127, 24, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 54px Inter'; g.textAlign = 'center'; g.fillText(String(y), X(y), 90); g.font = '700 30px Inter'; g.fillText(s, X(y), 196); g.textAlign = 'left'; });
    this.tlT.needsUpdate = true;
  }
  private drawMonitors(t: number, k: number) {
    if (!this.monT) return; const g = this.monC.getContext('2d')!; const P = 288, Hh = 164;
    for (let p = 0; p < 4; p++) {
      const x0 = p * P; g.fillStyle = ['#1b1f2a', '#20262f', '#151a22', '#1a2230'][p]; g.fillRect(x0, 0, P, Hh);
      if (p === 0) { for (let r = 0; r < 12; r++) { const R = rng(r + Math.floor(t * 4) * 31); g.fillStyle = ['#ff7ad9', '#3df2ff', '#ffd38a', '#9aa4b8'][r % 4]; g.fillRect(x0 + 12 + (r % 3) * 10, 8 + r * 13, 40 + R() * 180, 6); } }
      if (p === 1) { g.strokeStyle = '#3df2ff'; g.lineWidth = 2; const s = t * .6; for (let i = 0; i < 6; i++) { const cx = x0 + 144 + Math.cos(s + i) * 50, cy = 82 + Math.sin(s * .7 + i) * 20; g.strokeRect(cx - 18, cy - 30, 36, 60); }
        if (k > .5) { g.fillStyle = 'rgba(255,170,90,.5)'; g.fillRect(x0 + 40, 30, 210, 100); } }
      if (p === 2) { g.strokeStyle = '#ffd38a'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < P; x += 6) { const y = 82 + Math.sin(x * .05 + t * 2) * 40 * (1 - .5 * k); x ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y); } g.stroke(); }
      if (p === 3) { const bug = k > .25 && k < .62; g.fillStyle = bug ? '#ff4a4a' : '#4fd36a'; g.font = '900 30px Inter'; g.fillText(bug ? '⚠ BUG #4127' : '✓ FIXED', x0 + 30, 92); }
    }
    this.monT.needsUpdate = true;
  }
  async render(F: Frame4, frame: number) {
    const t = F.t;
    this.seaU.time.value = t; this.seaU.sunDir.value.set(...F.light.sun.dir).normalize(); this.seaU.top.value.set(F.light.sky[0]); this.seaU.bot.value.set(F.light.sky[1]); this.seaU.fogC.value.set(F.light.fog[0]); this.seaU.fogD.value = F.light.fog[1];
    const st = F.signal ?? 'green'; const on = (k: string) => (k === 'tl_red' && st === 'red') || (k === 'tl_amber' && st === 'amber') || (k === 'tl_green' && st === 'green');
    for (const [k, m] of Object.entries(this.tl)) m.emissiveIntensity = on(k) ? 6 : .05;
    for (const id of ['v', 'rdr', 'vi'] as CaseId[]) this.caseObjs[id].visible = false;
    for (const c of F.cases ?? []) { const g = this.caseObjs[c.id]; g.visible = true; g.position.set(...c.pos); g.rotation.set(...(c.rot ?? [0, 0, 0])); g.scale.setScalar(c.scale ?? 1); }
    if (this.palms) { const q = new T.Quaternion(), e = new T.Euler(), r = new T.Matrix4(), mm = new T.Matrix4(); const w = F.wind ?? 1;
      this.palms.data.forEach((d, i) => { const a = .03 * w * Math.sin(t * 1.4 + d[4] * 3); e.set(a * .5, 0, a); q.setFromEuler(e); mm.copy(this.palms!.base[i]).multiply(r.makeRotationFromQuaternion(q)); this.palms!.inst.forEach(im => im.setMatrixAt(i, mm)); });
      this.palms.inst.forEach(im => im.instanceMatrix.needsUpdate = true); }
    this.drawWall(F); if (F.timeline !== undefined) this.drawTimeline(F.timeline); this.drawMonitors(t, F.monitors ?? 0);
    const clay = (F.clay ?? 0) > .5; if (clay !== this.clayOn) { this.clayOn = clay; for (const [m, orig] of this.clayList) m.material = clay ? this.clayMat : orig; }
    return super.render(F, frame);
  }
}
