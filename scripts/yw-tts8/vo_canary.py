# Narration job for the canary short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'canary'
exec(open('scripts/yw-tts8/make_vo8.py').read())
