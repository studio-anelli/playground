import type { Experiment } from "@/app/data/experiments";
import { experimentIndexDetails } from "@/app/data/experiment-index";

const updateDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const homeTitles: Record<string, string> = {
  "grid-delay-machine": "Grid delay machine",
  "music-that-travels": "Music that travels",
  "durf-dots": "3 dotted glyphs",
  "k-tic-synth": "K-tic-synth",
  "font-drawing": "Low/fi world",
  "kinetic-composer": "GR_D",
};

export function ExperimentIndex({ entries, label = "Experiments" }: { entries: Experiment[]; label?: string }) {
  return (
      <section className="experiment-index" aria-label={label}>
        {entries.map((experiment) => {
          const details = experimentIndexDetails[experiment.slug];
          return (
          <a className="experiment-row" href={experiment.href ?? `/experiments/${experiment.slug}`} key={experiment.id}>
            <span className="home-entry-heading">
              <span className="experiment-id">{experiment.id}</span>
              <span className="experiment-title">{homeTitles[experiment.slug] ?? experiment.title}</span>
            </span>
            <span className="home-entry-meta">
              <span className="home-entry-description">{details?.description ?? experiment.summary}</span>
              {details && <time className="home-entry-updated" dateTime={details.lastUpdated}>
                <span>updated</span>
                <span>{updateDate.format(new Date(`${details.lastUpdated}T00:00:00Z`))}</span>
              </time>}
            </span>
          </a>
        );
        })}
      </section>
  );
}
