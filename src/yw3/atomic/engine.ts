// Film 1 engine — sets live at separate world origins and are shown one at a time.
import * as T from 'three';
import { Core, GLSL_NOISE, type YFrame } from '../core.ts';
import { street, tram, city, carriage, windowScroll, locomotive, countryside, office, glassPanes, hills, lanternRiver } from './world.ts';

export const SET = { street: [0, 0, 0], city: [8000, 0, 0], carriage: [-8000, 0, 0], train: [0, 0, 12000], office: [16000, 0, 0], river: [-16000, 0, 0] } as const;
export type SetName = keyof typeof SET;
export type AFrame = YFrame & { set: SetName; ruin?: number; tramZ?: number; trainZ?: number; scroll?: number; glass?: number; lanternT?: number;
  sky?: { top: string; hor: string; flash?: number; sunDir?: [number, number, number]; haze?: number } };

export class AtomicEngine extends Core {
  sets = new Map<string, T.Group>(); skyU: Record<string, T.IUniform>; sky: T.Mesh; intact: T.Object3D; ruins: T.Object3D; tramM: T.Mesh; loco: T.Group; winMat: T.MeshBasicMaterial; glass: T.Group; lanterns: T.InstancedMesh;
  constructor(cv: HTMLCanvasElement, w: number, h: number) {
    super(cv, w, h, '#b7c9e0', '#7d6a55');
    const mk = (n: SetName) => { const g = new T.Group(); g.position.set(SET[n][0], SET[n][1], SET[n][2]); this.scene.add(g); this.sets.set(n, g); return g; };
    const st = mk('street'); this.intact = street(false); this.ruins = street(true); st.add(this.intact, this.ruins); this.tramM = tram(); st.add(this.tramM);
    // shipyard cranes at the end of the street
    const cr = new T.Group(); for (const x of [-14, 10, 30]) { const b = new T.Mesh(new T.BoxGeometry(1.2, 40, 1.2), new T.MeshStandardMaterial({ color: '#3d3f42' })); b.position.set(x, 20, -320); const j = new T.Mesh(new T.BoxGeometry(34, 1.2, 1.2), b.material); j.position.set(x + 10, 39, -320); cr.add(b, j); }
    st.add(cr);
    const ci = mk('city'); ci.add(city());
    const ca = mk('carriage'); ca.add(carriage()); this.winMat = windowScroll();
    for (const s of [-1, 1]) { const p = new T.Mesh(new T.PlaneGeometry(40, 2.2), this.winMat); p.position.set(s * 1.6, 1.5, 0); p.rotation.y = -s * Math.PI / 2; ca.add(p); }
    const tr = mk('train'); tr.add(countryside()); this.loco = locomotive(); this.loco.position.y = 1.2; tr.add(this.loco);
    const of = mk('office'); of.add(office()); this.glass = glassPanes(); of.add(this.glass); const hl = hills(); hl.position.set(0, -6, -10); of.add(hl);
    const rv = mk('river'); const lr = lanternRiver(); rv.add(lr); this.lanterns = lr.userData.lanterns;
    this.skyU = { top: { value: new T.Color() }, hor: { value: new T.Color() }, flash: { value: 0 }, sunDir: { value: new T.Vector3(.3, .5, -.6) }, haze: { value: 0 } };
    this.sky = new T.Mesh(new T.SphereGeometry(4000, 48, 24), new T.ShaderMaterial({ uniforms: this.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform vec3 top, hor, sunDir; uniform float flash, haze; varying vec3 vD; ${GLSL_NOISE}
        void main(){ float y = max(vD.y, 0.); vec3 c = mix(hor, top, pow(y, .5)); float s = max(dot(vD, normalize(sunDir)), 0.); c += vec3(1., .85, .6) * (pow(s, 6.) * .3 + pow(s, 600.) * 12.);
          vec2 cp = vD.xz / (vD.y + .15) * 1.3; float cl = smoothstep(.55, .8, fbm(cp)) * smoothstep(0., .3, vD.y); c = mix(c, mix(vec3(1.), hor * .9, .3), cl * .6 * (1. - haze));
          c = mix(c, vec3(.55, .45, .38), haze * smoothstep(.0, .7, 1. - vD.y)); c += vec3(1.4, 1.3, 1.15) * flash; if (vD.y < 0.) c = mix(hor, vec3(.3), .3) * (1. + flash); gl_FragColor = vec4(c, 1.); }` }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
  }
  async render(F: AFrame, frame: number) {
    for (const [k, g] of this.sets) g.visible = k === F.set;
    const ruin = F.ruin ?? 0; this.intact.visible = ruin < .5; this.ruins.visible = ruin >= .5; this.tramM.visible = ruin < .5;
    this.tramM.position.set(-.0, 0, F.tramZ ?? -40);
    if (F.trainZ !== undefined) this.loco.position.z = F.trainZ;
    (this.winMat.map as T.Texture).offset.x = F.scroll ?? 0;
    this.glass.visible = (F.glass ?? 1) > .5;
    const lt = F.lanternT ?? 0; const m = new T.Matrix4();
    for (let i = 0; i < 120; i++) { const x = ((i * 37) % 200) - 100 + lt * (.4 + (i % 5) * .08), z = ((i * 53) % 40) - 18; m.compose(new T.Vector3(((x + 100) % 200) - 100, Math.sin(lt * 1.3 + i) * .03, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), i), new T.Vector3(1, 1, 1)); this.lanterns.setMatrixAt(i, m); }
    this.lanterns.instanceMatrix.needsUpdate = true;
    const s = F.sky ?? { top: '#5b8fd0', hor: '#cfdde8' }; this.skyU.top.value.set(s.top); this.skyU.hor.value.set(s.hor); this.skyU.flash.value = s.flash ?? 0; this.skyU.haze.value = s.haze ?? 0; if (s.sunDir) this.skyU.sunDir.value.set(...s.sunDir);
    await this.frameBase(F); this.sky.position.copy(this.cam.position);
    this.draw(F, frame);
  }
}
