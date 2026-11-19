// Film 2 engine — planet/atmosphere sky dome (ray-traced sphere, altitude-dependent), helium balloon, capsule,
// ram-air parachute, New Mexico desert landing zone. Foreground in metres; the planet is drawn in the dome shader.
import * as T from 'three';
import { Core, Builder, M, GLSL_NOISE, rng, type YFrame, type V3 } from '../core.ts';
import { groundMat } from '../atomic/world.ts';

export type SFrame = YFrame & { alt: number; sunDir?: V3; balloon?: { pos: V3; s: number; k: number }; capsule?: { pos: V3; door: number; yaw?: number };
  chute?: { pos: V3; k: number; yaw?: number; lie?: number }; ground?: boolean; spin?: number; dome?: { haze?: number } };

export class StratoEngine extends Core {
  domeU: Record<string, T.IUniform>; dome: T.Mesh; balloon: T.Group; capsule: T.Group; door: T.Mesh; chute: T.Group; canopy: T.Mesh; desert: T.Group; lines: T.LineSegments;
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#2a4a7a', '#7a6a58');
    this.domeU = { alt: { value: 30 }, sunDir: { value: new T.Vector3(.5, .35, -.6).normalize() }, haze: { value: 0 } };
    this.dome = new T.Mesh(new T.SphereGeometry(4000, 64, 32), new T.ShaderMaterial({ uniforms: this.domeU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform float alt, haze; uniform vec3 sunDir; varying vec3 vD; ${GLSL_NOISE}
        const float RP = 6371.;
        vec3 skyCol(vec3 d, float h){            // single-scattering look: blue at sea level, black above ~35 km with a glowing limb
          float dip = acos(RP / (RP + h)); float el = asin(clamp(d.y, -1., 1.)) + dip;     // elevation above the true horizon
          float thick = exp(-h / 8.);                                                         // remaining air above the camera
          vec3 zen = mix(vec3(.0, .0, .01), vec3(.16, .38, .78), pow(thick, .62));
          vec3 hor = mix(vec3(.22, .45, .85), vec3(.75, .85, .95), pow(thick, .5));
          float band = exp(-max(el, 0.) * mix(28., 3.5, pow(thick, .4)));
          vec3 c = mix(zen, hor, band); float s = max(dot(d, sunDir), 0.);
          c += vec3(1., .9, .7) * (pow(s, 1200.) * 40. + pow(s, 30.) * .25 * (.3 + thick));
          return c; }
        void main(){
          vec3 d = normalize(vD); float h = max(alt, .001); vec3 o = vec3(0., RP + h, 0.);
          float b = dot(o, d), c = dot(o, o) - RP * RP, disc = b * b - c; vec3 col;
          if (disc > 0. && -b - sqrt(disc) > 0.) {
            float tt = -b - sqrt(disc); vec3 p = o + d * tt; vec3 n = normalize(p);
            vec2 uv = p.xz;                                          // km on the ground below
            float m = fbm(uv * .045); float m2 = fbm(uv * .2 + 3.); float r = fbm(uv * .9 + 9.);
            vec3 alb = mix(vec3(.66, .52, .38), vec3(.5, .4, .3), m); alb = mix(alb, vec3(.42, .44, .32), smoothstep(.55, .75, m2) * .55); alb = mix(alb, vec3(.8, .74, .64), smoothstep(.62, .8, r) * .25);
            float cl = smoothstep(.55, .8, fbm(uv * .03 + vec2(4.1, 1.7))) * .9; alb = mix(alb, vec3(1.), cl);
            float lit = clamp(dot(n, sunDir) * .9 + .25, 0., 1.);
            col = alb * lit * 1.1;
            float air = 1. - exp(-tt / (60. + h * 25.)); col = mix(col, vec3(.55, .7, .95), air * .55);
          } else col = skyCol(d, h);
          col = mix(col, vec3(.75, .72, .66), haze * (1. - abs(d.y)));
          gl_FragColor = vec4(col, 1.); }` }));
    this.dome.renderOrder = -1; this.scene.add(this.dome);
    // balloon: polyethylene envelope (lathe), translucent with sheen + load tapes
    const prof: T.Vector2[] = []; for (let i = 0; i <= 40; i++) { const k = i / 40; const y = k * 1; const r = Math.sin(Math.pow(k, .85) * Math.PI) * .48 * (1 - .25 * k) + .01; prof.push(new T.Vector2(r, y)); }
    const env = new T.Mesh(new T.LatheGeometry(prof, 64), new T.MeshPhysicalMaterial({ color: '#e8eef4', roughness: .25, metalness: 0, transmission: 0, transparent: true, opacity: .55, side: T.DoubleSide, sheen: 1, sheenColor: new T.Color('#c9e6ff'), clearcoat: 1, envMap: this.env, envMapIntensity: 1.2 }));
    const tp: number[] = []; for (let g = 0; g < 24; g++) { const a = g / 24 * Math.PI * 2; for (let i = 0; i < 40; i++) { const p0 = prof[i], p1 = prof[i + 1]; tp.push(Math.cos(a) * p0.x * 1.003, p0.y, Math.sin(a) * p0.x * 1.003, Math.cos(a) * p1.x * 1.003, p1.y, Math.sin(a) * p1.x * 1.003); } }
    const tapes = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(tp, 3)), new T.LineBasicMaterial({ color: '#b9c4cc', transparent: true, opacity: .6 }));
    this.balloon = new T.Group(); this.balloon.add(env, tapes); this.scene.add(this.balloon);
    // capsule: pressure sphere in a frame, open door on +z, step ledge with rails (no branding)
    const cb = new Builder(); cb.add(new T.SphereGeometry(1.25, 40, 28), M([0, 1.6, 0]), '#e9ebed'); cb.cyl(1.55, 1.7, .5, [0, .25, 0], '#c9a95a', 24);   // crush pad
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .5; cb.cyl(.05, .05, 3.2, [Math.cos(a) * 1.5, 1.8, Math.sin(a) * 1.5], '#b5b9bd', 8); }
    cb.cyl(1.55, 1.55, .08, [0, 3.35, 0], '#b5b9bd', 24); cb.cyl(.06, .06, 2.6, [0, 4.6, 0], '#8a8e92', 8);
    cb.box(1.1, .07, .9, [0, .55, 1.55], '#8d9196'); for (const s of [-1, 1]) { cb.cyl(.03, .03, 1.1, [s * .58, 1.1, 1.75], '#d0d3d6', 8); cb.cyl(.03, .03, .55, [s * .58, 1.62, 1.5], '#d0d3d6', 8, [Math.PI / 2, 0, 0]); }
    cb.add(new T.TorusGeometry(.7, .07, 10, 32), M([0, 1.5, 1.08]), '#9da2a7'); for (let i = 0; i < 3; i++) cb.box(.18, .14, .14, [-.9 + i * .9, 2.9, .9], '#2a2c2f');
    const cap = cb.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .2, envMap: this.env, envMapIntensity: .8 }));
    const hole = new T.Mesh(new T.CircleGeometry(.66, 32), new T.MeshBasicMaterial({ color: '#0c0d10' })); hole.position.set(0, 1.5, 1.1);
    this.door = new T.Mesh(new T.CylinderGeometry(.72, .72, .08, 32), new T.MeshStandardMaterial({ color: '#dfe2e5', roughness: .3, metalness: .2, envMap: this.env }));
    this.door.rotation.x = Math.PI / 2; this.door.position.set(0, 1.5, 1.14);
    this.capsule = new T.Group(); this.capsule.add(cap, hole, this.door); this.scene.add(this.capsule);
    // parachute: ram-air canopy (cells) + lines
    const pb = new Builder(); const span = 7.5, chord = 2.6; for (let i = 0; i < 9; i++) { const k = (i + .5) / 9 - .5; const ang = k * 1.1; const x = Math.sin(ang) * span * .62, y = Math.cos(ang) * span * .35 - span * .35;
      pb.box(span / 9 * .98, .45, chord, [x, y, 0], i % 2 ? '#f2f2ee' : '#1f2d4a', [0, 0, -ang]); }
    this.canopy = pb.mesh(new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: T.DoubleSide })); this.canopy.position.y = 7;
    const lp: number[] = []; for (let i = 0; i < 9; i++) { const k = (i + .5) / 9 - .5; const ang = k * 1.1; const x = Math.sin(ang) * span * .62, y = 7 + Math.cos(ang) * span * .35 - span * .35 - .2; for (const z of [-.9, .9]) lp.push(x, y, z, 0, 1.5, 0); }
    this.lines = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(lp, 3)), new T.LineBasicMaterial({ color: '#333' }));
    this.chute = new T.Group(); this.chute.add(this.canopy, this.lines); this.scene.add(this.chute);
    // desert landing zone near Roswell
    this.desert = new T.Group(); const g = new T.Mesh(new T.PlaneGeometry(3000, 3000, 80, 80), groundMat('#b59a74', .4)); const gp = g.geometry.getAttribute('position');
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), y = gp.getY(i); const r = Math.hypot(x, y); gp.setZ(i, r > 500 ? Math.max(0, Math.sin(x * .004) * 60 + Math.cos(y * .003) * 40) * ((r - 500) / 1000) : 0); }
    g.geometry.computeVertexNormals(); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; this.desert.add(g);
    const R = rng(77); const bb = new Builder(); bb.add(new T.IcosahedronGeometry(.4, 0), M([0, .25, 0], [0, 0, 0], [1.2, .6, 1.1]), '#6f7a4e');
    const im = new T.InstancedMesh(bb.geo(), new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }), 1500); const m = new T.Matrix4();
    for (let i = 0; i < 1500; i++) { const r = 3 + Math.pow(R(), .7) * 300, a = R() * 6.28; const s = .5 + R() * 1.4; m.compose(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), R() * 6), new T.Vector3(s, s * (.6 + R() * .6), s)); im.setMatrixAt(i, m); }
    im.castShadow = true; im.receiveShadow = true; this.desert.add(im);
    const mesa = new Builder(); const RM = rng(5); for (let i = 0; i < 14; i++) { const a = -1.2 + i * .25 + RM() * .1, r = 1100 + RM() * 300; mesa.cyl(80 + RM() * 120, 120 + RM() * 160, 40 + RM() * 60, [Math.cos(a) * r, 25, Math.sin(a) * r], '#a5795a', 7); }
    this.desert.add(mesa.mesh(new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))); this.scene.add(this.desert);
  }
  async render(F: SFrame, frame: number) {
    this.domeU.alt.value = F.alt; this.domeU.haze.value = F.dome?.haze ?? 0; if (F.sunDir) this.domeU.sunDir.value.set(...F.sunDir).normalize();
    const b = F.balloon; this.balloon.visible = !!b; if (b) { this.balloon.position.set(...b.pos); this.balloon.scale.set(b.s * (.35 + .65 * b.k), b.s * (1.25 - .25 * b.k), b.s * (.35 + .65 * b.k)); }
    const c = F.capsule; this.capsule.visible = !!c; if (c) { this.capsule.position.set(...c.pos); this.capsule.rotation.y = c.yaw ?? 0; this.door.position.set(.75 * c.door, 1.5, 1.14 + .1 * c.door); }
    const ch = F.chute; this.chute.visible = !!ch; if (ch) { this.chute.position.set(...ch.pos); this.chute.rotation.set(0, ch.yaw ?? 0, ch.lie ?? 0); const k = ch.k; this.canopy.scale.set(Math.max(.05, k), Math.max(.2, .4 + .6 * k), Math.max(.1, k)); this.canopy.position.y = 1.5 + 5.5 * Math.max(.25, k); this.lines.scale.set(1, Math.max(.3, k), 1); }
    this.desert.visible = !!F.ground;
    await this.frameBase(F); this.dome.position.copy(this.cam.position);
    this.draw(F, frame);
  }
}
