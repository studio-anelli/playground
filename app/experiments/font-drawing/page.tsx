import { ArrowLeft, Maximize2 } from "lucide-react";

export default function FontDrawingPage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Font Drawing</h1>
        <span>REC-03 / Tool / Test</span>
        <a className="fullscreen-link" href="/experiments/font-drawing/app/index.html">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed experiment-embed-tall"
        src="/experiments/font-drawing/app/index.html"
        title="Font Drawing block-letter editor"
        allow="fullscreen"
      />
    </main>
  );
}
