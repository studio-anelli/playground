"""Conservative, edition-scoped candidate relationships for music research.

This module does not scrape sources, establish sample identity, or publish claims.
It validates an evidence-review queue and proposes exact-ID shared-artist leads.
"""
import argparse
import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
TYPES = {'sample', 'cover', 'lyric_text', 'shared_contributor', 'influence', 'same_recording'}
STATES = {'candidate', 'verified', 'unresolved', 'contradicted'}
ROLES = {'artist', 'performer', 'producer', 'composer', 'arranger', 'engineer', 'remixer', 'other'}
EXCLUDED_IDS = {'194', '355', '118760'}  # Various, Unknown Artist, No Artist


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def owned_ids(collection):
    return {str(row['id']) for row in collection['entries']}


def is_https(url):
    try:
        parts = urlparse(url)
        return parts.scheme == 'https' and bool(parts.netloc)
    except (ValueError, TypeError):
        return False


def validate_queue(queue, collection, ledger):
    """Every candidate has a real owned endpoint and an explicit evidence boundary.

    Verified status here denotes human-adjudicated candidate research only.
    It is NOT a permission to publish the relationship or create geography.
    """
    errors, seen = [], set()
    owned = owned_ids(collection)
    sources = ledger.get('sources', {})
    if queue.get('schema_version') != 1:
        errors.append('unsupported relationship queue schema')
    for lead in queue.get('leads', []):
        lid = lead.get('id', '<missing>')
        def fail(why):
            errors.append(f'{lid}: {why}')
        if not isinstance(lid, str) or not lid.strip() or lid in seen:
            fail('missing or duplicate lead ID')
        seen.add(lid)
        if lead.get('relation') not in TYPES:
            fail('invalid relationship type')
        if lead.get('status') not in STATES:
            fail('invalid status')
        eps = lead.get('endpoints', [])
        if not isinstance(eps, list) or len(eps) != 2:
            fail('exactly two endpoints required')
            continue
        owned_count = 0
        for i, ep in enumerate(eps):
            if not isinstance(ep, dict) or ep.get('kind') not in {'owned_release', 'external_recording', 'external_work'}:
                fail(f'endpoint {i}: invalid kind')
                continue
            if ep.get('kind') == 'owned_release':
                rid = str(ep.get('release_id', ''))
                owned_count += 1
                if rid not in owned or not rid.isdigit():
                    fail(f'endpoint {i}: missing owned release ID')
            else:
                if ep.get('release_id'):
                    fail(f'endpoint {i}: external target cannot impersonate an owned release')
                if not ep.get('subject') or not ep.get('identity_basis'):
                    fail(f'endpoint {i}: name and identity basis required')
            if not ep.get('role') or ep['role'] not in ROLES:
                fail(f'endpoint {i}: reviewed role category required')
        if owned_count < 1:
            fail('at least one owned release endpoint required')
        if (lead.get('relation') in {'sample', 'cover', 'lyric_text', 'same_recording'}
                and not lead.get('track_scope')):
            fail('track/side/version scope required for repertoire or recording relation')
        if not isinstance(lead.get('question'), str) or not lead['question'].strip():
            fail('explicit research question required')
        refs = lead.get('source_ids', [])
        urls = lead.get('source_urls', [])
        if not refs and not urls:
            fail('source references or URLs required, even for unresolved leads')
        if any(s not in sources for s in refs):
            fail('unknown ledger source')
        if any(not is_https(u) for u in urls):
            fail('source URLs must be HTTPS')
        if lead.get('status') == 'verified':
            if not lead.get('identity_reviewed') or not lead.get('scope_reviewed'):
                fail('verified candidate needs independently reviewed identity and scope')
            if not refs or not all(sources[s].get('retrieval') == 'read' for s in refs if s in sources):
                fail('verified candidate requires dated read ledger sources')
        if lead.get('publish_to_map') or lead.get('auto_accept'):
            fail('candidate queue cannot publish directly')
    return errors


def shared_artist_leads(collection, ledger):
    """Bounded identity-safe artist overlaps; never equate performer with a sample.

    Exact release artist IDs only, excludes placeholder artists and the known
    release-specific alias exception. Produces prompts, not factual connections.
    """
    appearances = defaultdict(dict)
    excluded = {(str(exc.get('release_id')), str(exc.get('artist_id')))
                for exc in ledger.get('identity_exceptions', [])
                if exc.get('release_id') and exc.get('artist_id')}
    for row in collection.get('entries', []):
        rid = str(row['id'])
        for a in row.get('artists', []):
            aid = str(a.get('id', ''))
            if not aid.isdigit() or aid in EXCLUDED_IDS or (rid, aid) in excluded:
                continue
            appearances[aid][rid] = a.get('name', 'Unnamed')
    accepted = {frozenset(str(e['release_id']) for e in c['endpoints'])
                for c in ledger.get('connections', []) if c.get('decision') == 'accepted'
                and len(c.get('endpoints', [])) == 2}
    rejected = {frozenset(str(e['release_id']) for e in c['endpoints'])
                for c in ledger.get('connections', []) if c.get('decision') == 'rejected'
                and len(c.get('endpoints', [])) == 2}
    leads = []
    for aid, editions in sorted(appearances.items(), key=lambda kv: int(kv[0])):
        ordered = sorted(editions, key=int)
        for i, first in enumerate(ordered):
            for second in ordered[i+1:]:
                if frozenset((first, second)) in accepted | rejected:
                    continue
                leads.append({'artist_id': aid, 'release_ids': [first, second],
                              'artist_name': editions[first],
                              'relation': 'shared_billed_artist_lead',
                              'status': 'candidate',
                              'question': 'Confirm edition-specific roles, aliases and musical relationship; exact billed identity alone does not prove shared sessions or repertoire.'})
    return leads


def summary(queue, collection, ledger):
    errors = validate_queue(queue, collection, ledger)
    if errors:
        raise ValueError('\n'.join(errors))
    by_status = {s: sum(x['status'] == s for x in queue['leads']) for s in sorted(STATES)}
    by_type = {s: sum(x['relation'] == s for x in queue['leads']) for s in sorted(TYPES)}
    return {'queue_count': len(queue['leads']), 'by_status': by_status,
            'by_relation': by_type, 'unreviewed_shared_artist_leads':
                len(shared_artist_leads(collection, ledger)),
            'policy': 'Candidate research only: no automatic acceptance, no geography changes, no publication.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=['validate', 'summary', 'artist-leads'])
    p.add_argument('--collection', type=Path, default=ROOT/'source/collection.json')
    p.add_argument('--ledger', type=Path, default=ROOT/'source/research-ledger.json')
    p.add_argument('--queue', type=Path, default=ROOT/'source/relationship-leads.json')
    p.add_argument('--output', type=Path)
    args = p.parse_args()
    coll, ledger, queue = read(args.collection), read(args.ledger), read(args.queue)
    errors = validate_queue(queue, coll, ledger)
    if errors:
        raise SystemExit('\n'.join(errors))
    result = (shared_artist_leads(coll, ledger) if args.command == 'artist-leads'
              else summary(queue, coll, ledger))
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
