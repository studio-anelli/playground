# Music That Travels — Geographic inventory 01

**Audited:** 9 November 2026  
**Source:** committed `lib/music-that-travels/source/` files on the research branch.  
**Collection snapshot fetched:** 7 November 2026, 13:47 UTC.  
**Existing edition audit:** 7 November 2026, 15:38 UTC.  
**Reproduce:** `node lib/music-that-travels/audit-geographic-coverage.mjs` (JSON with all unplaced entries and markets).

## Baseline

| Measurement | Count | % of 610 copies |
| --- | ---: | ---: |
| Collection copies | 610 | 100% |
| Unique release editions | 608 | — |
| Copies with an eligible edition market | 600 | 98.4% |
| Copies with at least one sourced music-geography thread | 329 | 53.9% |
| Copies with both | 324 | 53.1% |
| Edition only | 276 | 45.2% |
| Music only | 5 | 0.8% |
| Neither | 5 | 0.8% |

**Music**: 327 unique editions have sourced threads, 281 unique editions do not. The origin dataset contains **577 original geographic threads**. These include artist cultural connections, repertoire and recording evidence. They must not all be described as *recording locations* or *birthplaces*. For the edition lens, a known market denotes a documented release-market area, not where an individual record travelled or was manufactured.

**Collection identity:** 610 unique `instance_id` values; 608 unique release IDs. The two extra copies must remain visible rather than being deduplicated. Every origin record ID matches a saved collection edition.

### The 10 copies without a placeable edition market

Seven lack a recorded country; three describe broad multi-country markets:

| Release ID | Title | Reason |
| --- | --- | --- |
| 13487844 | Acid 88 Volume III | UK, Europe & US (multi-region) |
| 11065335 | Indian Acid / Pee Pee | Country missing |
| 21087580 | Black Encyclopedia Of The Air | Country missing |
| 22309528 | Illegal Jazz Vol. 1 | Country missing |
| 15146925 | Sissy's Hot Summer A Go-Go ! / Mrs.Peel We're Needed !!! | Country missing |
| 6022847 | Companionship E.P. | Country missing |
| 1492774 | I Feel Alright | Country missing |
| 11072824 | Secada Mondatta | USA & Canada (multi-region) |
| 16498374 | Spirit Attack | Country missing |
| 6912363 | Planets Of Life Or Death: Amiens '73 | UK, Europe & US (multi-region) |

**Do not convert multi-region markets to arbitrary countries.** Some of these should remain explicitly unplaced.

### Where to focus next

**A. Quick geographic completion:** verify the seven missing edition-country records against the *exact* owned edition. Never use the nearest sibling's country automatically.

**B. Music origin gap:** there are **281 copies / 281 editions** without a documented music-geography thread. The list is emitted by the audit script. The 26 `Various` records and two `Unknown Artist` records require release-specific handling; an artist-name shortcut is insufficient. Treat repeat artists and known scene identities as low-cost reuse opportunities, but never infer geography from genre or label.

**C. Triage before researching:** divide the unknown-music queue into (1) clear sourced match / reusable reviewed identity, (2) limited verification required, and (3) genuinely obscure or uncertain. Prefer broad basic mapping over deep provenance research in this phase.

**D. After placement:** move to light cultural context and only then selective, memorable connections. Keep the creative priority in [music-that-travels-principles.md](./music-that-travels-principles.md) and milestones in [music-that-travels-roadmap.md](./music-that-travels-roadmap.md).

## What this audit does *not* prove

- It does not establish a current live Discogs membership sync. The snapshot is dated 7 November.
- A cultural association is not automatically the location where a track was recorded or composed.
- The old `dataset-audit.json` field `music_eligible: 23` measures stricter recording-location eligibility, **not** the current cultural-thread map coverage. Do not substitute one figure for the other.
- These counts do not measure the number of compelling discoveries, or declare 281 records devoid of interesting history.
- No speculative origins have been added to the live map.

**Next action:** review the ten market exceptions and triage the 281 missing origins by evidence availability. Do not open another uniform deep-research cohort simply to increase research metrics.
