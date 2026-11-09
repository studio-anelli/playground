# Music That Travels — Geographic completion continuation

After merging the principles and inventory into `main` in PR #89, this branch extends the collection-wide effort using source-backed artist associations. The full collection remains visible; this work adds *meaningful musical geography*, not claims of recording addresses.

## Seven collection copies, five sourced artist IDs

| Artist and exact Discogs ID | Owned releases | Geographic association | Evidentiary limits |
| --- | --- | --- | --- |
| DJ Deeon, 1665 | *D.B.G. II Project*, 5359677 | Chicago — early South Side house/ghetto-house scene | [AllMusic biography](https://www.allmusic.com/artist/dj-deeon-mn0000663868). No recording location inferred. |
| Luke Vibert, 253 | *Arcadia*, 11664305 | Cornwall — formative musical development | [Official artist biography](https://lukevibert.com/bio/). Current London base is separate. |
| Bottin, 1181868 | *Artifact 14*, 17614633 | Venice — artist base | [Slow Motion artist biography](https://www.slowmotionmusic.it/project/bottin/). Not the location of a specific edit or source recording. |
| Morphosis, 417641 | *Dismantle / Music For Vampyr*, 4635217 and *Gods Of Phoenicia 1/2*, 951387 | Lebanon — early DJ roots | [Morphine Records biography](https://morphinerecords.com/artists/rabih-beaini). Subsequent Italy/Berlin activity remains distinct. |
| DJ Sotofett, 1158290 | *Okada / So-Phat Riddimix Is Junglized*, 5151626 and *Sputters*, 19316317 | Moss, Norway — youth and formative record culture | [Mixmag interview](https://mixmag.net/feature/dj-sotofett-mix-interview-in-session-sex-tags-mania). Does not locate collaborators' recordings. |

Source edits: `lib/music-that-travels/source/cultural-threads.json`. Regressions: `lib/music-that-travels/tests/cultural-threads.mjs`.

## Status and accounting

The previously merged pipeline is configured to regenerate geographic associations from source during the build. This branch adds seven *previously unplaced copies* to the prior projected 346, yielding **353/610 projected** after a successful build, with **257 missing**. These are projections until verified in the generated data/preview; the saved `origin-collection.json` itself is not manually edited.

The `full-geography-sweep.mjs` in `main` remains the collection-wide queue tool. The next work should consume its whole unresolved inventory and prioritise provenance reuse and sources systematically, not an arbitrary sequence of deep-research cohorts.

No Discogs membership sync was performed; source snapshot remains 7 November 2026. Unverifiable origins must remain unknown. There is no claim that every recording was produced at its artist's associated place.
