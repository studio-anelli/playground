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
origins=json.loads((root/'source/origin-collection.json').read_text())
# Group redundant display places while retaining all original source claims.
group_threads=runpy.run_path(str(root/'group-threads.py'))['group_threads']
country_data=json.loads((root/'source/countries.json').read_text())
display_threads={key:group_threads(row['threads'],country_data,row.get('primary_thread_id')) for key,row in origins['records'].items()}
# The map needs display claims, not the research ledger or duplicated legacy rows.
thread_fields=['id','kind','relation','subject','label','lon','lat','precision','source','period','note','venue','location_source','supporting_claims']
def geography_record(key,value):
 threads=display_threads[key]
 primary=next((t for t in threads if t['id']==value.get('primary_thread_id') or any(c['id']==value.get('primary_thread_id') for c in t.get('supporting_claims',[]))),threads[0])
 return {'lon':primary['lon'],'lat':primary['lat'],'city':primary['label'],'precision':primary['precision'],
  'locations':[{k:l[k] for k in ['lon','lat','city','precision'] if k in l} for l in value.get('locations',[])],
  'threads':[{k:t[k] for k in thread_fields if k in t} for t in threads],
  'unlocated_artists':value.get('unlocated_artists',[])}
geo_origins={'schema_version':origins['schema_version'],'records':{key:geography_record(key,value) for key,value in origins['records'].items()}}
geo_data={'entries':geo_entries,'release_details':{k:{'country':v.get('country')} for k,v in data['release_details'].items()},'origins':geo_origins,'countries':json.loads((root/'source/countries.json').read_text()),'thumbnail_atlas':json.loads((root/'source/thumbnail-atlas.json').read_text())['records']}
geo_json=json.dumps(geo_data,ensure_ascii=False,separators=(',',':'))
geo_version=hashlib.sha256(geo_json.encode()).hexdigest()[:16]
geo_html=(root/'source/geography.html').read_text().replace('__GEOGRAPHY_VERSION__',geo_version)
worker='const COUNTRIES='+json.dumps(json.loads((root/'source/countries.json').read_text()))+';\nconst ORIGIN_PILOT='+json.dumps(json.loads((root/'source/origin-collection.json').read_text()),ensure_ascii=False)+';\nconst COVERAGE='+json.dumps((root/'source/coverage.html').read_text())+';\nconst ARTWORK='+json.dumps(json.loads((root/'source/artwork-analysis.json').read_text()),ensure_ascii=False)+';\nconst GEOGRAPHY='+json.dumps(geo_html)+';\nconst HUB='+json.dumps((root/'source/experiments.html').read_text())+';\nconst AUDIT='+json.dumps(json.loads((root/'source/dataset-audit.json').read_text()),ensure_ascii=False)+';\nconst HTML='+json.dumps(html)+';\nconst BOOTSTRAP='+json.dumps(data,ensure_ascii=False)+';\nconst LAND='+json.dumps(land)+';\nconst MUSIC_LOCATIONS='+json.dumps(json.loads((root/'source/music-locations-enriched.json').read_text()))+';\nconst TEST_SET='+json.dumps(json.loads((root/'source/color-experiment.json').read_text()),ensure_ascii=False)+';\n'+(root/'source/worker-runtime.js').read_text()
worker='const LISTENING_CATALOG='+json.dumps(json.loads((root/'source/listening-catalog.json').read_text()),ensure_ascii=False)+';\n'+worker
worker='const GEOGRAPHY_DATA_JSON='+json.dumps(geo_json)+';\nconst GEOGRAPHY_VERSION='+json.dumps(geo_version)+';\n'+worker
(root/'worker.js').write_text(worker)
print('Geography payload',len(geo_json.encode()),'bytes; snapshot',geo_version)
print('Prepared worker',len(worker),'bytes; entries',len(data['entries']))
