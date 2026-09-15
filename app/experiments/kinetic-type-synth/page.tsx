"use client";

import { ArrowLeft } from "lucide-react";
import KineticTypeSynth from "@/components/kinetic-type-synth";

export default function KineticTypeSynthPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/" className="back-link">
          <ArrowLeft aria-hidden="true" />
          Index
        </a>
        <h1>Kinetic Type Synth</h1>
        <span>REC-09 / Tool / Test</span>
      </header>

      <section
        className="experiment-native"
        aria-label="Kinetic Type Synth interactive experiment"
      >
        <KineticTypeSynth />
      </section>
    </main>
  );
}
