"use client";

import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import ReactiveLetterParticles from "@/components/reactive-letter-particles";

export default function ReactiveLetterParticlesPage() {
  return (
    <main className="ui-v1-page" style={{ "--ui-v1-bg": "#0b0b0b", "--ui-v1-fg": "#f2f2f2" } as CSSProperties}>
      <header className="ui-v1-header">
        {/* A full-page link is more reliable than client navigation in the Vinext worker build. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="ui-v1-back">
          <ArrowLeft aria-hidden="true" />
          Back
        </a>
        <h1>Reactive Letter Particles</h1>
        <div className="ui-v1-meta">
          <span>REC - 007</span>
          <span>Experiment - particles</span>
        </div>
      </header>

      <section
        className="ui-v1-experiment"
        aria-label="Reactive Letter Particles interactive experiment"
      >
        <ReactiveLetterParticles />
      </section>
    </main>
  );
}
