# Creative contributor discovery — all four research cohorts

2026-11-09. This pass combines `research-discogs.json`, `research-discogs-02.json`, `research-discogs-03.json`, and `research-discogs-connections-03.json` with the current owned collection and accepted/rejected relationship ledger. **No new Discogs HTTP fetch was required**; existing structured observations were reused.

## Measured coverage

| Measure | Result |
|---|---:|
| Owned distinct editions in collection snapshot | 608 |
| Owned editions present in any retrieved release-observation set | 143 |
| Editions with no release observation in these four research sets | 465 |
| Source-observed unique directly creative credit identities, after filtering | 321 |
| Candidate credit pairs before skipping two individually named members of an existing joint bridge | 24 |
| Previously accepted joint Nu Genea musicians additionally suppressed | 2 |
| **Unreviewed exact-ID creative contributor pair leads** | **22** |
| **Contributor IDs represented among those leads** | **18** |

A pair is the same exact Discogs contributor ID credited on two **owned editions**. It is not a claim that two discs share a recording, studio, influence or sample. Distinct people with the same edition endpoints are separately counted; a single artist on three editions creates three pairs. The unobserved 465 editions are *not* zero-connection records.

The earlier pilot's 8 pairs from 93 observed editions were a partial dataset; they must not be presented as the complete set. This four-set pass also repaired two discovery errors: hyphenated `Executive-Producer` roles no longer count as creative music credits; previously reviewed *specific contributors* are skipped without hiding their other collaborators on the same album pair.

## Three clusters

### 1. Battiato: *La Voce Del Padrone* ↔ *L'Arca Di Noè*

The existing ledger already accepts the **Giusto Pio** bridge. This scan detects **seven additional named creative-credit overlaps** on the same two owned albums:

- Alberto Radius — guitar
- Alfredo Golino — drums
- Angelo Carrara — producer
- Filippo Destrieri — keyboards
- Franco Battiato — voice/composition/arrangement
- Madrigalisti di Milano — choir
- Paolo Donnarumma — bass

Supporting music-credit sources: [EMI original edition catalogue](https://www.discogs.com/release/985747), [Qobuz digital credits](https://www.qobuz.com/us-en/album/la-voce-del-padrone-franco-battiato/w3h3xc8vzc9ob), [Médiathèque Nouvelle album-pair inventory](https://www.mediatheque.be/collection/la-voce-del-padrone-l-arca-di-noe-xb198w). These corroborate the general roster, not exact per-track performance on each edition. The joint 2008 CD compilation is not a substitute for owned edition scope.

**Research decision:** retain as an album-network research lead. Do not add seven redundant map edges before verifying source/release track roles and whether different recording stages can be distinguished.

### 2. Nu Guinea / Nu Genea: *Nuova Napoli* ↔ *Bar Mediterraneo*

Existing accepted bridge: **Andrea De Fazio** and **Fabiana Martone**, each already explicitly named in the ledger and therefore suppressed from *new* individual leads.

**Seven further directly creative ID overlaps**: Massimo Di Lena, Lucio Aquilina, Marilù Martone, Roberto Badoglio, Paolo Petrella, Pietro Santangelo, and Marcello Giannini. [Nu Genea's published Nuova Napoli credits](https://nugenea.bandcamp.com/album/nuova-napoli) explicitly enumerate live musicians and track positions, while [Bar Mediterraneo credit inventory](https://insheepsclothinghifi.com/album/nu-genea-bar-mediterraneo/) documents roles on the later album. The initial bridge is therefore part of a much richer cross-album personnel network.

**Research decision:** treat this as one coherent continuity network across the artist-name transition. Validate specific musicians and positions; avoid automatically generating nine visually redundant map edges.

### 3. Other editions

Eight additional candidate pairs from the earlier pilot remain:
- Shabaka Hutchings: *Black Focus* ↔ *Universal Beings* (tenor saxophone; B1–B5 on the second).
- Nkono Teles: *Only You* ↔ *Love Vibration* (performance/arrangement versus writing/production).
- Pino Daniele (three pairs) and Willy David (three pairs): across *Nero A Metà*, *Nun Me Scoccià'* and *Stop Bajon*.

The three highest-priority previously seeded leads (Shabaka, Nkono, Pino) remain in `relationship-leads.json`. The newly discovered album clusters are recorded here rather than blindly inserted as accepted claims.

## What to do next

1. **Source completeness:** The 143/608 observation coverage is the main constraint. To find deeper, less obvious links, extract release-specific credited musicians from the other 465 editions, prioritizing records connected to high-signal artists or scenes. This does not mean re-researching their entire musical histories.
2. **Network grouping:** Group contributor pairs into an album-pair network with per-contributor roles; a network is more meaningful than an unbounded list of independent edges.
3. **Track evidence:** Resolve performer/mix/version scope before creating any published cross-record links. Substantiate sample/cover claims through separate repertoire-focused searches.
4. **Provenance layers:** Keep manufacture, remastering, art direction, and record-market infrastructure out of the musical-performance layer. They may become their own distinct visual mode later.
5. **Validation:** Execute the committed `tests/credit-discovery.py` regression suite in an environment with the checked-out repository. This pass was calculated from the source observations using the same filtering semantics, but Python execution was not available in the GitHub connector.

No accepted geographic claim, runtime map thread, generated worker, or live site asset was changed.
