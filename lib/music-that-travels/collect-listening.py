"""Resume a rate-limited, collection-wide Discogs linked-video snapshot."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime,json,threading,time,urllib.request,urllib.error,os
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'source'
entries=json.loads((SOURCE/'collection.json').read_text())['entries']
entries=list({n['id']:n for n in entries}.values())
path=SOURCE/'listening-catalog.json'
rows=json.loads(path.read_text()) if path.exists() else {}
master_cache={}; request_lock=threading.Lock(); next_request=0.; write_lock=threading.Lock(); completed=0

def save():
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def fetch(url):
 global next_request
 for attempt in range(3):
  with request_lock:
   now=time.monotonic(); start=max(now,next_request);next_request=start+2.55
  time.sleep(max(0,start-time.monotonic()))
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'MusicThatTravelsPrototype/0.6 (collection research)','Accept':'application/json'})
   with urllib.request.urlopen(req,timeout=25) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   if e.code==404:return {'videos':[],'missing':True}
   if e.code==429:
    with request_lock:next_request=max(next_request,time.monotonic()+65)
   elif e.code<500:raise
   if attempt==2:raise
  except Exception:
   if attempt==2:raise
   time.sleep(3)
def videos(d):
 return [{k:v[k] for k in ('uri','title','embed') if k in v} for v in d.get('videos',[]) if v.get('embed') is not False and 'youtube' in v.get('uri','').lower() or v.get('embed') is not False and 'youtu.be/' in v.get('uri','').lower()]
def collect(n):
 global completed
 key=str(n['id'])
 try:
  d=fetch('https://api.discogs.com/releases/'+key)
  result={'videos':videos(d),'match':'edition','source':'https://www.discogs.com/release/'+key,'checked_at':stamp()}
  if not result['videos'] and n.get('master_id'):
   mid=n['master_id']
   # This pool has few empty editions from the same master; cache successful reads.
   m=master_cache.get(mid)
   if m is None:m=fetch('https://api.discogs.com/masters/'+str(mid));master_cache[mid]=m
   result.update(videos=videos(m),match='release-family',source='https://www.discogs.com/master/'+str(mid))
  result['status']='linked' if result['videos'] else 'no-linked-video'
 except Exception as e:result={'videos':[],'status':'fetch-error','error':str(e)[:200],'checked_at':stamp()}
 with write_lock:
  rows[key]=result;completed+=1;save()
  if completed%10==0:print(json.dumps({'checked':len(rows),'total':len(entries),'linked':sum(bool(r.get('videos')) for r in rows.values()),'errors':sum(r.get('status')=='fetch-error' for r in rows.values())}),flush=True)

if __name__=='__main__':
 save();pending=[n for n in entries if str(n['id']) not in rows or rows[str(n['id'])].get('status')=='fetch-error']
 print('Checking',len(pending),'remaining editions at no more than 25 requests/minute.',flush=True)
 with ThreadPoolExecutor(max_workers=8) as pool:
  for future in as_completed([pool.submit(collect,n) for n in pending]):future.result()
 print(json.dumps({'checked':len(rows),'total':len(entries),'linked':sum(bool(r.get('videos')) for r in rows.values()),'errors':sum(r.get('status')=='fetch-error' for r in rows.values()),'complete':True}),flush=True)
