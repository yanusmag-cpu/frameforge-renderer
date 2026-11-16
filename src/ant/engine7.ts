// "Size of an ant" engine: FrameForge 3D core at ×350 scale (5 mm person = 1.75 units): carpet fibres that bend under impacts and
// suction, procedural rug / floorboard / upholstery weaves, a real refractive water droplet, sunbeam dust, the falling shoe's
// shock dust, the vacuum's airflow (debris and dust dragged into the brush roll) and procedurally posed ant + spider rigs.
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Engine, type Frame, type V3 } from '../brazil/engine.ts';
import { Creature, type CreatureState, type Kind } from '../dino/creatures.ts';
import { Sprites, softTex, rng, NOISE } from '../dino/engine5.ts';

export type Frame7 = Frame & {
  bugs?: CreatureState[];
  rays?: { k: number; at: V3; spread?: number; len?: number };
  motes?: number;                                            // floating dust in the sunbeam around the camera
  stomp?: { at: V3; t: number; k?: number };                // shoe impact: radial fibre flattening + dust ring
  suck?: { at: V3; k: number; t: number; dir?: V3 };        // vacuum mouth position, strength, time (airflow + debris)
  brush?: number;                                             // brush-roll spin phase
  shake?: number;
};
function hairTex() { const c = document.createElement('canvas'); c.width = 16; c.height = 128; const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.2)'); g.fillStyle = gr; g.beginPath(); g.moveTo(5, 0); g.lineTo(11, 0); g.lineTo(8.5, 128); g.lineTo(7.5, 128); g.fill(); return new T.CanvasTexture(c); }

