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
const destinations = { vca: "VCA LEVEL", cutoff: "FILTER 1", cutoff2: "FILTER 2", pitch: "VCO PITCH", drive: "OVERDRIVE" };
const modulationScale = { vca: 1, cutoff: 6000, cutoff2: 6000, pitch: 1200, drive: 1 };
const sourceName = (source) => source < 2 ? `ENV ${source + 1}` : source === 2 ? "PAD X" : "PAD Y";
const initialEnvelopes = [
  { a: 0.01, d: 0.15, s: 0.6, r: 0.25 },
  { a: 0.01, d: 0.2, s: 0.05, r: 0.2 },
];
const soundPresets = {
  "ACID": {
    vco1: { type: "sawtooth", level: .7, detune: 0, footage: "16'" },
    vco2: { type: "square", level: .08, detune: 0, footage: "16'" },
    tone: {sub:.08,drift:1}, cutoff:380,resonance:.65,glide:.07,
    env1:{a:.005,d:.18,s:.35,r:.08},env2:{a:.005,d:.17,s:0,r:.08},
    patches:[{env:0,destination:"vca",amount:80},{env:1,destination:"cutoff",amount:65}],
    drive:.45,driveMix:.55,reverbMix:.04,delayMix:.12,delayTime:.18,feedback:.25,phaserMix:0,
  },
  "80s LEAD": {
    vco1:{type:"sawtooth",level:.55,detune:-4,footage:"8'"},
    vco2:{type:"sawtooth",level:.45,detune:5,footage:"8'"},
    tone:{sub:.07,drift:2.5},cutoff:2400,resonance:.18,glide:.09,
    env1:{a:.025,d:.18,s:.75,r:.28},env2:{a:.06,d:.3,s:.35,r:.25},
    patches:[{env:0,destination:"vca",amount:75},{env:1,destination:"cutoff",amount:25}],
    drive:.12,driveMix:.22,reverbMix:.16,delayMix:.22,delayTime:.28,feedback:.35,phaserMix:.12,
  },
  "80s BASS": {
    vco1:{type:"square",level:.55,detune:0,footage:"16'"},
    vco2:{type:"sawtooth",level:.28,detune:3,footage:"16'"},
    tone:{sub:.22,drift:1},cutoff:550,resonance:.27,glide:.025,
    env1:{a:.005,d:.2,s:.45,r:.1},env2:{a:.005,d:.2,s:.05,r:.08},
    patches:[{env:0,destination:"vca",amount:80},{env:1,destination:"cutoff",amount:35}],
    drive:.18,driveMix:.3,reverbMix:0,delayMix:0,delayTime:.25,feedback:.25,phaserMix:0,
  },
  "PAD": {
    vco1:{type:"triangle",level:.55,detune:-7,footage:"8'"},
    vco2:{type:"sawtooth",level:.3,detune:7,footage:"8'"},
    tone:{sub:.12,drift:4},cutoff:1500,resonance:.12,glide:.25,
    env1:{a:1.3,d:.8,s:.8,r:2.5},env2:{a:1.8,d:1.2,s:.65,r:2.8},
    patches:[{env:0,destination:"vca",amount:65},{env:1,destination:"cutoff",amount:28}],
    drive:.04,driveMix:.12,reverbMix:.45,delayMix:.2,delayTime:.55,feedback:.48,phaserMix:.4,
  },
  "NOISE AMBIENT": {
    vco1:{type:"sawtooth",level:.33,detune:-12,footage:"16'"},
    vco2:{type:"triangle",level:.3,detune:12,footage:"8'"},
    tone:{sub:.1,drift:8},cutoff:1700,resonance:.45,glide:.3,
    env1:{a:1.8,d:1,s:.8,r:3},env2:{a:2,d:1.5,s:.5,r:3},
    patches:[{env:0,destination:"vca",amount:60},{env:1,destination:"cutoff2",amount:18},
      {env:2,destination:"cutoff",amount:30},{env:3,destination:"pitch",amount:12}],
    drive:.12,driveMix:.25,reverbMix:.55,delayMix:.3,delayTime:.7,feedback:.6,phaserMix:.35,
    noise:true,
  },
};

