# YunoWorld v6 TTS shoot-out — free GitHub runner, CPU only, open-source models, no paid APIs or keys.
# Same three story lines through every free engine/voice candidate; each take is scored automatically:
# UTMOS22 naturalness, Whisper word-error rate (pronunciation), pitch movement (p10-p90 semitone range and std)
# and speaking rate. Targets come from the reference analysis (animated storyteller: ~13 st range, ~2.7 words/s).
import subprocess, os, textwrap
OUT = 'public/yw6-tts-test'; os.makedirs(OUT, exist_ok=True)
LINES = ["This soldier kept fighting World War Two... for twenty-nine years after it ended.",
         "Lieutenant Onoda, a panda, and the Abominable Snowman. In that order.",
         "After twenty-nine years... Onoda finally lowered his rifle."]
REF = ("Some stories sound impossible the first time you hear them. A man who mails himself across a country. "
       "A bridge that shakes itself apart. But every one of them really happened, and the details are even stranger.")
open('/tmp/lines.txt', 'w').write('\n'.join(LINES)); open('/tmp/ref.txt', 'w').write(REF)
kok = textwrap.dedent(r'''
import numpy as np, soundfile as sf
from kokoro import KPipeline
L = open('/tmp/lines.txt').read().split('\n'); p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M'); pb = KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M')
def say(pp, t, v, sp=1.0): return np.concatenate([np.asarray(a, np.float32) for _, _, a in pp(t, voice=v, speed=sp)])
for v in ['am_puck', 'am_michael', 'am_fenrir', 'bm_fable', 'bm_george']:
    pp = pb if v.startswith('b') else p
    for i, t in enumerate(L): sf.write(f'OUT/kokoro-{v}_{i}.wav', say(pp, t, v), 24000)
    print('kokoro', v, flush=True)
for v in ['am_fenrir', 'bm_fable']:
    pp = pb if v.startswith('b') else p; sf.write(f'/tmp/ref_{v}.wav', say(pp, open('/tmp/ref.txt').read(), v), 24000)
''').replace('OUT', OUT)
cbx = textwrap.dedent(r'''
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device='cpu'); L = open('/tmp/lines.txt').read().split('\n'); R = 'public/yw4-vo-peigneur/narrator_ref.wav'
for name, ref, ex, cfg, tmp in [('cbx-puckref-e05', R, .5, .45, .8), ('cbx-puckref-e07', R, .7, .35, .85), ('cbx-puckref-e09', R, .9, .3, .9),
                                ('cbx-builtin-e065', None, .65, .4, .8), ('cbx-fenrirref-e07', '/tmp/ref_am_fenrir.wav', .7, .35, .85), ('cbx-fableref-e07', '/tmp/ref_bm_fable.wav', .7, .35, .85)]:
    for i, t in enumerate(L):
        torch.manual_seed(7 + i)
        w = m.generate(t, audio_prompt_path=ref, exaggeration=ex, cfg_weight=cfg, temperature=tmp) if ref else m.generate(t, exaggeration=ex, cfg_weight=cfg, temperature=tmp)
        ta.save(f'OUT/{name}_{i}.wav', w, m.sr)
    print('chatterbox', name, flush=True)
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
    hyp_n = [w for w in norm(re.sub(r'\b29\b', 'twenty nine', hyp).replace('twenty-nine', 'twenty nine')) if w]
    ref_n = [w for w in norm(L[i].replace('twenty-nine', 'twenty nine')) if w]
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
uv venv -q --seed -p 3.11 /tmp/p && VIRTUAL_ENV=/tmp/p uv pip install -q --python /tmp/p/bin/python piper-tts
for v in en/en_US/ryan/high/en_US-ryan-high; do b=$(basename $v)
  curl -sL -o /tmp/$b.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx; curl -sL -o /tmp/$b.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/$v.onnx.json
  i=0; while read -r line; do echo "$line" | /tmp/p/bin/piper -m /tmp/$b.onnx -f OUT/piper-${b}_$i.wav >/dev/null 2>&1 || echo "$line" | /tmp/p/bin/piper --model /tmp/$b.onnx --output_file OUT/piper-${b}_$i.wav; i=$((i+1)); done < <(cat /tmp/lines.txt; echo)
  done
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts 'setuptools<81' && (/tmp/c/bin/python /tmp/cbx.py || echo "chatterbox failed")
/tmp/k/bin/python /tmp/score.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True)
print('exported shoot-out rc', r.returncode)
if not os.path.isfile(f'{OUT}/results.json'): print('Error: no results'); raise SystemExit(1)
print('ALL ASSETS DONE')
