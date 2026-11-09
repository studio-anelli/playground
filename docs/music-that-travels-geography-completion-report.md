# Music That Travels — Consolidated geographic research and coverage report

**9 November 2026 · PR #90 · `research/music-geography-completion-02` · Status: research incomplete, do not merge.**

The frozen queue consists of **257 distinct release and instance IDs**, from **610 collection copies / 608 editions**. Source research has **accepted 90 new musical-geography records**. **167 entries are still pending evidence review**, not proven to lack geographic origin.

| Count | Copies | % collection |
| --- | ---: | ---: |
| Previously projected music associations | 353 | 57.9% |
| **New accepted exact-queue editions** | **90** | **14.8%** |
| **Projected post-source-merge music coverage** | **443** | **72.6%** |
| Remaining queue without accepted music geography | 167 | 27.4% |
| Previously audited edition-market placement | 600 | 98.4% |

**Projection only.** Source snapshot 353 is not the presently regenerated map. Older built map baseline had 329 located copies. The projected 443 music-lens positions are NOT proof of a rebuilt Worker, preview or live placement. Both-perspectives coverage and whole-collection city/region/country breakdown are unknown until source regeneration and a complete build audit.

**Newly accepted overview precision:** 68 city, 5 region, 17 country. **Source-claim types across accepted records:** 85 artist, 12 recording, 2 repertoire or compilation concept (multiple claims per record allowed). Recording location does not automatically apply to a remix or master sibling.

## Notable musical journeys

- *Closer / Tam Tam*: Paris post-punk practice, explicit Studio d'Auteuil and Pompidou sessions.
- *What Makes You Go For It*: Cologne instrumental, Berlin vocal overdub, separate production stages confirmed by Ostgut Ton.
- *Disco Illusion*: original recording in Trinidad and Tobago, distinct from the later edition market.
- *Gypsy Woman*: original song recorded and mixed in Baltimore, with remix coverage explicitly limited.
- *No Satellites Please*: original Minneapolis production credit; *At Ease*: album sessions in Ridgewood, Queens.
- *For*: DJ Marcelle's Amsterdam recording; *Have You Been There, Have You Seen It*: Helena Hauff's Hamburg studio.
- *Urban and Tribal Portraits*: original Milan sessions distinguished from an unrelated album's sessions.
- Goya's *House at the Sea / Mandy*: Conny's Studio in Wolperath, not reissue distributor geography.
- *Totally Wired*: London acid-jazz compilation concept without relocating all underlying songs.
- Cheb Runner's *Tagnawit*: Brussels project base and Morocco's Gnawa repertoire kept distinct.
- *Divine Reeds*: Epirus performance tradition, not inferred Athens studio.

## Scope, checks and build limitations

**Completed:** whole 257-ID ledger reconciliation, independently cited artist/recording/scene/repertoire claims for 90 queue records, preservation of all other IDs as pending, and source-level structural checks. Checked 257 unique release IDs, 257 unique instance IDs, exact queue-register pairings and valid typed evidence fields/URLs/geographic coordinates. Source `cultural-threads.json` is committed. A Node regression test is committed at `lib/music-that-travels/tests/geography-completion.mjs`.

**Not completed:** full source lookup for 167 records; Python `prepare-origins.py`, `build.py`, research-method and Node regression execution on a rebuilt map; generated `origin-collection.json` and `worker.js` are unchanged at last verification; there is no verified Cloudflare preview or successful PR build. CI regeneration is configured under `.github/workflows/music-geography-regenerate.yml` but its execution has not been confirmed. This is **not** an end-to-end completion of the 257-record mission.

Unplaced and anonymous items must remain accessible. Pressing country, genre and label HQ must not fill holes. The source unavailable is not the music origin absent.

## Every accepted queue record (90)

