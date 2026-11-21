# Narration job for one film (see make_vo5.py).
import os
os.environ['YW_FILM'] = 'boxbrown'
exec(open('scripts/yw-tts5/make_vo5.py').read())
