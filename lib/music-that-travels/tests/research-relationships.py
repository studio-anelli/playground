"""Relationship queue regressions: no automatic promotion or inferred geography."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'research'))
from relationships import validate_queue, shared_artist_leads, summary

def read(name):
    return json.loads((ROOT / 'source' / name).read_text(encoding='utf-8'))

class RelationshipTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.coll = read('collection.json')
        cls.ledger = read('research-ledger.json')
        cls.queue = read('relationship-leads.json')

    def test_existing_queue_is_valid_and_not_published(self):
        self.assertEqual(validate_queue(self.queue, self.coll, self.ledger), [])
        self.assertGreaterEqual(len(self.queue['leads']), 7)
        self.assertTrue(all(x['status'] == 'candidate' for x in self.queue['leads']))
        self.assertEqual(summary(self.queue, self.coll, self.ledger)['by_status']['verified'], 0)

    def test_scope_is_mandatory_for_sample_and_cover(self):
        bad = copy.deepcopy(self.queue)
        bad['leads'][0].pop('track_scope')
        self.assertTrue(any('track/side/version' in s for s in
                            validate_queue(bad, self.coll, self.ledger)))

    def test_unowned_or_invalid_source_is_rejected(self):
        bad = copy.deepcopy(self.queue)
        bad['leads'][0]['endpoints'][0]['release_id'] = '99999999999'
        bad['leads'][1]['source_urls'] = ['http://insecure.example']
        err = validate_queue(bad, self.coll, self.ledger)
        self.assertTrue(any('missing owned' in x for x in err))
        self.assertTrue(any('HTTPS' in x for x in err))

    def test_no_promotion_without_strong_evidence(self):
        bad = copy.deepcopy(self.queue)
        bad['leads'][0]['status'] = 'verified'
        bad['leads'][1]['publish_to_map'] = True
        err = validate_queue(bad, self.coll, self.ledger)
        self.assertTrue(any('independently reviewed' in x for x in err))
        self.assertTrue(any('cannot publish' in x for x in err))

    def test_duplicate_ids_are_rejected(self):
        bad = copy.deepcopy(self.queue)
        bad['leads'][1]['id'] = bad['leads'][0]['id']
        self.assertTrue(any('duplicate' in x for x in
                            validate_queue(bad, self.coll, self.ledger)))

    def test_artist_leads_respect_exact_identity_and_exceptions(self):
        leads = shared_artist_leads(self.coll, self.ledger)
        self.assertTrue(all(p['status'] == 'candidate' for p in leads))
        self.assertTrue(all(p['artist_id'] not in {'194', '355', '118760'} for p in leads))
        self.assertFalse(any(p['artist_id'] == '82386' and '3668574' in p['release_ids']
                             for p in leads))
        known = [frozenset(x['release_ids']) for x in leads]
        self.assertNotIn(frozenset(('7568442', '1042849')), known)
        self.assertEqual(len(known), len(set((tuple(sorted(p['release_ids'])), p['artist_id']) for p in leads)))

    def test_does_not_infer_musical_links_from_title_or_genre(self):
        coll = {'entries': [
            {'id': 1, 'instance_id': 1, 'title': 'Music People',
             'artists': [{'id': 11, 'name': 'Artist A'}], 'styles': ['House']},
            {'id': 2, 'instance_id': 2, 'title': 'Music People',
             'artists': [{'id': 12, 'name': 'Artist B'}], 'styles': ['House']}
        ]}
        self.assertEqual(shared_artist_leads(coll, {'connections': []}), [])

    def test_minimal_exact_artist_overlap_is_only_a_lead(self):
        coll = {'entries': [
            {'id': 1, 'instance_id': 1, 'title': 'A',
             'artists': [{'id': 11, 'name': 'Same'}]},
            {'id': 2, 'instance_id': 2, 'title': 'B',
             'artists': [{'id': 11, 'name': 'Same'}]}
        ]}
        out = shared_artist_leads(coll, {'connections': []})
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]['relation'], 'shared_billed_artist_lead')
        self.assertEqual(out[0]['status'], 'candidate')

if __name__ == '__main__':
    unittest.main()
