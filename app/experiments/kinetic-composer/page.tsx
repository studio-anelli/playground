"use client";

import KineticComposer from "@/recovered/kinetic-composer-original/kinetic_composer/src/App";
import UIV1ExperimentShell from "@/components/ui-v1-experiment-shell";

export default function KineticComposerPage() {
  return (
    <UIV1ExperimentShell
      title="Kinetic Composer"
      rec="001"
      tags="Layers - Motion - Composition - Export"
      className="ui-rollout-rec01"
    >
      <KineticComposer />
    </UIV1ExperimentShell>
  );
}
