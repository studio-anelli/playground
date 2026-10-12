import { SiteHeader } from "@/components/site-header";

const recNotes = [
  {
    id: "REC-01",
    title: "Kinetic Composer",
    note: "Recovered as the layered, slightly over-equipped ancestor of the current type experiments. It still believes every parameter deserves another parameter.",
  },
  {
    id: "REC-02",
    title: "Particle Type Distorter",
    note: "Moved from a contained interface into an immersive, full-width field. Noise became global, interaction became softer and the controls learned how to disappear when the work needed the room.",
  },
  {
    id: "REC-03",
    title: "Font Drawing",
    note: "Turned into a usable drawing and carving tool with 12×12 and 24×24 grids, smoother previews, row and column handles, local alphabets and a reset button that finally means reset.",
  },
  {
    id: "REC-05—09",
    title: "Machines, particles and sound",
    note: "The archive expanded to include a drum machine, an ASCII typographic instrument, reactive letter particles, a small synth and Kinetic Type Synth. A respectable amount of machinery for a website with no practical obligation to make noise.",
  },
];

const workingLessons = [
  ["Preview first", "A change now gets its own branch and live preview before it reaches the public site. This sounds obvious. It became obvious only after it became necessary."],
  ["One shell, many behaviours", "The shared interface establishes rhythm, typography and navigation without forcing every experiment into the same canvas logic."],
  ["Keep the accidents", "Some glitches are material; others are simply bugs wearing conceptual clothing. The work is learning to tell them apart."],
  ["Public does not mean finished", "An entry can be usable and still provisional. The status is part of the work, not an apology attached to it."],
];

