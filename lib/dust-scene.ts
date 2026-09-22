// Shared visual vocabulary for translating between the two DUST engines.
export type DustHsl = {
  h: number;
  s: number;
  l: number;
};

export type DustParticleShape = "circle" | "square" | "line" | "mix";

export type DustScene = {
  text: string;
  fontFamily: string;
  fontWeight: number;
  /** Raw values are kept for engine controls and backwards-compatible snapshots. */
  fontSize: number;
  tracking: number;
  canvasW: number;
  canvasH: number;
  /** Portable composition values used when moving between differently sized canvases. */
  fontScale: number;
  trackingEm: number;
  centerX: number;
  baselineRatio: number;
  particleSpacingEm: number;
  particleSizeEm: number;
  particleShape: DustParticleShape;
  /** Per-frame velocity retention. Both engines use the same damping model. */
  motionDamping: number;
  ghostAlpha: number;
  background: DustHsl;
  particles: DustHsl;
};

export type DustSceneBridgeProps = {
  initialScene?: DustScene;
  onSceneChange?: (scene: DustScene) => void;
};

export const defaultDustScene: DustScene = {
  text: "DUST",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  fontWeight: 850,
  fontSize: 180,
  tracking: -2,
  canvasW: 1280,
  canvasH: 520,
  fontScale: 180 / 520,
  trackingEm: -2 / 180,
  centerX: 0.5,
  baselineRatio: 0.56,
  particleSpacingEm: 5 / 180,
  particleSizeEm: 1.6 / 180,
  particleShape: "circle",
  motionDamping: 0.9,
  ghostAlpha: 0,
  background: { h: 240, s: 12, l: 6 },
  particles: { h: 0, s: 0, l: 100 },
};
