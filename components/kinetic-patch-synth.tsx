"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
type Shape = "sine" | "triangle" | "square" | "noise";
type Wave = { on: boolean; shape: Shape; rate: number; amp: number; speed: number; direction: number; phase: number };
const specs = [
  ["step", "Step · % em", 1, 20, .1, "sampling"], ["jitter", "Jitter", 0, 35, .1, "sampling"],
  ["gridSize", "Cell size · % em", 5, 100, 1, "grid"], ["strength", "Strength · % em", 0, 50, 1, "grid"],
  ["gridMix", "Mix", 0, 1, .01, "grid"], ["legibility", "Legibility", 0, 1, .01, "grid"],
  ["vertexSize", "Size", 1, 24, .1, "vertex"], ["vertexMix", "Mix", 0, 1, .01, "vertex"],
  ["fontSize", "Size", 40, 420, 1, "typography"], ["weight", "Weight", 100, 900, 10, "typography"],
] as const;
type Target = typeof specs[number][0];
type Patch = { id: string; wave: number; target: Target; amount: number };
type XY = { x: number; y: number };
type Glyph = { canvas: HTMLCanvasElement; pixels: Uint8ClampedArray; x: number; y: number; width: number; height: number; em: number };
type SamplePoint = XY & { glyph: Glyph };
const manualSpecs = [
  ["threshold", "Threshold", .01, 1, .01, "sampling"], ["opacity", "Opacity", 0, 1, .01, "sampling"],
  ["hideOriginal", "Hide original", 0, 10, .1, "grid"], ["stretch", "Stretch / compress", 0, 1.5, .01, "grid"], ["axis", "Axis · X ↔ Y", 0, 1, .01, "grid"],
  ["lineLength", "Line length", 1, 80, 1, "vertex"], ["tracking", "Tracking", -20, 60, 1, "typography"],
] as const;
const initialManual = { threshold: .42, opacity: 1, hideOriginal: 0, stretch: 0, axis: .5, lineLength: 6, tracking: 0 };
const initial: Record<Target, number> = { step: 3.5, jitter: 0, gridSize: 24, strength: 13, gridMix: .7, legibility: .3, vertexSize: 3, vertexMix: .7, fontSize: 240, weight: 800 };
const colors = ["#3478f6", "#f2c438", "#ed514b"];
const groups = { sampling: "SAMPLING", grid: "GRID DISTORTION", vertex: "SHAPE / VERTEX", typography: "TYPOGRAPHY" };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function waveValue(shape: Shape, phase: number, seed = 0) {
  const p = phase - Math.floor(phase);
  if (shape === "sine") return Math.sin(phase * Math.PI * 2);
  if (shape === "triangle") return 1 - 4 * Math.abs(p - .5);
  if (shape === "square") return p < .5 ? 1 : -1;
  const hash = (n: number) => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  const f = p * p * (3 - 2 * p);
  return hash(Math.floor(phase)) * (1 - f) + hash(Math.floor(phase) + 1) * f;
}
export default function KineticPatchSynth() {
  const [waves, setWaves] = useState<Wave[]>([{ on: true, shape: "sine", rate: 1, amp: .7, speed: .25, direction: 0, phase: 0 }, { on: true, shape: "triangle", rate: 1, amp: .5, speed: .12, direction: .5, phase: .25 }, { on: true, shape: "noise", rate: 1, amp: .4, speed: .7, direction: 1, phase: .5 }]);
  const [gridShape, setGridShape] = useState<Shape>("sine");
  const [values, setValues] = useState(initial);
  const [manual, setManual] = useState(initialManual);
  const [modes, setModes] = useState({ sampling: true, grid: true, vertex: true });
  const [patches, setPatches] = useState<Patch[]>([{ id: "initial", wave: 0, target: "strength", amount: 45 }]);
  const [text, setText] = useState("KINETIC"), [font, setFont] = useState("system-ui, sans-serif"), [vertex, setVertex] = useState("line");
  const [selected, setSelected] = useState<number | null>(null), [drag, setDrag] = useState<(XY & { wave: number }) | null>(null);
  const [positions, setPositions] = useState<Record<string, XY>>({});
  const [paused, setPaused] = useState(false), [bg, setBg] = useState("#d7d8d2"), [ink, setInk] = useState("#202422");
  const canvas = useRef<HTMLCanvasElement>(null), panel = useRef<HTMLDivElement>(null);
  const [bayCollapsed, setBayCollapsed] = useState(false);
  const [bayPosition, setBayPosition] = useState<XY | null>(null);
  const bayDrag = useRef<XY | null>(null);
  const bay = useRef<HTMLElement>(null);
  const dragMoved = useRef(false);
  const dragRef = useRef<(XY & { wave: number }) | null>(null);
  const sockets = useRef<Record<string, HTMLButtonElement | null>>({});
  const live = useRef({ waves, values, manual, modes, patches, text, font, vertex, gridShape, paused, bg, ink });
  useEffect(() => { live.current = { waves, values, manual, modes, patches, text, font, vertex, gridShape, paused, bg, ink }; }, [waves, values, manual, modes, patches, text, font, vertex, gridShape, paused, bg, ink]);
  useEffect(() => {
    const measure = () => {
      if (!panel.current) return;
      const box = panel.current.getBoundingClientRect(), next: Record<string, XY> = {};
      for (const [key, el] of Object.entries(sockets.current)) if (el) { const r = el.getBoundingClientRect(); next[key] = { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; }
      setPositions(next);
    };
    const observer = new ResizeObserver(measure); if (panel.current) observer.observe(panel.current);
    measure(); window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    let raf = 0, previous = 0, cacheKey = "", sampleKey = "", lastRebuild = -100;
    const phases = [0, .25, .5], source = document.createElement("canvas"), sctx = source.getContext("2d", { willReadFrequently: true })!;
    let points: SamplePoint[] = [], glyphs: Glyph[] = [];
    const frame = (now: number) => {
      const s = live.current, dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
      if (!s.paused) { s.waves.forEach((w, i) => { if (w.on) phases[i] += dt * w.speed; }); }
      const el = canvas.current, ctx = el?.getContext("2d");
      if (el && ctx) {
        const rect = el.getBoundingClientRect(), W = Math.max(64, Math.round(rect.width)), H = Math.max(64, Math.round(rect.height)), dpr = Math.min(2, window.devicePixelRatio || 1);
        if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const field = (i: number, x: number, y: number) => { const w = s.waves[i]; return w.on ? waveValue(w.shape, phases[i] + w.phase + (x * (1 - w.direction) + y * w.direction) * w.rate, i + 1) * w.amp : 0; };
        const signals = s.waves.map((_, i) => field(i, .5, .5)), mod = { ...s.values };
        const at = (target: Target, x: number, y: number, glyph?: Glyph) => {
          const spec = specs.find(c => c[0] === target)!;
          const sum = s.patches.filter(p => p.target === target).reduce((v, p) => v + field(p.wave, glyph ? (x - glyph.x) / glyph.em : x / W, glyph ? (y - glyph.y) / glyph.em : y / H) * p.amount / 100, 0);
          return clamp(s.values[target] + sum * (spec[3] - spec[2]) / 2, spec[2], spec[3]);
        };
        for (const [key, , min, max] of specs) {
          const sum = s.patches.filter(p => p.target === key).reduce((v, p) => v + signals[p.wave] * p.amount / 100, 0);
          mod[key] = clamp(s.values[key] + sum * (max - min) / 2, min, max);
        }
        const size = Math.round(mod.fontSize), weight = Math.round(mod.weight / 10) * 10;
        const key = `${W}|${H}|${s.text}|${s.font}|${size}|${weight}|${s.ink}|${s.manual.tracking}`;
        // Cap expensive glyph rasterisation at 20fps; wave evaluation and drawing remain at display rate.
        if (key !== cacheKey && (now - lastRebuild >= 50 || !cacheKey)) {
          source.width = W; source.height = H; sctx.fillStyle = s.ink; sctx.textAlign = "center"; sctx.textBaseline = "middle";
          const lines = s.text.split("\n"); let fitted = Math.min(size, H * .75 / Math.max(1, lines.length));
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          const widthOf = (line: string) => Array.from(line).reduce((width, char) => width + sctx.measureText(char).width, 0) + Math.max(0, Array.from(line).length - 1) * s.manual.tracking;
          // Tracking stays in pixel units while the type fits the available canvas.
          for (let n = 0; n < 5; n++) { const widest = Math.max(1, ...lines.map(widthOf)); if (widest <= W - 48) break; fitted *= (W - 48) / widest; sctx.font = `${weight} ${fitted}px ${s.font}`; }
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          sctx.textAlign = "left"; sctx.textBaseline = "alphabetic";
          glyphs = [];
          const metrics = sctx.measureText("Mg"), ascent = metrics.actualBoundingBoxAscent, descent = metrics.actualBoundingBoxDescent;
          lines.forEach((line, i) => {
            let x = (W - widthOf(line)) / 2;
            const baseline = H / 2 + (i - (lines.length - 1) / 2) * fitted * 1.1 + (ascent - descent) / 2;
            for (const char of Array.from(line)) {
              const m = sctx.measureText(char);
              if (char.trim()) {
                // Each character owns its raster: neighbouring letters cannot leak into its sampling grid.
                const width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 8);
                const height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 8);
                const c = document.createElement("canvas"); c.width = width; c.height = height;
                const gc = c.getContext("2d", { willReadFrequently: true })!;
                gc.font = sctx.font; gc.textBaseline = "alphabetic"; gc.fillStyle = s.ink;
                gc.fillText(char, m.actualBoundingBoxLeft + 4, m.actualBoundingBoxAscent + 4);
                const gx = x - m.actualBoundingBoxLeft - 4, gy = baseline - m.actualBoundingBoxAscent - 4;
                glyphs.push({ canvas: c, pixels: gc.getImageData(0, 0, width, height).data, x: gx, y: gy, width, height, em: fitted });
                sctx.drawImage(c, gx, gy);
              }
              x += m.width + s.manual.tracking;
            }
          });
          cacheKey = key; lastRebuild = now;
        }
        const steps = glyphs.map(g => Math.max(1, Math.round(at("step", g.x + g.em / 2, g.y + g.em / 2, g) / 100 * g.em)));
        const nextSampleKey = `${cacheKey}|${steps.join(",")}|${s.manual.threshold}`;
        if (sampleKey !== nextSampleKey) {
          points = [];
          glyphs.forEach((g, i) => {
            const spacing = steps[i];
            // Reset the lattice at each letter; spacing follows its font size, not the word's width.
            for (let y = 4; y < g.height - 4; y += spacing) for (let x = 4; x < g.width - 4; x += spacing) {
              if (g.pixels[(y * g.width + x) * 4 + 3] >= s.manual.threshold * 255) points.push({ x: g.x + x, y: g.y + y, glyph: g });
            }
          });
          sampleKey = nextSampleKey;
        }
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = s.ink; ctx.strokeStyle = s.ink;
        const gridField = (phase: number, seed = 0) => waveValue(s.gridShape, phase / (Math.PI * 2), seed);
        const cellFor = (g: Glyph, x: number, y: number) => Math.max(2, at("gridSize", x, y, g) / 100 * g.em);
        const stretchFor = (g: Glyph, x: number, y: number, cell: number) => gridField((y - g.y) / cell + (x - g.x) / cell * .7) * s.manual.stretch * at("gridMix", x, y, g) * (1 - at("legibility", x, y, g));
        const warp = (x: number, y: number, g: Glyph): [number, number] => {
          if (!s.modes.grid) return [x, y];
          const cell = cellFor(g, x, y), mix = at("gridMix", x, y, g), keep = 1 - at("legibility", x, y, g);
          const strength = at("strength", x, y, g) / 100 * g.em * mix;
          const lx = x - g.x, ly = y - g.y;
          const cx = g.x + Math.floor(lx / cell) * cell + cell / 2, cy = g.y + Math.floor(ly / cell) * cell + cell / 2;
          const stretch = stretchFor(g, cx, cy, cell);
          return [x + gridField(ly / cell) * strength * keep + (x - cx) * stretch * (1 - s.manual.axis),
            y + gridField(lx / cell + Math.PI / 2, 7) * strength * .6 * keep - (y - cy) * stretch * s.manual.axis];
        };
        ctx.globalAlpha = s.modes.sampling ? s.manual.opacity : 1;
        if (!s.modes.sampling && !s.modes.vertex) {
          if (!s.modes.grid) ctx.drawImage(source, 0, 0);
          else glyphs.forEach(g => {
            const cell = Math.round(cellFor(g, g.x + g.em / 2, g.y + g.em / 2));
            for (let y = 0; y < g.height; y += cell) for (let x = 0; x < g.width; x += cell) {
              const cx = g.x + x + cell / 2, cy = g.y + y + cell / 2, [px, py] = warp(cx, cy, g);
              if (s.manual.hideOriginal > 0 && Math.hypot(px - cx, py - cy) < s.manual.hideOriginal) continue;
              const width = Math.min(cell, g.width - x), height = Math.min(cell, g.height - y);
              const stretch = stretchFor(g, cx, cy, cell);
              const dw = Math.max(1, width * (1 + stretch * (1 - s.manual.axis))), dh = Math.max(1, height * (1 - stretch * s.manual.axis));
              ctx.drawImage(g.canvas, x, y, width, height, px - cell / 2 + (width - dw) / 2, py - cell / 2 + (height - dh) / 2, dw + 1, dh + 1);
            }
          });
        } else {
          points.forEach((p, i) => {
            const [px, py] = warp(p.x, p.y, p.glyph), j = s.modes.sampling ? at("jitter", p.x, p.y, p.glyph) : 0, x = px + Math.sin(i * 73.17) * j, y = py + Math.cos(i * 37.71) * j;
            if (s.modes.grid && s.manual.hideOriginal > 0 && Math.hypot(px - p.x, py - p.y) < s.manual.hideOriginal) return;
            const mix = s.modes.vertex ? at("vertexMix", p.x, p.y, p.glyph) : 0, r = 1.3 * (1 - mix) + at("vertexSize", p.x, p.y, p.glyph) * mix;
            ctx.beginPath();
            if (s.modes.vertex && mix > .01 && s.vertex === "square") ctx.fillRect(x - r / 2, y - r / 2, r, r);
            else if (s.modes.vertex && mix > .01 && s.vertex === "line") { ctx.lineWidth = Math.max(1, r / 3); const length = (2.6 * (1 - mix) + s.manual.lineLength * mix) / (2 * Math.SQRT2); ctx.moveTo(x - length, y - length); ctx.lineTo(x + length, y + length); ctx.stroke(); }
            else { ctx.arc(x, y, Math.max(.5, r / 2), 0, Math.PI * 2); ctx.fill(); }
          });
        }
        ctx.globalAlpha = 1;

      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, []);
  const changeWave = (i: number, change: Partial<Wave>) => setWaves(all => all.map((w, n) => n === i ? { ...w, ...change } : w));
  const connect = (wave: number, target: Target) => { setPatches(all => all.some(p => p.wave === wave && p.target === target) ? all : [...all, { id: `${wave}-${target}`, wave, target, amount: 50 }]); setSelected(null); setDrag(null); };
  const finishDrag = (e: PointerEvent) => {
    const active = dragRef.current;
    if (!active) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-target]");
    let target = hit?.dataset.target as Target | undefined;
    if (!target) for (const [key] of specs) {
      const el = sockets.current[key]; if (!el) continue;
      const r = el.getBoundingClientRect();
      if (Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) < 25) { target = key; break; }
    }
    dragRef.current = null;
    if (target) connect(active.wave, target); else setDrag(null);
  };
  const cable = (a: XY, b: XY) => `M ${a.x} ${a.y} C ${a.x + 70} ${a.y}, ${b.x - 70} ${b.y}, ${b.x} ${b.y}`;
  return <main className="kp" style={{ "--kp-bg": bg } as CSSProperties}>
    <header className="kp-header"><a href="/experiments/kinetic-type-synth">← ORIGINAL</a><h1>K‑NET‑C <span>/ PATCH</span></h1><button onClick={() => setPaused(v => !v)}>{paused ? "▶ RUN" : "Ⅱ HOLD"}</button></header>
    <section className="kp-stage"><canvas ref={canvas} aria-label="Animated kinetic typography" /><span className="kp-caption">VISUAL SYNTHESIZER · THREE WAVE ENGINE</span></section>
    <div className="kp-controls"><div ref={panel} className="kp-rack" onPointerMove={e => { if (drag && panel.current) { const r = panel.current.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left - drag.x, e.clientY - r.top - drag.y) > 3) dragMoved.current = true; setDrag({ ...drag, x: e.clientX - r.left, y: e.clientY - r.top }); } }} onPointerUp={finishDrag} onPointerCancel={() => { dragRef.current = null; setDrag(null); }}>
      <svg className="kp-cables" aria-hidden="true">{patches.map(p => { const a = positions[`wave${p.wave}`], b = positions[p.target]; return a && b ? <path key={p.id} d={cable(a, b)} stroke={colors[p.wave]} /> : null; })}{drag && positions[`wave${drag.wave}`] && <path d={cable(positions[`wave${drag.wave}`], drag)} stroke={colors[drag.wave]} strokeDasharray="4 4" />}</svg>
      <section className="kp-waves"><div className="kp-title">01 / WAVE MODULATORS</div>
        {waves.map((w, i) => <div key={i} className="kp-wave" style={{ "--wave": colors[i] } as CSSProperties}><div className="kp-wavehead"><b>WAVE {i + 1}</b><button aria-pressed={w.on} onClick={() => changeWave(i, { on: !w.on })}>{w.on ? "ON" : "OFF"}</button><button className={`kp-socket ${selected === i ? "selected" : ""}`} aria-label={`Patch output wave ${i + 1}`} ref={el => { sockets.current[`wave${i}`] = el; }} onClick={() => { if (!dragMoved.current) setSelected(selected === i ? null : i); }} onPointerDown={e => { dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); dragRef.current = { wave: i, x: e.clientX - r.left, y: e.clientY - r.top }; setDrag(dragRef.current); }} /></div>
          <div className="kp-shapes">{(["sine", "triangle", "square", "noise"] as Shape[]).map((s, n) => <button key={s} aria-label={`Wave ${i + 1} ${s}`} aria-pressed={w.shape === s} onClick={() => changeWave(i, { shape: s })}>{["∿", "△", "⊓", "⁙"][n]}</button>)}</div>
          <div className="kp-wavecontrols">{([
            ["rate", "FREQ", .1, 6, .01], ["amp", "AMP", 0, 1, .01], ["speed", "SPEED · Hz", 0, 3, .01], ["direction", "DIR · X/Y", 0, 1, .01], ["phase", "PHASE", 0, 1, .01],
          ] as const).map(([key, label, min, max, step]) => <label key={key}>{label}<output>{w[key].toFixed(2)}</output><input aria-label={`Wave ${i + 1} ${key}`} type="range" min={min} max={max} step={step} value={w[key]} onChange={e => changeWave(i, { [key]: +e.target.value })} /></label>)}</div>
        </div>)}
      </section>
      <section className="kp-modules"><div className="kp-title">02 / VISUAL OSCILLATORS</div><div className="kp-modulegrid">{(Object.keys(groups) as (keyof typeof groups)[]).map(group => <section className="kp-module" key={group}><div className="kp-modulehead"><h2>{groups[group]}</h2>{group !== "typography" && <button aria-pressed={modes[group]} onClick={() => setModes(m => ({ ...m, [group]: !m[group] }))}>{modes[group] ? "ON" : "OFF"}</button>}</div>
        {group === "grid" && <select aria-label="Grid shape" value={gridShape} onChange={e => setGridShape(e.target.value as Shape)}>{(["sine", "triangle", "square", "noise"] as Shape[]).map(shape => <option key={shape} value={shape}>{shape.toUpperCase()}</option>)}</select>}
        {group === "vertex" && <select aria-label="Vertex shape" value={vertex} onChange={e => setVertex(e.target.value)}><option value="line">LINE</option><option value="dot">DOT</option><option value="square">SQUARE</option></select>}{group === "typography" && <select aria-label="System font" value={font} onChange={e => setFont(e.target.value)}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option></select>}
        {specs.filter(c => c[5] === group).map(([key, label, min, max, step]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input ${group} ${label}`} onClick={() => { if (selected !== null) connect(selected, key); }} /><label>{label}<output>{values[key].toFixed(step < 1 ? 1 : 0)}</output><input aria-label={`${group} ${label}`} type="range" min={min} max={max} step={step} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: +e.target.value }))} /></label></div>)}
        <div className="kp-manual">{manualSpecs.filter(c => c[5] === group).map(([key, label, min, max, step]) => <label key={key}>{label}<output>{manual[key].toFixed(step < 1 ? 2 : 0)}</output><input aria-label={`${group} ${label}`} type="range" min={min} max={max} step={step} value={manual[key]} onChange={e => setManual(v => ({ ...v, [key]: +e.target.value }))} /></label>)}</div>
      </section>)}</div></section>

    </div></div>
      <section ref={bay} className={`kp-patches kp-floating ${bayCollapsed ? "is-collapsed" : ""}`} aria-label="Patch bay" style={bayPosition ? { left: bayPosition.x, top: bayPosition.y, bottom: "auto" } : undefined}><div className="kp-title kp-bay-handle" onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; const r = bay.current!.getBoundingClientRect(); bayDrag.current = { x: e.clientX - r.left, y: e.clientY - r.top }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!bayDrag.current || !bay.current) return; const r = bay.current.getBoundingClientRect(); setBayPosition({ x: clamp(e.clientX - bayDrag.current.x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(e.clientY - bayDrag.current.y, 8, Math.max(8, window.innerHeight - r.height - 8)) }); }} onPointerUp={() => { bayDrag.current = null; }} onPointerCancel={() => { bayDrag.current = null; }}>03 / PATCH BAY <span><button aria-label={bayCollapsed ? "Expand patch bay" : "Collapse patch bay"} aria-expanded={!bayCollapsed} onClick={() => setBayCollapsed(v => !v)}>{bayCollapsed ? "+" : "−"}</button> <button onClick={() => { setPatches([]); setSelected(null); }}>CLEAR</button></span></div><div className="kp-bay-content" hidden={bayCollapsed}><p>{selected === null ? "Drag an output to an input. Or click both sockets." : `WAVE ${selected + 1} selected · choose an input`}</p>{patches.length === 0 && <p>No cables connected.</p>}{patches.map(p => { const c = specs.find(c => c[0] === p.target)!; return <div className="kp-patch" key={p.id} style={{ "--wave": colors[p.wave] } as CSSProperties}><b>W{p.wave + 1} → {c[5]} / {c[1]}</b><button aria-label={`Remove wave ${p.wave + 1} to ${c[5]} ${c[1]}`} onClick={() => setPatches(all => all.filter(item => item.id !== p.id))}>×</button><label>AMOUNT <output>{p.amount > 0 ? "+" : ""}{p.amount}%</output><input aria-label={`Amount wave ${p.wave + 1} to ${c[5]} ${c[1]}`} type="range" min="-100" max="100" value={p.amount} onChange={e => setPatches(all => all.map(item => item.id === p.id ? { ...item, amount: +e.target.value } : item))} /></label></div>; })}</div></section>
    <footer className="kp-footer"><label>TEXT <textarea aria-label="Text" value={text} onChange={e => setText(e.target.value)} rows={1} /></label><label>BACKGROUND <input aria-label="Background color" type="color" value={bg} onChange={e => setBg(e.target.value)} /></label><label>INK <input aria-label="Ink color" type="color" value={ink} onChange={e => setInk(e.target.value)} /></label></footer>
  </main>;
}