export default function SimpleSubtractiveSynth() {
  // AUDIO GRAPH
  const [ctxStarted, setCtxStarted] = useState(false);
  const audioRef = useRef(null /** AudioContext */);

  // Nodes
  const vco1Ref = useRef(null);
  const vco2Ref = useRef(null);
  const subRef = useRef(null);
  const subGainRef = useRef(null);
  const driftGainsRef = useRef([]);
  const vco1GainRef = useRef(null);
  const vco2GainRef = useRef(null);
  const filterRef = useRef(null);
  const filterStagesRef = useRef([]);
  const fxRef = useRef(null);
  const driveGainRef = useRef(null);
  const driveControlRef = useRef(null);
  const dryGainRef = useRef(null);
  const wetGainRef = useRef(null);
  const shaperRef = useRef(null);
  const vcaRef = useRef(null);
  const outGainRef = useRef(null);
  const envSourcesRef = useRef([]);
  const routesRef = useRef(new Map());

  // PARAM STATE
  const [vco1, setVco1] = useState({ type: "sawtooth", level: 0.7, detune: 0, footage: "8'" });
  const [vco2, setVco2] = useState({ type: "square", level: 0.5, detune: 5, footage: "8'" });
  const [tone, setTone] = useState({ sub: .12, drift: 3 });
  const [filter, setFilter] = useState({ cutoff: 1200, resonance: 0.2, enabled: true, mode: "lowpass", noiseRate: 6, noiseDepth: .35 });
  const [filter2, setFilter2] = useState({ cutoff: 6000, resonance: 0.1, enabled: false, mode: "lowpass", noiseRate: 6, noiseDepth: .35 });
  const [effects, setEffects] = useState({ reverb: { mix: 0, decay: 2 }, delay: { mix: 0, time: .25, feedback: .3 }, phaser: { mix: 0, rate: .4, depth: .5 } });
  const [pad, setPad] = useState({ x: 0, y: 0, glide: .08 });
  const [envelopes, setEnvelopes] = useState(initialEnvelopes);
  const [patches, setPatches] = useState([{ env: 0, destination: "vca", amount: 90 }]);
  const [overdrive, setOverdrive] = useState({ drive: 0.3, mix: 0.4 });
  const [master, setMaster] = useState(0.8);
  const [loadedSound, setLoadedSound] = useState("");

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
      const sub = ctx.createOscillator();
      sub.type = "triangle";
      const subGain = ctx.createGain();
      subGain.gain.value = .12;
      const vco1Gain = ctx.createGain();
      const vco2Gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const filter2Node = ctx.createBiquadFilter();
      const driveGain = ctx.createGain();
      const driveControl = ctx.createConstantSource();
      const driveClamp = ctx.createWaveShaper();
      driveClamp.curve = Float32Array.from({length: 2048}, (_, i) => i / 2047 * 10);
      driveControl.connect(driveClamp); driveClamp.connect(driveGain.gain);
      driveControl.start();
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
      shaper.curve = makeDriveCurve(.5);
      driveGain.gain.value = 0;
      driveControl.offset.value = (1 + od.drive * 5) / 5 - 1;
      shaper.oversample = '2x';

      vca.gain.value = 0;
      outGain.gain.value = 0.8;

      // Patch
      vco1.connect(vco1Gain);
      vco2.connect(vco2Gain);
      const oscillatorBus = ctx.createGain();
      vco1Gain.connect(oscillatorBus);
      vco2Gain.connect(oscillatorBus);
      sub.connect(subGain); subGain.connect(oscillatorBus);
      driftGainsRef.current = [vco1, vco2, sub].map((oscillator, index) => {
        const drift = ctx.createOscillator();
        drift.type = "sine"; drift.frequency.value = [.13, .19, .07][index];
        const amount = ctx.createGain(); amount.gain.value = 3;
        drift.connect(amount); amount.connect(oscillator.detune); drift.start();
        return amount;
      });
      const stages = [filter, filter2Node].map((node) => makeFilterStage(ctx, node));
      oscillatorBus.connect(stages[0].input);
      stages[0].output.connect(stages[1].input);
      stages[1].output.connect(dryGain);
      stages[1].output.connect(driveGain);
      driveGain.connect(shaper);
      shaper.connect(wetGain);

      const mixBus = ctx.createGain();
      dryGain.connect(mixBus);
      wetGain.connect(mixBus);
      mixBus.connect(vca);
      const effectsGraph = makeEffects(ctx);
      vca.connect(effectsGraph.input);
      effectsGraph.output.connect(outGain);
      outGain.connect(ctx.destination);

      vco1.start();
      vco2.start();
      sub.start();

      envSourcesRef.current = [0, 1, 2, 3].map(() => {
        const source = ctx.createConstantSource();
        source.offset.value = 0;
        source.start();
        return source;
      });

      // store
      vco1Ref.current = vco1;
      vco2Ref.current = vco2;
      subRef.current = sub;
      subGainRef.current = subGain;
      vco1GainRef.current = vco1Gain;
      vco2GainRef.current = vco2Gain;
      filterRef.current = filter;
      filterStagesRef.current = stages;
      fxRef.current = effectsGraph;
      driveGainRef.current = driveGain;
      driveControlRef.current = driveControl;
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
    [filter, filter2].forEach((settings, index) => {
      const stage = filterStagesRef.current[index];
      const now = audioRef.current.currentTime;
      stage.node.type = settings.mode === "noise" ? "lowpass" : settings.mode;
      stage.node.frequency.setTargetAtTime(settings.cutoff, now, .02);
      stage.node.Q.setTargetAtTime(settings.resonance * 20, now, .02);
      stage.dry.gain.setTargetAtTime(settings.enabled ? 0 : 1, now, .01);
      stage.wet.gain.setTargetAtTime(settings.enabled ? 1 : 0, now, .01);
      stage.noiseAmount.gain.setTargetAtTime(settings.enabled && settings.mode === "noise" ? settings.cutoff * settings.noiseDepth : 0, now, .02);
      stage.noise.playbackRate.setTargetAtTime(settings.noiseRate / 60, now, .04);
      stage.smooth.frequency.setTargetAtTime(Math.max(.1, settings.noiseRate * .3), now, .04);
    });
  }, [filter, filter2, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const now = audioRef.current.currentTime;
    subGainRef.current.gain.setTargetAtTime(tone.sub, now, .02);
    driftGainsRef.current.forEach((gain) => gain.gain.setTargetAtTime(tone.drift, now, .1));
  }, [tone, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const { drive, mix } = overdrive;
    dryGainRef.current.gain.setTargetAtTime(1 - mix, audioRef.current.currentTime, 0.02);
    wetGainRef.current.gain.setTargetAtTime(mix, audioRef.current.currentTime, 0.02);
    driveControlRef.current.offset.setTargetAtTime((1 + drive * 5) / 5 - 1, audioRef.current.currentTime, .02);
  }, [overdrive, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const graph = fxRef.current;
    const now = audioRef.current.currentTime;
    ["reverb", "delay", "phaser"].forEach((name) => {
      graph[name].dry.gain.setTargetAtTime(1 - effects[name].mix, now, .02);
      graph[name].wet.gain.setTargetAtTime(effects[name].mix, now, .02);
    });
    graph.delay.node.delayTime.setTargetAtTime(effects.delay.time, now, .02);
    graph.delay.feedback.gain.setTargetAtTime(effects.delay.feedback, now, .02);
    graph.phaser.lfo.frequency.setTargetAtTime(effects.phaser.rate, now, .02);
    graph.phaser.depth.gain.setTargetAtTime(effects.phaser.depth * 1300, now, .02);
    if (graph.reverb.decay !== effects.reverb.decay) {
      graph.reverb.node.buffer = makeImpulse(audioRef.current, effects.reverb.decay);
      graph.reverb.decay = effects.reverb.decay;
    }
  }, [effects, ctxStarted]);

  useEffect(() => {
    if (!ctxStarted) return;
    const now = audioRef.current.currentTime;
    envSourcesRef.current[2].offset.setTargetAtTime(pad.x, now, pad.glide);
    envSourcesRef.current[3].offset.setTargetAtTime(pad.y, now, pad.glide);
  }, [pad, ctxStarted]);

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
      cutoff2: [filterStagesRef.current[1].node.frequency],
      pitch: [vco1Ref.current.detune, vco2Ref.current.detune, subRef.current.detune],
      drive: [driveControlRef.current.offset],
    };
    const desired = new Set(patches.map(({ env, destination }) => `${env}:${destination}`));
    for (const [key, nodes] of routesRef.current) {
      if (!desired.has(key)) {
        nodes.forEach((node) => { envSourcesRef.current[Number(key.split(":")[0])].disconnect(node); node.disconnect(); });
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

    [ [vco1Ref.current.frequency, f1], [vco2Ref.current.frequency, f2], [subRef.current.frequency, f1 / 2] ].forEach(([p, f]) => {
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
      if (audioRef.current && isPlaying && idx === currentStepRef.current) {
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
  };

  const loadSound = (name) => {
    const preset = soundPresets[name];
    if (!preset) return;
    setLoadedSound(name);
    setVco1({...preset.vco1}); setVco2({...preset.vco2}); setTone({...preset.tone});
    setFilter({cutoff:preset.cutoff,resonance:preset.resonance,enabled:true,
      mode:preset.noise ? "noise" : "lowpass",noiseRate:preset.noise ? .8 : 6,noiseDepth:preset.noise ? .8 : .35});
    setFilter2({cutoff:preset.noise ? 3200 : 6000,resonance:preset.noise ? .35 : .1,
      enabled:!!preset.noise,mode:preset.noise ? "noise" : "lowpass",noiseRate:2.5,noiseDepth:preset.noise ? .65 : .35});
    setEnvelopes([{...preset.env1},{...preset.env2}]);
    setPatches(preset.patches.map((patch)=>({...patch})));
    setOverdrive({drive:preset.drive,mix:preset.driveMix});
    setEffects({reverb:{mix:preset.reverbMix,decay:preset.noise ? 4 : name==="PAD" ? 3.5 : 2},
      delay:{mix:preset.delayMix,time:preset.delayTime,feedback:preset.feedback},
      phaser:{mix:preset.phaserMix,rate:preset.noise ? .12 : name==="PAD" ? .18 : .4,depth:.5}});
    setPad({x:0,y:0,glide:.12}); setGlide(preset.glide);
    // Reset running envelopes so the new patch starts cleanly on the next note.
    if (ctxStarted) releaseEnv();
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
        <div className="m8-sound-presets" aria-label="Sound presets">
          <span>SOUNDS</span>
          {Object.keys(soundPresets).map((name)=><button key={name} type="button"
            aria-pressed={loadedSound===name} onClick={()=>loadSound(name)}>{name}</button>)}
          <small>{loadedSound ? `LOADED: ${loadedSound}` : "SELECT A SOUND"}</small>
        </div>

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
              <SwitchButton onClick={stopSeq} disabled={!ctxStarted || !isPlaying} label="STOP" activeColor="#536fe0" />
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
                <Knob size="large" label="LEVEL" value={vco1.level} min={0} max={1} step={0.01} onChange={(val)=>setVco1(v=>({...v,level:val}))} />
                <Knob size="small" label="DETUNE¢" value={vco1.detune} min={-1200} max={1200} step={1} onChange={(val)=>setVco1(v=>({...v,detune:val}))} />
                <FootSwitch label="FOOT" value={vco1.footage} options={["32'","16'","8'"]} onChange={(fo)=>setVco1(v=>({...v,footage:fo}))} />
              </div>
              <div className="m8-tone-controls">
                <Knob size="small" label="SUB" ariaLabel="Sub oscillator level" min={0} max={.5} step={.01} value={tone.sub} onChange={(sub)=>setTone(t=>({...t,sub}))} />
                <Knob size="small" label="DRIFT" ariaLabel="Oscillator drift in cents" min={0} max={12} step={.1} value={tone.drift} onChange={(drift)=>setTone(t=>({...t,drift}))} />
              </div>
            </RetroCard>

            <RetroCard title="VCO 2">
              <WaveSwitch value={vco2.type} onChange={(t)=>setVco2(v=>({...v,type:t}))} options={["square","sawtooth","triangle","sine"]} />
              <div className="flex flex-wrap items-center gap-6">
                <Knob size="large" label="LEVEL" value={vco2.level} min={0} max={1} step={0.01} onChange={(val)=>setVco2(v=>({...v,level:val}))} />
                <Knob size="small" label="DETUNE¢" value={vco2.detune} min={-1200} max={1200} step={1} onChange={(val)=>setVco2(v=>({...v,detune:val}))} />
                <FootSwitch label="FOOT" value={vco2.footage} options={["32'","16'","8'"]} onChange={(fo)=>setVco2(v=>({...v,footage:fo}))} />
              </div>
            </RetroCard>
          </div>

          {/* Filter and patchable envelopes */}
          <div className="micro8-modules grid md:grid-cols-2 gap-4 p-4">
            {[filter, filter2].map((settings, index) => <RetroCard key={index} title={`FILTER ${index + 1}`}>
              <div className="m8-filter-switches">
                <button type="button" aria-pressed={settings.enabled}
                  onClick={() => (index ? setFilter2 : setFilter)((current) => ({ ...current, enabled: !current.enabled }))}>
                  {settings.enabled ? "ON" : "BYPASS"}
                </button>
                <AnalogSwitch label={`Filter ${index + 1} mode`} value={settings.mode} symbols
                  options={["lowpass", "highpass", "bandpass", "noise"]}
                  onChange={(mode) => (index ? setFilter2 : setFilter)((current) => ({ ...current, mode }))} />
              </div>
              <Knob size="large" label="CUTOFF" value={settings.cutoff} min={60} max={10000} step={1} onChange={(val)=>(index ? setFilter2 : setFilter)(f=>({...f,cutoff:val}))} />
              <Knob label="RESONANCE" value={settings.resonance} min={0} max={1} step={0.01} onChange={(val)=>(index ? setFilter2 : setFilter)(f=>({...f,resonance:val}))} />
              <Knob size="small" label="NOISE RATE" value={settings.noiseRate} min={.2} max={60} step={.1} onChange={(val)=>(index ? setFilter2 : setFilter)(f=>({...f,noiseRate:val}))} />
              <Knob size="small" label="NOISE DEPTH" value={settings.noiseDepth} min={0} max={1} step={.01} onChange={(val)=>(index ? setFilter2 : setFilter)(f=>({...f,noiseDepth:val}))} />
            </RetroCard>)}
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
          <div className="micro8-effects">
            <RetroCard title="OVERDRIVE">
              <Knob label="DRIVE" value={overdrive.drive} min={0} max={1} step={0.01} onChange={(v)=>setOverdrive(o=>({...o,drive:v}))} />
              <Knob size="small" label="MIX" value={overdrive.mix} min={0} max={1} step={0.01} onChange={(v)=>setOverdrive(o=>({...o,mix:v}))} />
            </RetroCard>
            <RetroCard title="REVERB">
              <Knob label="DECAY" value={effects.reverb.decay} min={.2} max={4} step={.05} onChange={(v)=>setEffects(e=>({...e,reverb:{...e.reverb,decay:v}}))} />
              <Knob size="small" label="MIX" value={effects.reverb.mix} min={0} max={1} step={.01} onChange={(v)=>setEffects(e=>({...e,reverb:{...e.reverb,mix:v}}))} />
            </RetroCard>
            <RetroCard title="DELAY">
              <Knob label="TIME" value={effects.delay.time} min={.02} max={1.2} step={.01} onChange={(v)=>setEffects(e=>({...e,delay:{...e.delay,time:v}}))} />
              <Knob label="FEEDBACK" value={effects.delay.feedback} min={0} max={.85} step={.01} onChange={(v)=>setEffects(e=>({...e,delay:{...e.delay,feedback:v}}))} />
              <Knob size="small" label="MIX" value={effects.delay.mix} min={0} max={1} step={.01} onChange={(v)=>setEffects(e=>({...e,delay:{...e.delay,mix:v}}))} />
            </RetroCard>
            <RetroCard title="MICROPHASER">
              <Knob label="RATE" value={effects.phaser.rate} min={.05} max={8} step={.05} onChange={(v)=>setEffects(e=>({...e,phaser:{...e.phaser,rate:v}}))} />
              <Knob label="DEPTH" value={effects.phaser.depth} min={0} max={1} step={.01} onChange={(v)=>setEffects(e=>({...e,phaser:{...e.phaser,depth:v}}))} />
              <Knob size="small" label="MIX" value={effects.phaser.mix} min={0} max={1} step={.01} onChange={(v)=>setEffects(e=>({...e,phaser:{...e.phaser,mix:v}}))} />
            </RetroCard>
            <RetroCard title="TRACKPAD / GLIDE">
              <GlidePad pad={pad} setPad={setPad} />
            </RetroCard>
          </div>

          {/* Sequencer */}
          <div className="micro8-sequencer p-4 border-t border-[#1b1c1c]">
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <RetroSelect label="BASE" value={baseNote} onChange={(v)=>setBaseNote(v)} options={noteOptions} />
              <Knob size="small" label="TRANSPOSE" value={transpose} min={-24} max={24} step={1} onChange={(v)=>setTranspose(v)} suffix="st" />
              <Knob size="small" label="GLIDE" value={glide} min={0} max={0.6} step={0.005} onChange={(v)=>setGlide(v)} suffix="s" />
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

                  <Knob size="medium" label="SEMI" ariaLabel={`Step ${i + 1} semitones`} min={-12} max={12} step={1} value={st.semi}
                    onChange={(semi)=>updateStep(i,{semi})} />

                  <div className="flex items-center gap-2 text-[10px]">
                    <ToggleTiny active={!!st.accent} onClick={()=>updateStep(i,{accent:!st.accent})} label="ACC" activeColor="#536fe0" />
                    <ToggleTiny active={!!st.slide} onClick={()=>updateStep(i,{slide:!st.slide})} label="SLIDE" activeColor="#536fe0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <PianoKeyboard enabled={ctxStarted}
          onNoteOn={(midi) => { if (!ctxStarted) return; if (isPlaying) stopSeq(); setFrequency(midiToFreq(midi)); triggerEnv(); }}
          onNoteOff={() => { if (ctxStarted) releaseEnv(); }} />
      </div>
    </div>
  );
}

function GlidePad({ pad, setPad }) {
  const move = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPad((current) => ({ ...current, x: clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1),
      y: clamp(1 - (event.clientY - rect.top) / rect.height * 2, -1, 1) }));
  };
  return <div className="m8-glide-control">
    <div className="m8-glide-pad" role="slider" tabIndex={0} aria-label="Trackpad glide control"
      aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(pad.x * 100)}
      aria-valuetext={`X ${Math.round(pad.x * 100)}, Y ${Math.round(pad.y * 100)}`}
      onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event); }}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onKeyDown={(event) => {
        const shifts = { ArrowLeft: [-.05, 0], ArrowRight: [.05, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] };
        if (shifts[event.key]) { event.preventDefault(); const [x,y] = shifts[event.key]; setPad(p=>({...p,x:clamp(p.x+x,-1,1),y:clamp(p.y+y,-1,1)})); }
        if (event.key === "Home") { event.preventDefault(); setPad(p=>({...p,x:0,y:0})); }
      }}>
      <span className="m8-pad-dot" style={{left: `${(pad.x+1)*50}%`,top:`${(1-pad.y)*50}%`}} />
      <small>X / Y</small>
    </div>
    <Knob size="small" label="GLIDE" ariaLabel="Trackpad smoothing time" min={.01} max={.6} step={.01}
      value={pad.glide} onChange={(glide)=>setPad(p=>({...p,glide}))} />
    <button type="button" onClick={()=>setPad(p=>({...p,x:0,y:0}))}>CENTER</button>
  </div>;
}

