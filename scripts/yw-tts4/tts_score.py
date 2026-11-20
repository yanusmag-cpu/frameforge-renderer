# Score the shoot-out takes already in public/yw-tts-test: UTMOS22 naturalness (SpeechMOS, cloned with git, weights from its
# release) + pitch variation (librosa pYIN, semitones) + speaking rate. Free runner, CPU only.
import subprocess, sys, os, textwrap
OUT = 'public/yw-tts-test'
score = textwrap.dedent(r'''
import glob, json, numpy as np, librosa, torch
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True)
words = [13, 13, 14]; res = {}
for f in sorted(glob.glob('OUT/*.wav')):
    y, sr = librosa.load(f, sr=16000); key = f.split('/')[-1].rsplit('_', 1)[0]; li = int(f[-5])
    mos = float(pred(torch.from_numpy(y).unsqueeze(0), 16000).item())
    f0, vf, _ = librosa.pyin(y, fmin=60, fmax=400, sr=sr); f0 = f0[vf] if vf is not None else np.array([])
    st = float(np.std(12 * np.log2(f0 / np.median(f0)))) if len(f0) > 10 else 0.0
    yt, _ = librosa.effects.trim(y, top_db=35); wps = words[li] / (len(yt) / sr)
    r = res.setdefault(key, {'mos': [], 'pitch_st': [], 'median_hz': [], 'wps': []})
    r['mos'].append(round(mos, 3)); r['pitch_st'].append(round(st, 2)); r['median_hz'].append(round(float(np.median(f0)) if len(f0) else 0, 1)); r['wps'].append(round(wps, 2))
for k, r in res.items(): r['MOS'] = round(float(np.mean(r['mos'])), 3); r['PITCH_ST'] = round(float(np.mean(r['pitch_st'])), 2); r['WPS'] = round(float(np.mean(r['wps'])), 2)
json.dump(res, open('OUT/results.json', 'w'), indent=1)
''').replace('OUT', OUT)
open('/tmp/score.py', 'w').write(score)
sh = r'''exec > >(tee -a OUT/score_log.txt) 2>&1
set -x
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python librosa soundfile
/tmp/k/bin/python /tmp/score.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True)
print('exported score rc', r.returncode)
print('ALL ASSETS DONE')
