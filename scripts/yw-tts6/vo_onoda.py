# Narration job for the Onoda short (see make_vo6.py).
import os
os.environ['YW_FILM'] = 'onoda'
exec(open('scripts/yw-tts6/make_vo6.py').read())
