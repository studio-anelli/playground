"use client";

import { useEffect, useState } from "react";
import { APPEARANCE_EVENT, APPEARANCE_KEY, applyAppearance, defaultAppearance, readAppearance, type SiteAppearance } from "@/lib/site-appearance";

export function SiteAppearanceControls() {
  const [appearance, setAppearance] = useState<SiteAppearance>(defaultAppearance);
  useEffect(() => {
    const sync = () => { const value = readAppearance(); applyAppearance(value); setAppearance(value); };
    const onStorage = (event: StorageEvent) => { if (event.key === APPEARANCE_KEY || event.key === null) sync(); };
    sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", sync);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("pageshow", sync); };
  }, []);
  const change = (key: keyof SiteAppearance) => {
    const next = { ...appearance, [key]: !appearance[key] };
    setAppearance(next);
    applyAppearance(next);
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); } catch { /* The controls still work without storage. */ }
    window.dispatchEvent(new Event(APPEARANCE_EVENT));
  };
  return (
    <span className="site-appearance-controls" role="group" aria-label="Color scheme">
      <button type="button" aria-label="Invert colors" title="Invert colors" aria-pressed={appearance.inverted} onClick={() => change("inverted")}>I</button>
      <button type="button" aria-label="Black and ivory colors" title="Black and ivory colors" aria-pressed={appearance.monochrome} onClick={() => change("monochrome")}>BW</button>
    </span>
  );
}
