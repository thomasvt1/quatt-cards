# Quatt equipment icons

These original project vectors use a 24 × 24 viewBox. The heat-pump, Chill, and heat-battery shapes come from `src/ui.ts`; the Heat Charger outline depicts the rounded housing and curved front panel shown in [Quatt's All-Electric product imagery](https://www.quatt.io/all-electric). No artwork from hass-hue-icons is copied. That project provided the Home Assistant registration reference.

Files under `source/` are editable SVGs. Outline sources use strokes. Solid sources use a filled housing followed by one stroked detail path and `data-operation="difference"`; the generator subtracts those details to create transparent cutouts. The SVGs in this directory and `src/icons/paths.json` are generated filled paths: Home Assistant's custom icon API accepts path geometry, not arbitrary SVG stroke styling. They render outlines without requiring CSS strokes or external images.

To regenerate after editing a source, install Inkscape 1.2+ and Python 3, then run:

```sh
npm run build:icons
node scripts/preview-icons.mjs
npm run build
```

The preview script requires the project's Playwright Chromium installation. Ordinary builds and CI use committed generated paths and do not require Inkscape or Python. Generated icon paths must fit inside the viewBox, and registration must preserve other namespaces. Browser tests check these contracts and standalone loading. The standalone test builds the current source in memory with the normal Vite icons configuration; neither browser nor coverage tests require prebuilt files in `dist/`.

The icons and source code use this repository's AGPL-3.0-or-later license. These are community illustrations, not official Quatt brand assets.
