export type CanvasFormat = 'screen' | 'square' | 'landscape' | 'portrait' | 'custom';
export function fitCanvas(width: number, height: number, format: CanvasFormat, customWidth: number, customHeight: number) {
  if (format === 'screen') return { width: Math.max(64, width), height: Math.max(64, height) };
  const ratio = format === 'square' ? 1 : format === 'landscape' ? 16 / 9 : format === 'portrait' ? 9 / 16 : customWidth / customHeight;
  const availableWidth = Math.max(64, width - 32), availableHeight = Math.max(64, height - 88);
  const w = Math.min(availableWidth, availableHeight * ratio);
  return { width: w, height: w / ratio };
}
export function outputDimensions(width: number, height: number, format: CanvasFormat, resolution: number, customWidth: number, customHeight: number) {
  if (format === 'custom') return { width: customWidth, height: customHeight };
  const scale = resolution ? resolution / Math.max(width, height) : 1;
  return { width: Math.max(64, Math.round(width * scale)), height: Math.max(64, Math.round(height * scale)) };
}
