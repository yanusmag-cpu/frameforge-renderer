# Narration job for one film (see make_vo.py).
import os
os.environ['YW_FILM'] = 'sinkhole'
exec(open('scripts/yw-tts4/make_vo.py').read())
