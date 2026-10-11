/** Keep vector detail at import, then filter a padded, stable GPU mask for each stamp. */
export const svgSourceResolution = 4096;
export function svgAtlasLayout(requestedSize: number, maxTextureSize: number) {
  const limit = 2 ** Math.floor(Math.log2(Math.max(32, Math.min(4096, maxTextureSize))));
  const wanted = 2 ** Math.ceil(Math.log2(Math.max(2048, requestedSize * 2 * 8 / 7)));
  const textureSize = Math.min(limit, wanted), padding = textureSize / 16;
  return { textureSize, padding, contentSize: textureSize - 2 * padding };
}
export function svgRasterSize(requestedSize: number) {
  return Math.min(svgSourceResolution, 2 ** Math.ceil(Math.log2(Math.max(32, requestedSize * 2))));
}
