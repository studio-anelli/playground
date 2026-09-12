# Anelli Prototype Platform

**Phase 0 manual and seed inventory**  
Version 0.5 — 12 September 2026  
Public name: **to be decided**  
Working repository name: `anelli-prototypes`

## 1. Premise

This platform is the experimental counterpart to Anelli Studio: an evolving online space for typography, graphic systems, interaction, image, motion, sound, and code.

Its central promise is simple:

> Here we prototype.

ChatGPT is the primary working environment. Ideas are discussed, coded, tested, and iterated here. The website is the public output layer: it presents approved experiments and tools without requiring Christian to rebuild them manually in a CMS.

The platform is not a second portfolio. It may contain unfinished work, strange tests, useful instruments, abandoned branches, and visible iterations.

## 2. What belongs here

An entry belongs when it does at least one of the following:

- tests a typographic, graphic, spatial, sonic, or interactive idea;
- turns a visual method into a reusable instrument;
- exposes variables that normally remain hidden in a finished design;
- records a meaningful design iteration;
- allows a visitor to make, alter, or export something;
- develops a client-project technique far enough to have an independent life.

It does **not** need to be commercially useful or fully resolved.

What does not belong:

- conventional case studies;
- ordinary client pages;
- static work included only to fill the archive;
- experiments whose client material cannot be shown;
- a polished result with no visible question, behaviour, or method.

## 3. Entry types and states

### Types

| Type | Meaning |
| --- | --- |
| `experiment` | A self-contained visual or interactive investigation. |
| `tool` | A reusable graphic instrument with meaningful input or export. |
| `study` | A smaller visual, typographic, motion, or behavioural test. |

An entry can begin as a study and later become a tool.

### States

| State | Visibility | Meaning |
| --- | --- | --- |
| `draft` | local or working preview | Actively being made; instability is expected. |
| `test` | direct preview URL | Stable enough to review or share, but absent from the public index. |
| `public` | live and indexed | Approved canonical version. |
| `archived` | direct URL only | Preserved, but removed from the public index. |

Only `public` entries appear in the main index.

## 4. Identity and naming

“Lab” is useful internally but too obvious to assume as the final public name. Naming should follow the first working experiments, not precede them.

The eventual name should feel:

- active rather than institutional;
- open-ended but not vague;
- connected to making, testing, systems, or instruments;
- credible next to Anelli Studio without sounding like a service category;
- short enough to function as a domain and interface label.

Until the identity emerges:

- project descriptor: **prototype platform**;
- working repository: `anelli-prototypes`;
- likely first address: a subdomain of `anelli.studio`;
- public-facing name: postponed until at least three experiments exist.

No separate domain should be purchased during Phase 0.

## 5. Technical principles

The platform should optimise for safe iteration from ChatGPT.

1. **Code-first and file-based.** No CMS is required for experiment code.
2. **One repository is the source of truth.** The conversation is not the archive.
3. **Experiments remain isolated.** A change to one should not break another.
4. **Shared shell, independent canvas.** Navigation and metadata are consistent; visual behaviour is free.
5. **Preview before publication.** Reviewable versions exist before becoming public.
6. **History is preserved.** Meaningful alternatives are forked or versioned rather than overwritten blindly.
7. **Dependencies stay proportionate.** The platform shell remains lightweight; individual experiments may add libraries only when justified.
8. **Export is intentional.** PNG, SVG, PDF, JSON, or CSS export is added only when it makes the experiment useful.
9. **Desktop and mobile behaviour are explicit.** Interaction should not silently disappear on touch devices.
10. **Accessibility is part of the prototype.** Controls need labels, keyboard behaviour where relevant, and motion-reduction handling.

### Provisional stack

- Astro for the archive shell and route generation;
- HTML, CSS, SVG, Canvas, and vanilla JavaScript by default;
- small framework islands only where state or interaction warrants them;
- Git repository connected to automatic preview and production deployments;
- static hosting on a free tier initially;
- `lab.anelli.studio` or another temporary Anelli subdomain until naming is resolved.

The final hosting provider and domain are Phase 1 decisions, not Phase 0 commitments.

## 6. Provisional repository structure

