"use client";

import { useState } from "react";
import TypeDistorter from "@/recovered/type-distorter-original/particle-type-distorter/src/App";
import ReactiveLetterParticles from "@/components/reactive-letter-particles";

type DustMode = "distort" | "react";

export default function Dust() {
  const [mode, setMode] = useState<DustMode>("distort");

  return (
    <div className="dust-switcher-app">
      <div className="dust-mode-switch" role="group" aria-label="DUST engine">
        <span>DUST engine</span>
        <button type="button" aria-pressed={mode === "distort"} onClick={() => setMode("distort")}>
          Distort
        </button>
        <button type="button" aria-pressed={mode === "react"} onClick={() => setMode("react")}>
          React
        </button>
      </div>

      <div className={`dust-full-engine dust-full-engine-${mode}`}>
        {mode === "distort" ? <TypeDistorter /> : <ReactiveLetterParticles />}
      </div>
    </div>
  );
}
