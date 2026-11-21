# Narration job for the antikythera short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'antikythera'
exec(open('scripts/yw-tts8/make_vo8.py').read())
