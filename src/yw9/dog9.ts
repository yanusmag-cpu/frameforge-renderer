// YunoWorld v9 cartoon turnspit dog (original design), drawn in the shared Actor rig space like the pigeon (x right, y down,
// feet at y=0, viewBox x -2.8..2.8, y -5.4..0.35) so it becomes a lit, shadow-casting cut-out. Side view facing +x (dir).
// Long low body, short crooked legs, big ears, white blaze and chest, curled tail; big eyes with glints and brows.
// run: leg-cycle phase (radians); mode: 'run' | 'stand' | 'rest' (lying down); mood: 'keen' | 'happy' | 'sleepy'.
export type DogState = { run?: number; mode?: 'run' | 'stand' | 'rest'; mood?: 'keen' | 'happy' | 'sleepy'; dir?: 1 | -1; blink?: number; id?: string };
const OUT = '#16181f'; const n = (v: number) => v.toFixed(3);
export function dogSvg(s: DogState): string {
  const dir = s.dir ?? 1; const mode = s.mode ?? 'stand'; const ph = s.run ?? 0; const rest = mode === 'rest'; const runK = mode === 'run' ? 1 : 0;
  const C = '#d0843c', D = '#9a5a2a', W = '#f6ece0', lw = .11;
  const by = rest ? -.75 : -1.55 - Math.abs(Math.sin(ph)) * .12 * runK;   // body centre height
  const leg = (x: number, phase: number, back: boolean) => {
    if (rest) return `<path d="M${n(x - .2)} -.35 q.5 .05 .9 0" stroke="${OUT}" stroke-width="${lw * 3.2}" stroke-linecap="round"/><path d="M${n(x - .2)} -.35 q.5 .05 .9 0" stroke="${back ? D : C}" stroke-width="${lw * 1.6}" stroke-linecap="round"/>`;
    const a = Math.sin(ph + phase) * .55 * runK; const hx = x, hy = by + .45; const kx = hx + Math.sin(a) * .45, ky = hy + Math.cos(a) * .45;
    const fx = kx + Math.sin(a * .6 - .25) * .5, fy = Math.min(-.05, ky + .55) + (runK ? Math.max(0, -Math.cos(ph + phase)) * -.18 : 0);
    const col = back ? D : C;
    return `<path d="M${n(hx)} ${n(hy)} L${n(kx)} ${n(ky)} L${n(fx)} ${n(fy)}" fill="none" stroke="${OUT}" stroke-width=".62" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M${n(hx)} ${n(hy)} L${n(kx)} ${n(ky)} L${n(fx)} ${n(fy)}" fill="none" stroke="${col}" stroke-width=".4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<ellipse cx="${n(fx + .12)}" cy="${n(fy)}" rx=".26" ry=".13" fill="${W}" stroke="${OUT}" stroke-width="${lw * .8}"/>`;
  };
  const tailA = Math.sin(ph * 1.3) * .25 * runK;
  const lid = s.mood === 'sleepy' || rest ? .65 : (s.blink ?? 0);
  const hx = 1.95, hy = by - .75;
  const g = `<g transform="scale(${dir * .9},.9) translate(-.35,0)">` +
    leg(-1.25, Math.PI, true) + leg(1.05, 0, true) +
    `<path d="M-1.85 ${n(by - .25)} q-.55 ${n(-.6 + tailA)} -.15 ${n(-1.05 + tailA)}" fill="none" stroke="${OUT}" stroke-width=".42" stroke-linecap="round"/><path d="M-1.85 ${n(by - .25)} q-.55 ${n(-.6 + tailA)} -.15 ${n(-1.05 + tailA)}" fill="none" stroke="${C}" stroke-width=".24" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="${n(by)}" rx="2.05" ry=".78" fill="${C}" stroke="${OUT}" stroke-width="${lw}"/>` +
    `<ellipse cx=".25" cy="${n(by + .38)}" rx="1.45" ry=".36" fill="${W}"/>` +
    `<ellipse cx="-.6" cy="${n(by - .28)}" rx=".7" ry=".32" fill="${D}" opacity=".55"/>` +
    leg(-1.05, 0, false) + leg(1.3, Math.PI, false) +
    `<ellipse cx="${n(hx - .25)}" cy="${n(hy + .45)}" rx=".55" ry=".6" fill="${C}" stroke="${OUT}" stroke-width="${lw}"/>` +
    `<ellipse cx="${n(hx)}" cy="${n(hy)}" rx=".78" ry=".7" fill="${C}" stroke="${OUT}" stroke-width="${lw}"/>` +
    `<path d="M${n(hx + .15)} ${n(hy - .65)} q.12 .5 .02 .9" stroke="${W}" stroke-width=".22" stroke-linecap="round" fill="none"/>` +
    `<ellipse cx="${n(hx + .7)}" cy="${n(hy + .22)}" rx=".52" ry=".36" fill="${W}" stroke="${OUT}" stroke-width="${lw}"/>` +
    `<ellipse cx="${n(hx + 1.15)}" cy="${n(hy + .08)}" rx=".17" ry=".13" fill="${OUT}"/>` +
    `<path d="M${n(hx + .55)} ${n(hy + .42)} q.25 ${rest ? '.05' : '.2'} .55 .02" stroke="${OUT}" stroke-width="${lw * .8}" fill="none" stroke-linecap="round"/>` +
    (runK && !rest ? `<path d="M${n(hx + .78)} ${n(hy + .5)} q.1 .35 .28 .2 q.05 -.18 -.05 -.24 z" fill="#e8607a" stroke="${OUT}" stroke-width="${lw * .6}"/>` : '') +
    `<ellipse cx="${n(hx + .32)}" cy="${n(hy - .12)}" rx=".26" ry=".3" fill="#fff" stroke="${OUT}" stroke-width="${lw * .8}"/>` +
    `<circle cx="${n(hx + .4)}" cy="${n(hy - .08)}" r=".15" fill="#3a2614"/><circle cx="${n(hx + .45)}" cy="${n(hy - .14)}" r=".05" fill="#fff"/>` +
    (lid > .01 ? `<path d="M${n(hx + .06)} ${n(hy - .42)} h.53 v${n(.6 * lid)} h-.53 z" fill="${C}" stroke="${OUT}" stroke-width="${lw * .6}"/>` : '') +
    `<path d="M${n(hx + .1)} ${n(hy - .5)} l.48 ${s.mood === 'keen' ? '.12' : '-.08'}" stroke="${OUT}" stroke-width="${lw}" stroke-linecap="round"/>` +
    `<path d="M${n(hx - .45)} ${n(hy - .45)} q-.55 .15 -.6 ${rest ? '1.0' : '1.25'} q.35 .05 .55 -.35 z" fill="${D}" stroke="${OUT}" stroke-width="${lw}"/>` +
    `</g>`;
  return g;
}
