/* Native navigation avoids the client-router failures on the Workers preview. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { PlaygroundLogo } from "@/components/playground-logo";
import { SiteAppearanceControls } from "@/components/site-appearance-controls";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="site-logo-link" href="/" aria-label="Playground home"><PlaygroundLogo /></a>
      <nav className="site-nav" aria-label="Main navigation">
        <a href="/">Index</a>
        <a href="/archive">Archive</a>
        <a href="/diary">Diary</a>
        <a href="/colophon">Colophon</a>
        <SiteAppearanceControls />
      </nav>
    </header>
  );
}
