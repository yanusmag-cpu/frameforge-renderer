// YunoWorld v8 · "The ancient computer" — Antikythera mechanism. Four sets in one world:
//  SEA (0,0,0): seabed of the 1st-c. BC wreck — caustic sand, timber ribs, amphorae, toppled marble statue, bronze arm,
//               corroded lumps; 1900 sponge divers in canvas suits and copper helmets (3D rig), bubbles, surface shimmer.
//  ROOM (200,0,0): museum storeroom 1902 — work table, shelves of finds, window shafts, the split lump with a gear.
//  SCAN (300,0,0): dark scanner bay — the fragment with its crust turned translucent, gears glowing inside.
//  TERRACE (400,0,0): a Greek stone terrace at dusk with the reconstructed mechanism — bronze front dial, zodiac and
//               calendar rings, sun and moon pointers, moon-phase ball, crank, exploded gear train; sky with sun/moon/eclipse.
import * as T from 'three';
import { Core, rng, canvasTex, clamp, lerp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, brickTex, boxes, cyls, glowMat, rockify, type V7Frame } from '../../yw7/kit7.ts';

export type DiverState = { pos: V3; rotY?: number; walk?: number; armL?: number; armR?: number; bend?: number; hold?: boolean };
export type AntiFrame = V7Frame & {
  divers?: DiverState[]; lump?: { pos: V3; split?: number; scale?: number; rot?: V3; glow?: number; xray?: number };
  mech?: { show?: boolean; crank?: number; explode?: number; open?: number; rotY?: number; pos?: V3 };
  sky?: { sunAz?: number; sunEl?: number; moonAz?: number; moonEl?: number; dusk?: number; eclipse?: number };
  surface?: number; boat?: boolean; caust?: number; scan?: number; motes?: number; extra?: Light[];
};
export const SEA: V3 = [0, 0, 0], ROOM: V3 = [200, 0, 0], SCAN: V3 = [300, 0, 0], TERR: V3 = [400, 0, 0];
const bronze = () => new T.MeshStandardMaterial({ color: '#c8964e', metalness: .45, roughness: .38, envMapIntensity: 1.4 });
/** spur gear with trapezoid teeth and spoke windows */
export function gearGeo(r: number, teeth: number, th: number, spokes = 4) {
  const s = new T.Shape(); const tH = Math.min(.05, r * .09), n = teeth * 4;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, k = i % 4; const rr = k === 1 || k === 2 ? r + tH : r; const p = [Math.cos(a) * rr, Math.sin(a) * rr]; if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); }
  const hub = r * .16; const h0 = new T.Path(); h0.absarc(0, 0, r * .06, 0, Math.PI * 2, true); s.holes.push(h0);
  if (spokes && r > .08) for (let k = 0; k < spokes; k++) { const a0 = k / spokes * Math.PI * 2 + .22, a1 = (k + 1) / spokes * Math.PI * 2 - .22; const h = new T.Path(); h.absarc(0, 0, r * .8, a0, a1, false); h.lineTo(Math.cos(a1) * hub * 1.6, Math.sin(a1) * hub * 1.6); h.absarc(0, 0, hub * 1.6, a1, a0, true); s.holes.push(h); }
  return new T.ExtrudeGeometry(s, { depth: th, bevelEnabled: false, curveSegments: 6 });
}
const dialTex = () => canvasTex(1024, 1024, g => { const c = 512; g.fillStyle = '#9a7442'; g.fillRect(0, 0, 1024, 1024);
  const ring = (r0: number, r1: number, n: number, labels: string[], col: string) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(c, c, r0, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, r1, 0, 7); g.stroke();
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.lineWidth = 1.5; g.stroke(); }
    g.font = 'bold 26px serif'; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; labels.forEach((t, i) => { const a = (i + .5) / labels.length * Math.PI * 2; g.save(); g.translate(c + Math.cos(a) * (r0 + r1) / 2, c + Math.sin(a) * (r0 + r1) / 2); g.rotate(a + Math.PI / 2); g.fillText(t, 0, 0); g.restore(); }); };
  ring(470, 400, 365 / 5, ['ΘΩΘ', 'ΦΑΩΦΙ', 'ΑΘΥΡ', 'ΧΟΙΑΚ', 'ΤΥΒΙ', 'ΜΕΧΙΡ', 'ΦΑΜΕΝΩΘ', 'ΦΑΡΜΟΥΘΙ', 'ΠΑΧΩΝ', 'ΠΑΥΝΙ', 'ΕΠΙΦΙ', 'ΜΕΣΟΡΗ'], '#3a2410');
  ring(395, 320, 12 * 6, ['ΚΡΙΟΣ', 'ΤΑΥΡΟΣ', 'ΔΙΔΥΜΟΙ', 'ΚΑΡΚΙΝΟΣ', 'ΛΕΩΝ', 'ΠΑΡΘΕΝΟΣ', 'ΧΗΛΑΙ', 'ΣΚΟΡΠΙΟΣ', 'ΤΟΞΟΤΗΣ', 'ΑΙΓΟΚΕΡΩΣ', 'ΥΔΡΟΧΟΟΣ', 'ΙΧΘΥΕΣ'], '#3a2410');
  const R = rng(3); for (let i = 0; i < 1600; i++) { g.fillStyle = R() < .5 ? `rgba(60,90,60,${R() * .12})` : `rgba(255,230,170,${R() * .08})`; g.beginPath(); g.arc(R() * 1024, R() * 1024, 1 + R() * 7, 0, 7); g.fill(); }
  const gr = g.createRadialGradient(c, c, 0, c, c, 520); gr.addColorStop(0, 'rgba(255,240,200,.1)'); gr.addColorStop(1, 'rgba(40,24,8,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024); });
const crustTex = (seed: number) => canvasTex(512, 512, g => { const R = rng(seed); g.fillStyle = '#5a6a52'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const v = R(); g.fillStyle = v < .35 ? `rgba(40,60,44,${.3 + R() * .4})` : v < .7 ? `rgba(130,150,110,${R() * .4})` : `rgba(160,120,80,${R() * .3})`; g.beginPath(); g.ellipse(R() * 512, R() * 512, 2 + R() * 12, 2 + R() * 8, R() * 3, 0, 7); g.fill(); } });
class Diver { g = new T.Group(); armL = new T.Group(); armR = new T.Group(); legL = new T.Group(); legR = new T.Group(); torso = new T.Group();
  constructor(canvas: T.Material, copper: T.Material, lead: T.Material, glass: T.Material) {
    const cap = (r: number, l: number, m: T.Material) => { const x = new T.Mesh(new T.CapsuleGeometry(r, l, 6, 12), m); x.castShadow = true; return x; };
    this.torso.position.y = 1.05; this.g.add(this.torso); const body = cap(.27, .45, canvas); body.position.y = .3; this.torso.add(body);
    const belt = new T.Mesh(new T.TorusGeometry(.27, .04, 8, 20), lead); belt.rotation.x = Math.PI / 2; belt.position.y = .1; this.torso.add(belt);
    const corselet = new T.Mesh(new T.CylinderGeometry(.34, .36, .16, 20), copper); corselet.position.y = .74; this.torso.add(corselet);
    const helm = new T.Mesh(new T.SphereGeometry(.29, 28, 20), copper); helm.position.y = 1.0; helm.castShadow = true; this.torso.add(helm);
    for (const [a, s] of [[0, .13], [Math.PI / 2, .09], [-Math.PI / 2, .09]] as [number, number][]) { const port = new T.Mesh(new T.CylinderGeometry(s, s, .06, 20), glass); port.rotation.x = Math.PI / 2; port.rotation.y = a; port.position.set(Math.sin(a) * .27, 1.0, Math.cos(a) * .27); port.lookAt(new T.Vector3(Math.sin(a) * 2, 1.0, Math.cos(a) * 2)); port.rotateX(Math.PI / 2); this.torso.add(port);
      const rim = new T.Mesh(new T.TorusGeometry(s + .01, .018, 6, 20), copper); rim.position.copy(port.position); rim.lookAt(new T.Vector3(Math.sin(a) * 2, 1.0, Math.cos(a) * 2)); this.torso.add(rim); }
    const hose = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 1.1, -.25), new T.Vector3(0, 1.6, -.6), new T.Vector3(.3, 3.5, -1.2), new T.Vector3(.6, 9, -1)]), 24, .035, 6), new T.MeshStandardMaterial({ color: '#2a2622', roughness: .7 })); this.torso.add(hose);
    for (const [arm, s] of [[this.armL, -1], [this.armR, 1]] as [T.Group, number][]) { arm.position.set(s * .34, .62, 0); const u = cap(.1, .38, canvas); u.position.y = -.26; arm.add(u); const gl = cap(.08, .05, lead); gl.position.y = -.56; arm.add(gl); this.torso.add(arm); }
    for (const [leg, s] of [[this.legL, -1], [this.legR, 1]] as [T.Group, number][]) { leg.position.set(s * .13, 1.0, 0); const u = cap(.13, .55, canvas); u.position.y = -.42; leg.add(u); const boot = new T.Mesh(new T.BoxGeometry(.2, .16, .36), lead); boot.position.set(0, -.92, .06); boot.castShadow = true; leg.add(boot); this.g.add(leg); }
  }
  set(d: DiverState, t: number) { this.g.visible = true; this.g.position.set(...d.pos); this.g.rotation.y = d.rotY ?? 0; const w = d.walk ?? 0, ph = t * 2.2;
    this.legL.rotation.x = Math.sin(ph) * .35 * w; this.legR.rotation.x = -Math.sin(ph) * .35 * w; this.torso.rotation.x = (d.bend ?? 0) * .6 + Math.sin(ph * 2) * .02 * w; this.g.position.y += Math.abs(Math.sin(ph)) * .04 * w;
    this.armL.rotation.x = -(d.armL ?? Math.sin(ph) * .3 * w) ; this.armR.rotation.x = -(d.armR ?? -Math.sin(ph) * .3 * w); this.armL.rotation.z = -.15; this.armR.rotation.z = .15; }
}
export class AntiEngine extends Core {
  G = new T.Group(); divers: Diver[] = []; lump = new T.Group(); lumpA!: T.Mesh; lumpB!: T.Mesh; lumpGear!: T.Mesh; lumpCrust!: T.MeshStandardMaterial;
  mech = new T.Group(); mechFront!: T.Mesh; sunPtr = new T.Group(); moonPtr = new T.Group(); phase!: T.Mesh; crank = new T.Group(); gears: { m: T.Mesh; base: V3; ex: V3; ratio: number }[] = []; caseM: T.Mesh[] = [];
  sandU = { t: { value: 0 }, k: { value: 1 } }; surfU = { t: { value: 0 } }; skyU = { sun: { value: new T.Vector3(0, .3, -1) }, moon: { value: new T.Vector3(.3, .3, -1) }, dusk: { value: 0 }, ecl: { value: 0 } }; sky!: T.Mesh; boat = new T.Group(); surf!: T.Mesh; sunD!: T.Mesh; moonD!: T.Mesh; corona!: T.Mesh;
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#6a8aa8', '#3a3024'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G, R = rng(41);
    // ===== SEA =====
    const sg = new T.PlaneGeometry(140, 140, 140, 140); sg.rotateX(-Math.PI / 2); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, Math.sin(x * .35) * Math.cos(z * .3) * .12 + Math.sin(x * .07 + z * .05) * .6); } sg.computeVertexNormals(); }
    const sand = new T.Mesh(sg, new T.ShaderMaterial({ uniforms: { ...this.sandU, ...T.UniformsLib.fog }, fog: true,
      vertexShader: 'varying vec3 vW; varying vec3 vN;\n#include <fog_pars_vertex>\nvoid main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normal; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition; \n#include <fog_vertex>\n}',
      fragmentShader: 'uniform float t, k; varying vec3 vW; varying vec3 vN;\n#include <fog_pars_fragment>\nfloat h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); }' +
        'float cau(vec2 p){ vec2 q = p; float c = 0.; for(int i=0;i<3;i++){ q += vec2(sin(q.y*1.3 + t*.9), cos(q.x*1.1 - t*.7)) * .55; c += abs(sin(q.x*1.7) * sin(q.y*1.7)); } return pow(c/3., 2.5); }' +
        'void main(){ float g = n(vW.xz * 6.) * .5 + n(vW.xz * 1.3) * .5; vec3 c = mix(vec3(.55,.52,.42), vec3(.78,.74,.6), g); c *= .55 + .45 * max(dot(normalize(vN), vec3(0,1,0)), 0.); c *= .42; c += vec3(.4,.7,.8) * cau(vW.xz * .9) * .28 * k; c *= vec3(.6,.85,.9); gl_FragColor = vec4(c, 1.);\n#include <fog_fragment>\n}' }));
    sand.receiveShadow = true; G.add(sand);
    const timber = new T.MeshStandardMaterial({ map: woodTex('#6a6450', 31), roughness: 1 });
    const ribs: { p: V3; r: number; h: number; rot?: V3 }[] = []; for (let k = 0; k < 4; k++) { const z = -6.5 + k * 1.3; for (const s of [-1, 1]) ribs.push({ p: [s * (1.4 + Math.sin(k) * .1), .7, z], r: .09, h: 1.8, rot: [0, 0, s * (.5 + R() * .3)] }); }
    cyls(G, timber, ribs, 6); boxes(G, timber, [{ p: [0, .12, -1], s: [.3, .22, 12] }, ...Array.from({ length: 7 }, (_, i) => ({ p: [(R() - .5) * 3, .08, -5 + i * 1.6] as V3, s: [1.6 + R(), .06, .22] as V3, r: [0, R() * 3, 0] as V3 }))]);
    const pot = new T.MeshStandardMaterial({ color: '#a8643c', roughness: .85, map: crustTex(32) }); pot.color.set('#b87a52');
    const amph = new T.LatheGeometry([[.02, 0], [.08, .05], [.2, .3], [.24, .55], [.2, .8], [.08, .95], [.06, 1.15], [.08, 1.2]].map(([x, y]) => new T.Vector2(x, y)), 20);
    for (let i = 0; i < 14; i++) { const m = new T.Mesh(amph, pot); m.position.set((R() - .5) * 9, .15, -7 + R() * 12); if (Math.hypot(m.position.x - .6, m.position.z + .4) < 2.6) m.position.x -= 5; m.rotation.set(Math.PI / 2 * (R() < .7 ? 1 : 0) + (R() - .5) * .4, R() * 6, (R() - .5) * .4); m.castShadow = true; G.add(m); }
    const marble = new T.MeshStandardMaterial({ color: '#d8d2c4', roughness: .6, map: crustTex(33) }); marble.color.set('#e8e2d4');
    const statue = new T.Group(); statue.position.set(-2.8, .35, -3); statue.rotation.set(0, .6, Math.PI / 2 - .1); G.add(statue);
    [[0, .9, 0, .32, .55], [0, 1.65, 0, .16, .1], [-.38, 1.0, .05, .08, .45], [.12, .15, 0, .12, .6], [-.12, .1, .05, .12, .6]].forEach(([x, y, z, r, l]) => { const m = new T.Mesh(rockify(new T.CapsuleGeometry(r, l, 6, 12), .03, 6, x * 9), marble); m.position.set(x, y, z); m.castShadow = true; statue.add(m); });
    const arm = new T.Mesh(rockify(new T.CapsuleGeometry(.07, .7, 6, 10), .02, 8), new T.MeshStandardMaterial({ color: '#3a5a48', metalness: .5, roughness: .6 })); arm.position.set(2.2, .1, 1.2); arm.rotation.set(Math.PI / 2, 0, .8); arm.castShadow = true; G.add(arm);
    const lumps = new T.MeshStandardMaterial({ map: crustTex(34), roughness: .95 }); for (let i = 0; i < 6; i++) { const m = new T.Mesh(rockify(new T.IcosahedronGeometry(.18 + R() * .12, 3), .07, 5, i), lumps); m.position.set(1 + (R() - .5) * 3, .12, -1.5 + (R() - .5) * 3); m.castShadow = true; G.add(m); }
    const rocks = new T.MeshStandardMaterial({ color: '#4a5450', roughness: 1 }); for (let i = 0; i < 18; i++) { const m = new T.Mesh(rockify(new T.IcosahedronGeometry(1 + R() * 2.5, 3), .5, .6, i + 50), rocks); const a = R() * 6.28, d = 12 + R() * 22; m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 6); m.castShadow = true; G.add(m); }
    // weed tufts
    const weed: { p: V3; r: number; h: number; rot?: V3 }[] = []; for (let i = 0; i < 160; i++) { const x = (R() - .5) * 40, z = (R() - .5) * 40 - 4; if (Math.abs(x) < 3 && Math.abs(z + 1) < 7) continue; for (let k = 0; k < 3; k++) weed.push({ p: [x + (R() - .5) * .3, .25, z + (R() - .5) * .3], r: .015, h: .5 + R() * .4, rot: [(R() - .5) * .5, 0, (R() - .5) * .5] }); }
    cyls(G, new T.MeshStandardMaterial({ color: '#3a6a3a', roughness: .9 }), weed, 4, .2);
    const surf = new T.Mesh(new T.PlaneGeometry(400, 400), new T.ShaderMaterial({ side: T.DoubleSide, transparent: true, fog: false, uniforms: this.surfU, depthWrite: false,
      vertexShader: 'varying vec2 vU; void main(){ vU = (modelMatrix * vec4(position,1.)).xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float t; varying vec2 vU; void main(){ float r = sin(vU.x*.8 + t*1.3)*sin(vU.y*.7 - t) + sin(vU.x*.3 - vU.y*.4 + t*.6); float c = smoothstep(.6, 1.6, r); vec3 col = mix(vec3(.12,.42,.52), vec3(.55,.8,.85), c); gl_FragColor = vec4(col, .85); }' }));
    surf.rotation.x = Math.PI / 2; surf.position.y = 14; G.add(surf); this.surf = surf;
    const hull = new T.Mesh(new T.CapsuleGeometry(1.3, 6, 6, 12), new T.MeshBasicMaterial({ color: '#0a1a22', fog: false })); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, .5); this.boat.add(hull); this.boat.position.set(3, 14.8, -6); G.add(this.boat);
    const canvasM = new T.MeshStandardMaterial({ color: '#d8c8a4', roughness: .9 }), copper = new T.MeshStandardMaterial({ color: '#c8844c', metalness: .5, roughness: .32 }), lead = new T.MeshStandardMaterial({ color: '#4a4a4e', metalness: .5, roughness: .6 }), glass = new T.MeshStandardMaterial({ color: '#0e1a1e', metalness: .2, roughness: .05 });
    for (let i = 0; i < 2; i++) { const d = new Diver(canvasM, copper, lead, glass); G.add(d.g); this.divers.push(d); }
    // the lump (two halves + gear inside), reused at sea, in the room and in the scanner
    this.lumpCrust = new T.MeshStandardMaterial({ map: crustTex(36), roughness: .95, transparent: true }); const lg = rockify(new T.IcosahedronGeometry(.17, 4), .05, 7, 3);
    this.lumpA = new T.Mesh(lg, this.lumpCrust); this.lumpA.scale.set(1, .55, .9); this.lumpB = new T.Mesh(lg, this.lumpCrust); this.lumpB.scale.set(1, .5, .9); this.lumpA.castShadow = this.lumpB.castShadow = true;
    this.lumpGear = new T.Mesh(gearGeo(.11, 38, .012, 4), new T.MeshStandardMaterial({ color: '#7a8a5a', metalness: .6, roughness: .5, emissive: '#000' })); this.lumpGear.rotation.x = -Math.PI / 2; this.lumpGear.position.y = .0;
    const inner = new T.Group(); [[.0, .0, .11, 38], [.07, .03, .05, 15], [-.06, .05, .04, 12]].forEach(([x, z, r, n], i) => { const gm = i ? new T.Mesh(gearGeo(r, n, .01, 0), this.lumpGear.material) : this.lumpGear; gm.rotation.x = -Math.PI / 2; gm.position.set(x, i * .015, z); inner.add(gm); });
    this.lump.add(this.lumpA, this.lumpB, inner); inner.name = 'inner'; G.add(this.lump);
    // ===== ROOM (1902 storeroom) =====
    const rm = new T.Group(); rm.position.set(...ROOM); G.add(rm); const plaster = brickTex('#c8bca4', 37, '#b8ac94'); plaster.wrapS = plaster.wrapT = T.RepeatWrapping; plaster.repeat.set(3, 2);
    const pl = new T.MeshStandardMaterial({ map: plaster, roughness: .95 }); boxes(rm, pl, [{ p: [0, 2.5, -4], s: [12, 5, .2] }, { p: [-5, 2.5, 0], s: [.2, 5, 8] }, { p: [5, 2.5, 0], s: [.2, 5, 8] }, { p: [0, 5, 0], s: [12, .2, 8] }]);
    const floorT = woodTex('#6a5038', 38, 256, 1024); floorT.wrapS = floorT.wrapT = T.RepeatWrapping; floorT.repeat.set(6, 2); const fl = new T.Mesh(new T.PlaneGeometry(12, 8), new T.MeshStandardMaterial({ map: floorT, roughness: .7 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; rm.add(fl);
    const tw = new T.MeshStandardMaterial({ map: woodTex('#5a3e28', 39), roughness: .6 }); boxes(rm, tw, [{ p: [0, .9, 0], s: [2.4, .08, 1.1] }, ...[[-1.1, -.45], [1.1, -.45], [-1.1, .45], [1.1, .45]].map(([x, z]) => ({ p: [x, .45, z] as V3, s: [.08, .9, .08] as V3 }))]);
    boxes(rm, tw, [-4.7, 4.7].flatMap(x => [.6, 1.5, 2.4, 3.3].map(y => ({ p: [x, y, -1] as V3, s: [.5, .05, 5] as V3 }))));
    for (let i = 0; i < 26; i++) { const m = new T.Mesh(amph, pot); const s = .35 + R() * .3; m.scale.setScalar(s); const x = R() < .5 ? -4.7 : 4.7; m.position.set(x, [.62, 1.52, 2.42, 3.32][i % 4], -3.2 + R() * 4.5); m.castShadow = true; rm.add(m); }
    const win = new T.Mesh(new T.PlaneGeometry(1.8, 2.4), glowMat('#fff4dc')); win.position.set(-4.88, 2.8, 1.5); win.rotation.y = Math.PI / 2; rm.add(win);
    // ===== SCAN bay =====
    const sc = new T.Group(); sc.position.set(...SCAN); G.add(sc); boxes(sc, new T.MeshStandardMaterial({ color: '#14181e', roughness: .5, metalness: .3 }), [{ p: [0, 0, 0], s: [14, .1, 14] }, { p: [0, .5, 0], s: [1.2, 1, 1.2] }]);
    const ringM = new T.Mesh(new T.TorusGeometry(1.4, .22, 16, 48), new T.MeshStandardMaterial({ color: '#d8dce4', roughness: .4, metalness: .3 })); ringM.position.set(0, 1.4, 0); ringM.name = 'ring'; sc.add(ringM);
    const ringGlow = new T.Mesh(new T.TorusGeometry(1.18, .02, 8, 64), glowMat('#58c8ff')); ringGlow.position.copy(ringM.position); sc.add(ringGlow);
    // ===== TERRACE + MECHANISM =====
    const te = new T.Group(); te.position.set(...TERR); G.add(te); const lime = brickTex('#d8cdb4', 40, '#bfb399'); lime.wrapS = lime.wrapT = T.RepeatWrapping; lime.repeat.set(5, 5);
    const lm = new T.MeshStandardMaterial({ map: lime, roughness: .9 }); boxes(te, lm, [{ p: [0, -.25, 0], s: [30, .5, 30] }, { p: [0, .45, 0], s: [1.6, .9, 1.0] }, { p: [0, .93, 0], s: [1.8, .08, 1.2] }]);
    cyls(te, lm, [-6, -3, 3, 6].map(x => ({ p: [x, 3, -6] as V3, r: .45, h: 6 })), 20, .88); boxes(te, lm, [{ p: [0, 6.2, -6], s: [14.5, .5, 1.2] }]);
    const sea2 = new T.Mesh(new T.PlaneGeometry(2000, 2000), new T.MeshStandardMaterial({ color: '#2a4a6a', roughness: .15, metalness: .4 })); sea2.rotation.x = -Math.PI / 2; sea2.position.set(TERR[0], -30, -900); te.parent!.add(sea2);
    this.mech.position.set(TERR[0], .97, TERR[2]); G.add(this.mech);
    const cw = new T.MeshStandardMaterial({ map: woodTex('#6a4a2a', 42), roughness: .6 }); const bx = new T.Mesh(new T.BoxGeometry(.34, .18, .2), cw); bx.position.set(0, .09, -.06); bx.castShadow = true; this.mech.add(bx); this.caseM.push(bx);
    this.mechFront = new T.Mesh(new T.CircleGeometry(.082, 64), new T.MeshStandardMaterial({ map: dialTex(), metalness: .35, roughness: .45 })); this.mechFront.position.set(0, .1, .043); this.mech.add(this.mechFront);
    const plate = new T.Mesh(new T.BoxGeometry(.32, .19, .006), bronze()); plate.position.set(0, .095, .039); this.mech.add(plate);
    const sball = new T.Mesh(new T.SphereGeometry(.012, 16, 12), new T.MeshStandardMaterial({ color: '#ffcc40', metalness: .9, roughness: .2, emissive: '#a06010', emissiveIntensity: .4 })); sball.position.y = .062; this.sunPtr.add(sball);
    const sp = new T.Mesh(new T.BoxGeometry(.004, .075, .003), bronze()); sp.position.y = .038; this.sunPtr.add(sp); this.sunPtr.position.set(0, .1, .05); this.mech.add(this.sunPtr);
    this.phase = new T.Mesh(new T.SphereGeometry(.011, 16, 12), new T.ShaderMaterial({ uniforms: { ph: { value: 0 } }, vertexShader: 'varying vec3 vN; void main(){ vN = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform float ph; varying vec3 vN; void main(){ float s = step(0., vN.x * cos(ph) + vN.z * sin(ph)); gl_FragColor = vec4(mix(vec3(.05), vec3(.95,.93,.85), s), 1.); }' }));
    this.phase.position.y = .05; this.moonPtr.add(this.phase); const mp = new T.Mesh(new T.BoxGeometry(.003, .055, .003), new T.MeshStandardMaterial({ color: '#c8c8d0', metalness: .9, roughness: .2 })); mp.position.y = .027; this.moonPtr.add(mp); this.moonPtr.position.set(0, .1, .053); this.mech.add(this.moonPtr);
    const ck = new T.Mesh(new T.BoxGeometry(.012, .07, .012), bronze()); ck.position.y = .035; this.crank.add(ck); const kn = new T.Mesh(new T.CylinderGeometry(.008, .008, .04, 10), cw); kn.rotation.z = Math.PI / 2; kn.position.set(.02, .068, 0); this.crank.add(kn); this.crank.position.set(.175, .09, -.04); this.crank.rotation.y = Math.PI / 2; this.mech.add(this.crank);
    // gear train (inside the case; "explode" fans them out in front)
    const gl2 = [[0, .095, -.02, .085, 223], [.06, .05, -.035, .03, 38], [-.08, .07, -.045, .045, 64], [.09, .13, -.05, .035, 48], [-.05, .14, -.03, .028, 32], [.02, .03, -.06, .05, 96], [-.11, .04, -.07, .025, 24], [.12, .05, -.08, .04, 60], [-.02, .15, -.08, .02, 20], [.07, .15, -.1, .028, 40]];
    gl2.forEach(([x, y, z, r, n], i) => { const m = new T.Mesh(gearGeo(r, Math.min(n, 120), .009, r > .04 ? 4 : 0), bronze()); m.position.set(x, y, z); m.castShadow = true; this.mech.add(m); this.gears.push({ m, base: [x, y, z], ex: [x * 1.7, y + .01 + (i % 3) * .01, .1 + i * .022], ratio: (i % 2 ? -1 : 1) * 1.2 * .1 / r }); });
    // sky dome (dusk, sun, moon, eclipse)
    this.sky = new T.Mesh(new T.SphereGeometry(950, 32, 16), new T.ShaderMaterial({ side: T.BackSide, fog: false, depthWrite: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform vec3 sun, moon; uniform float dusk, ecl; varying vec3 vD; void main(){ float y = max(vD.y, 0.); vec3 s = normalize(sun), m = normalize(moon);' +
        'vec3 day = mix(vec3(.62,.7,.82), vec3(.22,.38,.66), pow(y,.5)); vec3 dk = mix(vec3(1.,.62,.36), vec3(.2,.22,.45), pow(y,.45)); vec3 c = mix(day, dk, dusk); c *= 1. - ecl * .75;' +
        'float sd = dot(vD, s); c += vec3(1.,.85,.6) * pow(max(sd,0.), 60.) * .6 * (1. - ecl * .8); float disk = smoothstep(.9988,.9992,sd); float md = dot(vD, m); float mdisk = smoothstep(.9988,.9992,md);' +
        'c = mix(c, vec3(4.,3.4,2.6), disk); c = mix(c, ecl > .5 ? vec3(.02) : vec3(.9,.9,.95) * (.4 + .6 * (1. - dusk * .3)), mdisk); c += vec3(1.,.95,.9) * smoothstep(.996,.9988,sd) * ecl * (1. - mdisk) * 1.2; c = mix(c * vec3(.42,.46,.55), c, max(disk, mdisk)); gl_FragColor = vec4(c, 1.); }' }));
    this.sky.renderOrder = -10; G.add(this.sky);
    this.sunD = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: '#fff2d0', toneMapped: false, fog: false, depthWrite: false })); this.sunD.renderOrder = -9;
    this.corona = new T.Mesh(new T.CircleGeometry(1, 48), new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: T.AdditiveBlending, uniforms: { a: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform float a; varying vec2 vU; void main(){ float r = length(vU); float g = smoothstep(1., .3, r) * smoothstep(.28, .36, r); gl_FragColor = vec4(vec3(1.,.95,.85) * g * a, 1.); }' })); this.corona.renderOrder = -8;
    this.moonD = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: '#d8dce8', fog: false, depthWrite: false })); this.moonD.renderOrder = -7; G.add(this.sunD, this.corona, this.moonD);
  }
  async render(F: AntiFrame, frame: number) {
    const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])]; const S: Sprite[] = [...(F.sprites ?? [])];
    this.sandU.t.value = F.t; this.sandU.k.value = F.caust ?? 1; this.surfU.t.value = F.t; this.boat.visible = !!F.boat; this.surf.visible = F.set === 'sea';
    this.divers.forEach((d, i) => { const s = F.divers?.[i]; d.g.visible = !!s; if (s) { d.set(s, F.t + i * 1.3);
      for (let k = 0; k < 4; k++) { const a = ((F.t * .7 + k / 4 + i * .3) % 1); S.push({ p: [s.pos[0] + Math.sin(F.t * 3 + k) * .06, s.pos[1] + 2.25 + a * 3.2, s.pos[2] - .2], s: .05 + a * .05, rot: 0, c: [.8, .95, 1], a: .55 * (1 - a), kind: 2, seed: k, age: a }); } } });
    const lp = F.lump; this.lump.visible = !!lp; if (lp) { this.lump.position.set(...lp.pos); this.lump.rotation.set(...(lp.rot ?? [0, 0, 0])); this.lump.scale.setScalar(lp.scale ?? 1); const sp = clamp(lp.split ?? 0);
      this.lumpA.position.set(-sp * .24, .02 + sp * .03, -sp * .04); this.lumpA.rotation.z = sp * 1.2; this.lumpB.position.set(sp * .2, -.02, sp * .03); this.lumpB.rotation.z = -sp * .7; (this.lump.getObjectByName('inner') as T.Group).position.y = sp * .04; this.lumpB.visible = true;
      const xr = clamp(lp.xray ?? 0); this.lumpCrust.opacity = 1 - xr * .82; this.lumpCrust.depthWrite = xr < .5; const gm = this.lumpGear.material as T.MeshStandardMaterial; gm.emissive.setRGB(.2 * xr + .3 * (lp.glow ?? 0), .6 * xr + .25 * (lp.glow ?? 0), .9 * xr + .1 * (lp.glow ?? 0));
      (this.lump.getObjectByName('inner') as T.Group).visible = sp > .05 || xr > .05; }
    const ring = this.G.getObjectByName('ring'); if (ring) ring.rotation.z = F.t * .4;
    const mc = F.mech; this.mech.visible = !!mc?.show; if (mc) { const c = mc.crank ?? 0, ex = clamp(mc.explode ?? 0); this.mech.rotation.y = mc.rotY ?? 0; if (mc.pos) this.mech.position.set(...mc.pos);
      this.crank.rotation.x = c * Math.PI * 2; this.sunPtr.rotation.z = -c * .35; this.moonPtr.rotation.z = -c * .35 * 13.37; (this.phase.material as T.ShaderMaterial).uniforms.ph.value = c * 2.2;
      this.gears.forEach((g, i) => { g.m.position.set(lerp(g.base[0], g.ex[0], ex), lerp(g.base[1], g.ex[1], ex), lerp(g.base[2], g.ex[2], ex)); g.m.rotation.z = c * g.ratio * 2 + i; });
      this.caseM.forEach(m => { m.visible = ex < .3; }); this.mechFront.visible = ex < .3; }
    const sk = F.sky ?? {}; const dir = (az: number, el: number) => new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    this.skyU.sun.value.copy(dir(sk.sunAz ?? 0, sk.sunEl ?? .25)); this.skyU.moon.value.copy(dir(sk.moonAz ?? .4, sk.moonEl ?? .3)); this.skyU.dusk.value = sk.dusk ?? .6; this.skyU.ecl.value = sk.eclipse ?? 0;
    if ((F.motes ?? 0) > 0) { const R = rng(7); for (let i = 0; i < 90; i++) { const p: V3 = [F.cam.pos[0] + (R() - .5) * 8, F.cam.pos[1] + (R() - .5) * 6 + Math.sin(F.t * .5 + i) * .1, F.cam.pos[2] - 1 - R() * 8]; S.push({ p, s: .02 + R() * .03, rot: 0, c: [.8, .95, 1], a: .35 * (F.motes ?? 0), kind: 2, seed: R(), age: 0 }); } }
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.sky.visible = F.set === 'terr';
    { const sd = this.skyU.sun.value, md = this.skyU.moon.value, cp = this.cam.position, e = this.skyU.ecl.value; const vis = F.set === 'terr';
      this.sunD.visible = this.moonD.visible = this.corona.visible = vis; this.sunD.position.copy(cp).addScaledVector(sd, 800); this.sunD.scale.setScalar(13); this.sunD.lookAt(cp);
      this.corona.position.copy(cp).addScaledVector(sd, 790); this.corona.scale.setScalar(40); this.corona.lookAt(cp); (this.corona.material as T.ShaderMaterial).uniforms.a.value = e;
      this.moonD.position.copy(cp).addScaledVector(md, 780); this.moonD.scale.setScalar(12.6); this.moonD.lookAt(cp); (this.moonD.material as T.MeshBasicMaterial).color.set(e > .5 ? '#06060a' : '#d8dce8'); } this.draw(F, frame);
  }
}