```text
anelli-prototypes/
├── MANUAL.md
├── README.md
├── public/
│   ├── fonts/
│   ├── images/
│   └── media/
├── src/
│   ├── components/
│   ├── layouts/
│   ├── styles/
│   └── experiments/
│       └── 001-example/
│           ├── experiment.*
│           ├── styles.css
│           ├── logic.js
│           ├── metadata.json
│           └── assets/
└── archive/
    └── retired-or-reference-material/
```

The exact file extensions may change with the stack. The separation between shared shell, individual experiments, assets, and archived material should remain.

## 7. Entry metadata

Every entry has one authoritative metadata record.

```json
{
  "id": "XXX",
  "slug": "typographic-physics",
  "title": "Typographic Physics",
  "type": "experiment",
  "status": "draft",
  "dateCreated": "2025-10-21",
  "dateUpdated": "2026-09-12",
  "tags": ["typography", "physics", "interaction"],
  "summary": "Soft letterforms respond to gravity, wind, and direct manipulation.",
  "credits": [],
  "sourceContext": "Built in the REACT ChatGPT project; source recovery pending.",
  "featured": false
}
```

IDs are permanent. Titles, slugs, status, and descriptions may evolve. Removing an entry must not cause later IDs to be renumbered.

## 8. Christian ↔ ChatGPT instruction protocol

These instructions are conversational commands, not rigid syntax. Christian can use them alone or add normal-language direction.

| Instruction | Effect |
| --- | --- |
| `START` | Create a new experiment from the standard template and assign the next unused ID. Existing experiments remain untouched. |
| `OPEN 00X` | Load the specified experiment as the current working target. |
| `ITERATE` | Modify the current working version while preserving its identity. |
| `FORK` | Preserve the current direction and create an explicit alternative. |
| `COMPARE` | Present specified versions side by side or explain their meaningful differences. |
| `PREVIEW` | Produce or update a reviewable non-public build. |
| `KEEP` | Mark the current direction as canonical within the experiment without publishing it. |
| `PUBLISH` | Promote the approved canonical version to `public` and update the index. |
| `UNPUBLISH` | Return a public entry to `test` without deleting it. |
| `ARCHIVE` | Preserve the entry and its URL while removing it from the index. |
| `ROLLBACK` | Restore a named earlier working version after showing what will be replaced. |
| `EXPORT` | Add or generate a specified output format when technically appropriate. |
| `STATUS` | Report the current experiment, version, state, known issues, and next decision. |

### Example

```text
OPEN 002
FORK
Keep the larger dot grid, but make dot size respond more abruptly at the letter edges.
PREVIEW
```

### Interpretation rules

- If an instruction has no experiment number, it applies to the clearly active experiment.
- If the active target is ambiguous, ChatGPT must ask before editing.
- `ITERATE` may change code but not the experiment ID or public status.
- `FORK` must preserve the previous direction in retrievable form.
- `PUBLISH` requires a working build and a named approved version.
- `ROLLBACK`, `UNPUBLISH`, and `ARCHIVE` require an explicit target.
- “Try” or “what if” normally means `FORK` when the change would substantially replace the current visual idea.
- ChatGPT should state which files and behaviours changed after a material iteration.

## 9. Definition of done

### A working iteration

- runs without blocking errors;
- preserves unrelated experiments;
- has a clear current version;
- is reviewable at the intended viewport;
- records known limitations rather than hiding them.

### A public experiment

- has complete metadata;
- works on current desktop and mobile browsers, or explicitly declares a desktop-only requirement;
- has usable controls and reset behaviour where relevant;
- respects reduced-motion preferences where relevant;
- contains only cleared fonts, images, audio, and client material;
- has an intentional loading and failure state;
- is reachable from the index and by permanent URL.

## 10. Recovered seed inventory

The inventory separates what is genuinely recovered from what merely exists as an idea.

### Recovery labels

| Label | Meaning |
| --- | --- |
| **Built / source available** | Working behaviour and source files are both available locally. |
| **Built / source pending** | The project history confirms a working Canvas prototype, but its source has not been materialised into the current workspace. |
| **Visual source recovered** | Image or design iterations exist, but no interactive implementation is confirmed. |
| **Concept only** | A direction was discussed but no working implementation is confirmed. |
| **Rejected reference** | Something was attempted but should not enter the initial collection. |

