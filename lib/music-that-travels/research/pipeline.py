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
                             'labels': row.get('labels', []), 'genres': row.get('genres', []),
                             'formats': row.get('formats', []), 'styles': row.get('styles', [])}
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
    if str(rid) in list(map(str, claim.get('excluded_release_ids', []))):
        return False
    scope = claim['entity']
    if scope['type'] == 'artist':
        return any(str(a['id']) == str(scope['id']) for a in release['artists'])
    # Recording/repertoire claims are edition-scoped unless sibling transfer was reviewed.
    return rid in ([str(scope['id'])] + [str(x) for x in claim.get('reviewed_release_ids', [])])


def validate(ledger):
    """Fail closed: reviewed identity and direct evidence are required for projection."""
    errors = []
    sources = ledger.get('sources', {})
    def reviewed_source(sid):
        source = sources.get(sid, {})
        url = urlparse(source.get('url', ''))
        return (source.get('retrieval') == 'read' and source.get('checked_at')
                and source.get('title') and source.get('publisher')
                and source.get('type') in {'discogs', 'official', 'archive', 'interview', 'publication'}
                and url.scheme == 'https' and bool(url.netloc))
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
        if ledger.get('method_version') in {'0.2', '0.3'} and attempt.get('outcome') == 'not_applicable' and not attempt.get('source_ids'):
            errors.append('attempt: a closed route needs cited evidence and a specific reason')
    findings = {}
    for finding in ledger.get('findings', []):
        fid = finding.get('id')
        if not fid or fid in findings:
            errors.append('finding: unique ID required')
        findings[fid] = finding
        if finding.get('decision') != 'accepted':
            continue
        if (not str(finding.get('release_id', '')).isdigit() or not finding.get('summary')
                or not finding.get('scope') or not finding.get('identity_basis') or not finding.get('checked_at')
                or finding.get('musical_value') not in {'formation', 'scene', 'training', 'career', 'session', 'tradition', 'production', 'repertoire', 'version_scope'}):
            errors.append('finding: reviewed release, musical value and scope required')
        if not finding.get('source_ids') or any(not reviewed_source(s) for s in finding.get('source_ids', [])):
            errors.append('finding: dated read evidence required')
    for exception in ledger.get('identity_exceptions', []):
        if not exception.get('release_id') or not exception.get('excluded_artist_ids') or not exception.get('reason') or not exception.get('source_ids'):
            errors.append('identity exception: release, excluded identities and evidence required')
        if any(not reviewed_source(s) for s in exception.get('source_ids', [])):
            errors.append('identity exception: dated read sources required')
        rid = str(exception.get('release_id'))
        for claim in ledger.get('claims', []):
            if claim.get('decision') == 'accepted' and claim.get('entity', {}).get('type') == 'artist' and str(claim['entity']['id']) in exception.get('excluded_artist_ids', []):
                if rid not in list(map(str, claim.get('excluded_release_ids', []))):
                    errors.append('identity exception: artist-wide claim must exclude the disputed release')
    connection_ids = set()
    for connection in ledger.get('connections', []):
        cid = connection.get('id')
        if not cid or cid in connection_ids:
            errors.append('connection: unique ID required')
        connection_ids.add(cid)
        if connection.get('decision') != 'accepted':
            continue
        endpoints = connection.get('endpoints', [])
        if (len(endpoints) != 2 or len({str(e.get('release_id')) for e in endpoints}) != 2
                or any(not str(e.get('release_id', '')).isdigit() or not e.get('role') or not e.get('identity_basis') for e in endpoints)):
            errors.append('connection: two distinct reviewed release endpoints and roles required')
        if connection.get('relation') not in {'shared_contributor', 'shared_session', 'documented_sample', 'shared_repertoire', 'musical_network'}:
            errors.append('connection: explicit musical relationship required; genre/city similarity is insufficient')
        if not all(connection.get(k) for k in ('subject', 'summary', 'scope', 'checked_at')):
            errors.append('connection: subject, summary, scope and review date required')
        if not connection.get('source_ids') or any(not reviewed_source(s) for s in connection.get('source_ids', [])):
            errors.append('connection: dated read evidence required')
        for endpoint in endpoints:
            if not endpoint.get('source_ids') or any(s not in connection.get('source_ids', []) or sources.get(s, {}).get('retrieval') != 'read' for s in endpoint.get('source_ids', [])):
                errors.append('connection: each endpoint needs its own cited role evidence')
    claims_by_id = {c['id']: c for c in ledger.get('claims', [])}
    reviewed = set()
    for review in ledger.get('reviews', []):
        rid = str(review.get('release_id', ''))
        if rid in reviewed or not rid.isdigit():
            errors.append('review: unique stable release ID required')
        reviewed.add(rid)
        if review.get('decision') not in {'complete', 'complete_with_limits', 'needs_followup'}:
            errors.append('review: invalid decision')
        if not all(review.get(k) for k in ('identity_basis', 'scope_review', 'stop_reason', 'checked_at', 'source_ids')):
            errors.append('review: identity, scope, sources, stop reason and date required')
        if any(s not in sources for s in review.get('source_ids', [])):
            errors.append('review: unknown source')
        if any(findings.get(fid, {}).get('decision') != 'accepted' or str(findings[fid].get('release_id')) != rid for fid in review.get('finding_ids', []) + review.get('scope_finding_ids', [])):
            errors.append('review: finding must be accepted and apply to this edition')
        if any(findings.get(fid, {}).get('musical_value') == 'version_scope' for fid in review.get('finding_ids', [])):
            errors.append('review: version checks alone are not meaningful musical context')
        context = [claims_by_id.get(cid, {}) for cid in review.get('meaningful_claim_ids', [])]
        if any(c.get('decision') != 'accepted' or c.get('musical_value') not in
               {'formation', 'scene', 'training', 'career', 'session', 'tradition'} for c in context):
            errors.append('review: meaningful context must reference accepted musical evidence, not a profile tag')
        for claim in context:
            entity = claim.get('entity', {})
            if entity.get('type') == 'release' and rid not in [str(entity.get('id'))] + list(map(str, claim.get('reviewed_release_ids', []))):
                errors.append('review: claim does not apply to this edition')
            if entity.get('type') == 'artist' and str(entity.get('id')) not in review.get('artist_ids', []):
                errors.append('review: artist claim does not match a credited main artist')
        if review.get('decision') == 'complete' and review.get('limits'):
            errors.append('review: unresolved limits cannot be marked complete')
        checked_stages = {a['stage'] for a in ledger.get('attempts', []) if a.get('entity') == 'release:'+rid}
        if review.get('decision') in {'complete', 'complete_with_limits'} and set(STAGES) - checked_stages:
            errors.append('review: completed review needs an explicit outcome for every source route')
        reuse = review.get('reused_evidence', [])
        if set(review.get('reused_thread_ids', [])) != {r.get('thread_id') for r in reuse}:
            errors.append('review: reused threads require individually reviewed evidence')
        for reused in reuse:
            refs = reused.get('source_ids', [])
            if (not refs or any(sources.get(s, {}).get('retrieval') != 'read' for s in refs)
                    or reused.get('musical_value') not in {'formation', 'scene', 'training', 'career', 'session', 'tradition'}
                    or len(reused.get('thread_sha256', '')) != 64):
                errors.append('review: reuse needs a source read, musical value and exact thread fingerprint')
    for correction in ledger.get('corrections', []):
        if not correction.get('reason') or not correction.get('thread_id') or not correction.get('source_ids'):
            errors.append('correction: target, evidence and reason required')
        if any(s not in sources for s in correction.get('source_ids', [])):
            errors.append('correction: unknown source')
        if set(correction.get('patch', {})) - {'note', 'coverage', 'track_positions'}:
            errors.append('correction: only documented scope qualifications may patch an existing thread')
        if not correction.get('prior_thread') or digest(correction['prior_thread']) != correction.get('prior_thread_sha256'):
            errors.append('correction: original thread and exact fingerprint required')
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
        if c.get('excluded_release_ids'):
            t['excluded_release_ids'] = c['excluded_release_ids']
        bucket = artists if c['entity']['type'] == 'artist' else releases
        for eid in [str(c['entity']['id'])] + [str(x) for x in c.get('reviewed_release_ids', [])]:
            bucket.setdefault(eid, []).append(t)
    return {'schema_version': 1, 'criteria': 'Reviewed explicit evidence; full provenance in research-ledger.json.',
            'artists': artists, 'releases': releases}


