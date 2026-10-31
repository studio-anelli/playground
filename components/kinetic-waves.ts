export const waveDivisions = ["1/16", "1/8", "1/4", "1/2", "1", "2", "4"] as const;
export type WaveDivision = typeof waveDivisions[number];
export type Shape = "sine" | "triangle" | "square" | "noise" | "ramp";
export type Wave = { on: boolean; shape: Shape; rate: number; amp: number; speed: number; direction: number; phase: number; timing?: "free" | "sync"; division?: WaveDivision; noiseMode?: "cycle" | "random"; noiseRange?: number; noiseOutput?: "full" | "positive" | "negative" };
export function waveHz(wave: Wave, bpm: number) {
  if (wave.timing !== "sync") return wave.speed;
  const [numerator, denominator = 1] = (wave.division || "1/4").split("/").map(Number);
  return bpm / 60 / (4 * numerator / denominator);
}
export function waveValue(shape: Shape, phase: number, seed = 0) {
  const p = phase - Math.floor(phase);
  if (shape === "ramp") return 2 * p - 1;
  if (shape === "sine") return Math.sin(phase * Math.PI * 2);
  if (shape === "triangle") return 1 - 4 * Math.abs(p - .5);
  if (shape === "square") return p < .5 ? 1 : -1;
  const hash = Math.sin(Math.floor(phase) * 127.1 + seed * 311.7) * 43758.5453;
  return (hash - Math.floor(hash)) * 2 - 1;
}
/** Evaluate an independent wave, including a continuous-cycle ramp. */
export function sampleWave(waves: readonly Wave[], phases: readonly number[], index: number, x: number, y: number) {
  const wave = waves[index];
  if (!wave.on) return 0;
  const phase = phases[index] + wave.phase + (x * (1 - wave.direction) + y * wave.direction) * wave.rate;
  if (wave.shape === "noise") {
    const range = Math.max(1, Math.min(12, Math.round(wave.noiseRange ?? 1)));
    const tick = Math.floor(phase);
    const output = wave.noiseOutput ?? "full";
    const min = output === "positive" ? 0 : -range;
    const max = output === "negative" ? 0 : range;
    const count = max - min + 1;
    if ((wave.noiseMode ?? "random") === "cycle") {
      return (((tick % count) + count) % count + min) * wave.amp;
    }
    // Seeded step-and-hold output: the selected sign range applies before scaling.
    const hash = Math.sin(tick * 127.1 + (index + 1) * 311.7) * 43758.5453;
    return (Math.floor((hash - Math.floor(hash)) * count) + min) * wave.amp;
  }
  return waveValue(wave.shape, phase, index + 1) * wave.amp;
}
