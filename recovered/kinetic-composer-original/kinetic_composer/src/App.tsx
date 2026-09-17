import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * KINETIC COMPOSER — Tabs below canvas
 * - Canvas: 1800 × 550
 * - UI below canvas
 * - Horizontal, clickable tabs: Layers | Controls | Render
 * - Each tab panel scrolls (so the canvas stays in view)
 * - Layers: compact list + drag reorder + duplicate + delete
 * - Render: records canvas via MediaRecorder (attempts MP4/H.264, falls back if unsupported)
 */

const CW = 1800;
const CH = 550;
const STAGE_SIZES = {
  "1800x550": { width: 1800, height: 550, label: "1800 × 550" },
  "1920x1080": { width: 1920, height: 1080, label: "1920 × 1080" },
  "1080x1080": { width: 1080, height: 1080, label: "1080 × 1080" },
};

// Wave utilities
const TAU = Math.PI * 2;
const wrapTau = (v) => ((v % TAU) + TAU) % TAU;
const wave = (type, v) => {
  const t = wrapTau(v);
  switch (type) {
    case "square":
      return Math.sign(Math.sin(t)) || 1;
    case "sawtooth":
      return t / Math.PI - 1;
    case "triangle": {
      const s = t / Math.PI;
      const tri = 1 - Math.abs((s % 2) - 1);
      return tri * 2 - 1;
    }
    case "sine":
    default:
      return Math.sin(t);
  }
};

// Color helpers
function hexToHsl(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) => ("0" + Math.round(x * 255).toString(16)).slice(-2);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function shiftHue(hex, deg) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + deg + 360) % 360, s, l);
}

