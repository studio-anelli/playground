"""Research safety and reusability fixtures, independent of the current collection."""
import hashlib
import json
from pathlib import Path
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'research'))
from pipeline import applicable, index, plan, report, threads, validate


def fixture():
    artist = {'id': 42, 'name': 'Shared Name'}
    entries = [{'id': 11, 'instance_id': 1, 'title': 'Album', 'artists': [artist], 'master_id': 90},
               {'id': 11, 'instance_id': 2, 'title': 'Album', 'artists': [artist], 'master_id': 90},
               {'id': 12, 'instance_id': 3, 'title': 'Album (reissue)', 'artists': [artist], 'master_id': 90},
               {'id': 13, 'instance_id': 4, 'title': 'Another Album', 'artists': [{'id': 43, 'name': 'Shared Name'}], 'master_id': 91}]
    source = {'url': 'https://example.org/artist', 'title': 'Artist biography', 'publisher': 'Label',
              'type': 'official', 'retrieval': 'read', 'checked_at': '2026-11-09'}
    claim = {'id': 'c1', 'entity': {'type': 'artist', 'id': '42'}, 'decision': 'accepted',
             'identity': {'status': 'reviewed', 'basis': 'Exact artist ID plus release-context review'},
             'kind': 'artist', 'relation': 'Group formed in', 'subject': 'Shared Name', 'label': 'Paris',
             'lat': 48.85, 'lon': 2.35, 'precision': 'city', 'geographic_basis': 'explicit',
             'source_ids': ['s1'], 'evidence_summary': 'Formation documented by the label.',
             'note': 'Group formation, not a recording address.'}
    ledger = {'sources': {'s1': source}, 'claims': [claim], 'attempts': []}
    return {'entries': entries}, ledger


