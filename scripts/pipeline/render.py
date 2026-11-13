"""Render one absolute-time chunk with bounded resources and live diagnostics."""
from pathlib import Path
import argparse,json,subprocess,os,time,signal,shutil,re
from pipeline import spec,CONTRACT

def memory():
 m={x.split(':')[0]:int(x.split()[1])*1024 for x in Path('/proc/meminfo').read_text().splitlines() if ':' in x}
 result={'totalBytes':m['MemTotal'],'availableBytes':m['MemAvailable']}
 for field,file in [('cgroupUsedBytes','memory.current'),('cgroupLimitBytes','memory.max')]:
  p=Path('/sys/fs/cgroup')/file
  if p.is_file():
   try:result[field]=int(p.read_text())
   except ValueError:pass
 return result

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--index',type=int,required=True);p.add_argument('--folder',type=Path,required=True);a=p.parse_args();s=spec(a.index);a.folder.mkdir(parents=True,exist_ok=True)
 command=['/usr/bin/time','-v','-o',str(a.folder/'process-time.txt'),'nice','-n','5','npx','remotion','render','src/index.ts',CONTRACT['composition'],str(a.folder/'chunk.mp4'),f'--frames={s["startFrame"]}-{s["endFrame"]}','--muted','--codec=h264','--crf=18','--x264-preset=fast','--pixel-format=yuv420p','--gl=swangle','--concurrency=1']
 start=time.monotonic();last_notice=-60;last_cpu=None;pressure=0
 with (a.folder/'render.log').open('w') as log,(a.folder/'resources.jsonl').open('w') as metrics:
  proc=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  try:
   while proc.poll() is None:
    elapsed=time.monotonic()-start;m=memory();disk=shutil.disk_usage('/');cpu=list(map(int,Path('/proc/stat').read_text().splitlines()[0].split()[1:]));cpu_total=sum(cpu);cpu_idle=cpu[3]+cpu[4]
    used=None if last_cpu is None else 100*(1-(cpu_idle-last_cpu[1])/max(1,cpu_total-last_cpu[0]));last_cpu=(cpu_total,cpu_idle)
    progress=re.findall(r'Rendered\s+(\d+)/300',re.sub(r'\x1b\[[0-9;]*[A-Za-z]','',(a.folder/'render.log').read_text(errors='replace')[-12000:]));row={'seconds':round(elapsed,2),'cpuPercent':used,'load':os.getloadavg(),'memory':m,'diskFreeBytes':disk.free,'renderedFrames':int(progress[-1]) if progress else None};metrics.write(json.dumps(row)+'\n');metrics.flush()
    if elapsed-last_notice>=60:
     print('::notice title=Chunk resource monitor::'+json.dumps({'chunk':a.index,**row}),flush=True);last_notice=elapsed
    available=m['availableBytes']
    if 'cgroupLimitBytes' in m:available=min(available,m['cgroupLimitBytes']-m.get('cgroupUsedBytes',0))
    pressure=pressure+1 if available<768*1024**2 or disk.free<1024**3 else 0
    if pressure>=3 or elapsed>150*60:raise RuntimeError('Chunk stopped before runner exhaustion: sustained low RAM/disk or 150-minute render budget; diagnostics retained')
    time.sleep(15)
   if proc.returncode:
    tail=(a.folder/'render.log').read_text(errors='replace')[-4000:].replace('%','%25').replace('\r','%0D').replace('\n','%0A')
    print('::error title=Chunk render failure::'+tail,flush=True)
    raise RuntimeError(f'Render exited {proc.returncode}; see render.log and resources.jsonl')
  finally:
   if proc.poll() is None:
    os.killpg(proc.pid,signal.SIGTERM)
    try:proc.wait(timeout=15)
    except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
 print('::notice title=Chunk render finished::'+json.dumps({'chunk':a.index,'seconds':time.monotonic()-start,'frames':300}))
if __name__=='__main__':main()
