# Music That Travels — Geographic completion batch 02

**Date:** 9 November 2026  
**Status:** Source claims and regression checks committed to PR #89; generated data and Cloudflare deployment await a successful build.

## Editorial goal

Improve basic geographic availability using directly attributable artist bases and musical roots, not exhaustive research. Keep exact recording locations unknown unless release-specific evidence exists. Preserve every copy on the map or in the explicit unplaced shelf.

## Newly sourced artist threads

| Discogs artist ID | Owned release ID | Subject | City | Relation | Supporting evidence |
| --- | ---: | --- | --- | --- | --- |
| 17217 | 8707425 | Shinichi Atobe, *World* | Saitama, Japan | Electronic artist based in | [Space Shower Music artist biography](https://music.spaceshower.jp/contents/1041416) explicitly lists Atobe's Saitama base and *World* (2016) |
| 2576696 | 8290274 | Frits Wentink, *BODOMRGWLD01* | Amsterdam, Netherlands | Artist based in | [Artist's official Bandcamp profile](https://fritswentink.bandcamp.com/) identifies Amsterdam as the account location |
| 298930 | 13289860 | B.B. Seaton, *Jah Help Those Who Help Themselves / Aware Of Love* | Kingston, Jamaica | Early musical roots in | [The Gaylads / Studio One Bandcamp biography](https://thegaylads.bandcamp.com/album/soul-beat) identifies Kingston-born Seaton and his Jamaican early-career recordings |
| 53036 | 8205159 | Vivien Goldman, *Resolutionary* | London, UK | Early post-punk musical career associated with | [Artist's official biography](https://www.viviengoldman.com/about) describes her London background, music-press work, and early-1980s post-punk recordings |

### Evidentiary limits

- Artist association is **not a track's recording place**, an edition market, or an actual record's shipping route.
- A Bandcamp account location may be a current base rather than a historical one. The Wentink association deliberately says `based in`.
- Vivien Goldman has lived in multiple cities; London is a particular early-career thread, not an exclusive or permanent origin.
- B.B. Seaton's Kingston relation combines his birthplace and documented early Jamaican studio scene; it should not imply this owned single was recorded in Kingston.
- None of these links is transferred by genre, nationality, cataloguing label, or another artist's relationship.

## Expected coverage

Prior to the first completion pass, the saved map contained **329 of 610 copies with sourced music geography**. The first pass contributed two exact artist threads (Ellen Allien and Roni Size). This second pass adds four more exact artist identities, each currently unplaced.

**If all six changes regenerate and tests pass**, projected map coverage is **335 of 610 copies (54.9%)**, with **275** still without sourced music geography. These projections must not be represented as live counts until the derived `origin-collection.json` has been regenerated and checked.

## Technical integration

- Source claims: `source/cultural-threads.json`.
- Derived geography: `prepare-origins.py`, now invoked by `build.py`.
- Regression: `tests/cultural-threads.mjs` checks six artist/source geographic connections, their separated subjects, and collection cardinality.
- Full collection remains `610 copies / 608 editions`. In the edition lens, 600 copies have placeable markets; remaining items are not removed from membership.
- No unknown country or musical origin was fabricated to make a coverage percentage look better.

## Next research emphasis

After the build is checked, focus on reproducible low-cost artist biographies and first-party labels for underground 12-inch releases. Evaluate each group by **new useful placed records per source read**, and regularly test whether the map is becoming more fun, navigable, and surprising. Stop at uncertain pressings and releases without source evidence.
