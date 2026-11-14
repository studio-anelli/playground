"use client";

import { useEffect } from "react";

export function DiaryReadingFocus() {
  useEffect(() => {
    const document = window.document.querySelector<HTMLElement>(".terminal-document");
    if (!document) return;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-reading-block]"));
    let active: HTMLElement | null = null;
    let frame = 0;
    const update = () => {
      frame = 0;
      const centre = window.innerHeight / 2;
      let nearest: HTMLElement | null = null;
      let distance = Infinity;
      for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;
        const gap = Math.max(rect.top - centre, centre - rect.bottom, 0);
        if (gap < distance) { distance = gap; nearest = block; }
      }
      if (distance > window.innerHeight * 0.2) nearest = null;
      if (nearest !== active) {
        active?.classList.remove("is-reading");
        nearest?.classList.add("is-reading");
        active = nearest;
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(document);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
      cancelAnimationFrame(frame);
      active?.classList.remove("is-reading");
    };
  }, []);
  return null;
}
