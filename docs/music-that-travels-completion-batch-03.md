# Music That Travels — Underground geography batch 03

**9 November 2026 · Research sources and tests committed to PR #89, not live.**

## Purpose

Light, accurate artist/scene associations for underground 12-inch and mixtape releases. No claims about individual recording studios. Preserve an interesting, exploratory map, not encyclopedic coverage.

| Discogs artist ID | Owned release(s) newly served | Association | Evidence and limits |
|---|---|---|---|
| 734504 | San Proper — *Animal* (3705359), *Friendly Tears* (12705870) | **Amsterdam · city** | [RA biography](https://ra.co/dj/sanproper/biography) documents deep connections to Amsterdam institutions, Rush Hour, Dekmantel and Red Light Radio. It does not establish a recording location for either owned edition. |
| 34453 | Malente — *Mashed Up Funk Volume 3* (919525), *Volume 2* (510441) | **Germany · country** | [RA artist page](https://ra.co/dj/malente) lists Germany as the artist's location. No city is inferred. The independent market for each pressing remains a different fact. |
| 6584747 | Yousuke Yukimatsu — *Midnight is Comin'* (23783198) | **Osaka · city** | [Mixmag interview](https://mixmag.net/feature/impact-yousuke-yukimatsu-japan-experimental-dj-producer-gabber-techno) describes the DJ's Osaka formative years and regional gigs in Kobe. [RA biography](https://ra.co/dj/yosukeyukimatsu-jp/biography) corroborates Osaka origin, now Tokyo-based. This is a formative DJ scene and not a claim of recording location for the mix. |
| 2173 | Renegade — *Dark Soldier Part 1 & 2* (44900) | **Essex · region** | [DJ Mag](https://djmag.com/news/jungle-pioneer-ray-keith-releasing-biography-dark-soldier) describes Ray Keith as an Essex jungle pioneer and names Renegade as his alias; [DNBHQ](https://www.dnbhq.com/artist/2173) explicitly lists the exact *Dark Soldier Part 1 & 2* record under Renegade. No city or studio inferred. |

Six previously unplaced collection copies are covered by four artist identities. All relations are typed as **artist** rather than recording facts, and their geographic precision is retained.

## Expected state, not yet measured deployment

Starting saved state: 329/610 copies placed in music lens. Earlier additions on this branch: six copies. This batch adds six more, for a **projected 341/610 (55.9%)** with **269** unplaced after successful regeneration, assuming no unrelated data changes.

To verify: regenerate from source using the revised `build.py`, then run `node tests/cultural-threads.mjs` and `node tests/full-collection.mjs` from `lib/music-that-travels` before review/merge. These projections must not be shown as live coverage until checks pass.

## Research discipline

Keep sourced labels, no guesses from genre, nationality or edition market. A two-release artist association is useful but does not make the music record-specific. Unknown cases remain in the unplaced shelf. Stop investigating where research adds no meaningful geographic or editorial insight.

## Next step

Once a preview builds, verify placement and the complete 610-copy count, then select the next short-format cohort with high artist-ID reuse and evidence availability. Continue experimenting with the map's **discoverability of unplaced records**, not merely enlarging the geographic coverage statistic.
