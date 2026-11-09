# Collection research method, version 0.1

One collection intake produces a reusable evidence catalogue, geographic threads and an audit. The research is currently agent-assisted: these scripts organise source collection, validation and projection, but do not independently browse the web or adjudicate musical history. A new collection can be planned with the same interface; a fully unattended one-pass import has not been demonstrated.

## What is reused

- A copy is `instance_id`; an edition is the Discogs release ID; a master is an edition family. Keep every copy, but research an edition once.
- Artist claims use exact reviewed Discogs artist IDs. External identifiers accelerate research but are not prerequisites. Name matches are leads, never automatic identity joins. Resolve aliases, groups, collaborators and namesakes in release context.
- Recording and repertoire claims belong to a release. A shared master is a research lead, not permission to copy studio credits. Explicitly review the recording, track list, version, bonus tracks and claim scope before any sibling transfer.
- Source records have a URL, publisher, access method, checked date, original research summary and, where directly downloaded, a content hash. Full fetched pages are not shipped to the website.

## Research sequence and stopping conditions

1. **Discogs:** inspect the owned edition, artist identity, master, representative main edition, credits and notes. The main edition is not necessarily the original. Look beyond that bounded selection when important credits remain absent: original pressings, well-documented reissues, liner notes and scans. Batch 01 checked main siblings, not every available version or scan.
2. **Official documentation:** artist and label sites, verified artist/label Bandcamp releases, bios, credits and interviews. Distinguish an artist account from a label account. A label address, manufacturing country, remastering credit or generic profile location does not identify the recording location. A reviewed artist's explicit self-description may support an artist association, with its date and limitations stated.
3. **Archives and specialist sources:** choose the relevant collection, institution, oral history or discography for each question. Smithsonian Folkways, Cornell Hip Hop Collection, National Jazz Archive and Library of Congress are starting points, not universal data feeds. A general archive homepage does not substantiate an artist fact. Follow through to the relevant document or recording.
4. **Adjudicate:** record the relationship, subject, place precision, period, claim scope and supporting source. Separate direct evidence from interpretation. Keep conflicting claims unpublished until resolved. Do not infer a birthplace, recording address or cultural lineage from nationality or genre.
5. **Audit:** all prescribed source stages must have an explicit outcome. Missing and unavailable stages stay gaps even if some evidence exists. `no_relevant_evidence` means a source was inspected and did not answer the question; `not_applicable` requires a specific reason, never a generic shortcut. Finding one place does not complete research.

Batch 01 remains `checked_with_gaps`: it documents all 40 selected editions, but archive stages and ten deeper release questions remain open. This is a first pass for testing the method, not a claim that the collection or these artists' histories are exhaustively researched.

## Data contracts

`source/research-ledger.json` is the reviewed, reusable catalogue. It keeps accepted, pending, rejected and conflicting decisions separate. Only accepted claims with reviewed identity, explicit geography, dated source reads and valid precision can be projected. `coverage: partial` and `track_positions` qualify narrow recording claims. Short notes remain visible on the map; the full ledger retains provenance.

`source/research-discogs.json` contains bounded source observations, structured credits and note fingerprints; full notes remain in the local response cache rather than being republished. Retrieval alone never accepts a geographic fact. `source/research-batch-01.json` freezes the selected cohort. `source/research-audit.json` reports every edition in the intake, separately counting evidence and completed source checks. Its evidence counts cover this new method's claims; legacy map coverage is reported separately in `origin-collection.json`.

The first batch deliberately includes a multi-artist split single, a white-label EP, an expanded reissue, two editions of a compilation, regional-only recording information, three different recording-studio cases and two already-placed blues records. These are regression cases for identity, transfer and precision.

## Commands

From the repository root:

```sh
# A new collection needs entries containing id, instance_id, title, artists and optional master_id/labels/genres.
python lib/music-that-travels/research/pipeline.py plan --collection /path/to/collection.json --output /path/to/plan.json

# Explicit, bounded network collection for the chosen batch. Public API starts are spaced three seconds apart.
python lib/music-that-travels/research/collect-discogs.py --collection /path/to/collection.json --batch /path/to/batch.json --output /path/to/discogs-observations.json

# Research and adjudicate the ledger, then validate and audit it.
python lib/music-that-travels/research/pipeline.py validate
python lib/music-that-travels/research/pipeline.py audit --output lib/music-that-travels/source/research-audit.json
python lib/music-that-travels/research/pipeline.py export --output /path/to/reviewed-threads.json

# Update the existing map only after evidence review. No research network calls run on page load.
python lib/music-that-travels/prepare-origins.py
python lib/music-that-travels/build.py
python lib/music-that-travels/tests/research-method.py
```

All pipeline commands accept `--collection` and `--ledger`; audit accepts `--batch`. With no ledger, planning and auditing produce a truthful empty-evidence report. The Discogs collector resumes a URL cache, refreshes observations older than 30 days by default, supports `--refresh`, and records retrieval failures without converting them into absent musical history. Raw response caches stay outside the repository.

## How we evaluate the method

- Evidence yield: additional documented copies/editions and meaningful relationships, with a baseline comparison.
- Research coverage: source-stage outcomes and unanswered questions, independent of placement counts.
- Reuse: unique artist work versus the editions/copies benefiting from it; a second collection must reuse accepted identities without importing unrelated namesakes.
- Cost: unique resources retrieved, cache reuse and collection timestamps. Batch 01 includes 82 unique Discogs observations; human review time was not instrumented and is not estimated.
- Quality: every old claim preserved; no implicit sibling transfer; no invented city for a regional source; no bonus-track coverage inferred from an original album; unavailable sources and unresolved conflicts remain visible.

Next iterations should complete the archive questions, instrument review time, add explicit sample/cover relationships between recordings, and exercise an independent collection end to end. These are development milestones, not guarantees already delivered by version 0.1.
