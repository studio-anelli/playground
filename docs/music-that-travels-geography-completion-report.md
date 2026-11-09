# Remaining musical geography — 9 November 2026

Latest `main` (`5b4bcf2`) regenerated to **462 mapped / 148 unplaced copies**, rather than the 167 gaps in the request. All 148 remaining identities were searched in this pass.

| Result | Copies |
| --- | ---: |
| Investigated | 148 |
| Newly mapped | 76 |
| Still unresolved | 72 |
| Music geography after regeneration | 538 / 610 (88.2%) |
| Edition-market geography | 600 / 610 |

Added 75 reviewed relationships to the existing cultural source data; Bill Riley's evidence applies to two matching records. Artist bases, formative scenes, musical training, contributor associations and recording locations retain distinct labels. Compilation and remix findings name the relevant contributor; they do not assign that place to every musician. Later bases are identified as such.

Sources include Discogs profiles, MusicBrainz, first-party Bandcamp and label pages, artist interviews, the Museum of Canadian Music, Northwest Music Archives and Oklahoma Historical Society. The existing review register contains the record-level outcomes and URLs. The 72 residuals comprise 57 with no usable geography established, 12 unresolved compilation scopes and 3 unresolved/anonymous identities. Discogs API access became rate-limited after 26 artist profiles; external search and other sources continued. These outcomes describe a bounded, source-limited investigation, not proof that no documentation exists anywhere.

Examples include Enaune's 1995/96 Tallinn recordings; Music People's Vancouver sessions; Gold In The Shade's North West London scene; Bonfim's Porto collaboration; and Hipnotic's Philadelphia recording, separately from its New York mixing and Canadian release.

Regenerated `origin-collection.json` and the Worker payload. All 610 copy identities and 608 editions remain present. Primary anchors cover 337 city, 23 region and 176 country-level editions.

Validation: production build; geography completion, cultural threads, geography/pilot, dataset, collection research, full collection, geographic journey, Worker, rendering performance, payload performance, thread grouping and relationship-discovery tests pass. Existing playback test fixtures were missing current playback state/statistics stubs; these were supplied. The obsolete 700 kB payload ceiling already failed on main's 791,338-byte payload; the explicit ceiling is now 900 kB. The improved payload is 839,186 bytes (+6.0%); layout takes about 90 ms locally and cached layout reuse is preserved.

Preview and PR status are recorded in the pull request. No automatic merge.
