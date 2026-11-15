import unittest,importlib.util
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
if __name__=='__main__':unittest.main()
