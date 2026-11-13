import { experiments } from "@/app/data/experiments";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="site-shell home-shell">
      <SiteHeader hideWordmark />

      <section className="experiment-index" aria-labelledby="index-title">
        <div className="section-label" id="index-title">
          <span>Working index</span>
        </div>
        {experiments.map((experiment) => (
          <a className="experiment-row" href={experiment.href ?? `/experiments/${experiment.slug}`} key={experiment.id}>
            <span className="experiment-id">{experiment.id}</span>
            <span className="experiment-title">{experiment.title}</span>
            <span className="experiment-tags">{experiment.tags.join(" / ")}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