function makeFilterStage(ctx, node) {
  const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  input.connect(dry); input.connect(node); node.connect(wet); dry.connect(output); wet.connect(output);
  dry.gain.value = 1; wet.gain.value = 0;
  const noise = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let value = 0, seed = 193;
  for (let i=0;i<data.length;i++) {
    if (i % Math.max(1, Math.floor(ctx.sampleRate / 60)) === 0) { seed=(seed*16807)%2147483647; value=seed/2147483647*2-1; }
    data[i]=value;
  }
  noise.buffer=buffer; noise.loop=true;
  const smooth=ctx.createBiquadFilter(); smooth.type="lowpass"; smooth.frequency.value=16;
  const noiseAmount=ctx.createGain(); noiseAmount.gain.value=0;
  noise.connect(smooth); smooth.connect(noiseAmount); noiseAmount.connect(node.frequency); noise.start();
  return {input,output,node,dry,wet,noiseAmount,noise,smooth};
}

function makeImpulse(ctx, decay) {
  const length = Math.ceil(ctx.sampleRate * decay);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for(let channel=0;channel<2;channel++) {
    const data=buffer.getChannelData(channel); let seed=771+channel*373;
    for(let i=0;i<length;i++) { seed=(seed*16807)%2147483647; data[i]=(seed/2147483647*2-1)*Math.pow(1-i/length,2.5); }
  }
  return buffer;
}

