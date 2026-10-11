// Measure glyph contours at a fixed em; output scales with the fitted type size.
// Bounded caches keep animated size changes from creating new raster work.
export class OpticalKerning {
  private profiles = new Map<string, { left: number[]; right: number[]; advance: number }>();
  private pairs = new Map<string, number>();
  private canvas: HTMLCanvasElement | null = null;
  adjustment(previous: string, char: string, font: string, weight: number, em: number) {
    if (!previous.trim() || !char.trim()) return 0;
    const key = JSON.stringify([previous, char, font, weight]);
    let adjustment = this.pairs.get(key);
    if (adjustment === undefined) {
      const a = this.profile(previous, font, weight), b = this.profile(char, font, weight);
      let gap = Infinity;
      for (let y = 0; y < a.right.length; y++) if (Number.isFinite(a.right[y]) && Number.isFinite(b.left[y])) gap = Math.min(gap, a.advance + b.left[y] - a.right[y]);
      adjustment = Number.isFinite(gap) ? Math.max(-.18, Math.min(.08, .045 - gap / 96)) : 0;
      if (this.pairs.size >= 2048) this.pairs.delete(this.pairs.keys().next().value!);
      this.pairs.set(key, adjustment);
    }
    return adjustment * em;
  }
  private profile(char: string, font: string, weight: number) {
    const key = JSON.stringify([char, font, weight]), cached = this.profiles.get(key); if (cached) return cached;
    const canvas = this.canvas || (this.canvas = document.createElement("canvas")); canvas.width = 384; canvas.height = 288;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.font = `${weight} 96px ${font}`; ctx.fontKerning = "none"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = "#fff";
    const advance = ctx.measureText(char).width; ctx.fillText(char, 96, 192);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const left = Array<number>(canvas.height).fill(Infinity), right = Array<number>(canvas.height).fill(-Infinity);
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 64) { left[y] = Math.min(left[y], x - 96); right[y] = Math.max(right[y], x - 96 + 1); }
    const value = { left, right, advance }; if (this.profiles.size >= 512) this.profiles.delete(this.profiles.keys().next().value!); this.profiles.set(key, value); return value;
  }
}
