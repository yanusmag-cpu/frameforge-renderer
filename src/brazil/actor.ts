// Flat FrameForge stickmen standing in the 3D sets: the ff2d rig (IK limbs, faces, blinks) is drawn to a canvas
// and shown on a camera-facing cutout anchored at the feet, with a real cast shadow and a soft contact shadow.
import * as T from 'three';
import { type Look, type Pose, stickman, type Joints } from '../ff2d/rig.ts';
import { type Face } from '../ff2d/face.ts';
import { toon, type ToonLook, type Held } from '../ff2d/toon.ts';
import { folk, type FolkLook, type Prop } from '../yw6/folk.ts';
import { toon7, type T7Look, type T7Prop } from '../yw7/toon7.ts';

export const UNIT = 1.75 / 4.2;           // rig unit (head diameter) in metres for a 1.75 m stickman
const VB = { x0: -2.8, x1: 2.8, y0: -5.4, y1: .35 }; // rig viewBox (y down, 0 = ground)
const VW = VB.x1 - VB.x0, VH = VB.y1 - VB.y0;

export type ActorState = {
  id: string; look: Look; pose: Pose; face: Face;
  pos: [number, number, number];    // feet position (world)
  t: number; seed?: number; scale?: number; noAuto?: boolean;
  tint?: [number, number, number];  // light level / colour on the flat character
  rim?: string; rimSide?: number;
  res?: number;                     // canvas height in px
  lean?: number;                    // billboard tilt toward a high camera (0..1)
  shadow?: boolean; contact?: number;
  extra?: string;                   // extra SVG drawn in rig space (held 2D props)
  under?: string;                   // SVG drawn behind the character
  roll?: number;                    // rotate the cut-out in its own plane about the feet (lying down = ±PI/2)
  toon?: ToonLook; heldA?: Held; heldB?: Held; hatOff?: number; toonOpts?: { torchLit?: number; heldAng?: number };   // YunoWorld cartoon cast instead of the stickman
  flip?: boolean;                   // mirror the cut-out (reflections)
  folk?: FolkLook; propA?: Prop; propB?: Prop;   // YunoWorld Folk (v6 character system)
  t7?: T7Look; t7A?: T7Prop; t7B?: T7Prop; squash?: number;   // YunoWorld Ink (v7 character system)
  svgOnly?: string;                 // pre-drawn SVG in rig space (v9 animals such as the pigeons)
};
const blobTex = (() => { let t: T.Texture | null = null; return () => {
  if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.6, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); t = new T.CanvasTexture(c); return t; }; })();

