// Remotion host for Lake Nyos (FrameForge 3D engine + lake water, gas and vegetation).
import { useEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig, cancelRender } from 'remotion';
import { Engine3 } from './engine3.ts';
import { frameAt } from './shots.ts';

let engine: Promise<Engine3> | null = null;
const FONTS: [string, string][] = [['900', 'Inter-Black.otf'], ['700', 'Inter-Bold.otf'], ['400', 'Inter-Regular.otf']];
async function boot(cv: HTMLCanvasElement, w: number, h: number) {
  for (const [wt, f] of FONTS) { const ff = new FontFace('Inter', `url(${staticFile('brazil/fonts/' + f)})`, { weight: wt }); await ff.load(); (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff); }
  const e = new Engine3(cv, w, h); await e.load3(staticFile('nyos/')); return e;
}
export function LakeNyosFilm() {
  const frame = useCurrentFrame(); const { width, height } = useVideoConfig();
  const cv = useRef<HTMLCanvasElement>(null); const ov = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = delayRender('nyos frame ' + frame, { timeoutInMilliseconds: 240000 });
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
