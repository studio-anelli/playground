/** Exact canvas rasters with an LRU pixel budget. Large rasters remain uncached. */
export class RasterCache {
  private rasters = new Map<string, HTMLCanvasElement>();
  private bytes = 0;
  constructor(private readonly budget = 32 * 1024 * 1024) {}
  get(key: string) {
    const raster = this.rasters.get(key);
    if (raster) { this.rasters.delete(key); this.rasters.set(key, raster); }
    return raster;
  }
  put(key: string, raster: HTMLCanvasElement) {
    const existing = this.rasters.get(key);
    if (existing) { this.bytes -= existing.width * existing.height * 4; this.rasters.delete(key); }
    const bytes = raster.width * raster.height * 4;
    if (bytes > this.budget) return;
    while (this.bytes + bytes > this.budget && this.rasters.size) {
      const oldest = this.rasters.keys().next().value!;
      const image = this.rasters.get(oldest)!;
      this.bytes -= image.width * image.height * 4; this.rasters.delete(oldest);
    }
    this.rasters.set(key, raster); this.bytes += bytes;
  }
}
