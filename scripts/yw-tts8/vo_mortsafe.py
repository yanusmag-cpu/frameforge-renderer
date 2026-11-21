# Narration job for the mortsafe short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'mortsafe'
exec(open('scripts/yw-tts8/make_vo8.py').read())
