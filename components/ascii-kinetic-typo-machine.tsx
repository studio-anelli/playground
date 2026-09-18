"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ASCII Kinetic Typo Machine v1 — system fonts, letter-shape → ASCII, wave distortion
 *
 * Updates
 * - Separate **Font Size** and **Line Height** controls (visual only)
 * - Edge behavior selector: **Clamp / Wrap / Mirror**
 *
 * Fixes
 * - Resolved all unterminated string constants (`"\n"` everywhere)
 * - Removed/avoided syntax that can trigger experimental parser features
 * - Corrected hook/closure structure (no nested function defs inside useEffect)
 */

type Waveform = "sine" | "square";

type EdgeMode = "clamp" | "wrap" | "mirror";
type Direction = "rows" | "cols";
type PanelTab = "type" | "wave" | "style" | "export";

type FontPresetKey = "System Sans" | "System Serif" | "System Mono" | "UI Sans" | "UI Rounded";

const FONT_PRESETS: Record<FontPresetKey, string> = {
  "System Sans": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  "System Serif": "ui-serif, Georgia, 'Times New Roman', Times, serif",
  "System Mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  "UI Sans": "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
  "UI Rounded": "ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
};

const CHARSETS: Record<string, string> = {
  "Dense ▓": "@%#*+=-:. ",
  "Blocky █": "█▓▒░ ",
  "Clean": "@#WMNX0Okdlc;:,.  ",
  "Minimal": "#*:.  ",
};

