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
    id: "REC-06",
    slug: "ascii-kinetic-typo-machine",
    title: "ASCII Kinetic Typo Machine",
    kind: "tool",
    status: "test",
    year: "2026",
    tags: ["ascii", "kinetic type", "wave"],
    summary: "A text-to-ASCII typographic machine with animated wave distortion and export.",
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
    id: "REC-04",
    slug: "noise-built-type",
    title: "Noise-Built Type",
    kind: "experiment",
    status: "test",
    year: "2026",
    tags: ["particle type", "noise", "interaction"],
    summary: "A particle-built typographic field with noise modes and pointer forces.",
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
