export type VideoSource = 'typography' | 'sampling' | 'grid' | 'vertex' | 'feedback';
export type VideoModule = Exclude<VideoSource, 'typography'>;
export type VideoTarget = VideoModule | 'canvas';
export type VideoPatch = { source: VideoSource; target: VideoTarget };
export const videoModules: readonly VideoModule[] = ['sampling', 'grid', 'vertex', 'feedback'];
/** Only expose ordering when every cable belongs to one complete, acyclic chain. */
export function readVideoChain(patches: readonly VideoPatch[]): VideoModule[] | null {
  if (!patches.length) return null;
  const chain: VideoModule[] = [], seen = new Set<VideoSource>();
  let source: VideoSource = 'typography';
  while (!seen.has(source)) {
    seen.add(source);
    const outgoing = patches.filter(p => p.source === source);
    if (outgoing.length !== 1) return null;
    const target = outgoing[0].target;
    if (target === 'canvas') return patches.length === chain.length + 1 ? chain : null;
    chain.push(target); source = target;
  }
  return null;
}
export function writeVideoChain(chain: readonly VideoModule[]): VideoPatch[] {
  if (new Set(chain).size !== chain.length || chain.some(m => !videoModules.includes(m))) throw new Error('Invalid video chain.');
  const sources: VideoSource[] = ['typography', ...chain];
  return sources.map((source, i) => ({ source, target: chain[i] || 'canvas' }));
}
export function moveVideoModule(chain: readonly VideoModule[], from: number, to: number): VideoModule[] {
  if (from < 0 || to < 0 || from >= chain.length || to >= chain.length) return [...chain];
  const next = [...chain], [module] = next.splice(from, 1); next.splice(to, 0, module); return next;
}
