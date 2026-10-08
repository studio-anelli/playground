"use client";

import "./gp888-drum-machine.css";

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

const TRACK_COLORS: Record<TrackId, string> = {
  kick: "#e43d32", snare: "#365ee8", hihat: "#f1cd30", ohat: "#f1cd30",
  rim: "#e43d32", ride: "#365ee8", midtom: "#365ee8", clap: "#e43d32",
};

const defaultSteps = (n: number) => Array.from({ length: n }, () => false);

type VoiceParams = { tune?: number; decay: number; punch?: number; snappiness?: number };
const DEFAULT_VOICES: Record<TrackId, VoiceParams> = {
  kick: { decay: 0.25, punch: 0.5 }, snare: { decay: 0.2, snappiness: 0.6 },
  hihat: { decay: 0.05 }, ohat: { decay: 0.5 }, ride: { decay: 0.7 },
  clap: { decay: 0.13 }, rim: { decay: 0.03 }, midtom: { decay: 0.25 },
};
const DECAY_LIMITS: Partial<Record<TrackId, [number, number]>> = {
  kick: [40, 1200], snare: [40, 800], hihat: [10, 400], ohat: [50, 1600],
  ride: [100, 2500], clap: [30, 1000], midtom: [40, 1600],
};

// -----------------------
// Audio Engine with per-track crushers
// -----------------------

