# Music That Travels — Geographic completion triage 01

**Date:** 9 November 2026  
**Scope:** seven missing edition-country fields and all 281 editions without sourced music geography. No live-map edits.

## First priority: the seven blank edition countries

The owned release ID is authoritative for *which* edition is in the collection; a similar title, label, barcode or master is insufficient by itself to transfer a country. The saved Discogs enrichment has `country: null` for each of these editions.

| Discogs release ID | Title | What external evidence establishes | Decision |
|---|---|---|---|
| 11065335 | Indian Acid / Pee Pee | Retailer Serendeepity lists the same title, 2017, 05AM, A&M, and **Nation: EU**. It needs a direct exact-edition match before writing `Europe` as the release market. | **Candidate only; unverified** |
| 21087580 | Black Encyclopedia Of The Air | Groovespin explicitly identifies **Discogs ID 21087580** and a vinyl LP, with barcode 8714092783810. However, it does **not** provide a reliable country for this exact edition. Separate US and European versions exist. | **Leave unknown** |
| 22309528 | Illegal Jazz Vol. 1 | Artist/label Bandcamp documents the 12-inch and track list, but does **not** prove the specific Discogs edition's release country. | **Leave unknown** |
| 15146925 | Sissy's Hot Summer A Go-Go ! / Mrs.Peel We're Needed !!! | No reliable country for the exact owned edition verified in this pass. | **Leave unknown** |
| 6022847 | Companionship E.P. | Saved credits identify Gigi Campi, but do not establish this exact edition's country. | **Leave unknown** |
| 1492774 | I Feel Alright | Saved credits identify Danny Hibrid and other contributors, but no exact edition-country source verified. | **Leave unknown** |
| 16498374 | Spirit Attack | No reliable edition-country evidence verified in this pass. | **Leave unknown** |

Research pointers (these are *leads*, not acceptance decisions):

- [Serendeepity: Indian Acid / Pee Pee](https://www.serendeepity.net/product/afrobot-thee-j-johanz-indian-acid-pee-pee/) — retailer lists EU, catalogue 05AM, year 2017.
- [Groovespin: Black Encyclopedia of the Air](https://www.groovespin.es/album/moor-mother-black-encyclopedia-of-the-air-2021-86247) — exact Discogs ID, format and barcode; insufficient country.
- [Bandcamp: Illegal Jazz Vol. 1](https://delfonic030.bandcamp.com/album/illegal-jazz-vol-1) — first-party release context, not exact Discogs edition country.

The three additional non-placeable markets from the earlier inventory are composite multi-region entries; they are *not* included among the seven null-country entries and should remain unplaced unless the actual edition-level metadata supports a meaningful multi-region representation. **No country has been written to enrichment.json.**

## Music-origin triage: 281 unplaced editions

These are **triage buckets, not automatically publishable locations**. Reproduce the complete per-record queue from current committed inputs:

```sh
node lib/music-that-travels/triage-origin-gaps.mjs > /tmp/music-that-travels-origin-triage.json
```

| Bucket, assigned in order | Count | Research treatment |
| --- | ---: | --- |
| Various-artist compilations / multi-artist releases | 26 | Review release focus and track-level identities. Do not adopt a generic Various origin. |
| Unknown Artist | 2 | Keep unknown unless direct original-release evidence supports identity. |
| Artist ID appears elsewhere in currently placed records | 2 | Quick identity/evidence reuse candidate only; check that the sourced relation truly covers this release. |
| Already in the research ledger but still unplaced | 17 | Reinspect documented limitations before spending more effort. Do not treat previous review as a verified location. |
| EP, 12-inch or single format | 199 | Selective label/artist scene review, stopping early when evidence is weak. |
| LP / album format | 29 | Review artist association or meaningful documented recording/repertoire journeys. |
| Other formats | 6 | Manual format-specific triage. |
| **Total** | **281** | |

The 281 unknowns skew strongly toward electronic music: **234** have an Electronic genre tag. The most common style tags include House (62), Disco (52), Techno (43), Drum n Bass (38), and Jungle (33). Tags overlap and cannot be used as geographic proof.

### Two quick artist-ID reuse leads

- **Ellen Allien**, `Turn Off Your Mind` (release 8440937).
- **Roni Size / Jocelyn Brown**, `Sing` (release 1596994).

These appear in the collection alongside another placed entry with at least one matching artist ID. Check the exact matching artist, its geographic source, and whether the relation legitimately applies; `Sing` is a collaboration, so a location of one participant must not be misrepresented as a location of the whole recording.

### Examples worth inspecting from the previously reviewed-but-unplaced queue

- `Dark Soldier Part 1 & 2` — Renegade, release 44900 (Jungle).
- `Neguastnegus` — Knowledge & Wisdom, release 163351 (Jungle).
- `The Mack (Remix) / Hip To The Hoppa` — Tonic, release 20707 (Jungle).
- `Midnight is Comin'` — Yousuke Yukimatsu, release 23783198 (mixed LP).
- `Stars` — Diamond Jackson, release 8030996 (deep house/boogie).

These **are not accepted geographic discoveries**. They are reasonable entry points for bounded investigation in contrasting musical contexts.

## Next work order

1. **Small, precise edition check:** identify the 05AM pressing and any directly evidenced other blank markets; stop where the country is not demonstrable.
2. **Low-cost artist evidence reuse:** review the two overlap cases and the 17 already-researched exceptions. Keep multi-person roles separate.
3. **Broad basic mapping:** choose a representative sample across the 199 shorter releases, 29 albums and compilations, prioritising first-party or authoritative artist/label sources.
4. **Discovery editorial pass:** retain short, surprising musical connections only if they can improve the map. Do not exhaustively investigate the remaining 281.

## Rules

- Country of edition, musical scene, musician association, recording location and country of physical copy are different facts.
- A stylistic association, retail location, label headquarters or artist nationality is not sufficient to assign a city.
- All new claims require exact release or artist identity, a source, a relation verb and geographic precision.
- Unknown is a legitimate result. The creative project is an exploration, not a completeness competition.
- No unverified research should enter the live map.

## Source data

The triage is derived from `source/collection.json`, `source/origin-collection.json`, and `source/research-ledger.json` in this repository. It is reproducible, but the scripts have been inspected/saved rather than executed in the repository runtime in this chat.
