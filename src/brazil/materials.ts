// Stylised procedural surface textures for the Blender sets, keyed by material name (world-scale box UVs, 1 UV = 1 m).
import * as T from 'three';

const rnd = (s: number) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
type Ctx = CanvasRenderingContext2D;
function canvas(w: number, h: number, draw: (g: Ctx, w: number, h: number, r: () => number) => void, seed = 7) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; draw(g, w, h, rnd(seed)); return c;
}
function speckle(g: Ctx, w: number, h: number, r: () => number, n: number, a: number, size: [number, number], dark = true) {
  for (let i = 0; i < n; i++) {
    const v = dark ? 0 : 255; g.fillStyle = `rgba(${v},${v},${v},${a * r()})`;
    const s = size[0] + r() * (size[1] - size[0]); g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (.6 + r() * .6), r() * 3, 0, 7); g.fill();
  }
}
function mottle(g: Ctx, w: number, h: number, r: () => number, base: number, amp: number, blobs = 60) {
  g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, w, h);
  for (let i = 0; i < blobs; i++) {
    const x = r() * w, y = r() * h, rad = (.08 + r() * .25) * w, v = r() < .5 ? 0 : 255;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v},${v},${v},${amp * r()})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.save(); g.translate(dx, dy); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
}
// ---------------------------------------------------------------------------------------------- detail maps (luminance, multiplied by material colour)
const DETAIL: Record<string, { size: number; draw: (g: Ctx, w: number, h: number, r: () => number) => void; repeat: number }> = {
  plaster: { size: 512, repeat: 1 / 3, draw: (g, w, h, r) => { mottle(g, w, h, r, 236, .1, 90); speckle(g, w, h, r, 900, .12, [.6, 1.6]); } },
  roof: { size: 256, repeat: 1 / 1.28, draw: (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { const x = i * w / 4; const gr = g.createLinearGradient(x, 0, x + w / 4, 0); gr.addColorStop(0, '#9a9a9a'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#8a8a8a'); g.fillStyle = gr; g.fillRect(x, 0, w / 4, h); }
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * h / 4, w, 5);
  } },
  asphalt: { size: 512, repeat: 1 / 4, draw: (g, w, h, r) => { mottle(g, w, h, r, 200, .12, 50); speckle(g, w, h, r, 5000, .5, [.5, 1.4]); speckle(g, w, h, r, 2500, .25, [.5, 1.2], false);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.4; for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); } } },
  sidewalk: { size: 512, repeat: 1 / 1.6, draw: (g, w, h, r) => { mottle(g, w, h, r, 230, .1, 40); speckle(g, w, h, r, 1400, .15, [.6, 1.5]);
    g.strokeStyle = 'rgba(40,40,40,.55)'; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } } },
  stone: { size: 512, repeat: 1 / 2.4, draw: (g, w, h, r) => { mottle(g, w, h, r, 238, .08, 40); speckle(g, w, h, r, 2000, .12, [.4, 1.2]);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `rgba(${r() < .5 ? 0 : 255},0,0,0)`; g.fillStyle = `rgba(0,0,0,${r() * .06})`; g.fillRect(i * w / 2, j * h / 4, w / 2, h / 4); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2.5; for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(0, j * h / 4); g.lineTo(w, j * h / 4); g.stroke(); }
    for (let j = 0; j < 4; j++) { const off = j % 2 ? w / 4 : 0; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(off + i * w / 2, j * h / 4); g.lineTo(off + i * w / 2, (j + 1) * h / 4); g.stroke(); } } } },
  wood: { size: 256, repeat: 1 / 1.2, draw: (g, w, h, r) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const y = r() * h; g.strokeStyle = `rgba(0,0,0,${.05 + r() * .18})`; g.lineWidth = .6 + r() * 2.2; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * .03 + i) * 3); g.stroke(); }
    for (let i = 0; i < 3; i++) { const x = r() * w, y = r() * h; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 9, 4, 0, 0, 7); g.stroke(); } } },
  earth: { size: 512, repeat: 1 / 2, draw: (g, w, h, r) => { mottle(g, w, h, r, 225, .2, 80); speckle(g, w, h, r, 2600, .35, [.6, 2.2]); speckle(g, w, h, r, 900, .25, [.6, 1.8], false);
    for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, s = 3 + r() * 7; g.fillStyle = `rgba(${r() < .5 ? 60 : 255},${r() < .5 ? 50 : 240},${40},${.25 + r() * .3})`; g.beginPath(); g.ellipse(x, y, s, s * .7, r() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.stroke(); } } },
  concrete: { size: 512, repeat: 1 / 2.4, draw: (g, w, h, r) => { mottle(g, w, h, r, 232, .13, 70); speckle(g, w, h, r, 2400, .2, [.4, 1.3]);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(r() * w, r() * h, .8 + r() * 1.8, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); } },
  tile: { size: 256, repeat: 1 / 1.2, draw: (g, w, h, r) => { mottle(g, w, h, r, 240, .06, 20);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); } } },
  marble: { size: 512, repeat: 1 / 2.4, draw: (g, w, h, r) => { mottle(g, w, h, r, 245, .05, 30);
    for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(90,90,100,${.08 + r() * .15})`; g.lineWidth = .6 + r() * 1.6; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 14; k++) { x += 20 + r() * 25; y += (r() - .5) * 40; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); } } },
  turf: { size: 256, repeat: 1 / .6, draw: (g, w, h, r) => { g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, v = 120 + r() * 135; g.strokeStyle = `rgba(${v},${v},${v},.85)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 3, y - 3 - r() * 4); g.stroke(); } } },
  leaf: { size: 256, repeat: 1 / .8, draw: (g, w, h, r) => { mottle(g, w, h, r, 220, .25, 50); for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(255,255,255,${r() * .2})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6, 2.5, r() * 3, 0, 7); g.fill(); } } },
  palm: { size: 256, repeat: 1 / .5, draw: (g, w, h, r) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) { g.fillStyle = `rgba(0,0,0,${.15 + r() * .15})`; g.fillRect(0, j * h / 8, w, 4); } speckle(g, w, h, r, 600, .2, [.6, 1.5]); } },
  fabric: { size: 128, repeat: 1 / .3, draw: (g, w, h, r) => { g.fillStyle = '#ddd'; g.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 3) { g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); } speckle(g, w, h, r, 200, .1, [.5, 1]); } },
  awning: { size: 256, repeat: 1 / 1.0, draw: (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,1)'; for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff' : 'rgba(170,170,170,1)'; g.fillRect(i * w / 4, 0, w / 4, h); } } },
  metal: { size: 256, repeat: 1 / .6, draw: (g, w, h, r) => { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},${r() < .5 ? 0 : 255},.06)`; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - .5) * 4); g.stroke(); } } },
  pallet: { size: 256, repeat: 1 / .8, draw: (g, w, h, r) => { DETAIL.wood.draw(g, w, h, r); g.fillStyle = 'rgba(0,0,0,.25)'; g.font = 'bold 20px sans-serif'; g.fillText('EPAL', 30, 120); } },
};
function detailFor(name: string): keyof typeof DETAIL | null {
  if (name.startsWith('plaster') || name === 'studio_cyc') return 'plaster';
  if (name === 'roof_tile') return 'roof'; if (name === 'asphalt') return 'asphalt'; if (name === 'sidewalk' || name === 'curb') return 'sidewalk';
  if (name.startsWith('stone')) return 'stone'; if (name.startsWith('wood') || name === 'plank' || name === 'palm_trunk' && false) return 'wood';
  if (name === 'earth' || name === 'dirt') return 'earth'; if (name.startsWith('concrete') || name === 'floor_shop' || name === 'slab_concrete') return 'concrete';
  if (name === 'floor_tile') return 'tile'; if (name === 'marble') return 'marble'; if (name === 'turf') return 'turf';
  if (name.startsWith('plant_leaf') || name === 'tree_bark') return 'leaf'; if (name === 'palm_trunk') return 'palm'; if (name === 'fabric' || name === 'bag_white') return 'fabric';
  if (name.startsWith('awning')) return 'awning'; if (name === 'metal' || name === 'vault_steel' || name === 'metal_grey') return 'metal'; if (name === 'pallet_wood') return 'pallet';
  return null;
}
const cache = new Map<string, T.Texture>();
function detailTex(k: keyof typeof DETAIL) {
  let t = cache.get(k); if (t) return t;
  const d = DETAIL[k]; t = new T.CanvasTexture(canvas(d.size, d.size, d.draw, k.length * 97 + 3));
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(d.repeat, d.repeat); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; cache.set(k, t); return t;
}
// ---------------------------------------------------------------------------------------------- banknotes (original stylised design, not a real note)
export function noteCanvas() {
  return canvas(512, 256, (g, w, h, r) => {
    for (let n = 0; n < 2; n++) {
      const x0 = n * w / 2, W = w / 2;
      const gr = g.createLinearGradient(x0, 0, x0 + W, h); gr.addColorStop(0, '#79ad6c'); gr.addColorStop(.55, '#b9d9a6'); gr.addColorStop(1, '#8fbd7c'); g.fillStyle = gr; g.fillRect(x0, 0, W, h);
      g.strokeStyle = 'rgba(30,70,40,.35)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(x0 + W * .3, h * .5, 12 + i * 3, 10 + i * 2.2, 0, 0, 7); g.stroke(); }
      g.fillStyle = 'rgba(25,70,40,.85)'; g.font = 'bold 54px sans-serif'; g.fillText('50', x0 + W * .62, h * .42); g.font = 'bold 22px sans-serif'; g.fillText('50', x0 + 14, h - 18);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x0 + W * .3, h * .5, 34, 42, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,60,30,.6)'; g.lineWidth = 3; g.strokeRect(x0 + 6, 6, W - 12, h - 12);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0 + W - 4, 0, 4, h); g.fillStyle = '#efe6cf'; g.fillRect(x0 + W * .46, 0, W * .1, h); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x0 + W * .46, 0, 2, h);
    }
    speckle(g, w, h, r, 300, .08, [.4, 1]);
  });
}
function noteEdges() {
  // side of a shrink-wrapped brick: 5 layers of bundles (2 bundles across), green note edges, cream paper straps
  return canvas(256, 256, (g, w, h, r) => {
    g.fillStyle = '#20301c'; g.fillRect(0, 0, w, h);
    const L = 5, B = 2, lh = h / L, bw = w / B;
    for (let j = 0; j < L; j++) for (let i = 0; i < B; i++) {
      const x0 = i * bw + 2, y0 = j * lh + 2, ww = bw - 4, hh = lh - 4;
      g.fillStyle = `rgb(${120 + r() * 25},${168 + r() * 20},${108 + r() * 18})`; g.fillRect(x0, y0, ww, hh);
      for (let k = 0; k < hh; k += 2) { g.fillStyle = `rgba(30,60,30,${.12 + r() * .18})`; g.fillRect(x0, y0 + k, ww, 1); }
      g.fillStyle = '#efe6cf'; g.fillRect(x0 + ww * .42, y0, ww * .16, hh); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0 + ww * .42, y0, 2, hh);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0, y0, ww, 3);
    }
  });
}
/** Top faces use the note art, side faces show stacked paper edges (by world normal). */
function dualMap(m: T.MeshStandardMaterial, top: T.Texture, side: T.Texture) {
  m.onBeforeCompile = sh => {
    sh.uniforms.tTop = { value: top }; sh.uniforms.tSide = { value: side };
    sh.vertexShader = 'varying vec3 vWN; varying vec2 vUv2;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n vWN = normalize(mat3(modelMatrix) * normal); vUv2 = uv;');
    sh.fragmentShader = 'uniform sampler2D tTop; uniform sampler2D tSide; varying vec3 vWN; varying vec2 vUv2;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `vec4 tc = abs(vWN.y) > .6 ? texture2D(tTop, vUv2 * vec2(3.2, 6.4)) : texture2D(tSide, vUv2 * vec2(3.2, 3.1)); diffuseColor.rgb *= tc.rgb * 1.1;`);
  };
  m.customProgramCacheKey = () => 'cashdual';
}
// ---------------------------------------------------------------------------------------------- earth strata (cut face colour by world depth)
function strata(m: T.MeshStandardMaterial) {
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float y = vWP.y + sin(vWP.x * .35) * .18 + sin(vWP.x * 1.3 + 2.) * .06;
      vec3 c1 = vec3(.36,.23,.14), c2 = vec3(.58,.3,.14), c3 = vec3(.8,.62,.38), c4 = vec3(.46,.43,.41);
      vec3 sc = mix(c1, c2, smoothstep(-.8, -1.3, y)); sc = mix(sc, c3, smoothstep(-2.7, -3.2, y)); sc = mix(sc, c4, smoothstep(-6.3, -6.9, y));
      float band = sin(y * 9.0 + sin(vWP.x * .7) * 1.5) * .5 + .5; sc *= .9 + band * .14;
      vec3 det = clamp(diffuseColor.rgb / vec3(.45,.28,.16), .45, 1.35);
      if (vWP.z > 1.4) {
        // pebbles & stones (denser and greyer with depth)
        vec2 q = vWP.xy * vec2(2.2, 2.6); vec2 ci = floor(q), fi = fract(q);
        float hh = fract(sin(dot(ci, vec2(127.1, 311.7))) * 43758.5453); vec2 rp = vec2(fract(hh * 13.7), fract(hh * 71.3)) * .6 + .2;
        float pr = length((fi - rp) * vec2(1., 1.35)); float rad = .08 + .16 * fract(hh * 5.1);
        if (hh > .55 && pr < rad && y < -.6) { sc = mix(vec3(.62,.5,.38), vec3(.58,.56,.54), smoothstep(-2.5, -6., y)) * (.85 + .3 * fract(hh * 9.)); det = vec3(1.); if (pr > rad - .025) sc *= .55; }
        // roots under the trees in the topsoil
        float rx = mod(vWP.x + 1.0, 14.0) - 7.0; float root = abs(rx + sin(y * 6.0 + vWP.x) * .25 + (y + .3) * .6 * sign(rx));
        if (y > -1.4 && y < -.35 && root < .035) sc = vec3(.3,.2,.12);
        // sewer pipe sections every 13 m and utility conduits
        float px = mod(vWP.x + 2.0, 13.0) - 6.5; float pr2 = length(vec2(px, y + 1.75));
        if (pr2 < .36) { sc = pr2 > .27 ? vec3(.6,.6,.57) : vec3(.07,.06,.05); det = vec3(1.); if (pr2 > .345 || (pr2 > .27 && pr2 < .285)) sc *= .5; }
        float cx = mod(vWP.x + 8.5, 13.0) - 6.5;
        for (int k = -1; k <= 1; k++) { float cr = length(vec2(cx - float(k) * .2, y + .78)); if (cr < .075) { sc = cr > .05 ? (k == 0 ? vec3(.9,.45,.12) : vec3(.25,.3,.35)) : vec3(.05); det = vec3(1.); } }
      }
      diffuseColor.rgb = sc * det;`);
  };
  m.customProgramCacheKey = () => 'strata';
}
// ---------------------------------------------------------------------------------------------- emissive bulbs that switch on along x (tunnel reveal)
export const BULB = { revealX: { value: 999 } };
function bulbs(m: T.MeshStandardMaterial) {
  m.onBeforeCompile = sh => {
    sh.uniforms.revealX = BULB.revealX;
    sh.vertexShader = 'varying vec3 vWP2;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP2 = (modelMatrix * vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'uniform float revealX; varying vec3 vWP2;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= smoothstep(revealX + .4, revealX - .4, vWP2.x) * .97 + .03;');
  };
  m.customProgramCacheKey = () => 'bulbs';
}
// ---------------------------------------------------------------------------------------------- signs (canvas text placed on world rectangles)
type SignDef = { rect: [number, number, number, number]; w: number; h: number; draw: (g: Ctx, w: number, h: number) => void };
const leafIcon = (g: Ctx, x: number, y: number, s: number, col: string) => {
  g.fillStyle = col; for (const a of [-.6, 0, .6]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, -s * .55, s * .22, s * .55, 0, 0, 7); g.fill(); g.restore(); }
};
export const SIGNS: Record<string, SignDef> = {
  sign_shop: { rect: [-3.5, 3.25, 7, .9], w: 1400, h: 180, draw: (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fbf6e6'); gr.addColorStop(1, '#efe4c4'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d6b45'; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    leafIcon(g, 120, 118, 70, '#2e8a4f'); leafIcon(g, w - 120, 118, 70, '#2e8a4f');
    g.fillStyle = '#17583a'; g.font = '900 92px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('GRAMA SINTÉTICA', w / 2, 100);
    g.fillStyle = '#3c6e52'; g.font = '700 34px Inter, sans-serif'; g.fillText('JARDINAGEM  ·  PAISAGISMO  ·  GRAMADOS', w / 2, 150);
  } },
  sign_bank: { rect: [70.5, 5.05, 15, .5], w: 2048, h: 70, draw: (g, w, h) => {
    g.fillStyle = '#d9d2c1'; g.fillRect(0, 0, w, h); g.fillStyle = '#20324a'; g.font = '700 50px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('BANCO CENTRAL DO BRASIL', w / 2, 52);
  } },
  sign_emblem: { rect: [66, 11.5, 3.5, 3], w: 350, h: 300, draw: (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#d9d2c1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#20324a'; g.lineWidth = 14;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(60 + i * 40, 240 - i * 30); g.lineTo(175, 60); g.lineTo(290 - i * 40, 240 - i * 30); g.stroke(); }
  } },
  sign_flag_ce: { rect: [89, 9.4, 1.9, 1.4], w: 256, h: 190, draw: (g, w, h) => { g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f7a3a'; g.beginPath(); g.ellipse(w / 2, h / 2, 50, 50, 0, 0, 7); g.fill(); } },
  sign_cctv: { rect: [71.36, 2.42, .78, .57], w: 256, h: 190, draw: (g, w, h) => {
    g.fillStyle = '#1d2a26'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,200,170,.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(20, h - 20); g.lineTo(90, 70); g.lineTo(170, 70); g.lineTo(236, h - 20); g.stroke();
    g.fillStyle = 'rgba(200,255,220,.8)'; g.font = '16px monospace'; g.fillText('CAM 03  COFRE', 10, 20);
  } },
};
function flagBrazil() {
  return canvas(380, 280, (g, w, h) => { g.fillStyle = '#1e9a46'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7d116'; g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w - 30, h / 2); g.lineTo(w / 2, h - 22); g.lineTo(30, h / 2); g.closePath(); g.fill();
    g.fillStyle = '#233f8b'; g.beginPath(); g.arc(w / 2, h / 2, 62, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2 + 10, h / 2 + 90, 120, -2.3, -.85); g.stroke(); });
}
function signTex(def: SignDef) {
  const c = canvas(def.w, def.h, (g, w, h) => def.draw(g, w, h)); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
  const [x, y, W, H] = def.rect; t.repeat.set(1 / W, -1 / H); t.offset.set(-x / W, (1 - y) / H); /* glTF stores v = 1 - y */ t.wrapS = t.wrapT = T.ClampToEdgeWrapping; return t;
}
// ---------------------------------------------------------------------------------------------- material swap
export function dressMaterials(root: T.Object3D, env: T.Texture | null) {
  const done = new Map<T.Material, T.Material>();
  const edges = new T.CanvasTexture(noteEdges()); edges.wrapS = edges.wrapT = T.RepeatWrapping; edges.colorSpace = T.SRGBColorSpace;
  const notes = new T.CanvasTexture(noteCanvas()); notes.wrapS = notes.wrapT = T.RepeatWrapping; notes.colorSpace = T.SRGBColorSpace; notes.anisotropy = 8;
  root.traverse(o => {
    const mesh = o as T.Mesh; if (!mesh.isMesh) return;
    mesh.castShadow = true; mesh.receiveShadow = true;
    const old = mesh.material as T.MeshStandardMaterial; if (done.has(old)) { mesh.material = done.get(old)!; return; }
    const name = old.name; const m = old.clone(); m.name = name; m.side = T.DoubleSide;
    const d = detailFor(name); if (d) m.map = detailTex(d);
    if (name === 'cash') { dualMap(m, notes, edges); m.color.set('#ffffff'); }
    if (name === 'earth') { strata(m); m.roughness = 1; }
    if (name === 'bulb') bulbs(m);
    if (name.startsWith('sign_')) {
      if (name === 'sign_flag_ce' || SIGNS[name]) { m.map = signTex(SIGNS[name]); m.color.set('#ffffff'); }
      m.roughness = .55;
    }
    if (name === 'flag_brazil') { const t = new T.CanvasTexture(flagBrazil()); t.colorSpace = T.SRGBColorSpace; t.repeat.set(1 / 1.9, -1 / 1.4); t.offset.set(-86.0 / 1.9, (1 - 9.4) / 1.4); m.map = t; m.color.set('#fff'); }
    if (/glass|chrome|vault_steel|metal|car_paint|studio_floor|marble|brass|gold|duct/.test(name) && env) { m.envMap = env; m.envMapIntensity = name.startsWith('glass') ? .8 : .9; }
    if (name === 'glass') { m.roughness = .14; m.metalness = .15; }
    if (name === 'glass_shop') { m.transparent = true; m.opacity = .16; m.depthWrite = false; m.roughness = .05; m.envMapIntensity = .5; mesh.castShadow = false; }
    if (name === 'cash_wrap') { m.transparent = true; m.opacity = .1; m.depthWrite = false; m.roughness = .1; mesh.castShadow = false; }
    if (/bulb|fluoro|lamp_warm|led_|studio_led|screen|headlight|taillight/.test(name)) { mesh.castShadow = false; }
    if (name === 'studio_led_white') m.emissiveIntensity = .6;
    if (name === 'earth' || name === 'cable' || name === 'duct' || name === 'cable_orange') mesh.castShadow = false;
    done.set(old, m); mesh.material = m;
  });
}
