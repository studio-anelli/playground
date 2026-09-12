export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="Prototype platform home">
        <span className="wordmark-mark" aria-hidden="true">A</span>
        <span>Prototype Platform</span>
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/">Index</a>
        <a href="/manual">Manual</a>
        <span className="status-readout"><i /> Foundation 0.1</span>
      </nav>
    </header>
  );
}
