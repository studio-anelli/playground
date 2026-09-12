"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * GP888 — Retro 8‑Bit Drum Machine (single source of truth)
 *
 * This revision hard-resets the file to a known-good build:
 * - Exactly ONE TempoScreen, positioned to the RIGHT of STOP
 * - Fixed per-track LED pulse
 * - Start button soft blink while playing
 * - No duplicate BPM widgets anywhere else
 * - Desaturated primary palette + double strokes retained
 */

// -----------------------
// Constants & Utilities
// -----------------------

const TRACKS = [
  { id: "kick", name: "Kick" },
  { id: "snare", name: "Snare" },
  { id: "hihat", name: "Hi-Hat" },
  { id: "ohat", name: "Open Hat" },
  { id: "rim", name: "Rim" },
  { id: "ride", name: "Ride" },
  { id: "midtom", name: "Mid Tom" },
  { id: "clap", name: "Clap" },
] as const;

type TrackId = (typeof TRACKS)[number]["id"];

// Desaturated primary-ish palette (no pure green)
const TRACK_COLORS: Record<TrackId, string> = {
  kick: "#d66",       // red
  snare: "#6aa0ff",   // blue
  hihat: "#e5c15f",   // yellow
  ohat: "#ead27a",    // lighter yellow
  rim: "#d48ae0",     // magenta
  ride: "#7bc4d3",    // cyan
  midtom: "#9aa0ff",  // indigo/blue
  clap: "#e3a47a",    // orange
};

const defaultSteps = (n: number) => Array.from({ length: n }, () => false);

// -----------------------
// Audio Engine with per-track crushers
// -----------------------