function makeEffects(ctx) {
  const stage = () => {
    const input=ctx.createGain(), output=ctx.createGain(), dry=ctx.createGain(), wet=ctx.createGain();
    dry.gain.value=1; wet.gain.value=0; input.connect(dry); dry.connect(output); wet.connect(output);
    return {input,output,dry,wet};
  };
  const phaser=stage();
  const phases=[300,600,1200,2400].map((frequency)=>{const node=ctx.createBiquadFilter();node.type="allpass";node.frequency.value=frequency;return node;});
  phaser.input.connect(phases[0]); phases.forEach((node,i)=>node.connect(phases[i+1]??phaser.wet));
  phaser.lfo=ctx.createOscillator(); phaser.lfo.type="sine"; phaser.lfo.frequency.value=.4;
  phaser.depth=ctx.createGain(); phaser.depth.gain.value=650; phaser.lfo.connect(phaser.depth);
  phases.forEach((node)=>phaser.depth.connect(node.frequency)); phaser.lfo.start();
  const delay=stage(); delay.node=ctx.createDelay(1.5); delay.node.delayTime.value=.25;
  delay.feedback=ctx.createGain();delay.feedback.gain.value=.3;
  const damping=ctx.createBiquadFilter();damping.type="lowpass";damping.frequency.value=6000;
  delay.input.connect(delay.node);delay.node.connect(delay.wet);delay.node.connect(damping);
  damping.connect(delay.feedback);delay.feedback.connect(delay.node);
  const reverb=stage();reverb.node=ctx.createConvolver();reverb.node.buffer=makeImpulse(ctx,2);reverb.decay=2;
  reverb.input.connect(reverb.node);reverb.node.connect(reverb.wet);
  phaser.output.connect(delay.input);delay.output.connect(reverb.input);
  return {input:phaser.input,output:reverb.output,phaser,delay,reverb};
}

