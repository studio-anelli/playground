import { ArrowLeft, Maximize2 } from "lucide-react";

export default function TypeDistorterPage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Particle Type Distorter</h1>
        <span>REC-02 / Tool / Test</span>
        <a className="fullscreen-link" href="/experiments/type-distorter/app/index.html">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed"
        src="/experiments/type-distorter/app/index.html"
        title="Particle Type Distorter interactive application"
        allow="fullscreen"
      />
    </main>
  );
}