function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const trackGainsRef = useRef<Record<string, GainNode>>({});
  const trackCrusherParamsRef = useRef<Record<string, { bits: number; downsample: number }>>({});

  const ensureCtx = () => {
    if (!audioCtxRef.current) {
      const Ctor: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctor();
      audioCtxRef.current = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      TRACKS.forEach((t) => {
        createTrackChain(t.id);
        trackCrusherParamsRef.current[t.id] = { bits: 8, downsample: 2 };
      });
    }
    return audioCtxRef.current!;
  };

  const createTrackChain = (id: string) => {
    const ctx = ensureCtx();
    if (trackGainsRef.current[id]) return;

    const input = ctx.createGain();
    input.gain.value = 1.0;

    const proc = ctx.createScriptProcessor(4096, 1, 1);
    let holdCount = 0;
    let held = 0;
    proc.onaudioprocess = (e: AudioProcessingEvent) => {
      const inputBuf = e.inputBuffer.getChannelData(0);
      const outputBuf = e.outputBuffer.getChannelData(0);
      const params = trackCrusherParamsRef.current[id] || { bits: 16, downsample: 1 };
      const bits = Math.max(2, Math.min(16, params.bits | 0));
      const down = Math.max(1, Math.min(64, params.downsample | 0));
      const step = Math.pow(0.5, bits - 1);
      for (let i = 0; i < inputBuf.length; i++) {
        if (holdCount === 0) {
          const quantized = step * Math.floor(inputBuf[i] / step + 0.5);
          held = quantized;
          holdCount = down - 1;
        } else {
          holdCount--;
        }
        outputBuf[i] = held;
      }
    };

    input.connect(proc);
    proc.connect(masterGainRef.current!);

    trackGainsRef.current[id] = input;
  };

  const routeGain = (id: TrackId) => {
    createTrackChain(id);
    return trackGainsRef.current[id];
  };

  const setMasterVolume = (v: number) => {
    ensureCtx();
    if (masterGainRef.current) masterGainRef.current.gain.value = v;
  };

  const setTrackCrusher = (id: TrackId, bits: number, downsample: number) => {
    ensureCtx();
    trackCrusherParamsRef.current[id] = { bits, downsample };
  };

  // --- Simple Synth Voices ---
  const triggerKick = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.9 * vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    o.connect(g);
    g.connect(routeGain(id));
    o.start(time);
    o.stop(time + 0.26);
  };

  const triggerSnare = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator();
    const g1 = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(180, time);
    g1.gain.setValueAtTime(0.4 * vol, time);
    g1.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    o.connect(g1);
    g1.connect(routeGain(id));
    o.start(time);
    o.stop(time + 0.15);

    const bufferSize = 0.2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.6 * vol, time);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    noise.connect(g2);
    g2.connect(routeGain(id));
    noise.start(time);
    noise.stop(time + 0.21);
  };

  const triggerHiHat = (time: number, vol = 1, id: TrackId, open = false) => {
    const ctx = ensureCtx();
    const bufferSize = (open ? 0.6 : 0.05) * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 10000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + (open ? 0.5 : 0.05));
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(routeGain(id));
    noise.start(time); noise.stop(time + (open ? 0.6 : 0.06));
  };

  const triggerRim = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(1200, time);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.4 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    o.connect(g); g.connect(routeGain(id)); o.start(time); o.stop(time + 0.04);
  };

  const triggerRide = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const bufferSize = 0.8 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 5000;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 8000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.45 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(routeGain(id));
    noise.start(time); noise.stop(time + 0.8);
  };

  const triggerTom = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(220, time); o.frequency.exponentialRampToValueAtTime(140, time + 0.18);
    g.gain.setValueAtTime(0.7 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    o.connect(g); g.connect(routeGain(id)); o.start(time); o.stop(time + 0.26);
  };

  const triggerClap = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const bursts = [0, 0.012, 0.025, 0.045];
    bursts.forEach((offset) => {
      const t = time + offset;
      const bufferSize = 0.08 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.7 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      noise.connect(g); g.connect(routeGain(id));
      noise.start(t); noise.stop(t + 0.14);
    });
  };

  const api = {
    ensureCtx,
    setMasterVolume,
    setTrackCrusher,
    trigger(which: TrackId, time: number, vol = 1) {
      if (which === "kick") return triggerKick(time, vol, "kick");
      if (which === "snare") return triggerSnare(time, vol, "snare");
      if (which === "hihat") return triggerHiHat(time, vol, "hihat", false);
      if (which === "ohat") return triggerHiHat(time, vol, "ohat", true);
      if (which === "rim") return triggerRim(time, vol, "rim");
      if (which === "ride") return triggerRide(time, vol, "ride");
      if (which === "midtom") return triggerTom(time, vol, "midtom");
      if (which === "clap") return triggerClap(time, vol, "clap");
    },
    get currentTime() { return audioCtxRef.current ? audioCtxRef.current.currentTime : 0; },
  } as const;

  return api;
}

// -----------------------
// Scheduler (phase-preserving tempo changes)
// -----------------------

