"""Group redundant display places; retain the original claims and their precision.

This is presentation normalisation, not a revision of the source evidence. Only
claims about the same subject and cultural layer may combine. Specific places
stay separate; a country summary folds into an existing place within its polygon.
"""
import math
import unicodedata

COUNTRIES = {'us':'USA','usa':'USA','unitedstates':'USA','unitedstatesofamerica':'USA',
 'uk':'GBR','unitedkingdom':'GBR','greatbritain':'GBR','england':'GBR','scotland':'GBR','wales':'GBR','northernireland':'GBR',
 'netherlands':'NLD','thenetherlands':'NLD','turkey':'TUR','turkiye':'TUR'}
CONSTITUENTS={'england','scotland','wales','northernireland'}

def normal(value):
 return ''.join(c for c in unicodedata.normalize('NFKD',value or '').casefold() if c.isalnum())

def subject(value):
 # Typography variants are common between the reviewed and imported sources.
 return normal(value)

def point(lon,lat):return 80+(lon+180)/360*1040,590-(lat+60)/150*460

def inside(x,y,ring):
 result=False
 for i,a in enumerate(ring):
  b=ring[i-1]
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:result=not result
 return result

def distance(a,b):
 return math.hypot((a['lon']-b['lon'])*111*math.cos((a['lat']+b['lat'])*math.pi/360),(a['lat']-b['lat'])*111)

def group_threads(threads,countries,primary_id=None):
 by_name={normal(c['name']):c for c in countries}
 by_iso={c['iso']:c for c in countries}
 def polygon(t):
  label=normal(t['label'])
  return by_iso.get(COUNTRIES.get(label)) or by_name.get(label)
 def same(a,b):
  if a['precision']!=b['precision']:return False
  left,right=normal(a['label']),normal(b['label'])
  if a['precision']=='country':
   # A constituent country is meaningful alongside another constituent.
   if left in CONSTITUENTS or right in CONSTITUENTS:return left==right
   pa,pb=polygon(a),polygon(b)
   return bool(pa and pb and pa['iso']==pb['iso']) or left==right
  labels={'newyorkcity':'newyork'}
  return labels.get(left,left)==labels.get(right,right) and distance(a,b)<25
 def contains(broad,specific):
  if broad['precision']!='country':return False
  label=normal(broad['label'])
  if label in CONSTITUENTS:return False # no constituent polygons in this dataset
  boundary=polygon(broad)
  if not boundary:return False
  if specific['precision']=='country':
   return normal(specific['label']) in CONSTITUENTS and boundary['iso']=='GBR'
  x,y=point(specific['lon'],specific['lat'])
  return any(inside(x,y,r)for r in boundary['rings'])
 groups=[]
 # Keep the most specific place as the display anchor, then the existing primary.
 ranked=sorted(enumerate(threads),key=lambda it:({'city':0,'region':1,'country':2}.get(it[1]['precision'],3),it[1]['id']!=primary_id,it[0]))
 for original_index,t in ranked:
  target=next((g for g in groups if g['kind']==t['kind'] and subject(g['subject'])==subject(t['subject']) and (same(g,t) or contains(t,g))),None)
  if target is None:
   target=dict(t);target['_order']=original_index;groups.append(target)
  else:
   target.setdefault('supporting_claims',[]).append(dict(t));target['_order']=min(target['_order'],original_index)
 for g in groups:g.setdefault('supporting_claims',[])
 groups.sort(key=lambda g:g['_order'])
 for g in groups:del g['_order']
 return groups
