"""Conservatively convert identity-linked source fields into labelled artist threads."""
from pathlib import Path
import json,re,collections
r=Path(__file__).resolve().parent;read=lambda n:json.loads((r/'source'/n).read_text())
wd=read('wikidata-collection-evidence.json');mb=read('musicbrainz-area-evidence.json');places=read('places.json');grouped=collections.defaultdict(list)
for x in wd['rows']:grouped[x['discogs']].append(x)
claims={};ambiguous=[];skipped=[]
country_classes={'Q6256','Q3624078','Q3024240','Q15634554'};city_classes={'Q515','Q1549591','Q1637706','Q3957','Q200250'}
for aid,rows in grouped.items():
 identities={x['artist'] for x in rows}
 if len(identities)!=1:ambiguous.append(aid);continue
 by_fact=collections.defaultdict(list)
 for x in rows:
  if 'place'in x and not(x['property'].endswith('/P495') and x['human']=='true'):by_fact[(x['property'],x['place'])].append(x)
 for (prop,place),variants in by_fact.items():
  x=variants[0];classes={v.get('class','').split('/')[-1] for v in variants};precision='country' if classes&country_classes or prop.endswith('/P495') else 'city' if classes&city_classes else 'region'
  point=re.fullmatch(r'Point\(([-\d.]+) ([-\d.]+)\)',x['coordinate'])
  if not point:skipped.append({'artist':aid,'reason':'coordinate_format'});continue
  kind=prop.split('/')[-1];relation={'P740':'Group formed in','P937':'Artist worked in','P495':'Project originates from'}[kind]
  dates=[x.get('start','')[:4],x.get('end','')[:4]];period=('–'.join(dates) if all(dates) else 'From '+dates[0] if dates[0] else 'Until '+dates[1] if dates[1] else None)
  t={'kind':'artist','relation':relation,'subject':wd['requested_artist_ids'][aid],'label':x['placeLabel'],'lon':float(point[1]),'lat':float(point[2]),'precision':precision,'source':x['artist'].replace('http:','https:').replace('/entity/','/wiki/')+'#'+kind,'identity_source':x['artist'].replace('http:','https:').replace('/entity/','/wiki/')+'#P1953','evidence_property':kind,'note':'A documented '+{'P740':'group formation place','P937':'work location','P495':'musical-project origin country'}[kind]+' from Wikidata. This relationship is not a recording-location claim or a claim about the artist’s location at this release date.'}
  if period:t['period']=period
  if x.get('reference'):t['reference_url']=x['reference']
  claims.setdefault(aid,[]).append(t)
aliases={'United States':'US','United States of America':'US','United Kingdom':'UK','Russian Federation':'Russia','Czechia':'Czech Republic','Türkiye':'Turkey','Korea, Republic of':'South Korea'}
extra={'Bahamas':[-77.4,25.0],'England':[-1.5,52.5],'Scotland':[-4,57],'Wales':[-3.5,52.3],'Northern Ireland':[-6.5,54.7]};region={'Europe','UK & Europe','Scandinavia','Benelux','UK & Ireland','Germany, Austria, & Switzerland'}
# A city/region/country hierarchy is not three competing artist origins.
# Only the exact, already-reviewed anchor names below may turn hierarchical
# MusicBrainz associated-area labels into geographic points. No geocoding guesses.
area_anchors=read('reviewed-area-anchors.json')
for x in mb['records']:
 aid=x['discogs_artist_id']
 if aid in ambiguous or aid not in grouped or x['status']!='area_found' or not x['area_labels']:continue
 label=x['area_labels'][0];name=aliases.get(label,label)
 anchor=area_anchors.get(label)
 if len(x['area_labels'])>1 and not anchor:
  skipped.append({'artist':aid,'reason':'hierarchical_area_needs_anchor_review','areas':x['area_labels']});continue
 point=anchor['coordinates'] if anchor else places.get(name) or extra.get(name)
 if not point:skipped.append({'artist':aid,'reason':'area_needs_geographic_review','area':label});continue
 precision=anchor['precision'] if anchor else ('region' if name in region else 'country')
 claims.setdefault(aid,[]).append({'kind':'artist','relation':'MusicBrainz artist associated area','subject':x['name'],'label':label,'lon':point[0],'lat':point[1],'precision':precision,'source':x['source'],'identity_source':x['wikidata'].replace('http:','https:').replace('/entity/','/wiki/')+'#P1953','evidence_property':'MusicBrainz Artist Area','note':'An exact identity-linked associated-area field, sometimes accompanied by a wider geographic hierarchy. It is not a recording place, birthplace, artist formation place, or a statement about location at release date.'})
# Stable historical provenance: a refresh of the identity-linked source exporter
# must not silently rename or rewrite an already accepted fact. The thread ID
# and the regression fingerprint depend on relation/subject/source and the full
# original record, respectively. Only inherit exact artist, property, source,
# location and precision matches; a genuinely new fact remains a new claim.
previous=(r/'source/collection-research.json')
if previous.exists():
 prior=json.loads(previous.read_text()).get('artists',{})
 for aid,rows in claims.items():
  historical=prior.get(aid,[])
  for i,fact in enumerate(rows):
   match=next((p for p in historical
     if p.get('source')==fact.get('source')
     and p.get('evidence_property')==fact.get('evidence_property')
     and p.get('label')==fact.get('label')
     and p.get('precision')==fact.get('precision')
     and p.get('subject')==fact.get('subject')
     and p.get('lon')==fact.get('lon')
     and p.get('lat')==fact.get('lat')),None)
   if match is not None:
    rows[i]=match
report={'artist_ids_checked':len(wd['requested_artist_ids']),'identity_matches':len(grouped),'ambiguous_artist_ids':ambiguous,'musicbrainz_pages_checked':len(mb['records']),'accepted_artists':len(claims),'accepted_threads':sum(map(len,claims.values())),'skipped':skipped,'failed_batches':len(wd['failed_batches'])}
(r/'source/collection-research.json').write_text(json.dumps({'schema_version':1,'criteria':'Exact external IDs; typed source properties; no birthplaces, citizenship, artist-name fuzzy matches or genre-based place inference. Region precision is retained unless the source entity is clearly city/country.','artists':claims,'matched_artist_ids':list(grouped),'report':report},ensure_ascii=False,indent=2)+'\n');print(json.dumps(report))
