import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Particle Type Distorter (single-file preview) + Recording
 *
 * Changes:
 * - Distort only (no upper mode tabs)
 * - No Preview on/off
 * - "Upload your own" font loader (FontFace)
 * - Recording:
 *    - Export canvas 1920x1080
 *    - FPS 30/60
 *    - MediaRecorder tries MP4/H.264, falls back to WebM if unsupported
 */

type Vec2 = { x: number; y: number };

type NoiseParticle = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  ph: number;
};

type GlyphParticle = {
  x0: number;
  y0: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  hm?: number;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller transform for gaussian
function gaussian(rand: () => number) {
  let u = 0,
    v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function fmtFont({
  family,
  size,
  weight,
  style,
}: {
  family: string;
  size: number;
  weight: number;
  style: string;
}) {
  const st = style === "normal" ? "" : style + " ";
  return `${st}${weight} ${size}px ${family}`;
}

function createOffscreenCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.floor(w));
  c.height = Math.max(1, Math.floor(h));
  return c;
}

function computeTextMetrics(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  tracking: number
) {
  ctx.font = font;
  ctx.textBaseline = "alphabetic";

  if (!tracking) {
    const m = ctx.measureText(text);
    const asc = m.actualBoundingBoxAscent || 0;
    const desc = m.actualBoundingBoxDescent || 0;
    return { width: m.width, ascent: asc, descent: desc, height: asc + desc };
  }

  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const m = ctx.measureText(ch);
    w += m.width;
    if (i < text.length - 1) w += tracking;
  }

  const mAll = ctx.measureText(text);
  const asc = mAll.actualBoundingBoxAscent || 0;
  const desc = mAll.actualBoundingBoxDescent || 0;
  return { width: w, ascent: asc, descent: desc, height: asc + desc };
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number
) {
  if (!tracking) {
    ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    ctx.fillText(ch, cursor, y);
    const m = ctx.measureText(ch);
    cursor += m.width + (i < text.length - 1 ? tracking : 0);
  }
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap " +
        (active
          ? "bg-white text-black"
          : "bg-white/10 text-white hover:bg-white/15")
      }
      type="button"
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  rightLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  rightLabel?: string | number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-white/85">{label}</div>
        <div className="text-xs font-mono text-white/70">
          {rightLabel ?? value}
        </div>
      </div>
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
      <span className="text-xs font-bold text-white/85">{label}</span>
      <input
        className="w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1 text-sm text-white outline-none focus:border-white/35"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onBlur={(e) => {
          const v = clamp(
            Number(e.target.value),
            min ?? -Infinity,
            max ?? Infinity
          );
          onChange(v);
        }}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-white/85">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={
          "w-12 h-7 rounded-full p-1 border transition " +
          (checked
            ? "bg-white text-black border-white/50"
            : "bg-white/10 text-white border-white/15")
        }
        aria-pressed={checked}
        type="button"
      >
        <div
          className={
            "h-5 w-5 rounded-full transition " +
            (checked ? "translate-x-5 bg-black" : "translate-x-0 bg-white")
          }
        />
      </button>
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
      <span className="text-xs font-bold text-white/85">{label}</span>
      <select
        className="w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1 text-sm text-white outline-none focus:border-white/35"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-black">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function hslToCss(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpColor(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const r = Math.round(lerp(A.r, B.r, t));
  const g = Math.round(lerp(A.g, B.g, t));
  const bb = Math.round(lerp(A.b, B.b, t));
  return `rgb(${r},${g},${bb})`;
}

// Curl-ish field using trig
function noiseVector(
  x: number,
  y: number,
  t: number,
  freq: number,
  curl: number
) {
  const nx = x * freq;
  const ny = y * freq;
  const a =
    Math.sin(nx * 1.7 + t * 0.9) +
    Math.cos(ny * 1.3 - t * 0.8) +
    Math.sin((nx + ny) * 0.9 + t * 0.6);
  const b =
    Math.cos(nx * 1.1 - t * 0.7) +
    Math.sin(ny * 1.9 + t * 0.85) +
    Math.cos((nx - ny) * 0.8 - t * 0.55);

  const ang = (a + b) * 0.9 * curl;
  const vx = Math.cos(ang);
  const vy = Math.sin(ang);
  return { vx: Number.isFinite(vx) ? vx : 0, vy: Number.isFinite(vy) ? vy : 0 };
}

type PointerNorm = { nx: number; ny: number; inside: boolean };

const EXPORT_W = 1920;
const EXPORT_H = 1080;

