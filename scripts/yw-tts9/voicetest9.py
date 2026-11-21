# YunoWorld v9 voice test: four ORIGINAL AI narrators (not clones of anyone), free runner, CPU, open-source only.
# Base timbres are synthetic Kokoro voices (Apache-2.0); Chatterbox TTS (MIT) adds energetic, expressive delivery.
# The same ~20 s hook is read as TWO long connected passages (not phrase clips). Each passage: 3 takes, keep the best
# by Whisper accuracy, then naturalness (UTMOS) + pitch movement. Passages join with a natural 0.16 s breath;
# any internal pause longer than 0.38 s is shortened to 0.28 s. Dry: no reverb, no echo, no music. Measures real pace.
import subprocess, os, textwrap
OUT = 'public/yw9-voicetest'; os.makedirs(OUT, exist_ok=True)
P = ["This scientist is sliding a live pigeon into the nose of a bomb. And no, he is not getting rid of the pigeon. He wants the pigeon to fly it!",
     "It's World War Two, bombs keep missing their targets, and nobody can steer one. So a psychologist named B.F. Skinner shows up with a plan, and a box full of pigeons."]
REF = ("Okay, you are NOT going to believe this one! It sounds completely crazy, right? But wait, here's the best part. "
       "It actually worked! Seriously, this is one of the wildest stories I have ever heard.")
open('/tmp/p.txt', 'w').write('\n'.join(P)); open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
pa = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'); T = open('/tmp/ref.txt').read()
say = lambda v, sp: np.concatenate([np.asarray(a, np.float32) for _, _, a in pa(T, voice=v, speed=sp)])
V = {'spark': (pa.load_voice('am_puck') * .7 + pa.load_voice('am_echo') * .3, 1.08),
     'blaze': (pa.load_voice('am_fenrir') * .5 + pa.load_voice('am_puck') * .35 + pa.load_voice('am_michael') * .15, 1.06),
     'nova':  (pa.load_voice('af_bella') * .7 + pa.load_voice('af_nicole') * .3, 1.07),
     'ruby':  (pa.load_voice('af_heart') * .6 + pa.load_voice('af_jessica') * .4, 1.07)}
for k, (v, sp) in V.items(): sf.write(f'/tmp/ref_{k}.wav', say(v, sp), 24000); print('ref', k, flush=True)
''')
gen = textwrap.dedent(r'''
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device='cpu'); P = open('/tmp/p.txt').read().split('\n')
CFG = {'spark': (.78, .32, .85), 'blaze': (.85, .30, .85), 'nova': (.78, .32, .85), 'ruby': (.72, .34, .82)}
import os; os.makedirs('/tmp/takes', exist_ok=True)
for name, (ex, cfg, tmp) in CFG.items():
    for i, t in enumerate(P):
        for k in range(3):
            torch.manual_seed(100 * i + 7 * k + 3)
            w = m.generate(t, audio_prompt_path=f'/tmp/ref_{name}.wav', exaggeration=ex + (k - 1) * .07, cfg_weight=cfg, temperature=tmp)
            ta.save(f'/tmp/takes/{name}_{i}_{k}.wav', w, m.sr)
        print('gen', name, i, flush=True)
''')
pick = textwrap.dedent(r'''
import glob, json, re, numpy as np, librosa, soundfile as sf, torch
from faster_whisper import WhisperModel
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
P = open('/tmp/p.txt').read().split('\n'); SR = 24000
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('two', '2').replace('b.f.', 'bf').replace('b. f.', 'bf')).split()
def wer(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))
def squeeze(y):   # shorten only over-long internal pauses (never lengthen anything)
    iv = librosa.effects.split(y, top_db=36, frame_length=1024, hop_length=256); out = [y[iv[0][0]:iv[0][1]]]; n = 0
    for (s0, e0), (s1, e1) in zip(iv[:-1], iv[1:]):
        g = s1 - e0
        if g > .38 * SR: g = int(.28 * SR); n += 1
        out += [np.zeros(g, np.float32) if g != s1 - e0 else y[e0:s1], y[s1:e1]]
    return np.concatenate(out), n
def score(f, text):
    y, _ = librosa.load(f, sr=SR); y, n = squeeze(y)
    segs, _ = wm.transcribe(y if False else f, beam_size=5, language='en'); hyp = ' '.join(s.text for s in segs)
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000); mos = float(pred(torch.from_numpy(y16).unsqueeze(0), 16000).item())
    f0, vf, _ = librosa.pyin(y16, fmin=65, fmax=450, sr=16000); f0 = f0[vf]
    rng = float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10)))
    return dict(file=f, heard=hyp.strip(), wer=round(wer(norm(text), norm(hyp)), 3), mos=round(mos, 3), range_st=round(rng, 2), median_hz=round(float(np.median(f0)), 1), squeezed=n, y=y)
rep = {}
for name in ['spark', 'blaze', 'nova', 'ruby']:
    parts, info = [], []
    for i, t in enumerate(P):
        c = [score(f, t) for f in sorted(glob.glob(f'/tmp/takes/{name}_{i}_*.wav'))]
        b = min(c, key=lambda x: (round(x['wer'], 2), -(x['mos'] + .05 * min(x['range_st'], 16)))); parts.append(b['y'])
        info.append({k: v for k, v in b.items() if k != 'y'})
    br = np.zeros(int(.16 * SR), np.float32); y = np.concatenate([np.zeros(int(.12 * SR), np.float32), parts[0], br, parts[1], np.zeros(int(.3 * SR), np.float32)])
    y = librosa.effects.preemphasis(y, coef=.0) if False else y
    y = y / (np.sqrt(np.mean(y[np.abs(y) > .01] ** 2)) + 1e-9) * .1; y = np.tanh(y * 1.6) / 1.6; y *= .89 / max(1e-6, np.abs(y).max())
    sf.write(f'OUT/voice_{name}.wav', y, SR, subtype='PCM_16')
    words = len(' '.join(P).split()); speech = sum(len(p) for p in parts) / SR; dur = len(y) / SR
    iv = librosa.effects.split(y, top_db=36, frame_length=1024, hop_length=256); gaps = [(s1 - e0) / SR for (_, e0), (s1, _) in zip(iv[:-1], iv[1:])]
    rep[name] = dict(duration_s=round(dur, 2), words=words, words_per_s=round(words / speech, 3), longest_gap_s=round(max(gaps), 2), active_pct=round(100 * sum(e - s for s, e in iv) / len(y), 1), passages=info)
    print(name, rep[name]['duration_s'], rep[name]['words_per_s'], flush=True)
json.dump(rep, open('OUT/report.json', 'w'), indent=1)
''').replace('OUT', OUT)
for n, s in [('kok', kok), ('gen', gen), ('pick', pick)]: open(f'/tmp/{n}.py', 'w').write(s)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python "kokoro>=0.9.4" soundfile
sudo apt-get install -y -qq espeak-ng >/dev/null
/tmp/k/bin/python /tmp/kok.py
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts 'setuptools<81' librosa faster-whisper
/tmp/c/bin/python /tmp/gen.py
/tmp/c/bin/python /tmp/pick.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True); print('exported vo rc', r.returncode)
if not os.path.isfile(f'{OUT}/report.json'): print('Error: voice test not produced'); raise SystemExit(1)
print('ALL ASSETS DONE')
