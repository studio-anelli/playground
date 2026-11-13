export function SiteHeader({ hideWordmark = false }: { hideWordmark?: boolean }) {
  return (
    <header className="site-header">
      {!hideWordmark && <a className="wordmark" href="/" aria-label="Prototype platform home">
        <span className="wordmark-mark" aria-hidden="true">A</span>
        <span>Prototype Platform</span>
      </a>}
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/">Index</a>
        <a href="/archive">Archive</a>
        <a href="/diary">Diary</a>
        <a href="/manual">Manual</a>
        <span className="status-readout"><i /> Beta 0.1</span>
      </nav>
    </header>
  );
}
