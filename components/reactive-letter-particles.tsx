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
  if (mode === "circles" || mode === "squares" || mode === "lines") return mode;
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
if (typeof process !== "undefined" && (process as any).env?.NODE_ENV !== "production") {
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
};

function drawShape(ctx: CanvasRenderingContext2D, p: Particle) {
  const scale = typeof p.scale === "number" ? p.scale : 1;
  const size = (p.size0 ?? 6) * scale;
  const len = (p.len0 ?? 26) * scale;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  ctx.fillStyle = hsl(p.hue, p.sat, p.lit, p.alpha);
  ctx.strokeStyle = hsl(p.hue, p.sat, p.lit, p.alpha);
  ctx.lineWidth = p.stroke;

  if (p.kind === "circles") {
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
        <div className="text-sm font-bold opacity-95">{label}</div>
        <div className="text-sm font-bold tabular-nums opacity-90">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
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
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-bold opacity-95">{label}</span>
      <input
        className="w-24 rounded-md border border-white/30 bg-black/80 px-2 py-1 text-sm font-bold tabular-nums outline-none focus:border-white/60"
        value={draft}
        inputMode="decimal"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft);
          if (!Number.isFinite(n)) {
            setDraft(String(value));
            return;
          }
          const clamped = clamp(n, min, max);
          onCommit(clamped);
          setDraft(String(clamped));
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
  useEffect(() => setDraft(value), [value]);

  return (
    <label className="flex items-start justify-between gap-3">
      <span className="text-sm font-bold opacity-95 pt-1">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          className="w-64 max-w-full resize-y rounded-md border border-white/30 bg-black/80 px-2 py-1 text-sm font-bold outline-none focus:border-white/60"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft)}
        />
      ) : (
        <input
          className="w-64 max-w-full rounded-md border border-white/30 bg-black/80 px-2 py-1 text-sm font-bold outline-none focus:border-white/60"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onCommit(draft)}
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
  const [text, setText] = useState("ANELLI\nSTUDIO");
  const [canvasW, setCanvasW] = useState(1280);
  const [canvasH, setCanvasH] = useState(520);

  const [activeTab, setActiveTab] = useState<"source" | "glyph" | "colors" | "interaction">("source");

  const [insideOutside, setInsideOutside] = useState<"inside" | "outside">("inside");
  const [shapeMode, setShapeMode] = useState("circles");
  const [count, setCount] = useState(160);

  const [fontFamily, setFontFamily] = useState("system-ui, -apple-system, Segoe UI, Inter, Arial");
  const [fontWeight, setFontWeight] = useState(900);
  const [fontSize, setFontSize] = useState(240);
  const [tracking, setTracking] = useState(10);
  const [baselineY, setBaselineY] = useState(300);
  const [interline, setInterline] = useState(22);

  const [size, setSize] = useState(6);
  const [lineLen, setLineLen] = useState(26);
  const [filled, setFilled] = useState(true);
  const [stroke, setStroke] = useState(2);
  const [alpha, setAlpha] = useState(0.9);

  const [repelRadius, setRepelRadius] = useState(28);
  const [repelStrength, setRepelStrength] = useState(0.9);
  const [damping, setDamping] = useState(0.92);
  const [jitter, setJitter] = useState(0.08);

  const [collisionRadiusBoost, setCollisionRadiusBoost] = useState(0.8);
  const [hueKick, setHueKick] = useState(28);
  const [morphOnHit, setMorphOnHit] = useState(true);
  const [morphChance, setMorphChance] = useState(0.22);

  // Shapes global color (HSL)
  const [baseHue, setBaseHue] = useState(200);
  const [baseSat, setBaseSat] = useState(85);
  const [baseLit, setBaseLit] = useState(55);

  // Background color (HSL)
  const [bgHue, setBgHue] = useState(220);
  const [bgSat, setBgSat] = useState(30);
  const [bgLit, setBgLit] = useState(6);

  // Text color (HSL) for ghost text
  const [textHue, setTextHue] = useState(0);
  const [textSat, setTextSat] = useState(0);
  const [textLit, setTextLit] = useState(100);
  const [textAlpha, setTextAlpha] = useState(0.08);

  // Split-on-collision
  const [splitOnHit, setSplitOnHit] = useState(false);
  const [maxSplitsPerParticle, setMaxSplitsPerParticle] = useState(10);
  const maxParticles = useMemo(() => Math.min(2400, Math.max(200, count * 6)), [count]);

  const [seed, setSeed] = useState(12345);
  const [status, setStatus] = useState("Ready");

  const rebuild = () => {
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

    setStatus(`Rebuilt: ${count} elements, ${insideOutside}, ${shapeMode}`);
  };

  // Rebuild on structural params
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, canvasW, canvasH, insideOutside, shapeMode, count, fontFamily, fontWeight, fontSize, tracking, baselineY, interline, seed]);

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
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
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
        p.vx += (rnd() - 0.5) * jitter;
        p.vy += (rnd() - 0.5) * jitter;
        if (p.cooldown > 0) p.cooldown -= 1 * dt;
      }

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
        p.vx *= damping;
        p.vy *= damping;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (insideOutside === "inside") keepInside(p);
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
        const shouldShrink = p.shrinkMode || (idle > 30000 && p.scale > 1);
        if (shouldShrink) {
          p.scale = lerp(p.scale, 1, 0.03 * dt);
          if (p.scale <= 1.01) {
            p.scale = 1;
            p.shrinkMode = false;
          }
        }
      }

      // draw
      for (let i = 0; i < parts.length; i++) drawShape(ctx, parts[i]);

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
  ]);

  const params = useMemo(
    () => ({
      text,
      canvasW,
      canvasH,
      insideOutside,
      shapeMode,
      count,
      fontFamily,
      fontWeight,
      fontSize,
      tracking,
      baselineY,
      interline,
      size,
      lineLen,
      filled,
      stroke,
      alpha,
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
      seed,
    }),
    [
      text,
      canvasW,
      canvasH,
      insideOutside,
      shapeMode,
      count,
      fontFamily,
      fontWeight,
      fontSize,
      tracking,
      baselineY,
      interline,
      size,
      lineLen,
      filled,
      stroke,
      alpha,
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
      seed,
    ]
  );

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button
      key={id}
      className={`rounded-xl border px-4 py-2 text-sm font-bold ${
        activeTab === id ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
      }`}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 text-white">
      <div className="rounded-2xl border border-white/30 bg-black/30 p-3">
        <canvas ref={canvasRef} className="block rounded-xl" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm font-bold opacity-90">{status}</div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-white/30 bg-black/80 px-3 py-2 text-sm font-bold hover:bg-black/80"
            onClick={() => {
              setSeed((s) => (s + 1) % 999999);
              setStatus("Seed changed");
            }}
          >
            Reseed
          </button>
          <button
            className="rounded-xl border border-white/30 bg-black/80 px-3 py-2 text-sm font-bold hover:bg-black/80"
            onClick={() => rebuild()}
          >
            Rebuild
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {tabBtn("source", "Source")}
        {tabBtn("glyph", "Glyph + Shapes")}
        {tabBtn("colors", "Colors")}
        {tabBtn("interaction", "Interactions")}
      </div>

      <div className="mt-3 rounded-2xl border border-white/30 bg-black/85 p-4 shadow-lg text-white">
        {activeTab === "source" && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold">Source</div>

            <TextCommit
              label="Text"
              value={text}
              placeholder="Type and click away to apply, use new lines"
              onCommit={(v) => {
                setText(v);
                setStatus("Text applied (on blur)");
              }}
              multiline
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold opacity-95">Placement</span>
              <div className="flex gap-2">
                <button
                  className={`rounded-xl border px-3 py-1.5 text-sm font-bold ${
                    insideOutside === "inside" ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
                  }`}
                  onClick={() => setInsideOutside("inside")}
                >
                  Inside
                </button>
                <button
                  className={`rounded-xl border px-3 py-1.5 text-sm font-bold ${
                    insideOutside === "outside" ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
                  }`}
                  onClick={() => setInsideOutside("outside")}
                >
                  Outside
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold opacity-95">Shapes</span>
              <select
                className="w-44 rounded-md border border-white/30 bg-black/80 px-2 py-1 text-sm font-bold outline-none focus:border-white/60"
                value={shapeMode}
                onChange={(e) => setShapeMode(e.target.value)}
              >
                <option value="circles">Circles</option>
                <option value="squares">Squares</option>
                <option value="lines">Lines</option>
                <option value="mix">Mix</option>
              </select>
            </div>

            <Slider label="Element count" value={count} min={20} max={520} step={1} onChange={setCount} />

            <div className="grid grid-cols-2 gap-3">
              <NumberCommit label="Canvas W" value={canvasW} min={320} max={2400} onCommit={(v) => setCanvasW(Math.round(v))} />
              <NumberCommit label="Canvas H" value={canvasH} min={240} max={1400} onCommit={(v) => setCanvasH(Math.round(v))} />
            </div>
          </div>
        )}

        {activeTab === "glyph" && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold">Glyph + Shapes</div>

            <div className="grid grid-cols-2 gap-3">
              <NumberCommit label="Font size" value={fontSize} min={40} max={520} onCommit={(v) => setFontSize(Math.round(v))} />
              <NumberCommit
                label="Weight"
                value={fontWeight}
                min={100}
                max={900}
                step={100}
                onCommit={(v) => setFontWeight(Math.round(v / 100) * 100)}
              />
            </div>

            <Slider label="Tracking" value={tracking} min={-20} max={60} step={1} onChange={setTracking} />
            <Slider label="Baseline Y" value={baselineY} min={40} max={canvasH - 20} step={1} onChange={setBaselineY} />
            <Slider label="Interline" value={interline} min={-40} max={160} step={1} onChange={setInterline} />

            <TextCommit label="Font family" value={fontFamily} placeholder="e.g. Inter, Arial" onCommit={(v) => setFontFamily(v || fontFamily)} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold opacity-95">Fill</span>
                <button
                  className={`rounded-xl border px-3 py-1.5 text-sm font-bold ${
                    filled ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
                  }`}
                  onClick={() => setFilled((x) => !x)}
                >
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
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold">Colors (HSL)</div>

            <div className="text-sm font-bold opacity-95">Shapes</div>
            <Slider label="Hue" value={baseHue} min={0} max={360} step={1} onChange={setBaseHue} />
            <Slider label="Sat" value={baseSat} min={0} max={100} step={1} onChange={setBaseSat} />
            <Slider label="Lit" value={baseLit} min={0} max={100} step={1} onChange={setBaseLit} />

            <div className="mt-2 text-sm font-bold opacity-95">Background</div>
            <Slider label="BG Hue" value={bgHue} min={0} max={360} step={1} onChange={setBgHue} />
            <Slider label="BG Sat" value={bgSat} min={0} max={100} step={1} onChange={setBgSat} />
            <Slider label="BG Lit" value={bgLit} min={0} max={100} step={1} onChange={setBgLit} />

            <div className="mt-2 text-sm font-bold opacity-95">Text</div>
            <Slider label="Text Hue" value={textHue} min={0} max={360} step={1} onChange={setTextHue} />
            <Slider label="Text Sat" value={textSat} min={0} max={100} step={1} onChange={setTextSat} />
            <Slider label="Text Lit" value={textLit} min={0} max={100} step={1} onChange={setTextLit} />
            <Slider label="Text Alpha" value={textAlpha} min={0} max={0.5} step={0.005} onChange={setTextAlpha} />
          </div>
        )}

        {activeTab === "interaction" && (
          <div className="flex flex-col gap-3">
            <div className="text-sm font-bold">Interactions</div>

            <div className="text-sm font-bold opacity-95">Split</div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold opacity-95">Split on collision</span>
              <button
                className={`rounded-xl border px-3 py-1.5 text-sm font-bold ${
                  splitOnHit ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
                }`}
                onClick={() => setSplitOnHit((x) => !x)}
              >
                {splitOnHit ? "On" : "Off"}
              </button>
            </div>
            <Slider label="Reset after splits" value={maxSplitsPerParticle} min={1} max={25} step={1} onChange={setMaxSplitsPerParticle} />

            <div className="mt-2 text-sm font-bold opacity-95">Repulsion</div>
            <Slider label="Repel radius" value={repelRadius} min={6} max={140} step={1} onChange={setRepelRadius} />
            <Slider label="Repel strength" value={repelStrength} min={0} max={3} step={0.01} onChange={setRepelStrength} />
            <Slider label="Damping" value={damping} min={0.75} max={0.995} step={0.001} onChange={setDamping} />
            <Slider label="Jitter" value={jitter} min={0} max={0.6} step={0.001} onChange={setJitter} />

            <div className="mt-2 text-sm font-bold opacity-95">Collision</div>
            <Slider label="Collision radius" value={collisionRadiusBoost} min={0.3} max={2.0} step={0.01} onChange={setCollisionRadiusBoost} />
            <Slider label="Hue kick" value={hueKick} min={0} max={120} step={1} onChange={setHueKick} />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold opacity-95">Morph on hit</span>
              <button
                className={`rounded-xl border px-3 py-1.5 text-sm font-bold ${
                  morphOnHit ? "border-white/60 bg-black/90" : "border-white/30 bg-black/80 hover:bg-black/80"
                }`}
                onClick={() => setMorphOnHit((x) => !x)}
              >
                {morphOnHit ? "On" : "Off"}
              </button>
            </div>
            <Slider label="Morph chance" value={morphChance} min={0} max={1} step={0.01} onChange={setMorphChance} />
          </div>
        )}
      </div>

      <div className="mt-3 text-[10px] opacity-40 select-text">params: {JSON.stringify(params)}</div>
    </div>
  );
}
