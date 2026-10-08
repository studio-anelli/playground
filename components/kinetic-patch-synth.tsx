"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
type Shape = "sine" | "triangle" | "square" | "noise";
type Wave = { on: boolean; shape: Shape; rate: number; amp: number };
const specs = [
  ["step", "Step", 3, 40, 1, "sampling"], ["jitter", "Jitter", 0, 35, .1, "sampling"],
  ["gridSize", "Size", 12, 160, 1, "grid"], ["strength", "Strength", 0, 100, 1, "grid"],
  ["gridMix", "Mix", 0, 1, .01, "grid"], ["legibility", "Legibility", 0, 1, .01, "grid"],
  ["vertexSize", "Size", 1, 24, .1, "vertex"], ["vertexMix", "Mix", 0, 1, .01, "vertex"],
  ["fontSize", "Size", 40, 420, 1, "typography"], ["weight", "Weight", 100, 900, 10, "typography"],
] as const;
type Target = typeof specs[number][0];
type Patch = { id: string; wave: number; target: Target; amount: number };
type XY = { x: number; y: number };
const initial: Record<Target, number> = { step: 8, jitter: 0, gridSize: 56, strength: 32, gridMix: .7, legibility: .3, vertexSize: 3, vertexMix: .7, fontSize: 240, weight: 800 };
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
  const [waves, setWaves] = useState<Wave[]>([{ on: true, shape: "sine", rate: .25, amp: .7 }, { on: true, shape: "triangle", rate: .12, amp: .5 }, { on: true, shape: "noise", rate: .7, amp: .4 }]);
  const [values, setValues] = useState(initial);
  const [modes, setModes] = useState({ sampling: true, grid: true, vertex: true });
  const [patches, setPatches] = useState<Patch[]>([{ id: "initial", wave: 0, target: "strength", amount: 45 }]);
  const [text, setText] = useState("KINETIC"), [font, setFont] = useState("system-ui, sans-serif"), [vertex, setVertex] = useState("line");
  const [selected, setSelected] = useState<number | null>(null), [drag, setDrag] = useState<(XY & { wave: number }) | null>(null);
  const [positions, setPositions] = useState<Record<string, XY>>({});
  const [paused, setPaused] = useState(false), [bg, setBg] = useState("#d7d8d2"), [ink, setInk] = useState("#202422");
  const canvas = useRef<HTMLCanvasElement>(null), panel = useRef<HTMLDivElement>(null), scope = useRef<HTMLCanvasElement>(null);
  const sockets = useRef<Record<string, HTMLButtonElement | null>>({});
  const live = useRef({ waves, values, modes, patches, text, font, vertex, paused, bg, ink });
  useEffect(() => { live.current = { waves, values, modes, patches, text, font, vertex, paused, bg, ink }; }, [waves, values, modes, patches, text, font, vertex, paused, bg, ink]);
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
    let raf = 0, previous = 0, time = 0, cacheKey = "", sampleKey = "", lastRebuild = -100;
    const phases = [0, .25, .5], source = document.createElement("canvas"), sctx = source.getContext("2d", { willReadFrequently: true })!;
    let points: XY[] = [], pixels: Uint8ClampedArray | null = null;
    const frame = (now: number) => {
      const s = live.current, dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
      if (!s.paused) { time += dt; s.waves.forEach((w, i) => { if (w.on) phases[i] += dt * w.rate; }); }
      const el = canvas.current, ctx = el?.getContext("2d");
      if (el && ctx) {
        const rect = el.getBoundingClientRect(), W = Math.max(64, Math.round(rect.width)), H = Math.max(64, Math.round(rect.height)), dpr = Math.min(2, window.devicePixelRatio || 1);
        if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const signals = s.waves.map((w, i) => w.on ? waveValue(w.shape, phases[i], i + 1) * w.amp : 0), mod = { ...s.values };
        for (const [key, , min, max] of specs) {
          const sum = s.patches.filter(p => p.target === key).reduce((v, p) => v + signals[p.wave] * p.amount / 100, 0);
          mod[key] = clamp(s.values[key] + sum * (max - min) / 2, min, max);
        }
        const size = Math.round(mod.fontSize), weight = Math.round(mod.weight / 10) * 10, step = Math.round(mod.step);
        const key = `${W}|${H}|${s.text}|${s.font}|${size}|${weight}|${s.ink}`;
        // Cap expensive glyph rasterisation at 20fps; wave evaluation and drawing remain at display rate.
        if (key !== cacheKey && (now - lastRebuild >= 50 || !cacheKey)) {
          source.width = W; source.height = H; sctx.fillStyle = s.ink; sctx.textAlign = "center"; sctx.textBaseline = "middle";
          const lines = s.text.split("\n"); let fitted = Math.min(size, H * .75 / Math.max(1, lines.length));
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          const widest = Math.max(1, ...lines.map(line => sctx.measureText(line).width)); fitted *= Math.min(1, (W - 48) / widest);
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          lines.forEach((line, i) => sctx.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fitted * 1.1));
          pixels = sctx.getImageData(0, 0, W, H).data; cacheKey = key; lastRebuild = now;
        }
        if (pixels && sampleKey !== `${cacheKey}|${step}`) {
          points = []; for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (pixels[(y * W + x) * 4 + 3] > 100) points.push({ x, y });
          sampleKey = `${cacheKey}|${step}`;
        }
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = s.ink; ctx.strokeStyle = s.ink;
        const warp = (x: number, y: number): [number, number] => {
          if (!s.modes.grid) return [x, y];
          const strength = mod.strength * mod.gridMix * (1 - mod.legibility);
          return [x + Math.sin(y / mod.gridSize + time) * strength, y + Math.cos(x / mod.gridSize + time * .8) * strength * .6];
        };
        if (!s.modes.sampling && !s.modes.vertex) {
          if (!s.modes.grid) ctx.drawImage(source, 0, 0);
          else { const cell = Math.round(mod.gridSize); for (let y = 0; y < H; y += cell) for (let x = 0; x < W; x += cell) { const [px, py] = warp(x, y); const width = Math.min(cell, W - x), height = Math.min(cell, H - y); ctx.drawImage(source, x, y, width, height, px, py, width + 1, height + 1); } }
        } else {
          points.forEach((p, i) => {
            const [px, py] = warp(p.x, p.y), j = s.modes.sampling ? mod.jitter : 0, x = px + Math.sin(i * 73.17) * j, y = py + Math.cos(i * 37.71) * j;
            const mix = s.modes.vertex ? mod.vertexMix : 0, r = 1.3 * (1 - mix) + mod.vertexSize * mix;
            ctx.beginPath();
            if (s.modes.vertex && s.vertex === "square") ctx.fillRect(x - r / 2, y - r / 2, r, r);
            else if (s.modes.vertex && s.vertex === "line") { ctx.lineWidth = Math.max(1, r / 3); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.stroke(); }
            else { ctx.arc(x, y, Math.max(.5, r / 2), 0, Math.PI * 2); ctx.fill(); }
          });
        }
        const sc = scope.current, scctx = sc?.getContext("2d");
        if (sc && scctx) { scctx.clearRect(0, 0, sc.width, sc.height); s.waves.forEach((w, i) => { scctx.strokeStyle = colors[i]; scctx.globalAlpha = w.on ? 1 : .2; scctx.beginPath(); for (let x = 0; x <= sc.width; x++) { const y = sc.height / 2 - waveValue(w.shape, phases[i] + x / sc.width * 2, i + 1) * w.amp * sc.height * .38; if (!x) scctx.moveTo(x, y); else scctx.lineTo(x, y); } scctx.stroke(); }); scctx.globalAlpha = 1; }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, []);
  const changeWave = (i: number, change: Partial<Wave>) => setWaves(all => all.map((w, n) => n === i ? { ...w, ...change } : w));
  const connect = (wave: number, target: Target) => { setPatches(all => all.some(p => p.wave === wave && p.target === target) ? all : [...all, { id: `${wave}-${target}`, wave, target, amount: 50 }]); setSelected(null); setDrag(null); };
  const finishDrag = (e: PointerEvent) => { if (!drag) return; const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-target]"); if (hit?.dataset.target) connect(drag.wave, hit.dataset.target as Target); else setDrag(null); };
  const cable = (a: XY, b: XY) => `M ${a.x} ${a.y} C ${a.x + 70} ${a.y}, ${b.x - 70} ${b.y}, ${b.x} ${b.y}`;
  return <main className="kp" style={{ "--kp-bg": bg } as CSSProperties}>
    <header className="kp-header"><a href="/experiments/kinetic-type-synth">← ORIGINAL</a><h1>K‑NET‑C <span>/ PATCH</span></h1><button onClick={() => setPaused(v => !v)}>{paused ? "▶ RUN" : "Ⅱ HOLD"}</button></header>
    <section className="kp-stage"><canvas ref={canvas} aria-label="Animated kinetic typography" /><span className="kp-caption">VISUAL SYNTHESIZER · THREE WAVE ENGINE</span></section>
    <div ref={panel} className="kp-rack" onPointerMove={e => { if (drag && panel.current) { const r = panel.current.getBoundingClientRect(); setDrag({ ...drag, x: e.clientX - r.left, y: e.clientY - r.top }); } }} onPointerUp={finishDrag} onPointerCancel={() => setDrag(null)}>
      <svg className="kp-cables" aria-hidden="true">{patches.map(p => { const a = positions[`wave${p.wave}`], b = positions[p.target]; return a && b ? <path key={p.id} d={cable(a, b)} stroke={colors[p.wave]} /> : null; })}{drag && positions[`wave${drag.wave}`] && <path d={cable(positions[`wave${drag.wave}`], drag)} stroke={colors[drag.wave]} strokeDasharray="4 4" />}</svg>
      <section className="kp-waves"><div className="kp-title">01 / WAVE MODULATORS</div><canvas ref={scope} width={280} height={42} className="kp-scope" aria-label="Three wave monitor" />
        {waves.map((w, i) => <div key={i} className="kp-wave" style={{ "--wave": colors[i] } as CSSProperties}><div className="kp-wavehead"><b>WAVE {i + 1}</b><button aria-pressed={w.on} onClick={() => changeWave(i, { on: !w.on })}>{w.on ? "ON" : "OFF"}</button><button className={`kp-socket ${selected === i ? "selected" : ""}`} aria-label={`Patch output wave ${i + 1}`} ref={el => { sockets.current[`wave${i}`] = el; }} onClick={() => setSelected(selected === i ? null : i)} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); setDrag({ wave: i, x: e.clientX - r.left, y: e.clientY - r.top }); }} /></div>
          <div className="kp-shapes">{(["sine", "triangle", "square", "noise"] as Shape[]).map((s, n) => <button key={s} aria-label={`Wave ${i + 1} ${s}`} aria-pressed={w.shape === s} onClick={() => changeWave(i, { shape: s })}>{["∿", "△", "⊓", "⁙"][n]}</button>)}</div>
          <label>RATE <output>{w.rate.toFixed(2)} Hz</output><input aria-label={`Wave ${i + 1} rate`} type="range" min=".02" max="3" step=".01" value={w.rate} onChange={e => changeWave(i, { rate: +e.target.value })} /></label><label>AMP <output>{Math.round(w.amp * 100)}%</output><input aria-label={`Wave ${i + 1} amplitude`} type="range" min="0" max="1" step=".01" value={w.amp} onChange={e => changeWave(i, { amp: +e.target.value })} /></label>
        </div>)}
      </section>
      <section className="kp-modules"><div className="kp-title">02 / VISUAL OSCILLATORS</div><div className="kp-modulegrid">{(Object.keys(groups) as (keyof typeof groups)[]).map(group => <section className="kp-module" key={group}><div className="kp-modulehead"><h2>{groups[group]}</h2>{group !== "typography" && <button aria-pressed={modes[group]} onClick={() => setModes(m => ({ ...m, [group]: !m[group] }))}>{modes[group] ? "ON" : "OFF"}</button>}</div>
        {group === "vertex" && <select aria-label="Vertex shape" value={vertex} onChange={e => setVertex(e.target.value)}><option value="line">LINE</option><option value="dot">DOT</option><option value="square">SQUARE</option></select>}{group === "typography" && <select aria-label="System font" value={font} onChange={e => setFont(e.target.value)}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option></select>}
        {specs.filter(c => c[5] === group).map(([key, label, min, max, step]) => <div className="kp-control" key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input ${group} ${label}`} onClick={() => { if (selected !== null) connect(selected, key); }} /><label>{label}<output>{values[key].toFixed(step < 1 ? 1 : 0)}</output><input aria-label={`${group} ${label}`} type="range" min={min} max={max} step={step} value={values[key]} onChange={e => setValues(v => ({ ...v, [key]: +e.target.value }))} /></label></div>)}
      </section>)}</div></section>
      <section className="kp-patches"><div className="kp-title">03 / PATCH BAY <button onClick={() => { setPatches([]); setSelected(null); }}>CLEAR</button></div><p>{selected === null ? "Drag an output to an input. Or click both sockets." : `WAVE ${selected + 1} selected · choose an input`}</p>{patches.length === 0 && <p>No cables connected.</p>}{patches.map(p => { const c = specs.find(c => c[0] === p.target)!; return <div className="kp-patch" key={p.id} style={{ "--wave": colors[p.wave] } as CSSProperties}><b>W{p.wave + 1} → {c[5]} / {c[1]}</b><button aria-label={`Remove wave ${p.wave + 1} to ${c[5]} ${c[1]}`} onClick={() => setPatches(all => all.filter(item => item.id !== p.id))}>×</button><label>AMOUNT <output>{p.amount > 0 ? "+" : ""}{p.amount}%</output><input aria-label={`Amount wave ${p.wave + 1} to ${c[5]} ${c[1]}`} type="range" min="-100" max="100" value={p.amount} onChange={e => setPatches(all => all.map(item => item.id === p.id ? { ...item, amount: +e.target.value } : item))} /></label></div>; })}</section>
    </div>
    <footer className="kp-footer"><label>TEXT <textarea aria-label="Text" value={text} onChange={e => setText(e.target.value)} rows={1} /></label><label>PAPER <input aria-label="Paper color" type="color" value={bg} onChange={e => setBg(e.target.value)} /></label><label>INK <input aria-label="Ink color" type="color" value={ink} onChange={e => setInk(e.target.value)} /></label></footer>
  </main>;
}
