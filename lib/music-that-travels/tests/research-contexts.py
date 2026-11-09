"""Context routes, evidence boundaries and lossless display sharing."""
import copy,json,sys,unittest,hashlib,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'research'))
from pipeline import validate,report,connections,research_route,applicable
read=lambda name:json.loads((ROOT/'source'/name).read_text())
class Contexts(unittest.TestCase):
 def setUp(self):self.ledger=read('research-ledger.json');self.batch=read('research-batch-03.json')
 def test_frozen_stratified_selection(self):
  b=self.batch;selected=set(b['release_ids']);self.assertEqual(len(selected),50)
  self.assertEqual(collections.Counter(x['research_context'] for x in b['assignments'].values()),{k:10 for k in ['established_album','less_documented_album','established_scene_short_release','underground_network','obscure_or_ambiguous']})
  for n in ['01','02']:self.assertFalse(selected&set(read('research-batch-'+n+'.json')['release_ids']))
  observations=read('research-discogs-03.json');self.assertLess(b['selected_at'],observations['run']['started_at'])
  for rid,assignment in b['assignments'].items():self.assertEqual(assignment['selection_score'],hashlib.sha256((b['selection_seed']+':'+rid).encode()).hexdigest())
 def test_format_does_not_imply_scene_or_fame(self):
  route=research_route({'title':'Unknown remixes','formats':[{'name':'Vinyl','descriptions':['12"','Mixed','Unofficial Release']}],'master_id':0})
  self.assertNotIn('ep',route['format_descriptions']);self.assertEqual(route['context_status'],'requires_context_review')
  for term in ['curator','pressing','No master','remixer']:self.assertTrue(any(term in q for q in route['questions']))
 def test_namesake_quarantine_and_partial_sessions(self):
  self.assertEqual(validate(self.ledger),[])
  origins=read('origin-collection.json')['records'];m=origins['3668574']['threads']
  self.assertEqual({t['label'] for t in m},{'Bristol','London'})
  c={'entity':{'type':'artist','id':'82386'},'excluded_release_ids':['3668574']}
  self.assertFalse(applicable(c,{'artists':[{'id':82386}]},'3668574'))
  invalid=copy.deepcopy(self.ledger);claim=copy.deepcopy(invalid['claims'][-1]);claim.update(id='bad-paris-join',entity={'type':'artist','id':'82386'});invalid['claims'].append(claim)
  self.assertTrue(any('disputed release' in e for e in validate(invalid)))
  innode=origins['18710329']['threads'];chicago=next(t for t in innode if t['label']=='Chicago')
  self.assertEqual(chicago['track_positions'],['A1','A4']);self.assertIn('Partial',chicago['coverage'])
  self.assertEqual({t['label'] for t in origins['14791220']['threads']},{'Ghana'})
  for rid in ['14460113','453412']:self.assertNotIn(rid,origins)
 def test_connections_require_both_owned_endpoints_and_evidence(self):
  c=read('collection.json');edges=connections(c,self.ledger);self.assertEqual(len(edges),4)
  self.assertFalse(any(e['id']=='p3-no-musicpeople-namejoin' for e in edges))
  smaller={'entries':[e for e in c['entries'] if e['id']!=8926196]}
  self.assertEqual(len(connections(smaller,self.ledger)),3)
  invalid=copy.deepcopy(self.ledger);edge=next(e for e in invalid['connections'] if e['decision']=='accepted');edge['relation']='same_city'
  self.assertTrue(any('similarity' in e for e in validate(invalid)))
  edge['relation']='shared_contributor';edge['endpoints'][1]['source_ids']=[]
  self.assertTrue(any('endpoint' in e for e in validate(invalid)))
 def test_scope_checks_do_not_inflate_context(self):
  a=report(read('research-context-intake.json'),self.ledger,self.batch)
  self.assertEqual(a['batch']['meaningful_context'],43);self.assertEqual(a['batch']['source_routes_accounted'],50)
  self.assertEqual(sum(r['research_status']=='needs_followup' for r in a['records']),7)
  r=next(r for r in self.ledger['reviews'] if r['release_id']=='8872804');self.assertFalse(r['finding_ids']);self.assertTrue(r['scope_finding_ids'])
  r['finding_ids']=r['scope_finding_ids'];self.assertTrue(any('version checks alone' in e for e in validate(self.ledger)))
 def test_runtime_sharing_is_lossless(self):
  worker=(ROOT/'worker.js').read_text().splitlines()[0];data=json.loads(json.loads(worker.split('=',1)[1].rstrip(';')))
  self.assertTrue(data['shared_threads']);self.assertLess(len(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()),700000)
  sources=set()
  for row in data['origins']['records'].values():
   for ref in row['threads']:
    t=data['shared_threads'][ref] if isinstance(ref,str) else ref;self.assertIn('source',t);sources.add(t['source']);self.assertNotIn('research_claim_id',t)
  self.assertEqual(len(data['collection_connections']),4);self.assertEqual(len(data['research_contexts']),43)
  chicago=next(t for t in data['origins']['records']['18710329']['threads'] if isinstance(t,dict) and t['label']=='Chicago');self.assertEqual(chicago['track_positions'],['A1','A4'])
 def test_timing_limits_are_explicit(self):
  sessions=read('research-review-sessions-03.json');self.assertTrue(sessions['limitations'])
  for interval in sessions['intervals']:self.assertLess(interval['started_at'],interval['ended_at'])
if __name__=='__main__':unittest.main()