export default function DiaryPage() {
  return (
    <main className="site-shell diary-shell">
      <SiteHeader />

      <nav className="diary-index" aria-label="Diary entries">
        <span>DEVELOPMENT DIARY / 02 ENTRIES</span>
        <div><a href="#beta-02">BETA 02 <span>↗</span></a><a href="#beta-01">BETA 01 <span>↗</span></a></div>
      </nav>
      <article className="diary-page diary-entry" id="beta-02">
        <header className="diary-hero">
          <div className="diary-meta"><span>BETA 02</span><time dateTime="2026-10-12">12.10.2026</time></div>
          <h1>Things are getting complicated.</h1>
          <p className="diary-lead">
            A few weeks ago, the Playground was a collection of graphic experiments. Now we have oscillators, patch bays, modulation matrices and an increasing number of knobs. Apparently, we are building <em>instruments.</em> Not entirely sure when that happened.
          </p>
        </header>
        <div className="diary-layout">
          <aside className="diary-aside" aria-label="Beta 02 summary"><dl>
            <div><dt>Period</dt><dd>22.09—12.10.26</dd></div>
            <div><dt>State</dt><dd>In progress</dd></div>
            <div><dt>Focus</dt><dd>K-TIC-SYNTH</dd></div>
            <div><dt>Casualties</dt><dd>DUST (temporarily)</dd></div>
            <div><dt>Next</dt><dd>Identity, perhaps</dd></div>
          </dl></aside>
          <div className="diary-body">
            <section className="diary-section">
              <span className="eyebrow">01 / More knobs, more problems</span>
              <h2>Building the conditions for things to happen.</h2>
              <p>Most of our attention went into K-TIC-SYNTH, which started as a relatively simple kinetic typography experiment. Sampling, grid distortion, vertex generation. A few parameters, some animation, reasonably straightforward.</p>
              <p>Then came oscillators, waveforms, noise, modulation and eventually a patch bay. We can now connect different processes, control their influence and construct increasingly elaborate ways of making letters misbehave.</p>
              <p>Rather than applying an effect, we are building the conditions for something to happen. It is considerably more interesting. It is also considerably easier to make something completely illegible.</p>
            </section>
            <section className="diary-section">
              <span className="eyebrow">02 / Some things got worse</span>
              <h2>A respectable achievement.</h2>
              <p>DUST has been particularly uncooperative. We spent quite some time refining particle behaviour, introducing parameters, modifying distributions and experimenting with presets.</p>
              <p>Somewhere along the way, we managed to make it more sophisticated and less convincing. A respectable achievement. So we removed some features, reconsidered the underlying behaviour and temporarily unpublished it.</p>
              <p>Meanwhile, A_SCII continued turning images and typography into characters, while µMS20 and GP999 developed into increasingly elaborate little audio instruments. What began as an aesthetic reference to analogue synthesis is slowly becoming an actual working method. We are borrowing the logic, not just the knobs.</p>
            </section>
            <section className="diary-section">
              <span className="eyebrow">03 / The interface situation</span>
              <h2>Approximately a thousand rearrangements.</h2>
              <p>Floating panels, collapsible modules, sliders, knobs, patches, shared controls. At one point, everything was green.</p>
              <p>The intention was to give the Playground a coherent visual language. The problem is that a drum machine, a particle simulation and a typographic synthesizer do not particularly want to share the same interface. Fair enough.</p>
              <p>The latest Kinetic Synth is moving towards something more restrained, slightly old-school and hopefully readable. The homepage has also been simplified, with a darker layout and larger previews. We attempted elaborate transitions between the experiments and the index. They were not particularly good. We moved on.</p>
            </section>
            <section className="diary-section">
              <span className="eyebrow">04 / An unexpected synthesis</span>
              <h2>Wait, haven't we already built this?</h2>
              <p>Sampling, distortion, oscillation, noise, feedback. Much of what we had been developing as separate experiments was now finding its way into the same application.</p>
              <p>The Kinetic Synth was becoming a synthesis of several earlier experiments. Which raises a reasonable question: why are we maintaining so many separate tools?</p>
              <p>We probably do not need to. Some experiments deserve to remain independent. Others might work better as modules. Some are perhaps finished as studies, without requiring another six months of interface development.</p>
              <p>Not everything needs to become a product. Especially when nobody asked for one.</p>
            </section>
            <section className="diary-section">
              <span className="eyebrow">05 / The question</span>
              <h2>What are we investigating?</h2>
              <p>We have somehow managed to avoid defining the Playground's identity while designing increasingly elaborate interfaces for it. Until now, we have described it as a collection of generative graphic experiments. Accurate, but not especially illuminating.</p>
              <p>We are certainly not inventing generative design. These ideas have been around for decades, and studios like DIA have been exploring related approaches for years.</p>
              <p>We are interested in something a little more specific. Not necessarily new visual languages, but different ways of designing. Instead of composing an image directly, what happens when we design the system that produces it? What happens when we borrow methods from sound synthesis and apply them to typography?</p>
              <p>How much control do we actually want? And how useful is an instrument that occasionally refuses to behave? These questions are becoming more interesting than the individual features.</p>
            </section>
            <section className="diary-section">
              <span className="eyebrow">06 / Results before tools</span>
              <h2>Maybe show the work?</h2>
              <p>Another slightly obvious realisation. We built a homepage that primarily displays our tools. But perhaps the most interesting thing about the Playground is not the software. It is what comes out of it.</p>
              <p>Images, animations, textures, compositions, sounds. The actual results. We would like to bring those forward and let the instruments sit somewhere behind them, available to anyone curious enough to investigate.</p>
              <p>The tools do not need to disappear. They just do not need to introduce themselves before the work does. A single instrument might generate several investigations. Several instruments might contribute to one piece. And the older experiments can live in an archive, including those that did not quite work. No need to erase the evidence.</p>
            </section>
            <section className="diary-section diary-closing">
              <span className="eyebrow">07 / Next</span>
              <h2>Perhaps fewer knobs for a moment.</h2>
              <p>For now, we are resisting the temptation to write a manifesto. We have enough things to maintain.</p>
              <p>Instead, we will reconsider the structure and identity of the Playground, decide which instruments deserve their own space and begin collecting the results of the work. The experiments will continue. But perhaps we can stop adding knobs for a moment.</p>
              <div className="diary-status"><span>STATUS / BETA 02</span><p>K-TIC-SYNTH: increasingly modular. DUST: temporarily offline. A_SCII: still translating things into other things. µMS20 / GP999: making noise. Homepage: identity crisis. Manifesto: postponed, fortunately.</p></div>
            </section>
          </div>
        </div>
        <footer className="diary-footer"><span>Previous entry</span><a href="#beta-01">BETA 01 / THE FOUNDATION STOPPED MOVING ↘</a></footer>
      </article>
      <article className="diary-page diary-entry diary-archive" id="beta-01">
        <header className="diary-hero">
          <div className="diary-meta">
            <span>BETA 01</span>
            <time dateTime="2026-09-21">21.09.2026</time>
          </div>
          <h1>The foundation stopped moving. Mostly.</h1>
          <p className="diary-lead">
            Nine days, eight working entries, several branches and one missing <em>I</em>. The first beta closes with the Playground behaving less like a folder of rescued prototypes and more like a place they can continue misbehaving in public.
          </p>
        </header>

        <div className="diary-layout">
          <aside className="diary-aside" aria-label="Release summary">
            <dl>
              <div><dt>Period</dt><dd>12—21.09.26</dd></div>
              <div><dt>State</dt><dd>Beta closed</dd></div>
              <div><dt>Entries</dt><dd>08 working</dd></div>
              <div><dt>Casualties</dt><dd>REC-04</dd></div>
              <div><dt>Recovered</dt><dd>Two letter I&apos;s</dd></div>
            </dl>
          </aside>

          <div className="diary-body">
            <section className="diary-section">
              <span className="eyebrow">01 / The original proposition</span>
              <h2>Not a second portfolio.</h2>
              <p>
                The first manual described the Playground as Anelli Studio&apos;s experimental counterpart: an evolving space for typography, graphic systems, interaction, image, motion, sound and code. It allowed unfinished work, strange tests, useful instruments and abandoned branches to remain visible.
              </p>
              <p>
                That distinction still matters. A portfolio explains what has already been resolved. A playground exposes what is being tested before anyone has had the opportunity to make the explanation sound inevitable.
              </p>
            </section>

            <section className="diary-section">
              <span className="eyebrow">02 / What became real</span>
              <h2>A system appeared around the experiments.</h2>
              <p>
                The early prototype collection now has a shared index, permanent REC numbers, consistent routes, a working manual and a common interface language. Experiments remain technically independent, but they no longer feel as if they arrived from unrelated browser tabs.
              </p>
              <p>
                The development protocol also survived contact with development: <code>OPEN</code>, <code>ITERATE</code>, <code>PREVIEW</code>, <code>KEEP</code> and <code>PUBLISH</code> are no longer optimistic verbs in a document. They describe the actual route from an idea to the public site.
              </p>
            </section>

            <section className="diary-section diary-recs">
              <span className="eyebrow">03 / Field notes</span>
              <h2>What happened to the recordings.</h2>
              <div className="diary-rec-list">
                {recNotes.map((item) => (
                  <div className="diary-rec" key={item.id}>
                    <div><span>{item.id}</span><h3>{item.title}</h3></div>
                    <p>{item.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="diary-section">
              <span className="eyebrow">04 / A visual language, cautiously</span>
              <h2>The interface became part of the experiment.</h2>
              <p>
                GT Era now carries the general interface while GT Alpina Typewriter handles technical data, statuses and measurements. The fonts are served from Anelli Studio&apos;s licensed web hosting rather than stored in the public repository—because typographic experimentation is more enjoyable without an accidental licensing experiment attached to it.
              </p>
              <p>
                Colour is allowed to change between visits. Controls can collapse. The canvas can occupy the full viewport. The goal is coherence without uniformity: enough structure to know where you are, and enough instability to remember why you came.
              </p>
            </section>

            <section className="diary-section">
              <span className="eyebrow">05 / The small bug with editorial ambitions</span>
              <h2>KNETC TYPE.</h2>
              <p>
                REC-09 briefly demonstrated how quickly kinetic typography can become accidental copywriting. Two narrow <em>I</em> characters were being swallowed by neighbouring glyphs because tracked letters were positioned from a left edge while still drawn with centred alignment.
              </p>
              <p>
                The correction was tiny: draw each glyph from the position the spacing calculation actually describes. The lesson was larger and less glamorous—before discussing distortion, waves or generative form, make sure the word can still spell itself.
              </p>
            </section>

            <section className="diary-section">
              <span className="eyebrow">06 / Working lessons</span>
              <div className="diary-lessons">
                {workingLessons.map(([title, text], index) => (
                  <div className="diary-lesson" key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="diary-section diary-closing">
              <span className="eyebrow">07 / After beta</span>
              <h2>Less foundation. More play.</h2>
              <p>
                The next phase is not about making the platform look finished. It is about refining each REC on its own terms, making the remaining inconsistencies intentional, connecting tools where shared data becomes interesting and documenting what changes—including the routes that go nowhere.
              </p>
              <p>
                The foundation is stable enough to stop discussing the foundation. This is usually when the floor gets paint on it.
              </p>
            </section>
          </div>
        </div>

        <footer className="diary-footer">
          <span>Archive / Beta 01</span>
          <span>12—21.09.2026</span>
        </footer>
      </article>
    </main>
  );
}
