"""Fetch a bounded batch's editions, masters and main siblings; never accept claims."""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path
from pipeline import ROOT, read, write

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--collection', type=Path, default=ROOT/'source/collection.json')
p.add_argument('--batch', type=Path, default=ROOT/'source/research-batch-01.json')
p.add_argument('--cache', type=Path, default=Path('/tmp/mtt-discogs-research'))
p.add_argument('--cache-days', type=int, default=30)
p.add_argument('--refresh', action='store_true')
p.add_argument('--output', type=Path, default=ROOT/'source/research-discogs.json')
a = p.parse_args()
a.cache.mkdir(parents=True, exist_ok=True)
lock = threading.Lock()
next_request = 0.0


def fetch(entity):
    global next_request
    kind, ident = entity.split(':')
    url = f'https://api.discogs.com/{kind}/{ident}'
    file = a.cache/(kind+'-'+ident+'.json')
    if file.exists() and not a.refresh:
        cached = read(file)
        age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(cached['checked_at'])
        if age.total_seconds() < a.cache_days * 86400:
            return entity, cached
    # Public API budget: at most one request start every three seconds, shared by workers.
    with lock:
        delay = max(0, next_request-time.monotonic())
        next_request = max(next_request, time.monotonic())+3
    if delay:
        time.sleep(delay)
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'MusicThatTravelsResearch/1.0 (collection research)'})
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read()
        data = json.loads(raw)
        result = {'url': url, 'checked_at': stamp, 'status': 'retrieved',
                  'sha256': hashlib.sha256(raw).hexdigest(), 'data': data}
        write(file, result)
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        result = {'url': url, 'checked_at': stamp, 'status': 'unavailable', 'error': str(error)}
        # Do not cache transient failures as successful reads.
    print(entity, result['status'], flush=True)
    return entity, result


selected = set(map(str, read(a.batch)['release_ids']))
entries = {str(r['id']): r for r in read(a.collection)['entries'] if str(r['id']) in selected}
jobs = {f'releases:{rid}' for rid in entries}
jobs.update(f'masters:{r["master_id"]}' for r in entries.values() if r.get('master_id'))
results = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results.update(pool.map(fetch, sorted(jobs)))
    # Discogs main_release is a representative edition, not necessarily the first release.
    siblings = {f'releases:{r["data"]["main_release"]}' for key, r in results.items()
                if key.startswith('masters:') and r['status'] == 'retrieved' and r['data'].get('main_release')}
    results.update(pool.map(fetch, sorted(siblings-jobs)))
# Save only research-relevant metadata. Full responses stay in the resumable local cache.
fields = ('id', 'title', 'name', 'artists', 'main_release', 'master_id', 'uri', 'year',
          'released', 'country', 'extraartists', 'companies', 'labels', 'tracklist', 'urls')
observations = {}
for key, result in sorted(results.items()):
    item = {k: v for k, v in result.items() if k != 'data'}
    if 'data' in result:
        item['data'] = {k: v for k, v in result['data'].items() if k in fields}
        notes = result['data'].get('notes', '')
        item['notes_available'] = bool(notes)
        item['notes_sha256'] = hashlib.sha256(notes.encode()).hexdigest() if notes else None
    observations[key] = item
write(a.output, {'schema_version': 1, 'release_ids': sorted(selected),
                 'policy': 'Retrieved metadata is evidence to review, not automatic geographic claims. Main release is not guaranteed to be the original. Sibling credits require recording-equivalence review.',
                 'observations': observations})
print('Saved', len(observations), 'source observations to', a.output, flush=True)
