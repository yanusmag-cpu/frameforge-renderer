# YunoWorld v9 voice lab: tests NEW expressive TTS engines (free runner, CPU, open weights only, no paid APIs or keys).
# ENGINE is set by the small wrapper script. Every engine reads the same ~20 s pigeon test (excitement, surprise,
# curiosity, reveal) as ONE continuous generation, with a male voice designed by us (no cloning of any real person).
# Controllability is TESTED, not assumed: the same line is generated "plain" vs "emotional" with the engine's own
# control (tags / voice description / natural-language instruct) and compared by a speech-emotion model (arousal),
# pitch movement and loudness movement. Also measured: Whisper accuracy, UTMOS naturalness, median pitch (male check),
# pace and longest pause. Evaluation model audeering msp-dim (CC BY-NC-SA) is used only to score, never in output.
import subprocess, os, json, textwrap
ENGINE = os.environ.get('YW_ENGINE') or globals().get('ENGINE'); OUT = f'public/yw9-lab-{ENGINE}'; os.makedirs(OUT, exist_ok=True)
BASE = ("Okay, so picture this. A scientist is sliding a live pigeon into the nose of a bomb. Wait, what? "
        "Why would anyone do that? Here's the crazy part. He's not getting rid of the pigeon. The pigeon is the pilot! "
        "It's going to peck at a tiny screen and steer the bomb itself.")
CTRL = "Wait. He wants the pigeon to fly the bomb? That's insane!"
ORPH = BASE.replace("bomb. Wait", "bomb. <gasp> Wait").replace("pilot! It's", "pilot! <chuckle> It's")
MAYA = BASE.replace("bomb. Wait", "bomb. <gasp> Wait").replace("pilot! It's", "pilot! <laugh> It's")
MDESC = ["Realistic male voice in his late 20s with an American accent. Bright, warm timbre, medium-high pitch, fast conversational pacing, excited storyteller tone with very high energy and expressiveness. Studio quality.",
         "Charismatic male YouTube storyteller in his early 30s, American accent, lively and playful, natural pitch swings, animated and amazed tone, quick pacing. Close-mic studio quality."]
QI = ["A young American man in his late twenties excitedly telling a friend an unbelievable true story. Very animated and energetic with big natural pitch swings: playful disbelief on the questions, a suspenseful lean-in before the reveal, then delighted amazement on the punchline. Fast, natural, conversational. Close-mic, dry studio sound.",
      "An enthusiastic male YouTube storyteller around thirty with a warm, bright voice, grinning as he talks. He sounds genuinely amazed by the story, stresses key words, gasps in surprise, laughs a little at the crazy part. Quick conversational rhythm with no long pauses. Clean studio recording."]
QPLAIN = "An adult man reading a sentence in a flat, neutral, calm and unemotional voice."
QEMO = "An adult man in total shocked disbelief, then laughing in amazement. Very excited and animated."
jobs = []   # (name, kind, text_for_wer, payload)
if ENGINE == 'orpheus':
    for v in ['leo', 'zac', 'dan']: jobs.append((f'orpheus-{v}', 'main', BASE, {'voice': v, 'text': ORPH}))
    jobs += [('ctl-plain', 'plain', CTRL, {'voice': 'leo', 'text': CTRL.replace('?', '.').replace('!', '.')}),
             ('ctl-emo', 'emo', CTRL, {'voice': 'leo', 'text': "<gasp> Wait. He wants the pigeon to fly the bomb?! <laugh> That's insane!"})]
elif ENGINE == 'maya':
    for i, d in enumerate(MDESC): jobs.append((f'maya-{i+1}', 'main', BASE, {'desc': d, 'text': MAYA}))
    jobs += [('ctl-plain', 'plain', CTRL, {'desc': "Male voice in his 30s, American accent, flat monotone, calm, slow, neutral reading. Studio quality.", 'text': CTRL}),
             ('ctl-emo', 'emo', CTRL, {'desc': MDESC[0], 'text': "<gasp> Wait. He wants the pigeon to fly the bomb? <laugh> That's insane!"})]
