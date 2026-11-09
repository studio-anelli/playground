# Credit intake 04 — results and evidence review

2026-11-09. The previously frozen, intentionally selected batch was collected from Discogs. The collector ran from 15:01:55 to 15:07:06 UTC, with 102 unique resources retrieved, zero cache hits and zero unavailable. All 30 selected release observations succeeded. It also retrieved artist records, masters and representative releases; these are not substitutes for the owned editions or necessarily original pressings. Structured observations and content hashes are in `source/research-discogs-04.json`; raw responses and notes remain in the local cache.

## Integrity and measured discovery

Each of the 30 source release IDs, titles and sets of billed artist IDs matched the frozen batch. The output's saved fields were compared with the corresponding raw response cache; there were no differences. The 30 release responses contained 358 release-level extraartist entries, 174 track entries and 342 track-level extraartist entries. These totals are source metadata, not a measure of independent verified facts. A SHA-256 response fingerprint is present on every selected release. We did not re-download all responses to independently recompute their hashes.

The discovery scanner now also checks track-level `extraartists`, retaining exact track position, title and nested ancestry; it recognizes remix and DJ-mix roles, and excludes placeholder identities and reissue producers. It still does not scan billed track artists, group membership, sample databases or all creative roles, and broad roles may mix recording and later production stages. A credit naming a source composition is not necessarily a performance or a sample. Matching Discogs IDs produces leads, not independently verified facts.

| Measure | Same revised scanner, before intake | With intake 04 |
|---|---:|---:|
| Owned editions with observed release data | 143 / 608 | 173 / 608 |
| Unreviewed exact-ID creative-credit pairs | 29 | 118 |

The 89 additional pairs and 118 total are contributor/edition-pair prompts, not 89 or 118 verified relationships; repeated collaborators across album clusters create many pairs. These counts are **not directly comparable** with the earlier report's 22, which used release-level credits only. The selected editions are not a random sample, so no population yield is implied. Complete reproducible scanner output: `source/research-credit-candidates-04.json`.

## Investigated leads

### DJ Shadow and Cut Chemist: two different roles across two owned records

Owned [Brainfreeze, 118630](https://api.discogs.com/releases/118630) credits both DJs for the mix; owned [Number Song / Painkiller, 26118410](https://api.discogs.com/releases/26118410) credits Cut Chemist's remix of **The Number Song on side A**, while side B is DJ Shadow's remix of Depeche Mode's **Painkiller**. [Cut Chemist's account](https://cutchemist.bandcamp.com/album/brainfreeze-remastered) describes recording the pair's 45s mix; [DJ Shadow's own store](https://djshadow.com/products/dj-shadow-the-number-song-cut-chemist-remix-7-vinyl) corroborates the remix. A [contemporary review](https://www.miaminewtimes.com/music/cut-chemist-and-dj-shadow-6357732/) discusses The Number Song and Chemist's remix in Brainfreeze. This is a musical collaboration network, not proof that the LP contains the same complete master or that either DJ appears on the other side of the single. Identify the segment and compare the precise mix before asserting recording identity. Queue: `intake04-shadow-cutchemist`.

### James Brown / Kendrick Lamar: a composition credit is not a sample match

[The Payback Mix, owned release 205935](https://api.discogs.com/releases/205935), is a later mix, while [To Pimp A Butterfly, owned release 7568442](https://api.discogs.com/releases/7568442), credits James Brown and Fred Wesley for **The Payback** on **King Kunta, A3**. [MusicBrainz](https://musicbrainz.org/release/57695e2b-df9b-44d4-84a4-1851a9cfceac) documents The Payback among the track's credited material. The pair is a promising route through a composition and its later treatment; it does not show that the owned mix is the recording sampled, or even establish a sample as distinct from interpolation. Its exact contents and relation to the original need examination. Queue: `intake04-brown-kendrick-payback`.

### Steve Monite / Nkono Teles / Tony Okoroji: a meaningful credit discrepancy

On the owned [Doing It In Lagos anthology 9425519](https://api.discogs.com/releases/9425519), A3 **Only You** credits Tony Okoroji as producer; E3 **Be My Lady (Mix)** credits Nkono Teles as writer, arranger and producer. On the owned [Only You album 25267285](https://api.discogs.com/releases/25267285), Nkono is credited for instrumental arrangements and instruments, and Tony for production and instrumental arrangements. [AllMusic](https://www.allmusic.com/album/only-you-mw0003026806) corroborates those role distinctions. However, [Monite's interview](https://pan-african-music.com/en/nigerian-king-of-boogie-steve-monite/) describes working with Nkono as a producer and says Okoroji was away on the recording night; [Soundway](https://soundwayrecords.com/release/300028-steve-monite-only-you?lang=en_US) also describes Nkono as producer. These sources may use production in different senses or disagree: retain both accounts, do not silently replace the formal credited role, and consult original sleeves or further testimony. A shared song title on the two Soundway editions still does not establish an identical mix/take.

### Ras G and Sun Ra: an interpretation, with precise limits

The owned [Views Of Saturn Vol.1, 2981774](https://api.discogs.com/releases/2981774), lists Ras G's **MDU NTR** on A and Sun Ra's **Nidhamu** on B; a [distributor description](https://www.decks.de/label/all-city) calls the A-side a version of Nidhamu. Do not transfer that claim to *On Jupiter* or *Disco 3000* by artist association, or decide without more evidence whether it is a cover, remix or sample. Original take identity and the exact transformation remain open.

### Further networks requiring review

- *World EP* (7704301) and *Nuova Napoli* (12097296) share exact-ID creative credits for Lucio Aquilina and Massimo Di Lena. Track scope and group-alias context require review; do not multiply identical lines for each member.
- *Damn.* (10559651) and *To Pimp A Butterfly* (7568442) expose several track-scoped contributors. Alias IDs such as Mark Spears and Sounwave must be reconciled before counting people; shared credits do not establish a shared session.
- Sun Ra Arkestra, Miles Davis, Battiato and Ohio Players each produce clusters of credited personnel across separate releases. Original sessions and reissue credits require track and recording-level checks.

All additions remain candidate research. No accepted research ledger, geographic claim, map data or live worker was modified.
