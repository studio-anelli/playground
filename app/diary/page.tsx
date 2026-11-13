import type { CSSProperties } from "react";
import { diaryEntries } from "@/app/data/diary-entries";
import { diaryPalette } from "@/lib/diary-palette";
import { SiteHeader } from "@/components/site-header";
import { HomePalette } from "@/components/home-palette";

export default function DiaryPage() {
  let lineNumber = 0;
  return (
    <main className="site-shell terminal-shell" style={{ "--paper": diaryPalette.ink, "--ink": diaryPalette.background, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <SiteHeader />
      <div className="terminal-document">
        <nav className="terminal-index" aria-label="Diary entries">
          <span>Development diary</span>
          <a href="#beta-02">Beta 02</a>
          <a href="#beta-01">Beta 01</a>
        </nav>
        {diaryEntries.map((entry) => (
          <article key={entry.id} id={entry.id} aria-label={entry.title} className="terminal-entry">
            {entry.lines.map((line, index) => {
              const number = ++lineNumber;
              return (
                <div className="terminal-line" key={index}>
                  <span className="terminal-line-number" aria-hidden="true">{number}</span>
                  {line.heading ? <h1>{line.text}</h1> : <span className="terminal-line-text">{line.text || "\u00a0"}</span>}
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </main>
  );
}
