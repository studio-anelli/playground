import { ArrowLeft, Maximize2 } from "lucide-react";

export default function GP888DrumMachinePage() {
  return (
    <main className="import-page">
      <header className="import-header">
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>GP888 Drum Machine</h1>
        <span>REC-05 / Tool / Test</span>
        <a className="fullscreen-link" href="/experiments/gp888-drum-machine/app">
          Open full screen <Maximize2 aria-hidden="true" />
        </a>
      </header>
      <iframe
        className="experiment-embed experiment-embed-tall"
        src="/experiments/gp888-drum-machine/app"
        title="GP888 8-bit drum machine"
        allow="fullscreen; autoplay"
      />
    </main>
  );
}
