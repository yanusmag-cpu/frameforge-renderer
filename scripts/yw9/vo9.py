# YunoWorld v9 narration: the user's chosen "Blaze" voice (original AI voice: synthetic Kokoro timbre blend, Chatterbox
# delivery, exactly the settings of the approved voice-test sample). FILM and SCRIPT come from the wrapper.
# Each story passage (30-50 words) is ONE continuous take; 3 takes per passage, best by Whisper accuracy then UTMOS +
# pitch movement. Passages join with a 0.16 s breath; internal pauses over 0.38 s are shortened to 0.28 s; nothing is
# ever lengthened or sped up. Dry: no reverb/echo/music. Writes vo.wav, words.json (word timings), passages.json, report.json.
import subprocess, os, json, textwrap
FILM = globals().get('FILM'); SCRIPT = globals().get('SCRIPT'); OUT = f'public/yw9-vo-{FILM}'; os.makedirs(OUT, exist_ok=True)
P = json.load(open(SCRIPT)); open('/tmp/p.json', 'w').write(json.dumps(P))
REF = ("Okay, you are NOT going to believe this one! It sounds completely crazy, right? But wait, here's the best part. "
       "It actually worked! Seriously, this is one of the wildest stories I have ever heard.")
open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
pa = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'); T = open('/tmp/ref.txt').read()
v = pa.load_voice('am_fenrir') * .5 + pa.load_voice('am_puck') * .35 + pa.load_voice('am_michael') * .15
sf.write('/tmp/ref_blaze.wav', np.concatenate([np.asarray(a, np.float32) for _, _, a in pa(T, voice=v, speed=1.06)]), 24000); print('ref ok', flush=True)
''')
gen = textwrap.dedent(r'''
import json, os, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device='cpu'); P = json.load(open('/tmp/p.json')); os.makedirs('/tmp/takes', exist_ok=True)
for i, t in enumerate(P):
    for k in range(3):
        torch.manual_seed(100 * i + 7 * k + 3)
        w = m.generate(t, audio_prompt_path='/tmp/ref_blaze.wav', exaggeration=.85 + (k - 1) * .07, cfg_weight=.30, temperature=.85)
        ta.save(f'/tmp/takes/p{i}_{k}.wav', w, m.sr)
    print('gen passage', i, flush=True)
''')
pick = textwrap.dedent(r'''
import glob, json, re, numpy as np, librosa, soundfile as sf, torch
from faster_whisper import WhisperModel
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
P = json.load(open('/tmp/p.json')); SR = 24000
def norm(s):
    s = s.lower().replace('b.f.', 'bf').replace('b. f.', 'bf')
    for a, b in [('1944', 'nineteen forty four'), ('1953', 'nineteen fifty three'), ('1943', 'nineteen forty three'), ('1770', 'seventeen seventy'), ('1854', 'eighteen fifty four'), ('two', '2'), ('-', ' ')]: s = s.replace(a, b)
    return re.sub(r"[^a-z0-9' ]", ' ', s).split()
def wer(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))
def squeeze(y):
    iv = librosa.effects.split(y, top_db=36, frame_length=1024, hop_length=256); out = [y[iv[0][0]:iv[0][1]]]
    for (s0, e0), (s1, e1) in zip(iv[:-1], iv[1:]):
        g = s1 - e0; out += [np.zeros(int(.28 * SR), np.float32) if g > .38 * SR else y[e0:s1], y[s1:e1]]
    return np.concatenate(out)
def score(f, text):
    y, _ = librosa.load(f, sr=SR); y = squeeze(y); sf.write('/tmp/s.wav', y, SR)
    segs, _ = wm.transcribe('/tmp/s.wav', beam_size=5, language='en'); hyp = ' '.join(s.text for s in segs)
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000); mos = float(pred(torch.from_numpy(y16).unsqueeze(0), 16000).item())
    f0, vf, _ = librosa.pyin(y16, fmin=65, fmax=450, sr=16000); f0 = f0[vf]; rng = float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10)))
    return dict(file=f, heard=hyp.strip(), wer=round(wer(norm(text), norm(hyp)), 3), mos=round(mos, 3), range_st=round(rng, 2), y=y)
parts, info = [], []
for i, t in enumerate(P):
    c = [score(f, t) for f in sorted(glob.glob(f'/tmp/takes/p{i}_*.wav'))]
    b = min(c, key=lambda x: (round(x['wer'], 2), -(x['mos'] + .05 * min(x['range_st'], 16)))); parts.append(b['y']); info.append({k: v for k, v in b.items() if k != 'y'})
    print('pick', i, info[-1]['wer'], info[-1]['mos'], flush=True)
br = np.zeros(int(.16 * SR), np.float32); seq = [np.zeros(int(.12 * SR), np.float32)]; spans = []; t = .12
for i, p in enumerate(parts):
    if i: seq.append(br); t += .16
    spans.append([round(t, 3), round(t + len(p) / SR, 3)]); seq.append(p); t += len(p) / SR
seq.append(np.zeros(int(.3 * SR), np.float32)); y = np.concatenate(seq)
y = y / (np.sqrt(np.mean(y[np.abs(y) > .01] ** 2)) + 1e-9) * .1; y = np.tanh(y * 1.6) / 1.6; y *= .89 / max(1e-6, np.abs(y).max())
sf.write('OUT/vo.wav', y, SR, subtype='PCM_16')
segs, _ = wm.transcribe('OUT/vo.wav', beam_size=5, language='en', word_timestamps=True)
words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open('OUT/words.json', 'w')); json.dump({'passages': P, 'spans': spans}, open('OUT/passages.json', 'w'))
iv = librosa.effects.split(y, top_db=36, frame_length=1024, hop_length=256); gaps = [(s1 - e0) / SR for (_, e0), (s1, _) in zip(iv[:-1], iv[1:])]
nw = sum(len(p.split()) for p in P)
json.dump(dict(duration_s=round(len(y) / SR, 2), words=nw, words_per_s=round(nw / (sum(len(p) for p in parts) / SR), 3), longest_gap_s=round(max(gaps), 2),
               active_pct=round(100 * sum(e - s for s, e in iv) / len(y), 1), passages=info), open('OUT/report.json', 'w'), indent=1)
print('done', round(len(y) / SR, 2), flush=True)
''').replace('OUT', OUT)
for n, s in [('kok', kok), ('gen', gen), ('pick', pick)]: open(f'/tmp/{n}.py', 'w').write(s)
sh = f'''exec > >(tee -a {OUT}/log.txt) 2>&1
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
'''
r = subprocess.run(['bash', '-c', sh], text=True); print('exported vo rc', r.returncode)
for l in open(f'{OUT}/log.txt').read().splitlines():
    if l.startswith(('gen passage', 'pick ', 'done', 'ref ok')) or 'Error' in l: print('exported LOG', l[:300])
if not os.path.isfile(f'{OUT}/report.json'): print('Error: narration not produced'); raise SystemExit(1)
print('ALL ASSETS DONE')
