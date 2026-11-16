// Procedurally posed creatures from dinos.glb: every bone is driven per frame (no baked clips), so gaits keep the feet
// planted, heads track targets, tails and wings follow through. Model space: y up, creature faces +z.
import * as T from 'three';

/** skinned-mesh aware clone (same approach as three's SkeletonUtils.clone) */
function skClone(source: T.Object3D) {
  const srcOf = new Map<T.Object3D, T.Object3D>(), cloneOf = new Map<T.Object3D, T.Object3D>(); const clone = source.clone();
  const par = (a: T.Object3D, b: T.Object3D) => { srcOf.set(b, a); cloneOf.set(a, b); for (let i = 0; i < a.children.length; i++) par(a.children[i], b.children[i]); };
  par(source, clone);
  clone.traverse(n => { const c = n as T.SkinnedMesh; if (!c.isSkinnedMesh) return; const s = srcOf.get(c) as T.SkinnedMesh;
    c.skeleton = s.skeleton.clone(); c.bindMatrix.copy(s.bindMatrix); c.skeleton.bones = s.skeleton.bones.map(b => cloneOf.get(b) as T.Bone); c.bind(c.skeleton, c.bindMatrix); });
  return clone;
}
export type Kind = 'raptor' | 'rex' | 'sauro' | 'ptero' | 'bird';
export type CreatureState = {
  id: string; kind: Kind; pos: [number, number, number]; yaw: number; scale?: number;
  gait?: { phase: number; stride: number; lift?: number };   // phase in cycles (one cycle = two steps)
  crouch?: number;          // 0 standing … 1 lying down (legs folded under the body)
  lean?: number;            // body pitch (+ = nose down)
  neck?: [number, number];  // [pitch(+down), yaw(+left)] spread over the neck chain
  head?: [number, number, number]; // head pitch, yaw, roll
  jaw?: number; blink?: number; breathe?: number; t: number;
  tail?: [number, number];  // tail yaw sway, pitch
  wing?: number;            // 0 folded … 1 spread wide
  wrap?: number;            // 0 … 1 spread wings swept forward (shielding)
  flap?: number;            // flyers: wingbeat phase (cycles); glide when undefined
  tint?: string;            // colour multiplier for juveniles / variants
  shake?: number;           // shiver (fear, cold)
};
type Bn = { b: T.Bone; par: Bn | null; p0: T.Vector3; q0: T.Quaternion; ax0: T.Vector3; kids: Bn[] };
const X = new T.Vector3(1, 0, 0), Y = new T.Vector3(0, 1, 0), Z = new T.Vector3(0, 0, 1);
const qa = (axis: T.Vector3, a: number) => new T.Quaternion().setFromAxisAngle(axis, a);
const qe = (p: number, y: number, r = 0) => qa(Y, y).multiply(qa(X, p)).multiply(qa(Z, r));
const fromTo = (a: T.Vector3, b: T.Vector3) => new T.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());