export class Actor {
  mesh: T.Mesh; blob: T.Mesh; canvas: HTMLCanvasElement; tex: T.CanvasTexture; mat: T.MeshBasicMaterial; joints: Joints | null = null;
  right = new T.Vector3(1, 0, 0); up = new T.Vector3(0, 1, 0); base = new T.Vector3(); scale = 1;
  private res = 0; private lastSvg = '';
  constructor(scene: T.Scene, public name: string) {
    this.canvas = document.createElement('canvas'); this.tex = new T.CanvasTexture(this.canvas); this.tex.colorSpace = T.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = new T.MeshBasicMaterial({ map: this.tex, alphaTest: .5, side: T.DoubleSide, toneMapped: false });
    this.mat.alphaToCoverage = true;
    const geo = new T.PlaneGeometry(VW * UNIT, VH * UNIT); geo.translate((VB.x0 + VW / 2) * UNIT, -(VB.y0 + VH / 2) * UNIT, 0);
    this.mesh = new T.Mesh(geo, this.mat); this.mesh.castShadow = true; this.mesh.receiveShadow = false;
    this.mesh.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: this.tex, alphaTest: .5 });
    this.mesh.renderOrder = 2; scene.add(this.mesh);
    this.blob = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, toneMapped: false }));
    this.blob.rotation.x = -Math.PI / 2; this.blob.renderOrder = 1; scene.add(this.blob);
  }
  hide() { this.mesh.visible = false; this.blob.visible = false; }
  /** world position of a rig-space point (x right, y down, units) */
  world(p: [number, number], out = new T.Vector3()) {
    return out.copy(this.base).addScaledVector(this.right, p[0] * UNIT * this.scale).addScaledVector(this.up, -p[1] * UNIT * this.scale);
  }
  async update(s: ActorState, cam: T.Camera) {
    const sc = s.scale ?? 1; this.scale = sc;
    const res = s.res ?? 1024;
    if (res !== this.res) { this.res = res; this.canvas.height = res; this.canvas.width = Math.round(res * VW / VH); this.lastSvg = ''; this.tex.dispose(); }
    const r = s.svgOnly !== undefined ? { svg: s.svgOnly, j: this.joints as Joints }
      : s.t7 ? toon7(s.pose, s.t7, { id: s.id, t: s.t, seed: s.seed, face: s.face, noAuto: s.noAuto, propA: s.t7A, propB: s.t7B, rim: s.rim, rimSide: s.rimSide, squash: s.squash })
      : s.folk ? folk(s.pose, s.folk, { id: s.id, t: s.t, seed: s.seed, face: s.face, noAuto: s.noAuto, heldA: s.propA, heldB: s.propB, rim: s.rim, rimSide: s.rimSide })
      : s.toon ? toon(s.pose, s.toon, { id: s.id, t: s.t, seed: s.seed, face: s.face, noAuto: s.noAuto, heldA: s.heldA, heldB: s.heldB, hatOff: s.hatOff, ...s.toonOpts })
      : stickman(s.pose, s.look, { id: s.id, t: s.t, seed: s.seed, face: s.face, noAuto: s.noAuto, lighting: s.rim ? { rim: s.rim, rimSide: s.rimSide } : undefined });
    this.joints = r.j;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvas.width}" height="${this.canvas.height}" viewBox="${VB.x0} ${VB.y0} ${VW} ${VH}">${s.under ?? ''}${r.svg}${s.extra ?? ''}</svg>`;
    if (svg !== this.lastSvg) {
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      try { await img.decode(); } catch { const e = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror'); throw new Error('SVG decode failed for ' + s.id + ': ' + (e?.textContent ?? '') + ' :: ' + svg.slice(0, 300)); }
      const g = this.canvas.getContext('2d')!; g.clearRect(0, 0, this.canvas.width, this.canvas.height); g.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.tex.needsUpdate = true; this.lastSvg = svg;
    }
    // cylindrical billboard anchored at the feet, optionally leaning back toward a high camera
    this.base.set(...s.pos); const cp = new T.Vector3(); cam.getWorldPosition(cp);
    const to = cp.clone().sub(this.base); const yaw = Math.atan2(to.x, to.z);
    const pitch = Math.atan2(to.y, Math.hypot(to.x, to.z));
    const lean = (s.lean ?? .5) * Math.max(0, pitch);
    this.mesh.position.copy(this.base); this.mesh.rotation.set(0, 0, 0); this.mesh.rotateY(yaw); this.mesh.rotateX(-lean); if (s.roll) this.mesh.rotateZ(s.roll);
    this.mesh.scale.set(s.flip ? -sc : sc, sc, sc); this.mesh.visible = true;
    this.mesh.updateMatrixWorld(); this.right.set(1, 0, 0).applyQuaternion(this.mesh.quaternion); this.up.set(0, 1, 0).applyQuaternion(this.mesh.quaternion);
    const tint = s.tint ?? [1, 1, 1]; const W = 1.14; this.mat.color.setRGB(tint[0] * W, tint[1] * W, tint[2] * W);
    this.mesh.castShadow = s.shadow ?? true;
    const cs = s.contact ?? 1; this.blob.visible = cs > 0; (this.blob.material as T.MeshBasicMaterial).opacity = cs;
    const hipX = (s.pose.hipX ?? 0) * UNIT * sc; this.blob.position.copy(this.base).addScaledVector(this.right, hipX); this.blob.position.y += .012;
    this.blob.scale.set(1.25 * sc, .55 * sc, 1); this.blob.rotation.set(-Math.PI / 2, 0, yaw);
  }
}
