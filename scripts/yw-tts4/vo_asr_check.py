# QC for the YunoWorld v3 narration: transcribe every chosen sentence with open-source Whisper (faster-whisper, small.en, CPU)
# and compare with the script (word error rate) to catch slurred words, skipped words or TTS hallucinations.
import subprocess, sys, os, textwrap
OUT = 'public/yw4-vo-qc'; os.makedirs(OUT, exist_ok=True)
job = textwrap.dedent(r'''
import json, re, glob
from faster_whisper import WhisperModel
m = WhisperModel('small.en', device='cpu', compute_type='int8'); res = {}
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('-', ' ')).split()
def wer(a, b):
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1): d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1] / max(1, len(a))
for film in ['peigneur', 'molasses', 'sinkhole']:
    for r in json.load(open(f'public/yw4-vo-{film}/timing.json'))['films'][film]:
        segs, _ = m.transcribe(r['file'], beam_size=5, language='en'); hyp = ' '.join(s.text for s in segs)
        res[f"{film}/{r['i']}"] = {'script': r['text'], 'heard': hyp.strip(), 'wer': round(wer(norm(r['text']), norm(hyp)), 3)}
        print(film, r['i'], res[f"{film}/{r['i']}"]['wer'], flush=True)
json.dump(res, open('OUT/asr.json', 'w'), indent=1)
''').replace('OUT', OUT)
open('/tmp/asr.py', 'w').write(job)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv venv -q --seed -p 3.11 /tmp/w && VIRTUAL_ENV=/tmp/w uv pip install -q --python /tmp/w/bin/python faster-whisper
/tmp/w/bin/python /tmp/asr.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True); print('exported asr rc', r.returncode)
print('ALL ASSETS DONE')
