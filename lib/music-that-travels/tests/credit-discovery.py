"""Deterministic tests for musical vs manufacturing credit distinction."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'research'))
from importlib import import_module
scan = import_module('credit-discovery').scan


def release(rid, credits):
    return {'observations': {'releases:'+str(rid): {
        'data': {'extraartists': [{'id': aid, 'name': name, 'role': role, 'tracks': tracks}
                                  for aid, name, role, tracks in credits]}}}}


class Discovery(unittest.TestCase):
    def setUp(self):
        self.collection = {'entries': [
            {'id': 1, 'title': 'Record one'}, {'id': 2, 'title': 'Record two'},
            {'id': 3, 'title': 'Record three'}]}
        self.ledger = {'connections': [], 'identity_exceptions': []}

    def test_creative_pair_and_track_scope_retained(self):
        x = release(1, [(25, 'Artist', 'Tenor Saxophone', 'B1 to B5')])
        y = release(2, [(25, 'Artist', 'Saxophone', '')])
        z = scan(self.collection, self.ledger, [x, y])
        self.assertEqual(z['lead_count'], 1)
        self.assertEqual(z['leads'][0]['roles'][0][0]['tracks'], 'B1 to B5')
        self.assertEqual(z['leads'][0]['status'], 'candidate')

    def test_manufacturing_and_artwork_roles_excluded(self):
        x = release(1, [(5, 'Mastering', 'Mastered By', ''),
                        (6, 'Art', 'Artwork', ''),
                        (7, 'Manager', 'Executive Producer', '')])
        y = release(2, [(5, 'Mastering', 'Mastered By', ''),
                        (6, 'Art', 'Artwork', ''),
                        (7, 'Manager', 'Executive Producer', '')])
        self.assertEqual(scan(self.collection, self.ledger, [x,y])['lead_count'], 0)

    def test_zero_id_is_not_identity(self):
        a = release(1, [(0, 'Someone', 'Written By', '')])
        b = release(2, [(0, 'Different', 'Written By', '')])
        self.assertEqual(scan(self.collection, self.ledger, [a,b])['lead_count'], 0)

    def test_same_release_duplicate_credit_does_not_form_pair(self):
        x = release(1, [(42, 'Producer', 'Producer', ''), (42, 'Producer', 'Written-By', '')])
        self.assertEqual(scan(self.collection, self.ledger, [x,x])['lead_count'], 0)

    def test_rejected_and_accepted_pair_is_suppressed(self):
        self.ledger['connections'] = [{'decision': 'accepted',
            'endpoints': [{'release_id':'1'},{'release_id':'2'}]}]
        a,b = release(1,[(25,'Person','Producer','')]),release(2,[(25,'Person','Producer','')])
        self.assertEqual(scan(self.collection,self.ledger,[a,b])['lead_count'],0)

    def test_namesake_exception_is_respected(self):
        self.ledger['identity_exceptions'] = [{
            'release_id': '2','excluded_artist_ids': ['25']}]
        a,b = release(1,[(25,'Alias','Vocals','')]),release(2,[(25,'Alias','Vocals','')])
        self.assertEqual(scan(self.collection,self.ledger,[a,b])['lead_count'],0)

    def test_same_titles_without_credits_do_not_match(self):
        self.assertEqual(scan(self.collection,self.ledger,[release(1,[]),release(2,[])])['lead_count'],0)


if __name__ == '__main__':
    unittest.main()
