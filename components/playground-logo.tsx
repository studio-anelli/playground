"use client";

import { useEffect, useRef, useState } from "react";
import { loadImportedFont, type ImportedFont } from "./kinetic-custom-assets";
import { OpticalKerning } from "./kinetic-optical-kerning";
import { firstGridCoordinate, glyphSamplingRegion } from "./kinetic-glyph-origins";
import { spacedSites } from "./kinetic-spacing";
import { sampleWave, waveHz, type Wave } from "./kinetic-waves";

// A small, read-only renderer for the supplied logo preset. Reuses the synth’s
// font layout, sample origins and wave functions without mounting its editor.
type LogoPreset = { state: {
  customFonts: ImportedFont[]; text: string; font: string; lineHeight: number;
  stripSpacing: number; vertexSpacing: number; samplingThicknessY: number; bpm: number;
  waves: Wave[]; values: { step: number; fontSize: number; weight: number; vertexSize: number;
    repeatScale: number; positionX: number; positionY: number; repeatSpacingY: number };
  manual: { tracking: number; threshold: number; repeatRows: number };
  patches: { wave: number; target: string; amount: number }[];
} };
const W = 640, H = 413;
const makeCanvas = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };

export function PlaygroundLogo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false, raf = 0, visible = true, last = -Infinity, elapsed = 0;
    let refresh = () => {};
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const abort = new AbortController();
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; });
    if (canvas.current) observer.observe(canvas.current);
    const theme = new MutationObserver(() => refresh());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-site-palette", "data-site-inverted"] });
    const onMotion = () => refresh();
    reduced.addEventListener("change", onMotion);
    void (async () => {
      const response = await fetch("/branding/playground-logo.json", { signal: abort.signal });
      if (!response.ok) throw new Error("Logo preset unavailable");
      const { state: s } = await response.json() as LogoPreset;
      await Promise.all(s.customFonts.map(loadImportedFont));
      if (disposed || !canvas.current) return;
      const source = makeCanvas(), sampled = makeCanvas(), vertices = makeCanvas(), repeated = makeCanvas();
      const sc = source.getContext("2d", { willReadFrequently: true })!;
      const pc = sampled.getContext("2d", { willReadFrequently: true })!;
      const vc = vertices.getContext("2d")!, rc = repeated.getContext("2d")!;
      const out = canvas.current, ctx = out.getContext("2d", { willReadFrequently: true })!;
      const optical = new OpticalKerning(), weight = Math.round(s.values.weight / 10) * 10;
      const lines = s.text.split("\n"), available = W - 48;
      let em = Math.min(Math.round(s.values.fontSize * Math.min(W, H) / 100), H * .75 / (1 + (lines.length - 1) * s.lineHeight));
      const layout = (line: string) => {
        let width = 0, previous = "";
        const chars = Array.from(line).map((char, i) => {
          if (i) width += s.manual.tracking / 100 * em;
          if (previous) width += optical.adjustment(previous, char, s.font, weight, em);
          const x = width; width += sc.measureText(char).width; previous = char; return { char, x };
        });
        return { chars, width };
      };
      for (let i = 0; i < 5; i++) {
        sc.font = `${weight} ${em}px ${s.font}`;
        const widest = Math.max(...lines.map(line => layout(line).width));
        if (widest <= available) break;
        em *= available / widest;
      }
      sc.font = `${weight} ${em}px ${s.font}`; sc.fontKerning = "none"; sc.textBaseline = "alphabetic"; sc.fillStyle = "white";
      const metrics = sc.measureText("Mg"), capHeight = Math.max(1, sc.measureText("H").actualBoundingBoxAscent);
      const glyphs: { x: number; y: number; width: number; height: number; em: number; char: string; font: string; baseline: number; advanceX: number; capHeight: number }[] = [];
      lines.forEach((line, i) => {
        const baseline = H / 2 + (i - (lines.length - 1) / 2) * em * s.lineHeight + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        for (const { char, x: offset } of layout(line).chars) {
          const x = 24 + offset, m = sc.measureText(char);
          sc.fillText(char, x, baseline);
          glyphs.push({ x: x - m.actualBoundingBoxLeft - 4, y: baseline - m.actualBoundingBoxAscent - 4,
            width: Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 8),
            height: Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 8),
            em, char, font: s.font, baseline, advanceX: x, capHeight });
        }
      });
      const pixels = sc.getImageData(0, 0, W, H).data;
      const sites: { x: number; y: number; glyph: typeof glyphs[number] }[] = [];
      pc.fillStyle = "white";
      for (const g of glyphs) {
        const region = glyphSamplingRegion(g, Math.max(1, Math.round(s.values.step / 100 * em)), {});
        const sy = region.step + s.stripSpacing / 100 * em;
        for (let y = firstGridCoordinate(region.y, region.originY, sy); y < region.y + region.height; y += sy) {
          for (let x = region.x; x < region.x + region.width; x++) {
            const px = Math.floor(x) + .5, py = Math.floor(y) + .5;
            sites.push({ x: px, y: py, glyph: g });
            if (pixels[(Math.floor(y) * W + Math.floor(x)) * 4 + 3] / 255 < s.manual.threshold) continue;
            pc.fillRect(px - .5, py - s.samplingThicknessY / 200 * em, 1, s.samplingThicknessY / 100 * em);
          }
        }
      }
      const sampledPixels = pc.getImageData(0, 0, W, H).data;
      const accepted = [...spacedSites(sites, s.vertexSpacing / 100 * em, site => String(glyphs.indexOf((site as typeof sites[number]).glyph)))]
        .filter(site => sampledPixels[(Math.floor(site.y) * W + Math.floor(site.x)) * 4 + 3] > 0);
      const draw = () => {
        const phases = s.waves.map(w => elapsed * waveHz(w, s.bpm));
        vc.clearRect(0, 0, W, H); vc.fillStyle = "white";
        for (const site of accepted) {
          const g = glyphs.find(g => site.x >= g.x && site.x < g.x + g.width && site.y >= g.y && site.y < g.y + g.height);
          const sum = s.patches.filter(p => p.target === "vertexSize").reduce((value, p) => value + sampleWave(s.waves, phases, p.wave,
            g ? (site.x - g.x) / em : site.x / W, g ? (site.y - g.y) / em : site.y / H) * p.amount / 100, 0);
          const size = Math.max(0, Math.min(10, s.values.vertexSize + sum * 5)) / 100 * em;
          if (!size) continue;
          vc.beginPath(); vc.arc(site.x, site.y, Math.max(.5, size / 2), 0, Math.PI * 2); vc.fill();
        }
        rc.clearRect(0, 0, W, H);
        for (let row = 0; row < s.manual.repeatRows; row++) {
          rc.save(); rc.globalCompositeOperation = "difference";
          rc.translate(W / 2 + s.values.positionX / 100 * W,
            H / 2 + s.values.positionY / 100 * H - (row - (s.manual.repeatRows - 1) / 2) * s.values.repeatSpacingY / 100 * H);
          rc.scale(s.values.repeatScale / 100, s.values.repeatScale / 100);
          rc.drawImage(vertices, -W / 2, -H / 2); rc.restore();
        }
        // Difference is computed in white before tinting, so its black cutouts
        // stay transparent even in the black-on-ivory or black-on-blue themes.
        ctx.clearRect(0, 0, out.width, out.height);
        ctx.drawImage(repeated, 22, 60, 596, 320, 0, 0, out.width, out.height);
        const image = ctx.getImageData(0, 0, out.width, out.height);
        for (let i = 0; i < image.data.length; i += 4) image.data[i + 3] = image.data[i] * image.data[i + 3] / 255;
        ctx.putImageData(image, 0, 0);
        ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = getComputedStyle(out).color;
        ctx.fillRect(0, 0, out.width, out.height); ctx.globalCompositeOperation = "source-over";
        out.dataset.frame = String(Math.round(elapsed * 15));
      };
      refresh = draw;
      draw(); setReady(true);
      const frame = (now: number) => {
        if (disposed) return;
        if (!document.hidden && visible && !reduced.matches && now - last >= 1000 / 15) {
          if (Number.isFinite(last)) elapsed += Math.min(.1, (now - last) / 1000);
          last = now; draw();
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    })().catch(error => { if (!disposed) console.warn("Playground logo:", error); });
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(raf); observer.disconnect(); theme.disconnect(); reduced.removeEventListener("change", onMotion); };
  }, []);
  return <span className="playground-logo" data-ready={ready}>
    {!ready && <span className="playground-logo-fallback">Play<br />ground</span>}
    <canvas ref={canvas} width={720} height={384} aria-hidden="true" />
  </span>;
}