function useAudioEngine() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const voiceParamsRef = useRef(DEFAULT_VOICES);
  const springInputRef = useRef<GainNode | null>(null);
  const springWetRef = useRef<GainNode | null>(null);
  const springSendsRef = useRef<Record<string, GainNode>>({});
  const springSettingsRef = useRef({ amount: 0.35, sends: {} as Partial<Record<TrackId, boolean>> });
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

      // A short, dispersive spring-like return: filtered, softly saturated and mono.
      const springInput = ctx.createGain();
      const highpass = ctx.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 180;
      const saturator = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) { const x = i / (curve.length - 1) * 2 - 1; curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); }
      saturator.curve = curve; saturator.oversample = "2x";
      const reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.24), ctx.sampleRate);
      const ir = impulse.getChannelData(0);
      for (let i = 0; i < ir.length; i++) {
        const t = i / ctx.sampleRate;
        const grain = Math.sin(i * 12.9898) * Math.cos(i * 78.233);
        ir[i] = (grain * 0.55 + Math.sin(2 * Math.PI * (820 * t + 1700 * t * t)) * 0.2) * Math.exp(-t * 29) * Math.min(1, t / 0.004);
      }
      for (const tap of [0.017, 0.031, 0.047, 0.071, 0.103]) ir[Math.floor(tap * ctx.sampleRate)] += 0.4 * Math.exp(-tap * 19);
      reverb.buffer = impulse;
      const warmth = ctx.createBiquadFilter(); warmth.type = "lowpass"; warmth.frequency.value = 3800;
      const wet = ctx.createGain(); wet.gain.value = springSettingsRef.current.amount * 0.45;
      springInput.connect(highpass); highpass.connect(saturator); saturator.connect(reverb);
      reverb.connect(warmth); warmth.connect(wet); wet.connect(master);
      springInputRef.current = springInput; springWetRef.current = wet;

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
    const send = ctx.createGain(); send.gain.value = springSettingsRef.current.sends[id as TrackId] ? 0.65 : 0;
    proc.connect(send); send.connect(springInputRef.current!);
    springSendsRef.current[id] = send;

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

  const setSpring = (amount: number, sends: Partial<Record<TrackId, boolean>>) => {
    springSettingsRef.current = { amount, sends };
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    springWetRef.current?.gain.setTargetAtTime(amount * 0.45, ctx.currentTime, 0.02);
    TRACKS.forEach(t => springSendsRef.current[t.id]?.gain.setTargetAtTime(sends[t.id] ? 0.65 : 0, ctx.currentTime, 0.01));
  };

  const setVoiceParams = (params: Record<TrackId, VoiceParams>) => { voiceParamsRef.current = params; };

  // --- Simple Synth Voices ---
  const triggerKick = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    const { decay, punch = 0.5, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    o.frequency.setValueAtTime((60 + punch * 120) * pitch, time);
    o.frequency.exponentialRampToValueAtTime(45 * pitch, time + Math.min(decay * 0.65, 0.04 + punch * 0.16));
    g.gain.setValueAtTime(0.9 * vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    o.connect(g);
    g.connect(routeGain(id));
    o.start(time);
    o.stop(time + decay + 0.01);
  };

  const triggerSnare = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const { decay, snappiness = 0.6, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    const o = ctx.createOscillator();
    const g1 = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(180 * pitch, time);
    g1.gain.setValueAtTime(Math.max(0.0001, (1 - snappiness) * vol), time);
    g1.gain.exponentialRampToValueAtTime(0.0001, time + decay * 0.75);
    o.connect(g1);
    g1.connect(routeGain(id));
    o.start(time);
    o.stop(time + decay * 0.75);

    const bufferSize = Math.ceil((decay + 0.01) * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(Math.max(0.0001, snappiness * vol), time);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass"; tone.frequency.value = Math.min(ctx.sampleRate * 0.45, 10000 * pitch);
    noise.connect(tone); tone.connect(g2);
    g2.connect(routeGain(id));
    noise.start(time);
    noise.stop(time + decay + 0.01);
  };

  const triggerHiHat = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const { decay, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    const bufferSize = Math.ceil((decay + 0.01) * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = Math.min(ctx.sampleRate * 0.45, 7000 * pitch);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(ctx.sampleRate * 0.45, 10000 * pitch);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(routeGain(id));
    noise.start(time); noise.stop(time + decay + 0.01);
  };

  const triggerRim = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(1200, time);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.4 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    o.connect(g); g.connect(routeGain(id)); o.start(time); o.stop(time + 0.04);
  };

  const triggerRide = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const { decay, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    const bufferSize = Math.ceil((decay + 0.01) * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = Math.min(ctx.sampleRate * 0.45, 5000 * pitch);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(ctx.sampleRate * 0.45, 8000 * pitch);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.45 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(hp); hp.connect(bp); bp.connect(g); g.connect(routeGain(id));
    noise.start(time); noise.stop(time + decay + 0.01);
  };

  const triggerTom = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const { decay, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(220 * pitch, time); o.frequency.exponentialRampToValueAtTime(140 * pitch, time + Math.min(0.18, decay * 0.7));
    g.gain.setValueAtTime(0.7 * vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    o.connect(g); g.connect(routeGain(id)); o.start(time); o.stop(time + decay + 0.01);
  };

  const triggerClap = (time: number, vol = 1, id: TrackId) => {
    const ctx = ensureCtx();
    const { decay, tune = 0 } = voiceParamsRef.current[id];
    const pitch = 2 ** (tune / 12);
    const bursts = [0, 0.012, 0.025, 0.045];
    bursts.forEach((offset, index) => {
      const tail = index === bursts.length - 1 ? decay : Math.min(0.025, decay);
      const t = time + offset;
      const bufferSize = Math.ceil((tail + 0.01) * ctx.sampleRate);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buffer;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.7 * vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + tail);
      const tone = ctx.createBiquadFilter(); tone.type = "bandpass";
      tone.frequency.value = Math.min(ctx.sampleRate * 0.45, 1800 * pitch); tone.Q.value = 0.8;
      noise.connect(tone); tone.connect(g); g.connect(routeGain(id));
      noise.start(t); noise.stop(t + tail + 0.01);
    });
  };

  const api = {
    ensureCtx,
    setMasterVolume,
    setTrackCrusher,
    setVoiceParams,
    setSpring,
    trigger(which: TrackId, time: number, vol = 1) {
      if (vol <= 0) return;
      if (which === "kick") return triggerKick(time, vol, "kick");
      if (which === "snare") return triggerSnare(time, vol, "snare");
      if (which === "hihat") return triggerHiHat(time, vol, "hihat");
      if (which === "ohat") return triggerHiHat(time, vol, "ohat");
      if (which === "rim") return triggerRim(time, vol, "rim");
      if (which === "ride") return triggerRide(time, vol, "ride");
      if (which === "midtom") return triggerTom(time, vol, "midtom");
      if (which === "clap") return triggerClap(time, vol, "clap");
    },
    get currentTime() { return audioCtxRef.current ? audioCtxRef.current.currentTime : 0; },
  } as const;

  const stableApi = useRef(api);
  return stableApi.current;
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
    let frame = 0;
    const raf = () => {
      const ctxT = (engine as any).currentTime as number;
      while (notesInQueue.current.length && notesInQueue.current[0].time < ctxT) {
        const n = notesInQueue.current.shift()!;
        onStep(n.step);
      }
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, onStep, engine]);

  return null;
}

// -----------------------
// Tempo Screen (acid‑green old‑school)
// -----------------------

function TempoScreen({ bpm, step, isPlaying }: { bpm: number; step: number; isPlaying: boolean }) {
  const quarterPulse = step >= 0 && step % 4 === 0 && isPlaying;
  return (
    <div className="gp-tempo-screen" role="status" aria-label={`Tempo ${bpm} BPM`}>
      <span className={`gp-led ${quarterPulse ? "is-lit" : ""}`} />
      <span><small>BPM</small><strong>{bpm}</strong></span>
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
  const [voiceParams, setVoiceParams] = useState(DEFAULT_VOICES);
  const [spring, setSpring] = useState(35);
  const [springSends, setSpringSends] = useState<Partial<Record<TrackId, boolean>>>({});
  const [pixelMode, setPixelMode] = useState<"letters" | "circles" | "objects">("letters");
  const [pixelColor, setPixelColor] = useState(0);
  const [pixelDensity, setPixelDensity] = useState(45);
  const [pixelMotion, setPixelMotion] = useState(35);
  useEffect(() => engine.setSpring(spring / 100, springSends), [engine, spring, springSends]);
  const updateVoice = (id: TrackId, patch: Partial<VoiceParams>) => {
    const next = { ...voiceParams, [id]: { ...voiceParams[id], ...patch } };
    engine.setVoiceParams(next);
    setVoiceParams(next);
  };

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
        const repeat = steps === 32 && row.length === 16;
        out[t.id] = Array.from({ length: steps }, (_, i) => row[repeat ? i % 16 : i] || false);
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
    const data = { steps, bpm, swing, master, trackLevels, mutes, solo, pattern, trackFX, voiceParams, spring, springSends, pixelMode, pixelColor, pixelDensity, pixelMotion };
    localStorage.setItem("gp888_v1", JSON.stringify(data));
  };

  const load = () => {
    const raw = localStorage.getItem("gp888_v1");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      const loadedVoices = Object.fromEntries(TRACKS.map(t => {
        const saved = d.voiceParams?.[t.id];
        const limits = DECAY_LIMITS[t.id];
        const base = DEFAULT_VOICES[t.id];
        const decay = Number.isFinite(saved?.decay) && limits ? Math.max(limits[0] / 1000, Math.min(limits[1] / 1000, saved.decay)) : base.decay;
        return [t.id, { ...base, decay,
          tune: Number.isFinite(saved?.tune) ? Math.max(-24, Math.min(24, saved.tune)) : 0,
          ...(base.punch !== undefined ? {punch: Number.isFinite(saved?.punch) ? Math.max(0, Math.min(1, saved.punch)) : base.punch} : {}),
          ...(base.snappiness !== undefined ? {snappiness: Number.isFinite(saved?.snappiness) ? Math.max(0, Math.min(1, saved.snappiness)) : base.snappiness} : {}),
        }];
      })) as Record<TrackId, VoiceParams>;
      engine.setVoiceParams(loadedVoices); setVoiceParams(loadedVoices);
      setSpring(Number.isFinite(d.spring) ? Math.max(0, Math.min(100, d.spring)) : 35);
      setSpringSends(d.springSends || {});
      setPixelMode(["letters", "circles", "objects"].includes(d.pixelMode) ? d.pixelMode : "letters");
      setPixelColor(d.pixelColor ?? 0); setPixelDensity(d.pixelDensity ?? 45); setPixelMotion(d.pixelMotion ?? 35);
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
    <div className="gp888">
      <div className="gp-inner">
        <header className="gp-title"><h1>GP888 <span>8-BIT / RHYTHM MACHINE</span></h1>
          <p>FROM THE FUTURE THAT NEVER WAS</p></header>
        <div className="gp-panel">
          <div className="gp-transport">
            <button aria-label="Start" aria-pressed={isPlaying} className={`gp-start ${startPulse ? "is-pulsing" : ""}`}
              onClick={() => { setIsPlaying(true); engine.ensureCtx().resume(); }}>START</button>
            <button aria-label="Stop" onClick={() => setIsPlaying(false)}>STOP</button>
            <TempoScreen bpm={bpm} step={activeStep} isPlaying={isPlaying} />
            <DrumKnob label="TEMPO" size="large" min={40} max={240} value={bpm} onChange={setBpm} />
            <DrumKnob label="SWING" size="small" min={0} max={100} value={Math.round(swing * 100)} onChange={v=>setSwing(v/100)} />
            <DrumKnob label="MASTER" size="large" min={0} max={100} value={Math.round(master * 100)} onChange={v=>setMaster(v/100)} />
            <div className="gp-step-switch"><span>STEPS</span><div role="radiogroup" aria-label="Pattern length">
              {[16,32].map(n=><button key={n} role="radio" aria-checked={steps===n} onClick={()=>setSteps(n)}>{n}</button>)}
            </div></div>
            <div className="gp-actions"><button onClick={randomize}>RANDOM</button><button onClick={clearAll}>CLEAR</button>
              <button onClick={save}>SAVE</button><button onClick={load}>LOAD</button></div>
          </div>
          <section className="gp-experimental" aria-label="Spring and pixel display">
            <DrumKnob label="SPRING" ariaLabel="Spring amount" size="large" min={0} max={100} value={spring} onChange={setSpring} />
            <div className="gp-pixel-module"><div className="gp-pixel-modes" role="group" aria-label="Pixel display mode">{(["letters", "circles", "objects"] as const).map(mode => <button key={mode} aria-pressed={pixelMode === mode} onClick={() => setPixelMode(mode)}>{mode.toUpperCase()}</button>)}</div>
            <PixelScreen mode={pixelMode} pattern={pattern} levels={effLevels} step={activeStep} playing={isPlaying} color={pixelColor} density={pixelDensity} motion={pixelMotion} /></div>
            <DrumKnob label="COLOR" ariaLabel="Pixel colour" size="small" min={0} max={100} value={pixelColor} onChange={setPixelColor} />
            <DrumKnob label="DENSITY" ariaLabel="Pixel density" size="small" min={0} max={100} value={pixelDensity} onChange={setPixelDensity} />
            <DrumKnob label="MOTION" ariaLabel="Pixel motion" size="small" min={0} max={100} value={pixelMotion} onChange={setPixelMotion} />
          </section>
          <div className="gp-sequence-scroll">
            <div className="gp-sequence" style={{gridTemplateColumns:`100px repeat(${steps}, minmax(24px,1fr))`, "--gp-step-count":steps, "--gp-playhead":Math.max(0,activeStep)} as React.CSSProperties}>
              <div className={`gp-progress ${isPlaying ? "is-running" : ""}`} aria-hidden="true"><span /></div>
              <span className="gp-row-heading">PATTERN</span>
              {Array.from({length:steps},(_,i)=><span key={i} aria-current={isPlaying && i===activeStep ? "step" : undefined} className={`gp-step-number ${i%4===0?"is-quarter":""} ${isPlaying&&i===activeStep?"is-current":""}`}>{i+1}</span>)}
              {TRACKS.map(t=><React.Fragment key={t.id}>
                <div className="gp-track-name" style={{"--track-color":TRACK_COLORS[t.id]} as React.CSSProperties}><span className={`gp-led ${blink[t.id]?"is-lit":""}`} />{t.name}</div>
                {Array.from({length:steps},(_,i)=><button key={i} aria-label={`${t.name} step ${i+1}`} aria-pressed={!!pattern[t.id]?.[i]}
                  style={{"--track-color":TRACK_COLORS[t.id]} as React.CSSProperties} onClick={()=>toggleStep(t.id,i)} className={`gp-step ${i%4===0?"is-quarter":""} ${i===activeStep&&isPlaying?"is-current":""}`} />)}
              </React.Fragment>)}
            </div>
          </div>
          <section className="gp-mixer" aria-label="Track mixer">
            {TRACKS.map(t=><div className="gp-channel" key={t.id} style={{"--track-color":TRACK_COLORS[t.id]} as React.CSSProperties}>
              <h2><span className={`gp-led ${blink[t.id]?"is-lit":""}`} />{t.name}</h2>
              <DrumKnob label="LEVEL" ariaLabel={`${t.name} level`} size="large" min={0} max={100} value={Math.round(trackLevels[t.id]*100)} onChange={v=>setTrackLevels(m=>({...m,[t.id]:v/100}))} />
              {DECAY_LIMITS[t.id] && <div className="gp-trims" style={{flexWrap:"wrap"}}>
                <DrumKnob label="TUNE st" ariaLabel={`${t.name} tune semitones`} size="small" min={-24} max={24} value={voiceParams[t.id].tune ?? 0} onChange={v=>updateVoice(t.id, {tune:v})} />
                <DrumKnob label="DECAY ms" ariaLabel={`${t.name} decay milliseconds`} size="medium" min={DECAY_LIMITS[t.id]![0]} max={DECAY_LIMITS[t.id]![1]} value={Math.round(voiceParams[t.id].decay * 1000)} onChange={v=>updateVoice(t.id, {decay:v/1000})} />
                {t.id === "kick" && <DrumKnob label="PUNCH" ariaLabel="Kick punch" size="small" min={0} max={100} value={Math.round(voiceParams.kick.punch! * 100)} onChange={v=>updateVoice("kick", {punch:v/100})} />}
                {t.id === "snare" && <DrumKnob label="SNAPPY" ariaLabel="Snare snappiness" size="small" min={0} max={100} value={Math.round(voiceParams.snare.snappiness! * 100)} onChange={v=>updateVoice("snare", {snappiness:v/100})} />}
              </div>}
              <div className="gp-trims">
                <DrumKnob label="BITS" ariaLabel={`${t.name} bits`} size="small" min={2} max={16} value={trackFX[t.id].bits} onChange={v=>setTrackFX(fx=>({...fx,[t.id]:{...fx[t.id],bits:v}}))} />
                <DrumKnob label="DOWN" ariaLabel={`${t.name} downsampling`} size="medium" min={1} max={16} value={trackFX[t.id].down} onChange={v=>setTrackFX(fx=>({...fx,[t.id]:{...fx[t.id],down:v}}))} />
              </div>
              <button className="gp-spring-send" aria-label={`${t.name} spring send`} aria-pressed={!!springSends[t.id]} onClick={()=>setSpringSends(v=>({...v,[t.id]:!v[t.id]}))}>SPRING {springSends[t.id] ? "ON" : "OFF"}</button>
              <div className="gp-channel-switches"><button aria-label={`Mute ${t.name}`} aria-pressed={mutes[t.id]} onClick={()=>setMutes(m=>({...m,[t.id]:!m[t.id]}))}>MUTE</button>
                <button aria-label={`Solo ${t.name}`} aria-pressed={solo===t.id} onClick={()=>setSolo(s=>s===t.id?null:t.id)}>SOLO</button></div>
            </div>)}
          </section>
        </div>
        <footer className="gp-footer">GP888 / EIGHT VOICES · STEP SEQUENCER · PER-CHANNEL CRUSH</footer>
      </div>

      {/* Invisible scheduler */}
      <Scheduler
        isPlaying={isPlaying}
        bpm={bpm}
        swing={swing}
        steps={steps}
        pattern={pattern as any}
        trackLevels={effLevels as any}
        onStep={setActiveStep}
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

function DrumKnob({label, ariaLabel, value, min, max, onChange, size="medium"}: {
  label:string; ariaLabel?:string; value:number; min:number; max:number; onChange:(value:number)=>void; size?:"small"|"medium"|"large";
}) {
  const angle=-135+(value-min)/(max-min)*270;
  return <div className={`gp-knob gp-knob--${size}`}>
    <div className="gp-knob-dial">
      <svg viewBox="0 0 64 64" aria-hidden="true">{Array.from({length:11},(_,i)=><path key={i} d="M32 2 V8" transform={`rotate(${-135+i*27} 32 32)`} />)}</svg>
      <div className="gp-knob-cap" style={{transform:`rotate(${angle}deg)`}}><span /></div>
      <input type="range" aria-label={ariaLabel||label} min={min} max={max} step={1} value={value} onChange={e=>onChange(Number(e.target.value))} />
    </div><span className="gp-knob-label">{label}</span><output>{value}</output>
  </div>;
}

const PIXEL_LETTERS = [
  ["101", "110", "100", "110", "101"], // K
  ["111", "100", "111", "001", "111"], // S
  ["101", "101", "111", "101", "101"], // H
  ["111", "101", "101", "101", "111"], // O
  ["110", "101", "110", "101", "101"], // R
  ["110", "101", "101", "101", "110"], // D
  ["111", "010", "010", "010", "010"], // T
  ["111", "100", "100", "100", "111"], // C
];
const PIXEL_OBJECTS = [
  ["00100", "01110", "11111", "01110", "00100"], // diamond
  ["00100", "01100", "11111", "00110", "00100"], // bolt
  ["10101", "01110", "11111", "01110", "10101"], // star
  ["01010", "11111", "11111", "01110", "00100"], // heart
  ["01110", "11011", "11111", "01010", "11011"], // alien
  ["00000", "10001", "11111", "10101", "01110"], // crown
  ["00100", "01110", "11111", "00100", "00100"], // tree
  ["01110", "10001", "10101", "10001", "01110"], // eye
];
function PixelScreen(props: {mode: "letters" | "circles" | "objects"; pattern: Record<TrackId, boolean[]>; levels: Record<TrackId, number>; step: number; playing: boolean; color: number; density: number; motion: number}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  useEffect(() => { live.current = props; }, [props]);
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pulses = Array(8).fill(0);
    const palette = ["#ff4030", "#3060ff", "#ffdc30", "#f0f0d0", "#30c060", "#e050c0", "#30c0d0", "#f08030"];
    let frame = 0, lastStep = -1, last = 0, raf = 0;
    const draw = (now: number) => {
      const p = live.current;
      if (now - last >= 50) {
        const dt = Math.min(4, (now - (last || now - 50)) / 50); last = now; frame++;
        ctx.fillStyle = "#060909"; ctx.fillRect(0, 0, 64, 32);
        const shift = Math.floor(p.color / 100 * 7);
        if (!p.playing) lastStep = -1;
        if (p.playing && p.step >= 0 && p.step !== lastStep) {
          lastStep = p.step;
          TRACKS.forEach((t, index) => {
            if (p.pattern[t.id][p.step] && p.levels[t.id] > 0) pulses[index] = p.levels[t.id];
          });
        }
        TRACKS.forEach((t, index) => {
          const pulse = pulses[index];
          const active = p.pattern[t.id].some(Boolean) && p.levels[t.id] > 0;
          ctx.globalAlpha = active ? 0.25 + pulse * 0.75 : 0.08;
          ctx.fillStyle = palette[(index + shift + (p.color > 60 ? Math.floor(frame / 12) : 0)) % 8];
          const scale = pulse > 0.45 ? 2 : 1;
          const x = (index % 4) * 16 + 8;
          const y = Math.floor(index / 4) * 15 + 8 + Math.round(Math.sin(frame * 0.08 + index) * p.motion * 0.025);
          const stamp = (cx: number, cy: number, size: number) => {
            if (p.mode === "circles") {
              const radius = size * 2 + 1;
              for (let yy = -radius; yy <= radius; yy++) for (let xx = -radius; xx <= radius; xx++) {
                const d = xx * xx + yy * yy;
                if (d <= radius * radius && (p.density > 65 || d >= (radius - 1.4) ** 2)) ctx.fillRect(cx + xx, cy + yy, 1, 1);
              }
            } else {
              const sprite = p.mode === "letters" ? PIXEL_LETTERS[index] : PIXEL_OBJECTS[index];
              sprite.forEach((row, yy) => [...row].forEach((bit, xx) => {
                if (bit === "1") ctx.fillRect(Math.floor(cx - row.length * size / 2 + xx * size), Math.floor(cy - sprite.length * size / 2 + yy * size), size, size);
              }));
            }
          };
          stamp(x, y, scale);
          if (p.density > 35) { ctx.globalAlpha *= 0.4; stamp(x - 5, y, 1); }
          if (p.density > 75) stamp(x + 5, y, 1);
          pulses[index] = Math.max(0, pulse - (0.035 + p.motion * 0.0003) * dt);
        });
        ctx.globalAlpha = 1;
        if (p.playing && p.step >= 0) { ctx.fillStyle = "#eeeecc"; ctx.fillRect(Math.floor(p.step * 64 / p.pattern.kick.length), 31, 2, 1); }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="gp-pixel-screen"><canvas ref={canvasRef} width={64} height={32} role="img" aria-label={`8-bit ${props.mode} display reacting to drum hits and pattern`} /><span>{props.mode.toUpperCase()} / 64 × 32</span></div>;
}