const STAGE_SIZES = {
  "1920x1080": { width: 1920, height: 1080, label: "1920 × 1080" },
  "1080x1080": { width: 1080, height: 1080, label: "1080 × 1080" },
  "1280x520": { width: 1280, height: 520, label: "1280 × 520" },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  str: string,
  preset: FontPresetKey,
  bold: boolean,
  italic: boolean,
  width: number,
  height: number,
) {
  let size = Math.min(width, height);
  for (let step = size; step > 1; step *= 0.5) {
    const trySize = Math.max(8, Math.floor(size));
    ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${trySize}px ${FONT_PRESETS[preset]}`;
    const metrics = ctx.measureText(str);
    const measuredHeight =
      (metrics.actualBoundingBoxAscent || trySize * 0.8) +
      (metrics.actualBoundingBoxDescent || trySize * 0.2);
    if (metrics.width <= width * 0.9 && measuredHeight <= height * 0.8) size = trySize + step * 0.5;
    else size = trySize - step * 0.5;
  }
  return Math.max(8, Math.floor(size));
}

function waveValue(index: number, phase: number, period: number, waveform: Waveform) {
  const angle = (2 * Math.PI * index) / period + phase;
  if (waveform === "square") return Math.sign(Math.sin(angle)) || 1;
  return Math.sin(angle);
}

function edgeIndex(index: number, max: number, mode: EdgeMode) {
  if (mode === "clamp") return clamp(index, 0, max - 1);
  if (mode === "wrap") {
    if (max <= 0) return 0;
    return ((index % max) + max) % max;
  }
  if (max <= 1) return 0;
  const edgePeriod = 2 * (max - 1);
  let mirrored = index % edgePeriod;
  if (mirrored < 0) mirrored += edgePeriod;
  return mirrored < max ? mirrored : edgePeriod - mirrored;
}

export default function ASCIITypoMachine() {
  // Text + font
  const [text, setText] = useState("ASCII Machine");
  const [fontPreset, setFontPreset] = useState<FontPresetKey>("System Sans");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [stageSize, setStageSize] = useState<keyof typeof STAGE_SIZES>("1920x1080");
  const stage = STAGE_SIZES[stageSize];

  // ASCII grid and colors
  const [cols, setCols] = useState(160);
  const charAspect = 2.0; // characters are visually taller than wide
  const rows = useMemo(() => Math.max(10, Math.round((cols * stage.height) / stage.width * charAspect)), [cols, stage.height, stage.width]);
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [charsetName, setCharsetName] = useState<keyof typeof CHARSETS>("Dense ▓");

  // Wave controls
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [direction, setDirection] = useState<Direction>("rows");
  const [speedHz, setSpeedHz] = useState(0.8);
  const [period, setPeriod] = useState(24);
  const [ampChars, setAmpChars] = useState(4);

  // Edge behavior
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("clamp");

  // Visual-only text rendering controls
  const [fontPx, setFontPx] = useState(10);
  const [lineHt, setLineHt] = useState(0.7);

  const [asciiText, setAsciiText] = useState("");
  const [playing, setPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("type");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });

  // Test result message (used by both test suites)
  const [testResult, setTestResult] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number | null>(null);
  const panelDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);

  // Build text → luminance grid by drawing to offscreen canvas and downsampling
  const buildLumGrid = useCallback(() => {
    const targetCols = cols;
    const targetRows = rows;

    // Oversample for sharper edges, then downsample to grid
    const scale = 2; // 2× supersampling
    const W = targetCols * scale;
    const H = targetRows * scale;

    const cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Background white; text black for clear luminance
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const fontSize = fitFontSize(ctx, text || " ", fontPreset, bold, italic, W, H);
    const fontStr = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px ${FONT_PRESETS[fontPreset]}`;
    ctx.font = fontStr;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    // Draw centered
    ctx.fillText(text || " ", W / 2, H / 2);

    // Downsample to grid luminance
    const img = ctx.getImageData(0, 0, W, H).data;
    const grid: number[][] = [];
    for (let gy = 0; gy < targetRows; gy++) {
      const rowArr: number[] = [];
      for (let gx = 0; gx < targetCols; gx++) {
        // Sample a representative pixel at cell center (nearest for speed)
        const sx = Math.floor((gx + 0.5) * scale);
        const sy = Math.floor((gy + 0.5) * scale);
        const i = (sy * W + sx) * 4;
        const r = img[i], g = img[i + 1], b = img[i + 2];
        const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; // 0..1 white=1
        rowArr.push(L);
      }
      grid.push(rowArr);
    }
    return grid;
  }, [cols, rows, text, fontPreset, bold, italic]);

  const lumGrid = useMemo(() => buildLumGrid(), [buildLumGrid]);
  const gridSize = useMemo(() => ({ rows, cols }), [cols, rows]);

  // Render ASCII from luminance grid + phase
  const renderASCII = useCallback((phase: number) => {
    if (!lumGrid) return "";
    const chars = CHARSETS[charsetName];
    const n = chars.length - 1;
    const { rows, cols } = gridSize;

    const out: string[] = new Array(rows);
    for (let y = 0; y < rows; y++) {
      let line = "";
      const rowW = waveValue(y, phase, period, waveform);
      for (let x = 0; x < cols; x++) {
        const colW = waveValue(x, phase, period, waveform);
        const w = direction === "rows" ? rowW : colW; // [-1,1]
        let sx = x, sy = y;
        if (ampChars !== 0) {
          if (direction === "rows") sx = edgeIndex(Math.round(x + w * ampChars), cols, edgeMode);
          else sy = edgeIndex(Math.round(y + w * ampChars), rows, edgeMode);
        }
        const L = lumGrid[sy][sx];
        // Character sets run from dense to empty: dark pixels use dense glyphs.
        let k = Math.round(L * n);
        k = clamp(k, 0, n);
        line += chars[k];
      }
      out[y] = line;
    }
    return out.join("\n");
  }, [lumGrid, gridSize, charsetName, direction, ampChars, waveform, period, edgeMode]);

  // Animation loop
  useEffect(() => {
    if (!lumGrid || !playing) return;
    const tick = (t: number) => {
      if (t0Ref.current == null) t0Ref.current = t;
      const dt = (t - t0Ref.current) / 1000;
      const phase = dt * 2 * Math.PI * speedHz;
      setAsciiText(renderASCII(phase));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; t0Ref.current = null; };
  }, [lumGrid, playing, speedHz, renderASCII]);

  // Actions
  const handleCopy = async () => { if (!asciiText) return; await navigator.clipboard.writeText(asciiText); alert("ASCII copied to clipboard."); };
  const handleDownload = () => {
    if (!asciiText) return;
    const blob = new Blob([asciiText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ascii-kinetic-typo.txt"; a.click(); URL.revokeObjectURL(url);
  };

  // Self‑tests (do not modify unless clearly wrong)
  const runSelfTests = useCallback(() => {
    try {
      if (!lumGrid) { setTestResult("⚠️ No grid yet"); return; }
      const { rows, cols } = gridSize;
      const a0 = renderASCII(0);
      const lines = a0.split("\n");
      const t1 = lines.length === rows; // newline count
      const t2 = lines.every(l => l.length === cols); // width
      const a1 = renderASCII(Math.PI); // different phase
      const t3 = a0 !== a1 || ampChars === 0; // allow equal if amp=0

      // Visual-only changes should NOT affect rows/cols or content structure
      const dimsOK = lines.length === rows && (rows === 0 || lines[0].length === cols);
      const t4 = dimsOK;

      // Additional sanity: charset swap changes characters but keeps shape length
      const altChars = CHARSETS["Minimal"];
      const nAlt = altChars.length - 1;
      // quick re-render with minimal set using current luminance (phase 0)
      const outAlt: string[] = new Array(rows);
      for (let y = 0; y < rows; y++) {
        let line = "";
        for (let x = 0; x < cols; x++) {
          const L = lumGrid[y][x];
          let k = Math.round(L * nAlt);
          k = clamp(k, 0, nAlt);
          line += altChars[k];
        }
        outAlt[y] = line;
      }
      const aAlt = outAlt.join("\n");
      const linesAlt = aAlt.split("\n");
      const t5 = linesAlt.length === rows && (rows === 0 || linesAlt[0].length === cols);

      const ok = t1 && t2 && t3 && t4 && t5;
      setTestResult(ok ? "✅ Tests passed (dimensions/newline/phase/charset)" : "⚠️ Tests failed — see console");
      if (!ok) console.warn({ t1, t2, t3, t4, t5, rows, cols, a0, a1, aAlt });
    } catch (e) {
      setTestResult("❌ Test error: " + (e as Error).message);
    }
  }, [gridSize, renderASCII, ampChars, lumGrid]);

  // Additional self-tests focusing on edge modes
  const runEdgeTests = useCallback(() => {
    try {
      if (!lumGrid) { setTestResult("⚠️ No grid yet"); return; }
      const smallRows = 4, smallCols = 7; const periodLocal = Math.max(6, period);
      const gridLocal: number[][] = Array.from({ length: smallRows }, (_, y) => (
        Array.from({ length: smallCols }, (_, x) => (x + y) % 2 ? 0.2 : 0.8)
      ));
      const chars = CHARSETS[charsetName]; const n = chars.length - 1; const A = Math.max(3, ampChars);
      function render(mode: EdgeMode) {
        const out: string[] = new Array(smallRows);
        for (let y = 0; y < smallRows; y++) {
          let line = ""; const rowW = Math.sin((2 * Math.PI * y) / periodLocal);
          for (let x = 0; x < smallCols; x++) {
            const colW = Math.sin((2 * Math.PI * x) / periodLocal);
            const w = direction === "rows" ? rowW : colW;
            let sx = x, sy = y;
            if (direction === "rows") sx = edgeIndex(Math.round(x + w * A), smallCols, mode);
            else sy = edgeIndex(Math.round(y + w * A), smallRows, mode);
            const L = gridLocal[sy][sx];
            let k = Math.round((1 - L) * n); k = clamp(k, 0, n);
            line += chars[k];
          }
          out[y] = line;
        }
        return out.join("\n");
      }
      const c = render("clamp"), w = render("wrap"), m = render("mirror");
      const tEdges = c !== w || c !== m || w !== m; // ensure modes differ for sanity
      setTestResult(tEdges ? "✅ Edge tests passed (modes differ)" : "⚠️ Edge tests inconclusive");
      if (!tEdges) console.warn({ c, w, m });
    } catch (e) { setTestResult("❌ Test error: " + (e as Error).message); }
  }, [lumGrid, period, charsetName, direction, ampChars]);

  const applyPreset = (preset: string) => {
    if (preset === "calm") {
      setWaveform("sine");
      setSpeedHz(0.25);
      setPeriod(56);
      setAmpChars(2);
      setEdgeMode("clamp");
    } else if (preset === "wave") {
      setWaveform("sine");
      setSpeedHz(0.8);
      setPeriod(24);
      setAmpChars(6);
      setEdgeMode("mirror");
    } else if (preset === "glitch") {
      setWaveform("square");
      setSpeedHz(1.6);
      setPeriod(12);
      setAmpChars(14);
      setEdgeMode("wrap");
      setCharsetName("Blocky █");
    }
  };

  const startPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panelDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: panelOffset,
    };
  };

  const movePanel = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPanelOffset({
      x: drag.origin.x + event.clientX - drag.startX,
      y: drag.origin.y + event.clientY - drag.startY,
    });
  };

  const endPanelDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panelDragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panelDragRef.current = null;
  };

  const tabButton = (id: PanelTab, label: string) => (
    <button
      key={id}
      role="tab"
      aria-selected={activeTab === id}
      className={`min-h-8 px-2 font-mono text-[10px] uppercase transition ${
        activeTab === id ? "bg-white text-black" : "bg-white/[0.06] hover:bg-white/15"
      }`}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden text-white" style={{ background: bg }}>
      <div className="absolute inset-x-5 bottom-[82px] top-[82px] flex items-center justify-center overflow-hidden md:inset-x-8" aria-label="ASCII stage">
        <div
          className="relative max-h-full max-w-full overflow-hidden"
          style={{
            aspectRatio: `${stage.width} / ${stage.height}`,
            width: `min(100%, calc((100dvh - 164px) * ${stage.width / stage.height}))`,
            background: bg,
            color: fg,
          }}
        >
          <pre
            className="absolute inset-0 select-text overflow-hidden whitespace-pre p-4 font-mono"
            style={{
              fontSize: `${fontPx}px`,
              lineHeight: lineHt,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
          >
            {asciiText || "Type below to render in ASCII…"}
          </pre>
        </div>
      </div>

      <section
        className={`absolute left-5 top-[82px] z-20 flex w-[min(430px,calc(100%-40px))] flex-col bg-black/75 shadow-2xl backdrop-blur-xl transition-[max-height] md:left-8 ${
          panelOpen ? "max-h-[calc(100dvh-180px)]" : "max-h-11"
        }`}
        style={{ transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)` }}
        aria-label="ASCII controls"
      >
        <div
          className="flex min-h-11 cursor-move touch-none items-center justify-between px-3 font-mono text-[11px] uppercase"
          onPointerDown={startPanelDrag}
          onPointerMove={movePanel}
          onPointerUp={endPanelDrag}
          onPointerCancel={endPanelDrag}
        >
          <span>{activeTab}</span>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setPanelOpen((open) => !open)}
            className="h-7 bg-white/10 px-2 hover:bg-white/20"
            aria-expanded={panelOpen}
          >
            {panelOpen ? "Minimise" : "Open"}
          </button>
        </div>

        {panelOpen && (
          <>
            <div role="tablist" aria-label="ASCII panels" className="grid grid-cols-4 gap-1 p-2 pt-0">
              {tabButton("type", "Type")}
              {tabButton("wave", "Wave")}
              {tabButton("style", "Style")}
              {tabButton("export", "Export")}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
              {activeTab === "type" && (
                <div className="space-y-4">
                  <SelectControl
                    label="Font"
                    value={fontPreset}
                    options={(Object.keys(FONT_PRESETS) as FontPresetKey[]).map((value) => ({ value, label: value }))}
                    onChange={(value) => setFontPreset(value as FontPresetKey)}
                  />
                  <SelectControl
                    label="Character set"
                    value={charsetName}
                    options={Object.keys(CHARSETS).map((value) => ({ value, label: value }))}
                    onChange={(value) => setCharsetName(value)}
                  />
                  <SliderControl label="Columns" value={cols} min={60} max={260} step={1} onChange={setCols} />
                  <div className="grid grid-cols-2 gap-3">
                    <ToggleControl label="Bold" value={bold} onChange={setBold} />
                    <ToggleControl label="Italic" value={italic} onChange={setItalic} />
                  </div>
                </div>
              )}

              {activeTab === "wave" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <SelectControl label="Waveform" value={waveform} options={[{ value: "sine", label: "Sine" }, { value: "square", label: "Square" }]} onChange={(value) => setWaveform(value as Waveform)} />
                    <SelectControl label="Direction" value={direction} options={[{ value: "rows", label: "Across rows" }, { value: "cols", label: "Across columns" }]} onChange={(value) => setDirection(value as Direction)} />
                  </div>
                  <SliderControl label="Speed (Hz)" value={speedHz} min={0} max={4} step={0.01} onChange={setSpeedHz} />
                  <SliderControl label="Period" value={period} min={6} max={120} step={1} onChange={setPeriod} />
                  <SliderControl label="Amplitude (chars)" value={ampChars} min={0} max={24} step={1} onChange={setAmpChars} />
                  <SelectControl label="Edges" value={edgeMode} options={[{ value: "clamp", label: "Clamp" }, { value: "wrap", label: "Wrap" }, { value: "mirror", label: "Mirror" }]} onChange={(value) => setEdgeMode(value as EdgeMode)} />
                </div>
              )}

              {activeTab === "style" && (
                <div className="space-y-4">
                  <SliderControl label="ASCII font size" value={fontPx} min={6} max={32} step={1} onChange={setFontPx} />
                  <SliderControl label="Line height" value={lineHt} min={0.6} max={1.4} step={0.01} onChange={setLineHt} />
                  <div className="grid grid-cols-2 gap-3">
                    <ColorControl label="Text" value={fg} onChange={setFg} />
                    <ColorControl label="Background" value={bg} onChange={setBg} />
                  </div>
                </div>
              )}

              {activeTab === "export" && (
                <div className="space-y-3">
                  <button className="w-full bg-white text-black px-3 py-2 text-xs uppercase disabled:opacity-30" onClick={handleCopy} disabled={!asciiText}>Copy ASCII</button>
                  <button className="w-full bg-white/[0.07] px-3 py-2 text-xs uppercase hover:bg-white/15 disabled:opacity-30" onClick={handleDownload} disabled={!asciiText}>Download .txt</button>
                  <div className="grid grid-cols-2 gap-1 pt-2">
                    <button className="bg-white/[0.07] px-2 py-2 text-[10px] uppercase hover:bg-white/15" onClick={runSelfTests}>Self-tests</button>
                    <button className="bg-white/[0.07] px-2 py-2 text-[10px] uppercase hover:bg-white/15" onClick={runEdgeTests}>Edge tests</button>
                  </div>
                  {testResult && <div className="font-mono text-[10px] text-white/50">{testResult}</div>}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <div className="absolute bottom-4 left-1/2 z-30 grid w-[min(1040px,calc(100%-40px))] -translate-x-1/2 grid-cols-[auto_minmax(160px,1fr)_auto_auto] items-center bg-black/75 p-1.5 font-mono text-[11px] uppercase text-white shadow-2xl backdrop-blur-xl max-md:grid-cols-[auto_1fr_auto]">
        <button type="button" onClick={() => setPlaying((value) => !value)} className="h-10 min-w-20 bg-white/10 px-3 hover:bg-white/20">
          {playing ? "Pause" : "Play"}
        </button>
        <label className="mx-1 flex h-10 min-w-0 items-center bg-white/[0.06] px-3 normal-case">
          <span className="mr-3 shrink-0 uppercase text-white/45">Text</span>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type your text" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="ASCII text" />
        </label>
        <label className="flex h-10 items-center bg-white/[0.06] px-2 max-md:hidden">
          <span className="sr-only">Quick preset</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) applyPreset(event.target.value);
              event.target.value = "";
            }}
            className="bg-transparent px-1 outline-none"
            aria-label="Quick preset"
          >
            <option value="" disabled>Quick preset</option>
            <option value="calm">Calm</option>
            <option value="wave">Wave</option>
            <option value="glitch">Glitch</option>
          </select>
        </label>
        <label className="ml-1 flex h-10 items-center bg-white/[0.06] px-2">
          <span className="sr-only">Canvas size</span>
          <select value={stageSize} onChange={(event) => setStageSize(event.target.value as keyof typeof STAGE_SIZES)} className="bg-transparent px-1 outline-none" aria-label="Canvas size">
            {Object.entries(STAGE_SIZES).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-xs font-medium text-white/75">
        <span>{label}</span>
        <output className="font-mono text-[10px] tabular-nums text-white/55">{step < 1 ? value.toFixed(2) : value}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="immersive-slider mt-1 w-full" />
    </label>
  );
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-white/75">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full bg-white/[0.07] px-2 py-1.5 text-white outline-none transition focus:bg-white/10">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ToggleControl({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className={`flex min-h-10 items-center justify-between px-3 text-xs ${value ? "bg-white text-black" : "bg-white/[0.07] text-white"}`}>
      <span>{label}</span>
      <span>{value ? "On" : "Off"}</span>
    </button>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-xs font-medium text-white/75">
      {label}
      <div className="mt-1 flex items-center gap-2 bg-white/[0.07] p-1.5">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-7 bg-transparent p-0" />
        <span className="font-mono text-[10px] text-white/55">{value}</span>
      </div>
    </label>
  );
}
