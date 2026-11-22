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
import { frameAt as mailAt } from './mail/shots.ts';
import { MAIL_SETS, MAIL_PROPS, mailBoards } from './mail/boards.ts';
import { frameAt as earsAt } from './ears/shots.ts';
import { EARS_SETS, EARS_PROPS, earsBoards, earsScreen } from './ears/boards.ts';
import { frameAt as xrayAt } from './xray/shots.ts';
import { XRAY_SETS, XRAY_PROPS, xrayBoards, xrayScreen } from './xray/boards.ts';
import { frameAt as knockAt } from './knock/shots.ts';
import { KNOCK_SETS, KNOCK_PROPS, knockBoards } from './knock/boards.ts';
import { frameAt as pigcamAt } from './pigcam/shots.ts';
import { PIGCAM_SETS, PIGCAM_PROPS, pigcamBoards } from './pigcam/boards.ts';
import { frameAt as bathAt } from './bath/shots.ts';
import { BATH_SETS, BATH_PROPS, bathBoards } from './bath/boards.ts';
import { frameAt as spitAt } from './spit/shots.ts';
import { SPIT_SETS, SPIT_PROPS, spitBoards } from './spit/boards.ts';
import { frameAt as lickAt } from './lick/shots.ts';
import { LICK_SETS, LICK_PROPS, lickBoards } from './lick/boards.ts';

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
export const YwMail = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-mail/'), MAIL_SETS, MAIL_PROPS, mailBoards), mailAt);
export const YwEars = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-ears/'), EARS_SETS, EARS_PROPS, earsBoards, earsScreen), earsAt);
export const YwXray = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-xray/'), XRAY_SETS, XRAY_PROPS, xrayBoards, xrayScreen), xrayAt);
export const YwKnock = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-knock/'), KNOCK_SETS, KNOCK_PROPS, knockBoards), knockAt);
export const YwPigcam = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-pigcam/'), PIGCAM_SETS, PIGCAM_PROPS, pigcamBoards), pigcamAt);
export const YwBath = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-bath/'), BATH_SETS, BATH_PROPS, bathBoards), bathAt);
export const YwSpit = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-spit/'), SPIT_SETS, SPIT_PROPS, spitBoards), spitAt);
export const YwLick = makeFilm((cv, w, h) => new Engine9(cv, w, h, staticFile('yw9-lick/'), LICK_SETS, LICK_PROPS, lickBoards), lickAt);
