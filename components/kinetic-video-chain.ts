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
/** Rebuild independent branches without stealing modules from the other type. */
export function writeSourceVideoChain(patches:readonly VideoPatch[],root:'typography'|'typography2', chain:readonly VideoModule[]):VideoPatch[]{
  const opposite=root==='typography'?'typography2':'typography';
  const other=readSourceVideoChain(patches,opposite);
  const current=readSourceVideoChain(patches,root);
  if(current===null)throw new Error('This Type route has branches. Disconnect manual cables before rebuilding the chain.');
  const expected=(patches.some(p=>p.source===root)?current.length+1:0)+(patches.some(p=>p.source===opposite)&&other!==null?other.length+1:0);
  if(expected!==patches.length)throw new Error('Additional manual video cables exist. Disconnect them before editing the independent chains.');
  if(other===null)throw new Error('The other route contains complex patching; simplify it before editing chains.');
  if(chain.some(m=>other.includes(m)))throw new Error('A module can belong to only one independent typography chain.');
  const updated=[...writeVideoChain(chain,root),...(patches.some(p=>p.source===opposite)?writeVideoChain(other,opposite):[])];
  return updated;
}
