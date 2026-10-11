export type GlyphOrigin = { x: number; y: number };
export type GlyphOriginMap = Record<string, Record<string, GlyphOrigin>>;
export const originAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function parseGlyphOrigins(value: unknown, fonts: readonly string[]): GlyphOriginMap {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid glyph origin map.");
  const entries = Object.entries(value);
  if (entries.length > fonts.length) throw new Error("Too many glyph origin fonts.");
  const result: GlyphOriginMap = {};
  for (const [font, glyphs] of entries) {
    if (!fonts.includes(font) || !glyphs || typeof glyphs !== "object" || Array.isArray(glyphs)) throw new Error("Invalid glyph origin font.");
    const points = Object.entries(glyphs);
    if (points.length > 128) throw new Error("Too many glyph origins.");
    const map: Record<string, GlyphOrigin> = {};
    for (const [char, point] of points) {
      if (Array.from(char).length !== 1 || !char.trim() || !point || typeof point !== "object" || Array.isArray(point)) throw new Error("Invalid glyph origin.");
      const { x, y } = point as GlyphOrigin;
      if (![x, y].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error("Glyph origins must be inside the letter bounds.");
      map[char] = { x, y };
    }
    result[font] = map;
  }
  return result;
}
/** Tile backwards from the anchor as well as forwards: shifting origin never crops the grid. */
export function firstGridCoordinate(min: number, anchor: number | undefined, spacing: number): number {
  if (anchor === undefined) return min;
  const step = Math.max(.0001, spacing);
  return anchor + Math.ceil((min - anchor) / step - 1e-9) * step;
}
/** Fit an integer number of sample bands between baseline and cap height. */
export function baselineGridStep(capHeight: number, requestedStep: number): number {
  const height = Math.max(1, capHeight);
  return height / Math.max(1, Math.round(height / Math.max(1, requestedStep)));
}
export function glyphSamplingRegion(g: { x: number; y: number; width: number; height: number; em: number; char: string; font: string; baseline: number; advanceX: number; capHeight: number }, requestedStep: number, origins: GlyphOriginMap) {
  const point = origins[g.font]?.[g.char], step = baselineGridStep(g.capHeight, requestedStep);
  return { x: Math.ceil(g.x + 4), y: Math.ceil(g.y + 4), width: g.width - 8, height: g.height - 8, em: g.em, step,
    originX: point ? g.x + 4 + point.x * (g.width - 8) : g.advanceX + step / 2,
    originY: point ? g.y + 4 + point.y * (g.height - 8) : g.baseline - step / 2 };
}
