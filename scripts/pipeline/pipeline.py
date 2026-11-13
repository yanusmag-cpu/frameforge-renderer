"""Deterministic segment contract, verified cross-run reuse and lossless assembly."""
from pathlib import Path
import argparse,hashlib,json,subprocess,os,sys,urllib.request,urllib.parse,zipfile,tempfile,time,shutil
ROOT=Path(__file__).resolve().parents[2]
DEFAULTS=json.loads((ROOT/'production/render-defaults.json').read_text())
PROJECT=json.loads((ROOT/os.environ['FRAMEFORGE_RENDER_PROJECT']).read_text()) if os.environ.get('FRAMEFORGE_RENDER_PROJECT') else {}
ARTIFACT_PREFIX=PROJECT.get('artifactPrefix','frameforge-chunk')
# Projects may set their own chunk count (e.g. 4 x 300 frames = 40 s); 60-second defaults otherwise.
CHUNKS=int(PROJECT.get('chunks',DEFAULTS['chunks']));FRAMES=CHUNKS*DEFAULTS['chunkFrames'];SECONDS=FRAMES/DEFAULTS['fps']
CONTRACT={'version':1,'composition':PROJECT['composition'],'width':DEFAULTS['width'],'height':DEFAULTS['height'],'fps':DEFAULTS['fps'],'frames':FRAMES,'chunkFrames':DEFAULTS['chunkFrames'],'chunks':CHUNKS,'codec':'h264','crf':18,'preset':'fast','gl':'swangle','audio':'muted-segments/full-soundtrack-once'}
def run(args,**kw):return subprocess.check_output(args,**kw)
def spec(index):
 if index not in range(CHUNKS):raise ValueError(f'Chunk index must be 0–{CHUNKS-1}')
 return {'index':index,'startFrame':index*300,'endFrame':index*300+299,'frames':300,'seconds':10}
def fingerprint():
 h=hashlib.sha256(json.dumps(CONTRACT,sort_keys=True).encode())
 # Films that list sourceDirectories hash only their own code plus shared entry files, so adding a new film
 # never invalidates another film's verified chunks. Projects without the field keep the original key.
 src=[ROOT.joinpath(d) for d in PROJECT['sourceDirectories']]+[ROOT/'src/index.ts',ROOT/'src/renderDefaults.ts'] if PROJECT.get('sourceDirectories') else [ROOT/'src']
 files=[*(f for d in src for f in ([d] if d.is_file() else [*d.rglob('*.ts'),*d.rglob('*.tsx')])),*[f for directory in PROJECT['assetDirectories'] for f in ROOT.joinpath(directory).rglob('*')],ROOT/'package.json',ROOT/'package-lock.json']
 for f in sorted(set(f for f in files if f.is_file())):h.update(str(f.relative_to(ROOT)).encode()+b'\0'+f.read_bytes())
 return h.hexdigest()[:24]
def probe(path):return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]))
def frame_hashes(path):
 text=run(['ffmpeg','-v','error','-xerror','-i',str(path),'-map','0:v:0','-f','framemd5','-'],text=True)
 return [x.rsplit(',',1)[-1].strip() for x in text.splitlines() if x and not x.startswith('#')]
def boundary_metrics(path,frame):
 data=run(['ffmpeg','-v','error','-i',str(path),'-vf',f'select=eq(n\\,{frame}),scale=160:284','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'])
 if not data:raise ValueError('Boundary frame could not decode')
 return {'mean':sum(data)/len(data),'maximum':max(data)}
def verify_video(path,frames,seconds):
 p=probe(path);v=[s for s in p['streams'] if s['codec_type']=='video']
 if len(v)!=1:raise ValueError('Exactly one video stream required')
 v=v[0]
 if (v['codec_name'],v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))!=('h264',1080,1920,'30/1',frames):raise ValueError('Wrong segment video format/frame count')
 if v['pix_fmt'] not in ['yuv420p','yuvj420p'] or abs(float(v['duration'])-seconds)>.001:raise ValueError('Wrong video duration/chroma')
 timestamps=json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time,key_frame','-of','json',str(path)]))['frames']
 if not timestamps or timestamps[0].get('key_frame')!=1:raise ValueError('Video segment must start with an independent keyframe')
 if len(timestamps)!=frames or any(abs(float(f['best_effort_timestamp_time'])-i/30)>.0001 for i,f in enumerate(timestamps)):raise ValueError('Missing/duplicated/non-uniform frame timestamps')
 return p

