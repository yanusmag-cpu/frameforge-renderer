// Remotion host for What if you were the size of an ant (FrameForge 3D engine at x350 scale).
import { useEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig, cancelRender } from 'remotion';
import { Engine7 } from './engine7.ts';
import { frameAt } from './shots.ts';

let engine: Promise<Engine7> | null = null;
const FONTS: [string, string][] = [['900', 'Inter-Black.otf'], ['700', 'Inter-Bold.otf'], ['400', 'Inter-Regular.otf']];
async function boot(cv: HTMLCanvasElement, w: number, h: number) {
  for (const [wt, f] of FONTS) { const ff = new FontFace('Inter', `url(${staticFile('brazil/fonts/' + f)})`, { weight: wt }); await ff.load(); (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff); }
  const e = new Engine7(cv, w, h); await e.load7(staticFile('ant/')); return e;
}
export function AntFilm() {
  const frame = useCurrentFrame(); const { width, height } = useVideoConfig();
  const cv = useRef<HTMLCanvasElement>(null); const ov = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = delayRender('ant frame ' + frame, { timeoutInMilliseconds: 240000 });
    (async () => {
      if (!engine) engine = boot(cv.current!, width, height);
      const e = await engine; const F = frameAt(frame); await e.render(F, frame);
      if (ov.current) ov.current.innerHTML = F.overlay ?? '';
      continueRender(h);
    })().catch(err => cancelRender(err));
  }, [frame, width, height]);
  return <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <canvas ref={cv} width={width} height={height} style={{ position: 'absolute', inset: 0, width, height }} />
    <div ref={ov} style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: '0 0' }} />
  </AbsoluteFill>;
}
