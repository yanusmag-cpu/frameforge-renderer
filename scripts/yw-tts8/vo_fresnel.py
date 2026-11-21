# Narration job for the fresnel short (see make_vo8.py).
import os
os.environ['YW_FILM'] = 'fresnel'
exec(open('scripts/yw-tts8/make_vo8.py').read())