else:
    for i, q in enumerate(QI): jobs.append((f'qwen-{i+1}', 'main', BASE, {'instruct': q, 'text': BASE}))
    jobs += [('ctl-plain', 'plain', CTRL, {'instruct': QPLAIN, 'text': CTRL}), ('ctl-emo', 'emo', CTRL, {'instruct': QEMO, 'text': CTRL})]
json.dump(jobs, open('/tmp/jobs.json', 'w'))
llama_gen = textwrap.dedent(r'''
import json, sys, time, numpy as np, soundfile as sf, torch
from huggingface_hub import list_repo_files, hf_hub_download
from llama_cpp import Llama
from snac import SNAC
E = sys.argv[1]; jobs = json.load(open('/tmp/jobs.json'))
REPOS = {'orpheus': ['unsloth/orpheus-3b-0.1-ft-GGUF', 'lex-au/Orpheus-3b-FT-Q8_0.gguf', 'isaiahbjork/orpheus-3b-0.1-ft-Q4_K_M-GGUF'], 'maya': ['Mungert/maya1-GGUF', 'eugenehp/maya1']}[E]
path = None
for r in REPOS:
    try: fs = [f for f in list_repo_files(r) if f.lower().endswith('.gguf')]
    except Exception as e: print('repo fail', r, e, flush=True); continue
    for q in ['q8_0', 'q6_k', 'q5_k_m', 'q4_k_m']:
        m = [f for f in fs if q in f.lower() and 'imatrix' not in f.lower()]
        if m: path = hf_hub_download(r, sorted(m, key=len)[0]); break
    if path: print('model', r, path, flush=True); break
llm = Llama(model_path=path, n_ctx=4096, n_threads=4, n_batch=256, verbose=False)
snac = SNAC.from_pretrained('hubertsiuzdak/snac_24khz').eval()
def toks(p):
    if E == 'orpheus': body = llm.tokenize(f"{p['voice']}: {p['text']}".encode(), add_bos=True, special=False)
    else: body = [128000] + llm.tokenize(f'<description="{p["desc"]}"> {p["text"]}'.encode(), add_bos=False, special=False)
    return [128259] + body + [128009, 128260, 128261, 128257]
meta = {}
for name, kind, ref, p in jobs:
    t0 = time.time(); llm.reset(); out = []
    temp, top_p = (.6, .8) if E == 'orpheus' else (.4, .9)
    for i, t in enumerate(llm.generate(toks(p), temp=temp, top_p=top_p, top_k=50, repeat_penalty=1.1, reset=True)):
        if t in (128258, 128009) or len(out) > 2700: break
        if t >= 128266: out.append(t - 128266)
    n = len(out) // 7 * 7; c = out[:n]
    l1 = [c[i] % 4096 for i in range(0, n, 7)]; l2 = []; l3 = []
    for i in range(0, n, 7): l2 += [c[i+1] % 4096, c[i+4] % 4096]; l3 += [c[i+2] % 4096, c[i+3] % 4096, c[i+5] % 4096, c[i+6] % 4096]
    with torch.inference_mode(): a = snac.decoder(snac.quantizer.from_codes([torch.tensor([l]) for l in (l1, l2, l3)]))[0, 0].numpy()
    a = a[2048:]; sf.write(f'/tmp/raw_{name}.wav', a, 24000); meta[name] = {'gen_s': round(time.time() - t0, 1), 'tokens': n}
    print('gen', name, meta[name], flush=True); json.dump(meta, open('/tmp/genmeta.json', 'w'))
json.dump(meta, open('/tmp/genmeta.json', 'w'))
''')
qwen_gen = textwrap.dedent(r'''
import json, time, torch, numpy as np, soundfile as sf
from qwen_tts import Qwen3TTSModel
torch.set_num_threads(4); jobs = json.load(open('/tmp/jobs.json'))
m = Qwen3TTSModel.from_pretrained('Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', device_map='cpu', dtype=torch.float32)
meta = {}
for name, kind, ref, p in jobs:
    t0 = time.time(); torch.manual_seed(11)
    w, sr = m.generate_voice_design(text=p['text'], language='English', instruct=p['instruct'])
    a = np.asarray(w[0], np.float32); sf.write(f'/tmp/raw_{name}.wav', a, sr); meta[name] = {'gen_s': round(time.time() - t0, 1), 'sr': sr}
    print('gen', name, meta[name], flush=True); json.dump(meta, open('/tmp/genmeta.json', 'w'))
json.dump(meta, open('/tmp/genmeta.json', 'w'))
''')
ev = textwrap.dedent(r'''
import json, re, numpy as np, librosa, soundfile as sf, torch, torch.nn as nn
from faster_whisper import WhisperModel
from transformers import Wav2Vec2Processor
from transformers.models.wav2vec2.modeling_wav2vec2 import Wav2Vec2Model, Wav2Vec2PreTrainedModel
class Head(nn.Module):
    def __init__(s, c): super().__init__(); s.dense = nn.Linear(c.hidden_size, c.hidden_size); s.dropout = nn.Dropout(c.final_dropout); s.out_proj = nn.Linear(c.hidden_size, c.num_labels)
    def forward(s, x): return s.out_proj(s.dropout(torch.tanh(s.dense(s.dropout(x)))))
class Emo(Wav2Vec2PreTrainedModel):
    def __init__(s, c): super().__init__(c); s.config = c; s.wav2vec2 = Wav2Vec2Model(c); s.classifier = Head(c); s.post_init()
    def forward(s, x): return s.classifier(torch.mean(s.wav2vec2(x)[0], dim=1))
EM = 'audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim'; proc = Wav2Vec2Processor.from_pretrained(EM); emo = Emo.from_pretrained(EM).eval()
pred = torch.hub.load('/tmp/SpeechMOS', 'utmos22_strong', source='local', trust_repo=True); wm = WhisperModel('small.en', device='cpu', compute_type='int8')
import os
jobs = json.load(open('/tmp/jobs.json')); gm = json.load(open('/tmp/genmeta.json')) if os.path.isfile('/tmp/genmeta.json') else {}; SR = 24000
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower()).split()
def wer(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
    return d[len(b)] / max(1, len(a))
def squeeze(y):   # only shortens pauses longer than 0.45 s to 0.3 s; never lengthens anything
    iv = librosa.effects.split(y, top_db=38, frame_length=1024, hop_length=256)
    if len(iv) == 0: return y, 0, 0.0
    out = [y[iv[0][0]:iv[0][1]]]; n = 0; gaps = []
    for (s0, e0), (s1, e1) in zip(iv[:-1], iv[1:]):
        g = s1 - e0; gaps.append(g / SR)
        if g > .45 * SR: out.append(np.zeros(int(.3 * SR), np.float32)); n += 1
        else: out.append(y[e0:s1])
        out.append(y[s1:e1])
    return np.concatenate(out), n, max(gaps or [0])
rep = {}
for name, kind, ref, p in jobs:
    import os
    if not os.path.isfile(f'/tmp/raw_{name}.wav'): rep[name] = {'kind': kind, 'error': 'not generated'}; continue
    y, _ = librosa.load(f'/tmp/raw_{name}.wav', sr=SR)
    if len(y) < SR: rep[name] = {'kind': kind, 'error': 'empty'}; continue
    y = librosa.effects.trim(y, top_db=40)[0]; y, nsq, gap0 = squeeze(y)
    y = y / (np.abs(y).max() + 1e-9) * .89
    sf.write(f'OUT/{name}.wav', np.concatenate([np.zeros(int(.1 * SR), np.float32), y, np.zeros(int(.25 * SR), np.float32)]), SR, subtype='PCM_16')
    segs, _ = wm.transcribe(f'OUT/{name}.wav', beam_size=5, language='en'); hyp = ' '.join(s.text for s in segs).strip()
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000)
    with torch.no_grad():
        mos = float(pred(torch.from_numpy(y16).unsqueeze(0), 16000).item())
        ad = emo(torch.from_numpy(proc(y16, sampling_rate=16000)['input_values'][0]).unsqueeze(0)).numpy()[0]
    f0, vf, _ = librosa.pyin(y16, fmin=60, fmax=450, sr=16000); f0 = f0[vf]
    rms = librosa.feature.rms(y=y16, frame_length=1024, hop_length=256)[0]; rdb = 20 * np.log10(rms[rms > rms.max() * .05] + 1e-9)
    w = len(norm(ref))
    rep[name] = dict(kind=kind, dur_s=round(len(y) / SR, 2), words_per_s=round(w / (len(y) / SR), 2), wer=round(wer(norm(ref), norm(hyp)), 3), heard=hyp,
                     utmos=round(mos, 3), arousal=round(float(ad[0]), 3), dominance=round(float(ad[1]), 3), valence=round(float(ad[2]), 3),
                     median_hz=round(float(np.median(f0)), 1), pitch_range_st=round(float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10))), 2),
                     loud_range_db=round(float(np.percentile(rdb, 90) - np.percentile(rdb, 10)), 2), longest_gap_raw_s=round(gap0, 2), gaps_shortened=nsq, **gm.get(name, {}))
    print(name, rep[name], flush=True)
json.dump(rep, open('OUT/report.json', 'w'), indent=1)
''').replace('OUT', OUT)
open('/tmp/llama_gen.py', 'w').write(llama_gen); open('/tmp/qwen_gen.py', 'w').write(qwen_gen); open('/tmp/ev.py', 'w').write(ev)
EV = ""
if ENGINE == 'qwen':
    setup = f"uv venv -q --seed -p 3.12 /tmp/v && VIRTUAL_ENV=/tmp/v uv pip install -q --python /tmp/v/bin/python torch torchaudio --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/v uv pip install -q --python /tmp/v/bin/python qwen-tts\n/tmp/v/bin/python /tmp/qwen_gen.py"
