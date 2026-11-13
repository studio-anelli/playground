import { experimentIndexDetails } from "@/app/data/experiment-index";
import { experiments } from "@/app/data/experiments";
import { HomePalette } from "@/components/home-palette";
import { diaryPalette } from "@/lib/diary-palette";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";

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
              {details && <time dateTime={details.lastUpdated}>Updated {details.lastUpdated.slice(8)}.{details.lastUpdated.slice(5, 7)}.{details.lastUpdated.slice(2, 4)}</time>}
            </span>
          </a>
        );
        })}
      </section>
    </main>
  );
}
