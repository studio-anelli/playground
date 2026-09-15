"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
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
      <section className="ui-v1-experiment ui-rollout-experiment" aria-label={`${title} interactive experiment`}>
        {children}
      </section>
    </main>
  );
}
