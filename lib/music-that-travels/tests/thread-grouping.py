import json,runpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
group=runpy.run_path(str(root/'group-threads.py'))['group_threads']
countries=json.loads((root/'source/countries.json').read_text())
raw=json.loads((root/'source/origin-collection.json').read_text())['records']
def claim(id,label,lon,lat,precision='city',kind='artist',subject='Example',**extra):
 return dict(id=id,label=label,lon=lon,lat=lat,precision=precision,kind=kind,subject=subject,relation='Formed in',source='https://example.test/'+id,**extra)
chicago=claim('chicago','Chicago',-87.6298,41.8781)
ny=claim('new-york','New York',-74.006,40.7128)
us=claim('us','United States',-98,39,'country')
assert len(group([chicago,ny,us],countries))==2,'different cities/states must remain separate'
assert [t['label'] for t in group([chicago,ny,us],countries)]==['Chicago','New York']
assert len(group([chicago,claim('chicago-2','Chicago',-87.63,41.878),us],countries))==1
assert len(group([chicago,claim('france','France',2,47,'country')],countries))==2
assert len(group([chicago,claim('repertoire','United States',-98,39,'country','repertoire')],countries))==2
assert len(group([chicago,claim('collaborator','United States',-98,39,'country',subject='Someone else')],countries))==2
assert len(group([chicago,claim('illinois','Illinois',-89,40,'region'),claim('new-york-state','New York State',-75,43,'region')],countries))==3,'never guess state containment from country membership'
assert len(group([claim('england','England',-1.5,52.3,'country'),claim('scotland','Scotland',-4,57,'country'),claim('uk','United Kingdom',-2,54,'country')],countries))==2
count=0
for row in raw.values():
 threads=row['threads'];display=group(threads,countries,row.get('primary_thread_id'));count+=len(display)
 retained=[t['id']for g in display for t in [g,*g['supporting_claims']]]
 assert sorted(retained)==sorted(t['id']for t in threads),'every claim remains available exactly once'
 for g in display:assert all(t['kind']==g['kind'] for t in g['supporting_claims'])
 assert any(t['id']==row['primary_thread_id'] or any(c['id']==row['primary_thread_id']for c in t['supporting_claims'])for t in display)
pink=group(raw['8872804']['threads'],countries);assert len(pink)==2
on=group(raw['11758168']['threads'],countries);assert [t['label']for t in on]==['Amsterdam','Turkey','Turkey']
print(f'{sum(len(r["threads"])for r in raw.values())} original claims retained in {count} display connections; distinct places, collaborators and cultural layers preserved.')
