"use client";

import { useEffect } from "react";
import { DIARY_STYLE_STORAGE, readDiaryPalette } from "@/lib/diary-palette";

export function HomePalette() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".home-shell, .terminal-shell");
    if (!shell) return;
    const root = document.documentElement;
    const previousGround = root.style.getPropertyValue("--shell-background");
    const apply = () => {
      const palette = readDiaryPalette();
      shell.style.setProperty("--paper", palette.ink);
      shell.style.setProperty("--ink", palette.background);
      shell.style.setProperty("--signal", palette.accent);
      root.style.setProperty("--shell-background", `color-mix(in srgb, ${palette.ink} 92%, #f4f1eb)`);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === DIARY_STYLE_STORAGE || event.key === null) apply();
    };
    apply();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", apply);
    return () => {
      if (previousGround) root.style.setProperty("--shell-background", previousGround);
      else root.style.removeProperty("--shell-background");
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", apply);
    };
  }, []);
  return null;
}