Moving this conversation into the REACT project recovered useful conversation history. It did **not** automatically materialise the source code from older ChatGPT Canvas artifacts into the current workspace. The inventory therefore distinguishes historical build evidence from locally runnable code.

### Imported seed — Kinetic Composer

**Recovery status:** **built / source available**.  
**Provisional platform ID:** `REC-01`; final public numbering remains postponed.  
**Type:** tool.

Kinetic Composer was supplied as a complete Vite/React project on 12 September 2026 and imported without overwriting the original package. It provides an 1800 × 550 Canvas composition surface with:

- animated text layers driven by waveform, amplitude, frequency, phase, size, colour, alignment, offset, stroke, and spacing controls;
- radial, linear, and grid replicators;
- layer creation, selection, renaming, visibility, locking, duplication, deletion, and drag reordering;
- playback and reduced-motion controls;
- configurable resolution, frame rate, duration, and MP4/WebM recording through MediaRecorder.

The original TypeScript source contains extensive incomplete typing, so its `tsc` validation currently fails. The application itself compiles successfully through Vite and has been integrated as an isolated static build. Type repair should remain a separate iteration rather than being mixed into the initial import.

### Imported seed — Particle Type Distorter

**Recovery status:** **built / source available**.  
**Provisional platform ID:** `REC-02`; final public numbering remains postponed.  
**Type:** tool.

Particle Type Distorter was supplied as a complete Vite/React project on 12 September 2026 and imported without overwriting the original package. Its Canvas system converts editable typography into animated particles and provides:

- word, system-font, weight, style, size, and tracking controls;
- custom font loading through the browser FontFace API;
- noise, particle, vector-field, mouse, heatmap, colour, and background controls;
- multiple distortion and colour presets;
- particle density, threshold, jitter, size, shape, outline, curl, strength, and return behaviour;
- 1920 × 1080 MP4/WebM recording at 30 or 60 FPS through MediaRecorder.

The application compiles successfully through Vite. Its strict TypeScript build currently stops on one unused `StrictMode` import in `main.tsx`; this minor source repair is intentionally deferred so the preserved import remains unchanged.

### Imported seed — Font Drawing

**Recovery status:** **built / source available**.  
**Provisional platform ID:** `REC-03`; final public numbering remains postponed.  
**Type:** tool.

Font Drawing was supplied as a single React component on 12 September 2026. The original pasted source is preserved unchanged and a separate runnable wrapper was created for the platform. The tool provides:

- a 24 × 24 editor for all letters A–Z;
- separate carving and portal drawing modes;
- black-and-white and colour views, layer visibility, and grid display;
- an alphabet preview strip and transformed preview;
- independent vertical shift, minimum, and maximum controls for carving and portals;
- local browser autosave, a rolling backup, JSON export/import, and backup restoration.

Data persistence is part of this experiment’s definition of done. Future iterations must preserve stored alphabets, maintain import/export compatibility, and avoid destructive migrations. The prior loss of drawing work must not be repeated.

### Seed A — Typographic Physics

**Recovery status:** **built / source pending**.  
**Numbering:** postpone until source recovery.  
**Type:** experiment, possibly later a tool.

Letters behave as soft bodies in a React canvas with no external dependencies. Recovered behaviours include:

- gravity, friction, springiness, wind, font-size, FPS, and wrap controls;
- direct dragging and tossing of individual letters;
- clicking the background to create a gust;
- Calm, Anxious, and Ecstatic presets;
- PNG export and diagnostics.

Why it is a strong first technical proof: it was genuinely built in the REACT project, is self-contained, immediately interactive, and tests nearly the entire workflow—controls, responsive canvas, state, presets, and export.

First task: search for the original code. If unavailable, reconstruct the minimum working version from the recovered specification before extending it.

### Seed B — Sonic Grid / Typo Synth

**Recovery status:** **built / source pending**.  
**Numbering:** postpone until source recovery.  
**Type:** experiment, possibly later a tool.

This was built in the REACT project as a dependency-free React/WebAudio prototype. Recovered behaviours include:

- a step-sequenced grid of letters;
- Start Audio and Play controls;
- cell toggles and hover audition;
- root, scale, tempo, and swing controls;
- waveform, filter, delay, feedback, envelope, and gain controls;
- visible playhead feedback;
- JSON save/load and diagnostics.