def verify_segment(folder,index,key,create=False):
 folder=Path(folder);path=folder/'chunk.mp4';manifest=folder/'manifest.json';s=spec(index);p=verify_video(path,300,10)
 if any(v['codec_type']=='audio' for v in p['streams']):raise ValueError('Segment must be silent; soundtrack added once')
 hashes=frame_hashes(path)
 if len(hashes)!=300:raise ValueError('Segment failed complete 300-frame decode')
 boundaries={'first':boundary_metrics(path,0),'last':boundary_metrics(path,299)}
 for which,m in boundaries.items():
  if index==CHUNKS-1 and which=='last':continue # intentional final fade to black
  if m['maximum']<24 or m['mean']<.75:raise ValueError(f'Blank boundary frame: chunk {index} {which}')
 record={**s,'fingerprint':key,'contract':CONTRACT,'fileSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'decodedFrameHashes':hashes,'boundaries':boundaries}
 if create:manifest.write_text(json.dumps(record,indent=2)+'\n')
 else:
  stored=json.loads(manifest.read_text())
  if any(stored.get(k)!=v for k,v in record.items() if k!='boundaries'):raise ValueError('Segment manifest/hash/contract does not match decoded video')
 return record

class ArtifactRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  if urllib.parse.urlparse(newurl).scheme!='https':raise ValueError('Refusing insecure artifact redirect')
  new=super().redirect_request(req,fp,code,msg,headers,newurl)
  if new and urllib.parse.urlparse(req.full_url).netloc!=urllib.parse.urlparse(newurl).netloc:new.remove_header('Authorization')
  return new

def api(url,binary=False):
 token=os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
 if not token:raise ValueError('GitHub Actions token missing')
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'})
 for attempt in range(3):
  try:
   with urllib.request.build_opener(ArtifactRedirect).open(req,timeout=60) as r:b=r.read()
   return b if binary else json.loads(b)
  except Exception:
   if attempt==2:raise
   time.sleep(2**attempt)

def reuse(folder,index,key,force=False):
 folder=Path(folder);folder.mkdir(parents=True,exist_ok=True);found=False
 if not force:
  repo=os.environ['GITHUB_REPOSITORY'];name=f'{ARTIFACT_PREFIX}-{key}-{index}'
  try:
   for page in range(1,11):
    data=api(f'https://api.github.com/repos/{repo}/actions/artifacts?'+urllib.parse.urlencode({'name':name,'per_page':100,'page':page}))['artifacts']
    for a in data:
     if a['name']!=name or a['expired']:continue
     try:
      with tempfile.TemporaryDirectory() as tmp:
       z=Path(tmp)/'segment.zip';z.write_bytes(api(a['archive_download_url'],binary=True))
       with zipfile.ZipFile(z) as archive:
        for f in ['chunk.mp4','manifest.json']:(folder/f).write_bytes(archive.read(f))
      verify_segment(folder,index,key);found=True
      print(f'::notice title=Verified chunk reuse::Chunk {index}, artifact {a["id"]}, source run {a["workflow_run"]["id"]}')
      break
     except Exception as e:print(f'::warning::Rejected reusable chunk {index}: {type(e).__name__}; rendering it again')
    if found or len(data)<100:break
  except Exception as e:print(f'::warning::Reuse lookup unavailable ({type(e).__name__}); this chunk will render normally')
 if not found:
  for f in ['chunk.mp4','manifest.json']:(folder/f).unlink(missing_ok=True)
 if os.environ.get('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write(f'reused={str(found).lower()}\n')
 return found

def assemble(root,key,output,final_audio=None,narrated=False):
 root,output=Path(root),Path(output);output.mkdir(parents=True,exist_ok=True)
 records={};folders={}
 for file in root.rglob('manifest.json'):
  d=json.loads(file.read_text());i=d['index']
  if i in records:raise ValueError('Duplicate segment index')
  records[i]=verify_segment(file.parent,i,key);folders[i]=file.parent
 if sorted(records)!=list(range(CHUNKS)):raise ValueError(f'All {CHUNKS} verified segments are required')
 concat=output/'segments.txt'
 # Paths originate in the runner workspace. Reject shell/concat escaping characters.
 paths=[str((folders[i]/'chunk.mp4').resolve()) for i in range(CHUNKS)]
 if any("'" in p or '\n' in p for p in paths):raise ValueError('Unsafe segment path')
 concat.write_text(''.join("file '"+p+"'\n" for p in paths))
 raw=output/'joined-video.mp4'
 subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-map','0:v:0','-c:v','copy',str(raw)],check=True)
 verify_video(raw,FRAMES,SECONDS)
 expected=[v for i in range(CHUNKS) for v in records[i]['decodedFrameHashes']]
 if frame_hashes(raw)!=expected:raise ValueError('Joined decoded frame order differs from six source segments')
 final=output/PROJECT['outputFilename']
 audio=Path(final_audio) if final_audio else ROOT/PROJECT['soundtrack']
 subprocess.run([sys.executable,str(ROOT/'scripts/pipeline/package-video.py'),str(raw),str(audio),str(final),'--fps','30','--seconds',str(SECONDS)]+(['--narration'] if narrated else []),check=True)
 subprocess.run([sys.executable,str(ROOT/'scripts/pipeline/verify-film.py'),str(final),'--mode','final-30','--seconds',str(SECONDS)],check=True)
 if frame_hashes(final)!=expected:raise ValueError('Final mux dropped or duplicated a decoded frame')
 joins=[]
 for n in [x for i in range(1,CHUNKS) for x in (i*300-1,i*300)]:
  m=boundary_metrics(final,n)
  if m['maximum']<24 or m['mean']<.75:raise ValueError(f'Black frame at final join {n}')
  joins.append({'frame':n,**m})
 report={'fingerprint':key,'chunks':CHUNKS,'decodedFramesIdenticalAndOrdered':True,'dimensions':[1080,1920],'fps':30,'frames':FRAMES,'seconds':SECONDS,'audioAddedOnce':True,'joinFrames':joins,'narrationIncluded':narrated}
 (output/'assembly.json').write_text(json.dumps(report,indent=2)+'\n')
 raw.unlink();concat.unlink()
 print('::notice title=Verified complete FrameForge movie::'+json.dumps(report))

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('command',choices=['fingerprint','reuse','verify','assemble']);p.add_argument('--index',type=int);p.add_argument('--key');p.add_argument('--folder',type=Path);p.add_argument('--output',type=Path);p.add_argument('--force',action='store_true');p.add_argument('--audio',type=Path);p.add_argument('--narrated',action='store_true');a=p.parse_args()
 if a.command=='fingerprint':print(fingerprint())
 elif a.command=='reuse':reuse(a.folder,a.index,a.key,a.force)
 elif a.command=='verify':verify_segment(a.folder,a.index,a.key,create=True)
 else:assemble(a.folder,a.key,a.output,a.audio,a.narrated)
if __name__=='__main__':
 try:main()
 except Exception as e:raise SystemExit(f'Chunk pipeline failed: {type(e).__name__}: {e}')
