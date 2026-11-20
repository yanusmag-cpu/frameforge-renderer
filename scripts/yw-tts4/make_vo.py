# YunoWorld v3 narration — free GitHub runner, CPU, open-source only, no paid APIs or keys.
# Engine: Chatterbox TTS (Resemble AI, MIT licence; output carries Resemble's imperceptible Perth watermark).
# Narrator identity: a synthetic reference voice made with Kokoro-82M (Apache-2.0, voice am_puck) — no real person's voice is cloned.
# Each sentence gets a delivery style (expression strength + pacing); 3 takes per sentence, the best is chosen automatically by
# UTMOS22 naturalness with a speaking-rate sanity check. Writes public/yw4-vo/<film>/sNN.wav (raw, 24 kHz), takes.json, timing.json.
import subprocess, sys, os, textwrap, json
OUT = 'public/yw4-vo'; os.makedirs(OUT, exist_ok=True)
PRESET = {'name': 'YunoWorld Narrator v1', 'engine': 'Chatterbox TTS (MIT)', 'reference': 'Kokoro-82M am_puck (synthetic)',
  'styles': {'c': [.55, .45, .8], 'u': [.72, .38, .85], 'n': [.42, .5, .75], 's': [.5, .26, .75], 'x': [.75, .42, .85], 'm': [.36, .34, .7], 'h': [.48, .28, .75]},
  'style_names': {'c': 'curious', 'u': 'urgent', 'n': 'setup', 's': 'suspense (slower)', 'x': 'excited reveal', 'm': 'somber', 'h': 'haunting'}}
json.dump(PRESET, open(f'{OUT}/narrator_preset.json', 'w'), indent=1)
REF = ("Some stories sound impossible the first time you hear them. A lake that drains in an afternoon. "
       "A wave of syrup tall enough to flatten a building. But every one of them really happened, and the details are even stranger.")
open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
a = np.concatenate([np.asarray(x, np.float32) for _, _, x in p(open('/tmp/ref.txt').read(), voice='am_puck', speed=1.0)])
sf.write('OUT/narrator_ref.wav', a, 24000)
''').replace('OUT', OUT)
gen = textwrap.dedent(r'''
import json, os, re, numpy as np, torch, torchaudio as ta, librosa
from chatterbox.tts import ChatterboxTTS
P = json.load(open('OUT/narrator_preset.json')); D = json.load(open('scripts/yw-tts4/scripts.json'))
m = ChatterboxTTS.from_pretrained(device='cpu')
for film, lines in D['lines'].items():
    os.makedirs(f'OUT/{film}/takes', exist_ok=True)
    for i, text in enumerate(lines):
        ex, cfg, temp = P['styles'][D['style'][film][i]]
        for k in range(3):
            torch.manual_seed(1000 * i + 17 * k + len(film))
            w = m.generate(text, audio_prompt_path='OUT/narrator_ref.wav', exaggeration=ex, cfg_weight=cfg, temperature=temp)
            ta.save(f'OUT/{film}/takes/s{i+1:02d}_t{k}.wav', w, m.sr)
        print('vo', film, i + 1, flush=True)
''').replace('OUT', OUT)
pick = textwrap.dedent(r'''
import glob, json, os, re, shutil, numpy as np, librosa, soundfile as sf, torch
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True)
D = json.load(open('scripts/yw-tts4/scripts.json')); timing = {'engine': 'Chatterbox TTS (MIT) + synthetic Kokoro am_puck reference', 'sr': 24000, 'films': {}}; takes = {}
for film, lines in D['lines'].items():
    rows = []
    for i, text in enumerate(lines):
        n = len(re.findall(r"[A-Za-z']+", text)); best = None; cand = []
        for f in sorted(glob.glob(f'OUT/{film}/takes/s{i+1:02d}_t*.wav')):
            y, sr = librosa.load(f, sr=24000); yt, _ = librosa.effects.trim(y, top_db=38); dur = len(yt) / sr; wps = n / max(dur, .1)
            mos = float(pred(torch.from_numpy(librosa.resample(yt, orig_sr=24000, target_sr=16000)).unsqueeze(0), 16000).item())
            ok = 1.7 <= wps <= 4.3; cand.append({'file': f, 'mos': round(mos, 3), 'dur': round(dur, 3), 'wps': round(wps, 2), 'ok': ok})
            if ok and (best is None or mos > best[0]): best = (mos, yt, dur)
        if best is None: c = max(cand, key=lambda c: c['mos']); y, _ = librosa.load(c['file'], sr=24000); yt, _ = librosa.effects.trim(y, top_db=38); best = (c['mos'], yt, len(yt) / 24000)
        fn = f'OUT/{film}/s{i+1:02d}.wav'; sf.write(fn, np.pad(best[1], (int(.04 * 24000), int(.08 * 24000))), 24000, subtype='PCM_16')
        rows.append({'i': i + 1, 'text': text, 'style': D['style'][film][i], 'dur': round(best[2] + .12, 3), 'mos': round(best[0], 3), 'file': fn}); takes[f'{film}/{i+1}'] = cand
        print('pick', film, i + 1, rows[-1]['mos'], rows[-1]['dur'], flush=True)
    timing['films'][film] = rows
    shutil.rmtree(f'OUT/{film}/takes')
json.dump(timing, open('OUT/timing.json', 'w'), indent=1); json.dump(takes, open('OUT/takes.json', 'w'), indent=1)
''').replace('OUT', OUT)
for n, s in [('kok', kok), ('gen', gen), ('pick', pick)]: open(f'/tmp/{n}.py', 'w').write(s)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
sudo apt-get install -y -qq espeak-ng >/dev/null
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python "kokoro>=0.9.4" soundfile librosa https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
/tmp/k/bin/python /tmp/kok.py
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts 'setuptools<81' librosa
/tmp/c/bin/python /tmp/gen.py
/tmp/k/bin/python /tmp/pick.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True)
print('exported vo rc', r.returncode)
if not os.path.isfile(f'{OUT}/timing.json'): print('Error: narration not produced'); sys.exit(1)
print('ALL ASSETS DONE')
