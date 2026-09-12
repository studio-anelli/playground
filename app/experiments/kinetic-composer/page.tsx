import { ArrowLeft, Maximize2 } from "lucide-react";

export default function KineticComposerPage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Kinetic Composer</h1>
        <span>REC-01 / Tool / Test</span>
        <a className="fullscreen-link" href="/experiments/kinetic-composer/app/index.html">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed"
        src="/experiments/kinetic-composer/app/index.html"
        title="Kinetic Composer interactive application"
        allow="fullscreen"
      />
    </main>
  );
}
