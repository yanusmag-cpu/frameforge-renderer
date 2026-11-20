# YunoWorld TTS shoot-out — free GitHub runner, CPU only, open-source models, no paid APIs or keys.
# Voices the same three test lines with several free engines, then scores every take with an automatic
# naturalness predictor (UTMOS22, SpeechMOS) plus pitch-variation and pacing measurements.
import subprocess, sys, os, textwrap
OUT = 'public/yw-tts-test'; os.makedirs(OUT, exist_ok=True)
LINES = ["Imagine working on an oil rig... when the entire lake beneath you starts disappearing.",
         "But here's the terrifying part. Nobody on the surface knew what was happening below.",
         "Within hours, the lake was gone. And somehow, every single person got out alive!"]
REF = ("Some stories sound impossible the first time you hear them. A lake that drains in an afternoon. "
       "A wave of syrup tall enough to flatten a building. But every one of them really happened, and the details are even stranger.")
open('/tmp/lines.txt', 'w').write('\n'.join(LINES)); open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
L = open('/tmp/lines.txt').read().split('\n'); p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'); pb = KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M')
def say(pp, t, v): return np.concatenate([np.asarray(a, np.float32) for _, _, a in pp(t, voice=v, speed=1.0)])
for v in ['am_michael', 'am_fenrir', 'am_puck', 'am_michael,am_fenrir', 'bm_george', 'bm_fable']:
    pp = pb if v.startswith('b') else p
    for i, t in enumerate(L): sf.write(f'OUT/kokoro_{v.replace(",", "+")}_{i}.wav', say(pp, t, v), 24000)
    print('kokoro', v, flush=True)
sf.write('/tmp/ref_michael.wav', say(p, open('/tmp/ref.txt').read(), 'am_michael'), 24000)
sf.write('/tmp/ref_puck.wav', say(p, open('/tmp/ref.txt').read(), 'am_puck'), 24000)
''').replace('OUT', OUT)
cbx = textwrap.dedent(r'''
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device='cpu'); L = open('/tmp/lines.txt').read().split('\n')
for name, ref, ex, cfg in [('default_e05', None, .5, .5), ('default_e07', None, .7, .3), ('michaelref_e06', '/tmp/ref_michael.wav', .6, .4), ('puckref_e06', '/tmp/ref_puck.wav', .6, .4)]:
    for i, t in enumerate(L):
        w = m.generate(t, audio_prompt_path=ref, exaggeration=ex, cfg_weight=cfg) if ref else m.generate(t, exaggeration=ex, cfg_weight=cfg)
        ta.save(f'OUT/chatterbox_{name}_{i}.wav', w, m.sr)
    print('chatterbox', name, flush=True)
''').replace('OUT', OUT)
score = textwrap.dedent(r'''
import glob, json, numpy as np, librosa, torch
pred = torch.hub.load('tarepan/SpeechMOS:v1.2.0', 'utmos22_strong', trust_repo=True)
res = {}
for f in sorted(glob.glob('OUT/*.wav')):
    y, sr = librosa.load(f, sr=16000); key = f.split('/')[-1].rsplit('_', 1)[0]
    mos = float(pred(torch.from_numpy(y).unsqueeze(0), 16000).item())
    f0, vf, _ = librosa.pyin(y, fmin=60, fmax=400, sr=sr); f0 = f0[vf] if vf is not None else np.array([])
    st = float(np.std(12 * np.log2(f0 / np.median(f0)))) if len(f0) > 10 else 0.0
    r = res.setdefault(key, {'mos': [], 'pitch_st': [], 'median_hz': [], 'dur': []})
    r['mos'].append(round(mos, 3)); r['pitch_st'].append(round(st, 2)); r['median_hz'].append(round(float(np.median(f0)) if len(f0) else 0, 1)); r['dur'].append(round(len(y) / sr, 2))
for k, r in res.items(): r['MOS'] = round(float(np.mean(r['mos'])), 3); r['PITCH_ST'] = round(float(np.mean(r['pitch_st'])), 2)
json.dump(res, open('OUT/results.json', 'w'), indent=1)
for k, r in sorted(res.items(), key=lambda kv: -kv[1]['MOS']): print(f"{k:34s} MOS {r['MOS']:.2f}  pitch-var {r['PITCH_ST']:.2f} st  f0 {r['median_hz']}", flush=True)
''').replace('OUT', OUT)
for n, s in [('kok', kok), ('cbx', cbx), ('score', score)]: open(f'/tmp/{n}.py', 'w').write(s)
sh = r'''set -e
sudo apt-get install -y -qq espeak-ng >/dev/null
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv venv -q -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python "kokoro>=0.9.4" soundfile librosa
/tmp/k/bin/python /tmp/kok.py
# Piper (MIT engine; voices from rhasspy/piper-voices)
uv venv -q -p 3.11 /tmp/p && VIRTUAL_ENV=/tmp/p uv pip install -q --python /tmp/p/bin/python piper-tts
for v in en_US/ryan/high/en_US-ryan-high en_US/joe/medium/en_US-joe-medium en_GB/alan/medium/en_GB-alan-medium; do b=$(basename $v)
  curl -sL -o /tmp/$b.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx; curl -sL -o /tmp/$b.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx.json
  i=0; while read -r line; do echo "$line" | /tmp/p/bin/piper -m /tmp/$b.onnx -f OUT/piper_${b}_$i.wav >/dev/null 2>&1 || echo "$line" | /tmp/p/bin/piper --model /tmp/$b.onnx --output_file OUT/piper_${b}_$i.wav; i=$((i+1)); done < <(cat /tmp/lines.txt; echo)
  echo piper $b; done
# Chatterbox (Resemble AI, MIT)
uv venv -q -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts && (/tmp/c/bin/python /tmp/cbx.py || echo "chatterbox failed")
/tmp/k/bin/python /tmp/score.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True, capture_output=True)
[print('exported| ' + ln) for ln in r.stdout.splitlines()[-60:]]
if r.returncode != 0:
    for ln in (r.stdout + r.stderr).splitlines()[-40:]: print('Error: ' + ln)
    sys.exit(1)
print('ALL ASSETS DONE')
