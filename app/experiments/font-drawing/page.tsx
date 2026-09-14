"use client";

import { ArrowLeft } from "lucide-react";
import FontDrawing from "@/recovered/font-drawing-working/src/App";

export default function FontDrawingPage() {
  return (
    <main className="import-page">
      <header className="import-header import-header-native">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Font Drawing</h1>
        <span>REC-03 / Tool / Test</span>
      </header>
      <section className="experiment-native experiment-native-light" aria-label="Font Drawing block-letter editor">
        <FontDrawing />
      </section>
    </main>
  );
}
