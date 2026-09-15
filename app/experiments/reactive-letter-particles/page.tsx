import ReactiveLetterParticles from "@/components/reactive-letter-particles";
import UIV1ExperimentShell from "@/components/ui-v1-experiment-shell";

export default function ReactiveLetterParticlesPage() {
  return (
    <UIV1ExperimentShell
      title="Reactive Letter Particles"
      rec="007"
      tags="Particles - Collision - Type - Interaction"
      className="ui-rollout-rec07"
    >
      <ReactiveLetterParticles />
    </UIV1ExperimentShell>
  );
}
