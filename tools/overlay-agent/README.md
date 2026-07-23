# Overlay Agent CLI

This tool creates a transparent photo-composition overlay from a reference image and a layout JSON file.

## Install

```bash
npm install
```

## Run

```bash
npm run generate -- \
  --image ../../assets/photo-guides/reference/{placeId}_{mode}_{poseId}_photo.png \
  --layout ./guides/example-layout.json \
  --output ../../assets/photo-guides/overlays/{placeId}_{mode}_{poseId}_overlay.png
```

The output PNG has the same dimensions as the source image and contains only administrator-registered background representative lines.

## Guide Schema

- `backgroundLines`: one to five `{ id, start: [x, y], end: [x, y] }` segments from the local Vision web app
- `personFrames`: one or more `{ x, y, width, height, label? }` objects, all coordinates from `0` to `1`
- `personFrame`: a legacy single-person form. New guides should use `personFrames`.

For a couple composition, add two frames: one for each person. Each frame is drawn with its own center line and label.

Automatic building outlines and horizon guides are intentionally excluded. The Vision web app stores only manually approved background lines.

Run `npm test` to validate image dimensions, alpha output, and invalid-coordinate handling.