class Method(unittest.TestCase):
    def test_copy_and_entity_identity(self):
        collection, ledger = fixture()
        artists, releases, masters = index(collection)
        self.assertEqual(len(artists), 2)
        self.assertEqual(releases['11']['copies'], [1, 2])
        self.assertEqual(masters['90'], ['11', '12'])
        out = report(collection, ledger)
        self.assertEqual(out['counts']['editions_with_new_evidence'], 2)
        self.assertEqual(out['counts']['copies'], 4)
        self.assertFalse(next(r for r in out['records'] if r['release_id'] == '13')['claim_ids'])
        # Another collection reuses the same artist evidence without copying collection rows.
        new = {'entries': [{'id': 55, 'instance_id': 100, 'title': 'New', 'artists': [{'id': 42, 'name': 'Alias'}]}]}
        self.assertEqual(report(new, ledger)['counts']['editions_with_new_evidence'], 1)
        self.assertTrue(plan(new, ledger)['artists'][0]['reusable_evidence'])

    def test_recording_claim_does_not_spread_to_same_master(self):
        collection, ledger = fixture()
        c = ledger['claims'][0]
        c.update(entity={'type': 'release', 'id': '11'}, kind='recording', coverage='partial', track_positions=['A1'])
        self.assertEqual(report(collection, ledger)['counts']['editions_with_new_evidence'], 1)
        c['reviewed_release_ids'] = ['12']
        self.assertTrue(any('equivalence' in e for e in validate(ledger)))
        c['transfer_basis'] = 'Reviewed matching original recordings; bonus tracks excluded.'
        self.assertEqual(validate(ledger), [])
        self.assertEqual(report(collection, ledger)['counts']['editions_with_new_evidence'], 2)
        self.assertEqual(threads(ledger)['releases']['12'][0]['track_positions'], ['A1'])
        self.assertEqual(threads(ledger)['releases']['12'][0]['coverage'], 'partial')

    def test_candidates_and_conflicts_fail_closed(self):
        _, ledger = fixture()
        ledger['claims'][0]['decision'] = 'pending'
        self.assertFalse(threads(ledger)['artists'])
        ledger['claims'][0]['decision'] = 'accepted'
        ledger['claims'][0]['conflict_with'] = ['alternative-source']
        self.assertTrue(validate(ledger))
        ledger['claims'][0].pop('conflict_with')
        ledger['sources']['s1']['retrieval'] = 'discovered'
        self.assertTrue(validate(ledger))
        ledger['sources']['s1']['retrieval'] = 'read'
        ledger['claims'][0]['identity']['status'] = 'name_match_only'
        self.assertTrue(validate(ledger))

    def test_no_false_research_completion(self):
        collection, ledger = fixture()
        out = report(collection, ledger)
        self.assertEqual(out['counts']['editions_checks_complete'], 0)
        self.assertEqual(out['records'][0]['research_status'], 'not_started')
        ledger['attempts'] = [{'entity': 'release:11', 'stage': s,
                              'outcome': 'unavailable' if s == 'archive' else 'reviewed',
                              'checked_at': '2026-11-09', 'source_ids': [] if s == 'archive' else ['s1'],
                              'detail': 'Publisher unavailable' if s == 'archive' else 'Source read'}
                             for s in ['discogs', 'official', 'archive']]
        row = report(collection, ledger)['records'][0]
        self.assertEqual(row['research_status'], 'checked_with_gaps')
        self.assertEqual(row['gaps'], ['archive'])
        self.assertTrue(row['claim_ids'])  # Evidence coverage and research coverage are independent.

    def test_batch_projection_and_old_evidence_survive(self):
        ledger = json.loads((ROOT/'source/research-ledger.json').read_text())
        collection = json.loads((ROOT/'source/collection.json').read_text())
        origins = json.loads((ROOT/'source/origin-collection.json').read_text())
        batch = json.loads((ROOT/'source/research-batch-01.json').read_text())
        self.assertEqual(validate(ledger), [])
        out = report(collection, ledger, batch)
        self.assertEqual(out['batch']['found'], 40)
        self.assertEqual(out['batch']['documented'], 40)
        self.assertEqual(out['batch']['bounded_reviews_complete'], 40)
        self.assertEqual(len(ledger['question_reviews']), 10)
        self.assertEqual(sum(q['status'] == 'resolved' for q in ledger['question_reviews']), 2)
        self.assertEqual(sum(q['status'] == 'bounded_unresolved' for q in ledger['question_reviews']), 8)
        for rid in batch['release_ids']:
            self.assertIn(str(rid), origins['records'])
        self.assertTrue(any(t['label'] == 'London' for t in origins['records']['9072898']['threads']))
        self.assertTrue(any(t['label'] == 'Zurich' and t['kind'] == 'recording' for t in origins['records']['13132255']['threads']))
        self.assertFalse(any(t['precision'] == 'city' for t in origins['records']['12890235']['threads']))
        self.assertTrue(any(t['label'] == 'Colombia' and t['kind'] == 'repertoire' for t in origins['records']['11717510']['threads']))
        # Every earlier claim remains; a scope correction needs an explicit reviewed exception.
        old = json.loads((ROOT/'tests/research-baseline.json').read_text())
        for rid, hashes in old['records'].items():
            after = {t['id']: t for t in origins['records'][rid]['threads']}
            for tid, expected in hashes.items():
                correction = next((c for c in ledger.get('corrections', []) if c['release_id'] == rid and c['thread_id'] == tid), None)
                if correction:
                    self.assertTrue(correction['reason'])
                    self.assertTrue(correction['source_ids'])
                    for key, value in correction['patch'].items():
                        self.assertEqual(after[tid][key], value)
                    # All fields outside the reviewed patch are preserved too.
                    prior = correction['prior_thread']
                    self.assertEqual(hashlib.sha256(json.dumps(prior,sort_keys=True,ensure_ascii=False).encode()).hexdigest(), expected)
                    self.assertEqual(after[tid], {**prior, **correction['patch']})
                    self.assertNotIn('B', after[tid]['track_positions'])
                    continue
                actual = hashlib.sha256(json.dumps(after[tid], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
                self.assertEqual(actual, expected)

    def test_bounded_review_is_not_complete_history(self):
        _, ledger = fixture()
        ledger['method_version'] = '0.2'
        review = {'release_id':'11', 'artist_ids':['42'], 'decision':'complete_with_limits',
                  'checked_at':'2026-11-09', 'identity_basis':'Exact IDs', 'scope_review':'Artist only',
                  'stop_reason':'Specific session remains unverified', 'source_ids':['s1'],
                  'limits':['Session unknown'], 'meaningful_claim_ids':['c1']}
        ledger['reviews'] = [review]
        ledger['attempts'] = [{'entity':'release:11','stage':stage,'outcome':'reviewed',
                              'source_ids':['s1'],'checked_at':'2026-11-09','detail':'Reviewed formation evidence for the specific source route'}
                             for stage in ['discogs','official','archive']]
        ledger['claims'][0]['musical_value'] = 'profile_only'
        self.assertTrue(any('musical evidence' in e for e in validate(ledger)))
        ledger['claims'][0]['musical_value'] = 'formation'
        self.assertEqual(validate(ledger), [])
        review['decision'] = 'complete'
        self.assertTrue(any('limits' in e for e in validate(ledger)))
        review['decision'] = 'complete_with_limits'
        review['artist_ids'] = ['43']
        self.assertTrue(any('credited' in e for e in validate(ledger)))
        review['artist_ids'] = ['42']
        review['reused_thread_ids'] = ['invented']
        self.assertTrue(any('individually reviewed' in e for e in validate(ledger)))
        ledger['attempts'] = [{'entity':'release:11','stage':'archive','outcome':'not_applicable',
                               'checked_at':'2026-11-09','detail':'Generic skip'}]
        self.assertTrue(any('closed route' in e for e in validate(ledger)))

    def test_frozen_holdout_and_qualified_facts(self):
        ledger = json.loads((ROOT/'source/research-ledger.json').read_text())
        batch = json.loads((ROOT/'source/research-batch-02.json').read_text())
        first = json.loads((ROOT/'source/research-batch-01.json').read_text())
        intake = json.loads((ROOT/'source/research-holdout-collection.json').read_text())
        observations = json.loads((ROOT/'source/research-discogs-02.json').read_text())
        self.assertEqual(len(set(batch['release_ids'])),50)
        self.assertFalse(set(batch['release_ids']) & set(first['release_ids']))
        self.assertEqual(sum(v['placed'] for v in batch['baseline'].values()),25)
        self.assertLess(batch['selected_at'], observations['run']['started_at'])
        out = report(intake, ledger, batch)
        self.assertEqual(out['batch']['found'],50)
        self.assertEqual(out['batch']['bounded_reviews_complete'],50)
        self.assertEqual(out['batch']['meaningful_context'],43)
        self.assertEqual(out['batch']['checks_complete'],49)
        self.assertTrue(next(r for r in out['records'] if r['release_id']=='2720604')['gaps'])
        by_artist = threads(ledger)['artists']
        self.assertTrue(any(t['subject']=='Alpha Omega / Colin Lindo' for t in by_artist['2093']))
        self.assertTrue(all('Colin' not in t['subject'] for t in by_artist['43151']))
        # Current profile location cannot displace the earlier documented musical development.
        origins = json.loads((ROOT/'source/origin-collection.json').read_text())
        self.assertEqual(origins['records']['15268960']['label'],'New York')
        self.assertEqual(origins['records']['7770150']['label'],'Aachen')
        self.assertTrue(any(t.get('track_positions')==['D1','D2','D3','D4','D5','D6'] and t['label']=='Altadena'
                            for t in origins['records']['12716187']['threads']))
        # The runtime projection keeps scope while dropping the research bookkeeping.
        worker = (ROOT/'worker.js').read_text().splitlines()[0]
        payload = json.loads(json.loads(worker.split('=',1)[1].rstrip(';')))
        corrected = next(t for t in payload['origins']['records']['8786827']['threads'] if t['id']=='thread-4e1452f58fad')
        self.assertEqual(corrected['track_positions'], ['A1','A2'])
        self.assertIn('disputed', corrected['coverage'])
        self.assertNotIn('research_claim_id', worker)


if __name__ == '__main__':
    unittest.main()
