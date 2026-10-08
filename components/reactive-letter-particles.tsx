"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// Reactive Letter Particles
// - Multi-line text (use Enter) with interline control
// - Spawn particles inside or outside glyphs
// - Shapes repel; on collision: hue shifts, optional morph, optional split
// - Growth: +1% per collision up to 10x, then shrink back; also shrink after 30s idle per particle
// - Strict mask constraint: inside cannot escape, outside cannot enter
// - UI under canvas with 4 horizontal tabs (Source / Glyph+Shapes / Colors / Interactions)

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickShape(mode: string, rnd: () => number) {
  if (mode === "circles" || mode === "squares" || mode === "lines" || mode === "cells" || mode === "letters") return mode;
  const r = rnd();
  if (r < 0.34) return "circles";
  if (r < 0.67) return "squares";
  return "lines";
}

function hsl(h: number, s: number, l: number, a = 1) {
  const hh = ((h % 360) + 360) % 360;
  return `hsla(${hh}, ${s}%, ${l}%, ${a})`;
}

// Safe newline normalization, works for pasted text from any OS.
// NOTE: keep all escapes explicit to avoid accidental raw newlines in source.
function splitLines(text: string) {
  return String(text ?? "").replace(/\r/g, "\n").split("\n");
}

// Minimal dev checks (keep them small + syntax-safe)
if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
  console.assert(splitLines("a\\nb").length === 2, "splitLines should split on \\\n");
  console.assert(splitLines("a\\r\\nb").length === 2, "splitLines should normalize \\\r\\\n");
  console.assert(splitLines("a\\rb").length === 2, "splitLines should normalize \\\r");
  console.assert(splitLines("").length === 1, "splitLines on empty should return [\"\"]");
}

type Mask = {
  canvas: HTMLCanvasElement;
  data: ImageData | null;
  bbox: { x: number; y: number; w: number; h: number };
};

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: string;

  sizeF: number;
  lenF: number;
  size0: number;
  len0: number;

  scale: number;
  lastCollisionAt: number;
  shrinkMode: boolean;

  rot: number;

  hueOff: number;
  hue: number;
  sat: number;
  lit: number;

  alpha: number;
  filled: boolean;
  stroke: number;

  cooldown: number;
  splitCount: number;
  pullX?: number;
  pullY?: number;
  cellFaces?: { angle: number; distance: number }[];
  membrane?: number[];
};

const CANVAS_SIZES = {
  "1280x520": { width: 1280, height: 520, label: "1280 × 520" },
  "1920x1080": { width: 1920, height: 1080, label: "1920 × 1080" },
  "1080x1080": { width: 1080, height: 1080, label: "1080 × 1080" },
};

