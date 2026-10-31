"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { SquareArrowRightEnter, Grid3X3, Settings2, SlidersHorizontal, SlidersVertical, Link as LinkIcon, BookType, Blend, Shuffle, MoveHorizontal, MoveVertical, Scaling, BetweenHorizontalStart, BetweenVerticalStart, RotateCw, Copy, Columns3, Rows3 } from "lucide-react";
import { fitCanvas, outputDimensions, type CanvasFormat } from "./kinetic-output";
import { renderVideo } from "./kinetic-video-render";
import { recordCanvas } from "./kinetic-recording";
import { waveDivisions, waveHz, sampleWave, type Wave, type Shape, type WaveDivision } from "./kinetic-waves";
export { waveValue } from "./kinetic-waves";
import { connectVideoPatch, readVideoChain, writeVideoChain, readSourceVideoChain, writeSourceVideoChain, moveVideoModule, videoModules, type VideoSource, type VideoTarget, type VideoPatch, type VideoModule } from "./kinetic-video-chain";
import { drawImageLayers, decodeLayerImage, imageByteLimit, imageLimit, type ImageLayer } from "./kinetic-image-layers";
import { fontFamily, detectFontFormat, validFontData, validateSVG, decodeSVG, loadImportedFont, type ImportedFont, type VertexSVG } from "./kinetic-custom-assets";
import { svgRasterSize } from "./kinetic-svg-quality";
import { OpticalKerning } from "./kinetic-optical-kerning";
import { spacedSites } from "./kinetic-spacing";
import { RasterCache } from "./kinetic-raster-cache";
import { indexModulation } from "./kinetic-modulation";
import { kineticPresets } from "./kinetic-presets";
import { userKineticPresets } from "./kinetic-user-presets";
import defaultKineticPreset from "./kinetic-default-preset.json";
import KineticTimeline from "./kinetic-timeline-editor";
import { timelineDefaults, evaluateTrack, timelineAt, parseTimeline, type TimelineData } from "./kinetic-timeline";
import { samplingDetailScale } from "./kinetic-sampling-detail";
import GlyphOriginEditor from "./kinetic-glyph-origin-editor";
import { firstGridCoordinate, glyphSamplingRegion, parseGlyphOrigins, type GlyphOriginMap } from "./kinetic-glyph-origins";
import { stampOrientation } from "./kinetic-vertex-scatter";
import { createKineticGPU, type GPUStamp, type GPUFrame } from "./kinetic-gpu";
import type { CSSProperties, PointerEvent } from "react";
type RepeatMode = "single" | "line" | "grid";
type SamplingMode = "xy" | "x" | "y";

