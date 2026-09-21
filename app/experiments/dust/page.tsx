"use client";

import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import Dust from "@/components/dust";

export default function DustPage() {
  // DUST remains isolated until the combined particle behaviour is approved.
  return (
    <main className="ui-v1-page" style={{ "--ui-v1-bg": "#0b73f6", "--ui-v1-fg": "#f5f1e9" } as CSSProperties}>
      <header className="ui-v1-header dust-page-header">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" target="_top" className="ui-v1-back"><ArrowLeft aria-hidden="true" />Back</a>
        <h1>DUST</h1>
        <div className="ui-v1-meta">
          <span>REC - X / Prototype</span>
          <span>Distort - React - Hybrid</span>
        </div>
      </header>
      <section className="ui-v1-experiment" aria-label="DUST particle type prototype">
        <Dust />
      </section>
    </main>
  );
}
