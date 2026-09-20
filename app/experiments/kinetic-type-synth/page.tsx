"use client";

import { ArrowLeft } from "lucide-react";
import KineticTypeSynth from "@/components/kinetic-type-synth";

export default function KineticTypeSynthPage() {
  return (
    <main className="ui-v1-page">
      <header className="ui-v1-header">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="ui-v1-back">
          <ArrowLeft aria-hidden="true" />
          Back
        </a>

        <h1>Kinetic Type Synth</h1>

        <div className="ui-v1-meta">
          <span>REC - 009</span>
          <span>Sampling - Grid warp - Vertex shapes - Wave-modulated</span>
        </div>
      </header>

      <section className="ui-v1-experiment" aria-label="Kinetic Type Synth interactive experiment">
        <KineticTypeSynth />
      </section>
    </main>
  );
}
