import { ExperimentIndex } from "@/components/experiment-index";
import { experiments } from "@/app/data/experiments";
import { HomePalette } from "@/components/home-palette";
import { diaryPalette } from "@/lib/diary-palette";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="site-shell home-shell" style={{ "--paper": diaryPalette.ink, "--ink": diaryPalette.background, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <SiteHeader />

      <ExperimentIndex entries={experiments} />
    </main>
  );
}
