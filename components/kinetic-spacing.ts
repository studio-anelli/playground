export type SampleSite = { x: number; y: number };
/** Keep existing coordinates; a spatial hash bounds neighbour checks for dense grids.
 * A spacing callback must return the same distance for all sites in each group. */
export function* spacedSites(sites: readonly SampleSite[], spacing: number | ((site: SampleSite) => number), group: (site: SampleSite) => string = () => ''): Generator<SampleSite> {
  if (typeof spacing === "number" && !(spacing > 0)) { yield* sites; return; }
  const groups = new Map<string, Map<string, SampleSite[]>>();
  for (const site of sites) {
    const distance = typeof spacing === "function" ? spacing(site) : spacing;
    if (!(distance > 0)) { yield site; continue; }
    const id = group(site); let cells = groups.get(id); if (!cells) { cells = new Map(); groups.set(id, cells); }
    const x = Math.floor(site.x / distance), y = Math.floor(site.y / distance); let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
      near = (cells.get(`${x + dx},${y + dy}`) || []).some(p => (site.x - p.x) ** 2 + (site.y - p.y) ** 2 < distance ** 2 - 1e-8);
    }
    if (near) continue;
    const key = `${x},${y}`, cell = cells.get(key) || []; cell.push(site); cells.set(key, cell); yield site;
  }
}
