"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./micro-8-synth.css";

// MICRO-8 — Dual VCO Subtractive Synth (Retro panel)
// New in this revision:
// - Knobs guaranteed perfectly round (no stretching) + labels placed UNDER knobs
// - Added Sequencer Presets (ACID-8, MINOR-STAIR, OFFBEAT-5TH, RANDOM)
// - Keeps: 303 per-step Accent & Slide, Overdrive, Footage per VCO, live BPM/param updates

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const destinations = { vca: "VCA LEVEL", cutoff: "VCF CUTOFF", pitch: "VCO PITCH" };
const modulationScale = { vca: 1, cutoff: 6000, pitch: 1200 };
const initialEnvelopes = [
  { a: 0.01, d: 0.15, s: 0.6, r: 0.25 },
  { a: 0.01, d: 0.2, s: 0.05, r: 0.2 },
];

export default function SimpleSubtractiveSynth() {
  // AUDIO GRAPH
  const [ctxStarted, setCtxStarted] = useState(false);
  const audioRef = useRef(null /** AudioContext */);

  // Nodes
  const vco1Ref = useRef(null);
  const vco2Ref = useRef(null);
  const vco1GainRef = useRef(null);
  const vco2GainRef = useRef(null);
  const filterRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const shaperRef = useRef(null);
  const vcaRef = useRef(null);
  const outGainRef = useRef(null);
  const envSourcesRef = useRef([]);
  const routesRef = useRef(new Map());

  // PARAM STATE
  const [vco1, setVco1] = useState({ type: "sawtooth", level: 0.7, detune: 0, footage: "8'" });
  const [vco2, setVco2] = useState({ type: "square", level: 0.5, detune: 0, footage: "8'" });
  const [filter, setFilter] = useState({ cutoff: 1200, resonance: 0.2 });
  const [envelopes, setEnvelopes] = useState(initialEnvelopes);
  const [patches, setPatches] = useState([{ env: 0, destination: "vca", amount: 90 }]);
  const [overdrive, setOverdrive] = useState({ drive: 0.3, mix: 0.4 });
  const [master, setMaster] = useState(0.8);

  // SEQUENCER STATE
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [glide, setGlide] = useState(0.05);
  const [transpose, setTranspose] = useState(0);
  const [baseNote, setBaseNote] = useState(60); // C4
  const [steps, setSteps] = useState(
    Array.from({ length: 8 }, (_, i) => ({ on: true, semi: [0, 2, 4, 7, 9, 7, 4, 2][i] ?? 0, accent: i%4===0, slide: false }))
  );
  const [currentStep, setCurrentStep] = useState(0);

  // LIVE REFS
  const bpmRef = useRef(bpm);
  const stepsRef = useRef(steps);
  const transposeRef = useRef(transpose);
  const baseNoteRef = useRef(baseNote);
  const glideRef = useRef(glide);
  const envelopesRef = useRef(envelopes);
  const vco1FootRef = useRef("8'");
  const vco2FootRef = useRef("8'");
  const overdriveRef = useRef(overdrive);

  useEffect(()=>{ bpmRef.current = bpm; }, [bpm]);
  useEffect(()=>{ stepsRef.current = steps; }, [steps]);
  useEffect(()=>{ transposeRef.current = transpose; }, [transpose]);
  useEffect(()=>{ baseNoteRef.current = baseNote; }, [baseNote]);
  useEffect(()=>{ glideRef.current = glide; }, [glide]);
  useEffect(()=>{ envelopesRef.current = envelopes; }, [envelopes]);
  useEffect(()=>{ vco1FootRef.current = vco1.footage; }, [vco1]);
  useEffect(()=>{ vco2FootRef.current = vco2.footage; }, [vco2]);
  useEffect(()=>{ overdriveRef.current = overdrive; }, [overdrive]);

  // scheduler handle
  const schedulerIdRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");
  const currentStepRef = useRef(0);
  useEffect(()=>{ currentStepRef.current = currentStep; }, [currentStep]);

  // Initialize audio
  const initAudio = async () => {
    if (ctxStarted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error("WebAudio not supported");
      const ctx = new AudioCtx();
      await ctx.resume();
      audioRef.current = ctx;

      // Create nodes
      const vco1 = ctx.createOscillator();
      const vco2 = ctx.createOscillator();
      const vco1Gain = ctx.createGain();
      const vco2Gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const shaper = ctx.createWaveShaper();
      const vca = ctx.createGain();
      const outGain = ctx.createGain();

      // Configure
      vco1.type = "sawtooth";
      vco2.type = "square";
      vco1Gain.gain.value = 0.7;
      vco2Gain.gain.value = 0.5;

      filter.type = "lowpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.2;

      // Overdrive defaults
      const od = overdriveRef.current || {drive:0.3, mix:0.4};
      dryGain.gain.value = 1 - od.mix;
      wetGain.gain.value = od.mix;
      shaper.curve = makeDriveCurve(od.drive);
      shaper.oversample = '2x';

      vca.gain.value = 0;
      outGain.gain.value = 0.8;

      // Patch
      vco1.connect(vco1Gain);
      vco2.connect(vco2Gain);
      vco1Gain.connect(filter);
      vco2Gain.connect(filter);

      filter.connect(dryGain);
      filter.connect(shaper);
      shaper.connect(wetGain);

      const mixBus = ctx.createGain();
      dryGain.connect(mixBus);
      wetGain.connect(mixBus);
      mixBus.connect(vca);
      vca.connect(outGain);
      outGain.connect(ctx.destination);

      vco1.start();
      vco2.start();

      envSourcesRef.current = initialEnvelopes.map(() => {
        const source = ctx.createConstantSource();
        source.offset.value = 0;
        source.start();
        return source;
      });

      // store
      vco1Ref.current = vco1;
      vco2Ref.current = vco2;
      vco1GainRef.current = vco1Gain;
      vco2GainRef.current = vco2Gain;
      filterRef.current = filter;
      dryGainRef.current = dryGain;
      wetGainRef.current = wetGain;
      shaperRef.current = shaper;
      vcaRef.current = vca;
      outGainRef.current = outGain;

      setCtxStarted(true);
    } catch (e) {
      console.error(e);
      setErrorMsg(String(e?.message || e));
    }
  };

  // Apply UI param changes
  useEffect(() => {
    if (!ctxStarted) return;
    const { type, level, detune } = vco1;
    vco1Ref.current.type = type;
    vco1GainRef.current.gain.setTargetAtTime(level, audioRef.current.currentTime, 0.01);
    vco1Ref.current.detune.setTargetAtTime(detune, audioRef.current.currentTime, 0.01);
  }, [vco1, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const { type, level, detune } = vco2;
    vco2Ref.current.type = type;
    vco2GainRef.current.gain.setTargetAtTime(level, audioRef.current.currentTime, 0.01);
    vco2Ref.current.detune.setTargetAtTime(detune, audioRef.current.currentTime, 0.01);
  }, [vco2, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const { cutoff, resonance } = filter;
    filterRef.current.frequency.setTargetAtTime(cutoff, audioRef.current.currentTime, 0.02);
    filterRef.current.Q.setTargetAtTime(resonance * 20, audioRef.current.currentTime, 0.02);
  }, [filter, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const { drive, mix } = overdrive;
    dryGainRef.current.gain.setTargetAtTime(1 - mix, audioRef.current.currentTime, 0.02);
    wetGainRef.current.gain.setTargetAtTime(mix, audioRef.current.currentTime, 0.02);
    shaperRef.current.curve = makeDriveCurve(drive);
  }, [overdrive, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    outGainRef.current.gain.setTargetAtTime(master, audioRef.current.currentTime, 0.01);
  }, [master, ctxStarted]);

  // A route is a gain node between one envelope output and an AudioParam.
  // Updating its amount never interrupts a running note.
  useEffect(() => {
    if (!ctxStarted) return;
    const ctx = audioRef.current;
    const targets = {
      vca: [vcaRef.current.gain],
      cutoff: [filterRef.current.frequency],
      pitch: [vco1Ref.current.detune, vco2Ref.current.detune],
    };
    const desired = new Set(patches.map(({ env, destination }) => `${env}:${destination}`));
    for (const [key, nodes] of routesRef.current) {
      if (!desired.has(key)) {
        nodes.forEach((node) => node.disconnect());
        routesRef.current.delete(key);
      }
    }
    patches.forEach(({ env, destination, amount }) => {
      const key = `${env}:${destination}`;
      let nodes = routesRef.current.get(key);
      if (!nodes) {
        nodes = targets[destination].map((target) => {
          const gain = ctx.createGain();
          gain.gain.value = 0;
          envSourcesRef.current[env].connect(gain);
          gain.connect(target);
          return gain;
        });
        routesRef.current.set(key, nodes);
      }
      nodes.forEach((node) => node.gain.setTargetAtTime(amount / 100 * modulationScale[destination], ctx.currentTime, 0.01));
    });
  }, [patches, ctxStarted]);

  // Both envelopes trigger and release together, but their shapes and routes are independent.
  const triggerEnv = (accent=false) => {
    const ctx = audioRef.current;
    const now = ctx.currentTime;
    envelopesRef.current.forEach(({ a, d, s }, index) => {
      const offset = envSourcesRef.current[index].offset;
      offset.cancelScheduledValues(now);
      offset.setValueAtTime(offset.value, now);
      offset.linearRampToValueAtTime(accent ? 1 : 0.9, now + Math.max(0.001, a));
      offset.linearRampToValueAtTime(clamp(s, 0, 1), now + Math.max(0.001, a) + Math.max(0.001, d));
    });
  };

  const releaseEnv = () => {
    const ctx = audioRef.current;
    const now = ctx.currentTime;
    envelopesRef.current.forEach(({ r }, index) => {
      const offset = envSourcesRef.current[index].offset;
      offset.cancelScheduledValues(now);
      offset.setValueAtTime(offset.value, now);
      offset.linearRampToValueAtTime(0, now + Math.max(0.001, r));
    });
  };

  // footage factor
  const footMult = (foot) => {
    switch(foot){
      case "32'": return 0.25; // -2 oct
      case "16'": return 0.5;  // -1 oct
      default: return 1.0;      // 8'
    }
  };

  // Frequency glide helper
  const setFrequency = (freq) => {
    if (!ctxStarted) return;
    const ctx = audioRef.current;
    const t = Math.max(0.001, glideRef.current);
    const now = ctx.currentTime;
    const f1 = freq * footMult(vco1FootRef.current);
    const f2 = freq * footMult(vco2FootRef.current);

    [ [vco1Ref.current.frequency, f1], [vco2Ref.current.frequency, f2] ].forEach(([p, f]) => {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(f, now + t);
    });
  };

  // TICK SCHEDULER
  const tick = () => {
    const curr = currentStepRef.current;
    const next = (curr + 1) % stepsRef.current.length;
    const st = stepsRef.current[next];
    setCurrentStep(next);

    if (st?.on) {
      const midi = baseNoteRef.current + (st.semi || 0) + transposeRef.current;
      setFrequency(midiToFreq(midi));
      if (!st.slide) triggerEnv(!!st.accent);
    } else {
      releaseEnv();
    }

    const msPerBeat = (60 / Math.max(1, bpmRef.current)) * 1000;
    schedulerIdRef.current = setTimeout(tick, msPerBeat);
  };

  const startSeq = () => {
    if (!ctxStarted || isPlaying) return;
    const st = stepsRef.current[currentStepRef.current];
    if (st?.on) {
      const midi = baseNoteRef.current + (st.semi || 0) + transposeRef.current;
      setFrequency(midiToFreq(midi));
      if (!st.slide) triggerEnv(!!st.accent);
    } else {
      releaseEnv();
    }
    setIsPlaying(true);
    const msPerBeat = (60 / Math.max(1, bpmRef.current)) * 1000;
    schedulerIdRef.current = setTimeout(tick, msPerBeat);
  };

  const stopSeq = () => {
    if (schedulerIdRef.current) clearTimeout(schedulerIdRef.current);
    schedulerIdRef.current = null;
    setIsPlaying(false);
    if (ctxStarted) releaseEnv();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (schedulerIdRef.current) clearTimeout(schedulerIdRef.current);
      try { if (audioRef.current) audioRef.current.close(); } catch {}
    };
  }, []);

  // UI helpers
  const updateStep = (idx, patch) => {
    setSteps((arr) => {
      const next = arr.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      if (idx === currentStepRef.current) {
        const st = next[idx];
        if (st.on) {
          const midi = baseNoteRef.current + (st.semi || 0) + transposeRef.current;
          setFrequency(midiToFreq(midi));
          if (!st.slide) triggerEnv(!!st.accent);
        } else {
          releaseEnv();
        }
      }
      return next;
    });
  };

  const noteOptions = useMemo(() => {
    const labels = [
      "C3","C#3","D3","D#3","E3","F3","F#3","G3","G#3","A3","A#3","B3",
      "C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4",
      "C5","C#5","D5","D#5","E5","F5","F#5","G5"
    ];
    const startMidi = 48; // C3
    return labels.map((label, i) => ({ label, value: startMidi + i }));
  }, []);

  const footageOptions = ["32'", "16'", "8'"]; // lowest to highest

  // --- Presets ---
  const presets = {
    "ACID-8": () => ({
      base: 53, // F3
      steps: [0,2,3,5,7,5,3,2].map((semi, i) => ({ on: true, semi, accent: i%2===0, slide: i%3===0 }))
    }),
    "MINOR-STAIR": () => ({
      base: 57, // A3
      steps: [0,1,2,3,4,5,6,7].map((s) => ({ on: true, semi: s, accent: s%4===0, slide:false }))
    }),
    "OFFBEAT-5TH": () => ({
      base: 60, // C4
      steps: [0,7,0,7,0,7,0,7].map((semi, i)=>({ on: i%2===1, semi, accent: i%4===1, slide: i%2===1 }))
    }),
    "RANDOM": () => ({
      base: 55 + Math.floor(Math.random()*5),
      steps: Array.from({length:8},(_,i)=>({
        on: Math.random()>0.15,
        semi: Math.floor((Math.random()*25))-12,
        accent: Math.random()>0.6,
        slide: Math.random()>0.75
      }))
    })
  };

  const loadPreset = (name) => {
    const p = presets[name]?.();
    if (!p) return;
    setBaseNote(p.base);
    setSteps(p.steps);
    // comfy defaults that suit 303-ish lines
    setGlide(0.08);
    setTranspose(0);
    setFilter(f=>({...f, cutoff: 900, resonance: 0.55 }));
    setOverdrive(o=>({...o, drive: 0.45, mix: 0.5 }));
  };

  const changeEnvelope = (index, field, value) => setEnvelopes((current) =>
    current.map((env, i) => i === index ? { ...env, [field]: value } : env));

  return (
    <div className="micro8 w-full bg-[#0e0f0f] text-[#ece6d6]">
      <div className="micro8-inner mx-auto grid">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">MICRO—8 <span>DUAL VCO / PATCH SYNTH</span></h1>
          {!ctxStarted ? (
            <button onClick={initAudio} className="px-4 py-2 rounded bg-[#ffb000] text-black font-semibold shadow">
              POWER
            </button>
          ) : (
            <div className="text-[#ffb000] text-sm">AUDIO ON</div>
          )}
        </header>

        {errorMsg && (
          <div className="bg-rose-900/40 border border-rose-700 text-rose-200 rounded p-3">
            <div className="font-semibold mb-1">Audio Error</div>
            <div className="text-sm">{errorMsg}</div>
          </div>
        )}

        {/* Panel */}
        <div className="micro8-panel border-4 border-[#1b1c1c] bg-[#121313]">
          {/* Transport strip */}
          <div className="micro8-transport grid grid-cols-1 md:grid-cols-3 gap-3 items-center p-4 border-b border-[#1b1c1c] bg-[#161717]">
            <div className="flex items-center gap-2">
              <SwitchButton onClick={startSeq} disabled={!ctxStarted || isPlaying} label="PLAY" activeColor="#00e38a" />
              <SwitchButton onClick={stopSeq} disabled={!ctxStarted || !isPlaying} label="STOP" activeColor="#ff4d57" />
              <div className="ml-3 text-sm opacity-80">STEP <span className="tabular-nums">{currentStep + 1}</span></div>
            </div>
            <RetroSlider label="TEMPO" value={bpm} min={40} max={220} step={1} onChange={(v)=>setBpm(v)} suffix="BPM" />
            <RetroSlider label="MASTER" value={master} min={0} max={1} step={0.01} onChange={(v)=>setMaster(v)} />
          </div>

          {/* VCOs */}
          <div className="micro8-oscillators grid md:grid-cols-2 gap-4 p-4">
            <RetroCard title="VCO 1">
              <WaveSwitch value={vco1.type} onChange={(t)=>setVco1(v=>({...v,type:t}))} options={["sawtooth","square","triangle","sine"]} />
              <div className="flex flex-wrap items-center gap-6">
                <Knob label="LEVEL" value={vco1.level} min={0} max={1} step={0.01} onChange={(val)=>setVco1(v=>({...v,level:val}))} />
                <Knob label="DETUNE¢" value={vco1.detune} min={-1200} max={1200} step={1} onChange={(val)=>setVco1(v=>({...v,detune:val}))} />
                <FootSwitch label="FOOT" value={vco1.footage} options={["32'","16'","8'"]} onChange={(fo)=>setVco1(v=>({...v,footage:fo}))} />
              </div>
            </RetroCard>

            <RetroCard title="VCO 2">
              <WaveSwitch value={vco2.type} onChange={(t)=>setVco2(v=>({...v,type:t}))} options={["square","sawtooth","triangle","sine"]} />
              <div className="flex flex-wrap items-center gap-6">
                <Knob label="LEVEL" value={vco2.level} min={0} max={1} step={0.01} onChange={(val)=>setVco2(v=>({...v,level:val}))} />
                <Knob label="DETUNE¢" value={vco2.detune} min={-1200} max={1200} step={1} onChange={(val)=>setVco2(v=>({...v,detune:val}))} />
                <FootSwitch label="FOOT" value={vco2.footage} options={["32'","16'","8'"]} onChange={(fo)=>setVco2(v=>({...v,footage:fo}))} />
              </div>
            </RetroCard>
          </div>

          {/* Filter and patchable envelopes */}
          <div className="micro8-modules grid md:grid-cols-2 gap-4 p-4">
            <RetroCard title="LOW PASS FILTER">
              <Knob label="CUTOFF" value={filter.cutoff} min={60} max={10000} step={1} onChange={(val)=>setFilter(f=>({...f,cutoff:val}))} />
              <Knob label="RESONANCE" value={filter.resonance} min={0} max={1} step={0.01} onChange={(val)=>setFilter(f=>({...f,resonance:val}))} />
            </RetroCard>
            <div className="micro8-envelopes grid gap-4">
              {envelopes.map((env, index) => (
                <RetroCard key={index} title={`ENV ${index + 1} / ADSR`}>
                  <Knob label="ATTACK" value={env.a} min={0} max={2} step={0.005} onChange={(v)=>changeEnvelope(index,"a",v)} />
                  <Knob label="DECAY" value={env.d} min={0} max={2} step={0.005} onChange={(v)=>changeEnvelope(index,"d",v)} />
                  <Knob label="SUSTAIN" value={env.s} min={0} max={1} step={0.01} onChange={(v)=>changeEnvelope(index,"s",v)} />
                  <Knob label="RELEASE" value={env.r} min={0} max={3} step={0.005} onChange={(v)=>changeEnvelope(index,"r",v)} />
                </RetroCard>
              ))}
            </div>
          </div>

          <div className="micro8-patch">
            <RetroCard title="PATCH BAY / ENVELOPE CONTROL">
              <CablePatchBay patches={patches} setPatches={setPatches} />
            </RetroCard>
          </div>

          {/* Overdrive */}
          <div className="micro8-drive p-4">
            <RetroCard title="OVERDRIVE">
              <Knob label="DRIVE" value={overdrive.drive} min={0} max={1} step={0.01} onChange={(v)=>setOverdrive(o=>({...o,drive:v}))} />
              <Knob label="MIX" value={overdrive.mix} min={0} max={1} step={0.01} onChange={(v)=>setOverdrive(o=>({...o,mix:v}))} />
            </RetroCard>
          </div>

          {/* Sequencer */}
          <div className="micro8-sequencer p-4 border-t border-[#1b1c1c]">
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <RetroSelect label="BASE" value={baseNote} onChange={(v)=>setBaseNote(v)} options={noteOptions} />
              <RetroSlider label="TRANSPOSE" value={transpose} min={-24} max={24} step={1} onChange={(v)=>setTranspose(v)} suffix="st" />
              <RetroSlider label="GLIDE" value={glide} min={0} max={0.6} step={0.005} onChange={(v)=>setGlide(v)} suffix="s" />
              <div className="flex items-center gap-2">
                <PresetButton onClick={()=>loadPreset("ACID-8")} label="ACID-8" />
                <PresetButton onClick={()=>loadPreset("MINOR-STAIR")} label="MINOR-STAIR" />
                <PresetButton onClick={()=>loadPreset("OFFBEAT-5TH")} label="OFFBEAT-5TH" />
                <PresetButton onClick={()=>loadPreset("RANDOM")} label="RANDOM" />
              </div>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {steps.map((st, i) => (
                <div key={i} className={`rounded-xl p-2 bg-[#0f1010] border ${currentStep===i?"border-[#00e38a]":"border-[#1b1c1c]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={()=>updateStep(i,{on:!st.on})}
                      className={`text-[10px] px-2 py-1 rounded ${st.on?"bg-[#00e38a] text-black":"bg-[#2a2b2b] text-[#aaa]"}`}
                    >{st.on?"ON":"OFF"}</button>
                    <div className={`w-2 h-2 rounded-full ${currentStep===i?"bg-[#ffb000] animate-pulse":"bg-[#444]"}`} />
                  </div>

                  <div className="text-[10px] opacity-70 mb-1">SEMI</div>
                  <input type="range" min={-12} max={12} step={1} value={st.semi}
                    onChange={(e)=>updateStep(i,{semi:parseInt(e.target.value)})}
                    className="w-full accent-[#ffb000]"/>
                  <div className="text-right text-xs tabular-nums mb-2">{st.semi}</div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <ToggleTiny active={!!st.accent} onClick={()=>updateStep(i,{accent:!st.accent})} label="ACC" activeColor="#d53b31" />
                    <ToggleTiny active={!!st.slide} onClick={()=>updateStep(i,{slide:!st.slide})} label="SLIDE" activeColor="#d53b31" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CablePatchBay({ patches, setPatches }) {
  const boardRef = useRef(null);
  const socketsRef = useRef({});
  const [points, setPoints] = useState({});
  const [drag, setDrag] = useState(null);
  const [armed, setArmed] = useState(null);
  const [selected, setSelected] = useState("0:vca");
  const colors = ["#e25143", "#d6d1b9"];
  const keyOf = (patch) => patch.env + ":" + patch.destination;

  useEffect(() => {
    const measure = () => {
      const bounds = boardRef.current.getBoundingClientRect();
      const next = {};
      Object.entries(socketsRef.current).forEach(([key, node]) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        next[key] = { x: rect.x - bounds.x + rect.width / 2, y: rect.y - bounds.y + rect.height / 2 };
      });
      setPoints(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(boardRef.current);
    measure();
    return () => observer.disconnect();
  }, []);

  const connect = (env, destination, oldDestination) => {
    const key = env + ":" + destination;
    setPatches((current) => {
      const old = current.find((patch) => patch.env === env && patch.destination === oldDestination);
      const retained = current.filter((patch) => !(oldDestination && patch.env === env && patch.destination === oldDestination));
      return retained.some((patch) => keyOf(patch) === key) ? retained :
        [...retained, { env, destination, amount: old?.amount ?? (destination === "vca" ? 90 : 40) }];
    });
    setSelected(key);
    setArmed(null);
  };
  const startDrag = (event, env, oldDestination) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = boardRef.current.getBoundingClientRect();
    setDrag({ env, oldDestination, pointerId: event.pointerId, x: event.clientX - rect.x, y: event.clientY - rect.y });
    setArmed(env);
  };
  const moveDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = boardRef.current.getBoundingClientRect();
    setDrag({ ...drag, x: event.clientX - rect.x, y: event.clientY - rect.y });
  };
  const endDrag = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const input = document.elementsFromPoint(event.clientX, event.clientY)
      .map((node) => node.closest?.("[data-patch-input]")).find(Boolean);
    if (input) connect(drag.env, input.dataset.patchInput, drag.oldDestination);
    setDrag(null);
  };
  const curve = (start, end) => {
    const sag = Math.min(65, Math.abs(end.x - start.x) * .16 + 20);
    return `M ${start.x} ${start.y} C ${start.x + 70} ${start.y + sag}, ${end.x - 70} ${end.y + sag}, ${end.x} ${end.y}`;
  };
  const active = patches.find((patch) => keyOf(patch) === selected) ?? patches[0];
  return (
    <div className="m8-cable-bay">
      <div className="m8-cable-board" ref={boardRef} onPointerMove={moveDrag} onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}>
        <svg className="m8-cables" aria-hidden="true">
          {patches.map((patch) => {
            const start = points["env" + patch.env];
            const end = points[patch.destination];
            if (!start || !end || (drag?.env === patch.env && drag.oldDestination === patch.destination)) return null;
            const path = curve(start, end);
            return <g key={keyOf(patch)}>
              <path d={path} className="m8-cable-shadow" />
              <path d={path} stroke={colors[patch.env]} className="m8-cable" />
              <path d={path} className="m8-cable-shine" />
            </g>;
          })}
          {drag && points["env" + drag.env] && <path d={curve(points["env" + drag.env], drag)}
            stroke={colors[drag.env]} className="m8-cable m8-cable-drag" />}
        </svg>
        <div className="m8-output-bank">
          {[0, 1].map((env) => <div className="m8-jack-row" key={env}>
            <span>ENV {env + 1}<small>OUT</small></span>
            <button type="button" ref={(node) => { socketsRef.current["env" + env] = node; }}
              className="m8-jack" aria-label={`ENV ${env + 1} output: drag to an input`}
              aria-pressed={armed === env} onPointerDown={(event) => startDrag(event, env)}
              onClick={() => setArmed(env)} style={{ "--cable-color": colors[env] }} />
          </div>)}
        </div>
        <div className="m8-input-bank">
          {Object.entries(destinations).map(([destination, label]) => <div className="m8-jack-row" key={destination}>
            <button type="button" data-patch-input={destination}
              ref={(node) => { socketsRef.current[destination] = node; }}
              className="m8-jack" aria-label={label + " input"}
              onClick={() => armed !== null && connect(armed, destination)} />
            <span>{label}<small>IN</small></span>
            <div className="m8-plugs">
              {patches.filter((patch) => patch.destination === destination).map((patch) =>
                <button type="button" key={patch.env} className="m8-plug"
                  style={{ "--cable-color": colors[patch.env] }}
                  aria-label={`ENV ${patch.env + 1} to ${label} cable: drag to repatch`}
                  onPointerDown={(event) => startDrag(event, patch.env, destination)}
                  onClick={() => setSelected(keyOf(patch))}>{patch.env + 1}</button>)}
            </div>
          </div>)}
        </div>
      </div>
      <div className="m8-cable-controls">
        <select aria-label="Cable to adjust" value={active ? keyOf(active) : ""}
          onChange={(event) => setSelected(event.target.value)} disabled={!active}>
          {!active && <option value="">No cables</option>}
          {patches.map((patch) => <option key={keyOf(patch)} value={keyOf(patch)}>
            ENV {patch.env + 1} → {destinations[patch.destination]}
          </option>)}
        </select>
        {active && <>
          <input type="range" min={-100} max={100} value={active.amount} aria-label="Cable modulation amount"
            onChange={(event) => setPatches((current) => current.map((patch) =>
              keyOf(patch) === keyOf(active) ? { ...patch, amount: Number(event.target.value) } : patch))} />
          <output>{active.amount > 0 ? "+" : ""}{active.amount}</output>
          <button type="button" aria-label="Unplug selected cable" onClick={() =>
            setPatches((current) => current.filter((patch) => keyOf(patch) !== keyOf(active)))}>UNPLUG</button>
        </>}
      </div>
      <p className="m8-patch-hint">Drag a socket to connect. Drag a numbered plug to move a cable. Or click output, then input.</p>
    </div>
  );
}

/* ------- Retro UI pieces ------- */
function RetroCard({ title, children }) {
  return (
    <div className="bg-[#0f1010] rounded-2xl p-4 border border-[#1b1c1c]">
      <div className="text-xs font-semibold mb-3 tracking-[0.08em] text-[#ffb000]">{title}</div>
      <div className="grid md:grid-cols-3 gap-6 items-start">{children}</div>
    </div>
  );
}

function RetroSlider({ label, value, min, max, step=1, onChange, suffix }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] opacity-80 tracking-[0.08em]">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e)=>onChange(parseFloat(e.target.value))}
        className="w-full accent-[#ffb000]"/>
      <div className="w-16 text-right tabular-nums text-sm">{typeof value==='number'?value.toFixed(step<1?2:0):value}{suffix?` ${suffix}`:""}</div>
    </div>
  );
}

function SwitchButton({ label, onClick, disabled, activeColor="#00e38a" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded border-2 font-semibold tracking-wide ${disabled?"opacity-40 cursor-not-allowed":""}`}
      style={{ borderColor: activeColor, color: activeColor }}>
      {label}
    </button>
  );
}

function PresetButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-1 rounded border text-xs border-[#2a2b2b] hover:border-[#ffb000]">
      {label}
    </button>
  );
}

function RetroSelect({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-[11px] opacity-80 tracking-[0.08em]">{label}</div>
      <select value={value} onChange={(e)=>onChange(parseInt(e.target.value))}
        className="bg-[#0f1010] border border-[#1b1c1c] rounded px-2 py-1">
        {options.map((o)=> (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function WaveSwitch({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => (
        <button key={opt}
          onClick={()=>onChange(opt)}
          className={`px-3 py-1 rounded border text-xs ${value===opt?"bg-[#ffb000] text-black border-[#ffb000]":"border-[#2a2b2b] text-[#cfc9b5]"}`}>
          {opt.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function FootSwitch({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 text-[11px] opacity-80 tracking-[0.08em]">{label}</div>
      {options.map((opt)=> (
        <button key={opt}
          onClick={()=>onChange(opt)}
          className={`px-3 py-1 rounded border text-xs ${value===opt?"bg-[#2a2b2b] text-[#ffb000] border-[#ffb000]":"border-[#2a2b2b] text-[#cfc9b5]"}`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// Perfectly round knob with label UNDER it
function Knob({ label, value, min=0, max=1, step=0.01, onChange }) {
  const percent = (value - min) / (max - min);
  const angle = -135 + percent * 270; // 270° sweep
  return (
    <div className="flex flex-col items-center justify-start w-24">
      <div className="relative w-16 h-16 rounded-full border border-[#2a2b2b] bg-[#1b1c1c] overflow-hidden select-none">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#d9d0b8] shadow-inner"/>
        </div>
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="w-[2px] h-7 bg-black translate-y-[-4px]" />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e)=>onChange(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize"
        />
      </div>
      <div className="mt-2 text-[11px] tracking-[0.06em] opacity-80 text-center">{label}</div>
      <div className="text-xs tabular-nums mt-1">{typeof value==='number'? (step<1?value.toFixed(2):Math.round(value)) : value}</div>
    </div>
  );
}

// Tiny toggle used for per-step ACC / SLIDE
function ToggleTiny({ active, onClick, label, activeColor = "#ffb000" }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] border ${active ? "text-black" : "text-[#cfc9b5]"}`}
      style={{
        background: active ? activeColor : "#2a2b2b",
        borderColor: active ? activeColor : "#2a2b2b",
      }}
    >
      {label}
    </button>
  );
}

// Simple drive curve (tanh-like)
function makeDriveCurve(amount=0.3, n=2048) {
  const k = amount * 100 + 1;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}
