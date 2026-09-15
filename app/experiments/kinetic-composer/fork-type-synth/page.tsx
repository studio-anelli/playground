"use client";

import { ArrowLeft } from "lucide-react";
import KineticTypeSynth from "@/components/kinetic-type-synth";

export default function KineticTypeSynthForkPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/experiments/kinetic-composer" className="back-link">
          <ArrowLeft aria-hidden="true" />
          REC-01
        </a>
        <h1>Kinetic Type Synth</h1>
        <span>REC-01 / Fork / Test</span>
      </header>

      <section
        className="experiment-native"
        aria-label="Kinetic Type Synth comparison fork"
      >
        <KineticTypeSynth />
      </section>
    </main>
  );
}
