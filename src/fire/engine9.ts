// YunoWorld fire test engine: FrameForge 3D engine + instanced forest (Blender templates), burn-aware ground & vegetation shaders,
// procedural flame sprites, GPU-animated smoke / embers / ash (deterministic per frame), firelight.
import * as T from 'three';
import { Engine, type Frame } from '../brazil/engine.ts';
import { GLSL, H, state, tig, tMeet, zW, LINE } from './fronts.ts';

export type Frame9 = Frame & { fireT: number; torch?: T.Vector3 | null; smokeK?: number; embersK?: number; godrays?: number; hideTrees?: [number, number, number, number] };

const rnd = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; };

function floorTex() {   // 4 m tile: needle litter, leaves, twigs, moss patches
  const [c, g] = C(1024, 1024), R = rnd(5); g.fillStyle = '#5c4a32'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { const x = R() * 1024, y = R() * 1024, r = 30 + R() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); const moss = R() > .6; gr.addColorStop(0, moss ? 'rgba(92,110,48,.55)' : 'rgba(110,84,52,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 9000; i++) {   // needles
    const x = R() * 1024, y = R() * 1024, a = R() * Math.PI, l = 8 + R() * 14, v = R();
    g.strokeStyle = v > .7 ? '#a07a48' : v > .35 ? '#7a5a36' : '#4a3a26'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 700; i++) {   // dry leaves
    const x = R() * 1024, y = R() * 1024, a = R() * 6.28; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = ['#a8642a', '#c08a3a', '#8a4a22', '#b07a30'][Math.floor(R() * 4)]; g.beginPath(); g.ellipse(0, 0, 9 + R() * 6, 4 + R() * 3, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(60,30,10,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore();
  }
  for (let i = 0; i < 120; i++) { const x = R() * 1024, y = R() * 1024, a = R() * 6.28; g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); g.stroke(); }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function smokeTex() {
  const [c, g] = C(256, 256), R = rnd(9);
  for (let i = 0; i < 40; i++) { const x = 128 + (R() - .5) * 110, y = 128 + (R() - .5) * 110, r = 40 + R() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const t = new T.CanvasTexture(c); return t;
}

const NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*vn(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
`;

type Inst = { x: number; z: number; s: number; r: number; tint: number };
export class Engine9 extends Engine {
  uT = { value: 0 }; flames!: T.InstancedMesh; smoke!: T.InstancedMesh; embers!: T.InstancedMesh; vegGroups: T.InstancedMesh[] = [];
  fireLights: T.PointLight[] = []; torchLight!: T.PointLight; rays: T.Mesh[] = [];
  async load9(base: string) {
    this.cam.near = .05; this.cam.far = 4000; this.sun.shadow.mapSize.set(4096, 4096);
    await this.load(base);
    for (const [k, o] of [...this.objs]) if (o.parent && o.parent.name.startsWith('KEEP_')) { this.objs.delete(k); this.props.delete(k); o.visible = true; }
    const uT = this.uT;
    // ---- ground ---------------------------------------------------------------------------------------------------
    const ftex = floorTex();
    this.scene.traverse(o => {
      const me = o as T.Mesh; if (!me.isMesh) return; const m = me.material as T.MeshStandardMaterial;
      if (m.name === 'forest_floor') {
        m.map = ftex; ftex.repeat.set(.25, .25); m.color.set('#ffffff'); m.roughness = .95; me.receiveShadow = true;
        m.onBeforeCompile = sh => {
          sh.uniforms.uT = uT;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix*vec4(transformed,1.)).xyz;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uT; varying vec3 vW;\n${NOISE}\n${GLSL}`)
            .replace('#include <map_fragment>', `#include <map_fragment>
              { float n = fbm(vW.xz*.35), n2 = fbm(vW.xz*2.1); float fw = length(fwidth(vW.xz)); float hf = 1. - smoothstep(.03, .12, fw);   // fade fine detail with distance (no moiré)
                // prepared control line: raked mineral soil
                float line = 1. - smoothstep(1.55, 2.1 + n*.6, abs(vW.z));
                vec3 soil = mix(vec3(.42,.32,.22), vec3(.52,.4,.28), n2) * (.93 + .07*hf*sin(vW.x*9. + n*4.));
                diffuseColor.rgb = mix(diffuseColor.rgb, soil, line);
                float kind; float age = fBurnAge(vW.x, vW.z + (n-.5)*1.4, uT, kind);
                if (age >= 0.) { float a = smoothstep(0., 1.6, age);
                  vec3 ch = mix(vec3(.05,.045,.04), vec3(.16,.15,.14), n2) + step(.93, h21(floor(vW.xz*14.)))*vec3(.3)*hf;   // char + white ash flecks
                  diffuseColor.rgb = mix(diffuseColor.rgb, ch, a*(1. - line*.6)); } }`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
              { float kind; float n = fbm(vW.xz*.35); float age = fBurnAge(vW.x, vW.z + (n-.5)*1.4, uT, kind);
                if (age >= 0.) { float hot = exp(-age*(kind > 1.5 ? 1.1 : .55)); float sp = smoothstep(.55, .9, fbm(vW.xz*3. + vec2(0., uT*.6)));
                  totalEmissiveRadiance += vec3(1., .32, .05) * (hot*.55*(.25 + sp) + step(.985, h21(floor(vW.xz*9.) + floor(uT*2.)))*.45*exp(-age*.15)*(1. - smoothstep(.03, .12, length(fwidth(vW.xz))))) ; } }`);
        };
      }
      if (m.name === 'mountain' || m.name === 'mountain_far') { m.fog = true; me.castShadow = false; }
    });
    // ---- instanced vegetation (deterministic scatter) -------------------------------------------------------------
    const R = rnd(1925);
    const ok = (x: number, z: number) => !(Math.abs(z) < 2.6) && !(x > 8 && x < 20 && z > 3 && z < 16) && !(x > -9 && x < 9 && z > 2.6 && z < 12);
    const scatter = (n: number, x0: number, x1: number, z0: number, z1: number, s0: number, s1: number, extra: (x: number, z: number) => boolean = () => true) => {
      const out: Inst[] = []; let guard = 0;
      while (out.length < n && guard++ < n * 20) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0); if (!ok(x, z) || !extra(x, z)) continue; out.push({ x, z, s: s0 + R() * (s1 - s0), r: R() * 6.283, tint: .85 + R() * .3 }); }
      return out;
    };
    // meadow between the line and the timber (z -26..6): only a few scattered trees, so overhead coverage reads the fuel bed
    const treeOK = (x: number, z: number) => (z > 6 || z < -26 || (R() < .06 && Math.abs(x) > 12)) && !(z > 4 && z < 30 && Math.abs(x - 2) < 3.2) && !(x > -30 && x < 30 && z > -9 && z < 3);
    const fir = scatter(520, -150, 150, -170, 110, .8, 1.2, treeOK), fir2 = scatter(260, -150, 150, -170, 110, .8, 1.15, treeOK);
    const pine = scatter(300, -150, 150, -170, 110, .85, 1.2, treeOK), pine2 = scatter(150, -150, 150, -170, 110, .85, 1.15, treeOK);
    const near = (x: number, z: number) => Math.abs(x) < 70 && z > -60 && z < 70;
    const clearCam = (x: number, z: number) => !(x > -14 && x < 14 && z > -9 && z < 6);
    this.instance('Fir', fir, 'tree'); this.instance('Fir2', fir2, 'tree'); this.instance('Pine', pine, 'tree'); this.instance('Pine2', pine2, 'tree');
    this.instance('Fern', scatter(2600, -80, 80, -70, 70, .8, 1.5, near), 'fuel');
    this.instance('Shrub', scatter(900, -90, 90, -80, 80, .7, 1.4, (x, z) => near(x, z) && clearCam(x, z) || (near(x, z) && z < -5)), 'fuel');
    this.instance('Grass', scatter(4200, -80, 80, -60, 60, .8, 1.5, near), 'fuel');
    this.instance('Log', scatter(70, -90, 90, -90, 80, .8, 1.3, clearCam), 'fuel');
    this.instance('Branch', scatter(260, -70, 70, -60, 60, .7, 1.3), 'fuel');
    this.instance('RockA', scatter(140, -90, 90, -90, 80, .5, 1.4, clearCam), 'rock'); this.instance('RockB', scatter(40, -90, 90, -90, 80, .5, 1.1, clearCam), 'rock');
    // ---- flames ---------------------------------------------------------------------------------------------------
    const quad = new T.PlaneGeometry(1, 1); quad.translate(0, .5, 0);
    const fMat = new T.ShaderMaterial({ uniforms: { uT }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */`attribute vec4 iA; attribute vec4 iB; varying vec2 vU; varying vec3 vS; uniform float uT;
        void main(){ vU = uv; vS = iB.xyz;
          vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 cu = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 up = normalize(mix(vec3(0.,1.,0.), cu, smoothstep(.55, .95, abs(viewMatrix[1][2]))));   // spherical when looking down
          float sway = sin(uT*1.7 + iB.x*20.)*.12 + iB.z;   // wind lean grows with height
          vec3 p = iA.xyz + r*(position.x*iA.w + sway*position.y*position.y*iB.w*.35) + up*position.y*iB.w;
          gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.); }`,
      fragmentShader: /* glsl */`uniform float uT; varying vec2 vU; varying vec3 vS; ${NOISE}
        void main(){ float s = vS.x, heat = vS.y; vec2 uv = vU; float y = uv.y;
          // domain-warped rising noise
          vec2 q = vec2(uv.x*2.2 + s*13., y*1.6 - uT*(1.9 + s*.8));
          float w1 = fbm(q), w2 = fbm(q*2.1 + vec2(w1*1.7, -uT*1.3));
          float x = (uv.x - .5) + (w1 - .5)*.38*y;
          float prof = .46*pow(1. - y, .55) + .02;                    // teardrop width profile
          float m = smoothstep(prof, prof*.15, abs(x)) * smoothstep(0., .07, y);
          float tongues = smoothstep(.18, .62, w2*1.25 - y*.85 + .38); // separate licking tongues toward the tip
          float a = m * tongues; if (a < .02) discard;
          float core = smoothstep(.55, .95, a) * smoothstep(.75, .1, y);
          vec3 c = mix(vec3(.55,.06,.01), vec3(1.,.38,.04), smoothstep(.05, .5, a));
          c = mix(c, vec3(1.,.72,.25), smoothstep(.45, .85, a));
          c = mix(c, vec3(1.,.9,.62), core*heat);
          gl_FragColor = vec4(c * min(a, .85) * (.42 + .25*heat), 1.); }` });
    const NF = 3200; const fg = new T.InstancedBufferGeometry(); fg.index = quad.index; fg.attributes.position = quad.attributes.position; fg.attributes.uv = quad.attributes.uv;
    fg.setAttribute('iA', new T.InstancedBufferAttribute(new Float32Array(NF * 4), 4)); fg.setAttribute('iB', new T.InstancedBufferAttribute(new Float32Array(NF * 4), 4)); fg.instanceCount = 0;
    this.flames = new T.InstancedMesh(fg, fMat, NF); this.flames.frustumCulled = false; this.flames.renderOrder = 9; this.scene.add(this.flames);
    // ---- smoke (GPU-animated puffs with precomputed births) -------------------------------------------------------
    const st = smokeTex(); const NS = 2200; const sg = new T.InstancedBufferGeometry(); const sq = new T.PlaneGeometry(1, 1);
    sg.index = sq.index; sg.attributes.position = sq.attributes.position; sg.attributes.uv = sq.attributes.uv;
    const sA = new Float32Array(NS * 4), sB = new Float32Array(NS * 4); const SR = rnd(77); let si = 0;
    const addPuff = (x: number, z: number, birth: number, kind: number) => { if (si >= NS) return; sA.set([x, H(x, z), z, birth], si * 4); sB.set([kind, SR(), 7 + SR() * 7, SR()], si * 4); si++; };
    for (let i = 0; i < 1500; i++) {   // wildfire column + residual smoke behind the front
      const x = -170 + SR() * 340, b = -14 + SR() * 46, s = state(x, Math.max(0, b)); const z = (s.met ? s.zMeet : Math.min(zW(x, b), LINE)) - SR() * 14;
      addPuff(x, z, b, 0);
    }
    for (let i = 0; i < 700; i++) {   // burnout smoke (lighter, lower)
      const x = -45 + SR() * 90, b = 10.5 + SR() * 20; const ti = tig(x); if (b < ti) continue; const s = state(x, b);
      addPuff(x, s.zb + SR() * 2, b, 1);
    }
    sg.setAttribute('iA', new T.InstancedBufferAttribute(sA, 4)); sg.setAttribute('iB', new T.InstancedBufferAttribute(sB, 4)); sg.instanceCount = si;
    const sMat = new T.ShaderMaterial({ uniforms: { uT, map: { value: st }, uK: { value: 1 }, uFog: { value: new T.Color('#c9a07a') } }, transparent: true, depthWrite: false,
      vertexShader: /* glsl */`attribute vec4 iA; attribute vec4 iB; uniform float uT; varying vec2 vU; varying float vA; varying float vAge; varying float vKind; varying float vY;
        void main(){ float age = uT - iA.w; float life = iB.z; vKind = iB.x; vU = uv;
          if (age < 0. || age > life) { gl_Position = vec4(2.,2.,2.,1.); return; }
          float k = age/life; float big = vKind < .5 ? 1. : .45;
          vec3 c = iA.xyz + vec3(age*(2.2 + iB.y*1.5)*big + sin(age*.6 + iB.w*9.)*1.5, ((vKind < .5 ? 4. : 2.6) + age*(vKind < .5 ? 5.5 : 2.2)) , -age*.4);
          float size = (vKind < .5 ? 9. : 5.5) * (.35 + k*1.6) * (.8 + iB.w*.5);
          c.y = max(c.y, iA.y + size*.85);   // never let the ground slice a puff (hard-edged chevrons from above)
          vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float rot = iB.w*6.28 + age*.15; vec2 q = vec2(cos(rot)*position.x - sin(rot)*position.y, sin(rot)*position.x + cos(rot)*position.y);
          vec3 p = c + (r*q.x + u*q.y)*size; vY = c.y;
          vA = smoothstep(0., .3, k) * (1. - smoothstep(.55, 1., k)); vAge = age;
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: /* glsl */`uniform sampler2D map; uniform float uK; varying vec2 vU; varying float vA; varying float vAge; varying float vKind; varying float vY;
        void main(){ float a = texture2D(map, vU).a * vA * uK * (vKind < .5 ? .55 : .22); if (a < .004) discard;
          vec3 dark = vKind < .5 ? vec3(.16,.14,.13) : vec3(.36,.34,.33); vec3 lit = vec3(.72,.4,.22);
          vec3 c = mix(lit, dark, smoothstep(0., 2.5, vAge)); c = mix(c, vec3(.62,.55,.5), smoothstep(10., 45., vY)*.5);
          gl_FragColor = vec4(c, a); }` });
    this.smoke = new T.InstancedMesh(sg, sMat, si); this.smoke.frustumCulled = false; this.smoke.renderOrder = 8; this.scene.add(this.smoke);
    // ---- embers & ash ---------------------------------------------------------------------------------------------
    const NE = 2600; const eg = new T.InstancedBufferGeometry(); const eq = new T.PlaneGeometry(1, 1); eg.index = eq.index; eg.attributes.position = eq.attributes.position; eg.attributes.uv = eq.attributes.uv;
    const eA = new Float32Array(NE * 4), eB = new Float32Array(NE * 4); const ER = rnd(31);
    for (let i = 0; i < NE; i++) {
      const ash = i > 1900; const x = (ash ? -60 : -120) + ER() * (ash ? 120 : 240), b = -10 + ER() * 42;
      const s = state(x, Math.max(0, b)); const z = ash ? -40 + ER() * 80 : (i % 3 === 0 && b > tig(x) && isFinite(tMeet(x)) ? s.zb : (s.met ? s.zMeet : Math.min(zW(x, b), LINE)) - ER() * 4);
      eA.set([x, H(x, z) + (ash ? 18 + ER() * 10 : .5), z, b], i * 4); eB.set([ash ? 1 : 0, ER(), 3 + ER() * 5, ER()], i * 4);
    }
    eg.setAttribute('iA', new T.InstancedBufferAttribute(eA, 4)); eg.setAttribute('iB', new T.InstancedBufferAttribute(eB, 4)); eg.instanceCount = NE;
    const eMat = new T.ShaderMaterial({ uniforms: { uT, uE: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false,
      vertexShader: /* glsl */`attribute vec4 iA; attribute vec4 iB; uniform float uT; varying vec2 vU; varying float vA; varying float vAsh;
        void main(){ float age = uT - iA.w, life = iB.z; vU = uv; vAsh = iB.x;
          if (age < 0. || age > life) { gl_Position = vec4(2.,2.,2.,1.); return; }
          vec3 p = iA.xyz;
          if (vAsh < .5) p += vec3(age*(3.5 + iB.y*3.) + sin(age*3. + iB.w*20.)*.8, age*(3. + iB.w*4.) - age*age*.15, cos(age*2.3 + iB.y*11.)*.8);
          else p += vec3(age*2.2 + sin(age*1.7 + iB.w*20.)*.9, -age*1.1, cos(age*1.3 + iB.y*11.)*.7);
          float sz = vAsh < .5 ? .07 + iB.w*.06 : .05 + iB.w*.05;
          vec3 r = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), u = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          p += (r*position.x + u*position.y)*sz;
          vA = (1. - smoothstep(.6, 1., age/life)) * (vAsh < .5 ? (.6 + .4*sin(age*25. + iB.y*50.)) : .5);
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: /* glsl */`uniform float uE; varying vec2 vU; varying float vA; varying float vAsh;
        void main(){ float d = length(vU - .5)*2.; float a = (1. - smoothstep(.3, 1., d)) * vA * uE; if (a < .01) discard;
          vec3 c = vAsh < .5 ? vec3(1., .5, .12)*1.6 : vec3(.09,.085,.08); gl_FragColor = vec4(c*a, 1.); }` });
    this.embers = new T.InstancedMesh(eg, eMat, NE); this.embers.frustumCulled = false; this.embers.renderOrder = 10; this.scene.add(this.embers);
    // ---- firelight ------------------------------------------------------------------------------------------------
    for (let i = 0; i < 6; i++) { const L = new T.PointLight('#ff7a2a', 0, 70, 1.6); this.scene.add(L); this.fireLights.push(L); }
    this.torchLight = new T.PointLight('#ffa040', 0, 9, 1.8); this.scene.add(this.torchLight);
    // ---- sun shafts through the canopy (soft additive planes) ------------------------------------------------------
    const rm = new T.ShaderMaterial({ uniforms: { k: { value: 0 }, uT }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float k; uniform float uT; varying vec2 vU; void main(){ float a = smoothstep(0.,.3,vU.y)*(1.-smoothstep(.7,1.,vU.y))*smoothstep(0.,.25,vU.x)*(1.-smoothstep(.75,1.,vU.x)); a *= .7 + .3*sin(vU.x*9. + uT*.3); gl_FragColor = vec4(vec3(1.,.72,.42)*a*k, 1.); }' });
    const RR = rnd(55);
    for (let i = 0; i < 14; i++) {
      const x = -14 + RR() * 30, z = 6 + RR() * 34; const top = new T.Vector3(x - 9, 24, z + 7), bot = new T.Vector3(x, H(x, z), z);
      const me = new T.Mesh(new T.PlaneGeometry(1, 1), rm); const d = bot.clone().sub(top); me.position.copy(top.clone().add(bot).multiplyScalar(.5)); me.scale.set(1.2 + RR() * 1.6, d.length(), 1);
      me.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); me.rotateY(RR() * 3); me.renderOrder = 7; this.scene.add(me); this.rays.push(me);
    }
  }
  /** Instance a Blender template (all of its meshes) at the given spots; vegetation shaders read burn state from the instance origin. */
  instance(name: string, list: Inst[], kind: 'tree' | 'fuel' | 'rock') {
    const tpl = this.props.get(name); if (!tpl) return; const uT = this.uT;
    const meshes: T.Mesh[] = []; tpl.updateMatrixWorld(true); tpl.traverse(o => { if ((o as T.Mesh).isMesh) meshes.push(o as T.Mesh); });
    const mtx = new T.Matrix4(), q = new T.Quaternion(), col = new T.Color();
    for (const src of meshes) {
      const m0 = (src.material as T.MeshStandardMaterial); const m = m0.clone();
      const part = /needles|leaf|fern|grass/.test(m.name) ? 'foliage' : /bark/.test(m.name) ? 'trunk' : 'wood';
      if (part === 'foliage') { m.side = T.DoubleSide; m.vertexColors = true; m.color.set('#ffffff'); m.roughness = .85; }
      m.customProgramCacheKey = () => `veg-${kind}-${part}`;
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = uT;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nuniform float uT; varying float vAge; varying float vKind; varying float vYl; varying float vHash; varying vec3 vLp;\n${NOISE}\n${GLSL}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            { vec3 o = instanceMatrix[3].xyz; float kind; float age = fBurnAge(o.x, o.z, uT, kind); vAge = age; vKind = kind; vYl = position.y; vHash = h21(o.xz); vLp = position;
              ${kind === 'fuel' ? 'if (age >= 0.) { float s = mix(1., .1, smoothstep(.2, 2.2, age)); transformed.xz *= mix(1., .5, smoothstep(0., 2., age)); transformed.y *= s; }' : ''}
              ${kind === 'tree' ? `float sway = sin(uT*1.3 + o.x*.3)*.006*max(0., position.y - 4.); transformed.x += sway * (age >= 0. && kind > .5 && kind < 1.5 ? 2. : 1.);` : ''}
              ${kind === 'fuel' ? 'transformed.x += sin(uT*2.1 + o.z)*.03*position.y;' : ''} }`);
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uT; varying float vAge; varying float vKind; varying float vYl; varying float vHash; varying vec3 vLp;\n${NOISE}`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            if (vAge >= 0.) {
              ${kind === 'fuel' ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.05,.045,.04), smoothstep(0., 1.2, vAge));' : ''}
              ${kind === 'tree' && part === 'foliage' ? 'if (vKind < 1.5) { float g = smoothstep(.5, 4., vAge); if (h21(floor(vLp.xz*5. + vLp.y*3.) + vHash) < g*.82) discard; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.06,.05,.04), g); } else { diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.42,.3,.12), smoothstep(2., 8., vAge)*smoothstep(7., 2., vYl)); }' : ''}
              ${kind === 'tree' && part !== 'foliage' ? 'float sc = vKind < 1.5 ? 1. : smoothstep(4.5, 1.5, vYl); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.06,.05,.045), smoothstep(0., 2., vAge)*sc);' : ''}
            }`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            if (vAge >= 0.) { float hot = exp(-vAge*${kind === 'tree' ? '.6' : '1.2'}) * ${kind === 'rock' ? '0.' : '1.'};
              ${kind === 'tree' ? 'hot *= vKind < 1.5 ? 1. : smoothstep(3., .5, vYl);' : ''}
              totalEmissiveRadiance += vec3(1., .35, .06) * hot * (.3 + .2*sin(uT*17. + vHash*40.)); }`);
      };
      const im = new T.InstancedMesh(src.geometry, m, list.length); im.castShadow = kind !== 'fuel' || /Shrub|Log/.test(name); im.receiveShadow = true;
      list.forEach((p, i) => { q.setFromAxisAngle(new T.Vector3(0, 1, 0), p.r); mtx.compose(new T.Vector3(p.x, H(p.x, p.z) - .05, p.z), q, new T.Vector3(p.s, p.s, p.s)); im.setMatrixAt(i, mtx); col.setScalar(p.tint); im.setColorAt(i, col); });
      im.userData.list = list; this.scene.add(im); this.vegGroups.push(im);
    }
  }
  async render(F9: Frame9, frame: number) {
    const t = F9.fireT; this.uT.value = t;
    // flames along both fronts (deterministic)
    const A = this.flames.geometry.getAttribute('iA') as T.InstancedBufferAttribute, Bt = this.flames.geometry.getAttribute('iB') as T.InstancedBufferAttribute;
    let n = 0; const NF = A.count; const hsh = (a: number) => { const s = Math.sin(a * 127.1) * 43758.5; return s - Math.floor(s); };
    const put = (x: number, z: number, w: number, h: number, seed: number, heat: number, lean: number) => { if (n >= NF || h < .05) return; A.setXYZW(n, x, H(x, z) - .05, z, w); Bt.setXYZW(n, seed, heat, lean, h); n++; };
    for (let x = -170; x <= 170; x += 1.25) {
      const s = state(x, t), j = hsh(x);
      // main wildfire: tall, layered flames; after meeting the black band it lies down to a dull red smoulder
      const decay = s.met ? Math.max(0, 1 - (t - s.tm) / 2.8) : 1; const zf = s.zWe, hd = .25 + .45 * decay;
      if (s.met && decay === 0) { if (j > .72 && t - s.tm < 9) put(x, zf - 1 - j * 3, .6, .35 + .25 * Math.sin(t * 7 + x), j, .12, .02); continue; }   // sparse dull smoulder
      if (zf > -200 && t > 0) {
        const tall = (7 + 9 * hsh(x * 3.1)) * decay; put(x + (j - .5), zf - .6, 2.4 + 1.4 * j, tall, j, hd, .25);
        put(x + .6, zf - 2.5 - j * 3, 2.2, (4 + 5 * j) * decay, j + .3, hd * .8, .2);
        if (j > .55 && decay > .3) put(x - .4, zf - 6 - j * 6, 2.0, (2 + 4 * j) * decay, j + .6, hd * .6, .15);   // residual burning behind the front
      }
    }
    // burnout: low, dense, clearly smaller backing flames along its own front
    for (let x = -60; x <= 60; x += .38) {
      const s = state(x, t); if (!s.burnout || t > s.tm + 2.5) continue; const j = hsh(x * 1.7);
      const age = t - s.ti, grow = Math.min(1, age / .7), fade = t > s.tm ? Math.max(0, 1 - (t - s.tm) / 2.5) : 1;
      const hb = (.45 + .85 * hsh(x * 7.7) + .3 * Math.sin(t * 5 + x * 3)) * grow * fade;
      put(x, s.zb - .15 - j * .5, .5 + .3 * j, hb, j + .9, .5, .05);
      if (j > .5) put(x + .2, s.zb + .35, .4, hb * .55, j + 1.3, .35, .04);
    }
    (this.flames.geometry as T.InstancedBufferGeometry).instanceCount = n; A.needsUpdate = true; Bt.needsUpdate = true;
    // firelight: follow the nearest part of each front to the camera
    const cx = F9.cam.pos[0];
    this.fireLights.forEach((L, i) => {
      const x = cx - 50 + i * 20, s = state(x, t); const decay = s.met ? Math.max(.15, 1 - (t - s.tm) / 2.8) : 1; const bo = s.burnout && t < s.tm + 2 && i % 2 === 0;
      const z = bo ? s.zb : s.zWe; L.position.set(x, H(x, z) + (bo ? 1.2 : 6), z + 1); L.intensity = (bo ? 30 : 320 * decay) * (.8 + .2 * Math.sin(t * 13 + i * 3) + .1 * Math.sin(t * 31 + i));
      L.distance = bo ? 18 : 80;
    });
    if (F9.torch) { this.torchLight.position.copy(F9.torch); this.torchLight.intensity = 6 * (.85 + .15 * Math.sin(t * 29)); } else this.torchLight.intensity = 0;
    (this.smoke.material as T.ShaderMaterial).uniforms.uK.value = F9.smokeK ?? 1; (this.embers.material as T.ShaderMaterial).uniforms.uE.value = F9.embersK ?? 1;
    for (const r of this.rays) { (r.material as T.ShaderMaterial).uniforms.k.value = (F9.godrays ?? 0) * .06; r.visible = (F9.godrays ?? 0) > 0; }
    await super.render(F9, frame);
  }
}