export class Creature {
  root: T.Object3D; bones = new Map<string, Bn>(); order: Bn[] = []; armWorld = new T.Matrix4(); armQ = new T.Quaternion();
  D = new Map<Bn, T.Quaternion>(); P = new Map<Bn, T.Vector3>(); mats: T.Material[] = [];
  constructor(src: T.Object3D, public kind: Kind, scene: T.Scene) {
    this.root = skClone(src); scene.add(this.root); this.root.position.set(0, 0, 0); this.root.updateMatrixWorld(true);
    const all: T.Bone[] = []; this.root.traverse(o => { if ((o as T.Bone).isBone) all.push(o as T.Bone); });
    const map = new Map<T.Bone, Bn>();
    for (const b of all) {
      const m = b.matrixWorld; const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); m.decompose(p, q, s);
      const n: Bn = { b, par: null, p0: p, q0: q, ax0: Y.clone().applyQuaternion(q), kids: [] }; map.set(b, n);
      this.bones.set(b.name.replace(kind + '_', ''), n);
    }
    for (const [b, n] of map) { const pb = b.parent as T.Bone; if (pb && map.has(pb)) { n.par = map.get(pb)!; n.par.kids.push(n); } }
    const visit = (n: Bn) => { this.order.push(n); n.kids.forEach(visit); }; for (const n of map.values()) if (!n.par) visit(n);
    const top = this.order[0].b.parent!; top.updateMatrixWorld(true); this.armWorld.copy(top.matrixWorld); const s = new T.Vector3(), p = new T.Vector3(); this.armWorld.decompose(p, this.armQ, s);
    this.root.traverse(o => {
      const me = o as T.SkinnedMesh; if (!me.isMesh) return; me.castShadow = true; me.receiveShadow = true; me.frustumCulled = false;
      const ms = (Array.isArray(me.material) ? me.material : [me.material]).map(m => m.clone()); me.material = ms.length === 1 ? ms[0] : ms; this.mats.push(...ms);
    });
  }
  private get(n: string) { return this.bones.get(n); }
  setVisible(v: boolean) { this.root.visible = v; }
  /** pose all bones. d: per-bone model-space rotation applied at the bone head (FK); ik: absolute overrides; pelvisOff: translation */
  private solve(d: Record<string, T.Quaternion>, ik: Record<string, T.Vector3>, pelvisOff: T.Vector3) {
    this.D.clear(); this.P.clear();
    for (const n of this.order) {
      const name = n.b.name.replace(this.kind + '_', '');
      if (!n.par) { this.P.set(n, n.p0.clone().add(pelvisOff)); this.D.set(n, (d[name] ?? new T.Quaternion()).clone()); continue; }
      const Dp = this.D.get(n.par)!; const p = this.P.get(n.par)!.clone().add(n.p0.clone().sub(n.par.p0).applyQuaternion(Dp)); this.P.set(n, p);
      let Dn = Dp.clone().multiply(d[name] ?? new T.Quaternion());
      if (ik[name] && n.kids.length) {   // aim this bone's head→(first child head) at the target point
        const k = n.kids[0]; const restDir = k.p0.clone().sub(n.p0).applyQuaternion(Dp); const want = ik[name].clone().sub(p);
        Dn = fromTo(restDir, want).multiply(Dp);
      } else if (ik[name]) { const restDir = n.ax0.clone().applyQuaternion(Dp); Dn = fromTo(restDir, ik[name].clone().sub(p)).multiply(Dp); }
      this.D.set(n, Dn);
    }
    for (const n of this.order) {
      const W = this.D.get(n)!.clone().multiply(n.q0); const P = this.P.get(n)!;
      if (!n.par) { const inv = this.armWorld.clone().invert(); n.b.position.copy(P.clone().applyMatrix4(inv)); n.b.quaternion.copy(this.armQ.clone().invert().multiply(W)); }
      else { const Wp = this.D.get(n.par)!.clone().multiply(n.par.q0); const iq = Wp.clone().invert(); n.b.position.copy(P.clone().sub(this.P.get(n.par)!).applyQuaternion(iq)); n.b.quaternion.copy(iq.multiply(W)); }
    }
  }
  /** two-bone leg: hip(thigh head) → knee → ankle, then metatarsus to the ball of the foot, toe flat */
  private leg(side: string, ball: T.Vector3, meta: number, d: Record<string, T.Quaternion>, ik: Record<string, T.Vector3>, hip: T.Vector3, kneeFwd = 1) {
    const th = this.get('thigh' + side)!, sh = this.get('shin' + side)!, ft = this.get('foot' + side), to = this.get('toe' + side);
    const l1 = sh.p0.distanceTo(th.p0); const end0 = ft ? ft.p0 : null; const l2 = end0 ? end0.distanceTo(sh.p0) : 1;
    let ankle: T.Vector3;
    if (ft && to) { const restV = ft.p0.clone().sub(to.p0); ankle = ball.clone().add(restV.applyAxisAngle(X, meta)); } else ankle = ball.clone();
    const v = ankle.clone().sub(hip); let dist = v.length(); dist = Math.min(dist, (l1 + (ft ? l2 : this.legLen(side) - l1)) * .999);
    const L2 = ft ? l2 : this.legLen(side) - l1; const dir = v.normalize();
    const a = (l1 * l1 - L2 * L2 + dist * dist) / (2 * dist); const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const perp = Z.clone().multiplyScalar(kneeFwd).sub(dir.clone().multiplyScalar(dir.dot(Z) * kneeFwd)).normalize();
    const knee = hip.clone().add(dir.clone().multiplyScalar(a)).add(perp.multiplyScalar(h)); const ank = hip.clone().add(dir.clone().multiplyScalar(dist));
    ik['thigh' + side] = knee; ik['shin' + side] = ank; if (ft && to) { ik['foot' + side] = ball; ik['toe' + side] = ball.clone().add(new T.Vector3(0, -.01, .3)); }
    void d;
  }
  private legLen(side: string) { const th = this.get('thigh' + side)!, sh = this.get('shin' + side)!; return th.p0.distanceTo(sh.p0) * 2; }
  pose(S: CreatureState) {
    const d: Record<string, T.Quaternion> = {}; const ik: Record<string, T.Vector3> = {}; const off = new T.Vector3(); const t = S.t;
    const crouch = S.crouch ?? 0, br = (S.breathe ?? 1) * Math.sin(t * 1.7) * .5 + .5;
    const sway = (k: number) => Math.sin(t * 1.1 - k * .7);
    const shake = (S.shake ?? 0) * Math.sin(t * 47) * .015;
    if (this.kind === 'ptero' || this.kind === 'bird') {
      const fl = S.flap; const beat = fl === undefined ? .15 : Math.sin(fl * Math.PI * 2);
      for (const sd of ['L', 'R']) { const s = sd === 'L' ? 1 : -1; d['wing1' + sd] = qa(Z, s * (beat * .75 + .05)); d['wing2' + sd] = qa(Z, s * (fl === undefined ? .05 : Math.sin(fl * Math.PI * 2 - .8) * .55)); }
      d.body = qe(S.lean ?? 0, 0, 0); d.head = qe(S.head?.[0] ?? 0, S.head?.[1] ?? 0); off.y = fl === undefined ? 0 : -beat * .02 * (this.kind === 'bird' ? 1 : 6);
      this.solve(d, ik, off); return this.place(S);
    }
    const g = S.gait; const big = this.kind === 'sauro' ? 3 : this.kind === 'rex' ? 2.1 : 1;
    let bob = 0, roll = 0;
    if (g) { const c = g.phase * Math.PI * 2; bob = -Math.abs(Math.cos(c)) * .05 * big * Math.min(1, g.stride / big); roll = Math.sin(c) * .03; }
    const lean = (S.lean ?? 0) + crouch * .12;
    off.set(0, bob - crouch * (this.kind === 'sauro' ? 2.6 : this.kind === 'rex' ? 2.2 : 1.08) + br * .01 * big + shake, 0);
    d.pelvis = qe(lean, (S.tail?.[0] ?? 0) * -.15 + sway(0) * .02, roll);
    d.spine = qe(-lean * .4 + br * .015, 0); d.chest = qe(-lean * .3 - br * .02, 0);
    const [np, ny] = S.neck ?? [0, 0]; const nk = this.kind === 'sauro' ? ['neck1', 'neck2', 'neck3'] : ['neck1', 'neck2'];
    for (const n of nk) d[n] = qe(np / nk.length - lean * .2, ny / nk.length + sway(1) * .01);
    const [hp, hy, hr] = S.head ?? [0, 0, 0]; d.head = qe(hp, hy, hr); d.jaw = qa(X, (S.jaw ?? 0) * .55);
    const bl = S.blink ?? 0; d.lidL = qa(X, -1.45 + bl * 1.75); d.lidR = qa(X, -1.45 + bl * 1.75);
    const [ty, tp] = S.tail ?? [0, 0]; ['tail1', 'tail2', 'tail3', 'tail4'].forEach((n, k) => { d[n] = qe(tp * .25 + crouch * .06, ty * .25 + sway(k + 2) * .045 * (1 + k * .4)); });
    // forelimbs / wings
    const w = S.wing ?? 0, wr = S.wrap ?? 0;
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1;
      if (this.kind === 'sauro') continue;
      d['arm' + sd] = qa(Z, s * (w * 1.1 + wr * .9)).multiply(qa(X, -w * .35 - wr * .7)).multiply(qa(Y, s * wr * .9));
      d['fore' + sd] = qa(X, -w * .5 - wr * .2).multiply(qa(Y, s * (w * .5 + wr * .4)));
      d['hand' + sd] = qa(Y, s * (w * .3 + wr * .3));
    }
    // legs: planted gait, crouch / lying fold
    this.solve(d, {}, off);   // first pass: hip positions after pelvis transform
    const legs: [string, number][] = this.kind === 'sauro' ? [['L', 0], ['R', .5]] : [['L', 0], ['R', .5]];
    for (const [sd, ph] of legs) {
      const th = this.get('thigh' + sd)!; const hip = this.P.get(th)!.clone(); const to = this.get('toe' + sd); const sh = this.get('shin' + sd)!;
      const ball0 = to ? to.p0.clone() : new T.Vector3(sh.p0.x, .1, sh.p0.z);
      let z = 0, y = 0, meta = 0;
      if (g && g.stride > 0) {
        const u = ((g.phase + ph) % 1 + 1) % 1; const st = .62;
        if (u < st) { z = g.stride * (.5 - u / st); meta = (u / st) ** 2 * .45; }
        else { const s = (u - st) / (1 - st); const e = s * s * (3 - 2 * s); z = -g.stride / 2 + g.stride * e; y = (g.lift ?? .18 * big) * Math.sin(Math.PI * s); meta = .45 * (1 - s) + .35 * Math.sin(Math.PI * s); }
      }
      const fold = crouch; meta += -fold * 1.25; const ball = ball0.clone().add(new T.Vector3(0, y, z + fold * .35 * big));
      this.leg(sd, ball, meta, d, ik, hip, 1);
      if (this.kind === 'sauro') {   // front legs: same gait, half a cycle offset
        const up = this.get('upper' + sd)!; const lo = this.get('lower' + sd)!; const sho = this.P.get(up)!.clone();
        const u = g ? ((g.phase + ph + .25) % 1 + 1) % 1 : 0; let fz = 0, fy = 0;
        if (g && g.stride > 0) { if (u < .62) fz = g.stride * (.5 - u / .62); else { const s = (u - .62) / .38; fz = -g.stride / 2 + g.stride * s * s * (3 - 2 * s); fy = .5 * Math.sin(Math.PI * s); } }
        const foot = new T.Vector3(lo.p0.x, .1 + fy, lo.p0.z + fz); const l1 = lo.p0.distanceTo(up.p0), l2 = l1;
        const v = foot.clone().sub(sho); const dist = Math.min(v.length(), (l1 + l2) * .999); const dir = v.normalize(); const a = dist / 2; const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
        const perp = Z.clone().multiplyScalar(-1).sub(dir.clone().multiplyScalar(-dir.dot(Z))).normalize();
        ik['upper' + sd] = sho.clone().add(dir.clone().multiplyScalar(a)).add(perp.multiplyScalar(h)); ik['lower' + sd] = sho.clone().add(dir.multiplyScalar(dist));
      }
    }
    this.solve(d, ik, off);
    return this.place(S);
  }
  private place(S: CreatureState) {
    this.root.position.set(...S.pos); this.root.rotation.set(0, S.yaw, 0); this.root.scale.setScalar(S.scale ?? 1); this.root.visible = true;
    if (S.tint) for (const m of this.mats) { const mm = m as T.MeshStandardMaterial; if (mm.userData.base === undefined) mm.userData.base = mm.color.clone(); mm.color.copy(mm.userData.base).multiply(new T.Color(S.tint)); }
    return this;
  }
}
