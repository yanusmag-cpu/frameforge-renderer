# YunoWorld v8 narration PATCH (regenerate only the listed lines, 6 takes each, merge into timing.json) (one film per job) — free runner, CPU, open-source only, no paid services.
# Narrator: Chatterbox TTS (MIT) prompted with a synthetic Kokoro am_fenrir reference (Apache-2.0); not a clone of any real person.
# The script is written as short PHRASES, each with a delivery style and the pause that follows it, so emphasis words get their own
# higher-energy phrase and dramatic pauses are exact. Each phrase is generated in 3 configurations (exaggeration -0.08 / 0 / +0.08,
# different seeds); the kept take has the best Whisper match to the script, then the best naturalness+expressiveness score
# (UTMOS + 0.03 x pitch range in semitones).
# Also stores Whisper word timestamps of the chosen take (for word-synced captions).
import subprocess, os, textwrap, json
FILM = os.environ['YW_FILM']; ONLY = [int(x) for x in os.environ['YW_ONLY'].split(',')]; OUT = f'public/yw8-vo-{FILM}'; os.makedirs(OUT, exist_ok=True)
gen = textwrap.dedent(r'''
import json, os, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
import re
D = json.load(open('scripts/yw-tts8/scripts.json'))
m = ChatterboxTTS.from_pretrained(device='cpu'); os.makedirs('OUT/takes', exist_ok=True)
for i, row in enumerate(D['films']['FILM']):
    if i not in ONLY_: continue
    text, st = row[0], row[1]; ex, cfg, temp = D['styles'][st]; say = re.sub(r"\b[A-Z]{2,}\b", lambda q: q.group(0).lower(), row[3] if len(row) > 3 else text)
    for k in range(6):
        torch.manual_seed(1000 * i + 17 * k + 905); w = m.generate(say, audio_prompt_path='OUT/narrator_ref.wav', exaggeration=min(.95, ex + (k - 2.5) * .04), cfg_weight=cfg, temperature=temp)
        ta.save(f'OUT/takes/s{i+1:02d}_t{k}.wav', w, m.sr)
    print('vo', i + 1, flush=True)
''').replace('OUT', OUT).replace('FILM', FILM).replace('ONLY_', repr(ONLY))
pick = textwrap.dedent(r'''
import json, re, glob, shutil, numpy as np, librosa, soundfile as sf, torch
from faster_whisper import WhisperModel
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
D = json.load(open('scripts/yw-tts8/scripts.json')); lines = [x[0] for x in D['films']['FILM']]
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(); TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()
def spell(n):
    n = int(n)
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' ' + spell(n % 100))
    if 1100 <= n < 2000 and n % 100: return spell(n // 100) + ' ' + spell(n % 100)
    return spell(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else ' ' + spell(n % 1000))
def norm(s):
    s = re.sub(r'\$(\d+)', r'\1 dollars', s.lower()); s = re.sub(r'(\d+)', lambda m: spell(m.group(1)), s.replace(',', ''))
    s = re.sub(r'\blt\b', 'lieutenant', s); s = re.sub(r'\bii\b', 'two', s); s = s.replace('-', ' ').replace(' and ', ' '); return [w for w in re.sub(r"[^a-z' ]", ' ', s).split() if w not in ('and',)]
def wer(a, b):
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1): d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1] / max(1, len(a))
rows = []; takes = {}
for i, text in enumerate(lines):
    if i not in ONLY_: continue
    cands = []
    for f in sorted(glob.glob(f'OUT/takes/s{i+1:02d}_t*.wav')):
        y, _ = librosa.load(f, sr=24000); yt, idx = librosa.effects.trim(y, top_db=38); off = idx[0] / 24000
        segs, _ = wm.transcribe(f, beam_size=5, language='en', word_timestamps=True); segs = list(segs)
        hyp = ' '.join(s.text for s in segs).strip(); words = [[round(w.start - off + .04, 3), round(w.end - off + .04, 3), w.word.strip()] for s in segs for w in (s.words or [])]
        y16 = librosa.resample(yt, orig_sr=24000, target_sr=16000); mos = float(pred(torch.from_numpy(y16).unsqueeze(0), 16000).item())
        f0, vf, _ = librosa.pyin(y16, fmin=65, fmax=420, sr=16000); f0 = f0[vf] if vf is not None else np.array([])
        rng = float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10))) if len(f0) > 8 else 0.0
        cands.append({'file': f, 'heard': hyp, 'wer': round(wer(norm(text), norm(hyp)), 3), 'mos': round(mos, 3), 'range_st': round(rng, 2), 'dur': round(len(yt) / 24000, 3), 'y': yt, 'words': words})
    b = min(cands, key=lambda c: (round(c['wer'], 2), -(c['mos'] + .05 * min(c['range_st'], 16))))
    fn = f'OUT/s{i+1:02d}.wav'; sf.write(fn, np.pad(b['y'], (960, 1920)), 24000, subtype='PCM_16')
    rows.append({'i': i + 1, 'text': text, 'style': D['films']['FILM'][i][1], 'pause': D['films']['FILM'][i][2], 'dur': round(b['dur'] + .12, 3), 'mos': b['mos'], 'range_st': b['range_st'], 'wer': b['wer'], 'heard': b['heard'], 'words': b['words'], 'file': fn})
    takes[i + 1] = [{k: v for k, v in c.items() if k not in ('y', 'words')} for c in cands]; print('pick', i + 1, b['wer'], b['mos'], b['range_st'], flush=True)
shutil.rmtree('OUT/takes')
J = json.load(open('OUT/timing.json')); old = J['films']['FILM']
for r in rows: old[r['i'] - 1] = r
json.dump(J, open('OUT/timing.json', 'w'), indent=1); TK = json.load(open('OUT/takes.json')); TK.update({str(k): v for k, v in takes.items()}); json.dump(TK, open('OUT/takes.json', 'w'), indent=1)
''').replace('OUT', OUT).replace('FILM', FILM).replace('ONLY_', repr(ONLY))
open('/tmp/gen.py', 'w').write(gen); open('/tmp/pick.py', 'w').write(pick)
sh = r'''exec > >(tee -a OUT/log.txt) 2>&1
set -x
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
uv venv -q --seed -p 3.11 /tmp/k && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python torch --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/k uv pip install -q --python /tmp/k/bin/python "kokoro>=0.9.4" soundfile
sudo apt-get install -y -qq espeak-ng >/dev/null
/tmp/k/bin/python -c "
import numpy as np, soundfile as sf
from kokoro import KPipeline
p = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
t = 'Okay, this one is wild. Two hundred years ago, people did something that sounds completely crazy today. But wait until you hear why, because the reason is genius. Seriously, nobody expects this part!'
sf.write('OUT/narrator_ref.wav', np.concatenate([np.asarray(a, np.float32) for _, _, a in p(t, voice='am_fenrir', speed=1.05)]), 24000)"
uv venv -q --seed -p 3.11 /tmp/c && VIRTUAL_ENV=/tmp/c uv pip install -q --python /tmp/c/bin/python chatterbox-tts 'setuptools<81' librosa faster-whisper
/tmp/c/bin/python /tmp/gen.py
/tmp/c/bin/python /tmp/pick.py
'''.replace('OUT', OUT)
r = subprocess.run(['bash', '-c', sh], text=True); print('exported vo rc', r.returncode)
if not os.path.isfile(f'{OUT}/timing.json'): print('Error: narration not produced'); raise SystemExit(1)
print('ALL ASSETS DONE')
