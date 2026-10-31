export type VideoSource = 'typography' | 'typography2' | 'sampling' | 'grid' | 'vertex' | 'feedback';
export type VideoModule = Exclude<VideoSource, 'typography' | 'typography2'>;
export type VideoTarget = VideoModule | 'canvas';
export type VideoPatch = { source: VideoSource; target: VideoTarget };
export const videoModules: readonly VideoModule[] = ['sampling', 'grid', 'vertex', 'feedback'];
/** Only expose ordering when every cable belongs to one complete, acyclic chain. */
export function readVideoChain(patches: readonly VideoPatch[]): VideoModule[] | null {
  if (!patches.length) return null;
  const chain: VideoModule[] = [], seen = new Set<VideoSource>();
  let source: VideoSource = patches.some(p => p.source === 'typography') ? 'typography' : 'typography2';
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
export function writeVideoChain(chain: readonly VideoModule[], source: 'typography' | 'typography2' = 'typography'): VideoPatch[] {
  if (new Set(chain).size !== chain.length || chain.some(m => !videoModules.includes(m))) throw new Error('Invalid video chain.');
  const sources: VideoSource[] = [source, ...chain];
  return sources.map((source, i) => ({ source, target: chain[i] || 'canvas' }));
}
export function moveVideoModule(chain: readonly VideoModule[], from: number, to: number): VideoModule[] {
  if (from < 0 || to < 0 || from >= chain.length || to >= chain.length) return [...chain];
  const next = [...chain], [module] = next.splice(from, 1); next.splice(to, 0, module); return next;
}

/** Each video input composites up to two distinct sources. */
export function connectVideoPatch(patches: readonly VideoPatch[], source: VideoSource, target: VideoTarget): VideoPatch[] {
  const layers = patches.filter(p => p.target === target && p.source !== source);
  return [...patches.filter(p => p.target !== target), ...layers.slice(-1), { source, target }];
}

/** Read the route from one typography source, even if another route is present. */
export function readSourceVideoChain(patches: readonly VideoPatch[], root: 'typography' | 'typography2'): VideoModule[] | null {
  if(!patches.some(p=>p.source===root))return [];
  const chain:VideoModule[]=[],visited=new Set<VideoSource>();
  let current:VideoSource=root;
  while(!visited.has(current)){
    visited.add(current);
    const outgoing=patches.filter(p=>p.source===current);
    if(outgoing.length!==1)return null;
    const next=outgoing[0].target;
    if(next==='canvas')return chain;
    chain.push(next);current=next;
  }
  return null;
}
/** Reorder a typography route without deleting shared-module connections.
 *  A module is a single effect node that may receive both typography sources.
 *  A proposed route is rejected only when it would make an invalid/cyclic graph.
 */
export function writeSourceVideoChain(
  patches:readonly VideoPatch[],
  root:'typography'|'typography2',
  chain:readonly VideoModule[]
):VideoPatch[]{
  if(new Set(chain).size!==chain.length||chain.some(m=>!videoModules.includes(m)))
    throw new Error('A video chain can use each known module at most once.');
  const opposite=root==='typography'?'typography2':'typography';
  const current=readSourceVideoChain(patches,root);
  const other=readSourceVideoChain(patches,opposite);
  if(current===null||other===null)
    throw new Error('Custom branching cables are present. Disconnect them before using the ordered chain editor.');

  // Preserve outbound connections of modules removed from this route if Type 2
  // (or Type 1) also uses them. Replace every link on the requested route.
  const otherModules=new Set(other);
  const replaced=new Set<VideoSource>([
    root,
    ...chain,
    ...current.filter(m=>!otherModules.has(m))
  ]);
  const updated:VideoPatch[]=[
    ...patches.filter(p=>!replaced.has(p.source)),
    ...writeVideoChain(chain,root)
  ];
  const sources=new Set<string>();
  for(const p of updated){
    if(sources.has(p.source))throw new Error('A shared effect cannot send output to two different destinations. Simplify the other route first.');
    sources.add(p.source);
  }
  for(const target of [...videoModules,'canvas'] as VideoTarget[]){
    if(updated.filter(p=>p.target===target).length>2)
      throw new Error('Each effect input supports at most two incoming video connections.');
  }
  const next=readSourceVideoChain(updated,root);
  if(next===null||next.join('|')!==chain.join('|'))
    throw new Error('This order conflicts with the other typography chain or creates a feedback loop.');
  if(readSourceVideoChain(updated,opposite)===null)
    throw new Error('This order would create a loop in the other typography chain.');
  return updated;
}
