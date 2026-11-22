// YunoWorld v9 cinematic post: HDR scene -> screen-space ambient occlusion (tinted, so contact shadows are coloured,
// never black) -> controlled bloom -> depth of field -> ACES -> grade (lift/gain, saturation, contrast), vignette, grain.
// Same interface as brazil/post.ts so Core.draw() can use it unchanged.
import * as T from 'three';
import { DEFAULT_GRADE, type Grade } from '../brazil/post.ts';

export type Grade9 = Grade & { ao?: number; aoRadius?: number; aoTint?: [number, number, number] };
export { DEFAULT_GRADE };
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
const quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.frustumCulled = false;
const qs = new T.Scene(); qs.add(quad); const qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
function rt(w: number, h: number, samples = 0, depth = false) {
  const r = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples, depthBuffer: depth });
  if (depth) { r.depthTexture = new T.DepthTexture(w, h); r.depthTexture.type = T.UnsignedIntType; }
  r.texture.minFilter = r.texture.magFilter = T.LinearFilter; return r;
}
const bright = new T.ShaderMaterial({ uniforms: { t: { value: null }, th: { value: 1.0 }, knee: { value: .6 } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform float th, knee; varying vec2 vUv;
  void main(){ vec3 c = texture2D(t, vUv).rgb; c = (c.r == c.r && c.g == c.g && c.b == c.b) ? min(c, vec3(64.)) : vec3(0.); float l = max(c.r, max(c.g, c.b)); float s = clamp(l - th + knee, 0., 2. * knee); s = s * s / (4. * knee + 1e-4);
  gl_FragColor = vec4(c * max(s, l - th) / max(l, 1e-4), 1.); }` });
const blur = new T.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new T.Vector2() } }, vertexShader: VS,
  fragmentShader: `uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
  void main(){ vec3 c = texture2D(t, vUv).rgb * .227; c += (texture2D(t, vUv + d * 1.385).rgb + texture2D(t, vUv - d * 1.385).rgb) * .316;
  c += (texture2D(t, vUv + d * 3.231).rgb + texture2D(t, vUv - d * 3.231).rgb) * .07; gl_FragColor = vec4(c, 1.); }` });
const copy = new T.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: VS, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }' });
// depth-only SSAO at half resolution (view-space reconstruction, 16 spiral taps, range-checked so silhouettes don't halo)
const ssao = new T.ShaderMaterial({
  uniforms: { tD: { value: null }, near: { value: .1 }, far: { value: 500 }, th: { value: .4 }, aspect: { value: .5625 }, radius: { value: .5 }, res: { value: new T.Vector2(540, 960) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tD; uniform float near, far, th, aspect, radius; uniform vec2 res; varying vec2 vUv;
  float lin(float d){ return near * far / (far - d * (far - near)); }
  vec3 vp(vec2 uv){ float z = lin(texture2D(tD, uv).r); vec2 n = uv * 2. - 1.; return vec3(n.x * th * aspect * z, n.y * th * z, -z); }
  void main(){
    float d0 = texture2D(tD, vUv).r; if (d0 >= .99999) { gl_FragColor = vec4(1.); return; }
    vec3 p = vp(vUv); vec2 px = 1. / res;
    vec3 dx = vp(vUv + vec2(px.x, 0.)) - p, dy = vp(vUv + vec2(0., px.y)) - p; vec3 n = normalize(cross(dx, dy));
    float rs = radius / (-p.z * th * 2.); float ao = 0.; float a = fract(sin(dot(vUv * res, vec2(12.9898, 78.233))) * 43758.5453) * 6.283;
    for (int i = 0; i < 16; i++) {
      float k = (float(i) + .5) / 16.; float ang = a + float(i) * 2.399; vec2 o = vec2(cos(ang), sin(ang) * aspect) * rs * k;
      vec3 q = vp(vUv + o); vec3 v = q - p; float L = length(v);
      ao += max(0., dot(n, v / max(L, 1e-4)) - .08) * (1. - smoothstep(radius * .6, radius * 1.6, L));
    }
    ao = clamp(1. - ao / 16. * 2.1, 0., 1.); gl_FragColor = vec4(vec3(ao), 1.); }` });
const final = new T.ShaderMaterial({
  uniforms: { tS: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, tD: { value: null }, tSoft: { value: null }, tAO: { value: null },
    exposure: { value: 1 }, bloom: { value: .3 }, sat: { value: 1 }, contrast: { value: 1 }, lift: { value: new T.Vector3() }, gain: { value: new T.Vector3(1, 1, 1) },
    vignette: { value: .3 }, grain: { value: .03 }, seed: { value: 0 }, focus: { value: 6 }, aperture: { value: 0 }, near: { value: .1 }, far: { value: 500 },
    fade: { value: 0 }, flash: { value: 0 }, whip: { value: 0 }, whipDir: { value: new T.Vector2(1, 0) }, ca: { value: .001 }, aspect: { value: .5625 },
    ao: { value: 0 }, aoTint: { value: new T.Vector3(.34, .3, .52) } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D tS, tB1, tB2, tB3, tD, tSoft, tAO; uniform float exposure, bloom, sat, contrast, vignette, grain, seed, focus, aperture, near, far, fade, flash, whip, ca, aspect, ao;
  uniform vec3 lift, gain, aoTint; uniform vec2 whipDir; varying vec2 vUv;
  float lin(float d){ return near * far / (far - d * (far - near)); }
  vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453); }
  vec3 scene(vec2 uv){
    vec2 o = (uv - .5) * ca; vec3 c = vec3(texture2D(tS, uv + o).r, texture2D(tS, uv).g, texture2D(tS, uv - o).b); c = (c.r == c.r && c.g == c.g && c.b == c.b) ? min(c, vec3(64.)) : vec3(0.);
    if (ao > 0.) { float a = texture2D(tAO, uv).r; a = mix(1., a, ao); c *= mix(aoTint, vec3(1.), a); }
    if (aperture > 0.) { float z = lin(texture2D(tD, uv).r); float coc = clamp(abs(z - focus) / max(z, .01) * aperture, 0., 1.); c = mix(c, texture2D(tSoft, uv).rgb, smoothstep(.0, .6, coc)); }
    return c; }
  void main(){
    vec3 c = vec3(0.);
    if (whip > .001) { for (int i = 0; i < 12; i++) { float k = float(i) / 11. - .5; c += scene(vUv + whipDir * k * whip * .25); } c /= 12.; } else c = scene(vUv);
    vec3 b = texture2D(tB1, vUv).rgb * .5 + texture2D(tB2, vUv).rgb * .8 + texture2D(tB3, vUv).rgb * 1.2;
    c = c * exposure + b * bloom;
    c = aces(c);
    float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, sat);
    c = (c - .5) * contrast + .5;
    c = c * gain + lift * (1. - c);
    vec2 v = (vUv - .5) * vec2(1., 1. / aspect * .5625); c *= 1. - vignette * smoothstep(.25, .95, dot(v, v) * 2.2);
    c += (h(vUv * 1000.) - .5) * grain;
    c = mix(c, vec3(1.), flash); c = mix(c, vec3(0.), fade);
    gl_FragColor = vec4(pow(clamp(c, 0., 1.), vec3(1. / 2.2)), 1.);
  }` });

export class Post9 {
  main: T.WebGLRenderTarget; half: T.WebGLRenderTarget; b: T.WebGLRenderTarget[] = []; tmp: T.WebGLRenderTarget[] = []; soft: T.WebGLRenderTarget; softTmp: T.WebGLRenderTarget;
  ao: T.WebGLRenderTarget; aoTmp: T.WebGLRenderTarget;
  constructor(public r: T.WebGLRenderer, public w: number, public h: number) {
    this.main = rt(w, h, 4, true);
    this.half = rt(w >> 1, h >> 1); this.soft = rt(w >> 1, h >> 1); this.softTmp = rt(w >> 1, h >> 1); this.ao = rt(w >> 1, h >> 1); this.aoTmp = rt(w >> 1, h >> 1);
    for (let i = 0; i < 3; i++) { const s = 2 << i; this.b.push(rt(Math.max(1, w / s / 2) | 0, Math.max(1, h / s / 2) | 0)); this.tmp.push(rt(Math.max(1, w / s / 2) | 0, Math.max(1, h / s / 2) | 0)); }
  }
  private pass(m: T.Material, to: T.WebGLRenderTarget | null) { quad.material = m; this.r.setRenderTarget(to); this.r.render(qs, qc); }
  private blurInto(src: T.WebGLRenderTarget, tmp: T.WebGLRenderTarget, dst: T.WebGLRenderTarget, radius = 1) {
    blur.uniforms.t.value = src.texture; blur.uniforms.d.value.set(radius / src.width, 0); this.pass(blur, tmp);
    blur.uniforms.t.value = tmp.texture; blur.uniforms.d.value.set(0, radius / tmp.height); this.pass(blur, dst);
  }
  render(scene: T.Scene, cam: T.PerspectiveCamera, g: Grade9, frame: number) {
    const r = this.r; r.setRenderTarget(this.main); r.clear(); r.render(scene, cam);
    bright.uniforms.t.value = this.main.texture; bright.uniforms.th.value = g.bloomTh; this.pass(bright, this.half);
    let src = this.half;
    for (let i = 0; i < 3; i++) { copy.uniforms.t.value = src.texture; this.pass(copy, this.b[i]); this.blurInto(this.b[i], this.tmp[i], this.b[i], 1.5); src = this.b[i]; }
    if (g.aperture > 0) { copy.uniforms.t.value = this.main.texture; this.pass(copy, this.soft); this.blurInto(this.soft, this.softTmp, this.soft, 1.6); this.blurInto(this.soft, this.softTmp, this.soft, 2.6); }
    const aoK = g.ao ?? 0;
    if (aoK > 0) {
      const s = ssao.uniforms; s.tD.value = this.main.depthTexture; s.near.value = cam.near; s.far.value = cam.far; s.th.value = Math.tan(T.MathUtils.degToRad(cam.fov) / 2);
      s.aspect.value = this.w / this.h; s.radius.value = g.aoRadius ?? .45; s.res.value.set(this.ao.width, this.ao.height);
      this.pass(ssao, this.ao); this.blurInto(this.ao, this.aoTmp, this.ao, 1.2);
    }
    const u = final.uniforms;
    u.tS.value = this.main.texture; u.tD.value = this.main.depthTexture; u.tSoft.value = this.soft.texture; u.tB1.value = this.b[0].texture; u.tB2.value = this.b[1].texture; u.tB3.value = this.b[2].texture; u.tAO.value = this.ao.texture;
    u.exposure.value = g.exposure; u.bloom.value = g.bloom; u.sat.value = g.sat; u.contrast.value = g.contrast; u.lift.value.set(...g.lift); u.gain.value.set(...g.gain);
    u.vignette.value = g.vignette; u.grain.value = g.grain; u.seed.value = (frame * 7.13) % 100; u.focus.value = g.focus; u.aperture.value = g.aperture; u.near.value = cam.near; u.far.value = cam.far;
    u.fade.value = g.fade; u.flash.value = g.flash; u.whip.value = g.whip; u.whipDir.value.set(...g.whipDir); u.ca.value = g.ca; u.aspect.value = this.w / this.h;
    u.ao.value = aoK; const tnt = g.aoTint ?? [.34, .3, .52]; u.aoTint.value.set(...tnt);
    this.pass(final, null);
  }
}
