# Method 0.2: bounded review and frozen holdout

The 50-edition holdout yields meaningful musical context for **43/50** editions. It places **21/25** previously unplaced editions. **Seven** fail the stronger context threshold; four remain unplaced, while three keep older, weaker map evidence without being promoted as method-0.2 successes. All 50 have an explicit bounded review and stopping decision. This is not 50 complete musical histories.

## Test design

The method was frozen before the holdout collection started. The selection uses SHA-256 ranking with the saved seed, excludes the initial 40, and samples 25 previously placed plus 25 unplaced editions. Artist names did not determine selection. The exact 50-copy intake, baseline thread IDs and source observations are committed. This is a holdout from the existing collection, also exercised through the generic standalone intake interface; a completely independent full collection has not yet been tested.

## Measured results

| Measure | Result |
| --- | --- |
| Distinct holdout resources | 164: 57 artists, 50 owned + 21 representative editions, 36 masters |
| Discogs collection wall time | 499.086 s (8 min 19 s), starts spaced at least 3 s apart |
| Cache hits / failed retrievals in this collector run | 0 / 0 |
| Bounded reviews completed | 50/50; each retains scope limitations |
| Source routes accounted for / with an unavailable route | 50/50 / 1 (Move D feature body) |
| Useful context minimum met | 43/50 |
| Holdout editions with new accepted claims | 37 |
| Holdout editions with individually rechecked existing evidence | 6; reused without duplicate projection |
| Previously unplaced now placed | 21/25 |
| New accepted claims in this iteration | 55: 7 first-batch follow-ups and 48 holdout claims |
| Editions outside both batches benefiting from reusable new artist facts | 14; this does not declare their edition research complete |
| Full map after this iteration | 314 copies / 312 editions / 545 threads |
| Earlier claims | 407 unchanged; one explicit, fingerprinted scope correction |
| Geography payload | 694,399 bytes; gzip 154,144 bytes |
| Payload change from first pass | +12,171 bytes raw; +7,577 gzip bytes |
| Human review duration / total research throughput | Not measured; no extrapolation claimed |

The catalogue now distinguishes 300 source reads from 49 harvested-only resources, two indexed-only excerpts and one inaccessible article body. Harvesting is not evidence acceptance. First-party text repeated by multiple distributors is not independent corroboration. Source families describe routes, not a checklist of websites that every record must visit.

## What changed in the method

- Identity work includes aliases and credited roles. Colin Lindo’s Alpha Omega, the Woodbridge/Sprosen Alpha & Omega duo, Cloud 9/Nookie, Uniile/Leo Pol and the Italian Creatures are kept distinct.
- A city profile tag alone fails the musical-context minimum. Training, professional scenes, documented formation, scoped sessions and explicit repertoire connections qualify. Tiombé Lockhart’s New York training and FloFilz’s Aachen study now take precedence over weak current-area tags.
- Artist history can be reused by exact ID. Sessions, remixes, bonus tracks, private-house recordings and compilation subsets retain their own scope. No automatic master-family studio transfer occurs.
- Each review records a stopping reason and limitations. A completed bounded review can retain unknown facts or an unavailable source. These states are counted separately.
- The display projection recursively drops research bookkeeping and duplicate location URLs, while retaining notes, source links, coverage and track positions. No research requests run on page load.

## First-batch questions revisited

Ten questions were reviewed: two closed at the stated precision and eight stopped with explicit unresolved limits. The stronger evidence also supports Esma Ertel’s own musical history and improves FloFilz and Tiombé Lockhart context.

