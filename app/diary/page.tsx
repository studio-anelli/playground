import type { CSSProperties } from "react";
import { diaryEntries } from "@/app/data/diary-entries";
import { diaryPalette } from "@/lib/diary-palette";
import { SiteHeader } from "@/components/site-header";
import { DiaryReadingFocus } from "@/components/diary-reading-focus";
import { HomePalette } from "@/components/home-palette";

type DiaryLine = (typeof diaryEntries)[number]["lines"][number];
function groupLines(lines: DiaryLine[]) {
  const groups: { lines: DiaryLine[]; readable: boolean }[] = [];
  for (const line of lines) {
    if (!line.text) { groups.push({ lines: [line], readable: false }); continue; }
    const previous = groups[groups.length - 1];
    if (previous?.readable) previous.lines.push(line);
    else groups.push({ lines: [line], readable: true });
  }
  return groups;
}

export default function DiaryPage() {
  let lineNumber = 0;
  return (
    <main className="site-shell terminal-shell" style={{ "--paper": diaryPalette.ink, "--ink": diaryPalette.background, "--signal": diaryPalette.accent } as CSSProperties}>
      <HomePalette />
      <DiaryReadingFocus />
      <SiteHeader />
      <div className="terminal-document">
        <nav className="terminal-index" aria-label="Diary entries">
          <span>Development diary</span>
          <a href="#beta-03">Beta 03</a>
          <a href="#beta-02">Beta 02</a>
          <a href="#beta-01">Beta 01</a>
        </nav>
        {diaryEntries.map((entry) => (
          <article key={entry.id} id={entry.id} aria-label={entry.title} className="terminal-entry">
            {groupLines(entry.lines).map((group, groupIndex) => (
              <div className="terminal-paragraph" data-reading-block={group.readable ? "" : undefined} key={groupIndex}>
              {group.lines.map((line, index) => {
              const number = ++lineNumber;
              return (
                <div className="terminal-line" key={index} style={{ "--line-indent": line.indent } as CSSProperties}>
                  <span className="terminal-line-number" aria-hidden="true">{number}</span>
                  {line.heading ? <h1>{line.text}</h1> : <span className="terminal-line-text">{line.text || "\u00a0"}</span>}
                </div>
              );
              })}
              </div>
            ))}
          </article>
        ))}
      </div>
    </main>
  );
}