The sequencer initially failed, then received fixes to reactive pattern state, playhead behaviour, and syntax. This history matters: the first recovered run should verify timing and state rather than assuming the last Canvas version was stable.

The earlier manual incorrectly classified Sonic Grid as a concept and mentioned Tone.js. The recovered project history supersedes that: the built version used the WebAudio API with no external dependency.

First task: locate or faithfully reconstruct the last patched version and test audio start, sequencing, state updates, and browser gesture requirements.

### Seed C — Sankey Playground

**Recovery status:** **built / source pending; full source was supplied in the original REACT conversation**.  
**Numbering:** postpone until source recovery.  
**Type:** tool.

This React experiment used `d3` and `d3-sankey` to make an editable A5-landscape Sankey diagram. Recovered requirements and iterations include:

- vertical node dragging with live link updates;
- adding nodes and flows;
- selecting, editing, and deleting links;
- per-flow colours;
- inline node renaming and deletion;
- connected-flow removal and reindexing after node deletion;
- optional label backgrounds for accessibility;
- comma-formatted values;
- PNG export;
- boundary-safe layout and overflow protection requested during recovery.

This is the seed with the strongest evidence that full source once existed because Christian pasted the component into the project. It is also more application-like than the other seeds. Its eventual public role should be decided after recovery: general graphic instrument, private practice tool, or reference implementation.

### Seed D — DURF Dot Type

**Recovery status:** several generated visual iterations recovered; interactive code not yet confirmed.  
**Numbering:** postpone until source recovery.  
**Type:** study evolving into a tool.

The recovered direction uses pale circular dots on a saturated coral-red ground to construct the letters DURF. Dot size varies across strokes and edges, producing a grid/halftone letterform. Earlier iterations explicitly tested smaller and larger grids.

First interactive variables:

- text input;
- grid density;
- minimum and maximum dot size;
- edge falloff or threshold;
- typeface and weight used as the source mask;
- foreground and background colours;
- SVG and PNG export.

This seed has clear visual ownership and direct relevance to current Anelli Studio work. Before publication, determine whether DURF-specific client material should remain a private source study or be generalised into an independent dot-type instrument.

### Seed E — CEOS Responsive Mark

**Recovery status:** visual/behavioural concept recovered; some site animations existed, but a standalone prototype has not been recovered.  
**Numbering:** postpone until source recovery.  
**Type:** study.

The CEOS four-part circular mark was conceived as a responsive system rather than a static logo. Related behaviours developed for the site include alternating petal pairs, hover opening, and a small elastic return.

A standalone study could expose:

- paired opening sequences: 1–3 and 2–4;
- hover, cursor-distance, scroll, or timed activation;
- amplitude, delay, elasticity, and return-distance variables;
- single mark, repeated field, and grid modes.

This is viable only after checking what can be separated from the client identity and shown publicly. It should not automatically become an open generator.

### Seed F — Generative Poster Grid

**Recovery status:** concept recovered; implementation not confirmed.  
**Numbering:** reserve; do not number yet.  
**Type:** tool.

A rule-based poster generator combining typographic blocks, words, and colour. Proposed behaviours include locking selected regions while randomising others and exporting PNG or SVG.

This is strategically strong because it could become useful in Christian’s own practice. It should follow the dot-type seed, which will establish reusable controls and export patterns.

### Reference interaction — Caroline Girardot-Bijnen

**Recovery status:** live-site interaction logic and specification recovered.  
**Classification:** reference pattern, not currently a numbered lab entry.

Recovered behaviours include fullscreen autoplay video, delayed name and ENTER overlays, explicit sound enabling, uninterrupted video during the transition into navigation, URL state via `?entered=1`, and stopping video sound when media leaves the viewport.

This is valuable as a pattern library for time, state, sound, and transition logic. It is currently too tied to a client website to count as an independent experiment without a new conceptual frame.

### Rejected reference — Feedback Mirror

**Recovery status:** **built / source pending, then explicitly rejected**.  
**Classification:** excluded from the initial collection.

Feedback Mirror was a single-file React webcam experiment with feedback trails, grid displacement, motion-triggered labels, monochrome/duotone modes, controls, PNG export, a Request Access flow, and diagnostics. Repeated desktop-app camera/access failures prevented it from working reliably. Christian then chose to leave the webcam direction and try a different experiment.

