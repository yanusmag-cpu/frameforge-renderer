// YunoWorld v8 · "The glass beehive" — Fresnel lighthouse lens. One world, three sets:
//  COAST (0,0,0): a stone lighthouse on a rocky headland (gallery, lantern room with glazing), keeper's cottage, reef rocks,
//         a Gerstner-wave sea (calm → storm), a two-masted brig with a stern lantern, volumetric rotating beam, rain/spray.
//  Inside the lantern room (tower top, y≈30): the first-order Fresnel lens — brass frame, refracting belt with 8 bull's-eye
//         panels, catadioptric prism rings above and below, the lamp — or the OLD lamp + polished reflector.
//  STUDY (200,0,0): Fresnel's 1820s study — desk, candle, papers, prisms, and the demo lens that MORPHS from a thick
//         convex lens into the stepped Fresnel profile, with light rays that bend into a parallel beam.
import * as T from 'three';
import { Core, rng, canvasTex, clamp, lerp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, brickTex, boxes, cyls, glowMat, rockify, type V7Frame } from '../../yw7/kit7.ts';

export type LightFrame = V7Frame & {
  storm?: number; night?: number; lens?: 'fresnel' | 'old' | 'none'; lensRot?: number; lamp?: number; beam?: number; beamLen?: number;
  ship?: { x: number; z: number; rot?: number; roll?: number; lantern?: number }; morph?: number; rays?: number; raysPar?: number; candle?: number; rain?: number; extra?: Light[];
};
export const TOWER: V3 = [0, 0, 0], LENS: V3 = [0, 31.2, 0], STUDY: V3 = [200, 0, 0];
const GLSL_N = 'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y); } float fb(vec2 p){ float v = 0., a = .5; for(int i=0;i<5;i++){ v += a*n(p); p *= 2.1; a *= .5; } return v; }';
export class LightEngine extends Core {
  G = new T.Group(); lensF = new T.Group(); lensOld = new T.Group(); lampG!: T.Mesh; beam = new T.Group(); beamU = { a: { value: 1 }, len: { value: 300 } }; ship = new T.Group(); shipLamp!: T.Mesh;
  seaU = { t: { value: 0 }, storm: { value: 0 }, night: { value: 1 }, fogC: { value: new T.Color('#1a2030') }, fogD: { value: 0 } }; skyU = { t: { value: 0 }, storm: { value: 0 }, night: { value: 1 } }; sky!: T.Mesh;
  demo!: T.Mesh; rays: T.Mesh[] = []; candle!: T.Mesh; winMat = glowMat('#ffb860');
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#5a6a8a', '#2a2a30'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G, R = rng(61);
    // sea (Gerstner swells + foam), seen from everywhere
    const sg = new T.PlaneGeometry(1600, 1600, 260, 260); sg.rotateX(-Math.PI / 2);
    const sea = new T.Mesh(sg, new T.ShaderMaterial({ uniforms: this.seaU,
      vertexShader: 'uniform float t, storm; varying vec3 vW; varying float vF; ' + GLSL_N + ' void main(){ vec3 p = (modelMatrix * vec4(position,1.)).xyz; float a = .25 + storm * 1.6; float f = 0.;' +
        'vec2 D[4]; D[0] = normalize(vec2(1.,.3)); D[1] = normalize(vec2(.6,1.)); D[2] = normalize(vec2(-.4,1.)); D[3] = normalize(vec2(1.,-.7)); float L[4]; L[0] = 38.; L[1] = 21.; L[2] = 11.; L[3] = 6.;' +
        'for(int i=0;i<4;i++){ float k = 6.283/L[i]; float w = sqrt(9.8*k); float ph = k*dot(D[i], p.xz) - w*t; float A = a * L[i]/38. * (i==0 ? 1. : .6); p.xz += D[i] * A * .6 * cos(ph); p.y += A * sin(ph); f += sin(ph); }' +
        'vF = f; vW = p; gl_Position = projectionMatrix * viewMatrix * vec4(p,1.); }',
      fragmentShader: 'uniform float t, storm, night, fogD; uniform vec3 fogC; varying vec3 vW; varying float vF; ' + GLSL_N + ' void main(){ vec3 nx = normalize(cross(dFdx(vW), dFdy(vW))); if (nx.y < 0.) nx = -nx; vec3 V = normalize(cameraPosition - vW);' +
        'float fr = pow(1. - max(dot(nx, V), 0.), 4.); vec3 deep = mix(vec3(.05,.16,.24), vec3(.02,.04,.07), night); vec3 skyc = mix(vec3(.55,.66,.78), vec3(.08,.1,.16), night); skyc = mix(skyc, vec3(.25,.27,.3) * (1. - night * .6), storm * .6);' +
        'vec3 c = mix(deep, skyc, .15 + fr * .7); float foam = smoothstep(1.9 - storm * .6, 2.8 - storm * .5, vF + fb(vW.xz * .15 + t * .05) * 1.2) * (.2 + storm * .6); c = mix(c, vec3(.85,.88,.9) * (1. - night * .65), clamp(foam, 0., 1.));' +
        'float d = length(cameraPosition - vW); c = mix(c, fogC, 1. - exp(-fogD * fogD * d * d)); gl_FragColor = vec4(c, 1.); }', extensions: { derivatives: true } as never }));
    sea.position.y = -.4; G.add(sea);
    this.sky = new T.Mesh(new T.SphereGeometry(1200, 32, 16), new T.ShaderMaterial({ side: T.BackSide, fog: false, depthWrite: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'uniform float t, storm, night; varying vec3 vD; ' + GLSL_N + ' void main(){ float y = max(vD.y, 0.); vec2 q = vD.xz / (vD.y + .12) * 1.3 + vec2(t * .02 * (1. + storm * 3.), 0.); float cl = smoothstep(.55 - storm * .4, .85, fb(q));' +
        'vec3 day = mix(vec3(.85,.72,.6), vec3(.42,.55,.75), pow(y,.5)); vec3 nig = mix(vec3(.08,.1,.16), vec3(.02,.03,.06), pow(y,.4)); vec3 c = mix(day, nig, night); c = mix(c, mix(vec3(.5,.52,.55), vec3(.05,.06,.08), night), cl * (.5 + storm * .5));' +
        'c += step(.997, h(floor(vD.xz * 400. / (vD.y + .2)))) * (1. - cl) * night * smoothstep(.05,.3,y) * .7; gl_FragColor = vec4(c, 1.); }' }));
    this.sky.renderOrder = -10; G.add(this.sky);
    // headland: big rocks + grass cap, reef
    const rockM = new T.MeshStandardMaterial({ map: canvasTex(512, 512, g => { const R2 = rng(62); g.fillStyle = '#4a4848'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 2500; i++) { const v = 40 + R2() * 70; g.fillStyle = `rgba(${v},${v},${v * 1.05},.5)`; g.fillRect(R2() * 512, R2() * 512, 2 + R2() * 10, 2 + R2() * 4); } }), roughness: .95 });
    const head = new T.Mesh(rockify(new T.SphereGeometry(16, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), 3.5, .12, 3), rockM); head.scale.set(1, .5, 1.1); head.position.set(0, -2, 0); head.receiveShadow = head.castShadow = true; G.add(head);
    for (let i = 0; i < 28; i++) { const a = R() * 6.28, d = 14 + R() * 14; const m = new T.Mesh(rockify(new T.IcosahedronGeometry(1.5 + R() * 3.5, 3), 1, .4, i), rockM); m.position.set(Math.cos(a) * d, -1 + R() * .5, Math.sin(a) * d); m.rotation.set(R() * 3, R() * 3, R() * 3); m.castShadow = true; G.add(m); }
    const grassC = new T.Mesh(new T.CircleGeometry(9, 40), new T.MeshStandardMaterial({ color: '#3e4a2e', roughness: 1 })); grassC.rotation.x = -Math.PI / 2; grassC.position.y = 5.98; grassC.receiveShadow = true; G.add(grassC);
    // tower: tapered stone shaft, string courses, door, windows, gallery + railing, lantern room glazing, dome + vent ball
    const ash = brickTex('#d8d2c6', 63, '#a8a296'); ash.wrapS = ash.wrapT = T.RepeatWrapping; ash.repeat.set(5, 12); const stoneM = new T.MeshStandardMaterial({ map: ash, roughness: .9 });
    const shaft = new T.Mesh(new T.CylinderGeometry(2.6, 3.6, 24, 40, 1, true), stoneM); shaft.position.y = 18; shaft.castShadow = true; G.add(shaft);
    cyls(G, stoneM, [{ p: [0, 6.5, 0], r: 4.4, h: 1 }, { p: [0, 29.8, 0], r: 3.4, h: .6 }], 40);
    const iron = new T.MeshStandardMaterial({ color: '#1e2226', roughness: .45, metalness: .6 }), brass = new T.MeshStandardMaterial({ color: '#c8a050', metalness: .7, roughness: .3 });
    cyls(G, iron, Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2; return { p: [Math.cos(a) * 3.3, 30.6, Math.sin(a) * 3.3] as V3, r: .025, h: 1.0 }; }), 5);
    const rail = new T.Mesh(new T.TorusGeometry(3.3, .04, 6, 64), iron); rail.rotation.x = Math.PI / 2; rail.position.y = 31.1; G.add(rail);
    cyls(G, iron, [{ p: [0, 30.25, 0], r: 2.2, h: .5 }], 32);
    cyls(G, iron, Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return { p: [Math.cos(a) * 2.0, 32.2, Math.sin(a) * 2.0] as V3, r: .04, h: 3.4 }; }), 5);
    const glaze = new T.Mesh(new T.CylinderGeometry(2.0, 2.0, 3.3, 12, 1, true), new T.MeshStandardMaterial({ color: '#a8c0c8', transparent: true, opacity: .12, roughness: .02, metalness: .2, depthWrite: false, side: T.DoubleSide })); glaze.position.y = 32.2; G.add(glaze);
    const dome = new T.Mesh(new T.SphereGeometry(2.2, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: '#2a3a34', roughness: .5, metalness: .5 })); dome.position.y = 33.85; dome.scale.y = .55; dome.castShadow = true; G.add(dome);
    const vent = new T.Mesh(new T.SphereGeometry(.3, 16, 12), iron); vent.position.y = 35.2; G.add(vent);
    for (const y of [10, 16, 22]) { const m = new T.Mesh(new T.PlaneGeometry(.5, .9), this.winMat); const r = 3.6 - (y - 6) / 24 * 1.0; m.position.set(0, y, r + .01); G.add(m); }
    const door = new T.Mesh(new T.PlaneGeometry(1.1, 2.1), new T.MeshStandardMaterial({ map: woodTex('#3a2a20', 64), roughness: .8 })); door.position.set(0, 8.05, 3.53); door.rotation.x = -.04; G.add(door);
    // keeper's cottage
    const ck = new T.Group(); ck.position.set(-7, 6, 3); G.add(ck); boxes(ck, stoneM, [{ p: [0, 1.4, 0], s: [5, 2.8, 3.6] }]); const rf = new T.Mesh(new T.ConeGeometry(3.6, 1.8, 4), new T.MeshStandardMaterial({ color: '#2a2e34', roughness: .7 })); rf.position.y = 3.7; rf.rotation.y = Math.PI / 4; rf.scale.set(1, 1, .75); ck.add(rf);
    for (const x of [-1.3, 1.3]) { const m = new T.Mesh(new T.PlaneGeometry(.7, .8), this.winMat); m.position.set(x, 1.6, 1.81); ck.add(m); }
    // ---- the Fresnel lens (first order ≈1.84 m Ø) at LENS ----
    const glass = new T.MeshStandardMaterial({ color: '#b8d8d8', transparent: true, opacity: .26, roughness: .04, metalness: .3, envMapIntensity: 1.3, emissive: '#ffd8a0', emissiveIntensity: 0, depthWrite: false, side: T.DoubleSide });
    this.lensF.position.set(...LENS); G.add(this.lensF);
    const ring = (r0: number, y: number, hgt: number, out: number) => new T.LatheGeometry([new T.Vector2(r0, y), new T.Vector2(r0 + out, y + hgt * .5), new T.Vector2(r0, y + hgt), new T.Vector2(r0, y)], 40);
    for (let k = 0; k < 7; k++) { const m = new T.Mesh(ring(.9 - k * .05, .55 + k * .17, .15, .1), glass); this.lensF.add(m); const m2 = new T.Mesh(ring(.9 - k * .05, -.7 - k * .17, .15, .1), glass); this.lensF.add(m2); }
    for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2; const pan = new T.Group(); pan.position.set(Math.cos(a) * .92, 0, Math.sin(a) * .92); pan.lookAt(0, 0, 0); this.lensF.add(pan);
      for (let k = 0; k < 6; k++) { const tr = new T.Mesh(new T.TorusGeometry(.08 + k * .075, .03, 6, 40), glass); pan.add(tr); } const cen = new T.Mesh(new T.CircleGeometry(.07, 24), glass); pan.add(cen); }
    cyls(this.lensF, brass, Array.from({ length: 8 }, (_, i) => { const a = (i + .5) / 8 * Math.PI * 2; return { p: [Math.cos(a) * .95, 0, Math.sin(a) * .95] as V3, r: .018, h: 2.7 }; }), 6);
    for (const y of [-1.35, -.55, .55, 1.35]) { const t2 = new T.Mesh(new T.TorusGeometry(.95, .02, 6, 64), brass); t2.rotation.x = Math.PI / 2; t2.position.y = y; this.lensF.add(t2); }
    this.lampG = new T.Mesh(new T.SphereGeometry(.08, 20, 16), glowMat('#ffd890')); this.lampG.position.set(...LENS); G.add(this.lampG);
    cyls(G, brass, [{ p: [LENS[0], LENS[1] - 1.2, LENS[2]], r: .25, h: 1.6 }, { p: [LENS[0], LENS[1] - .3, LENS[2]], r: .06, h: .4 }], 20);
    // ---- the OLD lamp + parabolic reflectors ----
    this.lensOld.position.set(...LENS); G.add(this.lensOld); const refl = new T.LatheGeometry(Array.from({ length: 12 }, (_, i) => new T.Vector2(i * .022, (i * .022) ** 2 * 4)), 32);
    for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2; const m = new T.Mesh(refl, new T.MeshStandardMaterial({ color: '#8a8a88', metalness: .8, roughness: .35, side: T.DoubleSide })); m.position.set(Math.cos(a) * .42, (p % 2) * .3 - .15, Math.sin(a) * .42); m.lookAt(Math.cos(a) * 2, m.position.y, Math.sin(a) * 2); m.rotateX(-Math.PI / 2); this.lensOld.add(m); }
    // ---- beam: two opposed volumetric cones (rotating) ----
    const cone = new T.CylinderGeometry(26, .5, 1, 32, 1, true); cone.translate(0, .5, 0); cone.rotateZ(-Math.PI / 2);
    const beamM = new T.ShaderMaterial({ uniforms: this.beamU, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      vertexShader: 'varying float vX; varying vec3 vN; varying vec3 vV; void main(){ vX = position.x; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float a, len; varying float vX; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(vN, vV)), 3.); float f = exp(-vX * 4.5) * smoothstep(0., .004, vX); gl_FragColor = vec4(vec3(1.,.9,.7) * e * f * a * .22, 1.); }' });
    for (const s of [0, Math.PI]) { const m = new T.Mesh(cone, beamM); m.rotation.y = s; m.scale.set(300, 1, 1); m.position.set(0, 0, 0); this.beam.add(m); }
    this.beam.position.set(...LENS); G.add(this.beam);
    // ---- the brig ----
    const hullS = new T.Shape(); hullS.moveTo(-6, 1.6); hullS.lineTo(6.5, 1.6); hullS.quadraticCurveTo(5.5, -.6, 3, -1.1); hullS.lineTo(-5, -1.1); hullS.quadraticCurveTo(-6, 0, -6, 1.6);
    const hg = new T.ExtrudeGeometry(hullS, { depth: 3.4, bevelEnabled: true, bevelSize: .4, bevelThickness: .8, bevelSegments: 4 }); hg.translate(0, 0, -1.7);
    const hull = new T.Mesh(hg, new T.MeshStandardMaterial({ map: woodTex('#2a2420', 65), roughness: .8 })); hull.castShadow = true; this.ship.add(hull);
    const mastM = new T.MeshStandardMaterial({ color: '#3a2e22', roughness: .8 }); cyls(this.ship, mastM, [{ p: [-1.8, 8, 0], r: .16, h: 13 }, { p: [2.6, 9, 0], r: .18, h: 15 }, { p: [7.5, 3.4, 0], r: .1, h: 6, rot: [0, 0, -1.1] }], 8);
    const sailM = new T.MeshStandardMaterial({ color: '#d8ccb0', roughness: .95, side: T.DoubleSide }); for (const [x, y, w, hh] of [[-1.8, 5.5, 5, 3.2], [-1.8, 9.2, 4.2, 2.8], [2.6, 6, 5.6, 3.6], [2.6, 10, 4.6, 3]]) { const sg2 = new T.PlaneGeometry(w, hh, 8, 4); const p = sg2.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos(p.getX(i) / w * Math.PI) * .5); const m = new T.Mesh(sg2, sailM); m.position.set(x, y, .3); m.rotation.y = Math.PI / 2 - .3; m.castShadow = true; this.ship.add(m); }
    this.shipLamp = new T.Mesh(new T.SphereGeometry(.18, 12, 8), glowMat('#ffc070')); this.shipLamp.position.set(-6.2, 2.6, 0); this.ship.add(this.shipLamp); G.add(this.ship);
    // ---- STUDY ----
    const st = new T.Group(); st.position.set(...STUDY); G.add(st); const wall = brickTex('#5a4a3a', 66, '#3a3026'); wall.wrapS = wall.wrapT = T.RepeatWrapping; wall.repeat.set(3, 2);
    boxes(st, new T.MeshStandardMaterial({ map: wall, roughness: .95 }), [{ p: [0, 2.5, -3], s: [9, 5, .2] }, { p: [-4.5, 2.5, 0], s: [.2, 5, 6] }]); const flT = woodTex('#4a3424', 67); flT.wrapS = flT.wrapT = T.RepeatWrapping; flT.repeat.set(5, 2);
    const fl = new T.Mesh(new T.PlaneGeometry(9, 6), new T.MeshStandardMaterial({ map: flT, roughness: .7 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; st.add(fl);
    const desk = new T.MeshStandardMaterial({ map: woodTex('#5a3a22', 68), roughness: .5 }); boxes(st, desk, [{ p: [0, .88, 0], s: [2.4, .07, 1.2] }, ...[[-1.1, -.5], [1.1, -.5], [-1.1, .5], [1.1, .5]].map(([x, z]) => ({ p: [x, .44, z] as V3, s: [.08, .88, .08] as V3 }))]);
    const paper = new T.MeshStandardMaterial({ map: canvasTex(256, 256, g => { const R2 = rng(69); g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(40,30,20,.6)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(20, 20 + i * 12); g.lineTo(80 + R2() * 150, 20 + i * 12); g.stroke(); } g.beginPath(); g.arc(160, 170, 50, 0, 7); g.stroke(); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(60, 170); g.lineTo(160, 130 + k * 25); g.lineTo(240, 130 + k * 25); g.stroke(); } }), roughness: .9 });
    for (let i = 0; i < 5; i++) { const m = new T.Mesh(new T.PlaneGeometry(.3, .4), paper); m.rotation.set(-Math.PI / 2, 0, (R() - .5) * .8); m.position.set(-.8 + R() * .5, .92 + i * .002, -.2 + R() * .4); st.add(m); }
    const prismG = new T.CylinderGeometry(.06, .06, .25, 3); for (let i = 0; i < 3; i++) { const m = new T.Mesh(prismG, glass); m.rotation.z = Math.PI / 2; m.position.set(.7 + i * .12, .96, .35 - i * .05); st.add(m); }
    this.candle = new T.Mesh(new T.SphereGeometry(.03, 12, 8), glowMat('#ffc060')); this.candle.scale.y = 1.8; this.candle.position.set(STUDY[0] - .7, 1.16, 0); G.add(this.candle);
    cyls(st, new T.MeshStandardMaterial({ color: '#efe6d0', roughness: .6 }), [{ p: [-.7, 1.02, 0], r: .03, h: .18 }], 12); cyls(st, brass, [{ p: [-.7, .925, 0], r: .07, h: .02 }], 16);
    // demo lens (morph: thick convex → stepped Fresnel), stands upright on the desk facing +x
    const N = 60, RL = .22, H = .09; const prof = (step: boolean) => { const pts: T.Vector2[] = []; for (let i = 0; i <= N; i++) { const r = i / N * RL; const sag = H * (1 - (r / RL) ** 2); const z = step ? (sag % (H / 4.5)) + .006 : sag + .006; pts.push(new T.Vector2(Math.max(r, .0001), z)); } pts.push(new T.Vector2(RL, 0), new T.Vector2(.0001, 0)); return pts; };
    const dg = new T.LatheGeometry(prof(false), 64); const ds = new T.LatheGeometry(prof(true), 64); dg.morphAttributes.position = [ds.attributes.position]; dg.computeVertexNormals();
    this.demo = new T.Mesh(dg, new T.MeshStandardMaterial({ color: '#cfe8ea', transparent: true, opacity: .6, roughness: .03, metalness: .1, envMapIntensity: 2, side: T.DoubleSide }));
    this.demo.rotation.z = -Math.PI / 2; this.demo.position.set(STUDY[0] + 0, 1.16, 0); G.add(this.demo); cyls(st, brass, [{ p: [0, .97, 0], r: .015, h: .14 }, { p: [0, .925, 0], r: .06, h: .02 }], 10);
    const rayM = glowMat('#ffd890'); for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.CylinderGeometry(.002, .002, 1, 5), rayM); G.add(m); this.rays.push(m); }
  }
  private seg(m: T.Mesh, a: T.Vector3, b: T.Vector3) { const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, .5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); }
  async render(F: LightFrame, frame: number) {
    const st = clamp(F.storm ?? 0), nt = clamp(F.night ?? 1); const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])]; const S: Sprite[] = [...(F.sprites ?? [])];
    this.seaU.t.value = F.t; this.seaU.storm.value = st; this.seaU.night.value = nt; if (F.fog) { this.seaU.fogC.value.set(F.fog.color); this.seaU.fogD.value = F.fog.density; } else this.seaU.fogD.value = 0;
    this.skyU.t.value = F.t; this.skyU.storm.value = st; this.skyU.night.value = nt; this.winMat.color.setRGB(nt * .9, nt * .65, nt * .35);
    const kind = F.lens ?? 'fresnel'; this.lensF.visible = kind === 'fresnel'; this.lensOld.visible = kind === 'old'; const lr = F.lensRot ?? F.t * .35; this.lensF.rotation.y = lr; this.lensOld.rotation.y = lr * .3;
    const lamp = F.lamp ?? 1; (this.lampG.material as T.MeshBasicMaterial).color.setRGB(1.6 * lamp, 1.25 * lamp, .65 * lamp); this.lampG.scale.setScalar(kind === 'old' ? .7 : 1);
    this.lensF.traverse(o => { const m = (o as T.Mesh).material as T.MeshStandardMaterial; if (m && 'emissiveIntensity' in m && m.transparent) m.emissiveIntensity = lamp * .04; });
    if (lamp > 0) L.push({ p: [LENS[0], LENS[1], LENS[2]], c: [1, .85, .6], i: 9 * lamp, d: 12 });
    const bm = F.beam ?? (kind === 'fresnel' ? lamp : 0); this.beam.visible = bm > 0; this.beam.rotation.y = lr + Math.PI / 8; this.beamU.a.value = bm;
    const sp = F.ship; this.ship.visible = !!sp; if (sp) { this.ship.position.set(sp.x, Math.sin(F.t * .9) * .3 * (1 + st * 2) - .2, sp.z); this.ship.rotation.set(Math.sin(F.t * .7) * .04 * (1 + st * 3), sp.rot ?? 0, Math.sin(F.t * 1.1) * (sp.roll ?? .05) * (1 + st * 2));
      (this.shipLamp.material as T.MeshBasicMaterial).color.setRGB(1.6 * (sp.lantern ?? 1), 1.0 * (sp.lantern ?? 1), .4 * (sp.lantern ?? 1)); }
    const mo = clamp(F.morph ?? 0); this.demo.morphTargetInfluences![0] = mo; (this.candle.material as T.MeshBasicMaterial).color.setRGB(1.8 * (F.candle ?? 1), 1.2 * (F.candle ?? 1), .5 * (F.candle ?? 1));
    if ((F.candle ?? 0) > 0) L.push({ p: [STUDY[0] - .7, 1.2, 0], c: [1, .7, .35], i: 4 * (F.candle ?? 1) * (.92 + Math.sin(F.t * 17) * .05), d: 6 });
    const ry = F.rays ?? 0, par = clamp(F.raysPar ?? mo); const src = new T.Vector3(STUDY[0] - .7, 1.16, 0);
    this.rays.forEach((m, i) => { const k = i % 7, half = i < 7; m.visible = ry > 0 && i < 14; if (!m.visible) return; const yy = 1.16 + (k - 3) * .055; const hit = new T.Vector3(STUDY[0], yy, 0);
      if (half) this.seg(m, src, hit); else { const spread = (yy - 1.16) * (1 - par) * 1.6; this.seg(m, hit, new T.Vector3(STUDY[0] + 1.4 * Math.min(1, ry * 1.5), yy + spread, 0)); } (m.material as T.MeshBasicMaterial).color.setRGB(1.3 * ry, 1.05 * ry, .6 * ry); });
    const rn = F.rain ?? Math.max(0, st - .3) * 1.4; if (rn > 0) { const cp = F.cam.pos; const R = rng(Math.floor(F.t * 24)); for (let i = 0; i < 150; i++) S.push({ p: [cp[0] + (R() - .5) * 14, cp[1] + (R() - .5) * 8, cp[2] - 1 - R() * 14], s: .05, rot: 0, c: [.8, .85, .95], a: .3 * rn, kind: 2, seed: R(), age: 0 }); }
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
void lerp;
