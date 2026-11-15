"""Landscape extension: arbitrary duration, absolute 300-frame chunks, silent public masters."""
import argparse,hashlib,json,math,os,subprocess,sys,urllib.request,urllib.parse,zipfile,io,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CONFIG=ROOT/os.environ.get('FRAMEFORGE_RENDER_PROJECT','production/scofield-jane/render-project.json')
P=json.loads(CONFIG.read_text())
def run(*args):return subprocess.check_output(list(args))
def ranges():return [{'index':i,'start':i*300,'end':min(P['frames'],(i+1)*300)-1,'frames':min(300,P['frames']-i*300)} for i in range(math.ceil(P['frames']/300))]
def fingerprint():
 h=hashlib.sha256(json.dumps({k:P[k] for k in ['composition','width','height','fps','frames']},sort_keys=True).encode())
 for path in sorted([f for d in P['sourceDirectories']+P['assetDirectories'] for f in (ROOT/d).rglob('*') if f.is_file()]+[ROOT/'package-lock.json']):h.update(str(path.relative_to(ROOT)).encode()+b'\0'+path.read_bytes())
 return h.hexdigest()[:24]
def hashes(path):return [s.rsplit(',',1)[-1].strip() for s in run('ffmpeg','-v','error','-xerror','-i',str(path),'-map','0:v:0','-f','framemd5','-').decode().splitlines() if s and not s.startswith('#')]
def verify(path,frames):
 d=json.loads(run('ffprobe','-v','error','-show_streams','-of','json',str(path)));v=d['streams'][0]
 if len(d['streams'])!=1 or (v['codec_name'],v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))!=('h264',P['width'],P['height'],f"{P['fps']}/1",frames):raise ValueError('Wrong silent visual-master format')
 if abs(float(v['duration'])-frames/P['fps'])>.001:raise ValueError('Incorrect duration')
 ts=json.loads(run('ffprobe','-v','error','-select_streams','v','-show_frames','-show_entries','frame=best_effort_timestamp_time,key_frame','-of','json',str(path)))['frames']
 if len(ts)!=frames or ts[0]['key_frame']!=1 or any(abs(float(s['best_effort_timestamp_time'])-i/P['fps'])>.0001 for i,s in enumerate(ts)):raise ValueError('Invalid timestamps')
 decoded=hashes(path)
 if len(decoded)!=frames:raise ValueError('Decode incomplete')
 scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(path),'-an','-vf','blackdetect=d=0.02:pix_th=0.015:pic_th=0.995','-f','null','-'],capture_output=True,text=True,check=True)
 if 'black_start:' in scan.stderr:raise ValueError('Unexpected black frame detected')
 return decoded
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,url):
  if urllib.parse.urlparse(url).scheme!='https':raise ValueError('Insecure redirect')
  new=super().redirect_request(req,fp,code,msg,headers,url)
  if new and urllib.parse.urlparse(req.full_url).netloc!=urllib.parse.urlparse(url).netloc:new.remove_header('Authorization')
  return new
def api(url,binary=False):
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
 with urllib.request.build_opener(Redirect).open(req,timeout=120) as r:data=r.read()
 return data if binary else json.loads(data)
def record(folder,index,key,create=False):
 spec=ranges()[index];path=folder/'chunk.mp4';m={'range':spec,'key':key,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'frames':verify(path,spec['frames'])}
 if create:(folder/'manifest.json').write_text(json.dumps(m)+'\n')
 elif json.loads((folder/'manifest.json').read_text())!=m:raise ValueError('Manifest mismatch')
 return m
def reuse(folder,index,key):
 name=f"{P['artifactPrefix']}-{key}-{index}";url=f"https://api.github.com/repos/{os.environ['GITHUB_REPOSITORY']}/actions/artifacts?"+urllib.parse.urlencode({'name':name,'per_page':100})
 for a in api(url)['artifacts']:
  if a['expired'] or a['name']!=name:continue
  try:
   data=api(a['archive_download_url'],True)
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    for f in ['chunk.mp4','manifest.json']:(folder/f).write_bytes(z.read(f))
   record(folder,index,key);return True
  except Exception:print(f'Rejected invalid cache artifact for chunk {index}')
 return False
def main():
 parser=argparse.ArgumentParser();parser.add_argument('command',choices=['plan','chunk','assemble']);parser.add_argument('--index',type=int);parser.add_argument('--folder',type=Path,default=Path('out/longform'));a=parser.parse_args();key=fingerprint()
 if a.command=='plan':
  if not P.get('finalApproved'):raise ValueError('Production QA has not approved this film; final rendering remains gated')
  result={'matrix':{'index':[s['index'] for s in ranges()]},'key':key,'prefix':P['artifactPrefix']}
  if os.environ.get('GITHUB_OUTPUT'):
   with open(os.environ['GITHUB_OUTPUT'],'a') as f:
    for k,v in result.items():f.write(f'{k}={json.dumps(v) if isinstance(v,dict) else v}\n')
  print(json.dumps(result));return
 a.folder.mkdir(parents=True,exist_ok=True)
 if a.command=='chunk':
  spec=ranges()[a.index]
  if reuse(a.folder,a.index,key):print('Verified unchanged chunk reused');return
  command=['npx','remotion','render','src/index.ts',P['composition'],str(a.folder/'chunk.mp4'),f"--frames={spec['start']}-{spec['end']}",'--muted','--codec=h264','--crf=18','--x264-preset=fast','--pixel-format=yuv420p','--gl=swangle','--concurrency=1']
  started=time.monotonic()
  for attempt in range(2):
   try:
    subprocess.run(command,check=True,timeout=max(1,9000-(time.monotonic()-started)));break
   except subprocess.CalledProcessError:
    if attempt or time.monotonic()-started>1200:raise
    print('Retrying this failed chunk once within its original time budget',flush=True)
    (a.folder/'chunk.mp4').unlink(missing_ok=True);time.sleep(5)

  record(a.folder,a.index,key,True);return
 records={}
 for manifest in a.folder.rglob('manifest.json'):
  m=json.loads(manifest.read_text());i=m['range']['index']
  if i in records:raise ValueError('Duplicate chunk')
  records[i]=(manifest.parent,record(manifest.parent,i,key))
 if sorted(records)!=list(range(len(ranges()))):raise ValueError('Missing chunks')
 concat=a.folder/'concat.txt';paths=[str((records[i][0]/'chunk.mp4').resolve()) for i in sorted(records)]
 if any("'" in s or '\n' in s for s in paths):raise ValueError('Invalid path')
 concat.write_text(''.join("file '"+s+"'\n" for s in paths));final=a.folder/'Scofield-Jane-Silent-Master.mp4'
 subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-c:v','copy','-an','-movflags','+faststart',str(final)],check=True)
 expected=[h for i in sorted(records) for h in records[i][1]['frames']]
 if verify(final,P['frames'])!=expected:raise ValueError('Missing, duplicated or reordered decoded frames')
 (a.folder/'assembly.json').write_text(json.dumps({'stage':'silent visual master; private narration not included','frames':P['frames'],'width':P['width'],'height':P['height'],'fps':P['fps'],'seconds':P['frames']/P['fps'],'allDecodedFramesIdentical':True,'key':key},indent=2)+'\n')
if __name__=='__main__':
 try:main()
 except Exception as e:raise SystemExit(f'Long-form pipeline stopped: {type(e).__name__}. Inspect the failed step; no credential URLs logged.')
