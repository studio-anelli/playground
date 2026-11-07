from pathlib import Path
import json,re,hashlib
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
geo_data={'entries':geo_entries,'release_details':{k:{'country':v.get('country')} for k,v in data['release_details'].items()},'music_locations':json.loads((root/'source/music-locations-enriched.json').read_text()),'origins':json.loads((root/'source/origin-collection.json').read_text()),'countries':json.loads((root/'source/countries.json').read_text()),'thumbnail_atlas':json.loads((root/'source/thumbnail-atlas.json').read_text())['records']}
geo_json=json.dumps(geo_data,ensure_ascii=False,separators=(',',':'))
geo_version=hashlib.sha256(geo_json.encode()).hexdigest()[:16]
geo_html=(root/'source/geography.html').read_text().replace('__GEOGRAPHY_VERSION__',geo_version)
worker='const COUNTRIES='+json.dumps(json.loads((root/'source/countries.json').read_text()))+';\nconst ORIGIN_PILOT='+json.dumps(json.loads((root/'source/origin-collection.json').read_text()),ensure_ascii=False)+';\nconst COVERAGE='+json.dumps((root/'source/coverage.html').read_text())+';\nconst ARTWORK='+json.dumps(json.loads((root/'source/artwork-analysis.json').read_text()),ensure_ascii=False)+';\nconst GEOGRAPHY='+json.dumps(geo_html)+';\nconst HUB='+json.dumps((root/'source/experiments.html').read_text())+';\nconst AUDIT='+json.dumps(json.loads((root/'source/dataset-audit.json').read_text()),ensure_ascii=False)+';\nconst HTML='+json.dumps(html)+';\nconst BOOTSTRAP='+json.dumps(data,ensure_ascii=False)+';\nconst LAND='+json.dumps(land)+';\nconst MUSIC_LOCATIONS='+json.dumps(json.loads((root/'source/music-locations-enriched.json').read_text()))+';\nconst TEST_SET='+json.dumps(json.loads((root/'source/color-experiment.json').read_text()),ensure_ascii=False)+';\n'+(root/'source/worker-runtime.js').read_text()
worker='const GEOGRAPHY_DATA_JSON='+json.dumps(geo_json)+';\nconst GEOGRAPHY_VERSION='+json.dumps(geo_version)+';\n'+worker
(root/'worker.js').write_text(worker)
print('Geography payload',len(geo_json.encode()),'bytes; snapshot',geo_version)
print('Prepared worker',len(worker),'bytes; entries',len(data['entries']))
