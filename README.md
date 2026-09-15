# Playground

An evolving collection of typography, graphic, sound, and interaction experiments by Anelli Studio.

Live site: [playground.om-voyeur.fr](https://playground.om-voyeur.fr)

## Experiments

- Kinetic Composer
- Particle Type Distorter
- Font Drawing
- Noise-Built Type
- GP888 Drum Machine
- ASCII Kinetic Typo Machine
- Reactive Letter Particles
- Micro-8 Synth

## Development

Requirements:

- Node.js 22.13 or newer
- pnpm 11

Run locally:

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
```

## Publishing workflow

The repository is the source of truth.

1. Create a branch for an experiment or platform change.
2. Implement and validate the change.
3. Open a pull request.
4. Review the Cloudflare preview.
5. Merge the approved pull request into `main`.
6. Cloudflare deploys `main` to the public site.

Working instructions and safeguards are documented in [MANUAL.md](./MANUAL.md).

## Structure

- `app/` — platform routes, experiment pages, metadata, and global styles
- `components/` — interactive React experiments and shared interface
- `public/experiments/` — isolated compiled experiment applications
- `recovered/` — preserved original or reconstructed source material
- `MANUAL.md` — operating protocol for continuing development

## Deployment

Cloudflare Workers Builds uses:

- Build command: `pnpm build`
- Deploy command: `pnpm exec wrangler deploy`
- Production branch: `main`

The Worker entry point is configured in `wrangler.jsonc`. No credentials or generated build output should be committed.
