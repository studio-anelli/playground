/** A stable orientation per normalized canvas site: no frame-to-frame randomness. */
export function stampOrientation(x: number, y: number, width: number, height: number, degrees: number): number {
  if (!(degrees > 0)) return 0;
  const ix = Math.round(x / Math.max(1, width) * 4096);
  const iy = Math.round(y / Math.max(1, height) * 4096);
  let hash = Math.imul(ix ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(iy, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash ^= hash >>> 16;
  return ((hash >>> 0) / 0xffffffff * 2 - 1) * Math.min(180, degrees) * Math.PI / 180;
}
