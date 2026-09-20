"use client";

import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import KineticComposer from "@/recovered/kinetic-composer-original/kinetic_composer/src/App";

export default function KineticComposerPage() {
  return (
    <main className="ui-v1-page" style={{ "--ui-v1-bg": "#0b0b0b", "--ui-v1-fg": "#f2f2f2" } as CSSProperties}>
      <header className="ui-v1-header">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="ui-v1-back"><ArrowLeft aria-hidden="true" /> Back</a>
        <h1>Kinetic Composer</h1>
        <div className="ui-v1-meta">
          <span>REC - 001</span>
          <span>Tool - Type motion</span>
        </div>
      </header>
      <section className="ui-v1-experiment" aria-label="Kinetic Composer interactive application">
        <KineticComposer />
      </section>
    </main>
  );
}
