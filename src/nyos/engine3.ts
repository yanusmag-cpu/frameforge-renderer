// Lake Nyos engine: the FrameForge 3D engine (look, lights, actors, post) + animated crater-lake water (surface, underside, eruption bulge),
// underwater mode (caustics, light shafts, suspended particles), the deep CO2 layer, the visualised gas cloud and wind-swayed instanced vegetation.
import * as T from 'three';
import { Engine, type Frame } from '../brazil/engine.ts';
import { H, WL, valleyX, LANES } from './terrain.ts';

export type Frame3 = Frame & {
  water?: { boil?: number; boilT?: number; calm?: number; rust?: number };   // boil: eruption strength 0..1; rust: iron-red tint after the event
  under?: number;                     // 0..1 underwater look (caustics, shafts, fog handled by the light preset)
  co2?: { k: number; lift?: number; label?: number };  // deep CO2 layer visibility, how far it has lifted (0..1)
  bubbles?: { k: number; t: number; rise?: number };  // bubble columns from the deep layer
  gas?: { front: number; k: number; t: number; lake?: number };  // visualised CO2 cloud: valley front distance (m from the rim notch), opacity, lake-surface sheet
  wind?: number;                      // vegetation sway strength
  lantern?: number;                   // lantern flame 0..1 (CO2 puts flames out)
};
const rng = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
const thatchTex = () => canvasTex(512, 512, g => {
  g.fillStyle = '#9c7c46'; g.fillRect(0, 0, 512, 512); const R = rng(5);
  for (let i = 0; i < 2600; i++) { const x = R() * 512, y = R() * 512, l = 20 + R() * 50; g.strokeStyle = `hsl(${36 + R() * 10},${35 + R() * 25}%,${28 + R() * 30}%)`; g.lineWidth = 1 + R() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 6, y + l); g.stroke(); }
  for (let y = 0; y < 512; y += 64) { g.fillStyle = 'rgba(40,25,10,.25)'; g.fillRect(0, y, 512, 6); }
});
const causticTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return { c, t };
};
function drawCaustics(c: HTMLCanvasElement, time: number) {
  const g = c.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'lighter'; g.lineWidth = 3;
  for (let k = 0; k < 3; k++) for (let i = 0; i < 14; i++) {
    g.strokeStyle = `rgba(190,240,255,${.16 + k * .05})`; g.beginPath();
    for (let x = -10; x <= 266; x += 8) { const y = (i * 19 + k * 7 + Math.sin(x * .045 + time * (1.1 + k * .3) + i) * 9 + Math.sin(x * .11 - time * 1.7 + i * 2.1) * 4) % 266; if (x === -10) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

export class Engine3 extends Engine {
  water!: T.Mesh; wU!: Record<string, T.IUniform>; co2!: T.Mesh; co2U!: Record<string, T.IUniform>;
  shafts: T.Mesh[] = []; caust!: T.SpotLight; ct!: { c: HTMLCanvasElement; t: T.CanvasTexture };
  veg: { inst: T.InstancedMesh[]; data: number[][]; sway: number; base: T.Matrix4[] }[] = [];
  bub!: T.Points; bubPos = new Float32Array(3 * 1500); lanternMat: T.MeshStandardMaterial | null = null; lanternLight = new T.PointLight('#ffb35a', 0, 6, 1.6);
  gasPts!: T.Points; gasPos = new Float32Array(3 * 2600); gasCol = new Float32Array(4 * 2600); gasSiz = new Float32Array(2600);

  async load3(base: string) {
    await this.load(base);
    this.scene.add(this.lanternLight);
    // materials missing from the shared detail set
    const th = thatchTex(); th.repeat.set(.6, .6);
    this.scene.traverse(o => {
      const m = (o as T.Mesh).material as T.MeshStandardMaterial; if (!m || !m.name) return;
      if (m.name === 'thatch' && !m.map) { m.map = th; m.color.set('#ffffff'); m.needsUpdate = true; }
      if (m.name === 'flame') { this.lanternMat = m; m.toneMapped = false; }
      if (m.name === 'terrain' || m.name.startsWith('turf') || m.name === 'dirt' || m.name === 'stone' || m.name === 'earth' || m.name === 'sand_shore') (o as T.Mesh).receiveShadow = true;
    });
    this.buildTerrain(); this.buildWater(); this.buildCO2(); this.buildUnder(); this.buildGas();
    await this.buildVeg(base);
  }
  // ---------------------------------------------------------------- terrain: one smooth material, coloured per pixel by slope / height / paths
  private buildTerrain() {
    const segs: T.Vector4[] = []; for (const l of LANES) for (let i = 0; i < l.length - 1; i++) segs.push(new T.Vector4(l[i][0], l[i][1], l[i + 1][0], l[i + 1][1]));
    while (segs.length < 24) segs.push(new T.Vector4(9999, 9999, 9999, 9999));
    const m = new T.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: 0 }); m.name = 'terrain_shader';
    m.onBeforeCompile = sh => {
      sh.uniforms.segs = { value: segs };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix*vec4(transformed,1.)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWP; varying vec3 vWN; uniform vec4 segs[24];
        float th(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float tn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(th(i),th(i+vec2(1,0)),f.x),mix(th(i+vec2(0,1)),th(i+vec2(1,1)),f.x),f.y); }
        float fbm(vec2 p){ return tn(p)*.5 + tn(p*2.1)*.25 + tn(p*4.3)*.125 + tn(p*9.1)*.0625; }
        float laneD(vec2 p){ float d=1e5; for(int i=0;i<24;i++){ vec2 a=segs[i].xy, b=segs[i].zw; vec2 ab=b-a; float t=clamp(dot(p-a,ab)/max(dot(ab,ab),1e-4),0.,1.); d=min(d,length(p-a-ab*t)); } return d; }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        if (vWP.x > -4.62 && vWP.x < .62 && vWP.z > 249.88 && vWP.z < 254.12) discard;   // keep the ground out of the hero house
        { vec2 q = vWP.xz; float slope = 1. - clamp(vWN.y, 0., 1.); float n = fbm(q*.06), n2 = fbm(q*.6), n3 = fbm(q*2.7);
          vec3 g1 = vec3(.24,.42,.13), g2 = vec3(.40,.55,.19), g3 = vec3(.52,.55,.24);
          vec3 c = mix(mix(g1, g2, smoothstep(.3,.7,n)), g3, smoothstep(.62,.85,n2)*.5) * (.85 + .3*n3);
          vec3 rockc = mix(vec3(.36,.33,.29), vec3(.52,.48,.42), n2) * (.8+.35*n3);
          c = mix(c, rockc, smoothstep(.33, .52, slope + (n2-.5)*.18));
          float r = length(q); float hy = vWP.y;
          vec3 sand = mix(vec3(.55,.46,.33), vec3(.68,.58,.42), n3);
          c = mix(c, sand, smoothstep(${(WL + 1.6).toFixed(2)}, ${(WL + .3).toFixed(2)}, hy) * step(r, 104.));
          vec3 mud = mix(vec3(.22,.2,.15), vec3(.33,.3,.22), n2) * (.8 + .3*n3);
          c = mix(c, mud, smoothstep(${(WL - .2).toFixed(2)}, ${(WL - 1.6).toFixed(2)}, hy) * step(r, 104.));
          float ld = laneD(q) + (n3-.5)*.9; vec3 dirt = mix(vec3(.50,.32,.18), vec3(.62,.42,.25), n2) * (.85+.25*n3);
          c = mix(c, dirt, smoothstep(2.3, 1.2, ld) * step(hy, 30.));
          c *= .92 + .16*fbm(q*.015);
          diffuseColor.rgb = c; }`);
    };
    const names = new Set(['turf', 'turf_dark', 'stone', 'dirt', 'earth', 'sand_shore']);
    this.scene.traverse(o => { const me = o as T.Mesh; if (!me.isMesh) return; let p: T.Object3D | null = o; let isT = false; while (p) { if (p.name.startsWith('terrain')) isT = true; p = p.parent; }
      const mm = me.material as T.Material; if (isT && names.has(mm.name)) { me.material = m; me.receiveShadow = true; me.castShadow = true; } });
  }
  // ---------------------------------------------------------------- vegetation (instanced, wind sway)
  private async buildVeg(base: string) {
    const data = await (await fetch(base + 'veg.json')).json() as Record<string, number[][]>;
    delete (data as Record<string, unknown>).grass;
    const KIND: Record<string, [string, number]> = { tree: ['Tree', .025], palm: ['Palm', .035], banana: ['Banana', .05], bush: ['Bush', .03], grass: ['Grass', .14], reed: ['Reed', .12] };
    { const R = rng(31337); let n = 0; const vil = (x: number, z: number) => Math.hypot(x + 16, z - 262) < 72;
      while (n < 2600) { const x = (R() - .5) * 720, z = (R() - .5) * 720, r = Math.hypot(x, z); if (r < 104 || r > 360 || vil(x, z)) continue;
        const sl = Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2; if (sl > 1.0) continue; if (Math.abs(x - valleyX(z)) < 10 && z > 100 && z < 240) continue;
        data.tree.push([x, H(x, z), z, .8 + R() * .8, R() * 6.28]); n++; } }
    for (const [k, list] of Object.entries(data)) {
      const [pname, sway] = KIND[k]; const src = this.props.get(pname); if (!src) continue;
      const meshes: T.Mesh[] = []; src.updateMatrixWorld(true); src.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
      const inst = meshes.map(m => {
        const g = m.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(src.matrixWorld).invert().multiply(m.matrixWorld));
        const im = new T.InstancedMesh(g, m.material, list.length); im.castShadow = k === 'tree' || k === 'palm' || k === 'banana'; im.receiveShadow = true; im.frustumCulled = false; this.scene.add(im); return im;
      });
      const basem = list.map(([x, y, z, s, r]) => new T.Matrix4().compose(new T.Vector3(x, y - .05, z), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(s, s, s)));
      this.veg.push({ inst, data: list, sway, base: basem });
    }
  }
  private sway(t: number, wind: number) {
    const q = new T.Quaternion(), e = new T.Euler(), r = new T.Matrix4(), mm = new T.Matrix4();
    for (const v of this.veg) {
      v.data.forEach((d, i) => {
        const ph = d[4] * 3 + d[0] * .05 + d[2] * .04; const a = v.sway * wind * (Math.sin(t * 1.3 + ph) * .7 + Math.sin(t * 2.9 + ph * 1.7) * .3);
        e.set(a * .6, 0, a); q.setFromEuler(e); mm.copy(v.base[i]).multiply(r.makeRotationFromQuaternion(q)); v.inst.forEach(im => im.setMatrixAt(i, mm));
      });
      v.inst.forEach(im => im.instanceMatrix.needsUpdate = true);
    }
  }
  // ---------------------------------------------------------------- water
  private buildWater() {
    this.wU = { time: { value: 0 }, boil: { value: 0 }, boilT: { value: 0 }, sunDir: { value: new T.Vector3() }, sunCol: { value: new T.Color() }, top: { value: new T.Color() }, bot: { value: new T.Color() },
      fogC: { value: new T.Color() }, fogD: { value: 0 }, rust: { value: 0 }, under: { value: 0 }, calm: { value: 1 } };
    const g = new T.CircleGeometry(104, 220, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
    const m = new T.ShaderMaterial({ uniforms: this.wU, transparent: true, side: T.DoubleSide, depthWrite: true,
      vertexShader: `uniform float time, boil, boilT, calm; varying vec3 vW; varying vec3 vN; varying float vFoam;
        float wav(vec2 p){ float t=time; return (sin(p.x*.21+t*1.1)*.05 + sin(p.y*.17-t*.9)*.05 + sin((p.x+p.y)*.43+t*1.9)*.025 + sin((p.x-p.y)*.71-t*2.3)*.012)*calm; }
        float bulge(vec2 p){ float r=length(p-vec2(-6.,4.)); float b = boil*(3.2*exp(-r*r/520.) + .55*sin(r*.32-boilT*6.)*exp(-r/38.)); return b; }
        float h(vec2 p){ return wav(p) + bulge(p); }
        void main(){ vec3 p = position; vec2 q = p.xz; p.y = h(q); vec2 e=vec2(.6,0.);
          vec3 n = normalize(vec3(h(q-e.xy)-h(q+e.xy), 1.2, h(q-e.yx)-h(q+e.yx))); vN = n;
          float r=length(q-vec2(-6.,4.)); vFoam = boil*smoothstep(46.,0.,r)*(.55+.45*sin(r*.9-boilT*9.));
          vec4 w = modelMatrix*vec4(p,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform vec3 sunDir, sunCol, top, bot, fogC; uniform float fogD, time, rust, under; varying vec3 vW; varying vec3 vN; varying float vFoam;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN);
          vec2 rp = vW.xz*.9; vec2 d = vec2(noise(rp+time*.6)-noise(rp*1.7-time*.5), noise(rp.yx*1.3+time*.4)-noise(rp*2.3+time*.7));
          N = normalize(N + vec3(d.x, 0., d.y)*.16);
          float r = length(vW.xz);
          if (!gl_FrontFacing) {   // seen from below: bright Snell window overhead, dark green-blue elsewhere
            float c = pow(max(0., dot(V, vec3(0.,-1.,0.))), 3.);
            vec3 col = mix(vec3(.03,.16,.18), vec3(.55,.85,.88), c) + vec3(.4,.6,.6)*pow(max(0.,dot(-reflect(-V,-N), sunDir)),40.)*.4;
            gl_FragColor = vec4(col, .96); return; }
          float F = .03 + .97*pow(1.-max(dot(V,N),0.), 5.);
          vec3 R = reflect(-V, N); float sy = clamp(R.y, 0., 1.);
          vec3 sky = mix(bot, top, pow(sy, .55));
          vec3 deep = mix(vec3(.02,.13,.15), vec3(.20,.08,.04), rust), shal = mix(vec3(.09,.32,.30), vec3(.45,.25,.12), rust);
          vec3 body = mix(shal, deep, smoothstep(60., 10., 92.-r) ) * (.55 + .45*max(0., sunDir.y));
          vec3 col = mix(body, sky, F*.85);
          float sp = pow(max(dot(R, normalize(sunDir)), 0.), 220.); col += sunCol*sp*3.;
          col += vec3(.9,.95,.95)*clamp(vFoam*(.6+.6*noise(vW.xz*.7+time)),0.,1.)*.5;
          float shore = smoothstep(92., 88.5, r); col = mix(col, mix(col, vec3(.85,.9,.85), .35), (1.-shore)*(.5+.5*sin(r*3.-time*2.)));
          float a = mix(.62, .95, smoothstep(91., 82., r));
          float dist = length(cameraPosition - vW); float fg = 1. - exp(-fogD*fogD*dist*dist); col = mix(col, fogC, fg);
          gl_FragColor = vec4(col, a); }` });
    this.water = new T.Mesh(g, m); this.water.position.y = WL; this.water.renderOrder = 3; this.scene.add(this.water);
  }
  // ---------------------------------------------------------------- deep CO2 layer (dissolved gas made visible)
  private buildCO2() {
    this.co2U = { time: { value: 0 }, k: { value: 0 }, lift: { value: 0 } };
    const g = new T.SphereGeometry(1, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); // lower hemisphere bowl
    g.scale(86, 25, 86);
    const m = new T.ShaderMaterial({ uniforms: this.co2U, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      vertexShader: `varying vec3 vP; void main(){ vP = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vP,1.); }`,
      fragmentShader: `uniform float time, k, lift; varying vec3 vP;
        float hash(vec3 p){ return fract(sin(dot(p,vec3(17.1,113.7,71.3)))*43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y), mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
        void main(){
          float top = ${(WL - 12).toFixed(1)} + lift*14.;
          float layer = smoothstep(top + 1.5, top - 4., vP.y);
          float sw = n3(vP*.09 + vec3(time*.15, -time*.05, time*.1))*.6 + n3(vP*.23 - vec3(0., time*.3, 0.))*.4;
          vec3 c = mix(vec3(.25,.55,.95), vec3(.55,.35,.95), sw);
          gl_FragColor = vec4(c * layer * (.35 + .65*sw) * k * .42, 1.); }` });
    this.co2 = new T.Mesh(g, m); this.co2.position.set(0, WL + .2, 0); this.co2.renderOrder = 4; this.co2.visible = false; this.scene.add(this.co2);
    // bubbles
    const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(this.bubPos, 3));
    this.bub = new T.Points(bg, new T.ShaderMaterial({ uniforms: { scale: { value: 800 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `uniform float scale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = clamp(.16*scale/-mv.z, 1., 40.); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `void main(){ vec2 c = gl_PointCoord-.5; float r = length(c); if (r>.5) discard; float ring = smoothstep(.5,.38,r)*smoothstep(.2,.42,r) + smoothstep(.22,.0,length(c+vec2(.14,.14)))*.8; gl_FragColor = vec4(vec3(.75,.95,1.), ring*.75); }` }));
    this.bub.frustumCulled = false; this.bub.renderOrder = 6; this.scene.add(this.bub);
  }
  // ---------------------------------------------------------------- underwater caustics + light shafts
  private buildUnder() {
    this.ct = causticTex(); this.caust = new T.SpotLight('#bff0ff', 0, 140, .75, .6, 1); this.caust.map = this.ct.t; this.caust.castShadow = true;
    this.caust.shadow.mapSize.set(512, 512); this.caust.position.set(0, WL + 60, 0); this.caust.target.position.set(0, 0, 0); this.scene.add(this.caust, this.caust.target);
    const sm = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { k: { value: 0 }, time: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float k, time; varying vec2 vUv; void main(){ float a = (1.-vUv.y)*smoothstep(0.,.25,vUv.y)*smoothstep(.5,.2,abs(vUv.x-.5)); a *= .55+.45*sin(time*.7+vUv.x*9.); gl_FragColor = vec4(vec3(.55,.9,.95)*a*k*.22, 1.); }` });
    for (let i = 0; i < 9; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(4 + (i % 3) * 2, 34, 1, 1), sm.clone()); m.geometry.translate(0, -17, 0);
      m.position.set(-30 + i * 7.5, WL, -10 + (i % 4) * 6); m.rotation.set(0, (i * 1.3) % Math.PI, .32 - (i % 2) * .1); m.visible = false; m.renderOrder = 7; this.scene.add(m); this.shafts.push(m);
    }
  }
  // ---------------------------------------------------------------- visualised gas cloud (soft sprites hugging the ground)
  private buildGas() {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.gasPos, 3)); g.setAttribute('color', new T.BufferAttribute(this.gasCol, 4)); g.setAttribute('size', new T.BufferAttribute(this.gasSiz, 1));
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!; const R = rng(9);
    for (let i = 0; i < 40; i++) { const gr = x.createRadialGradient(64 + (R() - .5) * 50, 64 + (R() - .5) * 50, 0, 64, 64, 40 + R() * 24); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); }
    const tex = new T.CanvasTexture(c);
    this.gasPts = new T.Points(g, new T.ShaderMaterial({ uniforms: { tex: { value: tex }, scale: { value: 800 } }, transparent: true, depthWrite: false,
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.); vC.a *= smoothstep(6., 28., -mv.z); gl_PointSize = min(size*scale/-mv.z, 700.); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D tex; varying vec4 vC; void main(){ vec4 t = texture2D(tex, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a*2.2); }` }));
    this.gasPts.frustumCulled = false; this.gasPts.renderOrder = 8; this.scene.add(this.gasPts);
  }
  private updateGas(F: Frame3) {
    const gs = F.gas; let n = 0;
    if (gs && gs.k > 0) {
      const R = rng(4242); const col = new T.Color('#bfeee0');
      // sheet over the lake surface
      const nl = Math.round(500 * (gs.lake ?? 0));
      for (let i = 0; i < nl && n < 2600; i++, n++) { const a = R() * 6.283, r = Math.sqrt(R()) * 96; const dr = gs.t * .6 * (R() - .3);
        this.gasPos.set([Math.cos(a) * (r + dr), WL + .5 + R() * 5, Math.sin(a) * (r + dr)], n * 3); this.gasCol.set([col.r, col.g, col.b, gs.k * (.5 + R() * .5)], n * 4); this.gasSiz[n] = 9 + R() * 12; }
      // the flow down the valley: particles strung along the valley floor up to the front
      const z0 = 92, zf = z0 + gs.front; const N = 2000;
      for (let i = 0; i < N && n < 2600; i++) {
        const u = R(), z = z0 + (zf - z0) * Math.pow(u, .85) + (R() - .5) * 3; if (z > 330) continue;
        const w = 13 + 55 * Math.min(1, Math.max(0, (z - 118) / 117)); const off = (R() - .5) * 2 * w * .75 * (.4 + .6 * R());
        const x = valleyX(z) + off + Math.sin(gs.t * .4 + i) * 1.5; const y = H(x, z) + .4 + R() * R() * 7;
        const edge = Math.min(1, (zf - z) / 18); this.gasPos.set([x, y, z + gs.t * .8 * R()], n * 3);
        this.gasCol.set([col.r, col.g, col.b, gs.k * edge * (.22 + R() * .3)], n * 4); this.gasSiz[n] = 5 + R() * 9; n++;
      }
    }
    const g = this.gasPts.geometry; g.setDrawRange(0, n); for (const a of ['position', 'color', 'size']) (g.getAttribute(a) as T.BufferAttribute).needsUpdate = true;
    (this.gasPts.material as T.ShaderMaterial).uniforms.scale.value = this.h / Math.tan(this.cam.fov * Math.PI / 360) * .5;
  }
  private updateBubbles(F: Frame3) {
    const b = F.bubbles; let n = 0;
    if (b && b.k > 0) {
      const R = rng(777); const count = Math.round(1500 * b.k);
      for (let i = 0; i < count; i++) {
        const a = R() * 6.283, r = Math.sqrt(R()) * 60 * (.4 + .6 * (b.rise ?? 1)), x = -6 + Math.cos(a) * r, z = 4 + Math.sin(a) * r * .8;
        const bottom = H(x, z) + .5, top = WL - .2, sp = 2.5 + R() * 5; const y = bottom + ((R() * 40 + b.t * sp) % (top - bottom));
        this.bubPos.set([x + Math.sin(b.t * 3 + i) * .3, y, z + Math.cos(b.t * 2.7 + i) * .3], n * 3); n++;
      }
    }
    this.bub.geometry.setDrawRange(0, n); (this.bub.geometry.getAttribute('position') as T.BufferAttribute).needsUpdate = true;
    (this.bub.material as T.ShaderMaterial).uniforms.scale.value = this.h / Math.tan(this.cam.fov * Math.PI / 360) * .5;
  }
  async render(F: Frame3, frame: number) {
    const t = F.t; const w = F.water ?? {};
    this.wU.time.value = t; this.wU.boil.value = w.boil ?? 0; this.wU.boilT.value = w.boilT ?? 0; this.wU.rust.value = w.rust ?? 0; this.wU.calm.value = w.calm ?? 1;
    const sd = new T.Vector3(...F.light.sun.dir).normalize(); this.wU.sunDir.value.copy(sd); this.wU.sunCol.value.set(F.light.sun.color).multiplyScalar(Math.min(1.5, F.light.sun.int / 2));
    this.wU.top.value.set(F.light.sky[0]); this.wU.bot.value.set(F.light.sky[1]); this.wU.fogC.value.set(F.light.fog[0]); this.wU.fogD.value = F.light.fog[1];
    const u = F.under ?? 0;
    this.co2.visible = (F.co2?.k ?? 0) > 0; this.co2U.k.value = F.co2?.k ?? 0; this.co2U.lift.value = F.co2?.lift ?? 0; this.co2U.time.value = t;
    this.caust.intensity = u * 900; this.caust.visible = u > 0; if (u > 0) { drawCaustics(this.ct.c, t); this.ct.t.needsUpdate = true; }
    this.shafts.forEach((s, i) => { s.visible = u > 0; const m = s.material as T.ShaderMaterial; m.uniforms.k.value = u; m.uniforms.time.value = t + i; });
    if (this.lanternMat) { const l = F.lantern ?? 0; this.lanternMat.emissiveIntensity = 6 * l; this.lanternLight.intensity = 2.2 * l * (1 + .08 * Math.sin(t * 23) + .05 * Math.sin(t * 37)); }
    const lo = this.objs.get('Lantern'); if (lo) { lo.getWorldPosition(this.lanternLight.position); this.lanternLight.position.y += .14; }
    this.sway(t, F.wind ?? 1); this.updateGas(F); this.updateBubbles(F);
    return super.render(F, frame);
  }
}