function pickRecorderMimeType() {
  const candidates = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', // common h264 baseline+AAC
    'video/mp4;codecs="avc1.42E01E"',
    "video/mp4;codecs=h264",
    "video/mp4",
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    "video/webm",
  ];

  const MR: any = (window as any).MediaRecorder;
  if (!MR || !MR.isTypeSupported) return { mimeType: "", ext: "webm" };

  for (const c of candidates) {
    if (MR.isTypeSupported(c)) {
      const ext = c.includes("mp4") ? "mp4" : "webm";
      return { mimeType: c, ext };
    }
  }
  return { mimeType: "", ext: "webm" };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pointer normalized (0..1), so we can map it to both screen & export sizes
  const pointerRef = useRef<PointerNorm>({ nx: 0.5, ny: 0.5, inside: false });

  // Recording
  const [recFps, setRecFps] = useState<30 | 60>(60);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recMetaRef = useRef<{ ext: string; mimeType: string }>({
    ext: "webm",
    mimeType: "",
  });

  // UI tabs (lower)
  const [tab, setTab] = useState<string>("distort");

  // Colors
  const [bgH, setBgH] = useState(240);
  const [bgS, setBgS] = useState(12);
  const [bgL, setBgL] = useState(6);

  const [txH, setTxH] = useState(0);
  const [txS, setTxS] = useState(0);
  const [txL, setTxL] = useState(100);

  // Type
  const [text, setText] = useState("ANELLI");
  const [fontFamily, setFontFamily] = useState(
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
  );
  const [fontWeight, setFontWeight] = useState(850);
  const [fontStyle, setFontStyle] = useState("normal");
  const [fontSize, setFontSize] = useState(180);
  const [tracking, setTracking] = useState(-2);

  // Upload font
  const [uploadedFontName, setUploadedFontName] = useState("MyUploadedFont");
  const [uploadedFontStatus, setUploadedFontStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  // Noise generator
  const [noiseType, setNoiseType] = useState("liquid"); // liquid | gaussian

  // Gaussian noise particles (texture)
  const [seed, setSeed] = useState(4);
  const [particleCount, setParticleCount] = useState(180);
  const [sigma, setSigma] = useState(160);
  const [particleRadius, setParticleRadius] = useState(2);
  const [noiseGain, setNoiseGain] = useState(1.2);
  const [noiseSpeed, setNoiseSpeed] = useState(0.65);
  const [animateNoise, setAnimateNoise] = useState(true);

  // Liquid turbulence (procedural)
  const [turbScale, setTurbScale] = useState(0.9);
  const [turbWarp, setTurbWarp] = useState(1.25);
  const [turbContrast, setTurbContrast] = useState(1.25);
  const [turbSpeed, setTurbSpeed] = useState(0.8);
  const [turbBlur, setTurbBlur] = useState(10);
  const [turbOctaves, setTurbOctaves] = useState(3);

  // Distort gating / mix
  const [noiseApply, setNoiseApply] = useState(0.85);
  const [distortAmount, setDistortAmount] = useState(1.0);

  // Noise overlay
  const [noiseOpacity, setNoiseOpacity] = useState(0.22);
  const [noiseColorMode, setNoiseColorMode] = useState("none"); // none | mono | gradient
  const [noiseColorA, setNoiseColorA] = useState("#ffffff");
  const [noiseColorB, setNoiseColorB] = useState("#7cffea");
  const [noiseGradientAngle, setNoiseGradientAngle] = useState(0);

  // Heatmap
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [heatA, setHeatA] = useState("#00d5ff");
  const [heatB, setHeatB] = useState("#ff3d9a");
  const [heatIntensity, setHeatIntensity] = useState(1.0);

  // Type-to-particles
  const [sampleStep, setSampleStep] = useState(5);
  const [alphaThreshold, setAlphaThreshold] = useState(12);
  const [jitter, setJitter] = useState(0.65);
  const [particleSize, setParticleSize] = useState(1.6);
  const [particleShape, setParticleShape] = useState("circle"); // circle | square | line
  const [outlineOnly, setOutlineOnly] = useState(false);

  // Field
  const [flowFreq, setFlowFreq] = useState(0.006);
  const [flowCurl, setFlowCurl] = useState(2.2);
  const [flowStrength, setFlowStrength] = useState(26);
  const [mouseRadius, setMouseRadius] = useState(240);
  const [mouseStrength, setMouseStrength] = useState(52);
  const [mouseSoftness, setMouseSoftness] = useState(0.55);
  const [mouseMode, setMouseMode] = useState("repel"); // repel | attract
  const [returnToBase, setReturnToBase] = useState(0.08);
  const [velocityDamping, setVelocityDamping] = useState(0.9);

  const bg = useMemo(() => hslToCss(bgH, bgS, bgL), [bgH, bgS, bgL]);
  const textColor = useMemo(() => hslToCss(txH, txS, txL), [txH, txS, txL]);

  const settings = useMemo(
    () => ({
      bg,
      textColor,
      type: {
        text,
        font: fmtFont({
          family: fontFamily,
          size: fontSize,
          weight: fontWeight,
          style: fontStyle,
        }),
        tracking,
      },
      noise: {
        seed,
        particleCount,
        sigma,
        particleRadius,
        noiseGain,
        noiseSpeed,
        animateNoise,
      },
      glyphParticles: {
        sampleStep,
        alphaThreshold,
        jitter,
        particleSize,
        particleShape,
        outlineOnly,
      },
      field: {
        flowFreq,
        flowCurl,
        flowStrength,
        mouseRadius,
        mouseStrength,
        mouseSoftness,
        mouseMode,
        returnToBase,
        velocityDamping,
        noiseApply,
        distortAmount,
      },
      noiseTex: {
        noiseType,
        turbScale,
        turbWarp,
        turbContrast,
        turbSpeed,
        turbBlur,
        turbOctaves,
      },
      noiseOverlay: {
        noiseOpacity,
        noiseColorMode,
        noiseColorA,
        noiseColorB,
        noiseGradientAngle,
      },
      heatmap: {
        heatmapOn,
        heatA,
        heatB,
        heatIntensity,
      },
    }),
    [
      bg,
      textColor,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      tracking,
      seed,
      particleCount,
      sigma,
      particleRadius,
      noiseGain,
      noiseSpeed,
      animateNoise,
      sampleStep,
      alphaThreshold,
      jitter,
      particleSize,
      particleShape,
      outlineOnly,
      flowFreq,
      flowCurl,
      flowStrength,
      mouseRadius,
      mouseStrength,
      mouseSoftness,
      mouseMode,
      returnToBase,
      velocityDamping,
      noiseApply,
      distortAmount,
      noiseType,
      turbScale,
      turbWarp,
      turbContrast,
      turbSpeed,
      turbBlur,
      turbOctaves,
      noiseOpacity,
      noiseColorMode,
      noiseColorA,
      noiseColorB,
      noiseGradientAngle,
      heatmapOn,
      heatA,
      heatB,
      heatIntensity,
    ]
  );

  // Two “pipelines”: screen & export (to avoid scaling artifacts)
  type Pipe = {
    offNoise: HTMLCanvasElement | null;
    offNoiseField: HTMLCanvasElement | null;
    offType: HTMLCanvasElement | null;

    noiseParticles: NoiseParticle[];
    lastNoiseParams:
      | null
      | {
          seed: number;
          count: number;
          sigma: number;
          noiseType: string;
          w: number;
          h: number;
        };

    glyphParticles: GlyphParticle[];
    lastGlyphParams: any | null;
  };

  const screenPipeRef = useRef<Pipe>({
    offNoise: null,
    offNoiseField: null,
    offType: null,
    noiseParticles: [],
    lastNoiseParams: null,
    glyphParticles: [],
    lastGlyphParams: null,
  });

  const exportPipeRef = useRef<Pipe>({
    offNoise: null,
    offNoiseField: null,
    offType: null,
    noiseParticles: [],
    lastNoiseParams: null,
    glyphParticles: [],
    lastGlyphParams: null,
  });

  const timeRef = useRef(0);

  async function onUploadFont(file: File) {
    try {
      setUploadedFontStatus("loading");
      const data = await file.arrayBuffer();
      const name = (uploadedFontName || "MyUploadedFont").trim() || "MyUploadedFont";
      const face = new FontFace(name, data);
      const loaded = await face.load();
      (document as any).fonts.add(loaded);
      setFontFamily(
        `"${name}", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
      );
      setUploadedFontStatus("ready");
    } catch (e) {
      console.error(e);
      setUploadedFontStatus("error");
    }
  }

  function rebuildNoiseParticlesInto(pipe: Pipe, w: number, h: number) {
    const rand = mulberry32(settings.noise.seed);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const s = Math.max(1, settings.noise.sigma);
    const p: NoiseParticle[] = [];

    for (let i = 0; i < settings.noise.particleCount; i++) {
      const gx = gaussian(rand);
      const gy = gaussian(rand);
      const x = cx + gx * s;
      const y = cy + gy * s;
      const a = rand() * Math.PI * 2;
      const sp = lerp(0.2, 1.0, rand());
      p.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        ph: rand() * 1000,
      });
    }

    pipe.noiseParticles = p;
    pipe.lastNoiseParams = {
      seed: settings.noise.seed,
      count: settings.noise.particleCount,
      sigma: settings.noise.sigma,
      noiseType: settings.noiseTex.noiseType,
      w,
      h,
    };
  }

  function renderTypeToOffscreen(pipe: Pipe, w: number, h: number) {
    if (!pipe.offType) pipe.offType = createOffscreenCanvas(w, h);
    if (pipe.offType.width !== w || pipe.offType.height !== h) {
      pipe.offType = createOffscreenCanvas(w, h);
    }
    const tctx = pipe.offType.getContext("2d");
    if (!tctx) return;

    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, w, h);

    tctx.fillStyle = "rgba(0,0,0,0)";
    tctx.fillRect(0, 0, w, h);

    tctx.fillStyle = "rgba(255,255,255,1)";
    tctx.font = settings.type.font;
    tctx.textBaseline = "alphabetic";
    tctx.textAlign = "left";

    const metrics = computeTextMetrics(
      tctx,
      settings.type.text,
      settings.type.font,
      settings.type.tracking
    );

    const x0 = (w - metrics.width) * 0.5;
    const y0 = h * 0.52 + metrics.ascent * 0.25;

    drawTrackedText(tctx, settings.type.text, x0, y0, settings.type.tracking);
  }

  function rebuildGlyphParticlesInto(pipe: Pipe, w: number, h: number) {
    const { sampleStep, alphaThreshold, jitter, outlineOnly } =
      settings.glyphParticles;

    renderTypeToOffscreen(pipe, w, h);
    if (!pipe.offType) return;

    const tctx = pipe.offType.getContext("2d");
    if (!tctx) return;

    const img = tctx.getImageData(0, 0, w, h);
    const data = img.data;

    const rand = mulberry32(
      (settings.noise.seed * 1315423911) ^
        settings.type.text.length ^
        (settings.type.tracking << 8)
    );

    const pts: GlyphParticle[] = [];

    const isOn = (x: number, y: number) => {
      const ix = (y * w + x) * 4 + 3;
      return data[ix] > alphaThreshold;
    };

    for (let y = 1; y < h - 1; y += sampleStep) {
      for (let x = 1; x < w - 1; x += sampleStep) {
        const a = data[(y * w + x) * 4 + 3];
        if (a <= alphaThreshold) continue;

        if (outlineOnly) {
          if (
            isOn(x - 1, y) &&
            isOn(x + 1, y) &&
            isOn(x, y - 1) &&
            isOn(x, y + 1)
          ) {
            continue;
          }
        }

        const jx = (rand() - 0.5) * sampleStep * jitter;
        const jy = (rand() - 0.5) * sampleStep * jitter;

        pts.push({
          x0: x + jx,
          y0: y + jy,
          x: x + jx,
          y: y + jy,
          vx: 0,
          vy: 0,
          ang: rand() * Math.PI * 2,
          hm: 0,
        });
      }
    }

    pipe.glyphParticles = pts;
    pipe.lastGlyphParams = {
      text: settings.type.text,
      font: settings.type.font,
      tracking: settings.type.tracking,
      sampleStep: settings.glyphParticles.sampleStep,
      alphaThreshold: settings.glyphParticles.alphaThreshold,
      jitter: settings.glyphParticles.jitter,
      outlineOnly: settings.glyphParticles.outlineOnly,
      seed: settings.noise.seed,
      w,
      h,
    };
  }

  function ensurePipeBuffers(pipe: Pipe, w: number, h: number) {
    if (!pipe.offNoise || pipe.offNoise.width !== w || pipe.offNoise.height !== h) {
      pipe.offNoise = createOffscreenCanvas(w, h);
    }
    // Small luminance proxy used to sample the *rendered* noise texture cheaply.
    // It keeps deformation visually tied to the animation without reading millions
    // of pixels from the full-resolution canvas every frame.
    const fieldW = 96;
    const fieldH = Math.max(48, Math.round((h / Math.max(1, w)) * fieldW));
    if (!pipe.offNoiseField || pipe.offNoiseField.width !== fieldW || pipe.offNoiseField.height !== fieldH) {
      pipe.offNoiseField = createOffscreenCanvas(fieldW, fieldH);
    }
    if (!pipe.offType || pipe.offType.width !== w || pipe.offType.height !== h) {
      pipe.offType = createOffscreenCanvas(w, h);
    }
  }

  function renderNoiseInto(pipe: Pipe, w: number, h: number, t: number) {
    ensurePipeBuffers(pipe, w, h);
    if (!pipe.offNoise) return;
    const nCtx = pipe.offNoise.getContext("2d");
    if (!nCtx) return;

    nCtx.setTransform(1, 0, 0, 1, 0, 0);
    nCtx.clearRect(0, 0, w, h);
    nCtx.fillStyle = settings.bg;
    nCtx.fillRect(0, 0, w, h);

    // Ensure gaussian particles when needed
    const lp = pipe.lastNoiseParams;
    const needsRebuild =
      !lp ||
      lp.seed !== settings.noise.seed ||
      lp.count !== settings.noise.particleCount ||
      lp.sigma !== settings.noise.sigma ||
      lp.noiseType !== settings.noiseTex.noiseType ||
      lp.w !== w ||
      lp.h !== h;

    if (settings.noiseTex.noiseType === "gaussian") {
      if (needsRebuild) rebuildNoiseParticlesInto(pipe, w, h);

      const np = pipe.noiseParticles;
      if (settings.noise.animateNoise) {
        const sp = settings.noise.noiseSpeed;
        for (let i = 0; i < np.length; i++) {
          const p = np[i];
          const n1 = Math.sin(t * sp + p.ph);
          const n2 = Math.cos(t * sp * 0.9 + p.ph * 0.7);
          p.x = p.ox + p.vx * 40 * n1;
          p.y = p.oy + p.vy * 40 * n2;
        }
      }

      const pr = settings.noise.particleRadius;
      const gain = settings.noise.noiseGain;

      nCtx.globalCompositeOperation = "lighter";
      for (let i = 0; i < np.length; i++) {
        const p = np[i];
        const g = nCtx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          Math.max(1, pr * 14)
        );
        g.addColorStop(0, `rgba(255,255,255,${0.22 * gain})`);
        g.addColorStop(0.55, `rgba(255,255,255,${0.06 * gain})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        nCtx.fillStyle = g;
        nCtx.beginPath();
        nCtx.arc(p.x, p.y, pr * 14, 0, Math.PI * 2);
        nCtx.fill();
      }
      nCtx.globalCompositeOperation = "source-over";
    } else {
      // Liquid turbulence
      const lw = Math.max(120, Math.floor(w / 5));
      const lh = Math.max(80, Math.floor(h / 5));
      const low = createOffscreenCanvas(lw, lh);
      const lctx = low.getContext("2d")!;
      const img = lctx.createImageData(lw, lh);
      const data = img.data;

      const s = Math.max(0.05, settings.noiseTex.turbScale);
      const warp = settings.noiseTex.turbWarp;
      const sp = settings.noiseTex.turbSpeed;
      const oct = clamp(settings.noiseTex.turbOctaves, 1, 5);
      const contrast = settings.noiseTex.turbContrast;

      const base = settings.noise.seed * 0.00123;
      const tt = settings.noise.animateNoise ? t * sp : 0;

      const fbm = (x: number, y: number) => {
        let amp = 0.5;
        let freq = 1.0;
        let sum = 0;
        for (let i = 0; i < oct; i++) {
          const nx = x * freq;
          const ny = y * freq;
          const v =
            Math.sin(nx * 2.0 + base + tt) +
            Math.cos(ny * 2.3 - base - tt * 0.9) +
            Math.sin((nx + ny) * 1.4 + tt * 0.7);
          sum += v * amp;
          freq *= 1.9;
          amp *= 0.55;
        }
        return sum;
      };

      for (let yy = 0; yy < lh; yy++) {
        for (let xx = 0; xx < lw; xx++) {
          const u = (xx / lw - 0.5) * 2;
          const v = (yy / lh - 0.5) * 2;
          const wx = fbm(u * 1.4 * s, v * 1.4 * s);
          const wy = fbm((u + 10.0) * 1.2 * s, (v - 7.0) * 1.2 * s);
          const n = fbm(u * s + wx * 0.25 * warp, v * s + wy * 0.25 * warp);

          let val = 0.5 + 0.14 * n;
          val = clamp(0.5 + (val - 0.5) * contrast, 0, 1);

          const idx = (yy * lw + xx) * 4;
          const cc = Math.floor(val * 255);
          data[idx] = cc;
          data[idx + 1] = cc;
          data[idx + 2] = cc;
          data[idx + 3] = 255;
        }
      }

      lctx.putImageData(img, 0, 0);

      nCtx.save();
      nCtx.imageSmoothingEnabled = true;
      nCtx.filter = `blur(${Math.max(0, settings.noiseTex.turbBlur)}px)`;
      nCtx.globalAlpha = 0.9;
      nCtx.globalCompositeOperation = "screen";
      nCtx.drawImage(low, 0, 0, w, h);
      nCtx.restore();
      nCtx.filter = "none";
      nCtx.globalCompositeOperation = "source-over";
    }

    // Optional noise tint
    const ov = settings.noiseOverlay;
    if (ov.noiseColorMode !== "none") {
      nCtx.save();
      nCtx.globalCompositeOperation = "source-atop";
      if (ov.noiseColorMode === "mono") {
        nCtx.fillStyle = ov.noiseColorA;
      } else {
        const ang = (ov.noiseGradientAngle * Math.PI) / 180;
        const cx = w * 0.5;
        const cy = h * 0.5;
        const dx = Math.cos(ang) * w * 0.6;
        const dy = Math.sin(ang) * h * 0.6;
        const g = nCtx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        g.addColorStop(0, ov.noiseColorA);
        g.addColorStop(1, ov.noiseColorB);
        nCtx.fillStyle = g;
      }
      nCtx.fillRect(0, 0, w, h);
      nCtx.restore();
    }
  }

  function ensureGlyphs(pipe: Pipe, w: number, h: number) {
    const lastG = pipe.lastGlyphParams;
    const needGlyph =
      !lastG ||
      lastG.text !== settings.type.text ||
      lastG.font !== settings.type.font ||
      lastG.tracking !== settings.type.tracking ||
      lastG.sampleStep !== settings.glyphParticles.sampleStep ||
      lastG.alphaThreshold !== settings.glyphParticles.alphaThreshold ||
      lastG.jitter !== settings.glyphParticles.jitter ||
      lastG.outlineOnly !== settings.glyphParticles.outlineOnly ||
      lastG.seed !== settings.noise.seed ||
      lastG.w !== w ||
      lastG.h !== h;

    if (needGlyph) rebuildGlyphParticlesInto(pipe, w, h);
  }

  // Pointer listeners (normalized)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const toCanvasXY = (e: PointerEvent): Vec2 => {
      const rect = c.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (c.width / rect.width);
      const y = (e.clientY - rect.top) * (c.height / rect.height);
      return { x, y };
    };

    const setNorm = (x: number, y: number, inside: boolean) => {
      const nx = c.width > 0 ? clamp(x / c.width, 0, 1) : 0.5;
      const ny = c.height > 0 ? clamp(y / c.height, 0, 1) : 0.5;
      pointerRef.current = { nx, ny, inside };
    };

    const onMove = (e: PointerEvent) => {
      const { x, y } = toCanvasXY(e);
      setNorm(x, y, true);
    };
    const onEnter = (e: PointerEvent) => {
      const { x, y } = toCanvasXY(e);
      setNorm(x, y, true);
    };
    const onDown = (e: PointerEvent) => {
      const { x, y } = toCanvasXY(e);
      setNorm(x, y, true);
    };
    const onLeave = () => {
      pointerRef.current.inside = false;
    };

    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerenter", onEnter);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointerleave", onLeave);

    return () => {
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerenter", onEnter);
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Resize (screen canvas)
  useEffect(() => {
    function resize() {
      const el = containerRef.current;
      const c = canvasRef.current;
      if (!el || !c) return;

      const rect = el.getBoundingClientRect();
      const w = Math.max(480, Math.floor(rect.width));
      const h = Math.max(260, Math.floor(rect.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Ensure export canvas exists (not in DOM)
  useEffect(() => {
    if (!exportCanvasRef.current) {
      const ex = document.createElement("canvas");
      ex.width = EXPORT_W;
      ex.height = EXPORT_H;
      exportCanvasRef.current = ex;
    }
  }, []);

  function startRecording() {
    if (isRecording) return;

    const ex = exportCanvasRef.current;
    if (!ex) return;

    // Ensure size
    ex.width = EXPORT_W;
    ex.height = EXPORT_H;

    const stream = ex.captureStream(recFps);
    const { mimeType, ext } = pickRecorderMimeType();
    recMetaRef.current = { mimeType, ext };

    recordedChunksRef.current = [];

    let mr: MediaRecorder;
    try {
      mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (e) {
      console.error("MediaRecorder init failed:", e);
      alert("Recording not supported in this browser for the chosen codec.");
      return;
    }

    mr.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };

    mr.onstop = () => {
      const chunks = recordedChunksRef.current;
      const mt = recMetaRef.current.mimeType || "video/webm";
      const blob = new Blob(chunks, { type: mt });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
      a.href = url;
      a.download = `particle-type-distorter_${EXPORT_W}x${EXPORT_H}_${recFps}fps_${ts}.${recMetaRef.current.ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    mediaRecorderRef.current = mr;
    mr.start(1000); // gather chunks every second
    setIsRecording(true);
  }

  function stopRecording() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state !== "inactive") mr.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  // Main render loop: draw to screen + export every frame
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const screenCtx = c.getContext("2d");
    if (!screenCtx) return;

    const drawScene = (
      D: CanvasRenderingContext2D,
      W: number,
      H: number,
      pipe: Pipe,
      t: number
    ) => {
      ensurePipeBuffers(pipe, W, H);
      ensureGlyphs(pipe, W, H);
      renderNoiseInto(pipe, W, H, t);

      const offNoise = pipe.offNoise!;
      const pts = pipe.glyphParticles;

      // Build a low-res field from the actual rendered noise texture.
      const fieldCanvas = pipe.offNoiseField!;
      const fieldCtx = fieldCanvas.getContext("2d");
      let fieldData: ImageData | null = null;
      if (fieldCtx) {
        fieldCtx.setTransform(1, 0, 0, 1, 0, 0);
        fieldCtx.clearRect(0, 0, fieldCanvas.width, fieldCanvas.height);
        fieldCtx.drawImage(offNoise, 0, 0, fieldCanvas.width, fieldCanvas.height);
        fieldData = fieldCtx.getImageData(0, 0, fieldCanvas.width, fieldCanvas.height);
      }

      const sampleNoiseLuma = (x: number, y: number) => {
        if (!fieldData) return 0.5;
        const fx = clamp(Math.round((x / Math.max(1, W)) * (fieldCanvas.width - 1)), 0, fieldCanvas.width - 1);
        const fy = clamp(Math.round((y / Math.max(1, H)) * (fieldCanvas.height - 1)), 0, fieldCanvas.height - 1);
        const idx = (fy * fieldCanvas.width + fx) * 4;
        const d = fieldData.data;
        return (d[idx] * 0.2126 + d[idx + 1] * 0.7152 + d[idx + 2] * 0.0722) / 255;
      };

      // Background
      D.setTransform(1, 0, 0, 1, 0, 0);
      D.clearRect(0, 0, W, H);
      D.fillStyle = settings.bg;
      D.fillRect(0, 0, W, H);

      if (!pts || pts.length === 0) {
        D.fillStyle = settings.textColor;
        D.font = settings.type.font;
        D.textBaseline = "alphabetic";
        D.textAlign = "center";
        D.fillText(settings.type.text || "TYPE", W * 0.5, H * 0.55);
        return;
      }

      // pointer mapped into this target resolution
      const ptr = pointerRef.current;
      const hasPointer = !!ptr.inside;
      const mx = hasPointer ? ptr.nx * W : W * 0.5;
      const my = hasPointer ? ptr.ny * H : H * 0.5;

      const field = settings.field;
      const sign = field.mouseMode === "repel" ? 1 : -1;

      // Simulate particles (in-place) for this pipe
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        const dx = p.x - mx;
        const dy = p.y - my;
        const d = Math.hypot(dx, dy);

        const within = hasPointer && d <= field.mouseRadius;
        let fall = 0;
        if (within) {
          // Brush-style edge control. 0 = hard edge, 1 = very soft feather.
          const normalized = clamp(d / Math.max(1, field.mouseRadius), 0, 1);
          const softness = clamp(field.mouseSoftness, 0, 1);
          const hard = 1;
          const feather = Math.pow(1 - normalized, 1.2 + softness * 3.8);
          const edgeBlend = softness * softness;
          fall = lerp(hard, feather, edgeBlend);
        }

        // Sample the gradient of the actual rendered noise texture around this
        // glyph particle. Moving light/dark regions therefore generate a moving
        // force that visibly follows the noise animation on screen.
        const gradStepX = W / Math.max(1, fieldCanvas.width);
        const gradStepY = H / Math.max(1, fieldCanvas.height);
        const l = sampleNoiseLuma(p.x - gradStepX, p.y);
        const r = sampleNoiseLuma(p.x + gradStepX, p.y);
        const u = sampleNoiseLuma(p.x, p.y - gradStepY);
        const dNoise = sampleNoiseLuma(p.x, p.y + gradStepY);
        const gx = r - l;
        const gy = dNoise - u;

        // Add a perpendicular component so broad gradients create turbulence
        // instead of only sliding particles toward brighter/darker regions.
        const curlMix = clamp(field.flowCurl / 4, 0, 1.5);
        const dirX = gx - gy * curlMix;
        const dirY = gy + gx * curlMix;
        const gradientMag = Math.hypot(dirX, dirY);
        const normX = gradientMag > 1e-5 ? dirX / gradientMag : 0;
        const normY = gradientMag > 1e-5 ? dirY / gradientMag : 0;
        const textureEnergy = clamp(gradientMag * 6, 0, 1.5);

        const fx =
          normX *
          field.flowStrength *
          field.noiseApply *
          field.distortAmount *
          textureEnergy;
        const fy =
          normY *
          field.flowStrength *
          field.noiseApply *
          field.distortAmount *
          textureEnergy;

        // Mouse interaction stays local and is layered on top of the global noise.
        const ux = d < 1e-6 ? 0 : dx / d;
        const uy = d < 1e-6 ? 0 : dy / d;
        const mxF = ux * field.mouseStrength * fall * sign * field.distortAmount;
        const myF = uy * field.mouseStrength * fall * sign * field.distortAmount;

        const mMag = Math.hypot(fx + mxF, fy + myF);
        const denom = Math.max(1, field.mouseStrength + field.flowStrength);
        p.hm = clamp((mMag / denom) * settings.heatmap.heatIntensity, 0, 1);

        // Keep the restoring force consistent whether or not the pointer is present.
        // Previously it was 2.2× stronger with no pointer, which largely cancelled
        // the noise deformation as soon as the mouse left the canvas.
        const rx = (p.x0 - p.x) * field.returnToBase * 60;
        const ry = (p.y0 - p.y) * field.returnToBase * 60;

        p.vx = (p.vx + (fx + mxF + rx) / 60) * field.velocityDamping;
        p.vy = (p.vy + (fy + myF + ry) / 60) * field.velocityDamping;
        p.x += p.vx;
        p.y += p.vy;

        p.x = clamp(p.x, -W * 0.1, W * 1.1);
        p.y = clamp(p.y, -H * 0.1, H * 1.1);
      }

      // Draw particles
      const useHeat = settings.heatmap.heatmapOn;
      const ps = settings.glyphParticles.particleSize;
      const shape = settings.glyphParticles.particleShape;

      D.globalAlpha = 1;
      D.fillStyle = settings.textColor;
      D.strokeStyle = settings.textColor;

      if (shape === "circle") {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (useHeat) {
            D.fillStyle = lerpColor(settings.heatmap.heatA, settings.heatmap.heatB, p.hm || 0);
          }
          D.beginPath();
          D.arc(p.x, p.y, ps, 0, Math.PI * 2);
          D.fill();
        }
      } else if (shape === "square") {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (useHeat) {
            D.fillStyle = lerpColor(settings.heatmap.heatA, settings.heatmap.heatB, p.hm || 0);
          }
          D.fillRect(p.x - ps, p.y - ps, ps * 2, ps * 2);
        }
      } else {
        D.lineWidth = Math.max(1, ps);
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          if (useHeat) {
            D.strokeStyle = lerpColor(settings.heatmap.heatA, settings.heatmap.heatB, p.hm || 0);
          }
          const ddx = p.x - mx;
          const ddy = p.y - my;
          const nv = noiseVector(ddx, ddy, t, field.flowFreq * 1.25, field.flowCurl);
          const ang = Math.atan2(nv.vy, nv.vx);
          const len = ps * 6;
          const x1 = p.x - Math.cos(ang) * len * 0.5;
          const y1 = p.y - Math.sin(ang) * len * 0.5;
          const x2 = p.x + Math.cos(ang) * len * 0.5;
          const y2 = p.y + Math.sin(ang) * len * 0.5;
          D.beginPath();
          D.moveTo(x1, y1);
          D.lineTo(x2, y2);
          D.stroke();
        }
      }

      // Small HUD only on screen (optional)
      if (D === screenCtx) {
        D.save();
        D.fillStyle = "rgba(255,255,255,0.65)";
        D.font = "700 12px ui-sans-serif, system-ui";
        D.textAlign = "left";
        D.fillText(`particles: ${pts.length}`, 14, 22);
        if (isRecording) {
          D.fillStyle = "rgba(255,70,70,0.9)";
          D.fillText(`REC ${EXPORT_W}×${EXPORT_H} @ ${recFps}fps`, 14, 38);
        }
        D.restore();
      }

      // Noise overlay texture
      D.save();
      D.globalCompositeOperation = "screen";
      D.globalAlpha = clamp(settings.noiseOverlay.noiseOpacity, 0, 1);
      D.drawImage(offNoise, 0, 0, W, H);
      D.restore();
    };

    const frame = () => {
      // shared time
      const t = (timeRef.current += 1 / 60);

      // screen
      drawScene(
        screenCtx,
        c.width,
        c.height,
        screenPipeRef.current,
        t
      );

      // export (always render, so captureStream has fresh frames)
      const ex = exportCanvasRef.current;
      if (ex) {
        const exCtx = ex.getContext("2d");
        if (exCtx) {
          drawScene(exCtx, ex.width, ex.height, exportPipeRef.current, t);
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [settings, isRecording, recFps]);

  return (
    <div className="ui-v1-synth">
      <div className="ui-v1-synth-inner">
        <div className="ui-v1-layout">
          <div ref={containerRef} className="ui-v1-canvas-frame">
            <canvas ref={canvasRef} className="ui-v1-canvas" />
            <div className="absolute left-0 bottom-0 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-white/55 bg-black/30 backdrop-blur-sm">
              Mouse · {mouseMode} · radius {Math.round(mouseRadius)} · softness {mouseSoftness.toFixed(2)}
            </div>
          </div>

          <div className="ui-v1-actions">
            <div>Export</div>
            <div>
              <span className="px-2 self-center text-[10px] uppercase text-white/55">{EXPORT_W} × {EXPORT_H}</span>
              <select
                value={String(recFps)}
                onChange={(e) => setRecFps(e.target.value === "30" ? 30 : 60)}
                className="border border-white/25 bg-transparent px-2 py-1 text-[10px] uppercase"
                aria-label="Recording frame rate"
              >
                <option value="30">30 FPS</option>
                <option value="60">60 FPS</option>
              </select>
              {!isRecording ? (
                <button type="button" onClick={startRecording}>Start recording</button>
              ) : (
                <button type="button" onClick={stopRecording}>Stop recording</button>
              )}
            </div>
          </div>

          <div className="ui-v1-panel">
            <div className="ui-v1-panel-handle">
              <span>Controls</span>
              <span className="ui-v1-drag-mark" aria-hidden="true">··</span>
              <span />
            </div>
            <div className="ui-v1-panel-content">
              <div className="ui-v1-panel-tabs" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
                <TabButton active={tab === "noise"} onClick={() => setTab("noise")}>Noise</TabButton>
                <TabButton active={tab === "type"} onClick={() => setTab("type")}>Type</TabButton>
                <TabButton active={tab === "distort"} onClick={() => setTab("distort")}>Distort</TabButton>
                <TabButton active={tab === "heatmap"} onClick={() => setTab("heatmap")}>Map</TabButton>
                <TabButton active={tab === "colors"} onClick={() => setTab("colors")}>Color</TabButton>
              </div>

              <div className="ui-v1-panel-body">
              {tab === "noise" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Noise type</div>
                    <Select
                      label="Generator"
                      value={noiseType}
                      onChange={setNoiseType}
                      options={[
                        { value: "liquid", label: "Liquid turbulence" },
                        { value: "gaussian", label: "Gaussian particles" },
                      ]}
                    />
                    <Toggle
                      label="Animate noise"
                      checked={animateNoise}
                      onChange={setAnimateNoise}
                    />

                    {noiseType === "gaussian" ? (
                      <>
                        <NumberField
                          label="Seed"
                          value={seed}
                          min={0}
                          max={9999}
                          step={1}
                          onChange={setSeed}
                        />
                        <NumberField
                          label="Particle count"
                          value={particleCount}
                          min={20}
                          max={1200}
                          step={1}
                          onChange={setParticleCount}
                        />
                        <Slider
                          label="Sigma (spread)"
                          value={sigma}
                          min={20}
                          max={560}
                          step={1}
                          onChange={setSigma}
                        />
                        <Slider
                          label="Particle radius"
                          value={particleRadius}
                          min={1}
                          max={10}
                          step={1}
                          onChange={setParticleRadius}
                        />
                        <Slider
                          label="Noise gain"
                          value={noiseGain}
                          min={0}
                          max={2}
                          step={0.01}
                          onChange={setNoiseGain}
                        />
                        <Slider
                          label="Noise speed"
                          value={noiseSpeed}
                          min={0}
                          max={3}
                          step={0.01}
                          onChange={setNoiseSpeed}
                        />
                      </>
                    ) : (
                      <>
                        <NumberField
                          label="Seed"
                          value={seed}
                          min={0}
                          max={9999}
                          step={1}
                          onChange={setSeed}
                        />
                        <Slider
                          label="Scale"
                          value={turbScale}
                          min={0.2}
                          max={2.5}
                          step={0.05}
                          onChange={setTurbScale}
                        />
                        <Slider
                          label="Warp"
                          value={turbWarp}
                          min={0}
                          max={3}
                          step={0.05}
                          onChange={setTurbWarp}
                        />
                        <Slider
                          label="Contrast"
                          value={turbContrast}
                          min={0.6}
                          max={2.5}
                          step={0.05}
                          onChange={setTurbContrast}
                        />
                        <Slider
                          label="Speed"
                          value={turbSpeed}
                          min={0}
                          max={3}
                          step={0.05}
                          onChange={setTurbSpeed}
                        />
                        <Slider
                          label="Blur"
                          value={turbBlur}
                          min={0}
                          max={24}
                          step={1}
                          onChange={setTurbBlur}
                        />
                        <Slider
                          label="Octaves"
                          value={turbOctaves}
                          min={1}
                          max={5}
                          step={1}
                          onChange={setTurbOctaves}
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Noise → Distorter</div>
                    <Slider
                      label="Noise apply"
                      value={noiseApply}
                      min={0}
                      max={2}
                      step={0.01}
                      onChange={setNoiseApply}
                    />
                    <Slider
                      label="Distortion amount"
                      value={distortAmount}
                      min={0}
                      max={3}
                      step={0.01}
                      onChange={setDistortAmount}
                    />

                    <div className="mt-3 space-y-3">
                      <div className="text-sm font-extrabold">Noise overlay</div>
                      <Slider
                        label="Opacity"
                        value={noiseOpacity}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={setNoiseOpacity}
                      />
                      <Select
                        label="Color"
                        value={noiseColorMode}
                        onChange={setNoiseColorMode}
                        options={[
                          { value: "none", label: "None" },
                          { value: "mono", label: "Mono tint" },
                          { value: "gradient", label: "Gradient" },
                        ]}
                      />
                      {noiseColorMode !== "none" && (
                        <>
                          <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
                            <span className="text-xs font-bold text-white/85">
                              Color A
                            </span>
                            <input
                              type="color"
                              value={noiseColorA}
                              onChange={(e) => setNoiseColorA(e.target.value)}
                              className="w-full h-9 rounded-lg bg-transparent"
                            />
                          </label>
                          {noiseColorMode === "gradient" && (
                            <>
                              <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
                                <span className="text-xs font-bold text-white/85">
                                  Color B
                                </span>
                                <input
                                  type="color"
                                  value={noiseColorB}
                                  onChange={(e) => setNoiseColorB(e.target.value)}
                                  className="w-full h-9 rounded-lg bg-transparent"
                                />
                              </label>
                              <Slider
                                label="Gradient angle"
                                value={noiseGradientAngle}
                                min={0}
                                max={360}
                                step={1}
                                onChange={setNoiseGradientAngle}
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      className="w-full mt-2 rounded-xl bg-white text-black font-extrabold py-2 hover:opacity-90"
                      onClick={() => setSeed((s) => (s + 1) % 10000)}
                      type="button"
                    >
                      Reroll seed
                    </button>

                    <div className="text-xs text-white/60 leading-relaxed">
                      Recording will try MP4/H.264, but may fall back to WebM depending on your browser.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Notes</div>
                    <div className="text-xs text-white/75 leading-relaxed">
                      Export is rendered on a separate 1920×1080 canvas every frame, so captureStream is crisp.
                    </div>
                  </div>
                </div>
              )}

              {tab === "type" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Text</div>
                    <label className="space-y-1 block">
                      <div className="text-xs font-bold text-white/85">Word</div>
                      <input
                        className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-base font-bold text-white outline-none focus:border-white/35"
                        value={text}
                        onChange={(e) => setText(e.target.value.toUpperCase())}
                        onBlur={(e) => setText(e.target.value.toUpperCase())}
                        placeholder="TYPE"
                      />
                    </label>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-white/85">
                        Upload your own
                      </div>

                      <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
                        <span className="text-xs font-bold text-white/70">
                          Font name
                        </span>
                        <input
                          className="w-full rounded-lg bg-white/10 border border-white/15 px-2 py-1 text-sm text-white outline-none focus:border-white/35"
                          value={uploadedFontName}
                          onChange={(e) => setUploadedFontName(e.target.value)}
                          onBlur={(e) => setUploadedFontName(e.target.value)}
                          placeholder="MyUploadedFont"
                        />
                      </label>

                      <label className="block">
                        <input
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          className="block w-full text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-extrabold file:text-black hover:file:opacity-90"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadFont(f);
                          }}
                        />
                      </label>

                      <div className="text-xs text-white/65">
                        Status: <span className="font-mono">{uploadedFontStatus}</span>
                      </div>
                      <div className="text-xs text-white/55">
                        Current font: <span className="font-mono">{fontFamily}</span>
                      </div>
                    </div>

                    <Select
                      label="Style"
                      value={fontStyle}
                      onChange={setFontStyle}
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "italic", label: "Italic" },
                        { value: "oblique", label: "Oblique" },
                      ]}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Font</div>
                    <Slider
                      label="Font size"
                      value={fontSize}
                      min={40}
                      max={800}
                      step={1}
                      onChange={setFontSize}
                    />
                    <Slider
                      label="Weight"
                      value={fontWeight}
                      min={100}
                      max={900}
                      step={50}
                      onChange={setFontWeight}
                    />
                    <Slider
                      label="Tracking"
                      value={tracking}
                      min={-20}
                      max={40}
                      step={1}
                      onChange={setTracking}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Quick presets</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setFontWeight(900);
                          setTracking(-5);
                          setFontSize(210);
                        }}
                        type="button"
                      >
                        Heavy tight
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setFontWeight(700);
                          setTracking(10);
                          setFontSize(170);
                        }}
                        type="button"
                      >
                        Wide
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setFontStyle("italic");
                          setFontWeight(800);
                          setTracking(0);
                        }}
                        type="button"
                      >
                        Italic
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setFontStyle("normal");
                          setFontFamily(
                            "ui-serif, Georgia, Cambria, Times New Roman, Times"
                          );
                          setFontWeight(800);
                          setTracking(2);
                        }}
                        type="button"
                      >
                        Serif
                      </button>
                    </div>
                    <div className="text-xs text-white/70 leading-relaxed">
                      Distort mode samples the glyph into particles, so tracking and size change density.
                    </div>
                  </div>
                </div>
              )}

              {tab === "distort" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Type → particles</div>
                    <Slider
                      label="Sample step (density)"
                      value={sampleStep}
                      min={2}
                      max={12}
                      step={1}
                      onChange={setSampleStep}
                    />
                    <Slider
                      label="Alpha threshold"
                      value={alphaThreshold}
                      min={1}
                      max={120}
                      step={1}
                      onChange={setAlphaThreshold}
                    />
                    <Slider
                      label="Jitter"
                      value={jitter}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={setJitter}
                    />
                    <Slider
                      label="Particle size"
                      value={particleSize}
                      min={0.6}
                      max={4}
                      step={0.05}
                      onChange={setParticleSize}
                    />
                    <Select
                      label="Particle shape"
                      value={particleShape}
                      onChange={setParticleShape}
                      options={[
                        { value: "circle", label: "Circle" },
                        { value: "square", label: "Square" },
                        { value: "line", label: "Line" },
                      ]}
                    />
                    <Toggle
                      label="Outline only"
                      checked={outlineOnly}
                      onChange={setOutlineOnly}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Field</div>
                    <Slider
                      label="Frequency"
                      value={flowFreq}
                      min={0.001}
                      max={0.02}
                      step={0.0005}
                      onChange={setFlowFreq}
                      rightLabel={flowFreq.toFixed(4)}
                    />
                    <Slider
                      label="Curl"
                      value={flowCurl}
                      min={0.2}
                      max={6}
                      step={0.05}
                      onChange={setFlowCurl}
                    />
                    <Slider
                      label="Strength"
                      value={flowStrength}
                      min={0}
                      max={120}
                      step={1}
                      onChange={setFlowStrength}
                    />
                    <Slider
                      label="Return to base"
                      value={returnToBase}
                      min={0}
                      max={0.3}
                      step={0.005}
                      onChange={setReturnToBase}
                      rightLabel={returnToBase.toFixed(3)}
                    />
                    <Slider
                      label="Velocity damping"
                      value={velocityDamping}
                      min={0.6}
                      max={0.99}
                      step={0.01}
                      onChange={setVelocityDamping}
                      rightLabel={velocityDamping.toFixed(2)}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Mouse</div>
                    <Select
                      label="Mode"
                      value={mouseMode}
                      onChange={setMouseMode}
                      options={[
                        { value: "repel", label: "Repel" },
                        { value: "attract", label: "Attract" },
                      ]}
                    />
                    <Slider
                      label="Radius"
                      value={mouseRadius}
                      min={40}
                      max={520}
                      step={1}
                      onChange={setMouseRadius}
                    />
                    <Slider
                      label="Strength"
                      value={mouseStrength}
                      min={0}
                      max={160}
                      step={1}
                      onChange={setMouseStrength}
                    />
                    <Slider
                      label="Softness"
                      value={mouseSoftness}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={setMouseSoftness}
                      rightLabel={mouseSoftness.toFixed(2)}
                    />
                  </div>
                </div>
              )}

              {tab === "heatmap" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Heatmap</div>
                    <Toggle
                      label="Enable heatmap"
                      checked={heatmapOn}
                      onChange={setHeatmapOn}
                    />
                    <Slider
                      label="Intensity"
                      value={heatIntensity}
                      min={0}
                      max={3}
                      step={0.05}
                      onChange={setHeatIntensity}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Colors</div>
                    <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
                      <span className="text-xs font-bold text-white/85">Color A</span>
                      <input
                        type="color"
                        value={heatA}
                        onChange={(e) => setHeatA(e.target.value)}
                        className="w-full h-9 rounded-lg bg-transparent"
                      />
                    </label>
                    <label className="grid grid-cols-[1fr,140px] gap-2 items-center">
                      <span className="text-xs font-bold text-white/85">Color B</span>
                      <input
                        type="color"
                        value={heatB}
                        onChange={(e) => setHeatB(e.target.value)}
                        className="w-full h-9 rounded-lg bg-transparent"
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Tip</div>
                    <div className="text-xs text-white/75 leading-relaxed">
                      For a clean “distortion map” look, set particle shape to <b>Square</b> and lower jitter.
                    </div>
                  </div>
                </div>
              )}

              {tab === "colors" && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Background (HSL)</div>
                    <Slider label="H" value={bgH} min={0} max={360} step={1} onChange={setBgH} />
                    <Slider label="S" value={bgS} min={0} max={100} step={1} onChange={setBgS} />
                    <Slider label="L" value={bgL} min={0} max={100} step={1} onChange={setBgL} />
                    <div className="text-xs text-white/70">{bg}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Text (HSL)</div>
                    <Slider label="H" value={txH} min={0} max={360} step={1} onChange={setTxH} />
                    <Slider label="S" value={txS} min={0} max={100} step={1} onChange={setTxS} />
                    <Slider label="L" value={txL} min={0} max={100} step={1} onChange={setTxL} />
                    <div className="text-xs text-white/70">{textColor}</div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-extrabold">Presets</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setBgH(240);
                          setBgS(12);
                          setBgL(6);
                          setTxH(0);
                          setTxS(0);
                          setTxL(100);
                        }}
                        type="button"
                      >
                        Dark
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setBgH(40);
                          setBgS(20);
                          setBgL(94);
                          setTxH(0);
                          setTxS(0);
                          setTxL(10);
                        }}
                        type="button"
                      >
                        Light
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setBgH(228);
                          setBgS(30);
                          setBgL(8);
                          setTxH(122);
                          setTxS(80);
                          setTxL(70);
                        }}
                        type="button"
                      >
                        Acid
                      </button>
                      <button
                        className="rounded-xl bg-white/10 border border-white/15 py-2 text-sm font-extrabold hover:bg-white/15"
                        onClick={() => {
                          setTxH(0);
                          setTxS(0);
                          setTxL(100);
                          setParticleShape("line");
                          setParticleSize(1.3);
                          setSampleStep(6);
                        }}
                        type="button"
                      >
                        Lines
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
