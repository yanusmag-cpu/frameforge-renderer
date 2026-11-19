# YunoWorld narration v2 (male storyteller) — free Blender asset runner, open-source Kokoro-82M (Apache-2.0) on CPU.
# Voice: a blend of the Kokoro male voices am_michael + am_fenrir (warm, deep), slightly slower storytelling pace.
# Writes public/yw-tts-male/<film>/sNN.wav, timing.json and short voice samples. The original af_heart files are untouched.
import subprocess, sys, os, json, textwrap
OUT = 'public/yw-tts-male'
os.makedirs(OUT, exist_ok=True)
job = textwrap.dedent(r'''
import json, os, re, numpy as np, soundfile as sf
from kokoro import KPipeline
SR = 24000; OUT = 'public/yw-tts-male'
scripts = json.load(open('scripts/yw-tts/scripts.json'))
pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
voice = 'am_michael,am_fenrir'; timing = {'engine': 'Kokoro-82M v1.0 (Apache-2.0)', 'voice': 'blend am_michael+am_fenrir', 'sr': SR, 'films': {}}
for film, lines in scripts.items():
    os.makedirs(f'{OUT}/{film}', exist_ok=True); rows = []
    for i, text in enumerate(lines):
        chunks = [a for _, _, a in pipe(text, voice=voice, speed=0.95)]
        audio = np.concatenate([np.asarray(c, dtype=np.float32) for c in chunks]) if chunks else np.zeros(1, np.float32)
        # trim leading/trailing near-silence
        e = np.abs(audio); idx = np.where(e > 0.01)[0]
        if len(idx): audio = audio[max(0, idx[0] - 240): idx[-1] + 2400]
        fn = f'{OUT}/{film}/s{i+1:02d}.wav'; sf.write(fn, audio, SR, subtype='PCM_16')
        rows.append({'i': i + 1, 'text': re.sub(r'\(/[^)]*/\)', '', text).replace('[', '').replace(']', ''), 'dur': round(len(audio) / SR, 3), 'file': fn})
        print(film, i + 1, rows[-1]['dur'], flush=True)
    timing['films'][film] = rows
json.dump(timing, open(f'{OUT}/timing.json', 'w'), indent=1)
os.makedirs(f'{OUT}/samples', exist_ok=True); demo = scripts['strato'][0]
for v in ['am_michael', 'am_fenrir', 'am_puck', 'am_onyx', 'bm_george', 'bm_fable', 'am_michael,am_fenrir']:
    a = np.concatenate([np.asarray(c, dtype=np.float32) for _, _, c in pipe(demo, voice=v, speed=0.95)])
    sf.write(f"{OUT}/samples/{v.replace(',', '+')}.wav", a, SR, subtype='PCM_16'); print('sample', v, flush=True)
''')
open('/tmp/yw_tts_job.py', 'w').write(job)
sh = r'''set -e
sudo apt-get install -y -qq espeak-ng >/dev/null
python3 -m venv /tmp/ttsenv
/tmp/ttsenv/bin/pip install -q --upgrade pip
/tmp/ttsenv/bin/pip install -q torch --index-url https://download.pytorch.org/whl/cpu
/tmp/ttsenv/bin/pip install -q "kokoro>=0.9.4" soundfile
/tmp/ttsenv/bin/python /tmp/yw_tts_job.py
'''
r = subprocess.run(['bash', '-c', sh], text=True)
if r.returncode != 0:
    print('Error: TTS job failed', r.returncode); sys.exit(1)
print('ALL ASSETS DONE')
