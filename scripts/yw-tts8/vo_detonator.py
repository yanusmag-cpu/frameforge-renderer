# Narration job for the detonator short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'detonator'
exec(open('scripts/yw-tts8/make_vo8.py').read())
