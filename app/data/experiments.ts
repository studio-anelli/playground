export type ExperimentStatus = "draft" | "test" | "public" | "archived";

export type Experiment = {
  id: string;
  slug: string;
  href?: string;
  title: string;
  kind: "experiment" | "tool" | "study";
  status: ExperimentStatus;
  year: string;
  tags: string[];
  summary: string;
};

const experimentCatalog: Experiment[] = [
  {
    id: "REC-13",
    slug: "grid-delay-machine",
    title: "GRID DELAY MACHINE",
    kind: "experiment",
    status: "test",
    year: "2026",
    tags: ["temporal sampling", "typography", "modulation"],
    summary: "An immersive instrument that samples moving type and images through independently delayed grid cells.",
  },
  {
    id: "REC-12",
    slug: "music-that-travels",
    href: "/experiments/music-that-travels/geography",
    title: "MUSIC THAT TRAVELS",
    kind: "study",
    status: "test",
    year: "2026",
    tags: ["music", "geography", "discovery"],
    summary: "Explore a personal record collection through musical origins, cultural connections and release markets.",
  },
  {
    id: "REC-11",
    slug: "durf-dots",
    title: "DURF / DOT SYSTEM",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["dot matrix", "generative graphics", "SVG / video"],
    summary: "A generative dot-field composer with patterns, pointer interaction, motion playback and SVG, PNG and video export.",
  },
  {
    id: "REC-10",
    slug: "k-tic-synth",
    title: "K-TIC-SYNTH",
    kind: "experiment",
    status: "public",
    year: "2026",
    tags: ["kinetic type", "patch bay", "wave modulation"],
    summary: "A patchable typography synth with three waves, sampling, grid distortion, vertex shapes and bi-colour mapping.",
  },
  {
    id: "REC-09",
    slug: "kinetic-type-synth",
    title: "K‑NET‑C",
    kind: "tool",
    status: "archived",
    year: "2026",
    tags: ["kinetic type", "grid distortion", "feedback"],
    summary: "A modular kinetic-type synthesizer combining sampling, grid distortion, generated shapes and wave routing.",
  },
  {
    id: "REC-08",
    slug: "micro-8-synth",
    title: "µMS20",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["sound", "synthesizer", "sequencer"],
    summary: "A dual-VCO subtractive synth with an eight-step sequencer, accents, slide and overdrive.",
  },
  {
    id: "REC-07-B",
    slug: "living-typography",
    title: "TY‑P0 / Living matter",
    kind: "experiment",
    status: "test",
    year: "2026",
    tags: ["living type", "membranes", "wave fields"],
    summary: "A fork of TY-P0: cohesive cellular letters bend and stretch through a shared wave field.",
  },
  {
    id: "REC-07",
    slug: "reactive-letter-particles",
    title: "TY‑P0",
    kind: "experiment",
    status: "test",
    year: "2026",
    tags: ["particle type", "collision", "interaction"],
    summary: "Glyph-constrained particles repel, collide, grow, split and shift colour.",
  },
  {
    id: "REC-06",
    slug: "ascii-kinetic-typo-machine",
    title: "A_SCII",
    kind: "tool",
    status: "archived",
    year: "2026",
    tags: ["ascii", "kinetic type", "wave"],
    summary: "A text-to-ASCII typographic machine with animated wave distortion and export.",
  },
  {
    id: "REC-05",
    slug: "gp888-drum-machine",
    title: "GP888",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["sound", "sequencer", "web audio"],
    summary: "An eight-track 8-bit drum machine with sequencing, swing and per-track crushers.",
  },
  {
    id: "REC-03",
    slug: "font-drawing",
    title: "LOW/FI WORLD",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["type design", "24×24 grid", "local save"],
    summary: "A block-letter editor with carving, portals, preview and saved alphabets.",
  },
  {
    id: "REC-02",
    slug: "type-distorter",
    title: "DUST",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["particle type", "interaction", "render"],
    summary: "A particle-based type distortion tool with custom fonts and video export.",
  },
  {
    id: "REC-01",
    slug: "kinetic-composer",
    title: "GR_D",
    kind: "tool",
    status: "archived",
    year: "2026",
    tags: ["kinetic type", "canvas", "render"],
    summary: "A layered kinetic-typography composer with replicators and video rendering.",
  },
];

// REC identifiers and source routes stay stable when an entry is archived.
export const archivedExperiments = experimentCatalog.filter((experiment) => experiment.status === "archived");
export const experiments = experimentCatalog.filter(
  (experiment) => experiment.status !== "archived" && experiment.slug !== "type-distorter"
);

export const statusOrder: ExperimentStatus[] = ["draft", "test", "public", "archived"];
