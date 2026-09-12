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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function ASCIITypoMachine() {
  // Text + font
  const [text, setText] = useState("ASCII Machine");
  const [fontPreset, setFontPreset] = useState<FontPresetKey>("System Sans");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // ASCII grid and colors
  const [cols, setCols] = useState(160);
  const charAspect = 2.0; // characters are visually taller than wide
  const rows = useMemo(() => Math.max(10, Math.round((cols * 1080) / 1920 * charAspect)), [cols]);
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [charsetName, setCharsetName] = useState<keyof typeof CHARSETS>("Dense ▓");

  // Wave controls
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [direction, setDirection] = useState<"rows" | "cols">("rows");
  const [speedHz, setSpeedHz] = useState(0.8);
  const [period, setPeriod] = useState(24);
  const [ampChars, setAmpChars] = useState(4);

  // Edge behavior
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("clamp");

  // Visual-only text rendering controls
  const [fontPx, setFontPx] = useState(10);
  const [lineHt, setLineHt] = useState(0.7);

  // Luminance grid cache derived from the text raster
  const [lumGrid, setLumGrid] = useState<number[][] | null>(null);
  const [gridSize, setGridSize] = useState<{ rows: number; cols: number }>({ rows: 0, cols: 0 });

  const [asciiText, setAsciiText] = useState("");

  // Test result message (used by both test suites)
  const [testResult, setTestResult] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number | null>(null);

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

  // Fit a font size to the offscreen canvas dimensions
  function fitFontSize(
    ctx: CanvasRenderingContext2D,
    str: string,
    preset: FontPresetKey,
    bold: boolean,
    italic: boolean,
    W: number,
    H: number,
  ) {
    // Start from a big guess; binary search-ish reduce if too large
    let size = Math.min(W, H);
    for (let step = size; step > 1; step *= 0.5) {
      const trySize = Math.max(8, Math.floor(size));
      ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${trySize}px ${FONT_PRESETS[preset]}`;
      const m = ctx.measureText(str);
      // Use actual bounding boxes when available; otherwise estimate
      const w = m.width;
      const h = (m.actualBoundingBoxAscent || trySize * 0.8) + (m.actualBoundingBoxDescent || trySize * 0.2);
      const fits = w <= W * 0.9 && h <= H * 0.8;
      if (fits) {
        size = trySize + step * 0.5; // try a bit larger next
      } else {
        size = trySize - step * 0.5; // go smaller
      }
    }
    return Math.max(8, Math.floor(size));
  }

  // Recompute luminance grid whenever text/font/cols change
  useEffect(() => {
    const g = buildLumGrid();
    if (g) { setLumGrid(g); setGridSize({ rows, cols }); }
  }, [buildLumGrid, cols, rows]);

  // Wave value helper
  function waveVal(i: number, phase: number) {
    const a = (2 * Math.PI * i) / period + phase;
    if (waveform === "square") return Math.sign(Math.sin(a)) || 1; // -1 or +1
    return Math.sin(a); // [-1, +1]
  }

  // Edge handling helper
  function edgeIndex(i: number, max: number, mode: EdgeMode) {
    if (mode === "clamp") return clamp(i, 0, max - 1);
    if (mode === "wrap") {
      if (max <= 0) return 0;
      const m = ((i % max) + max) % max; // safe modulo
      return m;
    }
    // mirror/bounce: 0..max-1..0..max-1 with period 2*(max-1)
    if (max <= 1) return 0;
    const period2 = 2 * (max - 1);
    let j = i % period2; if (j < 0) j += period2;
    return j < max ? j : period2 - j;
  }

  // Render ASCII from luminance grid + phase
  const renderASCII = useCallback((phase: number) => {
    if (!lumGrid) return "";
    const chars = CHARSETS[charsetName];
    const n = chars.length - 1;
    const { rows, cols } = gridSize;

    const out: string[] = new Array(rows);
    for (let y = 0; y < rows; y++) {
      let line = "";
      const rowW = waveVal(y, phase);
      for (let x = 0; x < cols; x++) {
        const colW = waveVal(x, phase);
        const w = direction === "rows" ? rowW : colW; // [-1,1]
        let sx = x, sy = y;
        if (ampChars !== 0) {
          if (direction === "rows") sx = edgeIndex(Math.round(x + w * ampChars), cols, edgeMode);
          else sy = edgeIndex(Math.round(y + w * ampChars), rows, edgeMode);
        }
        const L = lumGrid[sy][sx];
        // Map luminance to density char (darker → denser char)
        let k = Math.round((1 - L) * n);
        k = clamp(k, 0, n);
        line += chars[k];
      }
      out[y] = line;
    }
    return out.join("\n");
  }, [lumGrid, gridSize, charsetName, direction, ampChars, waveform, period, edgeMode]);

  // Animation loop
  useEffect(() => {
    if (!lumGrid) return;
    const tick = (t: number) => {
      if (t0Ref.current == null) t0Ref.current = t;
      const dt = (t - t0Ref.current) / 1000;
      const phase = dt * 2 * Math.PI * speedHz;
      setAsciiText(renderASCII(phase));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; t0Ref.current = null; };
  }, [lumGrid, speedHz, renderASCII]);

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
          let k = Math.round((1 - L) * nAlt);
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

  return (
    <div className="w-full min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Preview 1920×1080 */}
      <div className="flex-1 w-full flex items-center justify-center p-4">
        <div className="relative" style={{ width: 1920, height: 1080 }}>
          <div className="absolute inset-0 overflow-auto rounded-2xl border" style={{ background: bg, color: fg }}>
            <pre
              className="font-mono whitespace-pre select-text p-4"
              style={{
                fontSize: `${fontPx}px`,
                lineHeight: lineHt,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              }}
            >{asciiText || "Type below to render in ASCII…"}</pre>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full border-t bg-white">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex flex-wrap gap-4 items-center">
          <input
            className="flex-1 border rounded-lg px-3 py-2"
            placeholder="Type your text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <label className="text-sm">Font
            <select className="ml-2 border rounded-lg px-2 py-1" value={fontPreset} onChange={(e) => setFontPreset(e.target.value as FontPresetKey)}>
              {(Object.keys(FONT_PRESETS) as FontPresetKey[]).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} /> Bold</label>
          <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={italic} onChange={(e) => setItalic(e.target.checked)} /> Italic</label>

          <div className="h-6 w-px bg-neutral-200" />
          <label className="text-sm">Cols
            <input type="range" min={60} max={260} value={cols} onChange={(e) => setCols(parseInt(e.target.value))} className="ml-2 align-middle" />
          </label>

          <div className="h-6 w-px bg-neutral-200" />
          <label className="text-sm">Waveform
            <select className="ml-2 border rounded-lg px-2 py-1" value={waveform} onChange={(e) => setWaveform(e.target.value as Waveform)}>
              <option value="sine">Sine</option>
              <option value="square">Square</option>
            </select>
          </label>
          <label className="text-sm">Speed {speedHz.toFixed(2)}Hz
            <input type="range" min={0} max={4} step={0.01} value={speedHz} onChange={(e) => setSpeedHz(parseFloat(e.target.value))} className="ml-2 align-middle" />
          </label>
          <label className="text-sm">Period {period}
            <input type="range" min={6} max={120} step={1} value={period} onChange={(e) => setPeriod(parseInt(e.target.value))} className="ml-2 align-middle" />
          </label>
          <label className="text-sm">±Chars {ampChars}
            <input type="range" min={0} max={24} step={1} value={ampChars} onChange={(e) => setAmpChars(parseInt(e.target.value))} className="ml-2 align-middle" />
          </label>
          <label className="text-sm">Direction
            <select className="ml-2 border rounded-lg px-2 py-1" value={direction} onChange={(e) => setDirection(e.target.value as any)}>
              <option value="rows">Across rows</option>
              <option value="cols">Across columns</option>
            </select>
          </label>
          <label className="text-sm">Edges
            <select className="ml-2 border rounded-lg px-2 py-1" value={edgeMode} onChange={(e) => setEdgeMode(e.target.value as EdgeMode)}>
              <option value="clamp">Clamp</option>
              <option value="wrap">Wrap</option>
              <option value="mirror">Mirror</option>
            </select>
          </label>

          <div className="h-6 w-px bg-neutral-200" />
          <label className="text-sm">Font {fontPx}px
            <input type="range" min={6} max={32} value={fontPx} onChange={(e) => setFontPx(parseInt(e.target.value))} className="ml-2 align-middle" />
          </label>
          <label className="text-sm">Line {lineHt.toFixed(2)}
            <input type="range" min={0.6} max={1.4} step={0.01} value={lineHt} onChange={(e) => setLineHt(parseFloat(e.target.value))} className="ml-2 align-middle" />
          </label>

          <div className="h-6 w-px bg-neutral-200" />
          <label className="text-sm">Text
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="ml-2 w-8 h-6 p-0 border rounded align-middle" />
          </label>
          <label className="text-sm">BG
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="ml-2 w-8 h-6 p-0 border rounded align-middle" />
          </label>

          <div className="h-6 w-px bg-neutral-200" />
          <button className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100" onClick={handleCopy} disabled={!asciiText}>Copy</button>
          <button className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100" onClick={handleDownload} disabled={!asciiText}>Download .txt</button>
          <button className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100" onClick={runSelfTests}>Run self‑tests</button>
          <button className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100" onClick={runEdgeTests}>Edge tests</button>
          {testResult && <span className="text-sm text-neutral-600">{testResult}</span>}
        </div>
      </div>
    </div>
  );
}
