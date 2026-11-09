# Collection research method, version 0.3

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
5. **Audit:** record each source route and its outcome, with a question-specific stopping reason. A decisive first-party or institutional source can close a narrow route without visiting another archive; cite that evidence. A failed or unavailable lead stays visible. One corroborated relationship does not establish a complete musical history.

The earlier frozen policy is `method-02.json`; the third cohort adds `method-03.json`. `complete_with_limits` means a bounded review has stopped with recorded unknowns, not that all facts are known. Report source-route coverage, meaningful-context yield, reused evidence and unresolved scope separately. Generic profile place tags fail the stronger musical-context minimum.

Batch 01's ten deeper questions were revisited: two closed at city-level context and eight retain explicit limits. The deterministic holdout selects 25 placed and 25 unplaced editions before research. It supports meaningful context for 43/50, places 21 previously unplaced editions, and leaves seven below the context threshold. See `REPORT-02.md` and `source/research-metrics-02.json` for measured results, every case and remaining limits. `REPORT-01.md` is the historical method-0.1 snapshot.

## Data contracts

`source/research-ledger.json` is the reusable catalogue; each source distinguishes read, harvested, indexed-only and unavailable states. It also holds per-edition reviews, ten initial question outcomes, the bounded exception queue and one fingerprinted scope correction. It keeps accepted, pending, rejected and conflicting decisions separate. Only accepted claims with reviewed identity, explicit geography, dated source reads and valid precision can be projected. `coverage: partial` and `track_positions` qualify narrow recording claims. Short notes remain visible on the map; the full ledger retains provenance.

`source/research-discogs.json` and `source/research-discogs-02.json` contain bounded source observations, structured credits and note fingerprints; full notes remain in the local response cache rather than being republished. Retrieval alone never accepts a geographic fact. `source/research-batch-01.json` freezes the selected cohort. `source/research-audit.json` reports every edition in the intake, separately counting evidence and completed source checks. Its claim counts cover this method; individually rechecked existing threads are counted separately. `source/research-holdout-audit.json` exercises the fixed 50-entry standalone intake. Full map coverage is reported separately in `origin-collection.json`.

The first batch deliberately includes a multi-artist split single, a white-label EP, an expanded reissue, two editions of a compilation, regional-only recording information, three different recording-studio cases and two already-placed blues records. These are regression cases for identity, transfer and precision.

## Commands

From the repository root:

