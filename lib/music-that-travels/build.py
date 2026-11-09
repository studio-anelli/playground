from pathlib import Path
import json,re,hashlib,runpy
root=Path(__file__).resolve().parent
html=(root/'source/app.html').read_text();data=json.loads((root/'source/collection.json').read_text());enrich=root/'source/enrichment.json'
if enrich.exists():
 e=json.loads(enrich.read_text());data['release_details']=e['releases'];data['master_details']=e['masters']
# Translate public Natural Earth outline to the full-world projection used by the new collection view.
land=json.loads((root/'source/land-paths.json').read_text())
# Existing paths use lon -130..30, lat 15..65. Recover world coordinates before reprojecting.
def project(match):
 x,y=map(float,match.groups());lon=(x-85)/930*160-130;lat=(650-y)/500*50+15
 return f'{80+(lon+180)/360*1040:.1f},{590-(lat+60)/150*460:.1f}'
land=re.sub(r'(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)',project,land)
# Geography only needs display fields and location evidence, not the full audit/credits.
geo_entries=[{k:n[k] for k in ['instance_id','id','title','year','artists','labels']} for n in data['entries']]
# Regenerate reviewed origin threads from their authoritative source before packaging.
# Otherwise a new cultural-threads claim appears in GitHub but never reaches the map.
runpy.run_path(str(root/'prepare-collection-research.py'))
runpy.run_path(str(root/'prepare-origins.py'))
origins=json.loads((root/'source/origin-collection.json').read_text())
# Group redundant display places while retaining all original source claims.
group_threads=runpy.run_path(str(root/'group-threads.py'))['group_threads']
country_data=json.loads((root/'source/countries.json').read_text())
display_threads={key:group_threads(row['threads'],country_data,row.get('primary_thread_id')) for key,row in origins['records'].items()}
# The map needs display claims, not the research ledger or duplicated legacy rows.
thread_fields=['id','kind','relation','subject','label','lon','lat','precision','source','identity_source','location_source','reference_url','period','note','venue','coverage','track_positions','location_source','supporting_claims']
def display_claim(thread):
 claim={k:thread[k] for k in thread_fields if k in thread and thread[k] not in ('',None,[])}
 if claim.get('location_source')==claim.get('source'):claim.pop('location_source')
 if 'supporting_claims' in claim:claim['supporting_claims']=[display_claim(c) for c in claim['supporting_claims']]
 return claim
def geography_record(key,value):
 threads=display_threads[key]
 primary=next((t for t in threads if t['id']==value.get('primary_thread_id') or any(c['id']==value.get('primary_thread_id') for c in t.get('supporting_claims',[]))),threads[0])
 return {'lon':primary['lon'],'lat':primary['lat'],'city':primary['label'],'precision':primary['precision'],
  'locations':[{k:l[k] for k in ['lon','lat','city','precision'] if k in l} for l in value.get('locations',[])],
  'threads':[display_claim(t) for t in threads],
  'unlocated_artists':value.get('unlocated_artists',[])}
geo_origins={'schema_version':origins['schema_version'],'records':{key:geography_record(key,value) for key,value in origins['records'].items()}}
geo_data={'entries':geo_entries,'release_details':{k:{'country':v.get('country')} for k,v in data['release_details'].items()},'origins':geo_origins,'countries':json.loads((root/'source/countries.json').read_text()),'thumbnail_atlas':json.loads((root/'source/thumbnail-atlas.json').read_text())['records']}
# Identical artist evidence is shared across editions on the wire, then hydrated once.
# Distinct supporting evidence/scope produces a distinct key; nothing is discarded.
from collections import Counter
encode=lambda value:json.dumps(value,ensure_ascii=False,separators=(',',':'))
frequency=Counter(encode(t) for row in geo_origins['records'].values() for t in row['threads'])
shared={value:'t'+str(i) for i,(value,count) in enumerate(sorted(frequency.items())) if count>1}
geo_data['shared_threads']={key:json.loads(value) for value,key in shared.items()}
for row in geo_origins['records'].values():
 row['threads']=[shared.get(encode(t),t) for t in row['threads']]
ledger=json.loads((root/'source/research-ledger.json').read_text())
def context_source(finding):
 sources=[ledger['sources'][sid] for sid in finding['source_ids'] if ledger['sources'][sid].get('retrieval')=='read']
 return next((s['url'] for s in sources if s['type']!='discogs'),sources[0]['url'])
geo_data['research_contexts']={f['release_id']:{'summary':f['summary'],'scope':f['scope'],'source':context_source(f)} for f in ledger.get('findings',[]) if f.get('decision')=='accepted' and f.get('musical_value')!='version_scope'}
geo_data['collection_connections']=[{'release_ids':[e['release_id'] for e in c['endpoints']],'subject':c['subject'].split(' / Discogs')[0],'summary':c['summary'],'source':ledger['sources'][c['source_ids'][0]]['url']} for c in ledger.get('connections',[]) if c.get('decision')=='accepted' and all(any(str(n['id'])==str(e['release_id']) for n in data['entries']) for e in c['endpoints'])]
geo_json=json.dumps(geo_data,ensure_ascii=False,separators=(',',':'))
geo_version=hashlib.sha256(geo_json.encode()).hexdigest()[:16]
geo_html=(root/'source/geography.html').read_text().replace('__GEOGRAPHY_VERSION__',geo_version)
worker='const COUNTRIES='+json.dumps(json.loads((root/'source/countries.json').read_text()))+';\nconst ORIGIN_PILOT='+json.dumps(json.loads((root/'source/origin-collection.json').read_text()),ensure_ascii=False)+';\nconst COVERAGE='+json.dumps((root/'source/coverage.html').read_text())+';\nconst ARTWORK='+json.dumps(json.loads((root/'source/artwork-analysis.json').read_text()),ensure_ascii=False)+';\nconst GEOGRAPHY='+json.dumps(geo_html)+';\nconst HUB='+json.dumps((root/'source/experiments.html').read_text())+';\nconst AUDIT='+json.dumps(json.loads((root/'source/dataset-audit.json').read_text()),ensure_ascii=False)+';\nconst HTML='+json.dumps(html)+';\nconst BOOTSTRAP='+json.dumps(data,ensure_ascii=False)+';\nconst LAND='+json.dumps(land)+';\nconst MUSIC_LOCATIONS='+json.dumps(json.loads((root/'source/music-locations-enriched.json').read_text()))+';\nconst TEST_SET='+json.dumps(json.loads((root/'source/color-experiment.json').read_text()),ensure_ascii=False)+';\n'+(root/'source/worker-runtime.js').read_text()
worker='const LISTENING_CATALOG='+json.dumps(json.loads((root/'source/listening-catalog.json').read_text()),ensure_ascii=False)+';\n'+worker
worker='const GEOGRAPHY_DATA_JSON='+json.dumps(geo_json)+';\nconst GEOGRAPHY_VERSION='+json.dumps(geo_version)+';\n'+worker
(root/'worker.js').write_text(worker)
print('Geography payload',len(geo_json.encode()),'bytes; snapshot',geo_version)
print('Prepared worker',len(worker),'bytes; entries',len(data['entries']))