export class Engine7 extends Engine {
  U = { time: { value: 0 }, stompP: { value: new T.Vector3(0, -999, 0) }, stompT: { value: 99 }, suckP: { value: new T.Vector3(0, -999, 0) }, suckK: { value: 0 }, brush: { value: 0 } };
  src = new Map<Kind, T.Object3D>(); bugs = new Map<string, Creature>();
  dustS!: Sprites; moteS!: Sprites; streakS!: Sprites; rays: T.Mesh[] = []; bits!: T.InstancedMesh;
  async load7(base: string) {
    this.cam.near = .02; this.cam.far = 4000; (this.sky.geometry as T.SphereGeometry).dispose(); this.sky.geometry = new T.SphereGeometry(3500, 32, 16);
    await this.load(base);
    this.scene.traverse(o => { const me = o as T.Mesh; if (!me.isMesh) return; if ((me.material as T.Material).name === 'carpet_floor') me.position.y -= .598; (Array.isArray(me.material) ? me.material : [me.material]).forEach(m => this.dress(m as T.MeshStandardMaterial, me)); });
    const data = await (await fetch(base + 'tufts.json')).json() as Record<string, number[][]>;
    for (const [k, list] of Object.entries(data)) {
      const src = this.props.get(k); if (!src) continue; const meshes: T.Mesh[] = []; src.updateMatrixWorld(true); src.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
      meshes.forEach(m => { const g = m.geometry.clone(); g.applyMatrix4(new T.Matrix4().copy(src.matrixWorld).invert().multiply(m.matrixWorld)); const im = new T.InstancedMesh(g, m.material, list.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
        list.forEach(([x, y, z, s, r], i) => im.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, r, 0)), new T.Vector3(s, s * (.85 + (i % 7) * .05), s)))); this.scene.add(im); });
    }
    const g = await new GLTFLoader().loadAsync(base + 'bugs.glb'); const ht = hairTex();
    g.scene.traverse(o => { if (o.name.startsWith('DINO_')) this.src.set(o.name.slice(5) as Kind, o); const me = o as T.Mesh; if (!me.isMesh) return;
      (Array.isArray(me.material) ? me.material : [me.material]).forEach(m0 => { const m = m0 as T.MeshStandardMaterial; m.vertexColors = /bug|spider/.test(m.name); if (m.vertexColors) m.color.set('#fff');
        if (m.name === 'bug_shell') { m.roughness = .22; m.metalness = .15; if (this.envTex) { m.envMap = this.envTex; m.envMapIntensity = 1.2; } }
        if (m.name === 'bug_hair') { m.map = ht; m.alphaTest = .35; m.side = T.DoubleSide; }
        if (m.name === 'spider' || m.name === 'bug_hair') m.color.set('#6e5a48');
        if (/eye/.test(m.name)) { m.roughness = .02; m.metalness = .4; if (this.envTex) m.envMap = this.envTex; } }); });
    for (const [, o] of this.src) o.removeFromParent();
    this.dustS = new Sprites(this.scene, 3000, softTex('smoke'), false, 7, .6); this.moteS = new Sprites(this.scene, 1500, softTex('soft'), true, 8, .3); this.streakS = new Sprites(this.scene, 1500, softTex('drop'), true, 8, .3);
    this.bits = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshStandardMaterial({ color: '#e0c08a', roughness: .9, flatShading: true }), 300); this.bits.frustumCulled = false; this.bits.castShadow = true; this.scene.add(this.bits);
    const rm = new T.ShaderMaterial({ uniforms: { k: { value: 0 }, time: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix*mv; }',
      fragmentShader: 'uniform float k, time; varying vec2 vU; varying float vD; void main(){ float a = smoothstep(0., .2, vU.y) * (1. - smoothstep(.7, 1., vU.y)) * (1. - smoothstep(.1, .5, abs(vU.x - .5))); a *= .7 + .3 * sin(time * .4 + vU.x * 5.); a *= smoothstep(2., 20., vD); gl_FragColor = vec4(vec3(1., .86, .6) * a * k * .14, 1.); }' });
    for (let i = 0; i < 12; i++) { const me = new T.Mesh(new T.PlaneGeometry(1, 1), rm.clone()); me.visible = false; me.renderOrder = 6; me.frustumCulled = false; this.scene.add(me); this.rays.push(me); }
  }
  private dress(m: T.MeshStandardMaterial, me: T.Mesh) {
    if ((m as unknown as { _d?: boolean })._d) return; (m as unknown as { _d?: boolean })._d = true; const n = m.name;
    m.vertexColors = /fiber|crumb/.test(n); if (m.vertexColors) m.color.set('#fff');
    if (/light|lamp_shade/.test(n)) { m.toneMapped = false; me.castShadow = false; }
    if (n === 'hall_light') { m.toneMapped = true; m.emissiveIntensity = 1.15; m.emissive.set('#ffc98a'); }   // warm hallway glow that still reads as a doorway
    if (n === 'droplet') {   // water droplet: fresnel-weighted transparency, room reflections, a sharp window highlight and caustic core
      const p = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { sun: { value: new T.Vector3(-.12, .5, -.86).normalize() } },
        vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: `uniform vec3 sun; varying vec3 vN; varying vec3 vW;
          void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); float F = .04 + .96 * pow(1. - max(dot(V, N), 0.), 4.);
            vec3 R = reflect(-V, N); vec3 env = mix(vec3(.55,.45,.35), vec3(1.,.95,.85), smoothstep(-.2, .6, R.y));
            float spec = pow(max(dot(R, sun), 0.), 400.) * 6. + pow(max(dot(R, normalize(sun + vec3(.3, 0., .2))), 0.), 120.) * 1.2;
            float core = pow(max(dot(V, N), 0.), 3.) * .35; vec3 col = env * F + vec3(1., .97, .9) * spec + vec3(.85, .95, 1.) * core;
            gl_FragColor = vec4(col + vec3(.12,.14,.16), clamp(.28 + F * .7 + spec + core, 0., 1.)); }` });
      p.name = 'droplet_fake'; me.material = p; me.castShadow = false; me.renderOrder = 5; return;
    }
    const U = this.U; const fiber = n === 'fiber';
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float time, stompT, suckK; uniform vec3 stompP, suckP; varying vec3 vW7; varying vec3 vO7;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vO7 = position;
          ${fiber ? `{ vec4 o4 = modelMatrix * vec4(0., 0., 0., 1.);
            #ifdef USE_INSTANCING
            o4 = modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.);
            #endif
            float hh = max(position.y, 0.) / 3.;
            vec2 d = o4.xz - stompP.xz; float r = length(d); float wave = stompT > 0. && stompT < 3. ? exp(-pow(r - stompT * 38., 2.) / 60.) * exp(-stompT * .9) : 0.;
            float flat_ = stompT > 0. ? (1. - smoothstep(10., 26., r)) * min(1., stompT * 6.) * exp(-stompT * .25) : 0.;
            vec2 away = r > .01 ? d / r : vec2(1., 0.); transformed.xz += away * (wave * 1.6 + flat_ * 1.1) * hh * hh; transformed.y -= (wave * .3 + flat_ * .45) * position.y;
            vec2 ds = suckP.xz - o4.xz; float rs = length(ds); float pull = suckK * (1. - smoothstep(6., 45., rs)); transformed.xz += (rs > .01 ? ds / rs : vec2(0.)) * pull * 1.3 * hh * hh * (1. + .25 * sin(time * 23. + o4.x));
            transformed.x += sin(time * .8 + o4.x * .3 + o4.z * .2) * .05 * hh; }` : ''}`)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vW7 = (modelMatrix * vec4(transformed, 1.)).xyz;
          #ifdef USE_INSTANCING
          vW7 = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;
          #endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float time, brush; varying vec3 vW7; varying vec3 vO7; ${NOISE}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          ${n === 'carpet_floor' ? `{ vec2 q = vW7.xz; float loops = vn(q * 2.4) * .6 + vn(q * 6.1) * .4; float tuft = smoothstep(.35, .75, vn(q * .9 + vn(q * 3.) * .6));
             diffuseColor.rgb = mix(vec3(.55,.48,.38), vec3(.86,.79,.67), loops * .7 + tuft * .3) * (.85 + .2 * fbm(q * .05)); }` : ''}
          ${n === 'wood_floor' ? `{ vec2 q = vW7.xz; float plank = floor(q.x / 52.); float off = h21(vec2(plank, 3.)) * 400.; float seg = floor((q.y + off) / 420.);
             float grain = fbm(vec2(q.x * .6 + plank * 9., (q.y + off) * .015)) ; vec3 c = mix(vec3(.5,.32,.18), vec3(.7,.5,.32), grain) * (.88 + .2 * h21(vec2(plank, seg)));
             float gap = min(fract(q.x / 52.) * 52., (1. - fract(q.x / 52.)) * 52.); c *= .35 + .65 * smoothstep(0., .8, gap); float gap2 = min(fract((q.y + off) / 420.) * 420., (1. - fract((q.y + off) / 420.)) * 420.); c *= .4 + .6 * smoothstep(0., .8, gap2);
             diffuseColor.rgb = c; }` : ''}
          ${n === 'fabric_sofa' || n === 'cushion' ? `{ vec3 q = vW7; float wx = sin(q.x * 9.) * .5 + .5, wy = sin((q.y + q.z) * 9.) * .5 + .5; float weave = mix(wx, wy, step(.5, fract((q.x + q.y + q.z) * .7)));
             diffuseColor.rgb *= .75 + .3 * weave + .1 * vn(q.xz * .3 + q.y * .3); }` : ''}
          ${n === 'crumb' ? 'diffuseColor.rgb *= .7 + .5 * vn(vO7.xz * 8. + vO7.y * 7.) - .35 * smoothstep(.65, .85, vn(vO7.xy * 13. + vO7.z * 9.));' : ''}
          ${n === 'dust' ? 'diffuseColor.rgb *= .8 + .3 * vn(vO7.xz * 4. + vO7.y * 4.);' : ''}
          ${n === 'shoe_sole' ? 'diffuseColor.rgb *= .85 + .15 * vn(vO7.xz * 1.5);' : ''}
          ${n === 'vac_red' ? 'diffuseColor.rgb *= .75 + .35 * step(.5, fract(atan(vO7.y - 7., vO7.x + 17.) * 3.8 + brush));' : ''}
          ${fiber ? 'diffuseColor.rgb *= .8 + .35 * smoothstep(0., 3.5, vO7.y);' : ''}`);
    };
    m.customProgramCacheKey = () => 'a7' + n;
  }
  async render(F: Frame7, frame: number) {
    const t = F.t; this.U.time.value = t; this.U.brush.value = F.brush ?? 0;
    if (F.stomp) { this.U.stompP.value.set(...F.stomp.at); this.U.stompT.value = F.stomp.t; } else { this.U.stompP.value.set(0, -999, 0); this.U.stompT.value = 99; }
    if (F.suck) { this.U.suckP.value.set(...F.suck.at); this.U.suckK.value = F.suck.k; } else this.U.suckK.value = 0;
    const seen = new Set<string>();
    for (const s of F.bugs ?? []) { let c = this.bugs.get(s.id); if (!c) { const src = this.src.get(s.kind); if (!src) continue; c = new Creature(src, s.kind, this.scene); this.bugs.set(s.id, c); } c.pose(s); seen.add(s.id); }
    for (const [k, c] of this.bugs) if (!seen.has(k)) c.setVisible(false);
    // sun rays through the window: long planes along the sun direction
    const L = F.light; const sd = new T.Vector3(...L.sun.dir).normalize(); const Ry = F.rays;
    this.rays.forEach((r, i) => { if (!Ry || Ry.k <= 0) { r.visible = false; return; } r.visible = true; const R = rng(51 + i * 3); const sp = Ry.spread ?? 60;
      const p = new T.Vector3(Ry.at[0] + (R() - .5) * sp, Ry.at[1], Ry.at[2] + (R() - .5) * sp); const len = Ry.len ?? 400; const c = p.clone().addScaledVector(sd, len * .5);
      const toCam = this.cam.position.clone().sub(c); const side = sd.clone().cross(toCam).normalize(); const nn = side.clone().cross(sd).normalize();
      const m = new T.Matrix4().makeBasis(side.multiplyScalar(6 + R() * 18), sd.clone().multiplyScalar(len), nn); m.setPosition(c); r.matrixAutoUpdate = false; r.matrix.copy(m); r.matrixWorldNeedsUpdate = true;
      const u = (r.material as T.ShaderMaterial).uniforms; u.k.value = Ry.k * (.5 + R() * .7); u.time.value = t + i; });
    this.cam.position.set(...F.cam.pos); this.cam.fov = F.cam.fov; this.cam.updateProjectionMatrix();
    this.particles(F);
    await super.render(F, frame);
  }
  private particles(F: Frame7) {
    const t = F.t; const cp = this.cam.position; const c = new T.Color(); this.dustS.reset(); this.moteS.reset(); this.streakS.reset(); let di = 0; const M = new T.Matrix4(), q = new T.Quaternion();
    if (F.motes) { const R = rng(4); c.setRGB(1, .93, .8); for (let i = 0; i < 700 * F.motes; i++) { const x = cp.x + (R() - .5) * 30, z = cp.z + (R() - .5) * 30, y = Math.max(.3, cp.y + (R() - .5) * 16 + Math.sin(t * .3 + i) * .6); this.moteS.add(x + Math.sin(t * .2 + i * 1.3) * .8, y, z, c, F.motes * (.25 + .25 * Math.sin(t * 1.3 + i)), .04 + R() * .08); } }
    const st = F.stomp;
    if (st && st.t > 0 && st.t < 4) {   // dust ring blasting out from under the sole
      const R = rng(12); c.setRGB(.84, .78, .68); const k = st.k ?? 1;
      for (let i = 0; i < 900; i++) { const a = R() * 6.283, sp = 16 + R() * 40, tt = st.t; const r = 22 + sp * (1 - Math.exp(-tt * 1.8)); const y = .4 + R() * R() * 14 * (1 - Math.exp(-tt * 2)) + tt * R() * 3;
        this.dustS.add(st.at[0] + Math.cos(a) * r, y, st.at[2] + Math.sin(a) * r, c, k * .28 * Math.min(1, tt * 8) * Math.exp(-tt * .7), 3 + R() * 6 + tt * 2, R() * 6); }
      for (let i = 0; i < 80 && di < 300; i++, di++) { const a = R() * 6.283, sp = 10 + R() * 25, up = 6 + R() * 10, tt = st.t; const y = Math.max(.3, up * tt - 4.9 * tt * tt * 1.5);
        M.compose(new T.Vector3(st.at[0] + Math.cos(a) * (22 + sp * tt), y, st.at[2] + Math.sin(a) * (22 + sp * tt)), q.setFromEuler(new T.Euler(tt * 5 + i, i, 0)), new T.Vector3(.2 + R() * .4, .2 + R() * .4, .2 + R() * .4)); this.bits.setMatrixAt(di, M); }
    }
    const sk = F.suck;
    if (sk && sk.k > 0) {   // airflow: dust + debris streaming into the brush roll
      const R = rng(31); const mouth = new T.Vector3(...sk.at);
      for (let i = 0; i < 700; i++) { const life = (R() + sk.t * (.8 + R() * .8)) % 1; const a = (R() - .5) * 2.4, r0 = 18 + R() * 50; const r = r0 * (1 - life) ** 1.6;
        const x = mouth.x + Math.cos(a) * r, z = mouth.z + Math.sin(a) * r * 1.3, y = .4 + R() * 6 * (1 - life) + life * R() * 4;
        c.setRGB(.86, .8, .7); this.dustS.add(x, y, z, c, sk.k * .2 * Math.sin(Math.PI * life), 1 + R() * 3, R() * 6);
        if (i % 2 === 0) { c.setRGB(1, .96, .9); this.streakS.add(x, y, z, c, sk.k * .5 * Math.sin(Math.PI * life), .6 + R() * 1.5, Math.atan2(mouth.x - x, mouth.z - z)); } }
      for (let i = 0; i < 110 && di < 300; i++, di++) { const life = (R() + sk.t * (.5 + R() * .5)) % 1; const a = (R() - .5) * 2.0, r0 = 12 + R() * 40; const r = r0 * (1 - life) ** 2;
        const p = new T.Vector3(mouth.x + Math.cos(a) * r, .4 + life * life * 6 + R() * .6, mouth.z + Math.sin(a) * r * 1.2); const s = .15 + R() * .5;
        M.compose(p, q.setFromEuler(new T.Euler(sk.t * 9 + i, sk.t * 7, i)), new T.Vector3(s, s * .8, s)); this.bits.setMatrixAt(di, M); }
    }
    this.bits.count = di; this.bits.instanceMatrix.needsUpdate = true;
    const fog = this.scene.fog as T.FogExp2 | null; for (const s of [this.dustS, this.moteS, this.streakS]) s.commit(this.h / Math.tan(this.cam.fov * Math.PI / 360), fog);
  }
}
