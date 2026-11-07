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
