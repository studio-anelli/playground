import type { CSSProperties } from "react";
import { archivedExperiments } from "@/app/data/experiments";
import { ExperimentIndex } from "@/components/experiment-index";
import { HomePalette } from "@/components/home-palette";
import { SiteHeader } from "@/components/site-header";
import { diaryPalette } from "@/lib/diary-palette";

export default function Archive() {
  return (
    <main className="site-shell home-shell archive-shell" style={{ "--paper": diaryPalette.ink, "--ink": diaryPalette.background, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <SiteHeader />
      <ExperimentIndex entries={archivedExperiments} label="Archived experiments" />
    </main>
  );
}
