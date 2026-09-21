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

      <article className="diary-page">
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
          <span>Next entry</span>
          <span>When something changes, breaks or becomes worth keeping.</span>
        </footer>
      </article>
    </main>
  );
}