else:
    setup = (f"uv venv -q --seed -p 3.11 /tmp/v && VIRTUAL_ENV=/tmp/v uv pip install -q --python /tmp/v/bin/python torch --index-url https://download.pytorch.org/whl/cpu && "
             f"(VIRTUAL_ENV=/tmp/v uv pip install -q --python /tmp/v/bin/python llama-cpp-python --only-binary=:all: --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu || VIRTUAL_ENV=/tmp/v CMAKE_ARGS='-DGGML_NATIVE=ON' uv pip install -q --python /tmp/v/bin/python llama-cpp-python) && "
             f"VIRTUAL_ENV=/tmp/v uv pip install -q --python /tmp/v/bin/python snac huggingface_hub soundfile\n/tmp/v/bin/python /tmp/llama_gen.py {ENGINE}")
sh = f'''exec > >(tee -a {OUT}/log.txt) 2>&1
set -x
sudo rm -rf /usr/local/lib/android /usr/share/dotnet /opt/ghc /opt/hostedtoolcache/CodeQL; df -h / | tail -1; nproc; free -g | head -2
python3 -m pip install -q --user --break-system-packages uv || curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
git clone -q --depth 1 --branch v1.2.0 https://github.com/tarepan/SpeechMOS /tmp/SpeechMOS
{setup}
uv venv -q --seed -p 3.11 /tmp/e && VIRTUAL_ENV=/tmp/e uv pip install -q --python /tmp/e/bin/python torch --index-url https://download.pytorch.org/whl/cpu && VIRTUAL_ENV=/tmp/e uv pip install -q --python /tmp/e/bin/python 'transformers==4.57.1' librosa faster-whisper soundfile
/tmp/e/bin/python /tmp/ev.py
'''
r = subprocess.run(['bash', '-c', sh], text=True); print('lab rc', r.returncode)
for l in open(f'{OUT}/log.txt').read().splitlines():
    if l.startswith(('gen ', 'model ', 'repo fail')) or 'Error' in l or 'File "/tmp' in l: print('exported LOG', l[:300])
if not os.path.isfile(f'{OUT}/report.json'): print('Error: lab produced no report'); raise SystemExit(1)
print('ALL ASSETS DONE')
