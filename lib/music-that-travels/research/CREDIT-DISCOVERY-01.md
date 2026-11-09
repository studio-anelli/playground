# Creative contributor discovery — pilot 01

**Scope:** 2026-11-09. Offline comparison of exact Discogs `extraartists` IDs in the original research observations, batch-02 observations, and four additional connection-endpoint observations. The batch-03 observations are not included in the measured 93-edition subset reported here. The new `credit-discovery.py` program can scan **all four** source files when run in a local repository checkout.

## Measured pilot

- Full collection snapshot: **608 distinct editions**, 610 copies.
- Indexed source observations combined in this *measured subset*: **249** keys (artist/master and release observations).
- **93 owned editions** have at least one retrieved structured release observation in that subset.
- After narrowing to exact numeric contributor IDs and directly creative roles, **8 candidate pairs** across **4 named contributors** remain. A pair means two owned editions have a matching credited identity. It does not prove they share a recording, session, sample or even the same musical role.
- Missing credits are *unknown*, not proof of no relationship. Results are not an estimate of the collection-wide total.

### Candidate pairs in this subset

| Contributor (Discogs ID) | Owned editions | Scope of the observed credit |
|---|---|---|
| Shabaka Hutchings (1419450) | Black Focus (9072898) ↔ Universal Beings (12716187) | Tenor saxophone; on Universal Beings limited to B1–B5 |
| Nkono Teles (781536) | Only You (25267285) ↔ Love Vibration (26572889) | Arrangement/instruments versus writing/production |
| Pino Daniele (152754) | Nero A Metà (1244858) ↔ Stop Bajon (5030835) | Guitar/songwriting/production versus writing/arrangement |
| Pino Daniele (152754) | Nun Me Scoccià' (3880099) ↔ Stop Bajon (5030835) | Writing/arrangement on both, edition-specific scope |
| Pino Daniele (152754) | Nero A Metà (1244858) ↔ Nun Me Scoccià' (3880099) | Musical credits on both |
| Willy David (249455) | Nero A Metà (1244858) ↔ Stop Bajon (5030835) | Producer on both |
| Willy David (249455) | Nun Me Scoccià' (3880099) ↔ Stop Bajon (5030835) | Producer on both |
| Willy David (249455) | Nero A Metà (1244858) ↔ Nun Me Scoccià' (3880099) | Producer on both |

The first three were added to `source/relationship-leads.json` for human review. Additional overlaps remain automatically discoverable; do not duplicate low-value same-artist relationships in the curated queue.

## External source challenge

- Shabaka's credits on both jazz records are corroborated by [AllMusic's Shabaka discography](https://www.allmusic.com/artist/shabaka-mn0001092571) and [JazzProfiles](https://jazzprofiles.com/profile/shabaka-hutchings/). These corroborate the contributor, **not** a shared recording session.
- [Nkono Teles' own reissue presentation](https://nkonoteles.bandcamp.com/album/love-vibration) describes his role in Nigeria's 1980s electronic popular music. Its 2023 reissue production must remain separate from the historical musical session.
- [Pino Daniele's official historical account](https://www.pinodaniele.com/miscellaneous/1983-2/) and [Corriere del Mezzogiorno](https://napoli.corriere.it/notizie/spettacoli/24_maggio_15/tullio-de-piscopo-40-anni-di-stop-bajon-ff3a4987-4956-4758-b8d8-4323948d2xlk.shtml) explicitly connect his composition/work to Stop Bajon. The credited `Producer` role for Willy David should be preserved rather than silently attributed to Pino.

These three connections are still *candidate review objects* pending edition/track checks; the cited sources do not independently clear every version.

## Next source intake

Run against all four structured Discogs cohorts in a checkout:

```sh
python lib/music-that-travels/research/credit-discovery.py --output /tmp/credit-leads.json
python lib/music-that-travels/tests/credit-discovery.py
python lib/music-that-travels/tests/research-relationships.py
```

Inspect the resulting role-level pairs, prioritizing cross-scene collaborators and track-specific contributors. Do not automatically add a connection to the map. The source observations are already collected; this scan makes no Discogs network requests.

## Limits and safeguards

Excluded from the directly musical set: mastering, lacquer cutting, printing, artwork, legal/licensing, booklet, restoration, vinyl digitisation, and executive production. These can later form an *edition/provenance* network but do not establish a musical-performance link. Both credited roles and exact source release IDs remain visible for review. Alias exceptions are applied before matching. Stronger relationships such as samples and covers still require independent source-recording evidence.

This report reflects code/data inspection and source checks, not a completed local Python test execution. No accepted ledger claims, geography, worker or live website data changed.
