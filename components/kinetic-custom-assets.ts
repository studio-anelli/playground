export type ImportedFont = { id: string; name: string; data: string };
export type VertexSVG = { name: string; svg: string };
export const fontFamily = (id: string) => `"ktic-font-${id}", sans-serif`;
export type FontFormat = "woff2" | "woff" | "ttf" | "otf";
export function detectFontFormat(bytes: Uint8Array): FontFormat | null {
  if (bytes.length < 4) return null;
  const signature = String.fromCharCode(...bytes.slice(0, 4));
  if (signature === "wOF2") return "woff2";
  if (signature === "wOFF") return "woff";
  if (signature === "OTTO") return "otf";
  if (signature === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0)) return "ttf";
  return null;
}
export function validFontData(data: unknown): data is string {
  if (typeof data !== "string" || data.length > Math.ceil(4 * 1024 * 1024 / 3) * 4 + 32) return false;
  const match = /^data:font\/(woff2|woff|ttf|otf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match) return false;
  try { const header = Uint8Array.from(atob(match[2].slice(0, 8)), c => c.charCodeAt(0)); return detectFontFormat(header) === match[1]; } catch { return false; }
}
export function validateSVG(svg: unknown): asserts svg is string {
  if (typeof svg !== "string" || svg.length > 512 * 1024 || !/<svg[\s>]/i.test(svg) || /<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|javascript:|@import/i.test(svg)) throw new Error("Choose a static SVG smaller than 512 KB.");
  const tags = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs", "use", "symbol", "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern", "style", "title", "desc"]);
  for (const match of svg.matchAll(/<\/?([a-z][\w:-]*)\b/gi)) if (!tags.has(match[1].toLowerCase())) throw new Error("Use outlined SVG shapes without text, images or animation.");
  for (const match of svg.matchAll(/(?:\bhref|\bxlink:href)\s*=\s*["']([^"']*)["']/gi)) if (!match[1].startsWith("#")) throw new Error("SVG references must stay inside the file.");
  for (const match of svg.matchAll(/url\s*\(([^)]*)\)/gi)) if (!match[1].trim().replace(/^["']|["']$/g, "").startsWith("#")) throw new Error("SVG references must stay inside the file.");
}
export function normalizeSVG(source: string) {
  validateSVG(source);
  const doc = new DOMParser().parseFromString(source, "image/svg+xml"), root = doc.documentElement;
  if (root.localName !== "svg" || doc.querySelector("parsererror")) throw new Error("Could not parse the SVG.");
  const box = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const dimensions = box || [0, 0, parseFloat(root.getAttribute("width") || ""), parseFloat(root.getAttribute("height") || "")];
  if (dimensions.length !== 4 || dimensions.some(n => !Number.isFinite(n)) || dimensions[2] <= 0 || dimensions[3] <= 0) throw new Error("SVG needs a valid viewBox or width and height.");
  root.setAttribute("viewBox", dimensions.join(" ")); root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const scale = 1024 / Math.max(dimensions[2], dimensions[3]);
  root.setAttribute("width", String(Math.max(1, Math.round(dimensions[2] * scale)))); root.setAttribute("height", String(Math.max(1, Math.round(dimensions[3] * scale))));
  return new XMLSerializer().serializeToString(root);
}
export async function decodeSVG(svg: string) {
  const normalized = normalizeSVG(svg), url = URL.createObjectURL(new Blob([normalized], { type: "image/svg+xml" }));
  try { return await new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Could not render SVG.")); image.src = url; }); }
  finally { URL.revokeObjectURL(url); }
}
export async function loadImportedFont(font: ImportedFont) {
  if (!validFontData(font.data)) throw new Error("Choose a valid WOFF2, WOFF, TTF or OTF font smaller than 4 MB.");
  const bytes = Uint8Array.from(atob(font.data.split(",")[1]), c => c.charCodeAt(0));
  const face = new FontFace(`ktic-font-${font.id}`, bytes, { weight: "100 900" });
  await face.load(); document.fonts.add(face); return face;
}
