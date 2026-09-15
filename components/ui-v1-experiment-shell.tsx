"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

const PALETTE = [
  "#ff4f2e",
  "#5b5cff",
  "#00a878",
  "#ed2f87",
  "#ffc400",
  "#0077ff",
  "#8e44ff",
  "#00b8d9",
];

function readableInk(hex: string) {
  const rgb = hex.replace("#", "").match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.42 ? "#0f0f10" : "#f2f2f2";
}

export default function UIV1ExperimentShell({
  title,
  rec,
  tags,
  className,
  children,
}: {
  title: string;
  rec: string;
  tags: string;
  className: string;
  children: ReactNode;
}) {
  const [background, setBackground] = useState("#5b5cff");
  const [controlsOpen, setControlsOpen] = useState(true);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; x: number; y: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    const previous = window.sessionStorage.getItem("playground-vibrant-background");
    const choices = PALETTE.filter((color) => color !== previous);
    const next = choices[Math.floor(Math.random() * choices.length)] ?? PALETTE[0];
    window.sessionStorage.setItem("playground-vibrant-background", next);
    setBackground(next);
  }, []);

  const style = {
    "--ui-v1-bg": background,
    "--ui-v1-fg": readableInk(background),
  } as CSSProperties;

  const panelStyle = {
    "--ui-rollout-panel-x": `${panelOffset.x}px`,
    "--ui-rollout-panel-y": `${panelOffset.y}px`,
  } as CSSProperties;

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: panelOffset.x,
      originY: panelOffset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPanelOffset({
      x: Math.max(-(window.innerWidth - 340), Math.min(24, drag.originX + event.clientX - drag.x)),
      y: Math.max(-64, Math.min(window.innerHeight - 260, drag.originY + event.clientY - drag.y)),
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <main className={`ui-v1-page ui-rollout-page ${className}`} style={style}>
      <header className="ui-v1-header">
        <a href="/" className="ui-v1-back">
          <ArrowLeft aria-hidden="true" />
          Back
        </a>
        <h1>{title}</h1>
        <div className="ui-v1-meta">
          <span>REC - {rec}</span>
          <span>{tags}</span>
        </div>
      </header>
      <div
        className="ui-rollout-panel-handle"
        style={panelStyle}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span>Controls</span>
        <span aria-hidden="true">≡</span>
        <button
          type="button"
          aria-label={controlsOpen ? "Collapse controls" : "Open controls"}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setControlsOpen((open) => !open)}
        >
          {controlsOpen ? "×" : "+"}
        </button>
      </div>
      <section
        className={`ui-v1-experiment ui-rollout-experiment ${controlsOpen ? "controls-open" : "controls-closed"}`}
        style={panelStyle}
        aria-label={`${title} interactive experiment`}
      >
        {children}
      </section>
    </main>
  );
}