const pianoNotes = [
  { note: "C", key: "a", semi: 0 }, { note: "C♯", key: "w", semi: 1, black: true, position: 1 },
  { note: "D", key: "s", semi: 2 }, { note: "D♯", key: "e", semi: 3, black: true, position: 2 },
  { note: "E", key: "d", semi: 4 }, { note: "F", key: "f", semi: 5 },
  { note: "F♯", key: "t", semi: 6, black: true, position: 4 },
  { note: "G", key: "g", semi: 7 }, { note: "G♯", key: "y", semi: 8, black: true, position: 5 },
  { note: "A", key: "h", semi: 9 }, { note: "A♯", key: "u", semi: 10, black: true, position: 6 },
  { note: "B", key: "j", semi: 11 },
];

function PianoKeyboard({ enabled, onNoteOn, onNoteOff }) {
  const [octave, setOctave] = useState(4);
  const octaveRef = useRef(4);
  const heldRef = useRef(new Map());
  const callbacksRef = useRef({ enabled, onNoteOn, onNoteOff });
  const [held, setHeld] = useState([]);
  useEffect(() => { callbacksRef.current = { enabled, onNoteOn, onNoteOff }; }, [enabled, onNoteOn, onNoteOff]);
  const press = (id, semi) => {
    if (!callbacksRef.current.enabled || heldRef.current.has(id)) return;
    heldRef.current.set(id, semi);
    setHeld([...heldRef.current.values()]);
    callbacksRef.current.onNoteOn((octaveRef.current + 1) * 12 + semi);
  };
  const release = (id) => {
    if (!heldRef.current.has(id)) return;
    const wasLast = [...heldRef.current.keys()].at(-1) === id;
    heldRef.current.delete(id);
    setHeld([...heldRef.current.values()]);
    if (!wasLast) return;
    const last = [...heldRef.current.values()].at(-1);
    if (last === undefined) callbacksRef.current.onNoteOff();
    else callbacksRef.current.onNoteOn((octaveRef.current + 1) * 12 + last);
  };
  useEffect(() => {
    const heldMap = heldRef.current;
    const typing = (target) => target instanceof Element && target.closest("textarea, select, input:not([type=range]), [contenteditable=true]");
    const down = (event) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      const note = pianoNotes.find((note) => note.key === event.key.toLowerCase());
      if (!note || !callbacksRef.current.enabled) return;
      event.preventDefault();
      press("key:" + note.key, note.semi);
    };
    const up = (event) => release("key:" + event.key.toLowerCase());
    const panic = () => {
      if (heldRef.current.size) callbacksRef.current.onNoteOff();
      heldRef.current.clear();
      setHeld([]);
    };
    const visibility = () => { if (document.hidden) panic(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", panic);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", panic);
      document.removeEventListener("visibilitychange", visibility);
      if (heldMap.size) callbacksRef.current.onNoteOff();
    };
  }, []);
  const key = (note) => <button key={note.semi} type="button" disabled={!enabled}
    className={`m8-piano-key ${note.black ? "is-black" : "is-white"} ${held.includes(note.semi) ? "is-held" : ""}`}
    style={note.black ? { left: `calc(${note.position} * 100% / 7 - 3.8%)` } : undefined}
    aria-label={`${note.note}${octave} — laptop key ${note.key.toUpperCase()}`} aria-pressed={held.includes(note.semi)}
    onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); press("pointer:" + event.pointerId, note.semi); }}
    onPointerUp={(event) => release("pointer:" + event.pointerId)}
    onPointerCancel={(event) => release("pointer:" + event.pointerId)}
    onLostPointerCapture={(event) => release("pointer:" + event.pointerId)}
    onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); press("button:" + note.semi, note.semi); } }}
    onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); release("button:" + note.semi); } }}
    onBlur={() => release("button:" + note.semi)}>
    <span>{note.note}</span><kbd>{note.key.toUpperCase()}</kbd>
  </button>;
  const changeOctave = (direction) => {
    const next = clamp(octaveRef.current + direction, 1, 7);
    if (next === octaveRef.current) return;
    if (heldRef.current.size) callbacksRef.current.onNoteOff();
    heldRef.current.clear();
    setHeld([]);
    octaveRef.current = next;
    setOctave(next);
  };
  return <section className="m8-piano" aria-label="One octave piano keyboard">
    <div className="m8-piano-legend"><strong>KEYBOARD / C{octave}—B{octave}</strong>
      <div className="m8-octave-switch">
        <button type="button" aria-label="Octave down" disabled={octave === 1} onClick={() => changeOctave(-1)}>−</button>
        <output aria-label="Current octave">OCT {octave}</output>
        <button type="button" aria-label="Octave up" disabled={octave === 7} onClick={() => changeOctave(1)}>+</button>
      </div>
      <span>{enabled ? "A S D F G H J / W E T Y U · LAST NOTE PRIORITY" : "PRESS POWER TO PLAY"}</span></div>
    <div className="m8-piano-bed">
      <div className="m8-white-keys">{pianoNotes.filter((note) => !note.black).map(key)}</div>
      {pianoNotes.filter((note) => note.black).map(key)}
    </div>
  </section>;
}

