"use client";

import TypeDistorter from "@/recovered/type-distorter-original/particle-type-distorter/src/App";
import UIV1ExperimentShell from "@/components/ui-v1-experiment-shell";

export default function TypeDistorterPage() {
  return (
    <UIV1ExperimentShell
      title="Particle Type Distorter"
      rec="002"
      tags="Particles - Noise - Mouse - Recording"
      className="ui-rollout-rec02"
    >
      <TypeDistorter />
    </UIV1ExperimentShell>
  );
}
