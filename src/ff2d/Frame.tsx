// Remotion host for FrameForge 2D (pure SVG-string) scenes: bundles the Inter font and renders one frame.
import { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

const FONTS: [string, string][] = [['900', 'Inter-Black.otf'], ['700', 'Inter-Bold.otf'], ['400', 'Inter-Regular.otf'], ['300', 'Inter-Light.otf']];
let fontsReady: Promise<void> | null = null;
const loadFonts = () => fontsReady ??= Promise.all(FONTS.map(([w, f]) =>
  new FontFace('Inter', `url(${staticFile('ff2d/fonts/' + f)}) format('opentype')`, { weight: w }).load().then(ff => { document.fonts.add(ff); }))).then(() => undefined);

export function SvgScene({ render }: { render: (t: number) => string }) {
  const frame = useCurrentFrame(), { fps, width } = useVideoConfig();
  const [handle] = useState(() => delayRender('FrameForge fonts'));
  useEffect(() => { loadFonts().then(() => continueRender(handle)); }, [handle]);
  return <AbsoluteFill style={{ backgroundColor: '#000' }}>
    <div style={{ width: 1920, height: 1080, transform: `scale(${width / 1920})`, transformOrigin: '0 0' }} dangerouslySetInnerHTML={{ __html: render(frame / fps) }} />
  </AbsoluteFill>;
}
