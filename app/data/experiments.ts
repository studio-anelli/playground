export type ExperimentStatus = "draft" | "test" | "public" | "archived";

export type Experiment = {
  id: string;
  slug: string;
  title: string;
  kind: "experiment" | "tool" | "study";
  status: ExperimentStatus;
  year: string;
  tags: string[];
  summary: string;
};

export const experiments: Experiment[] = [
  {
    id: "REC-09",
    slug: "kinetic-type-synth",
    title: "Kinetic Type Synth",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["kinetic type", "grid distortion", "feedback"],
    summary: "A modular kinetic-type synthesizer combining sampling, grid distortion, generated shapes and wave routing.",
  },
  {
    id: "REC-08",
    slug: "micro-8-synth",
    title: "Micro-8 Synth",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["sound", "synthesizer", "sequencer"],
    summary: "A dual-VCO subtractive synth with an eight-step sequencer, accents, slide and overdrive.",
  },
  {
    id: "REC-07",
    slug: "reactive-letter-particles",
    title: "Reactive Letter Particles",
    kind: "experiment",
    status: "test",
    year: "2026",
    tags: ["particle type", "collision", "interaction"],
    summary: "Glyph-constrained particles repel, collide, grow, split and shift colour.",
  },
  {
    id: "REC-06",
    slug: "ascii-kinetic-typo-machine",
    title: "ASCII Kinetic Typo Machine",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["ascii", "kinetic type", "wave"],
    summary: "A type-or-image ASCII machine with animated wave distortion and export.",
  },
  {
    id: "REC-05",
    slug: "gp888-drum-machine",
    title: "GP888 Drum Machine",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["sound", "sequencer", "web audio"],
    summary: "An eight-track 8-bit drum machine with sequencing, swing and per-track crushers.",
  },
  {
    id: "REC-03",
    slug: "font-drawing",
    title: "Font Drawing",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["type design", "24×24 grid", "local save"],
    summary: "A block-letter editor with carving, portals, preview and saved alphabets.",
  },
  {
    id: "REC-02",
    slug: "type-distorter",
    title: "Particle Type Distorter",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["particle type", "interaction", "render"],
    summary: "A particle-based type distortion tool with custom fonts and video export.",
  },
  {
    id: "REC-01",
    slug: "kinetic-composer",
    title: "Kinetic Composer",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["kinetic type", "canvas", "render"],
    summary: "A layered kinetic-typography composer with replicators and video rendering.",
  },
];

export const statusOrder: ExperimentStatus[] = ["draft", "test", "public", "archived"];
