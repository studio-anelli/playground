/* Native navigation avoids the client-router failures on the Workers preview. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { SiteAppearanceControls } from "@/components/site-appearance-controls";

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/">Index</a>
        <a href="/archive">Archive</a>
        <a href="/diary">Diary</a>
        <SiteAppearanceControls />
      </nav>
    </header>
  );
}
