// YunoWorld v9 cartoon pigeon (original design). Drawn in the shared Actor rig space (x right, y down, feet at y=0,
// viewBox x -2.8..2.8, y -5.4..0.35) so it becomes a lit, shadow-casting cut-out in the 3D sets like the human cast.
// Big readable eyes (white sclera, orange iris, pupil, glint), animated brows and lids for expressions, iridescent neck,
// two black wing bars, banded tail, coral legs. Actions: peck (head lunges forward/down), bob, flap, beak open, blink,
// gaze, squash; 'sock' = Skinner's jacket (a sock with the toe cut out) with only the head and neck poking out.
export type PigeonMood = 'keen' | 'sleepy' | 'confused' | 'smug' | 'surprised' | 'happy' | 'neutral';
export type PigeonState = { mood?: PigeonMood; peck?: number; bob?: number; flap?: number; beak?: number; blink?: number; gx?: number; gy?: number;
  dir?: 1 | -1; sock?: boolean; squash?: number; tilt?: number; t?: number; body?: string; id?: string };
const OUT = '#16181f';
const f = (n: number) => n.toFixed(3);
const BROW: Record<PigeonMood, [number, number, number]> = { // [lift, angle(+ inner down = determined), lid]
  keen: [.06, .32, 0], sleepy: [-.02, -.05, .55], confused: [.12, -.25, .05], smug: [.02, .18, .42], surprised: [.22, -.12, 0], happy: [.1, -.1, .1], neutral: [.04, .05, .05] };

