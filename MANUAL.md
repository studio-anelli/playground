# Playground Manual

Version 1.0 — 14 September 2026

Repository: [studio-anelli/playground](https://github.com/studio-anelli/playground)  
Public site: [playground.om-voyeur.fr](https://playground.om-voyeur.fr)

## Purpose

Playground is Anelli Studio's evolving space for typography, graphic systems, interaction, image, motion, sound, and code.

It is not a conventional portfolio or a collection of case studies. Entries may be experiments, reusable graphic tools, or focused visual studies. Work can remain unfinished when the question, behaviour, or method is worth preserving.

## Source of truth

The GitHub repository is canonical. Conversation history, ZIP files, local previews, and generated artifacts are not substitutes for committed source.

The standard workflow is:

1. Christian requests a change in ChatGPT.
2. ChatGPT creates a dedicated GitHub branch.
3. The change is implemented and checked without altering `main`.
4. A pull request generates a Cloudflare preview.
5. Christian approves or rejects the preview in conversation.
6. ChatGPT merges an approved pull request.
7. Cloudflare deploys `main` to the public domain.

Direct commits to `main` are reserved for explicitly requested, low-risk corrections.

## Entry types

| Type | Meaning |
| --- | --- |
| `experiment` | A self-contained visual or interactive investigation. |
| `tool` | A reusable graphic instrument with meaningful input or export. |
| `study` | A smaller visual, typographic, motion, or behavioural test. |

## States

| State | Visibility | Meaning |
| --- | --- | --- |
| `draft` | Working branch | Actively being made; instability is expected. |
| `test` | Preview or direct URL | Stable enough to review or share, but not presented as final. |
| `public` | Live and indexed | Approved canonical version. |
| `archived` | Preserved | Retained in history or at a direct route but removed from the index. |

Only entries intentionally marked `public` should be treated as finished public work.

## Working instructions

These words are convenient shorthand, not rigid syntax. Ordinary language is equally valid.

| Instruction | Effect |
| --- | --- |
| `START` | Create a new experiment from the standard pattern without altering existing work. |
| `OPEN` | Select an existing experiment as the current target. |
| `ITERATE` | Modify the current direction while preserving its identity. |
| `FORK` | Preserve the current direction and explore a substantial alternative on a separate branch. |
| `COMPARE` | Explain or present the meaningful differences between alternatives. |
| `PREVIEW` | Build and expose a non-production version for review. |
| `KEEP` | Select the preferred direction without publishing it. |
| `PUBLISH` | Merge an approved version and, when relevant, mark it public in the index. |
| `UNPUBLISH` | Remove an entry from the public index without deleting its source or history. |
| `ARCHIVE` | Preserve an entry while removing it from active circulation. |
| `ROLLBACK` | Restore a named earlier version after identifying what will be replaced. |
| `EXPORT` | Add or generate an appropriate output format. |
| `STATUS` | Report the active target, branch, state, known issues, and next decision. |

A fork is appropriate when a request such as “try another direction” would substantially replace the existing visual idea. Small adjustments remain normal iterations.

## Technical foundation

- React 19 and TypeScript
- Vinext with Vite
- Tailwind CSS
- Cloudflare Workers and Workers Builds
- GitHub branches and pull requests for previews

Current deployment commands:

```bash
pnpm build
pnpm exec wrangler deploy
```

The Worker entry point is `vinext/server/fetch-handler`, configured in `wrangler.jsonc`.

## Repository structure

```text
playground/
├── app/                  shared pages, routes, metadata, and styles
├── components/           native React experiments and shared interface
├── public/experiments/   isolated compiled experiment applications
├── recovered/            preserved source from imported experiments
├── MANUAL.md             this operating protocol
├── README.md             repository introduction and setup
└── wrangler.jsonc        Cloudflare Worker configuration
```

Each experiment should have:

- a stable slug and route;
- one authoritative metadata record;
- an explicit type and state;
- isolated behaviour that does not break other entries;
- source or a clearly documented preserved build;
- a permanent identity even when its title changes.

## Current collection

| ID | Entry | Type | State |
| --- | --- | --- | --- |
| REC-01 | Kinetic Composer | tool | test |
| REC-02 | Particle Type Distorter | tool | test |
| REC-03 | Font Drawing | tool | test |
| REC-05 | GP888 Drum Machine | tool | test |
| REC-06 | ASCII Kinetic Typo Machine | tool | test |
| REC-07 | Reactive Letter Particles | experiment | test |
| REC-08 | Micro-8 Synth | tool | test |
| REC-09 | Kinetic Type Synth | tool | test |

Provisional `REC-` identifiers remain stable until a deliberate public-numbering decision is made.

## Safeguards

- Do not edit `main` before a preview when a change affects behaviour or appearance.
- Keep experiments isolated so one experiment cannot break another.
- Preserve the original source of imported experiments.
- Never commit credentials, environment files, dependency folders, or build output.
- Verify desktop and touch behaviour where interaction differs.
- Label desktop-only behaviour explicitly.
- Give controls meaningful labels and keyboard behaviour where applicable.
- Respect reduced-motion preferences where motion is nonessential.
- Use only cleared fonts, images, audio, and client-derived material.
- Record known limitations instead of hiding them.
- Confirm a production build before merging.

### Font Drawing

Font Drawing stores user-created alphabets locally in the browser. Changes must preserve saved alphabets and JSON import/export compatibility. Any data migration must be tested against an existing saved alphabet before publication.

### Sound and recording

Audio must begin through a user gesture where browsers require it. Recording and export features must fail clearly when a codec or browser capability is unavailable.

## Completion criteria

A reviewable iteration:

- builds without blocking errors;
- preserves unrelated experiments;
- has a clear branch and target;
- can be tested at its intended viewport;
- documents known limitations.

A public experiment:

- has complete metadata;
- works on its declared desktop and mobile targets;
- provides reset behaviour where relevant;
- has intentional loading and failure states;
- contains cleared assets;
- is reachable from the index and its permanent URL.

## Maintenance

Update this manual only when the workflow, architecture, safeguards, or collection materially changes. Keep detailed implementation notes with their experiment rather than expanding this shared document indefinitely.
