"use client";

import { ArrowLeft } from "lucide-react";
import ReactiveLetterParticles from "@/components/reactive-letter-particles";

export default function ReactiveLetterParticlesPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/" className="back-link">
          <ArrowLeft aria-hidden="true" />
          Index
        </a>
        <h1>Reactive Letter Particles</h1>
        <span>REC-07 / Experiment / Test</span>
      </header>

      <section
        className="experiment-native"
        aria-label="Reactive Letter Particles interactive experiment"
      >
        <ReactiveLetterParticles />
      </section>
    </main>
  );
}
