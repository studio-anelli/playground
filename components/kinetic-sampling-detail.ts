import type { VideoPatch, VideoSource } from "./kinetic-video-chain";
/** Compensate sampling before a magnifying Position node on a route to Canvas. */
export function samplingDetailScale(node: VideoSource, patches: readonly VideoPatch[], gridOn: boolean, scale: number): number {
  if (!gridOn || !(scale > 1)) return 1;
  const walk = (source: VideoSource, seen: Set<VideoSource>, factor: number): number => {
    if (seen.has(source)) return 0;
    const next = new Set(seen); next.add(source);
    let best = 0;
    for (const patch of patches.filter(p => p.source === source)) {
      const multiplier = patch.target === "grid" ? Math.min(2, scale) : 1;
      const current = factor * multiplier;
      best = Math.max(best, patch.target === "canvas" ? current : walk(patch.target, next, current));
    }
    return best;
  };
  return Math.max(1, Math.min(2, walk(node, new Set(), 1)));
}
