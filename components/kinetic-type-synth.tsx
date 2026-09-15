"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// Kinetic Type Synth
// Modes:
// 1) Sampling (point cloud sampled from rendered text)
// 2) Grid distortion (grid-driven warp field)
// 3) Generate shapes by vertex (draw dots/squares/lines at each point)
// All modes can be modulated by waves (amp/freq/speed) and blended.
//
// UX:
// - Numeric inputs COMMIT on blur/Enter (so you can type freely).
// - Multi-line + tracking: tracking applied per-line.
// - Wave destinations: wave can affect Sampling / Grid / Shapes.
// - Grid-only: shows ONLY the distorted result (no original underlay).
// - Optional feedback / trails with blend modes.

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const VIBRANT_BACKGROUNDS = [
  "#ff4f2e",
  "#5b5cff",
  "#00a878",
  "#ed2f87",
  "#ffc400",
  "#0077ff",
  "#8e44ff",
  "#00b8d9",
];

const readableInk = (hex: string) => {
  const rgb = hex.replace("#", "").match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.42 ? "#0f0f10" : "#f2f2f2";
};
const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
const fract = (n: number) => n - Math.floor(n);

type Point = { x: number; y: number; a: number };

type Offscreen = { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function useRaf(callback: (t: number) => void, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = (t: number) => {
      cbRef.current(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
}

function makeOffscreen(w: number, h: number): Offscreen {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  return { c, ctx };
}

function drawTextWithTracking(
  ctx: CanvasRenderingContext2D,
  {
    text,
    x,
    y,
    align,
    baseline,
    tracking,
    lineHeight,
  }: {
    text: string;
    x: number;
    y: number;
    align: CanvasTextAlign;
    baseline: "top" | "middle" | "bottom";
    tracking: number;
    lineHeight: number;
  }
) {
  const lines = String(text ?? "").split("\n");

  const lhPx = lineHeight;
  const totalH = lines.length * lhPx;
  let y0 = y;
  if (baseline === "middle") y0 = y - totalH / 2 + lhPx / 2;
  if (baseline === "bottom") y0 = y - totalH + lhPx;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const yy = y0 + li * lhPx;

    if (!tracking) {
      ctx.fillText(line, x, yy);
      continue;
    }

    const chars = Array.from(line);
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalWidth = widths.reduce((s, w) => s + w, 0) + tracking * Math.max(0, chars.length - 1);

    let startX = x;
    if (align === "center") startX = x - totalWidth / 2;
    if (align === "right") startX = x - totalWidth;

    let cursor = 0;
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], startX + cursor, yy);
      cursor += widths[i] + tracking;
    }
  }
}

function fitTextFontSize(
  ctx: CanvasRenderingContext2D,
  {
    text,
    fontFamily,
    fontWeight,
    requestedSize,
    tracking,
    maxWidth,
    maxHeight,
    lineHeightFactor,
  }: {
    text: string;
    fontFamily: string;
    fontWeight: number;
    requestedSize: number;
    tracking: number;
    maxWidth: number;
    maxHeight: number;
    lineHeightFactor: number;
  }
) {
  const lines = String(text ?? "").split("\n");
  const fits = (size: number) => {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const widest = lines.reduce((max, line) => {
      const chars = Array.from(line);
      const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0)
        + tracking * Math.max(0, chars.length - 1);
      return Math.max(max, width);
    }, 0);
    const height = lines.length * size * lineHeightFactor;
    return widest <= maxWidth && height <= maxHeight;
  };

  if (fits(requestedSize)) return requestedSize;

  let low = 4;
  let high = requestedSize;
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

function textToPoints({
  text,
  fontFamily,
  fontWeight,
  fontSize,
  tracking,
  width,
  height,
  align,
  baseline,
  threshold,
  step,
  jitter,
  pad,
  lineHeightFactor,
}: {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  tracking: number;
  width: number;
  height: number;
  align: CanvasTextAlign;
  baseline: "top" | "middle" | "bottom";
  threshold: number;
  step: number;
  jitter: number;
  pad: number;
  lineHeightFactor: number;
}): Point[] {
  const { ctx } = makeOffscreen(width, height);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = align;
  const fittedFontSize = fitTextFontSize(ctx, {
    text,
    fontFamily,
    fontWeight,
    requestedSize: fontSize,
    tracking,
    maxWidth: Math.max(1, width - pad * 2),
    maxHeight: Math.max(1, height - pad * 2),
    lineHeightFactor,
  });
  ctx.font = `${fontWeight} ${fittedFontSize}px ${fontFamily}`;

  const x = align === "left" ? pad : align === "right" ? width - pad : width / 2;
  const y = height / 2;
  const lineHeight = fittedFontSize * lineHeightFactor;

  drawTextWithTracking(ctx, { text, x, y, align, baseline, tracking, lineHeight });

  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;

  const pts: Point[] = [];
  const j = jitter;
  for (let yy = pad; yy < height - pad; yy += step) {
    for (let xx = pad; xx < width - pad; xx += step) {
      const idx = (yy * width + xx) * 4;
      const a = data[idx + 3] / 255;
      if (a >= threshold) {
        const ox = j ? (Math.random() * 2 - 1) * j : 0;
        const oy = j ? (Math.random() * 2 - 1) * j : 0;
        pts.push({ x: xx + ox, y: yy + oy, a });
      }
    }
  }

  const maxA = pts.reduce((m, p) => Math.max(m, p.a), 0.0001);
  for (const p of pts) p.a = p.a / maxA;

  return pts;
}

