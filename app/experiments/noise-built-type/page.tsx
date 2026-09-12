import { ArrowLeft, Maximize2 } from "lucide-react";

export default function NoiseBuiltTypePage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Noise-Built Type</h1>
        <span>REC-04 / Experiment / Test</span>
        <a className="fullscreen-link" href="/experiments/noise-built-type/app">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed experiment-embed-tall"
        src="/experiments/noise-built-type/app"
        title="Noise-Built Type interactive experiment"
        allow="fullscreen"
      />
    </main>
  );
}
