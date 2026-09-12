import { SiteHeader } from "@/components/site-header";

const commands = [
  ["START", "Create a new experiment without altering existing work."],
  ["OPEN", "Load an experiment as the current working target."],
  ["ITERATE", "Change the current version while preserving its identity."],
  ["FORK", "Preserve the current version and create a separate alternative to explore."],
  ["COMPARE", "Review meaningful differences between selected versions."],
  ["PREVIEW", "Produce a non-public version for review."],
  ["KEEP", "Mark the current direction as canonical without publishing."],
  ["PUBLISH", "Promote an approved version to the public index."],
  ["ARCHIVE", "Preserve an entry while removing it from the index."],
  ["ROLLBACK", "Return to a named earlier working version."],
  ["STATUS", "Report state, version, issues and next decision."],
];

export default function ManualPage() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <article className="manual-page">
        <header className="manual-header">
          <span className="eyebrow">Working protocol / v0.3</span>
          <p>Commands for developing and publishing experiments.</p>
        </header>

        <section className="command-list" aria-label="Working commands">
          {commands.map(([command, description]) => (
            <div className="command-row" key={command}>
              <code>{command}</code>
              <p>{description}</p>
            </div>
          ))}
        </section>

        <section className="manual-rule">
          <span className="eyebrow">When to fork</span>
          <p>Use <code>FORK</code> when “try…” or “what if…” would replace the current visual direction. The current version stays unchanged while we explore the alternative separately.</p>
        </section>
      </article>
    </main>
  );
}
