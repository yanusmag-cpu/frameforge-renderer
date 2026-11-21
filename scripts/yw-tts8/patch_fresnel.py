import os
os.environ['YW_FILM'] = 'fresnel'; os.environ['YW_ONLY'] = '1'
exec(open('scripts/yw-tts8/patch_vo8.py').read())
