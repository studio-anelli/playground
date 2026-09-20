"use client";

import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import FontDrawing from "@/recovered/font-drawing-working/src/App";

export default function FontDrawingPage() {
  return (
    <main className="ui-v1-page" style={{ "--ui-v1-bg": "#f4f1eb", "--ui-v1-fg": "#121212" } as CSSProperties}>
      <header className="ui-v1-header">
        {/* A full-page link is more reliable than client navigation in the Vinext worker build. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="ui-v1-back"><ArrowLeft aria-hidden="true" /> Back</a>
        <h1>Artboard</h1>
        <div className="ui-v1-meta">
          <span>REC - 003</span>
          <span>Tool - Grid warp</span>
        </div>
      </header>
      <section className="ui-v1-experiment overflow-auto" aria-label="Font Drawing block-letter editor">
        <FontDrawing />
      </section>
    </main>
  );
}
