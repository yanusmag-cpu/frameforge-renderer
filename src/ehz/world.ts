// Zanzibar Town waterfront, 27 Aug 1896 — procedural terrain, ocean, town, palace complex, fort and ships.
import * as T from 'three';
import { Builder, M, GLSL_GROUND, groundH, shoreX, rng, ss, vnoise, flagTex, type V3 } from './geo.ts';

// ---------- shared damage + window shader ----------------------------------------------------------
export const DMG = { imp: { value: Array.from({ length: 48 }, () => new T.Vector4(0, -99, 0, 1e9)) }, rad: { value: new Array(48).fill(.4) }, uT: { value: 0 } };
const DMG_GLSL = `uniform vec4 imp[48]; uniform float rad[48]; uniform float uT;`;
export function damageMat(o: { holes?: boolean; win?: { w: number; fh: number; base: number; top: number; tint?: string }; rough?: number; env?: T.Texture | null; instLocal?: boolean }) {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? .85, envMap: o.env ?? null, envMapIntensity: .35 });
  const w = o.win; const tint = new T.Color(w?.tint ?? '#3b2a20');
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, DMG, { wTint: { value: tint } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec3 vLoc;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wq = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          wq = instanceMatrix * wq;
        #endif
        wq = modelMatrix * wq; vWP = wq.xyz; vLoc = position;
        vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wn = mat3(instanceMatrix) * wn;
        #endif
        vWN = normalize(mat3(modelMatrix) * wn);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWP; varying vec3 vWN; varying vec3 vLoc; uniform vec3 wTint;\n${DMG_GLSL}\n${GLSL_GROUND}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float scorch = 0., ember = 0.;
        for (int i = 0; i < 48; i++) { vec4 d = imp[i]; float age = uT - d.w; if (age < 0.) continue;
          float r = rad[i] * min(1., .35 + age * 9.); float nz = vn(vWP.xz * 4.1 + vWP.y * 3.3) * .6 + vn(vWP.zy * 9.) * .4;
          float dd = distance(vWP, d.xyz) / r + (nz - .5) * .55;
          ${o.holes ? 'if (dd < .5) discard;' : ''}
          scorch = max(scorch, 1. - smoothstep(.45, 1.5, dd)); ember = max(ember, (1. - smoothstep(.45, .75, dd)) * exp(-age * .35)); }
        ${w ? `
        vec3 an = abs(vWN);
        if (an.y < .3 && vWP.y > ${w.base.toFixed(3)} + .08 && vWP.y < ${w.top.toFixed(3)} ${o.instLocal ? '&& vLoc.y < .36' : ''}) {
          float u = an.x > an.z ? vWP.z : vWP.x; float cu = fract(u / ${w.w.toFixed(3)}); float cv = fract((vWP.y - ${w.base.toFixed(3)}) / ${w.fh.toFixed(3)});
          vec2 q = vec2(cu - .5, cv - .42); float ar = q.y > .1 ? length(vec2(q.x * 1., q.y - .1)) : abs(q.x);
          float wn = (1. - smoothstep(.15, .17, ar)) * step(-.24, q.y) * step(q.y, .29);
          float frame = (1. - smoothstep(.19, .21, ar)) * step(-.27, q.y) * step(q.y, .32) - wn;
          float shut = step(.5, fract(floor(u / ${w.w.toFixed(3)}) * .37 + floor((vWP.y) / ${w.fh.toFixed(3)}) * .53));
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .78, frame);
          diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(.035,.03,.028), wTint, shut), wn);
        }` : ''}
        float grime = vn(vWP.xz * 1.3 + vWP.y * .7) * .5 + vn(vec2(vWP.x + vWP.z, vWP.y) * 6.) * .5;
        diffuseColor.rgb *= .88 + .2 * grime;
        diffuseColor.rgb *= mix(1., .1, scorch * .92);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.6, .5, .12) * ember * 2.5;');
  };
  m.customProgramCacheKey = () => 'ehzdmg' + JSON.stringify(o.win ?? 0) + (o.holes ? 'h' : '') + (o.instLocal ? 'i' : '');
  return m;
}

// ---------- terrain -----------------------------------------------------------------------------------
export function terrain() {
  const W = 300, N = 300; const g = new T.PlaneGeometry(W, W, N, N); g.rotateX(-Math.PI / 2); g.translate(-30, 0, 0);
  const p = g.getAttribute('position'); const col = new Float32Array(p.count * 3); const c = new T.Color();
  const sandW = new T.Color('#e8d7a6'), sandD = new T.Color('#d8c08a'), grass = new T.Color('#6f9a45'), grass2 = new T.Color('#4f7d36'), earth = new T.Color('#b29468'), town = new T.Color('#c9b088'), deep = new T.Color('#c9b98e');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); const h = groundH(x, z); p.setY(i, h); const d = x - shoreX(z);
    const n = vnoise(x * .2, z * .2), n2 = vnoise(x * .05 + 3, z * .05);
    if (d < 0) c.copy(sandW).lerp(deep, ss(0, -12, d));
    else if (d < 2.4) c.copy(sandW).lerp(sandD, n * .6);
    else { c.copy(grass).lerp(grass2, n2).lerp(earth, ss(.55, .8, n) * .7);
      const inTown = d > 3 && d < 46 && z > -32 && z < 48; if (inTown) c.lerp(town, .78 + .15 * n); }
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, damageMat({ rough: .95 })); m.receiveShadow = true; m.name = 'terrain'; return m;
}

