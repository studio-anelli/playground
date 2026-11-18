import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Cell Field · Playground" };

export default function CellFieldPage() {
  return (
    <main className="import-page" style={{ width: "100%", minHeight: "100svh" }}>
      <header className="import-header import-header-native">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="back-link"><ArrowLeft aria-hidden="true" /> Index</a>
        <h1>Cell Field</h1>
        <span>REC-14 / Generative Graphics</span>
      </header>
      <iframe
        title="Cell Field editor"
        src="/experiments/cell-field/index.html"
        style={{ width: "100%", height: "calc(100svh - 52px)", border: 0, background: "#dedbd3" }}
      />
    </main>
  );
}
