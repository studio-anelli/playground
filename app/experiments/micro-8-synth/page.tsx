"use client";

import { ArrowLeft } from "lucide-react";
import SimpleSubtractiveSynth from "@/components/micro-8-synth";

export default function Micro8SynthPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="back-link">
          <ArrowLeft aria-hidden="true" />
          Index
        </a>
        <h1>Micro-8 Synth</h1>
        <span>REC-08 / Tool / Test</span>
      </header>

      <section
        className="experiment-native"
        aria-label="Micro-8 Synth interactive experiment"
      >
        <SimpleSubtractiveSynth />
      </section>
    </main>
  );
}
