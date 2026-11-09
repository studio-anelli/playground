"""Plan, validate and audit reusable music research. Network collection is explicit."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

STAGES = ('discogs', 'official', 'archive')
OUTCOMES = {'reviewed', 'no_relevant_evidence', 'unavailable', 'not_applicable'}
KINDS = {'artist', 'recording', 'repertoire'}
ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def index(collection):
    """Copies stay distinct; reusable work is keyed by stable Discogs IDs."""
    artists, releases, masters = {}, {}, {}
    for row in collection['entries']:
        rid = str(row['id'])
        if rid not in releases:
            releases[rid] = {'title': row['title'], 'artists': row['artists'],
                             'master_id': row.get('master_id', 0), 'copies': [],
                             'labels': row.get('labels', []), 'genres': row.get('genres', [])}
        releases[rid]['copies'].append(row['instance_id'])
        mid = str(row.get('master_id', 0))
        if mid != '0':
            masters.setdefault(mid, []).append(rid)
        for artist in row['artists']:
            aid = str(artist['id'])
            if aid in {'194', '355', '118760'}:  # Various / Unknown / No Artist
                continue
            artists.setdefault(aid, {'name': artist['name'], 'releases': []})
            if rid not in artists[aid]['releases']:
                artists[aid]['releases'].append(rid)
    return artists, releases, {k: sorted(set(v)) for k, v in masters.items()}


def applicable(claim, release, rid):
    scope = claim['entity']
    if scope['type'] == 'artist':
        return any(str(a['id']) == str(scope['id']) for a in release['artists'])
    # Recording/repertoire claims are edition-scoped unless sibling transfer was reviewed.
    return rid in ([str(scope['id'])] + [str(x) for x in claim.get('reviewed_release_ids', [])])


def validate(ledger):
    """Fail closed: reviewed identity and direct evidence are required for projection."""
    errors = []
    sources = ledger.get('sources', {})
    ids = set()
    for claim in ledger.get('claims', []):
        cid = claim.get('id', '<missing>')
        def fail(message):
            errors.append(f'{cid}: {message}')
        if cid in ids:
            fail('duplicate claim ID')
        ids.add(cid)
        if claim.get('decision') not in {'accepted', 'pending', 'rejected', 'conflict'}:
            fail('invalid decision')
        if claim.get('decision') != 'accepted':
            continue
        entity = claim.get('entity', {})
        if entity.get('type') not in {'artist', 'release'} or not str(entity.get('id', '')).isdigit():
            fail('stable entity ID required')
        if claim.get('kind') not in KINDS:
            fail('invalid relationship kind')
        if entity.get('type') == 'artist' and claim.get('kind') != 'artist':
            fail('release evidence cannot be artist-wide')
        if claim.get('identity', {}).get('status') != 'reviewed' or not claim.get('identity', {}).get('basis'):
            fail('reviewed identity basis required')
        for field in ('relation', 'subject', 'label', 'note', 'evidence_summary'):
            if not claim.get(field):
                fail(f'{field} required')
        if claim.get('precision') not in {'city', 'country', 'region'}:
            fail('invalid place precision')
        for key, limit in [('lat', 90), ('lon', 180)]:
            value = claim.get(key)
            if not isinstance(value, (float, int)) or isinstance(value, bool) or not -limit <= value <= limit:
                fail(f'invalid {key}')
        if claim.get('geographic_basis') != 'explicit':
            fail('location must be explicitly supported')
        if claim.get('reviewed_release_ids') and entity.get('type') != 'release':
            fail('sibling transfers must be release-scoped')
        if claim.get('reviewed_release_ids') and not claim.get('transfer_basis'):
            fail('cross-edition transfer requires a reviewed recording-equivalence basis')
        if claim.get('conflict_with'):
            fail('conflicting claims require resolution before acceptance')
        refs = claim.get('source_ids', [])
        if not refs:
            fail('at least one source required')
        for sid in refs:
            source = sources.get(sid, {})
            if source.get('retrieval') != 'read' or not source.get('checked_at'):
                fail(f'{sid}: source must have been read and dated, not only discovered')
            url = urlparse(source.get('url', ''))
            if url.scheme != 'https' or not url.netloc:
                fail(f'{sid}: valid HTTPS URL required')
            if source.get('type') not in {'discogs', 'official', 'archive', 'interview', 'publication'}:
                fail(f'{sid}: invalid source type')
            if not source.get('title') or not source.get('publisher'):
                fail(f'{sid}: source title and publisher required')
    for attempt in ledger.get('attempts', []):
        if attempt.get('stage') not in STAGES or attempt.get('outcome') not in OUTCOMES:
            errors.append('attempt: invalid stage or outcome')
        if not attempt.get('entity') or not attempt.get('checked_at') or not attempt.get('detail'):
            errors.append('attempt: entity, date and detail required')
        if attempt.get('outcome') in {'reviewed', 'no_relevant_evidence'} and not attempt.get('source_ids'):
            errors.append('attempt: reviewed source IDs required')
        if any(s not in sources for s in attempt.get('source_ids', [])):
            errors.append('attempt: source ID not found')
    return errors


def threads(ledger):
    artists, releases = {}, {}
    for c in ledger.get('claims', []):
        if c['decision'] != 'accepted':
            continue
        t = {k: c[k] for k in ('kind', 'relation', 'subject', 'label', 'lat', 'lon',
                               'precision', 'note', 'period', 'venue', 'coverage', 'track_positions') if k in c}
        t['source'] = ledger['sources'][c['source_ids'][0]]['url']
        t['research_claim_id'] = c['id']
        t['research_source_ids'] = c['source_ids']
        bucket = artists if c['entity']['type'] == 'artist' else releases
        for eid in [str(c['entity']['id'])] + [str(x) for x in c.get('reviewed_release_ids', [])]:
            bucket.setdefault(eid, []).append(t)
    return {'schema_version': 1, 'criteria': 'Reviewed explicit evidence; full provenance in research-ledger.json.',
            'artists': artists, 'releases': releases}


def report(collection, ledger, batch=None):
    artists, releases, masters = index(collection)
    accepted = [c for c in ledger.get('claims', []) if c.get('decision') == 'accepted']
    rows = []
    for rid, release in releases.items():
        # Artist-wide source checks are reusable, but cannot complete release-specific checks.
        checks = [a for a in ledger.get('attempts', []) if a['entity'] == f'release:{rid}']
        stages = {}
        for stage in STAGES:
            matches = [a for a in checks if a['stage'] == stage]
            stages[stage] = sorted({a['outcome'] for a in matches}) or ['not_checked']
        gaps = [s for s, states in stages.items() if not ({'reviewed', 'no_relevant_evidence', 'not_applicable'} & set(states))]
        questions = [q['question'] for q in ledger.get('open_questions', []) if str(q['release_id']) == rid]
        claims = [c['id'] for c in accepted if applicable(c, release, rid)]
        rows.append({'release_id': rid, 'title': release['title'], 'copy_count': len(release['copies']),
                     'claim_ids': claims, 'evidence_status': 'documented' if claims else 'not_yet_documented',
                     'research_status': 'checked_with_gaps' if gaps and checks else 'not_started' if not checks else 'checks_complete',
                     'stages': stages, 'gaps': gaps, 'open_questions': questions})
    selected = set(map(str, (batch or {}).get('release_ids', [])))
    batch_rows = [r for r in rows if r['release_id'] in selected]
    return {'schema_version': 1, 'collection_fingerprint': digest(collection['entries']),
            'counts': {'copies': len(collection['entries']), 'editions': len(releases),
                       'artists': len(artists), 'masters': len(masters),
                       'editions_with_new_evidence': sum(bool(r['claim_ids']) for r in rows),
                       'editions_checks_complete': sum(r['research_status'] == 'checks_complete' for r in rows),
                       'accepted_claims': len(accepted)},
            'batch': {'selected': len(selected), 'found': len(batch_rows),
                      'documented': sum(bool(r['claim_ids']) for r in batch_rows),
                      'checks_complete': sum(r['research_status'] == 'checks_complete' for r in batch_rows)},
            'records': rows}


def plan(collection, ledger):
    artists, releases, masters = index(collection)
    return {'schema_version': 1, 'collection_fingerprint': digest(collection['entries']),
            'artists': [{'entity': 'artist:'+aid, **a, 'reusable_evidence': any(
                c.get('decision') == 'accepted' and c['entity'] == {'type': 'artist', 'id': aid}
                for c in ledger.get('claims', []))} for aid, a in artists.items()],
            'releases': [{'entity': 'release:'+rid, **r,
                          'priority': len(r['copies']) + sum(len(artists.get(str(a['id']), {}).get('releases', [])) for a in r['artists']),
                          'discogs': {'release': f'https://api.discogs.com/releases/{rid}',
                                      'master': f'https://api.discogs.com/masters/{r["master_id"]}' if r['master_id'] else None},
                          'stages': list(STAGES)} for rid, r in releases.items()],
            'masters': masters,
            'policy': 'No name-only automatic joins. Review recording equivalence before transferring sibling credits. Cache source reads and research artists once; every edition retains its own checklist.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['plan', 'audit', 'validate', 'export'])
    p.add_argument('--collection', type=Path, default=ROOT/'source/collection.json')
    p.add_argument('--ledger', type=Path, default=ROOT/'source/research-ledger.json')
    p.add_argument('--batch', type=Path, default=ROOT/'source/research-batch-01.json')
    p.add_argument('--output', type=Path)
    args = p.parse_args()
    ledger = read(args.ledger) if args.ledger.exists() else {'sources': {}, 'claims': [], 'attempts': []}
    errors = validate(ledger)
    if errors:
        raise SystemExit('\n'.join(errors))
    if args.command == 'validate':
        print(f'Validated {len(ledger.get("claims", []))} claims and {len(ledger.get("sources", {}))} sources')
        return
    collection = read(args.collection)
    if args.command == 'plan':
        result = plan(collection, ledger)
    elif args.command == 'export':
        result = threads(ledger)
    else:
        result = report(collection, ledger, read(args.batch) if args.batch.exists() else None)
    if args.output:
        write(args.output, result)
        print(json.dumps(result.get('counts', {'written': str(args.output)})))
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