function waveField({
  x,
  y,
  t,
  amp,
  freq,
  speed,
  shape,
  phase,
  dir,
}: {
  x: number;
  y: number;
  t: number;
  amp: number;
  freq: number;
  speed: number;
  shape: "sine" | "triangle" | "square" | "saw";
  phase: number;
  dir: number;
}) {
  // Cyclic 0..1 phase accumulator so wave motion feels continuous (no "reset").
  const tt = t * speed;

  const phaseX = fract(x * freq + tt + phase);
  const phaseY = fract(y * freq + tt * 0.9 + phase * 0.7);
  const r = Math.hypot(x - 0.5, y - 0.5);
  const phaseR = fract(r * freq * 1.5 + tt + phase);

  const evalShape = (p: number) => {
    if (shape === "sine") return Math.sin(p * Math.PI * 2);
    if (shape === "square") return p < 0.5 ? 1 : -1;
    if (shape === "saw") return p * 2 - 1;
    // triangle: -1 → 0 → 1 → 0 → -1
    return 1 - 4 * Math.abs(p - 0.5);
  };

  const wx = evalShape(phaseX);
  const wy = evalShape(phaseY);
  const wr = evalShape(phaseR);

  const mixXY = lerp(wx, wy, dir);
  const mixed = lerp(mixXY, wr, smoothstep(0.15, 0.85, dir));

  return mixed * amp;
}

function gridVector({
  x,
  y,
  grid,
  strength,
  wave,
}: {
  x: number;
  y: number;
  grid: number;
  strength: number;
  wave: number;
}) {
  const gx = Math.floor(x / grid);
  const gy = Math.floor(y / grid);
  const seed = (gx * 73856093) ^ (gy * 19349663);
  const a = ((seed % 6283) / 1000) + wave * 0.8;
  const vx = Math.cos(a);
  const vy = Math.sin(a);
  const k = 0.7 + Math.abs(wave);
  return { dx: vx * strength * k, dy: vy * strength * k };
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: "dot" | "square" | "line",
  x: number,
  y: number,
  size: number,
  rot: number,
  lineLen: number
) {
  if (shape === "dot") {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, size * 0.5), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (shape === "square") {
    const s = Math.max(1, size);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
    return;
  }
  const L = Math.max(1, lineLen);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-L / 2, 0);
  ctx.lineTo(L / 2, 0);
  ctx.stroke();
  ctx.restore();
}

function useCommitNumber(value: number, onCommit: (v: number) => void) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const next = parseFloat(String(raw).replace(",", "."));
    if (!Number.isFinite(next)) {
      setRaw(String(value));
      return;
    }
    onCommit(next);
  };

  return { raw, setRaw, commit };
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center">
      <div className="col-span-4 text-xs text-neutral-300">{label}</div>
      <div className="col-span-8">{children}</div>
    </div>
  );
}

function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="w-16 text-right tabular-nums text-xs text-neutral-300">{value.toFixed(2)}</div>
    </div>
  );
}

function __assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`SelfTest failed: ${msg}`);
}

function __runSelfTests() {
  const lines = String("A\nB").split("\n");
  __assert(lines.length === 2 && lines[0] === "A" && lines[1] === "B", "newline split should work");

  const preset = "RADIO\nSIGNAL";
  __assert(preset.includes("\n"), "preset should include escaped newline");

  __assert(clamp(5, 0, 3) === 3, "clamp upper bound");
  __assert(clamp(-1, 0, 3) === 0, "clamp lower bound");
  __assert(Math.abs(lerp(0, 10, 0.5) - 5) < 1e-9, "lerp midpoint");

  // Triangle shape sanity: -1 → 0 → 1 → 0 → -1
  const tri = (p: number) => 1 - 4 * Math.abs(p - 0.5);
  __assert(Math.abs(tri(0) - -1) < 1e-9, "triangle at 0 is -1");
  __assert(Math.abs(tri(0.25) - 0) < 1e-9, "triangle at 0.25 is 0");
  __assert(Math.abs(tri(0.5) - 1) < 1e-9, "triangle at 0.5 is 1");
  __assert(Math.abs(tri(0.75) - 0) < 1e-9, "triangle at 0.75 is 0");
}

let __didRunTests = false;