It may remain useful as a record of an unsuccessful technical route, but it should not be rebuilt or presented as an initial experiment.

### Other recalled concepts

Micro Archipelago, Neural Moodboard, and Dream Console remain unverified ideas and should not be represented as recovered prototypes.

## 11. Initial recovery order

Final public numbering remains postponed until we know what can actually run. Recovery should proceed in this order:

| Priority | Entry | Reason for order |
| --- | --- | --- |
| 1 | Kinetic Composer | Source is available and the isolated production build succeeds; use it to prove the import and publishing workflow. |
| 2 | Particle Type Distorter | Source is available and the isolated production build succeeds; second real platform import. |
| 3 | Font Drawing | Source and persistence logic are available; first imported tool with durable user-created data. |
| 4 | Typographic Physics | Strong expression of the platform premise and next source-recovery target. |
| 5 | Sonic Grid / Typo Synth | A genuine REACT build; expands the platform into sound and tests browser-state complexity. |
| 6 | Sankey Playground | Full component source once existed; potentially useful as an independent graphic instrument. |
| 7 | DURF Dot Type | Current visual direction with a clear path from study to export tool. |
| 8 | CEOS Responsive Mark | Compact motion-system study, subject to client-material clearance. |

Generative Poster Grid remains a concept-only backlog candidate. Feedback Mirror stays excluded.

## 12. Cost boundary

Phase 0 should create no new recurring cost.

The initial target is:

- existing Git hosting or a free private repository;
- free-tier static deployment and previews;
- a subdomain under `anelli.studio`;
- no database, paid CMS, or always-on backend;
- existing or open-source fonts unless a licensed webfont is intentionally added.

Possible later costs include a standalone domain, paid analytics, storage or bandwidth for heavy media, server-side processing, commercial type licences, or usage-based AI services. None is required for the first proof of concept.

## 13. Phase 0 decisions and open questions

### Decided

- ChatGPT is the main iteration and coding environment.
- The public website is the output layer.
- The system is file-based, versioned, and preview-first.
- The manual lives with the code and evolves with the platform.
- The public name will emerge from the work.
- Existing experiments should be recovered before inventing a full launch collection.
- A CMS and separate paid domain are unnecessary at the beginning.

### Still open

- Can the old ChatGPT Canvas source for Typographic Physics, Sonic Grid, and Sankey Playground be exported or otherwise recovered?
- Did the last Sonic Grid patch fully solve sequencing and playhead state?
- Should Sankey Playground be public, kept as a private practice tool, or reframed before inclusion?
- Which DURF source assets and client-derived elements are clear for public use?
- How much of the CEOS mark system can be shown independently?
- Which Git host and deployment provider will be used?
- What temporary subdomain should be connected?
- Should source code be public, private, or decided entry by entry?

## 14. Immediate next step

Phase 1 begins with **Kinetic Composer, Particle Type Distorter, and Font Drawing as proofs of the import workflow**, not with assigning final public numbers or designing a finished identity.

1. Preserve the original Kinetic Composer source unchanged in `recovered/kinetic-composer-original/`.
2. Integrate its compiled application as an isolated experiment under the shared platform shell.
3. Give it provisional metadata without locking the public numbering.
4. Build and privately publish the platform foundation.
5. Make one visible Kinetic Composer iteration through `OPEN / FORK / PREVIEW / KEEP`.
6. Continue source recovery for Typographic Physics, Sonic Grid, and Sankey Playground.
7. Only after several real imports, choose the first public entries, identity, domain, and permanent IDs.

The success criterion is concrete:

> Christian can say “OPEN TYPOGRAPHIC PHYSICS — make the wind more abrupt — PREVIEW,” review the result, and publish or reject it without manually moving code between systems.

## 15. Manual maintenance

This is a living operational document.

- Update the version and date after a material workflow decision.
- Record settled decisions; do not preserve obsolete alternatives as if still active.
- Add new commands only when repeated work demonstrates a need.
- Update the seed inventory as code or source assets are found.
- Keep project-specific implementation notes inside the experiment, not in the shared manual.
- Review this manual before structural changes to the platform.