// Fonts & layers
const sysSans = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, Arial`;
const LAYER_TEXT = "text";
const LAYER_REPL = "replicator";
let ID = 1;
const nid = () => `L${ID++}`;

const WAVES = [
  { value: "sine", label: "Sine" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
  { value: "sawtooth", label: "Sawtooth" },
];

export default function KineticComposer() {
  // Transport
  const [playing, setPlaying] = useState(true);
  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const [respectReducedMotion, setRespect] = useState(true);

  // Tabs
  const [tab, setTab] = useState("layers");
  const [panelOpen, setPanelOpen] = useState(true);
  const [stageSize, setStageSize] = useState("1800x550");

  // Time
  const tRef = useRef(0);
  const lastRef = useRef(null);
  const rafRef = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!playing || (prefersReduced && respectReducedMotion)) return;
    const step = (ts) => {
      if (lastRef.current == null) lastRef.current = ts;
      else {
        tRef.current += (ts - lastRef.current) * 0.001;
        lastRef.current = ts;
      }
      setTick(tRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [playing, prefersReduced, respectReducedMotion]);

  // Scene
  const [layers, setLayers] = useState(() => {
    const baseText = {
      id: nid(),
      type: LAYER_TEXT,
      name: "Text Layer",
      visible: true,
      locked: false,
      params: defaultTextParams("Hello kinetic world"),
    };
    const repl = {
      id: nid(),
      type: LAYER_REPL,
      name: "Replicator",
      visible: true,
      locked: false,
      params: {
        targetId: baseText.id,
        mode: "radial",
        count: 6,
        radius: 160,
        angleStart: 0,
        angleStep: 360 / 6,
        phaseDelta: 0.4,
        timeDelay: 0.05,
        hueDelta: 20,
        scaleDelta: 0,
        opacity: 1,
        offsetX: 0,
        offsetY: 0,
        linearAngle: 0,
        linearStep: 180,
        gridRows: 2,
        gridCols: 3,
        gridGap: 140,
      },
    };
    return [baseText, repl];
  });
  const [activeId, setActiveId] = useState(() => layers[0]?.id ?? null);

  // DnD reorder
  const dragIdRef = useRef(null);
  const onDragStart = (id) => (e) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = () => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (id) => (e) => {
    e.preventDefault();
    const from = dragIdRef.current;
    dragIdRef.current = null;
    if (!from || from === id) return;
    setLayers((prev) => {
      const a = prev.findIndex((l) => l.id === from);
      const b = prev.findIndex((l) => l.id === id);
      if (a < 0 || b < 0) return prev;
      const nxt = [...prev];
      const [it] = nxt.splice(a, 1);
      nxt.splice(b, 0, it);
      return nxt;
    });
  };

  // Render list (the actual drawables)
  const renderItems = useMemo(() => {
    const map = new Map(layers.map((l) => [l.id, l]));
    const out = [];
    for (const L of layers) {
      if (!L.visible) continue;
      if (L.type === LAYER_TEXT) out.push({ layer: L, clone: null });
      else if (L.type === LAYER_REPL) {
        const target = map.get(L.params.targetId);
        if (!target || target.type !== LAYER_TEXT || !target.visible) continue;
        const clones = expandReplicator(L, target);
        for (const c of clones) out.push({ layer: target, clone: c });
      }
    }
    return out;
  }, [layers]);

  const stage = STAGE_SIZES[stageSize];
  const activeTextLayer =
    layers.find((layer) => layer.id === activeId && layer.type === LAYER_TEXT) ||
    layers.find((layer) => layer.type === LAYER_TEXT);

  const updateActiveText = (text) => {
    if (!activeTextLayer) return;
    setLayers((previous) =>
      previous.map((layer) =>
        layer.id === activeTextLayer.id
          ? { ...layer, params: { ...layer.params, text } }
          : layer
      )
    );
  };

  const applyQuickPreset = (preset) => {
    setLayers((previous) =>
      previous.map((layer) => {
        if (layer.type === LAYER_TEXT) {
          if (preset === "wave") {
            return { ...layer, params: { ...layer.params, ampX: 120, ampY: 70, phase: 0.8, freqX: 0.6, freqY: 0.35 } };
          }
          if (preset === "calm") {
            return { ...layer, params: { ...layer.params, ampX: 35, ampY: 18, phase: 0.3, freqX: 0.25, freqY: 0.2 } };
          }
          return { ...layer, params: { ...layer.params, ampX: 210, ampY: 130, phase: 1.35, freqX: 0.9, freqY: 0.7 } };
        }

        if (layer.type === LAYER_REPL) {
          if (preset === "grid") {
            return { ...layer, params: { ...layer.params, mode: "grid", gridRows: 3, gridCols: 3, gridGap: 170 } };
          }
          return { ...layer, params: { ...layer.params, mode: "radial", count: preset === "calm" ? 4 : 6, radius: preset === "wave" ? 160 : 220 } };
        }
        return layer;
      })
    );
  };

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#0b0b0b] text-neutral-50"
      style={{ fontFamily: sysSans }}
    >
      <div className="absolute inset-x-5 bottom-[82px] top-[82px] flex items-center justify-center overflow-hidden md:inset-x-8">
        <StageCanvas items={renderItems} time={tick} width={stage.width} height={stage.height} />
      </div>

      <section
        className={`absolute left-5 top-[82px] z-20 flex w-[min(430px,calc(100%-40px))] flex-col border border-white/20 bg-black/70 backdrop-blur-xl transition-[max-height] md:left-8 ${
          panelOpen ? "max-h-[calc(100dvh-180px)]" : "max-h-11"
        }`}
        aria-label="Composer controls"
      >
        <div className="flex min-h-11 items-center justify-between border-b border-white/15 px-3 font-mono text-[11px] uppercase">
          <span>{tab}</span>
          <button
            type="button"
            onClick={() => setPanelOpen((open) => !open)}
            className="h-7 border border-white/20 px-2 hover:border-white/60"
            aria-expanded={panelOpen}
          >
            {panelOpen ? "Minimise" : "Open"}
          </button>
        </div>

        {panelOpen && (
          <>
            <div className="border-b border-white/15 p-2">
              <TabBar tab={tab} setTab={setTab} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {tab === "layers" ? (
              <LayersPanel
                layers={layers}
                setLayers={setLayers}
                activeId={activeId}
                setActiveId={setActiveId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
              ) : tab === "controls" ? (
                <>
                  <Transport
                    playing={playing}
                    setPlaying={setPlaying}
                    prefersReduced={prefersReduced}
                    respect={respectReducedMotion}
                    setRespect={setRespect}
                  />
                  <div className="h-3" />
                  <PropertiesPanel layers={layers} setLayers={setLayers} activeId={activeId} />
                </>
              ) : (
                <RenderPanel
                  items={renderItems}
                  nowTime={tick}
                  stageWidth={stage.width}
                  stageHeight={stage.height}
                />
              )}
            </div>
          </>
        )}
      </section>

      <div className="absolute bottom-4 left-1/2 z-30 grid w-[min(1040px,calc(100%-40px))] -translate-x-1/2 grid-cols-[auto_minmax(160px,1fr)_auto_auto] items-center border border-white/25 bg-black/70 p-1.5 font-mono text-[11px] uppercase backdrop-blur-xl max-md:grid-cols-[auto_1fr_auto]">
        <button
          type="button"
          onClick={() => setPlaying((current) => !current)}
          className="h-10 min-w-20 border border-white/20 px-3 hover:border-white/60"
        >
          {playing ? "Pause" : "Play"}
        </button>

        <label className="mx-1 flex h-10 min-w-0 items-center border border-white/20 px-3 normal-case">
          <span className="mr-3 shrink-0 uppercase text-white/45">Text</span>
          <input
            value={activeTextLayer?.params.text || ""}
            onChange={(event) => updateActiveText(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Active text"
          />
        </label>

        <label className="flex h-10 items-center border border-white/20 px-2 max-md:hidden">
          <span className="sr-only">Quick preset</span>
          <select
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) applyQuickPreset(event.target.value);
              event.target.value = "";
            }}
            className="bg-transparent px-1 outline-none"
            aria-label="Quick preset"
          >
            <option value="" disabled>Quick preset</option>
            <option value="calm">Calm</option>
            <option value="wave">Wave</option>
            <option value="grid">Grid</option>
          </select>
        </label>

        <label className="ml-1 flex h-10 items-center border border-white/20 px-2">
          <span className="sr-only">Canvas size</span>
          <select
            value={stageSize}
            onChange={(event) => setStageSize(event.target.value)}
            className="bg-transparent px-1 outline-none"
            aria-label="Canvas size"
          >
            {Object.entries(STAGE_SIZES).map(([value, option]) => (
              <option key={value} value={value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const btn = (id, label) => (
    <button
      key={id}
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`min-h-8 border px-3 font-mono text-[11px] uppercase transition ${
        tab === id ? "border-white bg-white text-black" : "border-white/15 bg-transparent hover:border-white/60"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Panels" className="grid grid-cols-3 gap-1">
      {btn("layers", "Layers")}
      {btn("controls", "Controls")}
      {btn("render", "Render")}
    </div>
  );
}