// ---------- ocean ----------------------------------------------------------------------------------------
export const WATER = {
  uT: { value: 0 }, sunDir: { value: new T.Vector3(.5, .7, -.4).normalize() }, sunCol: { value: new T.Color('#fff2d8') }, skyTop: { value: new T.Color('#3d7fcf') }, skyHor: { value: new T.Color('#cfe3f2') },
  camPos: { value: new T.Vector3() }, lp: { value: Array.from({ length: 8 }, () => new T.Vector4(0, -50, 0, 0)) }, lc: { value: Array.from({ length: 8 }, () => new T.Color(0, 0, 0)) },
  fogC: { value: new T.Color('#cfe0ea') }, fogD: { value: .004 }, smokeDark: { value: 0 },
  splash: { value: Array.from({ length: 16 }, () => new T.Vector4(0, 0, 0, -99)) },
};
export function ocean() {
  const g = new T.PlaneGeometry(2400, 2400, 1, 1); g.rotateX(-Math.PI / 2);
  const m = new T.ShaderMaterial({ uniforms: WATER, transparent: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uT, fogD, smokeDark; uniform vec3 sunDir, sunCol, skyTop, skyHor, camPos, fogC; uniform vec4 lp[8]; uniform vec3 lc[8]; uniform vec4 splash[16]; varying vec3 vW;
    ${GLSL_GROUND}
    float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
    float wh(vec2 p){ return fbm(p * .55 + vec2(uT * .09, uT * .05)) * .6 + fbm(p * 1.7 - vec2(uT * .17, -uT * .11)) * .4; }
    void main(){
      vec2 p = vW.xz; float gh = groundH(p); float depth = max(0., -gh);
      float e = .06; float h0 = wh(p); vec3 n = normalize(vec3(-(wh(p + vec2(e, 0.)) - h0) / e * .42, 1., -(wh(p + vec2(0., e)) - h0) / e * .42));
      // ring ripples from splashes
      for (int i = 0; i < 16; i++) { vec4 s = splash[i]; float age = uT - s.w; if (age < 0. || age > 4.) continue; float d = distance(p, s.xz);
        float rr = age * 2.6 * s.y; float w = exp(-pow((d - rr) * 3.2 / s.y, 2.)) * exp(-age * .9); n.xz += normalize(p - s.xz + 1e-3) * w * .6; }
      n = normalize(n);
      vec3 shallow = vec3(.16, .72, .66), mid = vec3(.03, .38, .55), deep = vec3(.012, .14, .32);
      vec3 base = mix(shallow, mid, smoothstep(.05, .9, depth)); base = mix(base, deep, smoothstep(.9, 3.2, depth));
      base *= .85 + .3 * fbm(p * .08);
      vec3 V = normalize(camPos - vW); float ndv = max(dot(n, V), 0.); float fres = .025 + .975 * pow(1. - ndv, 5.);
      vec3 R = reflect(-V, n); vec3 sky = mix(skyHor, skyTop, pow(clamp(R.y, 0., 1.), .6));
      float sd = max(dot(R, sunDir), 0.); vec3 spec = sunCol * (pow(sd, 600.) * 30. + pow(sd, 60.) * .5);
      vec3 c = base * (.45 + .55 * max(sunDir.y, 0.)) + sky * fres * .55 + spec;
      // shoreline foam
      float fz = smoothstep(.22, .0, depth) * (.55 + .45 * sin(uT * 1.3 - depth * 40. + fbm(p * .7) * 6.)); c = mix(c, vec3(1.05), clamp(fz * smoothstep(.0, .02, depth) * .85, 0., 1.));
      // splash foam
      for (int i = 0; i < 16; i++) { vec4 s = splash[i]; float age = uT - s.w; if (age < 0. || age > 6.) continue; float d = distance(p, s.xz) / (s.y * (.6 + age * .5));
        float f = (1. - smoothstep(.3, 1., d + (fbm(p * 3.) - .5) * .6)) * exp(-age * .55); c = mix(c, vec3(1.1), clamp(f, 0., 1.) * .9); }
      // fire / flash light reflected on the water
      for (int i = 0; i < 8; i++) { vec4 L = lp[i]; if (L.w <= 0.) continue; vec3 dl = L.xyz - vW; float d2 = dot(dl, dl);
        vec3 ld = normalize(dl); float rs = pow(max(dot(R, ld), 0.), 18.) * 1.1 + pow(max(dot(R, ld), 0.), 4.) * .15;
        c += lc[i] * L.w * (rs * (.4 + fres) + .15 / (1. + d2 * .08)) / (1. + d2 * .012); }
      c *= 1. - smokeDark;
      float fd = length(camPos - vW); c = mix(c, fogC, 1. - exp(-fd * fogD));
      gl_FragColor = vec4(c, 1.);
    }` });
  const mesh = new T.Mesh(g, m); mesh.name = 'ocean'; mesh.renderOrder = 0; return mesh;
}

// ---------- town -------------------------------------------------------------------------------------------
export const KEEP_OUT: [number, number, number, number][] = [ // x0,x1,z0,z1 footprints kept clear of generic houses (plus streets)
  [-40, 12.5, -16, 25], [-30, 2, 25, 60],
];
export function town(env: T.Texture | null) {
  const R = rng(91); const pal = ['#f1ece0', '#efe6d2', '#e8dcc0', '#f3eadb', '#e6d3ad', '#d9c3a0', '#ecdcc4', '#e9e2d6', '#d8cbb5', '#f0e1c2', '#cfd8d6', '#e8cfc0'];
  const list: { x: number; z: number; w: number; d: number; h: number; c: string; r: number }[] = [];
  for (let z = -34; z < 50; z += 1.25) for (let x = -10; x < 52; x += 1.25) {
    const sx = shoreX(z); const d = x - sx; if (d < 2.6 || d > 46) continue;
    if (KEEP_OUT.some(k => x > k[0] && x < k[1] && z > k[2] && z < k[3])) continue;
    if (Math.abs(((x * .37 + z * .11) % 7) - 3.5) < .45 || Math.abs(((z * .41 - x * .07) % 6.3) - 3.1) < .4) continue;   // winding streets
    if (R() < .1) continue;
    const dense = 1 - ss(20, 46, d); if (R() > .35 + .65 * dense) continue;
    const w = .9 + R() * .45, dd = .9 + R() * .45, h = .45 + R() * .55 * dense + (R() < .08 ? .4 : 0);
    list.push({ x: x + (R() - .5) * .25, z: z + (R() - .5) * .25, w, d: dd, h, c: pal[(R() * pal.length) | 0], r: (R() - .5) * .12 });
  }
  const g = new T.BoxGeometry(1, 1, 1); g.translate(0, .5, 0); g.setAttribute('color', new T.Float32BufferAttribute(new Array(g.getAttribute('position').count * 3).fill(1), 3));
  const mat = damageMat({ instLocal: true, win: { w: .32, fh: .33, base: .3, top: 6, tint: '#2c4c3c' }, env });
  const im = new T.InstancedMesh(g, mat, list.length); const m = new T.Matrix4(); const c = new T.Color();
  list.forEach((b, i) => { const y = groundH(b.x, b.z) - .05; m.compose(new T.Vector3(b.x, y, b.z), new T.Quaternion().setFromEuler(new T.Euler(0, b.r, 0)), new T.Vector3(b.w, b.h + .05, b.d)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(b.c)); });
  im.castShadow = true; im.receiveShadow = true; im.name = 'town';
  // roof parapets / stair huts
  const hut = new T.BoxGeometry(1, 1, 1); hut.translate(0, .5, 0); const hm = new T.InstancedMesh(hut, new T.MeshStandardMaterial({ color: '#e9e0cf', roughness: .9 }), list.length);
  let k = 0; list.forEach((b, i) => { if (hash01(i) < .45) { const y = groundH(b.x, b.z) + b.h; m.compose(new T.Vector3(b.x + (hash01(i * 3) - .5) * b.w * .5, y, b.z + (hash01(i * 7) - .5) * b.d * .5), new T.Quaternion(), new T.Vector3(.3, .18, .3)); hm.setMatrixAt(k++, m); } });
  hm.count = k; hm.castShadow = true;
  // parapet rims on every roof
  const rim = new T.InstancedMesh(rimGeo(), new T.MeshStandardMaterial({ color: '#f1ebdf', roughness: .9 }), list.length);
  list.forEach((b, i) => { m.compose(new T.Vector3(b.x, groundH(b.x, b.z) + b.h, b.z), new T.Quaternion().setFromEuler(new T.Euler(0, b.r, 0)), new T.Vector3(b.w, 1, b.d)); rim.setMatrixAt(i, m); rim.setColorAt(i, c.set(b.c).multiplyScalar(1.02)); });
  rim.castShadow = true;
  const grp = new T.Group(); grp.add(im, hm, rim); return { grp, list };
}
const hash01 = (n: number) => { const x = Math.sin(n * 91.7 + 7.3) * 43758.5453; return x - Math.floor(x); };
function rimGeo() { const b = new Builder(); const t = .05, h = .07; b.box(1, h, t, [0, h / 2, .5 - t / 2], '#fff'); b.box(1, h, t, [0, h / 2, -.5 + t / 2], '#fff'); b.box(t, h, 1, [.5 - t / 2, h / 2, 0], '#fff'); b.box(t, h, 1, [-.5 + t / 2, h / 2, 0], '#fff'); const g = b.geo(); g.deleteAttribute('color'); return g; }

// ---------- palace complex -------------------------------------------------------------------------------
const WOOD = '#6e4526', WOOD2 = '#87562f', PLASTER = '#efe7d6', PLASTER2 = '#e7dcc4', STONE = '#c7a878';
function crenels(b: Builder, x0: number, x1: number, z0: number, z1: number, y: number, color: string, step = .26, s = .12) {
  for (let x = x0 + step / 2; x < x1; x += step) { b.box(s, s * 1.3, s * .9, [x, y + s * .65, z0 + s * .45], color); b.box(s, s * 1.3, s * .9, [x, y + s * .65, z1 - s * .45], color); }
  for (let z = z0 + step / 2; z < z1; z += step) { b.box(s * .9, s * 1.3, s, [x0 + s * .45, y + s * .65, z], color); b.box(s * .9, s * 1.3, s, [x1 - s * .45, y + s * .65, z], color); }
}
/** Two/three-storey verandas along a west-facing facade at x = xf, z0..z1. */
function veranda(b: Builder, xf: number, z0: number, z1: number, y0: number, fh: number, floors: number, depth = .5) {
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * fh;
    b.box(depth, .05, z1 - z0, [xf - depth / 2, y + .02, (z0 + z1) / 2], WOOD);                     // floor
    b.box(depth + .06, .05, z1 - z0 + .06, [xf - depth / 2, y + fh - .02, (z0 + z1) / 2], WOOD);    // ceiling/roof
    b.box(.03, .16, z1 - z0, [xf - depth + .02, y + .17, (z0 + z1) / 2], WOOD2);                   // balustrade panel
    b.box(.05, .03, z1 - z0, [xf - depth + .02, y + .26, (z0 + z1) / 2], WOOD);                     // hand rail
    for (let z = z0; z <= z1 + 1e-3; z += .42) b.box(.06, fh - .05, .06, [xf - depth + .03, y + fh / 2, z], WOOD);   // posts
    for (let z = z0 + .21; z < z1; z += .42) { b.box(.025, .06, .36, [xf - depth + .02, y + fh - .1, z], WOOD2); }        // carved fascia
    for (let z = z0 + .07; z < z1; z += .07) b.box(.012, .14, .012, [xf - depth + .02, y + .15, z], WOOD);              // balusters
  }
}
export type Building = { mesh: T.Mesh; inner?: T.Mesh; name: string };
export function palaceComplex(env: T.Texture | null) {
  const grp = new T.Group(); const out: Record<string, T.Object3D> = {};
  const g0 = .3;   // forecourt ground level
  const mk = (name: string, b: Builder, win: { w: number; fh: number; base: number; top: number } | null, holes = true, inner?: [number, number, number, number, number]) => {
    const mesh = b.mesh(damageMat({ holes, win: win ?? undefined, env })); mesh.name = name; grp.add(mesh); out[name] = mesh;
    if (inner) { const [x0, x1, z0, z1, h] = inner; const ib = new Builder(); ib.box(x1 - x0, h, z1 - z0, [(x0 + x1) / 2, g0 + h / 2, (z0 + z1) / 2], '#2b211b'); const im = ib.mesh(damageMat({})); im.castShadow = false; grp.add(im); }
    return mesh;
  };
  // Beit al-Hukm — Sultan's palace (target), facade on x = 4
  { const b = new Builder(); const x0 = 4, x1 = 10, z0 = -3, z1 = 5, h = 1.6;
    b.box(x1 - x0, h, z1 - z0, [(x0 + x1) / 2, g0 + h / 2, (z0 + z1) / 2], PLASTER);
    b.box(x1 - x0 + .1, .07, z1 - z0 + .1, [(x0 + x1) / 2, g0 + h, (z0 + z1) / 2], PLASTER2);
    crenels(b, x0, x1, z0, z1, g0 + h, PLASTER);
    b.box(1.6, .7, 1.6, [6.4, g0 + h + .35, 1], PLASTER); crenels(b, 5.6, 7.2, .2, 1.8, g0 + h + .7, PLASTER, .22, .1);   // central tower
    veranda(b, x0, z0 + .3, z1 - .3, g0 + .52, .52, 2, .55);
    b.box(.2, .5, .9, [x0 - .02, g0 + .25, 1], '#4a2c18');   // great door
    b.box(1.0, .08, 1.9, [x0 - 1.05, g0 + .04, 1], '#ddd2bb'); b.box(.9, .04, 1.7, [x0 - 1.05, g0 + .1, 1], '#e9e0cc');   // dais before the great door
    mk('palace', b, { w: .42, fh: .52, base: g0, top: g0 + h + .7 - .08 }, true, [x0 + .08, x1 - .08, z0 + .08, z1 - .08, h - .1]);
  }
  // Beit al-Sahel — harem (target), north of palace
  { const b = new Builder(); const x0 = 4.2, x1 = 9.5, z0 = -14, z1 = -6.6, h = 1.5;
    b.box(x1 - x0, h, z1 - z0, [(x0 + x1) / 2, g0 + h / 2, (z0 + z1) / 2], PLASTER2); crenels(b, x0, x1, z0, z1, g0 + h, PLASTER2);
    veranda(b, x0, z0 + .3, z1 - .3, g0 + .5, .5, 2, .5);
    mk('harem', b, { w: .42, fh: .5, base: g0, top: g0 + h - .1 }, true, [x0 + .08, x1 - .08, z0 + .08, z1 - .08, h - .1]);
  }
  // Beit al-Ajaib — House of Wonders with clock tower
  { const b = new Builder(); const x0 = 4.6, x1 = 10.6, z0 = 7, z1 = 13, h = 2.0;
    b.box(x1 - x0 - .8, h, z1 - z0 - .8, [(x0 + x1) / 2, g0 + h / 2, (z0 + z1) / 2], '#f2eee6');
    for (let f = 0; f < 4; f++) { const y = g0 + f * .5; b.box(x1 - x0 + .1, .05, z1 - z0 + .1, [(x0 + x1) / 2, y + .5, (z0 + z1) / 2], '#e9e4da');
      for (let t = 0; t <= 12; t++) { const k = t / 12; for (const [x, z] of [[x0, z0 + (z1 - z0) * k], [x1, z0 + (z1 - z0) * k], [x0 + (x1 - x0) * k, z0], [x0 + (x1 - x0) * k, z1]]) b.box(.05, .5, .05, [x, y + .25, z], '#f4f2ee'); }
      b.box(.03, .12, z1 - z0, [x0, y + .1, (z0 + z1) / 2], '#5b6a6e'); }
    b.box(.9, 1.2, .9, [7.6, g0 + h + .6, 10], '#f2eee6'); b.add(new T.ConeGeometry(.7, .5, 4), M([7.6, g0 + h + 1.45, 10], [0, Math.PI / 4, 0]), '#9a4a2a');
    mk('wonders', b, { w: .5, fh: .5, base: g0, top: g0 + h + 1.1 }, true, [x0 + .5, x1 - .5, z0 + .5, z1 - .5, h - .1]);
  }
  // Old Fort (Ngome Kongwe)
  { const b = new Builder(); const x0 = 5.4, x1 = 13, z0 = 15.5, z1 = 23, h = .85, t = .32;
    b.box(x1 - x0, h, t, [(x0 + x1) / 2, g0 + h / 2, z0], STONE); b.box(x1 - x0, h, t, [(x0 + x1) / 2, g0 + h / 2, z1], STONE);
    b.box(t, h, z1 - z0, [x0, g0 + h / 2, (z0 + z1) / 2], STONE); b.box(t, h, z1 - z0, [x1, g0 + h / 2, (z0 + z1) / 2], STONE);
    crenels(b, x0 - t / 2, x1 + t / 2, z0 - t / 2, z0 + t / 2, g0 + h, STONE, .3, .14); crenels(b, x0 - t / 2, x1 + t / 2, z1 - t / 2, z1 + t / 2, g0 + h, STONE, .3, .14);
    crenels(b, x0 - t / 2, x0 + t / 2, z0, z1, g0 + h, STONE, .3, .14); crenels(b, x1 - t / 2, x1 + t / 2, z0, z1, g0 + h, STONE, .3, .14);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { b.cyl(.62, .66, 1.2, [x, g0 + .6, z], STONE, 20); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.box(.16, .2, .16, [x + Math.cos(a) * .55, g0 + 1.3, z + Math.sin(a) * .55], STONE, [0, -a, 0]); } }
    b.box(.4, .6, .9, [x0 - .1, g0 + .3, 19.2], '#5a3a22');
    mk('fort', b, null, false);
  }
  // customs shed + landing pier
  { const b = new Builder(); b.box(3.2, .45, 1.3, [4.6, g0 + .22, -5.2], '#e3d6bb'); b.add(prism(3.3, .35, 1.45), M([4.6, g0 + .45, -5.2]), '#8b3f2c');
    const pz = -4.8; b.box(9, .08, .7, [-1.5, .22, pz], '#7b5a3a'); for (let x = -5.8; x < 2.6; x += .7) for (const s of [-1, 1]) b.cyl(.05, .05, 1.5, [x, -.45, pz + s * .3], '#4d3826', 6);
    mk('customs', b, null, false);
  }
  // seawall along the palace front
  { const b = new Builder(); for (let z = -16; z < 15; z += 1) { const x = shoreX(z + .5) + 2.1; b.box(.35, .5, 1.02, [x, .2, z + .5], '#cdb994'); } mk('seawall', b, null, false); }
  // lighthouse (separate pivot so it can topple)
  const lh = new T.Group(); lh.position.set(2.6, g0, 10); lh.name = 'lighthouse';
  { const b = new Builder(); b.cyl(.24, .34, 2.6, [0, 1.3, 0], '#f3efe6', 8); for (let i = 1; i < 6; i++) b.cyl(.35 - i * .019, .35 - i * .019, .04, [0, i * .45, 0], '#d8cdb8', 8);
    b.cyl(.36, .36, .06, [0, 2.62, 0], '#3a3a3a', 16); b.cyl(.2, .2, .32, [0, 2.8, 0], '#f6e9b8', 12); b.add(new T.ConeGeometry(.25, .22, 12), M([0, 3.07, 0]), '#a0362a');
    const mesh = b.mesh(damageMat({ holes: false, win: { w: .3, fh: .45, base: 0, top: 2.3 }, env })); lh.add(mesh); }
  grp.add(lh); out.lighthouse = lh;
  // flagpoles: palace tower pole (pivot at base for the fall)
  const pole = new T.Group(); pole.position.set(6.4, g0 + 2.3, 1); pole.name = 'palaceFlag';
  { const m = new T.Mesh(new T.CylinderGeometry(.025, .035, 1.6, 8), new T.MeshStandardMaterial({ color: '#d9d2c2', roughness: .6 })); m.position.y = .8; m.castShadow = true; pole.add(m);
    const ball = new T.Mesh(new T.SphereGeometry(.05, 10, 8), new T.MeshStandardMaterial({ color: '#d4a63a', metalness: 1, roughness: .3 })); ball.position.y = 1.62; pole.add(ball); }
  grp.add(pole); out.palaceFlag = pole;
  // old cannons on the forecourt + field gun
  const cannons: T.Group[] = [];
  for (const [x, z, field] of [[.85, -2.0, 0], [.85, -.4, 0], [.85, 2.6, 0], [1.0, 6.9, 1]] as const) { const c = cannon(!!field); c.position.set(x, groundH(x, z), z); c.rotation.y = Math.PI / 2; grp.add(c); cannons.push(c); }
  return { grp, out, cannons };
}
function prism(w: number, h: number, d: number) { const s = new T.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0); return g; }
/** Muzzle-loading cannon on a wooden carriage (barrel points along -z locally). */
export function cannon(field = false) {
  const g = new T.Group(); const b = new Builder(); const s = .55;
  b.box(.28 * s, .16 * s, .7 * s, [0, .2 * s, .05 * s], '#6a4428');
  for (const x of [-.18, .18]) b.add(new T.CylinderGeometry(.22 * s, .22 * s, .05 * s, 14), M([x * s, .22 * s, (field ? -.05 : -.15) * s], [0, 0, Math.PI / 2]), field ? '#5a3a22' : '#4b3221');
  if (field) for (const x of [-.18, .18]) for (let i = 0; i < 8; i++) b.box(.02 * s, .38 * s, .03 * s, [x * s, .22 * s, -.05 * s], '#3b2716', [i / 8 * Math.PI, 0, 0]);
  const base = b.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); g.add(base);
  const barrel = new T.Mesh(new T.CylinderGeometry(.06 * s, .1 * s, .85 * s, 14), new T.MeshStandardMaterial({ color: field ? '#9a7b3c' : '#2e2f31', metalness: .8, roughness: .4 }));
  barrel.rotation.x = Math.PI / 2 - .08; barrel.position.set(0, .38 * s, -.1 * s); barrel.castShadow = true; g.add(barrel); g.userData.barrel = barrel; g.userData.muzzle = new T.Vector3(0, .41 * s, -.53 * s);
  return g;
}

// ---------- vegetation + small craft -----------------------------------------------------------------------
export function palms(env: T.Texture | null) {
  const pb = new Builder(); let x = 0, y = 0;
  for (let i = 0; i < 8; i++) { const r = .07 - i * .004; pb.cyl(r * .92, r, .2, [x, y + .1, 0], i % 2 ? '#8a7356' : '#7c664c', 7); x += .012 * i; y += .2; }
  for (let f = 0; f < 9; f++) { const a = f / 9 * Math.PI * 2; const len = .75; const leaf = new T.PlaneGeometry(len, .2, 6, 1); const pp = leaf.getAttribute('position');
    for (let i = 0; i < pp.count; i++) { const u = pp.getX(i) / len + .5; pp.setY(i, pp.getY(i) * (1 - u * .7)); pp.setZ(i, -u * u * .35 + Math.abs(pp.getY(i)) * .4); }
    leaf.computeVertexNormals(); pb.add(leaf, new T.Matrix4().compose(new T.Vector3(x + Math.cos(a) * len * .45, y + .02, Math.sin(a) * len * .45), new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2 - .1, 0, -a, 'YXZ')).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), 0)), new T.Vector3(1, 1, 1)), f % 2 ? '#4e8a32' : '#3f7a2a');
  }
  const geo = pb.geo(); const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: T.DoubleSide, envMap: env, envMapIntensity: .3 });
  const R = rng(5); const pts: V3[] = [];
  for (let i = 0; i < 520 && pts.length < 170; i++) { const z = -40 + R() * 100; const d = 1.2 + R() * R() * 38; const x = shoreX(z) + d;
    if (KEEP_OUT.some(k => x > k[0] - 1 && x < k[1] && z > k[2] && z < k[3]) && !(d < 2.6 && (z < -15 || z > 14))) continue; if (d > 2.6 && R() < .55) continue; pts.push([x, groundH(x, z), z]); }
  const im = new T.InstancedMesh(geo, mat, pts.length); const m = new T.Matrix4();
  pts.forEach((p, i) => { const s = .8 + R() * .7; m.compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler((R() - .5) * .25, R() * 6.28, (R() - .5) * .25)), new T.Vector3(s, s * (.9 + R() * .4), s)); im.setMatrixAt(i, m); });
  im.castShadow = true; im.receiveShadow = true;
  // broadleaf trees inland
  const tb = new Builder(); tb.cyl(.05, .07, .4, [0, .2, 0], '#6b5038', 6);
  for (const [x, y, z, r] of [[0, .55, 0, .32], [.18, .48, .1, .24], [-.17, .5, -.08, .25], [.02, .7, -.12, .22]]) tb.add(new T.IcosahedronGeometry(r, 1), M([x, y, z]), '#3f6f2c');
  const tg = tb.geo(); const tm = new T.InstancedMesh(tg, new T.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true }), 260); let n = 0;
  for (let i = 0; i < 900 && n < 260; i++) { const z = -45 + R() * 110, d = 8 + R() * 60, x = shoreX(z) + d; if (d < 44 && R() < .8) continue; const s = 1 + R() * 1.4;
    m.compose(new T.Vector3(x, groundH(x, z), z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), R() * 6), new T.Vector3(s, s, s)); tm.setMatrixAt(n++, m); }
  tm.count = n; tm.castShadow = true; tm.receiveShadow = true;
  const g = new T.Group(); g.add(im, tm); return g;
}
export function dhows() {
  const b = new Builder(); b.add(hullGeo(1.3, .34, .14, .12, { top: '#7a5434', bottom: '#5a3c26', bowRise: .12 }), new T.Matrix4(), '#ffffff');
  b.cyl(.015, .02, 1.0, [0, .55, -.15], '#5a3e28', 6);
  const sail = new T.BufferGeometry(); sail.setAttribute('position', new T.Float32BufferAttribute([0, 1.05, -.75, 0, .2, .55, 0, .28, -.2], 3)); sail.computeVertexNormals(); b.add(sail, M([.02, 0, 0], [0, .25, 0]), '#efe4cc');
  const g = b.geo(); const im = new T.InstancedMesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, side: T.DoubleSide }), 14);
  const spots: [number, number, number][] = [[-6, -20, .4], [-4, -16, 1.2], [-8, -26, 2], [-3.5, 19, -1], [-6, 23, .4], [-3, -27, 2.4], [-9, 32, .6], [-2, 30, 1.6], [-16, -24, .3], [-5, 36, .9], [-2.2, -9, 3], [-1.6, 15.5, 1.1], [-20, 38, .5], [-11, -32, 2.2]];
  spots.forEach(([x, z, a], i) => im.setMatrixAt(i, M([x, 0, z], [0, a, 0], [1.2, 1.2, 1.2])));
  im.castShadow = true; im.userData.spots = spots; return im;
}

// ---------- ships ----------------------------------------------------------------------------------------------
/** Lofted ship hull, bow toward -z, waterline at y = 0. */
export function hullGeo(L: number, B: number, fb: number, dr: number, o: { top: string; bottom: string; stripe?: string; bowRise?: number; clipper?: boolean }) {
  const N = 30, K = 8; const pos: number[] = [], col: number[] = [], idx: number[] = [];
  const top = new T.Color(o.top), bot = new T.Color(o.bottom), stp = new T.Color(o.stripe ?? o.top), boot = new T.Color('#f2f0ea');
  const W = (s: number) => B / 2 * (s < .12 ? .72 + .28 * Math.sin(s / .12 * Math.PI / 2) : s > .55 ? Math.pow(Math.max(0, 1 - ((s - .55) / .45) ** 2), .62) : 1);
  const TOP = (s: number) => fb + (o.bowRise ?? fb * .25) * ss(.7, 1, s) + fb * .08 * ss(.2, 0, s);
  for (let i = 0; i <= N; i++) {
    const s = i / N; const z = L / 2 - s * L + (o.clipper ? -ss(.85, 1, s) * L * .06 : 0); const w = Math.max(W(s), .002), tp = TOP(s), d = dr * (1 - .4 * ss(.8, 1, s)) * (s < .05 ? .7 : 1);
    for (let side = -1; side <= 1; side += 2) for (let k = 0; k <= K; k++) {
      const t = k / K; const x = side * w * (1 - Math.pow(t, 3.2)); const y = tp - (tp + d) * Math.pow(t, .8);
      pos.push(x, y, z); const c = y > .045 ? (y > tp - .05 && o.stripe ? stp : top) : y > -.01 ? boot : bot; col.push(c.r, c.g, c.b);
    }
  }
  const R = 2 * (K + 1);
  for (let i = 0; i < N; i++) for (let side = 0; side < 2; side++) for (let k = 0; k < K; k++) {
    const a = i * R + side * (K + 1) + k, b = a + 1, c = a + R, d = c + 1; if (side === 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  // deck
  const base = pos.length / 3; const deck = new T.Color('#b48a5a');
  for (let i = 0; i <= N; i++) { const s = i / N, z = L / 2 - s * L + (o.clipper ? -ss(.85, 1, s) * L * .06 : 0), w = Math.max(W(s), .002) * .97, tp = TOP(s) - .015; pos.push(-w, tp, z, w, tp, z); col.push(deck.r, deck.g, deck.b, deck.r, deck.g, deck.b); }
  for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  // transom
  const tb = 0; for (let k = 0; k < K; k++) { idx.push(tb + k, tb + K + 1 + k, tb + k + 1, tb + k + 1, tb + K + 1 + k, tb + K + 2 + k); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export type ShipSpec = { id: string; name: string; L: number; B: number; fb: number; dr: number; white?: boolean; funnels: number[]; masts: number[]; guns: { z: number; big?: boolean; side?: number }[]; deckhouse: [number, number, number][]; flag: 'ensign' | 'red'; jack?: boolean; clipper?: boolean; rig?: boolean; pos: V3; yaw: number };
export const SHIPS: ShipSpec[] = [
  { id: 'stgeorge', name: 'HMS ST GEORGE', L: 11.3, B: 1.8, fb: .62, dr: .72, funnels: [-.6, 1.3], masts: [-3.3, 3.5], guns: [{ z: -4.4, big: true, side: 0 }, { z: 4.3, big: true, side: 0 }, { z: -2.1 }, { z: -.2 }, { z: 1.9 }, { z: 2.9 }], deckhouse: [[-2.6, 1.3, .38], [.3, 3.2, .3], [3.3, 1.1, .3]], flag: 'ensign', jack: true, pos: [-36, 0, -16], yaw: .06 },
  { id: 'philomel', name: 'HMS PHILOMEL', L: 8.4, B: 1.25, fb: .5, dr: .55, funnels: [-.4, .9], masts: [-2.6, 2.7], guns: [{ z: -3.2, side: 0 }, { z: -1.2 }, { z: .5 }, { z: 2.2 }, { z: 3.3, side: 0 }], deckhouse: [[-2, 1, .3], [.2, 2.4, .26]], flag: 'ensign', jack: true, pos: [-27, 0, 27], yaw: -.1 },
  { id: 'racoon', name: 'HMS RACOON', L: 7.0, B: 1.1, fb: .45, dr: .5, funnels: [-.3, .5], masts: [-2.2, 2.3], guns: [{ z: -2.6, side: 0 }, { z: -1 }, { z: .9 }, { z: 2.6, side: 0 }], deckhouse: [[-1.6, .9, .28], [.1, 1.8, .24]], flag: 'ensign', jack: true, pos: [-24, 0, 11], yaw: -.05 },
  { id: 'thrush', name: 'HMS THRUSH', L: 5.5, B: .9, fb: .38, dr: .4, funnels: [.1], masts: [-1.8, -.2, 1.7], guns: [{ z: -1.9, side: 0 }, { z: -.9 }, { z: .9 }, { z: 2, side: 0 }], deckhouse: [[-.8, .7, .22], [.9, .8, .2]], flag: 'ensign', jack: true, rig: true, pos: [-12, 0, -1], yaw: .04 },
  { id: 'sparrow', name: 'HMS SPARROW', L: 5.5, B: .9, fb: .38, dr: .4, funnels: [.1], masts: [-1.8, -.2, 1.7], guns: [{ z: -1.9, side: 0 }, { z: -.9 }, { z: .9 }, { z: 2, side: 0 }], deckhouse: [[-.8, .7, .22], [.9, .8, .2]], flag: 'ensign', jack: true, rig: true, pos: [-13, 0, 8], yaw: -.03 },
  { id: 'glasgow', name: 'GLASGOW', L: 6.4, B: 1.0, fb: .45, dr: .45, white: true, funnels: [.2], masts: [-1.9, 1.8], guns: [{ z: -1.6 }, { z: -.5 }, { z: .6 }, { z: 1.7 }], deckhouse: [[-.6, 1.6, .26], [1.6, .9, .22]], flag: 'red', clipper: true, rig: true, pos: [-20, 0, -8], yaw: -.08 },
];
export const FLAG_U = { uT: { value: 0 } };
export function flagMesh(kind: 'union' | 'ensign' | 'red', w: number) {
  const g = new T.PlaneGeometry(w, w / 2, 16, 6); g.translate(w / 2, 0, 0);
  const m = new T.ShaderMaterial({ side: T.DoubleSide, uniforms: { map: { value: flagTex(kind, 256) }, uT: FLAG_U.uT, sunDir: WATER.sunDir, ph: { value: Math.random() * 6 } },
    vertexShader: `uniform float uT, ph; varying vec2 vUv; varying float vS; void main(){ vUv = uv; vec3 p = position; float k = p.x / ${w.toFixed(3)};
      float wv = sin(p.x * ${(14 / w).toFixed(3)} - uT * 7. + ph) * .09 * ${w.toFixed(3)} * k + sin(p.x * ${(5 / w).toFixed(3)} - uT * 3.1 + p.y * 3.) * .05 * ${w.toFixed(3)} * k;
      p.z += wv; p.y -= k * k * .06 * ${w.toFixed(3)}; vS = cos(p.x * ${(14 / w).toFixed(3)} - uT * 7. + ph); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vS; void main(){ vec3 c = pow(texture2D(map, vUv).rgb, vec3(2.2)); c *= .78 + .3 * vS; gl_FragColor = vec4(c * 1.2, 1.); }' });
  const mesh = new T.Mesh(g, m); mesh.castShadow = false; return mesh;
}
export type Gun = { obj: T.Object3D; barrel: T.Object3D; muzzle: T.Vector3; big: boolean };
export class Ship {
  group = new T.Group(); hull: T.Group = new T.Group(); guns: Gun[] = []; funnelTops: T.Vector3[] = []; flags: T.Mesh[] = []; mats: T.Material[] = [];
  constructor(public s: ShipSpec, env: T.Texture | null) {
    const top = s.white ? '#f1efe8' : '#17191d', bottom = s.white ? '#2e5a3a' : '#6e2a20', buff = '#c9a45e', white = '#ecebe3';
    const hm = damageMat({ rough: .55, env, holes: false }); this.mats.push(hm);
    const hull = new T.Mesh(hullGeo(s.L, s.B, s.fb, s.dr, { top, bottom, stripe: s.white ? '#c9a13c' : undefined, clipper: s.clipper, bowRise: s.fb * .3 }), hm); hull.castShadow = true; hull.receiveShadow = true; this.hull.add(hull);
    const b = new Builder(); const dk = s.fb;
    for (const [z, l, h] of s.deckhouse) { b.box(s.B * .5, h, l, [0, dk + h / 2, z], white); b.box(s.B * .56, .03, l + .06, [0, dk + h + .015, z], '#b9b3a4'); }
    b.box(s.B * .7, .05, .55, [0, dk + s.deckhouse[0][2] + .2, s.deckhouse[0][0] - .1], '#b9a07a'); for (const sd of [-1, 1]) for (const zz of [-.35, .15]) b.box(.04, .2, .04, [sd * s.B * .33, dk + s.deckhouse[0][2] + .1, s.deckhouse[0][0] + zz], white);   // bridge wings
    for (const z of s.funnels) { const fh = s.L * .085 + .25, fr = s.B * .13; b.cyl(fr, fr * 1.05, fh, [0, dk + fh / 2, z], buff, 16); b.cyl(fr * 1.04, fr * 1.04, fh * .14, [0, dk + fh * .93, z], '#151515', 16); this.funnelTops.push(new T.Vector3(0, dk + fh, z)); }
    for (const z of s.masts) { const mh = s.L * .32 + .6; b.cyl(.025, .045, mh, [0, dk + mh / 2, z], s.white ? '#c8a467' : buff, 8);
      b.cyl(.015, .015, s.B * (s.rig ? 1.4 : .9), [0, dk + mh * .72, z], '#6b5338', 6, [0, 0, Math.PI / 2]); if (s.rig) { b.cyl(.012, .012, s.B * 1.1, [0, dk + mh * .9, z], '#6b5338', 6, [0, 0, Math.PI / 2]); b.cyl(.045, .045, s.B * 1.2, [0, dk + mh * .72 + .04, z], '#e8e1cf', 8, [0, 0, Math.PI / 2]); }
      else b.cyl(.13, .1, .1, [0, dk + mh * .6, z], white, 12); }
    for (const z of [-s.L * .3, s.L * .25]) for (const sd of [-1, 1]) b.add(hullGeo(.6, .2, .08, .06, { top: '#f4f2ea', bottom: '#f4f2ea' }), M([sd * s.B * .5, dk + .2, z]), '#fff');   // boats on davits
    if (s.clipper) b.cyl(.02, .03, 1.1, [0, dk + .25, -s.L / 2 - .5], '#c8a467', 6, [Math.PI / 2 - .2, 0, 0]);
    const sup = b.mesh(damageMat({ env, rough: .6 })); this.mats.push(sup.material as T.Material); this.hull.add(sup);
    // rigging lines
    const lp: number[] = []; for (const z of s.masts) { const mh = s.L * .32 + .6; for (const sd of [-1, 1]) { lp.push(0, dk + mh * .95, z, sd * s.B * .5, dk + .02, z + .25, 0, dk + mh * .95, z, sd * s.B * .5, dk + .02, z - .3); } }
    if (s.masts.length > 1) for (let i = 0; i < s.masts.length - 1; i++) { const mh = s.L * .32 + .6; lp.push(0, dk + mh * .95, s.masts[i], 0, dk + mh * .95, s.masts[i + 1]); }
    lp.push(0, dk + (s.L * .32 + .6) * .95, s.masts[0], 0, dk + .1, -s.L / 2 - (s.clipper ? .9 : 0), 0, dk + (s.L * .32 + .6) * .95, s.masts[s.masts.length - 1], 0, dk + .3, s.L / 2);
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); this.hull.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: '#2b2622', transparent: true, opacity: .75 })));
    // guns (starboard = +x = toward the shore)
    for (const gd of s.guns) {
      const o = new T.Group(); const side = gd.side ?? 1; const big = !!gd.big; const sc = big ? 1.5 : 1;
      o.position.set(side === 0 ? 0 : s.B * .38, dk + .02, gd.z);
      const sh = new T.Mesh(new T.BoxGeometry(.22 * sc, .17 * sc, .24 * sc), new T.MeshStandardMaterial({ color: s.white ? '#e9e5da' : '#d9d6cc', roughness: .5 })); sh.position.y = .1 * sc; sh.castShadow = true;
      const barrel = new T.Group(); const bm = new T.Mesh(new T.CylinderGeometry(.03 * sc, .045 * sc, .55 * sc, 12), new T.MeshStandardMaterial({ color: '#2b2d30', metalness: .7, roughness: .35 })); bm.rotation.z = -Math.PI / 2; bm.position.x = .3 * sc; bm.castShadow = true; barrel.add(bm); barrel.position.y = .13 * sc;
      o.add(sh, barrel); o.rotation.y = 0; this.hull.add(o);
      this.guns.push({ obj: o, barrel, muzzle: new T.Vector3(.6 * sc, 0, 0), big });
    }
    // ensign at stern, jack at bow
    const fs = s.L * .05 + .18; const staff = new T.Mesh(new T.CylinderGeometry(.012, .015, fs * 1.3, 6), new T.MeshStandardMaterial({ color: '#d8d2c2' })); staff.position.set(0, dk + fs * .65, s.L / 2 - .05); this.hull.add(staff);
    const en = flagMesh(s.flag === 'red' ? 'red' : 'ensign', fs); en.position.set(0, dk + fs * 1.2, s.L / 2 - .05); en.rotation.y = -Math.PI / 2; this.hull.add(en); this.flags.push(en);
    const mt = flagMesh(s.flag === 'red' ? 'red' : 'ensign', fs * .8); mt.position.set(0, dk + s.L * .32 + .6, s.masts[s.masts.length - 1]); mt.rotation.y = -Math.PI / 2; this.hull.add(mt); this.flags.push(mt);
    if (s.jack) { const jk = flagMesh('union', fs * .6); jk.position.set(0, dk + .45, -s.L / 2 + .15); jk.rotation.y = -Math.PI / 2; this.hull.add(jk); this.flags.push(jk); }
    this.group.add(this.hull); this.group.position.set(...s.pos); this.group.rotation.y = s.yaw; this.group.name = s.id;
  }
  /** aim starboard guns at a world target; returns nothing. */
  aim(target: T.Vector3, k: number) {
    for (const g of this.guns) { const wp = g.obj.getWorldPosition(new T.Vector3()); const d = target.clone().sub(wp); const local = d.applyQuaternion(this.group.quaternion.clone().invert());
      const yaw = Math.atan2(-local.z, local.x); g.obj.rotation.y = yaw * k; const el = Math.atan2(local.y + local.length() * .02, Math.hypot(local.x, local.z)); g.barrel.rotation.z = el * k * .6 + .04 * k; }
  }
  muzzleWorld(i: number) { const g = this.guns[i]; g.barrel.updateWorldMatrix(true, false); return g.barrel.localToWorld(g.muzzle.clone()); }
}
