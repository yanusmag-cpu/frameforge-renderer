# Narration job for the canary short (see make_vo7.py).
import os
os.environ['YW_FILM'] = 'canary'
exec(open('scripts/yw-tts7/make_vo7.py').read())
