# YunoWorld v8 TTS shoot-out (storyteller delivery) — free GitHub runner, CPU only, open-source models, no paid APIs or keys.
# Same three story lines through every free engine/voice candidate; each take is scored automatically:
# UTMOS22 naturalness, Whisper word-error rate (pronunciation), pitch movement (p10-p90 semitone range and std)
# and speaking rate. Targets come from the reference analysis (animated storyteller: ~13 st range, ~2.7 words/s).
import subprocess, os, textwrap
OUT = 'public/yw8-tts-test'; os.makedirs(OUT, exist_ok=True)
LINES = ["This iron cage... wasn't built to keep something in.",
         "Wait... it was built to keep people OUT!",
         "Divers pulled up a lump of bronze... and inside? Gears. Dozens of them!"]
REF = ("Okay, this one is wild. Two hundred years ago, people did something that sounds completely crazy today. "
       "But wait until you hear why, because the reason is genius. Seriously, nobody expects this part!")
open('/tmp/lines.txt', 'w').write('\n'.join(LINES)); open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
L = open('/tmp/lines.txt').read().split('\n'); p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'); pb = KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M')
def say(pp, t, v, sp=1.0): return np.concatenate([np.asarray(a, np.float32) for _, _, a in pp(t, voice=v, speed=sp)])
import torch
V = p.load_voice('am_fenrir') * .5 + p.load_voice('am_puck') * .3 + p.load_voice('am_michael') * .2   # our own blended narrator
for name, v, sp in [('kokoro-fenrir', 'am_fenrir', 1.0), ('kokoro-blend', V, 1.05)]:
    for i, t in enumerate(L): sf.write(f'OUT/{name}_{i}.wav', say(p, t, v, sp), 24000)
    print('kokoro', name, flush=True)
sf.write('/tmp/ref_fenrir.wav', say(p, open('/tmp/ref.txt').read(), 'am_fenrir', 1.05), 24000)
sf.write('/tmp/ref_blend.wav', say(p, open('/tmp/ref.txt').read(), V, 1.08), 24000)
''').replace('OUT', OUT)
cbx = textwrap.dedent(r'''
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device='cpu'); L = open('/tmp/lines.txt').read().split('\n')
for name, ref, ex, cfg, tmp in [('cbx-fenrir-v7', '/tmp/ref_fenrir.wav', .7, .35, .85), ('cbx-fenrir-hot', '/tmp/ref_fenrir.wav', 1.0, .25, .9),
                                ('cbx-blend-e85', '/tmp/ref_blend.wav', .85, .3, .88), ('cbx-blend-hot', '/tmp/ref_blend.wav', 1.1, .22, .92)]:
    for i, t in enumerate(L):
        torch.manual_seed(7 + i); ta.save(f'OUT/{name}_{i}.wav', m.generate(t, audio_prompt_path=ref, exaggeration=ex, cfg_weight=cfg, temperature=tmp), m.sr)
    print('chatterbox', name, flush=True)
try:
    from chatterbox.tts_turbo import ChatterboxTurboTTS
    tm = ChatterboxTurboTTS.from_pretrained(device='cpu')
    TL = [L[0], "[gasp] Wait... it was built to keep people OUT!", L[2]]
    for name, ref, lines in [('turbo-fenrir', '/tmp/ref_fenrir.wav', L), ('turbo-blend', '/tmp/ref_blend.wav', L), ('turbo-blend-tags', '/tmp/ref_blend.wav', TL)]:
        for i, t in enumerate(lines):
            torch.manual_seed(7 + i); ta.save(f'OUT/{name}_{i}.wav', tm.generate(t, audio_prompt_path=ref), tm.sr)
        print('turbo', name, flush=True)
except Exception as e: print('turbo failed', repr(e), flush=True)
''').replace('OUT', OUT)
score = textwrap.dedent(r'''
import glob, json, re, numpy as np, librosa, torch
from faster_whisper import WhisperModel
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
L = open('/tmp/lines.txt').read().split('\n')
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('two', '2')).split()
def wer(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))
res = {}
for f in sorted(glob.glob('OUT/*.wav')):
    key, i = f.split('/')[-1].rsplit('_', 1); i = int(i[:-4])
    y, sr = librosa.load(f, sr=16000); yt, _ = librosa.effects.trim(y, top_db=38)
    mos = float(pred(torch.from_numpy(yt).unsqueeze(0), 16000).item())
    f0, vf, _ = librosa.pyin(yt, fmin=60, fmax=420, sr=sr); f0 = f0[vf] if vf is not None else np.array([])
    st = 12 * np.log2(f0 / np.median(f0)) if len(f0) > 10 else np.zeros(1)
    hyp = ' '.join(s.text for s in wm.transcribe(f, beam_size=5, language='en')[0])
    hyp_n = [w for w in norm(hyp) if w]
    ref_n = [w for w in norm(L[i]) if w]
    r = res.setdefault(key, {'mos': [], 'range_st': [], 'std_st': [], 'wps': [], 'wer': [], 'heard': []})
    r['mos'].append(round(mos, 3)); r['range_st'].append(round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2)); r['std_st'].append(round(float(np.std(st)), 2))
    r['wps'].append(round(len(ref_n) / (len(yt) / sr), 2)); r['wer'].append(round(wer(ref_n, hyp_n), 3)); r['heard'].append(hyp.strip())
for k, r in res.items():
    for m in ('mos', 'range_st', 'std_st', 'wps', 'wer'): r[m.upper()] = round(float(np.mean(r[m])), 3)
json.dump(res, open('OUT/results.json', 'w'), indent=1)
for k, r in sorted(res.items(), key=lambda kv: -kv[1]['MOS']): print(f"{k:24s} MOS {r['MOS']:.2f} range {r['RANGE_ST']:.1f}st std {r['STD_ST']:.2f} wps {r['WPS']:.2f} wer {r['WER']:.2f}", flush=True)
''').replace('OUT', OUT)
for n, s in [('kok', kok), ('cbx', cbx), ('score', score)]: open(f'/tmp/{n}.py', 'w').write(s)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
sudo apt-get install -y -qq espeak-ng >/dev/null
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python "kokoro>=0.9.4" soundfile librosa faster-whisper
/tmp/k/bin/python /tmp/kok.py
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python 'chatterbox-tts>=0.1.5' 'setuptools<81' && (/tmp/c/bin/python /tmp/cbx.py || echo "chatterbox failed")
/tmp/k/bin/python /tmp/score.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True)
print('exported shoot-out rc', r.returncode)
if not os.path.isfile(f'{OUT}/results.json'): print('Error: no results'); raise SystemExit(1)
print('ALL ASSETS DONE')
