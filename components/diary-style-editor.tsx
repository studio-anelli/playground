"use client";

import { useEffect, useState } from "react";

type Screen = "desktop" | "tablet" | "mobile";
type StyleValues = {
  background: string; ink: string; accent: string;
  desktop: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number };
  tablet: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number };
  mobile: { h1: number; h2: number; lead: number; body: number; section: number; outer: number; h1Tracking: number; h2Tracking: number; leadTracking: number; bodyTracking: number; h3Tracking: number; labelTracking: number; metaTracking: number };
};
const DEFAULTS: StyleValues = {
  background: "#ffffff", ink: "#191919", accent: "#2457c5",
  desktop: { h1: 100, h2: 54, lead: 28, body: 20, section: 104, outer: 52, h1Tracking: -6, h2Tracking: -3, leadTracking: -0.6, bodyTracking: -0.1, h3Tracking: -0.5, labelTracking: 0.3, metaTracking: 0.3 },
  tablet: { h1: 72, h2: 44, lead: 24, body: 19, section: 84, outer: 36, h1Tracking: -4.3, h2Tracking: -2.3, leadTracking: -0.5, bodyTracking: -0.1, h3Tracking: -0.5, labelTracking: 0.3, metaTracking: 0.3 },
  mobile: { h1: 48, h2: 34, lead: 22, body: 18, section: 68, outer: 20, h1Tracking: -2.9, h2Tracking: -1.8, leadTracking: -0.45, bodyTracking: -0.1, h3Tracking: -0.4, labelTracking: 0.3, metaTracking: 0.3 },
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
const STORAGE = "playground-diary-editor-beta02";
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
        shell.style.setProperty(`--diary-${key}-${screen}`, value + "px");
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
        <div className="diary-tuner-actions">
          <button type="button" onClick={copy}>COPY SETTINGS</button>
          <button type="button" onClick={() => { setValues(DEFAULTS); setNotice("Defaults restored."); }}>RESET</button>
        </div>
        {notice && <p className="diary-tuner-notice" role="status">{notice}</p>}
      </div>}
    </div>
  );
}
