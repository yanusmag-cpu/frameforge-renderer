"""Verify the actual requested MP4; never treats a render exit code as proof."""
from pathlib import Path
import argparse,json,subprocess,math
from array import array

def verify_video_metadata(v,mode,frame_count=None):
    width,height,fps,frames={'final':(1080,1920,60,3600),'final-30':(1080,1920,30,1800),'preview':(360,640,15,900),'visual-review':(540,960,30,1800)}[mode]
    if frame_count is not None:frames=frame_count
    actual=(v['codec_name'],v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))
    expected=('h264',width,height,f'{fps}/1',frames)
    if actual!=expected:raise ValueError(f'Video metadata mismatch: actual={actual}; expected={expected}')
    # FFprobe names full-range 8-bit 4:2:0 yuvj420p. Remotion emits this even
    # with --pixel-format=yuv420p. Preserve its range; reject other chroma/depth.
    if v['pix_fmt'] not in ['yuv420p','yuvj420p']:raise ValueError(f'Expected 8-bit 4:2:0 video, got {v["pix_fmt"]}')
    return frames,fps

def verify(path,mode,seconds=60):
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
    path.with_suffix('.probe.json').write_text(json.dumps(probe,indent=2)+'\n')
    v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
    frames,fps=verify_video_metadata(v,mode,round(seconds*30) if mode=='final-30' else None)
    if (a['codec_name'],a['sample_rate'],a['channels'])!=('aac','48000',2):raise ValueError('Expected AAC 48 kHz stereo')
    if abs(float(probe['format']['duration'])-seconds)>.05:raise ValueError(f'MP4 duration is {probe["format"]["duration"]}s, expected {seconds}s')
    decoded=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-progress','pipe:1','-f','null','-'],check=True,capture_output=True,text=True)
    counts=[int(line.split('=')[1]) for line in decoded.stdout.splitlines() if line.startswith('frame=')]
    if not counts or counts[-1]!=frames:raise ValueError('Complete decoded frame count mismatch')
    samples=array('f');samples.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-af',f'atrim=duration={seconds}','-ar','48000','-ac','2','-f','f32le','-']))
    if len(samples)!=round(seconds*96000):raise ValueError(f'Decoded soundtrack does not cover {seconds} seconds')
    rms=[math.sqrt(math.fsum(x*x for x in samples[s*96000:(s+1)*96000])/96000) for s in range(int(seconds))]
    if min(rms)<.00001 or max(abs(x) for x in samples)>=.999:raise ValueError('Silent second or sample clipping after AAC encoding')
    meter=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json','-f','null','-'],check=True,capture_output=True,text=True)
    levels=json.JSONDecoder().raw_decode(meter.stderr[meter.stderr.rfind('{'):])[0]
    if float(levels['input_tp'])>-1:raise ValueError('Encoded mix exceeds true peak tolerance')
    if mode!='visual-review' and abs(float(levels['input_i'])+16)>1:raise ValueError('Narrated mix exceeds loudness tolerance')
    path.with_suffix('.probe.json').write_text(json.dumps(probe,indent=2)+'\n')
    report={'decodedFrames':frames,'fps':fps,'pixelFormat':v['pix_fmt'],'colorRange':v.get('color_range','unspecified'),'durationSeconds':seconds,'rmsPerSecond':rms,'samplePeak':max(abs(x) for x in samples),'integratedLUFS':float(levels['input_i']),'truePeakDBTP':float(levels['input_tp']),'completeDecode':'passed'}
    path.with_suffix('.verified.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('path',type=Path);p.add_argument('--mode',choices=['preview','final','final-30','visual-review'],required=True);p.add_argument('--seconds',type=float,default=60);a=p.parse_args()
    try:verify(a.path,a.mode,a.seconds)
    except (ValueError,OSError,KeyError,StopIteration,subprocess.CalledProcessError) as e:raise SystemExit(f'FrameForge MP4 validation failed: {e}')
