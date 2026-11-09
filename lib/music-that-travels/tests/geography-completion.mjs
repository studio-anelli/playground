// Evidence integrity contract for the entire frozen geography queue.
// This tests source identity and projections without inventing historical facts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = new URL('../source/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const queue = read('geography-completion-queue.json');
const review = read('geography-completion-review-register.json');
const claims = read('cultural-threads.json');
const collection = read('collection.json');
const origins = read('origin-collection.json');
const saved = collection.entries;
assert.equal(saved.length, 610, 'all saved copies stay in collection');
assert.equal(new Set(saved.map(e => e.instance_id)).size, 610);
assert.equal(new Set(saved.map(e => e.id)).size, 608, 'duplicate physical copies preserved');
assert.equal(queue.records.length, 257);
assert.equal(review.records.length, 257);
const qById = new Map(queue.records.map(x => [String(x.release_id), x]));
assert.equal(qById.size, 257, 'one frozen record per edition');
let accepted = 0, pending = 0, distinctArtistIds = new Set(), types = new Set();
for (const row of review.records) {
  const sourceRow = qById.get(String(row.release_id));
  assert.ok(sourceRow, 'all reviews belong to queue');
  assert.equal(row.instance_id, sourceRow.instance_id, 'copy identity retained');
  const exact = [
    ...sourceRow.artist.flatMap(a => (claims.artists[String(a.id)] || []).map(t => ({...t, artist_id:a.id}))),
    ...(claims.releases[String(row.release_id)] || [])
  ];
  if (exact.length) {
    accepted += 1;
    assert.equal(row.outcome, 'accepted_geography');
    assert.ok(row.accepted_geography?.length, 'accepted claims in review register');
    assert.ok(origins.records[String(row.release_id)], 'accepted claims projected to generated map');
    for (const t of exact) {
      assert.ok(['artist', 'recording', 'repertoire'].includes(t.kind), 'typed relationship');
      assert.ok(['city','region','country'].includes(t.precision), 'specificity');
      assert.ok(Number.isFinite(t.lon) && Math.abs(t.lon)<=180);
      assert.ok(Number.isFinite(t.lat) && Math.abs(t.lat)<=90);
      assert.ok(t.subject && t.relation && t.label && /^https:\/\//.test(t.source), 'evidenced identity and relation');
      if (t.kind === 'recording') assert.ok(t.note?.length > 20,'recording needs exact scope caveat');
      types.add(t.kind);
      if (t.artist_id) distinctArtistIds.add(t.artist_id);
    }
  } else {
    pending += 1;
    assert.equal(row.outcome, 'verification_pending');
    assert.equal(row.evidence_state, 'not_adjudicated');
  }
}
assert.equal(accepted + pending, 257);
assert.equal(review.outcome_counts.accepted_geography, accepted);
assert.equal(review.outcome_counts.verification_pending, pending);
assert.equal(new Set(Object.keys(origins.records)).size, origins.distinct_editions);
assert.equal(origins.copy_count, saved.filter(e => Boolean(origins.records[String(e.id)])).length);
console.log(JSON.stringify({queue:257,accepted,pending,artistIds:distinctArtistIds.size,relationshipTypes:[...types],mapped:origins.copy_count,unplaced:saved.length-origins.copy_count}));
