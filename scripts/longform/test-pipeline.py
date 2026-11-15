import unittest,importlib.util,tempfile,subprocess,sys,json,shutil
from pathlib import Path
spec=importlib.util.spec_from_file_location('longform',Path(__file__).with_name('pipeline.py'));p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class ContractTests(unittest.TestCase):
 def test_ranges(self):
  r=p.ranges();self.assertEqual(len(r),42);self.assertEqual(r[-1]['frames'],187);self.assertEqual([i for s in r for i in range(s['start'],s['end']+1)],list(range(12487)))
 def test_landscape_and_gate(self):
  self.assertEqual((p.P['width'],p.P['height'],p.P['fps']),(1920,1080,30));self.assertIsInstance(p.P['finalApproved'],bool)
 def test_no_private_audio_or_references_in_export_directories(self):
  files=[f for d in p.P['assetDirectories'] for f in (p.ROOT/d).rglob('*') if f.is_file()]
  self.assertTrue(files);self.assertTrue(all(f.suffix=='.glb' for f in files));self.assertNotIn('references',p.P['assetDirectories'])

 @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),'FFmpeg required')
 def test_real_encoded_partial_chunk_assembly_and_tamper_rejection(self):
  old=p.P.copy();argv=sys.argv[:]
  try:
   p.P.update(width=96,height=54,frames=617)
   with tempfile.TemporaryDirectory() as tmp:
    folder=Path(tmp);key=p.fingerprint()
    for r in p.ranges():
     chunk=folder/str(r['index']);chunk.mkdir()
     subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=96x54:rate=30','-vf',f"hue=h={r['index']*47}",'-frames:v',str(r['frames']),'-an','-c:v','libx264','-pix_fmt','yuv420p',str(chunk/'chunk.mp4')],check=True)
     p.record(chunk,r['index'],key,True)
    sys.argv=['pipeline.py','assemble','--folder',str(folder)];p.main()
    report=json.loads((folder/'assembly.json').read_text());self.assertEqual(report['frames'],617);self.assertTrue(report['allDecodedFramesIdentical'])
    m=folder/'1/manifest.json';d=json.loads(m.read_text());d['frames'][0]='tampered';m.write_text(json.dumps(d))
    with self.assertRaises(ValueError):p.record(m.parent,1,key)
  finally:p.P.clear();p.P.update(old);sys.argv=argv

if __name__=='__main__':unittest.main()
