# Re-voice specific lines: 6 takes each with the same narrator preset, keep the take whose Whisper transcript matches the script
# best (then the highest UTMOS). Writes public/yw4-vo-fix/<film>/sNN.wav and fix.json.
import subprocess, os, textwrap, json
OUT = 'public/yw4-vo-fix'; os.makedirs(OUT, exist_ok=True)
FIX = [['molasses', 3], ['peigneur', 6]]
json.dump(FIX, open('/tmp/fix.json', 'w'))
gen = textwrap.dedent(r'''
import json, os, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
P = json.load(open('public/yw4-vo-peigneur/narrator_preset.json')); D = json.load(open('scripts/yw-tts4/scripts.json')); m = ChatterboxTTS.from_pretrained(device='cpu')
for film, i in json.load(open('/tmp/fix.json')):
    os.makedirs(f'OUT/{film}/takes', exist_ok=True); text = D['lines'][film][i - 1]; ex, cfg, temp = P['styles'][D['style'][film][i - 1]]
    for k in range(6):
        torch.manual_seed(7000 + 31 * k + i); w = m.generate(text, audio_prompt_path='public/yw4-vo-peigneur/narrator_ref.wav', exaggeration=ex, cfg_weight=cfg, temperature=temp)
        ta.save(f'OUT/{film}/takes/s{i:02d}_t{k}.wav', w, m.sr)
''').replace('OUT', OUT)
pick = textwrap.dedent(r'''
import json, re, glob, shutil, numpy as np, librosa, soundfile as sf, torch
from faster_whisper import WhisperModel
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
D = json.load(open('scripts/yw-tts4/scripts.json')); out = {}
NUM = {'fifteenth': '15th', 'nineteen nineteen': '1919', 'nineteen eighty': '1980'}
def norm(s):
    s = s.lower()
    for a, b in NUM.items(): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9' ]", ' ', s.replace('-', ' ')).split()
def wer(a, b):
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1): d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1] / max(1, len(a))
for film, i in json.load(open('/tmp/fix.json')):
    text = D['lines'][film][i - 1]; cands = []
    for f in sorted(glob.glob(f'OUT/{film}/takes/s{i:02d}_t*.wav')):
        y, _ = librosa.load(f, sr=24000); yt, _ = librosa.effects.trim(y, top_db=38)
        segs, _ = wm.transcribe(f, beam_size=5, language='en'); hyp = ' '.join(s.text for s in segs).strip()
        mos = float(pred(torch.from_numpy(librosa.resample(yt, orig_sr=24000, target_sr=16000)).unsqueeze(0), 16000).item())
        cands.append({'file': f, 'heard': hyp, 'wer': round(wer(norm(text), norm(hyp)), 3), 'mos': round(mos, 3), 'dur': round(len(yt) / 24000, 3), 'y': yt})
    best = min(cands, key=lambda c: (c['wer'], -c['mos']))
    sf.write(f'OUT/{film}/s{i:02d}.wav', np.pad(best['y'], (960, 1920)), 24000, subtype='PCM_16')
    out[f'{film}/{i}'] = {'chosen': best['file'], 'takes': [{k: v for k, v in c.items() if k != 'y'} for c in cands]}
    shutil.rmtree(f'OUT/{film}/takes')
json.dump(out, open('OUT/fix.json', 'w'), indent=1)
''').replace('OUT', OUT)
open('/tmp/gen.py', 'w').write(gen); open('/tmp/pick.py', 'w').write(pick)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts 'setuptools<81' librosa faster-whisper
/tmp/c/bin/python /tmp/gen.py
/tmp/c/bin/python /tmp/pick.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True); print('exported fix rc', r.returncode)
print('ALL ASSETS DONE')
