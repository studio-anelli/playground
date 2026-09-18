import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ASCIITypoMachine from "@/components/ascii-kinetic-typo-machine";

export default function ASCIITypoMachinePage() {
  return (
    <main className="ui-v1-page" style={{ "--ui-v1-bg": "#0b0b0b", "--ui-v1-fg": "#f2f2f2" } as CSSProperties}>
      <header className="ui-v1-header mix-blend-difference">
        <Link href="/" className="ui-v1-back"><ArrowLeft aria-hidden="true" /> Back</Link>
        <h1>ASCII Kinetic Typo Machine</h1>
        <div className="ui-v1-meta">
          <span>REC - 006</span>
          <span>Tool - ASCII motion</span>
        </div>
      </header>
      <section className="ui-v1-experiment" aria-label="ASCII Kinetic Typo Machine interactive application">
        <ASCIITypoMachine />
      </section>
    </main>
  );
}
