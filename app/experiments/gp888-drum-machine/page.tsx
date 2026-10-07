import { ArrowLeft } from "lucide-react";
import GP888DrumMachine from "@/components/gp888-drum-machine";

export default function GP888DrumMachinePage() {
  return <main className="import-page">
    <header className="import-header import-header-native">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" target="_top" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
      <h1>GP888</h1><span>REC-05 / Tool / Test</span>
    </header>
    <section className="experiment-native" aria-label="GP888 drum machine interactive experiment"><GP888DrumMachine /></section>
  </main>;
}
