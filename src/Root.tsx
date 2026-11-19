import {Composition} from 'remotion';
import {FINAL_SHORT} from './renderDefaults';
import {BA5390Film} from './ba5390/Film';
import {BrazilHeistFilm} from './brazil/Film';
import {BrazilHeist2Film} from './brazil2/Film';
import {LakeNyosFilm} from './nyos/Film';
import {Gta6Film} from './vice/Film';
import {DinoFilm} from './dino/Film';
import {SeaFilm} from './sea/Film';
import {AntFilm} from './ant/Film';
import {EiffelFilm} from './eiffel/Film';
import {FireTest} from './fire/Film';
import {EhzZanzibar} from './ehz/Film';
import {YwAtomic} from './yw3/Film';
/** Public FrameForge renderer: only the compositions that are being rendered here. */
export function Root(){return <><Composition id="ClaudeBA5390Film" component={BA5390Film} durationInFrames={FINAL_SHORT.frames} fps={FINAL_SHORT.fps} width={FINAL_SHORT.width} height={FINAL_SHORT.height}/><Composition id="ClaudeBA5390Review" component={BA5390Film} defaultProps={{audio:false}} durationInFrames={1800} fps={30} width={360} height={640}/><Composition id="BrazilHeistFilm" component={BrazilHeistFilm} durationInFrames={1680} fps={30} width={1080} height={1920}/><Composition id="BrazilHeistPreview" component={BrazilHeistFilm} durationInFrames={1680} fps={30} width={540} height={960}/><Composition id="BrazilHeist2Film" component={BrazilHeist2Film} durationInFrames={1722} fps={30} width={1080} height={1920}/><Composition id="LakeNyosFilm" component={LakeNyosFilm} durationInFrames={1272} fps={30} width={1080} height={1920}/><Composition id="Gta6Film" component={Gta6Film} durationInFrames={1833} fps={30} width={1080} height={1920}/><Composition id="DinoFilm" component={DinoFilm} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="SeaFilm" component={SeaFilm} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="AntFilm" component={AntFilm} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="EiffelFilm" component={EiffelFilm} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="FireTest" component={FireTest} durationInFrames={900} fps={30} width={1080} height={1920}/><Composition id="EhzAngloZanzibar" component={EhzZanzibar} durationInFrames={1800} fps={30} width={1080} height={1920}/><Composition id="YwAtomic" component={YwAtomic} durationInFrames={1800} fps={30} width={1080} height={1920}/></>;}
