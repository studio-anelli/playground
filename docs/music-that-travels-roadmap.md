# Music That Travels — Completion roadmap

**Status:** working plan, 9 November 2026.  
**North star:** [Creative principles](./music-that-travels-principles.md). This is a fun, fascinating exploration of a personal record collection, **not an encyclopedia**. Research serves the experience.

## Baseline and definitions

The saved collection snapshot currently contains **610 copies (Discogs `instance_id`) across 608 distinct editions (Discogs release `id`)**. Keep both copies and editions distinct: duplicate editions are not duplicate collection copies.

The committed dataset documentation reports **600 placed copies / 598 editions in the edition-market lens**, with 10 copies not placed. Research coverage for music origins has changed over recent batches; **recompute it from the current generated `origin-collection.json` before reporting any new completion percentage**. Do not use historical README figures as a current guarantee. Reconcile the saved collection snapshot with the current Discogs collection before describing this as complete.

Geographic coverage must be counted separately for:
- **Your edition:** known release market (country/region), not a manufacturing or recording location.
- **The music:** evidenced artist/cultural association or recording/repertoire geography, with precise relation and precision preserved.
- **Journey comparison:** both sides sufficiently located to compare. This is a conceptual/cultural connection, **not a claim about physical shipping**.

Unknowns must remain visible and must never be filled by guessing nationality, label address or genre.

## Milestone 1 — Inventory and truthfulness first

1. Reconcile the current saved `collection.json` with the intended full collection; check source date, membership, duplicate copies/editions, and missing IDs.
2. Produce a **reproducible inventory** of total copies, unique editions, edition-market coverage, music-origin coverage, both-lens coverage, unknown reasons and data inconsistencies. Differentiate country-level vs city-level precision, not just known/unknown.
3. Compare the generated live-map payload to the authoritative saved sources. Check that all entries appear or have an explicit unplaced treatment. Flag stale generated snapshots and documentation.
4. Save a concise versioned coverage report with exact numerator/denominator and evidence timestamps; do not silently count broad or speculative place claims as precise musical origins.

**Exit:** we have a trustworthy, repeatable coverage baseline and a prioritised queue of missing *basic* information. **No new deep research batch is required to reach this milestone.**

## Milestone 2 — Complete the basic geographic map

1. Prioritise the small number of unplaced **edition markets**, using release-specific evidence.
2. Work through unplaced **music origins** efficiently, reusing existing reviewed artist identities, scene associations and source citations where legitimately applicable.
3. Group exceptions into: quick reliable match; needs limited manual review; genuinely unknown/unverifiable. Stop at the appropriate level.
4. Aim for **90–95% usable geographic coverage where evidence allows**. Show the rest honestly as unknown, not as failures or forced locations.
5. Keep compilation, split, collaboration and multi-origin releases capable of showing more than one location. Preserve country-only precision when no city is supported.

**Exit:** nearly the entire collection can be explored in the geographic interface, including a graceful experience for unknown origins. Coverage is expressed per lens, not as one misleading number.

## Milestone 3 — Light, reusable cultural context

1. Build short context notes for musical scenes, cultural movements, technology, migration and exchanges **only when they help visitors understand a record**.
2. Reuse one reviewed context across relevant editions where justified; do not produce 600 repetitive biographies.
3. Keep copy brief and accessible, with optional source/detail expansion. Confirm relationships rather than infer them from genre labels.
4. Prefer records and scenes that illuminate the collection's character.

**Exit:** a representative spread across LPs, EPs, major scenes, underground and obscure records provides meaningful but lightweight context.

## Milestone 4 — Selective discovery

1. Reuse the strongest verified findings from existing research batches.
2. Curate distinctive record-to-record connections: collaborations, samples, shared people, influences with explicit evidence, cultural crossroads, editions and rediscoveries.
3. Investigate promising leads selectively. Keep unverified hypotheses in the research ledger rather than publishing them as facts.
4. Treat **50–100 interesting discoveries** as a directional editorial ambition, **not a quota** and not a reason to invent or over-research weak material.

**Exit:** the map presents memorable, navigable discoveries rather than an accumulation of metadata.

## Milestone 5 — Experience, listening, and performance

1. Review the complete collection in the existing music/edition perspectives, selection, filters and geographic shuffle.
2. Make the journeys understandable through movement, highlighting and concise explanations rather than a dense info panel.
3. Refine listening and serendipitous exploration; preserve usable cover interactions, keyboard and pointer behaviour, and browser compatibility.
4. Test performance and layout with the **full** collection, including dense geographic areas and lower-performance environments.
5. Run an editorial walkthrough with unfamiliar records: is the experience surprising, understandable and enjoyable **without reading a manual**?

**Exit:** the project is a satisfying exploratory experience, not merely a complete dataset.

## Research stopping rule

Before starting a new deep-research batch, ask:

- What new visual, audible or navigable discovery will this enable?
- Is there existing evidence that can be reused?
- Does its potential value justify the investigation?
- Will leaving the answer unknown harm the experience?

If additional work only increases metadata without improving understanding or delight, **stop**.

## Immediate next action

**Run the collection inventory and publish the computed coverage report.** Then use the gaps to choose the smallest high-value geographic-completion work. Do not immediately start another uniform 30–50-edition research batch.

Keep the report and roadmap separate: the **roadmap** defines priorities; the **report** records measured progress. Update measured counts from committed source data, and avoid using stale historical figures.

## Implementation and publication

Follow [../MANUAL.md](../MANUAL.md) for branch / PR / preview / merge rules. Preserve exact Discogs edition and track identities and existing verified research. Do not change the live map simply to improve coverage statistics. A roadmap update should not trigger a deploy of unreviewed data.
