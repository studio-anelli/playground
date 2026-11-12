import { ArrowUpRight } from "lucide-react";
import { archivedExperiments } from "@/app/data/experiments";
import { SiteHeader } from "@/components/site-header";

export default function Archive() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="index-intro">
        <p>Previous experiments, preserved as they were.</p>
        <div className="index-count">{String(archivedExperiments.length).padStart(2, "0")} archived entries</div>
      </section>
      <section className="experiment-index" aria-labelledby="archive-title">
        <div className="section-label" id="archive-title">
          <span>REC / Archive</span>
          <a href="/">← Working index</a>
        </div>
        {archivedExperiments.map((experiment) => (
          <a className="experiment-row" href={experiment.href ?? `/experiments/${experiment.slug}`} key={experiment.id}>
            <span className="experiment-id">{experiment.id}</span>
            <span className="experiment-title">{experiment.title}</span>
            <span className="experiment-tags">{experiment.tags.join(" / ")}</span>
            <span className={`state state-${experiment.status}`}>{experiment.status}</span>
            <ArrowUpRight aria-hidden="true" />
          </a>
        ))}
      </section>
    </main>
  );
}
