import {ScofieldJaneFilm} from './scofield-jane/Film';
import {Composition} from 'remotion';
import {FINAL_SHORT} from './renderDefaults';
import {BA5390Film} from './ba5390/Film';
/** Public FrameForge renderer: only the compositions that are being rendered here. */
export function Root(){return <><Composition id="ScofieldJaneFilm" component={ScofieldJaneFilm} durationInFrames={12487} fps={30} width={1920} height={1080}/><Composition id="ScofieldJaneReview" component={ScofieldJaneFilm} durationInFrames={12487} fps={30} width={640} height={360}/><Composition id="ClaudeBA5390Film" component={BA5390Film} durationInFrames={FINAL_SHORT.frames} fps={FINAL_SHORT.fps} width={FINAL_SHORT.width} height={FINAL_SHORT.height}/><Composition id="ClaudeBA5390Review" component={BA5390Film} defaultProps={{audio:false}} durationInFrames={1800} fps={30} width={360} height={640}/></>;}