```sh
# A new collection needs entries containing id, instance_id, title, artists and optional master_id/labels/genres.
python lib/music-that-travels/research/pipeline.py plan --collection /path/to/collection.json --output /path/to/plan.json

# Explicit, bounded network collection for the chosen batch. Public API starts are spaced three seconds apart.
python lib/music-that-travels/research/collect-discogs.py --collection /path/to/collection.json --batch /path/to/batch.json --artists --output /path/to/discogs-observations.json

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
- Quality: every old claim retained, with any reviewed scope correction preserving its original fingerprint and an explicit reason; no implicit sibling transfer; no invented city for a regional source; no bonus-track coverage inferred from an original album; unavailable sources and unresolved conflicts remain visible.

Next validate an independent collection and instrument active source-review time. Source collection took 499.086 seconds for the 164-resource holdout, but this is not a total research-time benchmark. The method remains agent-assisted; a fully unattended complete-collection pass has not been demonstrated. Reviewed contributor connections now have a dedicated evidence model; sample/cover links require their own explicit source proof and are not inferred from shared genre or artist. See `REPORT-03.md` for current rollout limits.

## Context-aware third batch

`method-03.json` and `source/research-batch-03.json` freeze ten editions in each of five provisional research contexts before collection. Pools and ranking scores are preserved. Familiarity and obscurity remain review hypotheses; formats, source quality and geographic precision are separate dimensions. No-master metadata must not become a popularity score. The planner now retains formats/styles and emits format/provenance questions for mixed recordings, unofficial pressings, anthologies and remixes; context still needs adjudication.

The third cohort yields 43 useful musical contexts, seven follow-up cases and four contributor connections. Four other version checks are retained without inflating context yield. Fourteen selected editions and one additional edition gain geography. The complete map has 329 copies / 327 editions and 577 geographic threads. All 545 prior thread instances are unchanged. Only three editions have every source route closed: useful bounded findings do not close unavailable archive or official routes. See `REPORT-03.md` and `source/research-metrics-03.json`.

The ledger adds:

- `findings`: non-geographic musical context or separately labelled `version_scope` checks, with exact release, identity basis, scope and read sources. A map location is never required to retain a useful finding.
- `identity_exceptions`: release-specific exclusions from apparently stable artist IDs. Mancini & The Creepers must not reuse the unrelated Paris producer's identity.
- `connections`: accepted/rejected relationships between two exact owned editions, supported roles for both endpoints and source reads. `connections(collection, ledger)` excludes links when either edition is absent from a different collection.
- Per-review context qualifications and evidence reuse. Initial context assignments are never rewritten after seeing results.

`source/research-context-intake.json` exercises all fifty independently of the full collection. `source/research-discogs-03.json` holds 170 structured observations; `research-discogs-connections-03.json` records four additional owned endpoints, including a single with insufficient credits for an edge. `research-review-sessions-03.json` contains partial measured windows and their instrumentation limits. No total research-time or category-efficiency claim is supported yet.

The detail panel shows sourced “About this record” context and “In your collection” contributor bridges. `/api/geography` sends identical display threads once in `shared_threads`; a record's `threads` may contain an object or a shared key. `hydrateGeography` resolves keys once on load and fails on a missing key. Sources, notes, supporting claims and partial track scope survive. The payload is 682,284 bytes, below the earlier 694,399 bytes and unchanged 700,000-byte budget.

Validation:

```sh
python lib/music-that-travels/research/pipeline.py audit --collection lib/music-that-travels/source/research-context-intake.json --batch lib/music-that-travels/source/research-batch-03.json --output lib/music-that-travels/source/research-audit-03.json
python lib/music-that-travels/tests/research-contexts.py
# From lib/music-that-travels:
node tests/research-display.mjs
```

Next test a wholly independent collection using the same identity, role and scope contracts. Instrument source-reading intervals separately from implementation from the start, and retain unresolved cases rather than stretching facts to achieve full placement.

## Typed relationship discovery (candidate queue)

The separate `source/relationship-leads.json` queue stores **research questions**, not accepted musical facts. It currently seeds four leads from AUDIT-02: a Nuova Napoli cover and lyric-text adaptation, and sample leads for Moodymann and Kendrick Lamar. A candidate can refer to an external recording or work outside the owned collection; its exact source work or recording may still need confirmation.

The `relationships.py` helper validates endpoint identity, HTTPS source leads, relation type, and track/side/version scope for samples, covers, lyric-text use and identical recordings. It deliberately **cannot** write to the accepted research ledger, publish geography or imply that similar titles, styles, label countries or common artists prove a sample or shared session. A status of `verified` in the candidate queue means a later human review must have matched scoped identities and dated read evidence; even then, a separate ledger acceptance review is required.

From the repository root:

```sh
python lib/music-that-travels/research/relationships.py validate
python lib/music-that-travels/research/relationships.py summary
python lib/music-that-travels/research/relationships.py artist-leads --output /tmp/music-artist-leads.json
python lib/music-that-travels/tests/research-relationships.py
```

`artist-leads` compares exact billed artist IDs across owned editions and suppresses known accepted/rejected endpoint pairs, unknown/various artists and release-specific identity exclusions. These are low-confidence **review prompts**, not accepted contributor connections. In particular, a common billed artist is not evidence that two records used the same recording, producer, session or sample. Track-specific guest contributors need separate structured-credit research; the current identity pass cannot claim to discover them exhaustively.

A future evidence adjudication pass should write explicit accepted `sample`, `cover`, `lyric_text`, `shared_contributor`, `influence` and `same_recording` relationships with source independence, exact-version/track matching and appropriate external-work identifiers. The current code is intentionally offline and deterministic; it does not independently search music databases or validate a musical link by listening.

## Creative credits across collected editions

`research/credit-discovery.py` adds an offline, deterministic candidate scan across the four available structured Discogs observation sets. It checks **exact numeric contributor IDs** from `extraartists`, keeps specific edition/track role wording, and excludes artwork, mastering, pressing and related edition-production roles from the **musical** relationship pass. Output is *candidate prompts only*, not an accepted connection or geographic fact.

The bounded pilot documented in [CREDIT-DISCOVERY-01.md](CREDIT-DISCOVERY-01.md) uses the 93 owned editions available in the earlier source-observation subset, finding eight creative-role pair matches across four contributor identities. The batch-03 observations must be included for the full measured run; the pilot number is not the collection-wide total.

```sh
python lib/music-that-travels/research/credit-discovery.py --output /tmp/credit-leads.json
python lib/music-that-travels/tests/credit-discovery.py
python lib/music-that-travels/tests/research-relationships.py
```

Three new review leads are saved separately in `source/relationship-leads.json`: Shabaka Hutchings (Black Focus / Universal Beings), Nkono Teles (Only You / Love Vibration), and Pino Daniele (Nero A Metà / Stop Bajon). The review queue currently contains seven candidates, all unaccepted. The map, generated worker and original accepted ledger remain untouched.

This is a first structured-credit discovery route, **not** exhaustive research into samples, covers, remixes, group-member associations, or undocumented musicians. Those relationships still require separate searches and release-specific evidence.

## Full four-cohort creative-credit scan

The updated four-set pass is documented in [CREDIT-DISCOVERY-02.md](CREDIT-DISCOVERY-02.md). It covers **143 of 608 owned editions** represented by structured observations and detects **22 not-yet-reviewed creative-credit pairs** spanning **18 exact contributor identities**. The earlier 93-edition pilot remains a historical subset, not a measure of the whole collection.

Important improvements: exclude hyphenated executive-producer roles and suppress only the **specific contributor** already documented by an accepted link, rather than suppressing all people on the same pair of albums. This reveals seven further credited contributors on the Battiato pair and seven on the Nu Genea pair, while preserving the previously accepted Giusto Pio and two-musician Nu Genea bridges.

Next intake is **coverage expansion**, especially the 465 editions without structured release observations in these four research files. The count is a missing-source-inventory number, not a count of undocumented musical histories. Output remains a review queue; there is no automatic map publication.

## Next targeted credit-intake batch (04)

A frozen selection of **30 owned, previously unobserved editions** is recorded in `source/research-credit-intake-04.json`, with scope questions and an intake guide in [CREDIT-INTAKE-04.md](CREDIT-INTAKE-04.md). The selection deliberately covers jazz/funk, hip-hop, jungle, electronic and experimental music, historical recordings and two track-level compilations. It is not an unbiased benchmark.

This work also discovered a source-backed three-record network linking Steve Monite's `Only You` reissue, the owned `Doing It In Lagos` anthology and Nkono Teles' `Love Vibration`. Two new candidate leads are in `relationship-leads.json`, bringing the candidate queue to nine. Same-recording identity remains explicitly unresolved pending precise mix/take comparison.

The subsequent run successfully retrieved and checked all 30 editions, increasing observed release coverage to 173/608. Track-level credits are now included in contributor discovery, with exact track position and ancestry retained. See [CREDIT-DISCOVERY-04.md](CREDIT-DISCOVERY-04.md) for comparable counts, new leads and limitations. All findings remain research candidates; no automatic map publication occurs.
