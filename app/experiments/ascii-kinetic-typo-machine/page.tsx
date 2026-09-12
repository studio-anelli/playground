import { ArrowLeft, Maximize2 } from "lucide-react";

export default function ASCIITypoMachinePage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>ASCII Kinetic Typo Machine</h1>
        <span>REC-06 / Tool / Test</span>
        <a className="fullscreen-link" href="/experiments/ascii-kinetic-typo-machine/app">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed experiment-embed-tall"
        src="/experiments/ascii-kinetic-typo-machine/app"
        title="ASCII Kinetic Typo Machine"
        allow="fullscreen; clipboard-write"
      />
    </main>
  );
}