| Edition | Decision | Result |
| --- | --- | --- |
| Beat It / Working Day & Night | resolved | City-level B-side album context is now supported; no assertion that every contribution has been identified. |
| I Need A Freak | bounded unresolved | The archive reissue notes locate the original album in Akron but do not locate the two later bonus singles. Distributor copy repeats the same label account, so it is not independent corroboration. |
| Feel My Love | bounded unresolved | West Orange remains supported. Exact studio IDs disambiguate historic Room 10 and EARS, but independent dated evidence for all sessions is incomplete. Indexed historical directories suggest East Orange; blocked full PDFs and a dead owner page prevent treating that lead as fully read. |
| Simurg | bounded unresolved | Esma’s own Istanbul career is independently supported; GAM is in Belgium. Historic Waimes and post-2016 Malmedy sites must not be conflated without a session date. |
| Companionship E.P. | bounded unresolved | The full album notes supply Cologne/Rolandseck sessions, but this unprovenanced white-label EP has not been matched to exact takes. Close durations are not recording-equivalence proof. |
| Dog  | bounded unresolved | Exact South Central studio profile establishes only Germany; city remains unknown. Berlin applies only to the explicitly partial re-recording. US and Australian studio namesakes were excluded. |
| The Other Fantasy | bounded unresolved | The first-party notes explicitly state Europe but no cities; distributor pages repeat the same text. No city is inferred from the label’s base. |
| The Aquarius Years | bounded unresolved | New York training and early musical career are supported. Original CD and Queen Of Doom EP metadata do not establish early session locations; current Los Angeles profile is not session evidence. |
| Your's And Your's Alone / Last Night Changed It All (I Really Had A Ball) | bounded unresolved | The original singles and albums identify the songs but do not establish detailed recording places or bootleg pressing provenance. A New York mastering credit is not a recording location. |
| Black Focus | resolved | Exact Quatermass credit and Strut’s production history independently establish the London studio. |

## Holdout outcomes

“Useful” means the minimum explicit musical relationship is supported. It does not mean all contributors or sessions are located. Limits below are retained in the machine-readable review journal.

