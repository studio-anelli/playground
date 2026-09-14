"use client";

import { ArrowLeft } from "lucide-react";
import KineticComposer from "@/recovered/kinetic-composer-original/kinetic_composer/src/App";

export default function KineticComposerPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Kinetic Composer</h1>
        <span>REC-01 / Tool / Test</span>
      </header>
      <section className="experiment-native" aria-label="Kinetic Composer interactive application">
        <KineticComposer />
      </section>
    </main>
  );
}
