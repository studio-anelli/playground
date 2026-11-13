import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/">Index</Link>
        <Link href="/archive">Archive</Link>
        <Link href="/diary">Diary</Link>
        <Link href="/manual">Manual</Link>
      </nav>
    </header>
  );
}
