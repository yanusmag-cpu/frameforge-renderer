// YunoWorld v7 · Film 3 "The warning flag before the Galveston storm" (Galveston, Texas, 7–8 Sept 1900) — environment engine.
// A Victorian commercial street (brick and clapboard facades with cornices, arched windows, awnings, signs, cast-iron galleries,
// gas lamps, telegraph poles, streetcar rails), the corner Weather Bureau office building with a rooftop flagstaff flying the
// storm flag (red, black square) and a pennant, the Gulf beach with a bathhouse pavilion on pilings, a sky that goes from calm
// blue to storm-black with lightning and rain, wind that bends palms and tears the flag, a storm surge that floods the street,
// and the aftermath: a broken flagstaff at dawn, then the seawall and the raised city.
import * as T from 'three';
import { Core, Builder, GLSL_NOISE, rng, canvasTex, clamp, lerp, type V3, type Sprite, type Light } from '../../yw3/core.ts';
import { woodTex, brickTex, clapTex, dirtTex, boxes, cyls, type V7Frame } from '../kit7.ts';

export type GalvFrame = V7Frame & {
  storm?: number;          // 0 calm … 1 black sky, rain, wind
  wind?: number; rain?: number; lightning?: number; surge?: number;   // surge: water level (m) over the street
  flags?: { up: number; torn?: number }; staffBroken?: boolean; dawn?: number; seawall?: number; raise?: number; sea?: number;
  extra?: Light[];
};
export const STREET_X = 0, LEVY: V3 = [-7.5, 0, -6];
export const STAFF_TOP: V3 = [LEVY[0], 19.5, LEVY[2]];
const facade = (seed: number, kind: 'brick' | 'clap', floors: number, sign: string, colour: string) => canvasTex(512, 160 * floors, g => {
  const R = rng(seed); const H = 160 * floors; const img = kind === 'brick' ? null : null; void img;
  if (kind === 'brick') { const b = (brickTex(colour, seed) as T.CanvasTexture).image as HTMLCanvasElement; for (let y = 0; y < H; y += 512) g.drawImage(b, 0, y); }
  else { const c = (clapTex(colour, seed) as T.CanvasTexture).image as HTMLCanvasElement; for (let y = 0; y < H; y += 512) g.drawImage(c, 0, y); }
  for (let f = 0; f < floors; f++) { const y0 = H - (f + 1) * 160;
    if (f === 0) { g.fillStyle = '#2a2420'; g.fillRect(30, y0 + 40, 452, 120); for (let k = 0; k < 3; k++) { g.fillStyle = R() > .5 ? '#ffe2a8' : '#8ab0c8'; g.fillRect(44 + k * 150, y0 + 52, 120, 92); g.strokeStyle = '#3a2a1e'; g.lineWidth = 6; g.strokeRect(44 + k * 150, y0 + 52, 120, 92); g.beginPath(); g.moveTo(104 + k * 150, y0 + 52); g.lineTo(104 + k * 150, y0 + 144); g.stroke(); }
      g.fillStyle = '#1e1a16'; g.fillRect(0, y0 + 2, 512, 34); g.fillStyle = '#e8dcc0'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.fillText(sign, 256, y0 + 28); }
    else for (let k = 0; k < 4; k++) { const x = 34 + k * 120; g.fillStyle = '#d8ccb4'; g.fillRect(x - 8, y0 + 22, 96, 122); g.fillStyle = f % 2 ? '#5a7690' : '#4a6478'; g.beginPath(); g.moveTo(x, y0 + 140); g.lineTo(x, y0 + 60); g.arc(x + 40, y0 + 60, 40, Math.PI, 0); g.lineTo(x + 80, y0 + 140); g.fill();
      g.strokeStyle = '#efe6d2'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 40, y0 + 22); g.lineTo(x + 40, y0 + 140); g.moveTo(x, y0 + 96); g.lineTo(x + 80, y0 + 96); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 4, y0 + 64, 14, 70); }
    g.fillStyle = 'rgba(30,22,16,.35)'; g.fillRect(0, y0 + 150, 512, 10); }
  g.fillStyle = '#3a2e26'; g.fillRect(0, 0, 512, 18); });