function Scheduler({
  isPlaying,
  bpm,
  swing,
  steps,
  pattern,
  trackLevels,
  onStep,
  engine,
}: {
  isPlaying: boolean;
  bpm: number;
  swing: number;
  steps: number;
  pattern: Record<string, boolean[]>;
  trackLevels: Record<string, number>;
  onStep: (ix: number) => void;
  engine: ReturnType<typeof useAudioEngine>;
}) {
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const notesInQueue = useRef<{ step: number; time: number }[]>([]);

  const lookahead = 0.025;
  const scheduleAheadTime = 0.1;
  const bpmRef = useRef(bpm);
  const swingRef = useRef(swing);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);

  useEffect(() => {
    if (!isPlaying) return;
    const ctx = engine.ensureCtx();
    if (nextNoteTimeRef.current === 0) nextNoteTimeRef.current = ctx.currentTime + 0.05;

    const timer = setInterval(() => {
      const now = ctx.currentTime;
      const secondsPerBeat = 60 / Math.max(40, Math.min(240, bpmRef.current));
      const stepDur = secondsPerBeat / 4;

      while (nextNoteTimeRef.current < now + scheduleAheadTime) {
        const step = currentStepRef.current % steps;
        const swingOffset = step % 2 === 1 ? swingRef.current * (stepDur / 3) : 0;
        const playTime = nextNoteTimeRef.current + swingOffset;

        TRACKS.forEach((tr) => {
          const on = pattern[tr.id][step];
          if (on) engine.trigger(tr.id, playTime, trackLevels[tr.id]);
        });

        notesInQueue.current.push({ step, time: playTime });
        nextNoteTimeRef.current += stepDur;
        currentStepRef.current = (currentStepRef.current + 1) % steps;
      }
    }, lookahead * 1000);

    return () => {
      clearInterval(timer);
      onStep(-1);
      notesInQueue.current = [];
    };
  }, [isPlaying, steps, pattern, trackLevels, engine, onStep]);

  useEffect(() => {
    if (!isPlaying) return;
    const raf = () => {
      const ctxT = (engine as any).currentTime as number;
      while (notesInQueue.current.length && notesInQueue.current[0].time < ctxT) {
        const n = notesInQueue.current.shift()!;
        onStep(n.step);
      }
      requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [isPlaying, onStep, engine]);

  return null;
}

// -----------------------
// Tempo Screen (acid‑green old‑school)
// -----------------------

function TempoScreen({ bpm, step, isPlaying }: { bpm: number; step: number; isPlaying: boolean }) {
  const quarterPulse = step >= 0 && step % 4 === 0 && isPlaying;
  return (
    <div className="flex items-center gap-4 p-3 rounded-sm min-w-[220px] bg-[#00ff66] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">
      <div className={`w-3 h-3 rounded-full ${quarterPulse ? 'bg-black shadow-[0_0_10px_2px_rgba(0,0,0,0.6)]' : 'bg-[#1a1a1a] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#111]'}`} />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] text-black/70 tracking-widest font-mono">BPM</span>
        <span className="text-3xl tracking-[0.1em] text-black font-mono">{bpm}</span>
      </div>
    </div>
  );
}

// -----------------------
// Main Component (UI + Engine)
// -----------------------

