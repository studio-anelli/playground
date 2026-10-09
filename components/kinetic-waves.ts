export const waveDivisions = ["1/64", "1/32", "1/16", "1/8", "1/4", "1/2", "3/4", "4/4"] as const;
export type WaveDivision = typeof waveDivisions[number];
export type Shape = "sine" | "triangle" | "square" | "noise" | "ramp";
export type Wave = { on: boolean; shape: Shape; rate: number; amp: number; speed: number; direction: number; phase: number; timing?: "free" | "sync"; division?: WaveDivision };
export function waveHz(wave: Wave, bpm: number) {
  if (wave.timing !== "sync") return wave.speed;
  const [numerator, denominator] = (wave.division || "1/4").split("/").map(Number);
  return bpm / 60 / (4 * numerator / denominator);
}
export function waveValue(shape: Shape, phase: number, seed = 0) {
  const p = phase - Math.floor(phase);
  if (shape === "ramp") return 2 * p - 1;
  if (shape === "sine") return Math.sin(phase * Math.PI * 2);
  if (shape === "triangle") return 1 - 4 * Math.abs(p - .5);
  if (shape === "square") return p < .5 ? 1 : -1;
  const hash = (n: number) => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  const f = p * p * (3 - 2 * p);
  return hash(Math.floor(phase)) * (1 - f) + hash(Math.floor(phase) + 1) * f;
}
/** Evaluate an independent wave, including a continuous-cycle ramp. */
export function sampleWave(waves: readonly Wave[], phases: readonly number[], index: number, x: number, y: number) {
  const wave = waves[index];
  if (!wave.on) return 0;
  const phase = phases[index] + wave.phase + (x * (1 - wave.direction) + y * wave.direction) * wave.rate;
  return waveValue(wave.shape, phase, index + 1) * wave.amp;
}
/** Angular destinations need the unwrapped phase; a partial ramp must not reset. */
export function sampleAngleWave(waves: readonly Wave[], phases: readonly number[], index: number, x: number, y: number) {
  const wave = waves[index];
  if (!wave.on) return 0;
  if (wave.shape !== "ramp") return sampleWave(waves, phases, index, x, y);
  const phase = phases[index] + wave.phase + (x * (1 - wave.direction) + y * wave.direction) * wave.rate;
  return (2 * phase - 1) * wave.amp;
}
export function wrapAngle(degrees: number) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}