export class GalvEngine extends Core {
  G = new T.Group(); skyU: Record<string, T.IUniform>; sky: T.Mesh; sea: T.Mesh; seaU = { t: { value: 0 }, storm: { value: 0 }, dawn: { value: 0 }, fogC: { value: new T.Color('#cfe0ee') }, fogD: { value: 0 } };
  flagU = { t: { value: 0 }, wind: { value: .3 }, torn: { value: 0 } }; flags = new T.Group(); staff!: T.Mesh; staffTop!: T.Group; surge: T.Mesh; palms: T.Group[] = []; sw = new T.Group(); jacked = new T.Group();
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#9ac4e8', '#7a6a52'); this.scene.environment = this.env; this.scene.add(this.G); this.sun.shadow.mapSize.set(2048, 2048);
    const G = this.G; const R = rng(1900);
    this.skyU = { top: { value: new T.Color() }, hor: { value: new T.Color() }, sun: { value: new T.Vector3(-.3, .5, -.8).normalize() }, storm: { value: 0 }, flash: { value: 0 }, t: { value: 0 }, dawn: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(1400, 40, 20), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sun; uniform float storm, flash, t, dawn; varying vec3 vD; ${GLSL_NOISE}
        void main(){ vec3 d = normalize(vD); float y = max(d.y, .0); vec3 calm = mix(vec3(.85,.9,.95), vec3(.28,.5,.86), pow(smoothstep(0., .6, y), .6));
          vec3 dark = mix(vec3(.2,.22,.26), vec3(.07,.08,.11), smoothstep(0., .5, y)); vec3 c = mix(calm, dark, storm);
          vec2 uv = d.xz / max(d.y, .06); float cl = fbm(uv * 1.6 + vec2(t * .02 * (1. + storm * 6.), 0.)); float cl2 = fbm(uv * 3.3 - vec2(t * .05 * (1. + storm * 5.), t * .01));
          float cover = mix(.62, .25, storm); float m = smoothstep(cover, cover + .25, cl * .7 + cl2 * .4) * smoothstep(-.02, .2, d.y);
          vec3 cc = mix(vec3(1., .98, .96), vec3(.16,.17,.2), storm) * (.85 + .3 * cl2); c = mix(c, cc, m * (.75 + storm * .25));
          float s = max(dot(d, sun), 0.); c += vec3(1., .85, .6) * (pow(s, 600.) * 6. + pow(s, 8.) * .25) * (1. - storm);
          c = mix(c, mix(vec3(.98,.72,.52), vec3(.55,.6,.78), smoothstep(0., .5, y)) * (.85 + .2 * m), dawn * .75); c += vec3(.85, .9, 1.) * flash * (.4 + .6 * m); gl_FragColor = vec4(c, 1.); }` }));
    this.scene.add(this.sky);
    // ground: street (packed shell/clay), sidewalks, beach sand
    const dirt = dirtTex(21, '#a8946e'); dirt.repeat.set(3, 20); const road = new T.Mesh(new T.PlaneGeometry(14, 145), new T.MeshStandardMaterial({ map: dirt, roughness: .95 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -52); road.receiveShadow = true; G.add(road);
    const plank = woodTex('#8a6a4a', 33); plank.repeat.set(1, 80); for (const x of [-5.5, 5.5]) { const sw = new T.Mesh(new T.BoxGeometry(3, .18, 145), new T.MeshStandardMaterial({ map: plank, roughness: .9 })); sw.position.set(x, .09, -52); sw.receiveShadow = true; G.add(sw); }
    const steel = new T.MeshStandardMaterial({ color: '#6a6a6e', roughness: .4, metalness: .8 }); boxes(G, steel, [-.72, .72].map(x => ({ p: [x, .02, -52] as V3, s: [.06, .04, 145] as V3 })));
    const sand = canvasTex(512, 512, g => { const R2 = rng(4); g.fillStyle = '#d8c49a'; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${150 + R2() * 80},${130 + R2() * 70},${90 + R2() * 50},.4)`; g.fillRect(R2() * 512, R2() * 512, 2, 2); } }); sand.repeat.set(40, 8);
    const beach = new T.Mesh(new T.PlaneGeometry(600, 36), new T.MeshStandardMaterial({ map: sand, roughness: 1 })); beach.rotation.x = -Math.PI / 2; beach.rotation.z = 0; beach.position.set(0, -.05, -136); beach.receiveShadow = true; G.add(beach);
    const land = new T.Mesh(new T.PlaneGeometry(800, 300), new T.MeshStandardMaterial({ color: '#8a8a5a', roughness: 1 })); land.rotation.x = -Math.PI / 2; land.position.set(0, -.08, 20); G.add(land);
    // buildings both sides of the street
    const signs = ['DRY GOODS', 'HARDWARE', 'BAKERY', 'DRUGS', 'SALOON', 'COTTON EXCHANGE', 'MILLINERY', 'GROCERIES', 'HOTEL', 'TOBACCO', 'BANK', 'SHOES'];
    const cols = ['#8a4a36', '#d8c8a8', '#9a5a3e', '#c8b8a0', '#7a3e2e', '#e0d4bc', '#a8603e'];
    let si = 0; for (const side of [-1, 1]) { let z = side < 0 ? -2 : 6; let first = side < 0; while (z > -110) { const isLevy = first; first = false; const wd = isLevy ? 8 : 7 + R() * 4, fl = 2 + Math.floor(R() * 3), h = fl * 3.6; const kind = R() > .45 || isLevy ? 'brick' : 'clap';
      const fz = z - wd / 2; const F = isLevy ? 5 : fl; const HH = isLevy ? 18 : h;
      const tex = facade(si * 7 + 3, kind, F, isLevy ? 'U.S. WEATHER BUREAU' : signs[si % signs.length], isLevy ? '#8a4a36' : cols[si % cols.length]);
      const mats = [new T.MeshStandardMaterial({ color: '#6a5a4a', roughness: .9 }), new T.MeshStandardMaterial({ color: '#6a5a4a', roughness: .9 })]; const front = new T.MeshStandardMaterial({ map: tex, roughness: .85 });
      const bm = new T.Mesh(new T.BoxGeometry(6, HH, wd), side < 0 ? [front, ...mats, mats[0], mats[0], mats[0]] : [mats[0], front, mats[0], mats[0], mats[0], mats[0]]);
      bm.position.set(side * 10, HH / 2, fz); bm.castShadow = bm.receiveShadow = true; G.add(bm);
      if (isLevy) { const ex = (side * 10 - 3 * side); void ex; }
      const corn = new T.Mesh(new T.BoxGeometry(6.6, .5, wd + .4), new T.MeshStandardMaterial({ color: isLevy ? '#d8ccb0' : '#5a4a3a', roughness: .7 })); corn.position.set(side * 9.8, HH + .25, fz); corn.castShadow = true; G.add(corn);
      for (let k = 1; k < F; k++) { const band = new T.Mesh(new T.BoxGeometry(.3, .18, wd), new T.MeshStandardMaterial({ color: '#d8ccb0' })); band.position.set(side * 7, k * (HH / F), fz); G.add(band); }
      const aw = new T.Mesh(new T.BoxGeometry(2.4, .06, wd - .6), new T.MeshStandardMaterial({ map: canvasTex(64, 64, g => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2eee6' : ['#2a5a8a', '#8a2a2a', '#2a6a4a'][si % 3]; g.fillRect(0, i * 8, 64, 8); } }), roughness: .8 }));
      aw.position.set(side * 5.9, 3.3, fz); aw.rotation.z = side * .32; aw.castShadow = true; G.add(aw);
      for (const dz of [-wd / 2 + .6, wd / 2 - .6]) { const post = new T.Mesh(new T.CylinderGeometry(.05, .05, 3, 6), new T.MeshStandardMaterial({ color: '#3a3a3a' })); post.position.set(side * 4.3, 1.5, fz + dz); G.add(post); }
      if (fl >= 3 && R() > .5 && !isLevy) { const gal = new Builder(); gal.box(1.6, .1, wd - .4, [side * 6.2, 3.7, fz], '#3a3a3a'); for (let k = 0; k < wd / .3; k++) gal.box(.03, .9, .03, [side * 5.45, 4.15, fz - wd / 2 + .3 + k * .3], '#2a2a2a'); gal.box(.06, .06, wd - .4, [side * 5.45, 4.6, fz], '#2a2a2a'); G.add(gal.mesh()); }
      z -= wd + .3; si++; } }
    // flagstaff on the Weather Bureau roof (shot as LEVY corner, front face at x = -7)
    this.staff = new T.Mesh(new T.CylinderGeometry(.06, .1, 4.6, 10), new T.MeshStandardMaterial({ map: woodTex('#e8e4dc', 41), roughness: .6 })); this.staff.position.set(STAFF_TOP[0], 18 + 2.3, STAFF_TOP[2]); this.staff.castShadow = true; G.add(this.staff);
    this.staffTop = new T.Group(); this.staffTop.position.set(STAFF_TOP[0], 18 + 4.6, STAFF_TOP[2]); const ball = new T.Mesh(new T.SphereGeometry(.1, 12, 8), new T.MeshStandardMaterial({ color: '#c8a23a', metalness: .8, roughness: .3 })); this.staffTop.add(ball); G.add(this.staffTop);
    const flagMat = (draw: (g: CanvasRenderingContext2D) => void) => { const m = new T.ShaderMaterial({ uniforms: { map: { value: canvasTex(256, 256, draw) }, ...this.flagU }, side: T.DoubleSide, transparent: true,
      vertexShader: `uniform float t, wind; varying vec2 vU; varying float vS; void main(){ vU = uv; vec3 p = position; float k = uv.x; float w = .25 + wind * 1.2;
        p.z += sin(k * 6. - t * (5. + wind * 12.)) * .22 * k * w + sin(k * 13. - t * 17.) * .05 * k * w; p.y -= (1. - w * .7) * k * k * .5; vS = sin(k * 6. - t * (5. + wind * 12.)); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform sampler2D map; uniform float torn; varying vec2 vU; varying float vS; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
        void main(){ vec4 c = texture2D(map, vU); float cut = vU.x - (1. - torn * (.55 + .35 * h(floor(vU * vec2(8., 14.))))); if (cut > 0. || c.a < .5) discard; c.rgb = pow(c.rgb, vec3(2.2)); c.rgb *= .62 + .3 * (vS * .5 + .5); gl_FragColor = vec4(c.rgb, 1.); }` }); return m; };
    const storm = new T.Mesh(new T.PlaneGeometry(1.8, 1.8, 24, 12), flagMat(g => { g.fillStyle = '#a3281f'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 256; i += 3) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, i, 256, 1); g.fillRect(i, 0, 1, 256); } g.fillStyle = '#1a1614'; g.fillRect(84, 84, 88, 88); g.strokeStyle = 'rgba(255,240,220,.25)'; g.lineWidth = 3; g.strokeRect(2, 2, 252, 252); }));
    storm.geometry.translate(.9, 0, 0); storm.position.y = -.5;
    const pen = new T.Mesh(new T.PlaneGeometry(2.4, .9, 24, 6), flagMat(g => { g.clearRect(0, 0, 256, 256); g.fillStyle = '#a3281f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 128); g.lineTo(0, 256); g.fill(); }));
    pen.geometry.translate(1.2, 0, 0); pen.position.y = .45;
    this.flags.add(storm, pen); this.flags.position.set(STAFF_TOP[0] + .07, 18, STAFF_TOP[2]); G.add(this.flags);
    // telegraph poles, gas lamps, palms, a parked delivery wagon, barrels and crates
    const poles: { p: V3; r: number; h: number }[] = []; for (let z = 4; z > -110; z -= 18) for (const x of [-4.6, 4.6]) poles.push({ p: [x, 4.5, z], r: .12, h: 9 }); cyls(G, new T.MeshStandardMaterial({ map: woodTex('#5a4a3a', 19) }), poles, 8, .8);
    const lb = new Builder(); for (let z = -2; z > -110; z -= 12) for (const x of [-4.3, 4.3]) { lb.cyl(.05, .07, 3.2, [x, 1.6, z], '#2a2a2a', 8); lb.box(.3, .4, .3, [x, 3.4, z], '#2a2a2a'); }
    for (let i = 0; i < 6; i++) lb.cyl(.3, .32, .8, [-4.7 + (i % 2) * .5, .58, -16 - i * 9], '#6a4a2e', 12); for (let i = 0; i < 5; i++) lb.box(.7, .6, .6, [4.9, .48, -22 - i * 13], '#8a6a42');
    G.add(lb.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .2 })));
    const wag = new Builder(); wag.box(1.6, .5, 3.2, [3.0, 1.1, -30], '#6a4a2e'); for (const z of [-31.2, -28.8]) for (const x of [2.15, 3.85]) wag.cyl(.5, .5, .08, [x, .5, z], '#3a2a1a', 16, [0, 0, Math.PI / 2]); wag.box(.08, .08, 2.2, [3, .9, -32.6], '#4a3a2a', [.5, 0, 0]);
    G.add(wag.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .8 })));
    const frondT = canvasTex(256, 512, g => { g.strokeStyle = '#5a5a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 510); g.lineTo(128, 6); g.stroke(); const R2 = rng(2); for (let i = 0; i < 40; i++) { const y = 500 - i * 12, L = 100 * Math.sin(i / 40 * Math.PI) + 16; for (const s of [-1, 1]) { g.strokeStyle = `hsl(${85 + R2() * 20},${40 + R2() * 15}%,${26 + R2() * 12}%)`; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * L * .5, y - 24, 128 + s * L, y + 16); g.stroke(); } } }, true);
    const fm = new T.MeshStandardMaterial({ map: frondT, alphaTest: .45, side: T.DoubleSide, roughness: .8 });
    for (const [x, z] of [[-4.2, -40], [4.2, -52], [-4.2, -78], [6, -128], [-12, -126], [18, -124]] as const) { const p = new T.Group(); p.position.set(x, 0, z); G.add(p); const tr = new T.Mesh(new T.CylinderGeometry(.16, .24, 7, 8), new T.MeshStandardMaterial({ map: woodTex('#8a7656', 3) })); tr.position.y = 3.5; p.add(tr);
      const crown = new T.Group(); crown.position.y = 7; p.add(crown); for (let f = 0; f < 9; f++) { const fr = new T.Mesh(new T.PlaneGeometry(1.2, 2.6), fm); fr.geometry.translate(0, 1.3, 0); fr.rotation.set(-1.0 - R() * .4, f * .7, 0, 'YXZ'); crown.add(fr); } this.palms.push(p); }
    // bathhouse pavilion on pilings over the surf
    const bh = new T.Group(); bh.position.set(42, 0, -160); G.add(bh); const pil: { p: V3; r: number; h: number }[] = []; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) pil.push({ p: [i * 3 - 7.5, 1.5, j * 3 - 4.5], r: .15, h: 3 }); cyls(bh, new T.MeshStandardMaterial({ map: woodTex('#6a5a4a', 5) }), pil);
    const deck = new T.Mesh(new T.BoxGeometry(18, .3, 12), new T.MeshStandardMaterial({ map: woodTex('#9a7a5a', 6) })); deck.position.y = 3.1; bh.add(deck); const hall = new T.Mesh(new T.BoxGeometry(12, 4, 8), new T.MeshStandardMaterial({ map: clapTex('#e8e0d0', 9) })); hall.position.y = 5.2; bh.add(hall);
    const roofB = new T.Mesh(new T.ConeGeometry(9, 3, 4), new T.MeshStandardMaterial({ color: '#8a2a2a', flatShading: true })); roofB.rotation.y = Math.PI / 4; roofB.scale.set(1, 1, .7); roofB.position.y = 8.7; bh.add(roofB);
    // Gulf: swells grow with the storm; same plane rises as the surge for the flood shots
    this.sea = new T.Mesh(new T.PlaneGeometry(3000, 1400, 220, 120), new T.ShaderMaterial({ uniforms: this.seaU, fog: false, transparent: false,
      vertexShader: `uniform float t, storm; varying vec3 vW; varying float vH; void main(){ vec3 p = position; float a = .35 + storm * 1.8; float h = sin(p.y * .09 + t * 1.1) * a + sin(p.y * .21 + p.x * .05 + t * 1.7) * a * .45 + sin(p.x * .13 - t * .9) * a * .3; p.z += h; vH = h / max(a, .1);
        vec4 w = modelMatrix * vec4(p, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float t, storm, dawn, fogD; uniform vec3 fogC; varying vec3 vW; varying float vH; ${GLSL_NOISE} void main(){ vec3 deep = mix(vec3(.08,.34,.42), vec3(.1,.14,.16), storm); vec3 sh = mix(vec3(.25,.6,.6), vec3(.25,.28,.26), storm);
        float d = length(cameraPosition.xz - vW.xz); vec3 c = mix(sh, deep, smoothstep(10., 250., d)); float foam = smoothstep(.55, .95, vH + fbm(vW.xz * .2 + t * .3) * .4); c = mix(c, mix(vec3(.92,.94,.92), vec3(.5,.5,.46), storm), foam * (.35 + storm * .4));
        c += vec3(1.,.8,.6) * pow(fbm(vW.xz * .05 - t * .02), 5.) * (1. - storm) * .8; c = mix(c, vec3(.9,.7,.55), dawn * .25); c = mix(c, fogC, 1. - exp(-fogD * fogD * d * d)); gl_FragColor = vec4(c, 1.); }` }));
    this.sea.rotation.x = -Math.PI / 2; this.sea.position.set(0, -.6, -852); G.add(this.sea);
    this.surge = new T.Mesh(new T.PlaneGeometry(700, 500, 1, 1), new T.MeshStandardMaterial({ color: '#4e4a3e', roughness: .18, metalness: .05, envMapIntensity: .8, transparent: true, opacity: .94, map: canvasTex(256, 256, g => { const R2 = rng(11); g.fillStyle = '#8a8a80'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(230,230,220,${R2() * .25})`; g.fillRect(R2() * 256, R2() * 256, 8 + R2() * 30, 2); } }) }));
    (this.surge.material as T.MeshStandardMaterial).map!.wrapS = (this.surge.material as T.MeshStandardMaterial).map!.wrapT = T.RepeatWrapping; (this.surge.material as T.MeshStandardMaterial).map!.repeat.set(70, 50); this.surge.rotation.x = -Math.PI / 2; this.surge.position.set(0, -2, -60); G.add(this.surge);
    // seawall (curved concrete face with steps) + a house raised on jacks (shown in the ending)
    const swM = new T.MeshStandardMaterial({ map: canvasTex(512, 256, g => { const R2 = rng(7); g.fillStyle = '#a89c86'; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(80,80,80,${R2() * .12})`; g.fillRect(R2() * 512, R2() * 256, 6, 3); } for (let x = 0; x < 512; x += 64) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 3, 256); } }), roughness: .9 });
    const prof = new T.Shape(); prof.moveTo(0, 0); prof.lineTo(0, 5.2); prof.lineTo(1.5, 5.2); prof.quadraticCurveTo(3.5, 2, 6, 0); prof.lineTo(0, 0);
    const swG = new T.ExtrudeGeometry(prof, { depth: 300, bevelEnabled: false }); const swm = new T.Mesh(swG, swM); swm.rotation.y = Math.PI / 2; swm.position.set(-150, 0, -132); swm.castShadow = swm.receiveShadow = true; this.sw.add(swm);
    const steps = new Builder(); for (let k = 0; k < 6; k++) steps.box(300, .25, .7, [0, k * .26 + .13, -138 - k * .5 + 3], '#b8b4a8'); this.sw.add(steps.mesh()); this.sw.visible = false; G.add(this.sw);
    const house = new T.Mesh(new T.BoxGeometry(6, 5, 5), new T.MeshStandardMaterial({ map: clapTex('#e8dcc8', 12) })); house.position.y = 2.5; this.jacked.add(house); const hroof = new T.Mesh(new T.ConeGeometry(4.6, 2.4, 4), new T.MeshStandardMaterial({ color: '#5a3a2a', flatShading: true })); hroof.rotation.y = Math.PI / 4; hroof.position.y = 6.2; hroof.scale.set(1, 1, .8); this.jacked.add(hroof);
    const jk: { p: V3; r: number; h: number }[] = []; for (const x of [-2.6, 0, 2.6]) for (const z of [-2.2, 2.2]) jk.push({ p: [x, -1, z], r: .14, h: 2 }); cyls(this.jacked, new T.MeshStandardMaterial({ color: '#4a4a4a', metalness: .6 }), jk);
    this.jacked.position.set(-2, 0, -118); this.jacked.visible = false; G.add(this.jacked);
  }
  async render(F: GalvFrame, frame: number) {
    const st = clamp(F.storm ?? 0), wind = F.wind ?? (.25 + st * .9), dawn = F.dawn ?? 0;
    this.skyU.storm.value = st; this.skyU.flash.value = F.lightning ?? 0; this.skyU.t.value = F.t; this.skyU.dawn.value = dawn; this.seaU.t.value = F.t; this.seaU.storm.value = Math.max(st, F.sea ?? 0); this.seaU.dawn.value = dawn; if (F.fog) { (this.seaU.fogC.value as T.Color).set(F.fog.color); this.seaU.fogD.value = F.fog.density; } else this.seaU.fogD.value = 0;
    this.flagU.t.value = F.t; this.flagU.wind.value = wind; this.flagU.torn.value = F.flags?.torn ?? 0;
    const up = clamp(F.flags?.up ?? 1); this.flags.position.y = lerp(17.6, 21.6, up) - 1.8 * 0; this.flags.visible = up > .02 && !F.staffBroken;
    this.flags.position.y = 18 + up * 4.1 - .4;
    this.staff.scale.y = F.staffBroken ? .45 : 1; this.staff.position.y = 18 + (F.staffBroken ? 1.03 : 2.3); this.staff.rotation.z = F.staffBroken ? .25 : 0; this.staffTop.visible = !F.staffBroken;
    for (const p of this.palms) { const c = p.children[1] as T.Group; c.rotation.z = Math.sin(F.t * (1.4 + wind * 3) + p.position.z) * .05 * (1 + wind * 3) + wind * .35; p.children[0].rotation.z = wind * .08; }
    const sg = F.surge ?? -2; this.surge.position.y = sg + Math.sin(F.t * 1.3) * .06; (this.surge.material as T.MeshStandardMaterial).map!.offset.set(F.t * .02, -F.t * .25); this.surge.visible = sg > -1.5;
    this.sw.visible = (F.seawall ?? 0) > 0; this.jacked.visible = (F.raise ?? -1) >= 0; this.jacked.position.y = Math.max(0, F.raise ?? 0) * 2.2;
    const S: Sprite[] = [...(F.sprites ?? [])]; const L: Light[] = [...(F.lights ?? []), ...(F.extra ?? [])];
    const rn = F.rain ?? Math.max(0, st - .35) * 1.4; if (rn > 0) { const cp = F.cam.pos; const R = rng(Math.floor(F.t * 24)); for (let i = 0; i < 160; i++) S.push({ p: [cp[0] + (R() - .5) * 14 + wind * 1.5, cp[1] + (R() - .5) * 8, cp[2] - 1 - R() * 14], s: .06, rot: 0, c: [.8, .85, .95], a: .35 * rn, kind: 2, seed: R(), age: 0 }); }
    if (wind > .9) { const R = rng(Math.floor(F.t * 6)); for (let i = 0; i < 14; i++) { const a = (F.t * .9 + i / 14) % 1; S.push({ p: [-6 + a * 18, 1 + Math.sin(i + F.t * 3) * 1.5 + a * 3, -10 - (i % 7) * 6], s: .18, rot: F.t * 9 + i, c: [.45, .38, .3], a: .8 * (1 - a), kind: 3, seed: R(), age: a }); } }
    if ((F.lightning ?? 0) > 0) L.push({ p: [F.cam.pos[0] - 30, 60, F.cam.pos[2] - 80], c: [.85, .9, 1], i: 600 * (F.lightning ?? 0), d: 300 });
    await this.frameBase({ ...F, lights: L, sprites: S }); this.sky.position.copy(this.cam.position); this.draw(F, frame);
  }
}