def connections(collection, ledger):
    """Only export a reviewed relationship when both endpoint editions are owned."""
    owned = set(index(collection)[1])
    return [c for c in ledger.get('connections', []) if c.get('decision') == 'accepted'
            and all(str(e['release_id']) in owned for e in c['endpoints'])]


def research_route(release):
    """Format and provenance guide questions, never an inferred popularity rank."""
    descriptions = {d.lower() for f in release.get('formats', []) for d in f.get('descriptions', [])}
    questions = ['Verify exact credited identities and roles; exclude namesakes.',
                 'Keep artist career, musical references, edition market and sessions separate.',
                 'Look for a documented contributor, repertoire or production connection to another owned edition.']
    if not release.get('master_id'):
        questions.append('No master linked: inspect catalogue, version and credited roles before any sibling transfer.')
    if 'mixed' in descriptions:
        questions.append('Separate the DJ/curator from the individual recordings and their producers.')
    if 'unofficial release' in descriptions:
        questions.append('Separate the underlying recording from unverified pressing or transfer provenance.')
    if 'compilation' in descriptions:
        questions.append('Review original recordings and track-specific dates; do not assign one session to the anthology.')
    if any('remix' in s.lower() for s in [release.get('title', '')] + release.get('styles', [])):
        questions.append('Keep original artists and each remixer separate; verify which versions the owned disc contains.')
    return {'format_descriptions': sorted(descriptions),
            'context_status': 'requires_context_review',
            'policy': 'A 12-inch is not automatically an EP; no-master is not an obscurity or confidence score.',
            'questions': questions}


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
        review = next((r for r in ledger.get('reviews', []) if str(r['release_id']) == rid), None)
        status = 'checked_with_gaps' if gaps and checks else 'not_started' if not checks else 'checks_complete'
        if review:
            # A bounded review is a stopping decision, never an assertion that all facts are known.
            status = review['decision']
        elif questions and status == 'checks_complete':
            status = 'checked_with_questions'
        rows.append({'release_id': rid, 'title': release['title'], 'copy_count': len(release['copies']),
                     'claim_ids': claims, 'evidence_status': 'documented' if claims else 'not_yet_documented',
                     'research_status': status,
                     'meaningful_context': bool(review and (review.get('meaningful_claim_ids') or review.get('reused_thread_ids') or review.get('finding_ids'))),
                     'review': review, 'stages': stages, 'gaps': gaps, 'open_questions': questions})
    selected = set(map(str, (batch or {}).get('release_ids', [])))
    batch_rows = [r for r in rows if r['release_id'] in selected]
    context_counts = {}
    for row in batch_rows:
        context = (batch or {}).get('assignments', {}).get(row['release_id'], {}).get('research_context')
        if context:
            group = context_counts.setdefault(context, {'selected': 0, 'meaningful_context': 0, 'needs_followup': 0, 'reused_reviews': 0})
            group['selected'] += 1
            group['meaningful_context'] += int(row['meaningful_context'])
            group['needs_followup'] += int(row['research_status'] == 'needs_followup')
            group['reused_reviews'] += int(bool((row['review'] or {}).get('reused_thread_ids') or (row['review'] or {}).get('reused_claim_ids')))
    return {'schema_version': 1, 'collection_fingerprint': digest(collection['entries']),
            'contexts': context_counts, 'connections': connections(collection, ledger),
            'counts': {'copies': len(collection['entries']), 'editions': len(releases),
                       'artists': len(artists), 'masters': len(masters),
                       'editions_with_new_evidence': sum(bool(r['claim_ids']) for r in rows),
                       'editions_checks_complete': sum(not r['gaps'] for r in rows),
                       'bounded_reviews_complete': sum(r['research_status'] in {'complete', 'complete_with_limits'} for r in rows),
                       'accepted_claims': len(accepted)},
            'batch': {'selected': len(selected), 'found': len(batch_rows),
                      'documented': sum(bool(r['claim_ids']) for r in batch_rows),
                      'checks_complete': sum(not r['gaps'] for r in batch_rows),
                      'source_routes_accounted': sum(all('not_checked' not in states for states in r['stages'].values()) for r in batch_rows),
                      'bounded_reviews_complete': sum(r['research_status'] in {'complete', 'complete_with_limits'} for r in batch_rows),
                      'meaningful_context': sum(r['meaningful_context'] for r in batch_rows),
                      'with_limits': sum(bool(r.get('review', {}).get('limits')) for r in batch_rows if r.get('review'))},
            'records': rows}


def plan(collection, ledger):
    artists, releases, masters = index(collection)
    return {'schema_version': 1, 'collection_fingerprint': digest(collection['entries']),
            'artists': [{'entity': 'artist:'+aid, **a, 'reusable_evidence': any(
                c.get('decision') == 'accepted' and c['entity'] == {'type': 'artist', 'id': aid}
                for c in ledger.get('claims', []))} for aid, a in artists.items()],
            'releases': [{'entity': 'release:'+rid, **r,
                          'research_route': research_route(r),
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