| Edition ID | Edition | Context | New / reused claims | Scope and remaining limits |
| --- | --- | --- | ---: | --- |
| 22988753 | Heaven Sent | Useful | 2 / 0 | Collaborators’ musical histories are separate; a shared recording location is not established. |
| 387809 | Moondog And His Honking Geese Playing Moondog's Music | Useful | 1 / 0 | Composer’s New York activity is documented; Honking Geese session and ensemble history remain unverified. |
| 5141048 | SSOL 001 | Useful | 1 / 0 | Research attribution to Frank Timm is supported; the record itself has no printed producer. Sample geography is not inferred from Salsoul branding. |
| 29125525 | Wonch Like Woo | Below minimum | 0 / 0 | No explicit artist geography in label notes or specialist review. Barcelona is the label base, not QphoriQ’s origin; Bangladesh 8080 is a track title. |
| 412145 | Tremendous (DJ Krust Remixes) | Useful | 2 / 0 | Hip-hop scene and remixer scene are supported separately; the original vocal and remix session addresses remain unknown. |
| 61487 | Tonite | Useful | 1 / 0 | Production lineage is documented; every mix’s session room is not. |
| 30831717 | Bandido EP | Useful | 1 / 0 | London scene association is supported; Bandido session location not stated. |
| 4215038 | Wheels In Motion Ep | Useful | 1 / 0 | Guiddo’s Berlin studio base is documented; Mavin’s own musical history and EP session address remain separate questions. |
| 7454586 | I Know You Care EP | Useful | 1 / 0 | Editor’s Amsterdam history is supported; underlying source recordings are unidentified. |
| 20707 | The Mack (Remix) / Hip To The Hoppa | Below minimum | 0 / 0 | Exact Rory Doherty alias is resolved. The radio archive and original Monroe studio credit do not establish an independently supported session geography for this remix. |
| 23156297 | Versions | Useful | 1 / 0 | Mark Grusane’s Chicago history is supported; source records behind these edits remain unidentified. |
| 19561852 | Isilingo Sendoda / Let's Groove Tonight | Useful | 2 / 0 | Patience Africa’s Durban/Johannesburg career is documented; edit and original session locations are not. |
| 60897 | Jah Step / Realism 2000 | Useful | 1 / 0 | Colin Lindo’s identity and Dollis Hill network are supported; exact owned sessions are not located. |
| 6715051 | Fire & Desire | Useful | 1 / 0 | Kalamazoo group history is supported; rehearsal, demo and studio versions are not assigned one session room. |
| 6034801 | Our Mannequin | Useful | 1 / 0 | Los Angeles beat-scene history is supported; later Berlin album sessions are not transferred to Our Mannequin. |
| 111915 | Snow / Jazzmin | Useful | 1 / 0 | Cloud 9 is Gavin Cheung, with London professional history. The record title and label’s geography do not locate its sessions. |
| 4345030 | I Only Get That Feeling / We've Been In Love Too Long | Useful | 1 / 0 | Bob Meyer’s Charlotte career is supported; El Anthony’s separate identity/geography is not yet documented. |
| 11065335 | Indian Acid / Pee Pee | Useful | 1 / 0 | First-party Bollywood/Indian source context is explicit; original artists and takes are unnamed. No Mumbai session or composer is guessed. |
| 5956460 | New Life / Follow Me | Useful | 1 / 0 | Stefano Zito’s Rome DJ history is supported; another BWH record’s studio credit is not transferred. |
| 4312 | Clear Skyz | Useful | 1 / 0 | Bristol musical history is supported; a specific recording room is not documented. |
| 1233959 | Many Faces Of Snowboy | Useful | 2 / 0 | Institutional catalogue supplies partial matching-track studio credits; the mobile session remains unplaced and CD track numbers are translated to the owned sequence. |
| 15656885 | Uniile 1 | Useful | 1 / 0 | Uniile / Leo Pol identity and Paris work are supported. The 2020 London remaster is a separate production stage. |
| 8030996 | Stars | Below minimum | 0 / 0 | Exact Tom Noble identity is supported by metadata and indexed specialist descriptions. NYC is explicitly the label base; no artist/session location is accepted from that alone. |
| 163351 | Neguastnegus | Below minimum | 0 / 0 | The catalogue and artist profile mix label and performer descriptions. Terry Tee is a candidate alias; no geographic claim accepted until the identity role is independently established. |
| 5803138 | Praga De Urubu Só Pega Em Cavalo Magro | Useful | 1 / 0 | The representative documents the Lisbon duo. LuxFrágil live credit is not expanded into a precise venue/session pin without an independent venue match. |
| 10708678 | Fabrizio De André In Concerto - Arrangiamenti PFM | Useful | 3 / 0 | Live venues are documented; no track-by-concert assignment. London mobile-studio ownership is not the concert location. |
| 45229 | House Of Love | Below minimum | 0 / 0 | Hard Wax calls this NYC house, but that classification and the New York label address are insufficient for a precise artist formation or recording claim. |
| 1042849 | Do Fries Go With That Shake | Useful | 2 / 0 | Clinton’s Plainfield and Detroit musical history is documented; the single’s Thick Mix session location remains unknown. |
| 30307487 | The Creatures (Vol. 1) | Useful | 1 / 0 | The Rimini Mario Flores/Sangy project is identified; no session credit is inherited from other Creatures recordings. |
| 697572 | The Singles 1967 - 1971 | Useful | 3 / 0 | Bootleg compilation: Parliaments history is documented; the later Funkadelic identity and individual recording/pressing provenance remain distinct. |
| 6127229 | Live At The Unicorn, July 1967 | Useful | 0 / 2 | Boston formation is independently rechecked; the representative bootleg uses the earlier Underground Cinema name. Exact live-take equivalence is not asserted. |
| 8786827 | It Won't Come Easy / Batman | Below minimum | 0 / 0 | Batman has conflicting performer/producer/studio attribution within the catalogue. The older blanket Randy’s claim is narrowed to A-side scope; no B-side session accepted. |
| 5030835 | Stop Bajon | Useful | 1 / 0 | Milan professional career is documented; Stop Bajon session location is not established by a Naples birthplace or Belgian edition market. |
| 35247 | Theme | Useful | 1 / 0 | London trio history is independently corroborated; Underdog’s own background and remix-specific studio allocation remain separate. |
| 19378 | The Storm | Useful | 1 / 0 | West London musical network is documented; the exact credited Dom & Roland studio address is not established. |
| 5666067 | Museica | Useful | 2 / 0 | Recording and mixing cities are documented as separate stages; mastering is not an original-music origin. |
| 201238 | Love Thing / Soul 80 | Useful | 1 / 0 | Marcus Intalex’s Manchester context is supported; ST Files and Calibre retain separate identities and source-sample locations remain unverified. |
| 12716187 | Universal Beings | Useful | 2 / 0 | All four side-level session credits are reviewed; only the missing New York and Altadena threads are newly added. No private street address is published. |
| 164362 | Dance With You / I Gotta Keep Dancin' (Keep Smiling) | Useful | 1 / 0 | Los Angeles vocal career is documented; 1977 and 1979 tracks are not treated as one session. |
| 9059108 | It's Alright | Useful | 1 / 0 | The Woodbridge/Sprosen London dub act is distinct from Colin Lindo; Nishka’s own history and unreleased dub session details remain unverified. |
| 1614712 | Southern Funkin' - Louisiana Funk & Soul 1967-1975 | Useful | 3 / 0 | Louisiana repertoire has track-scoped city connections. Owned title says 1967–1975 while the compiler/original CD says 1967–1979; no silent metadata rewrite. |
| 15729017 | No Limit / Do It Till The Fluid Gets Hot | Useful | 1 / 0 | Philadelphia band history is supported; original recordings and later extended versions are not assumed to be one session. |
| 114068 | New Forms | Useful | 0 / 1 | Bristol formation is independently rechecked; Wide Screen Version session scope remains unverified. |
| 4253186 | You Rock Me  | Useful | 1 / 0 | Larry Heard’s Chicago musical development is supported; Chad White’s own geography and later session room are not inherited. |
| 61932 | You're Not Alone | Useful | 0 / 1 | Historic London formation is corroborated by John Bush’s biography; Apple’s unrelated later catalogue entries are ignored. Multiple remixes are not assigned original-version studio credits. |
| 24882914 | Good Kid, M.A.A.D City | Useful | 1 / 0 | Compton musical and narrative context is explicit in the artist interview; this reissue’s manufacture and mastering places are not recording origins. |
| 14480820 | Kind Of Blue | Useful | 0 / 1 | Original New York sessions are rechecked on the official Miles Davis site; the blue-vinyl edition’s packaging does not establish new sessions. |
| 2720604 | Anne Will / Starship Discotheque | Below minimum | 0 / 0 | Smallville’s accessible page provides tags but no historical text; an RA feature body is unavailable. Heidelberg remains a strong lead, not a new accepted city claim from copied retailer text. |
| 9034937 | Dniheb | Useful | 0 / 1 | Berlin professional base explicitly includes Dniheb; another artist’s remix and current concert cities are not treated as original sessions. |
| 8800233 | Surinam Funk Force | Useful | 0 / 1 | The compiler documents Surinamese musical repertoire; Surinamese diaspora geography and each original session are not collapsed into one country. |

## Readiness and next step

The method is usable as an agent-assisted collection intake: collect once by stable entity, route research by question, reuse reviewed evidence, validate, project, and deliver a separate exception queue. The pilot demonstrates additional yield and useful reuse without hiding uncertainty. It does **not** demonstrate exhaustive or unattended research in one pass.

The next validation should use an independent collection and instrument active source-review time. Keep the frozen minimum, report genre-specific yield (especially hip hop, blues, jazz and funk), and measure unresolved cases rather than selecting only easy artists. Sample, cover and musical-lineage links between recordings still need their own relationship schema and evidence review before collection-wide rollout.

No merge is included in this work. The prior first-pass report remains as a dated historical snapshot.
