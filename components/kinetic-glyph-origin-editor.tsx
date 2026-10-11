"use client";
import { useEffect, useRef, useState } from "react";
import { firstGridCoordinate, originAlphabet, type GlyphOrigin, type GlyphOriginMap } from "./kinetic-glyph-origins";

type Props = { origins: GlyphOriginMap; onChange: (map: GlyphOriginMap) => void; sources: { name: string; font: string; weight: number; text: string }[]; step: number; mode: "xy" | "x" | "y"; onClose: () => void };
export default function GlyphOriginEditor({ origins, onChange, sources, step, mode, onClose }: Props) {
  const [source, setSource] = useState(0), [char, setChar] = useState("A");
  const canvas = useRef<HTMLCanvasElement>(null), windowRef = useRef<HTMLElement>(null);
  const geometry = useRef({ x: 0, y: 0, width: 1, height: 1 }), dragging = useRef(false);
  const selected = sources[source], point = origins[selected.font]?.[char] || { x: 0, y: 0 };
  const chars = Array.from(new Set([...originAlphabet, ...sources.flatMap(s => Array.from(s.text).filter(c => c.trim()))])).slice(0, 128);
  const update = (position: GlyphOrigin) => {
    const existing = origins[selected.font] || {};
    if (!existing[char] && Object.keys(existing).length >= 128) return;
    onChange({ ...origins, [selected.font]: { ...existing, [char]: position } });
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    windowRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const draw = () => {
      if (cancelled || !canvas.current) return;
      const c = canvas.current, ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#151515"; ctx.fillRect(0, 0, c.width, c.height);
      let size = 220; ctx.font = `${selected.weight} ${size}px ${selected.font}`;
      let m = ctx.measureText(char);
      size *= Math.min(1, 264 / Math.max(1, m.actualBoundingBoxLeft + m.actualBoundingBoxRight), 208 / Math.max(1, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
      ctx.font = `${selected.weight} ${size}px ${selected.font}`; m = ctx.measureText(char);
      const width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight)), height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
      const x = (c.width - width) / 2, y = (c.height - height) / 2;
      geometry.current = { x, y, width, height };
      ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#d5d5ce"; ctx.fillText(char, x + m.actualBoundingBoxLeft, y + m.actualBoundingBoxAscent);
      ctx.strokeStyle = "#666"; ctx.lineWidth = 1; ctx.strokeRect(x, y, width, height);
      const ox = x + point.x * width, oy = y + point.y * height, spacing = Math.max(1, Math.round(step / 100 * size));
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip(); ctx.strokeStyle = "#7194ff66"; ctx.beginPath();
      if (mode !== "y") for (let gx = firstGridCoordinate(x, ox, spacing); gx <= x + width; gx += spacing) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); }
      if (mode !== "x") for (let gy = firstGridCoordinate(y, oy, spacing); gy <= y + height; gy += spacing) { ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); }
      ctx.stroke(); ctx.restore(); ctx.strokeStyle = "#f2c438"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ox - 14, oy); ctx.lineTo(ox + 14, oy); ctx.moveTo(ox, oy - 14); ctx.lineTo(ox, oy + 14); ctx.stroke();
      ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fillStyle = "#f2c438"; ctx.fill();
    };
    draw(); void document.fonts.ready.then(draw);
    return () => { cancelled = true; };
  }, [char, selected.font, selected.weight, point.x, point.y, step, mode]);
  const move = (clientX: number, clientY: number) => {
    const c = canvas.current!, rect = c.getBoundingClientRect(), g = geometry.current;
    update({ x: Math.max(0, Math.min(1, ((clientX - rect.left) * c.width / rect.width - g.x) / g.width)), y: Math.max(0, Math.min(1, ((clientY - rect.top) * c.height / rect.height - g.y) / g.height)) });
  };
  return <div className="kp-origin-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}><section ref={windowRef} className="kp-origin-window" role="dialog" aria-modal="true" aria-labelledby="kp-origin-title" onKeyDown={e => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    if (e.key === "Tab") { const nodes = Array.from(windowRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled),select,input,canvas')); const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  }}><header><h2 id="kp-origin-title">GLYPH ORIGINS</h2><button aria-label="Close glyph origins" onClick={onClose}>×</button></header>
    <div className="kp-origin-tools"><select aria-label="Origin editor typography source" value={source} onChange={e => setSource(Number(e.target.value))}>{sources.map((s, i) => <option key={i} value={i}>{s.name}</option>)}</select><span>{char} · DRAG ORIGIN</span><button onClick={() => { const next = { ...origins[selected.font] }; delete next[char]; onChange({ ...origins, [selected.font]: next }); }}>RESET LETTER</button><button onClick={() => { const next = { ...origins }; delete next[selected.font]; onChange(next); }}>RESET FONT</button></div>
    <div className="kp-origin-content"><div className="kp-origin-alphabet" aria-label="Choose a glyph">{chars.map(c => <button key={c} aria-label={`Edit origin ${c}`} aria-pressed={char === c} className={origins[selected.font]?.[c] ? "is-mapped" : ""} onClick={() => setChar(c)}>{c}</button>)}</div><div><canvas ref={canvas} width={340} height={280} tabIndex={0} aria-label={`Drag sampling origin for ${char}; arrow keys adjust it`} onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); dragging.current = true; e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX, e.clientY); }} onPointerMove={e => { if (dragging.current) move(e.clientX, e.clientY); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} onKeyDown={e => { const delta = e.shiftKey ? .01 : .001; if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return; e.preventDefault(); update({ x: Math.max(0, Math.min(1, point.x + (e.key === "ArrowRight" ? delta : e.key === "ArrowLeft" ? -delta : 0))), y: Math.max(0, Math.min(1, point.y + (e.key === "ArrowDown" ? delta : e.key === "ArrowUp" ? -delta : 0))) }); }} /><div className="kp-origin-coordinates">{(["x", "y"] as const).map(axis => <label key={axis}>{axis.toUpperCase()} · %<input aria-label={`Origin ${axis} percent`} type="number" min={0} max={100} step={.1} value={Math.round(point[axis] * 1000) / 10} onChange={e => { const n = Number(e.target.value); if (e.target.value && Number.isFinite(n)) update({ ...point, [axis]: Math.max(0, Math.min(1, n / 100)) }); }} /></label>)}</div></div></div>
  </section></div>;
}
