# Narration job for the galveston short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'galveston'
exec(open('scripts/yw-tts8/make_vo8.py').read())