function drawShape(ctx: CanvasRenderingContext2D, p: Particle, time: number, glyph: string, fontFamily: string, color: string, softness: number, dt: number) {
  const scale = typeof p.scale === "number" ? p.scale : 1;
  const size = (p.size0 ?? 6) * scale;
  const len = (p.len0 ?? 26) * scale;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = p.stroke;

  if (p.kind === "cells") {
    // Membranes retain their shape and ease into changing contact pressure.
    const phase = time * 0.00035 + p.id * 2.399;
    const segments = 48;
    const points: { x: number; y: number }[] = [];
    if (!p.membrane) p.membrane = Array(segments).fill(1);
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const pullAngle = Math.atan2(p.pullY || 0, p.pullX || 0) - p.rot;
      const stretch = Math.min(0.13, Math.hypot(p.pullX || 0, p.pullY || 0));
      let radius = size * (1 + stretch * Math.cos(angle - pullAngle) + 0.025 * softness * Math.sin(phase) + 0.055 * softness * Math.sin(angle * 3 + phase));
      for (const face of p.cellFaces || []) {
        const alignment = Math.cos(angle + p.rot - face.angle);
        if (alignment > 0.05) radius = Math.min(radius, face.distance / alignment);
      }
      const target = Math.max(0.45, radius / size);
      p.membrane[i] += (target - p.membrane[i]) * (1 - Math.exp(-(0.16 - softness * 0.13) * dt));
      points.push({ x: Math.cos(angle) * size * p.membrane[i], y: Math.sin(angle) * size * p.membrane[i] });
    }
    ctx.beginPath();
    const end = points[segments - 1], start = points[0];
    ctx.moveTo((end.x + start.x) / 2, (end.y + start.y) / 2);
    for (let i = 0; i < segments; i++) {
      const current = points[i], next = points[(i + 1) % segments];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    ctx.closePath();
    if (p.filled) {
      ctx.fill();
      ctx.strokeStyle = `rgba(0, 0, 0, ${p.alpha * 0.5})`;
      ctx.lineWidth = Math.max(0.7, Math.min(3, size * 0.09));
      ctx.stroke();
    } else ctx.stroke();
  } else if (p.kind === "letters") {
    ctx.font = `700 ${Math.max(2, size * 2)}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (p.filled) ctx.fillText(glyph, 0, 0); else ctx.strokeText(glyph, 0, 0);
  } else if (p.kind === "circles") {
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    if (p.filled) ctx.fill();
    else ctx.stroke();
  } else if (p.kind === "squares") {
    const s = size * 2;
    if (p.filled) ctx.fillRect(-s / 2, -s / 2, s, s);
    else ctx.strokeRect(-s / 2, -s / 2, s, s);
  } else {
    ctx.beginPath();
    ctx.moveTo(-len / 2, 0);
    ctx.lineTo(len / 2, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function buildTextMask(args: {
  w: number;
  h: number;
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  tracking: number;
  baselineY: number;
  interline: number;
}): Mask {
  const { w, h, text, fontFamily, fontWeight, fontSize, tracking, baselineY, interline } = args;

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");
  if (!octx) return { canvas: off, data: null, bbox: { x: 0, y: 0, w, h } };

  octx.clearRect(0, 0, w, h);
  octx.fillStyle = "#000";
  octx.textAlign = "center";
  octx.textBaseline = "alphabetic";
  octx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const lines = splitLines(text);
  const lineStep = fontSize * 1.05 + interline;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const chars = Array.from(line);
    const metrics = chars.map((c) => octx.measureText(c));
    const widths = metrics.map((m) => m.width);
    const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);

    let x = w / 2 - total / 2;
    const y = baselineY + li * lineStep;

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      octx.fillText(c, x + widths[i] / 2, y);
      x += widths[i] + tracking;
    }
  }

  const img = octx.getImageData(0, 0, w, h);

  // bbox
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  const d = img.data;
  let found = false;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const a = d[(yy * w + xx) * 4 + 3];
      if (a > 0) {
        found = true;
        if (xx < minX) minX = xx;
        if (yy < minY) minY = yy;
        if (xx > maxX) maxX = xx;
        if (yy > maxY) maxY = yy;
      }
    }
  }

  const bbox = found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : { x: 0, y: 0, w, h };
  return { canvas: off, data: img, bbox };
}

function isInsideMask(maskData: ImageData | null, x: number, y: number) {
  if (!maskData) return false;
  const w = maskData.width;
  const h = maskData.height;
  const xx = Math.floor(x);
  const yy = Math.floor(y);
  if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
  return maskData.data[(yy * w + xx) * 4 + 3] > 0;
}

function samplePoint(args: {
  rnd: () => number;
  maskData: ImageData | null;
  mode: "inside" | "outside";
  bbox: { x: number; y: number; w: number; h: number };
  w: number;
  h: number;
  padding: number;
}) {
  const { rnd, maskData, mode, bbox, w, h, padding } = args;

  const tries = 2000;
  const bx = clamp(bbox.x - padding, 0, w);
  const by = clamp(bbox.y - padding, 0, h);
  const bw = clamp(bbox.w + padding * 2, 1, w);
  const bh = clamp(bbox.h + padding * 2, 1, h);

  for (let i = 0; i < tries; i++) {
    const x = mode === "inside" ? rnd() * bbox.w + bbox.x : rnd() * bw + bx;
    const y = mode === "inside" ? rnd() * bbox.h + bbox.y : rnd() * bh + by;

    const inside = isInsideMask(maskData, x, y);
    if (mode === "inside" && inside) return { x, y };
    if (mode === "outside" && !inside) return { x, y };
  }

  return { x: rnd() * w, y: rnd() * h };
}

function createParticles(args: {
  count: number;
  rnd: () => number;
  maskData: ImageData | null;
  mode: "inside" | "outside";
  bbox: { x: number; y: number; w: number; h: number };
  w: number;
  h: number;
  padding: number;
  shapeMode: string;
  baseHue: number;
  baseSat: number;
  baseLit: number;
  size: number;
  lineLen: number;
  filled: boolean;
  stroke: number;
  alpha: number;
}): Particle[] {
  const { count, rnd, maskData, mode, bbox, w, h, padding, shapeMode, baseHue, baseSat, baseLit, size, lineLen, filled, stroke, alpha } = args;

  const parts: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const pt = samplePoint({ rnd, maskData, mode, bbox, w, h, padding });
    const kind = pickShape(shapeMode, rnd);
    const sizeF = lerp(0.75, 1.25, rnd());
    const lenF = lerp(0.75, 1.25, rnd());

    const p: Particle = {
      id: i,
      x: pt.x,
      y: pt.y,
      vx: (rnd() - 0.5) * 0.6,
      vy: (rnd() - 0.5) * 0.6,
      kind,

      sizeF,
      lenF,
      size0: size * sizeF,
      len0: lineLen * lenF,

      scale: 1,
      lastCollisionAt: 0,
      shrinkMode: false,

      rot: rnd() * Math.PI * 2,

      hueOff: rnd() * 80,
      hue: 0,
      sat: baseSat,
      lit: baseLit,

      alpha,
      filled,
      stroke,

      cooldown: 0,
      splitCount: 0,
    };

    p.hue = (baseHue + p.hueOff) % 360;
    parts.push(p);
  }

  return parts;
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const { label, value, min, max, step, onChange } = props;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-medium text-white/75">{label}</div>
        <div className="font-mono text-[10px] tabular-nums text-white/55">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="immersive-slider w-full"
      />
    </div>
  );
}

function NumberCommit(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  const { label, value, min, max, step = 1, onCommit } = props;
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-white/75">{label}</span>
      <input
        className="w-24 bg-white/[0.07] px-2 py-1.5 text-right font-mono text-xs tabular-nums outline-none transition focus:bg-white/10"
        value={editing ? draft : String(value)}
        inputMode="decimal"
        onFocus={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (!Number.isFinite(n)) {
            setDraft(String(value));
            setEditing(false);
            return;
          }
          const clamped = clamp(n, min, max);
          onCommit(clamped);
          setDraft(String(clamped));
          setEditing(false);
        }}
        step={step}
      />
    </label>
  );
}

function TextCommit(props: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { label, value, onCommit, placeholder, multiline = false } = props;
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  return (
    <label className="flex items-start justify-between gap-3">
      <span className="pt-1 text-xs font-medium text-white/75">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          className="w-64 max-w-full resize-y bg-white/[0.07] px-2 py-1.5 text-sm outline-none transition focus:bg-white/10"
          value={editing ? draft : value}
          placeholder={placeholder}
          onFocus={() => {
            setDraft(value);
            setEditing(true);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onCommit(draft);
            setEditing(false);
          }}
        />
      ) : (
        <input
          className="w-64 max-w-full bg-white/[0.07] px-2 py-1.5 text-sm outline-none transition focus:bg-white/10"
          value={editing ? draft : value}
          placeholder={placeholder}
          onFocus={() => {
            setDraft(value);
            setEditing(true);
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onCommit(draft);
            setEditing(false);
          }}
        />
      )}
    </label>
  );
}

export default function ReactiveLetterParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const particlesRef = useRef<Particle[]>([]);
  const maskRef = useRef<Mask | null>(null);

  // IMPORTANT: keep explicit \n escape, never raw line breaks in string literals.
  const [text, setText] = useState("LAB");
  const [canvasW, setCanvasW] = useState(1280);
  const [canvasH, setCanvasH] = useState(840);

  const [activeTab, setActiveTab] = useState<"source" | "glyph" | "colors" | "interaction">("source");

  const [insideOutside, setInsideOutside] = useState<"inside" | "outside">("inside");
  const [shapeMode, setShapeMode] = useState("circles");
  const [count, setCount] = useState(241);

  const [fontFamily, setFontFamily] = useState("Arial, Helvetica, sans-serif");
  const [fontWeight, setFontWeight] = useState(700);
  const [fontSize, setFontSize] = useState(520);
  const [tracking, setTracking] = useState(60);
  const [baselineY, setBaselineY] = useState(610);
  const [interline, setInterline] = useState(22);

  const [size, setSize] = useState(4);
  const [lineLen, setLineLen] = useState(26);
  const [filled, setFilled] = useState(true);
  const [stroke, setStroke] = useState(2);
  const [alpha, setAlpha] = useState(1);

  const [repelRadius, setRepelRadius] = useState(6);
  const [repelStrength, setRepelStrength] = useState(0);
  const [damping, setDamping] = useState(0.968);
  const [jitter, setJitter] = useState(0.073);

  const [collisionRadiusBoost, setCollisionRadiusBoost] = useState(0.37);
  const [hueKick, setHueKick] = useState(0);
  const [morphOnHit, setMorphOnHit] = useState(true);
  const [morphChance, setMorphChance] = useState(0.7);

  // Shapes global color (HSL)
  const [colorMode, setColorMode] = useState("mono");
  const [secondHue, setSecondHue] = useState(25);
  const [thirdHue, setThirdHue] = useState(120);
  const [particleLetters, setParticleLetters] = useState("ABC");
  const [cellAttraction, setCellAttraction] = useState(0.65);
  const [cellRange, setCellRange] = useState(80);
  const [cellPressure, setCellPressure] = useState(1);
  const [cellSoftness, setCellSoftness] = useState(0.65);
  const [cellDamping, setCellDamping] = useState(0.82);
  const [cellAgitation, setCellAgitation] = useState(0.003);
  const [cellGrowthRate, setCellGrowthRate] = useState(0.002);
  const [cellExpansion, setCellExpansion] = useState(0.65);
  const cellBondsRef = useRef(new Set<string>());
  const [baseHue, setBaseHue] = useState(0);
  const [baseSat, setBaseSat] = useState(0);
  const [baseLit, setBaseLit] = useState(0);

  // Background color (HSL)
  const [bgHue, setBgHue] = useState(170);
  const [bgSat, setBgSat] = useState(66);
  const [bgLit, setBgLit] = useState(25);

  // Text color (HSL) for ghost text
  const [textHue, setTextHue] = useState(325);
  const [textSat, setTextSat] = useState(25);
  const [textLit, setTextLit] = useState(40);
  const [textAlpha, setTextAlpha] = useState(1);

  // Split-on-collision
  const [splitOnHit, setSplitOnHit] = useState(false);
  const [maxSplitsPerParticle, setMaxSplitsPerParticle] = useState(2);
  const maxParticles = useMemo(() => Math.min(2400, Math.max(200, count * 6)), [count]);

  const [seed, setSeed] = useState(12345);
  const [bubbleStart, setBubbleStart] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
  const panelDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: { x: number; y: number };
  } | null>(null);

  const rebuild = () => {
    cellBondsRef.current.clear();
    const w = canvasW;
    const h = canvasH;
    const rnd = mulberry32(seed);

    const mask = buildTextMask({
      w,
      h,
      text: String(text ?? "").trim() || " ",
      fontFamily,
      fontWeight,
      fontSize,
      tracking,
      baselineY,
      interline,
    });

    maskRef.current = mask;

    particlesRef.current = createParticles({
      count,
      rnd,
      maskData: mask.data,
      mode: insideOutside,
      bbox: mask.bbox,
      w,
      h,
      padding: Math.max(24, Math.round(fontSize * 0.25)),
      shapeMode,
      baseHue,
      baseSat,
      baseLit,
      size,
      lineLen,
      filled,
      stroke,
      alpha,
    });

    if (bubbleStart && shapeMode !== "cells") {
      // Start with the mature collision state shown in the reference.
      for (const p of particlesRef.current) {
        const r = rnd();
        p.scale = r < 0.65 ? 0.65 + rnd() * 1.1 : r < 0.94 ? 2 + rnd() * 4 : 7 + rnd() * 4;
        p.hueOff = rnd() * 360;
        p.hue = (baseHue + p.hueOff) % 360;
      }
    }
  };

  // Rebuild on structural params
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, canvasW, canvasH, insideOutside, shapeMode, count, fontFamily, fontWeight, fontSize, tracking, baselineY, interline, seed, bubbleStart]);

  // Live update style params
  useEffect(() => {
    const parts = particlesRef.current;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.size0 = size * p.sizeF;
      p.len0 = lineLen * p.lenF;
      p.filled = filled;
      p.stroke = stroke;
      p.alpha = alpha;
    }
  }, [size, lineLen, filled, stroke, alpha]);

  // Live update global color
  useEffect(() => {
    const parts = particlesRef.current;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.sat = baseSat;
      p.lit = baseLit;
      p.hue = (baseHue + (p.hueOff || 0)) % 360;
    }
  }, [baseHue, baseSat, baseLit]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(32, now - last) / 16.6667;
      last = now;

      const w = canvasW;
      const h = canvasH;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Background
      ctx.fillStyle = hsl(bgHue, bgSat, bgLit, 1);
      ctx.fillRect(0, 0, w, h);

      // Ghost text (tinted)
      ctx.save();
      ctx.fillStyle = hsl(textHue, textSat, textLit, textAlpha);
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      const lines = splitLines(text);
      const lineStep = fontSize * 1.05 + interline;
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const chars = Array.from(line);
        const metrics = chars.map((c) => ctx.measureText(c));
        const widths = metrics.map((m) => m.width);
        const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);

        let x = w / 2 - total / 2;
        const y = baselineY + li * lineStep;
        for (let i = 0; i < chars.length; i++) {
          const c = chars[i];
          ctx.fillText(c, x + widths[i] / 2, y);
          x += widths[i] + tracking;
        }
      }
      ctx.restore();

      const parts = particlesRef.current;
      const rnd = mulberry32(seed + Math.floor(now / 1000));

      // jitter
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const agitation = p.kind === "cells" ? cellAgitation : jitter;
        p.vx += (rnd() - 0.5) * agitation;
        p.vy += (rnd() - 0.5) * agitation;
        if (p.cooldown > 0) p.cooldown -= 1 * dt;
      }

      const bondCounts = new Map<number, number>();
      const byId = new Map(parts.map(p => [p.id, p]));
      for (const key of cellBondsRef.current) {
        const [aId, bId] = key.split(":").map(Number);
        const a = byId.get(aId), b = byId.get(bId);
        if (!a || !b || a.kind !== "cells" || b.kind !== "cells" || cellAttraction === 0 || (a && b && Math.hypot(a.x - b.x, a.y - b.y) > Math.max(cellRange * 1.8, (a.size0 * a.scale + b.size0 * b.scale) * 2.5))) {
          cellBondsRef.current.delete(key);
        } else {
          bondCounts.set(aId, (bondCounts.get(aId) || 0) + 1);
          bondCounts.set(bId, (bondCounts.get(bId) || 0) + 1);
        }
      }
      for (const p of parts) { p.pullX = (p.pullX || 0) * 0.85; p.pullY = (p.pullY || 0) * 0.85; p.cellFaces = []; }

      // repel + collision
      const rr = repelRadius;
      const rr2 = rr * rr;

      for (let i = 0; i < parts.length; i++) {
        const a = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 0.0001) continue;

          if (a.kind === "cells" && b.kind === "cells") {
            const d = Math.sqrt(d2), ux = dx / d, uy = dy / d;
            const ar = a.size0 * a.scale, br = b.size0 * b.scale;
            const key = `${a.id}:${b.id}`;
            if (d < (ar + br) * 1.3) {
              const contact = Math.atan2(-dy, -dx);
              a.cellFaces?.push({ angle: contact, distance: Math.max(ar * 0.35, d * ar / (ar + br) - 0.4) });
              b.cellFaces?.push({ angle: contact + Math.PI, distance: Math.max(br * 0.35, d * br / (ar + br) - 0.4) });
            }
            const capture = Math.min(cellRange, (ar + br) * 1.35 + 4);
            if (cellAttraction > 0 && d < capture && (bondCounts.get(a.id) || 0) < 6 && (bondCounts.get(b.id) || 0) < 6 && !cellBondsRef.current.has(key)) {
              cellBondsRef.current.add(key);
              bondCounts.set(a.id, (bondCounts.get(a.id) || 0) + 1);
              bondCounts.set(b.id, (bondCounts.get(b.id) || 0) + 1);
            }
            const bonded = cellBondsRef.current.has(key);
            const rest = (ar + br) * (1.02 - cellPressure * 0.14);
            const force = bonded
              ? Math.max(-0.18, Math.min(0.18, (d - rest) * 0.012)) * cellAttraction
              : d < cellRange && d > ar + br ? (1 - d / cellRange) * 0.012 * cellAttraction / 6 : 0;
            const coreRepulsion = d < (ar + br) * 0.7 ? ((ar + br) * 0.7 - d) * (0.025 + cellPressure * 0.01) : 0;
            const relativeSpeed = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy;
            const drag = bonded ? relativeSpeed * 0.07 : 0;
            const net = force - coreRepulsion + drag;
            a.vx -= ux * net * dt; a.vy -= uy * net * dt;
            b.vx += ux * net * dt; b.vy += uy * net * dt;
            if (bonded) {
              a.pullX = (a.pullX || 0) - ux * 0.06; a.pullY = (a.pullY || 0) - uy * 0.06;
              b.pullX = (b.pullX || 0) + ux * 0.06; b.pullY = (b.pullY || 0) + uy * 0.06;

            }
            continue;
          }

          // repel
          if (d2 < rr2) {
            const d = Math.sqrt(d2);
            const ux = dx / d;
            const uy = dy / d;
            const push = (1 - d / rr) * repelStrength;
            a.vx += ux * push * 0.25;
            a.vy += uy * push * 0.25;
            b.vx -= ux * push * 0.25;
            b.vy -= uy * push * 0.25;
          }

          // collision
          const aSize = (a.size0 || 0) * (a.scale || 1);
          const bSize = (b.size0 || 0) * (b.scale || 1);
          const aLen = (a.len0 || 0) * (a.scale || 1);
          const bLen = (b.len0 || 0) * (b.scale || 1);
          const ar = a.kind === "lines" ? aLen * 0.35 + a.stroke : aSize;
          const br = b.kind === "lines" ? bLen * 0.35 + b.stroke : bSize;
          const cr = (ar + br) * collisionRadiusBoost;

          if (d2 < cr * cr) {
            const d = Math.sqrt(d2);
            const ux = dx / d;
            const uy = dy / d;
            const overlap = cr - d;
            const k = overlap * 0.06;
            a.vx += ux * k;
            a.vy += uy * k;
            b.vx -= ux * k;
            b.vy -= uy * k;

            const grow = (p: Particle) => {
              const cur = typeof p.scale === "number" ? p.scale : 1;
              let next = cur * 1.01;
              if (next >= 10) {
                next = 10;
                p.shrinkMode = true;
              }
              p.scale = next;
              p.lastCollisionAt = now;
            };

            const split = (p: Particle, sUx: number, sUy: number) => {
              if (!splitOnHit) return;
              const arr = particlesRef.current;
              if (arr.length >= maxParticles) return;

              p.splitCount = (p.splitCount || 0) + 1;
              if (p.splitCount >= maxSplitsPerParticle) {
                p.splitCount = 0;
                p.scale = 1;
                p.shrinkMode = false;
                return;
              }

              p.scale = Math.max(0.35, (p.scale || 1) * 0.5);
              p.cooldown = Math.max(p.cooldown || 0, 10);

              const child: Particle = {
                ...p,
                id: (arr[arr.length - 1]?.id ?? 0) + 1,
                x: p.x - sUx * 8,
                y: p.y - sUy * 8,
                vx: p.vx - sUx * 0.8,
                vy: p.vy - sUy * 0.8,
                cooldown: 10,
              };
              arr.push(child);
            };

            if (a.cooldown <= 0) {
              grow(a);
              split(a, ux, uy);
              a.hueOff = ((a.hueOff || 0) + hueKick + rnd() * 18) % 360;
              a.hue = (baseHue + (a.hueOff || 0)) % 360;
              a.rot += (rnd() - 0.5) * 0.8;
              a.cooldown = 6;
              if (morphOnHit && rnd() < morphChance) a.kind = pickShape(shapeMode, rnd);
            }

            if (b.cooldown <= 0) {
              grow(b);
              split(b, -ux, -uy);
              b.hueOff = ((b.hueOff || 0) + hueKick + rnd() * 18) % 360;
              b.hue = (baseHue + (b.hueOff || 0)) % 360;
              b.rot += (rnd() - 0.5) * 0.8;
              b.cooldown = 6;
              if (morphOnHit && rnd() < morphChance) b.kind = pickShape(shapeMode, rnd);
            }
          }
        }
      }

      // integrate + constraints
      const maskData = maskRef.current?.data ?? null;
      const bbox = maskRef.current?.bbox ?? { x: 0, y: 0, w, h };
      const pad = Math.max(24, Math.round(fontSize * 0.25));

      const resample = (p: Particle, mode: "inside" | "outside") => {
        const rrnd = mulberry32(seed + p.id * 99991 + Math.floor(now));
        const pt = samplePoint({ rnd: rrnd, maskData, mode, bbox, w, h, padding: pad });
        p.x = pt.x;
        p.y = pt.y;
        p.vx = 0;
        p.vy = 0;
      };

      const pushOutside = (p: Particle) => {
        if (!maskData) return;
        const cx = bbox.x + bbox.w / 2;
        const cy = bbox.y + bbox.h / 2;
        let vx = p.x - cx;
        let vy = p.y - cy;
        const m = Math.hypot(vx, vy) || 1;
        vx /= m;
        vy /= m;
        for (let k = 0; k < 30; k++) {
          if (!isInsideMask(maskData, p.x, p.y)) return;
          p.x += vx * 2.2;
          p.y += vy * 2.2;
        }
        if (isInsideMask(maskData, p.x, p.y)) resample(p, "outside");
      };

      const keepInside = (p: Particle) => {
        if (!maskData) return;
        for (let k = 0; k < 10; k++) {
          if (isInsideMask(maskData, p.x, p.y)) return;
          p.x -= p.vx * dt * 1.6;
          p.y -= p.vy * dt * 1.6;
        }
        if (!isInsideMask(maskData, p.x, p.y)) resample(p, "inside");
      };

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const previousX = p.x, previousY = p.y;
        const drag = p.kind === "cells" ? Math.pow(cellDamping, dt) : damping;
        p.vx *= drag;
        p.vy *= drag;
        if (p.kind === "cells") {
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 0.65) { p.vx *= 0.65 / speed; p.vy *= 0.65 / speed; }
          const targetScale = 1 + cellExpansion * Math.min(1, (bondCounts.get(p.id) || 0) / 6);
          p.scale += (targetScale - p.scale) * (1 - Math.exp(-cellGrowthRate * dt));
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.kind === "cells" && maskData) {
          const valid = insideOutside === "inside" ? isInsideMask(maskData, p.x, p.y) : !isInsideMask(maskData, p.x, p.y);
          if (!valid) {
            // Slide along the glyph boundary; cells never teleport to a new sample.
            const validAt = (x: number, y: number) => insideOutside === "inside" ? isInsideMask(maskData, x, y) : !isInsideMask(maskData, x, y);
            if (validAt(previousX, p.y)) { p.x = previousX; p.vx = 0; }
            else if (validAt(p.x, previousY)) { p.y = previousY; p.vy = 0; }
            else { p.x = previousX; p.y = previousY; p.vx = 0; p.vy = 0; }
          }
        } else if (insideOutside === "inside") keepInside(p);
        else if (maskData && isInsideMask(maskData, p.x, p.y)) pushOutside(p);

        // walls
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -0.65;
        }
        if (p.x > w) {
          p.x = w;
          p.vx *= -0.65;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -0.65;
        }
        if (p.y > h) {
          p.y = h;
          p.vy *= -0.65;
        }
      }

      // shrinkback
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const idle = p.lastCollisionAt > 0 ? now - p.lastCollisionAt : 0;
        const shouldShrink = p.kind !== "cells" && (p.shrinkMode || (idle > 30000 && p.scale > 1));
        if (shouldShrink) {
          p.scale = lerp(p.scale, 1, 0.03 * dt);
          if (p.scale <= 1.01) {
            p.scale = 1;
            p.shrinkMode = false;
          }
        }
      }

      // draw
      const glyphs = Array.from(particleLetters.replace(/\s/g, "") || "ABC");
      const palette = colorMode === "bi" ? [baseHue, secondHue] : colorMode === "tri" ? [baseHue, secondHue, thirdHue] : [baseHue];
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const hue = colorMode === "rainbow" ? p.hue : palette[p.id % palette.length];
        drawShape(ctx, p, now, glyphs[p.id % glyphs.length], fontFamily, hsl(hue, p.sat, p.lit, p.alpha), cellSoftness, dt);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    canvasW,
    canvasH,
    seed,
    insideOutside,
    shapeMode,
    fontFamily,
    fontWeight,
    fontSize,
    tracking,
    baselineY,
    interline,
    colorMode,
    secondHue,
    thirdHue,
    particleLetters,
    cellAttraction,
    cellRange,
    cellPressure,
    cellSoftness,
    cellDamping,
    cellAgitation,
    cellGrowthRate,
    cellExpansion,
    baseHue,
    baseSat,
    baseLit,
    bgHue,
    bgSat,
    bgLit,
    textHue,
    textSat,
    textLit,
    textAlpha,
    repelRadius,
    repelStrength,
    damping,
    jitter,
    collisionRadiusBoost,
    hueKick,
    morphOnHit,
    morphChance,
    splitOnHit,
    maxSplitsPerParticle,
    maxParticles,
    text,
  ]);

  const sizeKey = Object.entries(CANVAS_SIZES).find(([, option]) => option.width === canvasW && option.height === canvasH)?.[0] || "custom";

  const applyCanvasSize = (key: string) => {
    const option = CANVAS_SIZES[key as keyof typeof CANVAS_SIZES];
    if (!option) return;
    setCanvasW(option.width);
    setCanvasH(option.height);
    setBaselineY(Math.round(option.height * 0.58));
    setFontSize(clamp(Math.round(option.height * 0.46), 40, 520));
    setStatus(`Canvas ${option.label}`);
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

  const tabBtn = (id: typeof activeTab, label: string) => (
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
    <div className="relative h-full min-h-0 w-full overflow-hidden text-white" style={{ background: hsl(bgHue, bgSat, bgLit, 1) }}>
      <div className="absolute inset-x-5 bottom-[82px] top-[82px] flex items-center justify-center overflow-hidden md:inset-x-8" aria-label="Stage">
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="block h-auto w-auto max-h-full max-w-full"
          style={{ aspectRatio: `${canvasW} / ${canvasH}` }}
        />
      </div>

      <section
        className={`absolute left-5 top-[82px] z-20 flex w-[min(430px,calc(100%-40px))] flex-col bg-black/75 shadow-2xl backdrop-blur-xl transition-[max-height] md:left-8 ${
          panelOpen ? "max-h-[calc(100dvh-180px)]" : "max-h-11"
        }`}
        style={{ transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)` }}
        aria-label="Particle controls"
      >
        <div
          className="flex min-h-11 cursor-move touch-none items-center justify-between px-3 font-mono text-[11px] uppercase"
          onPointerDown={startPanelDrag}
          onPointerMove={movePanel}
          onPointerUp={endPanelDrag}
          onPointerCancel={endPanelDrag}
        >
          <span>{activeTab === "interaction" ? "Interactions" : activeTab}</span>
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
            <div role="tablist" aria-label="Particle controls" className="grid grid-cols-4 gap-1 p-2 pt-0">
              {tabBtn("source", "Source")}
              {tabBtn("glyph", "Glyph")}
              {tabBtn("colors", "Colors")}
              {tabBtn("interaction", "Motion")}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-1">
              {activeTab === "source" && (
                <div className="flex flex-col gap-4">
                  <button type="button"
                    className="h-10 bg-white/10 px-3 text-xs font-bold uppercase hover:bg-white/20"
                    onClick={() => {
                      setBubbleStart(false); setText("HEY"); setCanvasW(1280); setCanvasH(520);
                      setInsideOutside("inside"); setShapeMode("circles"); setCount(160);
                      setFontFamily("system-ui, -apple-system, Segoe UI, Inter, Arial");
                      setFontWeight(100); setFontSize(240); setTracking(10);
                      setBaselineY(300); setInterline(22);
                      setSize(8); setLineLen(26); setFilled(true); setStroke(2); setAlpha(0.9);
                      setBaseHue(330); setBaseSat(60); setBaseLit(70);
                      setBgHue(240); setBgSat(12); setBgLit(5); setTextAlpha(0);
                      setRepelRadius(28); setRepelStrength(0.9); setDamping(0.92); setJitter(0.08);
                      setCollisionRadiusBoost(0.8); setHueKick(28);
                      setMorphOnHit(false); setMorphChance(0); setSplitOnHit(false);
                      setMaxSplitsPerParticle(10); setSeed((value) => (value + 1) % 999999);
                      setStatus("Confetti preset loaded");
                    }}>
                    Preset · Confetti
                  </button>
                  <button type="button"
                    className="h-10 bg-white/10 px-3 text-xs font-bold uppercase hover:bg-white/20"
                    onClick={() => {
                      setBubbleStart(false); setText("DUST"); setCanvasW(1280); setCanvasH(520);
                      setInsideOutside("outside"); setShapeMode("circles"); setCount(520);
                      setFontFamily("system-ui, -apple-system, Segoe UI, Inter, Arial");
                      setFontWeight(900); setFontSize(180); setTracking(-2);
                      setBaselineY(300); setInterline(22);
                      setSize(1); setLineLen(26); setFilled(true); setStroke(2); setAlpha(0.7);
                      setBaseHue(0); setBaseSat(0); setBaseLit(70);
                      setBgHue(0); setBgSat(0); setBgLit(4); setTextAlpha(0);
                      setRepelRadius(6); setRepelStrength(0.15); setDamping(0.92); setJitter(0.03);
                      setCollisionRadiusBoost(0.37); setHueKick(0);
                      setMorphOnHit(false); setMorphChance(0); setSplitOnHit(false);
                      setMaxSplitsPerParticle(10); setSeed((value) => (value + 1) % 999999);
                      setStatus("Outside Cloud preset loaded");
                    }}>
                    Preset · Outside Cloud
                  </button>
                  <button type="button"
                    className="h-10 bg-white/10 px-3 text-xs font-bold uppercase hover:bg-white/20"
                    onClick={() => {
                      setBubbleStart(false); setText("LAB"); setCanvasW(1280); setCanvasH(840);
                      setInsideOutside("inside"); setShapeMode("circles"); setCount(241);
                      setFontFamily("Arial, Helvetica, sans-serif");
                      setFontWeight(700); setFontSize(520); setTracking(60);
                      setBaselineY(610); setInterline(22);
                      setSize(4); setLineLen(26); setFilled(true); setStroke(2); setAlpha(1);
                      setBaseHue(0); setBaseSat(0); setBaseLit(0);
                      setBgHue(170); setBgSat(66); setBgLit(25);
                      setTextHue(325); setTextSat(25); setTextLit(40); setTextAlpha(1);
                      setRepelRadius(6); setRepelStrength(0); setDamping(0.968); setJitter(0.073);
                      setCollisionRadiusBoost(0.37); setHueKick(0);
                      setMorphOnHit(true); setMorphChance(0.7); setSplitOnHit(false);
                      setMaxSplitsPerParticle(2); setSeed((value) => (value + 1) % 999999);
                      setStatus("Bubble Lab preset loaded");
                    }}>
                    Preset · Bubble Lab
                  </button>
                  <button type="button"
                    className="h-10 bg-white/10 px-3 text-xs font-bold uppercase hover:bg-white/20"
                    onClick={() => {
                      setBubbleStart(true); setText("R"); setCanvasW(1280); setCanvasH(800);
                      setInsideOutside("inside"); setShapeMode("circles"); setCount(342);
                      setFontFamily("system-ui, -apple-system, Segoe UI, Inter, Arial");
                      setFontWeight(900); setFontSize(520); setTracking(10);
                      setBaselineY(599); setInterline(22);
                      setSize(2); setLineLen(26); setFilled(true); setStroke(2); setAlpha(0.9);
                      setBaseHue(200); setBaseSat(85); setBaseLit(55);
                      setBgHue(220); setBgSat(30); setBgLit(6);
                      setTextHue(0); setTextSat(0); setTextLit(100); setTextAlpha(0);
                      setRepelRadius(9); setRepelStrength(1.37); setDamping(0.78); setJitter(0.049);
                      setCollisionRadiusBoost(1.18); setHueKick(3);
                      setMorphOnHit(true); setMorphChance(0.32); setSplitOnHit(false);
                      setMaxSplitsPerParticle(10); setSeed((value) => (value + 1) % 999999);
                      setStatus("Morph R preset loaded");
                    }}>
                    Preset · Morph R
                  </button>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/75">Placement</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(["inside", "outside"] as const).map((placement) => (
                        <button
                          key={placement}
                          className={`px-3 py-1.5 text-xs capitalize ${insideOutside === placement ? "bg-white text-black" : "bg-white/[0.07] hover:bg-white/15"}`}
                          onClick={() => setInsideOutside(placement)}
                        >
                          {placement}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Slider label="Element count" value={count} min={20} max={520} step={1} onChange={setCount} />
                  <div className="grid grid-cols-2 gap-3">
                    <NumberCommit label="Canvas W" value={canvasW} min={320} max={2400} onCommit={(v) => setCanvasW(Math.round(v))} />
                    <NumberCommit label="Canvas H" value={canvasH} min={240} max={1400} onCommit={(v) => setCanvasH(Math.round(v))} />
                  </div>
                  <button
                    className="bg-white/[0.07] px-3 py-2 text-xs uppercase hover:bg-white/15"
                    onClick={() => {
                      rebuild();
                      setStatus(`Rebuilt ${count} ${shapeMode}`);
                    }}
                  >
                    Rebuild particles
                  </button>
                  <div className="font-mono text-[10px] uppercase text-white/40">{status}</div>
                </div>
              )}

              {activeTab === "glyph" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberCommit label="Font size" value={fontSize} min={40} max={520} onCommit={(v) => setFontSize(Math.round(v))} />
                    <NumberCommit label="Weight" value={fontWeight} min={100} max={900} step={100} onCommit={(v) => setFontWeight(Math.round(v / 100) * 100)} />
                  </div>
                  <Slider label="Tracking" value={tracking} min={-20} max={60} step={1} onChange={setTracking} />
                  <Slider label="Baseline Y" value={baselineY} min={40} max={canvasH - 20} step={1} onChange={setBaselineY} />
                  <Slider label="Interline" value={interline} min={-40} max={160} step={1} onChange={setInterline} />
                  <TextCommit label="Font family" value={fontFamily} placeholder="e.g. Inter, Arial" onCommit={(v) => setFontFamily(v || fontFamily)} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-white/75">Fill</span>
                      <button className={`px-3 py-1.5 text-xs ${filled ? "bg-white text-black" : "bg-white/[0.07]"}`} onClick={() => setFilled((value) => !value)}>
                        {filled ? "On" : "Off"}
                      </button>
                    </div>
                    <NumberCommit label="Stroke" value={stroke} min={0.5} max={10} step={0.5} onCommit={setStroke} />
                  </div>
                  <Slider label="Alpha" value={alpha} min={0.1} max={1} step={0.01} onChange={setAlpha} />
                  <Slider label="Shape size" value={size} min={1} max={28} step={1} onChange={setSize} />
                  <Slider label="Line length" value={lineLen} min={4} max={120} step={1} onChange={setLineLen} />
                </div>
              )}

              {activeTab === "colors" && (
                <div className="space-y-5">
                  <ControlGroup title="Shapes">
                    <label className="flex items-center justify-between text-xs">Colour mode
                      <select aria-label="Colour mode" className="bg-neutral-900 p-2" value={colorMode} onChange={(event) => setColorMode(event.target.value)}>
                        <option value="mono">Mono</option><option value="bi">Two colours</option><option value="tri">Three colours</option><option value="rainbow">Rainbow</option>
                      </select>
                    </label>
                    {colorMode !== "mono" && colorMode !== "rainbow" && <Slider label="Second hue" value={secondHue} min={0} max={360} step={1} onChange={setSecondHue} />}
                    {colorMode === "tri" && <Slider label="Third hue" value={thirdHue} min={0} max={360} step={1} onChange={setThirdHue} />}
                    <Slider label="Hue" value={baseHue} min={0} max={360} step={1} onChange={setBaseHue} />
                    <Slider label="Saturation" value={baseSat} min={0} max={100} step={1} onChange={setBaseSat} />
                    <Slider label="Lightness" value={baseLit} min={0} max={100} step={1} onChange={setBaseLit} />
                  </ControlGroup>
                  <ControlGroup title="Background">
                    <Slider label="Hue" value={bgHue} min={0} max={360} step={1} onChange={setBgHue} />
                    <Slider label="Saturation" value={bgSat} min={0} max={100} step={1} onChange={setBgSat} />
                    <Slider label="Lightness" value={bgLit} min={0} max={100} step={1} onChange={setBgLit} />
                  </ControlGroup>
                  <ControlGroup title="Ghost text">
                    <Slider label="Hue" value={textHue} min={0} max={360} step={1} onChange={setTextHue} />
                    <Slider label="Saturation" value={textSat} min={0} max={100} step={1} onChange={setTextSat} />
                    <Slider label="Lightness" value={textLit} min={0} max={100} step={1} onChange={setTextLit} />
                    <Slider label="Alpha" value={textAlpha} min={0} max={1} step={0.005} onChange={setTextAlpha} />
                  </ControlGroup>
                </div>
              )}

              {activeTab === "interaction" && (
                <div className="space-y-5">
                  {shapeMode === "cells" ? <>
                    <ControlGroup title="Cell structures">
                      <Slider label="Attraction / cohesion" value={cellAttraction} min={0} max={2} step={0.01} onChange={setCellAttraction} />
                      <Slider label="Attraction range" value={cellRange} min={20} max={180} step={1} onChange={setCellRange} />
                    </ControlGroup>
                    <ControlGroup title="Membranes">
                      <Slider label="Contact pressure" value={cellPressure} min={0} max={2} step={0.01} onChange={setCellPressure} />
                      <Slider label="Membrane softness" value={cellSoftness} min={0} max={1} step={0.01} onChange={setCellSoftness} />
                    </ControlGroup>
                    <ControlGroup title="Cell motion">
                      <Slider label="Motion retention" value={cellDamping} min={0.5} max={0.97} step={0.001} onChange={setCellDamping} />
                      <Slider label="Agitation" value={cellAgitation} min={0} max={0.08} step={0.001} onChange={setCellAgitation} />
                    </ControlGroup>
                    <ControlGroup title="Growth">
                      <Slider label="Growth / recovery speed" value={cellGrowthRate} min={0} max={0.02} step={0.001} onChange={setCellGrowthRate} />
                      <Slider label="Maximum expansion" value={cellExpansion} min={0} max={1.5} step={0.01} onChange={setCellExpansion} />
                    </ControlGroup>
                  </> : <>
                  <ControlGroup title="Split">
                    <ToggleControl label="Split on collision" value={splitOnHit} onChange={setSplitOnHit} />
                    <Slider label="Reset after splits" value={maxSplitsPerParticle} min={1} max={25} step={1} onChange={setMaxSplitsPerParticle} />
                  </ControlGroup>
                  <ControlGroup title="Repulsion">
                    <Slider label="Repel radius" value={repelRadius} min={6} max={140} step={1} onChange={setRepelRadius} />
                    <Slider label="Repel strength" value={repelStrength} min={0} max={3} step={0.01} onChange={setRepelStrength} />
                    <Slider label="Damping" value={damping} min={0.75} max={0.995} step={0.001} onChange={setDamping} />
                    <Slider label="Jitter" value={jitter} min={0} max={0.6} step={0.001} onChange={setJitter} />
                  </ControlGroup>
                  <ControlGroup title="Collision">
                    <Slider label="Collision radius" value={collisionRadiusBoost} min={0.3} max={2} step={0.01} onChange={setCollisionRadiusBoost} />
                    <Slider label="Hue kick" value={hueKick} min={0} max={120} step={1} onChange={setHueKick} />
                    <ToggleControl label="Morph on hit" value={morphOnHit} onChange={setMorphOnHit} />
                    <Slider label="Morph chance" value={morphChance} min={0} max={1} step={0.01} onChange={setMorphChance} />
                  </ControlGroup>
                  </>}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <div className="absolute bottom-4 left-1/2 z-30 grid w-[min(1040px,calc(100%-40px))] -translate-x-1/2 grid-cols-[auto_minmax(160px,1fr)_auto_auto] items-center bg-black/75 p-1.5 font-mono text-[11px] uppercase shadow-2xl backdrop-blur-xl max-md:grid-cols-[auto_1fr_auto]">
        <button
          type="button"
          onClick={() => {
            setSeed((value) => (value + 1) % 999999);
            setStatus("Seed changed");
          }}
          className="h-10 min-w-20 bg-white/10 px-3 hover:bg-white/20"
        >
          Reseed
        </button>
        <label className="mx-1 flex h-10 min-w-0 items-center bg-white/[0.06] px-3 normal-case">
          <span className="mr-3 shrink-0 uppercase text-white/45">Text</span>
          <input value={text} onChange={(event) => setText(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Particle text" />
        </label>
        {shapeMode === "letters" && <input aria-label="Particle letters" title="Letters used as particles" value={particleLetters} onChange={(event) => setParticleLetters(event.target.value)} className="h-10 w-20 bg-white/[0.06] px-2 text-xs" />}
        <label className="flex h-10 items-center bg-white/[0.06] px-2">
          <span className="sr-only">Particle shape</span>
          <select value={shapeMode} onChange={(event) => { setShapeMode(event.target.value); if (event.target.value === "cells") setSize(Math.max(10, size)); }} className="bg-transparent px-1 outline-none" aria-label="Particle shape">
            <option value="circles">Circles</option>
            <option value="squares">Squares</option>
            <option value="lines">Lines</option>
            <option value="mix">Mix</option>
            <option value="cells">Organic cells</option>
            <option value="letters">Letters</option>
          </select>
        </label>
        <label className="ml-1 flex h-10 items-center bg-white/[0.06] px-2">
          <span className="sr-only">Canvas size</span>
          <select value={sizeKey} onChange={(event) => applyCanvasSize(event.target.value)} className="bg-transparent px-1 outline-none" aria-label="Canvas size">
            {sizeKey === "custom" && <option value="custom">{canvasW} × {canvasH}</option>}
            {Object.entries(CANVAS_SIZES).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 bg-white/[0.035] p-3">
      <h3 className="font-mono text-[10px] uppercase text-white/45">{title}</h3>
      {children}
    </section>
  );
}

function ToggleControl({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-white/75">{label}</span>
      <button className={`px-3 py-1.5 text-xs ${value ? "bg-white text-black" : "bg-white/[0.07]"}`} onClick={() => onChange(!value)}>
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}
