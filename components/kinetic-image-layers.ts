export type ImageLayer = {
  id: string; name: string; data: string; on: boolean;
  placement: "background" | "foreground"; fit: "cover" | "contain" | "stretch";
  x: number; y: number; size: number; angle: number; opacity: number;
  blend: GlobalCompositeOperation;
};
export const imageLimit = 8;
export const imageByteLimit = 12 * 1024 * 1024;
export const imagePixelLimit = 32 * 1024 * 1024;
export function imageGeometry(layer: ImageLayer, iw: number, ih: number, width: number, height: number) {
  const scale = layer.fit === "cover" ? Math.max(width / iw, height / ih) : Math.min(width / iw, height / ih);
  return { x: width * (.5 + layer.x / 100), y: height * (.5 + layer.y / 100), width: (layer.fit === "stretch" ? width : iw * scale) * layer.size / 100, height: (layer.fit === "stretch" ? height : ih * scale) * layer.size / 100, angle: layer.angle * Math.PI / 180 };
}
export function decodeLayerImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth * image.naturalHeight > imagePixelLimit ? reject(new Error("Images must be smaller than 32 megapixels.")) : resolve(image);
    image.onerror = () => reject(new Error("Could not read this image. Use PNG, JPEG, WebP or AVIF."));
    image.src = data;
  });
}
export function drawImageLayers(ctx: CanvasRenderingContext2D, layers: ImageLayer[], images: Map<string, HTMLImageElement>, placement: ImageLayer["placement"], width: number, height: number) {
  for (const layer of layers) {
    const image = images.get(layer.data);
    if (!layer.on || layer.placement !== placement || !image) continue;
    const g = imageGeometry(layer, image.naturalWidth, image.naturalHeight, width, height);
    ctx.save(); ctx.globalAlpha = layer.opacity / 100; ctx.globalCompositeOperation = layer.blend;
    ctx.translate(g.x, g.y); ctx.rotate(g.angle); ctx.drawImage(image, -g.width / 2, -g.height / 2, g.width, g.height); ctx.restore();
  }
}
