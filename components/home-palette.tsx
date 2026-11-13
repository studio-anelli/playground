"use client";

import { useEffect } from "react";
import { DIARY_STYLE_STORAGE, readDiaryPalette } from "@/lib/diary-palette";

export function HomePalette() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".home-shell");
    if (!shell) return;
    const apply = () => {
      const palette = readDiaryPalette();
      shell.style.setProperty("--paper", palette.ink);
      shell.style.setProperty("--ink", palette.background);
      shell.style.setProperty("--signal", palette.accent);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === DIARY_STYLE_STORAGE || event.key === null) apply();
    };
    apply();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", apply);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", apply);
    };
  }, []);
  return null;
}
