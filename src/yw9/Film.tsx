// Remotion hosts for the YunoWorld v9 shorts (Blender sets + engine9).
import { useEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig, cancelRender } from 'remotion';
import { Engine9, type Frame9 } from './engine9.ts';
import { frameAt as pigeonAt } from './pigeon/shots.ts';
import { PIGEON_SETS, PIGEON_PROPS, pigeonBoards } from './pigeon/boards.ts';
import { frameAt as iceAt } from './ice/shots.ts';
import { ICE_SETS, ICE_PROPS, iceBoards } from './ice/boards.ts';
import { frameAt as turkAt } from './turk/shots.ts';
import { TURK_SETS, TURK_PROPS, turkBoards } from './turk/boards.ts';

const FONTS: [string, string][] = [['900', 'Inter-Black.otf'], ['700', 'Inter-Bold.otf'], ['400', 'Inter-Regular.otf']];
async function fonts() { for (const [wt, f] of FONTS) { const ff = new FontFace('Inter', `url(${staticFile('brazil/fonts/' + f)})`, { weight: wt }); await ff.load(); (document.fonts as unknown as { add: (f: FontFace) => void }).add(ff); } }
function makeFilm(make: (cv: HTMLCanvasElement, w: number, h: number) => Engine9, frameAt: (n: number) => Frame9) {
  let boot: Promise<Engine9> | null = null;
  return function Film() {
    const frame = useCurrentFrame(); const { width, height } = useVideoConfig(); const cv = useRef<HTMLCanvasElement>(null); const ov = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const h = delayRender('yw9 ' + frame, { timeoutInMilliseconds: 600000 });
      (async () => {
        if (!boot) boot = (async () => { await fonts(); const e = make(cv.current!, width, height); await e.load(); return e; })();
        const e = await boot; const F = frameAt(frame); await e.render(F, frame);
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
export const YwPigeon = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-pigeon/'), PIGEON_SETS, PIGEON_PROPS, pigeonBoards), pigeonAt);
export const YwIce = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-ice/'), ICE_SETS, ICE_PROPS, iceBoards), iceAt);
export const YwTurk = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-turk/'), TURK_SETS, TURK_PROPS, turkBoards), turkAt);
