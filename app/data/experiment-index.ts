type ExperimentIndexDetails = {
  description: string;
  created: string;
} & ({ lastUpdated: string; archived?: never } | { archived: string; lastUpdated?: never });

// Dates track the introduction and subsequent updates or archival in Playground.
export const experimentIndexDetails: Record<string, ExperimentIndexDetails> = {
  "cell-field": { description: "Compose fields of cells that grow, merge and reshape.", created: "2026-11-18", lastUpdated: "2026-11-18" },
  "grid-delay-machine": { description: "Delay and warp moving type through a grid.", created: "2026-11-12", lastUpdated: "2026-11-14" },
  "music-that-travels": { description: "Discover where a record collection connects.", created: "2026-11-07", lastUpdated: "2026-11-13" },
  "durf-dots": { description: "Compose moving patterns from a field of dots.", created: "2026-11-05", lastUpdated: "2026-11-17" },
  "k-tic-synth": { description: "Patch waves together to animate typography.", created: "2026-10-08", lastUpdated: "2026-10-31" },
  "micro-8-synth": { description: "Shape and sequence sounds on a small synth.", created: "2026-09-15", lastUpdated: "2026-10-07" },
  "reactive-letter-particles": { description: "Let particles collide and grow inside letters.", created: "2026-09-15", lastUpdated: "2026-10-08" },
  "gp888-drum-machine": { description: "Build rhythms with eight digital drum voices.", created: "2026-09-12", lastUpdated: "2026-10-08" },
  "font-drawing": { description: "Draw letters by carving a modular grid.", created: "2026-09-12", lastUpdated: "2026-10-07" },
  "kinetic-type-synth": { description: "Modulate type through sampling and distortion.", created: "2026-09-15", archived: "2026-11-12" },
  "ascii-kinetic-typo-machine": { description: "Turn type and images into moving ASCII.", created: "2026-09-12", archived: "2026-11-12" },
  "kinetic-composer": { description: "Compose kinetic type in layers and patterns.", created: "2026-09-12", archived: "2026-11-12" },
};