const specs = [
  ["step", "Step · % em", 0, 10, .01, "sampling"], ["jitter", "Jitter", 0, 35, .1, "sampling"],
  ["positionX", "Position X · %", -100, 100, .1, "grid"], ["positionY", "Position Y · %", -100, 100, .1, "grid"],
  ["repeatScale", "Scale · %", 5, 200, 1, "grid"], ["repeatSpacingX", "Spacing X · %", 0, 100, .1, "grid"], ["repeatSpacingY", "Spacing Y · %", 0, 100, .1, "grid"], ["repeatAngle", "Angle · °", -180, 180, 1, "grid"],
  ["vertexSize", "Size · % em", 0, 10, .01, "vertex"], ["vertexMix", "Mix", 0, 1, .01, "vertex"],
  ["fontSize", "Size · % canvas", 5, 75, .5, "typography"], ["weight", "Weight", 100, 900, 10, "typography"],
  ["feedbackAmount", "Input / amount", 0, .98, .01, "feedback"], ["feedbackRefresh", "Refresh · ms", 16, 2000, 1, "feedback"],
] as const;
const extraSpecs = [
  ["threshold", 0.01, 1], ["opacity", 0, 1], ["repeatCount", 1, 32],
  ["repeatColumns", 1, 12], ["repeatRows", 1, 12], ["lineLength", 1, 80],
  ["tracking", -10, 30], ["samplingThicknessX", 0, 10], ["samplingThicknessY", 0, 10],
  ["stripSpacing", 0, 10], ["vertexSpacing", 0, 10], ["vertexScatter", 0, 180],
  ["lineHeight", 0.5, 3], ["secondSize", 5, 75], ["secondWeight", 100, 900],
  ["secondX", -100, 100], ["secondY", -100, 100], ["secondTracking", -10, 30],
  ["secondLineHeight", 0.5, 3],
] as const;
const switchTargets = ["vertexSource", "motionMode", "motionBlend", "feedbackBlendMode", "samplingAxes", "textAlignMode", "kerningMode", "feedbackTimingMode"] as const;
type NumericExtra = typeof extraSpecs[number][0];
type SwitchTarget = typeof switchTargets[number];
type Target = typeof specs[number][0] | NumericExtra | SwitchTarget;
const targetSpecs = Object.fromEntries(specs.map(spec => [spec[0], spec])) as Record<Target, typeof specs[number]>;
const modulationTargets: Target[] = [...specs.map(spec => spec[0]), ...extraSpecs.map(spec => spec[0]), ...switchTargets];
const signalControls = (["sampling", "grid", "vertex"] as const).map(group => specs.filter(spec => spec[5] === group));
type Patch = { id: string; wave: number; target: Target; amount: number };
type XY = { x: number; y: number };
type Glyph = { canvas: HTMLCanvasElement; x: number; y: number; width: number; height: number; em: number; char: string; font: string; baseline: number; advanceX: number; capHeight: number };
const videoDefaults: VideoPatch[] = [{ source: "typography", target: "sampling" }, { source: "sampling", target: "grid" }, { source: "grid", target: "vertex" }, { source: "vertex", target: "feedback" }, { source: "feedback", target: "canvas" }];
const manualSpecs = [
  ["threshold", "Threshold", .01, 1, .01, "sampling"], ["opacity", "Opacity", 0, 1, .01, "sampling"],
  ["repeatCount", "Copies", 1, 32, 1, "grid"], ["repeatColumns", "Columns", 1, 12, 1, "grid"], ["repeatRows", "Rows", 1, 12, 1, "grid"],
  ["lineLength", "Line length", 1, 80, 1, "vertex"], ["tracking", "Tracking · % em", -10, 30, .1, "typography"],
] as const;
const initialManual = { threshold: .42, opacity: 1, repeatCount: 5, repeatColumns: 3, repeatRows: 3, lineLength: 6, tracking: 16.7 };
const initial: Record<Target, number> = { step: 3.2, jitter: 0, positionX: 0, positionY: 0, repeatScale: 100, repeatSpacingX: 25, repeatSpacingY: 25, repeatAngle: 0, vertexSize: 7, vertexMix: .5, fontSize: 20, weight: 800, feedbackAmount: .65, feedbackRefresh: 120 };
const colors = ["#3673ff", "#f04436", "#ffcf24", "#3673ff", "#f04436", "#ffcf24", "#eeeae1"];
const sourceNames = ["WAVE 1", "WAVE 2", "WAVE 3", "FEEDBACK", "SAMPLING", "MOTION", "VERTEX"];
const blendModes = ["source-over", "screen", "multiply", "overlay", "difference", "exclusion", "lighten", "darken", "lighter"] as const;
const groups = { sampling: "SAMPLING", grid: "MOTION", vertex: "VERTEX", typography: "TYPOGRAPHY", feedback: "FEEDBACK" };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function Knob({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  const gesture = useRef<{ y: number; value: number } | null>(null);
  const decimals = (String(step).split(".")[1] || "").length;
  const update = (next: number) => onChange(Number(clamp(min + Math.round((next - min) / step) * step, min, max).toFixed(decimals)));
  return <div className="kp-knob-wrap"><button type="button" className="kp-knob" role="slider" aria-label={name} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={String(value)} title="Drag up/down · Shift for fine control · arrows to adjust" style={{ "--knob-angle": `${-135 + (value - min) / (max - min) * 270}deg` } as CSSProperties}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); gesture.current = { y: e.clientY, value }; }}
    onPointerMove={e => { const g = gesture.current; if (!g) return; e.stopPropagation(); const next = clamp(g.value + (g.y - e.clientY) * (max - min) / 240 * (e.shiftKey ? .1 : 1), min, max); g.y = e.clientY; g.value = next; update(next); }}
    onPointerUp={e => { e.stopPropagation(); gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }}
    onKeyDown={e => { const sign = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1 : 0; if (sign) { e.preventDefault(); update(value + sign * step * (e.shiftKey ? 1 : 5)); } else if (e.key === "Home" || e.key === "End") { e.preventDefault(); update(e.key === "Home" ? min : max); } }}><svg className="kp-knob-ring" viewBox="0 0 36 36" aria-hidden="true"><circle className="kp-knob-track" cx="18" cy="18" r="15" /><circle className="kp-knob-fill" cx="18" cy="18" r="15" strokeDasharray={`${clamp((value - min) / (max - min), 0, 1) * 70.686} 94.248`} /></svg></button>
    <input className="kp-knob-number" aria-label={`${name} exact value`} type="number" min={min} max={max} step={step} value={value} onChange={e => { if (e.target.value !== "") update(Number(e.target.value)); }} />
  </div>;
}
const dreamWaves: Wave[] = [{ on: true, shape: "sine", rate: .57, amp: .59, speed: .07, direction: 0, phase: .49 }, { on: true, shape: "triangle", rate: 2.79, amp: .5, speed: .12, direction: .5, phase: .25 }, { on: true, shape: "triangle", rate: .35, amp: 1, speed: .65, direction: 1, phase: 0 }];
const dreamPatches: Patch[] = [{ id: "dream-vertex", wave: 2, target: "vertexSize", amount: 100 }, { id: "dream-type", wave: 1, target: "fontSize", amount: 50 }, { id: "dream-step", wave: 0, target: "step", amount: 15 }];
type SecondType = { on: boolean; text: string; font: string; size: number; weight: number; x: number; y: number; tracking: number; lineHeight: number; align: "left" | "center" | "right"; kerning: "none" | "normal" | "optical"; ink: string };
const secondTypeDefault: SecondType = { on: false, text: "TYPE 2", font: "system-ui, sans-serif", size: 12, weight: 800, x: 0, y: 25, tracking: 0, lineHeight: 1.1, align: "center", kerning: "normal", ink: "#ffffff" };
type Type1Transform = { x:number; y:number; rotation:number };
const type1TransformDefault: Type1Transform = {x:0,y:0,rotation:0};
type SynthState = { type1Transform: Type1Transform; samplingThicknessLinked: boolean; glyphOrigins: GlyphOriginMap; customFonts: ImportedFont[]; vertexSVG: VertexSVG | null; imageLayers: ImageLayer[]; type1On: boolean; secondType: SecondType; stripSpacing: number; vertexSpacing: number; vertexScatter: number; samplingThicknessUnit: "em"; vertexSizeUnit: "em"; samplingThicknessX: number; samplingThicknessY: number; textAlign: "left" | "center" | "right"; lineHeight: number; kerning: "none" | "normal" | "optical"; bpm: number; waves: Wave[]; values: typeof initial; manual: typeof initialManual; modes: { sampling: boolean; grid: boolean; vertex: boolean; feedback: boolean }; patches: Patch[]; text: string; font: string; vertex: string; repeatMode: RepeatMode; samplingMode: SamplingMode; glyphPattern: string; paused: boolean; bg: string; ink: string; bicolour: boolean; ink2: string; feedbackBlend: GlobalCompositeOperation; repeatBlend: GlobalCompositeOperation; feedbackTiming: "free" | "sync"; feedbackDivision: WaveDivision; videoPatches: VideoPatch[] };
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
  for (const [key, , min, max] of specs) values[key] = key === "vertexSize" ? Math.min(10, s.vertexSizeUnit === undefined ? num(v[key], .1, 3) / num(v.fontSize, 5, 75) * 100 : num(v[key], 0, 100)) : key === "step" ? Math.min(10, num(v[key], 0, 20)) : num(v[key], min, max);
  if (s.samplingThicknessUnit !== undefined && s.samplingThicknessUnit !== "em") throw new Error("Unsupported sampling thickness unit.");
  if (s.vertexSizeUnit !== undefined && s.vertexSizeUnit !== "em") throw new Error("Unsupported vertex size unit.");
  for (const [key, , min, max] of manualSpecs) manual[key] = num(m[key], min, max);
  const shapes = ["sine", "triangle", "square", "noise", "ramp"] as const;
  const waves = array(s.waves, 3).map(item => { const w = object(item); return { on: bool(w.on), shape: choice(w.shape, shapes), rate: num(w.rate, .1, 6), amp: num(w.amp, 0, 1), speed: num(w.speed, 0, 3), direction: num(w.direction, 0, 1), phase: num(w.phase, 0, 1), timing: w.timing === undefined ? "free" as const : choice(w.timing, ["free", "sync"] as const), division: w.division === undefined ? "1/4" as const : choice(w.division === "4/4" ? "1" : w.division, waveDivisions), noiseMode: w.noiseMode === undefined ? "random" as const : choice(w.noiseMode, ["cycle", "random"] as const), noiseRange: w.noiseRange === undefined ? 1 : num(w.noiseRange, 1, 12), noiseOutput: w.noiseOutput === undefined ? "full" as const : choice(w.noiseOutput, ["full", "positive", "negative"] as const) }; });
  if (waves.length !== 3) throw new Error("The preset must contain three waves.");
  const patches = array(s.patches, 100).map((item, i) => { const p = object(item); const wave = num(p.wave, 0, 6); if (!Number.isInteger(wave)) throw new Error("Invalid modulation source."); return { id: `import-${i}`, wave, target: choice(p.target, modulationTargets), amount: num(p.amount, -100, 100) }; });
  if (new Set(patches.map(p => `${p.wave}-${p.target}`)).size !== patches.length) throw new Error("Duplicate modulation cable.");
  const videoPatches = array(s.videoPatches, 10).map(item => { const p = object(item); return { source: choice(p.source, ["typography", "typography2", "sampling", "grid", "vertex", "feedback"] as const), target: choice(p.target, ["sampling", "grid", "vertex", "feedback", "canvas"] as const) }; });
  for (const target of ["sampling", "grid", "vertex", "feedback", "canvas"]) {
    const inputs = videoPatches.filter(p => p.target === target);
    if (inputs.length > 2 || new Set(inputs.map(p => p.source)).size !== inputs.length) throw new Error("Each video input accepts two distinct outputs.");
  }
  const colour = (v: unknown) => { if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error("Invalid preset colour."); return v; };
  if (typeof s.text !== "string" || s.text.length > 10000) throw new Error("Preset text is too long.");
  const customFonts: ImportedFont[] = s.customFonts === undefined ? [] : array(s.customFonts, 4).map(item => {
    const f = object(item);
    if (typeof f.id !== "string" || !/^[a-z0-9-]{1,64}$/.test(f.id) || typeof f.name !== "string" || f.name.length > 200 || !validFontData(f.data)) throw new Error("Invalid imported font.");
    return { id: f.id, name: f.name, data: f.data };
  });
  if (new Set(customFonts.map(f => f.id)).size !== customFonts.length) throw new Error("Duplicate font identifier.");
  const fontOptions = ["system-ui, sans-serif", "ui-serif, Georgia, serif", "ui-monospace, monospace", ...customFonts.map(f => fontFamily(f.id))];
  let vertexSVG: VertexSVG | null = null;
  if (s.vertexSVG !== undefined && s.vertexSVG !== null) { const svg = object(s.vertexSVG); if (typeof svg.name !== "string" || svg.name.length > 200) throw new Error("Invalid SVG name."); validateSVG(svg.svg); vertexSVG = { name: svg.name, svg: svg.svg }; }
  if (s.vertex === "custom" && !vertexSVG) throw new Error("Custom Vertex mode needs an SVG.");
  let secondType = { ...secondTypeDefault };
  if (s.secondType !== undefined) {
    const t = object(s.secondType);
    if (typeof t.text !== "string" || t.text.length > 10000) throw new Error("Second text is too long.");
    secondType = { on: bool(t.on), text: t.text, font: choice(t.font, fontOptions), size: num(t.size, 5, 75), weight: num(t.weight, 100, 900), x: num(t.x, -100, 100), y: num(t.y, -100, 100), tracking: num(t.tracking, -10, 30), lineHeight: num(t.lineHeight, .5, 3), align: choice(t.align, ["left", "center", "right"] as const), kerning: choice(t.kerning, ["none", "normal", "optical"] as const), ink: colour(t.ink) };
  }
  const imageLayers: ImageLayer[] = s.imageLayers === undefined ? [] : array(s.imageLayers, imageLimit).map(item => {
    const l = object(item);
    if (typeof l.id !== "string" || !l.id || l.id.length > 100 || typeof l.name !== "string" || l.name.length > 200 || typeof l.data !== "string" || l.data.length > imageByteLimit * 1.4 || !/^data:image\/(png|jpeg|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(l.data)) throw new Error("Invalid image layer.");
    return { id: l.id, name: l.name, data: l.data, on: bool(l.on), placement: choice(l.placement, ["background", "foreground"] as const), fit: choice(l.fit, ["cover", "contain", "stretch"] as const), x: num(l.x, -100, 100), y: num(l.y, -100, 100), size: num(l.size, 1, 300), angle: num(l.angle, -180, 180), opacity: num(l.opacity, 0, 100), blend: choice(l.blend, blendModes) };
  });
  if (new Set(imageLayers.map(l => l.id)).size !== imageLayers.length || imageLayers.reduce((n, l) => n + l.data.length, 0) > 64 * 1024 * 1024) throw new Error("Image layers exceed the preset limit.");
  const thickness = (value: unknown) => s.samplingThicknessUnit === "em" ? Math.min(10, num(value, 0, 100)) : Math.min(10, (value === undefined ? 1 : num(value, .25, 8)) * 1.5);
  const samplingThicknessLinked = s.samplingThicknessLinked === undefined ? (s.samplingThicknessX === s.samplingThicknessY) : bool(s.samplingThicknessLinked);
  const samplingThicknessX = thickness(s.samplingThicknessX), samplingThicknessY = samplingThicknessLinked && s.samplingMode === "xy" ? samplingThicknessX : thickness(s.samplingThicknessY);
  return { samplingThicknessLinked, glyphOrigins: parseGlyphOrigins(s.glyphOrigins, fontOptions), customFonts, vertexSVG, imageLayers, type1On: s.type1On === undefined ? true : bool(s.type1On), type1Transform: s.type1Transform === undefined ? {...type1TransformDefault} : (()=>{const t=object(s.type1Transform);return {x:num(t.x,-100,100),y:num(t.y,-100,100),rotation:num(t.rotation,-180,180)};})(), secondType, stripSpacing: s.stripSpacing === undefined ? 0 : Math.min(10, num(s.stripSpacing, 0, 100)), vertexScatter: s.vertexScatter === undefined ? 0 : num(s.vertexScatter, 0, 180), vertexSpacing: s.vertexSpacing === undefined ? 0 : Math.min(10, num(s.vertexSpacing, 0, 100)), samplingThicknessUnit: "em", vertexSizeUnit: "em", samplingThicknessX, samplingThicknessY, textAlign: s.textAlign === undefined ? "center" : choice(s.textAlign, ["left", "center", "right"] as const), lineHeight: s.lineHeight === undefined ? 1.1 : num(s.lineHeight, .5, 3), kerning: s.kerning === undefined ? "none" : choice(s.kerning, ["none", "normal", "optical"] as const), bpm: s.bpm === undefined ? 120 : num(s.bpm, 20, 300), waves, values, manual, modes: { sampling: bool(modes.sampling), grid: bool(modes.grid), vertex: bool(modes.vertex), feedback: bool(modes.feedback) }, patches, videoPatches, text: s.text,
    font: choice(s.font, fontOptions), vertex: choice(s.vertex, ["dot", "line", "square", "glyph", "custom"]), repeatMode: choice(s.repeatMode, ["single", "line", "grid"]), samplingMode: choice(s.samplingMode, ["xy", "x", "y"]), glyphPattern: typeof s.glyphPattern === "string" && s.glyphPattern.length > 0 && s.glyphPattern.length <= 64 ? s.glyphPattern : "*+o", paused: bool(s.paused), bg: colour(s.bg), ink: colour(s.ink), ink2: colour(s.ink2), bicolour: bool(s.bicolour), feedbackBlend: choice(s.feedbackBlend, blendModes), repeatBlend: s.repeatBlend === undefined ? "source-over" : choice(s.repeatBlend, blendModes), feedbackTiming: s.feedbackTiming === undefined ? "free" : choice(s.feedbackTiming, ["free", "sync"] as const), feedbackDivision: s.feedbackDivision === undefined ? "1/4" : choice(s.feedbackDivision, waveDivisions) };
}
function ControlCaption({ label }: { label: string }) {
  const symbol = ({ "Size · % canvas": "↕A", "Weight": "𝐀", "Tracking · % em": "A↔A", "Line spacing · em": "↕≡" } as Record<string, string>)[label];
  const motionIcons = { "Jitter": Shuffle, "Position X · %": MoveHorizontal, "Position Y · %": MoveVertical, "Scale · %": Scaling, "Spacing X · %": BetweenHorizontalStart, "Spacing Y · %": BetweenVerticalStart, "Angle · °": RotateCw, "Copies": Copy, "Columns": Columns3, "Rows": Rows3 };
  const Icon = motionIcons[label as keyof typeof motionIcons] || (label === "Threshold" ? Settings2 : label === "Opacity" ? Blend : label.startsWith("Thickness X") ? SlidersHorizontal : label.startsWith("Thickness Y") ? SlidersVertical : null);
  if (Icon) return <span className="kp-icon-caption" data-tooltip={label}><Icon size={16} strokeWidth={1.5} aria-hidden="true" /><span className="kp-sr-only">{label}</span></span>;
  return <span className={symbol ? "kp-icon-caption" : undefined} data-tooltip={symbol ? label : undefined}>{symbol ? <><span aria-hidden="true">{symbol}</span><span className="kp-sr-only">{label}</span></> : label}</span>;
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
  const [renderFps, setRenderFps] = useState<30 | 60>(30);
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
  const [bpm, setBpm] = useState(120);
  const [bpmDraft, setBpmDraft] = useState("120");
  useEffect(() => setBpmDraft(String(bpm)), [bpm]);
  const [feedbackBlend, setFeedbackBlend] = useState<GlobalCompositeOperation>("source-over");
  const [customFonts, setCustomFonts] = useState<ImportedFont[]>([]);
  const [vertexSVG, setVertexSVG] = useState<VertexSVG | null>(null);
  const [assetBusy, setAssetBusy] = useState(false);
  const fontInput = useRef<HTMLInputElement>(null), svgInput = useRef<HTMLInputElement>(null);
  const fontImportTarget = useRef<"typography" | "typography2">("typography");
  const loadedFonts = useRef(new Map<string, { data: string; face: FontFace }>());
  const fontPromises = useRef(new Map<string, Promise<FontFace>>());
  const decodedSVGs = useRef(new Map<string, HTMLImageElement>());
  const svgPromises = useRef(new Map<string, Promise<HTMLImageElement>>());
  const ensureAssets = useCallback(async (fonts: ImportedFont[], shape: VertexSVG | null) => {
    await Promise.all(fonts.map(async font => {
      if (loadedFonts.current.get(font.id)?.data === font.data) return;
      let pending = fontPromises.current.get(font.id);
      if (!pending) { pending = loadImportedFont(font); fontPromises.current.set(font.id, pending); }
      try { const face = await pending; const old = loadedFonts.current.get(font.id); if (old) document.fonts.delete(old.face); loadedFonts.current.set(font.id, { data: font.data, face }); }
      finally { fontPromises.current.delete(font.id); }
    }));
    if (shape && !decodedSVGs.current.has(shape.svg)) {
      let pending = svgPromises.current.get(shape.svg);
      if (!pending) { pending = decodeSVG(shape.svg); svgPromises.current.set(shape.svg, pending); }
      try { decodedSVGs.current.set(shape.svg, await pending); } finally { svgPromises.current.delete(shape.svg); }
    }
  }, []);
  useEffect(() => {
    let disposed = false;
    void ensureAssets(customFonts, vertexSVG).then(() => {
      if (disposed) return;
      const fonts = new Set([...customFonts, ...(renderSnapshot.current?.state.customFonts || [])].map(f => f.id));
      for (const [id, entry] of loadedFonts.current) if (!fonts.has(id)) { document.fonts.delete(entry.face); loadedFonts.current.delete(id); }
      for (const svg of decodedSVGs.current.keys()) if (svg !== vertexSVG?.svg && svg !== renderSnapshot.current?.state.vertexSVG?.svg) decodedSVGs.current.delete(svg);
    }).catch(error => { if (!disposed) setPresetMessage(error instanceof Error ? error.message : "Could not load custom asset."); });
    return () => { disposed = true; };
  }, [customFonts, vertexSVG, ensureAssets]);
  const [imageLayers, setImageLayers] = useState<ImageLayer[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const decodedImages = useRef(new Map<string, HTMLImageElement>());
  const pendingImages = useRef(new Map<string, Promise<HTMLImageElement>>());
  const ensureImages = useCallback(async (layers: ImageLayer[]) => {
    await Promise.all(layers.map(async l => {
      if (decodedImages.current.has(l.data)) return;
      let pending = pendingImages.current.get(l.data);
      if (!pending) { pending = decodeLayerImage(l.data); pendingImages.current.set(l.data, pending); }
      try { decodedImages.current.set(l.data, await pending); } finally { pendingImages.current.delete(l.data); }
    }));
  }, []);
  useEffect(() => {
    let disposed = false;
    void ensureImages(imageLayers).then(() => { if (!disposed) { const keep = new Set([...imageLayers, ...(renderSnapshot.current?.state.imageLayers || [])].map(l => l.data)); for (const data of decodedImages.current.keys()) if (!keep.has(data)) decodedImages.current.delete(data); } }).catch(error => { if (!disposed) setPresetMessage(error.message); });
    return () => { disposed = true; };
  }, [imageLayers, ensureImages]);
  const [type1On, setType1On] = useState(true);
  const [type1Transform,setType1Transform] = useState<Type1Transform>(type1TransformDefault);
  const [typeTab, setTypeTab] = useState<"typography" | "typography2">("typography");
  const [secondType, setSecondType] = useState<SecondType>(secondTypeDefault);
  const [stripSpacing, setStripSpacing] = useState(0);
  const [vertexSpacing, setVertexSpacing] = useState(0);
  const [vertexScatter, setVertexScatter] = useState(0);
  const [glyphOrigins, setGlyphOrigins] = useState<GlyphOriginMap>({});
  const [originEditorOpen, setOriginEditorOpen] = useState(false);
  const [samplingThicknessLinked, setSamplingThicknessLinked] = useState(true);
  const [samplingThicknessX, setSamplingThicknessX] = useState(1.5);
  const [samplingThicknessY, setSamplingThicknessY] = useState(1.5);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [lineHeight, setLineHeight] = useState(1.1);
  const [kerning, setKerning] = useState<"none" | "normal" | "optical">("none");
  const [repeatBlend, setRepeatBlend] = useState<GlobalCompositeOperation>("source-over");
  const [feedbackTiming, setFeedbackTiming] = useState<"free" | "sync">("free");
  const [feedbackDivision, setFeedbackDivision] = useState<WaveDivision>("1/4");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("single");
  const [samplingMode, setSamplingMode] = useState<SamplingMode>("xy");
  const [glyphPattern, setGlyphPattern] = useState("*+o");
  const [values, setValues] = useState(initial);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineData>(timelineDefaults);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0);
  const timelineClock = useRef({ time: 0, playing: false, lastDisplay: 0 });
  const timelineState = useRef(timeline);
  useEffect(() => { timelineState.current = timeline; }, [timeline]);
  const timelineUndoStack = useRef<TimelineData[]>([]);
  const timelineRedoStack = useRef<TimelineData[]>([]);
  const timelineEdit = useRef({ when: 0, shape: "" });
  const [timelineHistory, setTimelineHistory] = useState({ undo: false, redo: false });
  const timelineShape = (t:TimelineData) => JSON.stringify(t.tracks.map(track=>[track.target,track.frames.length,track.frames.map(f=>f.curve)]));
  const updateTimeline = (next:TimelineData) => {
    const prior=timelineState.current;
    if(JSON.stringify(prior)===JSON.stringify(next))return;
    const shape=timelineShape(next), now=Date.now();
    // Continuous drags / number edits are one history step; adding/removing
    // tracks or keyframes always creates a separate step.
    const coalesce=shape===timelineShape(prior)&&shape===timelineEdit.current.shape&&now-timelineEdit.current.when<420;
    if(!coalesce){timelineUndoStack.current.push(prior);if(timelineUndoStack.current.length>100)timelineUndoStack.current.shift();}
    timelineRedoStack.current=[];
    timelineEdit.current={when:now,shape};
    timelineState.current=next;
    setTimeline(next);
    setTimelineHistory({undo:timelineUndoStack.current.length>0,redo:false});
  };
  const undoTimeline = () => {
    const prior=timelineUndoStack.current.pop();if(!prior)return;
    timelineRedoStack.current.push(timelineState.current);
    timelineState.current=prior;setTimeline(prior);
    timelineEdit.current={when:0,shape:""};
    setTimelineHistory({undo:timelineUndoStack.current.length>0,redo:true});
  };
  const redoTimeline = () => {
    const next=timelineRedoStack.current.pop();if(!next)return;
    timelineUndoStack.current.push(timelineState.current);
    timelineState.current=next;setTimeline(next);
    timelineEdit.current={when:0,shape:""};
    setTimelineHistory({undo:true,redo:timelineRedoStack.current.length>0});
  };
  const seekTimeline = (t: number) => { timelineClock.current.time = Math.min(timeline.duration,Math.max(0,t)); setTimelineTime(timelineClock.current.time); };
  const toggleTimeline = () => { timelineClock.current.playing = !timelineClock.current.playing; setTimelinePlaying(timelineClock.current.playing); };
  const timelineOptions = [
    ...specs.map(([key,label,min,max,step,group])=>({key,label:`${group.toUpperCase()} / ${label}`,min,max,step})),
    ...extraSpecs.map(([key,min,max])=>({key,label:key.replace(/([A-Z])/g," $1").toUpperCase(),min,max,step:.1})),
    ...switchTargets.map(key=>({key,label:key.replace(/([A-Z])/g," $1").toUpperCase(),min:0,max:12,step:1,discrete:true}))
  ];
  const timelineCurrentValue = (key:string): number => {
    if(key in values) return values[key as keyof typeof values];
    if(key in manual) return manual[key as keyof typeof manual];
    if(key==="vertexSource") return ["line","dot","square","glyph","custom"].indexOf(vertex);
    if(key==="motionMode") return ["single","line","grid"].indexOf(repeatMode);
    if(key==="motionBlend") return blendModes.indexOf(repeatBlend as typeof blendModes[number]);
    if(key==="feedbackBlendMode") return blendModes.indexOf(feedbackBlend as typeof blendModes[number]);
    if(key==="samplingAxes") return ["xy","x","y"].indexOf(samplingMode);
    if(key==="textAlignMode") return ["left","center","right"].indexOf(textAlign);
    if(key==="kerningMode") return ["none","normal","optical"].indexOf(kerning);
    if(key==="feedbackTimingMode") return ["free","sync"].indexOf(feedbackTiming);
    const extras:Record<string,number>={samplingThicknessX,samplingThicknessY,stripSpacing,vertexSpacing,vertexScatter,lineHeight,secondSize:secondType.size,secondWeight:secondType.weight,secondX:secondType.x,secondY:secondType.y,secondTracking:secondType.tracking,secondLineHeight:secondType.lineHeight};
    return extras[key]??0;
  };
  const [manual, setManual] = useState(initialManual);
  const [modes, setModes] = useState({ sampling: false, grid: false, vertex: true, feedback: false });
  const chainDrag = useRef<VideoModule | null>(null);
  const [videoPatches, setVideoPatches] = useState<VideoPatch[]>(videoDefaults);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [videoDrag, setVideoDrag] = useState<(XY & { source: VideoSource }) | null>(null);
  const videoDragRef = useRef<VideoSource | null>(null);
  const videoDragStart = useRef<XY | null>(null);
  useEffect(() => {
    if (!secondType.on) {
      setSelectedVideo(source => source === "typography2" ? null : source);
      if (videoDragRef.current === "typography2") { videoDragRef.current = null; videoDragStart.current = null; setVideoDrag(null); }
    }
  }, [secondType.on]);
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
  const live = useRef({ customFonts, vertexSVG, imageLayers, type1On, type1Transform, secondType, stripSpacing, vertexSpacing, vertexScatter, glyphOrigins, samplingThicknessLinked, samplingThicknessUnit: "em" as const, vertexSizeUnit: "em" as const, samplingThicknessX, samplingThicknessY, textAlign, lineHeight, kerning, bpm, waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, repeatBlend, feedbackTiming, feedbackDivision, videoPatches });
  const renderSnapshot = useRef<{ state: typeof live.current; width: number; height: number; displayWidth: number } | null>(null);
  useEffect(() => { live.current = { customFonts, vertexSVG, imageLayers, type1On, type1Transform, secondType, stripSpacing, vertexSpacing, vertexScatter, glyphOrigins, samplingThicknessLinked, samplingThicknessUnit: "em" as const, vertexSizeUnit: "em" as const, samplingThicknessX, samplingThicknessY, textAlign, lineHeight, kerning, bpm, waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, repeatBlend, feedbackTiming, feedbackDivision, videoPatches }; }, [customFonts, vertexSVG, imageLayers, type1On, type1Transform, secondType, stripSpacing, vertexSpacing, vertexScatter, glyphOrigins, samplingThicknessLinked, samplingThicknessX, samplingThicknessY, textAlign, lineHeight, kerning, bpm, waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, repeatBlend, feedbackTiming, feedbackDivision, videoPatches]);
  const undoStack = useRef<(typeof live.current)[]>([]);
  const lastEdit = useRef({ snapshot: { customFonts, vertexSVG, imageLayers, type1On, type1Transform, secondType, stripSpacing, vertexSpacing, vertexScatter, glyphOrigins, samplingThicknessLinked, samplingThicknessUnit: "em" as const, vertexSizeUnit: "em" as const, samplingThicknessX, samplingThicknessY, textAlign, lineHeight, kerning, bpm, waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, repeatBlend, feedbackTiming, feedbackDivision, videoPatches }, time: 0, key: "" });
  const restoring = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const redoStack = useRef<(typeof live.current)[]>([]);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => {
    const next = live.current, prior = lastEdit.current.snapshot;
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter(key => (key === "imageLayers" || key === "customFonts" || key === "vertexSVG") ? next[key] !== prior[key] : JSON.stringify(next[key]) !== JSON.stringify(prior[key]));
    if (!changed.length) return;
    if (restoring.current) { restoring.current = false; lastEdit.current = { snapshot: next, time: 0, key: "" }; return; }
    const topology = (state: typeof next) => JSON.stringify([state.videoPatches, state.patches.map(p => [p.id, p.wave, p.target])]);
    const key = changed.join(","), now = Date.now();
    // A continuous knob/text gesture is one undo step; cable actions always get their own step.
    const merge = key === lastEdit.current.key && now - lastEdit.current.time < 400 && topology(next) === topology(prior);
    if (!merge) { undoStack.current.push(prior); if (undoStack.current.length > 100) undoStack.current.shift(); }
    redoStack.current=[];setCanRedo(false);
    lastEdit.current = { snapshot: next, time: now, key }; setCanUndo(undoStack.current.length > 0);
  }, [customFonts, vertexSVG, imageLayers, type1On, type1Transform, secondType, stripSpacing, vertexSpacing, vertexScatter, glyphOrigins, samplingThicknessLinked, samplingThicknessX, samplingThicknessY, textAlign, lineHeight, kerning, bpm, waves, values, manual, modes, patches, text, font, vertex, repeatMode, samplingMode, glyphPattern, paused, bg, ink, bicolour, ink2, feedbackBlend, repeatBlend, feedbackTiming, feedbackDivision, videoPatches]);
  const undo = useCallback(() => {
    const state = undoStack.current.pop(); if (!state) return;
    redoStack.current.push(live.current);setCanRedo(true);
    restoring.current = true;
    setBpm(state.bpm); setWaves(state.waves); setValues(state.values); setManual(state.manual); setModes(state.modes); setPatches(state.patches); setVideoPatches(state.videoPatches);
    setCustomFonts(state.customFonts); setVertexSVG(state.vertexSVG); setImageLayers(state.imageLayers); setType1On(state.type1On); setType1Transform(state.type1Transform); setSecondType(state.secondType); setStripSpacing(state.stripSpacing); setVertexSpacing(state.vertexSpacing); setVertexScatter(state.vertexScatter); setGlyphOrigins(state.glyphOrigins); setSamplingThicknessLinked(state.samplingThicknessLinked); setSamplingThicknessX(state.samplingThicknessX); setSamplingThicknessY(state.samplingThicknessY); setText(state.text); setTextAlign(state.textAlign); setLineHeight(state.lineHeight); setKerning(state.kerning); setFont(state.font); setVertex(state.vertex); setRepeatMode(state.repeatMode); setSamplingMode(state.samplingMode); setGlyphPattern(state.glyphPattern); setPaused(state.paused); setBg(state.bg); setInk(state.ink); setBicolour(state.bicolour); setInk2(state.ink2); setFeedbackBlend(state.feedbackBlend); setRepeatBlend(state.repeatBlend); setFeedbackTiming(state.feedbackTiming); setFeedbackDivision(state.feedbackDivision);
    setSelected(null); setSelectedVideo(null); setDrag(null); setVideoDrag(null); dragRef.current = null; videoDragRef.current = null;
    setCanUndo(undoStack.current.length > 0);
  }, []);
  const redo = useCallback(() => {
    const state=redoStack.current.pop();if(!state)return;
    undoStack.current.push(live.current);
    restoring.current=true;
    setBpm(state.bpm); setWaves(state.waves); setValues(state.values); setManual(state.manual); setModes(state.modes); setPatches(state.patches); setVideoPatches(state.videoPatches);
    setCustomFonts(state.customFonts); setVertexSVG(state.vertexSVG); setImageLayers(state.imageLayers); setType1On(state.type1On); setType1Transform(state.type1Transform); setSecondType(state.secondType); setStripSpacing(state.stripSpacing); setVertexSpacing(state.vertexSpacing); setVertexScatter(state.vertexScatter); setGlyphOrigins(state.glyphOrigins); setSamplingThicknessLinked(state.samplingThicknessLinked); setSamplingThicknessX(state.samplingThicknessX); setSamplingThicknessY(state.samplingThicknessY); setText(state.text); setTextAlign(state.textAlign); setLineHeight(state.lineHeight); setKerning(state.kerning); setFont(state.font); setVertex(state.vertex); setRepeatMode(state.repeatMode); setSamplingMode(state.samplingMode); setGlyphPattern(state.glyphPattern); setPaused(state.paused); setBg(state.bg); setInk(state.ink); setBicolour(state.bicolour); setInk2(state.ink2); setFeedbackBlend(state.feedbackBlend); setRepeatBlend(state.repeatBlend); setFeedbackTiming(state.feedbackTiming); setFeedbackDivision(state.feedbackDivision);
    setSelected(null); setSelectedVideo(null); setDrag(null); setVideoDrag(null); dragRef.current = null; videoDragRef.current = null;
    setCanUndo(true);setCanRedo(redoStack.current.length>0);
  },[]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || (event.target instanceof HTMLElement && event.target.closest("input,textarea,select,[contenteditable=true]"))) return;
      const key=event.key.toLowerCase();
      const reverse=key==="z"&&event.shiftKey || key==="y";
      if(key!=="z"&&!reverse)return;
      event.preventDefault();
      // The timeline's edit history is independent from the main instrument.
      if(timelineOpen && event.target instanceof HTMLElement && event.target.closest("#kp-timeline-panel")) {
        if(reverse)redoTimeline();else undoTimeline();
      }else {
        if(reverse)redo();else undo();
      }
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, [undo,redo,timelineOpen]);
  useEffect(() => {
    const measure = () => {
      if (!panel.current) return;
      const box = panel.current.getBoundingClientRect(), next: Record<string, XY> = {};
      for (const [key, el] of Object.entries(sockets.current)) if (el && el.getClientRects().length) { const r = el.getBoundingClientRect(); next[key] = { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }; }
      setPositions(current => Object.keys(current).length === Object.keys(next).length && Object.keys(next).every(key => current[key]?.x === next[key].x && current[key]?.y === next[key].y) ? current : next);
    };
    let measurementFrame = 0;
    const scheduleMeasure = () => { if (!measurementFrame) measurementFrame = requestAnimationFrame(() => { measurementFrame = 0; measure(); }); };
    const observer = new ResizeObserver(scheduleMeasure); if (panel.current) { observer.observe(panel.current); panel.current.querySelectorAll(".kp-module,.kp-wave").forEach(el => observer.observe(el)); }
    const rack = panel.current; rack?.addEventListener("scroll", scheduleMeasure, true);
    measure(); window.addEventListener("resize", scheduleMeasure);
    return () => { observer.disconnect(); cancelAnimationFrame(measurementFrame); rack?.removeEventListener("scroll", scheduleMeasure, true); window.removeEventListener("resize", scheduleMeasure); };
  }, [typeTab, type1On, secondType.on, samplingMode, vertex, repeatMode, feedbackTiming]);
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
    let glyphs: Glyph[] = [], typographyEm = 1;
    const source2 = document.createElement("canvas"), ctx2 = source2.getContext("2d", { willReadFrequently: true })!;
    let glyphs2: Glyph[] = [], em2 = 1, key2 = "", rebuilt2 = -100;
    // Exact raster reuse, bounded to 32 MiB. Position and tracking never affect the raster.
    const glyphCache = new RasterCache();
    const nodes: VideoSource[] = ["typography", "typography2", "sampling", "grid", "vertex", "feedback"];
    const outputs = Object.fromEntries(nodes.map(node => [node, document.createElement("canvas")])) as Record<VideoSource, HTMLCanvasElement>;
    const previousOutputs = Object.fromEntries(nodes.map(node => [node, document.createElement("canvas")])) as Record<VideoSource, HTMLCanvasElement>;
    const mixedInputs = Object.fromEntries(nodes.map(node => [node, document.createElement("canvas")])) as Record<VideoSource, HTMLCanvasElement>;
    const blank = document.createElement("canvas"); blank.width = 1; blank.height = 1;
    let routeKey = "";
    const opticalKerning = new OpticalKerning();
    const svgTints = new Map<string, HTMLCanvasElement>(); let svgTintSource = "";
    const tintedSVG = (svg: string, colour: string, size: number) => {
      if (svgTintSource !== svg) { svgTints.clear(); svgTintSource = svg; }
      const em = svgRasterSize(size);
      const key = colour + "|" + em, cached = svgTints.get(key); if (cached) return cached;
      const image = decodedSVGs.current.get(svg); if (!image) return null;
      const mask = document.createElement("canvas"); const scale = em / Math.max(image.naturalWidth, image.naturalHeight); mask.width = Math.max(1, Math.round(image.naturalWidth * scale)); mask.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const mc = mask.getContext("2d")!; mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = "high"; mc.drawImage(image, 0, 0, mask.width, mask.height); mc.globalCompositeOperation = "source-in"; mc.fillStyle = colour; mc.fillRect(0, 0, mask.width, mask.height);
      if (svgTints.size >= 16) svgTints.delete(svgTints.keys().next().value!); svgTints.set(key, mask); return mask;
    };
    let gpu = createKineticGPU();
    const frame = (now: number, manualFrame = false) => {
      if (renderSnapshot.current && !manualFrame) { raf = requestAnimationFrame(frame); return; }
      // Keep React/pointer updates independent of the expensive image pipeline.
      if (!manualFrame && now - lastFrame < 1000 / 30 - .5) { raf = requestAnimationFrame(frame); return; }
      lastFrame = now;
      if (gpu && !gpu.available()) { gpu.dispose(); gpu = null; }
      const sourceState = renderSnapshot.current?.state || live.current, s = { ...sourceState, values: { ...sourceState.values }, manual: { ...sourceState.manual }, secondType: { ...sourceState.secondType } }, dt = previous ? Math.min(.05, (now - previous) / 1000) : 0; previous = now;
      const clock = timelineClock.current, timelineData = timelineState.current;
      if (clock.playing && !manualFrame) {
        clock.time += dt;
        if (clock.time >= timelineData.duration) {
          if(timelineData.loop) clock.time %= timelineData.duration;
          else { clock.time = timelineData.duration; clock.playing=false; setTimelinePlaying(false); }
        }
        if(now-clock.lastDisplay>85) { clock.lastDisplay=now; setTimelineTime(clock.time); }
      }
      const animated=new Map<string,number>();
      for (const track of timelineData.tracks) {
        const value=evaluateTrack(track,timelineAt(timelineData,clock.time));
        if(value!==undefined) animated.set(track.target,value);
      }
      const selectedValue = <T,>(target:string,values:readonly T[],base:T):T => {
        const val=animated.get(target);
        return val===undefined?base:values[clamp(Math.round(val),0,values.length-1)];
      };
      for(const [key] of specs) { const value=animated.get(key); if(value!==undefined) s.values[key]=value; }
      for(const [key] of manualSpecs) { const value=animated.get(key); if(value!==undefined) s.manual[key]=value; }
      const extended:Record<string,(n:number)=>void>={
        samplingThicknessX:n=>{s.samplingThicknessX=n;},samplingThicknessY:n=>{s.samplingThicknessY=n;},
        stripSpacing:n=>{s.stripSpacing=n;},vertexSpacing:n=>{s.vertexSpacing=n;},vertexScatter:n=>{s.vertexScatter=n;},lineHeight:n=>{s.lineHeight=n;},
        secondSize:n=>{s.secondType.size=n;},secondWeight:n=>{s.secondType.weight=n;},secondX:n=>{s.secondType.x=n;},
        secondY:n=>{s.secondType.y=n;},secondTracking:n=>{s.secondType.tracking=n;},secondLineHeight:n=>{s.secondType.lineHeight=n;}
      };
      for(const [key,set] of Object.entries(extended)) {const value=animated.get(key);if(value!==undefined)set(value);}
      s.vertex=selectedValue("vertexSource",s.vertexSVG?["line","dot","square","glyph","custom"]:["line","dot","square","glyph"],s.vertex);
      s.repeatMode=selectedValue("motionMode",["single","line","grid"] as const,s.repeatMode);
      s.repeatBlend=selectedValue("motionBlend",blendModes,s.repeatBlend);
      s.feedbackBlend=selectedValue("feedbackBlendMode",blendModes,s.feedbackBlend);
      s.samplingMode=selectedValue("samplingAxes",["xy","x","y"] as const,s.samplingMode);
      s.textAlign=selectedValue("textAlignMode",["left","center","right"] as const,s.textAlign);
      s.kerning=selectedValue("kerningMode",["none","normal","optical"] as const,s.kerning);
      s.feedbackTiming=selectedValue("feedbackTimingMode",["free","sync"] as const,s.feedbackTiming);
      if (s.customFonts.some(f => loadedFonts.current.get(f.id)?.data !== f.data) || (s.vertex === "custom" && s.vertexSVG && !decodedSVGs.current.has(s.vertexSVG.svg))) { if (!manualFrame) raf = requestAnimationFrame(frame); return; }
      if (!s.paused) { s.waves.forEach((w, i) => { if (w.on) phases[i] += dt * waveHz(w, s.bpm); }); }
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
          ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H); drawImageLayers(ctx, s.imageLayers, decodedImages.current, "background", W, H); drawImageLayers(ctx, s.imageLayers, decodedImages.current, "foreground", W, H);
          historyCtx.clearRect(0, 0, history.width, history.height); feedbackTick = -Infinity;
          gpu?.begin(W, H, "disconnected", false);
          if (!manualFrame) raf = requestAnimationFrame(frame); return;
        }
        const field = (i: number, x: number, y: number) => { if (i === 3) return s.modes.feedback ? feedbackSignal : 0; if (i >= 4) return s.modes[(["sampling", "grid", "vertex"] as const)[i - 4]] ? moduleSignals[i - 4] : 0; return sampleWave(s.waves, phases, i, x, y); };
        const signals = [...s.waves.map((_, i) => field(i, .5, .5)), s.modes.feedback ? feedbackSignal : 0, ...moduleSignals], mod = { ...s.values };
        const patchIndex = indexModulation(modulationTargets, s.patches);
        const at = (target: typeof specs[number][0], x: number, y: number, glyph?: Glyph) => {
          const spec = targetSpecs[target];
          const sum = patchIndex[target].reduce((v, p) => v + field(p.wave, glyph ? (x - glyph.x) / glyph.em : x / W, glyph ? (y - glyph.y) / glyph.em : y / H) * p.amount / 100, 0);
          return clamp(s.values[target] + sum * (spec[3] - spec[2]) / 2, spec[2], spec[3]);
        };
        for (const [key, , min, max] of specs) {
          const sum = patchIndex[key].reduce((v, p) => v + signals[p.wave] * p.amount / 100, 0);
          mod[key] = clamp(s.values[key] + sum * (max - min) / 2, min, max);
        }

        const modulationSum = (target: Target) => patchIndex[target].reduce((sum, p) => sum + signals[p.wave] * p.amount / 100, 0);
        const modNumeric = (key: NumericExtra, base: number) => {
          const spec = extraSpecs.find(item => item[0] === key)!;
          const sum = modulationSum(key);
          return clamp(base + sum * (spec[2] - spec[1]) / 2, spec[1], spec[2]);
        };
        const selectStep = <T,>(key: SwitchTarget, options: readonly T[], base: T): T => {
          const index = Math.max(0, options.indexOf(base));
          const shift = Math.round(clamp(modulationSum(key), -12, 12));
          return options[clamp(index + shift, 0, options.length - 1)];
        };
        for (const [key] of extraSpecs) {
          if (!patchIndex[key].length) continue;
          if (key in s.manual) {
            const manualKey = key as keyof typeof s.manual;
            s.manual[manualKey] = modNumeric(key, s.manual[manualKey]);
          } else if (key.startsWith("second")) {
            const secondKeys = { secondSize: "size", secondWeight: "weight", secondX: "x", secondY: "y", secondTracking: "tracking", secondLineHeight: "lineHeight" } as const;
            const secondKey = secondKeys[key as keyof typeof secondKeys];
            if (secondKey) s.secondType[secondKey] = modNumeric(key, s.secondType[secondKey]);
          } else if (key === "samplingThicknessX") s.samplingThicknessX = modNumeric(key, s.samplingThicknessX);
          else if (key === "samplingThicknessY") s.samplingThicknessY = modNumeric(key, s.samplingThicknessY);
          else if (key === "stripSpacing") s.stripSpacing = modNumeric(key, s.stripSpacing);
          else if (key === "vertexSpacing") s.vertexSpacing = modNumeric(key, s.vertexSpacing);
          else if (key === "vertexScatter") s.vertexScatter = modNumeric(key, s.vertexScatter);
          else if (key === "lineHeight") s.lineHeight = modNumeric(key, s.lineHeight);
        }
        // Stepped modulation: noise can traverse several positions per cycle (e.g. -5…+5).
        // The imported/custom SVG slot is only selectable when an asset exists.
        s.vertex = selectStep("vertexSource", s.vertexSVG ? ["line", "dot", "square", "glyph", "custom"] : ["line", "dot", "square", "glyph"], s.vertex);
        s.repeatMode = selectStep("motionMode", ["single", "line", "grid"] as const, s.repeatMode);
        s.repeatBlend = selectStep("motionBlend", blendModes, s.repeatBlend);
        s.feedbackBlend = selectStep("feedbackBlendMode", blendModes, s.feedbackBlend);
        s.samplingMode = selectStep("samplingAxes", ["xy", "x", "y"] as const, s.samplingMode);
        s.textAlign = selectStep("textAlignMode", ["left", "center", "right"] as const, s.textAlign);
        s.kerning = selectStep("kerningMode", ["none", "normal", "optical"] as const, s.kerning);
        s.feedbackTiming = selectStep("feedbackTimingMode", ["free", "sync"] as const, s.feedbackTiming);
        // Module outputs are one-frame-delayed control signals, allowing stable feedback routing.
        (["sampling", "grid", "vertex"] as const).forEach((group, i) => {
          const controls = signalControls[i];
          moduleSignals[i] = s.modes[group] ? controls.reduce((sum, [key, , min, max]) => sum + 2 * (mod[key] - min) / (max - min) - 1, 0) / controls.length : 0;
        });
        if (history.width !== W || history.height !== H) { history.width = W; history.height = H; feedbackSignal = 0; feedbackTick = -Infinity; }
        if (!s.modes.feedback && feedbackWasOn) { historyCtx.clearRect(0, 0, history.width, history.height); feedbackSignal = 0; feedbackTick = -Infinity; }
        feedbackWasOn = s.modes.feedback;
        // Shared 30Hz refresh grid keeps history updates independent of export FPS.
        const feedbackNow = Math.floor((now - feedbackClockOrigin) / (1000 / 30) + 1e-6) * (1000 / 30);
        const feedbackInterval = s.feedbackTiming === "sync" ? 1000 / waveHz({ ...s.waves[0], timing: "sync", division: s.feedbackDivision }, s.bpm) : Math.ceil(mod.feedbackRefresh / (1000 / 30)) * (1000 / 30);
        const feedbackDue = s.modes.feedback && !s.paused && (s.feedbackTiming === "sync" ? Math.floor((feedbackNow + 1e-6) / feedbackInterval) > Math.floor((feedbackTick + 1e-6) / feedbackInterval) : feedbackNow - feedbackTick >= feedbackInterval - 1e-6);
        // The output holds the previous input sample; it cannot create an instantaneous self-loop.
        if (feedbackDue) {
          const inputs = patchIndex.feedbackAmount;
          const input = inputs.length ? inputs.reduce((sum, p) => sum + signals[p.wave] * p.amount / 100, 0) : signals.slice(0, 3).reduce((sum, v) => sum + v, 0) / 3;
          feedbackSignal = clamp(input + feedbackSignal * mod.feedbackAmount, -1, 1);
          feedbackTick = feedbackNow;
        }
        const canvasUnit = Math.min(W, H) / 100;
        const size = Math.round(mod.fontSize * canvasUnit), weight = Math.round(mod.weight / 10) * 10;
        const key = `${W}|${H}|${s.text}|${s.font}|${size}|${weight}|${s.ink}|${s.manual.tracking}|${s.textAlign}|${s.lineHeight}|${s.kerning}|${s.type1Transform.x}|${s.type1Transform.y}|${s.type1Transform.rotation}`;
        // Cap expensive glyph rasterisation at 20fps; wave evaluation and drawing remain at display rate.
        if (s.type1On && key !== cacheKey && (manualFrame || now - lastRebuild >= 50 || !cacheKey)) {
          source.width = W; source.height = H; sctx.translate(W/2+s.type1Transform.x/100*W,H/2+s.type1Transform.y/100*H); sctx.rotate(s.type1Transform.rotation*Math.PI/180); sctx.translate(-W/2,-H/2); sctx.fillStyle = s.ink; sctx.textAlign = "center"; sctx.textBaseline = "middle";
          const lines = s.text.split("\n"); let fitted = Math.min(size, H * .75 / (1 + Math.max(0, lines.length - 1) * s.lineHeight));
          sctx.font = `${weight} ${fitted}px ${s.font}`; sctx.fontKerning = s.kerning === "normal" ? "normal" : "none";
          const availableTextWidth = Math.max(1, W - Math.min(W * .2, 48 * pixelScale));
          const layoutLine = (line: string) => {
            let width = 0, previous = "";
            const chars = Array.from(line).map((char, index) => {
              if (index) width += s.manual.tracking / 100 * fitted;
              if (previous && s.kerning === "normal") width += sctx.measureText(previous + char).width - sctx.measureText(previous).width - sctx.measureText(char).width;
              if (previous && s.kerning === "optical") width += opticalKerning.adjustment(previous, char, s.font, weight, fitted);
              const x = width; width += sctx.measureText(char).width; previous = char; return { char, x };
            });
            return { chars, width };
          };
          const widthOf = (line: string) => layoutLine(line).width;
          // Tracking follows the fitted font size, including during auto-fit.
          for (let n = 0; n < 5; n++) { const widest = Math.max(1, ...lines.map(widthOf)); if (widest <= availableTextWidth) break; fitted *= (availableTextWidth) / widest; sctx.font = `${weight} ${fitted}px ${s.font}`; }
          sctx.font = `${weight} ${fitted}px ${s.font}`;
          typographyEm = fitted;
          sctx.textAlign = "left"; sctx.textBaseline = "alphabetic";
          glyphs = [];
          const metrics = sctx.measureText("Mg"), ascent = metrics.actualBoundingBoxAscent, descent = metrics.actualBoundingBoxDescent, capHeight = Math.max(1, sctx.measureText("H").actualBoundingBoxAscent);
          lines.forEach((line, i) => {
            const layout = layoutLine(line), margin = (W - availableTextWidth) / 2;
            const origin = s.textAlign === "left" ? margin : s.textAlign === "right" ? W - margin - layout.width : (W - layout.width) / 2;
            const baseline = H / 2 + (i - (lines.length - 1) / 2) * fitted * s.lineHeight + (ascent - descent) / 2;
            for (const { char, x: offset } of layout.chars) {
              const x = origin + offset;
              const m = sctx.measureText(char);
              if (char.trim()) {
                // Each character owns its raster: neighbouring letters cannot leak into its sampling grid.
                const width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 8);
                const height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 8);
                const rasterKey = JSON.stringify([char, sctx.font, s.ink, width, height]);
                let c = glyphCache.get(rasterKey);
                if (!c) {
                  c = document.createElement("canvas"); c.width = width; c.height = height;
                  const gc = c.getContext("2d", { willReadFrequently: true })!;
                  gc.font = sctx.font; gc.textBaseline = "alphabetic"; gc.fillStyle = s.ink;
                  gc.fillText(char, m.actualBoundingBoxLeft + 4, m.actualBoundingBoxAscent + 4);
                  glyphCache.put(rasterKey, c);
                }
                const gx = x - m.actualBoundingBoxLeft - 4, gy = baseline - m.actualBoundingBoxAscent - 4;
                glyphs.push({ canvas: c, x: gx, y: gy, width, height, em: fitted, char, font: s.font, baseline, advanceX: x, capHeight });
                sctx.drawImage(c, gx, gy);
              }
            }
          });
          sctx.setTransform(1,0,0,1,0,0);
          cacheKey = key; lastRebuild = now;
        }
        const size2 = Math.round(s.secondType.size * canvasUnit), weight2 = Math.round(s.secondType.weight / 10) * 10;
        const secondKey = `${s.secondType.x}|${s.secondType.y}|${W}|${H}|${s.secondType.text}|${s.secondType.font}|${size2}|${weight2}|${s.secondType.ink}|${s.secondType.tracking}|${s.secondType.align}|${s.secondType.lineHeight}|${s.secondType.kerning}`;
        // Cap expensive glyph rasterisation at 20fps; wave evaluation and drawing remain at display rate.
        if (s.secondType.on && secondKey !== key2 && (manualFrame || now - rebuilt2 >= 50 || !key2)) {
          source2.width = W; source2.height = H; ctx2.fillStyle = s.secondType.ink; ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
          const lines = s.secondType.text.split("\n"); let fitted = Math.min(size2, H * .75 / (1 + Math.max(0, lines.length - 1) * s.secondType.lineHeight));
          ctx2.font = `${weight2} ${fitted}px ${s.secondType.font}`; ctx2.fontKerning = s.secondType.kerning === "normal" ? "normal" : "none";
          const availableTextWidth = Math.max(1, W - Math.min(W * .2, 48 * pixelScale));
          const layoutLine = (line: string) => {
            let width = 0, previous = "";
            const chars = Array.from(line).map((char, index) => {
              if (index) width += s.secondType.tracking / 100 * fitted;
              if (previous && s.secondType.kerning === "normal") width += ctx2.measureText(previous + char).width - ctx2.measureText(previous).width - ctx2.measureText(char).width;
              if (previous && s.secondType.kerning === "optical") width += opticalKerning.adjustment(previous, char, s.secondType.font, weight2, fitted);
              const x = width; width += ctx2.measureText(char).width; previous = char; return { char, x };
            });
            return { chars, width };
          };
          const widthOf = (line: string) => layoutLine(line).width;
          // Tracking follows the fitted font size, including during auto-fit.
          for (let n = 0; n < 5; n++) { const widest = Math.max(1, ...lines.map(widthOf)); if (widest <= availableTextWidth) break; fitted *= (availableTextWidth) / widest; ctx2.font = `${weight2} ${fitted}px ${s.secondType.font}`; }
          ctx2.font = `${weight2} ${fitted}px ${s.secondType.font}`;
          em2 = fitted;
          ctx2.textAlign = "left"; ctx2.textBaseline = "alphabetic";
          glyphs2 = [];
          const metrics = ctx2.measureText("Mg"), ascent = metrics.actualBoundingBoxAscent, descent = metrics.actualBoundingBoxDescent, capHeight = Math.max(1, ctx2.measureText("H").actualBoundingBoxAscent);
          lines.forEach((line, i) => {
            const layout = layoutLine(line), margin = (W - availableTextWidth) / 2;
            const origin = s.secondType.align === "left" ? margin : s.secondType.align === "right" ? W - margin - layout.width : (W - layout.width) / 2;
            const baseline = H / 2 + s.secondType.y / 100 * H + (i - (lines.length - 1) / 2) * fitted * s.secondType.lineHeight + (ascent - descent) / 2;
            for (const { char, x: offset } of layout.chars) {
              const x = origin + offset + s.secondType.x / 100 * W;
              const m = ctx2.measureText(char);
              if (char.trim()) {
                // Each character owns its raster: neighbouring letters cannot leak into its sampling grid.
                const width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 8);
                const height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 8);
                const rasterKey = JSON.stringify([char, ctx2.font, s.secondType.ink, width, height]);
                let c = glyphCache.get(rasterKey);
                if (!c) {
                  c = document.createElement("canvas"); c.width = width; c.height = height;
                  const gc = c.getContext("2d", { willReadFrequently: true })!;
                  gc.font = ctx2.font; gc.textBaseline = "alphabetic"; gc.fillStyle = s.secondType.ink;
                  gc.fillText(char, m.actualBoundingBoxLeft + 4, m.actualBoundingBoxAscent + 4);
                  glyphCache.put(rasterKey, c);
                }
                const gx = x - m.actualBoundingBoxLeft - 4, gy = baseline - m.actualBoundingBoxAscent - 4;
                glyphs2.push({ canvas: c, x: gx, y: gy, width, height, em: fitted, char, font: s.secondType.font, baseline, advanceX: x, capHeight });
                ctx2.drawImage(c, gx, gy);
              }
            }
          });
          key2 = secondKey; rebuilt2 = now;
        }
        // Colour the typography source once; downstream nodes preserve the incoming pixels.
        const typed = outputs.typography, typedCtx = typed.getContext("2d", { willReadFrequently: true })!;
        for (const node of gpu ? ["typography" as const, "typography2" as const] : nodes) for (const image of gpu ? [outputs[node]] : [outputs[node], previousOutputs[node]]) {
          if (image.width !== W || image.height !== H) { image.width = W; image.height = H; }
        }
        const nextRouteKey = JSON.stringify(s.videoPatches);
        if (routeKey !== nextRouteKey) { historyCtx.clearRect(0, 0, history.width, history.height); nodes.forEach(node => previousOutputs[node].getContext("2d")!.clearRect(0, 0, W, H)); feedbackTick = -Infinity; routeKey = nextRouteKey; }
        typedCtx.clearRect(0, 0, W, H); if (s.type1On) typedCtx.drawImage(source, 0, 0);
        if (s.type1On && s.bicolour) {
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
        const typed2 = outputs.typography2, typedCtx2 = typed2.getContext("2d", { willReadFrequently: true })!;
        typedCtx2.clearRect(0, 0, W, H);
        if (s.secondType.on) typedCtx2.drawImage(source2, 0, 0);
        const primaryGlyphs = glyphs, primaryEm = typographyEm;
        const rootsOf = (node: VideoSource, seen = new Set<VideoSource>()): ("typography" | "typography2")[] => {
          if (node === "typography" || node === "typography2") return [node];
          if (seen.has(node)) return [];
          const next = new Set(seen); next.add(node);
          return Array.from(new Set(s.videoPatches.filter(p => p.target === node).flatMap(p => rootsOf(p.source, next))));
        };
        const glyphsOf = (sources: VideoSource[]) => {
          const roots = new Set(sources.flatMap(source => rootsOf(source)));
          return [...(s.type1On && roots.has("typography") ? primaryGlyphs : []), ...(s.secondType.on && roots.has("typography2") ? glyphs2 : [])];
        };
        const sampleSites = new Map<VideoSource, { x: number; y: number }[]>();
        if (gpu) {
          try {
          const renderer = gpu;
          const gpuBlank = renderer.begin(W, H, nextRouteKey, s.modes.feedback);
        const resolved = new Map<VideoSource, GPUFrame>([["typography", renderer.load(typed)], ["typography2", s.secondType.on && s.videoPatches.some(p => p.source === "typography2") ? renderer.load(typed2, "typography2") : gpuBlank]]), visiting = new Set<VideoSource>(), cyclic = new Set<VideoSource>();
        const evaluate = (node: VideoSource): GPUFrame => {
          const root = rootsOf(node).find(source => source === "typography" ? s.type1On : s.secondType.on) || "typography", glyphs = glyphsOf([node]);
          const typographyEm = root === "typography2" ? em2 : primaryEm, detail = samplingDetailScale(node, s.videoPatches, s.modes.grid, mod.repeatScale / 100);
          const glyphFont = root === "typography2" ? s.secondType.font : s.font, glyphWeight = root === "typography2" ? s.secondType.weight : Math.round(mod.weight);
          const cached = resolved.get(node); if (cached) return cached;
          // Cyclic video cables read the previous frame, never recurse indefinitely.
          if (visiting.has(node)) { cyclic.add(node); return renderer.previous(node); }
          visiting.add(node);
          const routes = s.videoPatches.filter(p => p.target === node), route = routes[0];
          const layers = routes.map(p => evaluate(p.source));
          const input = layers.length > 1 ? renderer.compose(layers[0], layers[1], "input-" + node) : layers[0] || gpuBlank;
          // Bypass shares the incoming frame; it needs no full-canvas copy.
          if (node === "typography" || node === "typography2" || !s.modes[node]) { if (routes.length && routes.every(p => sampleSites.has(p.source))) sampleSites.set(node, routes.flatMap(p => sampleSites.get(p.source)!)); visiting.delete(node); resolved.set(node, input); return input; }
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
            out = renderer.repeat(input, placements, node, s.repeatMode === "single" ? angle : 0, blendModes.findIndex(mode => mode === s.repeatBlend));
          } else {
            const glyphGPU = node === "vertex" && (s.vertex === "glyph" || s.vertex === "custom");
            const points: GPUStamp[] = [];
            // Glyph-relative sampling also applies to pixels received from other modules.
            const em = glyphs[0]?.em || typographyEm, step = Math.max(1, Math.round(mod.step / 100 * em / detail));
            const lineage = new Set<VideoSource>();
            const glyphAligned = (current: VideoSource): boolean => {
              if (current === "typography" || current === "typography2") return true;
              if (lineage.has(current) || s.modes[current]) return false;
              lineage.add(current); const upstream = s.videoPatches.filter(p => p.target === current); const aligned = upstream.length > 0 && upstream.every(p => glyphAligned(p.source)); lineage.delete(current); return aligned;
            };
            const inheritedRoutes = node === "vertex" ? routes.filter(p => sampleSites.has(p.source)) : [];
            const missingRoutes = routes.filter(p => !inheritedRoutes.includes(p));
            const regionGlyphs = inheritedRoutes.length ? glyphsOf(missingRoutes.map(p => p.source)) : glyphs;
            const regions = missingRoutes.length && missingRoutes.every(p => glyphAligned(p.source)) ? regionGlyphs.map(g => glyphSamplingRegion(g, Math.max(1, Math.round(at("step", g.x + g.em / 2, g.y + g.em / 2, g) / 100 * g.em / detail)), s.glyphOrigins)) : [{ x: 0, y: 0, width: input.width, height: input.height, em, step, originX: undefined, originY: undefined }];
            const xOnly = node === "sampling" && s.samplingMode === "x", yOnly = node === "sampling" && s.samplingMode === "y";
            const inherited = inheritedRoutes.length ? inheritedRoutes.flatMap(p => sampleSites.get(p.source)!) : undefined;
            const sites: { x: number; y: number }[] = [];
            function* candidates() {
              if (inherited) { yield* spacedSites(inherited, site => s.vertexSpacing / 100 / detail * (glyphs.find(g => site.x >= g.x && site.x < g.x + g.width && site.y >= g.y && site.y < g.y + g.height)?.em || typographyEm), site => {
                const index = glyphs.findIndex(g => site.x >= g.x && site.x < g.x + g.width && site.y >= g.y && site.y < g.y + g.height); return String(index);
              }); if (!missingRoutes.length) return; }
              for (const region of regions) {
                const sx = yOnly ? Math.max(1, Math.round(pixelScale)) : region.step + (xOnly ? s.stripSpacing : node === "vertex" ? s.vertexSpacing : 0) / 100 * region.em / detail;
                const sy = xOnly ? Math.max(1, Math.round(pixelScale)) : region.step + (yOnly ? s.stripSpacing : node === "vertex" ? s.vertexSpacing : 0) / 100 * region.em / detail;
                for (let y = xOnly ? region.y : firstGridCoordinate(region.y, region.originY, sy); y < region.y + region.height; y += sy)
                  for (let x = yOnly ? region.x : firstGridCoordinate(region.x, region.originX, sx); x < region.x + region.width; x += sx) yield { x, y };
              }
            }
            for (const { x, y } of candidates()) {
              if (x < 0 || y < 0 || x >= input.width || y >= input.height) continue;
              const g = glyphs.find(g => x >= g.x && x < g.x + g.width && y >= g.y && y < g.y + g.height);
              // Evaluate one jitter value along each glyph strip, retaining the existing XY field.
              const j = node === "sampling" ? at("jitter", yOnly ? (g ? g.x + g.width / 2 : input.width / 2) : x, xOnly ? (g ? g.y + g.height / 2 : input.height / 2) : y, g) * pixelScale / detail : 0;
              const px = node === "sampling" ? Math.floor(x + (xOnly ? 0 : yOnly ? Math.cos(y * 37.71) * j : Math.sin(x * 73.17 + y) * j)) + .5 : x, py = node === "sampling" ? Math.floor(y + (yOnly ? 0 : xOnly ? Math.sin(x * 73.17) * j : Math.cos(y * 37.71 + x) * j)) + .5 : y;
              if (node === "sampling") sites.push({ x: px, y: py });
              const r = node === "vertex" ? at("vertexSize", x, y, g) / 100 / detail * (g?.em || typographyEm) : 2.6 * pixelScale;
              if (node === "vertex" && r <= 0) continue;
              points.push({ x, y, px, py, angle: glyphGPU ? stampOrientation(x, y, input.width, input.height, s.vertexScatter) : 0, size: Math.max(1, r), scaleX: node === "sampling" && !yOnly ? (g?.em || typographyEm) / typographyEm : 1, scaleY: node === "sampling" && !xOnly ? (g?.em || typographyEm) / typographyEm : 1 });
            }
            if (node === "sampling") sampleSites.set(node, sites);
            out = renderer.render(input, points, glyphGPU ? 4 : xOnly || yOnly ? 3 : node === "vertex" && s.vertex === "square" ? 1 : node === "vertex" && s.vertex === "line" ? 2 : 0, inherited ? .00001 : s.manual.threshold, node === "sampling" ? s.manual.opacity : 1, s.manual.lineLength * pixelScale / detail, node, node === "vertex" ? mod.vertexMix : 1, glyphGPU ? { pattern: s.vertex === "custom" ? "*" : s.glyphPattern, font: glyphFont, weight: glyphWeight, image: s.vertex === "custom" && s.vertexSVG ? decodedSVGs.current.get(s.vertexSVG.svg) : undefined } : undefined, pixelScale, node === "sampling" ? [yOnly ? 1 : s.samplingThicknessX / 100 / detail * typographyEm / (xOnly ? pixelScale : 2.6 * pixelScale), xOnly ? 1 : s.samplingThicknessY / 100 / detail * typographyEm / (yOnly ? pixelScale : 2.6 * pixelScale)] : [1, 1]);
          }
          visiting.delete(node); resolved.set(node, out); return out;
        };
        // Evaluate only ancestors of the selected canvas output.
        const layers = s.videoPatches.filter(p => p.target === "canvas").map(p => evaluate(p.source));
        const finalImage = layers.length > 1 ? renderer.compose(layers[0], layers[1]) : layers[0];
        ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H); drawImageLayers(ctx, s.imageLayers, decodedImages.current, "background", W, H);
        ctx.drawImage(renderer.present(finalImage), 0, 0, W, H);
        cyclic.forEach(node => { const image = resolved.get(node); if (image) renderer.snapshot(node, image); });
          } catch (error) { console.warn("K-TIC-SYNTH: GPU chain failed; using Canvas2D", error); gpu.dispose(); gpu = null; }
        } else {
        const resolved = new Map<VideoSource, HTMLCanvasElement>([["typography", typed], ["typography2", typed2]]), visiting = new Set<VideoSource>(), cyclic = new Set<VideoSource>();
        const evaluate = (node: VideoSource): HTMLCanvasElement => {
          const root = rootsOf(node).find(source => source === "typography" ? s.type1On : s.secondType.on) || "typography", glyphs = glyphsOf([node]);
          const typographyEm = root === "typography2" ? em2 : primaryEm, detail = samplingDetailScale(node, s.videoPatches, s.modes.grid, mod.repeatScale / 100);
          const glyphFont = root === "typography2" ? s.secondType.font : s.font, glyphWeight = root === "typography2" ? s.secondType.weight : Math.round(mod.weight);
          const cached = resolved.get(node); if (cached) return cached;
          // Cyclic video cables read the previous frame, never recurse indefinitely.
          if (visiting.has(node)) { cyclic.add(node); return previousOutputs[node]; }
          visiting.add(node);
          const routes = s.videoPatches.filter(p => p.target === node), route = routes[0];
          const layers = routes.map(p => evaluate(p.source));
          let input = layers[0] || blank;
          if (layers.length > 1) { const mixed = mixedInputs[node]; if (mixed.width !== W || mixed.height !== H) { mixed.width = W; mixed.height = H; } const mc = mixed.getContext("2d", { willReadFrequently: true })!; mc.clearRect(0, 0, W, H); layers.forEach(layer => mc.drawImage(layer, 0, 0, W, H)); input = mixed; }
          // Bypass shares the incoming frame; it needs no full-canvas copy.
          if (node === "typography" || node === "typography2" || !s.modes[node]) { if (routes.length && routes.every(p => sampleSites.has(p.source))) sampleSites.set(node, routes.flatMap(p => sampleSites.get(p.source)!)); visiting.delete(node); resolved.set(node, input); return input; }
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
            
            const drawCopy = (dx: number, dy: number) => { oc.save(); oc.globalCompositeOperation = s.repeatBlend; oc.translate(cx + dx, cy + dy); if (s.repeatMode === "single") oc.rotate(angle); oc.scale(scale, scale); oc.drawImage(input, -W / 2, -H / 2); oc.restore(); };
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
            const em = glyphs[0]?.em || typographyEm, step = Math.max(1, Math.round(mod.step / 100 * em / detail));
            if (node === "vertex") { oc.globalAlpha = 1 - mod.vertexMix; oc.drawImage(input, 0, 0); oc.globalAlpha = mod.vertexMix; }
            else oc.globalAlpha = s.manual.opacity;
            const lineage = new Set<VideoSource>();
            const glyphAligned = (current: VideoSource): boolean => {
              if (current === "typography" || current === "typography2") return true;
              if (lineage.has(current) || s.modes[current]) return false;
              lineage.add(current); const upstream = s.videoPatches.filter(p => p.target === current); const aligned = upstream.length > 0 && upstream.every(p => glyphAligned(p.source)); lineage.delete(current); return aligned;
            };
            const inheritedRoutes = node === "vertex" ? routes.filter(p => sampleSites.has(p.source)) : [];
            const missingRoutes = routes.filter(p => !inheritedRoutes.includes(p));
            const regionGlyphs = inheritedRoutes.length ? glyphsOf(missingRoutes.map(p => p.source)) : glyphs;
            const regions = missingRoutes.length && missingRoutes.every(p => glyphAligned(p.source)) ? regionGlyphs.map(g => glyphSamplingRegion(g, Math.max(1, Math.round(at("step", g.x + g.em / 2, g.y + g.em / 2, g) / 100 * g.em / detail)), s.glyphOrigins)) : [{ x: 0, y: 0, width: input.width, height: input.height, em, step, originX: undefined, originY: undefined }];
            const characters = Array.from(s.glyphPattern || "*"); let glyphIndex = 0;
            const xOnly = node === "sampling" && s.samplingMode === "x", yOnly = node === "sampling" && s.samplingMode === "y";
            const inherited = inheritedRoutes.length ? inheritedRoutes.flatMap(p => sampleSites.get(p.source)!) : undefined;
            const sites: { x: number; y: number }[] = [];
            function* candidates() {
              if (inherited) { yield* spacedSites(inherited, site => s.vertexSpacing / 100 / detail * (glyphs.find(g => site.x >= g.x && site.x < g.x + g.width && site.y >= g.y && site.y < g.y + g.height)?.em || typographyEm), site => {
                const index = glyphs.findIndex(g => site.x >= g.x && site.x < g.x + g.width && site.y >= g.y && site.y < g.y + g.height); return String(index);
              }); if (!missingRoutes.length) return; }
              for (const region of regions) {
                const sx = yOnly ? Math.max(1, Math.round(pixelScale)) : region.step + (xOnly ? s.stripSpacing : node === "vertex" ? s.vertexSpacing : 0) / 100 * region.em / detail;
                const sy = xOnly ? Math.max(1, Math.round(pixelScale)) : region.step + (yOnly ? s.stripSpacing : node === "vertex" ? s.vertexSpacing : 0) / 100 * region.em / detail;
                for (let y = xOnly ? region.y : firstGridCoordinate(region.y, region.originY, sy); y < region.y + region.height; y += sy)
                  for (let x = yOnly ? region.x : firstGridCoordinate(region.x, region.originX, sx); x < region.x + region.width; x += sx) yield { x, y };
              }
            }
            for (const { x, y } of candidates()) {
              if (x < 0 || y < 0 || x >= input.width || y >= input.height) continue;
              const offset = (Math.floor(y) * input.width + Math.floor(x)) * 4, alpha = pixels ? pixels[offset + 3] / 255 : 1;
              if (pixels && alpha < (inherited ? .00001 : s.manual.threshold)) continue;
              const g = glyphs.find(g => x >= g.x && x < g.x + g.width && y >= g.y && y < g.y + g.height);
              // Evaluate one jitter value along each glyph strip, retaining the existing XY field.
              const j = node === "sampling" ? at("jitter", yOnly ? (g ? g.x + g.width / 2 : input.width / 2) : x, xOnly ? (g ? g.y + g.height / 2 : input.height / 2) : y, g) * pixelScale / detail : 0;
              const px = node === "sampling" ? Math.floor(x + (xOnly ? 0 : yOnly ? Math.cos(y * 37.71) * j : Math.sin(x * 73.17 + y) * j)) + .5 : x, py = node === "sampling" ? Math.floor(y + (yOnly ? 0 : xOnly ? Math.sin(x * 73.17) * j : Math.cos(y * 37.71 + x) * j)) + .5 : y;
              if (pixels && !useGPU) oc.fillStyle = oc.strokeStyle = `rgba(${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]},${alpha})`;
              if (node === "sampling") sites.push({ x: px, y: py });
              const r = node === "vertex" ? at("vertexSize", x, y, g) / 100 / detail * (g?.em || typographyEm) : 2.6 * pixelScale;
              if (node === "vertex" && r <= 0) continue;
              oc.beginPath();
              if (xOnly || yOnly) { const width = yOnly ? pixelScale : s.samplingThicknessX / 100 / detail * (g?.em || typographyEm), height = xOnly ? pixelScale : s.samplingThicknessY / 100 / detail * (g?.em || typographyEm); oc.fillRect(px - width / 2, py - height / 2, width, height); }
              else if (node === "vertex" && s.vertex === "custom" && s.vertexSVG) { const stamp = tintedSVG(s.vertexSVG.svg, String(oc.fillStyle), r); if (stamp) { const scale = r / Math.max(stamp.width, stamp.height), w = stamp.width * scale, h = stamp.height * scale; oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = "high"; oc.save(); oc.translate(px, py); oc.rotate(stampOrientation(x, y, input.width, input.height, s.vertexScatter)); oc.drawImage(stamp, -w / 2, -h / 2, w, h); oc.restore(); } }
              else if (node === "vertex" && s.vertex === "glyph") { oc.font = `${glyphWeight} ${Math.max(1, r)}px ${glyphFont}`; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.save(); oc.translate(px, py); oc.rotate(stampOrientation(x, y, input.width, input.height, s.vertexScatter)); oc.fillText(characters[glyphIndex++ % characters.length], 0, 0); oc.restore(); }
              else if (node === "vertex" && s.vertex === "square") oc.fillRect(px - r / 2, py - r / 2, r, r);
              else if (node === "vertex" && s.vertex === "line") { oc.lineWidth = Math.max(1, r / 3); const len = s.manual.lineLength * pixelScale / detail / (2 * Math.SQRT2); oc.moveTo(px - len, py - len); oc.lineTo(px + len, py + len); oc.stroke(); }
              else { const radius = Math.max(.5, r / 2); oc.ellipse(px, py, node === "sampling" ? s.samplingThicknessX / 200 / detail * (g?.em || typographyEm) : radius, node === "sampling" ? s.samplingThicknessY / 200 / detail * (g?.em || typographyEm) : radius, 0, 0, Math.PI * 2); oc.fill(); }
            }
            if (node === "sampling") sampleSites.set(node, sites);
            oc.globalAlpha = 1;
          }
          visiting.delete(node); resolved.set(node, out); return out;
        };
        // Evaluate only ancestors of the selected canvas output.
        const layers = s.videoPatches.filter(p => p.target === "canvas").map(p => evaluate(p.source));
        ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H); drawImageLayers(ctx, s.imageLayers, decodedImages.current, "background", W, H);
        layers.forEach(image => ctx.drawImage(image, 0, 0, W, H));
        // Ordinary chains need no previous-frame snapshots; only cycles do.
        cyclic.forEach(node => { const pc = previousOutputs[node].getContext("2d")!; pc.clearRect(0, 0, W, H); const image = resolved.get(node); if (image) pc.drawImage(image, 0, 0); });
        }
        drawImageLayers(ctx, s.imageLayers, decodedImages.current, "foreground", W, H);
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = s.bg; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
      if (!manualFrame) raf = requestAnimationFrame(frame);
    };
    renderDriver.current = { start: () => previous || performance.now(), frame: now => frame(now, true), resume: () => { const now = performance.now(), offset = now - previous; feedbackClockOrigin += offset; lastRebuild += offset; previous = now; lastFrame = now; } };
    raf = requestAnimationFrame(frame); return () => { renderDriver.current = null; cancelAnimationFrame(raf); gpu?.dispose(); };
  }, []);
  const imagesReady = () => {
    const s = live.current;
    if (s.customFonts.some(f => loadedFonts.current.get(f.id)?.data !== f.data) || (s.vertex === "custom" && s.vertexSVG && !decodedSVGs.current.has(s.vertexSVG.svg))) { setPresetMessage("Custom assets are loading. Try export again in a moment."); return false; }
    if (live.current.imageLayers.some(l => l.on && !decodedImages.current.has(l.data))) { setPresetMessage("Images are loading. Try export again in a moment."); return false; } return true;
  };
  const startRecording = () => {
    if (!imagesReady()) return;
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
    if (!imagesReady()) return;
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
      const blob = await renderVideo(image, recordSeconds, controller.signal, index => { if (index) driver.frame(start + index * 1000 / renderFps); }, (done, total) => setRenderProgress({ done, total }), renderFps);
      controller.signal.throwIfAborted(); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `k-tic-synth-${name}-${width}x${height}-${renderFps}fps.mp4`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      setPresetMessage(`Rendered video saved · ${width} × ${height} · ${renderFps} fps`);
    } catch (error) { if (renderDriver.current) setPresetMessage(controller.signal.aborted ? "Video render cancelled." : error instanceof Error ? error.message : "Video render failed."); }
    finally { renderSnapshot.current = null; renderAbort.current = null; driver.resume(); if (renderDriver.current) setRendering(false); }
  };
  const exportPNG = () => {
    if (!imagesReady()) return;
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
    const payload = { format: "k-tic-synth", version: 2, state: live.current, timeline: timelineState.current };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `k-tic-synth-${text.trim().slice(0, 32).replace(/[^a-z0-9_-]/gi, "-") || "preset"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setPresetMessage("Preset exported.");
  };
  const applyPreset = (state: SynthState) => {
      setBpm(state.bpm); setWaves(state.waves); setValues(state.values); setManual(state.manual); setModes(state.modes); setPatches(state.patches); setVideoPatches(state.videoPatches);
      setCustomFonts(state.customFonts); setVertexSVG(state.vertexSVG); setImageLayers(state.imageLayers); setType1On(state.type1On); setType1Transform(state.type1Transform); setSecondType(state.secondType); setStripSpacing(state.stripSpacing); setVertexSpacing(state.vertexSpacing); setVertexScatter(state.vertexScatter); setGlyphOrigins(state.glyphOrigins); setSamplingThicknessLinked(state.samplingThicknessLinked); setSamplingThicknessX(state.samplingThicknessX); setSamplingThicknessY(state.samplingThicknessY); setText(state.text); setTextAlign(state.textAlign); setLineHeight(state.lineHeight); setKerning(state.kerning); setFont(state.font); setVertex(state.vertex); setRepeatMode(state.repeatMode); setSamplingMode(state.samplingMode); setGlyphPattern(state.glyphPattern); setPaused(state.paused); setBg(state.bg); setInk(state.ink); setBicolour(state.bicolour); setInk2(state.ink2); setFeedbackBlend(state.feedbackBlend); setRepeatBlend(state.repeatBlend); setFeedbackTiming(state.feedbackTiming); setFeedbackDivision(state.feedbackDivision);
      setSelected(null); setSelectedVideo(null); setDrag(null); setVideoDrag(null); dragRef.current = null; videoDragRef.current = null;
  };
  const restorePresetTimeline = (preset: TimelineData) => {
    const hasKeys = preset.tracks.some(track => track.frames.length > 0);
    timelineState.current = preset;
    setTimeline(preset);
    timelineClock.current.time = 0;
    timelineClock.current.lastDisplay = 0;
    timelineClock.current.playing = hasKeys;
    setTimelineTime(0);
    setTimelinePlaying(hasKeys);
    // Preset loading begins a new timeline history.
    timelineUndoStack.current = [];
    timelineRedoStack.current = [];
    timelineEdit.current = { when: 0, shape: "" };
    setTimelineHistory({ undo: false, redo: false });
    if (hasKeys) setPaused(false);
  };
  const initialPresetLoaded = useRef(false);
  useEffect(() => {
    if(initialPresetLoaded.current)return;
    initialPresetLoaded.current=true;
    let active=true;
    const initialize = async () => {
      try {
        const state=parsePreset(defaultKineticPreset);
        await ensureAssets(state.customFonts,state.vertexSVG);
        if(!active)return;
        applyPreset(state);
        restorePresetTimeline(parseTimeline(defaultKineticPreset.timeline));
      } catch(error) {
        if(active)setPresetMessage(error instanceof Error? `Default preset: ${error.message}`:"Could not load the default preset.");
      }
    };
    void initialize();
    return ()=>{active=false;initialPresetLoaded.current=false;};
    // Initialize the bundled default once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const importPreset = async (file: File) => {
    try {
      if (file.size > 96 * 1024 * 1024) throw new Error("Preset files must be smaller than 96 MB.");
      const document = JSON.parse(await file.text());
      const state = parsePreset(document);
      const restoredTimeline = parseTimeline(document.timeline);
      await ensureImages(state.imageLayers);
      await ensureAssets(state.customFonts, state.vertexSVG);
      applyPreset(state);
      restorePresetTimeline(restoredTimeline);
      setPresetMessage("Preset and timeline imported. Undo restores synth settings.");
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not import this preset."); }
  };
  const changeWave = (i: number, change: Partial<Wave>) => setWaves(all => all.map((w, n) => n === i ? { ...w, ...change } : w));
  const connect = (wave: number, target: Target) => { setPatches(all => all.some(p => p.wave === wave && p.target === target) ? all : [...all, { id: `${wave}-${target}`, wave, target, amount: 50 }]); setSelected(null); setDrag(null); };
  const videoChain = readVideoChain(videoPatches);
  const setVideoChain = (chain: VideoModule[]) => { setVideoPatches(writeVideoChain(chain, videoPatches.some(p => p.source === "typography2") ? "typography2" : "typography")); setSelectedVideo(null); setVideoDrag(null); videoDragRef.current = null; };
  const moveChain = (module: VideoModule, direction: number) => { if (!videoChain) return; const index = videoChain.indexOf(module); setVideoChain(moveVideoModule(videoChain, index, index + direction)); };
  const chainEditor = <section className="kp-chain" aria-label="Video chain editor"><b>VIDEO CHAIN</b>{videoChain === null ? <div><button onClick={() => setVideoChain(videoModules.slice())}>{videoPatches.length ? "REPLACE WITH DEFAULT CHAIN" : "CONNECT DEFAULT CHAIN"}</button><button onClick={() => setVideoChain([])}>TEXT → CANVAS</button></div> : <><select aria-label="Video chain typography source" value={videoPatches.some(p => p.source === "typography2") ? "typography2" : "typography"} onChange={e => setVideoPatches(writeVideoChain(videoChain, e.target.value as "typography" | "typography2"))}><option value="typography">TYPOGRAPHY 1</option><option value="typography2">TYPOGRAPHY 2</option></select>{videoChain.map((module, index) => <div className="kp-chain-row" key={module} draggable onDragStart={e => { chainDrag.current = module; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", module); }} onDragEnd={() => { chainDrag.current = null; }} onDragOver={e => { if (chainDrag.current) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }} onDrop={e => { e.preventDefault(); const source = chainDrag.current; chainDrag.current = null; if (source) setVideoChain(moveVideoModule(videoChain, videoChain.indexOf(source), index)); }}><span title="Drag to reorder">⠿</span><b>{module === "grid" ? "MOTION" : module.toUpperCase()}</b><button aria-label={`Move ${module} earlier`} disabled={index === 0} onClick={() => moveChain(module, -1)}>↑</button><button aria-label={`Move ${module} later`} disabled={index === videoChain.length - 1} onClick={() => moveChain(module, 1)}>↓</button><button aria-label={`Remove ${module} from video chain`} onClick={() => setVideoChain(videoChain.filter(m => m !== module))}>×</button></div>)}<div className="kp-chain-end">CANVAS</div>{videoModules.some(m => !videoChain.includes(m)) && <select aria-label="Add module to video chain" value="" onChange={e => { if (e.target.value) setVideoChain([...videoChain, e.target.value as VideoModule]); }}><option value="" disabled>+ ADD MODULE</option>{videoModules.filter(m => !videoChain.includes(m)).map(m => <option key={m} value={m}>{m === "grid" ? "MOTION" : m.toUpperCase()}</option>)}</select>}</>}</section>;
  const connectVideo = (source: VideoSource, target: VideoTarget) => { setVideoPatches(all => connectVideoPatch(all, source, target)); setSelectedVideo(null); setVideoDrag(null); videoDragRef.current = null; videoDragStart.current = null; };
  const patchedKnob = ([key, label, min, max, step, group]: (typeof specs)[number]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input ${group} ${label}`} onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} /><div className="kp-knob-control"><ControlCaption label={label} /><Knob name={`${group} ${label}`} min={min} max={max} step={step} value={values[key]} onChange={next => setValues(v => ({ ...v, [key]: next }))} /></div></div>;
  const patchInput = (key: Target, label: string, content: ReactNode) => <div className="kp-control kp-extra-control" data-target={key} key={key}>
    <button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input ${label}`} title="Plug a modulation source · click to disconnect" onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} />
    {content}
  </div>;
  const manualKnob = ([key, label, min, max, step, group]: (typeof manualSpecs)[number]) => patchInput(key, `${group} ${label}`, <div className="kp-knob-control"><ControlCaption label={label} /><Knob name={`${group} ${label}`} min={min} max={max} step={step} value={manual[key]} onChange={next => setManual(v => ({ ...v, [key]: next }))} /></div>);

  const videoPorts = (node: VideoSource | "canvas") => <div className="kp-video-ports">{node !== "typography" && node !== "typography2" && <label><span className="kp-port-icon" data-tooltip="Video input"><SquareArrowRightEnter size={16} strokeWidth={1.5} aria-hidden="true" /><span className="kp-sr-only">Video input</span></span><button className="kp-socket kp-video-socket" data-video-target={node} title={"Connect up to two outputs · click to unplug"} aria-label={`Video input ${node}`} ref={el => { sockets.current[`video-in-${node}`] = el; }} onClick={() => { if (selectedVideo) connectVideo(selectedVideo, node); else setVideoPatches(all => all.filter(p => p.target !== node)); }} /></label>}{node !== "canvas" && <label><span className="kp-port-icon kp-port-output" data-tooltip="Video output"><SquareArrowRightEnter size={16} strokeWidth={1.5} aria-hidden="true" /><span className="kp-sr-only">Video output</span></span><button className={`kp-socket kp-video-socket ${selectedVideo === node ? "selected" : ""}`} data-video-source={node} title="Drag to connect · right-click to unplug" aria-label={`Video output ${node}`} ref={el => { sockets.current[`video-out-${node}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelected(null); setSelectedVideo(selectedVideo === node ? null : node); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; videoDragStart.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); videoDragRef.current = node; setVideoDrag({ source: node, x: e.clientX - r.left, y: e.clientY - r.top }); }} /></label>}</div>;
  const finishDrag = (e: PointerEvent) => {
    if (videoDragRef.current) { const source = videoDragRef.current; videoDragRef.current = null; videoDragStart.current = null; const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-video-target]"); const target = hit?.dataset.videoTarget as VideoTarget | undefined; if (target) connectVideo(source, target); else setVideoDrag(null); return; }
    const active = dragRef.current;
    if (!active) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-target]");
    let target = hit?.dataset.target as Target | undefined;
    if (!target) for (const [key] of specs) {
      const el = sockets.current[key]; if (!el || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) < 25) { target = key; break; }
    }
    dragRef.current = null;
    if (target) connect(active.wave, target); else setDrag(null);
  };
  const outputSocket = (id: number) => <button className={`kp-socket ${selected === id ? "selected" : ""}`} data-mod-source={id} aria-label={`Patch output ${sourceNames[id].toLowerCase()}`} title="Drag to connect · right-click to unplug" style={{ borderColor: colors[id] }} ref={el => { sockets.current[`wave${id}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelectedVideo(null); setSelected(selected === id ? null : id); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); dragRef.current = { wave: id, x: e.clientX - r.left, y: e.clientY - r.top }; setDrag(dragRef.current); }} />;
  const cable = (a: XY, b: XY) => `M ${a.x} ${a.y} C ${a.x + 70} ${a.y}, ${b.x - 70} ${b.y}, ${b.x} ${b.y}`;
  const importFont = async (file: File) => {
    if (assetBusy) return; const target = fontImportTarget.current; setAssetBusy(true);
    try {
      if (!/\.(woff2?|ttf|otf)$/i.test(file.name) || file.size > 4 * 1024 * 1024) throw new Error("Choose a WOFF2, WOFF, TTF or OTF font smaller than 4 MB.");
      if (live.current.customFonts.length >= 4) throw new Error("Remove a font before importing another (maximum four).");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const format = detectFontFormat(bytes);
      if (!format) throw new Error("This file is not a supported font (WOFF2, WOFF, TTF or OTF).");
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(`data:font/${format};base64,` + String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("Could not read font.")); reader.readAsDataURL(file); });
      const font = { id: crypto.randomUUID(), name: file.name.replace(/\.(woff2?|ttf|otf)$/i, "").slice(0, 200), data };
      await ensureAssets([font], null); setCustomFonts(all => [...all, font]);
      if (target === "typography") setFont(fontFamily(font.id)); else setSecondType(t => ({ ...t, font: fontFamily(font.id) }));
      setPresetMessage("Font imported and included in presets.");
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not import font."); } finally { setAssetBusy(false); }
  };
  const importSVG = async (file: File) => {
    if (assetBusy) return; setAssetBusy(true);
    try { if (file.size > 512 * 1024) throw new Error("SVG must be smaller than 512 KB."); const shape = { name: file.name.slice(0, 200), svg: await file.text() }; await ensureAssets([], shape); setVertexSVG(shape); setVertex("custom"); setPresetMessage("SVG Vertex shape loaded. Incoming pixels supply its colour."); }
    catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not import SVG."); } finally { setAssetBusy(false); }
  };
  const fontManager = <details className="kp-font-manager"><summary>FONTS · {customFonts.length}</summary><button disabled={assetBusy || customFonts.length >= 4} onClick={() => { fontImportTarget.current = typeTab; fontInput.current?.click(); }}>{assetBusy ? "LOADING…" : "+ IMPORT FONT"}</button>{customFonts.map(f => <div className="kp-asset-tools" key={f.id}><span title={f.name}>{f.name}</span><button aria-label={`Remove font ${f.name}`} onClick={() => { setCustomFonts(all => all.filter(item => item.id !== f.id)); setGlyphOrigins(all => { const next = { ...all }; delete next[fontFamily(f.id)]; return next; }); if (font === fontFamily(f.id)) setFont("system-ui, sans-serif"); if (secondType.font === fontFamily(f.id)) setSecondType(t => ({ ...t, font: "system-ui, sans-serif" })); }}>×</button></div>)}</details>;
  const importImage = async (file: File) => {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      if (!["image/png", "image/jpeg", "image/webp", "image/avif"].includes(file.type)) throw new Error("Use PNG, JPEG, WebP or AVIF.");
      if (file.size > imageByteLimit) throw new Error("Images must be smaller than 12 MB.");
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read image.")); reader.readAsDataURL(file); });
      const image = await decodeLayerImage(data);
      const current = live.current.imageLayers;
      if (current.length >= imageLimit || current.reduce((n, l) => n + l.data.length, data.length) > 64 * 1024 * 1024) throw new Error("Maximum eight images and 64 MB of embedded image data.");
      const id = crypto.randomUUID(); decodedImages.current.set(data, image);
      setImageLayers(layers => [...layers, { id, name: file.name.slice(0, 200), data, on: true, placement: "background", fit: "cover", x: 0, y: 0, size: 100, angle: 0, opacity: 100, blend: "source-over" }]);
      setSelectedImage(id); setPresetMessage("Image added. Presets include the original image.");
    } catch (error) { setPresetMessage(error instanceof Error ? error.message : "Could not import image."); }
    finally { setImageBusy(false); }
  };
  const activeImage = imageLayers.find(l => l.id === selectedImage) || imageLayers[imageLayers.length - 1];
  const updateImage = (change: Partial<ImageLayer>) => { if (activeImage) setImageLayers(layers => layers.map(l => l.id === activeImage.id ? { ...l, ...change } : l)); };
  const moveImage = (id: string, direction: number) => setImageLayers(layers => {
    const from = layers.findIndex(l => l.id === id); if (from < 0) return layers;
    let to = from + direction; while (to >= 0 && to < layers.length && layers[to].placement !== layers[from].placement) to += direction;
    if (to < 0 || to >= layers.length) return layers;
    const next = layers.slice(); [next[from], next[to]] = [next[to], next[from]]; return next;
  });
  const imageLayerPanel = <details className="kp-image-layers"><summary>IMAGE LAYERS · {imageLayers.length}</summary><button disabled={imageBusy || imageLayers.length >= imageLimit} onClick={() => imageInput.current?.click()}>{imageBusy ? "LOADING…" : "+ IMPORT IMAGE"}</button><input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden aria-label="Import image layer" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importImage(file); }} />{(["foreground", "background"] as const).map(placement => <div className="kp-image-stack" key={placement}><b>{placement === "foreground" ? "ABOVE SYNTH" : "BELOW SYNTH"}</b>{imageLayers.filter(l => l.placement === placement).slice().reverse().map((l, index, layers) => <div className="kp-image-row" key={l.id}><button className={activeImage?.id === l.id ? "selected" : ""} aria-pressed={activeImage?.id === l.id} onClick={() => setSelectedImage(l.id)} title={l.name}>{l.name}</button><button aria-label={`Enable image ${l.name}`} aria-pressed={l.on} onClick={() => setImageLayers(all => all.map(item => item.id === l.id ? { ...item, on: !item.on } : item))}>{l.on ? "ON" : "OFF"}</button><button aria-label={`Move ${l.name} forward`} disabled={index === 0} onClick={() => moveImage(l.id, 1)}>↑</button><button aria-label={`Move ${l.name} backward`} disabled={index === layers.length - 1} onClick={() => moveImage(l.id, -1)}>↓</button><button aria-label={`Remove image ${l.name}`} onClick={() => setImageLayers(all => all.filter(item => item.id !== l.id))}>×</button></div>)}</div>)}{activeImage && <div className="kp-image-controls"><select aria-label="Image placement" value={activeImage.placement} onChange={e => updateImage({ placement: e.target.value as ImageLayer["placement"] })}><option value="background">BELOW SYNTH</option><option value="foreground">ABOVE SYNTH</option></select><select aria-label="Image fit" value={activeImage.fit} onChange={e => updateImage({ fit: e.target.value as ImageLayer["fit"] })}><option value="cover">COVER</option><option value="contain">CONTAIN</option><option value="stretch">STRETCH</option></select><select aria-label="Image blend mode" value={activeImage.blend} onChange={e => updateImage({ blend: e.target.value as GlobalCompositeOperation })}>{blendModes.map(mode => <option key={mode} value={mode}>{mode === "source-over" ? "NORMAL" : mode === "lighter" ? "ADD" : mode.toUpperCase()}</option>)}</select><div className="kp-manual">{([["x", "Position X · %", -100, 100, .1], ["y", "Position Y · %", -100, 100, .1], ["size", "Size · %", 1, 300, .1], ["angle", "Angle · °", -180, 180, .1], ["opacity", "Opacity · %", 0, 100, .1]] as const).map(([key, label, min, max, step]) => <div className="kp-knob-control" key={key}><ControlCaption label={label} /><Knob name={`Image ${label}`} min={min} max={max} step={step} value={activeImage[key]} onChange={value => updateImage({ [key]: value })} /></div>)}</div><button onClick={() => updateImage({ x: 0, y: 0, size: 100, angle: 0, opacity: 100, fit: "cover", blend: "source-over" })}>RESET IMAGE</button></div>}</details>;
  return <main onContextMenu={e => {
      const socket = (e.target as Element).closest<HTMLElement>(".kp-socket"); if (!socket) return; e.preventDefault();
      const videoSource = socket.dataset.videoSource, videoTarget = socket.dataset.videoTarget, modSource = socket.dataset.modSource, target = socket.dataset.target;
      if (videoSource) setVideoPatches(all => all.filter(p => p.source !== videoSource));
      if (videoTarget) setVideoPatches(all => all.filter(p => p.target !== videoTarget));
      if (modSource !== undefined) setPatches(all => all.filter(p => p.wave !== Number(modSource)));
      if (target) setPatches(all => all.filter(p => p.target !== target));
      setSelected(null); setSelectedVideo(null);
    }} className="kp" style={{ "--kp-bg": bg } as CSSProperties}>
    <input ref={fontInput} hidden type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" aria-label="Import font" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importFont(file); }} /><input ref={svgInput} hidden type="file" accept=".svg,image/svg+xml" aria-label="Import Vertex SVG" onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importSVG(file); }} />
    <header className="kp-header"><Link href="/" onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); window.location.assign("/"); }}>← INDEX</Link><h1>K-TIC-SYNTH</h1><button aria-label="Undo last synth edit" title="Synth Undo · ⌘/Ctrl Z" disabled={!canUndo} onClick={undo}>↶ UNDO</button><button aria-label="Redo last synth edit" title="Synth Redo · ⌘/Ctrl Shift Z" disabled={!canRedo} onClick={redo}>↷ REDO</button><button onClick={() => setPaused(v => !v)}>{paused ? "▶ RUN" : "Ⅱ HOLD"}</button><button className="kp-timeline-toggle" aria-expanded={timelineOpen} aria-controls="kp-timeline-panel" onClick={()=>setTimelineOpen(v=>!v)}>{timelineOpen?"◈ CLOSE TIMELINE":"◇ TIMELINE"}</button></header>
    <section ref={stage} className={`kp-stage${nativeView ? " kp-native-view" : ""}`}><canvas ref={canvas} style={viewSize.width ? nativeView ? { width: nativeSize.width, height: nativeSize.height, position: "relative", margin: "54px 16px 16px" } : { width: previewSize.width, height: previewSize.height, position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" } : undefined} aria-label="Animated kinetic typography" /><span className="kp-caption">VISUAL SYNTHESIZER · THREE WAVE ENGINE</span></section>
    {timelineOpen && <KineticTimeline data={timeline} onChange={updateTimeline} canUndo={timelineHistory.undo} canRedo={timelineHistory.redo} onUndo={undoTimeline} onRedo={redoTimeline} position={timelineTime} onSeek={seekTimeline} playing={timelinePlaying} onPlay={toggleTimeline} options={timelineOptions} readValue={timelineCurrentValue}/>}
    <div className="kp-controls"><div ref={panel} className="kp-rack" onPointerMove={e => { if (videoDrag && panel.current) { const r = panel.current.getBoundingClientRect(); if (videoDragStart.current && Math.hypot(e.clientX - videoDragStart.current.x, e.clientY - videoDragStart.current.y) > 3) dragMoved.current = true; setVideoDrag({ ...videoDrag, x: e.clientX - r.left, y: e.clientY - r.top }); } if (drag && panel.current) { const r = panel.current.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left - drag.x, e.clientY - r.top - drag.y) > 3) dragMoved.current = true; setDrag({ ...drag, x: e.clientX - r.left, y: e.clientY - r.top }); } }} onPointerUp={finishDrag} onPointerCancel={() => { dragRef.current = null; videoDragRef.current = null; setVideoDrag(null); setDrag(null); }}>
      <svg className="kp-cables" aria-hidden="true">{videoPatches.map(p => { const a = positions[`video-out-${p.source}`], b = positions[`video-in-${p.target}`]; return a && b ? <path key={`video-${p.source}-${p.target}`} className="kp-video-cable kp-removable-cable" onClick={e => { e.stopPropagation(); setVideoPatches(all => all.filter(item => item.target !== p.target || item.source !== p.source)); }} d={cable(a, b)} stroke="#b8b4a9" /> : null; })}{videoDrag && positions[`video-out-${videoDrag.source}`] && <path d={cable(positions[`video-out-${videoDrag.source}`], videoDrag)} stroke="#b8b4a9" strokeDasharray="4 4" />}{patches.map(p => { const a = positions[`wave${p.wave}`], b = positions[p.target]; return a && b ? <path key={p.id} className="kp-removable-cable" onClick={e => { e.stopPropagation(); setPatches(all => all.filter(item => item.id !== p.id)); }} d={cable(a, b)} stroke={colors[p.wave]} /> : null; })}{drag && positions[`wave${drag.wave}`] && <path d={cable(positions[`wave${drag.wave}`], drag)} stroke={colors[drag.wave]} strokeDasharray="4 4" />}</svg>
      <section className="kp-waves"><section className="kp-shared-sampling" aria-label="Shared Sampling and Vertex controls"><div className="kp-shared-head"><div className="kp-title kp-icon-heading" data-tooltip="Shared Sampling / Vertex"><Grid3X3 size={16} strokeWidth={1.5} aria-hidden="true" /><span className="kp-sr-only">Shared Sampling / Vertex</span></div><button className="kp-origin-trigger" data-tooltip="Edit glyph sampling origins" aria-label="Edit glyph sampling origins" onClick={() => setOriginEditorOpen(true)}><BookType size={16} strokeWidth={1.5} aria-hidden="true" /></button></div>
        {specs.filter(c => c[0] === "step").map(([key, label, min, max, step]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input sampling ${label}`} onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} /><div className="kp-knob-control"><ControlCaption label={label} /><Knob name={`sampling ${label}`} min={min} max={max} step={step} value={values[key]} onChange={next => setValues(v => ({ ...v, [key]: next }))} /></div></div>)}
        {manualSpecs.filter(c => c[0] === "threshold").map(([key, label, min, max, step]) => <div className="kp-knob-control" key={key}><ControlCaption label={label} /><Knob name={`sampling ${label}`} min={min} max={max} step={step} value={manual[key]} onChange={next => setManual(v => ({ ...v, [key]: next }))} /></div>)}
      </section><div className="kp-title">WAVES</div>
        <div className="kp-wave-clock"><label>BPM <input aria-label="Wave tempo BPM" type="number" min={20} max={300} value={bpmDraft} onChange={e => setBpmDraft(e.target.value)} onBlur={() => { const next = Number(bpmDraft); if (bpmDraft.trim() && Number.isFinite(next)) { const tempo = clamp(next, 20, 300); setBpm(tempo); setBpmDraft(String(tempo)); } else setBpmDraft(String(bpm)); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label></div>
        {waves.map((w, i) => <div key={i} className="kp-wave" style={{ "--wave": colors[i] } as CSSProperties}><div className="kp-wavehead"><b>WAVE {i + 1}</b><button aria-label={`Enable wave ${i + 1}`} aria-controls={`kp-wave-body-${i}`} aria-expanded={w.on} aria-pressed={w.on} onClick={() => changeWave(i, { on: !w.on })}>{w.on ? "ON" : "OFF"}</button><button className={`kp-socket ${selected === i ? "selected" : ""}`} data-mod-source={i} title="Drag to connect · right-click to unplug" aria-label={`Patch output wave ${i + 1}`} ref={el => { sockets.current[`wave${i}`] = el; }} onClick={() => { if (!dragMoved.current) { setSelectedVideo(null); setSelected(selected === i ? null : i); } }} onPointerDown={e => { if (e.button !== 0) return; dragMoved.current = false; e.currentTarget.setPointerCapture(e.pointerId); const r = panel.current!.getBoundingClientRect(); dragRef.current = { wave: i, x: e.clientX - r.left, y: e.clientY - r.top }; setDrag(dragRef.current); }} /></div>
          <div id={`kp-wave-body-${i}`} className="kp-wave-body" hidden={!w.on}><div className="kp-wave-shape-field" data-tooltip={`Wave ${i + 1} · ${w.shape}`}><svg viewBox="0 0 28 18" aria-hidden="true"><path d={w.shape === "sine" ? "M2 9C6-1 8-1 14 9S22 19 26 9" : w.shape === "triangle" ? "M2 14L8 4L14 14L20 4L26 14" : w.shape === "square" ? "M2 14V4H9V14H17V4H26V14" : w.shape === "ramp" ? "M2 14L13 4V14L26 4" : "M2 9L5 3L8 14L11 7L14 12L17 2L20 15L23 6L26 9"} /></svg><select className="kp-wave-shape" aria-label={`Wave ${i + 1} shape`} value={w.shape} onChange={e => changeWave(i, { shape: e.target.value as Shape })}>{(["sine", "triangle", "square", "noise", "ramp"] as Shape[]).map(shape => <option key={shape} value={shape} aria-label={shape}>{({ sine: "∿", triangle: "△", square: "⊓", noise: "≋", ramp: "↗" } as Record<Shape, string>)[shape]}</option>)}</select></div>{w.shape === "ramp" && <small className="kp-ramp-help">Full turn: AMP 1 · Angle cable 100% · Angle 0°</small>}
          {w.shape === "noise" && <div className="kp-noise-config">
            <label>NOISE MODE<select aria-label={`Wave ${i + 1} noise mode`} value={w.noiseMode || "random"} onChange={e => changeWave(i, { noiseMode: e.target.value as "cycle" | "random" })}><option value="cycle">CYCLE · ASCENDING</option><option value="random">RANDOM · STEPPED</option></select></label>
            <label>OUTPUT<select aria-label={`Wave ${i + 1} noise output range`} value={w.noiseOutput || "full"} onChange={e => changeWave(i, { noiseOutput: e.target.value as "full" | "positive" | "negative" })}><option value="full">FULL · −N…+N</option><option value="positive">POSITIVE · 0…+N</option><option value="negative">NEGATIVE · −N…0</option></select></label>
            <label>STEP RANGE<select aria-label={`Wave ${i + 1} noise step range`} value={w.noiseRange || 1} onChange={e => changeWave(i, { noiseRange: Number(e.target.value) })}>{[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option value={n} key={n}>{`−${n} / 0 / +${n}`}</option>)}</select></label>
          </div>}
          <div className="kp-wave-timing"><button aria-label={`Wave ${i + 1} timing mode`} onClick={() => changeWave(i, { timing: w.timing === "sync" ? "free" : "sync" })}>{w.timing === "sync" ? "SYNC" : "FREE"}</button>{w.timing === "sync" && <select aria-label={`Wave ${i + 1} division`} value={w.division || "1/4"} onChange={e => changeWave(i, { division: e.target.value as WaveDivision })}>{waveDivisions.map(division => <option key={division}>{division}</option>)}</select>}</div>
          <div className="kp-wavecontrols">{([
            ["rate", "FREQ", .1, 6, .01], ["amp", "AMP", 0, 1, .01], ["speed", "SPEED · Hz", 0, 3, .01], ["direction", "DIR · X/Y", 0, 1, .01], ["phase", "PHASE", 0, 1, .01],
          ] as const).filter(([key]) => !(key === "speed" && w.timing === "sync")).map(([key, label, min, max, step]) => <div className="kp-knob-control" key={key}><ControlCaption label={label} /><Knob name={`Wave ${i + 1} ${key}`} min={min} max={max} step={step} value={w[key]} onChange={next => changeWave(i, { [key]: next })} /></div>)}</div>
        </div></div>)}
        <section className="kp-module kp-feedback-module"><div className="kp-modulehead"><h2>FEEDBACK</h2>{videoPorts("feedback")}<button aria-label="Enable feedback" aria-pressed={modes.feedback} onClick={() => setModes(m => ({ ...m, feedback: !m.feedback }))}>{modes.feedback ? "ON" : "OFF"}</button></div>
          <div className="kp-feedback-output"><span>MOD OUT</span>{outputSocket(3)}</div>
          {patchInput("feedbackTimingMode", "feedbackTimingMode", <button aria-label="Feedback refresh timing mode" onClick={() => setFeedbackTiming(t => t === "free" ? "sync" : "free")}>{feedbackTiming === "sync" ? "SYNC · BPM" : "FREE · ms"}</button>)}
          {feedbackTiming === "sync" && <select aria-label="Feedback refresh division" value={feedbackDivision} onChange={e => setFeedbackDivision(e.target.value as WaveDivision)}>{waveDivisions.map(d => <option key={d} value={d}>{d}</option>)}</select>}
          {patchInput("feedbackBlendMode", "feedbackBlendMode", <select aria-label="Feedback blend mode" value={feedbackBlend} onChange={e => setFeedbackBlend(e.target.value as GlobalCompositeOperation)}>{blendModes.map(mode => <option key={mode} value={mode}>{mode === "source-over" ? "NORMAL" : mode === "lighter" ? "ADD" : mode.toUpperCase()}</option>)}</select>)}
          {specs.filter(spec => spec[5] === "feedback" && !(spec[0] === "feedbackRefresh" && feedbackTiming === "sync")).map(([key, label, min, max, step]) => <div className="kp-control" data-target={key} key={key}><button ref={el => { sockets.current[key] = el; }} data-target={key} className={`kp-socket ${patches.some(p => p.target === key) ? "patched" : ""}`} aria-label={`Patch input feedback ${label}`} onClick={() => { if (selected !== null) connect(selected, key); else setPatches(all => all.filter(p => p.target !== key)); }} /><div className="kp-knob-control"><ControlCaption label={label} /><Knob name={`feedback ${label}`} min={min} max={max} step={step} value={values[key]} onChange={next => setValues(v => ({ ...v, [key]: next }))} /></div></div>)}
        </section>
      </section>
      <section className="kp-modules"><div className="kp-modulegrid">{([["sampling", "vertex"], ["grid"]] as (Exclude<keyof typeof groups, "feedback">)[][]).map(moduleGroups => <section className={moduleGroups.length > 1 ? "kp-combined-module" : "kp-single-module"} key={moduleGroups[0]} aria-label={moduleGroups.length > 1 ? "Sampling and Vertex" : groups[moduleGroups[0]]}>{moduleGroups.map(group => <section className={`kp-module kp-module-${group}`} key={group}><div className="kp-modulehead"><h2>{groups[group]}</h2>{videoPorts(group)}{group !== "typography" && <span className="kp-module-mod-output" data-tooltip={`${groups[group]} modulation output`}>{outputSocket(group === "sampling" ? 4 : group === "grid" ? 5 : 6)}</span>}{group !== "typography" && <button aria-pressed={modes[group]} onClick={() => setModes(m => ({ ...m, [group]: !m[group] }))}>{modes[group] ? "ON" : "OFF"}</button>}</div>
        {group === "grid" && patchInput("motionBlend", "motionBlend", <select className="kp-repeat-select" aria-label="Repeat blend mode" value={repeatBlend} onChange={e => setRepeatBlend(e.target.value as GlobalCompositeOperation)}>{blendModes.map(mode => <option key={mode} value={mode}>{mode === "source-over" ? "NORMAL" : mode === "lighter" ? "ADD" : mode.toUpperCase()}</option>)}</select>)}
        {group === "grid" && patchInput("motionMode", "motionMode", <select className="kp-repeat-select" aria-label="Repeat mode" value={repeatMode} onChange={e => setRepeatMode(e.target.value as RepeatMode)}><option value="single">SINGLE</option><option value="line">LINE</option><option value="grid">GRID</option></select>)}
        {group === "sampling" && patchInput("samplingAxes", "samplingAxes", <select aria-label="Sampling axes" value={samplingMode} onChange={e => { const next = e.target.value as SamplingMode; setSamplingMode(next); if (next === "xy" && samplingThicknessLinked) setSamplingThicknessY(samplingThicknessX); }}><option value="xy">X + Y</option><option value="x">X ONLY</option><option value="y">Y ONLY</option></select>)}
        {group === "sampling" && samplingMode === "xy" && <button className="kp-thickness-link" data-tooltip={samplingThicknessLinked ? "X/Y thickness linked · click to unlink" : "X/Y thickness separate · click to link"} aria-label="Link X and Y sampling thickness" aria-pressed={samplingThicknessLinked} onClick={() => { const next = !samplingThicknessLinked; setSamplingThicknessLinked(next); if (next) setSamplingThicknessY(samplingThicknessX); }}><LinkIcon size={16} strokeWidth={1.5} aria-hidden="true" /><span className="kp-sr-only">{samplingThicknessLinked ? "X/Y LINKED" : "X/Y SEPARATE"}</span></button>}


        {group === "vertex" && patchInput("vertexSource", "vertexSource", <select aria-label="Vertex shape" value={vertex} onChange={e => setVertex(e.target.value)}><option value="line">LINE</option><option value="dot">DOT</option><option value="square">SQUARE</option><option value="glyph">GLYPH</option><option value="custom" disabled={!vertexSVG}>CUSTOM SVG</option></select>)}{group === "typography" && <select aria-label="System font" value={font} onChange={e => setFont(e.target.value)}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option>{customFonts.map(f => <option key={f.id} value={fontFamily(f.id)}>{f.name}</option>)}</select>}
        {group === "typography" && <>{patchInput("textAlignMode", "textAlignMode", <select aria-label="Text alignment" value={textAlign} onChange={e => setTextAlign(e.target.value as typeof textAlign)}><option value="left">ALIGN LEFT</option><option value="center">ALIGN CENTRE</option><option value="right">ALIGN RIGHT</option></select>)}{patchInput("kerningMode", "kerningMode", <select aria-label="Typography kerning" value={kerning} onChange={e => setKerning(e.target.value as typeof kerning)}><option value="none">KERNING OFF</option><option value="normal">KERNING NATIVE</option><option value="optical">KERNING OPTICAL</option></select>)}patchInput("lineHeight", "Typography line spacing", <div className="kp-knob-control"><span className="kp-icon-caption" data-tooltip="Line height · em"><span aria-hidden="true">↕≡</span><span className="kp-sr-only">Line height · em</span></span><Knob name="Typography line spacing" min={.5} max={3} step={.05} value={lineHeight} onChange={setLineHeight} /></div>)</>}
        {group === "vertex" && <div className="kp-asset-tools"><button disabled={assetBusy} onClick={() => svgInput.current?.click()}>{vertexSVG ? "REPLACE SVG" : "IMPORT SVG"}</button>{vertexSVG && <><span title={vertexSVG.name}>{vertexSVG.name}</span><button aria-label="Remove custom SVG" onClick={() => { setVertexSVG(null); if (vertex === "custom") setVertex("dot"); }}>×</button></>}</div>}{group === "vertex" && vertex === "glyph" && <label className="kp-glyph-input">GLYPHS<input aria-label="Vertex glyph characters" value={glyphPattern} maxLength={64} onChange={e => setGlyphPattern(e.target.value)} onBlur={() => { if (!glyphPattern.trim()) setGlyphPattern("*"); }} /></label>}
        {group === "sampling" && <div className="kp-knob-row kp-sampling-row">{group === "sampling" && <div className="kp-thickness">{(["X", "Y"] as const).filter(axis => samplingMode === "xy" || axis.toLowerCase() === samplingMode).map(axis => patchInput(axis === "X" ? "samplingThicknessX" : "samplingThicknessY", `Sampling thickness ${axis}`, <div className="kp-knob-control"><ControlCaption label={`Thickness ${axis} · % em`} /><Knob name={`Sampling thickness ${axis} · % em`} min={0} max={10} step={.01} value={axis === "X" ? samplingThicknessX : samplingThicknessY} onChange={next => { if (samplingMode === "xy" && samplingThicknessLinked) { setSamplingThicknessX(next); setSamplingThicknessY(next); } else if (axis === "X") setSamplingThicknessX(next); else setSamplingThicknessY(next); }} /></div>))}</div>}{specs.filter(c => c[0] === "jitter").map(patchedKnob)}{manualSpecs.filter(c => c[0] === "opacity").map(manualKnob)}</div>}
        {(group === "sampling" && samplingMode !== "xy") && patchInput("stripSpacing", "Extra strip spacing", <div className="kp-knob-control"><span>Extra strip spacing · % em</span><Knob name="Extra strip spacing · % em" min={0} max={10} step={.01} value={stripSpacing} onChange={setStripSpacing} /></div>)}
        {group === "vertex" && <div className="kp-knob-row kp-vertex-row">{group === "vertex" && patchInput("vertexSpacing", "Vertex spacing", <div className="kp-knob-control"><span>Spacing · % em</span><Knob name="Vertex spacing · % em" min={0} max={10} step={.01} value={vertexSpacing} onChange={setVertexSpacing} /></div>)}{specs.filter(c => c[5] === "vertex").map(patchedKnob)}</div>}
        {group === "grid" && <div className="kp-knob-row kp-position-row">{specs.filter(c => c[5] === "grid" && ["positionX", "positionY", "repeatScale"].includes(c[0])).map(patchedKnob)}</div>}
        {group === "grid" && <div className="kp-knob-row kp-repeat-row">{manualSpecs.filter(c => c[5] === "grid" && (repeatMode === "line" ? c[0] === "repeatCount" : repeatMode === "grid" ? c[0] !== "repeatCount" : false)).map(manualKnob)}{specs.filter(c => c[5] === "grid" && !["positionX", "positionY", "repeatScale"].includes(c[0]) && (repeatMode !== "single" || !["repeatSpacingX", "repeatSpacingY"].includes(c[0])) && (repeatMode !== "line" || c[0] !== "repeatSpacingY")).map(patchedKnob)}</div>}
        {group === "vertex" && (vertex === "glyph" || vertex === "custom") && patchInput("vertexScatter", "Vertex orientation scatter", <div className="kp-knob-control kp-vertex-extra"><span>Orientation scatter · ±°</span><Knob name="Orientation scatter · degrees" min={0} max={180} step={1} value={vertexScatter} onChange={setVertexScatter} /></div>)}
        {group === "vertex" && vertex === "line" && <div className="kp-knob-row">{manualSpecs.filter(c => c[0] === "lineLength").map(manualKnob)}</div>}
      </section>)}</section>)}<section className="kp-type-tabs"><div className="kp-type-tablist" role="tablist" aria-label="Typography">{(["typography", "typography2"] as const).map((source, index) => <div className="kp-type-tab" key={source}>{videoPorts(source)}<button id={`kp-type-tab-${index + 1}`} role="tab" aria-selected={typeTab === source} aria-controls={`kp-type-${index + 1}`} tabIndex={typeTab === source ? 0 : -1} onClick={() => setTypeTab(source)} onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); const next = e.key === "Home" ? "typography" : e.key === "End" ? "typography2" : source === "typography" ? "typography2" : "typography"; setTypeTab(next); document.getElementById(`kp-type-tab-${next === "typography" ? 1 : 2}`)?.focus(); } }}>TYPE {index + 1}</button><button aria-label={`Enable typography ${index + 1}`} aria-pressed={source === "typography" ? type1On : secondType.on} onClick={() => source === "typography" ? setType1On(on => !on) : setSecondType(t => ({ ...t, on: !t.on }))}>{(source === "typography" ? type1On : secondType.on) ? "ON" : "OFF"}</button></div>)}</div>{fontManager}<section className="kp-module kp-type-panel" id="kp-type-1" role="tabpanel" aria-labelledby="kp-type-tab-1" hidden={typeTab !== "typography"}>{type1On && <><textarea aria-label="Text" placeholder="Type here · Enter for a new line" value={text} onChange={e => setText(e.target.value)} rows={2} /><select aria-label="System font" value={font} onChange={e => setFont(e.target.value)}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option>{customFonts.map(f => <option key={f.id} value={fontFamily(f.id)}>{f.name}</option>)}</select><><select aria-label="Text alignment" value={textAlign} onChange={e => setTextAlign(e.target.value as typeof textAlign)}><option value="left">ALIGN LEFT</option><option value="center">ALIGN CENTRE</option><option value="right">ALIGN RIGHT</option></select><select aria-label="Typography kerning" value={kerning} onChange={e => setKerning(e.target.value as typeof kerning)}><option value="none">KERNING OFF</option><option value="normal">KERNING NATIVE</option><option value="optical">KERNING OPTICAL</option></select></><div className="kp-knob-row kp-font-row">{(["x","y","rotation"] as const).map(key=>{const spec=key==="rotation"?["Rotation · °",-180,180,1] as const:key==="x"?["Position X · %",-100,100,.1] as const:["Position Y · %",-100,100,.1] as const;return <div className="kp-knob-control" key={key}><ControlCaption label={spec[0]}/><Knob name={`Typography 1 ${spec[0]}`} min={spec[1]} max={spec[2]} step={spec[3]} value={type1Transform[key]} onChange={v=>setType1Transform(t=>({...t,[key]:v}))}/></div>})}{specs.filter(c => c[5] === "typography").map(patchedKnob)}{manualSpecs.filter(c => c[5] === "typography").map(manualKnob)}<div className="kp-knob-control"><span className="kp-icon-caption" data-tooltip="Line height · em"><span aria-hidden="true">↕≡</span><span className="kp-sr-only">Line height · em</span></span><Knob name="Typography line spacing" min={.5} max={3} step={.05} value={lineHeight} onChange={setLineHeight} /></div></div></>}</section><section className="kp-module kp-type-panel" id="kp-type-2" role="tabpanel" aria-labelledby="kp-type-tab-2" hidden={typeTab !== "typography2"}>{secondType.on && <><textarea aria-label="Second text" rows={2} value={secondType.text} onChange={e => setSecondType(t => ({ ...t, text: e.target.value }))} /><select aria-label="Second typography font" value={secondType.font} onChange={e => setSecondType(t => ({ ...t, font: e.target.value }))}><option value="system-ui, sans-serif">SYSTEM SANS</option><option value="ui-serif, Georgia, serif">SYSTEM SERIF</option><option value="ui-monospace, monospace">SYSTEM MONO</option>{customFonts.map(f => <option key={f.id} value={fontFamily(f.id)}>{f.name}</option>)}</select><select aria-label="Second text alignment" value={secondType.align} onChange={e => setSecondType(t => ({ ...t, align: e.target.value as SecondType["align"] }))}><option value="left">ALIGN LEFT</option><option value="center">ALIGN CENTRE</option><option value="right">ALIGN RIGHT</option></select><select aria-label="Second typography kerning" value={secondType.kerning} onChange={e => setSecondType(t => ({ ...t, kerning: e.target.value as SecondType["kerning"] }))}><option value="none">KERNING OFF</option><option value="normal">KERNING NATIVE</option><option value="optical">KERNING OPTICAL</option></select><input type="color" aria-label="Second text ink" value={secondType.ink} onChange={e => setSecondType(t => ({ ...t, ink: e.target.value }))} /><div className="kp-knob-row kp-font-row">{([["size", "Size · % canvas", 5, 75, .5], ["weight", "Weight", 100, 900, 10], ["tracking", "Tracking · % em", -10, 30, .1], ["lineHeight", "Line spacing · em", .5, 3, .05], ["x", "Position X · %", -100, 100, .1], ["y", "Position Y · %", -100, 100, .1]] as const).map(([key, label, min, max, step]) => patchInput(({ size: "secondSize", weight: "secondWeight", tracking: "secondTracking", lineHeight: "secondLineHeight", x: "secondX", y: "secondY" } as const)[key], `Typography 2 ${label}`, <div className="kp-knob-control"><ControlCaption label={label} /><Knob name={`Typography 2 ${label}`} min={min} max={max} step={step} value={secondType[key]} onChange={value => setSecondType(t => ({ ...t, [key]: value }))} /></div>))}</div></>}</section></section><section className="kp-module"><div className="kp-modulehead"><h2>CANVAS</h2>{videoPorts("canvas")}</div><button onClick={() => setVideoPatches(videoDefaults)}>DEFAULT ROUTE</button>{imageLayerPanel}</section></div></section>

    </div></div>
      <section ref={bay} className={`kp-patches kp-floating ${bayCollapsed ? "is-collapsed" : ""}`} aria-label="Patch bay" style={bayPosition ? { left: bayPosition.x, top: bayPosition.y, bottom: "auto" } : undefined}><div className="kp-title kp-bay-handle" onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; const r = bay.current!.getBoundingClientRect(); bayDrag.current = { x: e.clientX - r.left, y: e.clientY - r.top }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!bayDrag.current || !bay.current) return; const r = bay.current.getBoundingClientRect(); setBayPosition({ x: clamp(e.clientX - bayDrag.current.x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(e.clientY - bayDrag.current.y, 8, Math.max(8, window.innerHeight - r.height - 8)) }); }} onPointerUp={() => { bayDrag.current = null; }} onPointerCancel={() => { bayDrag.current = null; }}>03 / PATCH BAY <span><button aria-label={bayCollapsed ? "Expand patch bay" : "Collapse patch bay"} aria-expanded={!bayCollapsed} onClick={() => setBayCollapsed(v => !v)}>{bayCollapsed ? "+" : "−"}</button> <button aria-label="Clear all video connections" title="Disconnect all video cables" disabled={videoPatches.length === 0} onClick={() => { setVideoPatches([]); setSelectedVideo(null); setVideoDrag(null); videoDragRef.current = null; }}>ZERO VIDEO</button> <button aria-label="Zero all modulation connection amounts" title="Set modulation amounts to 0% while keeping cables connected" disabled={!patches.some(p => p.amount !== 0)} onClick={() => setPatches(all => all.map(p => ({ ...p, amount: 0 })))}>ZERO AMOUNTS</button> <button onClick={() => { setPatches([]); setVideoPatches([]); setSelectedVideo(null); setSelected(null); }}>CLEAR</button></span></div><div className="kp-bay-content" hidden={bayCollapsed}>{chainEditor}{(selectedVideo || selected !== null) && <p>{selectedVideo ? `VIDEO ${selectedVideo.toUpperCase()} · choose a video input` : selected === null ? "" : `${sourceNames[selected]} selected · choose an input`}</p>}{videoChain === null && videoPatches.map(p => <div className="kp-video-patch" key={`video-${p.source}-${p.target}`}><b>VIDEO · {p.source.toUpperCase()} → {p.target.toUpperCase()}</b><button aria-label={`Remove video ${p.source} to ${p.target}`} onClick={() => setVideoPatches(all => all.filter(item => item.target !== p.target || item.source !== p.source))}>×</button></div>)}{patches.length === 0 && videoPatches.length === 0 && <p>No cables connected.</p>}{patches.map(p => { const c = specs.find(c => c[0] === p.target); const targetLabel = c ? `${c[5]} / ${c[1]}` : p.target.replace(/([A-Z])/g, " $1").trim().toUpperCase(); return <div className="kp-patch" key={p.id} style={{ "--wave": colors[p.wave] } as CSSProperties}><b>{sourceNames[p.wave]} → {targetLabel}</b><button aria-label={`Remove ${sourceNames[p.wave]} to ${targetLabel}`} onClick={() => setPatches(all => all.filter(item => item.id !== p.id))}>×</button><div className="kp-knob-control kp-amount"><span>AMOUNT · %</span><Knob name={`Amount ${sourceNames[p.wave]} to ${targetLabel}`} min={-100} max={100} step={1} value={p.amount} onChange={next => setPatches(all => all.map(item => item.id === p.id ? { ...item, amount: next } : item))} /></div></div>; })}</div></section>
    {outputOpen && <section id="kp-output-window" ref={outputWindow} role="dialog" aria-label="Output settings" tabIndex={-1} className="kp-output-window" style={outputPosition ? { left: outputPosition.x, top: outputPosition.y, right: "auto", bottom: "auto" } : undefined} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); closeOutput(); } }}>
      <div className="kp-output-handle" onPointerDown={e => { if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return; e.preventDefault(); const r = outputWindow.current!.getBoundingClientRect(); outputDrag.current = { x: e.clientX - r.left, y: e.clientY - r.top }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!outputDrag.current || !outputWindow.current) return; const r = outputWindow.current.getBoundingClientRect(); setOutputPosition({ x: clamp(e.clientX - outputDrag.current.x, 8, Math.max(8, window.innerWidth - r.width - 8)), y: clamp(e.clientY - outputDrag.current.y, 8, Math.max(8, window.innerHeight - r.height - 8)) }); }} onPointerUp={() => { outputDrag.current = null; }} onPointerCancel={() => { outputDrag.current = null; }}>OUTPUT <button aria-label="Close output settings" onClick={closeOutput}>×</button></div>
      <div className="kp-output-tools"><select disabled={recording || rendering} aria-label="Canvas format" value={canvasFormat} onChange={e => setCanvasFormat(e.target.value as CanvasFormat)}><option value="screen">SCREEN</option><option value="square">SQUARE · 1:1</option><option value="landscape">LANDSCAPE · 16:9</option><option value="portrait">PORTRAIT · 9:16</option><option value="custom">CUSTOM</option></select>{canvasFormat === "custom" ? <><input disabled={recording || rendering} aria-label="Custom canvas width" type="number" min={64} max={4096} defaultValue={customWidth} onBlur={e => { const n = Math.round(Number(e.target.value)); if (n >= 64 && n <= 4096) setCustomWidth(n); else e.target.value = String(customWidth); }} /><span>×</span><input disabled={recording || rendering} aria-label="Custom canvas height" type="number" min={64} max={4096} defaultValue={customHeight} onBlur={e => { const n = Math.round(Number(e.target.value)); if (n >= 64 && n <= 4096) setCustomHeight(n); else e.target.value = String(customHeight); }} /></> : <select disabled={recording || rendering} aria-label="Output resolution" value={outputResolution} onChange={e => setOutputResolution(Number(e.target.value))}><option value={0}>SCREEN SIZE</option><option value={1024}>1K · 1024</option><option value={1920}>HD · 1920</option><option value={2048}>2K · 2048</option><option value={4096}>4K · 4096</option></select>}<button aria-label="Inspect native pixels" aria-pressed={nativeView} onClick={() => { setNativeView(v => !v); stage.current?.scrollTo(0, 0); }}>{nativeView ? "FIT" : "100%"}</button><span className="kp-output-dimensions">{nativeSize.width} × {nativeSize.height}</span><button onClick={exportPNG} disabled={pngBusy || rendering}>{pngBusy ? "SAVING…" : "PNG ↓"}</button></div>
      <div className="kp-video-tools"><b>VIDEO</b><select aria-label="Recording duration" disabled={recording || rendering} value={recordSeconds} onChange={e => setRecordSeconds(Number(e.target.value))}><option value={5}>5 SECONDS</option><option value={10}>10 SECONDS</option><option value={20}>20 SECONDS</option></select><button disabled={rendering} className={recording ? "is-recording" : ""} onClick={() => recording ? recordingSession.current?.stop() : startRecording()}>{recording ? "STOP & SAVE" : "● RECORD"}</button><select aria-label="Render frame rate" disabled={recording || rendering} value={renderFps} onChange={e => setRenderFps(Number(e.target.value) as 30 | 60)}><option value={30}>RENDER · 30 FPS</option><option value={60}>RENDER · 60 FPS</option></select><button disabled={recording} onClick={() => rendering ? renderAbort.current?.abort() : void startVideoRender()}>{rendering ? "CANCEL RENDER" : "RENDER VIDEO"}</button><span role="status">{rendering ? `RENDERING · ${renderProgress.done} / ${renderProgress.total} frames` : recording ? `${recordElapsed.toFixed(1)} / ${recordSeconds}s` : "Current output size · MP4 / WebM"}</span>{rendering && <progress aria-label="Video render progress" value={renderProgress.done} max={renderProgress.total} />}<p>Record: live capture, 30 fps target. Render: every frame at selected FPS.</p></div>
    </section>}
    {originEditorOpen && <GlyphOriginEditor origins={glyphOrigins} onChange={setGlyphOrigins} sources={[{ name: "TYPE 1", font, weight: values.weight, text }, { name: "TYPE 2", font: secondType.font, weight: secondType.weight, text: secondType.text }]} step={values.step} mode={samplingMode} onClose={() => setOriginEditorOpen(false)} />}
    <footer className="kp-footer"><div className="kp-preset-tools"><select aria-label="Load built-in preset" defaultValue="" onChange={e => { const presets = [{id:"playground-v3",name:"Playground v3",preset:defaultKineticPreset},...kineticPresets,...userKineticPresets]; const preset = presets.find(p => p.id === e.target.value); if (preset) { const state=parsePreset(preset.preset); void ensureAssets(state.customFonts,state.vertexSVG).then(()=>{applyPreset(state);restorePresetTimeline(parseTimeline((preset.preset as { timeline?: unknown }).timeline));setPresetMessage(`${preset.name} loaded. Undo restores your previous settings.`);}).catch(err=>setPresetMessage(err instanceof Error?err.message:"Could not load preset.")); } e.target.value = ""; }}><option value="" disabled>PRESETS</option><option value="playground-v3">Playground v3 · DEFAULT</option>{[...kineticPresets, ...userKineticPresets].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={() => presetInput.current?.click()}>IMPORT</button><button onClick={exportPreset}>EXPORT</button><button ref={outputButton} className="kp-output-trigger" aria-expanded={outputOpen} aria-controls="kp-output-window" onClick={() => outputOpen ? closeOutput() : setOutputOpen(true)}>{rendering ? "RENDER · OUTPUT" : recording ? "● REC · OUTPUT" : "OUTPUT"}</button><input ref={presetInput} type="file" accept=".json,application/json" aria-label="Import preset file" hidden onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (file) void importPreset(file); }} /><span role="status">{presetMessage}</span></div><label>BACKGROUND <input aria-label="Background color" type="color" value={bg} onChange={e => setBg(e.target.value)} /></label><button className="kp-bicolour" aria-pressed={bicolour} onClick={() => setBicolour(v => !v)}>BI-COLOUR</button>{bicolour && <label>INK 2 <input aria-label="Second ink color" type="color" value={ink2} onChange={e => setInk2(e.target.value)} /></label>}<label>INK <input aria-label="Ink color" type="color" value={ink} onChange={e => setInk(e.target.value)} /></label></footer>
  </main>;
}