/* ---------------- Stage (Canvas) ---------------- */
function StageCanvas({ items, time, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext("2d", { alpha: false });
    if (!ctx) return;

    // draw at 1:1 (CW/CH)
    drawFrame(ctx, items, time, width, height);
  }, [height, items, time, width]);

  return (
    <div
      className="relative max-h-full max-w-full overflow-hidden"
      style={{ width: "100%", aspectRatio: `${width} / ${height}`, background: "#0b0b0b" }}
      aria-label="Stage"
      role="img"
    >
      <canvas ref={canvasRef} width={width} height={height} className="block h-full w-full" />
      <div className="absolute inset-0 pointer-events-none border border-white/10" aria-hidden />
    </div>
  );
}

function drawFrame(ctx, items, time, w, h) {
  // Background
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Draw items in order
  for (const it of items) {
    drawTextItem(ctx, it.layer, it.clone, time, w, h);
  }

  // Frame border
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawTextItem(ctx, layer, clone, time, w, h) {
  const p = { ...layer.params, ...(clone?.overrides || {}) };
  const letters = Array.from(p.text);
  const gapPx = p.letterGapEm * p.baseSize;

  const n = Math.max(1, letters.length);
  const blockWidth = Math.max(0, (n - 1) * gapPx);
  const startX =
    p.hAlign === "left" ? p.xOffset : p.hAlign === "right" ? w - blockWidth + p.xOffset : w / 2 - blockWidth / 2 + p.xOffset;
  const baseY = p.vAlign === "top" ? p.yOffset : p.vAlign === "bottom" ? h + p.yOffset : h / 2 + p.yOffset;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const tShift = time + (clone?.timeShift || 0);

  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i] === " " ? "\u00A0" : letters[i];
    const idx = p.invertPhaseOrder ? n - 1 - i : i;
    const ph = idx * p.phase + (clone?.phaseShift || 0);

    const sx = wave(p.wavePos, tShift * p.freqX + ph);
    const sy = wave(p.wavePos, tShift * p.freqY + ph * 1.03);

    const x = startX + i * (gapPx + 0.0001) + sx * p.ampX + (clone?.offsetX || 0);
    const y = baseY + sy * p.ampY + (clone?.offsetY || 0);

    const size = Math.max(
      6,
      p.baseSize * (clone?.scale || 1) + wave(p.waveSize, tShift * 0.9 + ph * 0.8) * p.sizeAmp
    );
    const color = clone?.fgColor || p.fgColor;
    const opacity = clone?.opacity ?? p.opacity;

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `700 ${size}px ${p.fontFamily || sysSans}`;

    if (p.strokeEnabled && p.strokeWidth > 0) {
      ctx.lineWidth = p.strokeWidth;
      ctx.strokeStyle = p.strokeColor;
      ctx.strokeText(ch, x, y);
    }
    ctx.fillText(ch, x, y);
  }

  ctx.restore();
}

