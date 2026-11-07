# Music That Travels · saved collection dataset

Two independent experiences use the same source snapshot. Geography is `/geography`; the retained 100-record chromatic study is `/chromatic`. `/` is the experiment entry point. Playground REC-12 serves these pages under `/experiments/music-that-travels`.

## Identity and eligibility

A Discogs `instance_id` identifies a collection copy. A release `id` identifies its edition. Never deduplicate the collection by release ID: 610 copies represent 608 editions.

`dataset-audit.json` classifies every copy independently by scale. Country and regional markets are coarse positions, never factories or recording addresses. Composite multi-continent markets remain unplaced. Music points require direct recording evidence or explicit Recorded At credits joined to a reviewed studio location. Multiple credited cities are retained. A partial known location set is labelled partial. The copy scale is currently paused and has no controls in the geographic experience. Previously saved browser locations are left untouched.

## Files

- `collection.json`: public collection membership, artwork references, basic edition fields.
- `enrichment.json`: saved edition countries, dates and recording credits; no rating, value or collection-added date.
- `music-locations.json`: individually researched recording locations.
- `studio-locations.json`: reviewed studio-to-city mappings with provenance and company IDs or explicit release restrictions.
- `music-locations-enriched.json`: derived recording locations, including partial sets.
- `artwork-analysis.json`: decode status, image fingerprint, average RGB, dominant palette colour and eight-colour pixel shares. These are separate measurements, not semantic meanings. A thumbnail may show a label rather than a sleeve. Border cropping and reduced thumbnail resolution affect readings.
- `dataset-audit.json`: per-copy eligibility, reasons for exclusion and coverage counts.

## Refresh workflow

Run `python3 scripts/enrich-collection.py` to resume missing release metadata. It checkpoints after every result and respects the public API's observed 25 requests per minute. Existing saved edition details are not refetched by UI interaction.

Run `scripts/analyse-artwork.py` using the runtime Python with Pillow. Measurements checkpoint after each image. Available analyses are reused; failed downloads can be retried. Image measurements do not imply that an original first-release cover is verified.

Then run `python3 scripts/resolve-studio-locations.py`, `python3 scripts/audit-collection.py`, `node tests/dataset.mjs`, `node tests/geography.mjs`, `python3 scripts/prepare-worker.py`, and `bash scripts/build.sh`.

The geographic UI reads `/api/atlas`, a stable snapshot. It does not fetch all edition details or recalculate artwork on each load. Cover proxy requests may still retrieve an image. The separate live collection endpoint may refresh membership and thumbnail URLs; it must retain saved enrichment.

Geography displays every eligible copy individually. A seeded random scatter and collision separation give records equal visual priority. Placement is approximate, becomes relatively tighter to the geographic anchor at higher zoom, and never implies street-level accuracy. Reshuffle changes the seed. Documented traces remain visible.

## Reviewed associations and the original pilot

`artist-origins.json` records reviewed Discogs artist IDs matched to named artists, each with typed, sourced geographic associations. It distinguishes associated areas, formative musical scenes, group formation, and documented later bases. `origin-pilot.json` joins those associations and nine explicitly geographic compilations to 100 distinct collection editions (102 copy instances), all also having known edition markets. The pilot remains a regression fixture; the current Geography screen loads all 610 entries. MusicBrainz country area is labelled an associated area, never silently promoted to band formation, birthplace or a release-date recording location. Original studio evidence and the full collection snapshot remain intact. Multiple places for collaborations and compilations are retained as separate typed relationships, revealed from a single overview cover. Sources include MusicBrainz (core artist-area data), first-party artist/label bios, interviews and catalogue documentation.

Apply reviewed associations to every matching collection edition with `python3 lib/music-that-travels/prepare-origins.py`, then build the Worker with `python3 lib/music-that-travels/build.py`. No artist lookup or geographic reinterpretation runs on page load. The MusicBrainz API was inaccessible from the execution environment during this pilot, so artist matches and associated-area fields were reviewed through its public indexed pages instead.

## Zoom-aware geography

World view permits loose placement. Countries (camera scale 2.5–8) and Places (8+) constrain individual national markers to the appropriate Natural Earth country polygon component, including after collision separation and reshuffling. Regional market labels remain regional and use dashed frames. Country-only artist data is not promoted to city precision. Country outlines: Natural Earth 1:110m Admin 0, retrieved from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson on 2026-11-07; retained in source/country-boundaries.geojson. Projected compact data is in source/countries.json.

## Local matches and visual density

Travel lines are omitted for matching named places, locations within roughly 20 km, or an artist association inside a matching national release market when that market has only country precision. This does not equate different known cities. Same-country suppression is symmetric when switching perspectives and does not apply to broad cross-country markets such as Europe. The panel states that no travel line is needed at this level. Cover widths use nearest-neighbour screen space, with bounded minimum and maximum widths per zoom tier; size reflects available space, not artist importance.

## Screen fit

Cover spacing now increases by zoom tier (34 / 72 / 140 screen units as a target), while centers continue to respect national polygons. Adaptive artwork caps are 76 / 168 / 280 units, reduced by actual neighbour space and viewport margins. Covers near the title and navigation margins are reduced or omitted until panned into view. Larger cards use a separate cached `/api/artwork/:id` proxy for the collection’s larger image URL, with thumbnail fallback. Original collection and origin associations are unchanged.

The current visual pass uses more generous spacing, larger minimum covers, a quieter base map and faint background traces. Hovering an individual cover brings it above adjacent artwork; keyboard selection uses the highlighted foreground cover. Camera and national-position constraints are unchanged.

## Full-collection Geography

The current map retains all 610 entries / 608 editions. Edition markets place 600 entries (598 editions); 10 stay unplaced. `origin-collection.json` applies reviewed artist IDs and explicit compilation overrides across the full snapshot, retaining the pilot’s curated associations. With typed recording and repertoire evidence included, this now covers 254 entries / 252 editions through 408 threads. The remaining 356 entries are available in the music unplaced tray, and their panels still show edition metadata. Missing collaborators are labelled rather than assigned another artist’s location. No country, studio or genre is inferred as an artist origin. Chromatic remains its separate 100-record trial.

Cultural thread fields retain the relation verb, subject, place precision, source, optional period and explanatory note. Overview anchors do not collapse or erase other connections. Artist connections may apply across releases; repertoire and recording claims are release-specific. Altın Gün and Sun Ra demonstrate these distinctions, while the same schema also carries the existing compilation and recording evidence throughout the collection.

A collection-wide identity/evidence pass is saved in `collection-research.json`, with source rows in `wikidata-collection-evidence.json` and published Area-field outcomes in `musicbrainz-area-evidence.json`. All 570 named artist IDs were checked; 251 had exact identity links. Source unavailability and missing cross-identifiers remain research gaps, never asserted as missing cultural history. The frontend receives a lean display projection while the full provenance is retained.
