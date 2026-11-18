import type { Experiment } from "@/app/data/experiments";
import { experimentIndexDetails } from "@/app/data/experiment-index";

const displayDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const homeTitles: Record<string, string> = {
  "grid-delay-machine": "MEM‑FLD",
  "music-that-travels": "Music that travels",
  "durf-dots": "●●●",
  "k-tic-synth": "K-tic-synth",
  "font-drawing": "Low/fi world",
  "kinetic-composer": "GR_D",
};

function IndexDate({ label, date }: { label: string; date: string }) {
  return (
    <time className="home-entry-date" dateTime={date}>
      <span>{label}</span>
      <span>{displayDate.format(new Date(date + "T00:00:00Z"))}</span>
    </time>
  );
}

export function ExperimentIndex({ entries, label = "Experiments" }: { entries: Experiment[]; label?: string }) {
  return (
    <section className="experiment-index" aria-label={label}>
      {entries.map((experiment) => {
        const details = experimentIndexDetails[experiment.slug];
        const archived = experiment.status === "archived";
        const date = archived ? details?.archived : details?.lastUpdated;
        return (
          <a className="experiment-row" href={experiment.href ?? `/experiments/${experiment.slug}`} key={experiment.id}>
            <span className="home-entry-heading">
              <span className="experiment-id">{experiment.id}</span>
              <span className="experiment-title">{homeTitles[experiment.slug] ?? experiment.title}</span>
            </span>
            <span className="home-entry-meta">
              <span className="home-entry-description">{details?.description ?? experiment.summary}</span>
              {details && <IndexDate label="created" date={details.created} />}
              {date && <IndexDate label={archived ? "archived" : "updated"} date={date} />}
            </span>
          </a>
        );
      })}
    </section>
  );
}