/* ---------------- Render Panel ---------------- */
function RenderPanel({ items, nowTime, stageWidth, stageHeight }) {
  const exportCanvasRef = useRef(null);
  const recRef = useRef({
    recorder: null,
    chunks: [],
    stream: null,
    running: false,
    stopFn: null,
  });

  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(5); // seconds
  const [preset, setPreset] = useState("stage"); // stage | 1920x1080 | 1800x550
  const [status, setStatus] = useState("Idle");
  const [mime, setMime] = useState("auto");
  const [isRecording, setIsRecording] = useState(false);

  const { outW, outH } = useMemo(() => {
    if (preset === "1920x1080") return { outW: 1920, outH: 1080 };
    if (preset === "1800x550") return { outW: 1800, outH: 550 };
    return { outW: stageWidth, outH: stageHeight };
  }, [preset, stageHeight, stageWidth]);

  const supported = useMemo(() => {
    const MR = typeof window !== "undefined" ? window.MediaRecorder : undefined;
    if (!MR) return { hasMR: false, mp4: false, webm: false };
    const mp4 =
      MR.isTypeSupported?.('video/mp4;codecs="avc1.42E01E,mp4a.40.2"') ||
      MR.isTypeSupported?.('video/mp4;codecs="avc1"') ||
      MR.isTypeSupported?.("video/mp4");
    const webm =
      MR.isTypeSupported?.('video/webm;codecs="vp9,opus"') ||
      MR.isTypeSupported?.('video/webm;codecs="vp8,opus"') ||
      MR.isTypeSupported?.("video/webm");
    return { hasMR: true, mp4: !!mp4, webm: !!webm };
  }, []);

  const pickMime = () => {
    if (mime === "mp4") return 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
    if (mime === "webm") return 'video/webm;codecs="vp8,opus"';
    // auto
    if (supported.mp4) return 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
    if (supported.webm) return 'video/webm;codecs="vp8,opus"';
    return "";
  };

  const stopRecording = () => {
    const R = recRef.current;
    if (!R.running) return;
    R.running = false;
    setIsRecording(false);
    try {
      R.stopFn?.();
    } catch {}
  };

  const startRecording = async () => {
    if (!supported.hasMR) {
      setStatus("MediaRecorder not available in this browser.");
      return;
    }

    const cnv = exportCanvasRef.current;
    if (!cnv) return;

    // Configure canvas resolution
    cnv.width = outW;
    cnv.height = outH;

    const ctx = cnv.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Make a fresh stream
    const stream = cnv.captureStream(fps);
    const chosenMime = pickMime();
    if (!chosenMime) {
      setStatus("No supported recording mimeType found (MP4/WebM).");
      return;
    }

    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: chosenMime });
    } catch {
      // If the exact codec string fails, try a softer fallback
      try {
        recorder = new MediaRecorder(stream, { mimeType: chosenMime.startsWith("video/mp4") ? "video/mp4" : "video/webm" });
      } catch {
        setStatus("Failed to start recorder with MP4/WebM settings.");
        return;
      }
    }

    const R = recRef.current;
    R.recorder = recorder;
    R.chunks = [];
    R.stream = stream;
    R.running = true;
    setIsRecording(true);

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) R.chunks.push(ev.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(R.chunks, { type: recorder.mimeType || chosenMime || "video/webm" });
      const ext = (recorder.mimeType || chosenMime || "").includes("mp4") ? "mp4" : "webm";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kinetic_${outW}x${outH}_${fps}fps.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus(`Saved ${ext.toUpperCase()} (${outW}×${outH}, ${fps}fps).`);
      // cleanup stream tracks
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
      R.recorder = null;
      R.stream = null;
      R.chunks = [];
      R.stopFn = null;
      setIsRecording(false);
    };

    // Real-time draw loop for duration
    const totalFrames = Math.max(1, Math.round(duration * fps));
    let frame = 0;
    const startTime = nowTime; // "start at current animation time"

    setStatus(`Recording… (${fps}fps, ${duration}s, ${outW}×${outH})`);
    recorder.start();

    let cancelled = false;

    const tickFrame = () => {
      if (cancelled || !recRef.current.running) return;
      const t = startTime + frame / fps;
      drawFrame(ctx, items, t, outW, outH);

      frame++;
      if (frame >= totalFrames) {
        stopRecording();
        return;
      }
      // Try to hit the target fps; rAF is usually fine; we pace with setTimeout.
      setTimeout(() => requestAnimationFrame(tickFrame), Math.max(0, 1000 / fps - 2));
    };

    R.stopFn = () => {
      cancelled = true;
      try {
        recorder.stop();
      } catch {}
    };

    requestAnimationFrame(tickFrame);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
        <div className="text-lg font-bold">Render</div>
        <div className="text-xs opacity-70 mt-1">
          Attempts <span className="font-bold">MP4 (H.264)</span> when supported, otherwise falls back to WebM.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Resolution"
          value={preset}
          options={[
            { value: "stage", label: `Stage (${stageWidth}×${stageHeight})` },
            { value: "1800x550", label: "1800×550" },
            { value: "1920x1080", label: "1920×1080 (Full HD)" },
          ]}
          onChange={(v) => setPreset(v)}
        />
        <Select
          label="Codec"
          value={mime}
          options={[
            { value: "auto", label: "Auto" },
            { value: "mp4", label: `MP4 (H.264) ${supported.mp4 ? "✓" : "✕"}` },
            { value: "webm", label: `WebM (VP8) ${supported.webm ? "✓" : "✕"}` },
          ]}
          onChange={(v) => setMime(v)}
        />

        <Select
          label="FPS"
          value={String(fps)}
          options={[
            { value: "30", label: "30 fps" },
            { value: "60", label: "60 fps" },
          ]}
          onChange={(v) => setFps(parseInt(v, 10))}
        />

        <Slider label="Duration (s)" value={duration} min={1} max={30} step={1} onChange={(v) => setDuration(Math.round(v))} />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={startRecording}
          className="px-4 py-2 rounded bg-white text-black font-bold"
          disabled={!supported.hasMR || isRecording}
          title={!supported.hasMR ? "MediaRecorder not available" : "Start recording"}
        >
          Start render
        </button>
        <button
          onClick={stopRecording}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/15 font-bold"
          disabled={!isRecording}
        >
          Stop
        </button>
        <div className="text-sm opacity-80">{status}</div>
      </div>

      {!supported.hasMR && (
        <div className="text-xs text-red-200/90">
          MediaRecorder isn’t available here, so direct MP4/WebM capture can’t run in this browser.
        </div>
      )}

      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
        <div className="text-sm font-bold">Export canvas (hidden)</div>
        <div className="text-xs opacity-70 mt-1">
          This canvas is used for recording at the chosen output resolution.
        </div>
        <canvas ref={exportCanvasRef} width={outW} height={outH} className="mt-3 w-full rounded-xl ring-1 ring-white/10" />
      </div>
    </div>
  );
}

