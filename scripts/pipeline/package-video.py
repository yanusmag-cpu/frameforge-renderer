"""Exact-duration H.264/AAC packaging; the video packets are never re-encoded."""
from pathlib import Path
import argparse,json,subprocess,wave

def mux(source,audio,output,fps,seconds=60,narration=False):
 p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(source)]));v=next(s for s in p['streams'] if s['codec_type']=='video')
 if v['codec_name']!='h264' or int(v['nb_frames'])!=round(seconds*fps) or v['r_frame_rate']!=f'{fps}/1' or abs(float(v['duration'])-seconds)>.001:raise ValueError('Rendered video frame count, FPS or duration mismatch')
 with wave.open(str(audio)) as w:
  if w.getframerate()!=48000 or w.getnchannels()!=2 or w.getnframes()<round(seconds*48000):raise ValueError('Expected complete 48kHz stereo PCM soundtrack')
 output.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',str(seconds),'-movflags','+faststart',str(output)],check=True)
 def sha(f):return subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-'],text=True).strip()
 if sha(source)!=sha(output):raise ValueError('Video packet identity changed during soundtrack mux')
 print(json.dumps({'videoPacketsUnchanged':True,'narrationIncluded':narration,'soundtrack':str(audio),'seconds':seconds,'fps':fps}))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('audio',type=Path);p.add_argument('output',type=Path);p.add_argument('--fps',type=int,required=True);p.add_argument('--seconds',type=float,default=60);p.add_argument('--narration',action='store_true');a=p.parse_args()
 try:mux(a.source,a.audio,a.output,a.fps,a.seconds,a.narration)
 except (ValueError,OSError,KeyError,StopIteration,subprocess.CalledProcessError) as e:raise SystemExit(f'Black-hole package error: {e}')
