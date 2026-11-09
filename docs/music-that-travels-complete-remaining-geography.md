# Music That Travels — Complete the remaining 257 musical-geography cases

**Purpose:** a single end-to-end completion task, not arbitrary small research batches. Last reconciled 9 November 2026.  
**Repository:** `studio-anelli/playground`, current work on `research/music-geography-completion-02` (PR #90); original design principles and project workflow are on `main`.

## Mission

Resolve **as many of the 257 outstanding saved collection copies as credible sources permit**. Do not call a task complete after five, ten or fifty examples. Cover the **whole input queue** and publish a comprehensive outcome file for every record, including remaining unknowns and why.

The frozen input is [`source/geography-completion-queue.json`](../lib/music-that-travels/source/geography-completion-queue.json). It contains all 257 presently unresolved copies with exact Discogs release IDs, `instance_id`, artist IDs, associated MusicBrainz status, and prior-research flags. The count is a **projection from existing accepted sources**, not a claim that every map build has already been verified.

Snapshot: 610 copies / 608 editions. Expected after the existing sources are built: 353 with documented artist/cultural geography, 257 unresolved.

**Read first:** root `AGENTS.md`, root `MANUAL.md`, `docs/music-that-travels-principles.md`, `docs/music-that-travels-roadmap.md`, `lib/music-that-travels/research/README.md`. Preserve the exploratory, non-encyclopedic creative goals.

## One systematic research pass

1. **Rebuild and verify the baseline.** Generate origin data from reviewed sources; run the existing tests; confirm exactly which records remain unlocated. Reconcile the generated list against the frozen queue and document any differences.
2. **Reuse accepted facts across exact IDs.** Existing artist associations, MusicBrainz, Wikidata external ID links and prior Discogs collector results are first-pass sources. Do not confuse titles with artists, namesakes with Discogs IDs, or same master with the exact release.
3. **Research every outstanding identity at least once.** Use bounded Discogs artist/release pages, official artist and label bios, first-party Bandcamp, reputable interviews, music journalism and specialist archives. Search relevant original editions where needed. Prefer reliable **musical base / formative scene / project formation / documented recording geography**, each with its own relation label. Do **not** use place of birth alone or nationality, genre, label headquarters, pressing country, shipping route or broad marketing copy as substitute for musical origin. Sources that only say artist 'based in' can support a **base** thread with correct time caveat.
4. **Specific treatment:** a `Various` compilation needs explicit compilation concept or individually verified track provenance; unidentified/white-label artists remain unknown unless identity supported. Collaboration claims stay attached to the matching participant. Unknowns may retain country- or region-level precision, but never artificially narrow it to a city.
5. **Adjudicate all records.** Write a machine-readable outcome for each of 257 release IDs: `accepted_geography`, `reviewed_no_evidence`, `identity_unresolved`, `compilation_scope_unresolved`, or `conflicting_evidence`. Each accepted relationship must name the exact artist or release, relation verb, place, precision, source URL, and any contextual limitations. Evidence state and last-checked timestamp are required.
6. **Update sources, not hand-edited outputs.** Add reviewed artist threads to `source/cultural-threads.json` or the research ledger; use appropriate release-scoped claims where needed. Regenerate derived `source/origin-collection.json` via `prepare-origins.py`, then `build.py` to publish the Worker payload. Keep source/derived consistency.
7. **Run regression and performance tests.** Verify 610 unique instances, 608 unique release editions, duplicate copy preservation, country vs music distinction, no false aliases, typed relationship labels, and full map eligibility. The unplaced shelf must retain every unresolved record.
8. **Measure everything once.** Save the final source-grounded report with totals, percent placed in each lens, both located, precision breakdown (city/region/country), and every unresolved case/reason. Do not combine recording geography with artistic associations without a label. Provide the exact preview URL and verify PR build success.
9. **One consolidated PR and report.** No recurring micro-PRs or repeated requests to 'go'. Keep interim checkpoints inside the task if necessary, but deliver the broad result as one reviewed integration.

## Safety and integrity

- The final metric is **maximally evidenced coverage**, not an artificially perfect 100%.
- The collection already contains all 610 copies in its data; absence of a geographic point is not exclusion from the experience.
- A source's unavailability is not evidence that a location is absent.
- No invented coordinates, false scope inheritance, or implicit transfer of master recording credits.
- No substantive model/UX change unless it is required to keep all records accessible. The **Unplaced records** shelf is a legitimate place for unresolved material.
- The 257 is an **initial queue** and must be reconciled with generated data before work. A completed review may leave honest unknowns.

## Concrete success output

- A committed structured outcome for all 257 initial release IDs.
- Reviewed, sourced associations for all reasonably resolvable cases.
- A regenerated map and tests passing on a GitHub/Cloudflare preview.
- A final coverage report with both successes and explicitly unresolved identities, ready for review and merge.
