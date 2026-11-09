# Geographic coverage — collection-wide sweep, continuation

**9 November 2026.** This document is a progress record, not a claim of completed research across every missing artist or live deployment.

## Objective

Bring the 269 estimated missing cultural/geographic associations as close to zero as evidence responsibly permits, while keeping all 610 copies in the experience. No replacement of an artist's musical origins with a release market, guessed nationality, generic genre location, label headquarters or physical shipping story.

## Collection-wide method

`full-geography-sweep.mjs` now scans every record without a placed music association, cross-referencing saved collection identity, already placed artist IDs, the research ledger, exact Wikidata cross-links and MusicBrainz area evidence. It outputs a full unresolved queue rather than selecting a small batch. This inventory does **not** independently browse artists' archives, and its categories do **not** count as source verification.

`prepare-collection-research.py` had a material coverage blind spot: when MusicBrainz returned an artist's specific city followed by a region/country hierarchy, the importer skipped that artist unless exactly one area label existed. The revised importer accepts only manually reviewed anchors from `reviewed-area-anchors.json`, retains each relation's real precision and never treats the broader labels as competing places.

Six identity-linked artist-area cases have existing MusicBrainz evidence:

| Exact artist | Owned release | Area relationship |
| --- | --- | --- |
| Heiko Laux | Klockworks 17 (8008359) | Berlin |
| Jocelyn Brown | Sing (1596994) | London |
| Mark de Clive-Lowe | Dreamweavers (16125100) | Los Angeles |
| Marlon Hoffstadt | Smile (7972280) | Berlin |
| Positive Force | We Got The Funk (516050) | Pennsylvania — region |
| Nicolette | Nightmare (97579) | London |

All six have exact Discogs identity links; these are **MusicBrainz artist associated areas**, not track/recording locations or artist residences at the edition's release date. Jocelyn Brown's *Sing* already gains a Bristol thread through Roni Size elsewhere in this PR, so that addition enriches its relation list rather than creating another previously unplaced copy.

## Coverage accounting

The earlier three passes would bring the saved baseline of 329 placed copies to 341. The five **additional** newly placeable records above would raise the expected total to **346 of 610**, leaving **264** without a sourced music-geography association. This remains a **projection**, requiring regenerated source and a passing build. It is not a claim of having solved all 269, a promise of near-zero, or a production statistic.

## What remains

- Execute and verify the repository build/checks. The build now regenerates reviewed MusicBrainz/Wikidata sources before geographical threads.
- Run the sweep against the generated dataset and inspect its **full unresolved queue**. Existing exact identifiers may lead to additional sources, but absence of an area field is not proof of absent musical roots.
- Conduct a **single comprehensive source-discovery effort** across the outstanding queue, using identity-safe first-party, specialist and archival sources; do not turn it into arbitrary cohorts.
- Treat anonymous releases, compilations, collaborations, sample/reissue relationships, and genuinely undocumented records explicitly. Unknown remains a valid output.
- Improve visual discoverability of unresolved records rather than assigning artificial coordinates.

Success should be reported as **all copies accessible** plus a transparent count of **sourced musical associations**, not a forced 100% geographic number.

## References

Source files: `source/collection.json`, `source/origin-collection.json`, `source/musicbrainz-area-evidence.json`, `source/wikidata-collection-evidence.json`, `source/collection-research.json`, and `source/research-ledger.json`. Scripts and reviewed anchors live alongside these. No external browsing has been run by the sweep script.
