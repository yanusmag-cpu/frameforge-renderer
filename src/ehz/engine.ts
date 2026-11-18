// Empire History Z render engine for "The War That Lasted Only 38 Minutes".
import * as T from 'three';
import { Post, DEFAULT_GRADE, type Grade } from '../brazil/post.ts';
import { canvas, type V3 } from './geo.ts';
import { terrain, ocean, town, palaceComplex, palms, dhows, Ship, SHIPS, WATER, FLAG_U, DMG, flagMesh } from './world.ts';
import { Ball, MiniArmy, type BallState, type Mini } from './ball.ts';
import { Sprites, buildFx, shake } from './fx.ts';
import { IMPACTS, SHOTS as SHOTSALL, soldiers, shipMatrix, clockAt, lighthouseFall, flagFall, type Shot } from './timeline.ts';

export type Cam = { pos: V3; look: V3; fov: number; up?: V3; roll?: number };
export type Frame = {
  t: number; cam: Cam; balls?: BallState[]; grade?: Partial<Grade>; sun?: { focus: V3; size: number }; overlay?: string;
  clock?: number; mapMode?: boolean; miniScale?: number; sailors?: boolean; shakeK?: number; hideMinis?: boolean; haze?: number;
};

export class EhzEngine {
  r: T.WebGLRenderer; scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 9 / 16, .05, 3000); post: Post;
  sun = new T.DirectionalLight('#fff1dc', 3.2); hemi = new T.HemisphereLight('#bcd8f5', '#b59a72', 1.15); key = new T.DirectionalLight('#ffe9d2', .6);
  pts: T.PointLight[] = []; env: T.Texture; sky: T.Mesh; skyU: Record<string, T.IUniform>;
  ships: Ship[] = []; balls = new Map<string, Ball>(); zz: MiniArmy; gb: MiniArmy; sprites: Sprites; debris: T.InstancedMesh;
  lighthouse: T.Object3D; flagPole: T.Object3D; palaceFlag: T.Mesh; cannons: T.Group[]; clockTex: T.CanvasTexture; clockC: HTMLCanvasElement; clockKey = -1;
  dhow: T.InstancedMesh; consulFlag: T.Mesh;
  constructor(public canvasEl: HTMLCanvasElement, public w: number, public h: number) {
    this.r = new T.WebGLRenderer({ canvas: canvasEl, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.r.setPixelRatio(1); this.r.setSize(w, h, false); this.r.shadowMap.enabled = true; this.r.shadowMap.type = T.PCFSoftShadowMap; this.r.outputColorSpace = T.LinearSRGBColorSpace;
    this.post = new Post(this.r, w, h);
    // environment for glossy balls / metals
    const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({ side: T.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'varying vec3 vD; void main(){ float y = vD.y; vec3 c = mix(vec3(.55,.48,.38), vec3(.62,.8,1.05), smoothstep(-.15,.5,y)); c += vec3(2.2,1.9,1.5) * smoothstep(.93,.995, dot(vD, normalize(vec3(.5,.7,-.4)))); c += vec3(.9) * smoothstep(.8,.99, dot(vD, normalize(vec3(-.6,.5,.6)))); gl_FragColor = vec4(c,1.); }' })));
    this.env = new T.PMREMGenerator(this.r).fromScene(es, 0).texture;
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096); this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .02; this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.key, this.key.target);
    for (let i = 0; i < 6; i++) { const p = new T.PointLight('#ffb070', 0, 14, 2); this.pts.push(p); this.scene.add(p); }
    this.skyU = { sunDir: WATER.sunDir, top: WATER.skyTop, hor: WATER.skyHor, haze: { value: 0 }, uT: WATER.uT };
    this.sky = new T.Mesh(new T.SphereGeometry(2000, 48, 24), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 sunDir, top, hor; uniform float haze, uT; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
        float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 7.7; a *= .5; } return s; }
        void main(){ float y = max(vD.y, 0.); vec3 c = mix(hor, top, pow(y, .55)); float s = max(dot(vD, sunDir), 0.); c += vec3(1., .85, .6) * (pow(s, 8.) * .35 + pow(s, 900.) * 25.);
          vec2 cp = vD.xz / (vD.y + .18) * 1.6 + vec2(uT * .01, 0.); float cl = smoothstep(.52, .78, fbm(cp)) * smoothstep(.0, .25, vD.y); vec3 cc = mix(vec3(1.05, 1.02, .98), vec3(.72, .76, .84), smoothstep(.6, .9, fbm(cp * 1.7 + 3.)));
          c = mix(c, cc, cl * .85); c = mix(c, vec3(.55, .52, .5), haze * smoothstep(.0, .5, 1. - vD.y));
          if (vD.y < 0.) c = hor * .9; gl_FragColor = vec4(c, 1.); }` }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
    this.scene.fog = new T.FogExp2('#cfe0ea', .004);
    // world
    this.scene.add(terrain(), ocean());
    this.scene.add(town(this.env).grp);
    const pc = palaceComplex(this.env); this.scene.add(pc.grp); this.lighthouse = pc.out.lighthouse; this.flagPole = pc.out.palaceFlag; this.cannons = pc.cannons;
    this.palaceFlag = flagMesh('red', .9); this.palaceFlag.position.set(0, 1.35, 0); this.palaceFlag.rotation.y = Math.PI * .55; this.flagPole.add(this.palaceFlag);
    this.consulFlag = flagMesh('union', .6); this.consulFlag.position.set(-1.6, 1.9, 40.5); this.scene.add(this.consulFlag);
    const cp = new T.Mesh(new T.CylinderGeometry(.02, .025, 1.6, 6), new T.MeshStandardMaterial({ color: '#ddd' })); cp.position.set(-1.6, 1.15, 40.5); this.scene.add(cp);
    this.scene.add(palms(this.env)); this.dhow = dhows(); this.scene.add(this.dhow);
    for (const s of SHIPS) { const sh = new Ship(s, this.env); this.ships.push(sh); this.scene.add(sh.group); }
    // distant mainland on the western horizon
    const ridge = new T.Mesh(new T.CylinderGeometry(900, 900, 26, 96, 1, true, Math.PI * .95, Math.PI * .6), new T.MeshBasicMaterial({ color: '#8fa7b8', side: T.BackSide, fog: false, transparent: true, opacity: .55 }));
    const rp = ridge.geometry.getAttribute('position'); for (let i = 0; i < rp.count; i++) if (rp.getY(i) > 0) rp.setY(i, -13 + 8 + 9 * Math.abs(Math.sin(i * .37)) * .5 + 4 * Math.sin(i * .11)); ridge.position.y = 13; this.scene.add(ridge);
    // House of Wonders clock faces
    const [cc] = canvas(512, 512); this.clockC = cc; this.clockTex = new T.CanvasTexture(cc); this.clockTex.colorSpace = T.SRGBColorSpace; this.clockTex.anisotropy = 8;
    const cm = new T.MeshStandardMaterial({ map: this.clockTex, roughness: .5, emissive: '#ffffff', emissiveMap: this.clockTex, emissiveIntensity: .25 });
    for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.CircleGeometry(.3, 48), cm); const a = i * Math.PI / 2; f.position.set(7.6 + Math.sin(a) * .456, 3.05, 10 + Math.cos(a) * .456); f.rotation.y = a; this.scene.add(f);
      const rim = new T.Mesh(new T.TorusGeometry(.3, .03, 8, 48), new T.MeshStandardMaterial({ color: '#2d2d2d', roughness: .5 })); rim.position.copy(f.position); rim.rotation.y = a; this.scene.add(rim); }
    this.zz = new MiniArmy(this.scene, 'zz', 200, .12, this.env); this.gb = new MiniArmy(this.scene, 'gb', 60, .12, this.env);
    this.sprites = new Sprites(this.scene);
    this.debris = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshStandardMaterial({ roughness: .9, flatShading: true }), 1600); this.debris.castShadow = true; this.debris.frustumCulled = false; this.scene.add(this.debris);
  }
  private drawClock(min: number) {
    const key = Math.round(min * 40); if (key === this.clockKey) return; this.clockKey = key; const g = this.clockC.getContext('2d')!; const S = 512, C = S / 2;
    const gr = g.createRadialGradient(C, C, 20, C, C, C); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#efe4cb'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    g.strokeStyle = '#2a2622'; g.lineWidth = 10; g.beginPath(); g.arc(C, C, 236, 0, 7); g.stroke();
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; const r0 = i % 5 ? 214 : 196; g.lineWidth = i % 5 ? 3 : 9; g.beginPath(); g.moveTo(C + Math.sin(a) * r0, C - Math.cos(a) * r0); g.lineTo(C + Math.sin(a) * 228, C - Math.cos(a) * 228); g.stroke(); }
    g.fillStyle = '#1d1a17'; g.font = '700 46px Inter, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => { const a = i / 12 * Math.PI * 2; g.fillText(t, C + Math.sin(a) * 160, C - Math.cos(a) * 160 + 2); });
    const hr = min / 60 % 12, mn = min % 60; g.lineCap = 'round';
    const hand = (a: number, len: number, w: number, c: string) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(C - Math.sin(a) * 26, C + Math.cos(a) * 26); g.lineTo(C + Math.sin(a) * len, C - Math.cos(a) * len); g.stroke(); };
    hand(hr / 12 * Math.PI * 2, 112, 18, '#151311'); hand(mn / 60 * Math.PI * 2, 182, 11, '#151311'); g.fillStyle = '#b8902f'; g.beginPath(); g.arc(C, C, 16, 0, 7); g.fill();
    this.clockTex.needsUpdate = true;
  }
  ship(id: string) { return this.ships.find(s => s.s.id === id)!; }
  muzzle = (s: Shot): { p: V3; dir: V3 } | null => {
    if (s.ship.startsWith('zzgun')) { const c = this.cannons[+s.ship.slice(5)]; c.updateWorldMatrix(true, true); const p = c.userData.barrel.localToWorld(new T.Vector3(0, .26, 0)); return { p: p.toArray() as V3, dir: [-1, .05, 0] }; }
    const sh = this.ship(s.ship); if (!sh) return null; sh.group.updateMatrixWorld(true); const p = sh.muzzleWorld(Math.min(s.gun, sh.guns.length - 1)); const d = new T.Vector3(...s.target).sub(p).setY(0).normalize();
    return { p: p.toArray() as V3, dir: d.toArray() as V3 };
  };
  async render(F: Frame, frame: number) {
    const t = F.t; WATER.uT.value = t; FLAG_U.uT.value = t; DMG.uT.value = t;
    // ships
    for (const sh of this.ships) {
      sh.group.matrixAutoUpdate = false; sh.group.matrix.copy(shipMatrix(sh.s.id, sh.s.pos, sh.s.yaw, t)); sh.group.matrixWorldNeedsUpdate = true; sh.group.updateMatrixWorld(true);
      // aim at the palace once action stations sound
      const aimK = sh.s.id === 'glasgow' ? 0 : Math.min(1, Math.max(0, (t - 16.5) / 2));
      sh.aim(new T.Vector3(sh.s.id === 'stgeorge' && t < 34.5 ? -20 : 4, 1.2, sh.s.id === 'stgeorge' && t < 34.5 ? -8 : sh.s.pos[2] * .25), aimK);
      for (const g of sh.guns) g.barrel.position.x = 0;
    }
    // recoil
    for (const s of SHOTSALL) { const age = t - s.t; if (age < 0 || age > .5) continue; const k = Math.exp(-age * 9) * Math.min(1, age * 40);
      if (s.ship.startsWith('zzgun')) { const c = this.cannons[+s.ship.slice(5)]; c.userData.barrel.position.z = -.055 + k * .08; continue; }
      const sh = this.ships.find(x => x.s.id === s.ship); if (sh) { const g = sh.guns[Math.min(s.gun, sh.guns.length - 1)]; g.barrel.position.x = -.12 * k; } }
    // damage uniforms
    let n = 0; for (const s of IMPACTS) { if (s.tHit > t + .01 || n >= 48) continue; DMG.imp.value[n].set(s.target[0], s.target[1], s.target[2], s.tHit); DMG.rad.value[n] = s.kind === 'ship' ? .35 : s.rad; n++; }
    for (; n < 48; n++) DMG.imp.value[n].set(0, -99, 0, 1e9);
    // lighthouse + flag
    const lf = lighthouseFall(t); this.lighthouse.rotation.set(0, 0, 0); this.lighthouse.rotateOnAxis(new T.Vector3(.35, 0, -1).normalize(), -lf * 1.62); this.lighthouse.position.y = .3 - lf * .25;
    const ff = flagFall(t); this.flagPole.rotation.set(0, 0, 0); this.flagPole.rotation.z = ff * 1.35; this.flagPole.rotation.x = ff * .25; this.flagPole.position.y = 2.6 - ff * .9;
    this.flagPole.visible = true;
    // clocks
    this.drawClock(F.clock ?? clockAt(t));
    // dhows bob
    const sp = this.dhow.userData.spots as [number, number, number][]; const m4 = new T.Matrix4();
    sp.forEach(([x, z, a], i) => { m4.compose(new T.Vector3(x, Math.sin(t * 1.1 + i) * .03, z), new T.Quaternion().setFromEuler(new T.Euler(Math.sin(t * .9 + i) * .04, a, Math.sin(t * 1.3 + i * 2) * .05)), new T.Vector3(1.2, 1.2, 1.2)); this.dhow.setMatrixAt(i, m4); }); this.dhow.instanceMatrix.needsUpdate = true;
    // soldiers
    const sol = soldiers(t); const ms = F.miniScale ?? 1;
    const gbList: Mini[] = sol.gb.map(u => ({ ...u }));
    if (F.sailors) { const th = this.ship('thrush'); for (const [lx, lz, yaw] of [[.05, .55, Math.PI / 2], [-.15, 1.2, Math.PI * .6], [.2, -.6, Math.PI * .4]] as const) { const p = th.hull.localToWorld(new T.Vector3(lx, th.s.fb, lz)); gbList.push({ pos: [p.x, p.y, p.z], yaw: yaw + th.s.yaw, hop: Math.max(0, Math.sin(t * 5 + lz * 3)) * .04, scared: 0, vis: true }); } }
    this.zz.set(F.hideMinis ? [] : sol.zz, ms); this.gb.set(F.hideMinis ? [] : gbList, ms);
    // camera (+ shake)
    const sk = shake(t, F.cam.pos, F.shakeK ?? 1);
    this.cam.position.set(F.cam.pos[0], F.cam.pos[1], F.cam.pos[2]); this.cam.up.set(...(F.cam.up ?? [0, 1, 0])); this.cam.lookAt(...F.cam.look); if (F.cam.roll) this.cam.rotateZ(F.cam.roll);
    this.cam.translateX(sk[0]); this.cam.translateY(sk[1]);
    this.cam.fov = F.cam.fov; this.cam.aspect = this.w / this.h; this.cam.near = F.mapMode ? 1 : .05; this.cam.updateProjectionMatrix(); this.cam.updateMatrixWorld();
    this.sky.position.copy(this.cam.position); WATER.camPos.value.copy(this.cam.position);
    // light
    const sd = WATER.sunDir.value; const haze = F.haze ?? Math.min(.55, Math.max(0, (t - 30) / 30) * .55);
    const foc = new T.Vector3(...(F.sun?.focus ?? F.cam.look)); this.sun.position.copy(foc).addScaledVector(sd, 80); this.sun.target.position.copy(foc); this.sun.target.updateMatrixWorld();
    const sz = F.sun?.size ?? 14; const sc = this.sun.shadow.camera; sc.left = -sz; sc.right = sz; sc.top = sz; sc.bottom = -sz; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
    this.sun.intensity = 3.3 * (1 - haze * .35); this.sun.color.set('#fff0d6').lerp(new T.Color('#ffc58f'), haze * .6); this.hemi.intensity = 1.15 * (1 - haze * .2);
    const kd = this.cam.position.clone().sub(new T.Vector3(...F.cam.look)).normalize(); this.key.position.copy(new T.Vector3(...F.cam.look)).addScaledVector(kd, 10).add(new T.Vector3(0, 4, 0)); this.key.target.position.set(...F.cam.look); this.key.target.updateMatrixWorld();
    this.skyU.haze.value = haze; (this.scene.fog as T.FogExp2).density = F.mapMode ? .0012 : .0035 + haze * .004; (this.scene.fog as T.FogExp2).color.set('#cfe0ea').lerp(new T.Color('#9d9690'), haze);
    WATER.fogD.value = (this.scene.fog as T.FogExp2).density; WATER.fogC.value.copy((this.scene.fog as T.FogExp2).color); WATER.smokeDark.value = haze * .12;
    // balls
    const seen = new Set<string>();
    for (const b of F.balls ?? []) { let o = this.balls.get(b.id); if (!o) { o = new Ball(this.scene, b.kind, this.env); this.balls.set(b.id, o); } o.update(b); seen.add(b.id); }
    for (const [k, b] of this.balls) if (!seen.has(k)) b.hide();
    // fx
    const funnels: V3[] = []; for (const sh of this.ships) for (const f of sh.funnelTops) { if (sh.s.id === 'glasgow' && t > 33) continue; const p = sh.hull.localToWorld(f.clone()); funnels.push([p.x, p.y, p.z]); }
    const fx = buildFx(t, this.muzzle, { funnels, mapMode: F.mapMode });
    this.sprites.list = fx.S; this.sprites.commit(this.cam);
    const q = new T.Quaternion(), c = new T.Color(); let di = 0;
    for (const d of fx.D) { if (di >= 1600) break; q.setFromEuler(new T.Euler(...d.r)); m4.compose(new T.Vector3(...d.p), q, new T.Vector3(d.s, d.s * .7, d.s)); this.debris.setMatrixAt(di, m4); this.debris.setColorAt(di, c.set(d.c)); di++; }
    this.debris.count = di; this.debris.instanceMatrix.needsUpdate = true; if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
    // lights: strongest near the camera's subject
    const tgt = new T.Vector3(...F.cam.look);
    const Ls = fx.L.map(l => ({ l, w: l.i / (1 + new T.Vector3(...l.p).distanceToSquared(tgt) * .01) })).sort((a, b) => b.w - a.w);
    this.pts.forEach((p, i) => { const e = Ls[i]?.l; if (!e || e.i < .05) { p.intensity = 0; p.visible = false; return; } p.visible = true; p.position.set(...e.p); p.color.setRGB(...e.c); p.intensity = e.i * 2.2; p.distance = 6 + e.i * .8; });
    const Lw = fx.L.slice().sort((a, b) => b.i - a.i);
    for (let i = 0; i < 8; i++) { const e = Lw[i]; if (e) { WATER.lp.value[i].set(e.p[0], e.p[1], e.p[2], Math.min(e.i * .07, .6)); WATER.lc.value[i].setRGB(...e.c); } else WATER.lp.value[i].set(0, -50, 0, 0); }
    const spl = fx.splashes.slice(-16); for (let i = 0; i < 16; i++) { const s = spl[i]; if (s) WATER.splash.value[i].set(s.p[0], s.s, s.p[2], s.t); else WATER.splash.value[i].set(0, 1, 0, -99); }
    this.post.render(this.scene, this.cam, { ...DEFAULT_GRADE, bloom: .22, bloomTh: 1.6, sat: 1.12, contrast: 1.06, vignette: .26, grain: .025, ...(F.grade ?? {}) }, frame);
  }
}
