"use client";

import { ArrowLeft } from "lucide-react";
import TypeDistorter from "@/recovered/type-distorter-original/particle-type-distorter/src/App";

export default function TypeDistorterPage() {
  return (
    <main className="import-page" style={{ width: "100%", maxWidth: "none", margin: 0 }}>
      <header className="import-header import-header-native">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Particle Type Distorter</h1>
        <span>REC-02 / Tool / Test</span>
      </header>
      <section className="experiment-native w-full" aria-label="Particle Type Distorter interactive application">
        <TypeDistorter />
      </section>
    </main>
  );
}