export default function KineticTypeSynth() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const panelDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [cw, setCw] = useState(1280);
  const [ch, setCh] = useState(800);
  const [dpr, setDpr] = useState(1);

  const [text, setText] = useState("KINETIC TYPE");
  const [fontSize, setFontSize] = useState(220);
  const [tracking, setTracking] = useState(6);
  const [fontWeight, setFontWeight] = useState(800);
  const [align, setAlign] = useState<CanvasTextAlign>("center");
  const [baseline, setBaseline] = useState<"top" | "middle" | "bottom">("middle");
  const [pad, setPad] = useState(40);
  const [lineHeightFactor, setLineHeightFactor] = useState(1.12);

  // Sampling
  const [sampleOn, setSampleOn] = useState(true);
  const [sampleStep, setSampleStep] = useState(6);
  const [sampleThreshold, setSampleThreshold] = useState(0.25);
  const [sampleJitter, setSampleJitter] = useState(0.7);
  const [sampleOpacity, setSampleOpacity] = useState(1);

  // Grid distortion
  const [gridOn, setGridOn] = useState(true);
  const [gridSize, setGridSize] = useState(56);
  const [gridStrength, setGridStrength] = useState(22);
  const [distMix, setDistMix] = useState(0.75);

  // Hide near-zero displacement fragments (prevents reading original letter parts).
  const [gridCut, setGridCut] = useState(0.0);

  // Stretch/compress warp (anisotropic per cell)
  const [gridWarp, setGridWarp] = useState(0.6);
  const [gridWarpAxis, setGridWarpAxis] = useState(0.35);

  // Shapes
  const [shapeOn, setShapeOn] = useState(true);
  const [shapeType, setShapeType] = useState<"dot" | "square" | "line">("dot");
  const [shapeSize, setShapeSize] = useState(3);
  const [lineLen, setLineLen] = useState(10);
  const [shapeMix, setShapeMix] = useState(1);

  // Waves
  const [waveShape, setWaveShape] = useState<"sine" | "triangle" | "square" | "saw">("sine");
  const [waveAmp, setWaveAmp] = useState(0.6);
  const [waveFreq, setWaveFreq] = useState(1.4);
  const [waveSpeed, setWaveSpeed] = useState(0.00075);
  const [waveDir, setWaveDir] = useState(0.4);
  const [wavePhase, setWavePhase] = useState(0.0);

  // Wave destinations
  const [waveToSampling, setWaveToSampling] = useState(true);
  const [waveToGrid, setWaveToGrid] = useState(true);
  const [waveToShapes, setWaveToShapes] = useState(true);

  // Legibility
  const [legibility, setLegibility] = useState(0.6);
  const [showGhostText, setShowGhostText] = useState(false);

  // Feedback
  const [feedbackOn, setFeedbackOn] = useState(false);
  const [feedbackAlpha, setFeedbackAlpha] = useState(0.86);
  const [feedbackBlend, setFeedbackBlend] = useState<GlobalCompositeOperation>("source-over");
  const fbRef = useRef<Offscreen | null>(null);
  const textLayerRef = useRef<{ key: string; buf: Offscreen } | null>(null);
  const [clearFeedbackTick, setClearFeedbackTick] = useState(0);

  // Visuals
  const [bg, setBg] = useState("#0f0f10");
  const [ink, setInk] = useState("#f2f2f2");
  const [strokeW, setStrokeW] = useState(1);

  const [tab, setTab] = useState<"modes" | "wave" | "text">("modes");

  const fontFamily = useMemo(
    () =>
      `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
    []
  );

  useEffect(() => {
    if (__didRunTests) return;
    __didRunTests = true;
    // @ts-ignore
    const isDev = typeof process !== "undefined" ? process.env?.NODE_ENV !== "production" : true;
    if (isDev) {
      try {
        __runSelfTests();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }, []);

  // Cached points
  const pointsRef = useRef<Point[]>([]);
  const recomputePoints = () => {
    const pts = textToPoints({
      text,
      fontFamily,
      fontWeight,
      fontSize,
      tracking,
      width: cw,
      height: ch,
      align,
      baseline,
      threshold: sampleThreshold,
      step: sampleStep,
      jitter: sampleJitter,
      pad,
      lineHeightFactor,
    });
    pointsRef.current = pts;
  };

  useEffect(() => {
    setDpr(Math.max(1, Math.min(2, window.devicePixelRatio || 1)));

    const previous = window.sessionStorage.getItem("playground-vibrant-background");
    const choices = VIBRANT_BACKGROUNDS.filter((color) => color !== previous);
    const next = choices[Math.floor(Math.random() * choices.length)] ?? VIBRANT_BACKGROUNDS[0];
    window.sessionStorage.setItem("playground-vibrant-background", next);
    setBg(next);
    setInk(readableInk(next));
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".ui-v1-page");
    if (!shell) return;
    shell.style.setProperty("--ui-v1-bg", bg);
    shell.style.setProperty("--ui-v1-fg", ink);
    return () => {
      shell.style.removeProperty("--ui-v1-bg");
      shell.style.removeProperty("--ui-v1-fg");
    };
  }, [bg, ink]);

  useEffect(() => {
    const matchViewportWidth = () => setCw(clamp(Math.round(window.innerWidth), 200, 4000));
    matchViewportWidth();
    window.addEventListener("resize", matchViewportWidth);
    return () => window.removeEventListener("resize", matchViewportWidth);
  }, []);

  useEffect(() => {
    recomputePoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    fontSize,
    tracking,
    fontWeight,
    align,
    baseline,
    sampleThreshold,
    sampleStep,
    sampleJitter,
    cw,
    ch,
    pad,
    lineHeightFactor,
  ]);

  useEffect(() => {
    fbRef.current = null;
  }, [cw, ch, dpr, clearFeedbackTick]);

  useRaf((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = cw;
    const H = ch;
    const fittedFontSize = fitTextFontSize(ctx, {
      text,
      fontFamily,
      fontWeight,
      requestedSize: fontSize,
      tracking,
      maxWidth: Math.max(1, W - pad * 2),
      maxHeight: Math.max(1, H - pad * 2),
      lineHeightFactor,
    });

    // HiDPI
    if (canvas.width !== Math.floor(W * dpr) || canvas.height !== Math.floor(H * dpr)) {
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Feedback buffer init
    if (feedbackOn && !fbRef.current) {
      const { c, ctx: bctx } = makeOffscreen(Math.floor(W * dpr), Math.floor(H * dpr));
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.fillStyle = bg;
      bctx.fillRect(0, 0, c.width, c.height);
      fbRef.current = { c, ctx: bctx };
    }

    // Background
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Pull previous frame
    if (feedbackOn && fbRef.current) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(fbRef.current.c, 0, 0, W, H);
      ctx.restore();
    }

    // Ghost text
    if (showGhostText) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = ink;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = align;
      ctx.font = `${fontWeight} ${fittedFontSize}px ${fontFamily}`;

      const x = align === "left" ? pad : align === "right" ? W - pad : W / 2;
      const y = H / 2;
      const lineHeight = fittedFontSize * lineHeightFactor;

      drawTextWithTracking(ctx, { text, x, y, align, baseline, tracking, lineHeight });
      ctx.restore();
    }

    const pts = pointsRef.current;

    const wave = (x01: number, y01: number) =>
      waveField({
        x: x01,
        y: y01,
        t,
        amp: waveAmp,
        freq: waveFreq,
        speed: waveSpeed,
        shape: waveShape,
        phase: wavePhase,
        dir: waveDir,
      });

    // Drawing styles
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineWidth = strokeW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const anyModeOn = sampleOn || gridOn || shapeOn;
    if (!anyModeOn) return;

    const distortionWeight = gridOn ? distMix : 0;
    const shapeWeight = shapeOn ? shapeMix : 0;

    const keep = clamp(legibility, 0, 1);

    // Performance cap
    const maxPts = 24000;
    const stride = pts && pts.length > maxPts ? Math.ceil(pts.length / maxPts) : 1;

    // GRID-ONLY (Sampling OFF, Shapes OFF): show ONLY distorted result (no original underlay)
    if (!sampleOn && !shapeOn) {
      if (distortionWeight <= 0) return;

      const key = [
        text,
        fontSize,
        tracking,
        fontWeight,
        align,
        baseline,
        pad,
        lineHeightFactor,
        ink,
        W,
        H,
        dpr,
      ].join("|");

      if (!textLayerRef.current || textLayerRef.current.key !== key) {
        const buf = makeOffscreen(Math.floor(W * dpr), Math.floor(H * dpr));
        const bctx = buf.ctx;
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, buf.c.width, buf.c.height);
        bctx.fillStyle = ink;
        bctx.textBaseline = "alphabetic";
        bctx.textAlign = align;
        bctx.font = `${fontWeight} ${fittedFontSize * dpr}px ${fontFamily}`;

        const x = (align === "left" ? pad : align === "right" ? W - pad : W / 2) * dpr;
        const y = (H / 2) * dpr;
        const lineHeight = fittedFontSize * lineHeightFactor * dpr;

        drawTextWithTracking(bctx, {
          text,
          x,
          y,
          align,
          baseline,
          tracking: tracking * dpr,
          lineHeight,
        });

        textLayerRef.current = { key, buf };
      }

      const layer = textLayerRef.current!.buf;

      const cell = Math.max(6, Math.floor(gridSize));
      const cellPx = cell * dpr;

      ctx.save();
      ctx.globalAlpha = 1;

      for (let yy = 0; yy < H; yy += cell) {
        for (let xx = 0; xx < W; xx += cell) {
          const cx01 = (xx + cell * 0.5) / W;
          const cy01 = (yy + cell * 0.5) / H;
          const wv = waveToGrid ? wave(cx01, cy01) : 0;

          const gv = gridVector({
            x: xx + cell * 0.5,
            y: yy + cell * 0.5,
            grid: cell,
            strength: gridStrength,
            wave: wv,
          });

          const dx = gv.dx * distortionWeight;
          const dy = gv.dy * distortionWeight;
          if (gridCut > 0 && Math.hypot(dx, dy) < gridCut) continue;

          // Anisotropic stretch/compress around the tile center
          const w = clamp(wv, -1, 1) * gridWarp;
          const sxScale = 1 + w * (1 - gridWarpAxis);
          const syScale = 1 - w * gridWarpAxis;

          const srcX = Math.floor(xx * dpr);
          const srcY = Math.floor(yy * dpr);
          const srcW = Math.min(cellPx, layer.c.width - srcX);
          const srcH = Math.min(cellPx, layer.c.height - srcY);
          if (srcW <= 0 || srcH <= 0) continue;

          const dstW = (srcW / dpr) * sxScale;
          const dstH = (srcH / dpr) * syScale;
          const cx0 = xx + cell * 0.5 + dx;
          const cy0 = yy + cell * 0.5 + dy;

          ctx.drawImage(
            layer.c,
            srcX,
            srcY,
            srcW,
            srcH,
            cx0 - dstW / 2,
            cy0 - dstH / 2,
            dstW,
            dstH
          );
        }
      }

      ctx.restore();

      // write composed frame into feedback buffer (grid-only mode)
      if (feedbackOn && fbRef.current) {
        const { c, ctx: bctx } = fbRef.current;

        bctx.save();
        bctx.globalCompositeOperation = "source-over";
        bctx.globalAlpha = clamp(1 - feedbackAlpha, 0, 1);
        bctx.fillStyle = bg;
        bctx.fillRect(0, 0, c.width, c.height);
        bctx.restore();

        bctx.save();
        bctx.globalCompositeOperation = feedbackBlend;
        bctx.globalAlpha = 1;
        bctx.drawImage(canvas, 0, 0, c.width, c.height);
        bctx.restore();
      }
      return;
    }

    // If sampling is disabled but shapes are enabled: we need points to render shapes.
    // If points are missing, draw nothing (ghost text can be enabled).
    if (!pts || pts.length === 0) {
      return;
    }

    // Dot-batch when rendering as dots (sampling-only dot cloud)
    const renderAsDots = sampleOn && shapeWeight <= 0.01;

    if (renderAsDots) {
      ctx.save();
      ctx.globalAlpha = clamp(sampleOpacity, 0, 1);
      ctx.beginPath();

      for (let i = 0; i < pts.length; i += stride) {
        const p = pts[i];
        const x01 = p.x / W;
        const y01 = p.y / H;
        const wv = waveToSampling || waveToGrid ? wave(x01, y01) : 0;

        let dx = 0,
          dy = 0;
        if (distortionWeight > 0) {
          const gv = gridVector({
            x: p.x,
            y: p.y,
            grid: gridSize,
            strength: gridStrength,
            wave: waveToGrid ? wv : 0,
          });
          dx = gv.dx * distortionWeight;
          dy = gv.dy * distortionWeight;

          if (gridCut > 0 && Math.hypot(dx, dy) < gridCut) continue;

          // Stretch/compress inside each grid cell
          const cell = Math.max(6, Math.floor(gridSize));
          const cx = Math.floor(p.x / cell) * cell + cell * 0.5;
          const cy = Math.floor(p.y / cell) * cell + cell * 0.5;
          const w = clamp(wv, -1, 1) * gridWarp;
          const sxScale = 1 + w * (1 - gridWarpAxis);
          const syScale = 1 - w * gridWarpAxis;
          const ux = p.x - cx;
          const uy = p.y - cy;
          dx += ux * (sxScale - 1);
          dy += uy * (syScale - 1);
        }

        const tx = p.x + dx;
        const ty = p.y + dy;

        const fx = lerp(tx, p.x, keep);
        const fy = lerp(ty, p.y, keep);

        const wForDots = waveToSampling ? wv : 0;
        const r = Math.max(0.5, shapeSize * (0.65 + 0.75 * (0.5 + 0.5 * wForDots)));
        ctx.moveTo(fx + r, fy);
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
      }

      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();

      for (let i = 0; i < pts.length; i += stride) {
        const p = pts[i];
        const x01 = p.x / W;
        const y01 = p.y / H;
        const wv = wave(x01, y01);

        let px = p.x;
        let py = p.y;

        // Grid distortion
        if (distortionWeight > 0) {
          const gv = gridVector({
            x: p.x,
            y: p.y,
            grid: gridSize,
            strength: gridStrength,
            wave: waveToGrid ? wv : 0,
          });
          let dx = gv.dx * distortionWeight;
          let dy = gv.dy * distortionWeight;

          if (gridCut > 0 && Math.hypot(dx, dy) < gridCut) continue;

          const cell = Math.max(6, Math.floor(gridSize));
          const cx = Math.floor(p.x / cell) * cell + cell * 0.5;
          const cy = Math.floor(p.y / cell) * cell + cell * 0.5;
          const w = clamp(wv, -1, 1) * gridWarp;
          const sxScale = 1 + w * (1 - gridWarpAxis);
          const syScale = 1 - w * gridWarpAxis;
          const ux = p.x - cx;
          const uy = p.y - cy;
          dx += ux * (sxScale - 1);
          dy += uy * (syScale - 1);

          px = p.x + dx;
          py = p.y + dy;
        }

        // Legibility bias back to original
        px = lerp(px, p.x, keep);
        py = lerp(py, p.y, keep);

        if (shapeWeight > 0) {
          const wForShapes = waveToShapes ? wv : 0;
          const rot = wForShapes * Math.PI + (x01 - 0.5) * 0.6;
          const sz = Math.max(0.5, shapeSize * (0.75 + 0.9 * (0.5 + 0.5 * wForShapes)));
          const ll = Math.max(1, lineLen * (0.75 + 0.9 * (0.5 + 0.5 * wForShapes)));

          if (shapeType === "line") {
            ctx.globalAlpha = clamp(sampleOpacity * (0.35 + 0.75 * p.a), 0, 1);
            drawShape(ctx, "line", px, py, sz, rot, ll);
          } else {
            ctx.globalAlpha = clamp(sampleOpacity * (0.25 + 0.85 * p.a), 0, 1);
            drawShape(ctx, shapeType, px, py, sz, rot, ll);
          }
        } else if (sampleOn) {
          ctx.globalAlpha = clamp(sampleOpacity * (0.25 + 0.85 * p.a), 0, 1);
          ctx.beginPath();
          const r = Math.max(0.5, shapeSize * 0.55);
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    if (feedbackOn && fbRef.current) {
      const { c, ctx: bctx } = fbRef.current;

      bctx.save();
      bctx.globalCompositeOperation = "source-over";
      bctx.globalAlpha = clamp(1 - feedbackAlpha, 0, 1);
      bctx.fillStyle = bg;
      bctx.fillRect(0, 0, c.width, c.height);
      bctx.restore();

      bctx.save();
      bctx.globalCompositeOperation = feedbackBlend;
      bctx.globalAlpha = 1;
      bctx.drawImage(canvas, 0, 0, c.width, c.height);
      bctx.restore();
    }
  }, true);

  const TabButton = ({ id, children }: { id: typeof tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      className="ui-v1-tab"
      aria-pressed={tab === id}
    >
      {children}
    </button>
  );

  const CommitNumber = ({
    value,
    onCommit,
    min = 0,
    max = 10000,
    step = 1,
  }: {
    value: number;
    onCommit: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    const { raw, setRaw, commit } = useCommitNumber(value, onCommit);
    return (
      <input
        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100"
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
            commit();
          }
          if (e.key === "Escape") {
            setRaw(String(value));
            e.currentTarget.blur();
          }
        }}
        aria-label="number"
        data-min={min}
        data-max={max}
        data-step={step}
      />
    );
  };

  const Select = ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: any) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  const Toggle = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
  }) => (
    <label className="flex items-center gap-2 text-sm text-neutral-200 select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  const beginPanelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    panelDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: panelOffset.x,
      originY: panelOffset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const movePanel = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const nextX = drag.originX + e.clientX - drag.startX;
    const nextY = drag.originY + e.clientY - drag.startY;
    setPanelOffset({
      x: clamp(nextX, -Math.max(0, window.innerWidth - 360), 24),
      y: clamp(nextY, -64, Math.max(0, window.innerHeight - 260)),
    });
  };

  const endPanelDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panelDragRef.current?.pointerId === e.pointerId) {
      panelDragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const applyQuickPreset = (preset: string) => {
    if (preset === "broadcast") {
      setText("RADIO\nSIGNAL");
      setFontSize(220);
      setTracking(14);
      setAlign("center");
      setBaseline("middle");
      setLineHeightFactor(1.06);
    }
    if (preset === "kinetic") {
      setText("MARSEILLE");
      setFontSize(260);
      setTracking(2);
      setWaveShape("triangle");
      setWaveAmp(0.9);
      setWaveFreq(1.9);
      setGridStrength(34);
      setLegibility(0.7);
      setShapeType("line");
      setLineLen(18);
      setLineHeightFactor(1.12);
    }
    if (preset === "shimmer") {
      setText("ETM");
      setFontSize(360);
      setTracking(8);
      setWaveShape("sine");
      setWaveAmp(0.45);
      setWaveFreq(1.2);
      setGridStrength(16);
      setLegibility(0.85);
      setShapeType("dot");
      setShapeSize(4);
      setLineHeightFactor(1.12);
    }
  };

  return (
    <div className="ui-v1-synth text-neutral-100" style={{ background: bg }}>
      <div className="ui-v1-synth-inner">
        <div className="ui-v1-actions">
          <label className="ui-v1-action-field ui-v1-action-text">
            <span>Text</span>
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} aria-label="Text input" />
          </label>

          <label className="ui-v1-action-field ui-v1-action-preset">
            <span>Quick preset</span>
            <select
              aria-label="Quick preset"
              defaultValue=""
              onChange={(e) => {
                applyQuickPreset(e.target.value);
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>Select</option>
              <option value="broadcast">Broadcast stack</option>
              <option value="kinetic">Hard kinetic</option>
              <option value="shimmer">Readable shimmer</option>
            </select>
          </label>

          <div className="ui-v1-action-field ui-v1-action-size">
            <span>Canvas</span>
            <CommitNumber value={cw} onCommit={(v) => setCw(clamp(Math.round(v), 200, 4000))} min={200} max={4000} step={10} />
            <i aria-hidden="true">×</i>
            <CommitNumber value={ch} onCommit={(v) => setCh(clamp(Math.round(v), 200, 3000))} min={200} max={3000} step={10} />
          </div>

          <div className="ui-v1-action-buttons">
            <button
              onClick={() => {
                setText("KINETIC TYPE");
                setFontSize(220);
                setTracking(6);
                setSampleStep(6);
                setGridSize(56);
                setGridStrength(22);
                setWaveAmp(0.6);
                setWaveFreq(1.4);
                setWaveSpeed(0.00075);
                setLegibility(0.6);
                setShapeType("dot");
                setShapeSize(3);
                setLineLen(10);
                setLineHeightFactor(1.12);
                setGridCut(0);
                setGridWarp(0.6);
                setGridWarpAxis(0.35);
              }}
            >
              Reset
            </button>
            <button onClick={() => recomputePoints()}>Resample</button>
            <button onClick={() => setClearFeedbackTick((x) => x + 1)} title="Clears the feedback buffer">
              Clear trails
            </button>
          </div>
        </div>

        <div className="ui-v1-layout">
          <div className="ui-v1-canvas-frame">
            <canvas ref={canvasRef} className="ui-v1-canvas" />
          </div>

          <aside
            className={`ui-v1-panel ${panelOpen ? "is-open" : "is-closed"}`}
            style={{ transform: `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)` }}
          >
            <div
              className="ui-v1-panel-handle"
              onPointerDown={beginPanelDrag}
              onPointerMove={movePanel}
              onPointerUp={endPanelDrag}
              onPointerCancel={endPanelDrag}
            >
              <span>{tab}</span>
              <span className="ui-v1-drag-mark" aria-hidden="true">≡</span>
              <button
                type="button"
                aria-label={panelOpen ? "Collapse controls" : "Open controls"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setPanelOpen((open) => !open)}
              >
                {panelOpen ? "×" : "+"}
              </button>
            </div>

            {panelOpen && (
              <div className="ui-v1-panel-content">
          <div className="ui-v1-panel-tabs">
            <TabButton id="modes">Modes</TabButton>
            <TabButton id="wave">Waves</TabButton>
            <TabButton id="text">Text</TabButton>
          </div>

          <div className="ui-v1-panel-body">
            {tab === "modes" && (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Sampling</div>
                    <Toggle checked={sampleOn} onChange={setSampleOn} label={sampleOn ? "On" : "Off"} />
                  </div>
                  <div className="grid gap-3">
                    <ControlRow label="Step (density)">
                      <RangeSlider value={sampleStep} onChange={setSampleStep} min={2} max={14} step={1} />
                    </ControlRow>
                    <ControlRow label="Threshold">
                      <RangeSlider value={sampleThreshold} onChange={setSampleThreshold} min={0.05} max={0.8} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Jitter">
                      <RangeSlider value={sampleJitter} onChange={setSampleJitter} min={0} max={3} step={0.05} />
                    </ControlRow>
                    <ControlRow label="Opacity">
                      <RangeSlider value={sampleOpacity} onChange={setSampleOpacity} min={0} max={1} step={0.01} />
                    </ControlRow>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Grid distortion</div>
                    <Toggle checked={gridOn} onChange={setGridOn} label={gridOn ? "On" : "Off"} />
                  </div>
                  <div className="grid gap-3">
                    <ControlRow label="Grid size">
                      <RangeSlider value={gridSize} onChange={setGridSize} min={10} max={180} step={1} />
                    </ControlRow>
                    <ControlRow label="Strength">
                      <RangeSlider value={gridStrength} onChange={setGridStrength} min={0} max={80} step={1} />
                    </ControlRow>
                    <ControlRow label="Mix">
                      <RangeSlider value={distMix} onChange={setDistMix} min={0} max={1} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Hide originals">
                      <RangeSlider value={gridCut} onChange={setGridCut} min={0} max={10} step={0.1} />
                    </ControlRow>
                    <ControlRow label="Stretch / compress">
                      <RangeSlider value={gridWarp} onChange={setGridWarp} min={0} max={1.5} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Axis">
                      <RangeSlider value={gridWarpAxis} onChange={setGridWarpAxis} min={0} max={1} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Legibility">
                      <RangeSlider value={legibility} onChange={setLegibility} min={0} max={1} step={0.01} />
                    </ControlRow>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Shapes by vertex</div>
                    <Toggle checked={shapeOn} onChange={setShapeOn} label={shapeOn ? "On" : "Off"} />
                  </div>
                  <div className="grid gap-3">
                    <ControlRow label="Shape">
                      <Select
                        value={shapeType}
                        onChange={setShapeType}
                        options={[
                          { value: "dot", label: "Dot" },
                          { value: "square", label: "Square" },
                          { value: "line", label: "Line" },
                        ]}
                      />
                    </ControlRow>
                    <ControlRow label="Size">
                      <RangeSlider value={shapeSize} onChange={setShapeSize} min={0.5} max={10} step={0.1} />
                    </ControlRow>
                    <ControlRow label="Line length">
                      <RangeSlider value={lineLen} onChange={setLineLen} min={2} max={40} step={1} />
                    </ControlRow>
                    <ControlRow label="Mix">
                      <RangeSlider value={shapeMix} onChange={setShapeMix} min={0} max={1} step={0.01} />
                    </ControlRow>
                  </div>
                </div>
              </div>
            )}

            {tab === "wave" && (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="text-sm font-semibold mb-3">Wave modulation</div>
                  <div className="grid gap-3">
                    <ControlRow label="Wave shape">
                      <Select
                        value={waveShape}
                        onChange={setWaveShape}
                        options={[
                          { value: "sine", label: "Sine" },
                          { value: "triangle", label: "Triangle" },
                          { value: "square", label: "Square" },
                          { value: "saw", label: "Saw" },
                        ]}
                      />
                    </ControlRow>
                    <ControlRow label="Amplitude">
                      <RangeSlider value={waveAmp} onChange={setWaveAmp} min={0} max={2} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Frequency">
                      <RangeSlider value={waveFreq} onChange={setWaveFreq} min={0.1} max={6} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Speed">
                      <RangeSlider value={waveSpeed} onChange={setWaveSpeed} min={0} max={0.003} step={0.00001} />
                    </ControlRow>
                    <ControlRow label="Direction">
                      <RangeSlider value={waveDir} onChange={setWaveDir} min={0} max={1} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Phase">
                      <RangeSlider value={wavePhase} onChange={setWavePhase} min={0} max={2} step={0.01} />
                    </ControlRow>

                    <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                      <div className="text-xs font-semibold text-neutral-200 mb-2">Wave destinations</div>
                      <div className="grid gap-2">
                        <Toggle checked={waveToSampling} onChange={setWaveToSampling} label="Affect sampling (dot size)" />
                        <Toggle checked={waveToGrid} onChange={setWaveToGrid} label="Affect grid distortion" />
                        <Toggle checked={waveToShapes} onChange={setWaveToShapes} label="Affect shapes (size/rotation)" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="text-sm font-semibold mb-3">Feedback / trails</div>
                  <div className="grid gap-3">
                    <Toggle checked={feedbackOn} onChange={setFeedbackOn} label={feedbackOn ? "On" : "Off"} />
                    <ControlRow label="Fade (keep)">
                      <RangeSlider value={feedbackAlpha} onChange={setFeedbackAlpha} min={0.5} max={0.98} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Blend mode">
                      <Select
                        value={feedbackBlend}
                        onChange={setFeedbackBlend}
                        options={[
                          { value: "source-over", label: "Normal" },
                          { value: "screen", label: "Screen" },
                          { value: "multiply", label: "Multiply" },
                          { value: "lighter", label: "Add (lighter)" },
                          { value: "difference", label: "Difference" },
                          { value: "xor", label: "XOR" },
                        ]}
                      />
                    </ControlRow>

                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                      <div className="text-xs font-semibold text-neutral-200 mb-2">Readability helpers</div>
                      <div className="grid gap-2">
                        <Toggle checked={showGhostText} onChange={setShowGhostText} label="Ghost text underlay" />
                        <ControlRow label="Stroke width">
                          <RangeSlider value={strokeW} onChange={setStrokeW} min={0.5} max={3} step={0.5} />
                        </ControlRow>
                        <ControlRow label="Ink">
                          <input
                            type="color"
                            value={ink}
                            onChange={(e) => setInk(e.target.value)}
                            className="w-full h-10 rounded-xl border border-neutral-800 bg-neutral-900"
                          />
                        </ControlRow>
                        <ControlRow label="Background">
                          <input
                            type="color"
                            value={bg}
                            onChange={(e) => setBg(e.target.value)}
                            className="w-full h-10 rounded-xl border border-neutral-800 bg-neutral-900"
                          />
                        </ControlRow>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-400 leading-relaxed">
                      If type gets unreadable: raise <span className="text-neutral-200">Legibility</span>, enable <span className="text-neutral-200">Ghost text</span>,
                      or reduce grid strength.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "text" && (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/30 p-4">
                  <div className="text-sm font-semibold mb-3">Typography</div>
                  <div className="grid gap-3">
                    <ControlRow label="Font size">
                      <RangeSlider value={fontSize} onChange={setFontSize} min={24} max={420} step={1} />
                    </ControlRow>
                    <ControlRow label="Tracking">
                      <RangeSlider value={tracking} onChange={setTracking} min={-8} max={30} step={1} />
                    </ControlRow>
                    <ControlRow label="Line height">
                      <RangeSlider value={lineHeightFactor} onChange={setLineHeightFactor} min={0.9} max={1.6} step={0.01} />
                    </ControlRow>
                    <ControlRow label="Weight">
                      <RangeSlider value={fontWeight} onChange={setFontWeight} min={200} max={900} step={100} />
                    </ControlRow>
                    <ControlRow label="Align">
                      <Select
                        value={align}
                        onChange={setAlign}
                        options={[
                          { value: "left", label: "Left" },
                          { value: "center", label: "Center" },
                          { value: "right", label: "Right" },
                        ]}
                      />
                    </ControlRow>
                    <ControlRow label="Baseline">
                      <Select
                        value={baseline}
                        onChange={setBaseline}
                        options={[
                          { value: "top", label: "Top" },
                          { value: "middle", label: "Middle" },
                          { value: "bottom", label: "Bottom" },
                        ]}
                      />
                    </ControlRow>
                    <ControlRow label="Padding">
                      <RangeSlider value={pad} onChange={setPad} min={0} max={220} step={1} />
                    </ControlRow>
                  </div>
                </div>
              </div>
            )}
          </div>
              </div>
            )}
          </aside>
        </div>

        <div className="ui-v1-note">
          Modes can be combined or solo. Grid-only shows only the warped result.
        </div>
      </div>
    </div>
  );
}
