// Remotion hosts for the YunoWorld v3 shorts (Lake Peigneur, Molasses Flood, Seffner sinkhole).
import { useEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig, cancelRender } from 'remotion';
import type { YFrame } from '../yw3/core.ts';
import { PeigneurEngine } from './peigneur/engine.ts';
import { frameAt as peigneurAt } from './peigneur/shots.ts';
import { MolassesEngine } from './molasses/engine.ts';
import { frameAt as molassesAt } from './molasses/shots.ts';
import { SinkholeEngine } from './sinkhole/engine.ts';
import { frameAt as sinkholeAt } from './sinkhole/shots.ts';

type Eng = { render: (F: YFrame, frame: number) => Promise<void> };
const FONTS: [string, string][] = [['900', 'Inter-Black.otf'], ['700', 'Inter-Bold.otf'], ['400', 'Inter-Regular.otf']];
async function fonts() { for (const [wt, f] of FONTS) { const ff = new FontFace('Inter', `url(${staticFile('brazil/fonts/' + f)})`, { weight: wt }); await ff.load(); (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff); } }
function makeFilm(load: () => { make: (cv: HTMLCanvasElement, w: number, h: number) => Eng; frameAt: (n: number) => YFrame }) {
  let boot: Promise<{ e: Eng; frameAt: (n: number) => YFrame }> | null = null;
  return function Film() {
    const frame = useCurrentFrame(); const { width, height } = useVideoConfig(); const cv = useRef<HTMLCanvasElement>(null); const ov = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const h = delayRender('yw4 ' + frame, { timeoutInMilliseconds: 240000 });
      (async () => {
        if (!boot) boot = (async () => { await fonts(); const m = load(); return { e: m.make(cv.current!, width, height), frameAt: m.frameAt }; })();
        const b = await boot; const F = b.frameAt(frame); await b.e.render(F, frame);
        if (ov.current) ov.current.innerHTML = (F.overlay as string | undefined) ?? '';
        continueRender(h);
      })().catch(err => cancelRender(err));
    }, [frame, width, height]);
    return <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <canvas ref={cv} width={width} height={height} style={{ position: 'absolute', inset: 0, width, height }} />
      <div ref={ov} style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${width / 1080})`, transformOrigin: '0 0' }} />
    </AbsoluteFill>;
  };
}
export const YwPeigneur = makeFilm(() => ({ make: (cv, w, h) => new PeigneurEngine(cv, w, h) as unknown as Eng, frameAt: peigneurAt as (n: number) => YFrame }));
export const YwMolasses = makeFilm(() => ({ make: (cv, w, h) => new MolassesEngine(cv, w, h) as unknown as Eng, frameAt: molassesAt as (n: number) => YFrame }));
export const YwSinkhole = makeFilm(() => ({ make: (cv, w, h) => new SinkholeEngine(cv, w, h) as unknown as Eng, frameAt: sinkholeAt as (n: number) => YFrame }));