export function pigeonSvg(s: PigeonState): string {
  const id = s.id ?? 'pg'; const mood = s.mood ?? 'neutral'; const dir = s.dir ?? 1; const pk = s.peck ?? 0; const sq = s.squash ?? 0; const t = s.t ?? 0;
  const body = s.body ?? '#97a3ba'; const dark = '#5f6a83'; const wingC = '#a9b4c9';
  const bob = (s.bob ?? 0) * .12;
  // head position: rest above the chest; peck lunges forward and down
  const hx = .95 + pk * 1.05, hy = -3.55 + pk * 1.35 + bob, hr = .62;
  const tilt = (s.tilt ?? 0) + pk * .55;
  const [bl, ba, lid0] = BROW[mood]; const blink = Math.max(s.blink ?? 0, 0); const lid = Math.min(1, lid0 + blink);
  const eyeW = mood === 'surprised' ? .36 : .31, eyeH = mood === 'surprised' ? .4 : .34;
  const gx = (s.gx ?? .3) * .1, gy = (s.gy ?? 0) * .08;
  const defs = `<defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="${id}n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fae8f"/><stop offset=".5" stop-color="#5b8fc9"/><stop offset="1" stop-color="#8d5fb6"/></linearGradient>
    <radialGradient id="${id}h" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#b9c3d6"/><stop offset="1" stop-color="${body}"/></radialGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6d6b2"/><stop offset="1" stop-color="#c4ae82"/></linearGradient></defs>`;
  const parts: string[] = [];
  const sx = 1 + sq * .18, sy = 1 - sq * .15;
  if (!s.sock) {
    // legs + toes
    for (const lx of [-.05, .38]) parts.push(`<path d="M${f(lx)},-1.05 L${f(lx + .05)},-.12 M${f(lx - .25)},-.02 L${f(lx + .05)},-.12 L${f(lx + .38)},-.02 M${f(lx + .05)},-.12 L${f(lx + .1)},.0" stroke="#d9636f" stroke-width=".11" stroke-linecap="round" fill="none"/>`);
    // tail fan with dark band
    parts.push(`<path d="M-1.1,-1.9 L-2.35,-1.25 L-2.45,-1.55 L-2.3,-1.85 Z" fill="${dark}" stroke="${OUT}" stroke-width=".06" stroke-linejoin="round"/>`);
    parts.push(`<path d="M-2.1,-1.36 L-2.45,-1.55 L-2.3,-1.85 L-2.0,-1.78 Z" fill="#2b2f3a"/>`);
    // body
    parts.push(`<path d="M-1.35,-2.05 C-1.2,-2.95 -.2,-3.25 .7,-3.05 C1.45,-2.85 1.65,-2.1 1.35,-1.55 C1.0,-.95 .15,-.85 -.45,-1.05 C-.95,-1.2 -1.4,-1.5 -1.35,-2.05 Z" fill="url(#${id}b)" stroke="${OUT}" stroke-width=".075" stroke-linejoin="round"/>`);
    parts.push(`<path d="M.2,-1.05 C.8,-1.0 1.25,-1.3 1.35,-1.65" stroke="#7f8aa3" stroke-width=".05" fill="none" opacity=".7"/>`);
    // wing (folded or flapping)
    const fl = s.flap ?? 0; const wa = -Math.sin(fl * Math.PI) * 1.2 - fl * .3 + Math.sin(t * 30) * fl * .25;
    parts.push(`<g transform="rotate(${f(wa * 57.3)} .55 -2.75)">
      <path d="M.75,-2.8 C.1,-2.95 -.9,-2.7 -1.45,-2.0 C-1.0,-1.75 -.2,-1.7 .45,-1.95 C.8,-2.1 .95,-2.5 .75,-2.8 Z" fill="${wingC}" stroke="${OUT}" stroke-width=".065" stroke-linejoin="round"/>
      <path d="M-.15,-2.55 C-.35,-2.25 -.5,-2.0 -.55,-1.85 M.15,-2.5 C-.05,-2.2 -.15,-2.0 -.18,-1.86" stroke="#232631" stroke-width=".13" stroke-linecap="round" fill="none"/>
      ${fl > .05 ? `<path d="M-1.45,-2.0 L-1.85,-2.2 M-1.3,-1.9 L-1.75,-1.95 M-1.15,-1.82 L-1.55,-1.7" stroke="${OUT}" stroke-width=".06"/>` : ''}</g>`);
  } else {
    // knitted sock jacket: ribbed beige tube with the toe cut out; head and neck poke out
    parts.push(`<path d="M-1.45,-1.35 C-1.5,-2.6 -.6,-3.1 .5,-3.05 C1.35,-3.0 1.6,-2.4 1.5,-1.75 C1.3,-1.1 .4,-.9 -.4,-.95 C-1.0,-1.0 -1.42,-1.1 -1.45,-1.35 Z" fill="url(#${id}s)" stroke="${OUT}" stroke-width=".075"/>`);
    for (let i = 0; i < 9; i++) { const x = -1.2 + i * .3; parts.push(`<path d="M${f(x)},-2.8 C${f(x + .05)},-2.2 ${f(x)},-1.6 ${f(x - .05)},-1.05" stroke="#b39c6e" stroke-width=".05" fill="none"/>`); }
    parts.push(`<path d="M-1.45,-1.4 C-1.5,-1.9 -1.45,-2.3 -1.3,-2.55" stroke="#a8343a" stroke-width=".2" fill="none"/>`);
  }
  // neck (stretches toward the head)
  const nx0 = .65, ny0 = -2.85;
  parts.push(`<path d="M${f(nx0 - .35)},${f(ny0 + .2)} C${f(nx0 - .3)},${f(hy + .2)} ${f(hx - .5)},${f(hy + .35)} ${f(hx - .35)},${f(hy + .1)} L${f(hx + .25)},${f(hy + .35)} C${f(hx + .1)},${f(hy + .7)} ${f(nx0 + .6)},${f(ny0 + .1)} ${f(nx0 + .55)},${f(ny0 + .35)} Z" fill="url(#${id}n)" stroke="${OUT}" stroke-width=".07" stroke-linejoin="round"/>`);
  // head group
  const bk = s.beak ?? 0;
  const eyeX = .16, eyeY = -.08;
  const lidY = -eyeH + lid * eyeH * 2;
  const browY = eyeY - eyeH - .1 - bl; const browIn = ba * .14;
  const head = `<g transform="translate(${f(hx)} ${f(hy)}) rotate(${f(tilt * 57.3)})">
    <circle r="${hr}" fill="url(#${id}h)" stroke="${OUT}" stroke-width=".075"/>
    <path d="M${f(hr * .72)},${f(-.02)} L${f(hr + .42)},${f(.12 + bk * .03)} L${f(hr * .78)},${f(.2)} Z" fill="#3e3f46" stroke="${OUT}" stroke-width=".05" stroke-linejoin="round"/>
    ${bk > .05 ? `<path d="M${f(hr * .74)},${f(.22)} L${f(hr + .33)},${f(.24 + bk * .28)} L${f(hr * .7)},${f(.32)} Z" fill="#3e3f46" stroke="${OUT}" stroke-width=".05"/>` : ''}
    <ellipse cx="${f(hr * .78)}" cy="-.05" rx=".14" ry=".09" fill="#f2efe6" stroke="${OUT}" stroke-width=".03"/>
    <ellipse cx="${f(eyeX)}" cy="${f(eyeY)}" rx="${eyeW}" ry="${eyeH}" fill="#fbfaf4" stroke="${OUT}" stroke-width=".055"/>
    <clipPath id="${id}ec"><ellipse cx="${f(eyeX)}" cy="${f(eyeY)}" rx="${eyeW}" ry="${eyeH}"/></clipPath>
    <g clip-path="url(#${id}ec)">
      <circle cx="${f(eyeX + .07 + gx)}" cy="${f(eyeY + gy)}" r="${mood === 'surprised' ? .17 : .2}" fill="#ef8a2b"/>
      <circle cx="${f(eyeX + .08 + gx)}" cy="${f(eyeY + gy)}" r="${mood === 'surprised' ? .075 : .11}" fill="#14141a"/>
      <circle cx="${f(eyeX + .03 + gx)}" cy="${f(eyeY - .07 + gy)}" r=".045" fill="#fff"/>
      ${lid > .01 ? `<rect x="${f(eyeX - eyeW - .05)}" y="${f(eyeY - eyeH - .05)}" width="${f(eyeW * 2 + .1)}" height="${f(lid * eyeH * 2 + .05)}" fill="${body}"/><path d="M${f(eyeX - eyeW)},${f(eyeY + lidY)} L${f(eyeX + eyeW)},${f(eyeY + lidY)}" stroke="${OUT}" stroke-width=".05"/>` : ''}
    </g>
    <path d="M${f(eyeX - .3)},${f(browY + browIn)} Q${f(eyeX)},${f(browY - .08)} ${f(eyeX + .32)},${f(browY - browIn)}" stroke="#20232c" stroke-width=".11" stroke-linecap="round" fill="none"/>
    ${mood === 'confused' ? `<text x="-.5" y="-.75" font-size=".7" font-family="Inter" font-weight="900" fill="#ffd23f" stroke="${OUT}" stroke-width=".04">?</text>` : ''}
  </g>`;
  parts.push(head);
  const inner = parts.join('');
  const xf = `translate(0 0) scale(${dir * sx} ${sy})`;
  return `${defs}<g transform="${xf}">${inner}</g>`;
}
