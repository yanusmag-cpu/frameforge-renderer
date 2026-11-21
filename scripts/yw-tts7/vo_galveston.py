# Narration job for the galveston short (see make_vo7.py).
import os
os.environ['YW_FILM'] = 'galveston'
exec(open('scripts/yw-tts7/make_vo7.py').read())
