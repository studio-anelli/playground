# CREDIT INTAKE 04 — targeted expansion of collection credits

2026-11-09. This is a **frozen selection and first source challenge**, not a claim that all thirty Discogs releases were fetched. Prior four-cohort structured Discogs observations cover 143/608 owned editions; 465 editions are not represented in that specific source layer.

## Selection and integrity

Thirty owned Discogs release IDs are saved in `source/research-credit-intake-04.json`. All 30 were checked against the existing four source-observation datasets and do **not** have a successfully retrieved `releases:<ID>` observation there. The batch is purposefully varied, not randomly sampled. Its role is to test whether detailed credits yield more useful recording networks than additional broad scene biographies.

Groups include: Herbie Hancock, Miles Davis, Sun Ra and experimental-jazz recordings; Kendrick Lamar, De La Soul and hip-hop/cut-up records; P-funk, disco and soul records; jungle/drum-and-bass singles with remixes; Battiato/De André experimental and Italian albums; Nu Guinea and electronic music; plus original-repertoire compilations from Nigeria and Congo.

**Important:** A main Discogs artist of `Various` is a placeholder and cannot be counted as an artist overlap. For compilations and multi-artist splits, inspect tracklist artist IDs and original recordings separately. A reissue's cutting/mastering studio is not its recording studio.

## Initial first-party research: important connection found

### Steve Monite / Nkono Teles / Doing It In Lagos

Three **owned** editions already form a relevant historical network:

- `25267285`: **Steve Monite, Only You**, owned Soundway LP reissue (`SNDWLP146`).
- `9425519`: **Various, Doing It In Lagos**, 2016 Soundway set (`SNDWLP087`), featuring **Steve Monite — Only You on side A3** and **Nkono Teles — Be My Lady (Mix) on E3**.
- `26572889`: **Nkono Teles, Love Vibration**, later Soundway reissue (`SNDWLP164`).

The label [Soundway: Only You](https://soundwayrecords.com/release/300028-steve-monite-only-you?lang=en_US) states the Monite album was reissued after the compilation and explicitly attributes its production to Nkono Teles. [Soundway's artist profile](https://soundwayrecords.com/artist/112995-steve-monite?lang=en_US) identifies Nkono as producer of Monite's original song. [Soundway's original compilation release](https://soundwayrecords.com/release/155893-various-artists-doing-it-in-lagos-boogie-pop-disco-in-1980s-nigeria?lang=en_GB) and the [exact owned LP tracklist at Le Discopathe](https://www.lediscopathe.com/release/9425519/Various-Doing-It-In-Lagos-%28Boogie-Pop-and-Disco-In-1980s-Nigeria%29) establish the title/artist and E3 track positions. [Soundway's production studio](https://thecarverystudio.com/steve-monites-classic-nigerian-disco-album-only-you-reissued-on-soundway-records/) recounts the restoration/remastering history; that later London work is **not** where the 1984 music was originally recorded. [Bandcamp Daily interview](https://daily.bandcamp.com/features/steve-monite-only-you-interview) separately discusses Nkono's early synthesizer/drum-machine production.

**Two review leads now exist** in the candidate queue:

1. Track-scoped *shared person*: Nkono is credited as writer/producer of the owned Love Vibration and performer of the anthology's E3 selection (source names are grounded, but the specific role on E3 is not inferred to be the same as on Love Vibration).
2. Track-scoped *same recording*: the two owned Soundway issues both contain a track titled Steve Monite — Only You; Soundway itself links them historically. The **identical take and mix** still require confirmation; the later album also includes a different track, Only You (Disco Jam).

Third relationship, already in the queue from an earlier pass: Nkono's role in the owned Steve Monite album versus his own Love Vibration. These three edges should be viewed as a **network**, not blindly shown as three redundant map lines.

### Herbie Hancock: Rockit

[MusicBrainz recording credits](https://musicbrainz.org/release/dce34741-c297-4c1e-8b81-40f12a82bca5) list Bill Laswell, Michael Beinhorn, Grandmixer D.ST and Herbie Hancock in the 1983 production, including OAO Studio in Brooklyn and later mixing at Eldorado, Burbank. [Jazzdisco's Hancock session catalogue](https://www.jazzdisco.org/herbie-hancock/catalog/) independently corroborates original session participants and the Brooklyn room.

The owned `36972` **Rockit (Extended Dance Version)** is an edition-specific 12-inch with other material. **Do not transfer the album version's exact mix/studio track scope without verifying what this pressing contains.** The web sources establish a research route; this note does not accept new geography.

## Next bounded collection pass

The repository already has `research/collect-discogs.py`, which supports a frozen batch, cache reuse, structured credits, exact master identities and source hashes:

```sh
python lib/music-that-travels/research/collect-discogs.py \
  --collection lib/music-that-travels/source/collection.json \
  --batch lib/music-that-travels/source/research-credit-intake-04.json \
  --artists \
  --output lib/music-that-travels/source/research-discogs-04.json

python lib/music-that-travels/research/credit-discovery.py \
  --observations lib/music-that-travels/source/research-discogs.json \
    lib/music-that-travels/source/research-discogs-02.json \
    lib/music-that-travels/source/research-discogs-03.json \
    lib/music-that-travels/source/research-discogs-connections-03.json \
    lib/music-that-travels/source/research-discogs-04.json \
  --output /tmp/credit-intake-04-links.json
```

The above is an **execution recipe, not an executed collection**. The current runtime cannot access the Discogs API, so no invented fetched dataset or coverage improvement has been committed. In the next executable environment, run collection, confirm successful status for each release, compare before/after exact-ID candidate networks, inspect sources, and stop when new credit routes no longer yield meaningful independent musical connections.

## Working principles

Keep original recording, new mix, reissue, remaster, country of issue and cover separate. Verify claimed relationships on exact tracks and compare recorded versions before declaring equivalence. Do not infer from a label city, genre or common title. The candidate queue never publishes to the live website.