export default function GP888DrumMachine() {
  const [steps, setSteps] = useState(16);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [master, setMaster] = useState(0.8);

  // Start button pulse state (blink while playing)
  const [startPulse, setStartPulse] = useState(false);
  useEffect(() => {
    let id: number | undefined;
    if (isPlaying) id = window.setInterval(() => setStartPulse((p) => !p), 280);
    return () => { if (id) clearInterval(id); setStartPulse(false); };
  }, [isPlaying]);

  // Per-track levels
  const [trackLevels, setTrackLevels] = useState<Record<TrackId, number>>({
    kick: 1, snare: 1, hihat: 0.8, ohat: 0.8, rim: 0.7, ride: 0.7, midtom: 0.9, clap: 0.9,
  });
  const [mutes, setMutes] = useState<Record<TrackId, boolean>>({
    kick: false, snare: false, hihat: false, ohat: false, rim: false, ride: false, midtom: false, clap: false,
  });
  const [solo, setSolo] = useState<TrackId | null>(null);

  // Per-track crusher params
  const [trackFX, setTrackFX] = useState<Record<TrackId, { bits: number; down: number }>>({
    kick: { bits: 8, down: 2 },
    snare: { bits: 8, down: 2 },
    hihat: { bits: 8, down: 2 },
    ohat: { bits: 8, down: 2 },
    rim: { bits: 8, down: 2 },
    ride: { bits: 8, down: 2 },
    midtom: { bits: 8, down: 2 },
    clap: { bits: 8, down: 2 },
  });

  // Patterns per track
  const makePattern = (n: number) => TRACKS.reduce((acc, t) => ({ ...acc, [t.id]: defaultSteps(n) }), {} as Record<TrackId, boolean[]>);
  const [pattern, setPattern] = useState<Record<TrackId, boolean[]>>(makePattern(16));

  const engine = useAudioEngine();

  // Master volume
  useEffect(() => engine.setMasterVolume(master), [engine, master]);

  // Apply per-track FX
  useEffect(() => {
    TRACKS.forEach((t) => {
      const fx = trackFX[t.id];
      engine.setTrackCrusher(t.id, fx.bits, fx.down);
    });
  }, [engine, trackFX]);

  // Resize patterns
  useEffect(() => {
    setPattern((p) => {
      const out: Record<TrackId, boolean[]> = {} as any;
      TRACKS.forEach((t) => {
        const row = p[t.id] || [];
        out[t.id] = Array.from({ length: steps }, (_, i) => row[i] || false);
      });
      return out;
    });
  }, [steps]);

  // Effective levels with mute/solo
  const effLevels = useMemo(() => {
    const anySolo = solo !== null;
    const map: Record<TrackId, number> = {} as any;
    TRACKS.forEach((t) => {
      const base = trackLevels[t.id];
      const muted = mutes[t.id];
      const inSolo = !anySolo || solo === t.id;
      map[t.id] = muted || !inSolo ? 0 : base;
    });
    return map;
  }, [trackLevels, mutes, solo]);

  // LED blink map per track (short pulse per hit)
  const [blink, setBlink] = useState<Record<TrackId, boolean>>({
    kick: false, snare: false, hihat: false, ohat: false, rim: false, ride: false, midtom: false, clap: false,
  });
  useEffect(() => {
    if (!isPlaying || activeStep < 0) return;
    const next: Record<TrackId, boolean> = {} as any;
    TRACKS.forEach((t) => { next[t.id] = !!pattern[t.id][activeStep]; });
    setBlink(next);
    const to = window.setTimeout(() => {
      setBlink((b) => {
        const off: Record<TrackId, boolean> = {} as any;
        TRACKS.forEach((t) => { off[t.id] = false; });
        return off;
      });
    }, 130);
    return () => clearTimeout(to);
  }, [activeStep, isPlaying, pattern]);

  // Keyboard toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setIsPlaying((s) => !s); engine.ensureCtx().resume(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine]);

  const toggleStep = (track: TrackId, idx: number) => {
    setPattern((p) => ({ ...p, [track]: p[track].map((v, i) => (i === idx ? !v : v)) }));
  };

  const clearAll = () => setPattern(makePattern(steps));

  const randomize = () => {
    const density: Record<TrackId, number> = {
      kick: 0.35, snare: 0.25, hihat: 0.5, ohat: 0.2, rim: 0.15, ride: 0.15, midtom: 0.18, clap: 0.12,
    } as any;
    setPattern(() => {
      const out: Record<TrackId, boolean[]> = {} as any;
      TRACKS.forEach((t) => {
        out[t.id] = Array.from({ length: steps }, () => Math.random() < (density[t.id] || 0.2));
      });
      out.kick[0] = true; out.snare[4] = true; out.snare[12 % steps] = true;
      return out;
    });
  };

  const save = () => {
    const data = { steps, bpm, swing, master, trackLevels, mutes, solo, pattern, trackFX };
    localStorage.setItem("gp888_v1", JSON.stringify(data));
  };

  const load = () => {
    const raw = localStorage.getItem("gp888_v1");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setSteps(d.steps || 16);
      setBpm(d.bpm || 120);
      setSwing(d.swing || 0);
      setMaster(d.master ?? 0.8);
      setTrackLevels(d.trackLevels || trackLevels);
      setMutes(d.mutes || mutes);
      setSolo(d.solo || null);
      setPattern(d.pattern || pattern);
      setTrackFX(d.trackFX || trackFX);
    } catch {}
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start bg-[#111] text-[#f5f5f5] font-mono overflow-y-auto">
      {/* Header: stripes + right-aligned logo */}
      <div className="w-full flex flex-col items-end border-b border-[#333] relative">
        <div className="w-full h-2 bg-[#ff0022]" />
        <div className="w-full h-2 bg-[#0055ff]" />
        <div className="absolute right-8 top-3 select-none"><h1 className="text-4xl tracking-[0.2em] font-bold text-[#f5f5f5]">GP888</h1></div>
      </div>

      {/* Frame */}
      <div className="w-full max-w-[1600px] mt-10 px-8 pb-16">
        <div className="rounded-2xl bg-[#1a1a1a] p-6 shadow-[0_0_0_1px_#ffffff,0_0_0_2px_#000000,0_0_20px_rgba(0,0,0,0.6)]">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2 tracking-widest text-[#ccc]">GP888 8-Bit Drum Machine</h2>
              <p className="text-sm text-[#999] max-w-xl">AI rebuilt in 8 bits, from the future that never was, now with per-channel crushing and swing.</p>
            </div>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              {/* START small round, pulses while playing */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setIsPlaying(true); engine.ensureCtx().resume(); }}
                  aria-label="Start"
                  className={`w-6 h-6 rounded-full border transition ${isPlaying ? (startPulse ? 'bg-[#f0f0f0] border-[#bdbdbd] shadow-[0_0_12px_3px_rgba(255,255,255,0.85)]' : 'bg-[#e5e5e5] border-[#bdbdbd] shadow-[0_0_8px_2px_rgba(255,255,255,0.55)]') : 'bg-[#ccc] border-[#999] hover:bg-[#ddd]'}`}
                />
                <span className="text-sm text-[#ccc]">START</span>
              </div>
              {/* STOP small round with red LED glow when stopped */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(false)}
                  aria-label="Stop"
                  className={`w-6 h-6 rounded-full border transition ${!isPlaying ? 'bg-[#ff0022] border-[#cc001b] shadow-[0_0_12px_2px_rgba(255,0,34,0.6)]' : 'bg-[#ff0022] border-[#cc001b] hover:shadow-[0_0_8px_1px_rgba(255,0,34,0.35)]'}`}
                />
                <span className="text-sm text-[#ccc]">STOP</span>
              </div>
              {/* Tempo Screen — ONLY INSTANCE */}
              <TempoScreen bpm={bpm} step={activeStep} isPlaying={isPlaying} />
            </div>
          </div>

          {/* Sequencer header (bar markers) */}
          <div className="grid grid-cols-17 gap-[2px] mt-4 border-t border-b border-[#333] py-4">
            <div className="text-xs text-[#888] px-2">TRACK</div>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={`text-center text-[10px] ${i % 4 === 0 ? 'text-[#ff0022]' : 'text-[#666]'}`}>{i + 1}</div>
            ))}

            {/* Sequencer grid */}
            {TRACKS.map((t) => (
              <React.Fragment key={t.id}>
                <div className="text-xs text-[#aaa] px-2 py-1 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${blink[t.id] ? 'bg-[#fff] shadow-[0_0_8px_2px_rgba(255,255,255,0.7)]' : 'bg-[#111] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]'}`} />
                  <span>{t.name}</span>
                </div>
                {Array.from({ length: steps }).map((_, i) => (
                  <div key={i} className={`p-1 text-center ${i % 4 === 0 ? 'bg-[#222]' : ''}`}>
                    <button
                      onClick={() => toggleStep(t.id as TrackId, i)}
                      className={`w-6 h-6 rounded-sm border ${pattern[t.id]?.[i] ? 'border-transparent' : 'border-[#333] bg-[#191919]'} ${i === activeStep ? 'outline outline-2 outline-[#fff]' : ''}`}
                      style={pattern[t.id]?.[i] ? { backgroundColor: TRACK_COLORS[t.id], opacity: 0.9, boxShadow: 'inset 0 0 0 1px #000, 0 0 0 1px #fff' } : { boxShadow: 'inset 0 0 0 1px #000, 0 0 0 1px #fff' }}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs text-[#999]">
            <div className="rounded-xl p-4 bg-[#151515] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">
              <h3 className="font-semibold mb-3 text-[#ddd]">Transport</h3>
              <div className="flex items-center gap-4">
                <label className="text-sm">Tempo</label>
                <input type="range" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number((e.target as HTMLInputElement).value))} className="w-44 accent-[#0055ff]" />
                <span className="tabular-nums w-12 text-right">{bpm}</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <label className="text-sm">Swing</label>
                <input type="range" min={0} max={100} value={Math.round(swing * 100)} onChange={(e) => setSwing(Number((e.target as HTMLInputElement).value) / 100)} className="w-44 accent-[#ff0022]" />
                <span className="tabular-nums w-12 text-right">{Math.round(swing * 100)}%</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <label className="text-sm">Steps</label>
                <select value={steps} onChange={(e) => setSteps(parseInt((e.target as HTMLSelectElement).value))} className="bg-[#101010] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff] rounded px-2 py-1">
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                </select>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <label className="text-sm">Master</label>
                <input type="range" min={0} max={100} value={Math.round(master * 100)} onChange={(e) => setMaster(Number((e.target as HTMLInputElement).value) / 100)} className="w-44" />
                <span className="tabular-nums w-12 text-right">{Math.round(master * 100)}</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <button onClick={randomize} className="px-3 py-2 rounded-md bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">Randomize</button>
                <button onClick={clearAll} className="px-3 py-2 rounded-md bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">Clear</button>
                <button onClick={save} className="px-3 py-2 rounded-md bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">Save</button>
                <button onClick={load} className="px-3 py-2 rounded-md bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff]">Load</button>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-[#151515] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff] lg:col-span-2">
              <h3 className="font-semibold mb-3 text-[#ddd]">Tracks</h3>
              {TRACKS.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-[#222] last:border-0">
                  <div className="w-20 text-[#bbb] text-xs">{t.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">Lvl</span>
                    <input type="range" min={0} max={100} value={Math.round(trackLevels[t.id] * 100)} onChange={(e) => setTrackLevels((m) => ({ ...m, [t.id]: Number((e.target as HTMLInputElement).value) / 100 }))} className="w-28" />
                  </div>
                  <button onClick={() => setMutes((m) => ({ ...m, [t.id]: !m[t.id] }))} className={`px-2 py-1 rounded-md text-xs bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff] ${mutes[t.id] ? 'opacity-70' : ''}`}>Mute</button>
                  <button onClick={() => setSolo((s) => (s === t.id ? null : (t.id as TrackId)))} className={`px-2 py-1 rounded-md text-xs bg-[#202020] shadow-[inset_0_0_0_1px_#000,0_0_0_1px_#fff] ${solo === t.id ? 'ring-1 ring-white' : ''}`}>Solo</button>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-[10px]">Bits</span>
                    <input type="range" min={2} max={16} value={trackFX[t.id].bits} onChange={(e) => setTrackFX((fx) => ({ ...fx, [t.id]: { ...fx[t.id], bits: Number((e.target as HTMLInputElement).value) } }))} className="w-24" />
                    <span className="w-6 text-right text-[10px] tabular-nums">{trackFX[t.id].bits}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">Down</span>
                    <input type="range" min={1} max={16} value={trackFX[t.id].down} onChange={(e) => setTrackFX((fx) => ({ ...fx, [t.id]: { ...fx[t.id], down: Number((e.target as HTMLInputElement).value) } }))} className="w-24" />
                    <span className="w-6 text-right text-[10px] tabular-nums">{trackFX[t.id].down}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Invisible scheduler */}
      <Scheduler
        isPlaying={isPlaying}
        bpm={bpm}
        swing={swing}
        steps={steps}
        pattern={pattern as any}
        trackLevels={effLevels as any}
        onStep={(ix) => setActiveStep(ix)}
        engine={engine}
      />
    </div>
  );
}

// -----------------------
// Dev sanity checks (lightweight)
// -----------------------
if (typeof window !== 'undefined') {
  console.assert(TRACKS.length === 8, 'Expected 8 tracks');
}
