"""Claude BA5390: join six low-res review segments, mux the soundtrack, and build chronological motion contact sheets per shot."""
from pathlib import Path
import re, subprocess, sys, json, shutil
ROOT = Path(__file__).resolve().parents[2]
src, out = Path(sys.argv[1]), Path(sys.argv[2]); (out / 'sheets').mkdir(parents=True, exist_ok=True); (out / 'stills').mkdir(exist_ok=True)
segs = [src / f'seg-{i}.mp4' for i in range(6)]
(out / 'list.txt').write_text(''.join(f"file '{s.resolve()}'\n" for s in segs))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(out / 'list.txt'), '-i', str(ROOT / 'public/ba5390/mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', str(out / 'preview.mp4')], check=True)
(out / 'list.txt').unlink()
story = (ROOT / 'src/ba5390/story.ts').read_text()
shots = [(m[0], float(m[1]), float(m[2]), m[3]) for m in re.findall(r"\{id:'([A-Z]\d+)',start:([\d.]+),end:([\d.]+),set:'\w+',label:'((?:[^'\\]|\\.)*)'\}", story)]
for sid, a, b, label in shots:
    n = max(4, int(round((b - a) / .2))); cols = 8; rows = (n + cols - 1) // cols
    fps = n / (b - a)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-t', f'{b - a:.3f}', '-i', str(out / 'preview.mp4'), '-vf', f'fps={fps:.4f},scale=180:320,drawtext=text=%{{pts}}:x=4:y=4:fontsize=12:fontcolor=yellow:box=1:boxcolor=black@0.5,tile={cols}x{rows}', '-frames:v', '1', '-q:v', '4', str(out / 'sheets' / f'{sid}.jpg')], check=True)
for f in sorted(src.glob('still-*.jpg')): shutil.copy(f, out / 'stills' / f.name)
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-of', 'json', str(out / 'preview.mp4')]))
(out / 'shots.json').write_text(json.dumps({'shots': shots, 'probe': [{k: s.get(k) for k in ('codec_type', 'width', 'height', 'nb_read_frames', 'duration')} for s in probe['streams']]}, indent=1))
print('review ready', len(shots), 'shots')
