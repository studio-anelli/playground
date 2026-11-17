# Dots layout workspace

Choose a format under **Page & grid**, set margins and gutter, then choose the starting column/row and the number of columns/rows occupied by the artwork. The gutter applies in both directions. With a single grid row, area height and vertical placement remain available for free vertical positioning. Existing presets default to one row and preserve their placement. The full animation is fitted uniformly inside that area, preserving circular dots. Guides appear only in the preview.

- **Full layout:** exports the whole page, including the artwork's placement and margins.
- **Artwork only:** SVG and PNG crop the current frame; video uses one frame that contains the entire motion. Artwork padding is optional.
- **1× / 2×:** controls raster dimensions for PNG/video. SVG remains vector.

Paper formats A5/A4/A3/A2 use millimetres for margin and gutter. Full-layout SVGs have exact physical page dimensions. Raster dimensions use a 96 px/in reference grid (rounded to even dimensions for video), doubled at 2×. These are screen/video raster exports; use SVG for print resolution independence.

Saved browser and JSON presets include all layout settings. Presets created before the layout workspace load with grid fitting disabled, preserving their geometry. Dot presets change the dots without changing the selected page or export settings.

Checks:

```sh
node --import ./tests/durf-dots/resolve-ts.mjs --experimental-strip-types --test tests/durf-dots/*.test.mjs
```
