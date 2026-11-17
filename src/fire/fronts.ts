// Fire-front model shared by CPU (flames, smoke, lights) and GPU (ground char, vegetation burn) — identical constants in JS and GLSL.
// Control line along z = 0. Wildfire approaches from -z; the burnout is lit at z = -2 by the main firefighter walking from x = +3 to x = -3.5,
// then crews' line extends laterally after 15.2 s. The burnout backs toward the wildfire at 1.5 m/s; where the two meet, the main front stalls.
export const H = (x: number, z: number) => 0.07 * Math.max(0, -z) + 0.9 * Math.sin(0.06 * x) * Math.cos(0.045 * z) + 0.35 * Math.sin(0.17 * x + 0.11 * z) - 0.012 * Math.max(0, z);
export const IG = { x0: 3, x1: -3.5, t0: 10.6, speed: 1.5, lat: 9, tLat: 14.4 };
export const W = { z0: -90, v: 3.5 }, B = { v: 2.0, z0: -2 }, LINE = -2.5;
export const wob = (x: number) => 7 * Math.sin(.045 * x + 1.3) + 3 * Math.sin(.13 * x);
export const zW = (x: number, t: number) => W.z0 + W.v * t + wob(x);
export function tig(x: number) {
  if (x <= IG.x0 && x >= IG.x1) return IG.t0 + (IG.x0 - x) / IG.speed;
  return IG.tLat + (x > IG.x0 ? x - IG.x0 : IG.x1 - x) / IG.lat;
}
/** meeting time of the two fronts at x (Infinity if the burnout never runs there before the wildfire) */
export function tMeet(x: number) { const ti = tig(x); const tm = (B.z0 - W.z0 + B.v * ti - wob(x)) / (W.v + B.v); return tm > ti ? tm : Infinity; }
export function state(x: number, t: number) {
  const ti = tig(x), tm = tMeet(x), met = t >= tm;
  const zMeet = isFinite(tm) ? zW(x, tm) : -1e9;
  const zWe = met ? zMeet : Math.min(zW(x, t), LINE);
  const burnout = t > ti && isFinite(tm);
  const zb = burnout ? Math.max(B.z0 - B.v * (Math.min(t, tm) - ti), zMeet) : B.z0;
  return { ti, tm, met, zMeet, zWe, burnout, zb, stalled: !met && zW(x, t) >= LINE };
}
/** seconds since the point (x,z) burned, or -1 if unburned */
export function burnAge(x: number, z: number, t: number) {
  const s = state(x, t); let tb = Infinity;
  if (z < s.zWe) tb = Math.min(tb, (z - W.z0 - wob(x)) / W.v);
  if (s.burnout && z < -1.8 && z > s.zb - .01) tb = Math.min(tb, s.ti + Math.max(0, (B.z0 - z) / B.v));
  return isFinite(tb) ? t - tb : -1;
}

export const GLSL = /* glsl */`
float fH(float x, float z){ return 0.07*max(0.,-z) + 0.9*sin(0.06*x)*cos(0.045*z) + 0.35*sin(0.17*x+0.11*z) - 0.012*max(0.,z); }
float fWob(float x){ return 7.*sin(.045*x+1.3) + 3.*sin(.13*x); }
float fZW(float x, float t){ return ${W.z0.toFixed(1)} + ${W.v.toFixed(2)}*t + fWob(x); }
float fTig(float x){ if (x <= ${IG.x0.toFixed(2)} && x >= ${IG.x1.toFixed(2)}) return ${IG.t0.toFixed(2)} + (${IG.x0.toFixed(2)} - x)/${IG.speed.toFixed(2)};
  return ${IG.tLat.toFixed(2)} + (x > ${IG.x0.toFixed(2)} ? x - ${IG.x0.toFixed(2)} : ${IG.x1.toFixed(2)} - x)/${IG.lat.toFixed(2)}; }
float fTMeet(float x){ float ti = fTig(x); float tm = (${(B.z0 - W.z0).toFixed(2)} + ${B.v.toFixed(2)}*ti - fWob(x))/${(W.v + B.v).toFixed(2)}; return tm > ti ? tm : 1e9; }
// returns seconds since burned (or -1), and in kind: 0 none, 1 wildfire, 2 burnout
float fBurnAge(float x, float z, float t, out float kind){
  float ti = fTig(x), tm = fTMeet(x); bool met = t >= tm; float zMeet = tm < 1e8 ? fZW(x, tm) : -1e9;
  float zWe = met ? zMeet : min(fZW(x, t), ${LINE.toFixed(2)});
  bool bo = t > ti && tm < 1e8; float zb = bo ? max(${B.z0.toFixed(2)} - ${B.v.toFixed(2)}*(min(t, tm) - ti), zMeet) : ${B.z0.toFixed(2)};
  float tb = 1e9; kind = 0.;
  if (z < zWe) { tb = (z - ${W.z0.toFixed(1)} - fWob(x))/${W.v.toFixed(2)}; kind = 1.; }
  if (bo && z < -1.8 && z > zb - .01) { float t2 = ti + max(0., (${B.z0.toFixed(2)} - z)/${B.v.toFixed(2)}); if (t2 < tb) { tb = t2; kind = 2.; } }
  return tb < 1e8 ? t - tb : -1.;
}
`;
