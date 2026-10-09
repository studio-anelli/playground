"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fitCanvas, outputDimensions, type CanvasFormat } from "./kinetic-output";
import { renderVideo } from "./kinetic-video-render";
import { recordCanvas } from "./kinetic-recording";
import { kineticPresets } from "./kinetic-presets";
import { createKineticGPU, type GPUStamp, type GPUFrame } from "./kinetic-gpu";
import type { CSSProperties, PointerEvent } from "react";
type RepeatMode = "single" | "line" | "grid";
type SamplingMode = "xy" | "x" | "y";
type Shape = "sine" | "triangle" | "square" | "noise";
type Wave = { on: boolean; shape: Shape; rate: number; amp: number; speed: number; direction: number; phase: number };
const specs = [
  ["step", "Step · % em", 1, 20, .1, "sampling"], ["jitter", "Jitter", 0, 35, .1, "sampling"],
  ["positionX", "Position X · %", -100, 100, .1, "grid"], ["positionY", "Position Y · %", -100, 100, .1, "grid"],
  ["repeatScale", "Scale · %", 5, 200, 1, "grid"], ["repeatSpacingX", "Spacing X · %", 0, 100, .1, "grid"], ["repeatSpacingY", "Spacing Y · %", 0, 100, .1, "grid"], ["repeatAngle", "Angle · °", -180, 180, 1, "grid"],
  ["vertexSize", "Size · % canvas", .1, 3, .01, "vertex"], ["vertexMix", "Mix", 0, 1, .01, "vertex"],
  ["fontSize", "Size · % canvas", 5, 75, .5, "typography"], ["weight", "Weight", 100, 900, 10, "typography"],
  ["feedbackAmount", "Input / amount", 0, .98, .01, "feedback"], ["feedbackRefresh", "Refresh · ms", 16, 2000, 1, "feedback"],
] as const;
type Target = typeof specs[number][0];
type Patch = { id: string; wave: number; target: Target; amount: number };
type XY = { x: number; y: number };
type Glyph = { canvas: HTMLCanvasElement; x: number; y: number; width: number; height: number; em: number };
type VideoSource = "typography" | "sampling" | "grid" | "vertex" | "feedback";
type VideoTarget = Exclude<VideoSource, "typography"> | "canvas";
type VideoPatch = { source: VideoSource; target: VideoTarget };
const videoDefaults: VideoPatch[] = [{ source: "typography", target: "sampling" }, { source: "sampling", target: "grid" }, { source: "grid", target: "vertex" }, { source: "vertex", target: "feedback" }, { source: "feedback", target: "canvas" }];
const manualSpecs = [
  ["threshold", "Threshold", .01, 1, .01, "sampling"], ["opacity", "Opacity", 0, 1, .01, "sampling"],
  ["repeatCount", "Copies", 1, 32, 1, "grid"], ["repeatColumns", "Columns", 1, 12, 1, "grid"], ["repeatRows", "Rows", 1, 12, 1, "grid"],
  ["lineLength", "Line length", 1, 80, 1, "vertex"], ["tracking", "Tracking · % em", -10, 30, .1, "typography"],
] as const;
const initialManual = { threshold: .42, opacity: 1, repeatCount: 5, repeatColumns: 3, repeatRows: 3, lineLength: 6, tracking: 16.7 };
const initial: Record<Target, number> = { step: 3.2, jitter: 0, positionX: 0, positionY: 0, repeatScale: 100, repeatSpacingX: 25, repeatSpacingY: 25, repeatAngle: 0, vertexSize: 1.4, vertexMix: .5, fontSize: 20, weight: 800, feedbackAmount: .65, feedbackRefresh: 120 };
const colors = ["#3478f6", "#f2c438", "#ed514b", "#a4b2ff", "#69c4d0", "#e6a95e", "#b495df"];
const sourceNames = ["WAVE 1", "WAVE 2", "WAVE 3", "FEEDBACK", "SAMPLING", "GRID", "VERTEX"];
const blendModes = ["source-over", "screen", "multiply", "overlay", "difference", "exclusion", "lighten", "darken", "lighter"] as const;
const groups = { sampling: "SAMPLING", grid: "POSITION / REPEAT", vertex: "SHAPE / VERTEX", typography: "TYPOGRAPHY", feedback: "FEEDBACK" };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function Knob({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  const gesture = useRef<{ y: number; value: number } | null>(null);
  const decimals = (String(step).split(".")[1] || "").length;
  const update = (next: number) => onChange(Number(clamp(min + Math.round((next - min) / step) * step, min, max).toFixed(decimals)));
  return <div className="kp-knob-wrap"><button type="button" className="kp-knob" role="slider" aria-label={name} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={String(value)} title="Drag up/down · Shift for fine control · arrows to adjust" style={{ "--knob-angle": `${-135 + (value - min) / (max - min) * 270}deg` } as CSSProperties}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); gesture.current = { y: e.clientY, value }; }}
    onPointerMove={e => { const g = gesture.current; if (!g) return; e.stopPropagation(); const next = clamp(g.value + (g.y - e.clientY) * (max - min) / 240 * (e.shiftKey ? .1 : 1), min, max); g.y = e.clientY; g.value = next; update(next); }}
    onPointerUp={e => { e.stopPropagation(); gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }}
    onKeyDown={e => { const sign = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (sign) { e.preventDefault(); update(value + sign * step * (e.shiftKey ? 1 : 5)); } else if (e.key === "Home" || e.key === "End") { e.preventDefault(); update(e.key === "Home" ? min : max); } }}><span /></button>
    <input className="kp-knob-number" aria-label={`${name} exact value`} type="number" min={min} max={max} step={step} value={value} onChange={e => { if (e.target.value !== "") update(Number(e.target.value)); }} />
  </div>;
}
export function waveValue(shape: Shape, phase: number, seed = 0) {
  const p = phase - Math.floor(phase);
  if (shape === "sine") return Math.sin(phase * Math.PI * 2);
  if (shape === "triangle") return 1 - 4 * Math.abs(p - .5);
  if (shape === "square") return p < .5 ? 1 : -1;
  const hash = (n: number) => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  const f = p * p * (3 - 2 * p);
  return hash(Math.floor(phase)) * (1 - f) + hash(Math.floor(phase) + 1) * f;
}
const dreamWaves: Wave[] = [{ on: true, shape: "sine", rate: .57, amp: .59, speed: .07, direction: 0, phase: .49 }, { on: true, shape: "triangle", rate: 2.79, amp: .5, speed: .12, direction: .5, phase: .25 }, { on: true, shape: "triangle", rate: .35, amp: 1, speed: .65, direction: 1, phase: 0 }];
const dreamPatches: Patch[] = [{ id: "dream-vertex", wave: 2, target: "vertexSize", amount: 100 }, { id: "dream-type", wave: 1, target: "fontSize", amount: 50 }, { id: "dream-step", wave: 0, target: "step", amount: 15 }];
type SynthState = { waves: Wave[]; values: typeof initial; manual: typeof initialManual; modes: { sampling: boolean; grid: boolean; vertex: boolean; feedback: boolean }; patches: Patch[]; text: string; font: string; vertex: string; repeatMode: RepeatMode; samplingMode: SamplingMode; glyphPattern: string; paused: boolean; bg: string; ink: string; bicolour: boolean; ink2: string; feedbackBlend: GlobalCompositeOperation; videoPatches: VideoPatch[] };
export function parsePreset(value: unknown): SynthState {
  const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid preset structure."); return v as Record<string, unknown>; };
  const num = (v: unknown, min: number, max: number): number => { if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error("A preset value is outside its allowed range."); return v; };
  const bool = (v: unknown): boolean => { if (typeof v !== "boolean") throw new Error("Invalid switch value."); return v; };
  const choice = <T extends string,>(v: unknown, list: readonly T[]): T => { if (typeof v !== "string" || !list.includes(v as T)) throw new Error("Unsupported preset option."); return v as T; };
  const array = (v: unknown, max: number): unknown[] => { if (!Array.isArray(v) || v.length > max) throw new Error("Invalid preset connections."); return v; };
  const root = object(value); if (root.format !== "k-tic-synth" || ![1, 2].includes(root.version as number)) throw new Error("Choose a K-TIC-SYNTH preset.");
  const s = object(root.state);
  if (root.version === 1) {
    s.values = { ...object(s.values), positionX: 0, positionY: 0, repeatScale: 100, repeatSpacingX: 25, repeatSpacingY: 25, repeatAngle: 0 };
    s.manual = { ...object(s.manual), repeatCount: 5, repeatColumns: 3, repeatRows: 3 };
    s.modes = { ...object(s.modes), grid: false };
    s.patches = array(s.patches, 100).filter(item => !["gridSize", "strength", "gridMix", "legibility"].includes(String(object(item).target)));
    s.repeatMode = "single"; s.samplingMode = "xy"; s.glyphPattern = "*+o";
  }
  const v = object(s.values), m = object(s.manual), modes = object(s.modes);
  const values = { ...initial }, manual = { ...initialManual };
  for (const [key, , min, max] of specs) values[key] = num(v[key], min, max);
  for (const [key, , min, max] of manualSpecs) manual[key] = num(m[key], min, max);
  const shapes = ["sine", "triangle", "square", "noise"] as const;
  const waves = array(s.waves, 3).map(item => { const w = object(item); return { on: bool(w.on), shape: choice(w.shape, shapes), rate: num(w.rate, .1, 6), amp: num(w.amp, 0, 1), speed: num(w.speed, 0, 3), direction: num(w.direction, 0, 1), phase: num(w.phase, 0, 1) }; });
  if (waves.length !== 3) throw new Error("The preset must contain three waves.");
  const patches = array(s.patches, 100).map((item, i) => { const p = object(item); const wave = num(p.wave, 0, 6); if (!Number.isInteger(wave)) throw new Error("Invalid modulation source."); return { id: `import-${i}`, wave, target: choice(p.target, specs.map(spec => spec[0])), amount: num(p.amount, -100, 100) }; });
  if (new Set(patches.map(p => `${p.wave}-${p.target}`)).size !== patches.length) throw new Error("Duplicate modulation cable.");
  const videoPatches = array(s.videoPatches, 5).map(item => { const p = object(item); return { source: choice(p.source, ["typography", "sampling", "grid", "vertex", "feedback"] as const), target: choice(p.target, ["sampling", "grid", "vertex", "feedback", "canvas"] as const) }; });
  if (new Set(videoPatches.map(p => p.target)).size !== videoPatches.length) throw new Error("Each video input accepts one cable.");
  const colour = (v: unknown) => { if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error("Invalid preset colour."); return v; };
  if (typeof s.text !== "string" || s.text.length > 10000) throw new Error("Preset text is too long.");
  return { waves, values, manual, modes: { sampling: bool(modes.sampling), grid: bool(modes.grid), vertex: bool(modes.vertex), feedback: bool(modes.feedback) }, patches, videoPatches, text: s.text,
    font: choice(s.font, ["system-ui, sans-serif", "ui-serif, Georgia, serif", "ui-monospace, monospace"]), vertex: choice(s.vertex, ["dot", "line", "square", "glyph"]), repeatMode: choice(s.repeatMode, ["single", "line", "grid"]), samplingMode: choice(s.samplingMode, ["xy", "x", "y"]), glyphPattern: typeof s.glyphPattern === "string" && s.glyphPattern.length > 0 && s.glyphPattern.length <= 64 ? s.glyphPattern : "*+o", paused: bool(s.paused), bg: colour(s.bg), ink: colour(s.ink), ink2: colour(s.ink2), bicolour: bool(s.bicolour), feedbackBlend: choice(s.feedbackBlend, blendModes) };
}
export default function KineticPatchSynth() {
  const presetInput = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [canvasFormat, setCanvasFormat] = useState<CanvasFormat>("screen"), [outputResolution, setOutputResolution] = useState(0);
  const [customWidth, setCustomWidth] = useState(1600), [customHeight, setCustomHeight] = useState(1200);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });
  const [pngBusy, setPngBusy] = useState(false);
  const [nativeView, setNativeView] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(10), [recording, setRecording] = useState(false), [recordElapsed, setRecordElapsed] = useState(0);
  const recordingSession = useRef<ReturnType<typeof recordCanvas> | null>(null);
  const recordingStarted = useRef(0);
  const [rendering, setRendering] = useState(false), [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 });
  const [renderFps, setRenderFps] = useState<30 | 60>(30), [loopVideo, setLoopVideo] = useState(false);
  const renderAbort = useRef<AbortController | null>(null);
  const renderDriver = useRef<{ start: () => number; frame: (now: number) => void; resume: () => void } | null>(null);
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setRecordElapsed(Math.min(recordSeconds, (performance.now() - recordingStarted.current) / 1000)), 200); return () => clearInterval(timer); }, [recording, recordSeconds]);
  useEffect(() => () => { recordingSession.current?.cancel(); recordingSession.current = null; renderAbort.current?.abort(); }, []);
  const [outputOpen, setOutputOpen] = useState(false), [outputPosition, setOutputPosition] = useState<XY | null>(null);
  const outputWindow = useRef<HTMLElement>(null), outputButton = useRef<HTMLButtonElement>(null);
  const outputDrag = useRef<XY | null>(null);
  const closeOutput = () => { outputDrag.current = null; setOutputOpen(false); outputButton.current?.focus(); };
  useEffect(() => { if (outputOpen) outputWindow.current?.focus(); }, [outputOpen]);
  const outputSettings = useRef({ canvasFormat, outputResolution, customWidth, customHeight });
  useEffect(() => { outputSettings.current = { canvasFormat, outputResolution, customWidth, customHeight }; }, [canvasFormat, outputResolution, customWidth, customHeight]);
  useEffect(() => { const el = stage.current; if (!el) return; const measure = () => setViewSize({ width: el.offsetWidth, height: el.offsetHeight }); const observer = new ResizeObserver(measure); observer.observe(el); measure(); return () => observer.disconnect(); }, []);
  const previewSize = fitCanvas(viewSize.width, viewSize.height, canvasFormat, customWidth, customHeight);
  const nativeSize = outputDimensions(previewSize.width, previewSize.height, canvasFormat, outputResolution, customWidth, customHeight);
  const [presetMessage, setPresetMessage] = useState("");
  const [waves, setWaves] = useState<Wave[]>(dreamWaves);
  const [feedbackBlend, setFeedbackBlend] = useState<GlobalCompositeOperation>("source-over");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("single");
  const [samplingMode, setSamplingMode] = useState<SamplingMode>("xy");
  const [glyphPattern, setGlyphPattern] = useState("*+o");
  const [values, setValues] = useState(initial);
  const [manual, setManual] = useState(initialManual);
  const [modes, setModes] = useState({ sampling: false, grid: false, vertex: true, feedback: false });
  const [videoPatches, setVideoPatches] = useState<VideoPatch[]>(videoDefaults);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [videoDrag, setVideoDrag] = useState<(XY & { source: VideoSource }) | null>(null);
  const videoDragRef = useRef<VideoSource | null>(null);
  const [patches, setPatches] = useState<Patch[]>(dreamPatches);
  const [text, setText] = useState("dream"), [font, setFont] = useState("system-ui, sans-serif"), [vertex, setVertex] = useState("dot");
  const [selected, setSelected] = useState<number | null>(null), [drag, setDrag] = useState<(XY & { wave: number }) | null>(null);
  const [positions, setPositions] = useState<Record<string, XY>>({});
  const [paused, setPaused] = useState(false), [bg, setBg] = useState("#000000"), [ink, setInk] = useState("#000000");
  const [bicolour, setBicolour] = useState(true), [ink2, setInk2] = useState("#ffffff");
  const canvas = useRef<HTMLCanvasElement>(null), panel = useRef<HTMLDivElement>(null);
  const [bayCollapsed, setBayCollapsed] = useState(false);
  const [bayPosition, setBayPosition] = useState<XY | null>(null);
  const bayDrag = useRef<XY | null>(null);
  const bay = useRef<HTMLElement>(null);
  const dragMoved = useRef(false);
  const dragRef = useRef<(XY & { wave: number }) | null>(null);
  const sockets = useRef<Record<string, HTMLButtonElement | null>>({});
  const live = useRef({ waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, videoPatches });
  const renderSnapshot = useRef<{ state: typeof live.current; width: number; height: number; displayWidth: number } | null>(null);
  useEffect(() => { live.current = { waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, videoPatches }; }, [waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, videoPatches]);
  const undoStack = useRef<(typeof live.current)[]>([]);
  const lastEdit = useRef({ snapshot: { waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, videoPatches }, time: 0, key: "" });
  const restoring = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  useEffect(() => {
    const next = live.current, prior = lastEdit.current.snapshot;
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter(key => JSON.stringify(next[key]) !== JSON.stringify(prior[key]));
    if (!changed.length) return;
    if (restoring.current) { restoring.current = false; lastEdit.current = { snapshot: next, time: 0, key: "" }; return; }
    const topology = (state: typeof next) => JSON.stringify([state.videoPatches, state.patches.map(p => [p.id, p.wave, p.target])]);
    const key = changed.join(","), now = Date.now();
    // A continuous knob/text gesture is one undo step; cable actions always get their own step.
    const merge = key === lastEdit.current.key && now - lastEdit.current.time < 400 && topology(next) === topology(prior);
    if (!merge) { undoStack.current.push(prior); if (undoStack.current.length > 100) undoStack.current.shift(); }
    lastEdit.current = { snapshot: next, time: now, key }; setCanUndo(undoStack.current.length > 0);
  }, [waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, videoPatches]);
  const undo = useCallback(() => {
    const state = undoStack.current.pop(); if (!state) return;
    restoring.current = true;
    setWaves(state.waves); setValues(state.values); setManual(state.manual); setModes(state.modes); setPatches(state.patches); setVideoPatches(state.videoPatches);
    setText(state.text); setFont(state.font); setVertex(state.vertex); setRepeatMode(state.repeatMode); setSamplingMode(state.samplingMode); setGlyphPattern(state.glyphPattern); setPaused(state.paused); setBg(state.bg); setInk(state.ink); setBicolour(state.bicolour); setInk2(state.ink2); setFeedbackBlend(state.feedbackBlend);
    setSelected(null); setSelectedVideo(null); setDrag(null); setVideoDrag(null); dragRef.current = null; videoDragRef.current = null;
    setCanUndo(undoStack.current.length > 0);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey && !(event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]"))) { event.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, [undo]);
  useEffect(() => {
    const measure = () => {
      if (!panel.current) return;
      const box = panel.current.getBoundingClientRect(), next: Record<string, XY> = {};
      for (const [key, el] of Object.entries(sockets.current)) if (el) { const r = el.getBoundingClientRect(); next[key] = { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; }
      setPositions(next);
    };
    const observer = new ResizeObserver(measure); if (panel.current) observer.observe(panel.current);
    const rack = panel.current; rack?.addEventListener("scroll", measure, true);
    measure(); window.addEventListener("resize", measure);
    return () => { observer.disconnect(); rack?.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    let raf = 0, previous = 0, lastFrame = -Infinity, feedbackWasOn = false, cacheKey = "", lastRebuild = -100;
    const moduleSignals = [0, 0, 0];
    let feedbackSignal = 0, feedbackTick = -Infinity;
    let feedbackClockOrigin = performance.now();
    const history = document.createElement("canvas"), historyCtx = history.getContext("2d")!;
    const phases = [0, .25, .5], source = document.createElement("canvas"), sctx = source.getContext("2d", { willReadFrequently: true })!;
    const heat = document.createElement("canvas"); heat.width = 64; heat.height = 64;
    const hctx = heat.getContext("2d")!;
    const heatPixels = hctx.createImageData(64, 64);
    let glyphs: Glyph[] = [];
    const nodes: VideoSource[] = ["typography", "sampling", "grid", "vertex", "feedback"];
    const outputs = Object.fromEntries(nodes.map(node => [node, document.createElement("canvas")])) as Record<VideoSource, HTMLCanvasElement>;
    const previousOutputs = Object.fromEntries(nodes.map(node => [node, document.createElement("canvas")])) as Record<VideoSource, HTMLCanvasElement>;
    const blank = document.createElement("canvas"); blank.width = 1; blank.height = 1;
    let routeKey = "";
    let gpu = createKineticGPU();
    const frame = (now: number, manualFrame = false) => {
      if (renderSnapshot.current && !manualFrame) { raf = requestAnimationFrame(frame); return; }
      // Keep React/pointer updates independent of the expensive image pipeline.
      if (!manualFrame && now - lastFrame < 1000 / 30 - .5) { raf = requestAnimationFrame(frame); return; }
      lastFrame = now;
      if (gpu && !gpu.available()) { gpu.dispose(); gpu = null; }
      const s = renderSnapshot.current?.state || live.current, dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
      if (!s.paused) { s.waves.forEach((w, i) => { if (w.on) phases[i] += dt * w.speed; }); }
      const el = canvas.current, ctx = el?.getContext("2d");
      if (el && ctx) {
        el.dataset.renderer = gpu ? "webgl2" : "canvas2d";
        const output = outputSettings.current;
        const host = stage.current!;
        const rect = fitCanvas(host.offsetWidth, host.offsetHeight, output.canvasFormat, output.customWidth, output.customHeight);
        const dimensions = outputDimensions(rect.width, rect.height, output.canvasFormat, output.outputResolution, output.customWidth, output.customHeight);
        const W = renderSnapshot.current?.width || recordingSession.current?.width || dimensions.width, H = renderSnapshot.current?.height || recordingSession.current?.height || dimensions.height, dpr = 1, pixelScale = W / Math.max(64, renderSnapshot.current?.displayWidth || rect.width);
        if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) { el.width = Math.round(W * dpr); el.height = Math.round(H * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const screen = s.videoPatches.find(p => p.target === "canvas");
        if (!screen) {
          ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H);
          historyCtx.clearRect(0, 0, history.width, history.height); feedbackTick = -Infinity;
          gpu?.begin(W, H, "disconnected", false);
          if (!manualFrame) raf = requestAnimationFrame(frame); return;
        }
        const field = (i: number, x: number, y: number) => { if (i === 3) return s.modes.feedback ? feedbackSignal : 0; if (i >= 4) return s.modes[(["sampling", "grid", "vertex"] as const)[i - 4]] ? moduleSignals[i - 4] : 0; const w = s.waves[i]; return w.on ? waveValue(w.shape, phases[i] + w.phase + (x * (1 - w.direction) + y * w.direction) * w.rate, i + 1) * w.amp : 0; };
        const signals = [...s.waves.map((_, i) => field(i, .5, .5)), s.modes.feedback ? feedbackSignal : 0, ...moduleSignals], mod = { ...s.values };
        const at = (target: Target, x: number, y: number, glyph?: Glyph) => {
          const spec = specs.find(c => c[0] === target)!;
          const sum = s.patches.filter(p => p.target === target).reduce((v, p) => v + field(p.wave, glyph ? (x - glyph.x) / glyph.em : x / W, glyph ? (y - glyph.y) / glyph.em : y / H) * p.amount / 100, 0);
          return clamp(s.values[target] + sum * (spec[3] - spec[2]) / 2, spec[2], spec[3]);
        };
        for (const [key, , min, max] of specs) {
          const sum = s.patches.filter(p => p.target === key).reduce((v, p) => v + signals[p.wave] * p.amount / 100, 0);
          mod[key] = clamp(s.values[key] + sum * (max - min) / 2, min, max);
        }
        // Module outputs are one-frame-delayed control signals, allowing stable feedback routing.
        (["sampling", "grid", "vertex"] as const).forEach((group, i) => {
          const controls = specs.filter(spec => spec[5] === group);
          moduleSignals[i] = s.modes[group] ? controls.reduce((sum, [key, , min, max]) => sum + 2 * (mod[key] - min) / (max - min) - 1, 0) / controls.length : 0;
        });
        if (history.width !== W || history.height !== H) { history.width = W; history.height = H; feedbackSignal = 0; feedbackTick = -Infinity; }
        if (!s.modes.feedback && feedbackWasOn) { historyCtx.clearRect(0, 0, history.width, history.height); feedbackSignal = 0; feedbackTick = -Infinity; }
        feedbackWasOn = s.modes.feedback;
        // Shared 30Hz refresh grid keeps history updates independent of export FPS.
        const feedbackNow = Math.floor((now - feedbackClockOrigin) / (1000 / 30) + 1e-6) * (1000 / 30);
        const feedbackInterval = Math.ceil(mod.feedbackRefresh / (1000 / 30)) * (1000 / 30);
        const feedbackDue = s.modes.feedback && !s.paused && feedbackNow - feedbackTick >= feedbackInterval - 1e-6;
        // The output holds the previous input sample; it cannot create an instantaneous self-loop.
        if (feedbackDue) {
          const inputs = s.patches.filter(p => p.target === "feedbackAmount");
          const input = inputs.length ? inputs.reduce((sum, p) => sum + signals[p.wave] * p.amount / 100, 0) : signals.slice(0, 3).reduce((sum, v) => sum + v, 0) / 3;
          feedbackSignal = clamp(input + feedbackSignal * mod.feedbackAmount, -1, 1);
          feedbackTick = feedbackNow;
        }
        const canvasUnit = Math.min(W, H) / 100;
        const size = Math.round(mod.fontSize * canvasUnit), weight = Math.round(mod.weight / 10) * 10;
        const key = `${W}|${H}|${s.text}|${s.font}|${size}|${weight}|${s.ink}|${s.manual.tracking}`;
        // Cap expensive glyph rasterisation at 20fps; wave evaluation and drawing remain at display rate.
        if (key !== cacheKey && (manualFrame || now - lastRebuild >= 50 || !cacheKey)) {
          source.width = W; source.height = H; sctx.fillStyle = s.ink; sctx.textAlign = "center"; sctx.textBaseline = "middle";
          const lines = s.text.split("\n"); let fitted = Math.min(size, H * .75 / Math.max(1, lines.length));
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          const availableTextWidth = Math.max(1, W - Math.min(W * .2, 48 * pixelScale));
          const widthOf = (line: string) => Array.from(line).reduce((width, char) => width + sctx.measureText(char).width, 0) + Math.max(0, Array.from(line).length - 1) * s.manual.tracking / 100 * fitted;
          // Tracking follows the fitted font size, including during auto-fit.
          for (let n = 0; n < 5; n++) { const widest = Math.max(1, ...lines.map(widthOf)); if (widest <= availableTextWidth) break; fitted *= (availableTextWidth) / widest; sctx.font = `${weight} ${fitted}px ${s.font}`; }
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
                glyphs.push({ canvas: c, x: gx, y: gy, width, height, em: fitted });
                sctx.drawImage(c, gx, gy);
              }
              x += m.width + s.manual.tracking / 100 * fitted;
            }
          });
          cacheKey = key; lastRebuild = now;
        }
        // Colour the typography source once; downstream nodes preserve the incoming pixels.
        const typed = outputs.typography, typedCtx = typed.getContext("2d", { willReadFrequently: true })!;
        for (const node of gpu ? ["typography" as const] : nodes) for (const image of gpu ? [outputs[node]] : [outputs[node], previousOutputs[node]]) {
          if (image.width !== W || image.height !== H) { image.width = W; image.height = H; }
        }
        const nextRouteKey = JSON.stringify(s.videoPatches);
        if (routeKey !== nextRouteKey) { historyCtx.clearRect(0, 0, history.width, history.height); nodes.forEach(node => previousOutputs[node].getContext("2d")!.clearRect(0, 0, W, H)); feedbackTick = -Infinity; routeKey = nextRouteKey; }
        typedCtx.clearRect(0, 0, W, H); typedCtx.drawImage(source, 0, 0);
        if (s.bicolour) {
          const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
          const cold = rgb(s.ink), hot = rgb(s.ink2), total = s.patches.reduce((v, p) => v + Math.abs(p.amount / 100), 0);
          for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const signal = total ? s.patches.reduce((v, p) => v + field(p.wave, x / 63, y / 63) * p.amount / 100, 0) / Math.max(1, total) : 0;
            const t = clamp((signal + 1) / 2, 0, 1), offset = (y * 64 + x) * 4;
            for (let c = 0; c < 3; c++) heatPixels.data[offset + c] = Math.round(cold[c] * (1 - t) + hot[c] * t);
            heatPixels.data[offset + 3] = 255;
          }
          hctx.putImageData(heatPixels, 0, 0); typedCtx.globalCompositeOperation = "source-in"; typedCtx.drawImage(heat, 0, 0, W, H); typedCtx.globalCompositeOperation = "source-over";
        }
        if (gpu) {
          try {
          const renderer = gpu;
          const gpuBlank = renderer.begin(W, H, nextRouteKey, s.modes.feedback);
        const resolved = new Map<VideoSource, GPUFrame>([["typography", renderer.load(typed)]]), visiting = new Set<VideoSource>(), cyclic = new Set<VideoSource>();
        const evaluate = (node: VideoSource): GPUFrame => {
          const cached = resolved.get(node); if (cached) return cached;
          // Cyclic video cables read the previous frame, never recurse indefinitely.
          if (visiting.has(node)) { cyclic.add(node); return renderer.previous(node); }
          visiting.add(node);
          const route = s.videoPatches.find(p => p.target === node);
          const input = route ? evaluate(route.source) : gpuBlank;
          // Bypass shares the incoming frame; it needs no full-canvas copy.
          if (node === "typography" || !s.modes[node]) { visiting.delete(node); resolved.set(node, input); return input; }
          let out: GPUFrame;
          if (node === "feedback") {
            out = renderer.feedback(input, mod.feedbackAmount, blendModes.findIndex(mode => mode === s.feedbackBlend), feedbackDue, node);
          } else if (node === "grid") {
            const scale = mod.repeatScale / 100, angle = mod.repeatAngle * Math.PI / 180;
            const cx = W / 2 + mod.positionX / 100 * W, cy = H / 2 + mod.positionY / 100 * H;
            const placements: number[] = [];
            const drawCopy = (dx: number, dy: number) => { placements.push(cx + dx, cy + dy, W * scale, H * scale); };
            if (s.repeatMode === "single") drawCopy(0, 0);
            else if (s.repeatMode === "line") {
              const count = Math.round(s.manual.repeatCount), spacing = mod.repeatSpacingX / 100 * W;
              for (let i = 0; i < count; i++) { const offset = (i - (count - 1) / 2) * spacing; drawCopy(Math.cos(angle) * offset, Math.sin(angle) * offset); }
            } else {
              const columns = Math.round(s.manual.repeatColumns), rows = Math.round(s.manual.repeatRows);
              for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) { const dx = (x - (columns - 1) / 2) * mod.repeatSpacingX / 100 * W, dy = (y - (rows - 1) / 2) * mod.repeatSpacingY / 100 * H; drawCopy(dx * Math.cos(angle) - dy * Math.sin(angle), dx * Math.sin(angle) + dy * Math.cos(angle)); }
            }
            out = renderer.repeat(input, placements, node);
          } else {
            const glyphGPU = node === "vertex" && s.vertex === "glyph";
            const points: GPUStamp[] = [];
            // Glyph-relative sampling also applies to pixels received from other modules.
            const em = glyphs[0]?.em || size, step = Math.max(1, Math.round(mod.step / 100 * em));
            const lineage = new Set<VideoSource>();
            const glyphAligned = (current: VideoSource): boolean => {
              if (current === "typography") return true;
              if (lineage.has(current) || s.modes[current]) return false;
              lineage.add(current); const upstream = s.videoPatches.find(p => p.target === current); return upstream ? glyphAligned(upstream.source) : false;
            };
            const regions = route && glyphAligned(route.source) ? glyphs.map(g => ({ x: Math.ceil(g.x + 4), y: Math.ceil(g.y + 4), width: g.width - 8, height: g.height - 8, step: Math.max(1, Math.round(at("step", g.x + g.em / 2, g.y + g.em / 2, g) / 100 * g.em)) })) : [{ x: 0, y: 0, width: input.width, height: input.height, step }];
            const xOnly = node === "sampling" && s.samplingMode === "x", yOnly = node === "sampling" && s.samplingMode === "y";
            for (const region of regions) for (let y = region.y; y < region.y + region.height; y += xOnly ? Math.max(1, Math.round(pixelScale)) : region.step) for (let x = region.x; x < region.x + region.width; x += yOnly ? Math.max(1, Math.round(pixelScale)) : region.step) {
              if (x < 0 || y < 0 || x >= input.width || y >= input.height) continue;
              const g = glyphs.find(g => x >= g.x && x < g.x + g.width && y >= g.y && y < g.y + g.height);
              const j = node === "sampling" ? at("jitter", x, y, g) * pixelScale : 0, px = x + (yOnly ? 0 : Math.sin(x * 73.17 + y) * j), py = y + (xOnly ? 0 : Math.cos(y * 37.71 + x) * j);
              const r = node === "vertex" ? at("vertexSize", x, y, g) * canvasUnit : 2.6 * pixelScale;
              points.push({ x, y, px, py, size: Math.max(1, r) });
            }
            out = renderer.render(input, points, glyphGPU ? 4 : xOnly || yOnly ? 3 : node === "vertex" && s.vertex === "square" ? 1 : node === "vertex" && s.vertex === "line" ? 2 : 0, s.manual.threshold, node === "sampling" ? s.manual.opacity : 1, s.manual.lineLength * pixelScale, node, node === "vertex" ? mod.vertexMix : 1, glyphGPU ? { pattern: s.glyphPattern, font: s.font, weight: Math.round(mod.weight) } : undefined, pixelScale);
          }
          visiting.delete(node); resolved.set(node, out); return out;
        };
        // Evaluate only ancestors of the selected canvas output.
        const finalImage = evaluate(screen.source);
        ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(renderer.present(finalImage), 0, 0, W, H);
        cyclic.forEach(node => { const image = resolved.get(node); if (image) renderer.snapshot(node, image); });
          } catch (error) { console.warn("K-TIC-SYNTH: GPU chain failed; using Canvas2D", error); gpu.dispose(); gpu = null; }
        } else {
        const resolved = new Map<VideoSource, HTMLCanvasElement>([["typography", typed]]), visiting = new Set<VideoSource>(), cyclic = new Set<VideoSource>();
        const evaluate = (node: VideoSource): HTMLCanvasElement => {
          const cached = resolved.get(node); if (cached) return cached;
          // Cyclic video cables read the previous frame, never recurse indefinitely.
          if (visiting.has(node)) { cyclic.add(node); return previousOutputs[node]; }
          visiting.add(node);
          const route = s.videoPatches.find(p => p.target === node);
          const input = route ? evaluate(route.source) : blank;
          // Bypass shares the incoming frame; it needs no full-canvas copy.
          if (node === "typography" || !s.modes[node]) { visiting.delete(node); resolved.set(node, input); return input; }
          const out = outputs[node], oc = out.getContext("2d", { willReadFrequently: true })!;
          oc.clearRect(0, 0, W, H);
          if (node === "feedback") {
            oc.drawImage(input, 0, 0);
            oc.globalCompositeOperation = s.feedbackBlend; oc.globalAlpha = mod.feedbackAmount;
            oc.drawImage(history, 0, 0, W, H); oc.globalAlpha = 1; oc.globalCompositeOperation = "source-over";
            if (feedbackDue) { historyCtx.clearRect(0, 0, history.width, history.height); historyCtx.drawImage(out, 0, 0, history.width, history.height); }
          } else if (node === "grid") {
            const scale = mod.repeatScale / 100, angle = mod.repeatAngle * Math.PI / 180;
            const cx = W / 2 + mod.positionX / 100 * W, cy = H / 2 + mod.positionY / 100 * H;
            
            const drawCopy = (dx: number, dy: number) => { oc.save(); oc.translate(cx + dx, cy + dy); oc.scale(scale, scale); oc.drawImage(input, -W / 2, -H / 2); oc.restore(); };
            if (s.repeatMode === "single") drawCopy(0, 0);
            else if (s.repeatMode === "line") {
              const count = Math.round(s.manual.repeatCount), spacing = mod.repeatSpacingX / 100 * W;
              for (let i = 0; i < count; i++) { const offset = (i - (count - 1) / 2) * spacing; drawCopy(Math.cos(angle) * offset, Math.sin(angle) * offset); }
            } else {
              const columns = Math.round(s.manual.repeatColumns), rows = Math.round(s.manual.repeatRows);
              for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) { const dx = (x - (columns - 1) / 2) * mod.repeatSpacingX / 100 * W, dy = (y - (rows - 1) / 2) * mod.repeatSpacingY / 100 * H; drawCopy(dx * Math.cos(angle) - dy * Math.sin(angle), dx * Math.sin(angle) + dy * Math.cos(angle)); }
            }
          } else {
            const useGPU = false;
            const pixels = input.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, input.width, input.height).data;
            // Glyph-relative sampling also applies to pixels received from other modules.
            const em = glyphs[0]?.em || size, step = Math.max(1, Math.round(mod.step / 100 * em));
            if (node === "vertex") { oc.globalAlpha = 1 - mod.vertexMix; oc.drawImage(input, 0, 0); oc.globalAlpha = mod.vertexMix; }
            else oc.globalAlpha = s.manual.opacity;
            const lineage = new Set<VideoSource>();
            const glyphAligned = (current: VideoSource): boolean => {
              if (current === "typography") return true;
              if (lineage.has(current) || s.modes[current]) return false;
              lineage.add(current); const upstream = s.videoPatches.find(p => p.target === current); return upstream ? glyphAligned(upstream.source) : false;
            };
            const regions = route && glyphAligned(route.source) ? glyphs.map(g => ({ x: Math.ceil(g.x + 4), y: Math.ceil(g.y + 4), width: g.width - 8, height: g.height - 8, step: Math.max(1, Math.round(at("step", g.x + g.em / 2, g.y + g.em / 2, g) / 100 * g.em)) })) : [{ x: 0, y: 0, width: input.width, height: input.height, step }];
            const characters = Array.from(s.glyphPattern || "*"); let glyphIndex = 0;
            const xOnly = node === "sampling" && s.samplingMode === "x", yOnly = node === "sampling" && s.samplingMode === "y";
            for (const region of regions) for (let y = region.y; y < region.y + region.height; y += xOnly ? Math.max(1, Math.round(pixelScale)) : region.step) for (let x = region.x; x < region.x + region.width; x += yOnly ? Math.max(1, Math.round(pixelScale)) : region.step) {
              if (x < 0 || y < 0 || x >= input.width || y >= input.height) continue;
              const offset = (y * input.width + x) * 4, alpha = pixels ? pixels[offset + 3] / 255 : 1;
              if (pixels && alpha < s.manual.threshold) continue;
              const g = glyphs.find(g => x >= g.x && x < g.x + g.width && y >= g.y && y < g.y + g.height);
              const j = node === "sampling" ? at("jitter", x, y, g) * pixelScale : 0, px = x + (yOnly ? 0 : Math.sin(x * 73.17 + y) * j), py = y + (xOnly ? 0 : Math.cos(y * 37.71 + x) * j);
              if (pixels && !useGPU) oc.fillStyle = oc.strokeStyle = `rgba(${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${alpha})`;
              const r = node === "vertex" ? at("vertexSize", x, y, g) * canvasUnit : 2.6 * pixelScale;
              oc.beginPath();
              if (xOnly || yOnly) oc.fillRect(px, py, pixelScale, pixelScale);
              else if (node === "vertex" && s.vertex === "glyph") { oc.font = `${Math.round(mod.weight)} ${Math.max(1, r)}px ${s.font}`; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillText(characters[glyphIndex++ % characters.length], px, py); }
              else if (node === "vertex" && s.vertex === "square") oc.fillRect(px - r / 2, py - r / 2, r, r);
              else if (node === "vertex" && s.vertex === "line") { oc.lineWidth = Math.max(1, r / 3); const len = s.manual.lineLength * pixelScale / (2 * Math.SQRT2); oc.moveTo(px - len, py - len); oc.lineTo(px + len, py + len); oc.stroke(); }
              else { oc.arc(px, py, Math.max(.5, r / 2), 0, Math.PI * 2); oc.fill(); }
            }
            oc.globalAlpha = 1;
          }
          visiting.delete(node); resolved.set(node, out); return out;
        };
        // Evaluate only ancestors of the selected canvas output.
        const finalImage = evaluate(screen.source);
        ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(finalImage, 0, 0, W, H);
        // Ordinary chains need no previous-frame snapshots; only cycles do.
        cyclic.forEach(node => { const pc = previousOutputs[node].getContext("2d")!; pc.clearRect(0, 0, W, H); const image = resolved.get(node); if (image) pc.drawImage(image, 0, 0); });
        }
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
      if (!manualFrame) raf = requestAnimationFrame(frame);
    };
    renderDriver.current = { start: () => previous || performance.now(), frame: now => frame(now, true), resume: () => { const now = performance.now(), offset = now - previous; feedbackClockOrigin += offset; lastRebuild += offset; previous = now; lastFrame = now; } };
    raf = requestAnimationFrame(frame); return () => { renderDriver.current = null; cancelAnimationFrame(raf); gpu?.dispose(); };
  }, []);
  const startRecording = () => {
    const image = canvas.current; if (!image || recordingSession.current || renderAbort.current) return;
    const o = outputSettings.current, host = stage.current!;
    const box = fitCanvas(host.offsetWidth, host.offsetHeight, o.canvasFormat, o.customWidth, o.customHeight);
    const wanted = outputDimensions(box.width, box.height, o.canvasFormat, o.outputResolution, o.customWidth, o.customHeight);
    if (image.width !== wanted.width || image.height !== wanted.height) { setPresetMessage("Canvas is resizing. Try Record again in a moment."); return; }
    const name = text.trim().slice(0, 32).replace(/[^a-z0-9_-]/gi, "-") || "image", width = image.width, height = image.height;
    try {
      recordingSession.current = recordCanvas(image, recordSeconds, (blob, error) => {
        recordingSession.current = null; setRecording(false);
        if (!blob) { setPresetMessage(error || "Could not record video."); return; }
        const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url;
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";
        a.download = `k-tic-synth-${name}-${width}x${height}.${extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        setPresetMessage(`Video saved · ${width} × ${height}`);
      });
      recordingStarted.current = performance.now(); setRecordElapsed(0); setRecording(true); setPresetMessage("Recording canvas. Keep this tab visible.");
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not start recording."); }
  };
  const startVideoRender = async () => {
    const image = canvas.current, driver = renderDriver.current; if (!image || !driver || recordingSession.current || renderAbort.current) return;
    const o = outputSettings.current, host = stage.current!;
    const box = fitCanvas(host.offsetWidth, host.offsetHeight, o.canvasFormat, o.customWidth, o.customHeight);
    const wanted = outputDimensions(box.width, box.height, o.canvasFormat, o.outputResolution, o.customWidth, o.customHeight);
    if (image.width !== wanted.width || image.height !== wanted.height) { setPresetMessage("Canvas is resizing. Try Render again in a moment."); return; }
    const controller = new AbortController(); renderAbort.current = controller;
    renderSnapshot.current = { state: structuredClone(live.current), width: image.width, height: image.height, displayWidth: box.width };
    const width = image.width, height = image.height, name = text.trim().slice(0, 32).replace(/[^a-z0-9_-]/gi, "-") || "image", start = driver.start();
    setRendering(true); setRenderProgress({ done: 0, total: recordSeconds * renderFps }); setPresetMessage(`Rendering every frame at ${renderFps} fps. This can take longer than playback.`);
    try {
      const blob = await renderVideo(image, recordSeconds, controller.signal, index => { if (index) driver.frame(start + index * 1000 / renderFps); }, (done, total) => setRenderProgress({ done, total }), renderFps, loopVideo);
      controller.signal.throwIfAborted(); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `k-tic-synth-${name}-${width}x${height}-${renderFps}fps${loopVideo ? "-loop" : ""}.mp4`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPresetMessage(`Rendered video saved · ${width} × ${height} · ${renderFps} fps`);
    } catch (error) { if (renderDriver.current) setPresetMessage(controller.signal.aborted ? "Video render cancelled." : error instanceof Error ? error.message : "Video render failed."); }
    finally { renderSnapshot.current = null; renderAbort.current = null; driver.resume(); if (renderDriver.current) setRendering(false); }
  };
  const exportPNG = () => {
    const image = canvas.current; if (!image || pngBusy) return;
    const o = outputSettings.current, host = stage.current!;
    const box = fitCanvas(host.offsetWidth, host.offsetHeight, o.canvasFormat, o.customWidth, o.customHeight);
    const wanted = outputDimensions(box.width, box.height, o.canvasFormat, o.outputResolution, o.customWidth, o.customHeight);
    if (image.width !== wanted.width || image.height !== wanted.height) { setPresetMessage("Canvas is resizing. Try PNG again in a moment."); return; }
    const savedWidth = image.width, savedHeight = image.height;
    setPngBusy(true);
    try { image.toBlob(blob => {
      setPngBusy(false); if (!blob) { setPresetMessage("Could not export PNG."); return; }
      const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url;
      a.download = `k-tic-synth-${text.trim().slice(0, 32).replace(/[^a-z0-9_-]/gi, "-") || "image"}-${savedWidth}x${savedHeight}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPresetMessage(`PNG saved · ${savedWidth} × ${savedHeight}`);
    }, "image/png"); } catch { setPngBusy(false); setPresetMessage("Could not export PNG."); }
  };
  const exportPreset = () => {
    const payload = { format: "k-tic-synth", version: 2, state: live.current };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `k-tic-synth-${text.trim().slice(0, 32).replace(/[^a-z0-9_-]/gi, "-") || "preset"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setPresetMessage("Preset exported.");
  };
  const applyPreset = (state: SynthState) => {
      setWaves(state.waves); setValues(state.values); setManual(state.manual); setModes(state.modes); setPatches(state.patches); setVideoPatches(state.videoPatches);
      setText(state.text); setFont(state.font); setVertex(state.vertex); setRepeatMode(state.repeatMode); setSamplingMode(state.samplingMode); setGlyphPattern(state.glyphPattern); setPaused(state.paused); setBg(state.bg); setInk(state.ink); setBicolour(state.bicolour); setInk2(state.ink2); setFeedbackBlend(state.feedbackBlend);
      setSelected(null); setSelectedVideo(null); setDrag(null); setVideoDrag(null); dragRef.current = null; videoDragRef.current = null;
  };
  const importPreset = async (file: File) => {
    try {
      if (file.size > 1024 * 1024) throw new Error("Preset files must be smaller than 1 MB.");
      const state = parsePreset(JSON.parse(await file.text()));
      applyPreset(state);
      setPresetMessage("Preset imported. Undo restores your previous settings.");
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not import this preset."); }
  };
  const loadDream = () => { setWaves(dreamWaves); setValues(initial); setManual(initialManual); setModes({ sampling: false, grid: false, vertex: true, feedback: false }); setPatches(dreamPatches); setVideoPatches(videoDefaults); setSelectedVideo(null); setText("dream"); setFont("system-ui, sans-serif"); setVertex("dot"); setRepeatMode("single"); setSamplingMode("xy"); setGlyphPattern("*+o"); setBg("#000000"); setInk("#000000"); setInk2("#ffffff"); setBicolour(true); setFeedbackBlend("source-over"); setPaused(false); setSelected(null); };
  const changeWave = (i: number, change: Partial<Wave>) => setWaves(all => all.map((w, n) => n === i ? { ...w, ...change } : w));
  const connect = (wave: number, target: Target) => { setPatches(all => all.some(p => p.wave === wave && p.target === target) ? all : [...all, { id: `${wave}-${target}`, wave, target, amount: 50 }]); setSelected(null); setDrag(null); };
  const connectVideo = (source: VideoSource, target: VideoTarget) => { setVideoPatches(all => [...all.filter(p => p.target !== target), { source, target }]); setSelectedVideo(null); setVideoDrag(null); };
  const videoPorts = (node: VideoSource | "canvas") => <div className="kp-video-ports">{node !== "typography" && <label>VIDEO IN<button className="kp-socket kp-video-socket" data-video-target={node} title="Click to unplug · select an output to reconnect" aria-label={`Video input ${node}`} ref={el => { sockets.current[`video-in-${node}`] = el; }} onClick={() => { if (selectedVideo) connectVideo(selectedVideo, node); else setVideoPatches(all => all.filter(p => p.target !== node)); }} /></label>}{node !== "canvas" && <label>VIDEO OUT<button className={`kp-socket kp-video-socket ${selectedVideo === node ? "selected" : ""}`} data-video-source={node} title="Drag to connect · right-click to unplug" aria-label={`Video output ${node}`} ref={el => { sockets.current[`video-out-${node}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelected(null); setSelectedVideo(selectedVideo === node ? null : node); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); videoDragRef.current = node; setVideoDrag({ source: node, x: e.clientX - r.left, y: e.clientY - r.top }); }} /></label>}</div>;
  const finishDrag = (e: PointerEvent) => {
    if (videoDragRef.current) { const source = videoDragRef.current; videoDragRef.current = null; const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-video-target]"); const target = hit?.dataset.videoTarget as VideoTarget | undefined; if (target) connectVideo(source, target); else setVideoDrag(null); return; }
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
  const outputSocket = (id: number) => <button className={`kp-socket ${selected === id ? "selected" : ""}`} data-mod-source={id} aria-label={`Patch output ${sourceNames[id].toLowerCase()}`} title="Drag to connect · right-click to unplug" style={{ borderColor: colors[id] }} ref={el => { sockets.current[`wave${id}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelectedVideo(null); setSelected(selected === id ? null : id); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); dragRef.current = { wave: id, x: e.clientX - r.left, y: e.clientY - r.top }; setDrag(dragRef.current); }} />;
  const cable = (a: XY, b: XY) => `M ${a.x} ${a.y} C ${a.x + 70} ${a.y}, ${b.x - 70} ${b.y}, ${b.x} ${b.y}`;
  return <main onContextMenu={e => {
      const socket = (e.target as Element).closest<HTMLElement>(".kp-socket"); if (!socket) return; e.preventDefault();
      const videoSource = socket.dataset.videoSource, videoTarget = socket.dataset.videoTarget, modSource = socket.dataset.modSource, target = socket.dataset.target;
      if (videoSource) setVideoPatches(all => all.filter(p => p.source !== videoSource));
      if (videoTarget) setVideoPatches(all => all.filter(p => p.target !== videoTarget));
      if (modSource !== undefined) setPatches(all => all.filter(p => p.wave !== Number(modSource)));
      if (target) setPatches(all => all.filter(p => p.target !== target));
      setSelected(null); setSelectedVideo(null);
    }} className="kp" style={{ "--kp-bg": bg } as CSSProperties}>
    <header className="kp-header"><Link href="/" onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); window.location.assign("/"); }}>← INDEX</Link><h1>K-TIC-SYNTH</h1><button aria-label="Undo last edit" title="Undo · ⌘/Ctrl Z" disabled={!canUndo} onClick={undo}>↶ UNDO</button><button onClick={() => setPaused(v => !v)}>{paused ? "▶ RUN" : "Ⅱ HOLD"}</button></header>
    <section ref={stage} className={`kp-stage${nativeView ? " kp-native-view" : ""}`}><canvas ref={canvas} style={viewSize.width ? nativeView ? { width: nativeSize.width, height: nativeSize.height, position: "relative", margin: "54px 16px 16px" } : { width: previewSize.width, height: previewSize.height, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" } : undefined} aria-label="Animated kinetic typography" /><span className="kp-caption">VISUAL SYNTHESIZER · THREE WAVE ENGINE</span></section>
    <div className="kp-controls"><div ref={panel} className="kp-rack" onPointerMove={e => { if (videoDrag && panel.current) { const r = panel.current.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left - videoDrag.x, e.clientY - r.top - videoDrag.y) > 3) dragMoved.current = true; setVideoDrag({ ...videoDrag, x: e.clientX - r.left, y: e.clientY - r.top }); } if (drag && panel.current) { const r = panel.current.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left - drag.x, e.clientY - r.top - drag.y) > 3) dragMoved.current = true; setDrag({ ...drag, x: e.clientX - r.left, y: e.clientY - r.top }); } }} onPointerUp={finishDrag} onPointerCancel={() => { dragRef.current = null; videoDragRef.current = null; setVideoDrag(null); setDrag(null); }}>
      <svg className="kp-cables" aria-hidden="true">{videoPatches.map(p => { const a = positions[`video-out-${p.source}`], b = positions[`video-in-${p.target}`]; return a && b ? <path key={`video-${p.target}`} className="kp-video-cable kp-removable-cable" onClick={e => { e.stopPropagation(); setVideoPatches(all => all.filter(item => item.target !== p.target)); }} d={cable(a, b)} stroke="#83d8b4" /> : null; })}{videoDrag && positions[`video-out-${videoDrag.source}`] && <path d={cable(positions[`video-out-${videoDrag.source}`], videoDrag)} stroke="#83d8b4" strokeDasharray="4 4" />}{patches.map(p => { const a = positions[`wave${p.wave}`], b = positions[p.target]; return a && b ? <path key={p.id} className="kp-removable-cable" onClick={e => { e.stopPropagation(); setPatches(all => all.filter(item => item.id !== p.id)); }} d={cable(a, b)} stroke={colors[p.wave]} /> : null; })}{drag && positions[`wave${drag.wave}`] && <path d={cable(positions[`wave${drag.wave}`], drag)} stroke={colors[drag.wave]} strokeDasharray="4 4" />}</svg>
      <section className="kp-waves"><div className="kp-title">01 / WAVE MODULATORS</div>
        {waves.map((w, i) => <div key={i} className="kp-wave" style={{ "--wave": colors[i] } as CSSProperties}><div className="kp-wavehead"><b>WAVE {i + 1}</b><button aria-pressed={w.on} onClick={() => changeWave(i, { on: !w.on })}>{w.on ? "ON" : "OFF"}</button><button className={`kp-socket ${selected === i ? "selected" : ""}`} data-mod-source={i} title="Drag to connect · right-click to unplug" aria-label={`Patch output wave ${i + 1}`} ref={el => { sockets.current[`wave${i}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelectedVideo(null); setSelected(selected === i ? null : i); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); dragRef.current = { wave: i, x: e.clientX - r.left, y: e.clientY - r.top }; setDrag(dragRef.current); }} /></div>
          <select className="kp-wave-shape" aria-label={`Wave ${i + 1} shape`} value={w.shape} onChange={e => changeWave(i, { shape: e.target.value as Shape })}>{(["sine", "triangle", "square", "noise"] as Shape[]).map(shape => <option key={shape} value={shape}>{shape.toUpperCase()}</option>)}</select>
          <div className="kp-wavecontrols">{([
            ["rate", "FREQ", .1, 6, .01], ["amp", "AMP", 0, 1, .01], ["speed", "SPEED · Hz", 0, 3, .01], ["direction", "DIR · X/Y", 0, 1, .01], ["phase", "PHASE", 0, 1, .01],
          ] as const).map(([key, label, min, max, step]) => <div className="kp-knob-control" key={key}><span>{label}</span><Knob name={`Wave ${i + 1} ${key}`} min={min} max={max} step={step} value={w[key]} onChange={next => changeWave(i, { [key]: next })} /></div>)}</div>
        </div>)}
        <section className="kp-module kp-feedback-module">{videoPorts("feedback")}<div className="kp-modulehead"><h2>FEEDBACK</h2><button aria-label="Enable feedback" aria-pressed={modes.feedback} onClick={() => setModes(m => ({ ...m, feedback: !m.feedback }))}>{modes.feedback ? "ON" : "OFF"}</button></div>
          <div className="kp-feedback-output"><span>MOD OUT</span>{outputSocket(3)}</div>
          <select aria-label="Feedback blend mode" value={feedbackBlend} onChange={e => setFeedbackBlend(e.target.value as GlobalCompositeOperation)}>{blendModes.map(mode => <option key={mode} value={mode}>{mode === "source-over" ? "NORMAL" : mode === "lighter" ? "ADD" : mode.toUpperCase()}</option>)}</select>
          {specs.filter(spec => spec[5] === "feedback").map(([key, label, min, max, step]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input feedback ${label}`} onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} /><div className="kp-knob-control"><span>{label}</span><Knob name={`feedback ${label}`} min={min} max={max} step={step} value={values[key]} onChange={next => setValues(v => ({ ...v, [key]: next }))} /></div></div>)}
        </section>
      </section>
      <section className="kp-modules"><div className="kp-title">02 / VISUAL OSCILLATORS</div><div className="kp-modulegrid">{(Object.keys(groups).filter(group => group !== "feedback") as (Exclude<keyof typeof groups, "feedback">)[]).map(group => <section className="kp-module" key={group}><div className="kp-modulehead"><h2>{groups[group]}</h2>{group !== "typography" && <button aria-pressed={modes[group]} onClick={() => setModes(m => ({ ...m, [group]: !m[group] }))}>{modes[group] ? "ON" : "OFF"}</button>}</div>
        {videoPorts(group)}
        {group === "grid" && <select aria-label="Repeat mode" value={repeatMode} onChange={e => setRepeatMode(e.target.value as RepeatMode)}><option value="single">SINGLE</option><option value="line">LINE</option><option value="grid">GRID</option></select>}
        {group === "sampling" && <select aria-label="Sampling axes" value={samplingMode} onChange={e => setSamplingMode(e.target.value as SamplingMode)}><option value="xy">X + Y</option><option value="x">X ONLY</option><option value="y">Y ONLY</option></select>}
        {group === "vertex" && <select aria-label="Vertex shape" value={vertex} onChange={e => setVertex(e.target.value)}><option value="line">LINE</option><option value="dot">DOT</option><option value="square">SQUARE</option><option value="glyph">GLYPH</option></select>}{group === "typography" && <select aria-label="System font" value={font} onChange={e => setFont(e.target.value)}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option></select>}
        {group === "vertex" && vertex === "glyph" && <label className="kp-glyph-input">GLYPHS<input aria-label="Vertex glyph characters" value={glyphPattern} maxLength={64} onChange={e => setGlyphPattern(e.target.value)} onBlur={() => { if (!glyphPattern.trim()) setGlyphPattern("*"); }} /></label>}
        {specs.filter(c => c[5] === group && (group !== "grid" || (repeatMode !== "single" || !["repeatSpacingX", "repeatSpacingY", "repeatAngle"].includes(c[0]))) && (repeatMode !== "line" || c[0] !== "repeatSpacingY")).map(([key, label, min, max, step]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input ${group} ${label}`} onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} /><div className="kp-knob-control"><span>{label}</span><Knob name={`${group} ${label}`} min={min} max={max} step={step} value={values[key]} onChange={next => setValues(v => ({ ...v, [key]: next }))} /></div></div>)}
        <div className="kp-manual">{manualSpecs.filter(c => c[5] === group && (group !== "grid" || (repeatMode === "line" ? c[0] === "repeatCount" : repeatMode === "grid" ? c[0] !== "repeatCount" : false)) && (group !== "vertex" || vertex === "line")).map(([key, label, min, max, step]) => <div className="kp-knob-control" key={key}><span>{label}</span><Knob name={`${group} ${label}`} min={min} max={max} step={step} value={manual[key]} onChange={next => setManual(v => ({ ...v, [key]: next }))} /></div>)}</div>
      </section>)}<section className="kp-module"><div className="kp-modulehead"><h2>CANVAS</h2></div>{videoPorts("canvas")}<button onClick={() => setVideoPatches(videoDefaults)}>DEFAULT ROUTE</button></section></div></section>

    </div></div>
      <section ref={bay} className={`kp-patches kp-floating ${bayCollapsed ? "is-collapsed" : ""}`} aria-label="Patch bay" style={bayPosition ? { left: bayPosition.x, top: bayPosition.y, bottom: "auto" } : undefined}><div className="kp-title kp-bay-handle" onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; const r = bay.current!.getBoundingClientRect(); bayDrag.current = { x: e.clientX - r.left, y: e.clientY - r.top }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!bayDrag.current || !bay.current) return; const r = bay.current.getBoundingClientRect(); setBayPosition({ x: clamp(e.clientX - bayDrag.current.x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(e.clientY - bayDrag.current.y, 8, Math.max(8, window.innerHeight - r.height - 8)) }); }} onPointerUp={() => { bayDrag.current = null; }} onPointerCancel={() => { bayDrag.current = null; }}>03 / PATCH BAY <span><button aria-label={bayCollapsed ? "Expand patch bay" : "Collapse patch bay"} aria-expanded={!bayCollapsed} onClick={() => setBayCollapsed(v => !v)}>{bayCollapsed ? "+" : "−"}</button> <button aria-label="Clear all video connections" title="Disconnect all video cables" disabled={videoPatches.length === 0} onClick={() => { setVideoPatches([]); setSelectedVideo(null); setVideoDrag(null); videoDragRef.current = null; }}>ZERO VIDEO</button> <button aria-label="Zero all modulation connection amounts" title="Set modulation amounts to 0% while keeping cables connected" disabled={!patches.some(p => p.amount !== 0)} onClick={() => setPatches(all => all.map(p => ({ ...p, amount: 0 })))}>ZERO AMOUNTS</button> <button onClick={() => { setPatches([]); setVideoPatches([]); setSelectedVideo(null); setSelected(null); }}>CLEAR</button></span></div><div className="kp-bay-content" hidden={bayCollapsed}><p>{selectedVideo ? `VIDEO ${selectedVideo.toUpperCase()} · choose a video input` : selected === null ? "Drag or click sockets to connect. Click a cable/input to unplug." : `${sourceNames[selected]} selected · choose an input`}</p>{videoPatches.map(p => <div className="kp-video-patch" key={`video-${p.target}`}><b>VIDEO · {p.source.toUpperCase()} → {p.target.toUpperCase()}</b><button aria-label={`Remove video ${p.source} to ${p.target}`} onClick={() => setVideoPatches(all => all.filter(item => item.target !== p.target))}>×</button></div>)}{patches.length === 0 && videoPatches.length === 0 && <p>No cables connected.</p>}{patches.map(p => { const c = specs.find(c => c[0] === p.target)!; return <div className="kp-patch" key={p.id} style={{ "--wave": colors[p.wave] } as CSSProperties}><b>{sourceNames[p.wave]} → {c[5]} / {c[1]}</b><button aria-label={`Remove ${sourceNames[p.wave]} to ${c[5]} ${c[1]}`} onClick={() => setPatches(all => all.filter(item => item.id !== p.id))}>×</button><div className="kp-knob-control kp-amount"><span>AMOUNT · %</span><Knob name={`Amount ${sourceNames[p.wave]} to ${c[5]} ${c[1]}`} min={-100} max={100} step={1} value={p.amount} onChange={next => setPatches(all => all.map(item => item.id === p.id ? { ...item, amount: next } : item))} /></div></div>; })}</div></section>
    {outputOpen && <section id="kp-output-window" ref={outputWindow} role="dialog" aria-label="Output settings" tabIndex={-1} className="kp-output-window" style={outputPosition ? { left: outputPosition.x, top: outputPosition.y, right: "auto", bottom: "auto" } : undefined} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); closeOutput(); } }}>
      <div className="kp-output-handle" onPointerDown={e => { if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return; e.preventDefault(); const r = outputWindow.current!.getBoundingClientRect(); outputDrag.current = { x: e.clientX - r.left, y: e.clientY - r.top }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!outputDrag.current || !outputWindow.current) return; const r = outputWindow.current.getBoundingClientRect(); setOutputPosition({ x: clamp(e.clientX - outputDrag.current.x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(e.clientY - outputDrag.current.y, 8, Math.max(8, window.innerHeight - r.height - 8)) }); }} onPointerUp={() => { outputDrag.current = null; }} onPointerCancel={() => { outputDrag.current = null; }}>OUTPUT <button aria-label="Close output settings" onClick={closeOutput}>×</button></div>
      <div className="kp-output-tools"><select disabled={recording || rendering} aria-label="Canvas format" value={canvasFormat} onChange={e => setCanvasFormat(e.target.value as CanvasFormat)}><option value="screen">SCREEN</option><option value="square">SQUARE · 1:1</option><option value="landscape">LANDSCAPE · 16:9</option><option value="portrait">PORTRAIT · 9:16</option><option value="custom">CUSTOM</option></select>{canvasFormat === "custom" ? <><input disabled={recording || rendering} aria-label="Custom canvas width" type="number" min={64} max={4096} defaultValue={customWidth} onBlur={e => { const n = Math.round(Number(e.target.value)); if (n >= 64 && n <= 4096) setCustomWidth(n); else e.target.value = String(customWidth); }} /><span>×</span><input disabled={recording || rendering} aria-label="Custom canvas height" type="number" min={64} max={4096} defaultValue={customHeight} onBlur={e => { const n = Math.round(Number(e.target.value)); if (n >= 64 && n <= 4096) setCustomHeight(n); else e.target.value = String(customHeight); }} /></> : <select disabled={recording || rendering} aria-label="Output resolution" value={outputResolution} onChange={e => setOutputResolution(Number(e.target.value))}><option value={0}>SCREEN SIZE</option><option value={1024}>1K · 1024</option><option value={1920}>HD · 1920</option><option value={2048}>2K · 2048</option><option value={4096}>4K · 4096</option></select>}<button aria-label="Inspect native pixels" aria-pressed={nativeView} onClick={() => { setNativeView(v => !v); stage.current?.scrollTo(0, 0); }}>{nativeView ? "FIT" : "100%"}</button><span className="kp-output-dimensions">{nativeSize.width} × {nativeSize.height}</span><button onClick={exportPNG} disabled={pngBusy || rendering}>{pngBusy ? "SAVING…" : "PNG ↓"}</button></div>
      <div className="kp-video-tools"><b>VIDEO</b><select aria-label="Recording duration" disabled={recording || rendering} value={recordSeconds} onChange={e => setRecordSeconds(Number(e.target.value))}><option value={5}>5 SECONDS</option><option value={10}>10 SECONDS</option><option value={20}>20 SECONDS</option></select><button disabled={rendering} className={recording ? "is-recording" : ""} onClick={() => recording ? recordingSession.current?.stop() : startRecording()}>{recording ? "STOP & SAVE" : "● RECORD"}</button><select aria-label="Render frame rate" disabled={recording || rendering} value={renderFps} onChange={e => setRenderFps(Number(e.target.value) as 30 | 60)}><option value={30}>RENDER · 30 FPS</option><option value={60}>RENDER · 60 FPS</option></select><label><input type="checkbox" disabled={recording || rendering} checked={loopVideo} onChange={e => setLoopVideo(e.target.checked)} /> LOOP BLEND</label><button disabled={recording} onClick={() => rendering ? renderAbort.current?.abort() : void startVideoRender()}>{rendering ? "CANCEL RENDER" : "RENDER VIDEO"}</button><span role="status">{rendering ? `RENDERING · ${renderProgress.done} / ${renderProgress.total} frames` : recording ? `${recordElapsed.toFixed(1)} / ${recordSeconds}s` : "Current output size · MP4 / WebM"}</span>{rendering && <progress aria-label="Video render progress" value={renderProgress.done} max={renderProgress.total} />}<p>Record: live capture, 30 fps target. Render: every frame at selected FPS. Loop blends the final 0.5s to the opening frame.</p></div>
    </section>}
    <footer className="kp-footer"><button ref={outputButton} className="kp-output-trigger" aria-expanded={outputOpen} aria-controls="kp-output-window" onClick={() => outputOpen ? closeOutput() : setOutputOpen(true)}>{rendering ? "RENDER · OUTPUT" : recording ? "● REC · OUTPUT" : "OUTPUT"}</button><div className="kp-preset-tools"><select aria-label="Load built-in preset" defaultValue="" onChange={e => { if (e.target.value === "dream") { loadDream(); setPresetMessage("Dream loaded. Undo restores your previous settings."); } const preset = kineticPresets.find(p => p.id === e.target.value); if (preset) { applyPreset(parsePreset(preset.preset)); setPresetMessage(`${preset.name} loaded. Undo restores your previous settings.`); } e.target.value = ""; }}><option value="" disabled>PRESETS</option><option value="dream">Dream</option>{kineticPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={() => presetInput.current?.click()}>IMPORT</button><button onClick={exportPreset}>EXPORT</button><input ref={presetInput} type="file" accept=".json,application/json" aria-label="Import preset file" hidden onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importPreset(file); }} /><span role="status">{presetMessage}</span></div><label>TEXT <textarea aria-label="Text" value={text} onChange={e => setText(e.target.value)} rows={1} /></label><label>BACKGROUND <input aria-label="Background color" type="color" value={bg} onChange={e => setBg(e.target.value)} /></label><button className="kp-bicolour" aria-pressed={bicolour} onClick={() => setBicolour(v => !v)}>BI-COLOUR</button>{bicolour && <label>INK 2 <input aria-label="Second ink color" type="color" value={ink2} onChange={e => setInk2(e.target.value)} /></label>}<label>INK <input aria-label="Ink color" type="color" value={ink} onChange={e => setInk(e.target.value)} /></label></footer>
  </main>;
}
