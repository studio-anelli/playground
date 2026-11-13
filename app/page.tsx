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
    <main className="site-shell home-shell" style={{ "--paper": diaryPalette.background, "--ink": diaryPalette.ink, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <SiteHeader hideWordmark />

      <section className="experiment-index" aria-labelledby="index-title">
        <div className="section-label" id="index-title">
          <span>Working index</span>
        </div>
        {experiments.map((experiment) => (
          <a className="experiment-row" href={experiment.href ?? `/experiments/${experiment.slug}`} key={experiment.id}>
            <span className="experiment-id">{experiment.id}</span>
            <span className="experiment-title">{homeTitles[experiment.slug] ?? experiment.title}</span>
            <span className="experiment-tags">{experiment.tags.join(" / ")}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
