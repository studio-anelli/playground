from pathlib import Path
import urllib.request,json,concurrent.futures,io,hashlib
from PIL import Image
root=Path(__file__).resolve().parents[2];source=root/'lib/music-that-travels/source';out=root/'public/music-that-travels';out.mkdir(parents=True,exist_ok=True);cache=Path('/tmp/mtt-thumbnail-cache');cache.mkdir(exist_ok=True)
rows=list({str(n['id']):n for n in json.loads((source/'collection.json').read_text())['entries']}.values())
def obtain(n):
 file=cache/(str(n['id'])+'.jpg')
 try:
  if file.exists(): raw=file.read_bytes()
  else:
   req=urllib.request.Request(n['thumb'],headers={'User-Agent':'MusicThatTravelsPrototype/0.5','Referer':'https://www.discogs.com/'});raw=urllib.request.urlopen(req,timeout=20).read()
  im=Image.open(io.BytesIO(raw));im.load();file.write_bytes(raw)
  return n['id'],im.convert('RGB').resize((72,72),Image.Resampling.LANCZOS)
 except Exception:return n['id'],None
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool: results=list(pool.map(obtain,rows))
manifest={};pages=[]
for start in range(0,len(results),100):
 batch=results[start:start+100];sheet=Image.new('RGB',(720,720),'#28221b');ids=[]
 for i,(rid,im) in enumerate(batch):
  if im is None:continue
  x=i%10*72;y=i//10*72;sheet.paste(im,(x,y));ids.append((rid,x,y))
 b=io.BytesIO();sheet.save(b,format='WEBP',quality=82,method=6);raw=b.getvalue();name='covers-'+hashlib.sha256(raw).hexdigest()[:12]+'.webp';(out/name).write_bytes(raw);pages.append({'url':'/music-that-travels/'+name,'bytes':len(raw)})
 for rid,x,y in ids:manifest[str(rid)]={'url':'/music-that-travels/'+name,'x':x,'y':y,'tile':72,'width':720,'height':720}
(source/'thumbnail-atlas.json').write_text(json.dumps({'records':manifest,'pages':pages},separators=(',',':'))+'\n')
print(json.dumps({'packed':len(manifest),'missing':len(rows)-len(manifest),'requests':len(pages),'bytes':sum(p['bytes'] for p in pages)}))
