# Window Platform And Ladder Tiles

## Purpose

These assets are modular pixel objects rendered inside resizable XP desktop object windows. React/CSS draws the window chrome, drag/resize behavior, and interaction rectangles. The image assets only provide the object art.

## Output Paths

```text
public/assets/interaction-objects/ladder/
ladder-top.png
ladder-middle-repeat.png
ladder-bottom.png
ladder-tiles.png

public/assets/interaction-objects/platform/
platform-left.png
platform-center-repeat.png
platform-right.png
platform-tiles.png

public/assets/_review/interaction-object-tiles-contact.png
```

## Ladder Contract

- Tile layout: `top cap` + `middle repeat` + `bottom cap`.
- Tile size: `32x16`.
- Resize axis: vertical.
- Stable grip line: `center x = 16`.
- Rung spacing: `8px`.
- The middle tile must repeat vertically without perspective drift or rung spacing jumps.
- No XP window chrome, titlebar, labels, UI shadows, baked background, hook, rope, or character sprite.

## Platform Contract

- Tile layout: `left cap` + `center repeat` + `right cap`.
- Cap size: `24x24`.
- Center repeat size: `32x24`.
- Resize axis: horizontal.
- Landing line: `top surface y = 6`.
- The center tile must repeat horizontally without seams in the top surface, grass pixels, or soil pattern.
- Left and right caps must remain separate so narrow windows do not squash the center tile.
- No XP window chrome, titlebar, labels, UI shadows, baked background, or character sprite.

## Prompt Template

```text
Create modular pixel art assets for a resizable XP desktop object window.
Do not include window chrome, borders, titlebar, text, shadows from UI.
Transparent background.
The asset must support 9-slice or tile-repeat resizing.

For ladder:
top cap, seamless vertical middle repeat, bottom cap.
Stable center grip line, consistent rung spacing, no perspective distortion.
Use 32x16 tiles, center grip x=16, rung spacing 8px.

For platform:
left cap, seamless horizontal center repeat, right cap.
Clear top landing surface line, consistent pixel grid, no baked background.
Use 24x24 caps, 32x24 center repeat, landing line y=6.

Style:
XP desktop-compatible pixel art, crisp 1px edges, readable at small size, transparent PNG.
```

## Implementation Notes

- Use `image-rendering: pixelated`.
- Compose ladder by drawing the top cap once, repeating `ladder-middle-repeat.png`, then drawing the bottom cap once.
- Compose platform by drawing the left cap once, repeating `platform-center-repeat.png`, then drawing the right cap once.
- Collision and manager placement should use metadata from `interactionObjectAssets`:
  - ladder: `metrics.gripLineX`, `metrics.rungSpacing`
  - platform: `metrics.landingLineY`