| Release ID | Artist, edition | Accepted association (first anchor) | Source |
| --- | --- | --- | --- |
| 25466773 | Bejenec — Slavic Breus EP | artist: Ukraine (country) | [Source](https://bejenec.bandcamp.com/album/slavic-breus-ep) |
| 7798224 | Lucindo — Alien Rebellion | artist: Berlin (city) | [Source](https://fr.ra.co/dj/lucindo/biography) |
| 154166 | Machine Shop — Naked Lunch | artist: Netherlands (country) | [Source](https://clone.nl/instock/label/4lux) |
| 13099166 | Nu No — Turva Lingua | artist: Portugal (country) | [Source](https://8mmrecords.bandcamp.com/album/turva-lingua) |
| 39348 | Various — Totally Wired (A Collection From Acid Jazz Records) | repertoire: London (city) | [Source](https://acidjazz.co.uk/products/totally-wired) |
| 13487844 | DJ Pierre — Acid 88 Volume III | artist: Chicago (city) | [Source](https://ra.co/dj/djpierre/biography) |
| 512650 | K-9 Posse — Ain't Nothing To It | artist: Teaneck (city) | [Source](https://www.allmusic.com/artist/k-9-posse-mn0000839282) |
| 252518 | Suzy Q — Get On Up Do It Again | artist: Montréal (city) | [Source](https://citizenfreak.com/artists/103854-suzy-q) |
| 11421995 | Solar Shield — Solar Shield | artist: Austin (city) | [Source](https://austinboogiecrewrecords.bandcamp.com/album/solar-shield) |
| 21461563 | Dolette McDonald — (Xtra) Special | artist: Newark (city) | [Source](https://www.sjchs.org/resource-hub/smart-living-magazine/may-june-2025/working-in-harmony) |
| 302197 | Fuzz Against Junk — Country Clonk | artist: London (city) | [Source](https://www.balearicbreakfast.com/post/balearic-breakfast-episode-215-a-beatlesesque-magical-mystery-world-of-swirling-psychedelic-patterns) |
| 162975 | DJ Kent — In The Bush | artist: Johannesburg (city) | [Source](https://www.afrisson.com/in-the-bush/) |
| 777916 | Lexx — Sirocco | artist: Zürich (city) | [Source](https://ra.co/dj/lexx/biography) |
| 14192193 | KUSO GVKI — Culture | artist: Berlin (city) | [Source](https://kusogvki.bandcamp.com/album/culture) |
| 193558 | Force Of Angels — Methods To My Madness E.P. | artist: South London (city) | [Source](https://lawauder.bandcamp.com/track/sea-of-chaos) |
| 8901124 | Robert Bergman — B02 | artist: Antwerp (city) | [Source](https://www.newtone-records.com/artist/Robert%2BBergman) |
| 194086 | Echo Minott — Murder Weapen Jungle | artist: Kingston (city) | [Source](https://bat-records.com/label/echo-minott/) |
| 1697742 | Marco Bernardi — Mystery Of Nazerus (Remixes) | artist: Glasgow (city) | [Source](https://www.somarecords.com/artists/octogen/) |
| 97331 | Tribe Of Issachar / Peter Bouncer — Junglist (Remixes) | artist: London (city) | [Source](https://djmag.com/features/congo-natty-junglistic-soldier) |
| 358586 | Blackstar (2) — Radical (DJ Kane Remixes) | artist: London (city) | [Source](https://djmag.com/features/congo-natty-junglistic-soldier) |
| 135052 | Tribe Of Issachar / Top Cat — Champion Natty | artist: London (city) | [Source](https://djmag.com/features/congo-natty-junglistic-soldier) |
| 27313062 | Data Memory Access — Hi-Tee EP | artist: Berlin (city) | [Source](https://trommelmusic.com/featured/rising-stars-data-memory-access/) |
| 501628 | Kenny Carvajal / Carla Prather — First Time | artist: Chicago (city) | [Source](https://www.nts.live/artists/140852-kenny-carvajal) |
| 1497696 | Cosmic Force — Uncompromised | artist: Netherlands (country) | [Source](https://ra.co/dj/cosmicforce) |
| 16086639 | Coco Bryce — Hold The Line EP | artist: Breda (city) | [Source](https://djmag.com/content/get-know-coco-bryce) |
| 17111145 | Workforce (5) — Moods EP | artist: United Kingdom (country) | [Source](https://ra.co/dj/workforce) |
| 10511020 | Codek — Closer / Tam Tam | artist: Paris (city) | [Source](https://codek.bandcamp.com/album/closer-tam-tam) |
| 10505637 | Tobias Bernstrup — 27 | artist: Stockholm (city) | [Source](https://www.bernstrup.com/pagecv) |
| 4304708 | Powell (9) — Body Music EP | artist: London (city) | [Source](https://www.allmusic.com/artist/powell-mn0003219352) |
| 11517554 | Not Waving — Good Luck | artist: London (city) | [Source](https://www.allmusic.com/artist/not-waving-mn0003108565) |
| 10816361 | London Modular Alliance — Hands & Brains EP | artist: London (city) | [Source](https://dimensionsrecordings.kudosrecords.co.uk/release/direc007/moons-delux-london-modular-alliance-material) |
| 11373857 | Yoshinori Hayashi (2) — Uncountable Set | artist: Tokyo (city) | [Source](https://www.theransomnote.com/music/mixes/yoshinori-hayashi-the-ransom-note-mix/) |
| 15501102 | Luar Domatrix — Baía Stamina | recording: Glasgow (city) | [Source](https://acabine.pt/2020/07/luar-domatrix-baia-stamina/) |
| 974746 | Guadeloupe Reflexions — Un Jeudi A L'Arawak | artist: Guadeloupe (region) | [Source](https://www.distantrhythm.com/store/p/guadeloupe-reflexions-un-jeudi-a-larawak) |
| 24685 | DJ Slip — No Satellites Please | recording: Minneapolis (city) | [Source](https://dropbassnetwork.bandcamp.com/album/no-satellites-please) |
| 6213392 | Distant Echoes — Fury Road EP | artist: Italy (country) | [Source](https://ra.co/dj/distantechoes-de) |
| 8395702 | Alex.Do — Beyond The Black Rainbow EP | artist: Berlin (city) | [Source](https://ra.co/dj/alex.do/biography) |
| 10531324 | Recondite — Theater II | artist: Lower Bavaria (region) | [Source](https://www.buddemusic.de/roster/recondite) |
| 9025846 | Omnibus (7) — Israels / Rhythmus (1980-1985) | artist: Czechoslovakia (country) | [Source](https://unearthingthemusic.eu/posts/omnibus-israels-rhythmus-1980-1985/) |
| 11819264 | Goya (7) — House At The Sea / Mandy | recording: Wolperath (city) | [Source](https://www.hhv.de/en/records/item/goya-house-at-the-sea-mandy-584186) |
| 1566213 | Norma Jean Bell — I'm The Baddest Bitch (The Moodymann Mixes) | artist: Detroit (city) | [Source](https://www.allmusic.com/artist/norma-jean-bell-mn0000455694) |
| 6554726 | FIT Siegel — Carmine | artist: Detroit (city) | [Source](https://ra.co/dj/fitsiegel/biography) |
| 13172138 | FIT Siegel / Kassem Mosse — Saboten | artist: Detroit (city) | [Source](https://ra.co/dj/fitsiegel/biography) |
| 9292116 | Mori-Ra — Oriental Forest | artist: Osaka (city) | [Source](https://ra.co/dj/morira/biography) |
| 2573057 | Slava (2) — Dreaming Tiger | artist: Chicago (city) | [Source](https://music.apple.com/us/artist/slava/76028746) |
| 11768093 | Will DiMaggio — At Ease | recording: Ridgewood, Queens (city) | [Source](https://ra.co/news/41327) |
| 5437927 | Africaine 808 — Lagos, New York // Zombie Jamboree | artist: Berlin (city) | [Source](https://daily.redbullmusicacademy.com/2016/02/interview-africaine-808/) |
| 10752055 | Octo Octa — Adrift | artist: Brooklyn (city) | [Source](https://www.insomniac.com/music/artists/octo-octa/) |
| 14273207 | LTJ Edits — Hot Groovy Edits 3 | artist: Italy (country) | [Source](https://ra.co/dj/ltjedits) |
| 13534190 | Gary Gritness — The Legend Of Cherenkov Blue  | artist: Nancy (city) | [Source](https://garygritness.bandcamp.com/album/the-legend-of-cherenkov-blue) |
| 13619980 | Daniele Mana — Seven Steps Behind | artist: Turin (city) | [Source](https://www.soundbetter.com/profiles/132604-daniele-mana) |
| 22309528 | Delfonic / Kapote — Illegal Jazz Vol. 1 | artist: Berlin (city) | [Source](https://www.toytonics.de/2021/05/28/delfonic-kapote-illegal-jazz-vol-4-ijr004/) |
| 5081661 | Stephen Encinas — Disco Illusion | recording: Trinidad and Tobago (country) | [Source](https://ra.co/reviews/14053) |
| 12125066 | DJ Marcelle/Another Nice Mess — For | artist: Amsterdam (city) | [Source](https://vimeo.com/1082047902) |
| 1782030 | King Britt / Oba Funke — Bush Workout | artist: Philadelphia (city) | [Source](https://www.pewcenterarts.org/fellow/king-britt) |
| 12842013 | Fatima Yamaha — Imaginary Lines | artist: Netherlands (country) | [Source](https://ra.co/dj/fatimayamaha) |
| 37985 | Crystal Waters — Gypsy Woman (She's Homeless) | recording: Baltimore (city) | [Source](https://musicbrainz.org/release/9f0a966c-8429-4acd-a6ad-c0aa2c64cac9) |
| 11498568 | Eamon Harkin — Weaker Moments  | artist: New York City (city) | [Source](https://nowadays.nyc/resident/eamon-harkin/) |
| 11826621 | Olsen (2) — No One Belongs Here More Than You EP | artist: New York City (city) | [Source](https://misterolsen.bandcamp.com/album/no-one-belongs-here-more-than-you-ep) |
| 8509913 | Nebraska —  Look What You've Done To Me EP   | artist: London (city) | [Source](https://ra.co/reviews/19242) |
| 5164913 | Madteo — Insider | artist: New York City (city) | [Source](https://ra.co/dj/madteo) |
| 1894057 | Mr Raoul K — Wind Of Goree | artist: Hamburg (city) | [Source](https://www.amsterdam-dance-event.nl/en/artists-speakers/mr-raoul-k/4581/) |
| 11047607 | Helena Hauff — Have You Been There, Have You Seen It | artist: Hamburg (city) | [Source](https://www.liaisonartists.com/artists/helena-hauff/) |
| 9684455 | Jamal Moss — Ginger Snaps EP | artist: Chicago (city) | [Source](https://ra.co/dj/hieroglyphicbeing/biography) |
| 80037 | David Toop / Max Eastley — New And Rediscovered Musical Instruments | artist: London (city) | [Source](https://www.cccb.org/en/w/participants/david-toop) |
| 972054 | Prosumer & Murat Tepeli — What Makes You Go For It | recording: Cologne (city) | [Source](https://www.berghain.berlin/en/shop/releases/prosumer-murat-tepeli-what-makes-you-go-for-it/) |
| 6774 | Digital — One Ton | artist: Ipswich (city) | [Source](https://www.redbullmusicacademy.com/lectures/digital-roots-rocker/) |
| 309825 | Shitmat — Full English Breakfest Volume 4 | artist: Brighton (city) | [Source](https://www.allmusic.com/artist/shitmat-mn0000115041) |
| 4288392 | Ajukaja — Benga Benga | artist: Tallinn (city) | [Source](https://ra.co/dj/ajukajaandats/biography) |
| 14028131 | Psychemagik — Undercover Lovers Vol 1 | artist: United Kingdom (country) | [Source](https://ra.co/dj/psychemagik) |
| 11019692 | sano — Latino Body Music Vol. II | artist: Medellín (city) | [Source](https://ra.co/dj/sano) |
| 16406805 | Τάσος Χαλκιάς — Divine Reeds: Obscure Recordings From Special Music Record Company (Athens 1966-1967) | artist: Epirus (region) | [Source](https://www.avopolis.gr/albums/greek-albums/72592-tasos-xalkias-divine-reeds-obscure-recordings-from-special-music-record-company-athens-1966-1967-review) |
| 14922154 | Cheb Runner — Tagnawit EP | artist: Brussels (city) | [Source](https://listenfestival.be/our-scene/visiting-molenbeat-finest-cheb-runner) |
| 8479529 | Gerd — Planet F.M.D.X. Pt. 1 | artist: Netherlands (country) | [Source](https://ra.co/dj/gerd) |
| 13742611 | DJ Fett Burger / DJ Speckgürtel — Red Scorpions | artist: Moss (city) | [Source](https://fettburger.com/dj) |
| 33967 | DJ Ruffneck — Responze Tezt / I Am The One | artist: Netherlands (country) | [Source](https://ra.co/dj/djruffneck) |
| 10518041 | Senyaka — Bayanyonyoba | artist: South Africa (country) | [Source](https://musicismysanctuary.com/senkaya-bayanyonyoba-1987-1993-rush-hour) |
| 12698071 | Masalo — New Dance / Cycles | artist: Amsterdam (city) | [Source](https://dgtl-festival.com/en/artists/masalo-live) |
| 5606046 | Mono Junk — Untitled | artist: Turku (city) | [Source](https://ra.co/dj/monojunk) |
| 11405284 | Roberto Musci / Giovanni Venosta — Urban And Tribal Portraits | artist: Milan (city) | [Source](https://sites.google.com/view/robertomusci/about) |
| 479518 | Big Bud — Fear Of Flying (Album Sampler No.1) | artist: Southampton (city) | [Source](https://bigbud1.bandcamp.com/album/free-beats) |
| 8227117 | Moplen / DJ Rocca — Space Disco Ep Vol.1 | artist: Bergamo (city) | [Source](https://ra.co/dj/moplen) |
| 538235 | Potential Bad Boy — Take Me Home / Do U Feel Me? | artist: United Kingdom (country) | [Source](https://ra.co/dj/potentialbadboy) |
| 14446701 | Jus-Ed — Where Has The Romance Gone? | artist: Bridgeport (city) | [Source](https://ra.co/dj/jused/biography) |
| 27471945 | Steel Band Shell De Port-Louis — Ban Moin On Ti Bo | artist: Guadeloupe (region) | [Source](https://archives.crem-cnrs.fr/archives/collections/CNRSMH_E_2011_005_015/) |
| 13360264 | I-f — Space Invaders' Revenge | artist: The Hague (city) | [Source](https://www.festivalinfo.nl/artist/91594/I-F/) |
| 18579 | Alex Neri — Planet Funk 2 | artist: Tuscany (region) | [Source](https://it.ra.co/dj/alexneri/biography) |
| 8426622 | André Kronert — Ain't No Funny Music / Dirty Old Man | artist: Germany (country) | [Source](https://ra.co/dj/andrekronert) |
| 15507007 | Cygnus (5) — Neon Flux | artist: United States (country) | [Source](https://ra.co/dj/cygnus) |
| 680278 | Jonny L — This Time EP Sampler | artist: London (city) | [Source](https://dropthebass.co/artists/jonny-l) |

## Every record still requiring source verification (167)

| Release ID | Artist, edition | Issue to resolve |
| --- | --- | --- |
| 258314 | Cosmosis (2) — Tell Her | Independent musical origin / formation / recording evidence |
| 108283 | Skin Divers — Enclosed Spaces (Aquasky Remix) | Independent musical origin / formation / recording evidence |
| 8030996 | Diamond Jackson — Stars | Previous routes had no accepted location; further checks needed |
| 1406478 | Meta4 — Pizguh / Tripguh | Independent musical origin / formation / recording evidence |
| 77058 | Subject 13 — Spirit Breakdown / Can't Wait Tonight | Independent musical origin / formation / recording evidence |
| 240699 | Ackie / Chesse Roots — Call Me Rambo / Rambo Gun Salute | Independent musical origin / formation / recording evidence |
| 14472273 | The Goods (9) — Peach | Independent musical origin / formation / recording evidence |
| 12362927 | MANDINGO BRASS / Infinite Love Experience — Everything Looks Better From A Distance / Thank You Lord | Independent musical origin / formation / recording evidence |
| 331602 | Various — Just Us / I Don't Want To Lose Your Love / Everybody Here Must Party | Track provenance or bounded compilation concept |
| 13072057 | Fabrizio Fattori — Mediterranean Africa | Independent musical origin / formation / recording evidence |
| 15792075 | Enaune — Cycle du Petit Prince de Saint​-​Exupéry | Independent musical origin / formation / recording evidence |
| 1623945 | No Artist — Stereo Test Sound Effects / Stereo Demonstratie & Geluids Effecten | Creator identity unresolved |
| 9905508 | Various — Black Gold | Track provenance or bounded compilation concept |
| 14125997 | Pépe (2) — Life Signs EP | Independent musical origin / formation / recording evidence |
| 2236823 | Busy (3) — M0ths | Independent musical origin / formation / recording evidence |
| 211757 | Clockwork (3) — Feela-La-La | Independent musical origin / formation / recording evidence |
| 193283 | Force Of Nature (2) — The Ho' Mixes | Independent musical origin / formation / recording evidence |
| 26121944 | VTL One — Language Machine EP | Independent musical origin / formation / recording evidence |
| 22284061 | Nadie La Fond / Embryo (11) — Al Kent & Frankie Francis Sofrito Edits | Independent musical origin / formation / recording evidence |
| 10307172 | Rag Dabons — T'es Plus Le Même Depuis Que T'as Changé EP | Independent musical origin / formation / recording evidence |
| 11685775 | Octachoron — Land Of Meta | Independent musical origin / formation / recording evidence |
| 29125525 | QphoriQ — Wonch Like Woo | Previous routes had no accepted location; further checks needed |
| 20336797 | Various — Disco Hamam - 7 | Track provenance or bounded compilation concept |
| 554183 | Various — Black Edition | Track provenance or bounded compilation concept |
| 14334743 | SHKN — domesticated003 | Independent musical origin / formation / recording evidence |
| 52735 | A.P.E. — Striplight | Independent musical origin / formation / recording evidence |
| 24784 | Safari Sounds — Droppin' Science Volume 07 | Independent musical origin / formation / recording evidence |
| 7488481 | Armitage — They Live EP | Independent musical origin / formation / recording evidence |
| 41585 | D'Enborage / Tronikgatan — Kaihoisa Pt.1 | Independent musical origin / formation / recording evidence |
| 3693330 | Various — Editorial #4 | Track provenance or bounded compilation concept |
| 10377344 | Don't DJ — Hyperspace Is The Place / Hyperspace Is No Place | Independent musical origin / formation / recording evidence |
| 255511 | Canute — Amazing Mind | Independent musical origin / formation / recording evidence |
| 971558 | Obscure FM — Michael Jackson Is In Heaven Now! | Independent musical origin / formation / recording evidence |
| 8722978 | The Charisma Band — Ain't Nothing Like Your Love / Bless The Day | Independent musical origin / formation / recording evidence |
| 2309936 | Various — Wanted Dead Or Alive / Little People / Got To Get Me A Job / Humpty Dump | Track provenance or bounded compilation concept |
| 4163662 | Shock (3) — Shock Waves | Independent musical origin / formation / recording evidence |
| 9919633 | Various — Freedom Is Rising | Track provenance or bounded compilation concept |
| 5624549 | Alis (6) — Apache | Independent musical origin / formation / recording evidence |
| 1015874 | Various — Firecracker EP 3 | Track provenance or bounded compilation concept |
| 201255 | Three Disciples — Gwarn (Remix) | Independent musical origin / formation / recording evidence |
| 200739 | L Double — Music For The 90's / The Mad Phunk | Independent musical origin / formation / recording evidence |
| 10330769 | SJ Tequilla — Conditionel | Independent musical origin / formation / recording evidence |
| 25199035 | T. J. Johnson Band — I Can Make It (Good For You) | Independent musical origin / formation / recording evidence |
| 76971 | Rude Bwoy Monty — Jungle Man / Out In Da Streets | Independent musical origin / formation / recording evidence |
| 3408361 | Mathematics — Funhouse / Brass Knuckles | Independent musical origin / formation / recording evidence |
| 14477 | Bill Riley — The Chill / Future Funk | Independent musical origin / formation / recording evidence |
| 5954869 | The Funky Drive Band — Funky Drive'z Me Crazy / Love Guarantee | Independent musical origin / formation / recording evidence |
| 35118 | Argonic — Future Frontier 002 | Independent musical origin / formation / recording evidence |
| 254459 | Nightwalker — Jeopardy (Audio Remix) / Crazy Head (VIP) | Independent musical origin / formation / recording evidence |
| 910642 | Various — Beyond The Valley Of The Superbeats | Track provenance or bounded compilation concept |
| 6176026 | Deo & Z-Man — No Bullshit Remixes EP | Independent musical origin / formation / recording evidence |
| 4858498 | Heavy Disco — Super Jock | Independent musical origin / formation / recording evidence |
| 24368522 | Gold In The Shade — Over You / Shining Through | Independent musical origin / formation / recording evidence |
| 110736 | Chemise — She Can't Love You | Independent musical origin / formation / recording evidence |
| 84360 | C.M.C. — Pump It Up / Let Loose | Independent musical origin / formation / recording evidence |
| 313021 | Dante (11) — Barefoot Boogie Volume One | Independent musical origin / formation / recording evidence |
| 2099185 | Jah Seal — Jah Soldier | Independent musical origin / formation / recording evidence |
| 246845 | Soul Bossa Trio — Dolphins / Words Of Love | Independent musical origin / formation / recording evidence |
| 11265395 | Q (10) — The Voice Of Q | Independent musical origin / formation / recording evidence |
| 51304 | Various — Old School Vs. New School:  Let The Breaks Roll | Track provenance or bounded compilation concept |
| 254916 | The Dream Team — The MENACE / Drugs And Money | Independent musical origin / formation / recording evidence |
| 12941656 | Balearic Skip — Balearic Skip | Independent musical origin / formation / recording evidence |
| 51412 | The Two G's — Energy / The Reno | Independent musical origin / formation / recording evidence |
| 6997484 | Pamela Prati — Mare / Un Nodo All'Anima | Independent musical origin / formation / recording evidence |
| 12142239 | Giovanni Damico — Afro Stomp EP | Independent musical origin / formation / recording evidence |
| 1082139 | Noodles & Wonder — Dub Soup EP | Independent musical origin / formation / recording evidence |
| 10579183 | Makoto Murakami — Mountain Skins EP | Independent musical origin / formation / recording evidence |
| 163351 | Knowledge & Wisdom — Neguastnegus | Previous routes had no accepted location; further checks needed |
| 12796262 | Shift (3) — Roller Rink Funk | Independent musical origin / formation / recording evidence |
| 5664657 | KingCats — Down In California | Independent musical origin / formation / recording evidence |
| 20707 | Tonic — The Mack (Remix) / Hip To The Hoppa | Previous routes had no accepted location; further checks needed |
| 55665 | Various — Bag Of Goodies | Track provenance or bounded compilation concept |
| 5066132 | Joe's Bakery — Blue Tuesday | Independent musical origin / formation / recording evidence |
| 745165 | Moleculez — Mekanikal Mayhem | Independent musical origin / formation / recording evidence |
| 262652 | Minx — Dreamtime | Independent musical origin / formation / recording evidence |
| 9148392 | Music People (2) — Always On | Previous routes had no accepted location; further checks needed |
| 14689821 | First Touch — Sofea | Independent musical origin / formation / recording evidence |
| 19289326 | Various — Madre Lingua | Track provenance or bounded compilation concept |
| 8108409 | Bxentric — Patch Valley  | Previous routes had no accepted location; further checks needed |
| 861479 | Rudoulpho / Blood (3) — Sunday Afternoon / Peace In The Nation | Independent musical origin / formation / recording evidence |
| 8188592 | Lata Ramasar — The Greatest Name That Lives | Independent musical origin / formation / recording evidence |
| 15146925 | Unknown Artist — Sissy's Hot Summer A Go-Go ! / Mrs.Peel We're Needed !!! | Creator identity unresolved |
| 2197760 | Various — Rekutts Vol. 1 | Track provenance or bounded compilation concept |
| 16011980 | Bonfim — «An extended​-​play record of assembled sounds for different kinds of moods» | Independent musical origin / formation / recording evidence |
| 28522651 | Various — Eccentric Boogie | Track provenance or bounded compilation concept |
| 654319 | Sileni — Twitchy Droid Leg Remixes Part One | Independent musical origin / formation / recording evidence |
| 695304 | Burton Inc. / Firebolts — L.A. Will Make You Pay / Everybody Party (Kon 12" Re-edit) | Previous routes had no accepted location; further checks needed |
| 10771522 | Enrico Serotti — Homemade Music Vol. II (1983-1999) | Independent musical origin / formation / recording evidence |
| 6785873 | Makala Jazz Funk Band — Xake! | Independent musical origin / formation / recording evidence |
| 7367418 | John Bence — Disquiet | Independent musical origin / formation / recording evidence |
| 7917513 | Marta Acuna — Dance, Dance, Dance | Independent musical origin / formation / recording evidence |
| 9131093 | Various — Rhythms Of The Pacific Volume 3. | Track provenance or bounded compilation concept |
| 1008363 | Greyship Daviz — Traffic (Cheek To Cheek Bumper To Bumper) | Independent musical origin / formation / recording evidence |
| 1099353 | Various — Super Disco Brakes' Vol. 8 | Track provenance or bounded compilation concept |
| 6419810 | Moon B — III | Independent musical origin / formation / recording evidence |
| 9872263 | Leroy Ace Miller / Aceloveace — Teacher  / The Teacher | Independent musical origin / formation / recording evidence |
| 10796993 | Circuitry — She's Just That Type Of Girl | Independent musical origin / formation / recording evidence |
| 10579142 | Argoman — Chimicalissimo | Independent musical origin / formation / recording evidence |
| 11072824 | Conga Square — Secada Mondatta | Independent musical origin / formation / recording evidence |
| 16084646 | Matteo Coffetti — Hypnotecho'O | Independent musical origin / formation / recording evidence |
| 373 | Special Forces — Special Forces / Propaganda | Independent musical origin / formation / recording evidence |
| 11762293 | Clive Matthews — They Will Never Find Jah / Jah Soon Come   | Independent musical origin / formation / recording evidence |
| 558217 | Life Boogie — Bobby's Job / Nina Cares | Independent musical origin / formation / recording evidence |
| 527300 | DJ Catalist / Life Boogie — Vol. 4 | Independent musical origin / formation / recording evidence |
| 21945322 | Various — Pre-​Delay /​/​/ 04 | Track provenance or bounded compilation concept |
| 41275 | Icons — Icons II | Independent musical origin / formation / recording evidence |
| 11806 | Einzelgänger — Inside Straight / Troublefunk | Independent musical origin / formation / recording evidence |
| 12575458 | California Flight Project — California Flight Project | Independent musical origin / formation / recording evidence |
| 2255206 | Bill Riley — In At The Deep End / Wake Up | Independent musical origin / formation / recording evidence |
| 16222272 | Quadratschulz — Pudel Produkte 34: quadratschulz Remixes | Independent musical origin / formation / recording evidence |
| 62559 | Space Opera — Space 3001 (The Remixes) | Independent musical origin / formation / recording evidence |
| 25055 | Galera Da Cidade — Goal Brazil / Interlagos | Independent musical origin / formation / recording evidence |
| 3148982 | Teeth (8) — Swarm / Shift / Sequence / Spawn (Part One) | Independent musical origin / formation / recording evidence |
| 13479375 | Candy Bowman — I Wanna Feel Your Love | Independent musical origin / formation / recording evidence |
| 1537500 | Plush — Plush | Independent musical origin / formation / recording evidence |
| 283733 | Various — Renegade Selector (Series 1) | Track provenance or bounded compilation concept |
| 235251 | Tek 9 — Killing Time (Remixed) | Independent musical origin / formation / recording evidence |
| 17881 | Chris Energy — Drum Percpectives EP | Independent musical origin / formation / recording evidence |
| 10912777 | Various — VA Electro | Track provenance or bounded compilation concept |
| 11873515 | Moonlighter (2) — Moonlighter EP | Independent musical origin / formation / recording evidence |
| 9288000 | Hylas — Hylas EP | Independent musical origin / formation / recording evidence |
| 209945 | Substance (2) — Fly / Prisoner | Independent musical origin / formation / recording evidence |
| 1204689 | Comtron — Special Consumer Series Part 2 | Independent musical origin / formation / recording evidence |
| 4913304 | Boogie Nite — It's Real | Independent musical origin / formation / recording evidence |
| 12049177 | Artis (10) — Caecilia | Independent musical origin / formation / recording evidence |
| 10887542 | Secret Mixes Fixes — Fallen Heroes Vol.1 | Independent musical origin / formation / recording evidence |
| 17033907 | Andrew Kitchen (2) — Attack Of The Boogie | Independent musical origin / formation / recording evidence |
| 11446709 | Sugar Experiment Station — Kaptagon | Independent musical origin / formation / recording evidence |
| 30001 | DJ Red Alert & Mike Slammer — Feel So Real / Walking On Sunshine | Independent musical origin / formation / recording evidence |
| 2811130 | Percy X / Blood Sugar — -3 | Previous routes had no accepted location; further checks needed |
| 1621146 | STL — Nocturnal Mixdowns | Independent musical origin / formation / recording evidence |
| 339118 | Slope — Remixed | Independent musical origin / formation / recording evidence |
| 16498374 | Spirit Attack — Spirit Attack | Independent musical origin / formation / recording evidence |
| 8649345 | Man Power (2) — Thnk U / Ablett | Independent musical origin / formation / recording evidence |
| 316639 | New Jack Pimps — Water Jelly | Independent musical origin / formation / recording evidence |
| 13479515 | Hipnotic (2) — Are You Lonely? | Independent musical origin / formation / recording evidence |
| 9933928 | Photon Inc. / Paula Brion — Generate Power | Independent musical origin / formation / recording evidence |
| 453412 | A.M.E.N. — Elephant | Previous routes had no accepted location; further checks needed |
| 148233 | Dr. Suess / Midst of Tumult — Jacuzzi Weekend | Independent musical origin / formation / recording evidence |
| 9855853 | Carl Marshall / The S.D.'S — I'll Give My Heart To You | Independent musical origin / formation / recording evidence |
| 1413532 | NNM Productions / Rick Wayne — Bad Behaviour | Independent musical origin / formation / recording evidence |
| 487157 | Johnny One-Drop — Travelings | Independent musical origin / formation / recording evidence |
| 324162 | TDK — Untitled | Independent musical origin / formation / recording evidence |
| 533275 | Hectic Fence — Blackmailing | Independent musical origin / formation / recording evidence |
| 548314 | DJ Shy (5) — Joint / The Spirit | Independent musical origin / formation / recording evidence |
| 14499190 | Various — Eastern European Cut-Outs | Track provenance or bounded compilation concept |
| 1267143 | Various — Old School Volume 1 | Track provenance or bounded compilation concept |
| 250924 | Drop The Lime — Killy 123 EP | Independent musical origin / formation / recording evidence |
| 27576126 | Yosh (20) — Show Me EP | Independent musical origin / formation / recording evidence |
| 340579 | S.L.M. — Now I'm Finished (The Bells) / Nice 'n' Slow | Independent musical origin / formation / recording evidence |
| 797825 | Various — Acid Trax Vol. 2 | Track provenance or bounded compilation concept |
| 193290 | T-Move Experience — Running In Real Time (The Unreleased Dub) | Independent musical origin / formation / recording evidence |
| 37171 | Fun Boy Flynn — The Fountain Dancer  EP | Independent musical origin / formation / recording evidence |
| 14460113 | Free Dance Song — Free Rythms Dance | Previous routes had no accepted location; further checks needed |
| 13461710 | Ben Human — The Addison Tapes | Independent musical origin / formation / recording evidence |
| 20311276 | Cal Tjader And Orchestra — West Side Story | Independent musical origin / formation / recording evidence |
| 7546119 | Bruce Powell (3) / Władysław Jagiełło — The Reality | Independent musical origin / formation / recording evidence |
| 11705722 | Cynthia Bhikharie — Let's Dance With Cynthia / Once Again | Previous routes had no accepted location; further checks needed |
| 15417065 | Various — African Rare Groove (Rare Funky Songs From Africa) | Track provenance or bounded compilation concept |
| 375740 | Harmonic 33 — Music For Film, Television & Radio Volume One | Independent musical origin / formation / recording evidence |
| 14218890 | Michael Gray — Michael Gray Reworks | Independent musical origin / formation / recording evidence |
| 98807 | Bombers — (Everybody) Get Dancin' | Independent musical origin / formation / recording evidence |
| 152824 | Shirley Lites — Heat You Up (Melt You Down) | Independent musical origin / formation / recording evidence |
| 8528587 | Unknown Artist — WLSLTD03 | Creator identity unresolved |
| 385 | Various — Alt.frequencies - The Single | Track provenance or bounded compilation concept |
| 2866332 | Dead Beats — All I Can Give | Independent musical origin / formation / recording evidence |
| 20490646 | Various — The Dark Side Of Italo Disco | Track provenance or bounded compilation concept |

The full machine-readable record, exact artist IDs, acceptance scope, evidence URLs and note for every accepted place are in `lib/music-that-travels/source/geography-completion-review-register.json`. Future revisions should update this single report after regenerating source and verifying build coverage.