function CablePatchBay({ patches, setPatches }) {
  const boardRef = useRef(null);
  const socketsRef = useRef({});
  const [points, setPoints] = useState({});
  const [drag, setDrag] = useState(null);
  const [armed, setArmed] = useState(null);
  const [selected, setSelected] = useState("0:vca");
  const colors = ["#6984ef", "#d6d1b9", "#aab5b4", "#b2beed"];
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
    if (env >= 2 && destination === "vca") return;
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
          {[0, 1, 2, 3].map((env) => <div className="m8-jack-row" key={env}>
            <span>{sourceName(env)}<small>OUT</small></span>
            <button type="button" ref={(node) => { socketsRef.current["env" + env] = node; }}
              className="m8-jack" aria-label={`${sourceName(env)} output: drag to an input`}
              aria-pressed={armed === env} onPointerDown={(event) => startDrag(event, env)}
              onClick={() => setArmed(env)} style={{ "--cable-color": colors[env] }} />
          </div>)}
        </div>
        <div className="m8-input-bank">
          {Object.entries(destinations).map(([destination, label]) => {
            const route = patches.find((patch) => patch.destination === destination && keyOf(patch) === selected) ?? patches.find((patch) => patch.destination === destination);
            return <div className="m8-jack-row" key={destination}>
            <Knob size="small" label={route ? sourceName(route.env) : "AMOUNT"} ariaLabel={`${label} modulation amount`}
              disabled={!route} min={-100} max={100} step={1} value={route?.amount ?? 0}
              onChange={(amount) => setPatches(current => current.map(patch => keyOf(patch) === keyOf(route) ? {...patch, amount} : patch))} />
            <button type="button" data-patch-input={destination}
              ref={(node) => { socketsRef.current[destination] = node; }}
              className="m8-jack" aria-label={label + " input"}
              onClick={() => { if (armed !== null) connect(armed, destination); else if (route) setSelected(keyOf(route)); }} />
            <span>{label}<small>IN</small></span>
            <div className="m8-plugs">
              {patches.filter((patch) => patch.destination === destination).map((patch) =>
                <button type="button" key={patch.env} className="m8-plug"
                  style={{ "--cable-color": colors[patch.env] }}
                  aria-label={`${sourceName(patch.env)} to ${label} cable: drag to repatch`}
                  onPointerDown={(event) => startDrag(event, patch.env, destination)}
                  onClick={() => setSelected(keyOf(patch))}>{patch.env < 2 ? patch.env + 1 : patch.env === 2 ? "X" : "Y"}</button>)}
            </div>
          </div>; })}
        </div>
      </div>
      <div className="m8-cable-controls">
        <select aria-label="Cable to adjust" value={active ? keyOf(active) : ""}
          onChange={(event) => setSelected(event.target.value)} disabled={!active}>
          {!active && <option value="">No cables</option>}
          {patches.map((patch) => <option key={keyOf(patch)} value={keyOf(patch)}>
            {sourceName(patch.env)} → {destinations[patch.destination]}
          </option>)}
        </select>
        {active && <>
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

const controlSymbols = {
  sawtooth: "M2 18 L12 3 L12 18 L22 3",
  square: "M2 18 V4 H12 V18 H22 V4",
  triangle: "M2 17 L7 4 L17 17 L22 4",
  sine: "M2 11 C5 -1 9 -1 12 11 S19 23 22 11",
  lowpass: "M2 5 H11 L22 18", highpass: "M2 18 L13 5 H22",
  bandpass: "M2 18 L9 5 H15 L22 18", noise: "M2 12 L5 5 L8 18 L11 8 L14 15 L17 3 L20 18 L22 9",
};

function AnalogSwitch({ label, value, options, onChange, symbols = false }) {
  const selected = options.indexOf(value);
  return <div className="m8-analog-switch">
    <span className="m8-switch-label">{label}</span>
    <div className="m8-switch-assembly" style={{"--positions": options.length, "--selected": selected}}>
      <div className="m8-switch-slot" aria-hidden="true"><span /></div>
      <div className="m8-switch-positions" role="radiogroup" aria-label={label}>
        {options.map((option, index) => <button type="button" key={option} role="radio" aria-checked={value === option}
          aria-label={option} title={option} onClick={() => onChange(option)}
          onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 :
                (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
              onChange(options[next]); event.currentTarget.parentElement.children[next].focus();
            }
          }}>
          {symbols ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d={controlSymbols[option]} /></svg> : option}
        </button>)}
      </div>
    </div>
  </div>;
}
function WaveSwitch(props) { return <AnalogSwitch label="WAVE" symbols {...props} />; }
function FootSwitch(props) { return <AnalogSwitch {...props} />; }

function Knob({ label, value, min=0, max=1, step=0.01, onChange, size="medium", ariaLabel, disabled=false }) {
  const percent = (value - min) / (max - min);
  const angle = -135 + percent * 270;
  return <div className={`m8-knob m8-knob--${size} ${disabled ? "is-disabled" : ""}`}>
    <div className="m8-knob-dial">
      <svg className="m8-knob-scale" viewBox="0 0 64 64" aria-hidden="true">
        {Array.from({length: 11}, (_, i) => <path key={i} d="M32 2 V8" transform={`rotate(${-135+i*27} 32 32)`} />)}
      </svg>
      <div className="m8-knob-cap" style={{transform:`rotate(${angle}deg)`}}><span /></div>
      <input disabled={disabled} aria-label={ariaLabel || label} type="range" min={min} max={max} step={step} value={value}
        onChange={(e)=>onChange(parseFloat(e.target.value))} />
    </div>
    <div className="m8-knob-label">{label}</div>
    <div className="m8-knob-value">{step<1?value.toFixed(2):Math.round(value)}</div>
  </div>;
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
  const k = 1 + amount * 2;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}
