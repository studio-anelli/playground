"use client";

import { useCallback, useState } from "react";
import TypeDistorter from "@/recovered/type-distorter-original/particle-type-distorter/src/App";
import ReactiveLetterParticles from "@/components/reactive-letter-particles";
import { defaultDustScene, type DustScene } from "@/lib/dust-scene";

type DustMode = "distort" | "react";

export default function Dust() {
  const [mode, setMode] = useState<DustMode>("distort");
  const [scene, setScene] = useState<DustScene>(defaultDustScene);
  const [carryScene, setCarryScene] = useState(true);

  const updateScene = useCallback((nextScene: DustScene) => {
    setScene(nextScene);
  }, []);

  const switchMode = (nextMode: DustMode) => {
    if (!carryScene) setScene(defaultDustScene);
    setMode(nextMode);
  };

  return (
    <div className="dust-switcher-app">
      <div className="dust-mode-switch" role="group" aria-label="DUST engine">
        <span>DUST engine</span>
        <button type="button" aria-pressed={mode === "distort"} onClick={() => switchMode("distort")}>
          Distort
        </button>
        <button type="button" aria-pressed={mode === "react"} onClick={() => switchMode("react")}>
          React
        </button>
        <button className="dust-carry" type="button" aria-pressed={carryScene} onClick={() => setCarryScene((carry) => !carry)}>
          Carry {carryScene ? "on" : "off"}
        </button>
      </div>

      <div className={`dust-full-engine dust-full-engine-${mode}`}>
        {mode === "distort" ? (
          <TypeDistorter initialScene={scene} onSceneChange={updateScene} />
        ) : (
          <ReactiveLetterParticles initialScene={scene} onSceneChange={updateScene} />
        )}
      </div>
    </div>
  );
}
