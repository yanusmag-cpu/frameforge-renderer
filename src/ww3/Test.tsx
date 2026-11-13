import { SvgScene } from '../ff2d/Frame';
import { bedroom } from './scenes/s01_bedroom';
/** Engine validation reel: chapter 1 bedroom hook (9 s, held to 10 s). */
export const WW3Test = () => <SvgScene render={t => bedroom(Math.min(t, 8.99))} />;
