# Overlay Agent CLI

This tool creates a transparent photo-composition overlay from a reference image and a coordinate guide JSON file.

## Install

```bash
npm install
```

## Run

```bash
npm run generate -- \
  --image ../../assets/photo-guides/reference/my-photo.jpg \
  --guide ./guides/example-guide.json \
  --output ../../assets/photo-guides/overlays/my-photo-overlay.png
```

The output PNG has the same dimensions as the source image and contains a building outline, a horizon guide, and a subject-position frame.

## Guide Schema

- `buildingOutline`: at least two `[x, y]` points, each from `0` to `1`
- `horizonY`: horizontal guide position from `0` to `1`
- `personFrame`: `{ x, y, width, height }`, all from `0` to `1`

Run `npm test` to validate image dimensions, alpha output, and invalid-coordinate handling.
