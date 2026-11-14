import { HomePalette } from "@/components/home-palette";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Colophon — Playground",
  description: "A virtual studio space for typography, image, sound and interaction by Christian Pappalardo, Anelli Studio.",
};

export default function Colophon() {
  return (
    <main className="site-shell home-shell colophon-shell">
      <HomePalette />
      <SiteHeader />
      <article className="colophon-document" aria-labelledby="colophon-title">
        <h1 id="colophon-title">Colophon</h1>
        <div className="colophon-copy">
          <p>Playground is an evolving virtual studio space: a collection of digital experiments by Christian Pappalardo, an independent graphic designer based in Marseille, working as <a href="https://anelli.studio/">Anelli Studio</a>. His practice focuses on visual identities and graphic systems, informed by contemporary visual culture and rooted in the wider cultural worlds they belong to.</p>
          <p>Here, that curiosity takes a more open form. Typography meets sound synthesis. Images acquire a memory. A record collection becomes a map of places, influences and encounters.</p>
          <p>In 2026, making an image can take seconds. Rethinking the tools behind it remains a way to explore how it comes into being: choosing the rules, opening up possibilities, and discovering what familiar software might never suggest.</p>
          <p>Christian might be somewhere in the lab, connecting things that were probably fine separately. How far can a grid deform and still hold together? When does a system produce something its designer did not anticipate? Occasionally, the answer is a browser crash. Occasionally, it is worth keeping.</p>
          <p>Some experiments become tools. Others remain studies or unfinished attempts. Playground gives them room to develop, and gives curiosity somewhere to go without having to explain its usefulness in advance.</p>
        </div>
        <footer className="colophon-footer">
          <p>© 2026 Christian Pappalardo / Anelli Studio</p>
          <p>All rights reserved. Some pixels have other plans.</p>
        </footer>
      </article>
    </main>
  );
}
