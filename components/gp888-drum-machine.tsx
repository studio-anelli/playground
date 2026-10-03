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
          <div className="gp-sequence-scroll">
            <div className="gp-sequence" style={{gridTemplateColumns:`100px repeat(${steps}, minmax(24px,1fr))`, "--gp-step-count":steps, "--gp-playhead":Math.max(0,activeStep)} as React.CSSProperties}>
              <div className={`gp-progress ${isPlaying ? "is-running" : ""}`} aria-hidden="true"><span /></div>
              <span className="gp-row-heading">PATTERN</span>
              {Array.from({length:steps},(_,i)=><span key={i} aria-current={isPlaying && i===activeStep ? "step" : undefined} className={`gp-step-number ${i%4===0?"is-quarter":""} ${isPlaying&&i===activeStep?"is-current":""}`}>{i+1}</span>)}
              {TRACKS.map(t=><React.Fragment key={t.id}>
                <div className="gp-track-name"><span className={`gp-led ${blink[t.id]?"is-lit":""}`} />{t.name}</div>
                {Array.from({length:steps},(_,i)=><button key={i} aria-label={`${t.name} step ${i+1}`} aria-pressed={!!pattern[t.id]?.[i]}
                  onClick={()=>toggleStep(t.id,i)} className={`gp-step ${i%4===0?"is-quarter":""} ${i===activeStep&&isPlaying?"is-current":""}`} />)}
              </React.Fragment>)}
            </div>
          </div>
          <section className="gp-mixer" aria-label="Track mixer">
            {TRACKS.map(t=><div className="gp-channel" key={t.id}>
              <h2><span className={`gp-led ${blink[t.id]?"is-lit":""}`} />{t.name}</h2>
              <DrumKnob label="LEVEL" ariaLabel={`${t.name} level`} size="large" min={0} max={100} value={Math.round(trackLevels[t.id]*100)} onChange={v=>setTrackLevels(m=>({...m,[t.id]:v/100}))} />
              <div className="gp-trims">
                <DrumKnob label="BITS" ariaLabel={`${t.name} bits`} size="small" min={2} max={16} value={trackFX[t.id].bits} onChange={v=>setTrackFX(fx=>({...fx,[t.id]:{...fx[t.id],bits:v}}))} />
                <DrumKnob label="DOWN" ariaLabel={`${t.name} downsampling`} size="medium" min={1} max={16} value={trackFX[t.id].down} onChange={v=>setTrackFX(fx=>({...fx,[t.id]:{...fx[t.id],down:v}}))} />
              </div>
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
