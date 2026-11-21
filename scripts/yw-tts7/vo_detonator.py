# Narration job for the detonator short (see make_vo7.py).
import os
os.environ['YW_FILM'] = 'detonator'
exec(open('scripts/yw-tts7/make_vo7.py').read())
