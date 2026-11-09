# Music That Travels — First geographic completion pass

**9 November 2026.** Research and changes are on PR #89, not deployed to `main`.

## Collection visibility

The current geography code loads the **entire saved `collection.json`** into `entries` without filtering it to 100 records. It uses a separate placement function for each perspective:

- **Edition view**: a record with an eligible edition market gets a cover on the map; the other 10 remain accessible through **Unplaced records**.
- **Music view**: a record with a sourced music/cultural location gets a cover on the map; currently 281 unplaced copies remain accessible through the same shelf.
- The all-collection footer shows **610 copies / 608 editions**. There is no evidence that the collection is missing from the *data*; the missing work is **evidence-backed geographic placement**.

The saved `tests/full-collection.mjs` already asserts 610 unique copy instances and geographic layout eligibility. These observations are code inspection, not a browser-level production verification.

## Specific quick-review outcomes

**Do not transfer places from unrelated collaborators.** The existing `Orchestra Of Bubbles` location comes from **Apparat**, not Ellen Allien. The existing `Cannonball / Somebody Elses Guy` geographic thread comes from **Supertramp**, not Jocelyn Brown or Roni Size.

Two **independent, directly supported** artist associations were added to `source/cultural-threads.json`:

| Exact Discogs artist ID | Owned record gaining a thread | Supported relation | Source |
| --- | --- | --- | --- |
| 4281 | Ellen Allien, *Turn Off Your Mind*, release **8440937** | Berlin — artist's techno career and musical scene, not a claim about that EP's studio | [BPitch artist bio](https://www.bpitch.de/en/artist/ellen-allien/) |
| 338 | Roni Size / Jocelyn Brown, *Sing*, release **1596994** | Bristol — Roni Size's early musical and production scene, **not** a claim about where the collaboration was recorded or about Jocelyn Brown's origin | [Bucks Music artist bio](https://www.bucksmusicgroup.com/artists/166-roni-size) |

Both locations are **artist-scoped**, with source, relation and city precision. They should be offered as connections in the map, not as definitive recording origins.

## Build consistency action

`lib/music-that-travels/build.py` now invokes the existing deterministic `prepare-origins.py` before packaging the map. Previously, changing reviewed `cultural-threads.json` without regenerating the derived `origin-collection.json` could leave the map stale. The build step aligns source and generated map payload. No claim is made that CI/deployment succeeded until its checks are observed.

**Expected after successful regeneration:** two additional copies/editions with a music-geography thread (from 329/327 to 331/329, assuming no unrelated data changes), preserving 610 saved copies. Confirm by rerunning the inventory script in a CI or local checkout; do not treat this projection as a measured deployed statistic.

## Unresolved research

- The **seven null-country editions** and **three broad multi-region editions** remain deliberately unplaced until exact-release evidence supports a better representation.
- The other previously reviewed-but-unplaced records still need evidence; a research review is not proof of musical origin.
- Most of the unplaced copies are short-format dance/electronic releases; use limited, high-yield scene and artist research rather than encyclopedic edition-by-edition investigation.
- The saved collection itself was fetched on **7 November 2026**. A live Discogs membership refresh was not performed, so do not claim parity with collection changes after that date.

## Next decision

Review the PR preview and build. After that, resume basic music-origin completion using verifiable artist identity and first-party scene evidence, reserving in-depth discovery for interesting stories. Preserve the unknown shelf; do not geolocate unverified records for cosmetic coverage.