/* ---------------- Layers Panel ---------------- */
function LayersPanel({ layers, setLayers, activeId, setActiveId, onDragStart, onDragOver, onDrop }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-bold">Layers</div>
          <div className="text-xs opacity-70">Drag ≡ to reorder. Use Dup to copy.</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => addText(setLayers)} className="px-3 py-2 rounded bg-white text-black text-xs font-bold">
            + Text
          </button>
          <button
            onClick={() => addReplicator(setLayers, layers)}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-xs"
          >
            + Replicator
          </button>
        </div>
      </div>

      <ul className="space-y-2" role="listbox" aria-label="Layers">
        {layers.map((L) => (
          <li
            key={L.id}
            role="option"
            aria-selected={activeId === L.id}
            draggable
            onDragStart={onDragStart(L.id)}
            onDragOver={onDragOver(L.id)}
            onDrop={onDrop(L.id)}
            className={`rounded-xl border p-2 ${activeId === L.id ? "border-white/50 bg-white/10" : "border-white/10 bg-white/5"}`}
          >
            <div className="flex items-center gap-2">
              <button title="Drag to reorder" className="w-7 h-7 rounded bg-white/15 flex items-center justify-center text-xs">
                ≡
              </button>
              <button
                className={`w-7 h-7 rounded ${L.visible ? "bg-green-500" : "bg-neutral-600"}`}
                onClick={() => toggleVisible(L.id, setLayers)}
                aria-label="Toggle visibility"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide opacity-70 w-20">{L.type}</span>
                  <input
                    className="flex-1 bg-transparent outline-none border-b border-white/15 focus:border-white/60 text-sm"
                    value={L.name}
                    onChange={(e) => renameLayer(L.id, e.target.value, setLayers)}
                  />
                </div>
              </div>
              <button
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/15 text-xs font-bold"
                onClick={() => setActiveId(L.id)}
              >
                Edit
              </button>
              <button
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/15 text-xs font-bold"
                onClick={() => duplicateLayer(L.id, setLayers)}
                aria-label="Duplicate"
              >
                Dup
              </button>
              <button
                className={`px-3 py-2 rounded text-xs font-bold border ${
                  L.locked ? "border-yellow-400/70 text-yellow-200" : "border-white/15 text-white/70"
                }`}
                onClick={() => toggleLocked(L.id, setLayers)}
                aria-label="Toggle lock"
              >
                {L.locked ? "Locked" : "Lock"}
              </button>
              <button
                className="px-3 py-2 rounded border border-red-400/70 text-red-200 hover:bg-red-500/10 text-xs font-bold"
                onClick={() => removeLayer(L.id, setLayers, setActiveId)}
                aria-label="Delete"
              >
                Del
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Properties Panel ---------------- */
function PropertiesPanel({ layers, setLayers, activeId }) {
  const L = layers.find((l) => l.id === activeId) || layers[0];
  if (!L) return <div className="text-sm opacity-70">No layer selected.</div>;
  if (L.type === LAYER_TEXT) return <TextProps layer={L} setLayers={setLayers} />;
  if (L.type === LAYER_REPL) return <ReplicatorProps layer={L} setLayers={setLayers} layers={layers} />;
  return null;
}

/* ---------------- Transport ---------------- */
function Transport({ playing, setPlaying, prefersReduced, respect, setRespect }) {
  return (
    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 rounded bg-white text-black font-bold" onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            className="accent-white"
            checked={respect}
            onChange={(e) => setRespect(e.target.checked)}
          />
          Respect Reduce Motion ({prefersReduced ? "OS: On" : "OS: Off"})
        </label>
      </div>
    </div>
  );
}

/* ---------------- Text Layer Defaults & UI ---------------- */
function defaultTextParams(initialText) {
  return {
    text: initialText,
    // motion
    ampX: 120,
    ampY: 60,
    freqX: 0.6,
    freqY: 0.35,
    phase: 0.8,
    invertPhaseOrder: true,
    wavePos: "sine",
    waveSize: "sine",
    // size / layout
    baseSize: 42,
    sizeAmp: 14,
    letterGapEm: 0.25,
    hAlign: "center",
    vAlign: "middle",
    xOffset: 0,
    yOffset: 0,
    // typography & color
    fontFamily: sysSans,
    fgColor: "#ffffff",
    opacity: 1,
    // stroke
    strokeEnabled: false,
    strokeColor: "#000000",
    strokeWidth: 2,
  };
}

function TextProps({ layer, setLayers }) {
  const p = layer.params;
  const setP = (patch) =>
    setLayers((prev) => prev.map((L) => (L.id === layer.id ? { ...L, params: { ...L.params, ...patch } } : L)));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Text Layer</h3>
      <label className="block text-sm font-bold">
        Text
        <input
          className="mt-1 w-full px-3 py-2 rounded bg-white/10 border border-white/20"
          value={p.text}
          onChange={(e) => setP({ text: e.target.value })}
        />
      </label>

      <fieldset className="grid grid-cols-2 gap-3">
        <Slider label="Base size (px)" value={p.baseSize} min={6} max={160} step={1} onChange={(v) => setP({ baseSize: v })} />
        <Slider label="Size amp (px)" value={p.sizeAmp} min={0} max={80} step={1} onChange={(v) => setP({ sizeAmp: v })} />
        <Slider label="Letter gap (em)" value={p.letterGapEm} min={-2} max={4} step={0.05} onChange={(v) => setP({ letterGapEm: v })} />
        <Slider label="Opacity" value={p.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setP({ opacity: v })} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <Slider label="Amplitude X" value={p.ampX} min={0} max={400} step={1} onChange={(v) => setP({ ampX: v })} />
        <Slider label="Amplitude Y" value={p.ampY} min={0} max={300} step={1} onChange={(v) => setP({ ampY: v })} />
        <Slider label="Frequency X" value={p.freqX} min={0} max={3} step={0.01} onChange={(v) => setP({ freqX: v })} />
        <Slider label="Frequency Y" value={p.freqY} min={0} max={3} step={0.01} onChange={(v) => setP({ freqY: v })} />
        <Slider label="Phase per letter" value={p.phase} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => setP({ phase: v })} />
        <Toggle label="Invert phase order" value={p.invertPhaseOrder} onChange={(v) => setP({ invertPhaseOrder: v })} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <Select label="Position wave" value={p.wavePos} options={WAVES} onChange={(v) => setP({ wavePos: v })} />
        <Select label="Size wave" value={p.waveSize} options={WAVES} onChange={(v) => setP({ waveSize: v })} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <Select
          label="H align"
          value={p.hAlign}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          onChange={(v) => setP({ hAlign: v })}
        />
        <Select
          label="V align"
          value={p.vAlign}
          options={[
            { value: "top", label: "Top" },
            { value: "middle", label: "Middle" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(v) => setP({ vAlign: v })}
        />
        <Slider label="X offset (px)" value={p.xOffset} min={-CW} max={CW} step={1} onChange={(v) => setP({ xOffset: v })} />
        <Slider label="Y offset (px)" value={p.yOffset} min={-CH} max={CH} step={1} onChange={(v) => setP({ yOffset: v })} />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3">
        <Color label="Fill" value={p.fgColor} onChange={(v) => setP({ fgColor: v })} />
        <Toggle label="Stroke on" value={p.strokeEnabled} onChange={(v) => setP({ strokeEnabled: v })} />
        <Color label="Stroke color" value={p.strokeColor} onChange={(v) => setP({ strokeColor: v })} />
        <Slider label="Stroke width (px)" value={p.strokeWidth} min={0} max={12} step={1} onChange={(v) => setP({ strokeWidth: v })} />
      </fieldset>

      <label className="block text-sm font-bold">
        Font family (CSS)
        <input
          className="mt-1 w-full px-3 py-2 rounded bg-white/10 border border-white/20"
          value={p.fontFamily}
          onChange={(e) => setP({ fontFamily: e.target.value })}
        />
      </label>
    </div>
  );
}

/* ---------------- Replicator ---------------- */
function expandReplicator(repLayer, targetLayer) {
  const P = repLayer.params;
  const clones = [];

  if (P.mode === "radial") {
    for (let i = 0; i < P.count; i++) {
      const ang = ((P.angleStart + i * P.angleStep) * Math.PI) / 180;
      clones.push({
        overrides: {
          fgColor: shiftHue(targetLayer.params.fgColor, i * P.hueDelta),
          opacity: P.opacity,
          scale: 1 + (P.scaleDelta || 0) * i,
        },
        offsetX: Math.cos(ang) * P.radius + (P.offsetX || 0),
        offsetY: Math.sin(ang) * P.radius + (P.offsetY || 0),
        timeShift: i * P.timeDelay,
        phaseShift: i * P.phaseDelta,
      });
    }
  } else if (P.mode === "linear") {
    const rad = ((P.linearAngle || 0) * Math.PI) / 180;
    for (let i = 0; i < P.count; i++) {
      clones.push({
        overrides: {
          fgColor: shiftHue(targetLayer.params.fgColor, i * P.hueDelta),
          opacity: P.opacity,
          scale: 1 + (P.scaleDelta || 0) * i,
        },
        offsetX: Math.cos(rad) * P.linearStep * i + (P.offsetX || 0),
        offsetY: Math.sin(rad) * P.linearStep * i + (P.offsetY || 0),
        timeShift: i * P.timeDelay,
        phaseShift: i * P.phaseDelta,
      });
    }
  } else if (P.mode === "grid") {
    let idx = 0;
    for (let r = 0; r < P.gridRows; r++) {
      for (let c = 0; c < P.gridCols; c++) {
        clones.push({
          overrides: {
            fgColor: shiftHue(targetLayer.params.fgColor, idx * P.hueDelta),
            opacity: P.opacity,
            scale: 1 + (P.scaleDelta || 0) * idx,
          },
          offsetX: (c - (P.gridCols - 1) / 2) * P.gridGap + (P.offsetX || 0),
          offsetY: (r - (P.gridRows - 1) / 2) * P.gridGap + (P.offsetY || 0),
          timeShift: idx * P.timeDelay,
          phaseShift: idx * P.phaseDelta,
        });
        idx++;
      }
    }
  }

  return clones;
}

function ReplicatorProps({ layer, setLayers, layers }) {
  const p = layer.params;
  const setP = (patch) =>
    setLayers((prev) => prev.map((L) => (L.id === layer.id ? { ...L, params: { ...L.params, ...patch } } : L)));
  const textLayers = layers.filter((l) => l.type === LAYER_TEXT);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Replicator</h3>

      <label className="block text-sm font-bold">
        Target
        <select
          className="mt-1 w-full px-3 py-2 rounded bg-white/10 border border-white/20"
          value={p.targetId}
          onChange={(e) => setP({ targetId: e.target.value })}
        >
          {textLayers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="grid grid-cols-2 gap-3">
        <Select
          label="Mode"
          value={p.mode}
          options={[
            { value: "radial", label: "Radial" },
            { value: "linear", label: "Linear" },
            { value: "grid", label: "Grid" },
          ]}
          onChange={(v) => setP({ mode: v })}
        />
        <Slider label="Count" value={p.count} min={1} max={24} step={1} onChange={(v) => setP({ count: Math.round(v) })} />
      </fieldset>

      {p.mode === "radial" && (
        <fieldset className="grid grid-cols-2 gap-3">
          <Slider label="Radius" value={p.radius} min={0} max={600} step={1} onChange={(v) => setP({ radius: v })} />
          <Slider label="Angle start" value={p.angleStart} min={-180} max={180} step={1} onChange={(v) => setP({ angleStart: v })} />
          <Slider label="Angle step" value={p.angleStep} min={0} max={360} step={1} onChange={(v) => setP({ angleStep: v })} />
          <Slider label="Offset X" value={p.offsetX || 0} min={-CW} max={CW} step={1} onChange={(v) => setP({ offsetX: v })} />
          <Slider label="Offset Y" value={p.offsetY || 0} min={-CH} max={CH} step={1} onChange={(v) => setP({ offsetY: v })} />
        </fieldset>
      )}

      {p.mode === "linear" && (
        <fieldset className="grid grid-cols-2 gap-3">
          <Slider label="Angle" value={p.linearAngle} min={-180} max={180} step={1} onChange={(v) => setP({ linearAngle: v })} />
          <Slider label="Step" value={p.linearStep} min={-600} max={600} step={1} onChange={(v) => setP({ linearStep: v })} />
        </fieldset>
      )}

      {p.mode === "grid" && (
        <fieldset className="grid grid-cols-2 gap-3">
          <Slider label="Rows" value={p.gridRows} min={1} max={8} step={1} onChange={(v) => setP({ gridRows: Math.round(v) })} />
          <Slider label="Cols" value={p.gridCols} min={1} max={8} step={1} onChange={(v) => setP({ gridCols: Math.round(v) })} />
          <Slider label="Gap" value={p.gridGap} min={0} max={600} step={1} onChange={(v) => setP({ gridGap: v })} />
        </fieldset>
      )}

      <fieldset className="grid grid-cols-2 gap-3">
        <Slider label="Phase Δ" value={p.phaseDelta} min={-Math.PI} max={Math.PI} step={0.01} onChange={(v) => setP({ phaseDelta: v })} />
        <Slider label="Time delay" value={p.timeDelay} min={0} max={1} step={0.01} onChange={(v) => setP({ timeDelay: v })} />
        <Slider label="Hue Δ (deg)" value={p.hueDelta} min={-180} max={180} step={1} onChange={(v) => setP({ hueDelta: v })} />
        <Slider label="Scale Δ" value={p.scaleDelta} min={-0.5} max={1} step={0.01} onChange={(v) => setP({ scaleDelta: v })} />
        <Slider label="Opacity" value={p.opacity} min={0.05} max={1} step={0.05} onChange={(v) => setP({ opacity: v })} />
      </fieldset>

      <p className="text-xs opacity-70">Virtual clones are generated at render time.</p>
    </div>
  );
}

/* ---------------- UI primitives ---------------- */
function Slider({ label, value, min, max, step, onChange }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <div className="flex items-center gap-3 mt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-44 h-3 rounded bg-white/20 accent-white"
        />
        <output className="px-2 py-1 rounded bg-white/10 border border-white/20 min-w-14 text-right">
          {Number(value).toFixed(step < 1 ? 2 : 0)}
        </output>
      </div>
    </label>
  );
}
function Toggle({ label, value, onChange }) {
  return (
    <label className="text-sm font-bold flex items-center gap-2">
      <input type="checkbox" className="accent-white" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function Color({ label, value, onChange }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <div className="flex items-center gap-3 mt-1">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded border border-white/20" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-3 py-2 rounded bg-white/10 border border-white/20" />
      </div>
    </label>
  );
}
function Select({ label, value, options, onChange }) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 rounded bg-white/10 border border-white/20">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ---------------- Layer actions ---------------- */
function addText(setLayers) {
  setLayers((prev) => [...prev, { id: nid(), type: LAYER_TEXT, name: "Text Layer", visible: true, locked: false, params: defaultTextParams("New text") }]);
}
function addReplicator(setLayers, layers) {
  const lastText = [...layers].reverse().find((l) => l.type === LAYER_TEXT);
  setLayers((prev) => {
    const fallback = prev.find((l) => l.type === LAYER_TEXT)?.id;
    return [
      ...prev,
      {
        id: nid(),
        type: LAYER_REPL,
        name: "Replicator",
        visible: true,
        locked: false,
        params: {
          targetId: lastText?.id || fallback,
          mode: "radial",
          count: 5,
          radius: 140,
          angleStart: 0,
          angleStep: 360 / 5,
          phaseDelta: 0.3,
          timeDelay: 0.05,
          hueDelta: 25,
          scaleDelta: 0,
          opacity: 1,
          offsetX: 0,
          offsetY: 0,
          linearAngle: 0,
          linearStep: 200,
          gridRows: 2,
          gridCols: 3,
          gridGap: 160,
        },
      },
    ];
  });
}
function toggleVisible(id, setLayers) {
  setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
}
function toggleLocked(id, setLayers) {
  setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
}
function renameLayer(id, name, setLayers) {
  setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
}
function duplicateLayer(id, setLayers) {
  setLayers((prev) => {
    const idx = prev.findIndex((l) => l.id === id);
    if (idx < 0) return prev;
    const src = prev[idx];
    const copy = { ...src, id: nid(), name: `${src.name} copy`, params: JSON.parse(JSON.stringify(src.params)) };
    const nxt = [...prev];
    nxt.splice(idx + 1, 0, copy);
    return nxt;
  });
}
function removeLayer(id, setLayers, setActiveId) {
  setLayers((prev) => {
    const idx = prev.findIndex((l) => l.id === id);
    if (idx < 0) return prev;
    const nxt = prev.filter((l) => l.id !== id);
    const fallback = nxt[Math.min(idx, nxt.length - 1)]?.id || null;
    setActiveId(fallback);
    return nxt;
  });
}
