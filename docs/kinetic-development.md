# K-TIC-SYNTH development sequence

Implemented on the current feature branch:

1. Repeat copy blend modes and FREE/SYNC feedback refresh using shared BPM.
2. Video chain editor in the bottom-left patch bay: order modules, remove/reinsert modules, rebuild the same video cables used by sockets. Preserve advanced cyclic socket routing; conversion to a linear chain is explicit. Undo and preset import/export cover both methods. Every video input accepts two distinct outputs.
3. Multiline typography, line spacing, alignment, native font kerning and optional contour-based optical kerning. Optical spacing uses bounded, fixed-em glyph/pair caches and scales with fitted font size; it is a heuristic rather than a replacement for font-specific professional spacing.
4. Combined sampling/vertex panel with independent switches and existing routing, plus horizontal/vertical sampling thickness and separate strip/vertex spacing. Sizes and spacing use % em with fine 0–10 ranges.
5. Two independent typography sources in tabs, each with an ON/OFF switch and persistent video output. Combine Texts is removed; mixing uses video cables.
6. Up to eight original-resolution PNG/JPEG/WebP/AVIF image layers, above or below the processed synth output. Each layer has ON/OFF, fit, X/Y, scale, rotation, opacity and blending. Layers can be selected, reordered, removed and reset. Presets embed image data and cover undo; PNG, live recording and frozen video rendering include the image stack. The layer controls collapse inside Canvas.

7. Import up to four WOFF2, WOFF, TTF or OTF fonts (4 MB each), selectable independently in both Type tabs and used by glyph stamps. Import one outlined static SVG as a custom Vertex mask. Both assets are embedded in presets and restored by undo; asset loading completes before export. SVG stamps preserve aspect ratio and incoming pixel colour in GPU and Canvas2D paths. External references, live text, scripts and animation are excluded.

Image limits: 12 MB and 32 megapixels per image, 64 MB total embedded data, 96 MB preset file. Decoded images are cached outside React snapshots; image pixels are not resampled on import. Background layers are composited at final output and are not video-patch sources or feedback inputs. Image ordering is independent within the above-synth and below-synth stacks; the processed synth output stays between them.

Keep existing preset appearance by default. Preview and test before merging. GPU interaction and export quality still need testing on the user's browser.
