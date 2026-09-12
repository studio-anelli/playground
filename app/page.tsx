import { ArrowUpRight } from "lucide-react";
import { experiments } from "@/app/data/experiments";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />

      <section className="index-intro">
        <p>Typography, graphic systems, sound and code.</p>
        <div className="index-count">{String(experiments.length).padStart(2, "0")} working entry</div>
      </section>

      <section className="experiment-index" aria-labelledby="index-title">
        <div className="section-label" id="index-title">
          <span>Working index</span>
          <span>Updated 12.09.26</span>
        </div>
        {experiments.map((experiment) => (
          <a className="experiment-row" href={`/experiments/${experiment.slug}`} key={experiment.id}>
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
