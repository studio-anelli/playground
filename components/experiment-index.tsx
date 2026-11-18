import type { Experiment } from "@/app/data/experiments";
import { experimentIndexDetails } from "@/app/data/experiment-index";

const updateDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const homeTitles: Record<string, string> = {
  "grid-delay-machine": "MEM‑FLD",
  "music-that-travels": "Music that travels",
  "durf-dots": "●●●",
  "k-tic-synth": "K-tic-synth",
  "font-drawing": "Low/fi world",
  "kinetic-composer": "GR_D",
};

export function ExperimentIndex({ entries, label = "Experiments" }: { entries: Experiment[]; label?: string }) {
  const row = (experiment: Experiment) => {
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
  };

  return (
    <section className="experiment-index" aria-label={label}>
      {entries.map((experiment) => {
        if (!experiment.group) return row(experiment);
        const group = entries.filter((entry) => entry.group === experiment.group);
        if (group[0] !== experiment) return null;
        return (
          <div className="experiment-group" key={experiment.group} role="group" aria-label={experiment.group}>
            <h2 className="experiment-group-title">{experiment.group}</h2>
            {group.map(row)}
          </div>
        );
      })}
    </section>
  );
}
