import importlib.util,io,json,hashlib,pathlib,tempfile,unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('retention',pathlib.Path(__file__).resolve().parents[1]/'scripts/retain-pages-assets.py')
retention=importlib.util.module_from_spec(spec);spec.loader.exec_module(retention)
class AssetRetentionTest(unittest.TestCase):
 def test_republishing_same_ref_keeps_two_distinct_older_generations(self):
  previous={'generations':[{'ref':'current','assets':[]},{'ref':'old1','assets':[]},{'ref':'old2','assets':[]}]}
  with tempfile.TemporaryDirectory() as directory:
   output=pathlib.Path(directory);(output/'assets').mkdir()
   refs=[]
   def checked(generation):refs.append(generation['ref']);return []
   with patch('sys.argv',['retain',str(output),'current']),patch.object(retention.urllib.request,'urlopen',return_value=io.BytesIO(json.dumps(previous).encode())),patch.object(retention,'valid_assets',side_effect=checked):retention.main()
   self.assertEqual(refs,['old1','old2'])
 def test_previous_lazy_chunk_is_kept_and_untrusted_paths_are_rejected(self):
  old=b'export const previousScene = 1;';digest=hashlib.sha256(old).hexdigest()
  previous={'generations':[{'ref':'previous','assets':[{'path':'assets/scene-old.js','sha256':digest},{'path':'../../outside.js','sha256':digest},{'path':'https://other.invalid/chunk.js','sha256':digest}]}]}
  requested=[]
  def fetch(url,timeout):
   requested.append(url);return io.BytesIO(json.dumps(previous).encode() if url.endswith('build-info.json') else old)
  with tempfile.TemporaryDirectory() as directory:
   output=pathlib.Path(directory);(output/'assets').mkdir();(output/'assets/scene-new.js').write_text('export const currentScene=2;')
   with patch('sys.argv',['retain',str(output),'current']),patch.object(retention.urllib.request,'urlopen',side_effect=fetch):retention.main()
   self.assertEqual((output/'assets/scene-old.js').read_bytes(),old)
   manifest=json.loads((output/'build-info.json').read_text());self.assertEqual(len(manifest['generations']),2);self.assertEqual(len(manifest['generations'][1]['assets']),1)
   self.assertEqual(requested,[retention.ORIGIN+'build-info.json',retention.ORIGIN+'assets/scene-old.js'])
if __name__=='__main__':unittest.main()
