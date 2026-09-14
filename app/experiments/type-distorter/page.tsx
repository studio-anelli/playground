"use client";

import { ArrowLeft } from "lucide-react";
import TypeDistorter from "@/recovered/type-distorter-original/particle-type-distorter/src/App";

export default function TypeDistorterPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Particle Type Distorter</h1>
        <span>REC-02 / Tool / Test</span>
      </header>
      <section className="experiment-native" aria-label="Particle Type Distorter interactive application">
        <TypeDistorter />
      </section>
    </main>
  );
}
