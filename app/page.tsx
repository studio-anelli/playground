import { experimentIndexDetails } from "@/app/data/experiment-index";
import { experiments } from "@/app/data/experiments";
import { HomePalette } from "@/components/home-palette";
import { diaryPalette } from "@/lib/diary-palette";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";

const updateDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const homeTitles: Record<string, string> = {
  "grid-delay-machine": "Grid delay machine",
  "music-that-travels": "Music that travels",
  "durf-dots": "DURF / Dot system",
  "k-tic-synth": "K-tic-synth",
  "font-drawing": "Low/fi world",
};

export default function Home() {
  return (
    <main className="site-shell home-shell" style={{ "--paper": diaryPalette.ink, "--ink": diaryPalette.background, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <SiteHeader />

      <section className="experiment-index" aria-label="Experiments">
        {experiments.map((experiment) => {
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
    </main>
  );
}
