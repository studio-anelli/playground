"""Find exact-ID creative-contributor overlaps from collected Discogs edition credits.

Outputs review leads, NOT validated musical relationships or geographic claims.
No network requests, no similarity/name/genre matching and no worker changes.
"""
import argparse
import json
import re
from collections import defaultdict
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS = ('research-discogs.json', 'research-discogs-02.json',
                'research-discogs-03.json', 'research-discogs-connections-03.json')
MUSIC_ROLE = re.compile(
    r'\b(vocals?|singing|drums?|guitar|bass|piano|keyboard|keyboards|trumpet|'
    r'saxophone|sax|flute|clarinet|tuba|percussion|synthesizer|organ|violin|'
    r'cello|producer|production|arranged|composer|composed|written|'
    r'music by|lyrics|performer|conga|sitar|choir|horn|reed)\b', re.I)
NOT_MUSICAL_RECORDING = re.compile(
    r'lacquer|master(?:ed|ing)|remaster|cover art|artwork|photograph|layout|'
    r'design|illustrat|liner notes|transfer|restoration|product manager|'
    r'legal|licens|booklet|proofread|printing|executive[- ]producer|'
    r'engineer \[vinyl digitalization', re.I)
# Executive producer is excluded here because this pass looks for directly
# credited creative work, not business oversight; those links can be reviewed
# separately as a distinct credit type.


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def scan(collection, ledger, datasets):
    owned = {str(r['id']): r for r in collection['entries']}
    exclusions = {(str(x['release_id']), str(aid))
                  for x in ledger.get('identity_exceptions', [])
                  for aid in x.get('excluded_artist_ids', [])}
    # Suppress only the *same reviewed contributor*, never a whole edition pair:
    # another musician on those albums can represent a separate discovery.
    reviewed_contributors = set()
    for connection in ledger.get('connections', []):
        if connection.get('decision') != 'accepted' or len(connection.get('endpoints', [])) != 2:
            continue
        endpoints = frozenset(str(e['release_id']) for e in connection['endpoints'])
        subject = str(connection.get('subject', '')).lower()
        reviewed_contributors.add((endpoints, subject))
    observed, credits = set(), defaultdict(lambda: defaultdict(list))
    for dataset in datasets:
        for key, item in dataset.get('observations', {}).items():
            if not key.startswith('releases:') or not item.get('data'):
                continue
            rid = key.split(':', 1)[1]
            if rid not in owned:
                continue
            observed.add(rid)
            for credit in item['data'].get('extraartists', []):
                aid, role = str(credit.get('id', '')), str(credit.get('role') or '')
                if not aid.isdigit() or int(aid) < 1 or (rid, aid) in exclusions:
                    continue
                if not MUSIC_ROLE.search(role) or NOT_MUSICAL_RECORDING.search(role):
                    continue
                row = {'role': role, 'tracks': credit.get('tracks') or '',
                       'name': credit.get('name') or ''}
                if row not in credits[aid][rid]:
                    credits[aid][rid].append(row)
    leads = []
    for aid, editions in sorted(credits.items(), key=lambda x: int(x[0])):
        for left, right in combinations(sorted(editions, key=int), 2):
            reviewed_subjects = [subject for endpoints, subject in reviewed_contributors
                                 if endpoints == frozenset((left, right))]
            person_name = editions[left][0]['name'].lower()
            # Exact name equality is conservative: a connection listing multiple
            # musicians is *not* treated as review of every other contributor.
            if person_name in reviewed_subjects:
                continue
            leads.append({
                'artist_id': aid, 'artist_name': editions[left][0]['name'],
                'release_ids': [left, right],
                'titles': [owned[left]['title'], owned[right]['title']],
                'roles': [editions[left], editions[right]],
                'status': 'candidate', 'relation': 'shared_creative_credit_lead',
                'question': 'Confirm matching identity, track/version scope, and the meaning of each distinct creative role. This does not establish shared sessions, sampling, or identical recordings.'
            })
    return {
        'schema_version': 1, 'dataset_coverage': {
            'owned_editions': len(owned),
            'owned_editions_with_structured_discogs_observation': len(observed),
            'scope': 'Source releases in supplied observation files only; missing credits are unknown, not absent.'
        }, 'lead_count': len(leads), 'leads': leads,
        'limitations': [
            'Only indexed, numeric extraartist IDs with directly creative roles are scanned.',
            'The same named contributor does not prove two records share a recording or sample.',
            'Role text can mix production stages; candidates require scope adjudication.',
            'This is a source-observation review queue, not a web validation or map projection.'
        ]
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--collection', type=Path, default=ROOT/'source/collection.json')
    parser.add_argument('--ledger', type=Path, default=ROOT/'source/research-ledger.json')
    parser.add_argument('--observations', type=Path, nargs='*',
                        default=[ROOT/'source'/x for x in OBSERVATIONS])
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    available = [p for p in args.observations if p.exists()]
    if not available:
        raise SystemExit('No source observations available')
    result = scan(read(args.collection), read(args.ledger), [read(p) for p in available])
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
