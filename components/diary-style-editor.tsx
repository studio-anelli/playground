"use client";

import { useEffect, useState } from "react";

type Screen = "desktop" | "tablet" | "mobile";
type StyleValues = {
  background: string; ink: string; accent: string;
  desktop: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number; h1Line: number; h1Top: number; h1Bottom: number; h2Line: number; h2Top: number; h2Bottom: number; leadLine: number; leadTop: number; leadBottom: number; bodyLine: number; bodyTop: number; bodyBottom: number; h3Line: number; h3Top: number; h3Bottom: number; labelLine: number; labelTop: number; labelBottom: number; metaLine: number; metaTop: number; metaBottom: number; h1Width: number; h2Width: number; leadWidth: number; bodyWidth: number };
  tablet: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number; h1Line: number; h1Top: number; h1Bottom: number; h2Line: number; h2Top: number; h2Bottom: number; leadLine: number; leadTop: number; leadBottom: number; bodyLine: number; bodyTop: number; bodyBottom: number; h3Line: number; h3Top: number; h3Bottom: number; labelLine: number; labelTop: number; labelBottom: number; metaLine: number; metaTop: number; metaBottom: number; h1Width: number; h2Width: number; leadWidth: number; bodyWidth: number };
  mobile: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number; h1Line: number; h1Top: number; h1Bottom: number; h2Line: number; h2Top: number; h2Bottom: number; leadLine: number; leadTop: number; leadBottom: number; bodyLine: number; bodyTop: number; bodyBottom: number; h3Line: number; h3Top: number; h3Bottom: number; labelLine: number; labelTop: number; labelBottom: number; metaLine: number; metaTop: number; metaBottom: number; h1Width: number; h2Width: number; leadWidth: number; bodyWidth: number };
};
const DEFAULTS: StyleValues = {
  background: "#0433ff", ink: "#000000", accent: "#d6d6d6",
  desktop: { h1: 123, h2: 72, lead: 35, body: 20, section: 32, outer: 36, h1Tracking: -7.2, h2Tracking: -3.4, leadTracking: 2.3, bodyTracking: -0.1, h3Tracking: -2, labelTracking: 0.3, metaTracking: 0, h1Line: 1.22, h1Top: 92, h1Bottom: 0, h2Line: 1.24, h2Top: 107, h2Bottom: 73, leadLine: 1.69, leadTop: 80, leadBottom: 0, bodyLine: 1.49, bodyTop: 0, bodyBottom: 40, h3Line: 1.25, h3Top: 7, h3Bottom: 0, labelLine: 1.3, labelTop: 0, labelBottom: 0, metaLine: 1.5, metaTop: 0, metaBottom: 0, h1Width: 900, h2Width: 660, leadWidth: 970, bodyWidth: 810 },
  tablet: { h1: 79, h2: 48, lead: 27, body: 19, section: 32, outer: 30, h1Tracking: -4.6, h2Tracking: -2.3, leadTracking: 1.5, bodyTracking: -0.1, h3Tracking: -1.3, labelTracking: 0.3, metaTracking: 0, h1Line: 1.22, h1Top: 65, h1Bottom: 0, h2Line: 1.24, h2Top: 76, h2Bottom: 52, leadLine: 1.56, leadTop: 60, leadBottom: 0, bodyLine: 1.49, bodyTop: 0, bodyBottom: 32, h3Line: 1.25, h3Top: 7, h3Bottom: 0, labelLine: 1.3, labelTop: 0, labelBottom: 0, metaLine: 1.5, metaTop: 0, metaBottom: 0, h1Width: 690, h2Width: 540, leadWidth: 670, bodyWidth: 620 },
  mobile: { h1: 48, h2: 36, lead: 23, body: 18, section: 26, outer: 20, h1Tracking: -2.8, h2Tracking: -1.7, leadTracking: 0.8, bodyTracking: -0.1, h3Tracking: -0.8, labelTracking: 0.3, metaTracking: 0, h1Line: 1.18, h1Top: 40, h1Bottom: 0, h2Line: 1.21, h2Top: 52, h2Bottom: 32, leadLine: 1.43, leadTop: 38, leadBottom: 0, bodyLine: 1.49, bodyTop: 0, bodyBottom: 26, h3Line: 1.25, h3Top: 7, h3Bottom: 0, labelLine: 1.3, labelTop: 0, labelBottom: 0, metaLine: 1.5, metaTop: 0, metaBottom: 0, h1Width: 540, h2Width: 480, leadWidth: 540, bodyWidth: 540 },
};
const screens: Screen[] = ["desktop", "tablet", "mobile"];
const labels: { key: keyof StyleValues["desktop"]; title: string; min: number; max: number; step: number }[] = [
  { key: "h1", title: "Entry title", min: 28, max: 160, step: 1 },
  { key: "h2", title: "Section heading", min: 24, max: 100, step: 1 },
  { key: "lead", title: "Introduction", min: 16, max: 52, step: 1 },
  { key: "body", title: "Body text", min: 14, max: 30, step: 1 },
  { key: "section", title: "Section whitespace", min: 20, max: 190, step: 2 },
  { key: "outer", title: "Page margin", min: 12, max: 100, step: 2 },
];
const trackingLabels: { key: keyof StyleValues["desktop"]; title: string }[] = [
  { key: "h1Tracking", title: "Entry title" },
  { key: "h2Tracking", title: "Section heading" },
  { key: "leadTracking", title: "Introduction" },
  { key: "bodyTracking", title: "Body text" },
  { key: "h3Tracking", title: "Small headings" },
  { key: "labelTracking", title: "Section labels" },
  { key: "metaTracking", title: "Metadata" },
];
const STORAGE = "playground-diary-editor-beta02-blue-v2";
function readSaved(): StyleValues {
  try {
    const stored = window.localStorage.getItem(STORAGE);
    if (!stored) return DEFAULTS;
    const value = JSON.parse(stored);
    const parsed = { ...DEFAULTS, ...value };
    for (const screen of screens) parsed[screen] = { ...DEFAULTS[screen], ...(value[screen] || {}) };
    return parsed;
  } catch { return DEFAULTS; }
}
function normalizeHex(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ffffff";
}
export function DiaryStyleEditor() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Screen>("desktop");
  const [values, setValues] = useState<StyleValues>(DEFAULTS);
  const [notice, setNotice] = useState("");
  useEffect(() => { setValues(readSaved()); }, []);
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".diary-shell");
    if (!shell) return;
    shell.style.setProperty("--paper", values.background);
    shell.style.setProperty("--ink", values.ink);
    shell.style.setProperty("--signal", values.accent);
    for (const screen of screens) {
      for (const [key, value] of Object.entries(values[screen]))
        shell.style.setProperty(`--diary-${key}-${screen}`, key.endsWith("Line") ? String(value) : value + "px");
    }
    try { window.localStorage.setItem(STORAGE, JSON.stringify(values)); } catch { /* optional storage */ }
  }, [values]);
  const setColor = (key: "background" | "ink" | "accent", next: string) =>
    setValues((current) => ({ ...current, [key]: next }));
  const setNumber = (key: keyof StyleValues["desktop"], number: number) =>
    setValues((current) => ({ ...current, [active]: { ...current[active], [key]: number } }));
  const copy = async () => {
    const json = JSON.stringify(values, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setNotice("Settings copied. Paste them into ChatGPT.");
    } catch {
      setNotice("Copy unavailable. Select the settings in your browser console if needed.");
    }
  };
  return (
    <div className={"diary-tuner " + (open ? "is-open" : "")}>
      <button className="diary-tuner-toggle" type="button" onClick={() => setOpen(!open)}
        aria-expanded={open} aria-controls="diary-tuner-panel">
        {open ? "CLOSE ×" : "EDIT DESIGN ↗"}
      </button>
      {open && <div id="diary-tuner-panel" className="diary-tuner-panel">
        <div className="diary-tuner-head"><strong>DIARY / LIVE STYLE EDITOR</strong><span>LOCAL PREVIEW ONLY</span></div>
        <p>Changes appear immediately and stay in this browser. Nothing is published.</p>
        <div className="diary-tuner-group">
          <span className="diary-tuner-label">COLOURS</span>
          {(["background", "ink", "accent"] as const).map((key) =>
            <label className="diary-tuner-color" key={key}>
              <span>{key === "background" ? "Paper" : key === "ink" ? "Text" : "Accent"}</span>
              <input type="color" aria-label={key + " colour"} value={normalizeHex(values[key])} onChange={(event) => setColor(key, event.target.value)}/>
              <input className="diary-tuner-hex" aria-label={key + " hex"} value={values[key]} maxLength={7} onChange={(event) => setColor(key, event.target.value)}/>
            </label>)}
        </div>
        <div className="diary-tuner-group">
          <span className="diary-tuner-label">FIXED SIZES / PX</span>
          <div className="diary-tuner-tabs" role="group" aria-label="Choose breakpoint to edit">
            {screens.map((screen) => <button type="button" key={screen} aria-pressed={active === screen}
              onClick={() => setActive(screen)}>{screen.toUpperCase()}</button>)}
          </div>
          <span className="diary-tuner-hint">{active === "desktop" ? "1024px and wider" : active === "tablet" ? "641–1023px" : "640px and narrower"}. Resize your browser to see this breakpoint.</span>
          {labels.map((item) => <label className="diary-tuner-number" key={item.key}>
            <span>{item.title}</span>
            <input type="range" min={item.min} max={item.max} step={item.step} value={values[active][item.key]}
              onChange={(event) => setNumber(item.key, Number(event.target.value))}/>
            <input type="number" min={item.min} max={item.max} step={item.step} value={values[active][item.key]}
              onChange={(event) => setNumber(item.key, Number(event.target.value))}/>
          </label>)}
        </div>
        <div className="diary-tuner-group">
          <span className="diary-tuner-label">LETTER SPACING / PX</span>
          <span className="diary-tuner-hint">Negative values tighten letters. Positive values open them up.</span>
          {trackingLabels.map((item) => <label className="diary-tuner-number" key={item.key}>
            <span>{item.title}</span>
            <input type="range" min="-10" max="10" step="0.1" value={values[active][item.key]}
              onChange={(event) => setNumber(item.key, Number(event.target.value))}/>
            <input type="number" min="-10" max="10" step="0.1" value={values[active][item.key]}
              onChange={(event) => setNumber(item.key, Number(event.target.value))}/>
          </label>)}
        </div>

        <div className="diary-tuner-group">
          <span className="diary-tuner-label">LINE HEIGHT + VERTICAL MARGINS</span>
          <span className="diary-tuner-hint">Line height is a multiplier (1 = 100%). Margins are pixels.</span>
          {[{"id":"h1","title":"Entry title"},{"id":"h2","title":"Section heading"},{"id":"lead","title":"Introduction"},{"id":"body","title":"Body paragraphs"},{"id":"h3","title":"Small headings"},{"id":"label","title":"Section labels"},{"id":"meta","title":"Metadata"}].map((style) => (
            <div className="diary-tuner-style" key={style.id}>
              <strong>{style.title}</strong>
              {([
                { suffix: "Line", title: "Line height", min: 0.7, max: 2.5, step: 0.01 },
                { suffix: "Top", title: "Margin top", min: 0, max: 160, step: 1 },
                { suffix: "Bottom", title: "Margin bottom", min: 0, max: 160, step: 1 },
              ] as const).map((control) => {
                const key = (style.id + control.suffix) as keyof StyleValues["desktop"];
                return <label className="diary-tuner-number" key={key}>
                  <span>{control.title}</span>
                  <input type="range" min={control.min} max={control.max} step={control.step} value={values[active][key]}
                    onChange={(event) => setNumber(key, Number(event.target.value))}/>
                  <input type="number" min={control.min} max={control.max} step={control.step} value={values[active][key]}
                    onChange={(event) => setNumber(key, Number(event.target.value))}/>
                </label>;
              })}
            </div>
          ))}
        </div>
        <div className="diary-tuner-group">
          <span className="diary-tuner-label">COLUMN MAX WIDTH / PX</span>
          {[{"id":"h1","title":"Entry title"},{"id":"h2","title":"Section heading"},{"id":"lead","title":"Introduction"},{"id":"body","title":"Body paragraphs"}].map((style) => {
            const key = (style.id + "Width") as keyof StyleValues["desktop"];
            return <label className="diary-tuner-number" key={key}>
              <span>{style.title}</span>
              <input type="range" min="240" max="1400" step="10" value={values[active][key]}
                onChange={(event) => setNumber(key, Number(event.target.value))}/>
              <input type="number" min="240" max="1400" step="10" value={values[active][key]}
                onChange={(event) => setNumber(key, Number(event.target.value))}/>
            </label>;
          })}
        </div>
        <div className="diary-tuner-actions">
          <button type="button" onClick={copy}>COPY SETTINGS</button>
          <button type="button" onClick={() => { setValues(DEFAULTS); setNotice("Defaults restored."); }}>RESET</button>
        </div>
        {notice && <p className="diary-tuner-notice" role="status">{notice}</p>}
      </div>}
    </div>
  );
}
