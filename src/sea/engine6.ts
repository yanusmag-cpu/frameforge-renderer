// "Humans evolved underwater" engine: FrameForge 3D core + ocean rendering — sea surface seen from above and below (Snell's
// window), animated caustics on every lit surface, light shafts, depth-dependent darkness, glass architecture, swaying reef,
// vertex-shader swimming for sea life, fish schools, bubbles, marine snow and bioluminescence.
import * as T from 'three';
import { Engine, type Frame, type V3 } from '../brazil/engine.ts';
import { Sprites, softTex, rng, NOISE } from '../dino/engine5.ts';

export type Frame6 = Frame & {
  caust?: number;                       // caustic strength (fades with depth automatically)
  rays?: { k: number; at: V3; spread?: number; len?: number };
  snow?: number; plankton?: number;     // suspended particles (white) and bioluminescent specks
  bubbles?: { at: V3; t: number; n: number; rate?: number; spread?: number }[];
  schools?: { kind: 'FishYellow' | 'FishBlue' | 'FishOrange'; center: V3; n: number; r: number; t: number; speed?: number; dir?: number; seed?: number; scale?: number }[];
  current?: number;                     // reef sway strength
  surface?: { calm?: number };
};
export class Engine6 extends Engine {
  hgrid!: { x0: number; z0: number; step: number; nx: number; nz: number; h: number[][] };
  U = { time: { value: 0 }, caust: { value: 1 }, current: { value: .5 } };
  surfU!: Record<string, T.IUniform>; rays: T.Mesh[] = [];
  veg: { inst: T.InstancedMesh[] }[] = []; school = new Map<string, T.InstancedMesh[]>();
  snowS!: Sprites; glowS!: Sprites; bubS!: Sprites;
  H(x: number, z: number) {
    const g = this.hgrid; const fx = (x - g.x0) / g.step, fz = (z - g.z0) / g.step;
    const i = Math.max(0, Math.min(g.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(g.nz - 2, Math.floor(fz))); const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fz - j));
    const h = g.h; return (h[j][i] * (1 - u) + h[j][i + 1] * u) * (1 - v) + (h[j + 1][i] * (1 - u) + h[j + 1][i + 1] * u) * v;
  }
  async load6(base: string) {
    this.cam.far = 900; (this.sky.geometry as T.SphereGeometry).dispose(); this.sky.geometry = new T.SphereGeometry(800, 48, 24);
    await this.load(base);
    this.hgrid = await (await fetch(base + 'height.json')).json();
    this.scene.traverse(o => { const me = o as T.Mesh; if (!me.isMesh) return; const ms = (Array.isArray(me.material) ? me.material : [me.material]) as T.MeshStandardMaterial[]; ms.forEach(m => this.dress(m, me)); });
    this.buildSurface(); this.buildRays();
    this.snowS = new Sprites(this.scene, 2500, softTex('soft'), false, 8, .5); this.glowS = new Sprites(this.scene, 1500, softTex('soft'), true, 9); this.bubS = new Sprites(this.scene, 2500, this.bubbleTex(), false, 9);
    await this.buildVeg(base);
  }
  private bubbleTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 26, 0, 6.283); g.stroke(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fill(); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(22, 22, 7, 0, 6.283); g.fill(); return new T.CanvasTexture(c); }
  private dress(m: T.MeshStandardMaterial, me: T.Mesh) {
    if ((m as unknown as { _d?: boolean })._d) return; (m as unknown as { _d?: boolean })._d = true;
    const n = m.name; const vc = /coral|brain|sponge|anemone|kelp|rock|creature|whale|shell|palm_leaf/.test(n); m.vertexColors = vc; if (vc) m.color.set('#ffffff');
    if (/glass/.test(n)) { m.transparent = true; m.opacity = n === 'dome_glass' ? .22 : .2; m.depthWrite = false; m.roughness = .05; m.metalness = .3; m.envMapIntensity = 1.4; if (this.envTex) m.envMap = this.envTex; me.castShadow = false; me.renderOrder = 4; }
    if (/glow|neon|lamp|beacon|jelly/.test(n)) { me.castShadow = false; m.toneMapped = false; }
    if (n === 'jelly') { m.transparent = true; m.opacity = .7; m.depthWrite = false; me.renderOrder = 5; }
    if (n === 'bubble') { m.transparent = true; m.opacity = .4; }
    const sway = /kelp|anemone|fan|coral/.test(n) && n !== 'coral_hard';
    const U = this.U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nuniform float time, current; varying vec3 vW6;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          { vec4 o4 = modelMatrix * vec4(0., 0., 0., 1.);
            #ifdef USE_INSTANCING
            o4 = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
            #endif
            float ph = o4.x * .37 + o4.z * .23;
            ${sway ? `float hh = max(position.y, 0.); transformed.x += sin(time * 1.1 + ph + position.y * .9) * current * .12 * hh; transformed.z += cos(time * .9 + ph * 1.3 + position.y * .7) * current * .08 * hh;` : ''}
            ${n === 'creature' ? `float L = clamp(-position.z * 4. + .6, 0., 2.); transformed.x += sin(time * 11. + ph * 9. + position.z * 14.) * .035 * L * L;
              float wing = abs(position.x); if (wing > .45) transformed.y += sin(time * 2.4 + ph) * (wing - .45) * .5;` : ''}
            ${n === 'whale' ? `float Lw = clamp((-position.z + 1.) / 7., 0., 1.4); transformed.y += sin(time * 1.1 + ph - position.z * .25) * .55 * Lw * Lw; if (abs(position.x) > 1.4) transformed.y += sin(time * .9 + ph) * (abs(position.x) - 1.4) * .22;` : ''}
            ${n === 'shell' ? `if (abs(position.x) > .38) transformed.y += sin(time * 2.2 + ph + sign(position.x) * .4) * (abs(position.x) - .38) * .7;` : ''}
            ${n === 'jelly' ? `float pulse = .5 + .5 * sin(time * 2.6 + ph); if (position.y > -.05) { transformed.xz *= 1. - .22 * pulse; transformed.y *= 1. + .25 * pulse; } else { transformed.x += sin(time * 1.7 + position.y * 3. + ph) * .08 * -position.y; transformed.z += cos(time * 1.3 + position.y * 2.5 + ph) * .06 * -position.y; }` : ''}
          }`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vW6 = (modelMatrix * vec4(transformed, 1.)).xyz;
          #ifdef USE_INSTANCING
          vW6 = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
          #endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float time, caust; varying vec3 vW6; ${NOISE}
          float cst(vec2 p){ vec2 q = p * .55; float a = 0.;
            for (int i = 0; i < 3; i++) { vec2 r = q + vec2(sin(time * .6 + float(i) * 2.1 + q.y * .7), cos(time * .5 + float(i) * 1.7 + q.x * .6)) * .6; a += pow(1. - abs(sin(r.x * 2.1 + sin(r.y * 1.9 + time * .8))), 6.) * pow(1. - abs(sin(r.y * 2.3 + sin(r.x * 1.7 - time * .7))), 6.); q *= 1.3; }
            return a; }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${n === 'seabed' ? `{ vec2 q = vW6.xz; float n1 = fbm(q * .08), n2 = fbm(q * .9), rip = sin(q.x * 2.2 + sin(q.y * .6) * 2. + n2 * 3.) * .5 + .5;
             vec3 sand = mix(vec3(.62,.56,.42), vec3(.8,.73,.56), n1) * (.88 + .12 * rip) * (.9 + .2 * n2);
             vec3 deep = mix(vec3(.28,.3,.32), vec3(.4,.4,.38), n2); sand = mix(sand, deep, smoothstep(-40., -90., vW6.y) * 0. + (1. - smoothstep(-90., -40., vW6.y)));
             vec3 dry = mix(vec3(.9,.82,.62), vec3(.98,.9,.72), n2); sand = mix(sand, dry, smoothstep(.2, .9, vW6.y));
             vec3 wet = vec3(.62,.54,.38); sand = mix(sand, wet, smoothstep(-.5, .1, vW6.y) * (1. - smoothstep(.2, .9, vW6.y)));
             diffuseColor.rgb = sand; }` : ''}
          ${/coral|brain|sponge|anemone/.test(n) ? 'diffuseColor.rgb *= .78 + .35 * vn(vW6.xz * 9. + vW6.y * 7.);' : ''}
          ${n === 'brain' ? 'diffuseColor.rgb *= .75 + .4 * abs(sin(vW6.x * 22. + sin(vW6.z * 19.) * 2.5));' : ''}
          ${n === 'rock' ? 'diffuseColor.rgb *= .7 + .45 * fbm(vW6.xz * 1.3 + vW6.y);' : ''}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          if (vW6.y < .2) { float depthK = exp(vW6.y / 22.); totalEmissiveRadiance += diffuseColor.rgb * cst(vW6.xz) * caust * depthK * .9; }`);
    };
    m.customProgramCacheKey = () => 's6' + n;
  }
  private buildSurface() {
    this.surfU = { time: { value: 0 }, sunDir: { value: new T.Vector3(0, 1, 0) }, top: { value: new T.Color() }, bot: { value: new T.Color() }, deep: { value: new T.Color('#0a4a5a') }, calm: { value: 1 }, fogC: { value: new T.Color() }, fogD: { value: 0 } };
    const g = new T.PlaneGeometry(1600, 1600, 1, 1); g.rotateX(-Math.PI / 2);
    const m = new T.ShaderMaterial({ uniforms: this.surfU, transparent: true, side: T.DoubleSide, depthWrite: false,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform vec3 sunDir, top, bot, deep, fogC; uniform float time, calm, fogD; varying vec3 vW; ${NOISE}
        void main(){ vec3 V = normalize(cameraPosition - vW); vec2 p = vW.xz * .18;
          vec2 d = vec2(fbm(p + time * .25) - fbm(p - time * .2 + 4.1), fbm(p * 1.4 + time * .3 + 7.) - fbm(p * 1.3 - time * .27 + 2.)) * (2. - calm);
          vec3 N = normalize(vec3(d.x * .9, 1., d.y * .9)); float dist = length(cameraPosition - vW);
          if (cameraPosition.y < vW.y) {   // seen from below: Snell's window and total internal reflection
            vec3 Vu = -V; float c = Vu.y; float win = smoothstep(.62, .7, c + (d.x + d.y) * .08);
            vec3 sky = mix(bot, top, .6) * 1.25 + vec3(1., .95, .85) * pow(max(dot(normalize(Vu + vec3(d.x, 0., d.y) * .4), normalize(sunDir)), 0.), 60.) * 3.;
            vec3 col = mix(deep * (.7 + .5 * fbm(p * 3. + time * .3)), sky, win); col += vec3(.7,.9,.95) * smoothstep(.55, .62, c) * (1. - win) * .4;
            col = mix(col, fogC, 1. - exp(-fogD * fogD * dist * dist * .5)); gl_FragColor = vec4(col, .97); return; }
          float F = .02 + .98 * pow(1. - max(dot(V, N), 0.), 5.); vec3 R = reflect(-V, N);
          vec3 sky = mix(bot, top, pow(clamp(R.y, 0., 1.), .5)); vec3 body = mix(vec3(.02,.24,.3), vec3(.08,.5,.55), fbm(vW.xz * .05)) ;
          vec3 col = mix(body, sky, F * .75) + vec3(1., .95, .85) * pow(max(dot(R, normalize(sunDir)), 0.), 220.) * 3.;
          col += vec3(.9) * smoothstep(.78, .92, fbm(vW.xz * .4 + time * .2)) * .08;
          gl_FragColor = vec4(col, .9); }` });
    const me = new T.Mesh(g, m); me.renderOrder = 3; me.frustumCulled = false; this.scene.add(me);
  }
  private buildRays() {
    const m = new T.ShaderMaterial({ uniforms: { k: { value: 0 }, time: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: `uniform float k, time; varying vec2 vU; varying float vD;
        void main(){ float a = (1. - smoothstep(.0, 1., 1. - vU.y)) * vU.y * (1. - smoothstep(.15, .5, abs(vU.x - .5))); a *= .6 + .4 * sin(time * .5 + vU.x * 6.);
          a *= smoothstep(2., 10., vD); gl_FragColor = vec4(vec3(.6,.95,1.) * a * k * .28, 1.); }` });
    for (let i = 0; i < 14; i++) { const me = new T.Mesh(new T.PlaneGeometry(1, 1), m.clone()); me.visible = false; me.renderOrder = 6; me.frustumCulled = false; this.scene.add(me); this.rays.push(me); }
  }
  private async buildVeg(base: string) {
    const data = await (await fetch(base + 'veg.json')).json() as Record<string, number[][]>;
    for (const [k, list] of Object.entries(data)) {
      const src = this.props.get(k); if (!src || !list.length) continue; const inst = this.instance(src, list.length);
      list.forEach(([x, y, z, s, r], i) => { const m = new T.Matrix4().compose(new T.Vector3(x, y - .05, z), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(s, s, s)); inst.forEach(im => im.setMatrixAt(i, m)); });
      this.veg.push({ inst });
    }
    for (const k of ['FishYellow', 'FishBlue', 'FishOrange']) { const src = this.props.get(k); if (src) this.school.set(k, this.instance(src, 400)); }
  }
  private instance(src: T.Object3D, n: number) {
    const meshes: T.Mesh[] = []; src.updateMatrixWorld(true); src.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
    return meshes.map(m => { const g = m.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(src.matrixWorld).invert().multiply(m.matrixWorld));
      const im = new T.InstancedMesh(g, m.material, n); im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; this.scene.add(im); return im; });
  }
  private schools(F: Frame6) {
    const used = new Map<string, number>(); const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    for (const s of F.schools ?? []) {
      const ims = this.school.get(s.kind); if (!ims) continue; let i0 = used.get(s.kind) ?? 0; const R = rng(77 + (s.seed ?? 0) * 13);
      for (let i = 0; i < s.n && i0 < 400; i++, i0++) {
        const a0 = R() * 6.283, rr = s.r * (.5 + R() * .5), hy = (R() - .5) * s.r * .5, sp = (s.speed ?? .35) * (.85 + R() * .3) * (s.dir ?? 1);
        const a = a0 + s.t * sp; const wob = Math.sin(s.t * 1.3 + i) * .3;
        const p = new T.Vector3(s.center[0] + Math.cos(a) * rr, s.center[1] + hy + Math.sin(a * 2 + i) * .4, s.center[2] + Math.sin(a) * rr * .8);
        const tx = -Math.sin(a) * rr * sp, tz = Math.cos(a) * rr * .8 * sp; e.set(0, Math.atan2(tx, tz) + wob * .3, 0); q.setFromEuler(e);
        const sc = (s.scale ?? 1) * (.8 + R() * .5); m.compose(p, q, new T.Vector3(sc, sc, sc)); ims.forEach(im => im.setMatrixAt(i0, m));
      }
      used.set(s.kind, i0);
    }
    for (const [k, ims] of this.school) { const n = used.get(k) ?? 0; ims.forEach(im => { im.count = n; im.instanceMatrix.needsUpdate = true; }); }
  }
  private particles(F: Frame6) {
    const t = F.t; const cp = this.cam.position; const c = new T.Color(); this.snowS.reset(); this.glowS.reset(); this.bubS.reset();
    if (F.snow && cp.y < 0) { const R = rng(3); c.setRGB(.85, .92, .9);
      for (let i = 0; i < 1400 * F.snow; i++) { const x = cp.x + ((R() * 30 + t * .2) % 30) - 15, z = cp.z + (R() * 30) - 15, y = cp.y + ((R() * 20 - t * .15) % 20 + 20) % 20 - 10; this.snowS.add(x + Math.sin(t * .5 + i) * .2, Math.min(y, -.2), z, c, .35 * F.snow, .025 + R() * .03); } }
    if (F.plankton) { const R = rng(8); for (let i = 0; i < 700 * F.plankton; i++) { c.setHSL(.52 + R() * .2, .9, .6); const x = cp.x + (R() - .5) * 40, z = cp.z + (R() - .5) * 40, y = cp.y + (R() - .5) * 24; this.glowS.add(x, y, z, c, F.plankton * (.4 + .6 * Math.sin(t * 2 + i)), .05 + R() * .05); } }
    for (const b of F.bubbles ?? []) {
      const R = rng(19 + Math.round(b.at[0] * 7)); c.setRGB(.95, 1, 1);
      for (let i = 0; i < b.n; i++) { const birth = R() * 3; const age = ((b.t * (b.rate ?? 1) - birth) % 3 + 3) % 3; const sp = 1 + R() * 1.5; const y = b.at[1] + age * sp + age * age * .3; if (y > -.05) continue;
        const sw = Math.sin(age * 6 + i) * .08 * age; this.bubS.add(b.at[0] + (R() - .5) * (b.spread ?? .3) + sw, y, b.at[2] + (R() - .5) * (b.spread ?? .3) + sw * .5, c, .8 * Math.min(1, age * 4), .03 + R() * .06 + age * .01); }
    }
    const fog = this.scene.fog as T.FogExp2 | null; for (const s of [this.snowS, this.glowS, this.bubS]) s.commit(this.h / Math.tan(this.cam.fov * Math.PI / 360), fog);
  }
  async render(F: Frame6, frame: number) {
    const t = F.t; this.U.time.value = t; this.U.caust.value = F.caust ?? 1; this.U.current.value = F.current ?? .5;
    const L = F.light; const su = this.surfU; su.time.value = t; su.sunDir.value.set(...L.sun.dir).normalize(); su.top.value.set(L.sky[0]); su.bot.value.set(L.sky[1]); su.fogC.value.set(L.fog[0]); su.fogD.value = L.fog[1]; su.calm.value = F.surface?.calm ?? 1;
    const Ry = F.rays; const sd = new T.Vector3(...L.sun.dir).normalize();
    this.rays.forEach((r, i) => {
      if (!Ry || Ry.k <= 0) { r.visible = false; return; } r.visible = true; const R = rng(41 + i * 5); const sp = Ry.spread ?? 16;
      const top = new T.Vector3(Ry.at[0] + (R() - .5) * sp, -.1, Ry.at[2] + (R() - .5) * sp); const len = Ry.len ?? 30; const dn = sd.clone().negate().setY(-1).normalize();
      const center = top.clone().addScaledVector(dn, len * .5); const toCam = this.cam.position.clone().sub(center); const side = dn.clone().cross(toCam).normalize(); const nn = side.clone().cross(dn).normalize();
      const m = new T.Matrix4().makeBasis(side.multiplyScalar(1.5 + R() * 3), dn.clone().negate().multiplyScalar(len), nn); m.setPosition(center); r.matrixAutoUpdate = false; r.matrix.copy(m); r.matrixWorldNeedsUpdate = true;
      const u = (r.material as T.ShaderMaterial).uniforms; u.k.value = Ry.k * (.5 + R() * .7); u.time.value = t + i * 3;
    });
    this.schools(F); F.show = { Submersible: false, ...(F.show ?? {}) };
    this.cam.position.set(...F.cam.pos); this.cam.fov = F.cam.fov; this.cam.updateProjectionMatrix(); this.particles(F);
    if (F.cam.pos[1] < -.05) {   // underwater: the 'sky' dome is just the water column — lighter toward the surface, dark below
      const f = new T.Color(L.fog[0]); const up = f.clone().lerp(new T.Color('#9fe8f0'), Math.max(0, .45 + F.cam.pos[1] / 60)); F = { ...F, light: { ...L, sky: ['#' + up.getHexString(), '#' + f.getHexString()], sunGlow: 0 } };
    }
    await super.render(F, frame);
  }
}
