import ASCIITypoMachine from "@/components/ascii-kinetic-typo-machine";
import UIV1ExperimentShell from "@/components/ui-v1-experiment-shell";

export default function ASCIITypoMachinePage() {
  return (
    <UIV1ExperimentShell
      title="ASCII Kinetic Typo Machine"
      rec="006"
      tags="ASCII - Wave - Typography - Export"
      className="ui-rollout-rec06"
    >
      <ASCIITypoMachine />
    </UIV1ExperimentShell>
  );
}
