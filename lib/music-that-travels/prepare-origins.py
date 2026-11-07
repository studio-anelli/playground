"""Apply reviewed artist associations to every matching saved edition, without inference."""
from pathlib import Path
import json
root=Path(__file__).resolve().parent
read=lambda name:json.loads((root/'source'/name).read_text())
collection=read('collection.json'); reviewed=read('artist-origins.json'); pilot=read('origin-pilot.json')
records=dict(pilot['records'])
for n in collection['entries']:
 key=str(n['id'])
 if key in records: continue
 locations=[]; missing=[]
 compilation=reviewed['compilations'].get(key)
 if compilation:
  locations=[dict(l,subject='Compilation') for l in compilation['locations']]
 else:
  for artist in n['artists']:
   known=reviewed['artists'].get(str(artist['id']))
   if known: locations.extend(dict(l,subject=artist['name']) for l in known['locations'])
   else: missing.append(artist['name'])
 if not locations: continue
 for l in locations: l.update(city=l['label'],studio=l['relation'])
 records[key]=dict(locations[0],locations=locations,coverage='Reviewed musical associations',unlocated_artists=missing)
ids=sorted(int(k) for k in records)
out={'schema_version':2,'criteria':reviewed['criteria'],'ids':ids,'distinct_editions':len(ids),'copy_count':sum(n['id'] in ids for n in collection['entries']),'collection_entries':len(collection['entries']),'records':records}
(root/'source/origin-collection.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Reviewed musical associations:',out['distinct_editions'],'editions /',out['copy_count'],'entries')

# Typed relationships are shared by artist identity or scoped to one release.
# Keep the original pilot as a regression fixture, but emit one overview anchor.
import hashlib
claims=read('cultural-threads.json'); recordings=read('music-locations-enriched.json')
by_release={str(n['id']):n for n in collection['entries']}
def thread(t):
 t=dict(t);t.setdefault('kind','artist');t.setdefault('subject','');t.setdefault('precision','city');t['label']=t.get('label') or t['city'];t['city']=t['label'];t['studio']=t['relation']
 identity='|'.join(str(t.get(k,'')) for k in ['kind','relation','subject','label','source'])
 t['id']='thread-'+hashlib.sha1(identity.encode()).hexdigest()[:12]
 return t
for key,n in by_release.items():
 current=records.get(key);threads=[]
 for l in (current or {}).get('locations',[]):
  threads.append(thread(dict(l,kind='repertoire' if l['relation']=='Compilation documents' else 'artist')))
 for artist in n['artists']:
  for t in claims['artists'].get(str(artist['id']),[]): threads.append(thread(t))
 for t in claims['releases'].get(key,[]): threads.append(thread(t))
 for l in recordings.get(key,{}).get('locations',[]):
  threads.append(thread({'kind':'recording','relation':'Recorded at','subject':n['title'],'label':l['city'],'lon':l['lon'],'lat':l['lat'],'precision':l.get('precision','city'),'source':l.get('source') or l.get('credit_source') or l.get('location_source'),'location_source':l.get('location_source'),'note':l.get('note',''),'venue':l.get('studio',''),'coverage':recordings[key].get('coverage','')}))
 threads=list({t['id']:t for t in threads}.values())
 if not threads:continue
 # Existing first association remains the overview anchor; recording-only records are typed as such.
 primary=next((t for t in threads if t['kind']=='artist'),threads[0])
 row=dict(current or primary);row.update({k:primary[k] for k in ['lon','lat','label','city','precision','relation','source','subject']});row['threads']=threads;row['primary_thread_id']=primary['id'];row.setdefault('locations',[primary]);row['coverage']='Sourced cultural threads';row['unlocated_artists']=[a['name'] for a in n['artists'] if str(a['id']) not in reviewed['artists'] and str(a['id']) not in claims['artists'] and a['name']!='Various'];records[key]=row
ids=sorted(int(k) for k in records)
out.update(schema_version=3,ids=ids,records=records,distinct_editions=len(ids),copy_count=sum(n['id'] in ids for n in collection['entries']),thread_count=sum(len(r['threads']) for r in records.values()),criteria=claims['criteria'])
(root/'source/origin-collection.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Cultural threads:',out['thread_count'],'threads /',out['distinct_editions'],'editions /',out['copy_count'],'entries')
