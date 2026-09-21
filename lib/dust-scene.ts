export type DustHsl = {
  h: number;
  s: number;
  l: number;
};

export type DustScene = {
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  tracking: number;
  canvasW: number;
  canvasH: number;
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
  background: { h: 240, s: 12, l: 6 },
  particles: { h: 0, s: 0, l: 100 },
};
