/** Single-axis strips share one displacement along their full length. */
export function samplingJitter(x: number, y: number, amount: number, mode: "x" | "y" | "xy", pixelScale = 1): { x: number; y: number } {
  const scale = Math.max(.0001, pixelScale);
  if (mode === "x") return { x: Math.sin(x / scale * 73.17) * amount, y: 0 };
  if (mode === "y") return { x: 0, y: Math.cos(y / scale * 37.71) * amount };
  return { x: Math.sin(x * 73.17 + y) * amount, y: Math.cos(y * 37.71 + x) * amount };
}
